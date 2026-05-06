# Module Spec — FLEET

> Spec auto-suffisante du module **Gestion de flotte**.
> Référence pour toute session Claude qui construit / modifie ce module dans `trackyu-front-V2`.
>
> Dernière mise à jour : 2026-04-27 (v1.1 — corrections post-audit code legacy)

---

## 0. Identité du module

| Champ                   | Valeur                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| **Nom court**           | Fleet                                                                                                |
| **Nom complet**         | Gestion de flotte                                                                                    |
| **View enum (legacy)**  | `View.FLEET`                                                                                         |
| **URL cible V2**        | `/fleet` (liste) · `/fleet/:vehicleId` (drawer ouvert sur véhicule)                                  |
| **Type**                | 🟪 **Atypique** (table + drawer permanent — ne suit pas le template universel)                       |
| **Statut construction** | ⬜ **À FAIRE** (Phase 4 — V2 pas encore bootstrappée)                                                |
| **Priorité**            | **P0** (premier module à construire en Phase 4 — pilote)                                             |
| **Dépendances**         | Phase 3 bootstrap V2 terminée · `services/api/fleet` portés · `Vehicle` type porté · WebSocket setup |

---

## 1. Mockup Design

### Mockups réceptionnés (2026-04-26)

4 vignettes validées par l'utilisateur :

1. **Dark ADMIN** — table + drawer ouvert sur TY-042 sélectionné
2. **Light ADMIN** — idem mode clair
3. **Vue CLIENT** — "Ma flotte" 12 véhicules, sans dropdown revendeurs, sans actions admin, sans colonne mensualité
4. **Empty state** — "Tous les véhicules / Aucun véhicule connecté pour le moment"

### Caractéristiques visuelles validées

- **Header** : breadcrumb mono `// FLOTTE · VÉHICULES` + titre "Flotte" + LIVE badge
- **Sous-header** : "Tous les véhicules" + "47 véhicules · 31 en route · 9 au ralenti · 5 arrêtés"
- **Toolbar** : Importer CSV / Exporter / Settings ⚙ / [+ Nouveau véhicule] (orange CTA)
- **Filter chips** : Tous (47) · En route (31) · Au ralenti (9) · Arrêté · Hors ligne (5) · Alerte (3)
- **Dropdowns** : Tous les chauffeurs / Tous les revendeurs (admin only)
- **Table colonnes** : ☐ · IMMAT/ALIAS · STATUT · VITESSE · POSITION · CARBURANT · CONDUCTEUR
- **Carburant** : barre horizontale + % (Design choice — libre dans le brief)
- **Statut** : badge dot + label uppercase (En route / Au ralenti / Alerte / Hors ligne)
- **Conducteur** : avatar coloré 28×28 + nom
- **VehicleDetailPanel** (drawer responsive — ⚠ post-audit 2026-04-27, voir §12 pour détail complet) :
  - **4 zones** : Header (~80px) · Config banner (32px optionnel) · Content scroll · Footer (~120px)
  - **Header bleu primaire** : icône statut + nom + immat + position (adresse/géofence + bouton Copier coords + lien Maps) + ligne `Statut + Durée | Kilométrage | Heures moteur` + actions Config/Close
  - **11 onglets** (CollapsibleSection, ordre/visibilité personnalisable via Config mode) :
    1. Photo (Camera) · 2. Activité (Clock) · 3. Alertes (Bell) · 4. Infractions/Violations (AlertOctagon) · 5. Comportement (TrendingDown) · 6. Maintenance (Calendar) · 7. Dépenses (DollarSign) · 8. Carburant (Fuel) · 9. Capteurs (Activity) · 10. GPS (Settings, **staff only**) · 11. Historique Appareil (Cpu)
  - **Footer 2 boutons full-width** :
    - `Immobiliser` / `Déverrouiller` (icône Lock/LockOpen, danger/success selon état)
    - `Signaler une panne` / `Marquer comme réparé` (icône Wrench, warning/success selon état)
  - **Pas de bouton "Replay"/"Modifier" dans le footer** — Replay est dans ActivityBlock via callback `onReplay`

