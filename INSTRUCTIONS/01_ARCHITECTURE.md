# Architecture Technique

## 🏛️ Architecture Globale

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │     │  Mobile Client  │     │  Trackers GPS   │
│   (React SPA)   │     │  (Capacitor)    │     │  (GT06/JT808)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ HTTPS                 │ HTTPS                 │ TCP:5000
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CADDY (Reverse Proxy)                    │
│                         HTTPS + Auto SSL                         │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Nginx         │     │  Express API    │     │  GPS Server     │
│   (Static)      │     │  Port 3001      │     │  Port 5000      │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                    ┌────────────┼────────────┐         │
                    ▼            ▼            ▼         │
              ┌──────────┐ ┌──────────┐ ┌──────────┐   │
              │TimescaleDB│ │  Redis   │ │Socket.IO │◄──┘
              │Port 5432 │ │Port 6379 │ │Port 3001 │
              └──────────┘ └──────────┘ └──────────┘
```

## 📦 Modules Frontend

### Structure `/features/`

```
features/
├── admin/          # Administration système
│   ├── components/
│   │   ├── AdminView.tsx           # Vue principale
│   │   ├── OrganizationPanelV2.tsx # Config organisation
│   │   └── panels/                 # Sous-panneaux
│   └── permissions/                # Gestion RBAC
│
├── fleet/          # Gestion de flotte
│   └── components/
│       ├── FleetView.tsx           # Liste véhicules
│       ├── VehicleDetail.tsx       # Détail véhicule
│       └── VehicleForm.tsx         # Formulaire
│
├── map/            # Carte temps réel
│   └── components/
│       ├── MapView.tsx             # Carte Leaflet
│       └── VehicleMarker.tsx       # Marqueurs
│
├── crm/            # CRM
│   └── components/
│       ├── LeadsView.tsx           # Pipeline leads
│       ├── ClientsView.tsx         # Liste clients
│       └── LeadFormModal.tsx       # Formulaire lead
│
├── finance/        # Facturation
│   └── components/
│       ├── FinanceView.tsx         # Dashboard finance
│       ├── InvoiceList.tsx         # Liste factures
│       └── InvoiceForm.tsx         # Création facture
│
├── stock/          # Inventaire
├── tech/           # Interventions
├── support/        # Tickets
├── settings/       # Paramètres
├── reports/        # Rapports
└── notifications/  # Centre notifications
```

## 🔌 Routes Backend

### Organisation `/backend/src/routes/`

```typescript
// Authentification
/api/auth/login          POST
/api/auth/register       POST
/api/auth/logout         POST
/api/auth/refresh        POST

// Ressources CRUD (pattern standard)
/api/vehicles            GET, POST
/api/vehicles/:id        GET, PUT, DELETE
/api/vehicles/:id/history GET

// Finance
/api/invoices            GET, POST
/api/quotes              GET, POST
/api/payments            GET, POST

// CRM
/api/leads               GET, POST
/api/clients             GET, POST
/api/tiers               GET, POST  // Modèle unifié

// Admin
/api/users               GET, POST
/api/tenants             GET, POST
/api/roles               GET, POST

// GPS
/api/fleet/positions     GET
/api/fleet/trips         GET
/api/fleet/alerts        GET

// Flotte Avancée & Config
/api/drivers             GET, POST
/api/branches            GET, POST
/api/groups              GET, POST
/api/alert-configs       GET, POST
/api/schedule-rules      GET, POST
```

## 🗄️ Schéma Base de Données

### Tables Principales

```sql
-- Multi-tenant
tenants (id, name, slug, config)
users (id, tenant_id, email, password_hash, role)
roles (id, tenant_id, name, permissions)

-- Fleet
vehicles (id, tenant_id, name, plate, device_id)
devices (id, tenant_id, imei, model, status)
drivers (id, tenant_id, name, license)
positions (time, vehicle_id, lat, lng, speed) -- Hypertable

-- CRM
tiers (id, tenant_id, type, name, email)  -- CLIENT|SUPPLIER|RESELLER
leads (id, tenant_id, status, company_name)
contacts (id, tier_id, name, phone)

-- Finance
invoices (id, tenant_id, tier_id, total, status)
invoice_items (id, invoice_id, description, amount)
payments (id, invoice_id, amount, method)
quotes (id, tenant_id, tier_id, total, status)

-- Stock
catalog (id, tenant_id, name, type, price)
stock_movements (id, item_id, quantity, type)

-- Support
tickets (id, tenant_id, subject, status, priority)
ticket_messages (id, ticket_id, content, sender_id)
```

## 🔄 Flux de Données

### Authentification

```
1. Login → POST /api/auth/login
2. Backend vérifie credentials (bcrypt)
3. Génère JWT avec { userId, tenantId, permissions }
4. Frontend stocke token dans localStorage
5. Toutes les requêtes incluent Authorization header
6. Backend vérifie JWT + permissions RBAC
```

### GPS Temps Réel

```
1. Tracker envoie données TCP (port 5000)
2. GPS Server parse le protocole (GT06/JT808)
3. Lookup IMEI → Vehicle dans Redis cache
4. Position ajoutée au PositionBuffer
5. Buffer flush en batch vers TimescaleDB
6. Socket.IO émet 'vehicle:update' au tenant
7. Frontend met à jour la carte
```

### Mutation avec Cache

```typescript
// Frontend
1. Utilisateur soumet formulaire
2. api.vehicles.create(data)
3. Backend INSERT + répond 201
4. Frontend invalide cache:
   queryClient.invalidateQueries(['vehicles'])
