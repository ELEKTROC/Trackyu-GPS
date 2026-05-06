# SCREEN MAP — Inventaire des écrans TrackYu Frontend Web

> Tableau de bord du chantier de refonte design.
> Référencé par [CHANTIER_REFONTE_DESIGN.md](CHANTIER_REFONTE_DESIGN.md) section 6.
> **Mis à jour à chaque écran intégré** — c'est le tracker vivant.
> Pour les permissions par écran et rôle, voir [RBAC_MATRIX.md](RBAC_MATRIX.md) §2.
>
> Dernière mise à jour : 2026-04-26

---

## Légende

### Statut écran

| Symbole | Signification                                                           |
| ------- | ----------------------------------------------------------------------- |
| ⬜      | Audit non commencé                                                      |
| 📋      | Audit fait, mockup Design en attente                                    |
| 🎨      | Mockup Design reçu, à confronter au DLS                                 |
| 🔧      | Intégration en cours dans le repo                                       |
| 🧪      | Intégré, en validation staging                                          |
| ✅      | Validé prod                                                             |
| 🟡      | Partiellement refondu (chantier antérieur `harmonisation` ou `refonte`) |
| ⏸       | Suspendu                                                                |

### Type de production Design (D11)

| Type            | Approche                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟦 **Template** | Module utilisant le template universel "container + onglets + table" (cf. [BLUEPRINT §3a](BLUEPRINT.md)) — production légère via injection de contenu |
| 🟪 **Atypique** | Module avec layout dédié non factorisable — mockup sur mesure                                                                                         |

Modules **template** (8) : Prévente · Ventes · Comptabilité · Tech · Stock · Settings · Administration · Rapports

Modules **atypiques** (7) : Dashboard ✓ · Fleet ✓ · Map · Replay · Tickets · Agenda · Monitoring

### Difficulté d'intégration

| Symbole | Estimation effort                                                        |
| ------- | ------------------------------------------------------------------------ |
| **S**   | Petit (≤ 1h) — composant simple, peu de logique                          |
| **M**   | Moyen (1–4h) — logique moyenne, plusieurs sous-composants                |
| **L**   | Lourd (≥ 4h) — composant complexe, beaucoup de hooks, WS, virtualisation |
| **XL**  | Très lourd (≥ 1j) — refonte profonde (Dashboard, FleetTable)             |

### Dépendances métier critiques (à préserver lors de l'intégration)

| Code             | Dépendance                                           |
| ---------------- | ---------------------------------------------------- |
| `auth`           | Hooks `useAuth`, guards rôles, isolation tenant      |
| `data`           | Hook `useDataContext` (vehicles, zones, alerts)      |
| `ws`             | Socket.io temps réel (positions, alertes, statuts)   |
| `i18n`           | Clés `t('...')` FR/EN/ES                             |
| `react-query`    | Hooks `useQuery` / `useMutation` API                 |
| `lazy`           | Composant chargé via `React.lazy` ou `LazyViews.tsx` |
| `leaflet`        | Carte interactive (markers, clusters, heatmap)       |
| `recharts`       | Graphes (AreaChart, BarChart, PieChart)              |
| `dnd-kit`        | Drag & drop                                          |
| `signature`      | Pad signature (intervention)                         |
| `export`         | jsPDF / ExcelJS / papaparse                          |
| `virtualization` | react-window pour listes longues                     |

---

## Stack des chantiers passés

Pour comprendre l'état initial de chaque écran :

| Chantier                                                        | Action sur les écrans                                                                                                                                                                                                      | Référence                                                                            |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Harmonisation** Phase 1 (commit `344d1d2`, 2026-04-11)        | Migration `slate-*` → tokens CSS sur 186 fichiers, ~7000 remplacements. Compose, ContractsView, CRMView, SubscriptionsView, TasksView, FleetTable, SupportViewV2 ont été notamment refactorisés (SearchBar / filter-chip). | [`docs/frontend/design-harmonisation.md`](../frontend/design-harmonisation.md)       |
| **Refonte** Phase 0 (commits `be47b5e` + `c5b312e`, 2026-04-24) | Tokens canoniques posés. SharedBlocks, VehicleDetailPanel header, ActivityBlock, FuelBlock, AlertsBlock partiellement refondus.                                                                                            | [`docs/frontend/CHANTIER_DESIGN_REFONTE.md`](../frontend/CHANTIER_DESIGN_REFONTE.md) |
| **Phase 0bis umbrella** (2026-04-26)                            | Suppression thème ocean, switcher 2 modes (clair/sombre), brand `#d96d4c` confirmé.                                                                                                                                        | [`CHANTIER_REFONTE_DESIGN.md`](CHANTIER_REFONTE_DESIGN.md)                           |

---

## Vague 1 — Chrome & Auth (fondations utilisateur)

Sans chrome / auth, aucun écran ne se justifie. **Vague pilote** : à intégrer en premier.

| #   | Écran                        | View enum       | Composant principal                                                                                        | Statut                             | Difficulté | Dépendances                       | Notes                                                                                                                                  |
| --- | ---------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | **Connexion**                | (pré-auth)      | [`features/auth/components/LoginView.tsx`](../../features/auth/components/LoginView.tsx)                   | 🎨 mockup v1 reçu                  | M          | `auth`, `i18n`                    | Premier mockup connexion reçu. Doit être regénéré avec palette TrackYu (`#d96d4c`) avant intégration. Pages auth = full dark immersif. |
| 1.2 | **Activation compte**        | (token URL)     | [`features/auth/components/ActivationPage.tsx`](../../features/auth/components/ActivationPage.tsx)         | 📋                                 | M          | `auth`, `i18n`                    | Cas où l'URL contient `?token=...`. Cohérent visuellement avec connexion.                                                              |
| 1.3 | **Reset mot de passe**       | (forced flow)   | [`features/auth/components/ChangePasswordView.tsx`](../../features/auth/components/ChangePasswordView.tsx) | 📋                                 | S          | `auth`, `i18n`                    | Forcé après login si `requirePasswordChange`.                                                                                          |
| 1.4 | **Sidebar** desktop          | (chrome global) | [`components/Sidebar.tsx`](../../components/Sidebar.tsx)                                                   | 🎨 mockup dashboard inclut sidebar | M          | `auth`, `i18n`, AppearanceContext | Collapsed 80px / hover expand 256px. 5 groupes, 14 items. Présent dans le mockup dashboard v1.                                         |
| 1.5 | **Header**                   | (chrome global) | [`App.tsx`](../../App.tsx) (header inline)                                                                 | 🎨 mockup dashboard inclut header  | M          | `auth`, `i18n`                    | Search Ctrl+K, theme switcher 2 boutons (post 0bis), refresh, notifications, date.                                                     |
| 1.6 | **Bottom navigation** mobile | (chrome mobile) | [`components/BottomNavigation.tsx`](../../components/BottomNavigation.tsx)                                 | 📋                                 | M          | `auth`, `i18n`, profil rôle       | Profils mobile par rôle (CLIENT, TECH, COMMERCIAL, FINANCE, SUPPORT, MANAGER, ADMIN, SUPERADMIN).                                      |
| 1.7 | **Drawer mobile menu**       | (overlay menu)  | (dans `App.tsx` + `Sidebar.tsx`)                                                                           | 📋                                 | S          | —                                 | Sliding menu mobile, full-height.                                                                                                      |