### Code source Design

À sauver lorsqu'utilisateur transmet le code généré par claude.ai Design : `_design-source/FLEET.html` (à créer).

---

## 2. Routes & navigation

### Routes V2 (React Router v7)

```tsx
// trackyu-front-V2/src/router.tsx
{
  path: '/fleet',
  element: <FleetLayout />,        // header + table
  children: [
    {
      index: true,
      element: <FleetTable />,
    },
    {
      path: ':vehicleId',
      element: <VehicleDetailDrawer />,  // drawer permanent ouvert
    }
  ]
}
```

### Triggers entrants

- Sidebar nav item "Véhicules"
- CommandPalette Ctrl+K → "Aller à Flotte"
- Notifications → clic sur alerte véhicule → `/fleet/:vehicleId`
- Map → clic sur marker → `/fleet/:vehicleId` (ou drawer-only via state)
- Dashboard → clic sur KPI "Véhicules actifs"

### Triggers sortants

- "Voir sur carte" sur ligne → `/map?vehicleId=X`
- Bouton "REJOUER LE TRAJET" (ActivityBlock) → callback `onReplay` (peut router vers `/replay?vehicleId=X` selon implémentation V2)
- Bouton "Immobiliser" → mutation API + toast confirmation
- Bouton "Signaler une panne" → mutation API + toast
- Header bouton "Copier" → clipboard
- Header bouton "Maps" → open external Google Maps

---

## 3. Data structure

### Types TypeScript (depuis legacy `types/`)

```ts
import type { Vehicle, VehicleStatus, FleetMetrics, Driver, Alert } from '@/types';
```

À porter de `TRACKING/types/index.ts` et `types/fleet.ts` (et autres si présents).

### Endpoints backend consommés

| Méthode | Endpoint                                  | Rôle                                      |
| ------- | ----------------------------------------- | ----------------------------------------- | ------ |
| GET     | `/api/v1/fleet/vehicles`                  | Liste véhicules (paginée)                 |
| GET     | `/api/v1/fleet/vehicles/:id`              | Détail véhicule                           |
| GET     | `/api/v1/fleet/vehicles/:id/subscription` | Abonnement véhicule (mensualité, contrat) |
| GET     | `/api/v1/fleet/vehicles/:id/activity`     | Historique activité (Activité tab)        |
| GET     | `/api/v1/fleet/vehicles/:id/behavior`     | Stats comportement (Comportement tab)     |
| GET     | `/api/v1/fleet/vehicles/:id/alerts`       | Alertes véhicule (Alertes tab)            |
| GET     | `/api/v1/fleet/vehicles/:id/fuel`         | Données carburant (Carburant tab)         |
| GET     | `/api/v1/fleet/vehicles/:id/maintenance`  | Historique maintenance (Maintenance tab)  |
| GET     | `/api/v1/fleet/vehicles/:id/expenses`     | Dépenses véhicule (Dépenses tab)          |
| POST    | `/api/v1/fleet/vehicles`                  | Créer véhicule                            |
| PUT     | `/api/v1/fleet/vehicles/:id`              | Éditer véhicule                           |
| DELETE  | `/api/v1/fleet/vehicles/:id`              | Supprimer véhicule                        |
| POST    | `/api/v1/fleet/vehicles/import`           | Import CSV                                |
| GET     | `/api/v1/fleet/vehicles/export?format=pdf | excel`                                    | Export |

→ Endpoints exacts à confirmer en lisant `TRACKING/services/api/fleet.ts` et `apiLazy.ts`.

### Hooks data (React Query — à créer dans V2)

```ts
// trackyu-front-V2/features/fleet/hooks/useFleet.ts
useVehicles(filters); // GET liste
useVehicle(id); // GET détail
useVehicleActivity(id); // GET activité
useVehicleBehavior(id); // GET comportement
useVehicleAlerts(id); // GET alertes
useVehicleFuel(id); // GET carburant
useVehicleMaintenance(id); // GET maintenance
useVehicleExpenses(id); // GET dépenses
useCreateVehicle(); // POST mutation
useUpdateVehicle(id); // PUT mutation
useDeleteVehicle(id); // DELETE mutation
useImportVehicles(); // POST CSV
useExportVehicles(format); // GET export
```

