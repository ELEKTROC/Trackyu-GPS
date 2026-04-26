# Runbook — GpsHighErrorRate

**Severity** : warning
**Alert source** : `sum(rate(gps_messages_received_total{status="error"}[5m])) / sum(rate(gps_messages_received_total[5m])) * 100 > 20` for 5m
**Impact** : 🟡 Plus de 20% des messages GPS échouent le parsing. Trackers connectés mais positions non sauvegardées. Risque silencieux : la vue Map semble normale mais les données sont incomplètes.

---

## Diagnostic (4 commandes)

```bash
ssh root@148.230.126.62

# 1. Quels protocoles sont en erreur ? (Prometheus query via Grafana)
# https://monitoring.trackyugps.com → Dashboards → Business & GPS Realtime → "GPS Messages Rate by Protocol"
# Identifier la barre "(error)" la plus haute

# 2. Erreurs parsing récentes par protocole
docker logs trackyu-gps-backend-1 --since 10m 2>&1 | grep -iE 'parser.*error|parsing failed|invalid CRC|bad packet' | head -20

# 3. Top 5 IMEI qui génèrent des erreurs
docker logs trackyu-gps-backend-1 --since 10m 2>&1 | grep -oE 'IMEI [0-9]+' | sort | uniq -c | sort -rn | head -5

# 4. Échantillon de payload brut qui fail
docker logs trackyu-gps-backend-1 --since 5m 2>&1 | grep -B2 -A2 'parsing failed' | head -30
```

---

## Correctifs courants

### A. 1 protocole spécifique en erreur (ex: tous les GT06)
- **Hypothèse** : firmware update massif côté tracker, format change
- **Action** :
  ```bash
  # Identifier les modèles concernés
  docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -c \
    "SELECT device_model, COUNT(*) FROM objects WHERE imei IN (
       SELECT DISTINCT imei FROM positions WHERE time > NOW() - INTERVAL '1 hour'
     ) GROUP BY device_model ORDER BY 2 DESC"
  ```
- Vérifier dans les commits récents si modif parser : `cd ~/Desktop/trackyu-backend && git log --oneline src/gps-server/parsers/ -10`
- Si bug récent → rollback parser ou hotfix

### B. CRC errors GT06 spike
- **Hypothèse** : variant Concox/Coban mal détecté (cf chantier GPS précision 2026-04)
- **Action** : vérifier `crcErrors` dans monitoring stats (`/api/v1/monitoring/gps-stats`)
- Si > 10% pour GT06 → revoir auto-détection variant

### C. Errors uniformes tous protocoles
- **Hypothèse** : DB overload (insert positions échoue silencieusement)
- **Action** :
  ```bash
  docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -c \
    "SELECT * FROM pg_stat_activity WHERE datname='fleet_db' AND state='active'" | head -20
  # Si nombreuses requêtes "idle in transaction" → kill les blocages
  ```

---

## Escalade (si non résolu en 30 min)

1. Si bug parser → ouvrir issue avec capture brut + commit faisant régression
2. Notifier équipe (Telegram TrackYu Tech) avec : protocole concerné + échantillon erreur

---

## Post-incident

- [ ] Ajouter test unitaire sur le payload qui faisait fail
- [ ] Si parser modifié → mettre à jour `.claude/skills/data_ingestion.md` et `networking.md`
