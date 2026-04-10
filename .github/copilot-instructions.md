# TrackYu GPS - Instructions Copilot

> Plateforme SaaS de gestion de flotte GPS & ERP (React 19 + Node.js + TimescaleDB)

## 📚 Documentation détaillée

Pour une documentation complète et thématique, consultez le dossier `/INSTRUCTIONS/` :

| Fichier | Contenu |
|---------|---------|
| [00_OVERVIEW.md](../INSTRUCTIONS/00_OVERVIEW.md) | Vue d'ensemble du projet |
| [01_ARCHITECTURE.md](../INSTRUCTIONS/01_ARCHITECTURE.md) | Architecture technique détaillée |
| [02_SECURITY.md](../INSTRUCTIONS/02_SECURITY.md) | Sécurité (JWT, RBAC, bcrypt) |
| [03_FRONTEND.md](../INSTRUCTIONS/03_FRONTEND.md) | Patterns React & TanStack Query |
| [04_BACKEND.md](../INSTRUCTIONS/04_BACKEND.md) | Routes, controllers, services |
| [05_GPS_PIPELINE.md](../INSTRUCTIONS/05_GPS_PIPELINE.md) | Pipeline données GPS |
| [06_DATABASE.md](../INSTRUCTIONS/06_DATABASE.md) | Schema DB & migrations |
| [07_MOBILE.md](../INSTRUCTIONS/07_MOBILE.md) | Capacitor & React Native |
| [08_INTEGRATIONS.md](../INSTRUCTIONS/08_INTEGRATIONS.md) | Services externes (SMS, paiements) |
| [09_WORKFLOWS.md](../INSTRUCTIONS/09_WORKFLOWS.md) | Procédures de développement |
| [10_AI_GUIDELINES.md](../INSTRUCTIONS/10_AI_GUIDELINES.md) | Consignes pour agents IA |
| [11_PROJECT_STATS.md](../INSTRUCTIONS/11_PROJECT_STATS.md) | Statistiques (auto-générées) |

> 💡 **Pour les agents IA** : Lire prioritairement `10_AI_GUIDELINES.md` pour éviter les erreurs courantes.

---

## Vue d'ensemble de l'architecture

**SaaS Multi-tenant** avec hiérarchie : SuperAdmin (HQ) → Revendeurs → Clients

```
Frontend (React 19/Vite)  →  Backend (Node.js/Express)  →  TimescaleDB + Redis
     ↓                              ↓
WebSocket (Socket.IO)         MQTT (Mosquitto) ← Trackers GPS
```

- **Frontend** : `/` racine - SPA React 19 avec Tailwind, cartes Leaflet, Recharts
- **Backend** : `/backend` - API Express avec auth JWT, 60+ modules de routes
- **Mobile** : `/android` (Capacitor WebView) et `/trackyu-mobile` (React Native - optionnel)
- **Types** : Types partagés dans `/types/` (14 modules par domaine), re-exportés via `/types.ts`

## Fichiers critiques - À vérifier avant modification

| Fichier | Rôle |
|---------|------|
| `/services/api.ts` | Façade API (~190 lignes) — assemble les modules de `services/api/` |
| `/services/api/` | Modules API par domaine : fleet, crm, finance, tech, support, admin, monitoring, notifications |
| `/utils/apiConfig.ts` | Détection URL API (Capacitor vs web) |
| `/contexts/AuthContext.tsx` | Auth + permissions RBAC |
| `/types.ts` | Re-export depuis `types/` (14 modules par domaine) |
| `/backend/src/index.ts` | Point d'entrée API, enregistrement des routes |

## Convention de structure du projet

```
/components      → Composants UI réutilisables génériques
/features/{module}/components  → Composants spécifiques au module (admin, fleet, map, crm, etc.)
/contexts        → Contextes React (Auth, Data, Theme, Toast, Notification)
/services        → API et services externes
/services/api/   → Modules API par domaine (client, fleet, crm, finance, tech, support, admin, monitoring, notifications)
/hooks           → Hooks React personnalisés
/schemas         → Schémas de validation Zod (correspondent à /backend/src/schemas/)
/types/          → Types TypeScript par domaine (enums, auth, fleet, crm, finance, tech, support, admin, alerts, rules, integrations, automation, accounting, audit)
```

