# Runbook — SocketHighDisconnectRate

**Severity** : warning
**Alert source** : `sum(rate(socket_disconnects_total[5m])) > 0.5` for 10m
**Impact** : 🟡 Plus de 0.5 disconnect Socket.IO/sec en moyenne. Utilisateurs voient bandeau "Actualisation suspendue" fréquemment, expérience temps-réel dégradée. **Sentinelle du chantier socket-stability**.

---

## Diagnostic (4 commandes)

```bash
ssh root@148.230.126.62

# 1. Distribution disconnects par raison (Grafana panel "Socket Disconnects by Reason")
# https://monitoring.trackyugps.com → Business & GPS Realtime
# Identifier la raison dominante : 'transport close', 'ping timeout', 'io server disconnect', 'transport error'

# 2. Logs disconnect détaillés
docker logs trackyu-gps-backend-1 --since 10m 2>&1 | grep -iE 'Client disconnected|auth rejected' | tail -20

# 3. Volume connexions WS actives
curl -sS http://localhost:3001/metrics 2>&1 | grep -E 'ws_active_clients|socket'

# 4. Health Caddy + nginx WebSocket
curl -sS -I https://trackyugps.com/socket.io/?EIO=4&transport=polling 2>&1 | head -5
```

---

## Correctifs courants

### A. reason = 'io server disconnect' dominant (>70%)
- **Hypothèse** : token JWT expire en boucle (cf chantier socket-stability)
- **Vérifier** : `docker logs trackyu-gps-backend-1 --since 10m 2>&1 | grep -c 'auth rejected'`
- **Action** :
  - Si > 50/min → la rotation JWT proactive client échoue. Vérifier que les fixes commits b561efb + 52a9ad1 + ae2fd2e sont bien actifs en prod
  - Sur 1 user spécifique en boucle : forcer reconnect via clear cookies navigateur ou reload F5

### B. reason = 'ping timeout'
- **Hypothèse** : asymétrie ping interval/timeout client/serveur OU saturation réseau
- **Vérifier** : `docker exec trackyu-gps-backend-1 sh -c 'echo $SOCKET_THROTTLE_MS'`
- **Action** : si throttle > 1500ms → réduire à 1000ms via env compose

### C. reason = 'transport close' soudain (spike)
- **Hypothèse** : Caddy ou nginx reload coupé toutes les WS en cours
- **Vérifier** :
  ```bash
  docker logs sms-app-caddy-1 --since 10m 2>&1 | grep -iE 'reload|config'
  ```
- **Action** : si reload récent → comportement attendu, attendre que les clients se reconnectent (auto via `reconnectionAttempts: Infinity`). Surveiller que la courbe redescend.

### D. reason = 'transport error' constant
- **Hypothèse** : timeouts nginx insuffisants ou bug réseau VPS
- **Vérifier** : `grep proxy_read_timeout /var/www/trackyu-gps/nginx_host.conf`
- **Action** : si < 300s → augmenter (chantier socket-stability P2 déjà fait, vérifier toujours présent)

---

## Escalade (si non résolu en 30 min)

1. Si rate > 2/sec sur 1h → problème systémique, escalade Elektro Com
2. Vérifier infra réseau : `ping monitoring.trackyugps.com` depuis un client externe pour confirmer perte paquets

---

## Post-incident

- [ ] Mesurer durée totale de l'instabilité (start → rate < 0.1/s sustained 30 min)
- [ ] Identifier user pattern (mobile background ? lente connexion ?) via `socket_disconnects_total` by reason
- [ ] Mettre à jour `docs/modules/gps/CHANTIER_SOCKET_STABILITY.md` journal
- [ ] Si root cause inédite → envisager phase 2 chantier socket (P4 metrics extended, P5 banner UI)
