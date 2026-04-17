# TrackYu Mobile — Documentation Projet

> Dernière mise à jour : 2026-04-10 (sessions 14-15 — Audit mobile complet : accessibilité, SearchBar, tests unitaires, Sentry plugin, E2E Maestro)
> Auteur : Développement TrackYu GPS

---

## 1. Contexte & Objectif

TrackYu Mobile est l'application mobile officielle de **TrackYu GPS**, plateforme de géolocalisation de flotte.
Elle remplace la PWA mobile (abandonnée le 2026-04-01) suite à des limitations de performance et d'expérience utilisateur sur Android.

**Concurrent principal** : TRAKZEE
**Cible** : Clients finaux, techniciens terrain, staff interne (admin, manager, commercial, opérateur)

---

## 2. Stack Technique

| Couche            | Technologie                               | Version  |
| ----------------- | ----------------------------------------- | -------- |
| Framework         | Expo                                      | ~54.0.33 |
| Runtime           | React Native                              | 0.81.5   |
| UI                | React                                     | 19.1.0   |
| Navigation        | React Navigation                          | v7       |
| État serveur      | TanStack React Query + PersistQueryClient | v5       |
| État client       | Zustand                                   | v5       |
| HTTP              | Axios                                     | v1       |
| WebSocket         | Socket.IO Client                          | v4       |
| Stockage sécurisé | react-native-keychain                     | v10      |
| Cartes            | react-native-maps (Google)                | 1.20.1   |
| Icônes            | lucide-react-native                       | v1.7     |
| Monitoring        | Sentry React Native                       | ~7.2     |
| Langage           | TypeScript                                | ~5.9     |
| Nouvelle archi RN | newArchEnabled: true                      | —        |

---

## 3. Architecture

### 3.1 Structure des dossiers

```
src/
├── App.tsx                    # Point d'entrée — providers, Sentry, React Query
├── api/                       # Couche réseau REST
│   ├── client.ts              # Axios instance + intercepteurs JWT/401
│   ├── config.ts              # API_URL, WS_URL (trackyugps.com)
│   ├── vehicles.ts            # GET /fleet/vehicles — normalizeVehicle(), getTrips(), getHistory(), getDayStats(), getFuelStats(), togglePanne()
│   ├── geofencesApi.ts        # GET /monitoring/geofences — Geofence, isCircle(), toLatLng()
│   ├── alerts.ts              # GET /monitoring/alerts
│   ├── auth.ts                # POST /auth/login, logout, getStoredUser
│   ├── financeApi.ts          # Factures, devis, contrats, paiements
│   ├── interventions.ts       # GET /tech/interventions + stats, countByStatus()
│   ├── portal.ts              # API portail client (CLIENT)
│   ├── tickets.ts             # GET /tickets — staff/support + getCategories(), getSubCategories()
│   ├── crmApi.ts              # GET /crm/leads — commercial/admin (VIEW_CRM)
│   └── users.ts               # GET /users — admin (VIEW_USERS) + profil
├── services/
│   └── websocket.ts           # Singleton Socket.IO — join:tenant/superadmin, backoff exponentiel
├── store/
│   ├── authStore.ts           # Zustand — user, isAuthenticated, login/logout
│   └── vehicleStore.ts        # Zustand — Map<id, Vehicle>, CRUD temps réel
├── navigation/
│   ├── RootNavigator.tsx      # Auth ↔ Main switch + tous les root stack screens
│   ├── MainNavigator.tsx      # Routage par rôle (CLIENT/TECH/SUPPORT_AGENT/STAFF)
│   ├── StaffNavigator.tsx     # Tabs : Dashboard, Carte, Flotte, Finance, Paramètres
│   ├── SupportNavigator.tsx   # Tabs : Dashboard, Carte, Flotte, Tickets, Paramètres
│   ├── ClientNavigator.tsx    # Tabs : Dashboard, Carte, Flotte, Rapports, Paramètres
│   ├── TechNavigator.tsx      # Tabs : TechDashboard, Agenda, Tech, Paramètres
│   ├── AuthNavigator.tsx      # Login
│   ├── PortalNavigator.tsx    # Stack portail client (Mon Espace)
│   ├── linking.ts             # Deep linking trackyu:// (vehicle, alerts, ticket, portal)
│   └── navigationRef.ts       # createNavigationContainerRef — navigation hors arbre React
├── screens/
│   ├── auth/                  # LoginScreen
│   ├── main/                  # Dashboard, Map, Fleet, Finance, VehicleDetail,
│   │                          # VehicleHistory, Alerts, Reports, Profile, FleetAnalytics, Geofences, CreateTicket
│   ├── tech/                  # TechDashboard, Agenda, TechScreen, InterventionDetail
│   ├── support/               # SupportTicketsScreen, SupportTicketDetailScreen
│   ├── admin/                 # UsersScreen
│   ├── crm/                   # LeadsScreen
│   └── portal/                # ClientPortal, Invoices, InvoiceDetail, Contracts, Payments,
│                              # Subscriptions, Tickets, TicketDetail, NewTicket,
│                              # Interventions, InterventionDetail, ContractDocument
├── components/
│   ├── SearchBar.tsx          # Composant shared unifié (remplace tous les TextInput inline de recherche)
│   ├── ErrorBoundary.tsx      # Catch React errors par zone
│   ├── OfflineBanner.tsx      # Bannière réseau hors ligne animée
│   ├── SkeletonLoader.tsx     # Squelettes véhicules (SkeletonBlock, VehicleCardSkeleton, FleetScreenSkeleton, VehicleDetailSkeleton)
│   ├── SkeletonBox.tsx        # Squelettes portail CLIENT (SkeletonBox, SkeletonCard, SkeletonRow, SkeletonDashboard, SkeletonInterventionCard, SkeletonChat, SkeletonDetail)
│   ├── SessionExpiredModal.tsx# Modal re-login quand JWT expire (401) — sans hard logout
│   └── AppUpdateBanner.tsx    # Banner soft / modal bloquant force-upgrade
├── hooks/
│   ├── useNetworkStatus.ts    # NetInfo — reconnexion → invalidate queries ciblées
│   ├── usePushNotifications.ts# Expo Notifications + deep linking tap (cold start inclus)
│   └── useAppVersionCheck.ts  # GET /app/version → forceUpgrade / softUpgrade
├── utils/
│   ├── secureStorage.ts       # Keychain/Keystore — token JWT + user
│   ├── storage.ts             # AsyncStorage wrapper (getString/set/delete)
│   ├── formatCurrency.ts      # formatCurrency(amount, currency='XOF')
│   ├── errorTypes.ts          # normalizeError()
│   ├── authReset.ts           # Circuit breaker 401 → triggerSessionExpired() / triggerAuthReset()
│   ├── haptics.ts             # Wrapper expo-haptics (light/medium/heavy/success/error/warning)
│   ├── ticketHelpers.ts       # generateSubjectAndDesc(), isValidDate(), isValidTime(), toISO() — testés
│   ├── vehicleStatus.ts       # Source canonique couleurs + labels statuts véhicule (VEHICLE_STATUS_COLORS, VEHICLE_STATUS_LABELS)
│   └── portalColors.ts        # Source unique couleurs statuts portail (tickets, factures, contrats)
├── __tests__/                 # 20 suites / 581 tests — node env, aucune dépendance native
│   ├── authStore.test.ts      # Zustand authStore (login, logout, restore, roles)
│   ├── vehicleStore.test.ts   # Zustand vehicleStore (CRUD, merge REST/WS)
│   ├── vehicleStatus.test.ts  # Couleurs + labels statuts (31 cas)
│   ├── ticketHelpers.test.ts  # Helpers tickets (isValidDate bug corrigé)
│   ├── normalizeError.test.ts # normalizeError() edge cases
│   ├── roles.test.ts          # Matrice rôles / permissions
│   ├── generators.test.ts     # Générateurs de données
│   ├── reportsApi.test.ts     # API rapports (schedules)
│   ├── alertsApi.test.ts      # API alertes
│   ├── vehiclesApi.test.ts    # API véhicules
│   ├── financeApi.test.ts     # API finance
│   ├── ticketsApi.test.ts     # API tickets
│   ├── interventionsApi.test.ts # API interventions
│   ├── usersApi.test.ts       # API utilisateurs
│   ├── crmApi.test.ts         # API CRM
│   ├── geofencesApi.test.ts   # API geofences
│   ├── maintenanceApi.test.ts # API maintenance
│   ├── ecoDrivingApi.test.ts  # API éco-conduite
│   ├── expensesApi.test.ts    # API dépenses
│   └── tiresApi.test.ts       # API pneumatiques
└── theme/
    ├── tokens.ts              # Spacing, radius, typography, status colors, shadows
    ├── themes.ts              # 3 thèmes : dark, ocean, light + white label
    ├── ThemeContext.tsx        # Provider + useTheme() hook
    └── index.ts               # Exports
```

### 3.2 Flux de données