### WebSocket events consommés

| Event              | Payload                                             | Effet                                               |
| ------------------ | --------------------------------------------------- | --------------------------------------------------- |
| `vehicle:position` | `{ vehicleId, lat, lng, speed, status, fuelLevel }` | Update ligne table en temps réel + drawer si ouvert |
| `vehicle:alert`    | `{ vehicleId, severity, type, message }`            | Toast + incrément badge "Alerte" filter-chip        |
| `vehicle:status`   | `{ vehicleId, status }`                             | Update badge statut dans table                      |

→ À confirmer en lisant `TRACKING/lib/socket.ts` et services WS.

---

## 4. RBAC — qui voit quoi

Référence : [`../RBAC_MATRIX.md`](../RBAC_MATRIX.md) §2-§3-§5-§6

### Permissions requises

| Élément UI                                     | Permission                               | Rôles autorisés                                   |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| Voir l'écran                                   | `VIEW_FLEET`                             | Tous sauf TECH                                    |
| Bouton "+ Nouveau véhicule"                    | `CREATE_VEHICLES`                        | ADMIN, MANAGER, AGENT_TRACKING                    |
| Bouton "Importer CSV"                          | `CREATE_VEHICLES`                        | idem                                              |
| Bouton "Modifier" (ligne action ou drawer)     | `EDIT_VEHICLES`                          | ADMIN, MANAGER, AGENT_TRACKING                    |
| Bouton "Supprimer" (ligne action)              | `DELETE_VEHICLES`                        | ADMIN                                             |
| Colonne "Mensualité"                           | `VIEW_FINANCE`                           | ADMIN, MANAGER, COMMERCIAL, COMPTABLE, SUPERADMIN |
| Drawer onglet "GPS" champ IMEI                 | Sensitive (`MANAGE_DEVICES` + staff TKY) | SUPERADMIN, TECH (staff TKY uniquement)           |
| Drawer onglet "GPS" champ SIM                  | Sensitive                                | idem                                              |
| Dropdown "Filtrer par tenant"                  | `VIEW_TENANTS` (SUPERADMIN only)         | SUPERADMIN                                        |
| Bouton "Assigner tracker" (drawer GPS)         | `MANAGE_DEVICES`                         | SUPERADMIN, TECH                                  |
| Bouton "Éditer conducteur" (drawer Conducteur) | `EDIT_DRIVERS`                           | ADMIN, MANAGER                                    |

### Vue ADMIN (mockup principal)

Toutes les colonnes, tous les filtres, toutes les actions. Pas de scope restriction.

### Vue CLIENT (vignette validée)

- Pas de dropdown "Filtrer par tenant" / "Tous les revendeurs"
- Pas de boutons "Assigner tracker" / "Éditer conducteur"
- Pas de colonne "Mensualité"
- Pas d'IMEI / SIM dans le drawer GPS (masqués par `***` ou absents)
- Titre "Ma flotte" au lieu de "Flotte"
- Scope = sa flotte uniquement (filtre tenant_id côté backend via JWT)

### Isolation tenant (backend enforce, frontend assume)

- CLIENT / SOUS_COMPTE : filtre tenant_id = leur tenant. Le backend enforce, frontend ne filtre pas en plus.
- RESELLER_ADMIN : voit ses sub-tenants (filtre liste sub-tenants côté backend).
- SUPERADMIN : peut filtrer par tenant via dropdown (multi-tenant aware).

---

## 5. i18n — clés à utiliser

Source : porter depuis `TRACKING/i18n/locales/` puis enrichir si besoin.

### Clés du module (à confirmer dans le legacy + compléter)

