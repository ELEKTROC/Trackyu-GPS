# Skill — Modifier le backend TrackYu

## Architecture

- **Code source** : `c:/Users/ADMIN/Desktop/trackyu-backend/src/`
- **Build** : `npm run build` → génère `trackyu-backend/dist/`
- **Deploy** : `deploy.ps1 -backend -nobuild` → upload dist/ vers VPS + restart Docker
- **DB** : PostgreSQL dans Docker sur VPS, connexion : `postgres://fleet_user:fleet_password@localhost:5432/fleet_db`

---

## Workflow complet pour toute modification backend

```
1. Modifier src/ dans trackyu-backend/
2. cd C:/Users/ADMIN/Desktop/trackyu-backend && npm run build
3. Vérifier 0 erreur TypeScript
4. cd C:/Users/ADMIN/Desktop/TRACKING
5. .\deploy-staging.ps1   ← frontend staging (si modif frontend aussi)
6. Valider staging
7. .\deploy.ps1 -backend -nobuild
```

---

## Structure src/ clé

```
src/
├── controllers/      — logique métier par domaine
├── repositories/     — accès BD (pattern repository)
├── routes/           — définitions des routes API
├── workers/
│   └── positionWorker.ts  — traitement positions GPS temps réel
├── gps-server/
│   ├── server.ts     — TCP server (port 5000)
│   └── parsers/      — gt06.ts, meitrack.ts, queclink.ts, suntech.ts
├── services/         — services transverses
├── schemas/          — validations Zod
└── utils/
```

---

## Règles TypeScript

- Zéro erreur TS obligatoire (`tsc --noEmit` doit passer)
- Le CI `typecheck.yml` est un check bloquant sur tout push/PR main
- Ne jamais utiliser `any` sans justification explicite

---

## Migrations SQL

```powershell
.\deploy.ps1 -backend -migrate   # Deploy + run migrations
```

Les fichiers SQL sont dans `trackyu-backend/src/db/migrations/`.

---

## Accès direct BD (diagnostic)

```bash
ssh root@148.230.126.62
docker exec trackyu-gps-postgres-1 psql 'postgres://fleet_user:fleet_password@localhost:5432/fleet_db' -c "SELECT ..."
```

---

## Logs backend temps réel

```bash
ssh root@148.230.126.62 "docker logs trackyu-gps-backend-1 --tail 100 -f"
```

---

## Rôles et isolation tenant

- `SUPERADMIN` / staff TKY (`tenant_id = TKY`) → cross-tenant, voit tout
- `ADMIN` / `MANAGER` / `RESELLER` → isolé dans leur tenant
- `RESELLER` = fonctionnellement équivalent à `ADMIN` tenant (traiter ensemble)
- Compte test : superadmin@trackyugps.com

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill : `docs/backend/` (audit global, archi, dette, infra, perf, sécurité, inventaire src/dist).

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