```
Backend REST (trackyugps.com/api)
        ↓ axios + JWT interceptor
    vehicles.ts → normalizeVehicle() → vehicleStore (Zustand)
                                            ↓
                                    FleetScreen / MapScreen

Backend WebSocket (wss://trackyugps.com)
        ↓ socket.io-client + JWT auth + backoff exponentiel (1s → 30s)
    wsService.connect() → join:tenant | join:superadmin
        ↓ vehicle:update event
    vehicleStore.updateVehicle() → re-render temps réel MapScreen

React Query cache persistence (AsyncStorage, TTL 24h)
    PersistQueryClientProvider → AsyncStorage TRACKYU_QUERY_CACHE
    → démarrage instantané depuis cache (stale: 5min, gcTime: 24h)
    → re-fetch réseau en background si stale

Notifications push → deep link
    usePushNotifications → tap → handleNotificationNavigation()
    → navigationRef.navigate('VehicleDetail' | 'Alerts' | 'SupportTicketDetail' | 'Portal')
    → cold start : getLastNotificationResponseAsync() + setTimeout 500ms
```

### 3.3 Routage par rôle

| Rôle                                                       | Navigator        | Onglets                                               |
| ---------------------------------------------------------- | ---------------- | ----------------------------------------------------- |
| ADMIN, MANAGER, SUPERADMIN, COMMERCIAL, OPERATOR, RESELLER | StaffNavigator   | Dashboard · Carte · Flotte · Finance · Paramètres     |
| SUPPORT_AGENT                                              | SupportNavigator | Dashboard · Carte · Flotte · **Tickets** · Paramètres |
| TECH                                                       | TechNavigator    | TechDashboard · Agenda · Tech · Paramètres            |
| CLIENT                                                     | ClientNavigator  | Dashboard · Carte · Flotte · Rapports · Paramètres    |
| Inconnu                                                    | ClientNavigator  | Accès minimal (sécurité)                              |

**Root stack commun** : `VehicleDetail`, `VehicleHistory`, `CreateTicket`, `InterventionDetail`, `Alerts`, `Reports`, `Portal`, `SupportTicketDetail`, `AdminUsers`, `CRMLeads`, `FleetAnalytics`, `Geofences`.

---

## 4. Backend

| Paramètre         | Valeur                                          |
| ----------------- | ----------------------------------------------- |
| VPS               | root@51.178.139.57 (alias : trackyu-vps)        |
| Stack             | Node.js 18 (Docker)                             |
| Container backend | trackyu-gps-backend-1                           |
| Container DB      | 6e9a3283ca3b (fleet_db / fleet_user)            |
| Port backend      | 3001                                            |
| Dist              | /var/www/trackyu-gps/backend/dist/              |
| Déploiement       | deploy.ps1 — **jamais d'upload manuel du dist** |

### Endpoints mobiles ajoutés (2026-04-07)

| Méthode | Route                                         | Description                                                              |
| ------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| GET     | `/fleet/vehicles/:id/day-stats?date=`         | Stats du jour (trajets, distances, temps conduite/arrêt/ralenti/offline) |
| POST    | `/fleet/vehicles/:id/panne`                   | Toggle isPanne (body: `{ isPanne: boolean }`)                            |
| GET     | `/fleet/vehicles/:id/fuel-stats`              | Stats carburant du jour (consommation, rechargements, baisses suspectes) |
| GET     | `/portal/dashboard`                           | Tableau de bord CLIENT (factures, tickets, contrats)                     |
| GET     | `/portal/contracts`                           | Contrats du client                                                       |
| GET     | `/portal/subscriptions`                       | Abonnements du client                                                    |
| GET     | `/portal/invoices/:id`                        | Détail facture avec items                                                |
| GET     | `/portal/tickets/:id`                         | Détail ticket avec messages                                              |
| GET     | `/support/settings/categories`                | Catégories de tickets (pour CreateTicket)                                |
| GET     | `/support/settings/subcategories?categoryId=` | Sous-catégories cascade                                                  |
| GET     | `/portal/payment-settings`                    | Lien Wave + numéro Orange Money du tenant (patch script)                 |
| GET     | `/portal/interventions`                       | Interventions du client (filtré clientId)                                |
| GET     | `/portal/interventions/:id`                   | Détail intervention avec PDF Bon + Rapport                               |
| POST    | `/tickets/:id/attachments`                    | Upload pièce jointe ticket (multipart/form-data)                         |
| POST    | `/tickets/:id/messages/client`                | Réponse client à un ticket                                               |

### Mapping vehicle backend → mobile

`normalizeVehicle()` dans `vehicles.ts` gère snake_case + camelCase legacy.
Champs enrichis : `address`, `days_until_expiration`, `sim_phone_number`, `mileage`, `tank_capacity`, `fuel_sensor_type`, `fuel_type`, `is_panne`.

---

## 5. Charte Graphique

### Thèmes disponibles

| Thème        | ID      | Fond principal | Couleur primaire |
| ------------ | ------- | -------------- | ---------------- |
| TrackYu Dark | `dark`  | #0D0D0F        | #E8771A (orange) |
| Ocean Dark   | `ocean` | #080E1A        | #3B82F6 (bleu)   |
| Light Pro    | `light` | #F8FAFC        | #E8771A (orange) |

**Défaut** : `light`
**White label** : `primaryOverride` via `applyResellerConfig()`

### Couleurs statut véhicule

| Statut  | Couleur          | Label FR   |
| ------- | ---------------- | ---------- |
| moving  | #22C55E (vert)   | En route   |
| idle    | #F97316 (orange) | Ralenti    |
| stopped | #EF4444 (rouge)  | Arrêté     |
| offline | #6B7280 (gris)   | Hors ligne |

**Source canonique** : `src/utils/vehicleStatus.ts` — `VEHICLE_STATUS_COLORS`, `VEHICLE_STATUS_LABELS`, `vehicleStatusColor()`, `vehicleStatusLabel()`.
**Règle** : Tous les écrans utilisent `const { theme } = useTheme()`. Couleurs statut toujours depuis `vehicleStatus.ts`.

---

## 6. Clés & Credentials

| Service                            | Clé/Config                                 | Emplacement                                                          |
| ---------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| Google Maps Android (mobile)       | EAS Secret `GOOGLE_MAPS_API_KEY`           | Injecté au build via app.config.js                                   |
| Google Maps serveur (snap-to-road) | AIzaSyB-ujm0mPb55Tr-dlhgRhHtBkLLkNzgXNE    | DB settings.GOOGLE_MAPS_API_KEY                                      |
| Firebase Android                   | google-services.json                       | Racine du projet                                                     |
| Firebase iOS                       | GoogleService-Info.plist                   | Racine du projet                                                     |
| Sentry DSN                         | EAS Secret `SENTRY_DSN` (jamais hardcodé)  | Injecté via `app.config.js` → `Constants.expoConfig.extra.sentryDsn` |
| Sentry Auth Token                  | EAS Secret `SENTRY_AUTH_TOKEN`             | Upload source maps au build EAS                                      |
| Sentry Org / Project               | EAS Secrets `SENTRY_ORG`, `SENTRY_PROJECT` | Plugin `@sentry/react-native/expo`                                   |
| EAS Project ID                     | 2c6b9999-f36c-4b33-af68-fa01eee4c352       | app.config.js                                                        |

**Important** : La clé Maps n'est plus dans app.json ni AndroidManifest.xml. Elle est injectée depuis les EAS Secrets au build.

---

## 7. Bonnes pratiques déjà en place

| Pratique           | Détail                                                                          |
| ------------------ | ------------------------------------------------------------------------------- |
| Crash reporting    | Sentry avec DSN EU, tracesSampleRate 0.2 prod, beforeSend filtrant AUTH/NETWORK |
| Error Boundary     | Classe component wrappant la navigation entière                                 |
| Mode hors ligne    | NetInfo + OfflineBanner animée + re-fetch auto à la reconnexion                 |
| Temps réel         | WebSocket Socket.IO JWT, backoff 1s→30s, rooms par rôle                         |
| Store véhicules    | vehicleStore Zustand alimenté par WebSocket, MapScreen subscriber               |
| Skeleton loaders   | SkeletonBlock, VehicleCardSkeleton, FleetScreenSkeleton, VehicleDetailSkeleton  |
| Sécurité tokens    | react-native-keychain, interceptor 401 → triggerAuthReset()                     |
| Push notifications | expo-notifications, hook dédié usePushNotifications                             |
| React Query        | retry: 2, backoff exponentiel, staleTime: 5min                                  |
| Config dynamique   | app.config.js (remplace app.json pour les secrets)                              |

---

## 8. Écrans — Inventaire complet

### Auth

| Écran       | Statut     |
| ----------- | ---------- |
| LoginScreen | ✅ Complet |

### Staff (ADMIN, MANAGER, SUPERADMIN, COMMERCIAL, OPERATOR, RESELLER)

