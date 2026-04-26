# Runbook — PositionBufferBacklog

**Severity** : warning
**Alert source** : `position_buffer_size > 500` for 2m
**Impact** : 🟡 Plus de 500 positions en attente d'insertion en DB. Latence de visualisation augmente, risque de perte si crash backend (buffer in-memory).

---

## Diagnostic (3 commandes)

```bash
ssh root@148.230.126.62

# 1. Trend buffer (snapshot vs historique sur Grafana)
# https://monitoring.trackyugps.com → Business & GPS Realtime → "Position Buffer"
# Saturation soudaine (spike) vs lente croissance ?

# 2. DB write latency (cause probable)
docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -c \
  "SELECT query, calls, mean_exec_time, max_exec_time
   FROM pg_stat_statements
   WHERE query LIKE 'INSERT INTO positions%'
   ORDER BY mean_exec_time DESC LIMIT 5" 2>&1 | head -10

# 3. Pool DB saturation
docker logs trackyu-gps-backend-1 --since 5m 2>&1 | grep -iE 'pool|connection.*timeout|too many' | head -10
```

---

## Correctifs courants

### A. DB lente (mean INSERT > 50 ms)
- **Hypothèse** : compression TimescaleDB en cours, vacuum, ou contention locks
- **Action immédiate** :
  ```bash
  # Identifier locks
  docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -c \
    "SELECT pid, state, wait_event_type, wait_event, query
     FROM pg_stat_activity WHERE datname='fleet_db' AND state != 'idle' LIMIT 10"
  # Si compression policy bloque → attendre fin (visible via timescaledb_information.jobs)
  docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -c \
    "SELECT job_id, application_name, last_run_status, last_run_duration
     FROM timescaledb_information.job_stats ORDER BY last_run_duration DESC LIMIT 5"
  ```

### B. Spike de positions (afflux trackers reconnectés après outage)
- **Hypothèse** : bursts post-reboot tracker
- **Action** : laisser le worker drainer naturellement (5-10 min). Surveiller via Grafana que buffer décroît.
- Si buffer >2000 et stable → augmenter taille pool DB temporairement

### C. Pool DB saturé (waiting > 0)
- **Action** :
  ```bash
  # Augmenter pool size temporairement
  docker exec trackyu-gps-backend-1 sh -c 'echo $DB_POOL_MAX'
  # Modifier compose env DB_POOL_MAX=20 → 40 si nécessaire
  # docker compose up -d backend (recreate)
  ```

---

## Escalade (si non résolu en 30 min)

1. Si buffer > 5000 → risque perte data au prochain restart. Snapshot DB urgent : `docker exec trackyu-gps-postgres-1 pg_dump -U fleet_user fleet_db | gzip > /tmp/emergency-backup-$(date +%Y%m%d-%H%M).sql.gz`
2. Évaluer redémarrage worker : peut purger le buffer en mémoire (perte des positions non encore flush)

---

## Post-incident

- [ ] Vérifier que toutes les positions du buffer ont été persistées (pas de gaps dans `positions`)
- [ ] Si root cause = DB → envisager scaling vertical Postgres ou archivage agressif
- [ ] Mettre à jour `.claude/skills/databases.md` si pattern récurrent
