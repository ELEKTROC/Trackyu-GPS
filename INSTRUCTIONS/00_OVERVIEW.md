# TrackYu GPS - Vue d'ensemble

> Plateforme SaaS de gestion de flotte GPS & ERP (React 19 + Node.js + TimescaleDB)

## 🎯 Qu'est-ce que TrackYu GPS ?

**TrackYu GPS** est une plateforme SaaS multi-tenant de gestion de flotte véhicules avec :

- Tracking GPS temps réel
- Gestion commerciale (CRM, facturation, devis)
- Gestion technique (interventions, stock)
- Alertes et notifications multi-canal

## 🏗️ Architecture Multi-tenant

```
SuperAdmin (HQ)
    │
    ├── Revendeur 1 (White-label)
    │       ├── Client A
    │       ├── Client B
    │       └── Client C
    │
    └── Revendeur 2
            ├── Client D
            └── Client E
```

**Hiérarchie** : SuperAdmin → Revendeurs → Clients

## 🔧 Stack Technique

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 19 + Vite + TailwindCSS + TanStack Query + Leaflet   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│     Node.js + Express + JWT + Socket.IO + MQTT              │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │TimescaleDB│   │  Redis   │   │ Mosquitto│
        │(PostgreSQL)│   │ (Cache)  │   │  (MQTT)  │
        └──────────┘   └──────────┘   └──────────┘
```

## 📁 Structure du Projet

```
/                           # Frontend React
├── components/             # Composants UI génériques
├── features/               # Modules métier
│   ├── admin/             # Administration
│   ├── fleet/             # Gestion flotte
│   ├── map/               # Carte temps réel
│   ├── crm/               # Gestion commerciale
│   ├── finance/           # Facturation
│   ├── stock/             # Inventaire
│   ├── tech/              # Interventions
│   └── support/           # Support client
├── contexts/              # Contextes React
├── services/              # API et services
├── hooks/                 # Hooks personnalisés
├── schemas/               # Validation Zod
└── types.ts               # Types TypeScript partagés

/backend                   # API Node.js
├── src/
│   ├── routes/           # 60+ modules de routes
│   ├── controllers/      # Logique métier
│   ├── services/         # Services backend
│   ├── middleware/       # Auth, RBAC
│   └── gps-server/       # Serveur TCP GPS
└── migrations/           # Migrations SQL

/android                   # App mobile Capacitor
/trackyu-mobile           # App React Native (optionnel)
```

## 🔑 Fichiers Critiques

| Fichier                     | Rôle                      | Lignes |
| --------------------------- | ------------------------- | ------ |
| `/types.ts`                 | Types TypeScript partagés | ~1200  |
| `/services/api.ts`          | Tous les appels API       | ~4000  |
| `/contexts/DataContext.tsx` | Cache TanStack Query      | ~2000  |
| `/contexts/AuthContext.tsx` | Auth + RBAC               | ~500   |
| `/backend/src/index.ts`     | Point d'entrée API        | ~300   |
| `.github/workflows/ci.yml`  | Pipeline CI/CD            | ~120   |
| `.husky/pre-commit`         | Hook pre-commit           | ~30    |

## 🌍 Environnement de Production

| Élément      | Valeur                          |
| ------------ | ------------------------------- |
| **VPS**      | 148.230.126.62                  |
| **Domaine**  | trackyugps.com                  |
| **HTTPS**    | Caddy (Let's Encrypt)           |
| **SSH**      | `ssh root@148.230.126.62`       |
| **Frontend** | `/var/www/trackyu-gps/dist/`    |
| **Backend**  | `/var/www/trackyu-gps/backend/` |

## 🧪 Environnement de Staging

| Élément        | Valeur                                           |
| -------------- | ------------------------------------------------ |
| **URL**        | https://staging.trackyugps.com                   |
| **Frontend**   | Port 8081 → `/var/www/trackyu-gps-staging/dist/` |
| **Backend**    | Port 3002                                        |
| **PostgreSQL** | Port 5433 (fleet_db_staging)                     |
| **Redis**      | Port 6380                                        |

## 🐳 Containers Docker

### Production (noms Compose v2, maj 2026-04-19)

```bash
trackyu-gps-postgres-1    # PostgreSQL/TimescaleDB (port 5432)
trackyu-gps-redis-1       # Cache Redis (port 6379)
trackyu-gps-backend-1     # API Node.js (port 3001)
trackyu-gps-frontend-1    # Nginx frontend (port 8080)
```

### Staging

```bash
staging_postgres          # PostgreSQL/TimescaleDB (port 5433)
staging_redis             # Cache Redis (port 6380)
staging_backend           # API Node.js (port 3002)
staging_frontend          # Nginx frontend (port 8081)
```

## 📊 Modules Principaux

| Module    | Description                   | Statut |
| --------- | ----------------------------- | ------ |
| Dashboard | KPIs, graphiques              | ✅     |
| Map       | Carte temps réel              | ✅     |
| Fleet     | Véhicules, chauffeurs         | ✅     |
| CRM       | Leads, clients                | ✅     |
| Finance   | Factures, devis, paiements    | ✅     |
| Stock     | Inventaire, mouvements        | ✅     |
| Tech      | Interventions                 | ✅     |
| Support   | Tickets                       | ✅     |
| Admin     | Users, tenants, RBAC          | ✅     |
| Alerts    | Géofencing, vitesse           | ✅     |
| Reports   | PDF, CSV exports              | ✅     |
| Config    | Alertes, Règles, Éco-conduite | ✅     |
| Système   | Webhooks, Intégrations API    | ✅     |
| Flotte+   | Groupes, Succursales, POIs    | ✅     |

## 🧪 Tests & CI/CD

| Élément            | Détails                                                                            |
| ------------------ | ---------------------------------------------------------------------------------- |
| **Frontend tests** | Vitest 4.0.15 — 155/189 pass (82%)                                                 |
| **Backend tests**  | Jest 30.2 — 78/78 pass (100%)                                                      |
| **CI/CD**          | GitHub Actions (`.github/workflows/ci.yml`) — 3 jobs : frontend, backend, security |
| **Pre-commit**     | Husky — TypeScript check + secrets scan                                            |
| **npm audit**      | 3 vulns restantes (xmldom via togpx, non-fixable)                                  |

## 🛡️ Audits de Sécurité

**16 audits complets réalisés** (~250+ issues corrigées) :

- 12 audits sécurité backend (RBAC, tenant isolation, SQL injection, IDOR)
- 1 audit responsive UI (~45 issues, 17 fichiers)
- 1 audit UI/UX Design (19 issues, 35+ fichiers)
- Sprints 1-4 terminés (75% Q1 2026)

---

_Dernière mise à jour : 2026-02-10_
