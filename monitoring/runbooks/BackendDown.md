# Runbook — BackendDown

**Severity** : critical
**Alert source** : `up{job="trackyu-backend"} == 0` for 1m
**Impact** : 🔴 Toutes les fonctionnalités HTTP + Socket.IO HS. Mobile et web inutilisables. Clients voient bandeau "Actualisation suspendue" ou écran blanc.

---

## Diagnostic (5 commandes)

```bash
ssh root@148.230.126.62

# 1. Container status
docker ps -a --filter name=trackyu-gps-backend-1 --format '{{.Status}}'
# attendu : "Up X" — si "Restarting" ou absent → problème démarrage

# 2. Logs derniers 100 lines
docker logs trackyu-gps-backend-1 --tail 100 2>&1 | grep -iE 'error|fatal|panic'

# 3. Healthcheck HTTP direct
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:3001/api/v1/auth/login -X POST -H 'Content-Type: application/json' -d '{}'
# attendu : 400 (bad request, body vide) — autre = backend HS

# 4. Postgres / Redis dépendances
docker ps --filter name=trackyu-gps --format '{{.Names}}\t{{.Status}}'

# 5. Mémoire / disque host
free -h && df -h /
```

---

## Correctifs courants

### A. Container en restart loop (TS error / migration cassée)
```bash
docker logs trackyu-gps-backend-1 --tail 50
# → identifier l'erreur de boot. Si TS module manquant ou route undefined :
#   - rollback dist/ vers la version précédente :
ls -la /var/www/trackyu-gps/backend/dist.bak-* 2>/dev/null
# Si backup dispo : cp -r dist.bak-YYYYMMDD/* dist/ && docker restart trackyu-gps-backend-1
# Sinon : redéployer depuis local (cd ~/Desktop/TRACKING && .\deploy.ps1 -backend -nobuild)
```

### B. Postgres / Redis down
```bash
docker compose -f /var/www/trackyu-gps/docker-compose.yml up -d postgres redis
sleep 10
docker restart trackyu-gps-backend-1
```

### C. Disque saturé (>95%)
```bash
df -h /
du -sh /var/lib/docker/* | sort -h | tail -10
docker system prune -a --volumes --filter "until=72h"  # supprime images/volumes >72h
```

### D. OOM (out of memory) — backend killed
```bash
dmesg | grep -i "killed process.*backend"  # si OOM kill récent
# Solution : augmenter limit docker-compose.yml ou identifier leak via heap dump
# Court terme : docker restart trackyu-gps-backend-1
```

---

## Escalade (si non résolu en 30 min)

1. Notifier équipe technique sur Telegram (canal "TrackYu Tech")
2. Si snapshot Hostinger récent (<24h) : envisager rollback complet
3. Contact SUPERADMIN : superadmin@trackyugps.com / dg@trackyugps.com

---

## Post-incident

- [ ] Créer un incident report dans `docs/sessions/INCIDENT_YYYY-MM-DD_BackendDown.md`
- [ ] Si root cause = bug code → ouvrir issue + correctif + tests régression
- [ ] Vérifier metrics `up{job="trackyu-backend"}` revenu à 1 sur Grafana > 30 min
- [ ] Annoncer fin d'incident sur status page (quand mise en place)