## Patterns de développement clés

### Appels API
Toujours utiliser le service API centralisé - ne jamais créer d'appels fetch bruts :
```typescript
import { api } from '../services/api';
// api.vehicles.list(), api.clients.create(), etc.
```

### Mode Mock
Définir `VITE_USE_MOCK=true` dans `.env` pour le développement frontend sans backend. Le service `api.ts` gère les données mock via localStorage.

### Permissions RBAC
Vérifier les permissions via le hook `useAuth()` :
```typescript
const { hasPermission } = useAuth();
if (hasPermission('VIEW_FLEET')) { ... }
```
Permissions définies dans `/types/auth.ts` (type Permission) et appliquées dans `/backend/src/middleware/authMiddleware.ts`.

### Validation de formulaires
Utiliser les schémas Zod du répertoire `/schemas/` :
```typescript
import { VehicleSchema } from '../schemas/vehicleSchema';
```

## Commandes

```powershell
# Frontend
npm run dev          # Serveur de dev (Vite)
npm run build        # Build production

# Backend
cd backend
npm run dev          # Dev avec hot reload
npm run build        # Build via esbuild
npm run db:migrate   # Exécuter les migrations

# Déploiement (depuis la racine)
.\deploy.ps1 -frontend  # Déployer frontend uniquement
.\deploy.ps1 -backend   # Déployer backend uniquement
.\deploy.ps1 -all       # Déployer les deux (défaut)
.\deploy.ps1 -nobuild   # Déployer sans rebuilder
.\deploy.ps1 -dryrun    # Simuler sans déployer

# Docker (stack complète locale)
docker-compose up -d
```

## Workflow Git

### Convention de commits
Utiliser des messages descriptifs en français ou anglais :
```bash
# Format recommandé
git commit -m "feat(module): description courte"
git commit -m "fix(fleet): correction du calcul de distance"
git commit -m "chore: mise à jour des dépendances"

# Préfixes standards
feat:     # Nouvelle fonctionnalité
fix:      # Correction de bug
chore:    # Maintenance, dépendances
refactor: # Refactorisation sans changement fonctionnel
docs:     # Documentation
style:    # Formatage, pas de changement de code
test:     # Ajout/modification de tests
```

### Branches
```bash
main        # Production stable
develop     # Développement actif
feature/*   # Nouvelles fonctionnalités
fix/*       # Corrections de bugs
```

### Avant de committer
```powershell
# 1. Vérifier les fichiers modifiés
git status

# 2. Vérifier qu'il n'y a pas de secrets exposés
git diff --staged | Select-String -Pattern "password|secret|api_key|token"

# 3. Build pour vérifier les erreurs
npm run build

# 4. Ajouter et committer
git add .
git commit -m "feat(module): description"

# 5. Push
git push origin <branch>
```

### ⚠️ Fichiers à NE JAMAIS committer
Ces fichiers sont dans `.gitignore` mais vérifiez toujours :
- `.env` (contient les secrets)
- `*.log`
- `node_modules/`
- `dist/` (sauf si déploiement manuel)
- Fichiers contenant des clés API, mots de passe, tokens

## 🔐 Sécurité

### Architecture de sécurité backend
Le backend implémente plusieurs couches de protection :

| Couche | Technologie | Fichier |
|--------|-------------|---------|
| **HTTPS** | Caddy (reverse proxy) | Production uniquement |
| **Helmet** | Headers sécurisés | `/backend/src/index.ts` |
| **CORS** | Origines autorisées | `/backend/src/index.ts` |
| **Rate Limiting** | express-rate-limit | `/backend/src/middleware/rateLimiter.ts` |
| **JWT** | jsonwebtoken | `/backend/src/middleware/authMiddleware.ts` |
| **Hashing** | bcryptjs (salt 10) | `/backend/src/controllers/authController.ts` |
| **RBAC** | Permissions granulaires | `/backend/src/middleware/authMiddleware.ts` |

### Rate Limiting
```typescript
// Auth: 5 tentatives / 15 minutes
authLimiter: { windowMs: 15 * 60 * 1000, max: 5 }

// API générale: 100 req / minute
apiLimiter: { windowMs: 60 * 1000, max: 100 }
```

