# Skill — DevOps TrackYu

## Infrastructure

| Composant        | Technologie                       | Localisation                        |
| ---------------- | --------------------------------- | ----------------------------------- |
| VPS              | Hostinger Ubuntu                  | 148.230.126.62                      |
| Frontend prod    | nginx (Docker)                    | `trackyu-gps-frontend-1`            |
| Frontend staging | nginx (Docker)                    | `trackyu-staging-frontend`          |
| Backend          | Node.js (Docker)                  | `trackyu-gps-backend-1` (port 3001) |
| Base de données  | PostgreSQL + TimescaleDB (Docker) | `trackyu-gps-postgres-1`            |
| Cache / Queue    | Redis (Docker)                    | `trackyu-gps-redis-1`               |
| GPS server       | TCP intégré au backend            | port 5000                           |

## Commandes Docker essentielles

```bash
# Status containers
docker ps

# Logs backend temps réel
docker logs trackyu-gps-backend-1 --tail 100 -f

# Restart backend
docker restart trackyu-gps-backend-1

# Accès DB
docker exec trackyu-gps-postgres-1 psql 'postgres://fleet_user:fleet_password@localhost:5432/fleet_db'

# Stats Redis
docker exec trackyu-gps-redis-1 redis-cli info memory
docker exec trackyu-gps-redis-1 redis-cli llen gps_incoming_queue
```

## Déploiement (depuis local Windows)

```powershell
# Staging frontend
.\deploy-staging.ps1

# Prod frontend
.\deploy.ps1 -frontend

# Prod backend (build local requis avant)
cd C:/Users/ADMIN/Desktop/trackyu-backend && npm run build
cd C:/Users/ADMIN/Desktop/TRACKING
.\deploy.ps1 -backend -nobuild
```

## CI/CD

- Repo : `github.com/ELEKTROC/trackyu-backend`
- `typecheck.yml` : check bloquant TypeScript sur tout push/PR main — 0 erreur tolérée
- Pas de CI automatique pour le frontend (deploy manuel via scripts PowerShell)

## Backups

```bash
# Backup manuel immédiat
/usr/local/bin/trackyu-db-backup.sh

# Vérifier les backups existants
ls -lh /var/backups/trackyu/
```

Backup automatique : pg_dump quotidien à 3h15, rétention 14 jours.

## Monitoring

- Health check backend : HTTP GET `/health` → 200
- Uptime script : `trackyu-uptime.sh` à la racine du projet
- Surveillance Redis queue : log si `gps_incoming_queue` > 100 messages

## Règles de sécurité infrastructure

- Jamais de `npm run build` sur le VPS (scripts bloqués dans package.json)
- Jamais patcher `dist/` directement (verrou `DO_NOT_PATCH.txt`)
- Toujours créer un `.bak-YYYYMMDD` avant tout patch d'urgence sur dist/
- Hotfix P1 uniquement : patch dist/ autorisé + backport src/ < 48h

## Domaines et certificats

```
live.trackyugps.com      → app prod (destination finale utilisateurs)
staging.trackyugps.com   → validation pré-prod
trackyugps.com           → futur vitrine SaaS
```

TLS via Let's Encrypt (nginx).
