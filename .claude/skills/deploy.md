# Skill — Procédures de déploiement TrackYu

## Règle absolue

**Staging → validation → prod. Jamais dans l'autre sens.**

---

## Déploiement frontend staging

```powershell
# Depuis c:/Users/ADMIN/Desktop/TRACKING/
.\deploy-staging.ps1          # Build + staging
.\deploy-staging.ps1 -nobuild # Staging sans rebuild (dist/ existant)
```

→ Valider sur https://staging.trackyugps.com avant de continuer.

---

## Déploiement frontend prod (après validation staging)

```powershell
.\deploy.ps1 -frontend         # Delta (rapide, recommandé)
.\deploy.ps1 -frontend -force  # Complet (tous les assets)
```

---

## Déploiement backend

```powershell
# 1. Build local obligatoire
cd C:/Users/ADMIN/Desktop/trackyu-backend
npm run build                  # Compile TS → dist/

# 2. Deploy (depuis TRACKING/)
.\deploy.ps1 -backend -nobuild # Utilise le dist/ compilé à l'étape 1
.\deploy.ps1 -backend          # Build + deploy (si non fait avant)
.\deploy.ps1 -backend -migrate # Backend + run migrations SQL
```

---

## Déploiement combiné

```powershell
.\deploy.ps1 -all -nobuild     # Frontend + backend sans rebuild
```

---

## Vérifications post-deploy

- Frontend : ouvrir https://live.trackyugps.com ou https://staging.trackyugps.com
- Backend : le script vérifie HTTP 200 automatiquement
- Logs : `ssh root@148.230.126.62 "docker logs trackyu-gps-backend-1 --tail 50"`

---

## Ce qu'il ne faut JAMAIS faire

- `scp dist/ root@...` — upload manuel du dist/ → utiliser deploy.ps1 exclusivement
- `npm run build` sur le VPS → scripts bloqués
- Patcher `/var/www/trackyu-gps/backend/dist/` directement → `DO_NOT_PATCH.txt` présent
- Déployer backend et frontend en parallèle sans validation staging