**Patterns DLS produits par cette vague** :

- Dark immersif (auth)
- Layout split visual + form (auth)
- Logo mark (triangle terracotta + glow)
- Sidebar collapsed / expanded
- Header pattern (breadcrumb mono · titre principal · actions)
- Theme switcher 2 modes
- Bottom nav mobile

---

## Vague 2 — Operations (cœur métier GPS)

| #    | Écran                    | View enum         | Composant principal                                                                                                                                | Statut                                           | Difficulté | Dépendances                                               | Notes                                                                                                                                                                                                  |
| ---- | ------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1  | **Dashboard**            | `View.DASHBOARD`  | [`features/dashboard/components/DashboardView.tsx`](../../features/dashboard/components/DashboardView.tsx)                                         | 🎨 mockup v1 reçu (3 corrections demandées)      | **XL**     | `auth`, `data`, `recharts`, `lazy`, `react-query`         | 1772 lignes. KPIs adaptés par rôle (CLIENT/TECH/COMMERCIAL/FINANCE/SUPPORT/ADMIN). 4 sections : KPI top · Flotte temps réel · Mini stats · Charts. **Drag & drop à retirer** (décision sous-chantier). |
| 2.2  | **Carte temps réel**     | `View.MAP`        | [`features/map/components/MapView.tsx`](../../features/map/components/MapView.tsx)                                                                 | 📋                                               | **L**      | `auth`, `data`, `ws`, `leaflet`, `lazy`                   | Markers véhicules, clusters, heatmap, zones. **Exception charte** (`border-slate-700/50` documenté). Couleurs statuts à propager (`#FBBF24` idle).                                                     |
| 2.3  | **Replay**               | (sub-mode de Map) | [`features/map/components/ReplayControlPanel.tsx`](../../features/map/components/ReplayControlPanel.tsx)                                           | 📋                                               | **L**      | `auth`, `data`, `leaflet`, `recharts`                     | Timeline 24h colorée, jump-to event (livré 2026-04-25). 36 hex hardcodés à factoriser.                                                                                                                 |
| 2.4  | **Heatmap**              | (overlay carte)   | [`features/map/components/HeatmapLayer.tsx`](../../features/map/components/HeatmapLayer.tsx)                                                       | 📋                                               | S          | `leaflet.heat`                                            | Overlay statique.                                                                                                                                                                                      |
| 2.5  | **Fleet liste** (table)  | `View.FLEET`      | [`features/fleet/components/FleetTable.tsx`](../../features/fleet/components/FleetTable.tsx)                                                       | 🟡 partiellement refondu (Phase 1 harmonisation) | **XL**     | `auth`, `data`, `react-query`, `virtualization`, `export` | **Point chaud** : 28 inline `style={{ backgroundColor }}` + 26 `dark:` + couleurs hardcodées. Le `New/FleetTable.tsx` propose une refonte complète (suspendu D3).                                      |
| 2.6  | **Vehicle detail panel** | (overlay)         | [`features/fleet/components/VehicleDetailPanel.tsx`](../../features/fleet/components/VehicleDetailPanel.tsx)                                       | 🟡 header refondu (Phase 0 sous-chantier)        | **L**      | `auth`, `data`, `ws`, `react-query`, `lazy`               | Panel latéral. 5 blocs détail à intégrer avec mockups Design.                                                                                                                                          |
| 2.7  | **Bloc Activity**        | (sous-bloc)       | [`features/fleet/components/detail-blocks/ActivityBlock.tsx`](../../features/fleet/components/detail-blocks/ActivityBlock.tsx)                     | 🟡 labels colorés (Phase 0 sous-chantier)        | M          | `data`                                                    | Conduite/Ralenti/Arrêt/Hors ligne via `--status-*`. À refondre en glass card + grille télémétrie 2×2.                                                                                                  |
| 2.8  | **Bloc Behavior**        | (sous-bloc)       | [`features/fleet/components/detail-blocks/BehaviorBlock.tsx`](../../features/fleet/components/detail-blocks/BehaviorBlock.tsx)                     | 📋                                               | M          | `data`                                                    | Refonte : jauge SVG circulaire score + 3 stats (Freinages/Accél/Virages).                                                                                                                              |
| 2.9  | **Bloc Alerts**          | (sous-bloc)       | [`features/fleet/components/detail-blocks/AlertsBlock.tsx`](../../features/fleet/components/detail-blocks/AlertsBlock.tsx)                         | 🟡 fonds via `--clr-*-dim`                       | M          | `data`                                                    | Border-l-2 coloré par sévérité (HIGH/MED/LOW).                                                                                                                                                         |
| 2.10 | **Bloc Gps**             | (sous-bloc)       | [`features/fleet/components/detail-blocks/DeviceHistoryBlock.tsx`](../../features/fleet/components/detail-blocks/DeviceHistoryBlock.tsx)           | 📋                                               | M          | `data`                                                    | TechRow minimaliste + cards batterie/signal.                                                                                                                                                           |
| 2.11 | **Bloc Fuel**            | (sous-bloc)       | [`features/fleet/components/detail-blocks/FuelBlock.tsx`](../../features/fleet/components/detail-blocks/FuelBlock.tsx)                             | 🟡 tabs theme-aware                              | M          | `data`, `recharts`                                        | Tabs Aujourd'hui/Semaine + FuelGauge centrale (composant à créer) + 2 stats.                                                                                                                           |
| 2.12 | **Bloc Maintenance**     | (sous-bloc)       | [`features/fleet/components/detail-blocks/MaintenanceBlock.tsx`](../../features/fleet/components/detail-blocks/MaintenanceBlock.tsx)               | 📋                                               | M          | `data`                                                    | Historique entretiens.                                                                                                                                                                                 |
| 2.13 | **Bloc Expenses**        | (sous-bloc)       | [`features/fleet/components/detail-blocks/ExpensesBlock.tsx`](../../features/fleet/components/detail-blocks/ExpensesBlock.tsx)                     | 📋                                               | M          | `data`                                                    | Suivi dépenses véhicule.                                                                                                                                                                               |
| 2.14 | **Modal Fuel detail**    | (overlay)         | [`features/fleet/components/detail-blocks/modals/FuelModalContent.tsx`](../../features/fleet/components/detail-blocks/modals/FuelModalContent.tsx) | 📋                                               | M          | `data`, `recharts`                                        | 3 stats cards + timeline pleins.                                                                                                                                                                       |
| 2.15 | **Modal Maintenance**    | (overlay)         | (à créer)                                                                                                                                          | 📋                                               | M          | `data`                                                    | Alerte critique + historique timeline (`New/MaintenanceModalContent.tsx` suspendu).                                                                                                                    |
| 2.16 | **Modal Violations**     | (overlay)         | (à créer)                                                                                                                                          | 📋                                               | M          | `data`                                                    | Grade géant A/B/C + journal événements.                                                                                                                                                                |

