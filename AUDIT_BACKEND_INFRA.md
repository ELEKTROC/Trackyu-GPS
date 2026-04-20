# Audit backend — Infra / Ops

**Date** : 2026-04-18
**Serveur** : `148.230.126.62` — 3.8 GB RAM / 48 GB disk / Ubuntu

---

## État

| Métrique        | Valeur                                 |
| --------------- | -------------------------------------- |
| RAM             | 1.3 G utilisés / 3.8 G total           |
| Swap            | **0 B** (désactivé)                    |
| Disque          | 11 G / 48 G (23 %)                     |
| Load 1/5/15 min | 0.47 / 0.33 / 0.21                     |
| Uptime          | 16 j                                   |
| Containers      | 9 (trackyu + sms-app partagent le VPS) |

---

## 🚨 Critiques

### I1 — ~~AUCUN backup DB automatisé~~ ✅ Corrigé 2026-04-19

- **Niveau 1 (infra)** : snapshot VPS journalier Hostinger (hébergeur) — couvre crash disk / ransomware / perte VPS.
- **Niveau 2 (applicatif, ajouté 2026-04-19)** :
  - Script `/usr/local/bin/trackyu-db-backup.sh` + cron `/etc/cron.d/trackyu-backup` → 3h15 UTC quotidien.
  - Format custom `-Fc` (inclut hypertables TimescaleDB), rétention 14 j, sortie `/var/backups/trackyu/`.
  - Dump schéma seul en parallèle pour grep/diff rapide.
  - Script restore sélectif : `/usr/local/bin/trackyu-db-restore.sh <dump> <target_db>` avec procédure `timescaledb_pre_restore()` / `_post_restore()`.
- Hostinger couvre la résilience VPS ; le pg_dump couvre le restore sélectif (table/tenant, export staging, debug), la rétention > 14 j, le grep SQL.

### I2 — ~~`staging_backend` en boucle de crash~~ ✅ Corrigé 2026-04-19

- Container arrêté/supprimé (aucune DB staging attachée) → bruit logs + resto ressources.
- Reprise staging = procédure dédiée séparée (compose staging distinct + DB dédiée), hors scope audit.

### I3 — ~~Aucun healthcheck Docker~~ ✅ Corrigé 2026-04-19

- Fichier overlay `/var/www/trackyu-gps/docker-compose.healthcheck.yml` créé (ne touche pas au compose principal = secrets inline préservés).
- Healthchecks ajoutés : postgres (`pg_isready`), redis (`redis-cli ping`), backend (`wget /api/health`), frontend (`wget /`).
- `depends_on: condition: service_healthy` sur backend (attend postgres + redis prêts) et sur frontend (attend backend).
- `mem_limit` posés : postgres 1 G, redis 256 M, backend 1 G, frontend 128 M.
- Containers recréés avec noms standards Compose v2 (`trackyu-gps-<service>-1`) — anciens conteneurs hash-préfixés supprimés, volumes nommés `pg_data` / `redis_data` préservés.
- Lancement : `docker compose -f docker-compose.yml -f docker-compose.healthcheck.yml up -d`.
- Vérifié 2026-04-19 : 4 containers Healthy, API publique `/api/health` → 200 en 65 ms.

### I4 — ~~Pas de swap~~ ✅ Corrigé 2026-04-19

- Swap 4 G ajouté : `/swapfile` créé, activé, persisté dans `/etc/fstab`.
- `vm.swappiness=10` (économe, swap uniquement si RAM critique) persisté dans `/etc/sysctl.conf`.

---

## 🟠 Importants

### I5 — ~~`fail2ban` inactif~~ ✅ Corrigé 2026-04-19

- `fail2ban` installé + `jail.local` déployé : `[sshd]` enabled (maxretry 5, findtime 10m, bantime 1h), whitelist `127.0.0.1/8 ::1 102.210.16.3`, action `iptables-multiport`. Service actif.
- Fichier source : `fail2ban_jail.local` à la racine repo (pour redéploiement).

### I6 — ~~Pas de monitoring minimal~~ ✅ Corrigé 2026-04-19

- Script `/usr/local/bin/trackyu-uptime.sh` + cron `/etc/cron.d/trackyu-uptime` (toutes les minutes) → teste `/api/health` avec 3 retries, log `/var/log/trackyu-uptime.log`, flag file `/var/run/trackyu-uptime.down` après 2 échecs consécutifs.
- **Canal notify** : **Healthchecks.io** cablé via `/etc/default/trackyu-uptime` (`HC_URL` chmod 600). Heartbeat à chaque run ok, ping `/fail` après 2 échecs consécutifs. Absence totale de heartbeat = HC alerte après Grace Time. Vérifié 2026-04-19 : API répond 200 en 44 ms, state=0, pas de flag down.
- **Reste à compléter (sprint sprint)** : Prometheus/Grafana + Node exporter + cAdvisor pour métriques granulaires (RAM/CPU/disque, latence, taux erreur). Healthchecks couvre uptime uniquement.

### I7 — 2 VPS applications mixés (`trackyu` + `sms-app`)

- `sms-app-*` containers tournent sur le même host. Pas critique en soi, mais :
  - Isolement réseau partagé.
  - Une fuite mémoire sms-app peut OOM trackyu.
  - Maintenance sms (reboot container) peut impacter host shared.
- **Fix** : quand budget, séparer sur VPS distinct. Sinon, poser des `mem_limit` stricts sur chaque container.

### I8 — Secrets Redis/DB dans docker-compose.yml (cf. S2)

- Déjà signalé sécurité. Rappel : sortir en `.env.prod` + rotation.

---

## 🟡 À surveiller

### I9 — ~~Rotation logs Docker~~ ✅ Déjà en place (vérifié 2026-04-19)

- `/etc/docker/daemon.json` : `{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}` → 30 MB/container max, protection disque active.
- Bump à 50m × 5 = optionnel, pas nécessaire vu l'activité actuelle.

### I10 — Aucun déploiement Blue/Green

- `deploy.ps1` remplace le bundle frontend en place, `docker restart` backend → courte interruption observable.
- **Fix** : progressivement vers `docker compose up -d --no-deps <service>` avec healthcheck + reverse-proxy qui attend l'up (nginx upstream avec keepalive + `proxy_next_upstream`).

---

## ✅ Points positifs

- Containerisation propre (postgres/redis/backend/frontend isolés).
- PgBouncer en place.
- Volumes DB persistés.
- Logs structurés (pino côté backend).
- Nginx/Caddy en reverse proxy avec TLS Let's Encrypt (certbot présent).

---

## Plan

| #   | Action                        | Effort     | Priorité     |
| --- | ----------------------------- | ---------- | ------------ |
| I1  | pg_dump cron + off-site       | 2 h        | **immédiat** |
| I4  | Swap 4 G                      | 10 min     | **immédiat** |
| I3  | Healthchecks Docker           | 1 h        | **semaine**  |
| I2  | Fix / stopper staging_backend | 30 min     | semaine      |
| I5  | fail2ban                      | 1 h        | semaine      |
| I6  | Uptime monitor externe min.   | 30 min     | semaine      |
| I9  | Log rotation Docker           | 5 min      | semaine      |
| I6+ | Prometheus/Grafana            | 1 j        | sprint       |
| I7  | Séparer sms-app               | sur budget | trimestre    |