### Authentification JWT
```typescript
// Structure du token (payload)
{
  userId: string,
  email: string,
  role: string,
  tenantId: string,
  permissions: string[]
}
// Expiration: 24h (configurable via JWT_EXPIRES_IN)
```

### Hashing des mots de passe
```typescript
// TOUJOURS utiliser bcrypt avec salt
import bcrypt from 'bcryptjs';

// Création
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);

// Vérification
const isValid = await bcrypt.compare(password, hash);
```

### Bonnes pratiques sécurité

#### ✅ À FAIRE
```typescript
// 1. Toujours valider les entrées avec Zod
const result = Schema.safeParse(req.body);
if (!result.success) return res.status(400).json({ error: 'Invalid input' });

// 2. Échapper les sorties SQL (requêtes paramétrées)
db.query('SELECT * FROM users WHERE id = $1', [userId]); // ✅

// 3. Vérifier les permissions avant toute action
if (!req.user.permissions.includes('DELETE_VEHICLE')) {
  return res.status(403).json({ error: 'Forbidden' });
}

// 4. Logger les actions sensibles
AuditService.log({ action: 'DELETE', entityType: 'user', ... });
```

#### ❌ À NE JAMAIS FAIRE
```typescript
// 1. SQL injection
db.query(`SELECT * FROM users WHERE id = '${userId}'`); // ❌ DANGER!

// 2. Exposer les secrets dans le code
const API_KEY = 'sk_live_xxx'; // ❌ Utiliser process.env

// 3. Stocker les mots de passe en clair
INSERT INTO users (password) VALUES ('monMotDePasse'); // ❌

// 4. Désactiver CORS en production
app.use(cors({ origin: '*' })); // ❌ En production

// 5. Logger des données sensibles
console.log('User password:', password); // ❌ JAMAIS
```

### Variables d'environnement sensibles
Ces variables doivent être dans `.env` (jamais committées) :
```bash
JWT_SECRET=           # Secret JWT (min 32 caractères)
DATABASE_URL=         # Connection string PostgreSQL
REDIS_URL=            # Connection string Redis
ORANGE_SMS_CLIENT_SECRET=
WAVE_API_KEY=
TELEGRAM_BOT_TOKEN=
RESEND_API_KEY=       # Email
```

### Checklist sécurité avant déploiement
- [ ] `.env` non commité (vérifier `.gitignore`)
- [ ] JWT_SECRET unique et fort (32+ caractères)
- [ ] CORS configuré avec domaines spécifiques
- [ ] Rate limiting activé
- [ ] HTTPS activé (Caddy)
- [ ] Mots de passe hashés avec bcrypt
- [ ] Requêtes SQL paramétrées
- [ ] Permissions RBAC sur toutes les routes sensibles

## Environnement de production

- **VPS** : 148.230.126.62
- **Domaine** : trackyugps.com (HTTPS via Caddy)
- **SSH** : `ssh root@148.230.126.62`
- **Chemin frontend** : `/var/www/trackyu-gps/dist/`
- **Chemin backend** : `/var/www/trackyu-gps/backend/`
- **Containers Docker** :
  - `trackyu-gps_postgres_1` - Base de données PostgreSQL/TimescaleDB
  - `trackyu-gps_redis_1` - Cache Redis
  - `trackyu-gps_backend_1` - API Node.js
  - `trackyu-gps_frontend_1` - Nginx (frontend)

## Conventions de code

1. **Pas de composants en double** - Vérifier `/components` et `/features/{module}/components` d'abord
2. **Pas d'URLs API en dur** - Toujours utiliser `/utils/apiConfig.ts`
3. **Utiliser les hooks existants** - Vérifier `/hooks/` avant d'en créer de nouveaux
4. **Textes UI en français** - Les chaînes visibles par l'utilisateur sont en français
5. **Isolation des tenants** - Les routes backend filtrent par `tenant_id` du token JWT

## Pattern des routes backend