**Patterns DLS produits par cette vague** :

- KPI card (icon + value + trend badge + label + subtitle)
- Stat card avec border-left coloré (statuts)
- Mini stat radial gauge
- Donut chart Recharts theme-aware
- Area chart 12 mois multi-séries
- Bar chart 7 jours bi-séries
- Table dense avec hover row
- Panel latéral droit
- Bloc détail repliable (header discret)
- Modal centrée vs full-screen
- FuelGauge semi-circulaire 270°

---

## Vague 3 — Composants partagés (factorisation tôt)

À refondre **avant** les vagues 4-7 pour ne pas dupliquer les patterns dans chaque module.

| #    | Écran                         | Composant principal                                                                                                          | Statut                                       | Difficulté | Dépendances                          | Notes                                |
| ---- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------- | ------------------------------------ | ------------------------------------ |
| 3.1  | **Modal de base**             | [`components/Modal.tsx`](../../components/Modal.tsx)                                                                         | 📋                                           | S          | —                                    | Template centré + variantes.         |
| 3.2  | **ConfirmDialog**             | [`components/ConfirmDialog.tsx`](../../components/ConfirmDialog.tsx)                                                         | 📋                                           | S          | —                                    | Confirmation destructive.            |
| 3.3  | **ImportModal**               | [`components/ImportModal.tsx`](../../components/ImportModal.tsx)                                                             | 📋                                           | M          | `papaparse`                          | Drag-drop fichier + preview.         |
| 3.4  | **Drawer**                    | [`components/Drawer.tsx`](../../components/Drawer.tsx)                                                                       | 📋                                           | M          | —                                    | Panel latéral animé.                 |
| 3.5  | **BottomSheet** mobile        | [`components/BottomSheet.tsx`](../../components/BottomSheet.tsx)                                                             | 📋                                           | M          | —                                    | Pattern mobile natif.                |
| 3.6  | **VehicleBottomSheet** mobile | [`components/VehicleBottomSheet.tsx`](../../components/VehicleBottomSheet.tsx)                                               | 📋                                           | M          | `data`                               | Quick view véhicule mobile.          |
| 3.7  | **MobileFilterSheet**         | [`components/MobileFilterSheet.tsx`](../../components/MobileFilterSheet.tsx)                                                 | 📋                                           | M          | —                                    | Filtres en bottom sheet.             |
| 3.8  | **CommandPalette** Ctrl+K     | [`components/CommandPalette.tsx`](../../components/CommandPalette.tsx)                                                       | 📋                                           | M          | `auth`, `data`                       | Recherche globale + actions rapides. |
| 3.9  | **NotificationCenter**        | [`features/notifications/components/NotificationCenter.tsx`](../../features/notifications/components/NotificationCenter.tsx) | 📋                                           | M          | `data`, `lazy`                       | Drawer notifications.                |
| 3.10 | **AiAssistant chat**          | [`features/ai/components/AiAssistant.tsx`](../../features/ai/components/AiAssistant.tsx)                                     | 📋                                           | M          | `react-query`, `lazy`, @google/genai | Chat IA flottant bas-droite.         |
| 3.11 | **PullToRefresh** mobile      | [`components/PullToRefresh.tsx`](../../components/PullToRefresh.tsx)                                                         | 📋                                           | S          | —                                    | Pattern mobile natif.                |
| 3.12 | **Pagination**                | [`components/Pagination.tsx`](../../components/Pagination.tsx)                                                               | 🟡 `.pagination-btn` (Phase 1 harmonisation) | S          | —                                    | Pages numbered + précédent/suivant.  |
| 3.13 | **ColumnManager**             | [`components/ColumnManager.tsx`](../../components/ColumnManager.tsx)                                                         | 📋                                           | M          | —                                    | Toggle visibilité colonnes table.    |
| 3.14 | **DateRangeSelector**         | [`components/DateRangeSelector.tsx`](../../components/DateRangeSelector.tsx)                                                 | 📋                                           | M          | —                                    | Picker date range avec presets.      |
| 3.15 | **FormStepper**               | [`components/FormStepper.tsx`](../../components/FormStepper.tsx)                                                             | 📋                                           | M          | —                                    | Wizard multi-étapes.                 |
| 3.16 | **SignaturePad**              | [`components/SignaturePad.tsx`](../../components/SignaturePad.tsx)                                                           | 📋                                           | S          | `signature`                          | Canvas signature intervention.       |
| 3.17 | **EmptyState**                | [`components/EmptyState.tsx`](../../components/EmptyState.tsx)                                                               | 📋                                           | S          | —                                    | Illustration + CTA quand liste vide. |
| 3.18 | **ErrorBoundary**             | [`components/ErrorBoundary.tsx`](../../components/ErrorBoundary.tsx)                                                         | 📋                                           | S          | —                                    | Fallback erreur.                     |
| 3.19 | **OfflineBanner**             | [`components/OfflineBanner.tsx`](../../components/OfflineBanner.tsx)                                                         | 📋                                           | S          | —                                    | Banner offline.                      |
| 3.20 | **InstallPrompt** PWA         | [`components/InstallPrompt.tsx`](../../components/InstallPrompt.tsx)                                                         | 📋                                           | S          | —                                    | Bouton "Installer l'app".            |
| 3.21 | **NotificationToast**         | [`components/NotificationToast.tsx`](../../components/NotificationToast.tsx)                                                 | 📋                                           | S          | —                                    | Toast non-bloquant.                  |
| 3.22 | **GlobalLoadingBar**          | [`components/GlobalLoadingBar.tsx`](../../components/GlobalLoadingBar.tsx)                                                   | 📋                                           | S          | —                                    | Top bar progression.                 |

