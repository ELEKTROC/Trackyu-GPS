#!/usr/bin/env python3
"""
[enrich-v1] Enrichissement metadata.clientData pour tous les tiers CLIENT.

Règles (validées 2026-04-19) :
- type = B2B  si reseller_id = 'REV-SMT-1' (SMARTRACK SOLUTIONS)
- type = B2C  sinon (TRACKYU ABIDJAN et autres)
- subscriptionPlan = 'Standard' (défaut, si absent)
- segment         = 'Standard' (défaut, si absent)
- paymentTerms    = 'Comptant' (défaut, si absent)

Idempotent :
- Si une clé existe déjà dans metadata.clientData, on ne l'écrase PAS.
- Le marqueur metadata._enrichV1 permet de tracer l'exécution.

Usage :
  python3 enrich_tiers_clientdata.py --dry-run    # rapport sans UPDATE
  python3 enrich_tiers_clientdata.py --apply      # exécute l'UPDATE

Avant tout --apply, un dump JSON de toutes les lignes CLIENT est sauvegardé
dans /tmp/tiers_backup_YYYYMMDD_HHMMSS.json.
"""
import argparse
import json
import os
import sys
from datetime import datetime

import psycopg2
import psycopg2.extras

DB_CONFIG = {
    "host": os.environ.get("PGHOST", "postgres"),
    "port": int(os.environ.get("PGPORT", "5432")),
    "user": os.environ.get("PGUSER", "fleet_user"),
    "password": os.environ.get("PGPASSWORD", "fleet_password"),
    "dbname": os.environ.get("PGDATABASE", "fleet_db"),
}

SMARTRACK_RESELLER_ID = "REV-SMT-1"

DEFAULTS = {
    "subscriptionPlan": "Standard",
    "segment": "Standard",
    "paymentTerms": "Comptant",
}


def compute_new_client_data(row):
    """Renvoie (new_client_data_dict, changed_keys_list) ou (None, [])."""
    metadata = row["metadata"] or {}
    client_data = dict(metadata.get("clientData") or {})
    reseller_id = row["reseller_id"]

    changed = []

    # type (B2B/B2C)
    if "type" not in client_data or not client_data.get("type"):
        client_data["type"] = "B2B" if reseller_id == SMARTRACK_RESELLER_ID else "B2C"
        changed.append("type")

    # defaults
    for key, default_value in DEFAULTS.items():
        if key not in client_data or not client_data.get(key):
            client_data[key] = default_value
            changed.append(key)

    if not changed:
        return None, []
    return client_data, changed


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="rapport sans UPDATE")
    group.add_argument("--apply", action="store_true", help="exécute l'UPDATE")
    args = parser.parse_args()

    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT id, name, reseller_id, metadata
        FROM tiers
        WHERE type = 'CLIENT' AND deleted_at IS NULL
        ORDER BY id
    """)
    rows = cur.fetchall()
    print(f"[scan] {len(rows)} tiers CLIENT non supprimés")

    updates = []
    stats = {
        "type_B2B_set": 0,
        "type_B2C_set": 0,
        "subscriptionPlan_set": 0,
        "segment_set": 0,
        "paymentTerms_set": 0,
        "no_change": 0,
    }

    for row in rows:
        new_cd, changed = compute_new_client_data(row)
        if not new_cd:
            stats["no_change"] += 1
            continue
        if "type" in changed:
            if new_cd["type"] == "B2B":
                stats["type_B2B_set"] += 1
            else:
                stats["type_B2C_set"] += 1
        for key in ("subscriptionPlan", "segment", "paymentTerms"):
            if key in changed:
                stats[f"{key}_set"] += 1
        updates.append((row["id"], row["metadata"] or {}, new_cd))

    print("\n[stats derivation]")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"  total_to_update: {len(updates)}")

    if args.dry_run:
        print("\n[dry-run] aucun UPDATE executé. Re-lancer avec --apply pour appliquer.")
        conn.close()
        return

    # Backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"/tmp/tiers_backup_{timestamp}.json"
    cur.execute("""
        SELECT id, name, reseller_id, metadata, updated_at
        FROM tiers WHERE type = 'CLIENT'
    """)
    backup_rows = cur.fetchall()
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(
            [dict(r) for r in backup_rows],
            f,
            ensure_ascii=False,
            indent=2,
            default=str,
        )
    print(f"\n[backup] {len(backup_rows)} lignes → {backup_path}")

    # Apply updates
    print(f"\n[apply] UPDATE de {len(updates)} lignes…")
    for tier_id, old_metadata, new_client_data in updates:
        new_metadata = dict(old_metadata)
        new_metadata["clientData"] = new_client_data
        new_metadata["_enrichV1"] = timestamp
        cur.execute(
            "UPDATE tiers SET metadata = %s, updated_at = NOW() WHERE id = %s",
            (json.dumps(new_metadata), tier_id),
        )

    conn.commit()
    print(f"[apply] COMMIT OK — {len(updates)} tiers mis a jour")
    conn.close()


if __name__ == "__main__":
    main()