```json
{
  "fleet": {
    "title": "Gestion de flotte",
    "titleClient": "Ma flotte",
    "subtitle": "{{count}} véhicules · {{moving}} en route · {{idle}} au ralenti · {{stopped}} arrêtés",
    "live": "LIVE",
    "actions": {
      "newVehicle": "+ Nouveau véhicule",
      "import": "Importer CSV",
      "export": "Exporter",
      "exportPdf": "Exporter en PDF",
      "exportExcel": "Exporter en Excel",
      "manageColumns": "Gérer les colonnes",
      "filterByTenant": "Filtrer par tenant"
    },
    "filters": {
      "search": "Rechercher (immat, alias, conducteur)...",
      "all": "Tous",
      "moving": "En route",
      "idle": "Au ralenti",
      "stopped": "Arrêté",
      "offline": "Hors ligne",
      "alert": "Alerte",
      "allModels": "Tous les modèles",
      "allDrivers": "Tous les chauffeurs",
      "allResellers": "Tous les revendeurs",
      "withAlertsOnly": "Avec alertes uniquement"
    },
    "columns": {
      "plate": "Immat / Alias",
      "status": "Statut",
      "speed": "Vitesse",
      "position": "Position",
      "fuel": "Carburant",
      "driver": "Conducteur",
      "score": "Score conduite",
      "lastUpdate": "Dernière maj",
      "model": "Modèle",
      "monthlyFee": "Mensualité",
      "alerts": "Alertes",
      "actions": "Actions"
    },
    "table": {
      "loading": "Chargement des véhicules...",
      "empty": "Aucun véhicule connecté pour le moment",
      "emptyClient": "Vous n'avez aucun véhicule pour le moment",
      "emptyAfterFilter": "Aucun résultat pour cette recherche",
      "clearFilters": "Effacer les filtres",
      "selectedCount": "{{count}} sélectionné(s)",
      "bulkActions": {
        "edit": "Modifier",
        "export": "Exporter sélection",
        "archive": "Archiver",
        "delete": "Supprimer"
      }
    },
    "rowActions": {
      "view": "Voir détail",
      "viewOnMap": "Voir sur carte",
      "replay": "Replay",
      "edit": "Modifier",
      "duplicate": "Dupliquer",
      "delete": "Supprimer"
    },
    "drawer": {
      "header": {
        "position": "Position Actuelle",
        "copyCoords": "Copier le lien",
        "openMaps": "Ouvrir dans Maps",
        "config": "Configuration",
        "close": "Fermer"
      },
      "tabs": {
        "photo": "Photo",
        "activity": "Activité",
        "alerts": "Alertes",
        "violations": "Infractions",
        "behavior": "Comportement",
        "maintenance": "Maintenance",
        "expenses": "Dépenses",
        "fuel": "Carburant",
        "sensors": "Capteurs",
        "gps": "GPS",
        "deviceHistory": "Historique Appareil"
      },
      "activity": {
        "lastTrip": "Dernier trajet",
        "distanceDay": "Distance (Jour)",
        "timeBreakdown": "Répartition du temps",
        "driving": "Conduite",
        "idle": "Ralenti",
        "stopped": "Arrêt",
        "offline": "Hors ligne",
        "replayCta": "REJOUER LE TRAJET"
      },
      "behavior": {
        "score": "Score",
        "harshBraking": "Freinages durs",
        "harshAccel": "Accélération dure",
        "sharpTurn": "Virages serrés",
        "violationsLink": "Détails des infractions"
      },
      "alerts": {
        "empty": "Aucune alerte aujourd'hui.",
        "viewMore": "Voir les {{count}} autres alertes",
        "collapse": "Réduire"
      },
      "gps": {
        "model": "Modèle",
        "imei": "IMEI",
        "simCard": "Carte SIM",
        "battery": "Batterie",
        "signal": "Signal",
        "anomaliesLink": "Positions suspectes"
      },
      "fuel": {
        "tabToday": "Aujourd'hui",
        "tabWeek": "Cette semaine",
        "refill": "Recharge",
        "theft": "Baisses suspectes",
        "consumption": "Consommation",
        "idleLoss": "Pertes au ralenti",
        "detailLink": "Courbe & détails",
        "tooltip": {
          "start": "Début",
          "refill": "Recharge",
          "loss": "Baisse",
          "consumption": "Consommation",
          "end": "Fin"
        }
      },
      "maintenance": {
        "fullLogLink": "Voir le carnet complet"
      },
      "expenses": {
        "thisMonth": "Ce Mois",
        "thisYear": "Cette Année",
        "vsLastYear": "% vs N-1"
      },
      "footer": {
        "immobilize": "Immobiliser",
        "unlock": "Déverrouiller",
        "reportFault": "Signaler une panne",
        "markRepaired": "Marquer comme réparé",
        "loading": "En cours..."
      }
    }
  }
}
```

