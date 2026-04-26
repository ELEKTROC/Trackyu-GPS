# Runbook — GpsNoData

**Severity** : critical
**Alert source** : `rate(gps_messages_received_total[5m]) == 0` for 10m
**Impact** : 🔴 Aucun tracker ne pousse de position au backend depuis 10 min. Carte vide, replay vide, alertes véhicule muettes. Vrais clients perdent visibilité temps-réel.

---

## Diagnostic (4 commandes)

```bash
ssh root@148.230.126.62

# 1. GPS server TCP port écoute ?
docker logs trackyu-gps-backend-1 --tail 50 2>&1 | grep -iE 'GPS|port 5000|listening'
# attendu : "GPS server listening on port 5000"

# 2. Connexions TCP entrantes ?
ss -tn state established sport = :5001 | head -5
# attendu : ≥1 ligne (clients connectés sur port host 5001 → container 5000)

# 3. Last position en DB
docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -t -c \
  "SELECT MAX(time) AS last_pos, NOW() - MAX(time) AS age FROM positions"
# attendu : age < 5 min en heures de pointe

# 4. Logs parsing récents
docker logs trackyu-gps-backend-1 --since 5m 2>&1 | grep -iE 'parser|received|connection' | tail -20
```

---

## Correctifs courants

### A. Aucune connexion TCP entrante
- **Hypothèse** : firewall VPS bloque port 5001, ou ISP du client coupe TCP, ou tracker éteint
- **Action côté serveur** :
  ```bash
  iptables -L INPUT -n | grep 5001
  ufw status | grep 5001
  # Vérifier que 5001 est ouvert
  ```
- **Action côté client** : contacter manager flotte, vérifier que les boîtiers sont alimentés et ont du signal GSM

### B. Connexions TCP OK mais 0 message valide
- **Hypothèse** : changement protocole boîtier (firmware update) → parser ne reconnaît plus
- **Action** :
  ```bash
  # Capture trafic brut pendant 30s
  docker exec trackyu-gps-backend-1 sh -c "timeout 30 tcpdump -i any -nn -A port 5000" 2>&1 | head -50
  # Comparer avec format attendu pour le protocole concerné (GT06, JT808, Teltonika...)
  ```

### C. Backend redémarré mais GPS server ne re-bind pas
- **Hypothèse** : port 5000 occupé après crash
- **Action** : `docker compose restart backend && sleep 5 && netstat -tlnp | grep 5000`

---

## Escalade (si non résolu en 30 min)

1. Si problème côté trackers → coordonner avec équipe terrain Smartrack CI
2. Si problème serveur → vérifier dernier deploy (`git log --oneline -5` côté backend)
3. Contact dev : Elektro Com

---

## Post-incident

- [ ] Mesurer durée totale du blackout (start → first new position)
- [ ] Identifier nombre de positions perdues (impossible de récupérer, mais quantifier l'impact)
- [ ] Si root cause = parser → ajouter test régression avec capture brut