**Patterns DLS produits par cette vague** :

- Modal centrée / drawer latéral / bottom sheet (3 niveaux selon device)
- Toast / banner non-bloquants
- Empty state pattern (illustration + CTA)
- Form stepper
- Pagination
- Picker date range

---

## Vague 4 — Settings & Admin

| #    | Écran                           | View enum       | Composant principal                                                                                                                      | Statut | Difficulté | Dépendances                   | Notes                                                                |
| ---- | ------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | ----------------------------- | -------------------------------------------------------------------- |
| 4.1  | **Settings root**               | `View.SETTINGS` | [`features/settings/components/SettingsView.tsx`](../../features/settings/components/SettingsView.tsx)                                   | 📋     | **L**      | `auth`, `react-query`, `lazy` | Container + onglets.                                                 |
| 4.2  | **Profil utilisateur**          | (onglet)        | (dans SettingsView)                                                                                                                      | 📋     | M          | `auth`, `react-query`         | Édition profil.                                                      |
| 4.3  | **Apparence**                   | (onglet)        | (dans SettingsView)                                                                                                                      | 📋     | M          | `AppearanceContext`           | Color picker, font, density, sidebar style — déjà branché côté code. |
| 4.4  | **Sécurité / Mot de passe**     | (onglet)        | (dans SettingsView)                                                                                                                      | 📋     | M          | `auth`, `react-query`         | Reset, 2FA.                                                          |
| 4.5  | **Mes tickets**                 | (onglet)        | [`features/settings/components/MyTicketsView.tsx`](../../features/settings/components/MyTicketsView.tsx)                                 | 📋     | M          | `data`                        | Tickets de l'user.                                                   |
| 4.6  | **Sync (offline)**              | (onglet)        | [`features/settings/components/SyncView.tsx`](../../features/settings/components/SyncView.tsx)                                           | 📋     | M          | —                             | État sync offline.                                                   |
| 4.7  | **Form Client**                 | (modale)        | [`features/settings/components/forms/ClientForm.tsx`](../../features/settings/components/forms/ClientForm.tsx)                           | 📋     | M          | `react-query`                 | Édition client.                                                      |
| 4.8  | **Form Géofence**               | (modale)        | [`features/settings/components/forms/GeofenceForm.tsx`](../../features/settings/components/forms/GeofenceForm.tsx)                       | 📋     | **L**      | `leaflet`, `react-query`      | Dessin polygon Leaflet.                                              |
| 4.9  | **Form Tech**                   | (modale)        | [`features/settings/components/forms/TechForm.tsx`](../../features/settings/components/forms/TechForm.tsx)                               | 📋     | M          | `react-query`                 | Édition technicien.                                                  |
| 4.10 | **Form Reseller**               | (modale)        | [`features/settings/components/ResellerForm.tsx`](../../features/settings/components/ResellerForm.tsx)                                   | 📋     | M          | `react-query`                 | Édition revendeur.                                                   |
| 4.11 | **Administration root**         | `View.ADMIN`    | [`features/admin/components/SuperAdminView.tsx`](../../features/admin/components/SuperAdminView.tsx)                                     | 📋     | **L**      | `auth`, `react-query`, `lazy` | Container + panels (lazy load).                                      |
| 4.12 | **Panel Users / Roles**         | (sub)           | [`features/admin/components/RoleManagerV2.tsx`](../../features/admin/components/RoleManagerV2.tsx)                                       | 📋     | **L**      | `auth`, `react-query`         | Matrice de permissions.                                              |
| 4.13 | **Panel Resellers**             | (sub)           | [`features/admin/components/panels/ResellersPanelV2.tsx`](../../features/admin/components/panels/ResellersPanelV2.tsx)                   | 📋     | M          | `react-query`                 | Liste revendeurs + quotas.                                           |
| 4.14 | **Panel WhiteLabel**            | (sub)           | [`features/admin/components/panels/WhiteLabelPanel.tsx`](../../features/admin/components/panels/WhiteLabelPanel.tsx)                     | 📋     | M          | `AppearanceContext`           | Cohérence avec onglet Apparence (4.3).                               |
| 4.15 | **Panel System**                | (sub)           | [`features/admin/components/panels/SystemPanel.tsx`](../../features/admin/components/panels/SystemPanel.tsx)                             | 📋     | M          | `react-query`                 | Paramètres plateforme.                                               |
| 4.16 | **Panel Webhooks**              | (sub)           | [`features/admin/components/WebhooksPanelV2.tsx`](../../features/admin/components/WebhooksPanelV2.tsx)                                   | 📋     | M          | `react-query`                 | Liste + édition webhooks.                                            |
| 4.17 | **Panel Integrations**          | (sub)           | [`features/admin/components/IntegrationsPanelV2.tsx`](../../features/admin/components/IntegrationsPanelV2.tsx)                           | 📋     | **L**      | `react-query`                 | Wave, Zoho, etc. — gros fichier.                                     |
| 4.18 | **Panel Document Templates**    | (sub)           | [`features/admin/components/DocumentTemplatesPanelV2.tsx`](../../features/admin/components/DocumentTemplatesPanelV2.tsx)                 | 📋     | **L**      | `react-query`                 | Éditeur templates emails / PDFs.                                     |
| 4.19 | **Panel Trash**                 | (sub)           | [`features/admin/components/panels/TrashPanelV2.tsx`](../../features/admin/components/panels/TrashPanelV2.tsx)                           | 📋     | M          | `react-query`                 | Restauration éléments supprimés.                                     |
| 4.20 | **Panel Registration Requests** | (sub)           | [`features/admin/components/panels/RegistrationRequestsPanel.tsx`](../../features/admin/components/panels/RegistrationRequestsPanel.tsx) | 📋     | M          | `react-query`                 | Validation inscriptions.                                             |
| 4.21 | **Panel Client Reconciliation** | (sub)           | [`features/admin/components/ClientReconciliation.tsx`](../../features/admin/components/ClientReconciliation.tsx)                         | 📋     | **L**      | `react-query`                 | Réconciliation données client.                                       |
| 4.22 | **Messages templates**          | (sub)           | [`features/admin/components/messages/MessageTemplatesPanel.tsx`](../../features/admin/components/messages/MessageTemplatesPanel.tsx)     | 📋     | M          | `react-query`                 | **Exception charte** (`bg-white` bulles SMS).                        |
| 4.23 | **Form Reseller (admin)**       | (modale)        | [`features/admin/components/forms/ResellerFormV2.tsx`](../../features/admin/components/forms/ResellerFormV2.tsx)                         | 📋     | M          | `react-query`                 | Édition revendeur côté admin.                                        |