→ Clés à reprendre du legacy en priorité, compléter ce qui manque.

---

## 6. Structure UI — composants à construire

### Dossiers V2 cibles

```
trackyu-front-V2/features/fleet/
├── FleetPage.tsx                  ← container avec layout (header + table + drawer)
├── components/
│   ├── FleetTable.tsx             ← table dense (virtualization si > 100 lignes)
│   ├── FleetTableRow.tsx          ← ligne memo
│   ├── FleetToolbar.tsx           ← search + filter chips + actions
│   ├── FleetBulkActionsBar.tsx    ← bandeau bulk actions
│   ├── FleetEmptyState.tsx        ← état vide
│   ├── VehicleDetailPanel.tsx     ← drawer 4 zones (header/banner/content/footer)
│   ├── VehicleDetailHeader.tsx    ← header bleu primaire (statut+nom+immat+position+actions)
│   ├── VehicleDetailFooter.tsx    ← 2 boutons critiques (Immobiliser + Signaler panne)
│   ├── CollapsibleSection.tsx     ← wrapper bloc avec config mode (drag/visibilité)
│   ├── ConfigBanner.tsx           ← banner mode config personnalisation
│   ├── detail-blocks/
│   │   ├── PhotoBlock.tsx         ← (1) Photo véhicule
│   │   ├── ActivityBlock.tsx      ← (2) Activité + REJOUER LE TRAJET
│   │   ├── AlertsBlock.tsx        ← (3) Alertes système triées sévérité
│   │   ├── ViolationsBlock.tsx    ← (4) Infractions/Violations
│   │   ├── BehaviorBlock.tsx      ← (5) Comportement (jauge SVG + 3 stats)
│   │   ├── MaintenanceBlock.tsx   ← (6) Maintenance
│   │   ├── ExpensesBlock.tsx      ← (7) Dépenses (mois/année + tendance)
│   │   ├── FuelBlock.tsx          ← (8) Carburant (FuelGauge + onglets J/S + BarChart)
│   │   ├── SensorsBlock.tsx       ← (9) Capteurs
│   │   ├── GpsBlock.tsx           ← (10) GPS staff only (IMEI/SIM/Batterie/Signal)
│   │   └── DeviceHistoryBlock.tsx ← (11) Historique Appareil
│   └── modals/
│       ├── VehicleFormModal.tsx
│       ├── ImportVehiclesModal.tsx
│       ├── DeleteConfirmModal.tsx
│       ├── MaintenanceLogModal.tsx       ← carnet maintenance complet
│       ├── ViolationsDetailModal.tsx     ← détail infractions
│       ├── FuelChartModal.tsx            ← courbe carburant
│       ├── FuelEventsModal.tsx           ← REFILL / THEFT events
│       └── PositionAnomaliesModal.tsx    ← positions suspectes
├── hooks/
│   └── useFleet.ts                ← hooks React Query (vehicles, fuel, maintenance, alerts...)
└── types.ts                       ← types locaux si besoin
```

### Composants partagés à utiliser (depuis `trackyu-front-V2/components/ui/`)

À construire dans le bootstrap V2 (Phase 3) :

| Composant    | Rôle                                             |
| ------------ | ------------------------------------------------ |
| `Button`     | CTA standard                                     |
| `Card`       | Cartes                                           |
| `Badge`      | Statuts                                          |
| `SearchBar`  | Recherche                                        |
| `Pagination` | Pagination table                                 |
| `Drawer`     | Pattern drawer latéral 480px                     |
| `EmptyState` | États vides                                      |
| `Toast`      | Notifications non-bloquantes                     |
| `Modal`      | Modal centrée                                    |
| `Skeleton`   | Skeleton loaders                                 |
| `Tabs`       | Onglets                                          |
| `FilterChip` | Filter chip                                      |
| `IconButton` | Icon button                                      |
| `Dropdown`   | Dropdown menu                                    |
| `Avatar`     | Avatar utilisateur                               |
| `MiniGauge`  | Mini-gauge horizontale carburant (Design choice) |