Toutes les routes suivent cette structure dans `/backend/src/routes/` :
```typescript
router.get('/', authenticateToken, requirePermission('VIEW_*'), controller.list);
router.post('/', authenticateToken, requirePermission('CREATE_*'), controller.create);
```

## Notes sur les tests

- Frontend : Vitest (`npm run test`)
- Backend : Jest (`cd backend && npm run test`)
- Tests de charge : `npm run load-test:100` (simulation 100 appareils)

## Développement Mobile

### Capacitor (WebView) - `/android`
```powershell
# Synchroniser les changements web vers Android
npx cap sync android

# Ouvrir dans Android Studio
npx cap open android

# Build APK debug
cd android && ./gradlew assembleDebug

# APK généré dans : android/app/build/outputs/apk/debug/
```

### React Native (optionnel) - `/trackyu-mobile`
```powershell
cd trackyu-mobile
npm start              # Metro bundler
npm run android        # Run sur émulateur/device
```

### Points d'attention mobile
- **Safe area** : Utiliser `env(safe-area-inset-*)` pour iOS/Android
- **API URL** : `/utils/apiConfig.ts` détecte automatiquement Capacitor
- **WebSocket** : Utiliser `WS_BASE_URL` pour Socket.IO sur mobile

## Modèle de données unifié (Tiers)

Le système utilise une entité **Tier** unifiée pour gérer Clients, Fournisseurs et Revendeurs :

```typescript
type TierType = 'CLIENT' | 'SUPPLIER' | 'RESELLER' | 'PROSPECT';

interface Tier {
  id: string;
  type: TierType;
  name: string;
  email: string;
  tenantId?: string;
  // Données spécifiques selon le type
  clientData?: { subscriptionPlan: string; resellerId?: string; };
  supplierData?: { paymentTerms: string; };
  resellerData?: { domain: string; whiteLabelConfig: any; };
}
```

**Avantages** : Un revendeur peut aussi être facturé comme client, pas de duplication de données.

## Intégrations externes

### Configuration dans `/backend/.env`
```env
# SMS (Orange CI)
ORANGE_SMS_CLIENT_ID=xxx
ORANGE_SMS_CLIENT_SECRET=xxx
ORANGE_SMS_SENDER_NAME=TrackYu

# Paiements (Wave)
WAVE_API_KEY=xxx

# Notifications
TELEGRAM_BOT_TOKEN=xxx
WHATSAPP_API_TOKEN=xxx

```

### Services disponibles (`/services/`)
| Service | Fichier | Usage |
|---------|---------|-------|
| SMS Orange | `orangeSmsService.ts` | Alertes SMS Côte d'Ivoire |
| Wave | `waveService.ts` | Paiements mobile money |
| Telegram | `telegramService.ts` | Notifications bot |
| WhatsApp | `whatsappService.ts` | Messages clients |

### Ajouter une nouvelle intégration
1. Créer le service dans `/services/{nom}Service.ts`
2. Ajouter les credentials dans `/backend/src/routes/integrationCredentialsRoutes.ts`
3. Exposer via `/backend/src/routes/sendRoutes.ts` si envoi de messages

## Workflows courants

### Ajouter un nouveau module frontend
1. Créer le dossier `/features/{module}/components/`
2. Ajouter la vue principale `{Module}View.tsx`
3. Ajouter le lazy import dans `/LazyViews.tsx`
4. Ajouter la route dans `/App.tsx` (section `renderView`)
5. Ajouter la permission dans `/types/auth.ts` (type `Permission`, re-exporté via `/types.ts`)
6. Ajouter l'entrée menu dans `/components/Sidebar.tsx`

### Ajouter une nouvelle route backend
1. Créer `/backend/src/routes/{entity}Routes.ts`
2. Créer `/backend/src/controllers/{entity}Controller.ts`
3. Enregistrer dans `/backend/src/index.ts` :
```typescript
import entityRoutes from './routes/entityRoutes';
app.use('/api/entity', entityRoutes);
```
4. Ajouter les méthodes dans le module API correspondant (`/services/api/{domaine}.ts`) — la façade `/services/api.ts` assemble automatiquement