| Écran                | Statut    | Notes                                                                                                                                                                                                                                                    |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DashboardScreen      | ✅        | KPIs par roleFamily. Accès rapides role-aware                                                                                                                                                                                                            |
| MapScreen            | ✅ v2     | Google Maps, WebSocket temps réel, geofences overlay, **clustering supercluster** (zoom-in au tap)                                                                                                                                                       |
| FleetScreen          | ✅ **v3** | SectionList, filtres En route·Arrêt·Ralenti·Hors ligne·Tous, recherche IMEI+clientName+IMEI (local+serveur), VehicleCard compact toggle, long press QuickActions, export CSV, texte rouge >24h offline, icône immobilisation cadenas                     |
| FinanceScreen        | ✅        | Factures, devis, contrats, paiements                                                                                                                                                                                                                     |
| ProfileScreen        | ✅        | Modifier profil, mot de passe, préférences, support                                                                                                                                                                                                      |
| VehicleDetailScreen  | ✅ **v3** | 9 blocs collapsibles, trajet du jour (Polyline bleue + région auto), pill immobilisation LockOpen/Lock, kilométrage compact (125k/1.2M), marker cercle+plaque (crash SVG Android corrigé)                                                                |
| VehicleHistoryScreen | ✅ **v5** | Pills compactes (dot bleu si données), Perso. après Hier, bottom sheet coulissant (Animated+PanResponder), onglets Trajets·Arrêts·Alertes, alertes API réelles, StatsBar "Alertes" au lieu de "Points GPS", carte flex:1, label plaque sur marker replay |
| CreateTicketScreen   | ✅        | Catégories depuis DB, sous-catégories cascade, auto-fill description                                                                                                                                                                                     |
| FleetAnalyticsScreen | ✅        | Stats agrégées 7d/30d/90d                                                                                                                                                                                                                                |
| GeofencesScreen      | ✅        | CIRCLE/POLYGON/ROUTE, overlay carte                                                                                                                                                                                                                      |
| AlertsScreen         | ✅        | Pagination infinie, toast temps réel                                                                                                                                                                                                                     |
| ReportsScreen        | ✅        | Export XLS, 7 modules                                                                                                                                                                                                                                    |
| UsersScreen          | ✅        | Liste users, search, filtres rôle                                                                                                                                                                                                                        |
| LeadsScreen          | ✅        | CRM leads, KPIs, filtres                                                                                                                                                                                                                                 |

### Support (SUPPORT_AGENT)

| Écran                     | Statut |
| ------------------------- | ------ |
| SupportTicketsScreen      | ✅     |
| SupportTicketDetailScreen | ✅     |

### Tech

| Écran                    | Statut |
| ------------------------ | ------ |
| TechDashboardScreen      | ✅     |
| AgendaScreen             | ✅     |
| TechScreen               | ✅     |
| InterventionDetailScreen | ✅     |

### Client (5 onglets + Mon Espace)

| Écran                          | Accès        | Statut | Notes                                                    |
| ------------------------------ | ------------ | ------ | -------------------------------------------------------- |
| DashboardScreen (CLIENT)       | Onglet 1     | ✅     | —                                                        |
| MapScreen                      | Onglet 2     | ✅     | —                                                        |
| FleetScreen                    | Onglet 3     | ✅     | —                                                        |
| ReportsScreen                  | Onglet 4     | ✅     | —                                                        |
| ProfileScreen (+ Mon Espace)   | Onglet 5     | ✅     | —                                                        |
| ClientPortalScreen             | Portal stack | ✅     | Skeleton, bannière solde dû, navigation Map cross-stack  |
| PortalInvoicesScreen           | Portal stack | ✅     | Skeleton, pagination infinie                             |
| PortalInvoiceDetailScreen      | Portal stack | ✅     | Modal "Payer maintenant" Wave + Orange Money             |
| PortalContractsScreen          | Portal stack | ✅     | Skeleton, PDF téléchargeable                             |
| PortalPaymentsScreen           | Portal stack | ✅     | Skeleton, fix refreshing bug                             |
| PortalSubscriptionsScreen      | Portal stack | ✅     | Countdown J-X, "Demander une intervention" pré-rempli    |
| PortalTicketsScreen            | Portal stack | ✅     | Skeleton, useInfiniteQuery pagination                    |
| PortalTicketDetailScreen       | Portal stack | ✅     | Skeleton chat, état isError géré                         |
| PortalNewTicketScreen          | Portal stack | ✅     | Préfill sujet/description, pièces jointes (max 3 photos) |
| PortalInterventionsScreen      | Portal stack | ✅     | Skeleton, filtres statut, fix backgroundColor thémable   |
| PortalInterventionDetailScreen | Portal stack | ✅     | Skeleton, PDF Bon + Rapport                              |
| PortalContractDocumentScreen   | Root stack   | ✅     | PDF contrat généré mobile                                |

---

## 9. Historique des chantiers

### Chantier 1 — CLIENT ✅ (2026-04-06)

Navigation 5 onglets + backend portal routes + corrections API mismatches.

### Chantier 2 — Vue Technicien ✅ (2026-04-06)

Filtrage interventions par technicianId, stats KPIs corrigés, AgendaScreen 403 résolu.

### Chantier 3 — Vue Support ✅ (2026-04-06)

SUPPORT_AGENT → SupportNavigator. Liste tickets + détail + messagerie.

### Chantier 4 — Vue Admin/SuperAdmin ✅ (2026-04-06)

UsersScreen : liste, search, filtres rôle.

### Chantier 5 — Vue Commercial/Comptable ✅ (2026-04-06)

LeadsScreen CRM, accès rapides Commercial.

### Chantier 6 — Suivi GPS ✅ (2026-04-06)

VehicleHistoryScreen enrichi (trajets serveur). FleetAnalyticsScreen.

### Chantier 7 — Geofencing ✅ (2026-04-06)

GeofencesScreen + overlay MapScreen.

### Chantier 8 — VehicleDetail v2 + CreateTicket ✅ (2026-04-07)

**VehicleDetailScreen v2 — refonte complète**

- Carte 400px + 3 boutons overlay (Voir sur carte, Aller vers, Historique)
- Pill row : Vitesse · Direction · Contact · **Kilométrage** (odomètre)
- 9 blocs collapsibles avec ordre persisté (AsyncStorage) : Position GPS, Immobilisation, Départ & Dernier arrêt, Activité du jour, Carburant, Panne, Alertes, Infos véhicule, Conducteur
- Immobilisation : Switch → modal confirmation mot de passe
- isPanne : toggle optimiste + mutation
- Carburant : niveau barre + tank capacity + stats du jour (si capteur)
- Activité du jour : 6 StatPills (distance, trajets, vit.max, conduite, arrêt, ralenti)
- Modal ordre des blocs (flèches haut/bas, persisté AsyncStorage)
- Actions bar : Historique, Signaler (→ CreateTicket), Abonnement (placeholder)

**CreateTicketScreen — nouveau**

- Catégories dynamiques depuis `/support/settings/categories`
- Sous-catégories cascade depuis `/support/settings/subcategories?categoryId=`
- Auto-fill sujet + description : logique web (`generateSubjectAndDesc`)
- Préfill vehicle_id + plaque (lecture seule)

**Backend patches (2026-04-07)**

- `objectController.js` : `getObjectDayStats` → appelle `objectRepository.getDayStats()`
- `objectRepository.js` : `getDayStats()` SQL (trips + positions speed thresholds), `getPositionHistory()` supporte startTime/endTime
- `objectController.js` : `toggleObjectPanne`, `getObjectHistorySnapped` fix `_c` déclaré
- `GoogleMapsService.js` : fallback env var `process.env.GOOGLE_MAPS_API_KEY`
- `contractRepository.js` : `c.client_id` → `c.tier_id` (colonne inexistante corrigée)
- `portalRoutes.js` : suppression `AND i.deleted_at IS NULL` (colonne inexistante)

### Chantier 9 — FleetScreen + VehicleHistory + Sécurité ✅ (2026-04-07)

**FleetScreen**

- Tri alphabétique des groupes (clients/branches)
- Badge vitesse : colonne, `Math.round()`, icône 16px, "km/h" sous la valeur
- Ligne icônes : `justifyContent: 'space-between'`
- Pagination infinie (`onEndReached` au lieu de bouton "Voir plus")
- Chips : `flexShrink: 0`, visibilité corrigée

**VehicleHistoryScreen v2**

- Sélecteur de date étendu à **30 jours** (était 7)
- Bouton **Perso.** → modal plage date+heure (début/fin) avec validation et raccourcis
- Backend : `getPositionHistory` supporte `startTime`/`endTime`
- API `getHistory()` + `getTrips()` : paramètres optionnels pour plage custom
- En mode Perso., la liste trajets affiche la date en plus de l'heure

**Sécurité Google Maps**

- Clé `AIzaSyB-ujm0...` migrée vers **EAS Secret** (non exposée dans le code)
- `app.config.js` créé (remplace les valeurs sensibles de app.json)
- `AndroidManifest.xml` nettoyé de la clé hardcodée
- Expo injecte la clé au build depuis `process.env.GOOGLE_MAPS_API_KEY`