**Patterns DLS produits par cette vague** :

- Container avec onglets latéraux
- Matrice de permissions (table cellulée avec checkboxes)
- Form classique avec sections
- Color picker + preview live (pour Apparence)
- Dropzone documents

---

## Vague 5 — Business

| #     | Écran                                      | View enum              | Composant principal                                                                                                          | Statut                              | Difficulté | Dépendances              | Notes                                                                                                     |
| ----- | ------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------- | ------------------------ | --------------------------------------------------------------------------------------------------------- |
| 5.1   | **Prévente / Leads**                       | `View.PRESALES`        | [`features/crm/components/PresalesView.tsx`](../../features/crm/components/PresalesView.tsx)                                 | 🟡 SearchBar + filter-chip refondus | **L**      | `react-query`, `lazy`    | Container + onglets Leads / Pipeline / Tâches / Catalog. 14 hex hardcodés.                                |
| 5.2   | **Leads liste**                            | (sub)                  | [`features/crm/components/LeadsList.tsx`](../../features/crm/components/LeadsList.tsx)                                       | 🟡                                  | M          | `react-query`            | Liste leads.                                                                                              |
| 5.3   | **Leads Kanban**                           | (sub)                  | [`features/crm/components/LeadsKanban.tsx`](../../features/crm/components/LeadsKanban.tsx)                                   | 📋                                  | **L**      | `dnd-kit`, `react-query` | Kanban drag & drop par statut.                                                                            |
| 5.4   | **Pipeline**                               | (sub)                  | [`features/crm/components/PipelineView.tsx`](../../features/crm/components/PipelineView.tsx)                                 | 📋                                  | **L**      | `dnd-kit`, `react-query` | Pipeline commercial.                                                                                      |
| 5.5   | **Tâches CRM**                             | (sub)                  | [`features/crm/components/TasksView.tsx`](../../features/crm/components/TasksView.tsx)                                       | 🟡 filter-chip                      | M          | `react-query`            | Liste tâches commerciales.                                                                                |
| 5.6   | **Form Lead**                              | (modale)               | [`features/crm/components/LeadFormModal.tsx`](../../features/crm/components/LeadFormModal.tsx)                               | 📋                                  | M          | `react-query`            | Création/édition lead.                                                                                    |
| 5.7   | **Form Tâche**                             | (modale)               | [`features/crm/components/TaskForm.tsx`](../../features/crm/components/TaskForm.tsx)                                         | 📋                                  | S          | `react-query`            | Création/édition tâche.                                                                                   |
| 5.8   | **Vente / Sales**                          | `View.SALES`           | [`features/crm/components/SalesView.tsx`](../../features/crm/components/SalesView.tsx)                                       | 🟡                                  | **L**      | `react-query`, `lazy`    | Container + 4 onglets : Vue d'ensemble · Clients · Contrats · **Factures** (avec sub Recouvrement — D25). |
| 5.9   | **Clients liste**                          | (sub)                  | (dans SalesView via CRMView)                                                                                                 | 🟡 SearchBar refondu                | M          | `react-query`            | Tier liste.                                                                                               |
| 5.10  | **CRM main view**                          | (legacy)               | [`features/crm/components/CRMView.tsx`](../../features/crm/components/CRMView.tsx)                                           | 🟡 SearchBar + filter-chip          | **L**      | `react-query`            | Vue compatible.                                                                                           |
| 5.11  | **Modal Détail Client**                    | (modale)               | [`features/crm/components/ClientDetailModal.tsx`](../../features/crm/components/ClientDetailModal.tsx)                       | 📋                                  | **L**      | `react-query`            | Détail client + onglets.                                                                                  |
| 5.12  | **Form Client**                            | (modale)               | [`features/crm/components/ClientForm.tsx`](../../features/crm/components/ClientForm.tsx)                                     | 📋                                  | M          | `react-query`            | Création/édition tier.                                                                                    |
| 5.13  | **Form Contrat**                           | (modale)               | [`features/crm/components/ContractForm.tsx`](../../features/crm/components/ContractForm.tsx)                                 | 📋                                  | M          | `react-query`            | Création/édition contrat.                                                                                 |
| 5.14  | **Contracts tabs**                         | (sub)                  | [`features/crm/components/ContractTabs.tsx`](../../features/crm/components/ContractTabs.tsx)                                 | 📋                                  | M          | `react-query`            | Onglets contrat.                                                                                          |
| 5.15  | **Form Subscription**                      | (modale)               | [`features/crm/components/SubscriptionForm.tsx`](../../features/crm/components/SubscriptionForm.tsx)                         | 📋                                  | M          | `react-query`            | Création abonnement.                                                                                      |
| 5.16  | **Catalog liste**                          | (sub)                  | [`features/crm/components/CatalogList.tsx`](../../features/crm/components/CatalogList.tsx)                                   | 📋                                  | M          | `react-query`            | Catalogue produits/services.                                                                              |
| 5.17  | **Catalog détail**                         | (modale)               | [`features/crm/components/CatalogDetail.tsx`](../../features/crm/components/CatalogDetail.tsx)                               | 📋                                  | M          | `react-query`            | Détail produit.                                                                                           |
| 5.18  | **Comptabilité root**                      | `View.ACCOUNTING`      | [`features/finance/components/AccountingView.tsx`](../../features/finance/components/AccountingView.tsx)                     | 📋                                  | **L**      | `react-query`, `lazy`    | Container **4 onglets niveau 1** (D25) : Vue d'ensemble · Finance · Budget · Comptabilité.                |
| 5.19  | **Onglet Finance** (container 2 subs)      | (sub Compta)           | [`features/finance/components/FinanceView.tsx`](../../features/finance/components/FinanceView.tsx)                           | 📋 (40 dark: classes)               | **L**      | `react-query`            | Container : Caisse + Banque (D25).                                                                        |
| 5.20  | **Sub-sub Caisse**                         | (sub Finance)          | (Cash dans Finance)                                                                                                          | 📋                                  | M          | `react-query`            | Mouvements espèces.                                                                                       |
| 5.21  | **Sub-sub Banque**                         | (sub Finance)          | [`features/finance/components/BankReconciliationView.tsx`](../../features/finance/components/BankReconciliationView.tsx)     | 📋                                  | **L**      | `react-query`            | Opérations + rapprochement bancaire.                                                                      |
| 5.22  | **Recouvrement**                           | (sub Vente > Factures) | [`features/finance/components/RecoveryView.tsx`](../../features/finance/components/RecoveryView.tsx)                         | 📋                                  | M          | `react-query`            | **Déplacé sous Vente > Factures (D25)**. Suivi impayés + relances.                                        |
| 5.23  | **Onglet Comptabilité** (container 3 subs) | (sub Compta)           | (dans AccountingView)                                                                                                        | 📋                                  | **L**      | `react-query`            | Container : Journal + Rapports + Dépenses (D25).                                                          |
| 5.23a | Sub-sub Journal                            | (sub Compta)           | (dans AccountingView)                                                                                                        | 📋                                  | M          | `react-query`            | Journal écritures + classes 1-8 + export FEC.                                                             |
| 5.23b | Sub-sub Rapports                           | (sub Compta)           | (lien vers module Rapports)                                                                                                  | 📋                                  | S          | —                        | Délègue au module Rapports avec catégorie pré-filtrée.                                                    |
| 5.23c | Sub-sub Dépenses (entreprise)              | (sub Compta)           | (à créer)                                                                                                                    | 📋                                  | M          | `react-query`            | Frais généraux + prestataires + abonnements (PAS véhicules).                                              |
| 5.24  | **Billing Forecast**                       | (sub)                  | (file via grep)                                                                                                              | 📋 (40 dark: classes)               | M          | `react-query`            | Prévision facturation.                                                                                    |
| 5.25  | **Modal Paiement**                         | (modale)               | [`features/finance/components/partials/PaymentModal.tsx`](../../features/finance/components/partials/PaymentModal.tsx)       | 📋                                  | M          | `react-query`            | Saisie paiement.                                                                                          |
| 5.26  | **Modal Entry compta**                     | (modale)               | [`features/finance/components/partials/EntryModal.tsx`](../../features/finance/components/partials/EntryModal.tsx)           | 📋                                  | M          | `react-query`            | Écriture comptable.                                                                                       |
| 5.27  | **Document preview**                       | (modale)               | [`features/finance/components/partials/DocumentPreview.tsx`](../../features/finance/components/partials/DocumentPreview.tsx) | 📋                                  | M          | `jspdf`                  | Preview PDF — **exception charte** (`bg-white`).                                                          |
| 5.28  | **Modal Send Document**                    | (modale)               | [`features/finance/components/SendDocumentModal.tsx`](../../features/finance/components/SendDocumentModal.tsx)               | 📋                                  | M          | `react-query`            | Envoi facture par email.                                                                                  |
| 5.29  | **Supplier Invoices**                      | (sub)                  | [`features/finance/components/SupplierInvoicesView.tsx`](../../features/finance/components/SupplierInvoicesView.tsx)         | 📋                                  | **L**      | `react-query`            | Factures fournisseurs.                                                                                    |