### Créer une migration DB
1. Créer `/backend/migrations/{timestamp}_{description}.sql`
2. **En local** : `cd backend && npm run db:migrate`
3. **En production** :
   ```bash
   # Déployer le backend d'abord
   .\deploy.ps1 -backend
   
   # Puis exécuter la migration via SSH
   ssh root@148.230.126.62 "cat /var/www/trackyu-gps/backend/migrations/{fichier}.sql | docker exec -i trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db"
   ```
4. Mettre à jour `/types/{domaine}.ts` si nouveau type

### Gérer les données GPS temps réel
```
Tracker GPS → TCP (port 5000) → /backend/src/gps-server/server.ts → Redis (cache) → Socket.IO → Frontend
                                        ↓
                                  TimescaleDB (historique)
```
- Positions en temps réel : Redis + Socket.IO
- Historique trajets : Table `positions` (hypertable TimescaleDB)
- Replay : API `/api/fleet/vehicles/{id}/history`

## Pipeline GPS - Architecture détaillée

### Flux de données géolocalisation
```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Trackers GPS   │────▶│  gps-server (TCP)    │────▶│  PositionBuffer │
│  (GT06, JT808)  │     │  Port 5000           │     │  (Batch INSERT) │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                │                            │
                                ▼                            ▼
                        ┌──────────────┐            ┌─────────────────┐
                        │    Redis     │            │  TimescaleDB    │
                        │ (Cache IMEI) │            │  (positions)    │
                        └──────────────┘            └─────────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │  Socket.IO   │────▶ Frontend (temps réel)
                        └──────────────┘
```

### Protocoles GPS supportés (`/backend/src/gps-server/parsers/`)
| Protocole | Fichier | Trackers compatibles |
|-----------|---------|----------------------|
| GT06 | `gt06.ts` | Concox, Coban, JM-VL01/02 |
| JT808 | `jt808.ts` | Trackers chinois standard |
| Text Protocol | `textProtocol.ts` | Format texte simple |
| Text Extended | `textExtended.ts` | Format texte étendu |

### Services d'optimisation GPS

**CacheService** (`/backend/src/services/cacheService.ts`)
```typescript
// Cache IMEI → Vehicle pour éviter les lookups DB répétés
const vehicle = await CacheService.getVehicleByImei(imei);
// Cache dernière position pour calcul distance
const lastPos = await CacheService.getLastPosition(vehicleId);
```

**PositionBuffer** (`/backend/src/services/positionBuffer.ts`)
```typescript
// Buffer les positions et INSERT en batch (100 positions/batch)
// Réduit les INSERT individuels de ~80%
positionBuffer.add({
  vehicle_id, latitude, longitude, speed, heading, fuel_liters, raw_data, time
});
```

### Tables TimescaleDB
| Table | Type | Usage |
|-------|------|-------|
| `positions` | Hypertable | Historique GPS (partitionné par temps) |
| `trips` | Table | Trajets calculés (start/end, distance, durée) |
| `vehicles` | Table | État courant des véhicules |

### API Historique/Replay
```typescript
// Récupérer l'historique d'un véhicule
GET /api/fleet/vehicles/:vehicleId/history?startDate=...&endDate=...

// Récupérer les détails d'un trajet avec points GPS
GET /api/fleet/trips/:tripId

// Calculer les trajets à partir des positions brutes
POST /api/fleet/vehicles/:vehicleId/calculate-trips?date=2026-01-15
```

### Ajouter un nouveau protocole GPS
1. Créer `/backend/src/gps-server/parsers/{protocol}.ts`
2. Implémenter l'interface `GpsParser` avec `canParse()` et `parse()`
3. Enregistrer dans `/backend/src/gps-server/server.ts` (array `parsers`)
4. Tester avec un vrai tracker ou simulateur

## Patterns React spécifiques

### Gestion des données (TanStack Query)
Le projet utilise **TanStack Query** via `DataContext` pour le cache et la synchronisation :
```typescript
import { useDataContext } from '../contexts/DataContext';
const { vehicles, clients, refreshData } = useDataContext();

// Pour invalider le cache après mutation
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['vehicles'] });
```

### Notifications toast
Utiliser le hook `useToast` pour les feedbacks utilisateur :
```typescript
import { useToast } from '../contexts/ToastContext';
const { showToast } = useToast();
showToast('Opération réussie', 'success'); // 'success' | 'error' | 'info' | 'warning'
```