**Portal CLIENT — fixes backend**

- `column i.deleted_at` : retiré des requêtes invoices
- `column c.client_id` : remplacé par `c.tier_id` dans contractRepository
- `database_1 is not defined` : SQL day-stats déplacé dans objectRepository

**ProfileScreen**

- Section "Mon Espace Client" visible uniquement pour rôle CLIENT → navigue vers Portal

---

## 10. Chantier 10 — Sprints Performance & Qualité ✅ (2026-04-07, session 8)

### Sprint A — Performance ✅

| #   | Tâche                                 | Détail                                                                                                                                              |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | FleetScreen → `SectionList` natif     | Remplace FlatList avec types mixtes. `renderSectionHeader`, `ItemSeparatorComponent`, `stickySectionHeadersEnabled=false`                           |
| A2  | MapScreen → clustering `supercluster` | Index useMemo sur `mappableVehicles`. `getClusters(bounds, zoom)` par viewport. `ClusterMarker` tap → `getClusterExpansionZoom()` + animateToRegion |
| A3  | React Query persistence               | `PersistQueryClientProvider` + `createAsyncStoragePersister`. TTL 24h, clé `TRACKYU_QUERY_CACHE`, throttle 1s                                       |

### Sprint B — Qualité ✅

| #   | Tâche                      | Détail                                                                                                                                                                                                                                 |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Haptic feedback            | `src/utils/haptics.ts` — 6 niveaux. Branché : login success/error, immobilisation (heavy+success), panne (medium+success), ticket soumis                                                                                               |
| B2  | Jest + tests unitaires     | 16 tests passants. `ticketHelpers.ts` extrait + testé. **Bug corrigé** : `isValidDate('2026-02-30')` retournait `true` (composants non vérifiés)                                                                                       |
| B3  | Deep linking notifications | `navigationRef.ts` + `NavigationContainer ref=`. Handler `handleNotificationNavigation` : `alert/vehicle` → VehicleDetail, `ticket` → SupportTicketDetail, `portal_ticket` → Portal. Cold start via `getLastNotificationResponseAsync` |

### Sprint C — Sécurité ✅

| #   | Tâche                 | Détail                                                                                                                                                                  |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Session expirée (401) | `triggerSessionExpired()` au lieu de hard logout. `SessionExpiredModal` : pré-remplit email, re-login sans perte de contexte. Hard logout seulement en cas de retry 401 |
| C2  | App version check     | `useAppVersionCheck` → GET `/app/version`. `compareSemver()`. Force : modal bloquant. Soft : banner dismissable. Redirige vers store (Play/App Store)                   |

### Build

| #   | Tâche                                     | Statut                                          |
| --- | ----------------------------------------- | ----------------------------------------------- |
| —   | APK Android `eas build --profile preview` | ✅ Build `4e82295c` livré 2026-04-07 session 10 |

### Nouveaux packages installés (session 8)

| Package                                          | Usage                   |
| ------------------------------------------------ | ----------------------- |
| `supercluster` + `@types/supercluster`           | Clustering carte        |
| `@tanstack/react-query-persist-client`           | Persistence React Query |
| `@tanstack/query-async-storage-persister`        | Bridge AsyncStorage     |
| `expo-haptics`                                   | Retour haptique         |
| `jest`, `jest-expo`, `@types/jest`, `babel-jest` | Tests unitaires         |

---

## 11. Chantier 11 — Audit CLIENT + Fixes Backend Critiques ✅ (2026-04-07, session 9)

---

## 12. Chantier 12 — VehicleHistoryScreen v4 + Replay ✅ (2026-04-07, session 10)

### Backend

| #   | Patch                                 | Détail                                                                                                                             |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| B1  | `GET /fleet/vehicles/:id/daily-range` | `[{date, tripsCount, totalDistance}]` — 1 seul appel SQL GROUP BY day pour 30 jours                                                |
| B2  | Fix snap-to-road merge                | Utilise `originalIndex` retourné par Google Roads API (interpolate=true) → vitesse/heading/ignition corrects sur points interpolés |

### Mobile — VehicleHistoryScreen v4

**Pills dates compactes + km/jour**

- Layout vertical : label + `12.4 km` (ou `—` si 0 trajet)
- Taille réduite (`minWidth: 52px`) — 30 jours visibles sans scroll excessif
- Un seul appel `daily-range` au chargement pour tous les jours

**Filtre dérive GPS 50 m (M2)**

- `filterDrift()` : si `speed < 2 km/h && dist < 50 m` depuis dernier point retenu → ignoré
- Appliqué avant heatmap, stops, stats

**Polyline heatmap vitesse (M3)**

| Vitesse    | Couleur          |
| ---------- | ---------------- |
| < 10 km/h  | Gris `#9CA3AF`   |
| 10–50 km/h | Vert `#22C55E`   |
| 50–80 km/h | Orange `#F59E0B` |
| > 80 km/h  | Rouge `#EF4444`  |

N segments `<Polyline>` + lissage Chaikin 1 passe par segment.

**Marqueurs d'arrêt (M4)**

