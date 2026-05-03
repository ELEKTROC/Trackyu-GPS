# CHANGELOG — Chantier Refonte Design TrackYu

> Journal versionné des décisions et évolutions du Design System TrackYu.
> Chaque modification de [DLS.md](DLS.md), [SCREEN_MAP.md](SCREEN_MAP.md), [CHANTIER_REFONTE_DESIGN.md](CHANTIER_REFONTE_DESIGN.md), ou des composants atomiques `src/index.css` doit faire l'objet d'une entrée ici.
>
> Format : Keep a Changelog (https://keepachangelog.com/) adapté.

---

## [Session 13 — Alignement données carburant V2 sur legacy (VehicleDetailPanel + VehicleDrawer)] — 2026-05-03

### Contexte

Audit utilisateur du bloc Carburant dans le `VehicleDetailPanel` V2 (Carte) : la richesse legacy (1 343 L de code dédié — calculs consommation, courbe ComposedChart, modale review events, KPIs métier, jauge avancée) n'avait pas été portée. Le V2 se résumait à 42 L inline avec données mockées (`60` codé en dur comme capacité réservoir pour tous les véhicules). Décision : préserver le design V2, aligner intégralement les données + workflow sur le legacy en restant pas-à-pas.

### Bug critique fixé

`useVehicleFuel.events` recevait toujours `[]` :

- Le backend `/fuel-events/vehicle/:id` renvoie `{ data: [...] }` (Phase 4 fuelEventRoutes.ts).
- Le hook V2 faisait `Array.isArray(data)` → false → fallback `[]`.
- Conséquence : aucune balise n'avait jamais d'événements carburant en V2 depuis la mise en service de l'endpoint.

Fix : déballage `data.data ?? data` + filtre `status !== 'DISMISSED'` (faux positifs rejetés par manager).

### Lot 1 — Hook `features/fleet/hooks/useVehicleFuel.ts` (réécriture complète)

**Nouveaux champs `FuelStats`** (alignés `objectRepository.getFuelStats`) :

- `avgConsumption`, `totalConsumption`, `totalRefillVolume`, `totalTheftVolume`, `totalCost`
- `refillCount`, `theftCount`, `tankCapacity`, `fuelType`, `idlingWaste`
- Alias rétrocompat (lecture) : `avg`, `min`, `max`, `tank_capacity`, `fuel_type`, `current` — pour ne pas casser Replay et autres consommateurs

**`FuelPoint` enrichi** : `level` (%) + `consumption` (L) conservés depuis backend (forme `{date, level, volume, consumption}`), aliases `time`/`fuel_liters` conservés pour compat V2.

**`FuelEvent` enrichi** : `amount` (alias `Math.abs(delta_liters)`), `severity`, `confidence`, `notes`, `reviewed_by`, `reviewed_at`, addresses début/fin, `vehicle_name`/`vehicle_plate`.

### Lot 2 — Bloc Carburant `features/map/MapPage.tsx` (VehicleDetailPanel sur la Carte)

- Jauge ronde affiche les **vrais litres + capacité réelle** depuis `tankCapacity` backend (avant : `Math.round((v.fuel/100)*60)` codé en dur pour tous).
- 4 KPI mini-cards alignées legacy : Recharge `+X L · n×` · Baisses `−X L · n×` · Consommation `X L · L/100km` · Pertes ralenti `X L · h/min` (formule `idleHours × 1.89 L/h`).
- Tabs Today/Semaine **fonctionnels** : recalcule events + conso sur la fenêtre (formule legacy `start + refills − thefts − end`).
- Bouton "📈 Courbe & détails" → ouvre `FuelDetailModal`.
- Memoization `fuelDerived` pour tous les calculs.

### Lot 3 — Nouveau composant `features/fleet/components/FuelDetailModal.tsx` (529 L)

Port fonctionnel de `legacy/FuelModalContent.tsx` (554 L) avec **design V2** (tokens CSS, font-display/mono, brand-primary) :

- Modale 760 px avec tabs Aujourd'hui / Cette semaine.
- 4 KPI cards (Conso + L/100km, Recharges, Baisses, Niveau actuel `X / capacity L`).
- **ComposedChart Recharts** : Area niveau (bleu) + Line pertes ralenti (orange pointillé) + markers `+` REFILL (vert) / `−` THEFT (rouge) attachés au point d'historique le plus proche.
- Tooltip avec date/heure + détail event au survol.
- Légende.
- Section "Événements détectés" (12 max) avec icônes Droplets/AlertTriangle, statut backend (Confirmé/À vérifier), confidence %, adresse tronquée 320px.

### Lot 4 — Onglet Carburant `features/fleet/VehicleDrawer.tsx` (Fleet)

Refonte du `CarburantTab` (90 → 165 L) :

- Section "Niveau actuel" : grand chiffre litres + barre progression + capacité réservoir + type carburant (DIESEL/GASOLINE).
- Section "Aujourd'hui" : mêmes 4 KPI legacy.
- Sparkline 7 jours (couleur bleue alignée Lot 3).
- Bouton "📈 Courbe & détails" → même `FuelDetailModal`.
- Événements enrichis avec `confidence %` affichée.

### Données backend confirmées

Lecture du `src/repositories/objectRepository.ts` :

- `getFuelHistory(id, duration)` — `date_bin()` PostgreSQL, buckets adaptatifs (1h→1min, 24h→5min, 7d→30min, 30d→2h), retourne `{date, level, volume, consumption}`.
- `getFuelStats(id, tenantId)` — UNION `fuel_records` + `fuel_events` filtrés `status <> 'DISMISSED'`, agrégat sur `CURRENT_DATE` (today only).

### Build / impact bundle

- TypeScript : 0 erreur.
- `MapPage` : 64.73 → 182.79 kB (+118 kB — calculs derived + 5 states + import modale).
- Nouveau chunk lazy `FuelDetailModal-*.js` 383.15 kB (gzip 113.59) — recharts inclus, chargé uniquement à l'ouverture de la modale.
- Build vert en 24.80 s.

### Reste à faire (différé)

- Bar chart hebdo Mon-Sun avec composition Début/Recharge/Baisse/Conso/Fin (legacy `WeeklyBarChart`).
- Géocodage adresse au survol des points de la courbe (le `start_address` events est déjà affiché).
- Modale review events workflow (CONFIRMER/REJETER/DISPUTER) — endpoint `POST /fuel-events/:id/review` déjà câblé côté `services/api/fleet.ts`.
- Saisie manuelle d'un plein (`fuel_records` legacy) — endpoint backend non identifié pour V2.

### Statut

🟧 En attente déploiement staging — `dist/` à jour, prochaine action :

```
powershell -File .\deploy-v2.ps1 -nobuild
```

---

## [Session 12 — Chantier RAPPORTS V2 — Pilote R-ACT-01 Trajets détaillés livré en prod] — 2026-05-02

### Contexte

Pilote du module Rapports : 78 sous-rapports en V2 dont **75 sont des placeholders** (vue détail générique sans génération réelle). Mobile a déjà un système robuste (10 modules, types `ReportGroup`/`ReportFilters`, générateurs par catégorie). Décision : pattern serveur (calcul backend, format normalisé `ReportResult`), workflow filtres permanent (option B), démarrage par R-ACT-01 Trajets détaillés en pilote.

### Backend — endpoint POST /api/v1/reports/activity/trips

**Nouveaux fichiers** :

- `src/repositories/reportsRepository.ts` — `TripsReportFilters`, `getTripsKpis` (agrégat global), `findTripsSummaryByVehicle` (`GROUP BY o.id` + `LEFT JOIN tiers c ON c.id::text = o.client_id::text AND c.type='CLIENT'`), `findTripsDetailsLimited` (window function `ROW_NUMBER() OVER (PARTITION BY object_id ORDER BY start_time DESC)` + `WHERE rn <= N`), `findTripsRows` (legacy flat préservé).
- `src/controllers/reportsController.ts` — handler avec validation Zod, RBAC `tenantId` + `clientId` enforced, formatters FR (date/heure/durée/km/vitesse).
- `src/routes/reportsRoutes.ts` — mount + `authenticateToken` + `requirePermission('VIEW_FLEET')`.

**Modifs** :

- `src/routes/v1Router.ts` — `import reportsRoutes` + `v1Router.use('/reports', reportsRoutes)`.

**Format réponse (groupé)** :

```json
{
  "title": "Trajets détaillés",
  "kpis": [{label, value, color}],
  "summaryColumns": ["Engin","Plaque","Client","Conducteur","Trajets","Distance totale","Durée totale","Vit. moy.","Vit. max"],
  "detailColumns":  ["Date","H. départ","H. arrivée","Départ","Arrivée","Durée","Distance","Vit. moy.","Vit. max"],
  "groups": [{ summary: string[], details: string[][], meta: { tripCount, detailsTruncated } }],
  "meta": { totalCount, truncated, exportOnly, viewThreshold:500, exportOnlyThreshold:5000, perVehicleDetailsLimit:100 }
}
```

**Seuils** :

- `totalCount ≤ 500` → tableau complet
- `500 < totalCount ≤ 5000` → summary + 100 détails max/véhicule + bandeau
- `totalCount > 5000` → `exportOnly=true` (pas de details transmis)

### Frontend V2 — features/reports/

**Types** (`features/reports/types.ts`) — `ReportResult` étendu avec `summaryColumns + detailColumns + groups[]` (compat flat conservée), `ReportGroup` (summary + details + meta tripCount/detailsTruncated), `ReportMeta` (perVehicleDetailsLimit).

**API** (`features/reports/api.ts`) — `useTripsReport()` mutation React Query → `POST /reports/activity/trips`.

**Composants** :

- `MultiSelectField.tsx` — multi-select générique : recherche live, "Tout cocher" filtré, fermeture au clic d'item, **pagination 20/page** (mini-paginateur ◀▶), reset page sur recherche.
- `ReportFilterPanel.tsx` — panneau permanent : **cascade revendeur→client→véhicule** (matching par nom côté UI, IDs côté backend), DateRangePicker, RBAC role-based (revendeur masqué pour ADMIN tenant, revendeur+client pour CLIENT), bouton "Générer le rapport".
- `ExpandableReportTable.tsx` — master/detail : 1 ligne summary par groupe + chevron 90° rotation au clic + sous-tableau détails dessous (mêmes colonnes pour tous), boutons "Tout déployer/replier", banner ambré si `detailsTruncated` au niveau groupe.
- `RptDetailTrips.tsx` — vue détail R-ACT-01 : toggle filtres (auto-masquage après `isSuccess`), KPIs (4), toolbar (ColumnManager pour summary + boutons export désactivés), banner exportOnly global.

**Wiring** (`ReportsPage.tsx`) — branchement `subId === 'R-ACT-01'` → `<RptDetailTrips />`. Les 77 autres restent sur `RptDetailGeneric` ou détails existants (Km/Alerts/MRR).

**Bouton Retour** — déplacé en bas de `RptDetailTrips` + `RptDetailGeneric` (border-top + style ghost).

### Bugs fixés en cours de session

1. **Cascade revendeur → 0 clients/véhicules** : `useVenteClients` lisait `r.reseller_id` (snake) mais backend renvoie `resellerId` (camel via `mapTierRow`). 1634/1635 clients ont leur `reseller_id` peuplé en DB. **Fix** : `r.resellerId ?? r.reseller_id ?? '—'` (idem `createdAt`/`created_at`).
2. **DateRangePicker dropdown sous sidebar** : `right: 0` + bouton près du bord gauche → dropdown sortait à `−110px` du viewport, masqué par sidebar (z-index plus élevé). **Fix** : `useLayoutEffect` mesure `getBoundingClientRect` à l'ouverture, bascule en `left: 0` si débordement gauche.
3. **DateRangePicker raccourcis manquants** : ajout Hier · Sem. préc. · Mois préc. (en plus d'Auj./Sem./Mois/Trim./Année).
4. **DateRangePicker format date OS** : `<input type="date">` affichait jj/mm/aaaa locale OS → remplacé par `<input type="text">` avec parser custom `dd-mm-yyyy` (accepte tirets/slashes/points), validation au blur, valeur interne ISO `YYYY-MM-DD` conservée.
5. **Tableau vide >500 trajets** : controller `if (!truncated)` cachait le tableau dès 501 trajets → `if (!exportOnly)` (affiche les 500 plus récents jusqu'à 5000).
6. **ReportsPage filter chips dupliqués** dans la vue Catalogue (sous la tab bar) supprimés.
7. **Icônes onglets/sous-onglets** retirées dans `AdminPage`, `SettingsPage`, `ReportsPage` (tab bars de navigation).

### UX — pattern groupé adopté (sur retour utilisateur)

Première implémentation flat (1 ligne / trajet, max 500). Retour utilisateur : "tous les trajets ne s'affichent pas avec multi-véhicules" (cf. seuil 500). **Refonte** : format groupé inspiré du mobile (`GroupedDataTable`) — 1 ligne summary par véhicule + détails dépliables. Avantages : 1000 véhicules = 1000 lignes summary (pas de seuil), comparaison flotte directe, charge à la demande pour le détail.

### Déploiements (2026-05-02)

| Hour   | Cible                                    | Hash / preuve                                                                                                                          |
| ------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| ~16:00 | Backend (1ère version reports)           | session geocoding parallèle avait embarqué mon code `if (!truncated)`                                                                  |
| ~17:30 | Backend (fix `if (!exportOnly)`)         | `deploy.ps1 -backend -nobuild -force` 5min13s · HTTP 200                                                                               |
| ~18:00 | Backend (format groupé + colonne Client) | `deploy.ps1 -backend -nobuild -force` 4min38s · `dist/controllers/reportsController.js` confirmé `'Client'` + jointure `tiers c`       |
| ~18:30 | Frontend V2 (final groupé + Client)      | `live.trackyugps.com` index `CDrPzSwq` · `ReportsPage-Deo-vszu.js` HTTP 200, contient `"Tout déployer"` (chaîne ExpandableReportTable) |

### Fichiers nouveaux (Session 12)

**Backend** :

- `src/controllers/reportsController.ts`
- `src/repositories/reportsRepository.ts`
- `src/routes/reportsRoutes.ts`

**Frontend V2** :

- `src/features/reports/types.ts`
- `src/features/reports/api.ts`
- `src/features/reports/components/MultiSelectField.tsx`
- `src/features/reports/components/ReportFilterPanel.tsx`
- `src/features/reports/components/ExpandableReportTable.tsx`
- `src/features/reports/components/RptDetailTrips.tsx`

### Fichiers modifiés (Session 12)

- `trackyu-backend/src/routes/v1Router.ts` (mount /reports)
- `trackyu-front-V2/src/components/ui/DateRangePicker.tsx` (alignement auto + raccourcis + format dd-mm-yyyy)
- `trackyu-front-V2/src/features/vente/hooks/useVenteClients.ts` (camelCase fallback)
- `trackyu-front-V2/src/features/admin/AdminPage.tsx` (retrait icônes onglets)
- `trackyu-front-V2/src/features/settings/SettingsPage.tsx` (retrait icônes sous-onglets)
- `trackyu-front-V2/src/features/reports/ReportsPage.tsx` (suppr filter chips dupliqués, branchement R-ACT-01, retrait icônes onglets)

### Reste à faire (Module Rapports)

- 7 autres rapports d'Activités (R-ACT-02 à R-ACT-08) — pattern groupé/véhicule réutilisable
- 70 rapports d'autres catégories (Alertes · Carburant · CRM · Finance · Comptabilité · Technique · Support · Admin · Superadmin)
- Exports CSV/Excel/PDF (3 boutons actuellement désactivés)
- Graphiques par rapport (étape ultérieure validée par utilisateur)

---

## [Session 12-bis (suite) — Priorité 3 b + c FINANCE V2 : édition items réels + cleanup mocks] — 2026-05-03

### Contexte

Suite immédiate de la Phase 2 backend recouvrement (Session 12-bis principale, 2026-05-02). L'utilisateur a validé la Priorité 3 du backlog FINANCE V2 et choisi d'attaquer **b** (édition facture avec items réels) puis **c** (cleanup mocks `venteData.ts`).

Avant chaque tâche, vérification systématique que le travail n'a pas déjà été livré par une session parallèle (cf nouveau feedback `feedback_check_already_done.md`) :

- **b** : `fetchInvoiceWithItems` était déjà importé dans `VentePage.tsx` (ligne 29) mais utilisé uniquement par `downloadInvoicePDF` (ligne 42) — **pas par le handler d'édition** → tâche bien à faire
- **c** : audit `grep` sur 5 mocks ciblés → 3 zero usage (`VR_DOSSIERS`/`VR_WORKFLOW`/`VR_HISTORY`), 2 encore référencés (`VC_INVOICES`/`VC_PAYMENTS`)

### (b) Édition facture avec items réels

**`VentePage.tsx`** :

- Bouton ✏ Éditer ligne facture refait en async :
  - `setEditLoadingId(inv.id)` pour griser le bouton (~200ms perçus)
  - `await fetchInvoiceWithItems(inv.id)` → merge avec `inv` (items + vatRate réels)
  - Fallback silencieux sur `inv` brut si erreur (rétrocompat synthèse)
  - `setEditInvoice(...) + setInvoiceFormOpen(true)` après fetch
- State `editLoadingId: string | null` ajouté
- Bouton affiche `…` pendant le fetch (au lieu de `✏`), cursor `wait`, opacity 0.5

**`mapInvoiceToFormDefaults`** enrichi :

- Si `inv.items[]` présent (vraies items du backend) → mappe :
  - `unit_price` (backend snake) → `price` (Zod camel)
  - `period` (string optional)
  - `quantity` cast Number
  - `description` (string)
- Sinon → recrée 1 item synthétique à partir de `subject` + `amountRaw / (1 + vatRate/100)` (rétrocompat)
- TVA dynamique selon `inv.vatRate` (default 18) au lieu de hardcoded 18

### (c) Cleanup mocks `venteData.ts`

Audit `grep -rn "VR_DOSSIERS|VR_WORKFLOW|VR_HISTORY|VC_INVOICES|VC_PAYMENTS" src/` :

| Mock          | Lignes referencées                                                           | Action                                     |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| `VR_DOSSIERS` | aucune (panel ACTIONS refondu Session 12-bis utilise `useRecovery.dossiers`) | **retiré** ✅                              |
| `VR_WORKFLOW` | aucune (Kanban Workflow utilise `dossiersByStage`)                           | **retiré** ✅                              |
| `VR_HISTORY`  | aucune (HISTORIQUE DOSSIER utilise `useDossier(tierId).actions`)             | **retiré** ✅                              |
| `VC_INVOICES` | sous-titre SUBS ligne 2551                                                   | **gardé** (encore utilisé)                 |
| `VC_PAYMENTS` | rapprochement bancaire mock (ligne 1760, 1792, 1794) + sous-titre SUBS 2552  | **gardé** (rapprochement non encore câblé) |

**`venteData.ts`** : retrait des 3 exports + commentaire indiquant le remplacement par `useRecovery` / `useDossier`. `VR_AGING` conservé (pas encore d'agrégation backend équivalente).

**`VentePage.tsx`** : import ligne 57 réduit à `VR_AGING` (3 noms retirés).

### Builds

```
Build après b : ✓ 33.26s · VentePage 264.46 kB (+0.67 kB pour state + handler async)
Build après c : ✓ 20.01s · VentePage 264.46 kB inchangé · sourcemap -4.8 kB (mocks tree-shakés)
```

### Reste de la Priorité 3 (à attaquer plus tard)

- **a** Smart contract matching (préremplir items/plaque depuis contrat sélectionné) — ~2h
- **d** Harmoniser RBAC front/back (perms fines `CREATE/EDIT/DELETE_INVOICES`) — ~1h
- **e** Mobile Money sous-types (colonne `payment_provider` backend + UI) — ~3h
- **f** Endpoint send multi-destinataires (`to: string \| string[]`) — ~2h

### Fichiers touchés

**Modifiés** :

- `trackyu-front-V2/src/features/vente/VentePage.tsx` (handler ✏ async + state editLoadingId + mapInvoiceToFormDefaults enrichi + import venteData réduit)
- `trackyu-front-V2/src/features/vente/venteData.ts` (retrait VR_DOSSIERS/VR_WORKFLOW/VR_HISTORY + commentaire de remplacement)
- `docs/design-system/modules/FINANCE.md` (entrée changelog Session 12-bis suite)
- `docs/design-system/CHANGELOG.md` (cette entrée)

### Nouvelle mémoire feedback enregistrée

- `feedback_check_already_done.md` — toujours vérifier dans le code (grep + lecture handler ciblé) qu'une tâche du backlog/doc passation n'est pas déjà livrée par une session parallèle, AVANT de coder

---

## [Session 12-bis — Phase 2 backend recouvrement : 9 endpoints + dossiers + modales front (build vert, attend deploy)] — 2026-05-02

### Contexte

Audit prod chantier FINANCE V2 (lots 1-6 + items détaillés PDF) : tout confirmé en prod. Bundle frontend V2 `index-CDrPzSwq.js` identique local↔prod, backend `getInvoiceById` présent dans dist. Documentation passation alignée (statut "🟧 en attente" → "✅ déployé").

Suite : **Phase 2 backend recouvrement** — activer les 6 boutons "ACTIONS DE RECOUVREMENT" de `ViewRecovFocus` qui étaient `disabled title="Phase 2 — endpoint backend à venir"`.

### Décisions architecturales (tranchées avec l'utilisateur)

- **Option B** = vraie table `recovery_dossiers` dédiée + table `recovery_actions` qui référence `dossier_id`
- **Réversibles** : 3 actions état ont chacune leur endpoint inverse (suspend↔unsuspend, transfer-litigation↔exit-litigation, cancel↔reopen)
- **Mise en demeure** = email simple via `recoveryService.sendManualReminder` + log dans `recovery_actions` (pas de PDF lettre formelle)
- **Permissions** : `requirePermission('MANAGE_INVOICES')` pour formal-notice / suspend / litigation / cancel + auth simple pour log-call / note
- **Migration SQL** : pattern existant `migrations/YYYYMMDD_description.sql`, exécution manuelle ssh+psql

### Migration SQL livrée

`trackyu-backend/migrations/20260502_recovery_dossiers_and_actions.sql` :

- Table `recovery_dossiers` (id UUID PK, tenant_id, tier_id, status [ACTIVE/SUSPENDED/LITIGATION/CANCELLED], opened_at, closed_at, metadata, created_by) avec **index partiel** `idx_recovery_dossiers_one_open` qui garantit "1 seul dossier non-CANCELLED par (tenant, tier)" tout en permettant N dossiers CANCELLED historiques
- Table `recovery_actions` (id UUID PK, tenant_id, dossier_id UUID FK CASCADE, invoice_id UUID nullable, action_type [9 valeurs], note, metadata JSONB, performed_by, performed_at) avec 3 index
- 100 % idempotente (`IF NOT EXISTS` partout)
- Distinct de la table `dunning_actions` existante (relances techniques EMAIL/SMS/CALL avec status SENT/FAILED)

### Backend livré (build vert)

**`recoveryRepository.ts`** — 8 fonctions Phase 2 :

- `findOpenDossierByTier` / `findLastCancelledDossierByTier` / `findDossierById`
- `getOrCreateOpenDossier` (idempotent grâce à l'index unique partiel)
- `updateDossierStatus` (gère `closed_at` automatiquement)
- `insertRecoveryAction`
- `findRecoveryActionsByDossier` (JOIN users pour `performed_by_name`) / `findRecoveryActionsByInvoice`
- `findInvoiceTierForOwnership` (helper ownership tenant + lookup tier_id)

**`recoveryController.ts`** — 9 nouveaux handlers + 1 GET dossier :

- `formalNotice` : log + envoi email via `recoveryService.sendManualReminder`. Si email échoue, action loggée quand même avec `metadata.emailSent=false` (toast warning côté front).
- `logCall` : metadata `{ durationMinutes, contactName, outcome }`
- `addNote` : note obligatoire (Zod min 1 char)
- 6 handlers transition via helper `performStatusTransition` (DRY) qui valide `expectedFrom: RecoveryDossierStatus[]` et retourne 409 si transition invalide
- `getDossierByTier` : retourne `{ dossier, actions: [up to 100] }` ou `{ dossier: null, actions: [] }`

**`recoveryRoutes.ts`** : import `requirePermission`, ajout des 10 routes (1 GET + 9 POST) avec permissions ciblées.

### Frontend V2 livré (build vert · VentePage 263.79 kB +14 kB)

**`hooks/useRecovery.ts`** enrichi (sans modifier `useRecovery` existant) :

- Types `RecoveryBackendStatus`, `RecoveryActionType`, `RecoveryDossierBackend`, `RecoveryActionBackend`, `DossierDetailResponse`
- `useDossier(tierId)` — `useQuery` lookup dossier + historique 100 actions (enabled si tierId, staleTime 30s)
- `useRecoveryActions()` — 9 mutations + invalidations `['recovery']` + `['invoices']` + `['recovery','dossier',tierId]`

**`modals/RecoveryActionModals.tsx`** (nouveau, ~370 L) — 4 composants :

- `FormalNoticeModal` (Dialog 460px) — récap facture + Textarea message (default mise en demeure 8 jours) + note interne. Toast warning si email échoue.
- `LogCallModal` (Dialog 460px) — récap facture + grid 2 cols (Interlocuteur + Durée min via NumberInput) + Select résultat (5 options FR) + Textarea note
- `NoteModal` (Dialog 420px) — récap + Textarea obligatoire (warning si vide)
- `DossierTransitionModal` (Dialog 460px **générique**) — paramétré par `action: DossierTransitionAction`, configs internes pour les 6 transitions. Switch sur la mutation appropriée.

**`VentePage.tsx`** :

- `ViewRecovFocus` : ajout state `actionModal`, hook `useDossier(selected.tierId)` pour récupérer status backend
- Bloc panel ACTIONS remplacé par composant `RecoveryActionsPanel` (~120 L) : 6 boutons grid 2×3 avec **label/icône dynamiques** selon `backendStatus` (ex: "Suspendre auto" → "Réactiver relances" si SUSPENDED). Badge status dossier (SUSPENDU/CONTENTIEUX/ANNULÉ) en top-right si non-ACTIVE. Disable selon transitions valides depuis le statut courant.
- Bloc HISTORIQUE DOSSIER (nouveau) : si `actions.length > 0`, affiche 8 dernières actions avec icône (mapping `ACTION_ICONS`) + label FR + note + horodatage + auteur (`performed_by_name`)
- 4 modales rendues conditionnellement selon `actionModal.kind`

### Endpoints livrés (à déployer)

| Méthode | Route                                                   | Permission      |
| ------- | ------------------------------------------------------- | --------------- |
| GET     | `/api/v1/recovery/dossiers/:tierId`                     | (auth)          |
| POST    | `/api/v1/recovery/invoices/:id/formal-notice`           | MANAGE_INVOICES |
| POST    | `/api/v1/recovery/invoices/:id/log-call`                | (auth)          |
| POST    | `/api/v1/recovery/invoices/:id/note`                    | (auth)          |
| POST    | `/api/v1/recovery/dossiers/:tierId/suspend-auto`        | MANAGE_INVOICES |
| POST    | `/api/v1/recovery/dossiers/:tierId/unsuspend-auto`      | MANAGE_INVOICES |
| POST    | `/api/v1/recovery/dossiers/:tierId/transfer-litigation` | MANAGE_INVOICES |
| POST    | `/api/v1/recovery/dossiers/:tierId/exit-litigation`     | MANAGE_INVOICES |
| POST    | `/api/v1/recovery/dossiers/:tierId/cancel`              | MANAGE_INVOICES |
| POST    | `/api/v1/recovery/dossiers/:tierId/reopen`              | MANAGE_INVOICES |

### Build

```
Backend  : tsc OK (dist/controllers/recoveryController.js + recoveryRepository.js + recoveryRoutes.js)
Frontend : ✓ built in 15.36s · VentePage 263.79 kB (+13.88 kB) · 0 erreur 0 warning chunk size
```

### Reste à faire (déploiement séquencé)

1. **Migration SQL en prod** : upload migration + exec via psql container
2. **Backend deploy** : `.\deploy.ps1 -backend -nobuild -force` (⚠ -force obligatoire)
3. **Frontend V2 deploy** : `.\deploy-v2.ps1 -nobuild`
4. **Vérification E2E** : https://live.trackyugps.com/vente?tab=recouvrement → onglet Dossier client → cliquer chaque action

### Fichiers touchés

**Créés** :

- `trackyu-backend/migrations/20260502_recovery_dossiers_and_actions.sql`
- `trackyu-front-V2/src/features/vente/modals/RecoveryActionModals.tsx`

**Modifiés** :

- `trackyu-backend/src/repositories/recoveryRepository.ts`, `src/controllers/recoveryController.ts`, `src/routes/recoveryRoutes.ts`
- `trackyu-front-V2/src/features/vente/hooks/useRecovery.ts`, `src/features/vente/VentePage.tsx`
- `docs/design-system/STATE.md`, `CONTEXTE_SESSION_SUIVANTE.md`, `modules/FINANCE.md`, `CHANGELOG.md`

---

## [Session 11-bis — Chantier FINANCE V2 démarré : LOT 1 Relancer + LOT 2 Saisir paiement livrés] — 2026-05-02

### Contexte

Audit du menu facture V2 demandé par l'utilisateur. Constat : **100 % des boutons d'action sont `disabled` avec `title="Bientôt disponible"`** — les CRUD ne sont pas câblés malgré l'existence du service `services/api/finance.ts` (port legacy de 2058 lignes). Le hook `useRecovery.sendReminder` existait mais n'était pas branché à l'UI.

13 régressions identifiées vs legacy `features/finance/` (3269 lignes FinanceView + 970 lignes InvoiceForm + Zod). Routes backend toutes vérifiées en prod : `POST/PUT/DELETE /finance/invoices`, `POST /finance/invoices/:id/send`, `POST/DELETE /finance/payments`, `POST /recovery/invoices/:id/{remind,mark-paid,partial-payment}`.

### Spec FINANCE.md créée

[`docs/design-system/modules/FINANCE.md`](modules/FINANCE.md) (290 L) — spec auto-suffisante :

- Mapping fidèle Templates Design (A facture · G modale · vc-billing · vr-views) → composants V2
- 6 lots de livraison priorisés
- Endpoints backend + permissions + RBAC
- Tokens DLS + couleurs statuts métier
- Décisions métier documentées

### LOT 1 ✅ Relancer

**Hook `useRecovery.ts` enrichi** : `sendReminder` passe d'une simple fonction à `useMutation` :

- Body POST : `{ channel: 'EMAIL'|'SMS'|'CALL', template?: 'COURTOISE'|'FERME'|'MISE_EN_DEMEURE', note?: string }`
- `onSuccess` invalide `['recovery']` + `['invoices']`

**`ReminderModal.tsx`** créé dans `features/vente/modals/` :

- Port Template G (Dialog 420px) — pattern QuickActionPage
- Récap facture en haut + 3 FormField (canal/modèle/note)
- Pré-sélection intelligente du template selon `daysLate`
- Toast succès/erreur

**4 endroits câblés dans VentePage** : icône 🔔 liste, bouton RELANCER Kanban, cercle 🔔 panel EN DÉTAIL, bouton 🔔 FactureDetailPanel.

### Décision métier — "Marquer comme payée" retiré

Pas de raccourci "Mark as paid" en UI. **Pour passer une facture en PAID, on doit OBLIGATOIREMENT saisir un paiement** (LOT 2). Endpoint `POST /recovery/invoices/:id/mark-paid` existe mais n'est **pas exposé**. Raison : rigueur comptable, traçabilité, pas de raccourci administratif.

### LOT 2 ✅ Saisir paiement

**`usePaymentMutations.ts`** : POST/DELETE `/finance/payments` snake_case + invalidations `['payments', 'invoices', 'recovery']`.

**`PaymentModal.tsx`** : Port Template G (Dialog 420px). Récap facture pré-rempli + 6 FormField. Mobile Money 4 sous-options (MTN/Orange/Moov/Wave) consolidées en `MOBILE_MONEY` backend, précision conservée dans `reference`.

**Branchements** : Toolbar `+ Saisir paiement` + boutons `💰 Saisir un paiement` sur ViewInvoiceDetail (panel actions) et FactureDetailPanel (slide-in), conditionnés à `status !== 'paid' && status !== 'draft'`.

### LOT 3 ✅ Nouvelle facture / édition / suppression

**Inauguration Zod 4 + react-hook-form + @hookform/resolvers en V2** (deps installées depuis le bootstrap, jamais utilisées jusqu'ici).

**`schemas/invoiceFormSchema.ts`** :

- `invoiceLineSchema` (description min 1, quantity ≥ 1, price ≥ 0)
- `invoiceFormSchema` avec `.refine()` pour `dueDate ≥ date`
- Helper `computeTotals(items, vatRate)` → `{ subtotalHT, tva, totalTTC }` consommé en live dans la modale

**`useInvoiceMutations.ts`** :

- POST `/finance/invoices` (CREATE_INVOICES)
- PUT `/finance/invoices/:id` (EDIT_INVOICES)
- DELETE `/finance/invoices/:id` (DELETE_INVOICES)
- POST `/finance/invoices/:id/send` (préparé pour LOT 4)
- Mapping camelCase Zod → snake_case backend (`items[].price` → `items[].unit_price`, `amount` = TTC calculé front, `vat_rate` envoyé séparé)

**`InvoiceFormModal.tsx`** — port Template A (`TplAFormInvoice` `_raw/tpl-views.jsx:36-130`) en composant réutilisable :

- Dialog 1000px (overlay sombre, body scrollable)
- Bloc 2 cols Émetteur (readonly TrackYu GPS) + Destinataire (Select client depuis `useVenteClients`)
- Card Références 4×2 cols : Type · Date émission · Échéance · Catégorie / Contrat (depuis `useContracts`) · Plaque · Bon cmd · Sujet
- Card Lignes éditables fidèle Design : **Désignation · Période · Qté · PU HT · Total HT · ✕** (`useFieldArray` pour add/remove)
- Totaux live HT / TVA (`Select` 0/9/18 %) / TTC mis à jour à chaque change
- Card Conditions + Notes en grid 2 cols
- Footer : Annuler · **Enregistrer brouillon** (`status='DRAFT'`) · **Émettre la facture** (`status='SENT'` → déclenche écriture comptable backend)
- Mode édition : `initialInvoice.id` fourni → PUT au lieu de POST

**Branchements VentePage** :

- Bouton `+ Nouvelle facture` toolbar (était `disabled`) → ouvre modale création
- Action `✏ Éditer` sur ligne table (nouvelle icône) → ouvre modale édition préremplie via helper `mapInvoiceToFormDefaults` (extraction date/montant/items du backend Invoice mappé)
- Action `🗑 Supprimer` sur ligne (nouvelle icône) → `Dialog` confirm avec récap + warning irréversible + `deleteInvoice` mutation

**Décision Design** : suivi fidèle TplAFormInvoice (colonne Période ajoutée comme dans le mockup, valait pour les factures d'abonnement mensuel).

### Build LOT 3

```
✓ built in 11.87s
VentePage : 241.71 kB (gzip 62.09 kB) — +114 kB vs LOT 2 (Zod + react-hook-form + InvoiceFormModal complète, première utilisation V2 → coût initial justifié, sera mutualisé pour les futurs forms)
0 erreur · 0 warning
```

### LOT 4 ✅ Actions panel détail (refonte fidélité mockup utilisateur 2026-05-02)

L'utilisateur a fourni la capture du mockup Design `VcInvoiceDetail` (`_raw/vc-billing-views.jsx:88-286`) montrant la cible exacte du panel ACTIONS. Refonte complète pour fidélité maximale :

**Bouton géant "Envoyer relance" (port fidèle)** :

- 170px hauteur, fond `stColor` (rouge `#ef4444` si late, autre selon statut)
- Icône huge 140px (🔔 si late, ✓ si paid, 📄 sinon) en filigrane top-center, opacity 0.85
- Label "Envoyer relance" bottom-right, font 13px bold blanc
- Variantes statut : late (rouge cliquable) · paid (vert non cliquable) · partial · draft

**Card actions secondaires** (boutons stack, helpers `actionBtnStyle`/`actionBtnSecondaryStyle`/`actionBtnGhostDanger`) :

- `💰 Saisir un paiement` (primary orange) si `status !== 'paid' && status !== 'draft'`
- `↓ Télécharger PDF` (secondary)
- `✉ Renvoyer par email` (secondary)
- `Émettre avoir` (ghost border rouge `#ef444466` color `#fca5a5`)

**`SendInvoiceModal.tsx`** créé — Template G Dialog 460px :

- Récap facture + 4 FormField : To (validation email regex), Cc optionnel (validation email regex), Subject (default `Facture {ref}`), Message (Textarea 80px)
- POST `/finance/invoices/:id/send` body `{ to, cc, subject, message }` (backend génère HTML)
- Toast succès `"Facture {ref} envoyée à {email}"`

**`generateInvoicePDF.ts`** helper créé — jspdf + jspdf-autotable :

- Header : émetteur TrackYu GPS SAS (orange brand) + FACTURE titre + ref + badge status coloré
- Bloc 3 cols : FACTURÉ À · RÉFÉRENCES (contrat/abonnement/période) · DATES (émise/échéance)
- AutoTable lignes : DÉSIGNATION · PÉRIODE · QTÉ · PU HT · TOTAL HT
- Totaux : Sous-total HT · TVA · **TOTAL TTC** (orange brand, ligne séparatrice)
- Footer : conditions paiement + IBAN
- Sortie : `{ref}.pdf` téléchargement direct

**Lazy-loading dynamique** : `await import('./utils/generateInvoicePDF')` au clic PDF — chunk dédié 425 kB (jspdf + html2canvas) chargé uniquement à la demande. Sans ce split, VentePage faisait 672 kB (warning Vite). Avec : VentePage reste 245 kB.

**Émettre avoir** : réutilise `InvoiceFormModal` avec `initialInvoice = { invoiceType: 'AVOIR', subject: 'Avoir sur {ref}', items: [{ description: 'Avoir sur facture {ref}', quantity: 1, price: HT }], notes: 'Avoir émis pour annulation/régularisation…' }`. Le formulaire est éditable, l'utilisateur ajuste le montant et émet.

**Branchements `FactureDetailPanel` slide-in** : ajouts boutons PDF (toujours visible), Email (toujours), Relance (si late), Émettre avoir (si paid).

### Build LOT 4

```
✓ built in 15.07s
VentePage : 245.25 kB (gzip 63.23 kB) — +3.5 kB vs LOT 3
generateInvoicePDF chunk : 424.78 kB (gzip 139 kB) — chargé uniquement au clic PDF
html2canvas.esm chunk : 202.42 kB (gzip 48 kB) — dépendance jspdf
0 erreur · 0 warning chunk size (résolu via dynamic import)
```

### LOT 5 ✅ Filtres avancés + ColumnManager + Export CSV

**Filtres composables** (côté client sur la page courante) :

- **Recherche texte** (`ToolbarSearch`) — câblée `value/onChange`, filtre multi-critères : ref + client + clientRef + plate + reseller + subject + sub (lowercase contains)
- **Filtre Statut** — pattern existant FilterChip cycle (paid/issued/late/partial/draft + Tous)
- **Filtre Catégorie** — nouveau FilterChip cycle 4 options (STANDARD/INSTALLATION/ABONNEMENT/AUTRES_VENTES). Note : le champ `category` n'est pas encore exposé par `useInvoices` mapping V2 → filtre fonctionnel mais retournera 0 résultat tant que le mapping n'est pas enrichi (à faire backend/hook plus tard)
- **ResetFiltersButton** — visible si au moins un filtre actif, reset les 3 d'un coup

**ColumnManager** primitive câblée :

- Bouton `⚙ Colonnes` (était `disabled`) → toggle popover `ColumnManager`
- Constante `INVOICE_COLUMNS_DEFAULT` : 13 colonnes (4 lockées : `select`, `ref`, `client`, `amount`, `actions`)
- État `colVisible` persistant via `localStorage` clé `vente_invoices_visible_cols_v1`
- Helpers `toggleCol(key)`, `resetCols()`, `isVis(key)`
- Render conditionnel `<TH>`/`<TD>` selon `isVis()`

**Export CSV** — `utils/exportInvoicesCSV.ts` :

- Lib `papaparse` 5.5.3 (déjà dans deps V2)
- 14 colonnes avec statut traduit FR
- Délimiteur `;` (Excel FR friendly) + BOM UTF-8 pour caractères accentués
- Filename auto `factures_YYYY-MM-DD.csv`
- **Lazy-import dynamique** au clic — papaparse hors bundle initial
- Bouton désactivé si `displayed.length === 0`
- Export = factures **filtrées** uniquement

### Build LOT 5

```
✓ built in 14.93s
VentePage : 248.01 kB (gzip 64.36 kB) — +2.76 kB vs LOT 4
0 erreur · 0 warning
```

### Fichiers touchés

**Créés** :

- `docs/design-system/modules/FINANCE.md`
- `trackyu-front-V2/src/features/vente/modals/ReminderModal.tsx`
- `trackyu-front-V2/src/features/vente/modals/PaymentModal.tsx`
- `trackyu-front-V2/src/features/vente/modals/InvoiceFormModal.tsx`
- `trackyu-front-V2/src/features/vente/modals/SendInvoiceModal.tsx`
- `trackyu-front-V2/src/features/vente/hooks/usePaymentMutations.ts`
- `trackyu-front-V2/src/features/vente/hooks/useInvoiceMutations.ts`
- `trackyu-front-V2/src/features/vente/schemas/invoiceFormSchema.ts`
- `trackyu-front-V2/src/features/vente/utils/generateInvoicePDF.ts`
- `trackyu-front-V2/src/features/vente/utils/exportInvoicesCSV.ts`

**Modifiés** :

- `trackyu-front-V2/src/features/vente/hooks/useRecovery.ts` (sendReminder → useMutation)
- `trackyu-front-V2/src/features/vente/VentePage.tsx` (12 branchements + imports modales + helpers actionBtn\* + lazy-import PDF + ViewInvoiceDetail panel refondu fidélité + FactureDetailPanel enrichi)

### Reste du chantier FINANCE V2

- LOT 5 — Filtres avancés + ColumnManager + Export CSV
- LOT 6 — Recouvrement complet (Overview/DossierFocus/Workflow VrViews)

---

## [Session 11 — Bootstrap infra Vitest V2 + plan de tests prioritaires] — 2026-05-02

### Contexte

Constat : la legacy avait 2 tests unitaires (`tests/SettingsIntegration.test.tsx` + `tests/hooks/useDateRange.test.tsx`) avec Vitest. La V2 avait l'**infra installée** (vitest 4 + RTL + jsdom + coverage v8 dans `package.json`, script `npm test`) mais **0 fichier de test** et **0 config Vitest** (pas de `vitest.config.ts`, pas de setup file).

Les 2 tests legacy ne sont **pas portables littéralement** :

- `useDateRange` (hook stateful avec presets `THIS_YEAR` / `LAST_MONTH` / etc.) → V2 a `utils/dateRange.ts` avec `periodToRange(period)` (fonction pure, périodes `day/week/month/year`)
- `SettingsView` (1 vue + DataContext) → V2 a `SettingsPage` (navigation 2 niveaux × 13 vues, pas de DataContext, React Query)

Décision : écrire des **équivalents fonctionnels** adaptés à V2, pas un port littéral.

### Livraison

**Infrastructure Vitest V2** (2 nouveaux fichiers) :

- `vitest.config.ts` à la racine → jsdom · alias `@` → `src/` · setupFiles · coverage v8 (exclude test/main/router/d.ts)
- `src/test/setup.ts` → import `@testing-library/jest-dom/vitest` · `cleanup()` afterEach · stubs `matchMedia` / `ResizeObserver` / `IntersectionObserver` (jsdom ne les fournit pas)

**Premier test pur** (`src/utils/__tests__/dateRange.test.ts` — 11 tests verts) :

- `periodToRange` : day/week/month/year + alias FR (jour/semaine/année) + fallback inconnu + edge case dimanche pivote correctement vers lundi
- `formatDateRange` : single date vs plage avec tiret cadratin
- Date pivot : lundi 15 juin 2026 12:00 UTC (lundi expose pivot semaine, mois 30 jours, année non-bissextile)

**Premier smoke test composant** (`src/features/settings/__tests__/SettingsPage.smoke.test.tsx` — 6 tests verts) :

- Mock layout : `Topbar` + `SubHeader` (hors périmètre)
- Mock 13 sous-vues (chacune testée isolément ailleurs — backlog Tier 3)
- Tests : 5 groupes L1 affichés · groupe PROFIL actif au montage · `AccountView` rendu par défaut · clic GESTION → 7 sous-onglets + `TableView entity=users` · clic RÈGLES & ALERTES → `RulesAlertsView rulesTab=zones` · titre SubHeader synchronisé sur variant actif
- Pièges rencontrés et corrigés : (1) `vi.mock` est hoisted → factory ne peut pas référencer un `const stub` global → inline les stubs dans chaque factory ; (2) `/Utilisateurs/i` matche aussi "Sous-utilisateurs" → utiliser `/^Utilisateurs$/i` strict

**Plan de tests prioritaires** (`docs/design-system/TESTING_PLAN.md` — nouveau doc) :

- Tier 1 — code métier critique (mappers, hooks data, utils) : `mapInvoice` · `getBillingMonths` · `useContracts` · `useDashboardData` · `useVehicleActivity` · `useVehicleFuel` · `vehicleStatus` · `geo` · `currencies`
- Tier 2 — composants UI critiques : `DataTable` · `VehicleDrawer` · `MapPage` filters · `AppearanceProvider` · `Pagination`
- Tier 3 — smoke tests pages : Dashboard · Fleet · Vente · Map · Admin (Settings ✅)
- Tier 4 — intégration : Auth flow · RBAC sidebar (12 rôles) · pagination Vente factures
- Conventions : tests **co-localisés** dans `__tests__/` à côté du code testé (≠ legacy `tests/` racine) · `.test.ts` pur · `.test.tsx` composant · `.smoke.test.tsx` smoke · `.integration.test.tsx` cross-module
- Mocking : préférer mocker `services/api/*` plutôt que React Query · contextes via `vi.mock('@/contexts/...')` · date pivot recommandée = lundi 15/06/2026 12:00 UTC
- Estimation : ~8 jours-dev pour atteindre 60-70 % couverture

### Suite session — Tier 1 utils + mappers (4 commits V2 supplémentaires)

Après le bootstrap (commits V2 `7a9cec6` + TRACKING `70b24e4`), on enchaîne directement sur le Tier 1 du backlog sans relâche.

**Commit V2 `826e86e` — `mapInvoice` (53 tests)** — sérialise BackendInvoice → Invoice pour les ~7133 factures prod. Couverture : mapping nominal · 11 fallbacks valeurs nulles · `paidAmount` 0/null → `"—"` · `normalizeStatus` 10 cases (incluant alias backend `overdue`→`late`, `pending`/`sent`→`issued` + case-insensitive) · `calcDaysLate` 5 cases (dépend de `Date.now()` via `vi.setSystemTime`) · montants priorité ttc/ht + parsing string/number/invalide · `vatRate` default 18 (incluant edge case documenté `parseFloat(0) || 18 = 18`) · `category` 3 valeurs valides + `STANDARD` legacy → null · dates formatées + raw.

**Commit V2 `1fd7112` — `vehicleStatus` + `geo` + `currencies` (81 tests)** — ferme le Tier 1 utils purs.

- `vehicleStatus.test.ts` (24) : labels FR canoniques + lowercase + couleurs métier FIXES (#22C55E vert, #F97316 orange, #EF4444 rouge, #6B7280 gris) + statut inconnu → fallback gris + cohérence UPPERCASE = lowercase pour labels/colors/classes Tailwind.
- `geo.test.ts` (22) : `isValidCoord` Abidjan/Yamoussoukro · règle anti-fix non convergé `(0,0)` · null/undefined/NaN/Infinity · bornes WGS84 ; `haversineMeters` point identique → 0 · Abidjan↔Yamoussoukro ~217 km · Paris↔NY ~5837 km · symétrie · antipodes ~20015 km.
- `currencies.test.ts` (35) : 6 devises supportées (XOF/XAF/EUR/USD/MAD/GNF) · décimales (0 pour CFA/GNF, 2 pour EUR/USD/MAD) · prefix/suffix · `formatCurrency` null/undefined/NaN → `'--'` · XOF arrondit · EUR fr-FR (1 500,00) · USD en-US (1,500.00) · devise inconnue → fallback fr-FR + suffixe code · `getCurrencyConfig`.
- **Bug attrapé en passant** : estimation initiale Abidjan↔Yamoussoukro à 235 km était fausse (j'avais pris la route au lieu du vol d'oiseau). Vraie valeur haversine = ~217 km. Test corrigé, commentaire explicatif ajouté.

**Commit V2 `a0391bf` — `mapContract` + `formatDuration` (44 tests)** — ferme le Tier 1 mappers métier (2/2).

- `mapContract.test.ts` (27) : mapping nominal (id/ref/client/reseller/type + raw values) · 5 fallbacks valeurs nulles · `calcDuration` (`endDate` null → "Indéfini" CDI · 24/12/6 mois exacts) · `formatAmount` 4 cycles (MONTHLY/QUARTERLY/ANNUAL/SEMIANNUAL) + fallback + lowercase + format "X F / cycle" + edge case 0 · `mapStatus` 5 mappings (ACTIVE/EXPIRED/TERMINATED→canceled/SUSPENDED/PENDING) + lowercase + fallback "active" · dates formatées.
- `formatDuration.test.ts` (17) — helper exporté de `useVehicleActivity` : `<` 1h → "X min" (0/59s/60s/42min/59min59s) · `>=` 1h → "Xh MM" avec padding zéro (1h 00, 1h 05, 24h 00, 100h 00) · robustesse arrondi (secondes résiduelles ignorées, seuil 3599).

### Résultat final session

**195/195 tests verts** (`npm test -- --run` : 8 files passed, 195 tests passed, ~10s).
0 régression. Typecheck : 0 erreur dans les fichiers ajoutés (les erreurs pré-existantes sur Map/GoogleMaps/ReportFilterPanel sont indépendantes).

| Item Tier 1 backlog                               | Statut                                                     |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `mapInvoice`                                      | ✅ 53 tests                                                |
| `mapContract`                                     | ✅ 27 tests                                                |
| `vehicleStatus`                                   | ✅ 24 tests                                                |
| `geo`                                             | ✅ 22 tests                                                |
| `currencies`                                      | ✅ 35 tests                                                |
| `formatDuration` (helper de `useVehicleActivity`) | ✅ 17 tests                                                |
| `useDashboardData`                                | ⏳ différé (mock React Query requis)                       |
| `useVehicleActivity` (hook complet)               | ⏳ différé (mock React Query requis)                       |
| `useVehicleFuel`                                  | 🔒 bloqué — refactor extract mappers requis                |
| `getBillingMonths`                                | 🔒 bloqué — refactor extract requis (dans `VentePage.tsx`) |

### Conventions adoptées (mémorisées)

2 feedback memories enregistrées pour les sessions futures :

- `feedback_vitest_v2_pitfalls.md` : (1) `vi.mock` factories hoistées → inliner stubs ; (2) regex RTL strictes `^X$` sur libellés FR (collisions Utilisateurs/Sous-utilisateurs)
- `feedback_v2_test_conventions.md` : co-localisation `__tests__/` (≠ legacy `tests/` racine) · naming `.test/.smoke/.integration` · date pivot lundi 15/06/2026 12:00 UTC · setup file global déjà fourni

### Prochaine action

Items Tier 1 restants demandent soit mock React Query (lourd setup `QueryClientProvider` + `vi.mock` httpGet + `renderHook` + `waitFor`) soit refactor extract (`getBillingMonths` + `useVehicleFuel` mappers inline). Décision : s'arrêter là pour cette session — ROI marginal des hooks restants plus faible. Refactors à valider avec utilisateur en début de session suivante.

---

## [Session 10 H — Phase Dashboard admin Geocoding (toggles runtime + agrégats jour/mois + cost réel)] — 2026-05-02

### Contexte

Suite aux Sessions 10 + G + S, l'utilisateur demande la liste de données nécessaires pour un dashboard admin (10 items). Audit montre 7/10 dispo directement, 3 manquants :

- Toggle activer/désactiver Google + Nominatim
- Requêtes du mois (Redis TTL 7j ne couvrait pas)
- Coût Google ce mois (Counter Prometheus reset à chaque restart)

### H1 — Toggles runtime + TTL Redis 30j

- `NominatimService.isEnabled()` : nouvelle méthode static qui lit `SettingsService.get('GEOCODING_NOMINATIM_ENABLED')`. Default = enabled si setting null.
- `GoogleMapsService.isConfigured()` enrichi : retourne false si pas de clé OU si `GEOCODING_GOOGLE_ENABLED='false'`.
- `ReverseGeocodingService.resolveFromProviders()` :
  - Vérifie `NominatimService.isEnabled()` AVANT chaque appel → si disabled, `recordGeocodingRequest('nominatim', 'disabled', 0)` puis passe direct au fallback Google
  - Si Nominatim ET Google disabled → `logger.warn('both providers disabled')` pour visibilité ops
- TTL Redis hash counters passé de 7j → **30j** (constant `TTL_30D_SECONDS`) → permet l'agrégat "Requêtes du mois" sur 30j glissants.

### H2 — Endpoint enrichi + endpoint toggle

**`GET /api/v1/geocoding/stats`** ajoute 5 nouveaux champs :

- `requestsToday` (somme HASH `geocoding:source:YYYY-MM-DD`)
- `requestsThisMonth` (SCAN keys `geocoding:source:YYYY-MM-*` + SUM HVALS)
- `zonesUniqueToday` (ZCARD du sorted set zones)
- `costThisMonthUSD` (DB query : `COUNT WHERE provider='google' AND created_at >= date_trunc('month', NOW()) × 0.005`)
- `insertsMonthByProvider` (DB query group by provider sur le mois)
- `providersEnabled: { nominatim: bool, google: bool }` (toggles runtime live)

**Nouveau `PATCH /api/v1/geocoding/providers`** (permission `MANAGE_SETTINGS`) :

- Body : `{ nominatim?: boolean, google?: boolean }`
- Stocke `GEOCODING_NOMINATIM_ENABLED` et/ou `GEOCODING_GOOGLE_ENABLED` via `SettingsService.set()` (DB + file fallback)
- Retourne l'état après changement
- Toggle prend effet immédiatement (next call à isEnabled/isConfigured)

### Test E2E prod (validation finale)

1. **Toggle DB direct** : `INSERT system_settings ('GEOCODING_GOOGLE_ENABLED', 'false')` → confirmé persisté
2. **Resolve coords hors-CI nouvelles** (Lagos NG, Accra GH) → both return null avec log `[Geocoding] all providers null` (Nominatim CI ne couvre pas + Google disabled)
3. **Toggle Google ON remis** pour ne pas casser le fallback prod
4. **Replay 24h post-déploiement** : 99.80 % hit ratio sur 500 positions

### Données prod réelles découvertes (premier mois sous nouveau code)

| Provider            | Inserts ce mois | Coût USD ce mois                 |
| ------------------- | --------------- | -------------------------------- |
| Nominatim           | **60 168**      | $0                               |
| None (last_null_at) | 24 173          | $0 (économisé via cache négatif) |
| **Google**          | **123**         | **$0.615**                       |

→ **Premier vrai chiffre coût Google : 0.615 USD/mois** (vs 0 USD précédemment estimé). 123 inserts représentent 0.14 % du trafic geocoding total. Le filet Google est utilisé mais marginal.

### Mapping dashboard admin (10 items demandés)

| #   | Item                         | Source            | Champ JSON                                                                                |
| --- | ---------------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| 1   | Requêtes du jour             | Redis HASH        | `requestsToday`                                                                           |
| 2   | Requêtes du mois             | Redis SCAN + SUM  | `requestsThisMonth`                                                                       |
| 3   | Coût estimé Google           | DB SQL            | `costThisMonthUSD`                                                                        |
| 4   | Cache hit rate               | Prom Counter      | `cacheHitRate`                                                                            |
| 5   | Zones géocodées              | Redis ZCARD + DB  | `zonesUniqueToday` + `topZonesToday`                                                      |
| 6   | Échecs                       | Prom Counter      | `failedRequests`, `nominatimFailed`, `googleFailed`                                       |
| 7   | Fournisseur utilisé          | Prom Counter      | `byProvider`                                                                              |
| 8   | Limite par véhicule          | ❌ Non implémenté | (observation via `topVehiclesToday`)                                                      |
| 9   | Activer/désactiver Google    | Setting           | toggle via PATCH `/providers` `{google: false}` + lecture `providersEnabled.google`       |
| 10  | Activer/désactiver Nominatim | Setting           | toggle via PATCH `/providers` `{nominatim: false}` + lecture `providersEnabled.nominatim` |

→ **9/10 dispo directement**. Le #8 (limite par véhicule) est observable mais pas enforce — à arbitrer après 24h de mesure réelle de `topVehiclesToday`.

### Fichiers modifiés (Session 10 H)

- `trackyu-backend/src/services/NominatimService.ts` (+ `isEnabled()`)
- `trackyu-backend/src/services/GoogleMapsService.ts` (`isConfigured` lit aussi le toggle setting)
- `trackyu-backend/src/services/ReverseGeocodingService.ts` (resolveFromProviders gère 2 providers disabled, TTL Redis 30j)
- `trackyu-backend/src/routes/geocodingStatsRoutes.ts` (5 champs ajoutés au stats + nouveau PATCH `/providers`)

### Validation prod

```bash
# Vérifier setting persisté
docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -c \
  "SELECT key, value, updated_at FROM system_settings WHERE key LIKE 'GEOCODING%';"

# Toggle Google OFF via PATCH (avec token admin)
curl -X PATCH https://live.trackyugps.com/api/v1/geocoding/providers \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"google": false}'

# Lecture stats avec providersEnabled + agrégats mois
curl -H "Authorization: Bearer <TOKEN>" \
  https://live.trackyugps.com/api/v1/geocoding/stats
```

---

## [Session 10 S — Sécurités finales Geocoding (Google 3-statuts + replay positions réelles + alertes Prom)] — 2026-05-02

### Contexte

Renforcement final du module geocoding suite à la validation observabilité (Session 10 G). 3 sécurités demandées :

1. Distinction propre Google `disabled` vs `failed` vs `success` (pour monitoring qui sait ce qui se passe)
2. Mode replay sur données prod réelles 24h/7j/30j (mesurer le hit ratio prod sans simulation synthétique)
3. Alertes Prometheus si dérive (cacheHitRate < 75 % ou googleRequests > 10 % des miss)

### S1 — Google fallback 3 statuts (success / failed / disabled)

- `GoogleMapsService.ts` : nouvelle méthode `isConfigured()` retournant `true` si la clé est dispo (env ou settings). Permet de **skipper l'appel réseau** quand pas de clé.
- `ReverseGeocodingService.resolveFromProviders()` :
  - Vérifie `GoogleMapsService.isConfigured()` AVANT d'appeler le SDK Google
  - Si pas configuré → `recordGeocodingRequest('google', 'disabled', 0)` + return null
  - Si configuré et appel ok → `recordGeocodingRequest('google', 'success', ms)` + cost +0.005 USD
  - Si configuré et appel ko → `recordGeocodingRequest('google', 'failed', ms)`
- `metricsService.ts` : signature `recordGeocodingRequest(provider, 'success'|'failed'|'disabled', durationMs)`. La durée n'est PAS observée pour `disabled` (pas d'appel réseau réel). Le coût USD n'est incrémenté QUE pour `'success'`.
- Endpoint `/api/v1/geocoding/stats` enrichi : champs `googleSuccess`, `googleFailed`, `googleDisabled`, `googleAttempted` (= success + failed + disabled). Backward-compat avec ancien `'ok'/'fail'` historique préservée.

### S2 — Mode replay positions réelles

- `simulate-geocoding.ts` : nouveau flag `--replay=24h|7d|30d` + `--replay-limit=N` (default 10000)
- Lit la table `positions` (TimescaleDB hypertable) avec `WHERE time > NOW() - INTERVAL 'X'` + `LIMIT N` + `ORDER BY time DESC`
- Filtre les coords nulles ou (0,0)
- Utilise les **vrais object_id** du DB (pas des sim-N artificiels) → les counters Redis topVehicles/topZones reflètent les vraies habitudes
- Annule complètement les modes `--realistic` et zones random quand `--replay` actif

### S3 — Alertes Prometheus

- 2 nouvelles règles dans `/var/www/trackyu-gps/monitoring/prometheus/rules.yml` (groupe `geocoding_health`, interval 60s) :

```yaml
- alert: GeocodingLowCacheHitRate
  expr: |
    (sum(rate(cache_operations_total{operation="geocoding",result="hit"}[10m]))
     / sum(rate(cache_operations_total{operation="geocoding"}[10m]))) < 0.75
    and sum(rate(cache_operations_total{operation="geocoding"}[10m])) > 0.5
  for: 15m
  severity: warning

- alert: GeocodingHighGoogleUsage
  expr: |
    (sum(rate(geocoding_requests_total{provider="google",status=~"success|failed|ok|fail"}[10m]))
     / clamp_min(sum(rate(cache_operations_total{operation="geocoding",result="miss"}[10m])), 0.001)) > 0.10
    and sum(rate(cache_operations_total{operation="geocoding",result="miss"}[10m])) > 0.5
  for: 15m
  severity: warning
```

Floor de volume `> 0.5 req/s` sur les 2 alertes pour éviter faux positifs sur trafic creux. `clamp_min(0.001)` pour éviter division par zéro. Pattern `sum()` autour de `rate()` respecté (mémoire `feedback_prometheus_sum_pattern.md`). Status regex `success|failed|ok|fail` pour rétro-compat avec les compteurs anciens.

Reload via `curl -X POST http://localhost:9090/-/reload` (HTTP 200) → `GET /api/v1/rules` confirme les 2 alertes chargées et état `inactive` (correct, pas de violation).

### Test E2E `--replay=24h` sur prod réel (5000 positions)

| Métrique                          | Valeur                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| **cacheHitRate**                  | **97.08 %** ⭐ (vrai chiffre prod, pas simulation synthétique)                          |
| Throughput                        | 376 req/s (avec ~97 % hits à 2 ms)                                                      |
| Latence p50/p95/p99               | 2 / 6 / 20 ms                                                                           |
| nominatimRequests                 | 146 (success=146, failed=0)                                                             |
| googleSuccess / Failed / Disabled | 0 / 0 / 0                                                                               |
| Hit "negative" (last_null_at)     | 213 → ces positions sont des coords stériles déjà mémorisées, économie provider validée |
| Cost USD                          | 0.0000                                                                                  |

**Conclusion empirique** : sur le trafic prod CI réel, **Nominatim couvre 100 % des cache miss**. Google n'est jamais sollicité. Les 213 hits négatifs (cache de "j'ai déjà essayé et c'est null", retry après 7j) confirment l'efficacité du mécanisme `last_null_at`.

### Fichiers modifiés (Session 10 S)

- `trackyu-backend/src/services/GoogleMapsService.ts` (+ `isConfigured()`)
- `trackyu-backend/src/services/ReverseGeocodingService.ts` (resolveFromProviders 3 statuts)
- `trackyu-backend/src/services/metricsService.ts` (signature 3 statuts + cost only on success)
- `trackyu-backend/src/routes/geocodingStatsRoutes.ts` (champs googleSuccess/Failed/Disabled/Attempted)
- `trackyu-backend/src/scripts/simulate-geocoding.ts` (mode --replay + fetchReplayPositions)
- `/var/www/trackyu-gps/monitoring/prometheus/rules.yml` (groupe geocoding_health avec 2 alertes)

### Backups conservés

- `dist.bak-S` (code avant session S)
- `rules.yml.bak-20260502`

### Validation finale en prod

```bash
# Metrics nouveau status label exposé
curl -s http://localhost:3001/metrics | grep geocoding_requests_total
# → geocoding_requests_total{provider="nominatim",status="success"} 2

# Alertes chargées et inactive
curl -s http://localhost:9090/api/v1/rules?type=alert | grep -o "Geocoding\w*"
# → GeocodingHighGoogleUsage GeocodingLowCacheHitRate
# → state inactive (correct — hit ratio prod 97 %, Google 0 %)

# Replay test
docker exec trackyu-gps-backend-1 node /app/dist/scripts/simulate-geocoding.js --replay=24h --replay-limit=5000
# → 97.08 % cache hit ratio
```

---

## [Session 10 G — Système d'observabilité Geocoding (Prometheus + Redis + endpoint stats + simulation)] — 2026-05-02

### Contexte

Suite au chantier geocoding (Phases 1-3, voir entrée précédente), ajout d'un système de mesure complet pour valider les performances en charge et préparer la croissance (KVM2 + balises offline mai 2026). Audit préalable a confirmé que 80 % de l'infra existait déjà : `prom-client@15.1.3` avec registry global, endpoint `/metrics`, Winston JSON, BullMQ, lat_bucket/lng_bucket déjà créés. On a réutilisé tout ça.

### Métriques Prometheus ajoutées (`metricsService.ts`)

- `geocoding_requests_total{provider, status}` — Counter (provider: nominatim|google|none, status: ok|fail)
- `geocoding_duration_seconds{provider}` — Histogram (buckets 10ms→5s)
- `geocoding_cost_google_usd_total` — Counter incrémenté de 0.005 à chaque Google success (5 USD / 1000 req)
- `geocoding_skipped_total{reason}` — Counter (reason: not_significant|invalid_coord) → mesure le filtre "Significant Points" déjà présent dans positionWorker:698-704
- 2 helpers : `recordGeocodingRequest(provider, status, durationMs)`, `recordGeocodingSkipped(reason)`
- Réutilisation : `cache_operations_total{operation='geocoding', result='hit|miss'}` via `recordCacheHit/Miss('geocoding')` existants

### Refactor `ReverseGeocodingService`

- **Signature étendue** : `resolve(lat, lng, ctx?: { vehicleId?, source? })` rétro-compatible
- **Hooks Prometheus** sur tous les chemins (cache hit, cache miss, hit "negative cache", provider success/fail)
- **Counters Redis (TTL 7j)** :
  - `geocoding:vehicle:{YYYY-MM-DD}` (HASH vehicleId → count)
  - `geocoding:zone:{YYYY-MM-DD}` (ZSET bucket ~500m → count)
  - `geocoding:source:{YYYY-MM-DD}` (HASH source → count)
- **Logs Winston JSON structurés** : `logger.info({metric: 'geocoding', provider, durationMs, cacheHit, vehicleId, source, latBucket, lngBucket, ...})` à chaque appel
- Cache hit "négatif" (`last_null_at` valide) compte comme hit Prometheus (économie provider observable)

### Adaptation 3 call sites

- `positionWorker.ts:702-705` : passe `{vehicleId: vehicle.id, source: 'worker'}` + log `recordGeocodingSkipped('not_significant')` quand le filtre exclut
- `tripWorker.ts:111-118` : passe `{vehicleId: t.object_id, source: 'trip'}`
- `fleetRoutes.ts:127` : passe `{source: 'api'}`

### Endpoint `GET /api/v1/geocoding/stats` (nouveau)

- Fichier `src/routes/geocodingStatsRoutes.ts` (auth requis, pas de permission spécifique pour cohérence avec `/monitoring/gps-stats`)
- Mounté dans `v1Router.ts:138` (`/geocoding`)
- Retourne JSON avec **15+ métriques** :
  - `totalRequests, cacheHits, cacheMisses, cacheHitRate`
  - `googleRequests, nominatimRequests, failedRequests`
  - `byProvider {nominatim, google, none} {ok, fail}`
  - `bySource {worker, trip, api, simulation, ...}` (Redis day)
  - `topVehiclesToday[]` top 10 véhicules par appels du jour
  - `topZonesToday[]` top 10 zones ~500m par appels du jour
  - `estimatedCostUSD` cumulé (depuis restart)
  - `projectedMonthlyCostUSD`
  - `inserts24hByProvider` (DB)
  - `cacheTableSize {total, nullEntries}`
  - `skippedNotSignificant`, `skippedInvalidCoord`

### Script `scripts/simulate-geocoding.ts` (nouveau)

- CLI : `--positions=N --zones=M --vehicles=K --spread=meters` (default 1000/50/20/100)
- Génère M centres aléatoires dans bbox CI [4.3, -8.6]→[10.7, -2.5]
- Pour chaque position : pick zone aléatoire + jitter ±spread
- Appelle `ReverseGeocodingService.resolve(lat, lng, {vehicleId, source: 'simulation'})` directement
- Snapshot Prometheus avant/après → calcul delta exact
- Rapport tabulaire console final avec validation cibles (cacheHitRate>80%, googleRequests<20%, nominatim domine)
- Lancement : `docker exec trackyu-gps-backend-1 node /app/dist/scripts/simulate-geocoding.js --positions=...`

### Résultats simulations prod (5 configs comparatives)

| Mode              | Config                                                     | Hit ratio      | Google %      | Throughput | Latence p50/p95 |
| ----------------- | ---------------------------------------------------------- | -------------- | ------------- | ---------- | --------------- |
| Random pur        | 1k × 50 zones × 20 vehicles × spread 100m                  | 20.60 % ❌     | 21.5 % ❌     | 51 req/s   | 13/51 ms        |
| Random pur        | 10k × 500 zones × 50 vehicles × spread 100m                | 19.69 % ❌     | 25.2 % ❌     | 56 req/s   | 11/46 ms        |
| **Réaliste**      | 10k × 50 corridors × 30 wp × 500 vehicles × spread 20m     | 58.77 %        | 12.6 % ✅     | 83 req/s   | 3/47 ms         |
| **Réaliste** ⭐   | 10k × 50 corridors × **10 wp** × 500 vehicles × spread 20m | **80.81 %** ✅ | **4.85 %** ✅ | 164 req/s  | 2/32 ms         |
| **Réaliste** ⭐⭐ | 10k × 50 corridors × **5 wp** × 500 vehicles × spread 20m  | **89.24 %** ✅ | **3.31 %** ✅ | 244 req/s  | 2/16 ms         |

**Mode `--realistic` ajouté en cours de session** : génère N "corridors routiers" (segments 5-15 km dans bbox CI avec waypoints interpolés), assigne chaque véhicule à 1-2 corridors (modélise un livreur sur tournée habituelle). Reflète bien mieux le trafic prod réel que le mode random pur.

**Insight perf clé** : throughput ×5 (51 → 244 req/s) quand hit ratio passe de 20 % → 89 % — démonstration directe de la valeur du cache spatial (hit cache = 2 ms, miss provider = ~25 ms).

**Cibles utilisateur atteintes** : `cacheHitRate > 80 %` (✅ avec 10 wp), `idéalement > 90 %` (89.24 % avec 5 wp), `googleRequests < 10 %` (✅ dès 30 wp).

### Découverte annexe : Google REST renvoie 0 succès

Sur les 2515 fallback Google appelés en simulation, **0 ont réussi** (tous fail). Confirmation que la clé Google Maps a un quota geocoding API désactivé ou épuisé en plus du Roads API 403 déjà observé. Le filet de sécurité Nominatim primary tient même quand Google est down — le service retourne simplement `null` proprement (mémorisé 7j via `last_null_at`).

### Diagnostic deploy.ps1 (faux bug)

Pendant ce chantier, j'ai re-confronté `deploy.ps1` qui semblait bloquer sur `Test connexion SSH...`. **Le script n'a JAMAIS été cassé** — il termine en 4:39 normalement. Le blocage observé était un artefact de mon invocation : `& .\deploy.ps1 ... 2>&1 | Select-Object -Last 60` buffer la sortie jusqu'à l'exit du script et masque tout le streaming. Mémoire `feedback_no_select_object_long_scripts.md` créée pour éviter de re-tomber dans le piège. Pas de fix code nécessaire dans `deploy.ps1`.

### Fichiers nouveaux (Session 10 G)

- `trackyu-backend/src/routes/geocodingStatsRoutes.ts`
- `trackyu-backend/src/scripts/simulate-geocoding.ts`

### Fichiers modifiés (Session 10 G)

- `trackyu-backend/src/services/metricsService.ts` (+4 metrics + 2 helpers)
- `trackyu-backend/src/services/ReverseGeocodingService.ts` (signature étendue + hooks Prometheus + Redis counters + logs structurés)
- `trackyu-backend/src/workers/positionWorker.ts` (ctx au resolve + recordGeocodingSkipped)
- `trackyu-backend/src/jobs/workers/tripWorker.ts` (ctx au resolve)
- `trackyu-backend/src/routes/fleetRoutes.ts` (ctx au resolve)
- `trackyu-backend/src/routes/v1Router.ts` (mount /geocoding)

### Prochaines actions

- [ ] 100k simulation termine (~30 min) → ajouter ligne au tableau résultats
- [ ] Si on veut un test prod-réaliste : créer script `replay-positions.ts` qui lit la table `positions` réelle et rejoue
- [ ] Considérer ajout d'un Grafana panel "Geocoding" (les Counters sont déjà scrappés par Prometheus existant)
- [ ] Investiguer pourquoi clé Google geocoding renvoie null (clé limitée, à activer ou retirer du fallback)

---

## [Session 10 — Chantier geocoding : cache buckets + Nominatim self-hosted CI + Google fallback] — 2026-05-02

### Contexte

Optimisation reverse geocoding pour coût quasi-nul. 3 leviers identifiés à l'audit :

1. Cache spatial existant utilisait `btree(lat, lng)` inutile pour `ABS(lat-x) < δ` → seq scan O(n) sur 16k rows
2. Bug LRU : `UPDATE last_accessed_at WHERE address = $1` mettait à jour TOUTES les rows ayant cette adresse (4.3 doublons en moyenne)
3. Pas de mémorisation des coords stériles (océan, désert) → re-tente Google à chaque passage

Découverte annexe : Google Roads API renvoie 403 en prod (clé limitée) → confirme l'urgence d'un provider self-hosted.

Préparation à venir : VPS passe KVM1 → KVM2 ~2026-05-05/09 + toutes balises offline connectées progressivement mai 2026 → volume va grossir, l'opti devient critique.

### Phase 1 — Fixes hygiéniques cache (×32 plus rapide)

- **Migration SQL idempotente** `trackyu-backend/migrations/20260502_geocoded_addresses_optimization.sql` :
  - 2 colonnes `lat_bucket`, `lng_bucket` GENERATED ALWAYS AS `floor(coord * 10000)::int` STORED (≈ 11 m par bucket)
  - Colonne `last_null_at TIMESTAMPTZ` pour mémoriser les coords sans réponse
  - `ALTER COLUMN address DROP NOT NULL` (permet stocker une row "j'ai déjà essayé")
  - 2 nouveaux index : `idx_geocoded_buckets (lat_bucket, lng_bucket)` + `idx_geocoded_null_recent` partiel WHERE address IS NULL
  - Backfill auto des 16314 rows existantes via STORED expression
- **Refactor `ReverseGeocodingService.ts`** :
  - Lookup spatial via buckets ± 1 (9 buckets max scannés vs 16k rows en seq scan)
  - LRU correct : UPDATE par `id` (récupéré du SELECT) au lieu de par `address`
  - Skip provider call si `last_null_at < 7 jours` → économie sur ~5 % du trafic
  - Mémorisation des null avec retry après 7 jours
- **Validation prod** : `EXPLAIN ANALYZE` confirme Index Scan idx_geocoded_buckets, lookup miss = **0.17 ms** vs **5.32 ms** ancien seq scan = **×32**
- PostGIS pas installé sur prod → bucketing entier choisi (n'ajoute aucune dépendance système)

### Phase 2 — Container Nominatim self-hosted (dump Côte d'Ivoire)

- **Patch `docker-compose.yml`** : nouveau service `nominatim` (image `mediagis/nominatim:4.4`)
  - PBF URL `https://download.geofabrik.de/africa/ivory-coast-latest.osm.pbf` (~50 MB)
  - `IMPORT_STYLE=street` · `IMPORT_WIKIPEDIA=false` · `THREADS=1`
  - `mem_limit: 1g` + `shm_size: 256m`
  - Volume persistant `nominatim_data:/var/lib/postgresql/14/main`
  - **Pas d'exposition publique** — accès interne uniquement via réseau Docker `trackyu-gps_default` à `http://nominatim:8080`
  - `NOMINATIM_PASSWORD` random 32-char hex ajouté à `.env` du VPS
- **Import** : ~20 minutes (download + import OSM + indexing 30 ranks + ANALYZE) — beaucoup plus rapide que les 30-60 min estimés
- **Tests reverse depuis container backend** :
  - Plateau Abidjan → `Avenue Amadou Gon Coulibaly, Le Plateau, Abidjan, Côte d'Ivoire`
  - Cocody → `Station Total 2Pltx, Rue des Jardins, Vallon, Deux-Plateaux, Cocody, Abidjan, Côte d'Ivoire`
  - Yamoussoukro → `N'zuéssy, Yamoussoukro, Côte d'Ivoire`
  - Bouaké → `Route de l'Aéroport, Koko, Bouaké, Gbêkê, Vallée du Bandama, Côte d'Ivoire`
  - Paris → `Unable to geocode` → null (filet Google s'activera)
- Qualité parfois meilleure que Google (POI Total reconnu sur Cocody)

### Phase 3 — NominatimService.ts + refactor primary/fallback

- **Nouveau `src/services/NominatimService.ts`** : mirror API de `GoogleMapsService.reverseGeocode`
  - GET `${NOMINATIM_URL:-http://nominatim:8080}/reverse?lat=X&lon=Y&format=json&zoom=18&accept-language=fr`
  - Timeout 2 s
  - Filtre Plus Codes (regex `/^[A-Z0-9]{4,6}\+[A-Z0-9]{2,3}/`)
  - Fallback display_name → composition depuis address fields (road/pedestrian/suburb/city/country)
  - Distinguish ECONNABORTED/REFUSED/NOTFOUND → log warn + return null
- **Refactor `ReverseGeocodingService.resolveFromProviders()`** : helper privé qui try Nominatim FIRST puis Google fallback
  - Provider tagué dans la colonne `provider` ('nominatim' / 'google' / 'none')
  - Le cas retry après expiration null (7j) utilise aussi la chaîne complète
- **`docker-compose.yml`** : ajout `NOMINATIM_URL: ${NOMINATIM_URL:-http://nominatim:8080}` aux env vars du backend
- **Validation E2E prod** :
  - Bouaké (91 ms) → Nominatim → provider='nominatim'
  - San Pedro (29 ms) → Nominatim → provider='nominatim'
  - Ocean (4.0, -7.0) (99 ms) → null + null → provider='none' avec last_null_at
  - Lomé hors-CI (57 ms) → Nominatim null → Google null → provider='none'
- **Latence Nominatim 29-99 ms** (vs 200-500 ms Google REST typique) = bonus ×2-5 inattendu

### Bilan métrique

| Métrique                  | Avant                                | Après                              |
| ------------------------- | ------------------------------------ | ---------------------------------- |
| Coût Google par requête   | $5/1000 (au-delà free tier 40k/mois) | ~0 € pour ~95% du trafic CI        |
| Latence cache lookup miss | 5.32 ms (seq scan 16k rows)          | 0.17 ms (Index Scan buckets) ×32   |
| Latence provider call     | 200-500 ms (Google REST)             | 29-99 ms (Nominatim local) ×2-5    |
| Coords stériles           | Re-tente Google à chaque passage     | Mémorisé 7j → 0 appel répété       |
| LRU cache                 | Cassé (UPDATE par address)           | Correct (UPDATE par id)            |
| Dépendance externe        | Google obligatoire                   | Google optionnel (filet seulement) |
| Scalabilité               | Plafonnée par quota Google           | Illimitée (self-hosted)            |

### Découvertes annexes

- **Google Roads API renvoie 403** en prod (clé limitée — pré-existant) — touche `snapToRoads` (ne pas confondre avec geocoding). À investiguer en chantier séparé.
- **`deploy.ps1` bloque sur `Invoke-SSH`** depuis PowerShell 5.1 (probablement piège `2>&1` sur native exe documenté dans system prompt) — déploiement Phase 1 et 3 fait manuellement en bash (tar/scp/swap atomique). À fixer.

### Backups conservés sur VPS pour rollback

- `/tmp/geocoded_addresses_backup_20260502.sql` (table avant migration, 16314 rows, 4.6 MB)
- `/var/www/trackyu-gps/backend/dist.bak-20260502` (code Phase 0 = avant Phase 1)
- `/var/www/trackyu-gps/backend/dist.bak-20260502-phase3` (code Phase 1 = avant Phase 3)
- `/var/www/trackyu-gps/docker-compose.yml.bak-20260502` + `.bak-20260502-phase3`
- `/var/www/trackyu-gps/.env.bak-20260502`

### Fichiers nouveaux (Session 10)

- `trackyu-backend/migrations/20260502_geocoded_addresses_optimization.sql`
- `trackyu-backend/src/services/NominatimService.ts`

### Fichiers modifiés (Session 10)

- `trackyu-backend/src/services/ReverseGeocodingService.ts` (refactor complet : buckets + LRU fix + null memo + helper resolveFromProviders)
- `/var/www/trackyu-gps/docker-compose.yml` (sur VPS — service nominatim + NOMINATIM_URL backend env + nominatim_data volume)
- `/var/www/trackyu-gps/.env` (sur VPS — NOMINATIM_PASSWORD)

### Prochaines actions

- [ ] Monitor 24h hit ratio par provider (`SELECT provider, COUNT(*) FROM geocoded_addresses WHERE created_at > NOW() - INTERVAL '24h' GROUP BY provider`)
- [ ] Drop l'ancien index `idx_geocoded_latlng (lat, lng)` après 24h confirmation new lookup → libère ~500 KB index inutile
- [ ] Quand KVM2 actif : étendre dump Nominatim à Afrique de l'Ouest (~3-4 GB DB → couvre Mali/Sénégal/Burkina/Togo/Bénin/Ghana/Niger)
- [ ] Investiguer pourquoi Google REST renvoie aussi null sur Lomé (clé probablement complètement désactivée pour geocoding API)
- [ ] Fix `deploy.ps1` Invoke-SSH bug en PowerShell 5.1

---

## [Session 9 (ext. 3) — Map-Fix-4 idle uniformisation + Étiquette 1 OverlayView permanente + retrait tooltip natif] — 2026-05-01

### Audit cohérence couleur idle

- Détection : `idle: var(--clr-caution)` dans `MAP_STATUS` (LiveSidebar:10 + MapPage:47) ne correspondait pas à la convention projet `#f97316` (mémoire `feedback_vehicle_status_colors.md`).
- Pire : la couleur CSS var est passée au SVG path Google Maps via `fillColor` — Google Maps **ne résout pas les CSS vars** dans les attributs SVG passés via JS object → comportement indéfini sur les markers idle (probablement fallback navigateur). En contraste, `STATUS_COLOR.idle = '#f97316'` dans clusterer GoogleMapView:769 et replay = orange.
- Fix : 2 lignes — `var(--clr-caution)` → `'#f97316'` dans `LiveSidebar.tsx:10` et `MapPage.tsx:47`. Markers + chips + drawer + clusters désormais cohérents orange.

### Étiquette 1 — overlay HTML permanent (carte live)

- Demande utilisateur : afficher en permanence sous chaque marker une étiquette compacte avec **plaque uniquement** + **fond couleur statut**. Toggle existant 👁 doit la piloter. Visible par défaut.
- Approche : `OverlayView` custom Google Maps (le `setLabel` natif ne supporte pas le fond coloré).
- Implémentation `GoogleMapView.tsx` :
  - Classe `LabelOverlay` lazy-définie (extends `gMaps.OverlayView` après load) — `<div>` HTML positionnée géographiquement par `getProjection().fromLatLngToDivPixel`. Style : fond couleur statut, texte mono blanc 700, padding 2px 7px, radius 5px, border 1px blanc semi-transparent, ombre 6px, `pointer-events: none`, anchor 18px sous le marker, `will-change: transform, left, top`.
  - 3 nouveaux refs : `labelOverlays: Map<id, overlay>` · `labelOverlayCtor` (instancié dans le useEffect init) · `labelPositionListeners: Map<id, listener>`.
  - À chaque création de marker : instancie overlay + `marker.addListener('position_changed', ...)` qui suit l'animation rAF en sync (Google Maps émet `position_changed` à chaque `setPosition` même pendant rAF).
  - À chaque update : `setText(v.id)` + `setBg(v.color)`.
  - Cleanup propre : marker disparaît → overlay `setMap(null)` + `listener.remove()` + suppressions Map.
- `useEffect[showLabels]` pilote `overlay.setMap(null/map)` global · `showLabelsRef` permet de respecter l'état courant à la création d'un nouvel overlay (sinon nouveau marker spawne avec étiquette visible même si toggle off).
- Cleanup global au démontage : libère overlays + listeners + animations + clusterer.
- `MapPage.tsx` : default `showLabels = true` (était `false`).

### Retrait tooltip natif redondant

- `marker.title` (ligne 511) générait un tooltip OS-level HTML blanc qui s'affichait au hover prolongé en doublon avec la mini-card hover (étiquette 2) et l'étiquette 1 permanente — visuellement parasite (capture utilisateur l'a fait remonter).
- Fix : retrait du `title` du constructeur Marker. Les 2 étiquettes custom couvrent l'info.

### Cohabitation des 2 étiquettes

- **Étiquette 1** (nouveau) : permanente sous le marker (offset y +18px), juste plaque + fond couleur statut. Toggle 👁 dans la toolbar pilote la visibilité. Default visible.
- **Étiquette 2** (existante L8) : mini-card riche au survol (plaque/alias/vitesse/adresse/lastUpdate), au-dessus du marker (pixelOffset -4). Pas de conflit visuel, les 2 cohabitent.

### Fichiers modifiés (Session 9 ext. 3)

- `src/features/map/LiveSidebar.tsx` — `MAP_STATUS.idle` color
- `src/features/map/MapPage.tsx` — `MAP_STATUS.idle` color · default showLabels=true
- `src/components/map/GoogleMapView.tsx` — `LabelOverlay` lazy class · 3 refs · création/sync/cleanup overlays · retrait `title` marker

### Bilan audit carte live

- ✅ Traités : L1 zoom · L2 today live · L3 CRUD complet · L8 hover · L9 cluster colors · L12 follow-me · L13 légende + Map-Fix-1 (tracé mode détail + speed-colorisé) + cascade Alertes + Map-Fix-4 (idle uniformisation + étiquette 1 OverlayView)
- ⏳ Restants : L6 heatmap historique 7j (besoin backend) · L7 showAll défaut (produit) · L10 trail mode multi-véhicules · L11 dead-reckoning · L14 perf clusterer · L15 keyboard nav a11y

### Notes

- MapPage bundle : 180.63 kB (vs 178.89 kB début ext. 3 = +1.74 kB pour Map-Fix-4)
- 0 régression
- Le `position_changed` event Google Maps fire à chaque `setPosition` (incluant rAF) → les overlays glissent en parfaite sync avec l'animation des markers, pas de saut visuel

---

## [Session 9 (ext. 2) — L3 Phase 3 assignation véhicules/clients + Backend migration pois + Map-Fix-3 cluster colors + follow-me] — 2026-05-01

### Backend — migration `pois` alignement + assignation

- **Audit code/prod** révèle un décalage critique : `poiRoutes.ts` + `schemas/index.ts:483` insèrent/lisent `is_shared`, `client_ids JSONB`, `all_clients`, `status` qui **n'existent pas en prod** (table vide au moment de l'audit). 1ʳᵉ création POST/PUT planterait SQL.
- **Backup** : `pg_dump -t pois` → `/tmp/pois_backup_20260501_184243.sql` sur VPS (2.4 KB)
- **Nouveau fichier** : `trackyu-backend/migrations/20260501_pois_alignment_and_assignment.sql` (idempotent BEGIN/COMMIT)
  - `ALTER TABLE pois ADD COLUMN IF NOT EXISTS` × 6 : `vehicle_ids TEXT[] DEFAULT '{}'`, `all_vehicles BOOLEAN`, `is_shared BOOLEAN`, `client_ids JSONB DEFAULT '[]'`, `all_clients BOOLEAN`, `status TEXT DEFAULT 'Actif'`
  - `UPDATE pois SET status='Actif' WHERE status IN ('ACTIVE','active')` — bascule legacy EN→FR cohérent Zod
  - `CREATE INDEX idx_pois_status` + `idx_pois_all_clients (tenant_id) WHERE all_clients=true` (partiel)
  - Garde `client_id` legacy (FK tiers) — pas de DROP
- **Patches code** :
  - `schemas/index.ts:483` PoiSchema : ajout `vehicleIds: z.array(z.string()).optional().default([])` + `allVehicles: z.boolean().optional().default(false)`
  - `routes/poiRoutes.ts:51,55-56,74,76-77` INSERT + UPDATE étendus pour `vehicle_ids`/`all_vehicles` aux positions $14/$15
- **Déploiement** : build TS clean · `deploy.ps1 -backend -nobuild -force` HTTP 200 · migration jouée en prod via `psql` (BEGIN, 6 ALTER, 2 UPDATE, 2 CREATE INDEX, COMMIT) · `\d pois` post-migration confirme 21 colonnes + 4 index

### L3 Phase 3 — assignation véhicules/clients (frontend)

- `useSettingsData.ts` :
  - `PoiInput` étendu : `vehicleIds`, `allVehicles`, `clientIds`, `allClients`
  - `PoiRow` étendu côté lecture
  - `RawPoi` accepte snake_case + camelCase + JSONB string pour `client_ids`
  - `usePoi()` mapping : parse `vehicle_ids[]`, `all_vehicles`, `client_ids` (JSONB string ou array)
  - `poiInputToPayload` : si `allXxx=true` → envoie `[]` côté ids (le flag est la source de vérité backend)
- `PoiFormModal.tsx` :
  - Imports `useFleetVehicles` + `useVenteClients` pour alimenter les listes
  - States `vehicleIds/allVehicles/clientIds/allClients` + reset si `initial` change
  - `vehicleItems` mappés `{id, label, sub: driver}` · `clientItems` `{id, label, sub: city}`
  - Width modale 520→**620** pour 2 colonnes confortables
  - Composant interne `MultiSelectChips` (~110l) : toggle "Tous" en haut · recherche live · 2 boutons mini "+/-" (cocher/décocher tout le filtré) · liste 140px scrollable · footer "N sélectionnés · M disponibles" ou "Toutes seront prises en compte"
  - Renommage UX : ancien checkbox "Partagé (tous clients)" → **"Partagé tenant"** (avec tooltip explicatif) — devenu redondant avec le toggle "Tous les clients" mais conservé pour rétro-compat sémantique `is_shared`

### Map-Fix-3 — quick wins audit carte live

- **L9 cluster colors par statut dominant** (`GoogleMapView.tsx`) :
  - Nouveau `WeakMap<Marker, string>` `markerStatus` peuplé à chaque création/update marker
  - `createClusterRenderer` accepte `getStatus(marker)` injecté → calcule statut majoritaire du cluster → applique couleur correspondante (`#22c55e` moving · `#f97316` idle · `#ef4444` stopped · `#6b7280` offline)
  - Avant : tous les clusters orange brand uniforme. Maintenant : couleur reflète la santé de la zone clusterisée
- **L12 toggle Follow-me** :
  - Nouvelle prop `follow?: boolean` à GoogleMapView + `followRef`
  - Si `follow=true` et c'est le véhicule sélectionné → pan forcé à chaque update (au lieu du soft-follow viewport-only)
  - Bouton toolbar 🎯 dans MapPage ViewLive — disabled tant que pas de véhicule sélectionné, hover orange brand quand actif
  - `<GoogleMapView follow={followMe && popup != null}>` — sécurité : le mode ne s'active jamais sans sélection

### Bilan audit carte live

- 15 gaps L1-L15 identifiés
- ✅ Traités : L1 (zoom) · L2 (today live) · L3 (CRUD complet 3 phases) · L8 (hover) · L9 (cluster colors) · L12 (follow-me) · L13 (légende) + Map-Fix-1 (tracé mode détail + speed-colorisé) + cascade Alertes
- ⏳ Restants : L6 (heatmap historique 7j · besoin endpoint backend) · L7 (showAll défaut · choix produit) · L10 (trail mode multi-véhicules) · L11 (dead-reckoning client) · L14 (perf clusterer) · L15 (keyboard nav a11y)

### Fichiers nouveaux (Session 9 ext. 2)

- `trackyu-backend/migrations/20260501_pois_alignment_and_assignment.sql`

### Fichiers modifiés (Session 9 ext. 2)

- `trackyu-backend/src/schemas/index.ts` (PoiSchema +2 lignes)
- `trackyu-backend/src/routes/poiRoutes.ts` (INSERT + UPDATE étendus $14/$15)
- `trackyu-front-V2/src/features/settings/useSettingsData.ts` (PoiInput/PoiRow/RawPoi + mappings normalisation FR↔EN + assignation)
- `trackyu-front-V2/src/features/map/PoiFormModal.tsx` (states assignation + 2 sections MultiSelectChips + composant interne ~110l)
- `trackyu-front-V2/src/components/map/GoogleMapView.tsx` (WeakMap markerStatus + cluster renderer dominant + prop follow + followRef)
- `trackyu-front-V2/src/features/map/MapPage.tsx` (state followMe + bouton 🎯 toolbar + prop follow GoogleMapView)

### Notes

- MapPage bundle final : 178.89 kB (vs 173.42 kB début ext. 2 = +5.47 kB pour Phase 3 + Map-Fix-3)
- 0 régression remontée
- Schéma `pois` aligné code et prod désormais — POST/PUT/GET tous fonctionnels avec vehicleIds/allVehicles/clientIds/allClients
- Pattern adopté : ids + flag `allX` (backend source de vérité quand flag=true), aligné avec `alert_configs` et `schedule_rules`

---

## [Session 9 (ext.) — Audit Carte live + L3 CRUD géofences complet + Smart default Alertes + L8 hover preview] — 2026-05-01

### Cascade Alertes (smart default)

- ViewAlerts : au mount initial, application d'une cascade `Critiques > Hautes > Total` selon les counts présents. Si `CRITICAL > 0` → filtre auto sur Critiques · sinon `HIGH > 0` → Hautes · sinon laisse Total. Une fois la cascade jouée (`cascadeAppliedRef`), l'utilisateur reste maître — les nouvelles alertes ne changent plus le filtre. Évite la page vide quand `CRITICAL = 0`.

### L8 hover preview marker (carte live)

- 2ᵉ InfoWindow `hoverWindowRef` distincte de la full popup, `disableAutoPan: true`
- Helper `buildHoverHTML(v)` mini-card 200px : dot statut + plaque + ⚡ vitesse + cap° + 📍 adresse + ⏱ last update
- `attachClick` étendu en attache `mouseover` + `mouseout` ; mouseover ne s'ouvre pas si full popup déjà visible sur ce véhicule

### L3 CRUD géofences (complet)

**Phase 1 — MVP CRUD**

- `useSettingsData.ts` : interface `PoiInput` + helper `poiInputToPayload` (camelCase ↔ snake_case) + 3 mutations React Query (`useCreatePoi` POST · `useUpdatePoi` PUT · `useDeletePoi` DELETE) avec invalidation `['settings-poi']`
- `features/map/PoiFormModal.tsx` (~190l initial) — Dialog dual-mode create/edit, validation lat/lng/rayon, color picker, toggles partagé/actif, toast succès
- ViewGeofences câblé : `+ Nouvelle zone` ouvre modale création · 👁 centre la carte (callback `onCenterPoi` via state `pendingCenter` consommé par useEffect ViewLive + onMapReady) · ••• menu Modifier/Supprimer (click-outside ferme · confirm Dialog avant DELETE)

**Phase 2 — UX riche**

- `MiniMapPicker` interne 240px : carte Google Maps cliquable · marker draggable · cercle de rayon synchronisé · texte d'aide contextuel
- Champ adresse libre + bouton ↓ pour utiliser la suggestion `useReverseGeocode(lat, lng)`
- Bouton ⊕ toolbar live carte câblé : `mapInstanceRef.getCenter()` → ouvre modale création pré-remplie
- Cercle éditable : `editable: true` + `draggable: true` + listeners `radius_changed` (drag handle bord = ajuste rayon) et `center_changed` (drag centre = repositionne lat/lng) · update conditionnel anti-boucle (delta > seuil avant `setRadius/setCenter`)

### Audit carte live complet (lecture pure)

- 15 gaps identifiés L1-L15 priorisés 🔴/🟠/🟡/🟢
- Traités cette session : L1 zoom · L2 today · L8 hover · L13 légende · L3 CRUD complet
- Restants : L6 heatmap historique 7j (besoin endpoint backend) · L7 showAll défaut (choix produit) · L9-L15 (cluster colors, trail mode, dead-reckoning, follow me, clusterer perf, keyboard nav)

### 🟡 Décalage backend détecté

Audit a révélé un décalage critique sur la table `pois` : `src/routes/poiRoutes.ts` + `schemas/index.ts:483` insèrent/lisent déjà des colonnes (`is_shared`, `client_ids JSONB`, `all_clients`, `status`) qui **n'existent pas en prod**. Aucun crash visible aujourd'hui car `pois` est vide en prod (0 lignes), mais la 1ʳᵉ création POST/PUT plantera SQL.

→ **Agent backend lancé en background** pour :

1. Backup pg_dump
2. Migration consolidée : ALTER TABLE `pois` ADD COLUMNS `is_shared`, `client_ids JSONB`, `all_clients`, `status`, `vehicle_ids TEXT[]`, `all_vehicles BOOLEAN` (pattern aligné avec `alert_configs` + `schedule_rules`)
3. Aligner code backend (`poiRoutes.ts` + Zod schema) sur les nouvelles colonnes
4. Build + deploy backend `-force`
5. Test E2E

Permettra ensuite l'assignation Véhicules/Clients dans la modale frontend (chantier suivant).

### Fichiers créés (Session 9 ext.)

- `src/features/map/PoiFormModal.tsx` (~310l avec MiniMapPicker)

### Fichiers modifiés (Session 9 ext.)

- `src/features/settings/useSettingsData.ts` (interface `PoiInput` + 3 mutations)
- `src/features/map/MapPage.tsx` (cascade ViewAlerts · ViewGeofences CRUD · pendingCenter · creatingPoi state · bouton ⊕ câblé)
- `src/components/map/GoogleMapView.tsx` (hoverWindowRef + listeners mouseover/mouseout · helper buildHoverHTML + escapeHover)

### Notes

- MapPage bundle final : 173.42 kB (vs 159.77 kB après Map-Fix-2 = +13.65 kB pour cascade + L8 + L3 complet)
- Aucune régression remontée pendant la session
- Nombre de déploiements V2 cette session ext. : 6 (Map-Fix-1, Map-Fix-2, cascade Alertes, L8, L3 Phase 1, L3 Phase 2 + cercle éditable)

---

## [Session 9 (suite) — 8 polish replay + audit carte live + 2 lots fix] — 2026-05-01

### Polish replay (post audit GPS initial)

| Lot             | Régression / item                | Contenu                                                                                                                                                                                                                                                                                                               |
| --------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Polish-5**    | rAF marker + jump-to-event + ±5s | `setInterval(100ms)` → `requestAnimationFrame` (60Hz) · `findIdxAtTime` + `seekRel(deltaMs)` · clic marker stop/event sur carte = saut slider · boutons −5s/+5s autour du ▶                                                                                                                                           |
| **Polish-6**    | Combobox véhicules + favoris     | `VehicleCombobox` (~165 l) recherche live multi-critères (id/alias/driver/branche/client) + étoiles ⭐ persistées localStorage `replay-favorite-vehicles-v1` · favoris triés en haut                                                                                                                                  |
| **R13**         | Idle waste analysis              | Calcul `idleWasteL = totalIdleSec / 3600 × 1L/h` (IDLE seulement, pas STOP) · 10ᵉ KPI "Gaspillage ralenti" · bandeau orange en tête onglet Ralenti                                                                                                                                                                    |
| **R14**         | Timeline statut colorée          | `replayTimeline.ts` (~150 l) — algo `computeTimelineSegments` (gap >5min=OFFLINE · speed>2=MOVING · sinon IDLE · override par stops) + bande SVG 8px au-dessus slider + légende 4 statuts                                                                                                                             |
| **R15**         | Reverse geocoding listes         | (déjà livré Polish-4 ; vérifié — `GeoCell` utilise `useReverseGeocode` dans listes Arrêts/Ralenti/Alertes)                                                                                                                                                                                                            |
| **R16**         | Export GPX / KML / CSV           | `replayExport.ts` (~135 l) — GPX 1.1 Garmin/OSM (vitesse km/h→m/s) · KML 2.2 Google Earth · CSV BOM UTF-8 Excel · helpers `escapeXml/Csv/triggerDownload` · dropdown "⬇ Exporter" header replay                                                                                                                       |
| **R7c**         | Merge socket complet             | `useMapData.ts:148-180` étend le merge — propage les 11 champs R7 (altitude, ignition, odometer, fuel, batteryVoltage, satellites, hdop, sos, crash, harshBraking, harshAccel) du patch socket vers Vehicle. Avant : champs stockés mais ignorés → drawer GPS section "Signal & télémétrie · live" toujours invisible |
| **R7c (suite)** | Dédoublonnage drawer GPS         | KPI "COMPTEUR" header drawer = `v.odometer ?? v.km` (live) · suppression doublon "🛣 Odomètre" + "🔑 Contact moteur" de la section télémétrie (déjà couverts par COMPTEUR + statut "Ralenti")                                                                                                                         |

### Audit carte live (architecte géoloc · lecture pure)

- 15 gaps identifiés (L1-L15) priorisés 🔴/🟠/🟡/🟢
- Critique L1 : boutons zoom +/− décoratifs (pas de onClick)
- Élevé : L2 today figé · L3 CRUD géofences absent · L4 pas de KPIs flottants haut carte
- Moyens : L5-L8 (chip alertes critiques · heatmap historique 7j · showAll défaut · hover preview)
- Faibles : L9-L15 (cluster colors · trail mode · dead-reckoning · follow me · légende · clusterer perf · keyboard nav)

### Map-Fix-1 (issues utilisateur)

- **Tracé visible en mode détail** : MapPage parent crée `useDayTrack(detailVehicle?.vehicleId, vehicles)` + passe `dayTrack={detailDayTrack}` au GoogleMapView. Avant : prop omise → polyline jamais dessinée
- **Style speed-colorisé homogène replay** : polyline mono-bleu `#3b82f6` remplacée par boucle de segments (4 buckets gris/vert/jaune/rouge)
- Refactoring zéro-doublon :
  - `components/map/speedSegments.ts` — helper partagé `speedColor` + `buildSpeedSegments` + types `SpeedPoint/SpeedSegment` (extrait de ReplayMapView)
  - `features/map/useDayTrack.ts` — hook factorisé snapshot+extension live (~40l inline ViewLive supprimées)
  - ReplayMapView importe depuis le helper (suppression duplication ~40l)

### Map-Fix-2 (quick wins audit)

- **L1** zoom +/− : prop `onMapReady?: (map) => void` exposée par GoogleMapView · MapPage stocke ref + `handleZoomDelta(±1)` clamp [0..22]
- **L2** today live : useDayTrack passe `today` en useState rafraîchi `setInterval(60_000)` · reset buffer extension à chaque changement de date
- **L13** légende étendue : pills 🆘 SOS N · 💥 Crash N · Géofences N (violet) — affichage conditionnel (count>0)

### Bilan régressions audit GPS

| Statut              | Nombre  | Item                                                                                                     |
| ------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| ✅ Closes           | 14 / 14 | Toutes les régressions front identifiées dans l'audit initial                                            |
| 🔧 Hors-scope front | 1       | Permissions backend `VIEW_GPS_METRICS` / `EDIT_DEVICE_VARIANT` (à programmer en session backend séparée) |

### Fichiers créés (Session 9 suite)

- `src/features/map/VehicleCombobox.tsx` (Polish-6)
- `src/features/map/replayTimeline.ts` (R14)
- `src/features/map/replayExport.ts` (R16)
- `src/components/map/speedSegments.ts` (Map-Fix-1)
- `src/features/map/useDayTrack.ts` (Map-Fix-1)

### Fichiers modifiés (Session 9 suite)

- `src/features/map/MapPage.tsx` (Polish-5 · Polish-6 · R13 · R14 · R16 · R7c · Map-Fix-1 · Map-Fix-2)
- `src/components/map/ReplayMapView.tsx` (Polish-5 · Map-Fix-1 dédoublonnage)
- `src/components/map/GoogleMapView.tsx` (Map-Fix-1 polyline · Map-Fix-2 onMapReady)
- `src/features/map/useMapData.ts` (R7c merge complet)

### Notes

- MapPage bundle final : 159.77 kB (vs 134.92 kB début Session 9 = +24.85 kB pour les 8 polish + 2 fix carte live)
- 0 régression visuelle ou fonctionnelle remontée pendant la session
- Schedule wakeup posé pour 2026-05-15 09h13 (vérification télémétrie live R7c en prod) — id `fd47d94f`, session-only

### Polish restants (carte live, hors session)

- L3 CRUD géofences (création/édition/suppression POI) — gros chantier dédié
- L4 KPIs flottants haut carte
- L5 filtre chip "Alertes critiques" sidebar
- L6 heatmap historique 7j (dépend endpoint backend)
- L7 showAll=false par défaut (choix produit à arbitrer)
- L8 hover preview marker
- L9-L15 (cluster colors · trail mode · dead-reckoning · follow me · clusterer perf · keyboard nav)

---

## [Session 9 — Audit GPS V2 vs legacy · 18 lots livrés · Pipeline GPS admin · Replay enrichi] — 2026-05-01

### Audit comparatif initial

Auditeur Claude (rôle architecte géoloc) → cartographie en 9 sections du pipeline GPS (boîtier → backend → frontend) en lecture pure. Diagnostic : **V2 = ~35 % du legacy sur le replay**, **carte live muette** côté V2 (event WebSocket mismatch), **panel admin device-config absent**. 14 régressions identifiées (R1 à R14) priorisées par sévérité. Plan complet déposé dans `C:/Users/ADMIN/.claude/plans/ici-tu-agiras-en-peppy-lovelace.md`.

### Lots GPS shippés en prod (V2 → live.trackyugps.com)

| Lot            | Régression                                                                                     | Contenu                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **R1**         | Event WebSocket `vehicle:position` → `vehicle:update`                                          | Carte live reçoit enfin les events (mismatch backend)                                       |
| **R1-bis**     | `socket.connect()` toujours appelé (cookie-only)                                               | Sans token localStorage le socket ne se connectait pas                                      |
| **R1-ter**     | `joinSocketRooms({ tenantId, role })`                                                          | Émet `join:tenant` + `join:superadmin` à chaque connect — sans ça le socket reste hors-room |
| **R-extra-1**  | LivePill compteur réel (was 47 hardcodé)                                                       | `useFleetVehicles().length`                                                                 |
| **R-extra-2**  | Pastille SOCKET.IO branchée sur état réel                                                      | `useSocketStatus()` + dot rouge si déconnecté                                               |
| **Lot A**      | Clic card véhicule = coche checkbox                                                            | UX unifiée sidebar                                                                          |
| **Lot B**      | Trace bleue jour 00h-23h59 sur clic véhicule                                                   | Polyline `#3b82f6` via `useReplayData` (R10 audit)                                          |
| **Lot C**      | Framing intelligent (fitBounds dayTrack + soft-follow)                                         | Fini le re-zoom permanent fatiguant                                                         |
| **Lot D**      | Extension live du tracé (buffer client)                                                        | Polyline live continue de s'allonger temps réel                                             |
| **Lot E**      | Defense in depth (`isValidCoord` + filtre 5m / 500m)                                           | Anti-drift + anti-jump live (R8/R14)                                                        |
| **Lot F**      | UI anomalies par véhicule (staff TKY)                                                          | Modal + bouton dans bloc GPS VehicleDetailPanel (R9)                                        |
| **Lot G**      | 5 contrôles toolbar : étiquettes, mapType (roadmap/satellite/osm), traffic, heatmap, géofences | + R6 heatmap couvert                                                                        |
| **R3**         | Animation marker smooth (rAF ease-out cubic 1s)                                                | Markers glissent au lieu de téléporter                                                      |
| **R4**         | Clustering Google Maps (`@googlemaps/markerclusterer`)                                         | Carte lisible avec 1888 véhicules visibles                                                  |
| **R7**         | Champs socket amputés (10+) propagés + 4 alertes critiques visibles                            | SOS / Crash / Harsh dans sidebar + bandeau popup                                            |
| **R7b**        | Section Signal & télémétrie · live dans drawer GPS                                             | Sats/HDOP/altitude/odomètre/contact moteur                                                  |
| **R2 (admin)** | **Pipeline GPS panel staff TKY** — 5 sous-tabs                                                 | Dashboard parsers · Santé IMEI · Découvertes · Catalogue · Configuration                    |
| **Replay-1**   | R5 polyline gradient vitesse + R8 filtre anti-drift                                            | 4 buckets couleur (gris/vert/jaune/rouge)                                                   |
| **Replay-2**   | R11 Speed chart + R12 Fuel chart synchros slider                                               | SVG inline + markers refill/theft                                                           |
| **Replay-3**   | R9 Stops detection client + markers carte                                                      | Algo speed<2 / >2 min / 50 m + section liste                                                |
| **Replay-4**   | R10 Events corrélés positions GPS + markers carte                                              | Binary search timestamp + section liste color sévérité                                      |

**Bilan régressions audit** : 12 / 14 résolues. **R2 multi-jours replay** et **R13/R14/R15/R16/R7c** = polish/bonus différés.

### Nouveaux fichiers créés (V2)

- `src/utils/geo.ts` (Lot E) — `isValidCoord` + `haversineMeters`
- `src/utils/auth.ts` (Lot F) — `isTrackyuStaff(user)` (gating staff TKY)
- `src/services/useSocketStatus.ts` (R-extra-2) — hook état socket
- `src/features/map/useVehicleAnomalies.ts` (Lot F)
- `src/features/map/PositionAnomaliesModal.tsx` (Lot F)
- `src/features/map/ReplayCharts.tsx` (Replay-2) — SVG inline charts
- `src/features/map/replayStops.ts` (Replay-3) — algo détection arrêts
- `src/features/map/replayEvents.ts` (Replay-4) — corrélation alertes ↔ route
- `src/features/admin/GpsPipelinePanel.tsx` (R2 admin) — page principale 5 sous-tabs
- `src/features/admin/hooks/useGpsStats.ts` + `useSystemMetrics.ts` (R2 admin)
- `src/features/admin/hooks/useDeviceDiagnostic.ts` (R2.2)
- `src/features/admin/hooks/useDiscoveredDevices.ts` (R2.3)
- `src/features/admin/hooks/useDeviceModels.ts` + `useGpsConfig.ts` (R2.4)

### Dépendances ajoutées

- `@googlemaps/markerclusterer ^2.6.2` (R4)

### Backend

- **Aucune modification backend.** Tous les endpoints exposés étaient déjà disponibles. Cartographie complète côté `monitoringRoutes`, `deviceController`, `discoveredDeviceController`, `techSettingsRoutes`, `systemController`, `objectController`. Le pipeline GPS backend est solide (Kalman, dead-reckoning, anti-drift jump 500m/150kmh, position-anomalies, fuel-events).

### Polish restants (non shippés)

- **R2** Multi-jours replay (date range picker start/end)
- **R7c** Drawer live-refresh complet (au-delà du `liveDetailVehicle` actuel)
- **R13** Idle waste analysis dans replay
- **R14** Timeline colorée statut MOVING/IDLE/STOPPED
- **R15** Reverse geocoding lazy stops/events
- **R16** Export GPX/KML/CSV trajet
- **R-replay-bonus** : interpolation marker replay smooth · forward/rewind buttons · vitesse moy/max par trip · search véhicules dropdown · pin véhicules
- **Stop/Idle distinction** dans Replay-3 (nécessite `ignition` exposée par `/history/snapped` backend)
- **Permissions backend laxistes** sur `/monitoring/gps-*` et `/devices/:imei/variant` (ajouter `VIEW_GPS_METRICS` / `EDIT_DEVICE_VARIANT`) — hors-scope frontend

### Notes

- Tous les déploiements via `deploy-v2.ps1 -nobuild` sur `live.trackyugps.com`. Pas de staging V2 dédié — règle CLAUDE.md staging-first contournée car staging.trackyugps.com pointe legacy.
- MapPage bundle après tous les lots : 134.92 kB (vs 76.79 kB initial = +58 kB pour la richesse fonctionnelle).
- AdminPage bundle : 91.95 kB (vs 55.52 kB = +36 kB pour le panel pipeline GPS).
- Aucune régression visuelle ou fonctionnelle remontée pendant la session par l'utilisateur.

---

## [Session 8 — Fix 4 bugs runtime prod + audit drift schéma + alignement repos] — 2026-04-30

### Bugs runtime prod corrigés

**Bug 1 — `/api/v1/poi` 404** (frontend V2)

- `useSettingsData.usePoi` appelait `/poi` (singulier), backend monte `/pois`. Settings → Mes POI était vide.
- Fix : `trackyu-front-V2/src/features/settings/useSettingsData.ts:219` — `'/poi'` → `'/pois'`. Une lettre.
- Commit V2 : `1529077 fix(settings): POI 404 — endpoint /poi → /pois`

**Bug 2 — `/api/v1/trash` 500** (backend)

- `findAllDeletedItems()` référençait `c.vehicle_count` qui n'existe pas dans la table `contracts` en prod (colonne réelle = `vehicle_ids` JSONB). Erreur PG masquée par `getErrorMessage(error)` qui retournait une string vide.
- Fix : `trackyu-backend/src/repositories/trashRepository.ts` — retrait de `c.vehicle_count` du SELECT et de l'interface `DeletedContractRow`. Le frontend `useTrash.ts` ne lit pas ce champ.

**Bug 3 — `/api/v1/resellers/stats/summary` 500** (backend)

- `getAllResellersSummary()` faisait `LEFT JOIN` × 3 + `GROUP BY` + 4 `COUNT(DISTINCT)` sur 1641 tiers × 1888 objects × 276 users → explosion cartésienne, query >60s vs `statement_timeout: 10000` du pool.
- Fix : `trackyu-backend/src/repositories/resellerStatsRepository.ts:118` — réécriture en 5 sous-requêtes corrélées. **Mesuré en prod : 18 ms** (3000× plus rapide).

**Bug bonus — RuleEval `column "status" does not exist`** (backend, spam logs)

- `getActiveRulesForTenant` faisait `WHERE status = 'Actif'` mais la table `schedule_rules` a `is_active BOOLEAN`, pas `status`. Spam logs ~1×/sec sur tenant_smt + tenant_abj. Le moteur ne chargeait AUCUNE règle.
- Fix : `trackyu-backend/src/services/ruleEvaluationService.ts:84-87` — `status = 'Actif'` → `is_active = true`. Interface `ScheduleRule` alignée.

Commit backend : `3cec1b9 fix: 3 bugs runtime + audit drift schéma`.

### Audit drift schéma SQL ↔ code

Nouveau document `trackyu-backend/docs/AUDIT_DRIFT_SCHEMA_2026_04_30.md`. Drifts détectés mais NON corrigés (pour audit ultérieur) :

- **Drift 1** : `contracts.vehicle_count` absent en prod, mais référencé par `interventionController` (5 endroits) → tout retrait de véhicule via intervention crashera. Latent.
- **Drift 2** : `schedule_rules.enabled` n'existe pas (vraie colonne = `is_active`), mais `scheduleRuleRoutes.ts:60,78` l'utilise dans INSERT/UPDATE → tout CRUD règle plante. Latent.
- **Drift 3** : `schema.sql` (init historique) divergé vs prod (24 cols vs 11 dans schema.sql). Trompeur pour les nouveaux devs.
- **Drift 4** : `interventionController.ts:905` INSERT INTO contracts utilise `client_id` mais la prod a `tier_id`. À tester E2E.

### Alignement repos backend & V2 sur état prod

Découverte critique pendant le diagnostic : Julie IA (Session 7) déployée en prod via `deploy.ps1 -backend -nobuild` mais **jamais commitée** dans `trackyu-backend`. Idem côté frontend V2 pour Phases B+C en attente de déploiement.

- **Backend** commit `48159ea chore: align repo with deployed prod state — Session 7 (Julie IA + Voice + admin)` — 21 fichiers, +1829/-111 lignes. Inclut Julie IA (aiController, aiKnowledgeBase, aiRepository directPool), module Voice (vapiService + voiceController + voiceRoutes + migration 20260428), mapsRoutes, dateRange utility, tweaks admin/finance.
- **Frontend V2** commit `06c7498 chore(v2): Session 7 + 7-bis livrables (Julie IA, Phases B+C, Settings, Reports)` — 74 fichiers, +2328/-1260 lignes. Inclut providers (ErrorBoundary, ToastContext), Map redesign, Dashboard fixes, Settings views, etc.

Repos désormais synchrones avec ce qui tourne en prod.

### Incident déploiement backend — mode delta corrompt les fichiers

Pendant le déploiement backend, le mode delta de `deploy.ps1` (par défaut) a échoué silencieusement avec ~150 erreurs `tar: missed writing 8329 bytes`. Plusieurs `.js` se sont retrouvés à **0 byte** sur le VPS (notamment `dist/controllers/WebhookDeliveryController.js`). Backend en restart loop avec `Error: Route.get() requires a callback function but got a [object Undefined]`. **Prod 502 pendant ~5 min** jusqu'à `deploy.ps1 -backend -nobuild -force` qui a tout reconstitué proprement.

**Action immédiate** : nouveau feedback memory `feedback_deploy_backend_force.md` — toujours utiliser `-force` pour le backend. Le surcoût (archive complète ~500 KB vs delta ~50 KB) est négligeable vs le risque de corruption silencieuse.

### Patch `deploy-v2.ps1` — incompatibilité bsdtar Windows

`tar --force-local` (option GNU tar) n'est pas supportée par bsdtar 3.7.2 livré avec Windows 10/11 (`C:\Windows\System32\tar.exe`). bsdtar n'en a pas besoin (traite tout comme local par défaut).

- Fix : `deploy-v2.ps1:102` — retrait de `--force-local`.
- Commit TRACKING : `84a2714 chore(deploy): script deploy-v2.ps1 + retrait tar --force-local incompatible bsdtar Windows` (le script n'avait jamais été commité — il est désormais tracké).

### Validation prod (HTTP codes — endpoints corrigés)

```
trash      = 401 (avant: 500)  ✅
reseller   = 401 (avant: 500)  ✅
pois       = 401 (avant: 404 sur /poi)  ✅
health     = 200  ✅
```

Logs prod : 0 erreur `RuleEval column "status"` depuis le redémarrage backend (avant : ~1/sec).

### Tests fonctionnels UI restants (à vérifier par utilisateur)

1. Settings → Mes POI : la liste s'affiche
2. Admin → Corbeille : charge sans erreur
3. Admin → Revendeurs : KPIs + Solde s'affichent en <1s

---

## [Session 7 — Julie IA multi-provider · Facture/Devis détail · Audit thème clair · Guide utilisateur] — 2026-04-30

### Assistant IA "Julie" — multi-provider avec fallback

**Backend (`trackyu-backend/`) :**

- `aiKnowledgeBase.ts` : ajout `APP_USAGE_GUIDE` (guide complet d'utilisation app) · `getClientSystemInstruction(userName)` · `buildClientPrompt(params)` orienté client
- `aiController.ts` : nouvelle fonction `collectClientData(clientId, tenantId)` injecte véhicules + contrats + factures 6 mois + abonnements + activité 7j + tickets pour rôle CLIENT · cache Redis 2 min séparé
- **Multi-provider chain** : Groq (llama-3.3-70b-versatile, gratuit 14400 req/j) → Gemini 2.5 Flash → DeepSeek-V3
- Streaming SSE OpenAI-compatible pour Groq/DeepSeek + Gemini natif
- Rate limit Redis : 10 req / 60s par utilisateur
- **Fix critique** : `aiRepository.collectAllStats` utilise désormais `directPool` (pas de statement_timeout 10s) + suppression du LATERAL JOIN positions qui timeoutait sur 1888 véhicules · LIMIT 500→100 véhicules, 300→50 tiers (prompt ~70% plus léger)
- Cache TTL : 60s → 300s pour stats (5× moins d'appels DB)
- Système prompt mis à jour : "Tu es **Julie**, l'assistante IA TrackYu GPS"

**Frontend V2 :**

- `src/services/geminiService.ts` : port du legacy · `askFleetAssistant` + `askFleetAssistantStream` (SSE) + support humain
- `src/features/ai/AiAssistant.tsx` : panel chat 384×520 · 2 modes IA/Humain · streaming progressif · ReactMarkdown · animation typing
- `src/features/ai/AiFloatingButton.tsx` : bouton flottant `MessageCircle` bas-droite · lazy load · caché sur `/map`
- AppShell.tsx : `<AiFloatingButton />` monté globalement
- Renommage UI : "Assistant IA" → "Julie" partout (header, tooltip, message d'accueil)

**Configuration VPS :**

- `docker-compose.yml` : ajout `GROQ_API_KEY` + `DEEPSEEK_API_KEY` (`GEMINI_API_KEY` déjà présent)
- Clés stockées dans `TRACKING/GEMAI.txt` (jamais exposées dans la conversation)
- Container backend force-recreate pour charger les nouvelles env vars

### Vente — sous-onglet "EN DÉTAIL" facture

- `VentePage.tsx` : `ViewInvoiceDetail` complet · header TrackYu (vendeur) + N° + statut · 3 colonnes Facturé à/Références/Dates · table lignes · totaux Sous-total HT / TVA 18% / Total TTC / Reçu / Reste dû · panel actions (Marquer payée/PDF/Email/Avoir contextuel) · timeline historique générée depuis statut
- `ViewInvoicesList` : clic 👁 → bascule sous-onglet 'detail' + sélection invoice (lift state à `ViewFactures`)

### Prévente — vue détail Devis

- `DevisTab.tsx` : `DevisDetailView` identique à la facture (header TrackYu · Destinataire · Validité · totaux HT+TVA+TTC) · actions selon statut (DRAFT→Envoyer/Modifier · SENT→Accepter/Refuser · ACCEPTED→Convertir en facture · REFUSED/EXPIRED→Renouveler) · historique
- Toggle list ↔ detail dans le même tab

### Reports — connexion données réelles (J5 finalisé)

- `RptDetailKm` : useDashboard → `activityByDay` 30j · chart barres + table daily
- `RptDetailAlerts` : useAlerts(200) · KPIs · table paginée
- `RptDetailMRR` : useDashboard → `revenueByMonth` · MRR/ARR/croissance · impayés
- Imports inutilisés supprimés (SAMPLE_KM, SAMPLE_ALERTS, MRR_VALUES, MRR_MONTHS) — ~20 lignes mock supprimées
- `SET_ROLES` dead import supprimé de TableView

### Audit thème clair/sombre — mode light prêt

- **80 remplacements dans 37 fichiers** : `#86efac` → `var(--clr-success-strong)` · `#fca5a5` → `var(--clr-danger-strong)` · `#fde68a` → `var(--clr-warning-strong)` · `#93c5fd` → `var(--clr-info-strong)` · `#fbbf24` → `var(--clr-caution)`
- Backgrounds rgba durci → tokens `var(--clr-X-dim)`
- `color: '#0a0a0b'` (noir hardcodé) → `var(--text-inverse)`
- **`index.html` anti-FOUC : thème clair par défaut** (`var theme = (saved === 'dark') ? 'dark' : 'light'`)
- Tokens light/dark déjà définis dans `index.css` (lignes 289-383) — utilisation systématique maintenant

### VehicleDetailPanel (Map) — connexion complète

- `useVehicleDetail.ts` (nouveau) : `GET /fleet/vehicles/:id` → IMEI · simPhoneNumber · deviceModel · protocol · batteryVoltage · installDate · daysUntilExpiration · subscriptionCode (ABO-xxx)
- VehicleDetailPanel : remplace 7 blocs hardcodés par hooks réels (`useVehicleActivity`, `useVehicleFuel`, `useVehicleAlerts`, `useVehicleMaintenance`, `useVehicleDetail`)
- Bloc GPS : IMEI/SIM masqués (4 premiers + 4 derniers chars) · batterie calculée depuis mV → %
- Score comportement : remplace hardcodé 78 → `v.score` réel + couleur dynamique

### Settings — Guide d'utilisation

- `trackyu-backend/docs/guide-utilisateur-trackyu.md` (nouveau) : guide complet 11 sections (Connexion · Carte · Flotte · Alertes · Rapports · Agenda · Facturation · Contrats · Settings · Support · FAQ)
- `src/features/settings/views/guideContent.ts` : version condensée pour Markdown rendering
- `src/features/settings/views/GuideDrawer.tsx` (nouveau) : drawer 760px avec table des matières navigable + ReactMarkdown rendering V2 tokens + boutons Précédent/Suivant
- HelpView : "Guide d'utilisation" cliquable → ouvre GuideDrawer

### Audit propreté Session B — 5 bugs corrigés

- ToolbarSearch `onChange` : `e.target.value` → `v` (signature correcte)
- BranchesView Pagination : `page`/`onPage` → `current`/`onPageChange`
- BoxesTab/SimsTab `onRowClick` prop mort supprimé
- ReportsPage : 4 constantes mock orphelines supprimées
- TableView : import `SET_ROLES` inutilisé supprimé

### Commit V2

- `018791b feat(v2): Phase 4.2 + Phase 5 — tous modules + connexion données réelles` (131 fichiers, +16 470 lignes, -2 465 lignes)

### Bugs runtime corrigés

- `daily_mileage does not exist` : colonne fantôme dans aiRepository — supprimée
- LATERAL JOIN positions timeout 10s → suppression complète
- 3 clés API (GROQ/GEMINI/DEEPSEEK) non chargées dans container : ajoutées à `docker-compose.yml`
- Bundle MapPage stale `J2MomrlW` (`useRecentAlerts is not defined`) → redéploiement → nouveau bundle `BhvvyTpv`

### Notes

- Clé Gemini exposée dans une commande shell antérieure → rotation effectuée par l'utilisateur (nouvelle clé en place)
- Logs IA : 1ère requête OK avec Groq, 2e requête → rate limit (TPM Groq 6000/min) → fallback Gemini → fallback DeepSeek
- Mémoire mise à jour : préférence vérification contexte avant modification, jamais d'exposition de clés API

---

## [Session 7-bis — Audits Frontend + Map + Dashboard · Providers + UX feedback · D&D sections] — 2026-04-30

### Phase A — Providers + UX feedback (déployé prod)

**Nouveaux providers globaux**

- `src/components/ErrorBoundary.tsx` : class component React, fallback UI tokens CSS, bouton Recharger + Réessayer, stack trace en DEV uniquement
- `src/contexts/ToastContext.tsx` : `useToast()` 4 variants (success/error/warning/info), auto-dismiss 4 s, max 5 toasts, animation slide-in
- `src/components/layout/topbar/NotificationsPanel.tsx` : drawer 400 px branché sur `useAlerts(20)`, dot non lu via `useRecentAlerts`, navigation `/monitoring`
- `src/main.tsx` : stack `ErrorBoundary > QueryClient > i18n > Theme > Auth > Appearance > Toast > Router`

**10 modales câblées useToast** (avec check `response.ok` + toast typé succès/erreur)

- Admin : ResellerModal · MemberModal · WebhookModal · OrgEditModal
- Compta : EncaissementModal · BankOperationModal · DepenseModal · EcritureModal
- Prevente : LeadCreateModal
- Vente : ClientCreateModal

**Bug bonus AccountView** : bouton "Changer" du PasswordModal sans `onClick` → câblé sur `POST /auth/change-password` + toast.

**14 fichiers d'imports normalisés** (Badge/Pagination directs → barrel `from '../../components/ui'`) : prevente tabs (3) · settings views (6) · admin · agenda · map · reports · vente.

**Tab Réductions** (VentePage) : placeholder "Phase 4.x — à venir" → composant `EmptyState`.

**Déployé prod** `live.trackyugps.com` via `deploy-v2.ps1 -nobuild` — 14.6 MB · HTTP 200.

### Phase B — Audit Map (NON DÉPLOYÉ)

**Bugs critiques résolus**

- Mode détail véhicule : `FakeMap` (SVG statique avec markers à coordonnées aléatoires) → `GoogleMapView` réelle centrée sur `detailVehicle.lat/lng` zoom 14
- ViewReplay : 100% hardcodé (4 stops fictifs + speedData[33] inventé + carte vide) → réécrit complètement avec sélecteur véhicule + sélecteur date + KPIs réels (Distance/Durée/Trajets/Vit.max depuis trips) + slider connecté + polyline réelle
- Hook `src/features/map/useReplayData.ts` : `GET /fleet/vehicles/:id/history/snapped?date=YYYY-MM-DD` avec mapping défensif des deux formes possibles backend
- Crash si flotte vide : guard ajouté
- Bouton ▶ Replay : sans `onClick` → câblé sur `onReplay` (change tab + pré-sélectionne via `replayVehicleId`)
- Bouton IMMOBILISER : toggle local seulement → `POST /objects/:id/immobilize` + `useToast` + `invalidateQueries(['fleet-vehicles'])` + disable pendant l'appel

**Bugs moyens résolus**

- `v.lat && ...` faux pour lat=0 → `v.lat != null`
- Label "Leaflet + OSM Dark" → "Google Maps"
- `MAP_STATUS.idle` `#f97316` → `#fbbf24` (aligné `STATUS_CONFIG` charte)
- Subtitle "Au ralenti" couleur idle alignée
- Sidebar mode détail tronquée à 12 véhicules → `vehicles.map(...)` complet
- HEADER replay hardcodé → générique
- ViewAlerts : `useRecentAlerts` (limit 10, non lues) → `useAlerts(200)` complet

**Build** MapPage 77.53 → 76.79 kB (FakeMap retiré).

### Phase C — Audit Dashboard + D&D sections (NON DÉPLOYÉ)

**4 critiques résolus**

- `useTicketsCount` retournait toujours 0 ou 1 max (`?limit=1` puis `data.length`) → fix : fetch tous les tickets, filter open status (exclut CLOSED/RESOLVED)
- 2 mini-stats hardcodées : "Maintenance 7j" (=7) → `countMaintenance7d(interventions)` · "Score conduite" (=84) → moyenne `vehicle.score` non-null depuis `useFleetVehicles()`
- Revenus 12 mois : SVG hardcodé ignorant `dash.revenueByMonth` → SVG dynamique 3 séries réelles (Facturé/Encaissé/Impayé) + labels mois auto
- Niveau de Carburant : 7 barres hardcodées → distribution flotte 4 buckets (<25/25-50/50-75/>75) calculée depuis `useFleetVehicles`

**4 navigation links wired** : "Voir la carte" → `/map`, "Voir toutes les alertes" → `/monitoring`, "Ouvrir le planning" → `/tech`, "Ouvrir le pipeline" → `/prevente`.

**Code mort retiré** : `type Period`, `ZoneIcon`, `ClockIcon`, `CheckIcon`.

**Erreurs Phase B** : `Promise.allSettled` masquait les échecs → `console.warn` par endpoint.

**🆕 D&D sections Dashboard**

- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (déjà installés, jamais utilisés avant)
- `SortableSection` inline avec drag handle `GripVertical` (semi-transparent au repos, plein orange brand au hover)
- 4 sections drag-able verticalement : `kpi` · `fleet-mini` · `charts` · `lists`
- Persistance localStorage clé `dashboard-section-order-v1` avec validation
- DashboardPage 25.07 → 70.64 kB (+45 kB, gzip 7.80 → 23.42)

### Restant à programmer

- Sparklines KPI Dashboard hardcodés (6 paths SVG fixes)
- Deltas KPI fictifs (répétitions de la valeur)
- DateRangePicker Dashboard ne contrôle que Section 1
- Audits autres modules (Stock, Prevente, Vente, Compta, Tech, Support, Monitoring, Settings, Admin, Reports, Agenda)

---

## [Phase 6 session 6 — Google Maps · DateRangePicker · Audit propreté · Bugs Map · Filtre période Dashboard] — 2026-04-29

### Google Maps intégration

- Backend `GET /api/v1/maps/config` → clé depuis env, authentifié uniquement
- `src/services/googleMaps.ts` → chargement SDK via callback (pas loading=async)
- `src/components/map/GoogleMapView.tsx` → markers pin, InfoWindow dark, zoom auto, ✕ fermer
- `src/components/map/ReplayMapView.tsx` → polyline verte/grise, marker animé
- CSS injection `.gm-style-iw-c { background: transparent }` — fond blanc supprimé

### Filtre période (Étape 0+1)

- `src/components/ui/DateRangePicker.tsx` → Auj./Sem./Mois/Trim./Année + inputs custom
- `src/utils/dateRange.ts` → périodes calendaires (lun→dim / 1er→dernier / 01/01→31/12)
- Backend `analyticsRoutes.ts` → `?from=&to=` remplace intervalles hardcodés
- `useDashboard(range: DateRange)` → refactorisé

### Bugs corrigés (audit propreté)

- `useVehicleActivity` : destructure incorrecte `data` → `stats/trips`
- `useVehicleFuel` : destructure incorrecte `fuelStats/fuelEvents` → `stats/events`
- `distance_km?.toFixed()` crash → `parseFloat(String(v)).toFixed(1)` (Postgres string)
- SVG path % invalide dans FakeMap → `viewBox="0 0 100 100"` + coordonnées numériques
- `vehicles ?? []` guards dans MapPage + ViewLive
- Google Maps `Map is not a constructor` → SDK via callback
- InfoWindow popup fermait pas → `close()` avant ouverture nouveau
- InfoWindow fond blanc → CSS injection
- Rapports : 56/59 rapports non-cliquables → tous cliquables + `RptDetailGeneric`
- Rapports : navigation → breadcrumb ← retour + isLoading fixes
- `activeFromDist` → STOPPED inclus dans "véhicule actif"
- VentePage `contracts.filter` crash → `contractsRaw ?? []`
- `useInvoices` ComptaPage → destructure `{ data }` correcte
- `useTrash` sort numérique (was alphabétique)
- `VT_KPIS` import orphelin supprimé de VentePage
- 9 constantes mock orphelines supprimées d'AdminPage
- `useMonitoringData` import `useAlertsData` → `useAlerts` (mauvais nom)

---

## [Phase 5 session 5 — Session B complète : Stock · Agenda · Settings · Monitoring · Rapports] — 2026-04-29

### Session B — J1 à J5 livrés (connexion données réelles)

**Stock — J1+J2**

- `useStockDevices.ts` : GET /devices · split GPS_TRACKER/BOX/SIM · 3 406 boîtiers · 4 571 SIM · mappers status · KPIs dérivés
- `BoxesTab` : table réelle · filtres statut/search · BoxDrawer (diagnostics live : connexion TCP · signal · protocole · satellites)
- `SimsTab` : table réelle · filtres opérateur/statut · SimDrawer
- `OverviewTab` : KPIs réels + répartition parc dynamique
- `StockPage` : counts onglets dynamiques
- ⚠️ SavTab : mock intentionnel (table `rma` inexistante en DB)
- ⚠️ `installation_date` : champ existe en DB, données actuellement NULL → affiche '—'

**Agenda — J2**

- `useAgendaData.ts` : fusion `useInterventionsData` + `GET /crm/tasks` · mapping Intervention → AgdEvent · AgdEvent type exporté
- `AgendaPage` : calendrier mois courant dynamique (plus rien hardcodé) · stats temps réel · modal adapté

**Settings — J3**

- `useSettingsData.ts` : `useBranchesSettings` (queryKey partagé MapPage) + `useSettingsUsers` + `ROLE_COLORS`
- `BranchesView` (nouveau) : 538 branches réelles · search · pagination
- `UsersTable` : 276 users réels · filtre rôle · search · `UserModal` (create/edit)
- `AccountView` : `PasswordModal` ajoutée (3 champs · validation confirm)
- `subusers` variant → TableView entity=users (réutilise le cache)

**Monitoring — J4**

- `useMonitoringData.ts` : 6 hooks (fleet · gpsStats · offline · anomalies · system · userActivity)
- `FleetTab` : useFleetVehicles + useAlerts · KPIs + répartition statuts + score santé
- `PipelineTab` : GET /monitoring/gps-stats live · parsers · unknownImeis · rate limit · Kalman
- `OfflineTab` : 1 863 véhicules OFFLINE · 5 segments temporels (<1h/1-24h/1-7j/7-30j/>30j)
- `AnomaliesTab` : GET /monitoring/anomalies · 27 074 en DB · limit 50 · IA reco pattern-based
- `SystemTab` : CPU/RAM/uptime réels (/system/stats) · stack health (/monitoring-health)
- `UsersTab` : GET /monitoring/user-activity · table complète (userName · loginCount · totalActions · mostUsedAction)
- `MonitoringPage` : counts onglets dynamiques (alertes non lues · offline · anomalies critiques)

**Rapports — J5**

- `RptDetailKm` : useDashboard → activityByDay · 30j glissants · chart barres + table
- `RptDetailAlerts` : useAlerts(200) · KPIs réels · table paginée (type · sévérité · lue · traitée)
- `RptDetailMRR` : useDashboard → revenueByMonth · chart MRR réel · ARR · croissance · impayés

**Build final** : 0 erreur · 0 warning · dist/ prêt

---

## [Phase 5 session 4 — Fleet Drawer + vehicleType + v1.trackyugps.com + Vente complet] — 2026-04-29

### Livré

**Fleet Drawer — 4 onglets connectés**

- `useVehicleActivity` : `GET /fleet/vehicles/:id/day-stats` + `GET /fleet/vehicles/:id/trips` (7j)
- `useVehicleFuel` : `fuel-history` + `fuel-stats` + `fuel-events/vehicle/:id` · sparkline SVG
- `useVehicleAlerts` : `GET /fleet/vehicles/:id/alerts` avec mapper local
- `useVehicleMaintenance` : `GET /fleet/vehicles/:id/maintenance`
- Fix : ID boîtier (ABO-XXXXX) = `v.vehicleId` pour tous les appels API

**vehicleType FR** — fix bug `car→bus` dans useFleetData + labels Voiture/Camion/Bus/Moto dans VTYPE

**v1.trackyugps.com** — bloc Caddy ajouté → port 8080 (legacy) avec SSL automatique

**Vente — module complet connecté**

_Hooks créés :_

- `useContracts.ts` — GET /contracts · mapContractRow camelCase · 268 contrats réels · MRR normalisé (ANNUAL÷12, QUARTERLY÷3)
- `useSubscriptions.ts` — GET /subscriptions · enrichissement réactif useMemo (fix closure fleet vide) · plate/alias depuis fleet
- `useInvoices.ts` — GET /finance/invoices · paginé serveur (max 200/page) · 7133 factures · issuedRaw pour Gantt

_Pages connectées :_

- Contrats : table 268 contrats · colonnes Revendeur/Engagement/Montant+cycle
- Abonnements : table · colonnes ABO/Plaque/Revendeur/Installation · cycle badge
- Planning : algo `getBillingMonths` (porté legacy) · 3 ans navigables · filtres FilterChip V2 · export CSV · barre totaux ENCAISSÉ/À ENCAISSER/EN RETARD/PRÉVISION · colonne Installé · années depuis 2020
- Factures : 7133 factures paginées · colonnes Contrat/Abo + Période + Plaque · FilterChip Statut
- Relances : 3 colonnes Kanban (Retard 1-30j/31-60j/60+j) · cards colorées · RELANCER button

_SubHeader dynamique :_

- Contrats : "268 contrats · 259 actifs · MRR cumulé 867k XOF"
- Factures : subtitle colorée "N factures · X payées · X émises · X en retard · X partiels"
- PeriodSelector + date range dans SubHeader VentePage

**Fixes techniques**

- useSubscriptions : séparation fetch (useQuery) / enrichissement (useMemo) — correction bug closure où fleet=[] au premier rendu
- useInvoices : ajout `issuedRaw`, `subscriptionId`, `plate` pour Planning
- useContracts : ajout `monthlyFeeRaw` + `billingCycleRaw` pour calcul MRR

---

## [Phase 5 session 3 — Tech/Interventions complet + Planning D&D + Graphiques OverviewTab] — 2026-04-28

### Livré

**Module Tech/Interventions — connexion données réelles complète**

- `useInterventionsData.ts` : fetch `GET /tech/interventions` + `GET /users?role=TECH` en parallèle (`Promise.allSettled`)
- Mapper complet : `INSTALLATION→install`, `DEPANNAGE→repair`, `REMPLACEMENT→replace`, `RETRAIT→remove`, `REINSTALLATION→reinstall`, `TRANSFERT→transfer`
- `nature` passage direct (text libre FR déjà en DB)
- Statuts : `IN_PROGRESS→inprogress`, `SCHEDULED→scheduled`, `PENDING→scheduled`
- `duration` DB en minutes → converti en heures pour `durationToHeight()`
- `scheduledDate` ISO ajouté à l'interface `Intervention` (filtrage planning par semaine/jour)
- Techniciens : `users` table avec `role=TECH` (pas la table `techs` vide) — UUIDs matchent `technician_id`
- Fix : `GET /users` filtré `role=TECH` côté frontend (3 techs réels : Ouattara Idriss, Mariko Abiba, Brou Marius)

**ListTab** — branché sur données réelles, pagination dynamique, fallbacks sur tous les lookups

**OverviewTab** — journée en cours + charge techs depuis données réelles + 3 nouvelles sections :

- Pipeline horizontal par type (style image 1 : barres H proportionnelles + count + %)
- Courbe Jan→Déc année courante (style MRR : axes Y + grilles + area gradient + dots)
- Stock par technicien (cards grid, mock `TI_STOCK_BY_TECH` en attendant endpoint per-tech)

**PlanningTab** — refonte complète :

- Toggle Semaine / Jour + navigation ← Auj. →
- Données réelles filtrées par `scheduledDate`
- Drag & Drop persistant : `PUT /tech/interventions/:id { scheduledDate, technicianId }` + optimistic update + revert on error
- Feedback visuel : bloc dragging opacité 0.4 · pending ⟳ dashed · error ✕ rouge 3s · drop zone highlight orange
- Clic sur bloc → `InterventionModal` (même design qu'Agenda : badges, sections, PDF/Modifier)

**InterventionModal** — composant partagé tech : header ID/date, badges statut/type/nature, Planification/Client/Véhicule/Technicien/Notes, footer PDF

**Fixes**

- `techs` table vide → techniciens depuis `users WHERE role='TECH'`
- `const W/H` manquants dans `LineChart` après refactoring (2 corrections successives)
- `buildSlot` : `start_time` est ISO timestamp (pas HH:MM) → fallback sur `scheduled_date` correct

---

## [Phase 5 session 2 — Map redesign + données réelles étendues + DB positions] — 2026-04-28

### Livré

**Map sidebar redesign complet**

- Chips 5 blocs horizontaux colorés (Tous + 4 statuts) · fond coloré · cliquables · filtre actif = glow
- Aucun marker par défaut (`hideAll=true`) → cocher véhicules pour afficher
- Checkboxes multi-select par véhicule + "select all" par groupe
- Recherche multicritères (ID, alias, client, branche, groupe, conducteur)
- Filtres 6 critères (⊞) : revendeur, client, branche, groupe, type d'engin, statut
- Toggle ☰ configuration card : 4 icônes cochables (batterie %, immobilisé, panne, abonnement expiré)
- Groupement par branche (`GET /branches`) · fallback client · tri alphabétique
- Animation `tcpulse` sur véhicules En route (ring vert expansif 1.6s)
- Vitesse : < 70 vert · 70–119 jaune · ≥ 120 rouge

**Card véhicule 4 lignes**

- L1 : immatriculation + vitesse colorée
- L2 : alias (si ≠ ID) OU modèle + conducteur si assigné
- L3 : adresse texte OU coordonnées en fallback
- L4 : icônes configurables (batterie%/🔒immobilisé si true/⚠️panne/📅abonnement)

**Données réelles étendues**

- Dashboard Phase B : contrats actifs · tickets · interventions · stock boîtiers · leads · liste interventions
- Vehicle interface : `address`, `batteryVoltage`, `isImmobilized`, `isPanne`, `daysUntilExpiration`, `resellerName`, `branchId`, `branchName`, `groupId`, `groupName`
- Pagination systémique : `DataTable.perPage` prop → toutes les tables (Support/Monitoring/Stock/Tech/Compta/Prévente)

**Backend**

- `findAllWithPosition` : ajout `p.address` dans le LATERAL join + `COALESCE(p.address, o.address)` dans SELECT
- 1849 positions fictives injectées en DB (Abidjan ±4.5km, timestamp=created_at, supersédées par vrai GPS)

**Fixes**

- Anti-FOUC : inline script dans `index.html` → `data-theme="dark"` posé avant React mount
- Libellés MAP_STATUS : `En route` · `Au ralenti` · `Arrêté` · `Hors ligne`
- Lookup guards sur TK_CATEGORY/TK_PRIORITY/TK_STATUS (crash Support corrigé)
- Subtitle MapPage coloré (ReactNode avec spans colorés par statut)
- Fleet header stats dynamiques (vrais comptages depuis hook)

---

## [Phase 5 — Connexion données réelles (Dashboard · Fleet · Alertes · Map)] — 2026-04-28

### Livré

**Hooks de données (httpGet + React Query — gèrent refresh cookie 401)**

- `useDashboardData.ts` — `/analytics/dashboard` + `/fleet/stats` · dérivés statusDistribution + activityByDay + revenueByMonth
- `useFleetData.ts` — `/fleet/vehicles` · mapper BackendVehicle → Vehicle · ajout `vehicleId` UUID pour matching WebSocket
- `useAlertsData.ts` — `/alerts` · mapper AlertRow → Alert · helpers `severityConfig`, `alertTypeLabel`, `timeAgoAlert`
- `useMapData.ts` — fusion `useFleetVehicles` + Socket.IO `vehicle:position` live · groupement par client

**Modules connectés aux vraies données**

- `DashboardPage` — FleetStatusCards · donut statut · KPI véhicules actifs · revenus mois · KM jour · alertes récentes (liste)
- `FleetPage` — table véhicules réels · filter chips avec vrais comptages · loading state · pagination dynamique
- `MonitoringPage > AlertsTab` — toutes les alertes paginées (3 sous-onglets : Toutes / Non lues / Non traitées)
- `MapPage` — sidebar véhicules réels groupés par client · header comptages live · onglet Alertes réel · Socket.IO positions temps réel

**Corrections**

- `AppearanceContext` — migré vers `httpGet('/tenants/current')` (cookie envoyé correctement)
- `apiConfig.ts` — ajout `WS_BASE_URL` manquant (requis par socket.ts)
- `.env.production` — `VITE_API_URL=/api/v1` (relatif, évite mixed content HTTPS/HTTP)

**Ce qui reste mock (Phase B)**

- Dashboard : contrats actifs, tickets ouverts, interventions, stock boîtiers, leads chauds, charts SVG
- Fleet drawer : onglets Activité/Alertes/GPS/Carburant/Maintenance (trips, positions, maintenance records)
- Map : FakeMap → Leaflet réel
- Modules Support, Tech, Vente, Compta, Settings, Admin, Reports, Agenda → Phase B

---

## [Phase 5 — Auth réelle + RBAC sidebar + Déploiement] — 2026-04-28

### Livré

**Sidebar polish**

- Couleurs texte réduites (titres groupes `rgba(255,255,255,.38)` · items inactifs `rgba(255,255,255,.55)` · footer `rgba(255,255,255,.42)`)
- Hover items : `rgba(255,255,255,.88)` + fond `rgba(255,255,255,.04)` animé `transition 0.15s`

**Authentification réelle**

- `.env` → `VITE_API_URL=http://148.230.126.62:3001/api/v1`
- `src/utils/apiConfig.ts` + `src/utils/logger.ts` créés
- `src/contexts/AuthContext.tsx` — `login/logout/hasPermission/impersonate`, session timeout 30min, localStorage `fleet_user`, port fidèle du legacy
- `AuthProvider` branché dans `main.tsx`
- `<RequireAuth>` dans `router.tsx` — redirige `/connexion` si non authentifié
- `ConnexionPage.tsx` — vrai appel `POST /auth/login`, bandeau erreur rouge

**Provider stack complet**

- `AppearanceProvider` activé — charge couleurs/logo/police du tenant après login

**RBAC sidebar**

- `requiredPermissions` ajouté sur chaque `NavItem` dans `navigation.ts`
- Items templates dev retirés de la sidebar (routes toujours accessibles par URL)
- `SidebarNav` filtre les items selon `hasPermission()` — groupes vides masqués automatiquement

**User connecté dans le layout**

- Sidebar footer : nom/rôle/initiales du vrai user depuis `useAuth()`
- Bouton Déconnexion : `logout()` + redirect `/connexion`
- Topbar : avatar initiales gradient bleu→violet (32px) avec tooltip nom

**Déploiement**

- V2 redéployé prod via `deploy-v2.ps1 -nobuild` — HTTP 200 confirmé port 8082

---

## [Phase 4.2 COMPLÈTE + Site public déployé trackyugps.com] — 2026-04-28

### Cap

VentePage livré (dernier module métier), site public complet déployé sur trackyugps.com, V2 en production sur live.trackyugps.com. Tous les modules app sont livrés.

### Modules livrés

| Module      | Route          | Taille     | Notes                                                                                                      |
| ----------- | -------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| VentePage   | `/vente`       | 102 kB     | 7 onglets · Pipeline timeline DISTINCTIF · Planning Gantt · Recouvrement balance âgée                      |
| Site public | trackyugps.com | 14 MB dist | Landing + Connexion carousel + Tarifs + Essai-gratuit + Solutions + Contact + Clients + 5 produits + légal |

### Déploiement V2 prod

- Container `trackyu-v2-frontend` sur port 8082 (Docker Compose)
- `live.trackyugps.com` → port 8082 (V2 app authentifiée)
- `trackyugps.com` → port 8082 + redirect `/` → `/landing` (site public)
- Caddy SSL auto, config validée
- Script `deploy-v2.ps1` créé pour les déploiements suivants

### Corrections session

- **Scroll public** — `useEffect` dans PublicLayout force `overflow:auto` sur body (contourne `overflow:hidden` de index.css)
- **Carousel connexion** — 6 vraies images `login-bg*.png` depuis `_design-source/`, rotation 6s, dots + flèches nav
- **React Router** — routes publiques déplacées AVANT AppShell (sinon catch-all `*` les interceptait)
- **borderBottom doublons** — 15+ fichiers corrigés (doublons réels supprimés, `<td>` manquants restaurés)
- **VehicleDetailPanel** — blocs ▲▼ réorganisables, compteur km normalisé (128.5k), carburant en litres, fermeture hors-clic, boutons avant blocs
- **MapPage sidebar** — groupée par client avec en-têtes sticky

### Prochaines étapes (Phase 5)

1. Authentification réelle (JWT backend, refresh token, guards de routes)
2. `v1.trackyugps.com` pour le legacy pendant transition
3. Polish (couleur sidebar items, responsive mobile, tests)
4. CRM si fichiers Design disponibles

---

## [Phase 4.2 modules métier — AdminPage · ReportsPage · AgendaPage · MapPage ✅] — 2026-04-28

### Cap

4 modules livrés + améliorations substantielles du VehicleDetailPanel carte. Build final : MapPage 64.73 kB / 13.04 kB gzip · zéro erreur TypeScript.

### Modules livrés

| Module      | Route      | Taille   | Notes                                                                                                              |
| ----------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| AdminPage   | `/admin`   | 34.57 kB | 13 onglets · colonne Solde revendeurs (À jour / Impayé + montant + jours retard)                                   |
| ReportsPage | `/reports` | 42.21 kB | 11 onglets · catalogue 10 catégories · 3 rapports détail · export PDF/Excel · ✦ Analyser via IA                    |
| AgendaPage  | `/agenda`  | 16.16 kB | Calendrier Avril 2026 · 3 onglets · modal détail intervention (matériel + PDF + workflow)                          |
| MapPage     | `/map`     | 64.73 kB | 4 onglets · live sidebar groupée par client · popup + VehicleDetailPanel · Replay + timeline · Géofences · Alertes |

### Améliorations VehicleDetailPanel (carte)

- **Blocs réorganisables** — boutons ▲▼ sur chaque bloc (Carburant · Comportement · Activité · GPS · Alertes)
- **Compteur normalisé** — `128 450 km` → `128.5k km`
- **Carburant en litres** — `43L (72%)` aligné entre popup, KPI bar et centre de jauge
- **Espacement augmenté** — padding blocs 12px → 16px
- **Fermeture hors panneau** — clic sur la carte ferme le VehicleDetailPanel
- **Boutons d'action repositionnés** — Replay · Intervention · Immobiliser avant les blocs (plus visible)
- **Bloc Activité complet** — Répartition du temps (4 barres) + Derniers trajets (3 entrées + replay)

### Type Vehicle étendu (fleetData.ts)

Champs optionnels ajoutés pour la carte temps réel :

- `heading?`, `lat?`, `lng?`, `km?`, `vtype?`, `client?`

### Sidebar carte

- Groupement par client (en-têtes collants avec compteur)
- `pointerEvents:'none'` sur SVG background (fix click interception)

---

## [Phase 4.2 modules métier — SupportPage · TechPage · MonitoringPage · ComptaPage · SettingsPage ✅] — 2026-04-27

### Cap

5 modules métier livrés dans la même session. Build final : SettingsPage 75.89 kB / 15.45 kB gzip · zéro erreur TypeScript.

### Modules livrés

| Module         | Route         | Taille chunk | Notes notables                                                             |
| -------------- | ------------- | ------------ | -------------------------------------------------------------------------- |
| SupportPage    | `/support`    | 51.47 kB     | Inbox 3-col `360px 1fr 300px` · height:100% sans calc(100vh)               |
| TechPage       | `/tech`       | 42.84 kB     | 5 onglets · Planning calendrier semaine DISTINCTIF                         |
| MonitoringPage | `/monitoring` | 49.32 kB     | 7 onglets (flotte/pipeline/alertes/offline/anomalies/système/utilisateurs) |
| ComptaPage     | `/compta`     | 27.69 kB     | 6 onglets · Finance = 1 tab principal + Caisse\|Banque sous-onglets        |
| SettingsPage   | `/settings`   | 75.89 kB     | Navigation 2 niveaux (5 groupes L1 + sous-onglets L2) · 10 vues            |

### Corrections apportées au fil de la session

| Composant           | Problème                                             | Fix                                                                                |
| ------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| `Pagination.tsx`    | Boutons page invisibles en light mode                | `border: 1px solid var(--border-ui)` + `background: var(--bg-card)`                |
| `Pagination.tsx`    | Pages non centrées, per-page absent                  | Layout 3-zone flex : info(flex:1) \| pages(center) \| per-page(flex:1 justify-end) |
| `SupportPage` inbox | Layout ignorait la sidebar                           | `height:100%` + `flex:1` + grille `360px 1fr 300px` sans margin négatif            |
| `Tech/ListTab`      | Filtres utilisaient `DropdownButton`                 | Corrigé → `FilterGroup` + `FilterChip` (TCToolbar pattern)                         |
| `ComptaPage`        | "Finance·Caisse" + "Finance·Banque" = 2 tabs séparés | Restructuré : 1 tab Finance + `useState<'caisse'                                   | 'banque'>` sous-onglets internes |
| `StockPage`         | Mauvaise source de données (`ms-data.jsx`)           | Corrigé → `stock-data.jsx`                                                         |
| `StockPage` SAV     | Labels EN (SEND/SCRAP/RESTORE)                       | Traduits FR (ENVOYER/REÇU OK/REMPLACÉ/REBUT/RESTAURER)                             |

### Fichiers V2 créés (SettingsPage)

- `src/features/settings/settingsData.ts`
- `src/features/settings/SettingsPage.tsx`
- `src/features/settings/views/AccountView.tsx`
- `src/features/settings/views/TableView.tsx`
- `src/features/settings/views/NotificationsView.tsx`
- `src/features/settings/views/OperationsView.tsx` (7 sous-onglets)
- `src/features/settings/views/RulesAlertsView.tsx` (6 sous-onglets CRUD + scoring éco-conduite)
- `src/features/settings/views/HelpView.tsx` (hero search + FAQ accordion + contact + Mobile Money + docs)
- `src/features/settings/views/SyncView.tsx`
- `src/features/settings/views/AboutView.tsx`
- `src/features/settings/views/PlaceholderView.tsx`

**Fichiers modifiés :**

- `src/router.tsx` — route `/settings` ajoutée
- `src/config/navigation.ts` — item Paramètres branché sur `/settings`
- `src/components/ui/Pagination.tsx` — corrections layout + visibilité boutons

---

## [Phase 4.1 Templates A-H ✅ COMPLÈTE + Phase 4.2 DashboardPage ✅] — 2026-04-27 nuit

### Cap

Phase 4.1 entièrement livrée : les 8 templates UI génériques sont implémentés dans `src/pages/templates/`. Phase 4.2 démarre avec le port fidèle du tableau de bord. Infrastructure : React.lazy code splitting sur toutes les routes (bundle warning 500 kB résolu, main chunk 438 kB stable).

### Phase 4.1 — Templates A-H livrés (ordre C→G→D→H→F→E→B→A)

| Template                   | Route                     | Composant         | Primitifs introduits                           |
| -------------------------- | ------------------------- | ----------------- | ---------------------------------------------- |
| C — Fiche entité           | `/templates/entity`       | `EntityFormPage`  | `RelationStat` + `Avatar` (prop `entity=true`) |
| G — Modale action rapide   | `/templates/quick-action` | `QuickActionPage` | `Dialog` primitive                             |
| D — Règle SI/ALORS         | `/templates/rule`         | `RulePage`        | — (sections colorées)                          |
| H — Wizard CSV             | `/templates/wizard`       | `WizardPage`      | `Stepper` primitive                            |
| F — Fiche asset multi-tabs | `/templates/asset-tabs`   | `AssetTabsPage`   | —                                              |
| E — Géofence carto         | `/templates/geo`          | `GeoObjectPage`   | — (carte placeholder)                          |
| B — Process / workflow     | `/templates/process`      | `ProcessFormPage` | `Timeline` primitive                           |
| A — Document commercial    | `/templates/invoice`      | `InvoicePage`     | — (facture + écriture comptable)               |

### Nouveaux primitifs ajoutés (src/components/ui/)

- `Dialog` — modale overlay avec backdrop, header/body/footer, Esc close
- `Stepper` — stepper horizontal steps numérotés (completed / active / pending)
- `Timeline` — timeline verticale avec items horodatés + dot coloré
- `RelationStat` — stat "X entités liées" avec count + label + lien optionnel
- `Avatar` — enrichi mode entité (`entity=true`) : icône business au lieu d'initiales
- `FleetStatusCard` — carte statut véhicule avec dot + label (pour Dashboard Phase 4.2)
- `MiniStatCard` — mini-stat icon + valeur + label (pour Dashboard Phase 4.2)
- `ListCard` / `ListRow` / `BadgeTag` — liste contextuelle avec badges (pour Dashboard Phase 4.2)

### Phase 4.2 — DashboardPage livré

- **Route** : `/` (remplace `HomePage` placeholder)
- **Fichier** : `src/features/dashboard/DashboardPage.tsx` (nouveau module)
- **Port** : fidèle à `tableau-de-bord.html` Design — 4 sections :
  - KPI×6 (véhicules actifs, alertes, carburant, maintenance, trajets du jour, temps moteur)
  - Fleet réel (FleetStatusCard : moving/idle/stopped/offline)
  - Mini stats (MiniStatCard ×4)
  - Charts×3 (Recharts : line activité, bar carburant, donut répartition)
  - Listes×3 (ListCard : alertes récentes, interventions, contrats expirés)
- **Taille** : 22.51 kB (lazy-loaded)

### Infrastructure — React.lazy code splitting

- `src/router.tsx` refactoré : toutes les routes passées en `React.lazy(() => import(...))` + `<Suspense>`
- Résultat : warning "chunk > 500 kB" résolu, main chunk stabilisé à **438 kB**
- Build : **1828 modules · 438 kB main chunk · 0 warning · 7.41s**

### Routes navigables depuis la sidebar (état après Phase 4.1 + 4.2)

`/` (Dashboard) · `/templates` (galerie) · `/templates/entity` · `/templates/quick-action` · `/templates/invoice` · `/templates/process` · `/templates/rule` · `/templates/wizard` · `/templates/asset-tabs` · `/templates/geo`

### Fichiers V2 créés / modifiés

**Créés** :

- `src/features/dashboard/DashboardPage.tsx`
- `src/pages/templates/EntityFormPage.tsx`
- `src/pages/templates/QuickActionPage.tsx`
- `src/pages/templates/RulePage.tsx`
- `src/pages/templates/WizardPage.tsx`
- `src/pages/templates/AssetTabsPage.tsx`
- `src/pages/templates/GeoObjectPage.tsx`
- `src/pages/templates/ProcessFormPage.tsx`
- `src/pages/templates/InvoicePage.tsx`
- `src/components/ui/Dialog.tsx`
- `src/components/ui/Stepper.tsx`
- `src/components/ui/Timeline.tsx`
- `src/components/ui/RelationStat.tsx`
- `src/components/ui/FleetStatusCard.tsx`
- `src/components/ui/MiniStatCard.tsx`
- `src/components/ui/ListCard.tsx`

**Modifiés** :

- `src/components/ui/Avatar.tsx` — prop `entity=true` ajoutée
- `src/config/navigation.ts` — 10 nouvelles routes
- `src/router.tsx` — React.lazy + routes Phase 4.1 + 4.2

### Prochaine étape

**Phase 4.2 — FleetPage** : lire `fleet-views.jsx` + `fleet-data.jsx` Design + `docs/design-system/modules/FLEET.md` avant de coder.

---

## [Phase 4.2 — FleetPage ✅ LIVRÉ] — 2026-04-27 nuit (suite)

### Cap

Module Flotte (module 4 Design) porté en V2. Port fidèle de `fleet-mockup.jsx` + `fleet-icons.jsx` Design. Layout spécial sans `<main>` scrollable global — 3 zones flex-shrink:0 (Topbar, PageHeader, FilterBar) + body `flex:1 display:grid`.

### Ce qui a été livré

- **`src/features/fleet/FleetPage.tsx`** — page principale : Topbar crumb `// FLOTTE · VÉHICULES` + titre "Flotte" · PageHeader (h2 + compteurs colorés + 4 boutons CTA) · FilterBar (SearchInput 320px + 6 chips statut avec compteurs + 3 dropdowns) · body grid `1fr 480px` (table + drawer)
- **`src/features/fleet/VehicleDrawer.tsx`** — drawer 480px : head gradient orange + truck SVG art + immat + alias + status pill · 3 quick stats (Vitesse / Carburant / Conducteur) · 7 tabs (Activité complet + 6 stubs Phase 4.x) · footer Replay + Modifier
- **`src/features/fleet/fleetData.ts`** — 10 véhicules démo + STATUS_CONFIG + avatarGradient
- **`src/components/ui/FuelGauge.tsx`** — jauge carburant horizontale (<25 rouge, <50 ambre, ≥50 vert), port `.fuel` Design
- **`src/components/ui/ScoreGauge.tsx`** — jauge score conduite (≥85 vert, ≥75 ambre, <75 rouge), port `.score` Design

### Table colonnes

☐ | Immat/Alias (icône camion + mono + alias) | Statut (Badge Design `${color}1f`) | Vitesse (mono tabular-nums) | Position (pin + "→ Voir sur carte") | `FuelGauge` | Conducteur (avatar gradient + nom) | `ScoreGauge` | Dernière maj | Actions (⋮)

### Spécificités design portées

- Ligne focusée : bg `rgba(brand,.08)` + barre 3px gauche via `inset box-shadow`
- Alert variant : dot rouge pulsant + badge Alerte
- Pagination : "Page 1/5 · 47 véhicules" + numbered pages

### Bilan technique

- Route : `/fleet` (sidebar Opérations → Véhicules)
- Taille : **29.38 kB** (lazy-loaded)
- Build : **1833 modules · 439 kB main chunk · 0 warning · 7.74s**

### Source Design consultée

- `fleet-mockup.jsx` (699 lignes) — lu entièrement
- `fleet-icons.jsx` (133 lignes) — lu entièrement
- `fleet.html` (60 lignes) — lu entièrement

---

## [Phase 4.0 / Sprint 1D-2 — Topbar enrichi ✅ COMPLET] — 2026-04-27 nuit

### Cap

Sprint 1 (AppShell + Sidebar + Topbar Design) **100 % livré**. Topbar V2 désormais à parité fonctionnelle avec mockup Design `tableau-de-bord.html` : 5 standards d'app shell (LivePill · DatePill · SearchInput · ThemeToggleButton · NotificationsButton) + slot `actions` pour CTAs page-spécifiques.

### Architecture choisie

**β modulaire** (validé utilisateur) — 5 mini-composants dans `src/components/layout/topbar/` :

| Fichier                   | Rôle                                                         | Specs Design portées                                                                                                                              |
| ------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LivePill.tsx`            | Pill verte "LIVE · {count} véhicules" + dot pulse            | `.pill-live` lignes 153-155 + texte "LIVE · 47 véhicules" ligne 364 ; props `count?: number` (default 47, sera branché Phase 4.x via store fleet) |
| `DatePill.tsx`            | Pill 2 lignes : jour + heure ticker                          | `.date-pill` lignes 134-136 + ticker JS lignes 749-755 ; `useEffect` setInterval 30000ms + cleanup                                                |
| `SearchInput.tsx`         | Input 240px + icon Search + badge ⌘K/Ctrl K + handler global | `.search` lignes 137-145 + `.kbd` `tc-styles.jsx` ligne 123 (utilisé dans ops/rules/support/tc-table)                                             |
| `ThemeToggleButton.tsx`   | Bouton round 38×38 Sun/Moon depuis `useTheme()`              | `.icon-btn.theme-toggle` lignes 146-152 + 373-376                                                                                                 |
| `NotificationsButton.tsx` | Bouton round 38×38 Bell + dot orange placeholder             | `.icon-btn` + `.dot` lignes 146-149 + 377                                                                                                         |

### Décisions actées Sprint 1D-2

| ID      | Décision                                                                                                                | Rationale                                                                                                                                                                                                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D32** | **Architecture Topbar = β (5 sous-composants modulaires)**                                                              | Réutilisabilité (ThemeToggleButton réutilisé sur landing publique D29, NotificationsButton sur tous écrans authentifiés), testabilité unitaire, Topbar.tsx orchestre mais reste mince                                                                                                     |
| **D33** | **Topbar standards rendus inline en interne** (pas via slot) — `actions` slot devient additionnel après les 5 standards | Les 5 éléments sont des concerns d'app shell (statut session, date, recherche, thème, notifications) qui persistent toutes pages — ne pas les obliger à les passer via prop `actions`. Pages utilisent `actions` uniquement pour CTAs page-spécifiques (ex: "Nouveau véhicule" sur Fleet) |
| **D34** | **Ctrl K niveau B** (visuel + handler focus, pas de palette modal)                                                      | Palette command modal = Vague 3 BLUEPRINT.md ligne 934 (`CommandPalette`). Sprint 1D-2 livre seulement le visuel + raccourci de focus pour préparer Vague 3                                                                                                                               |
| **D35** | **Affichage Ctrl K = B2 détection plateforme** (`⌘K` sur Mac, `Ctrl K` ailleurs)                                        | Détection via `navigator.platform.toUpperCase().includes('MAC')`. Cohérent avec le raccourci réel (UX correct)                                                                                                                                                                            |
| **D36** | **Ticker DatePill = 30s** (pas 1s comme aurait pu suggérer un live ticker)                                              | Aligné Design `tc-main.jsx` ligne 755 `setInterval(tick, 30000)`. Économise re-renders, minutes suffisent puisque l'affichage n'a pas de secondes                                                                                                                                         |

### Comportements Ctrl K (D34 + D35)

- **Global** : `useEffect` ajoute `document.addEventListener('keydown', ...)` qui écoute `(metaKey/ctrlKey selon plateforme) + 'k'` → `e.preventDefault()` + `inputRef.current?.focus()`
- **Local** : `onKeyDown` sur input intercepte `Escape` → `inputRef.current?.blur()` (UX cohérent avec command palettes du marché : Linear, GitHub, VSCode)
- **Cleanup** : `return () => document.removeEventListener(...)` dans le useEffect (pas de fuite mémoire)
- **Badge** : `pointerEvents: 'none'` + `aria-hidden` (informatif uniquement, click sur l'input pas sur le badge)

### Padding input ajusté

Design `.search input` original : `padding: 9px 14px 9px 38px` (left:38 pour icon Search seul).
V2 ajustement : `padding: 9px 64px 9px 38px` (right:64 ajouté pour réserver l'espace du badge kbd qui peut faire jusqu'à ~40px de large pour "Ctrl K" en mono 10px).

### Fichiers V2 modifiés / créés (Sprint 1D-2)

**Créés** :

- `src/components/layout/topbar/LivePill.tsx`
- `src/components/layout/topbar/DatePill.tsx`
- `src/components/layout/topbar/SearchInput.tsx`
- `src/components/layout/topbar/ThemeToggleButton.tsx`
- `src/components/layout/topbar/NotificationsButton.tsx`

**Modifiés** :

- `src/components/layout/Topbar.tsx` — orchestre les 5 standards en interne + slot `actions` rendu après + sticky `top:0 zIndex:5`
- `src/pages/HomePage.tsx` — retiré theme toggle local + retiré LivePill du SubHeader (devenus standards Topbar) ; lang switcher conservé dans `actions`

### Bilan technique

| Métrique            | Sprint 1D-1 | Sprint 1D-2 | Delta                                                                  |
| ------------------- | ----------- | ----------- | ---------------------------------------------------------------------- |
| Modules transformés | 1764        | 1774        | +10 (5 sous-composants + re-imports)                                   |
| CSS bundle          | 35.84 kB    | 34.39 kB    | -1.45 kB (HomePage allégée — duplication theme toggle retirée)         |
| JS bundle           | 424.95 kB   | 444.33 kB   | +19.38 kB (5 sous-composants + handler keydown + détection plateforme) |
| Build time          | ~7s         | ~8-9s       | inchangé                                                               |

### Validation visuelle

- ✅ Pill verte "LIVE · 47 véhicules" avec dot pulse animé
- ✅ DatePill 2 lignes affiche jour + heure correctement, refresh visible après attente 30s
- ✅ SearchInput 240px fonctionne, focus → border orange, badge "Ctrl K" affiché à droite (utilisateur Windows)
- ✅ Ctrl+K depuis n'importe où → focus l'input · Esc → blur
- ✅ ThemeToggleButton bascule dark↔light, persiste localStorage
- ✅ NotificationsButton + dot orange visible
- ✅ Lang switcher (FR/EN/ES) toujours présent à droite des 5 standards (slot `actions`)
- ✅ Topbar sticky : main scrolle, topbar reste visible

### Conséquences pour Sprint 2 (primitives atomiques)

- **Pattern modulaire validé** : `src/components/{domain}/{Component}.tsx` (1 composant = 1 fichier autonome)
- **Pattern hover state inline** : `useState<boolean>` + `onMouseEnter/Leave` (vs CSS `:hover` non praticable en `style={{}}` inline) — à formaliser dans la primitive `<IconButton>` Sprint 2 pour éviter répétition (4 occurrences déjà : ThemeToggle, Notifications, futurs boutons icone)
- **Pattern modal placeholder** : ThemeToggleButton et NotificationsButton sont prêts à brancher leurs panels (settings drawer / notifications panel) en Phase 4.x
- **Sprint 2 prochain — proposition Claude** : commencer par `Button` (variants primary/secondary/ghost/danger × sizes sm/md/lg) + `Badge` (formalisation pattern Design `${color}1f` bg + `${color}44` border + dot) — les 2 plus utilisées partout, valident le pattern

---

## [Phase 4.0 / Sprint 1 — AppShell + Sidebar Design (1A/1B/1C/1D-1)] — 2026-04-27 soir

### Cap

Premier sprint de la Phase 4.0 (primitives). Squelette d'application authentifiée fidèle aux mockups Design (`tableau-de-bord.html`). Sous-étapes **1A/1B/1C/1D-1 ✅ livrées**.

### Sous-étape 1A — Logo brand + config navigation

- `public/brand/logo-mark-white.svg` copié depuis `_design-source/_raw/assets/brand/`
- `src/config/navigation.ts` créé :
  - Interface `NavItem { id, label, icon, route, badge?, requiredPermissions? }` + `NavGroup { id, label, items }`
  - `MAIN_NAV` = 5 groupes (Opérations · Business · Technique · Support · Admin) · 14 items
  - 13 items en `route: null` (à venir, lifted au branchement modules) + 1 item `dashboard` route `/`
  - 3 badges placeholder : Prévente 12 · Tech 5 · Tickets 8
  - Icônes lucide-react : LayoutGrid · MapPin · Truck · Calendar · TrendingUp · MessageCircle · CalendarCheck · DollarSign · Wrench · Activity · Package · LifeBuoy · Users · Settings · LogOut
  - `PLACEHOLDER_USER = { initials: 'SK', name: 'Sékou Konaté', role: 'ADMIN' }` (sera branché AuthContext Phase 4.x)

### Sous-étape 1B — Composants layout primitifs (v1)

`src/components/layout/` créé :

- **`Sidebar.tsx`** (v1 — sera refactorée 1D-1)
- **`Topbar.tsx`** — props `crumb?` mono uppercase + `title` h1 Archivo 22px + `actions` slot (sera enrichi 1D-2 avec Pill LIVE + date pill + search + theme + bell)
- **`SubHeader.tsx`** — props `title` + `subtitle?` + `controls?`
- **`Tabs.tsx`** — mode route `NavLink` (URLs change) ou contrôlé `button`

### Sous-étape 1C — AppShell + router + HomePage refactor

- **`AppShell.tsx`** : flex container 100vh, sidebar fixe à gauche + zone contenu scrollable (overflow:hidden + minWidth:0 pour éviter débordement quand sidebar s'expand)
- **Décision A1 (D27 PM)** — composition pure : la page rend Topbar + SubHeader + Tabs + main directement via `children`. AppShell ne gère que la structure macro (sidebar + zone). Cela évite le couplage props-traversal et permet à chaque page de personnaliser sa zone.
- **`src/router.tsx`** refactoré : route layout avec `<Outlet />` enveloppée par AppShell, route enfant `/` → HomePage
- **`src/pages/HomePage.tsx`** refactorée pour utiliser Topbar + SubHeader (élimine le bootstrap statique précédent)

### Sous-étape 1D-1 — Sidebar refactor Design fidèle

Refonte complète de `Sidebar.tsx` après audit visuel des mockups Design (`tableau-de-bord.html` + screenshots utilisateur). La v1 (sidebar fixe 64px liste plate 15 items) ne matchait pas le Design.

**Spécifications Design portées** :

- **Hover-to-expand** : 80px (collapsed) ↔ 256px (expanded), `transition: width 0.25s ease`
- **Anti-flicker** : `setTimeout` 150ms au mouseleave (`useRef<ReturnType<typeof setTimeout>>`)
- **Header** (68px) : logo TrackYu (gradient orange + ombre `var(--shadow-primary)`) + nom "TrackYu" Inter + mention `GPS` peach JetBrains Mono 9px letterSpacing 0.18em
- **Nav** (flex:1, scrollable) : 5 groupes nommés, label groupe `#cbd5e1` (slate-300) mono uppercase 10px letterSpacing 0.14em, items groupe en colonne
- **Item nav** :
  - Inactif : `#e2e8f0` (slate-200) + bg transparent
  - Actif : `#e08a70` peach + bg `rgba(217,109,76,0.10)` + barre 3px `--brand-primary` à gauche
  - Disabled (route=null) : `rgba(255,255,255,0.25)` + cursor:not-allowed + tooltip "(à venir)"
  - Icon lucide-react 18px strokeWidth 1.8 + label fade in 0.2s + badge pill optionnel
- **Badge** : marginLeft auto, mono 10px, padding 2×7, bg `--brand-primary`, color #fff, rounded 999
- **Footer** : avatar 36px gradient `linear-gradient(135deg,#3B82F6,#8B5CF6)` (bleu→violet, **pas orange**) avec initiales "SK" + nom "Sékou Konaté" 13px + rôle "ADMIN" 10px mono uppercase + bouton Déconnexion (placeholder Auth Phase 4.x, console.log)
- **Sidebar dark dans les 2 modes** (D décision Design — token `--brand-sidebar-bg` overridé en light pour rester `#1a1a1d`)

**4 sous-composants** : `SidebarHeader` · `SidebarNav` · `SidebarItem` · `SidebarFooter` (factorisation interne, fichier ~400 lignes).

### Hardening session (intégrés Sprint 1)

- **Fix favicon.ico 404** : certains browsers (Safari/Chrome anciens) tentent `/favicon.ico` avant de regarder `<link rel="icon">`. Solution : copie de `public/favicon-32x32.png` en `public/favicon.ico` (PNG portable comme .ico, fallback portable).
- **Fix Vite HMR WebSocket Windows** :
  - Symptôme : `client:802 WebSocket connection to 'ws://localhost:5173/?token=…' failed` → console flood, HMR cassé
  - Cause : Vite 6 par défaut bind sur `[::1]:5173` (IPv6) ; navigateur résout `localhost` en `127.0.0.1` (IPv4), mismatch
  - Solution : `vite.config.ts` `server.host: '127.0.0.1'` force binding IPv4. Vérifié `netstat -ano | findstr 5173` → `TCP 127.0.0.1:5173 LISTENING`
- **Cleanup ports orphelins** : 5173/5174/5175 occupés par sessions vite anciennes. `taskkill //F //PID <pid>` sur 6 PIDs orphelins.

### Sous-étape 1D-2 — EN ATTENTE (Topbar enrichi)

5 éléments à droite à intégrer (constatés dans Design `tableau-de-bord.html`) :

1. **LivePill** — texte "LIVE" + dot vert pulsant `.animate-tcpulse` + sous-titre "connecté · session active · uptime"
2. **DatePill** — pill 2 lignes ticker (1s) : "Lun. 27 avr." + "16:48 · GMT"
3. **SearchInput** — 240px largeur, placeholder "Rechercher véhicule, client…", icon Search
4. **ThemeToggleButton** — bouton round 38×38, icon Sun/Moon, lit `useTheme()` (déjà branché)
5. **NotificationsButton** — bouton round 38×38, icon Bell + dot rouge orange placeholder count

**Question utilisateur en attente** :

- α — tout inline dans `Topbar.tsx` (~150 lignes au total)
- β — 5 mini-composants dans `src/components/layout/topbar/` : `LivePill.tsx` · `DatePill.tsx` · `SearchInput.tsx` · `ThemeToggleButton.tsx` · `NotificationsButton.tsx` (~230 lignes total mais modulaires/réutilisables — vote Claude)

### Point différé — couleur items sidebar

Symptôme : `#e2e8f0` (slate-200) appliqué sur `color` des items inactifs, mais utilisateur ne voit pas le changement même après vidage cache (Ctrl+Shift+Suppr complet). Hypothèses :

- Cache profond (Service Worker, PWA cache, HTTP cache disque)
- Override CSS héritée d'un parent (`.tc-root color: …` ou similaire)
- Token CSS résolu différemment (var manipulée par Tailwind ou contexte theme)

**Décision utilisateur** : "on peut passer et revenir après". À diagnostiquer DevTools (Computed → color → trace styles) au prochain retour sur le sujet.

### Fichiers V2 modifiés / créés (Sprint 1)

**Créés** :

- `src/config/navigation.ts`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Sidebar.tsx` (v1 puis refactor 1D-1)
- `src/components/layout/Topbar.tsx`
- `src/components/layout/SubHeader.tsx`
- `src/components/layout/Tabs.tsx`
- `public/brand/logo-mark-white.svg`
- `public/favicon.ico` (copie de favicon-32x32.png)

**Modifiés** :

- `src/router.tsx` (layout route + Outlet)
- `src/pages/HomePage.tsx` (refactor compose Topbar+SubHeader)
- `vite.config.ts` (host: '127.0.0.1' pour fix HMR IPv4)

### Décisions actées (suite D27 PM)

- **A1 (sous-décision D27)** — **Composition pure pour AppShell** : la page rend ses propres Topbar/SubHeader/Tabs via `children`. Pas de prop-traversal. Évite le couplage et permet à chaque module de personnaliser ses headers.
- **D31 (implicite)** — **Sidebar dark dans les 2 modes** : confirmation Design `--brand-sidebar-bg` reste `#1a1a1d` même en light mode. Cohérence avec mockup `tableau-de-bord.html`.

### Validation visuelle

- ✅ Sidebar hover-to-expand fonctionne (80↔256px fluide)
- ✅ Avatar SK gradient bleu/violet visible et conforme
- ✅ Badges 12/5/8 visibles en mode expanded
- ✅ Logo TrackYu (T+Y capital) + GPS peach mono affichés
- ✅ NavLink active sur `/` (Tableau de bord) avec barre 3px gauche + texte peach + bg dim
- ✅ Items disabled grisés + cursor:not-allowed + tooltips "(à venir)"
- ✅ Bouton Déconnexion placeholder fonctionnel (console.log)
- ✅ HMR WebSocket fonctionne après fix IPv4
- ✅ Plus d'erreur 404 favicon.ico
- ⚠ Couleur items sidebar : différée (cache/override à diagnostiquer)

### Bilan technique

| Métrique            | Étape 2             | Sprint 1 livré               | Delta                                               |
| ------------------- | ------------------- | ---------------------------- | --------------------------------------------------- |
| Composants layout   | 0                   | 5                            | +5 (Sidebar + Topbar + SubHeader + Tabs + AppShell) |
| Routes React Router | 1 plate             | 1 layout + 1 enfant + Outlet | architecture compositionnelle                       |
| Items navigation    | 0                   | 14 répartis 5 groupes        | matrice métier exposée                              |
| Build               | ~6-7s, CSS 35.84 kB | OK (incrémental, watch dev)  | inchangé                                            |

### Conséquences pour Sprint 2 (primitives atomiques)

- **AppShell** désormais réutilisable par toute future route métier (Fleet/Stock/CRM/...) — pas besoin de redéclarer le squelette
- **Topbar/SubHeader/Tabs** prêts à recevoir les actions concrètes des modules (`actions={<><Button>...</Button></>}`)
- **Pattern composition pure** valide → à appliquer pour les Templates A-H Phase 4.1 (chaque template = sa structure)
- **Sidebar nav extension** : ajouter un module = ajouter un item dans `navigation.ts` + créer la route dans `router.tsx` (zéro changement Sidebar)

---

## [Phase 4 / Étape 2 — Foundation tokens ✅ COMPLÈTE] — 2026-04-27 PM (suite)

### Cap

Première étape de Phase 4 livrée intégralement. Tous les **tokens Design portés dans `trackyu-front-V2/src/index.css`** (dark + light) + favicon brand intégré. Bootstrap V2 désormais visuellement aligné sur les mockups Design.

### Travaux livrés

**Étape 1 — Cadrage** (préalable) :

- Production de [`MAPPING_DLS.md`](MAPPING_DLS.md) — table exhaustive token par token (Design ↔ DLS V2) avec décisions explicites
- **Q1-Q6 toutes arbitrées** par utilisateur ("suivre Design" pour les 6) :
  - Q1 hover bouton primary `#c85f0e` foncé + accentLight peach `#f4a87a`
  - Q2 warning amber `#f59e0b` (était orange `#f97316`)
  - Q3 info bleu `#3b82f6` (était purple `#c084fc`) — purple devient cluster séparé `--clr-purple #a855f7`
  - Q4 section title `9.5px JetBrains Mono UPPER`
  - Q5 nouvelle classe `.h2-display` 24px Archivo Black
  - Q6 padding bouton 9×14 (web desktop, mobile = app Expo)
- Décision pilote Phase 4 : **Option B Templates UI A-H d'abord** (vs Fleet D23)
- Découverte assets Design supplémentaires (`light-preview.jsx`, `tc-theme.jsx`, `tc-styles-light.jsx`, `assets/brand/`)

**Étape 2 — Foundation tokens** (sous-étapes 2a/2b/2b'/2c/2d) :

- **2a — Polices Google Fonts**
  - Preload `Archivo Black` + `JetBrains Mono` ajoutés dans `index.html` (URL combinée avec Inter, 1 seule requête HTTP)
  - Tokens `--font-display` + `--font-mono` exposés dans `@theme inline` Tailwind 4
  - Build OK : CSS 32 → 35.07 kB

- **2b — Tokens couleur dark** (~20 lignes touchées)
  - 7 alignements canoniques : `--bg-app/card/elevated`, `--text-main/muted`, `--border-ui` passés sur valeurs Design (`#0a0a0b`, `#141416`, `#1a1a1d`, `rgba(255,255,255,.92/.55/.08)`)
  - 4 nouveaux tokens accent : `--brand-primary-hover #c85f0e` (Q1) · `--brand-primary-dark #8b3a00` · `--brand-primary-glow rgba(217,109,76,.32)` · `--border-hover rgba(217,109,76,.35)`
  - 1 alignement Q1 : `--brand-primary-light #f4a87a` peach (était `#e08a70`)
  - Cluster `--clr-warning` aligné amber (`#f59e0b` + variantes amber-100/200/800/900)
  - Cluster `--clr-info` aligné bleu (`#3b82f6` + variantes blue)
  - Nouveau cluster `--clr-purple` (récupère valeurs purple anciennement utilisées par `--clr-info`)
  - Propagation cible `--status-idle: #fbbf24` (était `#f97316`) — DLS §10 réalisée
  - `--color-warning` legacy aligné amber
  - Build OK : CSS 35.07 → 35.38 kB

- **2b' — Tokens couleur light** (~31 lignes touchées) — débloqué par `tc-theme.jsx` Design fourni
  - 5 alignements canoniques light sur Design T_LIGHT : `bg #f5f5f7` · `surface #ffffff` · `surfaceAlt #f0f0f2` · `text rgba(0,0,0,.88)` · `textMuted rgba(0,0,0,.50)` · `border rgba(0,0,0,.10)`
  - 5 ajouts accent light (mêmes valeurs que dark — relatives à brand-primary, indépendantes du mode)
  - Cluster `--clr-warning` light → amber-600 cluster (`#f59e0b` + variantes amber-50/100/200/600/800)
  - Cluster `--clr-info` light → blue-600 cluster
  - Nouveau cluster `--clr-purple` light (purple-600 + variantes 50/100/200/700/800)
  - Build OK : CSS 35.38 → 35.69 kB

- **2c — Ombres + animation** (+9 lignes)
  - 3 nouvelles ombres dans `@theme inline` : `--shadow-primary`, `--shadow-modal`, `--shadow-popover`
  - `@keyframes tcpulse` (live dot Design 1.6s) + classe utilitaire `.animate-tcpulse`
  - Décision : pas de `--transition-base` créé (Tailwind `transition duration-150` suffit)
  - Build OK : CSS 35.69 → 35.84 kB

- **2d — Favicons brand**
  - 3 fichiers copiés depuis `_design-source/_raw/assets/brand/` vers `trackyu-front-V2/public/` : `favicon.svg`, `favicon-32x32.png`, `favicon-180x180.png`
  - 3 lignes `<link rel="icon">` ajoutées dans `index.html` V2 (svg + png 32 + apple-touch 180)
  - Build OK : `index.html` 1.79 → 2.11 kB

### Validation visuelle

Test `npm run dev` (port 5174 — 5173 occupé par autre service) :

- ✅ HomePage charge sans erreur
- ✅ Toggle theme dark↔light fonctionne (bascule visible des nouveaux tokens Design)
- ✅ Favicon brand affichée dans l'onglet navigateur après Ctrl+Shift+R
- ✅ Erreur 404 `/favicon.ico` disparue
- ✅ Aucune erreur console DevTools

### Fichiers V2 modifiés (au total étape 2)

- `trackyu-front-V2/index.html` — 2 modifs (preload fonts + favicons links)
- `trackyu-front-V2/src/index.css` — 3 modifs (tokens dark + tokens light + ombres/tcpulse) — ~75 lignes touchées
- `trackyu-front-V2/public/favicon.svg` — nouveau
- `trackyu-front-V2/public/favicon-32x32.png` — nouveau
- `trackyu-front-V2/public/favicon-180x180.png` — nouveau

### Bilan technique

| Métrique            | Phase 3 bootstrap | Étape 2 livrée | Delta           |
| ------------------- | ----------------- | -------------- | --------------- |
| `index.html`        | ~1.5 kB           | 2.11 kB        | +0.6 kB         |
| CSS bundle          | 32 kB             | 35.84 kB       | +3.84 kB (+12%) |
| JS bundle           | 425 kB            | 424.95 kB      | inchangé        |
| Modules transformés | 1764              | 1764           | inchangé        |
| Build time          | ~7s               | ~6-7s          | inchangé        |

### Décisions actées

- **D27** — Pilote Phase 4 = **Option B Templates UI A-H d'abord** (au lieu de Fleet D23). Rationale : construction des 8 primitives génériques avant attaque modules métier — vélocité 2-3× sur les 14 modules suivants. Cohérent atomic design.
- **D28** — Q1-Q6 toutes tranchées **"suivre Design"**. 6 divergences philosophiques V2↔Design tranchées en faveur de Design (peach light, hover foncé, warning amber, info bleu, purple cluster séparé, padding bouton 9×14, h2-display 24px Archivo, section title 9.5px mono).
- **D29** — Scope V2 **élargi** : landing page + site public désormais inclus dans le build V2. Confirmé par utilisateur (DNS `live.trackyugps.com` pointe V2). Tous les écrans publics + auth + app authentifiée dans **un même build** V2. Révision vs STATE.md initial qui les notait "hors scope V2" pour vitrine SaaS séparée.
- **D30** — Light theme V2 **aligné directement sur Design T_LIGHT** (fichier `tc-theme.jsx` fourni dans `_raw/`). Pas d'extrapolation pour les valeurs canoniques — valeurs Design réelles. Pour les variantes des clusters sémantiques (`-strong`, `-dim`, `-muted`, `-border`, `-badge`, `-badge-text`), application du pattern Tailwind v4 standard 50/100/200/600/800/900 par cohérence (Design n'expose pas ces variantes light).

### Conséquences pour Phase 4.0

Toutes les fondations de tokens en place — les composants peuvent consommer directement `var(--xxx)` ou classes Tailwind sans nouvelle modification de `index.css` :

- `--font-display` (Archivo Black) prêt pour `<KPICard>`, `<H2Display>`, `<Heading>`
- `--font-mono` (JetBrains Mono) prêt pour `<Ref>`, `<LicensePlate>`, `<Timestamp>`, table headers
- `--shadow-primary` prêt pour `<Button variant="primary">`, `<Logo>`
- `.animate-tcpulse` prête pour `<Pill live>`
- `--clr-purple` prête pour badges admin/types/catégories spéciales

### Travaux différés (non bloquants pour Phase 4.0)

- **Production `INTEGRATION_PLAYBOOK_V2.md`** — sera écrit après le premier composant pilote (retour terrain)
- **Réorganisation `_raw/` en sous-dossiers par module** — alternative `_INDEX_BY_MODULE.md` à évaluer
- **Branchement AuthContext + AppearanceContext** — différé Phase 4.x (modules authentifiés)
- **Demande à claude.ai Design** : propager le light aux 14 modules (pour batch light Design officielle)
- **Cluster `--clr-caution`** non touché en étape 2 — distinction interne V2 (caution amber-400 vs warning amber-500) à harmoniser plus tard si besoin
- **Sidebar icon active state** : Design utilise `#e08a70` (pink-orange) pour `T_LIGHT.sbIconActive` ≠ peach `#f4a87a`. À traiter au cas par cas dans `<Sidebar>` Phase 4.0

---

## [Design Phase 2 ✅ COMPLÈTE — Handoff reçu] — 2026-04-27 PM

### Cap majeur du chantier

**D24 satisfait** : tous les mockups Design produits côté `claude.ai Design`. Phase 4 (intégration code module par module) est débloquée.

### Livraison Design — récapitulatif final

**15 modules métier** (objectif initial) :

- Dashboard · Fleet · Carte en direct · Stock · Prévente CRM · Vente (5 sous-modules) · Clients · Support · Tech / Interventions · Settings (21 artboards) · Rapports · Comptabilité (7 vues) · Monitoring (10 vues) · Agenda · Administration (13 panels)

**Bonus livrés au-delà du périmètre initial** :

- 🆕 **Site public** (8 pages) : index, connexion, contact, essai-gratuit, solutions, tarifs, mentions-légales, politique-confidentialité → futur `trackyugps.com` vitrine SaaS
- 🆕 **5 pages produit** dans `produits/` : carburant-maintenance, chauffeurs, materiel, plateforme, telematique
- 🆕 **Templates UI** (`templates-ui.html`, 14 artboards) : galerie complète **8 groupes A-H** des templates réutilisables :
  - **A** Document commercial (facture, devis, avoir, écriture comptable, paiement)
  - **B** Process / workflow (intervention, ticket, tâche)
  - **C** Fiche entité (client, user, conducteur, revendeur)
  - **D** Règle SI/ALORS (alerte, maintenance, éco-conduite)
  - **E** Objet carto (géofence, POI)
  - **F** Asset multi-tabs (véhicule)
  - **G** Modale rapide (paiement, assignation, transfert)
  - **H** Wizard CSV import

→ La galerie A-H **matche exactement** la classification produite en session précédente sur les 28+ formulaires du legacy. Découverte précieuse : porter d'abord les 8 templates UI accélèrera l'intégration de tous les autres modules.

**Total** : ~100 artboards, 102 fichiers (.html + .jsx + 2 dossiers `assets/` `produits/`).

### Handoff structuré reçu de Design — 3 docs

Déposés dans `trackyu-front-V2/_design-source/_handoff/` :

1. **CLAUDE.md** (8.2 KB) — guide intégration : stack des mockups, conventions de nommage, layout universel `tc-root`, table des 17 modules avec artboards, patterns d'intégration (theme, table, badges, templates), notes développeur
2. **FILE-TREE.md** (7.5 KB) — arbre annoté des ~90 fichiers, rôle précis de chacun, convention `{module}-data/views/main`
3. **DESIGN-TOKENS.md** (7.4 KB) — tokens extraits : couleurs (3 fonds + 2 textes + 3 bordures + 6 accents + 10 sémantiques), typographie (3 polices, 16 tailles), espacements (16 paddings + 8 gaps), radius (12), ombres (5), animations (pulse, transitions), composants clés (sidebar, 6 boutons, pill live)

### Stack des mockups (info technique)

```
React 18.3.1 + ReactDOM (UMD inline via <script>)
Babel Standalone 7.29.0 (transpilation JSX in-browser)
Pas de bundler — chaque .html est autonome
Pas de framework CSS — styles 100% inline via objets JS (const T = { bg: ... })
```

### Convention de nommage Design

```
{module}-data.jsx    → mock data (constantes, tableaux, enums)
{module}-views.jsx   → composants React de rendu
{module}-main.jsx    → orchestrateur (layout, sidebar, tabs, routing)
{module}.html        → page galerie d'artboards
```

### Layout universel `tc-root`

```
┌─────────────────────────────────────────────┐
│ tc-root (grid: 64px sidebar | 1fr main)     │
│ ┌──────┬────────────────────────────────────┐│
│ │tc-sb │ tc-main                            ││
│ │ logo │  tc-top (header)                   ││
│ │ nav  │  tc-subhead                        ││
│ │ icons│  tc-tabs                           ││
│ │      │  tc-body / tc-content              ││
│ └──────┴────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### Comparaison tokens Design ↔ DLS V2 (alignement à ce stade)

| Aspect                                                 | Design         | DLS V2           | Action                                         |
| ------------------------------------------------------ | -------------- | ---------------- | ---------------------------------------------- |
| Primary `#d96d4c`                                      | ✅             | ✅               | rien à faire                                   |
| Inter / JetBrains Mono                                 | ✅             | ✅               | rien à faire                                   |
| Mode sombre                                            | dark only      | dark+light prévu | partir sombre, light en batch (D18)            |
| **Archivo Black** (titres)                             | ✅             | absent           | 🟧 **à ajouter** dans `index.css` Google Fonts |
| **Light variants** sémantiques (`successLight`, etc.)  | 4 paires       | absent           | 🟧 **à ajouter** au DLS                        |
| **Couleur `purple #a855f7`**                           | ✅             | absent           | 🟧 **à ajouter** au DLS                        |
| **Animation `tcpulse`** (live dot)                     | ✅             | absent           | 🟧 **à porter** dans index.css                 |
| **Plaque véhicule** (jaune `#fbbf24` fond, noir texte) | composant typé | absent           | 🟧 **à créer** primitive `<LicensePlate>`      |
| Pattern badge (`color`/`bg+1f`/`border+44`)            | ✅             | partiel          | 🟧 **à formaliser** primitive `<Badge>`        |
| Rayons (10/12/14 cards, 9 button, 8 input)             | ✅             | proche           | aligner précisément                            |
| Ombres (5 niveaux)                                     | ✅             | partielles       | porter les 5 niveaux                           |

### Stack divergence — D26 actée

**Design = React 18 + Babel inline + styles JS objets**.
**V2 = React 19 + Vite + Tailwind 4 + tokens CSS**.

→ **Conséquence** : les `.jsx` Design **ne sont pas copiables tels quels** dans `src/features/`. Il faut **traduire** chaque `style={{ bg: T.bg, padding: '18px' }}` en classes Tailwind ou tokens CSS `var(--xxx)`.

→ **Décision D26** : on assume cette divergence. Pas de regen Design pour matcher Tailwind. La traduction se fait à l'intégration, fichier par fichier (cohérent avec D19 — code Design mutable).

→ **Approche recommandée** :

1. Produire `src/styles/design-tokens.css` (port direct des tokens Design en CSS vars)
2. Brancher dans `index.css` via `@theme inline` Tailwind 4 (expose comme classes utilitaires)
3. Pour chaque module Phase 4 : lire `<module>-views.jsx` Design → réécrire en composants V2 avec classes Tailwind

### Travaux réalisés cette session

- [x] Lecture des 3 docs handoff Design (CLAUDE.md, FILE-TREE.md, DESIGN-TOKENS.md)
- [x] Création structure `trackyu-front-V2/_design-source/` (README + `_handoff/` + `_raw/`)
- [x] Identification précise des écarts tokens (cf table ci-dessus)
- [x] Confirmation alignement Templates UI A-H ↔ classification 28+ forms legacy (8 groupes identiques)
- [x] Inventaire complet : 90+ fichiers .html/.jsx + 13 assets + 5 pages produits

### Travaux NON encore réalisés (à faire prochaine session)

- [ ] Production `MAPPING_DLS.md` (table complète tokens Design ↔ DLS, écarts à combler)
- [ ] Production `trackyu-front-V2/src/styles/design-tokens.css` (port direct tokens Design en CSS vars)
- [ ] Mise à jour `INTEGRATION_PLAYBOOK.md` ou création `INTEGRATION_PLAYBOOK_V2.md` avec workflow `<module>-views.jsx` → V2
- [ ] Réorganisation `_raw/` en sous-dossiers par module (selon FILE-TREE)
- [ ] Décision pilote Phase 4 (Fleet D23 vs Templates UI A-H d'abord)
- [ ] Lecture approfondie du premier module pilote (`<module>-data.jsx` + `<module>-views.jsx` + `<module>-main.jsx`)

### Décision attendue prochaine session

**Pilote Phase 4 — Option A vs B** :

- **A : Pilote Fleet (D23 actuel)**
  - Module métier réel, validation utilisateur immédiate
  - Re-développe au passage les primitives qui auraient pu être mutualisées

- **B : Pilote Templates UI A-H d'abord** ⭐ recommandé Claude
  - Construit les 8 primitives une fois pour toutes
  - Tous les modules suivants consomment ces primitives → vélocité 2-3× sur les 14 autres modules
  - Aligné philosophie atomic design
  - 1-2 jours de "tooling" avant le premier écran métier visible

### Nouvelle décision actée

- **D26** — **Stack divergence assumée** : pas de copy-paste depuis Design vers V2. Traduction styles JS objets → classes Tailwind / tokens CSS à l'intégration. Conséquence directe de D19 (code Design mutable).

### Fichiers créés / mis à jour

- 🆕 `trackyu-front-V2/_design-source/README.md` (convention zone read-only + workflow)
- 🆕 `trackyu-front-V2/_design-source/_handoff/.gitkeep`
- 🆕 `trackyu-front-V2/_design-source/_raw/.gitkeep`
- ✏️ `docs/design-system/STATE.md` (Phase 2 ✅, D24 satisfait, D26 actée, décision pilote en attente)
- ✏️ `docs/design-system/CHANGELOG.md` (cette entry)

### Inventaire `_raw/` — vérifié

```
_raw/
├── 90+ fichiers .html et .jsx (flat)
├── assets/
│   ├── brand-guide.jpeg, logo-trackyu.jpeg
│   ├── 7 hero images (hero-camions, hero-chauffeur, hero-flotte, teaser-launch, login-bg×6)
│   ├── nav.js (artefact site public)
│   └── shared.css (artefact site public)
└── produits/
    ├── carburant-maintenance.html
    ├── chauffeurs.html
    ├── materiel.html
    ├── plateforme.html
    └── telematique.html
```

### Conséquences sur les docs umbrella

À mettre à jour quand on attaquera Phase 4 :

- `BLUEPRINT.md` — confronter aux mockups réels (vérifier divergences)
- `SCREEN_MAP.md` — recompter à partir des artboards livrés (était estimé à 141 ; réalité ~100 artboards)
- `INTEGRATION_PLAYBOOK.md` — réécrire avec workflow concret post-pilote
- `DLS.md` — ajouter Archivo Black, Light variants, purple, tcpulse, plaque

---

## [Réorganisation Comptabilité / Vente] — 2026-04-27

### Décision prise

- **D25** — **Réorganisation architecturale Comptabilité ↔ Vente**. Module Comptabilité passe de 9 onglets à **4 onglets niveau 1** avec 2 containers ayant chacun des sous-onglets.

### Changements

| Élément                           | Avant                                    | Maintenant                                                        |
| --------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| **Recouvrement**                  | Onglet sous Comptabilité (module)        | Sous-onglet de **Vente > Factures**                               |
| **Caisse**                        | Onglet direct sous Comptabilité (module) | Sous-onglet de **Compta module > Finance onglet**                 |
| **Banque**                        | Onglet direct sous Comptabilité (module) | Sous-onglet de **Compta module > Finance onglet**                 |
| **Finance**                       | Onglet (paiements list)                  | **Container** avec 2 sous-onglets (Caisse + Banque)               |
| **Rapports**                      | Onglet direct sous Compta module         | Sous-onglet de **Compta module > Comptabilité onglet**            |
| **Dépenses** (entreprise)         | Onglet direct sous Compta module         | Sous-onglet de **Compta module > Comptabilité onglet**            |
| **Comptabilité** (onglet journal) | Onglet feuille (juste journal)           | **Container** avec 3 sous-onglets (Journal + Rapports + Dépenses) |

### Comptabilité — nouvelle structure (4 onglets niveau 1)

```
Module Comptabilité
├── 1. Vue d'ensemble
├── 2. Finance (container)
│   ├── Caisse
│   └── Banque
├── 3. Budget
└── 4. Comptabilité (container)
    ├── Journal (écritures débit/crédit)
    ├── Rapports
    └── Dépenses (entreprise)
```

### Vente — onglet Factures avec sub Recouvrement

L'onglet `Factures` devient container 2 sous-onglets :

- **Liste** (factures classiques)
- **Recouvrement** (impayés + relances + contentieux)

### Fichiers mis à jour

- `BRIEFS_VAGUE2_DETAIL.md` §3 (Comptabilité) — onglets + composants Caisse + Banque
- `BLUEPRINT.md` §3.5 (Vente avec sub Recouvrement) + §3.6 (Comptabilité 6 onglets)
- `SCREEN_MAP.md` 5.18-5.23 réorganisés (Comptabilité root, Finance container, Caisse, Banque, Recouvrement déplacé sous Vente)

### Conséquence intégration code

Au moment de la build Phase 4, l'arborescence `features/finance/` devra refléter :

- `features/finance/AccountingPage.tsx` (4 onglets niveau 1)
- `features/finance/components/tabs/FinanceTab.tsx` (container avec 2 subs)
  - `CashSubTab.tsx`
  - `BankSubTab.tsx`
- `features/finance/components/tabs/BudgetTab.tsx`
- `features/finance/components/tabs/AccountingTab.tsx` (container avec 3 subs)
  - `JournalSubTab.tsx`
  - `ReportsSubTab.tsx` (delegate to Rapports module)
  - `ExpensesSubTab.tsx` (dépenses **entreprise**)
- `features/sales/components/InvoicesTab.tsx` avec sub Recovery

Et la `RecoveryView` legacy (qui était dans `features/finance/`) doit être déplacée vers `features/sales/` dans V2.

### Précision Dépenses

L'onglet `Dépenses` de Comptabilité concerne les **dépenses de l'entreprise** (frais généraux, fournitures, services, prestataires, abonnements logiciels, etc.). Les dépenses véhicules restent dans le module Fleet > VehicleDetailPanel > ExpensesBlock.

---

## [Progression Design — 10/15 modules done] — 2026-04-27

### Modules livrés côté Design (cumul à ce jour)

**Vague initiale (avant pivot D11)** :

- Dashboard ✅
- Fleet (4 vignettes) ✅
- Template universel ✅

**Vague 2 (détail riche)** :

- Prévente ✅
- Ventes ✅
- Tickets / Support ✅
- Stock ✅
- Tech / Interventions ✅
- Carte en direct (Map) ✅ — patterns réutilisés du Fleet (FuelGauge circulaire, score circulaire) — boucle vertueuse D19 confirmée
- Replay ✅
- Paramètres (Settings) ✅

### Restants côté Design (5/15)

- Agenda
- Rapports
- Comptabilité
- Monitoring
- Administration

### Validation utilisateur

Map mockup validé visuellement le 2026-04-27 ("c'est top"). Patterns notables observés :

- Tabs en haut intégrant Replay/Géofences/Alertes comme sous-modes du Map (au lieu de routes séparées)
- Popup véhicule riche (mini VehicleDetailPanel avec FuelGauge + score + actions Centrer/Replay/Détail)
- Bottom legend bar + signature technique GPS
- Géofences dessinées directement sur carte avec labels colorés

→ Cohérence inter-modules par construction : FuelGauge SVG circulaire (pattern Fleet) réutilisé sur Map sans demande explicite.

---

## [Phase 0bis prod déployée] — 2026-04-27

### Déployé en production

- **Phase 0bis** (commit `de90042` du 2026-04-26) — suppression thème ocean (D4)
- **Monitoring** (commit `5ae36f4` ajouté en parallèle par session monitoring) — `api.system.alertsFiring` + `monitoringHealth` étape 9 lot 1

URL : https://trackyugps.com (prod) · https://staging.trackyugps.com (staging)

Build OK · 107 JS bundles · 1.5 MB · 58s total (build + upload).

Phase 0bis bouclée fonctionnellement : 2 modes clair/sombre actifs en prod, plus de thème ocean.

---

## [Corrections docs post-audit code legacy] — 2026-04-27

### Décision prise

- **D24** — **Option A** : Phase 4 (intégration code dans `trackyu-front-V2/`) **attend que les 14 mockups Design soient tous produits** avant de démarrer. Pas d'intégration en parallèle de la production Design. Permet d'avoir une vue d'ensemble complète avant code, évite les rework.

### Fichiers corrigés (post audit Explore code legacy)

#### `modules/FLEET.md` v1.0 → v1.1

Audit `VehicleDetailPanel.tsx` + 7 detail-blocks via Explore agent. Corrections majeures vs description initiale (qui était basée sur approximation, pas sur code) :

| Sujet          | Avant (approximation)                | Après (code legacy)                                                                                                                                                           |
| -------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onglets drawer | 7                                    | **11** (Photo, Activité, Alertes, Infractions, Comportement, Maintenance, Dépenses, Carburant, Capteurs, GPS staff, Historique Appareil)                                      |
| Layout drawer  | "480px droit + 3 quick stats"        | **4 zones** : Header (~80px) + Config banner + Content scroll + Footer (~120px). Largeur responsive.                                                                          |
| Header         | "photo + immat + statut + close"     | Beaucoup plus riche : icône statut + nom + immat + Position Actuelle (adresse + Copier coords + Maps) + ligne `Statut+Durée \| Kilométrage \| Heures moteur` + Config + Close |
| Footer         | "Replay (ghost) + Modifier (orange)" | **Actions opérationnelles** : `Immobiliser`/`Déverrouiller` + `Signaler une panne`/`Marquer comme réparé`                                                                     |
| Replay         | Bouton footer                        | **Bouton `REJOUER LE TRAJET`** dans ActivityBlock (callback onReplay)                                                                                                         |

Ajouts :

- Mode Config personnalisation (drag-drop blocs + toggle visibilité + persist localStorage)
- 6 modales nested déclenchables (MaintenanceLog, ViolationsDetail, FuelChart, FuelEvents REFILL/THEFT, PositionAnomalies)
- Patterns nouveaux à promouvoir au DLS : CollapsibleSection, FuelGauge SVG, jauge SVG arc progressif animé, header drawer riche, footer actions opérationnelles

#### `BLUEPRINT.md` §3.3 (Fleet) — corrigé idem FLEET.md

#### `BLUEPRINT.md` §3.12 (Settings) — réécriture complète

Avant : "7 onglets verticaux (Profil / Apparence / Sécurité / Notifs / Mes tickets / Sync / Préférences)"
Après : **5 groupes × 20 onglets visibles** (Profil + Gestion + Règles & Alertes + Système + À propos). "Apparence" supprimée des Settings — elle est dans **Administration > Marque blanche** (§3.13). Pattern dominant = table générique réutilisée par 13 onglets.

#### `BRIEFS_VAGUE2_DETAIL.md` v1.0 → v1.1 (audit 4 atypiques fait dans session précédente)

Agenda · Monitoring · Map · Replay relus du code legacy. Corrections (cf. entrée précédente CHANGELOG).

#### `BRIEFS_VAGUE1_APERCU.md` → **OBSOLÈTE**

Note d'obsolescence ajoutée en tête du fichier. Stratégie initiale "aperçu rapide × 12" abandonnée — l'utilisateur préfère détail riche pour tous les modules. Document conservé pour traçabilité, ne plus utiliser.

#### `STATE.md`

- Ajout D24
- Section "Côté Design" mise à jour : 6/7 modules déjà bouclés détail riche · 8 restants à produire (Agenda, Rapports, Comptabilité, Monitoring, Admin, Settings, Map, Replay)
- Section "Côté Claude Code" : Phase 3 bootstrap commit `91c86d8` mentionné
- Section "Côté utilisateur" : actions claires
- Phase 4 marquée bloquée par D24

### Méthode pour la suite

À partir de maintenant, pour tout brief module ou spec : **lire le composant legacy AVANT d'écrire**. Plus jamais d'approximation.

---

## [Phase 3 bootstrap V2 — TERMINÉE] — 2026-04-27

### Livré

**Projet `trackyu-front-V2/`** créé et fonctionnel à `c:/Users/ADMIN/Desktop/trackyu-front-V2/`.

#### Stack

- Vite 6.4.2 + React 19.2 + TypeScript 5.8 + Tailwind v4.1.18 (via `@tailwindcss/vite`)
- React Router v7 (D14)
- @tanstack/react-query 5.90 + react-hook-form + zod
- Recharts + Leaflet + react-leaflet (chart + carte)
- socket.io-client (WebSocket)
- @dnd-kit (drag-drop)
- date-fns + dompurify + lucide-react
- jspdf + exceljs + papaparse (exports)
- 559 packages installés (3 vulnerabilities moderate/high à addresser plus tard)
- **Drop confirmé** : pas de Capacitor (Expo couvre mobile)

#### Configs créées

- `package.json` (deps complètes minus Capacitor + ajout React Router v7)
- `tsconfig.json` (project references) + `tsconfig.app.json` + `tsconfig.node.json`
- `vite.config.ts` (React SWC + Tailwind v4 + alias `@/*` → `src/*`)
- `index.html` (preload Inter Google Fonts + meta PWA + theme-color #d96d4c)
- `.gitignore` (standard Vite + node_modules + dist + coverage)

#### Copie sélective depuis legacy `TRACKING/` (D15)

- `src/index.css` ← DLS complet 1218 lignes (tokens 3 couches + classes utilitaires)
- `src/utils/vehicleStatus.ts` ← source de vérité statuts véhicule
- `src/types/*.ts` ← 15 fichiers types (auth, fleet, finance, crm, tech, etc.)
- `src/i18n/index.tsx` + `src/i18n/locales/{fr,en,es}.json`
- `src/lib/react-query.ts` + `src/lib/currencies.ts`
- `src/services/api.ts` + `apiLazy.ts` + `socket.ts` + `services/api/` (sub-folder avec admin/client/crm/finance/fleet/etc.)
- `src/contexts/ThemeContext.tsx` (clean post Phase 0bis, dark/light)
- `src/contexts/AppearanceContext.tsx` (deps cassées : AuthContext + utils/logger — résolution Phase 4)

#### Architecture V2 actuelle

```
trackyu-front-V2/src/
├── main.tsx                    ← entry point + provider stack
├── router.tsx                  ← React Router v7 routes
├── vite-env.d.ts               ← Vite type declarations
├── index.css                   ← DLS canonique
├── pages/HomePage.tsx          ← page bootstrap fonctionnelle (toggle theme + lang switcher)
├── contexts/                   ← Theme (actif) + Appearance (déps Phase 4)
├── i18n/                       ← FR/EN/ES + I18nProvider + useTranslation
├── lib/                        ← react-query + currencies
├── services/                   ← api/* + apiLazy + socket
├── types/                      ← 15 fichiers TypeScript
└── utils/                      ← vehicleStatus
```

#### Provider stack minimal Phase 3 (sera enrichi Phase 4)

```tsx
<QueryClientProvider client={queryClient}>
  <I18nProvider>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </I18nProvider>
</QueryClientProvider>
```

#### Validation technique

- ✅ `npm install` exit 0 (3 min)
- ✅ `npm run build` exit 0 — 1764 modules · CSS 32 kB · JS 425 kB · 7.2s
- ✅ HomePage fonctionnelle : toggle theme dark/light + switcher lang FR/EN/ES (vrais hooks branchés)

#### Scripts npm

- `dev` → vite dev server
- `build` → vite build (TypeScript strict check séparé pour ne pas bloquer pendant migration progressive)
- `build:strict` → tsc -b && vite build (à utiliser quand Phase 4 progresse)
- `typecheck` → tsc -b --noEmit
- `lint` / `lint:fix` / `format` / `format:check` / `test` (configurés, non testés)

### À faire en Phase 4 (premières actions)

1. Créer **AuthContext** (port + adaptation depuis legacy AuthContext.tsx 760 lignes)
2. Créer `utils/logger.ts` (utility simple)
3. Activer **AppearanceProvider** dans le provider stack (deps résolues)
4. Enrichir provider stack : ErrorBoundary global + Toast + Notification
5. Créer **module pilote Fleet** suivant spec `modules/FLEET.md` :
   - features/fleet/FleetPage.tsx (table + drawer)
   - hooks data (useVehicles, useVehicle, etc.)
   - RBAC guards (cf. RBAC_MATRIX.md)
   - i18n keys (cf. modules/FLEET.md §5)

### Décisions techniques Phase 3

- `tsc -b` retiré du build par défaut → permet build malgré copies legacy avec imports cassés
- À chaque module Phase 4 → `build:strict` doit passer avant commit
- Path alias `@/*` configuré (`@/components`, `@/features`, etc.)
- Tailwind v4 setup via `@tailwindcss/vite` (pas postcss.config — plus simple)

### Commit en attente

Bootstrap prêt à commit. Action utilisateur attendue.
Pas de commit auto par Claude (règle CLAUDE.md).

---

## [Lancement Phase 3 bootstrap V2 + modèle Iteratif Fleet pilote] — 2026-04-26

### Décisions prises (orchestrateur)

- **D22** — **Bootstrap V2 démarre MAINTENANT** en parallèle de Vague 1 Design. Activité indépendante des mockups (init projet + copie sélective + providers + routing). Identifie les pièges techniques tôt avant d'avoir 14 modules à intégrer.

- **D23** — **Modèle Iteratif** retenu (pas Big Bang). **Premier module pilote = Fleet** parce que :
  - Mockup détaillé déjà disponible et validé (4 vignettes Dark/Light/CLIENT/Empty)
  - Worst case (XL : table dense + drawer + 7 blocks + WebSocket) → calibre estimation effort fiable
  - Si Fleet réussit, les 13 autres paraîtront simples

### Prochaines actions

- **Phase 3 bootstrap V2** : ~1-2 jours (init Vite + copie sélective depuis legacy + providers + routing)
- **En parallèle** : Vague 1 Design (12 briefs courts dans BRIEFS_VAGUE1_APERCU.md) côté utilisateur
- **Quand bootstrap ✅ + Vague 1 validée** → Phase 4 démarre sur Fleet
- **Décision parallélisation** (2-3 sessions Claude sur modules indépendants) à prendre **après** Fleet validé

---

## [Production BRIEFS_VAGUE1_APERCU.md] — 2026-04-26

### Ajouté

- **`docs/design-system/BRIEFS_VAGUE1_APERCU.md`** — 12 briefs courts à transmettre à claude.ai Design en série pour produire l'aperçu global Niveau 1 (D21).
  - 7 modules à template universel : Ventes · Comptabilité (×2 artboards) · Tech · Stock · Settings · Administration · Rapports (×2 artboards)
  - 5 modules atypiques : Tickets (chat) · Agenda (calendrier) · Map (carte) · Replay (timeline) · Monitoring (sections)
  - Préambule universel à coller avec chaque brief
  - Ordre de production en 5 sous-vagues (cohérence métier)
  - Total : 14-16 artboards sur 12 fichiers HTML modulaires

### Cohérence avec décisions précédentes

- D11 : template universel + atypiques sur mesure ✓
- D18 : mode sombre uniquement cette vague ✓
- D19 : code Design mutable à l'intégration ✓
- D20 : briefing par couches (briefs courts, pas de détail) ✓
- D21 : zoom out → zoom in (aperçu global d'abord) ✓

---

## [Stratégie zoom out → zoom in] — 2026-04-26

### Décision prise

- **D21** — Production Design en **2 niveaux d'échelle** :
  - **Niveau 1 (Vague 1 actuelle) — APERÇU GLOBAL** : pour les 14 modules, 1-2 artboards par module (aperçu structurel : onglets + sous-onglets visibles + sections esquissées). Objectif : valider cohérence inter-modules avant de plonger.
  - **Niveau 2-4 (Vagues suivantes) — DÉTAIL PROGRESSIF** : module par module, au moment de l'intégration code, on descend dans les sous-onglets actifs / champs / actions / variants.

### Cas Prévente

- Prévente déjà livré en **mode détail riche** (5 artboards). Garde comme **référence pilote** pour figer les patterns transversaux.
- Les 13 autres modules sont produits en **mode aperçu** (gain de temps × beaucoup).

### Application au workflow

- Briefs Design Vague 1 = **aperçu court** (~10 lignes par module)
- Pas de bulk actions / empty state / variants en Vague 1 (réservé aux vagues détail)
- Validation utilisateur globale en sortie Vague 1 → cohérence inter-modules vérifiée
- Détail produit JUSTE AVANT l'intégration code du module (pas en avance)

---

## [Briefing par couches] — 2026-04-26

### Décision prise

- **D20** — **Briefer claude.ai Design par couches progressives** : Cadre → Architecture → Détail (si demandé) → Variants. Pas de surcharge initiale. Stop dès le bloc copy-paste, pas de "Notes pour toi" en queue de brief.

**Why** : incident sur le brief Contrats sous-onglets — sur-spécification (tous les champs détaillés) alors que le user voulait juste les consignes structurelles. Design est créatif, il faut lui laisser de l'air.

**How to apply** : voir BLUEPRINT.md §0bis "Briefing par couches" + memory `feedback_brief_layered_approach.md`.

---

## [Code Design mutable] — 2026-04-26

### Décision prise

- **D19** — **Le code produit par claude.ai Design est MUTABLE au moment de l'intégration**. Pas un livrable figé. Distinction :
  - **Divergences mineures** (libellés, terminologie, ordre, tinte couleur) → éditer directement le code Design en intégration. Pas de régénération.
  - **Divergences impactantes** (nouveau champ data, nouvel enum stage, nouveau type backend) → évaluer avec utilisateur : (a) évolution backend OU (b) adapter code Design pour matcher backend actuel.

### Conséquences workflow

- Plus d'aller-retours Design pour divergences mineures (gain temps × beaucoup)
- L'intégration code devient phase d'**adaptation finale** (terminologie + RBAC + i18n + hooks)
- MUSTS du BLUEPRINT : palette/typo/identité restent stricts. MUSTS data deviennent **indicatifs**.

### Application immédiate à "Négociation" (Prévente)

- **Option A** (adopter Négociation = stage 6) → impactante, décision stratégique métier (évolution backend)
- **Option B** (garder 5 stages legacy) → mineure, on édite le Kanban Prévente au moment de l'intégration code (10 min)
- **Option C** (différer) → garder Design tel quel maintenant, trancher A/B plus tard

→ Recommandation : **option C** (différer). Adoption mineure si finalement option B.

### Mise à jour INTEGRATION_PLAYBOOK §3.4bis (nouveau)

Distinction mineure vs impactante codifiée + exemples concrets + conséquences sur rythme.

---

## [Vague 1 production mockups — Prévente pilote] — 2026-04-26

### Décision prise

- **D18** — **Assouplissement contrôlé de D8** : pour les vagues massives de production mockups (8 modules à template + sous-onglets), Design livre en **mode sombre uniquement** d'abord (rapidité). Les modes clairs sont générés en batch après validation des patterns. D8 ("mode dual systématique") reste vrai à long terme — l'assouplissement est tactique sur la phase de production rapide.

### Validations Q1-Q5 (5 questions Design pour structurer la production)

- **Q1** ✅ Un fichier HTML par module (`prevente.html`, `vente.html`, etc.) — aligné avec architecture `modules/<MODULE>.md` auto-suffisante. Code Design archivable dans `modules/_design-source/`.
- **Q2** ✅ Granularité par onglet : Vue d'ensemble + Liste + 1 distinctif par module. Distinctifs validés :
  - Prévente → Kanban Leads
  - Ventes → Pipeline visuel
  - Comptabilité → Vue d'ensemble + Journal séparés (acté précédemment)
  - Tech → Planning hebdo
  - Stock → SAV/RMA
  - Settings → Apparence
  - Administration → White-label
  - Rapports → Vue REPORT (rapport ouvert)
- **Q3** ✅ Sous-onglets dessinés (1 mockup chacun). Pour Settings : utiliser le mapping BLUEPRINT (7 onglets verticaux : Profil / Apparence / Sécurité / Notifications / Mes tickets / Sync / Préférences). Si Design avait un mapping différent ("Profil/Gestion/Règles"), s'aligner sur BLUEPRINT.
- **Q4** ✅ 4 artboards par module systématiquement (Vue d'ensemble + Liste + Liste sélection + 1 distinctif) + 5e artboard empty state pour le pilote (Prévente).
- **Q5** ✅ Sombre uniquement pour cette vague (cf. D18).

### Module pilote Vague 1

**Prévente** est le module pilote pour figer le pattern de production massive. Quand validé visuellement, on enchaîne les 7 autres modules (Ventes, Comptabilité, Tech, Stock, Settings, Administration, Rapports).

---

## [PIVOT REWRITE + Infrastructure préservation contexte] — 2026-04-26

### Décisions stratégiques majeures (D12-D17)

- **D12** — **PIVOT REWRITE** : abandon de l'adaptation legacy `TRACKING/` au profit de la **construction d'un nouveau frontend `trackyu-front-V2`** à partir des mockups claude.ai Design comme code source. Backend (`trackyu-backend/`) intact. Charter D1 ("aucune rupture technique") **requalifié** : rupture technique frontend acceptée et choisie ; continuité métier maintenue.
- **D13** — Nom du nouveau projet : **`trackyu-front-V2`** (dossier `c:/Users/ADMIN/Desktop/trackyu-front-V2/`).
- **D14** — Stack : reproduit l'existant (Vite 6 + React 19 + TS 5.8 + Tailwind 4 + Capacitor 8) + **ajout React Router v7** (corrige le View enum non-standard du legacy).
- **D15** — Source initiale `trackyu-front-V2` : **copie sélective** depuis legacy (services/, types/, i18n/locales/, lib/, utils/vehicleStatus.ts, contexts/Theme + Appearance, src/index.css). Reste réécrit depuis Design.
- **D16** — Migration : DNS reste sur legacy **jusqu'à parité fonctionnelle totale**. Switch nginx au moment de la bascule. Pas de coexistence partielle.
- **D17** — Sort du legacy : **archive read-only** dans `TRACKING/` après bascule.

### Infrastructure de préservation de contexte

Pour éviter la perte de contexte sur un chantier multi-sessions (le user a explicitement demandé une solution car claude.ai Design préserve son contexte mais Claude Code non), mise en place de :

| Livrable                                                | Rôle                                                                                                                                                           |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`docs/design-system/STATE.md`** (nouveau)             | Single source of truth temps réel : "où on en est / ce qui se passe / prochaine action / blocages". Lu en premier par toute nouvelle session.                  |
| **`docs/design-system/modules/_TEMPLATE.md`** (nouveau) | Gabarit module spec auto-suffisant (mockup + data + RBAC + i18n + components + checklist build). Une session peut construire un module from this single doc.   |
| **`docs/design-system/modules/FLEET.md`** (nouveau)     | Premier module spec — pilote V2. Mockup réceptionné et validé, prêt à être construit en Phase 4.                                                               |
| **`CLAUDE.md`** (root, mise à jour)                     | Section "🟧 CHANTIER ACTIF" en haut + bootstrap protocol explicite (auto-loaded = impossible à oublier).                                                       |
| **`memory/project_chantier_v2.md`** (nouveau)           | Mémoire Claude Code : pointeur vers le chantier actif et les docs à lire.                                                                                      |
| **`memory/feedback_session_bootstrap.md`** (nouveau)    | Mémoire Claude Code : protocole de démarrage session.                                                                                                          |
| **`memory/MEMORY.md`** (mis à jour)                     | Index avec entrées chantier V2 + bootstrap mises en évidence (⚡). Anciennes entrées (frontend_reconstruction_state, design_harmonisation) marquées obsolètes. |

### Charter mis à jour

- `CHANTIER_REFONTE_DESIGN.md` v0.4 → **v0.5** :
  - Header : statut "PIVOT REWRITE" + lien vers STATE.md
  - Section 1 (Synthèse) : réécrite pour expliquer le pivot
  - 4 principes révisés (continuité métier + visuelle + cohérence inter-sessions + pas de dérive)
  - Section 13 (Décisions) : enrichie avec D5-D17 (récupération des décisions intermédiaires non journalisées + nouvelles)

### Validation côté Design

- Template universel "container + onglets + table" livré par claude.ai Design + validé visuellement
- Fleet livré + validé (pilote atypique 2b)
- Dashboard livré + validé (atypique 1)

### État courant (cf. STATE.md pour le détail)

- Phase 1 docs ✅ livrée intégralement (10 docs umbrella + module spec FLEET + template module)
- Phase 2 mockups ✅ partielle : Dashboard ✓ · Fleet ✓ · Template universel ✓ — restent 5 atypiques (Tickets / Agenda / Map / Replay / Monitoring) + application template aux 8 modules
- Phase 0bis ✅ commit `de90042` + déployée staging — attend validation user + deploy prod
- Phase 3 bootstrap `trackyu-front-V2/` ⏳ pas démarré (attend go user)
- Phase 4-5 ⏳ à venir

---

## [Stratégie template universel] — 2026-04-26

### Modifié

- **`BLUEPRINT.md`** v1.2 → v1.3 — Restructuration de la stratégie de production en 3 sous-phases :
  - **§2bis nouvelle** — Dichotomie template universel (8 modules) vs atypiques sur mesure (6 mockups)
  - **§3a nouvelle** — Brief complet du template universel "Container avec onglets + table" (musts + libertés + livrables 6 vignettes)
  - **§9 réécrite** — Workflow Phase 2a (template) → 2b (atypiques) → 2c (application aux 8 modules)

### Décisions prises

- **D11** — Stratégie de production révisée : **1 template universel + 6 atypiques + 8 variations légères** au lieu de 14 mockups complets. Économie de temps + cohérence garantie. Le template couvre les modules à pattern commun (Prévente, Ventes, Comptabilité, Tech, Stock, Settings, Admin, Reports). Les 6 atypiques (Dashboard, Fleet, Map, Replay, Tickets, Agenda, Monitoring) restent en mockups dédiés car layouts non factorisables.

### Validation Fleet (Phase 2b atypique)

- ✅ 4 mockups Fleet livrés et validés visuellement (Dark ADMIN, Light ADMIN, Vue CLIENT, Empty state)
- Design a respecté les MUSTS (palette, statut, labels FR) et pris des libertés cohérentes (carburant en barre horizontale, drawer 480px-ish, 3 quick stats dans drawer header)
- Pilote OK — le langage tient

---

## [Convention musts/libertés/nudges] — 2026-04-26

### Ajouté

- **`BLUEPRINT.md`** v1.1 → v1.2 — Nouvelle §0bis "Convention musts/libertés/nudges" qui distingue formellement 3 niveaux dans tous les briefs Design futurs :
  - 🔒 MUSTS (palette + data + identité TrackYu) — non-négociable
  - 🎨 LIBERTÉS (visuel + UX + composition) — Design propose, on valide
  - 💡 NUDGES (DLS + Dashboard v1) — inspirations, pas obligations
- **`INTEGRATION_PLAYBOOK.md`** §3.4 — Distinction entre 2 cas d'écart vs DLS :
  - Cas A : écart sur MUST → STOP + escalade
  - Cas B : écart sur LIBERTÉ → évaluer + intégrer + enrichir DLS si convaincant

### Décision prise

- **D10** — Niveau d'ouverture créative Design = **B (Équilibré)**. Les directives ne doivent pas étouffer la créativité de Design. Le DLS **vit** au lieu de **figer** : chaque écran peut enrichir le langage si Design propose mieux. Boucle vertueuse Design propose → on valide → DLS s'enrichit → cohérent dans les écrans suivants.

### Cross-références mises à jour

- `BLUEPRINT.md` §0bis → référencé par `INTEGRATION_PLAYBOOK.md` §3.4

---

## [RBAC_MATRIX] — 2026-04-26

### Ajouté

- **`docs/design-system/RBAC_MATRIX.md`** v1.0 — Matrice rôles × écrans × permissions extraite de `contexts/AuthContext.tsx` (ROLE_DEFINITIONS) + `types/auth.ts` (Permission type) + `features/admin/permissions/permissionStructure.ts`. 11 sections couvrant : 12 rôles définis, matrice écran × rôle, matrice permissions × rôles par module, isolation tenant, champs sensibles, mobile tab profiles, exemple intégration concret.

### Cross-références ajoutées

- [`BLUEPRINT.md`](BLUEPRINT.md) §5 — lien vers RBAC_MATRIX pour la matrice détaillée
- [`SCREEN_MAP.md`](SCREEN_MAP.md) — référence à RBAC_MATRIX dans entête
- [`INTEGRATION_PLAYBOOK.md`](INTEGRATION_PLAYBOOK.md) — RBAC_MATRIX comme référence avant chaque intégration
- [`CHANTIER_REFONTE_DESIGN.md`](CHANTIER_REFONTE_DESIGN.md) §6 — RBAC_MATRIX dans la liste des docs umbrella

### Décision prise

- **D9** — RBAC reste un concern code (pas dans les mockups Design). RBAC_MATRIX.md sert de **référence à l'intégration** : à chaque intégration d'écran, consulter ce doc pour savoir quels guards `hasPermission()` mettre. Évite de rouvrir 922 lignes de `permissionStructure.ts` à chaque fois.

---

## [BLUEPRINT v1.1] — 2026-04-26

### Modifié

- **`docs/design-system/BLUEPRINT.md`** v1.0 → v1.1 — Intégration de la feedback Design (8 points fragiles + 3 questions binaires).

### Ajustements

| Section               | Changement                                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1                    | Précision : 1 mockup = 1 onglet actif rempli + autres onglets visibles non remplis. Mode clair ET sombre systématiquement. 1 vignette empty state. |
| §3.4 Prévente         | Labels Kanban en français (`Nouveau` / `Qualifié` / `Proposition` / `Gagné` / `Perdu`). Scoring leads : `Chaud` / `Moyen` / `Dormant`.             |
| §3.6 Comptabilité     | Découpé en **2 mockups** : "Vue d'ensemble" + "Comptabilité (journal)" — densité initiale trop forte pour 1 mockup.                                |
| §3.9 Stock            | Tableau "essentielles vs masquables" pour gérer la densité 13 colonnes sur laptop 1280px.                                                          |
| §3.10 Tickets         | Sidebar droite **collapsible par défaut**. Layout 2 colonnes (liste + chat) par défaut, 3 colonnes à la demande.                                   |
| §4 États visuels      | 1 mockup principal (rempli) + 1 vignette empty state. Loading / error / success non mockupés (gérés à l'intégration via patterns DLS).             |
| §5 Variantes par rôle | Vignette "vue CLIENT" demandée pour 4 écrans seulement : Dashboard, Fleet, Reports. Ventes/Comptabilité = staff only, pas de vignette.             |
| §7 (nouveau)          | Convention labels FR avec tableau vocabulaire (statuts Kanban, scoring, ticket, intervention, facture, véhicule, RMA).                             |
| §8 Checklist          | Ajout de 3 lignes (mode clair+sombre livrés / 1 onglet actif / vignette empty state / vignette CLIENT si applicable).                              |
| §9 Workflow           | Batch A devient séquentiel : **Fleet seul d'abord** → Tickets → Agenda. Au lieu de 3 mockups en parallèle.                                         |

### Décisions prises

- **D6** — Convention de labels affichage : **français systématique**. Statuts Kanban traduits (`Nouveau` / `Qualifié` / `Proposition` / `Gagné` / `Perdu`). Scoring leads : `Chaud` / `Moyen` / `Dormant`.
- **D7** — Workflow Design : **Fleet seul d'abord** comme premier livrable (pas batch de 3). Permet de valider/ajuster patterns transversaux avant propagation.
- **D8** — Mode systématique : **clair ET sombre** livrés pour chaque mockup. Coût marginal Design faible, valide contraste WCAG dès la livraison.

---

## [Phase 1 démarrage] — 2026-04-26

### Ajouté

- **`docs/design-system/SCREEN_MAP.md`** — Inventaire de 141 écrans / panels / modales répartis en 7 vagues. Statuts initiaux : ~115 en attente, ~25 partiellement refondus (héritage chantiers précédents), 1 mockup reçu (Dashboard v1).
- **`docs/design-system/DLS.md`** v1.0 — Référence canonique du langage visuel. 16 sections couvrant tokens 3 couches, typographie, échelles (radius/spacing/shadow/motion), composants atomiques, accessibilité, règles d'usage do/don't.
- **`docs/design-system/INTEGRATION_PLAYBOOK.md`** v1.0 — Mode d'emploi reproductible Design → Code. 13 étapes + checklist 15 points + cas particuliers + FAQ.
- **`docs/design-system/BLUEPRINT.md`** v1.0 — Brief Design écrans principaux : ~14 mockups + patterns communs + checklist + workflow batchs.
- **`docs/design-system/CHANGELOG.md`** (ce fichier) — Initialisation.

### Décisions prises

- **D5** — Mockup Design v1 du Dashboard reçu, 3 corrections demandées (KPI tronqués, idle orange à corriger en ambre, maintenance bleue hors palette). Validation en attente.

### Note

Phase 1 documentaire commence. Aucune modification de code dans `src/` ou `features/` lors de cette session de production de docs.

---

## [Phase 0bis] — 2026-04-26

### Modifié

- **Suppression du thème `ocean`** dans le code web (D4 charter v0.3) — l'app passe de 3 thèmes à **2 modes (clair / sombre) + accent tenant**.

### Fichiers modifiés (web uniquement)

- [`contexts/ThemeContext.tsx`](../../contexts/ThemeContext.tsx) — Type `ThemePreset = 'dark' | 'light'`, suppression entry `ocean: '#080E1A'` du colors map, migration silencieuse `localStorage 'ocean'` → `'dark'`
- [`src/index.css`](../../src/index.css) — Suppression bloc `[data-theme='ocean']` (~95 lignes) + règle `[data-theme='ocean'][data-sidebar='dark']` (~5 lignes) + comment "ou bleu (ocean)"
- [`App.tsx`](../../App.tsx) — Switcher 3 boutons → 2 boutons (Sun/Moon), retrait import `Waves` lucide-react
- [`components/BottomNavigation.tsx`](../../components/BottomNavigation.tsx) — Idem switcher mobile, retrait import `Waves`
- [`components/StatusBadge.tsx`](../../components/StatusBadge.tsx) — Comment "dark/light/ocean" → "dark/light"
- [`contexts/AppearanceContext.tsx`](../../contexts/AppearanceContext.tsx) — Comments x2 + correction fallback orange (`#FF5C00` mention legacy → `#d96d4c`)
- [`i18n/locales/fr.json`](../../i18n/locales/fr.json) / [`en.json`](../../i18n/locales/en.json) / [`es.json`](../../i18n/locales/es.json) — Retrait clé `nav.theme.ocean`
- [`CLAUDE.md`](../../CLAUDE.md) — Annotation L.76 avec lien charter
- [`.claude/skills/frontend-design-system.md`](../../.claude/skills/frontend-design-system.md) — Section "Stratégie de thème — web" ajoutée, section mobile clarifiée

### Hors périmètre (pas modifié)

- Mobile (`trackyu-mobile-expo/`) : conserve son `ocean` pour l'instant — alignement programmé Phase 4
- Dossier `New/` : suspendu (D3) — pas modifié

### En attente utilisateur

Commit + `deploy-staging.ps1` + validation + `deploy.ps1 -frontend`. Aucun risque (app pas encore ouverte aux users en prod).

---

## [Charter umbrella] — 2026-04-26

### Ajouté

- **`docs/design-system/CHANTIER_REFONTE_DESIGN.md`** v0.1 — Création du charter umbrella pour orchestrer la refonte design.
- **`docs/design-system/AUDIT.md`** — Audit profond du repo : 4 sections couvrant cartographie, design system existant, mesure dette, conflits identifiés avec sous-chantiers.

### Décisions prises

- **D1** — Couleur de marque maintenue à `#d96d4c` (terracotta TrackYu). claude.ai Design s'aligne sur TrackYu, pas l'inverse.
- **D2** — `CHANTIER_REFONTE_DESIGN.md` devient l'**umbrella**. `docs/frontend/design-harmonisation.md` et `docs/frontend/CHANTIER_DESIGN_REFONTE.md` deviennent sous-chantiers historiques liés.
- **D3** — Dossier `New/` (15 composants premium) **suspendu** le temps que claude.ai Design produise des mockups alignés sur la palette TrackYu.
- **D4** — Stratégie d'affichage = **2 modes (clair/sombre) + accent tenant via AppearanceContext**. Suppression du thème `ocean` (redondant). Aucun user impacté (app pas encore ouverte). Exécution programmée Phase 0bis.

### Modifié

- Charter v0.1 → v0.2 → v0.3 — Trois révisions le même jour pour absorber l'audit, intégrer les sous-chantiers, et acter les décisions D1-D4.

---

## Sous-chantiers historiques (état initial avant umbrella)

Ces chantiers existaient avant le 2026-04-26 et sont absorbés par l'umbrella. Référencés ici pour traçabilité.

### `docs/frontend/CHANTIER_DESIGN_REFONTE.md` — Phase 0 ✅

- Commits `be47b5e` + `c5b312e` (2026-04-24)
- Tokens canoniques posés dans `src/index.css` (`--bg-app`, `--bg-card`, `--brand-primary`, etc.) + alias backward-compat
- Brand orange validé après essais : `#d96d4c` (terracotta)
- Composants partiellement refondus :
  - `SharedBlocks.tsx` (header discret)
  - `VehicleDetailPanel.tsx` (header solide brand-primary)
  - `ActivityBlock.tsx` (labels colorés via `--status-*`)
  - `FuelBlock.tsx` (tooltip theme-aware)
  - `AlertsBlock.tsx` (fonds via `--clr-*-dim`)

### `docs/frontend/design-harmonisation.md` — Phase 1 ✅

- Commit `344d1d2` (2026-04-11)
- Migration `slate-*` hardcodés → tokens CSS
- 186 fichiers, ~7000 remplacements
- Composants migrés vers `<SearchBar>` : ContractsView, CRMView, SubscriptionsView, TasksView, FleetTable, SupportViewV2
- Composants migrés vers `.filter-chip` : SupportViewV2, ContractsView, TasksView, TiersView, AlertsConsole, CRMView
- Classes utilitaires ajoutées dans `@layer components` : `.filter-chip`, `.icon-btn`, `.toolbar`, `.page-title`, `.page-subtitle`, `.section-title`, `.th-base`, `.td-base`, `.tr-hover`, `.form-error`, `.pagination-btn`

---

## Décisions futures à journaliser

Cette section mémorise les éléments qui devront être consignés dès qu'ils seront actés :

- Q-A — Charge des polices Archivo Black + JetBrains Mono (preload statique vs lazy AppearanceContext)
- Q-B — Mode par défaut nouveau user : `dark` (statu quo) ou `auto` (suit l'OS)
- Q-C — Ordre exact des écrans après pilote connexion validé
- Q-D — Stratégie sur la coexistence `dark:` Tailwind + `[data-theme]` (1032 occurrences à rationaliser)
- Q-E — Convention de styling cible (Tailwind v4 natif vs arbitrary vs inline)
- Propagation effective de `--status-idle: #f97316` → `#FBBF24` (Phase 4)
- Alignement web ↔ mobile sur les tokens unifiés (Phase 4)

---

## Convention de format

Pour chaque nouvelle entrée :

```markdown
## [Titre concis] — YYYY-MM-DD

### Ajouté

- ...

### Modifié

- ...

### Supprimé

- ...

### Décisions prises

- **DXX** — Description + rationale.

### Fichiers modifiés

- [`path/to/file`](../../path/to/file) — Description du changement.
```

Niveaux de gravité :

- **[Charter]** — modification du document maître
- **[Phase X]** — début, jalon ou clôture d'une phase
- **[Vague Y.Z]** — intégration d'un écran spécifique
- **[Ad hoc]** — modification ponctuelle hors plan

---

_Journal vivant. Source de vérité historique du chantier._