### Lazy loading des vues
Les vues lourdes sont chargées à la demande via `/LazyViews.tsx` :
```typescript
export const LazyMapView = withLazyLoad(
    () => import('./features/map/components/MapView').then(m => ({ default: m.MapView })),
    'Carte'
);
```

### WebSocket temps réel
```typescript
// Frontend - écouter les mises à jour
import { getSocket } from '../services/socket';
const socket = getSocket();
socket.on('vehicle:update', (data) => { ... });
socket.emit('join:tenant', tenantId);

// Backend - émettre vers les clients
import { getIO } from './socket';
getIO().to(`tenant:${tenantId}`).emit('vehicle:update', payload);
```

## Structure des menus (Sidebar)

Les menus sont définis dans `/components/Sidebar.tsx` avec contrôle RBAC :
```typescript
const menuGroups = [
  { title: "Opérations", items: [
    { view: View.DASHBOARD, label: "Tableau de bord", icon: LayoutDashboard, requiredPerm: 'VIEW_DASHBOARD' },
    // ...
  ]},
  // Groupes: Opérations, Business, Technique, Support, Admin
];
```

## Erreurs courantes à éviter

1. **Ne pas oublier `tenant_id`** - Toutes les requêtes backend doivent filtrer par tenant
2. **Toujours utiliser `useDataContext`** - Ne pas faire d'appels API directs dans les composants
3. **Invalider le cache après mutation** - Appeler `queryClient.invalidateQueries()` après create/update/delete
4. **Icônes Lucide** - Utiliser `lucide-react` pour la cohérence visuelle
5. **Dates** - Utiliser `date-fns` pour le formatage (pas moment.js)

## Services backend importants

### Scheduler (`/backend/src/services/scheduler.ts`)
Tâches automatiques en arrière-plan :
- **Automations** : Toutes les heures (factures en retard, contrats expirants)
- **Recouvrement** : Toutes les 6 heures
- **Nettoyage** : Quotidien (logs anciens)
- **Rappels inscription** : Toutes les 5 minutes

### AutomationEngine (`/backend/src/services/automationEngine.ts`)
Triggers CRM automatiques :
```typescript
// Triggers supportés
'LEAD_CREATED' | 'QUOTE_SENT' | 'INVOICE_OVERDUE' | 'CONTRACT_EXPIRING' ...

// Actions possibles
'CREATE_TASK' | 'SEND_EMAIL' | 'SEND_SMS' | 'SEND_TELEGRAM' | 'UPDATE_STATUS' ...
```

### NotificationDispatcher (`/backend/src/services/notificationDispatcher.ts`)
Envoi unifié multi-canal :
```typescript
await notificationDispatcher.send({
  channel: 'SMS', // 'EMAIL' | 'SMS' | 'TELEGRAM' | 'WHATSAPP' | 'PUSH'
  sms: { to: '+225XXXXXXXXXX', message: 'Alerte véhicule' },
  tenantId: '...'
});
```

### AuditService (`/backend/src/services/AuditService.ts`)
Journalisation des actions sensibles :
```typescript
import { AuditService } from '../services/AuditService';
AuditService.log({
  userId: user.id,
  action: 'DELETE',
  entityType: 'vehicle',
  entityId: vehicleId,
  details: { reason: 'Véhicule vendu' }
});
```

## Formatage et localisation

### Monnaie (FCFA / XOF)
```typescript
// Format français avec devise FCFA
new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
// Résultat : "1 500 000 FCFA"
```

### Dates avec date-fns
```typescript
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

format(new Date(), 'dd MMMM yyyy', { locale: fr })
// Résultat : "15 janvier 2026"
```

## Classes CSS utilitaires mobile

Le projet utilise des classes CSS pour gérer les safe areas iOS/Android :
```css
/* /src/index.css */
.safe-area-top { padding-top: env(safe-area-inset-top); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-area-left { padding-left: env(safe-area-inset-left); }
.safe-area-right { padding-right: env(safe-area-inset-right); }
```

## Hooks utilitaires disponibles