- `detectStops()` — port exact de l'algo web `ReplayControlPanel`
- Seuil : `speed < 2 km/h` pendant ≥ **2 min**
- STOP (moteur off / inconnu long) → couleur `vehicleStatus.stopped` (#EF4444) + icône `ParkingSquare`
- IDLE (moteur on, ralenti) → couleur `vehicleStatus.idle` (#F59E0B) + icône `Pause`
- Badge durée : `18 min` ou `1h05`

**Stats upgrade (M5)**

- Distance = `trips.reduce(sum, distance_km)` (serveur) si trips disponibles, sinon Haversine sur positions filtrées
- 4 pills : Distance · Durée · **Trajets** · Points GPS

**Lissage Chaikin (M6)**

- 2 passes avant affichage (fallback si snap-to-road retourne brut)

**Replay (M7)**

- Barre de contrôle sous la carte : reset `|<` · Play/Pause · vitesses `1×` `2×` `3×` `4×` `5×` `6×`
- Barre de progression scrubable (tap → seek)
- Heure courante + vitesse instantanée colorée (heatmap) en temps réel
- Marqueur animé sur la carte (couleur = bucket vitesse, suit la caméra)
- D/A markers et stop markers masqués pendant le replay
- Reset → index 0 + recentre la carte

**Tap trajet → zoom carte (M8)**

- Tap sur une TripCard → `animateToRegion()` centré sur start/end lat-lng du trajet
- Surligné en `primaryDim`, badge durée coloré, chevron `>`
- Bouton "Vue globale" pour réinitialiser
- Double tap → désélectionne

### Web — ReplayControlPanel

| #   | Tâche       | Détail                                                                                                                                                                                              |
| --- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | Filtre 50 m | `filterDriftGPS()` + `filteredHistory = useMemo(...)` appliqué avant `stops`, `speedingEvents`, `tripSegments`, `tripStats`, `chartData`, `fuelEvents`. Exports GPX/KML restent sur `history` brut. |

### Build

| #   | Tâche                                     | Statut                                      |
| --- | ----------------------------------------- | ------------------------------------------- |
| —   | APK Android `eas build --profile preview` | ✅ Build `4e82295c` disponible sur expo.dev |

---

### Mobile — PortalNewTicketScreen rewrite

**Avant** : catégories hardcodées (`['Facturation', 'Technique', 'Contrat', 'Abonnement', 'Autre']`), aucun sous-champ, priorité toujours `MEDIUM`.

**Après** : formulaire dynamique aligné sur le web.

| Élément         | Détail                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------- |
| Catégories      | `useQuery(['ticket-categories'], ticketsApi.getCategories)`                                                           |
| Sous-catégories | `useQuery(['ticket-subcategories', id], ticketsApi.getSubCategories)` — cascade, enabled quand catégorie sélectionnée |
| Auto-fill       | `useEffect` sur `(selectedCategory, selectedSubCategory)` → `generateSubjectAndDesc()` + `default_priority`           |
| Priorité        | `type PortalPriority = 'LOW'                                                                                          | 'MEDIUM' | 'HIGH'` — CLIENT n'a pas CRITICAL |
| canSubmit       | `subject ≥ 3 chars && description ≥ 10 chars && !!selectedCategory`                                                   |
| API call        | `portalApi.createTicket({ ..., sub_category: selectedSubCategory?.name })`                                            |

**`portal.ts`** : ajout du champ `sub_category?: string` dans le payload `createTicket`.

---

### Backend — Bugs CLIENT corrigés

#### 1. `GET /portal/tickets` (tickets/my) → 0 résultats pour CLIENT

**Cause** : `resolveClientTierId()` ne trouvait pas le tier_id CLIENT quand le user n'avait pas de ticket existant ni d'activation_token.

**Fix** (`ticketRepository.js`) : nouvelle étape de lookup via `users.client_id` :

```sql
SELECT client_id FROM users WHERE id = $1 AND client_id IS NOT NULL LIMIT 1
```

Le tier_id est maintenant résolu même pour les nouveaux clients.

#### 2. `PUT /users/:id` → 403 si CLIENT tente de modifier son profil

**Cause** : la route exigeait `MANAGE_USERS` pour tous les PUT.

**Fix** (`userRoutes.js`) : middleware conditionnel — si `req.user.id === req.params.id`, la permission est bypassée (self-update autorisé).

#### 3. `GET /fleet/vehicles/:id` → lat/lng/address null

**Cause** : `findByIdWithJoins()` ne faisait que JOINs sur `tiers` et `groups` — aucune position récupérée.

**Fix** (`objectRepository.js`) : ajout d'un `JOIN LATERAL` :

```sql
LEFT JOIN LATERAL (
  SELECT latitude, longitude, time, address
  FROM positions WHERE object_id = o.id
  ORDER BY time DESC LIMIT 1
) lp ON true
```

Résultat : `location_lat`, `location_lng`, `last_updated`, `address` désormais renseignés.

#### 4. `getDayStats` — temps hors ligne incorrect

**Cause** : formule `offlineSeconds = 24h - totalActive` (trop brute). Un véhicule STOPPED n'est pas OFFLINE.

**Sémantique corrigée** :
| Statut objet | Temps de gap alloué à |
|---|---|
| STOPPED | `stoppedSeconds` |
| IDLE | `idleSeconds` |
| MOVING | ignoré (GPS en mouvement) |
| OFFLINE / inconnu | `offlineSeconds` |

**Fix** (`objectRepository.js`) : après calcul du gap (`elapsedSeconds - totalActive`), requête `SELECT status FROM objects WHERE id = $1` pour allouer le gap au bon seau.

**Résultat** : ABO-7C02B7 → `stoppedSeconds ≈ 16 247` (≈4h31), `offlineSeconds = 0`.

#### 5. Géocodage → adresse toujours vide

Deux causes indépendantes, toutes deux corrigées :

**Cause A — PostGIS absent** : `ReverseGeocodingService.resolve()` utilisait `ST_DWithin` (extension PostGIS) pour le cache — or PostGIS n'est pas installé.

**Fix A** (`ReverseGeocodingService.js`) : remplacement de ST_DWithin par bounding-box float :

```sql
SELECT address FROM geocoded_addresses
WHERE ABS(lat - $1) < $3 AND ABS(lng - $2) < $3
ORDER BY created_at DESC LIMIT 1
```

avec `delta = CACHE_DISTANCE_METERS / 111000` (°/m approximation).

**Cause B — table `system_settings` absente** : `SettingsService.get('GOOGLE_MAPS_API_KEY')` échouait silencieusement → clé null → Google Maps non appelé.

**Fix B** : création de la table `system_settings` et insertion de la clé :

```sql
CREATE TABLE IF NOT EXISTS system_settings (key VARCHAR PRIMARY KEY, value TEXT, ...);
INSERT INTO system_settings (key, value) VALUES ('GOOGLE_MAPS_API_KEY', 'AIzaSyB-ujm0...');
```

**Résultat** : géocodage fonctionnel. ABO-7C02B7 → `"194 Rue Brou Jérôme Adon, Abidjan, Côte d'Ivoire"` mis à jour dans `objects` et `positions`. Les futures positions sont géocodées automatiquement par le `positionWorker`.

---

### État des écrans post-session 9

| Bug                                         | Statut                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| "Position GPS indisponible" (lat/lng null)  | ✅ Corrigé — JOIN LATERAL backend                                        |
| "Hors ligne: 24:00" (mauvais calcul)        | ✅ Corrigé — getDayStats status-aware                                    |
| "Adresse: —" (géocodage muet)               | ✅ Corrigé — PostGIS + system_settings                                   |
| VehicleHistory crash (`distance_km` string) | ✅ Corrigé en code — `Number(trip.distance_km).toFixed(1)`               |
| PortalNewTicketScreen catégories hardcodées | ✅ Corrigé — rewrite complet avec catégories DB                          |
| **APK utilisateurs**                        | ⏳ **Rebuild requis** — `eas build --platform android --profile preview` |

---

## 13. Chantier 13 — Overhaul Écrans Principaux ✅ (2026-04-07)

### FleetScreen v3

| #   | Changement                     | Détail                                                                                                                                                                    |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Filtre statut                  | Chips dans l'ordre MapScreen : En route · Arrêt · Ralenti · Hors ligne · Tous (Tous en dernier)                                                                           |
| F2  | Recherche étendue              | Recherche serveur (`q`) + recherche locale parallèle sur 500 véhicules (clientName, groupName, driverName, IMEI, simPhoneNumber) via `useQuery(['vehicles-search-base'])` |
| F3  | VehicleCard                    | Vitesse inline uniquement si En route (pas de badge). Icône immobilisation : `LockOpen` vert si libre, `Lock` rouge si immobilisé                                         |
| F4  | Tri intelligent                | Dans chaque section : moving > stopped > idle > offline (constant `STATUS_SORT_ORDER`)                                                                                    |
| F5  | Long press → QuickActionsModal | Voir sur carte (navigate Map), Historique (navigate VehicleHistory), Appeler conducteur (`Linking.openURL tel:`)                                                          |
| F6  | Offline >24h                   | Texte de la carte en rouge (`isLongOffline()` : last_update > 24h)                                                                                                        |
| F7  | Mode compact                   | Toggle `AlignJustify`/`List` — VehicleCard en ligne unique vs carte complète                                                                                              |
| F8  | Export CSV                     | `buildCsv()` + `Share.share()` — plaque, statut, vitesse, client, groupe, IMEI                                                                                            |

### VehicleDetailScreen v3

| #   | Changement            | Détail                                                                                                                                                  |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Crash Android corrigé | `<VehicleTypeIcon>` (SVG complexe) dans `<Marker>` crashait. Remplacé par `<View>` cercle coloré + label plaque                                         |
| D2  | Trajet du jour        | Query `vehicle-detail-day-route` → `getHistory(vehicleId, today)`. `<MapPolyline>` bleue sur mini-carte. `mapRegion` calculé par bounding box (useMemo) |
| D3  | Pill immobilisation   | `LockOpen` vert + "Immo./Inactif" si libre. `Lock` rouge + "Immo./Actif" si immobilisé                                                                  |
| D4  | Kilométrage compact   | IIFE : ≥1 000 000 → "1.2M", ≥10 000 → "125k", sinon `toLocaleString()`                                                                                  |

### VehicleHistoryScreen v5

| #   | Changement                    | Détail                                                                                                                                                           |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Pills de date compactes       | Single line (dot bleu si données du jour, `paddingVertical: 4`). ~4× moins haut que les colonnes précédentes                                                     |
| H2  | "Perso." après "Hier"         | Inséré à l'index 1 du ScrollView via `React.Fragment` — visible sans scroller                                                                                    |
| H3  | Bottom sheet coulissant       | `Animated.Value` + `PanResponder`. Replié : 190px. Déplié : 65% écran. Snap automatique selon vitesse/position du geste                                          |
| H4  | Onglet Trajets                | Liste existante déplacée dans le sheet. Bouton "Vue globale" si trajet focalisé                                                                                  |
| H5  | Onglet Arrêts                 | Liste `stopMarkers` : heure de début, type (Arrêt moteur / Ralenti), durée. Tap → `animateToRegion()`                                                            |
| H6  | Onglet Alertes                | Query `getAlerts(vehicleId, 100, startDate, endDate)`. Dot coloré par sévérité (rouge critical/high, orange medium, bleu autres). Affiche message + heure + type |
| H7  | StatsBar                      | "Points GPS" remplacé par "Alertes" (count réel API). `alertsCount` prop passée depuis la query                                                                  |
| H8  | Carte flex                    | `mapWrapper.height: 240` → `flex: 1`. La carte occupe tout l'espace disponible entre date selector et replay bar                                                 |
| H9  | Label plaque replay           | `<View style={plateTag}>` sous le marqueur ▶ — tag noir semi-transparent avec la plaque                                                                          |
| H10 | StatsBar + légende dans sheet | Remontés dans le header du bottom sheet (au-dessus des onglets)                                                                                                  |

---

## 14. Chantier 14 — Mon Espace CLIENT : Améliorations & Audit ✅ (2026-04-07, session 12)

### Nouvelles fonctionnalités portail CLIENT

| #   | Écran                     | Fonctionnalité                                                                                                                          |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | ClientPortalScreen        | Bannière rouge "Solde impayé" → navigue vers PortalInvoices                                                                             |
| F2  | ClientPortalScreen        | Action rapide "Mes véhicules" → `navigate('Main', { screen: 'Map' })`                                                                   |
| F3  | ClientPortalScreen        | `SkeletonDashboard` au chargement (remplace ActivityIndicator)                                                                          |
| F4  | PortalInvoiceDetailScreen | Modal "Payer maintenant" : Wave (Linking.openURL), Orange Money (affichage N° + copie Clipboard). Masqué si statut PAID/DRAFT/CANCELLED |
| F5  | PortalSubscriptionsScreen | Countdown J-X renouvellement : puce verte (>30j) / orange (≤30j) / rouge (≤7j) + AlertTriangle                                          |
| F6  | PortalSubscriptionsScreen | Bouton "Demander une intervention" → `PortalNewTicket` avec `prefillSubject` + `prefillDescription` (plaque + modèle + contrat)         |
| F7  | PortalNewTicketScreen     | Lecture `route.params` → préfill sujet + description                                                                                    |
| F8  | PortalNewTicketScreen     | Pièces jointes photos : expo-image-picker, max 3, aperçu thumbnail, upload best-effort post-création ticket                             |
| F9  | PortalTicketsScreen       | `useInfiniteQuery` pagination (page 20, FlatList `onEndReached`) + `SkeletonRow`                                                        |
| F10 | Tous les écrans portal    | Skeleton loaders spécialisés remplacent tous les `ActivityIndicator`                                                                    |

### Backend ajouté

| Script                                     | Description                                                                                                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/patch_portal_payment_settings.js` | Patch VPS : ajoute `GET /portal/payment-settings` dans portalRoutes.js. Lit `integration_credentials` pour Wave (`paymentLinkBase`) et Orange Money (`phone`, `name`) |
| `scripts/set_orange_money_number.js`       | Upsert credentials Orange Money dans `integration_credentials`                                                                                                        |

### Bugs critiques corrigés

| Bug                                               | Fichier                     | Fix                                            |
| ------------------------------------------------- | --------------------------- | ---------------------------------------------- |
| `isError` non géré → écran vide                   | `PortalTicketDetailScreen`  | État d'erreur structuré avec `XCircle`         |
| `navigate('Map')` cast `as any` → crash           | `ClientPortalScreen`        | `navigate('Main', { screen: 'Map' })`          |
| `SUSPENDED`/`EXPIRED` → enum brut affiché         | `portalColors.ts`           | Labels + couleurs ajoutés                      |
| `getMyInterventions()` réponse paginée ignorée    | `portal.ts`                 | Gère `{ data, total }` ET array plat           |
| `backgroundColor: '#fff'` hardcodé                | `PortalInterventionsScreen` | `theme.bg.surface`                             |
| `refreshing={false}` → pull-to-refresh muet       | `PortalPaymentsScreen`      | `isRefetching`                                 |
| Routes invalides `Profile`, `ClientHome`          | `linking.ts`                | Supprimées — 0 erreur TS                       |
| `prefillCategory: 'Intervention terrain'` inventé | `PortalSubscriptionsScreen` | Supprimé — catégories dynamiques DB uniquement |

### Nouveaux packages

| Package             | Version  | Usage                             |
| ------------------- | -------- | --------------------------------- |
| `expo-image-picker` | ~17.0.10 | Pièces jointes photos sur tickets |

### Build

| Commande                             | Résultat                                             |
| ------------------------------------ | ---------------------------------------------------- |
| `npx expo export --platform android` | ✅ 9.98 MB · 3829 modules · 0 erreur TS (2026-04-07) |

---

## 15. Chantier 15 — Audit Sécurité & Corrections ✅ (2026-04-08)

### Vulnérabilités corrigées

| ID  | Sévérité    | Fichier(s)                                  | Description                                                               | Correction                                                                          |
| --- | ----------- | ------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| C1  | 🔴 Critique | `App.tsx`                                   | Cache React Query 24h en clair dans AsyncStorage (GPS, factures, tickets) | `shouldDehydrateQuery: () => false` + singleton `lib/queryClient.ts` + buster `'2'` |
| C2  | 🔴 Critique | `api/auth.ts`                               | `logout()` sans invalidation JWT côté serveur                             | `POST /auth/logout` (best-effort) avant `clearAll()`                                |
| C3  | 🔴 Critique | `package.json`                              | `xlsx ^0.18.5` : Prototype Pollution + ReDoS (CVE confirmés)              | Package supprimé, export XLS retiré, CSV + PDF conservés                            |
| C4  | 🟠 Élevée   | `utils/errorTypes.ts`                       | `serverMessage` brut du backend exposé en production                      | Message générique en prod, détail visible uniquement en `__DEV__`                   |
| C5  | 🟠 Élevée   | `portal/PortalInterventionDetailScreen.tsx` | IMEI traceur + numéro SIM visibles côté CLIENT                            | Section masquée — seul l'emplacement physique reste visible                         |
| C6  | 🟠 Élevée   | `portal/PortalInvoiceDetailScreen.tsx`      | `wave_link` et `pdf_url` ouverts sans validation du schéma                | Vérification `url.startsWith('https://')` avant tout `Linking.openURL`              |
| C7  | 🟠 Élevée   | `screens/auth/LoginScreen.tsx`              | Aucun rate limiting — brute-force possible                                | 3 échecs → bouton bloqué 30 s avec countdown visible                                |
| C8  | 🟡 Moyenne  | `store/authStore.ts`                        | Cache React Query non vidé au logout                                      | `queryClient.clear()` appelé dans `logout()`                                        |
| C9  | 🟡 Moyenne  | `app.config.js`                             | `RECEIVE_BOOT_COMPLETED` sans service background                          | Permission supprimée                                                                |

### Fichiers créés / modifiés

| Fichier                                                 | Action                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/lib/queryClient.ts`                                | **Nouveau** — singleton QueryClient partagé entre App.tsx et authStore             |
| `src/App.tsx`                                           | Import depuis `lib/queryClient`, `shouldDehydrateQuery: () => false`, buster `'2'` |
| `src/store/authStore.ts`                                | `queryClient.clear()` au logout                                                    |
| `src/api/auth.ts`                                       | `POST /auth/logout` (best-effort) avant `clearAll()`                               |
| `src/utils/errorTypes.ts`                               | `serverMessage` masqué en production                                               |
| `src/screens/auth/LoginScreen.tsx`                      | Rate limiting 3 tentatives / 30 s                                                  |
| `src/screens/portal/PortalInvoiceDetailScreen.tsx`      | Validation `https://` sur Wave link + PDF                                          |
| `src/screens/portal/PortalInterventionDetailScreen.tsx` | IMEI + SIM masqués                                                                 |
| `app.config.js`                                         | `RECEIVE_BOOT_COMPLETED` supprimé                                                  |
| `src/screens/main/ReportsScreen.tsx`                    | `xlsx` supprimé, bouton XLS retiré                                                 |
| `package.json`                                          | `xlsx` supprimé                                                                    |

### Action restante (hors code)

> **Restreindre la clé Firebase dans Google Cloud Console**
> La clé `AIzaSyAz8CAWW8ednhM3lcuQiF_jBNx5L0ilXn8` est embarquée dans tout APK (inévitable). Réduire le risque :
> Google Cloud Console → API & Services → Identifiants → Restreindre → Applications Android → `com.trackyugps.app` + empreinte SHA-1 EAS.

### Build de validation

| Commande                             | Résultat                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `npx tsc --noEmit --skipLibCheck`    | ✅ 0 erreur                                                                 |
| `npx expo export --platform android` | ✅ 8.57 MB · 0 erreur                                                       |
| `npm audit`                          | ✅ 0 vulnérabilité HIGH/CRITICAL (reste 4 LOW dans devDependencies de test) |

---

## 16. Chantier 16 — Audit Mobile Complet Phase 1-3 ✅ (2026-04-09/10, sessions 14-15)

### Phase 1 — Navigation & Guards ✅ (session 14)

| #   | Tâche                      | Fichier(s)                  | Détail                                         |
| --- | -------------------------- | --------------------------- | ---------------------------------------------- |
| G1  | Guard navigation rôles     | `RootNavigator.tsx`         | Vérification rôle avant accès écrans sensibles |
| G2  | Filtrage settings par rôle | `SettingsMenuScreen.tsx`    | Items menu filtrés selon rôle utilisateur      |
| G3  | Sentry DSN                 | `App.tsx` + `app.config.js` | DSN via EAS Secret (code déjà prêt)            |

### Phase 2 — Qualité UI & Accessibilité ✅ (session 14)

#### SearchBar — migration vers composant shared

Tous les `TextInput` de recherche inline remplacés par `<SearchBar>` :

| Écran           | Cas particulier                                           |
| --------------- | --------------------------------------------------------- |
| `FinanceScreen` | Remplacement simple                                       |
| `TechScreen`    | Placeholder dynamique selon onglet actif                  |
| `HelpScreen`    | `TextInput` AI chat conservé, seul `Search` lucide retiré |
| `FleetScreen`   | `ClientSelector` côte à côte — wrapper inline `flex: 1`   |

Styles `searchRow`, `searchBar`, `searchInput` supprimés de chaque écran.

#### Accessibilité — 46 attributs + 11 testIDs

| Composant / Écran     | Attributs ajoutés                                                                                                                                                                                                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button.tsx`          | `accessibilityRole="button"`, `accessibilityState={{ disabled, busy }}`, `testID?`, `accessibilityLabel?`                                                                                                                                                                                                                               |
| `LoginScreen`         | `testID="input-email"`, `testID="input-password"`, `testID="btn-login"`, `testID="btn-forgot-submit"`, `testID="btn-request-submit"`, toggle password label contextuel                                                                                                                                                                  |
| `VehicleDetailScreen` | CollapsibleBlock `expanded` state, Switch `testID="switch-immobilize"` + hint, modal btns `btn-immo-confirm/cancel/unimmo-confirm`                                                                                                                                                                                                      |
| `AlertsScreen`        | `testID="btn-mark-all-read"` + `accessibilityState={{ busy }}`                                                                                                                                                                                                                                                                          |
| `ProfileScreen`       | `testID="btn-logout"`                                                                                                                                                                                                                                                                                                                   |
| 20+ back buttons      | `accessibilityLabel="Retour"` + `accessibilityRole="button"` (DepensesScreen, DriversScreen, EcoConduiteScreen, MaintenanceScreen, PneusScreen, RulesScreen, SubUsersScreen, TemperatureScreen, UsersScreen, LeadsScreen, CreateTicketScreen, FleetAnalyticsScreen, GeofencesScreen, HelpScreen, VehicleHistoryScreen, 5 écrans portal) |

### Phase 3 — Tests & Production Readiness ✅ (sessions 14-15)

#### Tests unitaires — 20 suites / 581 tests

| Suite                    | Tests | Ce qui est couvert                                                                                                                                                 |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vehicleStatus.test.ts`  | 31    | Couleurs exactes, labels FR, fonctions helper, cas inconnu/vide/uppercase                                                                                          |
| `vehicleStore.test.ts`   | 17    | CRUD store, merge REST/WS (champs live préservés), WS nullish n'écrase pas REST                                                                                    |
| `authStore.test.ts`      | —     | Login, logout, restore, rôles                                                                                                                                      |
| `ticketHelpers.test.ts`  | —     | isValidDate (bug `2026-02-30` corrigé), isValidTime, toISO                                                                                                         |
| `normalizeError.test.ts` | —     | Codes erreur, messages prod vs dev                                                                                                                                 |
| `roles.test.ts`          | —     | Matrice rôles/permissions                                                                                                                                          |
| `generators.test.ts`     | —     | Smoke + shape + resilience                                                                                                                                         |
| 12 suites API            | —     | alertsApi, vehiclesApi, financeApi, ticketsApi, interventionsApi, usersApi, crmApi, geofencesApi, maintenanceApi, ecoDrivingApi, expensesApi, tiresApi, reportsApi |

**Configuration** : `@jest-environment node`, `babel-preset-expo`, aucune dépendance native.
**Règle** : apostrophes typographiques `'` (U+2019) dans les strings `it()` → Babel error — utiliser `"` ou `\'`.

#### E2E — Maestro (3 flows)

Choix **Maestro** sur Detox : workflow Expo managé (pas de `prebuild`/toolchain natif), YAML déclaratif, compatible dev builds EAS.

| Flow       | Fichier                       | Scénario                                                                  |
| ---------- | ----------------------------- | ------------------------------------------------------------------------- |
| Login      | `.maestro/01_login.yaml`      | `input-email` + `input-password` → `btn-login` → assert "Tableau de bord" |
| Navigation | `.maestro/02_navigation.yaml` | 4 onglets CLIENT : Carte, Flotte, Rapports, Paramètres                    |
| Logout     | `.maestro/03_logout.yaml`     | Paramètres → `btn-logout` → assert "Connexion"                            |

CI : `.github/workflows/e2e.yml` — Maestro Cloud + EAS build profile `e2e`.
Secrets CI requis : `EAS_TOKEN`, `MAESTRO_CLOUD_API_KEY`, `E2E_EMAIL`, `E2E_PASSWORD`.

#### Sentry — plugin source maps EAS

`app.config.js` : ajout du plugin `@sentry/react-native/expo` — upload source maps au build.
EAS Secrets à créer : `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
Crash reporting : actif dès que `SENTRY_DSN` est renseigné (code `Sentry.init()` + `Sentry.wrap(App)` déjà en place).

### Corrections audit (inexactitudes sessions antérieures)

| Élément                         | Situation réelle                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `ReportsScreen` exports CSV/PDF | ✅ Fonctionnels — `expo-print` + `expo-sharing` + `Share.share()` (non stubs)             |
| `DashboardScreen` Sprint 2      | ✅ Déjà livré — badge alertes, abonnement expirant, 3 alertes critiques, "Mes Opérations" |
| `AlertConfigModal`              | ✅ Réelle — appelle `/notifications/preferences`, 7 types configurables                   |
| Couleurs statut véhicule        | Corrigées dans ce doc : `moving=#22C55E`, `idle=#F97316` (source : `vehicleStatus.ts`)    |

### Points restants (bloquants externes)

| ID  | Item                     | Bloquant                                             |
| --- | ------------------------ | ---------------------------------------------------- |
| M3b | Unités km/mi, litres     | Endpoint `/user/preferences` manquant sur VPS        |
| M4  | App Store URL iOS        | Publication App Store requise                        |
| —   | Sentry secrets           | Création projet Sentry + renseignement EAS Secrets   |
| —   | E2E CI secrets           | `EAS_TOKEN`, `MAESTRO_CLOUD_API_KEY`, compte de test |
| —   | Restriction clé Firebase | Google Cloud Console → Applications Android + SHA-1  |

---

## 16b. Audit Best Practices — État

| Pratique                          | Statut | Notes                                                                                               |
| --------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| Sentry crash reporting            | ✅     | DSN configuré, beforeSend, tracesSampleRate                                                         |
| Error Boundary                    | ✅     | Wrap navigation                                                                                     |
| Offline detection                 | ✅     | NetInfo + banner + re-fetch                                                                         |
| WebSocket temps réel              | ✅     | Backoff, rooms par rôle                                                                             |
| Skeleton loaders                  | ✅     | 11 composants (4 véhicules + 7 portail CLIENT)                                                      |
| Secure token storage              | ✅     | Keychain                                                                                            |
| Auth reset 401                    | ✅     | SessionExpiredModal (soft) + triggerAuthReset (hard)                                                |
| React Query retry                 | ✅     | x2, backoff exponentiel                                                                             |
| Config secrets                    | ✅     | EAS Secrets, app.config.js                                                                          |
| SectionList (listes virtualisées) | ✅     | FleetScreen migré (session 8)                                                                       |
| Map clustering                    | ✅     | supercluster viewport-based (session 8)                                                             |
| React Query persistence           | ✅     | PersistQueryClientProvider, `shouldDehydrateQuery: false` (aucune donnée sur disque)                |
| Haptic feedback                   | ✅     | login/immobilisation/panne/ticket (session 8)                                                       |
| Session expirée (token refresh)   | ✅     | Modal re-login sans hard logout (session 8)                                                         |
| Tests unitaires                   | ✅     | 16 tests — ticketHelpers (session 8)                                                                |
| App version check / force upgrade | ✅     | useAppVersionCheck + AppUpdateBanner (session 8)                                                    |
| Deep linking push notifications   | ✅     | navigationRef + handlers cold/warm start (session 8)                                                |
| Rate limiting login               | ✅     | 3 échecs → 30 s blocage côté client (session 13)                                                    |
| Logout serveur                    | ✅     | `POST /auth/logout` invalidation JWT (session 13)                                                   |
| Cache sécurisé                    | ✅     | React Query non persisté sur disque (session 13)                                                    |
| Validation URLs externes          | ✅     | `https://` vérifié avant tout `Linking.openURL` (session 13)                                        |
| IMEI/SIM non exposés CLIENT       | ✅     | Masqués dans PortalInterventionDetail (session 13)                                                  |
| Erreurs production                | ✅     | `serverMessage` masqué, message générique (session 13)                                              |
| Accessibilité a11y                | ✅     | 46 attributs (`accessibilityLabel/Role/State/Hint`) + 11 testIDs sur 20+ écrans (session 14)        |
| Tests unitaires                   | ✅     | 581 tests / 20 suites — stores, API, helpers, statuts véhicule (sessions 8, 14-15)                  |
| Tests E2E (Maestro)               | ✅     | 3 flows : `01_login`, `02_navigation`, `03_logout` — CI GitHub Actions + Maestro Cloud (session 15) |
| Sentry source maps EAS            | ✅     | Plugin `@sentry/react-native/expo` dans `app.config.js` — secrets EAS à renseigner (session 15)     |
| SearchBar unified                 | ✅     | Composant `SearchBar.tsx` shared — FinanceScreen, TechScreen, HelpScreen, FleetScreen (session 14)  |
| Refresh token OAuth2              | ⏳     | Nécessite endpoint backend `/auth/refresh`                                                          |
| App Store URL iOS                 | ⏳     | Placeholder `id0000000000` à remplacer avant publication (M4)                                       |
| Unités km/mi/litres               | ⏳     | ProfileScreen "Unités" → nécessite endpoint `/user/preferences` sur VPS (M3b)                       |

---

## 17. Commandes utiles

```bash
# Démarrer en développement
cd trackyu-mobile-expo && npx expo start

# Tests unitaires
npm test                          # run once
npm run test:watch                # watch mode

# Tests E2E Maestro (émulateur/device avec dev build EAS)
npm run test:e2e                  # tous les flows
maestro test .maestro/01_login.yaml --env EMAIL_TEST=xxx --env PASSWORD_TEST=yyy

# Build Android preview (APK)
eas build --platform android --profile preview --non-interactive

# Build Android production (AAB)
eas build --platform android --profile production

# Invalider le cache React Query persisté (incrémenter buster dans App.tsx)
# persistOptions: { buster: '2' }   ← changer la valeur

# Secrets EAS (Sentry — à renseigner une fois par environnement)
eas secret:create --scope project --name SENTRY_DSN       --value <dsn>
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token>
eas secret:create --scope project --name SENTRY_ORG       --value <org-slug>
eas secret:create --scope project --name SENTRY_PROJECT   --value <project-slug>

# Lister les secrets EAS
eas env:list --environment preview

# Vérifier TypeScript
npx tsc --noEmit

# Logs backend VPS
ssh trackyu-vps "cd /var/www/trackyu-gps && docker compose logs backend --tail=50"

# Requête DB
ssh trackyu-vps "docker exec 6e9a3283ca3b psql -U fleet_user -d fleet_db -c 'SELECT ...'"

# Patcher backend (TOUJOURS via script Node.js uploadé)
# scp fix_xxx.js trackyu-vps:/tmp/
# ssh trackyu-vps "docker cp /tmp/fix_xxx.js trackyu-gps-backend-1:/tmp/ && docker exec trackyu-gps-backend-1 node /tmp/fix_xxx.js"
# NE PAS utiliser heredoc bash (corrompt ${...} et backticks JS)
# Si container en crash-loop : docker stop -t 0, éditer fichier sur l'hôte, docker cp + docker start
```

---

## 18. Règles de développement

- **Backend VPS = source canonique** — ne jamais travailler sur les fichiers locaux backend
- **Patches backend via scripts Node.js** — `.js` uploadé via scp + docker cp, exécuté avec `node` dans le container. Pas de Python pour du multilignes JS complexe (quoting trop difficile), pas de heredoc bash (corrompt template literals JS)
- **Déployer via deploy.ps1** uniquement — jamais d'upload manuel du dist
- **Ne jamais committer** sans `git diff --cached` préalable
- **Approval explicite** avant chaque modification significative
- **Aucune couleur hardcodée** dans les écrans — toujours `theme.xxx`
- **AsyncStorage** : API `getString`/`set`/`delete` (pas `setString`)
- **Google Maps key** : EAS Secret uniquement, jamais dans le code source
- **Haptics** : utiliser `haptics.ts`, pas d'import direct expo-haptics dans les écrans
- **Helpers partagés** : logique métier testable → `src/utils/ticketHelpers.ts`, pas dans les screens
- **Navigation hors React** : utiliser `navigationRef.navigate()`, jamais de hack useRef global
- **Session expirée** : `triggerSessionExpired()` sur 401 → modal. `triggerAuthReset()` uniquement en dernier recours
- **React Query cache** : incrémenter `buster` dans App.tsx si breaking change sur la structure des données
- **Tests** : les nouveaux helpers utilitaires doivent avoir des tests dans `src/__tests__/`
- **Test credentials** : demander au tech lead, stockes dans GitHub Secrets / 1Password (jamais en clair dans le repo)

---

## 17. Propositions d'amélioration post-MVP

> Fonctionnalités non prioritaires pour le MVP. Documentées pour les sprints suivants.
> Classées par effort croissant. P1–P5 sont 100% frontend. P6–P7 nécessitent du backend.

### P1 — Partage de trajet (Share API)

**Écran** : VehicleHistoryScreen — onglet Trajets  
**Quoi** : Long press sur une TripCard → partage un résumé texte formaté (heure départ/arrivée, distance, durée, adresses D/A) via SMS/WhatsApp/Email.  
**Comment** : `Share.share({ message: buildTripSummary(trip) })` — même API que l'export CSV FleetScreen.  
**Valeur** : Prouver une livraison, partager un itinéraire avec un client final, justificatif chauffeur.  
**Effort** : ~1h. Zéro dépendance.

### P2 — Comparaison J-1 / semaine dans StatsBar

**Écran** : VehicleHistoryScreen — StatsBar  
**Quoi** : Micro-trend sous chaque KPI : "↑ 12% vs hier" ou "↓ 3 km vs moy. 7j".  
**Comment** : `dailyMap` contient déjà 30 jours (distance + tripsCount). Comparer `dailyMap[selectedDate]` à `dailyMap[selectedDate - 1]` et à la moyenne des 7 jours précédents.  
**Valeur** : Contexte immédiat sans navigation supplémentaire.  
**Effort** : ~2h. Calcul pur frontend, zéro appel API supplémentaire.

### P3 — Légende vitesse interactive (filtre segments carte)

**Écran** : VehicleHistoryScreen — carte  
**Quoi** : Tap sur une couleur de légende (gris/vert/orange/rouge) → seuls les segments de cette plage s'affichent, les autres deviennent transparents.  
**Comment** : State `speedFilter: string | null`. Filtre `speedSegments` au rendu : segments non matchés → `strokeColor: 'transparent'` ou `strokeWidth: 1`.  
**Valeur** : Identifier rapidement les zones d'excès de vitesse ou de ralentissement chronique.  
**Effort** : ~2h. Zéro API.

### P4 — Score éco-conduite conducteur

**Écran** : VehicleHistoryScreen — onglet Trajets, ou bloc dédié dans VehicleDetailScreen  
**Quoi** : Score /100 par trajet + score global journalier. Basé sur : excès de vitesse (>80 km/h détecté dans `positions`), ralentis prolongés (idleSeconds), max_speed_kmh (trips).  
**Comment** : `computeDrivingScore(positions, trips)` → pénalités déduites de 100. Badge coloré par TripCard (vert ≥80, orange 60-79, rouge <60).  
**Valeur** : Argument commercial fort pour clients avec conducteurs salariés (assurance, RH, coaching).  
**Effort** : ~4h. Algorithme + UI. Zéro API.  
**Limite** : Qualité du score dépend de la fréquence GPS (si faible, Δvitesse imprécis).

### P5 — Export rapport CSV/PDF journalier

**Écran** : VehicleHistoryScreen — bouton dans le bottom sheet  
**Quoi** : Exporter un rapport structuré du jour sélectionné : trajets (heure, distance, durée, adresses), arrêts (heure, type, durée), alertes, KPIs.  
**Comment** : CSV via `Share.share()` (trivial). PDF via `expo-print` + template HTML → `printToFileAsync()` + partage.  
**Valeur** : Justificatifs kilométriques, rapports DRH, conformité réglementaire.  
**Effort** : ~3h pour CSV. ~1 journée pour PDF propre.  
**Dépendance** : `expo-print` à ajouter pour PDF. Aucune pour CSV.

### P6 — Géofences superposées sur carte historique

**Écran** : VehicleHistoryScreen — carte  
**Quoi** : Afficher les zones géographiques actives (Circle/Polygon) sur la carte de l'historique, comme sur MapScreen.  
**Comment** : Réutiliser `geofencesApi.getAll()` (déjà existant). Ajouter `<Circle>`/`<Polygon>` sur la MapView de VehicleHistoryScreen. Optionnel : mettre en évidence les segments où le trajet sort d'une zone.  
**Valeur** : Détecter visuellement les violations de zone sans naviguer vers un écran dédié.  
**Effort** : ~2h frontend, zéro backend supplémentaire.  
**Note** : Techniquement disponible maintenant. Différé car peu utile sans alertes géofence côté backend.

### P7 — Notifications push temps réel

**Écran** : Transversal (hook `usePushNotifications` existant, déjà branché)  
**Quoi** : Push notification dès qu'une alerte est générée serveur (excès vitesse, sortie zone, contact coupé, panne).  
**Comment backend** : Firebase FCM credentials → table `push_tokens` (userId, token, platform) → trigger dans `alertController.js` → `firebase-admin.messaging().send()`.  
**Comment mobile** : `usePushNotifications` gère déjà l'enregistrement du token. Il faut appeler `POST /users/:id/push-token` au login pour le persister côté serveur.  
**Valeur** : Fonctionnalité différenciante majeure, attendue par les clients premium. Réduit le besoin de polling.  
**Effort** : ~2 jours. Sprint dédié avec backend.  
**Dépendance** : FCM credentials configurés dans Firebase Console + backend infrastructure.