---

## 7. Patterns DLS consommés

Référence : [`../DLS.md`](../DLS.md)

### Patterns existants utilisés

- Header pattern : breadcrumb mono + titre + LIVE badge + actions
- `.btn-primary` (CTA "+ Nouveau véhicule")
- `.btn-ghost` (Importer / Exporter)
- `.icon-btn` (settings ⚙)
- `.filter-chip` / `.filter-chip.active`
- `.toolbar`
- `.page-title`
- `.section-title`
- `.th-base` / `.td-base` / `.tr-hover`
- `.badge-moving` / `.badge-idle` / `.badge-stopped` / `.badge-offline` / `.badge-alert`
- Drawer pattern (480px right)

### Patterns nouveaux émergeant de Fleet

À promouvoir au DLS au moment du commit du module :

- **Mini gauge horizontale carburant** (barre + %) — pattern visuel propre, réutilisable partout où on affiche une jauge de complétion (table FleetTable colonne Carburant)
- **CollapsibleSection** avec config mode (drag/visibilité/persist localStorage) — pattern réutilisable pour tout drawer détail multi-sections
- **Header drawer riche** : icône statut + nom + immat + position avec actions copier/maps + ligne info compacte — pattern pour autres entités à détailler
- **Footer drawer 2 boutons critiques** : pattern actions opérationnelles (immobiliser/réparer) — réutilisable pour autres entités à action critique (intervention complete/cancel, ticket close, etc.)
- **FuelGauge SVG circulaire** (jauge niveau %) — pattern réutilisable pour batterie, score, autres complétion
- **Jauge SVG arc progressif animé** (BehaviorBlock score 0-100) — pattern réutilisable pour scores divers
- **Avatar coloré avec initiales** — déjà dans DLS

---

## 8. États visuels (à mockup-er + implémenter)

| État                            | Mockup                                   | Comportement code                                                 |
| ------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| **Normal rempli**               | ✅ Mockup principal Dark + Light validé  | Données chargées via `useVehicles()`                              |
| **Loading initial**             | À designer (skeleton suggéré)            | `isLoading` → afficher 8 lignes skeleton                          |
| **Empty**                       | ✅ Mockup Empty state validé             | `vehicles.length === 0` → EmptyState + CTA                        |
| **Empty after filter**          | À implémenter                            | Filtre appliqué + 0 résultat → message + bouton "Effacer filtres" |
| **Error fetch**                 | À implémenter                            | `isError` → banner rouge + retry button                           |
| **Selection multi**             | À designer (bandeau bulk visible)        | `selectedIds.length > 0` → afficher BulkActionsBar                |
| **Drawer ouvert**               | ✅ Mockup principal montre drawer ouvert | Route `/fleet/:vehicleId` ou state                                |
| **Drawer onglet en chargement** | À implémenter                            | Skeleton sur le contenu de l'onglet                               |

---

## 9. Tests à prévoir

### Tests unitaires (Vitest + Testing Library)

- [ ] `FleetTable` rendering avec data mock
- [ ] `FleetTable` filtering par statut
- [ ] `FleetTable` sort par colonne
- [ ] `FleetTable` selection multi
- [ ] `VehicleDetailPanel` rendering avec 11 onglets + config mode
- [ ] `useFleet` hooks (mocked API)
- [ ] Helpers de formatting (vitesse, durées, etc.)

### Tests E2E manuels (avant commit V2)

