#!/usr/bin/env python3
"""
Régularisation des 45 boîtiers GT02 présents dans objects mais absents de devices.
Insère chaque IMEI manquant avec : type=GPS_TRACKER, model=Concox GT02,
status=INSTALLED, gt06_variant=GENERIC, en reliant object_id depuis objects.
"""

import psycopg2
import uuid
from datetime import datetime

CONN_STR = "postgresql://fleet_user:fleet_password@localhost:5432/fleet_db"

QUERY_MISSING = """
SELECT o.imei, o.id AS object_id, o.tenant_id
FROM objects o
LEFT JOIN devices d ON d.imei = o.imei
WHERE o.imei IS NOT NULL AND o.imei != '' AND d.imei IS NULL
ORDER BY o.tenant_id, o.imei;
"""

INSERT_DEVICE = """
INSERT INTO devices (
    id, tenant_id, type, model, imei,
    status, assigned_vehicle_id, object_id,
    gt06_variant, created_at, updated_at
)
VALUES (
    %s, %s, 'GPS_TRACKER', 'Concox GT02', %s,
    'INSTALLED', %s, %s,
    'GENERIC', NOW(), NOW()
)
ON CONFLICT (imei) DO NOTHING;
"""

def main():
    conn = psycopg2.connect(CONN_STR)
    cur = conn.cursor()

    cur.execute(QUERY_MISSING)
    rows = cur.fetchall()
    print(f"Boîtiers à régulariser : {len(rows)}")

    inserted = 0
    skipped  = 0

    for imei, object_id, tenant_id in rows:
        device_id = imei  # même convention que les existants
        cur.execute(INSERT_DEVICE, (device_id, tenant_id, imei, object_id, object_id))
        if cur.rowcount:
            inserted += 1
            print(f"  [OK] {imei}  tenant={tenant_id}  object={object_id}")
        else:
            skipped += 1
            print(f"  [--] {imei}  déjà présent (ON CONFLICT)")

    conn.commit()
    cur.close()
    conn.close()
    print(f"\nTerminé — {inserted} insérés, {skipped} ignorés (doublons).")

if __name__ == "__main__":
    main()