**Patterns DLS produits par cette vague** :

- Kanban drag & drop colonnes
- Pipeline visuel à étapes
- Form complexe sectionné (lead, contrat, subscription)
- Modal large multi-onglets (détail client)
- Document preview (PDF in iframe)

---

## Vague 6 — Technique

| #    | Écran                          | View enum         | Composant principal                                                                                                                        | Statut        | Difficulté | Dépendances                | Notes                               |
| ---- | ------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ---------- | -------------------------- | ----------------------------------- |
| 6.1  | **Interventions root**         | `View.TECH`       | [`features/tech/components/TechView.tsx`](../../features/tech/components/TechView.tsx)                                                     | 📋            | **L**      | `react-query`, `lazy`      | Container + 2 modes (LIST / RADAR). |
| 6.2  | **Interventions liste**        | (sub)             | [`features/tech/components/InterventionList.tsx`](../../features/tech/components/InterventionList.tsx)                                     | 📋            | M          | `react-query`              | Liste interventions.                |
| 6.3  | **Form Intervention**          | (modale)          | [`features/tech/components/InterventionForm.tsx`](../../features/tech/components/InterventionForm.tsx)                                     | 📋            | **L**      | `react-query`, `signature` | Création + signature.               |
| 6.4  | **Tab Vehicle (intervention)** | (onglet)          | [`features/tech/components/partials/InterventionVehicleTab.tsx`](../../features/tech/components/partials/InterventionVehicleTab.tsx)       | 📋            | M          | `data`                     | Sélection véhicule.                 |
| 6.5  | **Tab Tech (intervention)**    | (onglet)          | (file via grep)                                                                                                                            | 📋 (31 dark:) | M          | `data`                     | Sélection technicien.               |
| 6.6  | **Tab Request**                | (onglet)          | [`features/tech/components/InterventionRequestTab.tsx`](../../features/tech/components/InterventionRequestTab.tsx)                         | 📋            | M          | —                          | Détail demande.                     |
| 6.7  | **Tab Signature**              | (onglet)          | [`features/tech/components/partials/InterventionSignatureTab.tsx`](../../features/tech/components/partials/InterventionSignatureTab.tsx)   | 📋            | M          | `signature`                | Capture signature.                  |
| 6.8  | **Tech Stats**                 | (panel)           | [`features/tech/components/TechStats.tsx`](../../features/tech/components/TechStats.tsx)                                                   | 📋 (17 hex)   | M          | `recharts`                 | KPIs techniciens.                   |
| 6.9  | **Tech Team**                  | (panel)           | [`features/tech/components/TechTeamView.tsx`](../../features/tech/components/TechTeamView.tsx)                                             | 📋            | M          | `react-query`              | Équipe technique.                   |
| 6.10 | **Tech Settings**              | (panel)           | [`features/tech/components/TechSettingsPanel.tsx`](../../features/tech/components/TechSettingsPanel.tsx)                                   | 📋 (12 hex)   | M          | `react-query`              | Paramètres tech.                    |
| 6.11 | **Tech Radar Map**             | (mode)            | [`features/tech/components/TechRadarMap.tsx`](../../features/tech/components/TechRadarMap.tsx)                                             | 📋            | **L**      | `leaflet`, `react-query`   | Carte radar techniciens.            |
| 6.12 | **Monitoring root**            | `View.MONITORING` | [`features/tech/components/monitoring/SystemMetricsPanel.tsx`](../../features/tech/components/monitoring/SystemMetricsPanel.tsx)           | 📋            | **L**      | `react-query`, `recharts`  | Container + panels monitoring.      |
| 6.13 | **Anomaly Dashboard**          | (sub)             | [`features/tech/components/monitoring/AnomalyDashboard.tsx`](../../features/tech/components/monitoring/AnomalyDashboard.tsx)               | 📋            | **L**      | `react-query`, `recharts`  | Anomalies détectées.                |
| 6.14 | **Offline Tracker List**       | (sub)             | [`features/tech/components/monitoring/OfflineTrackerList.tsx`](../../features/tech/components/monitoring/OfflineTrackerList.tsx)           | 📋            | M          | `react-query`              | Trackers offline.                   |
| 6.15 | **User Monitoring**            | (sub)             | [`features/tech/components/monitoring/UserMonitoring.tsx`](../../features/tech/components/monitoring/UserMonitoring.tsx)                   | 📋            | M          | `react-query`              | Activité utilisateurs.              |
| 6.16 | **Stock root**                 | `View.STOCK`      | [`features/stock/components/StockView.tsx`](../../features/stock/components/StockView.tsx)                                                 | 📋            | **L**      | `react-query`              | Container + onglets.                |
| 6.17 | **Stock Overview**             | (sub)             | [`features/stock/components/partials/StockOverview.tsx`](../../features/stock/components/partials/StockOverview.tsx)                       | 📋 (16 hex)   | M          | `react-query`              | Aperçu stock.                       |
| 6.18 | **Stock Table**                | (sub)             | [`features/stock/components/partials/StockTable.tsx`](../../features/stock/components/partials/StockTable.tsx)                             | 📋            | M          | `react-query`              | Liste articles.                     |
| 6.19 | **Stock Movements**            | (sub)             | [`features/stock/components/partials/StockMovementsTable.tsx`](../../features/stock/components/partials/StockMovementsTable.tsx)           | 📋            | M          | `react-query`              | Mouvements stock.                   |
| 6.20 | **Stock Detail Modal**         | (modale)          | [`features/stock/components/partials/StockDetailModal.tsx`](../../features/stock/components/partials/StockDetailModal.tsx)                 | 📋            | M          | `react-query`              | Détail article.                     |
| 6.21 | **Stock Modals**               | (modales)         | [`features/stock/components/partials/StockModals.tsx`](../../features/stock/components/partials/StockModals.tsx)                           | 📋            | M          | `react-query`              | CRUD article.                       |
| 6.22 | **Agenda**                     | `View.AGENDA`     | [`features/agenda/components/AgendaView.tsx`](../../features/agenda/components/AgendaView.tsx)                                             | 📋            | **L**      | `react-query`              | Calendrier interventions.           |
| 6.23 | **Modal Intervention détail**  | (modale)          | [`features/agenda/components/partials/InterventionDetailModal.tsx`](../../features/agenda/components/partials/InterventionDetailModal.tsx) | 📋            | M          | `react-query`              | Détail depuis agenda.               |