- [ ] Login ADMIN → voir tous véhicules · toutes colonnes · tous filtres
- [ ] Login CLIENT → voir uniquement sa flotte · pas colonne mensualité · pas dropdown revendeur
- [ ] Login TECH → ne voit pas l'écran (route protégée)
- [ ] Filtrer par "En route" → seulement véhicules en mouvement
- [ ] Search par immat → trouve le véhicule
- [ ] Cliquer sur ligne → drawer s'ouvre + URL devient `/fleet/:id`
- [ ] Cliquer sur "Voir sur carte" → navigue `/map?vehicleId=X`
- [ ] Cliquer sur "Replay" → navigue `/replay?vehicleId=X`
- [ ] Cliquer sur "Modifier" → modal édition s'ouvre
- [ ] Sélectionner 3 lignes → bandeau bulk apparaît
- [ ] WebSocket : changer position véhicule depuis backend test → ligne MAJ en temps réel
- [ ] Toggle clair/sombre → tout reste lisible
- [ ] Mode mobile (viewport iPhone) → table devient cards (à designer plus tard)

---

## 10. Checklist build (à cocher au fur et à mesure)

```
PRÉ-REQUIS
[ ] Phase 3 bootstrap trackyu-front-V2 terminée
[ ] services/api fleet portés depuis legacy
[ ] types Vehicle / VehicleStatus portés
[ ] WebSocket setup
[ ] Composants ui partagés disponibles (Button, Drawer, Table, etc.)
[ ] Routes React Router v7 configurées

CONSTRUCTION
[ ] FleetPage layout
[ ] FleetToolbar (search + filter chips + dropdowns + actions)
[ ] FleetTable (colonnes + tri + selection)
[ ] FleetTableRow (memo)
[ ] FleetBulkActionsBar (apparaît au selection)
[ ] FleetEmptyState
[ ] VehicleDetailPanel (route imbriquée + 4 zones)
[ ] VehicleDetailHeader (bleu primaire + position + actions copier/maps)
[ ] VehicleDetailFooter (2 boutons critiques : Immobiliser + Signaler panne)
[ ] CollapsibleSection wrapper + ConfigBanner
[ ] 11 detail blocks (Photo / Activity / Alerts / Violations / Behavior / Maintenance / Expenses / Fuel / Sensors / GPS / DeviceHistory)
[ ] Modals (VehicleForm / Import / Delete + MaintenanceLog / Violations / FuelChart / FuelEvents / PositionAnomalies)

INTÉGRATION
[ ] Hooks data branchés (useVehicles, useVehicle, etc.)
[ ] WebSocket events branchés (position / alert / status)
[ ] RBAC guards appliqués (toutes les permissions du tableau §4)
[ ] i18n clés intégrées (FR/EN/ES)
[ ] Pagination table
[ ] Virtualization si > 100 lignes (react-window)
[ ] Export PDF / Excel
[ ] Import CSV

QUALITÉ
[ ] Tests unitaires écrits (>= 60% coverage)
[ ] Tests E2E manuels passés (cf. §9)
[ ] Mode clair ET sombre testés
[ ] Au moins ADMIN + CLIENT testés
[ ] Aucun hex hardcodé (passe par tokens DLS)
[ ] Aucun slate-* / gray-* / zinc-* introduit
[ ] Performance : virtualization OK, pas de re-render inutile
[ ] Accessibilité : focus keyboard, contraste WCAG AA, ARIA labels

LIVRAISON
[ ] Commit avec message conventionné
[ ] Module spec mis à jour : statut → 🟩 CONSTRUIT
[ ] STATE.md mis à jour
[ ] CHANGELOG.md entrée datée
[ ] Patterns nouveaux promus au DLS si applicables
```

---

## 11. Déploiement

### Bootstrap initial (Phase 3-4)

- Module activé en mode dev local (`npm run dev` dans `trackyu-front-V2/`)

### Staging

- Quand staging V2 sera dispo : déploiement spécifique

### Prod

- **Pas avant parité totale** (D16). DNS reste sur legacy.

---

## 12. Notes & décisions spécifiques

- **Drawer permanent au lieu d'onglet "détail"** : choix Design — drawer s'ouvre à droite quand un véhicule est sélectionné, pas un onglet supplémentaire dans la barre. URL réflète l'état (`/fleet/:vehicleId`).
- **Carburant en barre horizontale** : choix Design — pas une mini-gauge circulaire, pas un chiffre seul. À promouvoir au DLS comme `MiniGauge` réutilisable.
- **Filter chip "Alerte (3)"** avec compteur : pattern à réutiliser pour Tickets, Interventions.