5. TanStack Query refetch automatique
6. UI mise à jour
```

## 📡 WebSocket Events

```typescript
// Événements émis par le backend
'vehicle:update'      // Position mise à jour
'vehicle:alert'       // Alerte déclenchée
'ticket:new'          // Nouveau ticket
'notification:new'    // Nouvelle notification

// Événements reçus par le backend
'join:tenant'         // Client rejoint room tenant
'leave:tenant'        // Client quitte room
```

## 🎯 Patterns Clés

### Isolation Multi-tenant

```typescript
// TOUTES les requêtes DB filtrent par tenant_id
const vehicles = await db.query(
  'SELECT * FROM vehicles WHERE tenant_id = $1',
  [req.user.tenantId]
);
```

### Service API Centralisé

```typescript
// NE JAMAIS faire de fetch direct
// Toujours passer par /services/api.ts
import { api } from '../services/api';
const vehicles = await api.vehicles.list();
```

### Validation Entrées

```typescript
// Backend - toujours valider avec Zod
import { VehicleSchema } from '../schemas/vehicleSchema';
const result = VehicleSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ errors: result.error.flatten() });
}
```

## 🧪 Architecture Staging

L'environnement staging est une copie isolée de la production pour tester les modifications avant déploiement.

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAGING (staging.trackyugps.com)              │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CADDY (sms-app-caddy-1)                      │
│              Port 443 → Reverse Proxy avec SSL                  │
└─────────────────────────────────────────────────────────────────┘
         │
    ┌────┴────────────────────┐
    ▼                         ▼
┌──────────────┐      ┌──────────────┐
│ staging_     │      │ staging_     │
│ frontend     │      │ backend      │
│ Port 8081    │      │ Port 3002    │
└──────────────┘      └──────┬───────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │staging_  │   │staging_  │   │Socket.IO │
        │postgres  │   │redis     │   │Port 3002 │
        │Port 5433 │   │Port 6380 │   └──────────┘
        └──────────┘   └──────────┘
```

### Isolation Staging/Production

| Ressource | Production | Staging |
|-----------|------------|----------|
| Base de données | fleet_db (5432) | fleet_db_staging (5433) |
| Redis | 6379 | 6380 |
| Backend | 3001 | 3002 |
| Frontend | 8080 | 8081 |
| GPS Server | 5001 | 5002 |

## \ud83d\udee0\ufe0f Infrastructure DevOps

### CI/CD (GitHub Actions)

Pipeline `.github/workflows/ci.yml` d\u00e9clench\u00e9 sur push/PR vers `main` et `develop` :

| Job | \u00c9tapes |
|-----|---------|
| **frontend** | npm ci \u2192 tsc --noEmit \u2192 vitest run \u2192 vite build \u2192 bundle size check |
| **backend** | npm ci \u2192 tsc --noEmit \u2192 jest \u2192 esbuild |
| **security** | npm audit \u2192 secrets scan (grep hardcoded keys) |

### Pre-commit Hooks (Husky)

`.husky/pre-commit` ex\u00e9cute automatiquement :
1. **tsc --noEmit** (frontend + backend) \u2014 bloque si erreurs TypeScript
2. **Secrets scan** \u2014 bloque si des credentials sont d\u00e9tect\u00e9s dans les fichiers staged

### Docker Compose Hardening

| Am\u00e9lioration | docker-compose.yml | docker-compose.prod.yml |
|--------------|-------------------|------------------------|
| Healthchecks | \u2705 tous services | \u2705 tous services |
| Restart policy | `unless-stopped` | `unless-stopped` |
| Env vars (pas de secrets en dur) | \u2705 `${DB_PASS}` | \u2705 `${DB_PASS}` |
| Network isolation | fleet_network | internal + web |
| Resource limits | \u2014 | postgres 2G, backend 1G, redis 512M |
| Redis LRU eviction | \u2705 256mb | \u2705 512mb |
| Postgres port ferm\u00e9 (prod) | \u2014 | \u2705 (acc\u00e8s interne uniquement) |

### Backups Automatis\u00e9s

Script `scripts/backup-db.sh` avec cron :
```bash
# Daily \u00e0 2h00, weekly dimanche \u00e0 3h00
0 2 * * * /var/www/trackyu-gps/scripts/backup-db.sh daily
0 3 * * 0 /var/www/trackyu-gps/scripts/backup-db.sh weekly
```
R\u00e9tention : 7 daily, 4 weekly, 10 manual.

---

*Derni\u00e8re mise \u00e0 jour : 2026-02-10*