| Hook | Fichier | Usage |
|------|---------|-------|
| `useAuth` | `contexts/AuthContext.tsx` | Auth, permissions, impersonation |
| `useDataContext` | `contexts/DataContext.tsx` | Données globales (vehicles, clients...) |
| `useToast` | `contexts/ToastContext.tsx` | Notifications toast |
| `useTheme` | `contexts/ThemeContext.tsx` | Dark/Light mode |
| `useCurrency` | `hooks/useCurrency.ts` | Formatage monétaire |
| `useDateRange` | `hooks/useDateRange.ts` | Sélection de plages de dates |
| `useAuditTrail` | `hooks/useAuditTrail.ts` | Historique des modifications |
| `useFilteredData` | `hooks/useFilteredData.ts` | Filtrage/recherche générique |
| `useSwipeBack` | `hooks/useSwipeBack.ts` | Navigation swipe (mobile) |

---

## ⚠️ CONSIGNES POUR AGENTS IA - Erreurs fréquentes à éviter

### 🔴 Erreurs critiques (causent des bugs en production)

#### 1. Oublier le filtrage `tenant_id`
**TOUJOURS** filtrer par `tenant_id` dans les requêtes backend pour respecter l'isolation multi-tenant :
```typescript
// ❌ MAUVAIS - Fuite de données entre tenants
const vehicles = await db.query('SELECT * FROM vehicles');

// ✅ BON - Isolation par tenant
const vehicles = await db.query('SELECT * FROM vehicles WHERE tenant_id = $1', [req.user.tenantId]);
```

#### 2. Créer des doublons d'entités
Vérifier l'existence avant création (pattern 409 Conflict) :
```typescript
// ❌ MAUVAIS - Création sans vérification
await db.query('INSERT INTO devices (imei, ...) VALUES ($1, ...)', [imei]);

// ✅ BON - Vérification préalable
const existing = await db.query('SELECT id FROM devices WHERE imei = $1 AND tenant_id = $2', [imei, tenantId]);
if (existing.rows.length > 0) {
  return res.status(409).json({ error: 'Device with this IMEI already exists' });
}
```

**Champs uniques à vérifier :**
- `devices.imei` - IMEI du tracker
- `users.email` - Email utilisateur
- `tiers.email` (par type et tenant)
- `tenants.slug` - Slug du tenant
- `leads.email` + `leads.company_name` (combinaison)

#### 3. Ne pas invalider le cache TanStack Query
Après une mutation (create/update/delete), toujours invalider :
```typescript
// ❌ MAUVAIS - UI désynchronisée
await api.vehicles.create(data);

// ✅ BON - Cache invalidé
await api.vehicles.create(data);
queryClient.invalidateQueries({ queryKey: ['vehicles'] });
```

#### 4. Appels API directs sans passer par `api.ts`
```typescript
// ❌ MAUVAIS - Ne fonctionne pas avec le mode mock
const response = await fetch('/api/vehicles');

// ✅ BON - Passe par le service centralisé
import { api } from '../services/api';
const vehicles = await api.vehicles.list();
```

### 🟡 Erreurs moyennes (causent des régressions)

#### 5. Créer des composants en double
**TOUJOURS** vérifier avant de créer :
```
/components/              → Composants UI génériques réutilisables
/features/{module}/components/  → Composants spécifiques au module
```
Rechercher d'abord : `grep -r "ComponentName" /components /features`

#### 6. Hardcoder les URLs API
```typescript
// ❌ MAUVAIS - Ne fonctionne pas sur mobile Capacitor
const API_URL = 'http://localhost:3001';

// ✅ BON - Détection automatique web/mobile
import { API_BASE_URL } from '../utils/apiConfig';
```

#### 7. Modifier la base de données sans migration
```bash
# ❌ MAUVAIS - Modification directe
ALTER TABLE vehicles ADD COLUMN new_field VARCHAR(255);

# ✅ BON - Créer une migration
# 1. Créer /backend/migrations/{timestamp}_add_new_field.sql
# 2. Exécuter : cd backend && npm run db:migrate
# 3. Mettre à jour /types/{domaine}.ts si nouveau type
```