**Patterns DLS produits par cette vague** :

- Calendrier mensuel / hebdo
- Carte radar (Leaflet variant)
- Form steppé avec signature
- Anomalies dashboard (timeline + cards alertes)

---

## Vague 7 — Support & Rapports

| #    | Écran                       | View enum      | Composant principal                                                                                                              | Statut                     | Difficulté | Dépendances                     | Notes                        |
| ---- | --------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------- | ------------------------------- | ---------------------------- |
| 7.1  | **Support root**            | `View.SUPPORT` | [`features/support/components/SupportViewV2.tsx`](../../features/support/components/SupportViewV2.tsx)                           | 🟡 filter-chip + SearchBar | **L**      | `react-query`, `lazy`           | Container + onglets tickets. |
| 7.2  | **FAQ**                     | (sub)          | [`features/support/components/FAQView.tsx`](../../features/support/components/FAQView.tsx)                                       | 📋                         | M          | `react-query`                   | FAQ recherchable.            |
| 7.3  | **Ticket Chat Panel**       | (drawer)       | [`features/support/components/TicketChatPanel.tsx`](../../features/support/components/TicketChatPanel.tsx)                       | 📋                         | **L**      | `ws`, `react-query`             | Conversation ticket.         |
| 7.4  | **Live Chat Panel**         | (drawer)       | [`features/support/components/LiveChatPanel.tsx`](../../features/support/components/LiveChatPanel.tsx)                           | 📋                         | **L**      | `ws`, `react-query`             | Chat live agent.             |
| 7.5  | **Ticket Form Modal**       | (modale)       | [`features/support/components/partials/TicketFormModal.tsx`](../../features/support/components/partials/TicketFormModal.tsx)     | 📋                         | M          | `react-query`                   | Création ticket.             |
| 7.6  | **Modal Escalate**          | (modale)       | [`features/support/components/EscalateTicketModal.tsx`](../../features/support/components/EscalateTicketModal.tsx)               | 📋                         | S          | `react-query`                   | Escalade ticket.             |
| 7.7  | **Attachment Upload**       | (sub)          | [`features/support/components/AttachmentUpload.tsx`](../../features/support/components/AttachmentUpload.tsx)                     | 📋                         | M          | —                               | Upload pièces jointes.       |
| 7.8  | **Support Settings**        | (panel)        | [`features/support/components/SupportSettingsPanel.tsx`](../../features/support/components/SupportSettingsPanel.tsx)             | 📋                         | M          | `react-query`                   | Paramètres support.          |
| 7.9  | **Reports root**            | `View.REPORTS` | [`features/reports/components/ReportsView.tsx`](../../features/reports/components/ReportsView.tsx)                               | 📋                         | **L**      | `react-query`, `lazy`, `export` | Container + 6 onglets.       |
| 7.10 | **Report Layout**           | (template)     | [`features/reports/components/ReportLayout.tsx`](../../features/reports/components/ReportLayout.tsx)                             | 📋                         | M          | `react-query`                   | Template page rapport.       |
| 7.11 | **Report Filter Bar**       | (sub)          | [`features/reports/components/ReportFilterBar.tsx`](../../features/reports/components/ReportFilterBar.tsx)                       | 📋                         | M          | —                               | Barre de filtres rapports.   |
| 7.12 | **Tab Activity Reports**    | (onglet)       | [`features/reports/components/tabs/ActivityReports.tsx`](../../features/reports/components/tabs/ActivityReports.tsx)             | 📋                         | M          | `recharts`, `export`            | Rapports activité.           |
| 7.13 | **Tab Fuel Reports**        | (onglet)       | [`features/reports/components/tabs/FuelReports.tsx`](../../features/reports/components/tabs/FuelReports.tsx)                     | 📋                         | M          | `recharts`, `export`            | Rapports carburant.          |
| 7.14 | **Tab Log Reports**         | (onglet)       | [`features/reports/components/tabs/LogReports.tsx`](../../features/reports/components/tabs/LogReports.tsx)                       | 📋                         | M          | `export`                        | Rapports logs.               |
| 7.15 | **Tab Performance Reports** | (onglet)       | [`features/reports/components/tabs/PerformanceReports.tsx`](../../features/reports/components/tabs/PerformanceReports.tsx)       | 📋                         | M          | `recharts`, `export`            | Rapports perfs.              |
| 7.16 | **Tab Support Reports**     | (onglet)       | [`features/reports/components/tabs/SupportReports.tsx`](../../features/reports/components/tabs/SupportReports.tsx)               | 📋                         | M          | `recharts`, `export`            | Rapports support.            |
| 7.17 | **Tab Technical Reports**   | (onglet)       | [`features/reports/components/tabs/TechnicalReports.tsx`](../../features/reports/components/tabs/TechnicalReports.tsx)           | 📋                         | M          | `recharts`, `export`            | Rapports techniques.         |
| 7.18 | **Tab Business Reports**    | (onglet)       | [`features/reports/components/tabs/BusinessReports.tsx`](../../features/reports/components/tabs/BusinessReports.tsx)             | 📋                         | M          | `recharts`, `export`            | Rapports business.           |
| 7.19 | **AI Analysis Modal**       | (modale)       | [`features/reports/components/AiAnalysisModal.tsx`](../../features/reports/components/AiAnalysisModal.tsx)                       | 📋                         | M          | @google/genai                   | Analyse IA d'un rapport.     |
| 7.20 | **Schedule Report Modal**   | (modale)       | [`features/reports/components/ScheduleReportModal.tsx`](../../features/reports/components/ScheduleReportModal.tsx)               | 📋                         | M          | `react-query`                   | Programmation envoi rapport. |
| 7.21 | **Notification Composer**   | (panel)        | [`features/notifications/components/NotificationComposer.tsx`](../../features/notifications/components/NotificationComposer.tsx) | 📋                         | M          | `react-query`                   | Composition notifications.   |