### ⚠ Corrections post-audit code legacy 2026-04-27

L'audit Explore du composant legacy `VehicleDetailPanel.tsx` a révélé des écarts importants vs ma description initiale (qui était basée sur une approximation, pas sur le code) :

| Sujet            | Description initiale (erronée)       | Réalité du code legacy                                                                                                                                                           |
| ---------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombre d'onglets | 7 onglets                            | **11 onglets** : Photo · Activité · Alertes · Infractions · Comportement · Maintenance · Dépenses · Carburant · Capteurs · GPS (staff) · Historique Appareil                     |
| Layout drawer    | "480px droit" + "3 quick stats"      | **4 zones** : Header (~80px) · Config banner optionnel · Content scroll · Footer (~120px). Largeur responsive (pas figée 480).                                                   |
| Header           | Photo + immat + statut + close       | Beaucoup plus riche : icône statut + nom + immat + **Position actuelle** (adresse + Copier coords + Maps) + ligne `Statut+Durée \| Kilométrage \| Heures moteur` + bouton config |
| Footer           | "Replay (ghost) + Modifier (orange)" | **Actions opérationnelles fortes** : `Immobiliser`/`Déverrouiller` (Lock/LockOpen, danger/success) + `Signaler une panne`/`Marquer comme réparé` (Wrench, warning/success)       |
| Replay           | Bouton dans footer drawer            | **Bouton `REJOUER LE TRAJET`** dans ActivityBlock via callback `onReplay`                                                                                                        |
| Score conduite   | Dans quick stats drawer              | Dans BehaviorBlock (jauge SVG arc progressif animé 1000ms ease-out + glow filter)                                                                                                |
| Mode config      | (pas mentionné)                      | Mode personnalisation : drag-drop blocs + toggle visibilité par bloc + sauvegarde localStorage                                                                                   |

**Modales déclenchables précises** (depuis les blocks) :

- `MaintenanceLogModal` ← bouton "Voir le carnet complet" (MaintenanceBlock)
- `ViolationsDetailModal` ← bouton "Détails des infractions" (BehaviorBlock)
- `FuelChartModal` ← bouton "Courbe & détails" (FuelBlock)
- `FuelEventsModal:REFILL` ← clic stat "Recharge" (FuelBlock)
- `FuelEventsModal:THEFT` ← clic stat "Baisses suspectes" (FuelBlock)
- `PositionAnomaliesModal` ← bouton "Positions suspectes" (GpsBlock)

**Conséquence pour intégration V2** : adapter le mockup Design (qui a un drawer plus simplifié) au moment du build via D19 (code Design mutable). Les 11 onglets et le footer "Immobiliser/Réparer" doivent être implémentés tels quels en V2.

---

## 13. Changelog du module

| Date       | Action                                                                                                                                                                               | Par                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| 2026-04-26 | Création spec                                                                                                                                                                        | Claude session pivot rewrite  |
| 2026-04-26 | Mockup Design v1 réceptionné (4 vignettes)                                                                                                                                           | utilisateur                   |
| 2026-04-26 | Mockup validé visuellement                                                                                                                                                           | utilisateur                   |
| 2026-04-27 | **Audit code legacy** VehicleDetailPanel + 7 blocks via Explore agent → corrections majeures (11 onglets pas 7, layout 4 zones, footer Immobiliser/Réparer, header riche). Voir §12. | Claude session                |
| -          | Construction démarrée                                                                                                                                                                | (à faire en Phase 4)          |
| -          | Build complet                                                                                                                                                                        | (à faire)                     |
| -          | Validation utilisateur                                                                                                                                                               | (à faire)                     |
| -          | Activé en V2 prod                                                                                                                                                                    | (à faire après parité totale) |

---

_Spec auto-suffisante. Une session Claude lit ce fichier + STATE.md + CLAUDE.md, et a tout pour construire le module Fleet de A à Z._