#### 8. Oublier les permissions RBAC
```typescript
// ❌ MAUVAIS - Route sans protection
router.get('/sensitive-data', controller.getData);

// ✅ BON - Route protégée
router.get('/sensitive-data', authenticateToken, requirePermission('VIEW_SENSITIVE'), controller.getData);
```

### 🟢 Bonnes pratiques (améliorent la qualité)

#### 9. Utiliser les types partagés de `/types/`
```typescript
// ❌ MAUVAIS - Type inline
const vehicle: { id: string; name: string; plate: string } = ...

// ✅ BON - Type centralisé (import depuis types/ ou types.ts)
import { Vehicle } from '../types';
const vehicle: Vehicle = ...
```

#### 10. Respecter le pattern de validation Zod
```typescript
// ❌ MAUVAIS - Validation manuelle
if (!data.email || !data.email.includes('@')) { ... }

// ✅ BON - Schéma Zod réutilisable
import { VehicleSchema } from '../schemas/vehicleSchema';
const result = VehicleSchema.safeParse(data);
if (!result.success) return res.status(400).json({ errors: result.error.flatten() });
```

#### 11. Logger les actions sensibles avec AuditService
```typescript
// Pour DELETE, UPDATE sur données critiques
AuditService.log({
  userId: req.user.id,
  action: 'DELETE',
  entityType: 'vehicle',
  entityId: vehicleId,
  details: { reason: 'Supprimé via interface admin' }
});
```

#### 12. Utiliser les bons formats de données
```typescript
// Dates - toujours date-fns avec locale française
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
format(date, 'dd MMMM yyyy', { locale: fr });

// Monnaie - format FCFA
new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

// Icônes - lucide-react uniquement
import { Car, User, Settings } from 'lucide-react';
```

### 🔍 Checklist avant de soumettre du code

- [ ] `tenant_id` filtré dans toutes les requêtes DB
- [ ] Vérification d'existence avant INSERT (entités uniques)
- [ ] Cache TanStack Query invalidé après mutations
- [ ] Pas d'URLs API hardcodées
- [ ] Pas de composants dupliqués
- [ ] Migration créée si modification DB
- [ ] Types importés depuis `/types/` (ou `/types.ts` via re-export)
- [ ] Permissions RBAC sur les nouvelles routes
- [ ] Textes UI en français
- [ ] Tests manuels en mode mock (`VITE_USE_MOCK=true`)

### 📁 Fichiers à ne JAMAIS modifier sans raison valable

| Fichier | Raison |
|---------|--------|
| `/types/` | Source de vérité des types partagés (14 modules par domaine) |
| `/services/api.ts` | Façade API — ne pas modifier directement, éditer les modules dans `services/api/` |
| `/contexts/AuthContext.tsx` | Authentification critique |
| `/backend/src/index.ts` | Point d'entrée, routes enregistrées |
| `/utils/apiConfig.ts` | Détection URL Capacitor/web |
| `/backend/src/middleware/authMiddleware.ts` | Sécurité RBAC |

### 🚫 Patterns interdits

```typescript
// ❌ console.log en production (utiliser logger)
console.log('debug', data);

// ❌ any sans justification
const data: any = ...

// ❌ Ignorer les erreurs silencieusement
try { ... } catch (e) { /* silence */ }

// ❌ Mélanger logique métier et UI dans un composant
// Extraire dans un hook ou service

// ❌ Import * (tree-shaking cassé)
import * as Icons from 'lucide-react';

// ❌ Mutation d'état directe
state.items.push(newItem); // Utiliser setState ou spread
```

### 📝 Où trouver les exemples de code

| Besoin | Exemple dans le projet |
|--------|------------------------|
| Nouveau module frontend | `/features/crm/` (structure complète) |
| Route backend CRUD | `/backend/src/routes/vehicleRoutes.ts` |
| Formulaire avec validation | `/features/crm/components/LeadFormModal.tsx` |
| Liste avec filtres | `/features/fleet/components/FleetView.tsx` |
| Export PDF/CSV | `/features/finance/components/InvoiceList.tsx` |
| WebSocket temps réel | `/features/map/components/MapView.tsx` |
| Détection doublons | `/backend/src/controllers/deviceController.ts:54` |