**Patterns DLS produits par cette vague** :

- Chat panel (bulles + input + attachments)
- Layout rapport (filtre · titre · KPIs · charts · table · footer)
- Modal IA (avec streaming)
- Programmation (scheduler date + récurrence)

---

## Bilan global

| Vague                   | Écrans  | Difficulté                 | Dépendances dominantes              |
| ----------------------- | ------- | -------------------------- | ----------------------------------- |
| 1 — Chrome & Auth       | 7       | M                          | auth, i18n                          |
| 2 — Operations          | 16      | XL (Dashboard, FleetTable) | data, ws, leaflet, recharts         |
| 3 — Composants partagés | 22      | M-L                        | divers (utilitaires)                |
| 4 — Settings & Admin    | 23      | L                          | react-query, AppearanceContext      |
| 5 — Business            | 29      | XL (FinanceView)           | dnd-kit, react-query                |
| 6 — Technique           | 23      | L                          | leaflet, signature                  |
| 7 — Support & Rapports  | 21      | L                          | ws, recharts, export, @google/genai |
| **Total**               | **141** | —                          | —                                   |

> Le chiffre 141 inclut les **sous-écrans, panels, modals, formulaires**. La granularité réelle de **vues navigables** est ~25 (dashboard, fleet, map, replay, settings, admin, presales, sales, accounting, tech, monitoring, stock, agenda, support, reports + sous-modes). Le reste sont des composants overlay / sub-views.

---

## Statistiques d'avancement

| Statut                                                                    | Nombre           | %    |
| ------------------------------------------------------------------------- | ---------------- | ---- |
| ⬜ Non commencé                                                           | 0                | 0%   |
| 📋 Audit fait, mockup en attente                                          | ~115             | ~82% |
| 🟡 Partiellement refondu (Phase 1 harmonisation ou Phase 0 sous-chantier) | ~25              | ~18% |
| 🎨 Mockup reçu                                                            | 1 (Dashboard v1) | <1%  |
| 🔧 / 🧪 / ✅                                                              | 0                | 0%   |

→ **Phase 1 d'intégration n'a pas commencé** côté code. Les statuts 🟡 sont les héritages des sous-chantiers `harmonisation` et `refonte`, pas du chantier umbrella.

---

## Comment mettre à jour ce document

Quand un écran change de statut (mockup reçu, intégré, déployé), modifier la cellule "Statut" et ajouter une ligne au [`CHANGELOG.md`](CHANGELOG.md).

Quand un nouveau pattern DLS émerge depuis un écran, l'ajouter à la section "Patterns DLS produits par cette vague" + l'enregistrer dans [`DLS.md`](DLS.md).

Quand un écran est **supprimé** (décision produit), le marquer `⏸ supprimé YYYY-MM-DD` mais ne pas le retirer du document — historique.

---

_Source de vérité de l'avancement chantier umbrella. Rien ne se déploie sans entrée dans cette table._
