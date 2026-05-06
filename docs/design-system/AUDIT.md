# AUDIT — État design system TrackYu Frontend Web

> Audit profond produit en Phase 0.2 du chantier `CHANTIER_REFONTE_DESIGN.md`.
> Date : 2026-04-26
> Auteur : session Claude Code frontend web (lecture seule, aucune modification)
> Périmètre : repo `c:/Users/ADMIN/Desktop/TRACKING/` — frontend web TrackYu uniquement.

---

## Synthèse exécutive — à lire en premier

L'audit révèle **trois faits majeurs qui invalident plusieurs hypothèses** du document maître `CHANTIER_REFONTE_DESIGN.md` que je viens de produire :

### Fait 1 — Le design system existant est déjà mature et bien architecturé

Loin d'un repo "à structurer", TrackYu dispose déjà de :

- Une architecture de tokens **à 3 couches** (palette canonique → sémantique alias → overrides par thème), exactement le modèle décrit dans la section 3.4 du charter
- **Trois thèmes data-theme** fonctionnels : `dark` / `ocean` / `light`, switchables au runtime via header
- Un **`AppearanceContext`** complet qui implémente déjà la personnalisation tenant (couleur primaire, secondaire, accent, font family, font size, border radius, sidebar style, table density, logo) — soit le panneau "Apparence" décrit en section 5.3 du charter, déjà branché backend (`api.tenants.getCurrent()`)
- Un `ThemeContext` qui gère la bascule preset, la classe `.dark`, le meta `color-scheme`, la `theme-color` mobile
- **40+ composants partagés** dans `components/` (Button, Card, Modal, Drawer, BottomSheet, Sidebar, BottomNavigation, Pagination, EmptyState, Tabs, FormStepper, ConfirmDialog, etc.)
- Un set de **classes utilitaires** (`.btn`, `.card`, `.filter-chip`, `.icon-btn`, `.toolbar`, `.page-title`, `.page-subtitle`, `.section-title`, `.th-base`, `.td-base`, `.tr-hover`, `.input-base`, `.skeleton`, `.divider`)

### Fait 2 — Deux chantiers parallèles de refonte sont déjà ouverts

Le repo contient deux documents de chantier qui n'apparaissent pas dans le charter `CHANTIER_REFONTE_DESIGN.md` :

| Document                                   | Statut                                                                                | Périmètre                                                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/frontend/design-harmonisation.md`    | **Phase 1 ✅ commitée** (`344d1d2`, 2026-04-11) — Phase 2 ⏳                          | Migration `slate-*` hardcodés → tokens CSS. **186 fichiers, ~7000 remplacements**. Phase 2 estime ~563 occurrences `bg-slate-*` restantes (chiffre vieux d'environ 2 semaines). |
| `docs/frontend/CHANTIER_DESIGN_REFONTE.md` | **Phase 0 ✅ commitée** (`be47b5e` + `c5b312e`, 2026-04-24). Phase 1+2+3 ⏳ en pause. | Refonte profonde : tokens canoniques `--bg-app`/`--brand-primary`, composants premium dans dossier `New/`, refonte Dashboard complète. **Pause pendant chantier stats**.        |

Et un dossier **`New/` à la racine** contient **15 composants design "premium" prêts à intégrer** : Sidebar, FleetTable, VehicleDetailPanel, FuelGauge (composant nouveau), FuelChart, ActivityBlock, BehaviorBlock, AlertsBlock, GpsBlock, FuelBlock, FuelModalContent, MaintenanceModalContent, ViolationsModalContent, SharedBlocks, et `index.css.txt` (déjà partiellement intégré).

### Fait 3 — La couleur de marque cible est `#d96d4c`, pas `#F97316`

Le chantier existant a tranché : **le orange final est `#d96d4c` (terracotta vif)** après essais des candidats `#F58220`, `#FF5C00`, `#c45b3a`. Cette décision est consignée comme #8 dans `CHANTIER_DESIGN_REFONTE.md`.

Or la `shared.css` que tu as transmise depuis claude.ai Design utilise `#F97316` — un orange plus saturé/froid. Les deux ne sont pas équivalents.

→ **Soit on aligne claude.ai Design sur `#d96d4c`** (modifier la palette à la source), **soit on bascule TrackYu sur `#F97316`** (mais cela invalide une décision déjà prise et impose de regénérer/re-valider toute la harmonisation déjà commitée).

---

## 1. Cartographie du repo

### 1.1 Structure non-standard

Le repo n'a **pas** la structure Vite habituelle (`src/` qui contient tout). Ici :

```
TRACKING/
├── App.tsx                  ← composant racine
├── index.tsx                ← entry point Vite
├── index.html               ← HTML root + Inter Google Fonts
├── app.json                 ← Capacitor config
├── package.json
├── components/              ← 40+ composants partagés (Button, Card, Modal, etc.)
├── features/                ← 16 modules métier (admin, fleet, map, etc.)
├── contexts/                ← 6 React contexts (Theme, Auth, Data, etc.)
├── hooks/                   ← hooks partagés
├── services/                ← API, lib clients
├── lib/                     ← infrastructure (react-query, etc.)
├── i18n/                    ← internationalisation FR/EN/ES
├── utils/                   ← utilitaires (vehicleStatus.ts !)
├── New/                     ← 15 composants design "premium" en attente d'intégration
├── docs/                    ← documentation (frontend, backend, plans, modules)
├── INSTRUCTIONS/            ← instructions projet
├── trackyu-mobile-expo/     ← session mobile (ne pas toucher depuis ici)
└── src/
    └── index.css            ← UNIQUE fichier dans src/ (1218 lignes)
```

L'utilisation marginale de `src/` (juste pour le CSS) est inhabituelle mais cohérente avec un repo qui a évolué. Aucun changement structurel n'est nécessaire.

### 1.2 Stack technique

| Brique                                               | Version         | Note                                            |
| ---------------------------------------------------- | --------------- | ----------------------------------------------- |
| React                                                | 19.2            | Dernière majeure                                |
| Vite                                                 | 6.2             | Build tool                                      |
| Tailwind                                             | **4.1.18**      | Tailwind v4 avec `@theme inline` (token-driven) |
| TypeScript                                           | ~5.8            |                                                 |
| Capacitor                                            | 8.0             | Wrapping Android natif (PWA → app)              |
| React Query                                          | 5.90            | Data fetching                                   |
| React Hook Form + Zod                                | 7.68 + 4.1      | Formulaires                                     |
| Leaflet + react-leaflet + cluster + heat             | 1.9 / 5.0 / 4.0 | Cartographie                                    |
| Recharts                                             | 3.4             | Graphes                                         |
| react-window + virtualized-auto-sizer                | 1.8 / 1.0       | Virtualisation listes                           |
| socket.io-client                                     | 4.8             | WS temps réel                                   |
| date-fns, dompurify, papaparse, jspdf, exceljs, xlsx | —               | Utils & exports                                 |
| @google/genai                                        | 1.30            | Gemini AI (AiAssistant)                         |
| ESLint + Prettier + Husky + lint-staged              | —               | Qualité                                         |
| Vitest + React Testing Library                       | 4 / 16          | Tests                                           |

**Implication design** : Tailwind v4 avec `@theme inline` permet d'exposer les CSS variables comme **tokens Tailwind natifs**. Donc `bg-bg-primary`, `text-text-primary`, `border-border-strong` sont des classes Tailwind valides qui pointent automatiquement vers `var(--bg-primary)`, `var(--text-primary)`, etc. Très puissant pour cohérence.

### 1.3 Provider stack

```
ErrorBoundary
└── QueryClientProvider
    └── I18nProvider                  ← FR / EN / ES
        └── ThemeProvider             ← preset dark/ocean/light + classe .dark
            └── AuthProvider          ← isAuthenticated, user, role
                └── AppearanceProvider ← personnalisation tenant (couleurs, font, density, sidebar)
                    └── DataProvider   ← vehicles, zones, alerts globaux
                        └── NotificationProvider
                            └── ToastProvider
                                └── App
```

`AppearanceProvider` dépend de `AuthProvider` (logique : pas de tenant tant qu'on n'est pas authentifié) et override les CSS variables après login.

---

## 2. Le design system existant (état réel)

### 2.1 `src/index.css` — anatomie

1218 lignes structurées en sections :

1. **`@theme inline`** (lignes 8-75) — expose 30+ variables Tailwind v4 (`--color-*`, `--font-size-*`, `--radius-*`, `--shadow-*`)
2. **Accent color global et focus styles** (77-99) — accessibilité keyboard
3. **Dark mode global text fix** (101-117) — corrige texte invisible en dark sur certains inputs (slate hardcodés)
4. **`.form-input-base`** (119-133) — base réutilisable inputs (slate hardcodés)
5. **Tokens invariants `:root`** (141-171) — statuts véhicule, sémantiques fonctionnelles, brand-font, brand-radius, spacing
6. **`[data-theme='dark']`** (174-267) — TrackYu Dark (bg `#0d0d0f`, primary `#d96d4c`)
7. **`[data-theme='ocean']`** (270-362) — Ocean Dark (bg `#080e1a`, primary `#38bdf8`)
8. **`[data-theme='light']`** (365-447) — Light Pro (bg `#f8fafc`, primary `#d96d4c`)
9. **`[data-sidebar='*']`** (449-487) — orthogonal au thème : dark/light/colored
10. **`body` + scrollbars** (490-527) — style global, `overflow:hidden` (SPA layout)
11. **Animations** (529-570) — fadeIn, slideIn, pulse-slow, view-enter
12. **Glass / Leaflet / vehicle-label-tooltip** (572-615)
13. **Mobile optimizations** (617-794) — safe-area, touch targets, haptic feedback, mobile inputs
14. **Print + loading bar + view transitions** (796-846)
15. **`@layer components`** (848-1217) — classes utilitaires métier

### 2.2 Architecture des tokens — déjà en 3 couches

**Couche 1 — palette canonique** (commentée "Canonical tokens, use these in new code") :

Pour le thème `dark` :

- `--bg-app: #0d0d0f`, `--bg-card: #16161a`, `--bg-elevated: #1c1c21`, `--bg-overlay: rgba(0,0,0,.65)`
- `--brand-primary: #d96d4c`, `--brand-primary-light: #e08a70`, `--brand-primary-dim: rgba(217,109,76,.1)`
- `--brand-gradient: linear-gradient(135deg, #d96d4c 0%, #c85f0e 50%, #8b3a00 100%)`
- `--text-main`, `--text-secondary`, `--text-muted`, `--text-inverse`, `--text-on-primary`
- `--border-ui: rgba(255,255,255,.12)`, `--border-strong: #3a3a3e`
- `--brand-sidebar-bg: #111114`, `--brand-sidebar-text: #ffffff`

**Couche 2 — alias backward-compat** (commentée "do not use in new code") :

```
--bg-primary    → var(--bg-app)
--bg-surface    → var(--bg-card)
--primary       → var(--brand-primary)
--primary-light → var(--brand-primary-light)
--primary-dim   → var(--brand-primary-dim)
--text-primary  → var(--text-main)
--border        → var(--border-ui)
```

**Couche 3 — overrides par data-theme et data-sidebar** : déjà en place.

C'est exactement le modèle que je décrivais comme "à construire" dans le charter. **Il existe déjà, et il n'y a pas grand-chose à faire dessus**.

### 2.3 Couleurs sémantiques

`--clr-*` avec 7 nuances chacune (`-strong`, `-dim`, `-muted`, `-border`, `-badge`, `-badge-text`) pour 6 familles :

`success` (green) · `danger` (red) · `warning` (orange) · `caution` (amber) · `info` (purple) · `emerald`

Déclinées **par thème** (dark/ocean/light) avec valeurs adaptées au contraste :

- Dark : couleurs vives sur fond sombre (`green-400`, `red-400`, etc.)
- Light : couleurs sombres sur fond clair (`green-600`, `red-600`, etc.)

### 2.4 Couleurs statut véhicule (à modifier — décision charter section 3.3)

```
--status-moving  : #22c55e
--status-idle    : #f97316   ← À MIGRER vers #FBBF24 (charter 3.3)
--status-stopped : #ef4444
--status-alert   : #dc2626
--status-offline : #6b7280
```

Ces tokens sont aussi exposés via `@theme inline` comme `--color-status-moving`, etc. → utilisables comme classes Tailwind `text-status-moving`.

**Source de vérité métier** : `utils/vehicleStatus.ts` qui définit `VEHICLE_STATUS_COLORS` (constante consommée par 40-50 fichiers). C'est le **point d'entrée canonique** pour la propagation idle.

### 2.5 Classes utilitaires (@layer components)

Catalogue exhaustif, déjà aligné avec mobile (commentaires "miroir mobile") :

| Classe                                 | Variantes                                                                                       | Usage                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| `.btn`                                 | `.btn-sm/-md/-lg/-full`, `.btn-primary/-secondary/-ghost/-danger`                               | Boutons (Button.tsx wrap)            |
| `.card`, `.card-elevated`              | —                                                                                               | Cartes                               |
| `.input-base`                          | —                                                                                               | Inputs                               |
| `.badge`                               | `.badge-moving/-idle/-stopped/-offline/-alert`, `.badge-success/-warning/-error/-info/-neutral` | Badges                               |
| `.filter-chip`                         | `.active`                                                                                       | Chips de filtre                      |
| `.icon-btn`                            | `.active`                                                                                       | Boutons icône                        |
| `.toolbar`, `.toolbar-section`         | —                                                                                               | Lignes search+filtres                |
| `.page-title`, `.page-subtitle`        | —                                                                                               | Titres de page                       |
| `.section-title`                       | —                                                                                               | Titres section (uppercase, tracking) |
| `.th-base`, `.td-base`, `.tr-hover`    | —                                                                                               | Tableaux                             |
| `.form-error`, `.divider`, `.skeleton` | —                                                                                               | Utilitaires                          |

Le `Button.tsx` partagé (`components/Button.tsx`) est juste un **wrapper léger** sur les classes CSS — il ne contient pas de styling, seulement la composition variant/size.

### 2.6 ThemeContext (`contexts/ThemeContext.tsx`)

94 lignes. Très propre :

- Type `ThemePreset = 'dark' | 'ocean' | 'light'`
- `applyTheme(preset)` met `data-theme` + classe `.dark` (pour dark+ocean) + meta `color-scheme` + meta `theme-color`
- Persistance `localStorage` clé `trackyu-theme` (avec compatibilité ancienne clé `theme`)
- API : `theme`, `isDarkMode`, `setTheme`, `toggleTheme`

**Note** : `isDarkMode === true` pour `dark` ET `ocean`. C'est sémantiquement correct (les deux ont fond sombre), mais le `dark:` Tailwind s'active aussi pour `ocean`.

### 2.7 AppearanceContext (`contexts/AppearanceContext.tsx`)

195 lignes. Implémente la personnalisation tenant :

```typescript
interface AppearanceSettings {
  primaryColor: string; // override --primary + --brand-primary
  secondaryColor: string; // override --brand-secondary
  accentColor: string; // override --brand-accent
  fontFamily: string; // 7 polices : Inter, Roboto, Poppins, Nunito, Open Sans, DM Sans, Source Sans 3
  fontSize: 'small' | 'default' | 'large'; // override --brand-font-size
  borderRadius: 'none' | 'small' | 'default' | 'large'; // override --brand-radius
  sidebarStyle: 'dark' | 'light' | 'colored'; // pose data-sidebar
  tableDensity: 'compact' | 'standard' | 'comfortable'; // pose data-density + override --brand-density-py
  logoUrl?: string;
}
```

Charge les paramètres tenant via `api.tenants.getCurrent()` au login. Override conditionnel : si tenant n'a pas de couleur custom, le thème CSS reprend le contrôle.

Auto-load Google Fonts à la volée si police différente d'Inter.

**Conclusion** : la "Niveau B" du charter (charte tenant) est déjà **opérationnelle**. Reste à valider :

- (a) si l'admin tenant peut **éditer** ces paramètres depuis un panneau "Apparence" (à vérifier dans `features/admin/`)
- (b) si la "Niveau A" (préférence user clair/sombre) coexiste avec la charte tenant

Le panneau `WhiteLabelPanel.tsx` existe dans `features/admin/components/panels/` — à explorer pour confirmer.

---

## 3. Composants partagés (catalog actuel)

40+ composants dans `components/` :

### 3.1 Layout / chrome

- `Sidebar.tsx`, `BottomNavigation.tsx`, `MobileTabLayout.tsx`
- `Drawer.tsx`, `BottomSheet.tsx`, `VehicleBottomSheet.tsx`, `MobileFilterSheet.tsx`
- `Modal.tsx`, `ConfirmDialog.tsx`, `ImportModal.tsx`
- `Tabs.tsx`, `Pagination.tsx`, `SortableHeader.tsx`, `ColumnManager.tsx`

### 3.2 Forms

- `Button.tsx` (wrapper sur `.btn`)
- `form/Input.tsx`, `form/Textarea.tsx`, `form/Select.tsx`, `form/SearchableSelect.tsx`
- `form/FormField.tsx`, `form/FormGrid.tsx`, `form/FormSection.tsx`, `form/FormActions.tsx`
- `FormStepper.tsx`
- `DateInput.tsx`, `DateRangeSelector.tsx`
- `SearchBar.tsx`, `SearchInput.tsx`
- `SignaturePad.tsx`

### 3.3 Feedback

- `Badge.tsx`, `StatusBadge.tsx`
- `EmptyState.tsx`, `OfflineBanner.tsx`, `NotificationToast.tsx`, `GlobalLoadingBar.tsx`
- `Skeleton.tsx`, `SkeletonBox.tsx`
- `ErrorBoundary.tsx`, `InstallPrompt.tsx`
- `PullToRefresh.tsx`

### 3.4 Domain-flavored

- `Card.tsx`, `MobileCard.tsx`
- `CommandPalette.tsx` (Ctrl+K)

**Évaluation** : couverture presque complète. Manquent peut-être pour atteindre la cible "Design Catalog" :

- `StatCard` (carte KPI avec sparkline) — pas trouvé, candidat au pattern implicite
- `RadialGauge` (jauge circulaire) — mentionné dans Phase 2 chantier existant à créer
- `KPI` factorisé — actuellement dispersé

---

## 4. Inventaire écrans (16 modules, 40 Views, 184 .tsx)

D'après le scan agent :

| Module          | Views/Pages | Total .tsx | Notes                                                                                                                                       |
| --------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin`         | 1           | 22         | SuperAdminView + nombreux panels (RoleManager, Webhooks, Integrations, ClientReconciliation, RegistrationRequests, DocumentTemplates, etc.) |
| `agenda`        | 1           | 5          | AgendaView                                                                                                                                  |
| `ai`            | 0           | 1          | AiAssistant.tsx (lazy)                                                                                                                      |
| `auth`          | 3           | 3          | LoginView, ActivationPage, ChangePasswordView                                                                                               |
| `crm`           | 11          | 29         | PresalesView, SalesView, ContractForm, LeadsKanban, PipelineView, etc. — module riche                                                       |
| `dashboard`     | 1           | 2          | DashboardView (1772 lignes !)                                                                                                               |
| `finance`       | 8           | 19         | FinanceView, AccountingView, RecoveryView, BankReconciliationView, BillingForecastView, etc.                                                |
| `fleet`         | 0           | 21         | FleetTable + VehicleDetailPanel + ~10 detail-blocks + modals                                                                                |
| `map`           | 1           | 7          | MapView (le plus gros consommateur de slate-\* en exception)                                                                                |
| `notifications` | 0           | 2          | NotificationCenter (lazy)                                                                                                                   |
| `reports`       | 1           | 13         | ReportsView + 6 tabs spécialisés                                                                                                            |
| `settings`      | 8           | 25         | SettingsView + forms (Client, Reseller, Tech, Geofence, etc.)                                                                               |
| `stock`         | 1           | 7          | StockView                                                                                                                                   |
| `support`       | 1           | 8          | SupportViewV2, FAQView, TicketChatPanel                                                                                                     |
| `tech`          | 3           | 20         | TechView, MonitoringView, AgendaView, InterventionForm + monitoring panels                                                                  |

Total **184 fichiers .tsx** dans `features/`. Pas de barrel exports (`index.ts/.tsx`) — chaque import passe par le chemin direct.

---

## 5. Mesure chiffrée de la dette

### 5.1 Violations Tailwind directes (slate / gray / zinc)

| Pattern                      | Occurrences | Top fichiers                                                                                                                                  |
| ---------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `slate-*` (toutes variantes) | **39**      | MapView.tsx (9, exception documentée), App.tsx (2), SensorsBlock.tsx (2, exception documentée), TierDetailModal.tsx (2), ScheduleForm.tsx (2) |
| `gray-*`                     | **5**       | ReplayControlPanel.tsx (2), VehicleForm.tsx (3)                                                                                               |
| `zinc-*`                     | **0**       | —                                                                                                                                             |

**Verdict** : la **dette `slate-*` est quasi-éliminée** par la Phase 1 du chantier `design-harmonisation`. Le chiffre de "563 occurrences restantes" mentionné dans `design-harmonisation.md` est **obsolète** (chiffre estimé en avril 2026 mais non re-mesuré). La réalité fin avril : **<40 violations sur tout le repo**, dont une part substantielle relève des exceptions documentées (MapView, SensorsBlock).

### 5.2 Hex hardcodés dans le TSX/TS

| Métrique           | Valeur  |
| ------------------ | ------- |
| Total occurrences  | **342** |
| Fichiers concernés | 43      |

**Top 10 fichiers concentrent l'essentiel** :

- ReplayControlPanel.tsx : 36 (légendes vitesse, timeline replay)
- MapView.tsx : 24 (markers, overlays)
- DashboardView.tsx : 18 (graphes Recharts)
- TechStats.tsx : 17 (graphes monitoring)
- StatsTab.tsx : 17 (graphes finance)
- StockOverview.tsx : 16
- PresalesView.tsx : 14
- TechSettingsPanel.tsx : 12
- DocumentTemplatesPanelV2.tsx : 10
- FuelBlock.tsx : 10

**Analyse** : la dette hex est **dominée par les graphes Recharts** où chaque série de données nécessite une couleur explicite. Recharts ne lit pas les CSS variables nativement — il faut soit :

- (a) Lire les CSS vars en JS via `getComputedStyle(document.documentElement).getPropertyValue('--brand-primary')`
- (b) Définir les couleurs des séries dans un constant module qui pioche dans une palette tokenisée
- (c) Passer par l'`AppearanceContext` pour injecter les couleurs via JS

C'est un **pattern récurrent à factoriser** dans la Phase 2 du chantier existant.

### 5.3 Couleur idle `#f97316` (à propager → `#FBBF24`)

**197 occurrences** dans le code TSX/TS.

**Source de vérité** : `utils/vehicleStatus.ts` définit `VEHICLE_STATUS_COLORS` (consommée par 40-50 fichiers). C'est **le seul point qui devrait être modifié dans l'idéal** — mais l'audit révèle que beaucoup de composants **réimportent ou hardcodent** la couleur indépendamment :

| Fichier                                                 | Occurrences | Type                                                                     |
| ------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `utils/vehicleStatus.ts`                                | 2           | **Source canonique** — point d'entrée principal                          |
| `features/map/components/ReplayControlPanel.tsx`        | 20+         | Légendes vitesse (idle/moving/stopped)                                   |
| `features/map/components/MapView.tsx`                   | 6           | Mappage statuts markers                                                  |
| `features/dashboard/components/DashboardView.tsx`       | 4+          | Graphes                                                                  |
| `features/fleet/components/detail-blocks/FuelBlock.tsx` | —           | Lié à niveau carburant <50% (probable confusion sémantique idle/warning) |
| `constants.ts` (racine)                                 | 1           | `case 'IN_PROGRESS'` (sémantique applicative, pas véhicule)              |
| `features/tech/constants.ts`                            | 1           | `case 'IN_PROGRESS'` (sémantique applicative, pas véhicule)              |

**Risque** : certaines occurrences de `#f97316` ne concernent **pas** le statut idle véhicule. Il y a aussi :

- Des badges "warning" (à conserver — `--clr-warning` dark utilise `#fb923c` orange-400 actuellement)
- Des `IN_PROGRESS` (statut tâche/intervention, sémantique différente)
- Des éléments de marque actuelle (le primary lui-même est `#d96d4c`, pas `#f97316`, mais des composants peuvent avoir hardcodé l'ancien orange)

**Implication** : la propagation idle ne peut pas être un simple search-and-replace. Il faut :

1. Modifier la **valeur du token** `--status-idle` dans les 3 thèmes (`dark`/`ocean`/`light`) dans `src/index.css`
2. Modifier `VEHICLE_STATUS_COLORS` dans `utils/vehicleStatus.ts`
3. Auditer **chaque occurrence hardcodée** pour décider : c'est idle véhicule (à migrer), warning fonctionnel (à conserver), ou autre sémantique

Estimation : 1-2 jours d'investigation + propagation, pas un sed global.

### 5.4 Couleurs Tailwind explicites pour statuts véhicule

158 occurrences de `text-orange-`, `bg-orange-`, `text-green-`, `bg-green-`, `text-red-`, `bg-red-` dans `features/fleet/`, `features/map/`, `features/dashboard/`.

Top fichiers :

- ReplayControlPanel.tsx : 49
- MapView.tsx : 25
- VehicleListCard.tsx : 10

**Verdict** : ces fichiers utilisent les classes Tailwind directement plutôt que les tokens `--status-*`. C'est de la dette équivalente à 5.3, mais sous une autre forme.

### 5.5 Coexistence dual theme system (`dark:` Tailwind + `[data-theme]`)

**1032 occurrences** de `dark:` (classes dark mode Tailwind) sur **133 fichiers**.

Top 5 fichiers consommateurs :

- BillingForecastView.tsx : 40
- InterventionTechTab.tsx : 31
- FinanceView.tsx : 31
- TierDetailModal.tsx : 27
- FleetTable.tsx : 26

**Analyse** : `ThemeContext.applyTheme()` ajoute la classe `.dark` sur `<html>` quand le preset est `dark` OU `ocean`. Donc les classes `dark:bg-something` s'appliquent sur les deux thèmes sombres, ce qui peut produire des effets subtilement différents qu'on n'attend pas.

**Implication** : le système `dark:` Tailwind et le système `[data-theme]` co-routent les deux thèmes sombres mais le système `[data-theme]` est plus précis. La présence massive de `dark:` est de la **dette technique** : chaque classe `dark:bg-slate-800` devrait idéalement être un token sémantique (`bg-bg-elevated` ou `bg-[var(--bg-elevated)]`).

**À considérer** : Phase 2 du chantier `design-harmonisation` cible explicitement `dark:hover:bg-slate-*` (~230 occurrences estimées) pour batch sed.

### 5.6 Style inline (`style={{`)

**346 occurrences** dispersées sur **89 fichiers**, moyenne ~4 par fichier.

**Concentration critique** :

- **FleetTable.tsx : 28 occurrences `style={{ backgroundColor:` ou `color:`**

L'usage massif d'inline style (avec `var(--*)`) est un compromis qui contourne Tailwind v4 : `style={{ color: 'var(--text-primary)' }}` au lieu de `className="text-text-primary"`.

**Trois conventions coexistent dans le repo pour exprimer le même style** :

- `className="text-text-primary"` (Tailwind v4 token natif)
- `className="text-[var(--text-primary)]"` (Tailwind arbitrary value)
- `style={{ color: 'var(--text-primary)' }}` (inline)

→ **Pattern à factoriser** : on devrait converger sur **une seule convention** (idéalement Tailwind v4 natif via `@theme inline` qui est déjà en place).

### 5.7 `bg-white`

78 occurrences sur 29 fichiers. La plupart sont **intentionnelles** (PDF previews, logos, bulles SMS — exceptions documentées). À auditer fichier par fichier au moment d'y toucher.

---

## 6. Polices

### 6.1 Polices chargées (réel)

**Inter uniquement** est chargée par défaut :

- `index.html:75` : `<link rel="preload" href="...family=Inter:wght@400;500;600;700&display=swap" as="style">`
- Stack fallback : `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

`AppearanceContext` peut **charger dynamiquement** 6 polices alternatives via `loadGoogleFont()` : Roboto, Poppins, Nunito, Open Sans, DM Sans, Source Sans 3.

Aucune occurrence de `Archivo`, `JetBrains` (autre qu'en commentaires/logs) — confirmé.

### 6.2 Implication pour le chantier visuel

Le mockup connexion (claude.ai Design) utilise **3 polices** :

- Inter (déjà OK)
- **Archivo Black** (display) — à ajouter
- **JetBrains Mono** (mono labels, séparateurs) — à ajouter

Si on les adopte, deux options :

| Option                                                                             | Avantage                             | Inconvénient                                                      |
| ---------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| **A — Préload statique** dans `index.html`                                         | TTI optimal, pas de FOUT             | Augmente le bundle font de ~80kB (Archivo Black + JetBrains Mono) |
| **B — Auto-load via AppearanceContext** (comme déjà fait pour Roboto/Poppins/etc.) | Lazy, charge seulement si nécessaire | FOUT possible au premier rendu, complexité accrue                 |

Recommandation : **option A** pour Archivo Black (utilisé sur titres marketing/auth visibles dès la première frame), **option B** pour JetBrains Mono (usage limité aux mono-labels, FOUT acceptable).

Vérifier la **CSP** (`index.html:21-43`) : actuellement `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` et `font-src 'self' https://fonts.gstatic.com data:` — donc **CSP compatible** avec ajout de polices Google Fonts.

---

## 7. Charte mobile — alignement actuel

Le repo `trackyu-mobile-expo/` est une **session parallèle** et ne doit pas être touché depuis ici. Mais les indices d'alignement sont disponibles dans `src/index.css` :

> "Synchronisé avec les tokens mobile (tokens.ts + themes.ts)"
> "Aligné sur la charte graphique mobile (themes.ts + tokens.ts)"
> "miroir mobile" (commentaires sur `.btn`, `.card`, `.filter-chip`, `.icon-btn`, `.page-title`)

Et dans le skill `frontend-design-system.md` :

> Palette mobile (Expo) :
>
> - Thème dark (User) : orange `#E8771A` / noir / blanc
> - Thème ocean : bleu `#3B82F6`
> - Thème light : clair

**Incohérences détectées** :

| Aspect        | Skill mobile (Expo) | Web (`src/index.css`) |
| ------------- | ------------------- | --------------------- |
| Orange dark   | `#E8771A`           | `#d96d4c`             |
| Ocean         | `#3B82F6`           | `#38bdf8`             |
| Light primary | (clair)             | `#d96d4c`             |

→ La synchronisation web↔mobile n'est **pas parfaite**. La phrase "synchronisé avec les tokens mobile" dans le code est aspirationnelle, pas factuelle.

Le chantier existant `CHANTIER_DESIGN_REFONTE.md` mentionne en Phase 3 : "Mobile (session parallèle) — aligner les tokens mobiles sur les mêmes valeurs (`#d96d4c` au lieu de `#E8771A`)". Donc l'alignement est **planifié mais non fait**.

→ Quand le chantier visuel reprendra, il faudra **signaler à la session mobile** la cible définitive (orange final, status idle, etc.) pour propagation symétrique.

---

## 8. Patterns implicites à factoriser

Identifiés depuis le scan + lecture des fichiers gros consommateurs :

### 8.1 Trois manières de styler une carte

1. `<div className="card">` → utilise `.card` (`@layer components`)
2. `<div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">` → arbitrary
3. `<div style={{ backgroundColor: 'var(--bg-card)' }}>` → inline

→ **Convergence à imposer** : `className="card"` ou `className="bg-bg-card border-border rounded-card"` (Tailwind v4 natif).

### 8.2 KPI / StatCard non factorisé

Le Dashboard (1772 lignes !) contient probablement des cartes KPI répétées. La Phase 2 du chantier existant prévoit de créer `RadialGauge.tsx` réutilisable (Score/Carburant) et un AreaChart Recharts. À étendre vers une `StatCard` partagée.

### 8.3 FleetTable.tsx — point chaud

**26 dark: classes + 28 inline `style={{ backgroundColor: ... }}` + couleurs orange hardcodées**.

Le plus gros chantier de refactoring. Le composant `New/FleetTable.tsx` propose une refonte complète (`divide-y divide-transparent`, hover `bg-app`, IDs orange brand, mini fuel gauge en barre, actions opacity-0 group-hover).

### 8.4 ReplayControlPanel.tsx — point chaud

**36 hex hardcodés + 49 classes Tailwind orange/green/red + 20+ `#f97316`**. Ce composant est l'autre concentration de dette. Pas de refonte prévue dans le `New/`.

### 8.5 Graphes Recharts

DashboardView, TechStats, StatsTab, StockOverview, PresalesView : tous utilisent Recharts avec couleurs hex hardcodées. **Pattern à factoriser** : un module `lib/chart-colors.ts` qui lit les CSS variables au runtime via `getComputedStyle` et expose une palette pour Recharts.

---

## 9. Le dossier `New/` — composants design "premium" en attente

15 fichiers à la racine `New/`, déjà générés (probable claude.ai Design ou autre source v1) :

| Fichier                       | Cible d'intégration                                         | Statut (selon CHANTIER_DESIGN_REFONTE.md)                                     |
| ----------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `index.css.txt`               | `src/index.css`                                             | ✅ déjà intégré (Phase 0)                                                     |
| `Sidebar.tsx`                 | `components/Sidebar.tsx`                                    | ⏳ collapsed 80px / hover 256px / glow orange                                 |
| `VehicleDetailPanel.tsx`      | `features/fleet/components/VehicleDetailPanel.tsx`          | 🟡 partiellement intégré (header solide + status row), reste QuickStat 3 cols |
| `SharedBlocks.tsx`            | `features/fleet/components/detail-blocks/SharedBlocks.tsx`  | 🟡 block header discret intégré, animations en attente                        |
| `ActivityBlock.tsx`           | `features/fleet/components/detail-blocks/ActivityBlock.tsx` | ⏳ glass card + grille télémétrie 2×2                                         |
| `AlertsBlock.tsx`             | `features/fleet/components/detail-blocks/AlertsBlock.tsx`   | ⏳ border-l-2 par sévérité                                                    |
| `BehaviorBlock.tsx`           | `features/fleet/components/detail-blocks/BehaviorBlock.tsx` | ⏳ jauge SVG circulaire + 3 stats cards                                       |
| `FuelBlock.tsx`               | `features/fleet/components/detail-blocks/FuelBlock.tsx`     | ⏳ tabs + FuelGauge + 2 stats                                                 |
| `FuelGauge.tsx`               | (nouveau composant à créer)                                 | ⏳ semi-circulaire 270° avec drop-shadow orange                               |
| `GpsBlock.tsx`                | `features/fleet/components/detail-blocks/GpsBlock.tsx`      | ⏳ TechRow minimaliste                                                        |
| `FleetTable.tsx`              | `features/fleet/components/FleetTable.tsx`                  | ⏳ refonte complète                                                           |
| `FuelChart.tsx`               | (nouveau dans `features/fleet/components/`)                 | ⏳ AreaChart Recharts gradient primary                                        |
| `FuelModalContent.tsx`        | `features/fleet/components/detail-blocks/modals/`           | ⏳ stats 3 cards + timeline pleins                                            |
| `MaintenanceModalContent.tsx` | idem                                                        | ⏳ alerte critique + historique timeline                                      |
| `ViolationsModalContent.tsx`  | idem                                                        | ⏳ grade géant A/B/C + journal                                                |

**`index.css.txt`** (que j'ai lu) est une **version simplifiée** de `src/index.css` actuel — c'est un **point de départ**, pas la cible. La version live `src/index.css` est déjà beaucoup plus riche (sémantiques fonctionnelles, classes utilitaires, mobile optimizations) que le `index.css.txt` du dossier `New/`.

**Patterns identitaires** (dossier `New/`) :

- `font-black` (weight 900) sur les labels importants
- `uppercase tracking-widest` pour labels uppercase / `tracking-tighter` pour titres
- `font-mono` sur tous les nombres (valeurs, IMEI, coordonnées, durées) → **JetBrains Mono ferait sens ici**
- Text sizes très petits et dense : `text-[9px]`, `text-[10px]`, `text-[11px]`
- Glow orange : `drop-shadow-[0_0_Xpx_var(--brand-primary)]`
- Bordures rgba transparentes (pas d'hex opaque)

---

## 10. Autres points

### 10.1 i18n

Provider `I18nProvider` en place (`i18n/`). Trois langues : FR (source) / EN (priorité) / ES (3e). Toute refonte d'écran doit préserver les clés `t('...')` existantes.

### 10.2 Capacitor

L'app web est **wrappable Android via Capacitor** (`@capacitor/core` 8.0). C'est un mode hybride différent de l'app mobile Expo (`trackyu-mobile-expo/`). Selon CLAUDE.md, le mobile officiel est Expo. Capacitor pourrait être un legacy ou un mode test. À ne pas confondre avec la session mobile.

### 10.3 Lazy loading

`LazyViews.tsx` charge en lazy DashboardView, MapView, ReportsView, etc. Et VehicleDetailPanel, AiAssistant, NotificationCenter, CommandPalette en `React.lazy`. Bien optimisé.

### 10.4 Header App.tsx — switcher de thème déjà visible

Le header (`App.tsx:638-659`) contient un toggle 3 thèmes (dark / ocean / light) toujours visible. Bonne base pour la "préférence user clair/sombre" (charter Q2/Q3) — il existe déjà.

### 10.5 Hardcodes dans `App.tsx`

Le composant racine contient quelques violations :

- L.564 : `bg-orange-100 text-orange-800` (banner impersonation) — slate-style violation Tailwind
- L.694 : `bg-red-500` (notification dot) — couleur sémantique hardcoded
- L.781 : `bg-white dark:bg-slate-900 ... border-slate-200 dark:border-slate-700` (panel AI chat) — slate hardcoded
- L.791 : `bg-slate-800 dark:bg-slate-700` (bouton AI chat ouvert) — slate hardcoded

À traiter dans la propagation Phase 2 du chantier `design-harmonisation`.

---

## 11. Conflit majeur — chantiers parallèles

Voilà l'ascenseur émotionnel le plus important de l'audit.

**Trois documents charter coexistent** dans le repo, partiellement overlapping :

```
docs/
├── design-system/
│   └── CHANTIER_REFONTE_DESIGN.md       ← créé par moi 2026-04-26 (charter "nouveau")
└── frontend/
    ├── design-harmonisation.md          ← Phase 1 ✅ commitée 2026-04-11 (chantier "harmonisation")
    └── CHANTIER_DESIGN_REFONTE.md       ← Phase 0 ✅ commitée 2026-04-24 (chantier "refonte" en pause)
```

### 11.1 Aspects où ils se contredisent

| Aspect                  | `CHANTIER_REFONTE_DESIGN.md` (mon charter)             | `CHANTIER_DESIGN_REFONTE.md` + `design-harmonisation.md` (existants)  |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| Brand orange cible      | `#F97316` (depuis claude.ai Design)                    | `#d96d4c` (terracotta TrackYu, validé après essais)                   |
| Mode dual               | clair + sombre, marketing=light + auth=dark + app=dual | **trois** thèmes (dark / ocean / light), tous switchables in-app      |
| Personnalisation tenant | "panneau Apparence à construire"                       | **Déjà construit** (`AppearanceContext` + WhiteLabelPanel)            |
| Tokens 3 couches        | "à mettre en place"                                    | **Déjà en place** (canonical + alias + data-theme)                    |
| Source design           | claude.ai Design (mockups → me transmettre)            | Dossier `New/` (15 composants prêts) + visions cockpit Samsara/Motive |
| Idle color              | `#FBBF24`                                              | `#f97316` (statu quo)                                                 |
| Polices                 | + Archivo Black + JetBrains Mono                       | Inter + 6 fonts via AppearanceContext (Roboto/Poppins/etc.)           |
| Décisions actées        | 7 (charter section 3)                                  | 10 (CHANTIER_DESIGN_REFONTE.md table                                  |
| Plan d'exécution        | 5 phases                                               | Déjà à la Phase 1+                                                    |

### 11.2 Aspects où ils s'alignent

- Architecture 3 couches de tokens : **les deux confirment cette approche** (mon charter le proposait, l'existant le démontre déjà en place)
- Pas de rupture technique : **aligné**
- Validation staging avant prod : **aligné** (CLAUDE.md)
- Cross-session web↔mobile : **aligné** (l'existant le mentionne en Phase 3)

### 11.3 Diagnostic

Le `CHANTIER_REFONTE_DESIGN.md` que j'ai créé en Phase 0.1 a été **rédigé sans connaissance des chantiers précédents**. Il est cohérent en lui-même, mais il **réinvente partiellement la roue** et **introduit un conflit de couleur de marque** (`#F97316` vs `#d96d4c`).

Le bon diagnostic d'orchestrateur : **mon charter doit être réconcilié, pas appliqué tel quel**.

---

## 12. Recommandations d'orchestration

### 12.1 Statut révisé du chantier

**Le chantier de refonte design TrackYu n'est pas à démarrer — il est en cours, en pause, et largement avancé**. Le bon mouvement n'est pas "construire les fondations", c'est :

1. **Reprendre** le chantier `CHANTIER_DESIGN_REFONTE.md` (Phase 1+2 en attente)
2. **Intégrer** les apports de claude.ai Design (la nouvelle landing + mockups à venir) **comme source de vérité visuelle** au-dessus du chantier existant
3. **Réconcilier** la couleur de marque (`#d96d4c` ↔ `#F97316`) — décision utilisateur requise
4. **Étendre** le `AppearanceContext` si besoin (ex: bascule clair/sombre pour user vs charte tenant — à clarifier)
5. **Continuer** la propagation `dark:` Tailwind → tokens (Phase 2 `design-harmonisation`)

### 12.2 Ce que mon charter capture quand même utilement

Mon `CHANTIER_REFONTE_DESIGN.md` apporte **trois choses utiles** que les chantiers existants ne capturent pas :

1. **Le rôle de claude.ai Design comme source canonique** des mockups — workflow `Capture → Design → Code → Staging → Prod`. C'est nouveau.
2. **La décomposition des surfaces** (marketing light / auth dark / app dual) — explicite dans mon charter, implicite ailleurs.
3. **La perspective inter-sessions** (web/mobile/backend) — capturée dans mon charter, mentionnée en pointillés ailleurs.

### 12.3 Décision attendue de l'utilisateur

Avant de produire les autres documents (`DLS.md`, `SCREEN_MAP.md`, etc.) ou de toucher au code, **trois décisions stratégiques** :

| #      | Question                                                                                                                                                                                                                                                                        | Conséquence                                                                                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1** | **Couleur de marque** : `#d96d4c` (existant TrackYu) **ou** `#F97316` (claude.ai Design) ?                                                                                                                                                                                      | Si bascule, regénération palette tenant + propagation 200+ fichiers + alignement mobile. Si maintien, **demander à claude.ai Design de regénérer la connexion (et tout futur mockup) avec `#d96d4c`** au lieu de `#F97316`. |
| **D2** | **Stratégie chantiers** : (a) Fusionner les 3 charters en un seul, (b) Reprendre `CHANTIER_DESIGN_REFONTE.md` et archiver `CHANTIER_REFONTE_DESIGN.md`, (c) Faire de `CHANTIER_REFONTE_DESIGN.md` le charter umbrella et lier les deux autres comme sous-chantiers historiques. | Détermine la trace documentaire et la lisibilité pour les sessions futures.                                                                                                                                                 |
| **D3** | **Sort du dossier `New/`** : (a) intégrer maintenant (Phase 1 chantier existant), (b) le considérer obsolète vu que claude.ai Design devient la nouvelle source, (c) le valider visuellement comme mockup intermédiaire et le retravailler via Design avant intégration.        | Détermine si on intègre les 15 composants en attente ou si on regénère via Design.                                                                                                                                          |

### 12.4 Si la refonte est confirmée comme reprise (et non démarrage from scratch)

Plan d'exécution révisé (à valider en sortie de Phase 0) :

**Étape 0** — Décisions D1, D2, D3 ci-dessus.

**Étape 1** — Réécriture du charter pour absorber les chantiers existants. Le `CHANTIER_REFONTE_DESIGN.md` devient l'umbrella, mais ses sections "à construire" (3 couches tokens, AppearanceContext, ThemeProvider) sont rebasculées vers "déjà en place, à étendre".

**Étape 2** — Production du DLS (`DLS.md`) en **extrayant** depuis `src/index.css` actuel (qui est déjà la source canonique en pratique), pas en partant de la `shared.css` claude.ai. Le DLS documente l'existant et marque les **points d'évolution** (ajout polices, propagation idle, etc.).

**Étape 3** — Production de la `SCREEN_MAP.md` en croisant les 40 Views inventoriées avec le statut "déjà refondu Phase 1 design-harmonisation / partiellement refondu (`New/` partiel) / à refondre".

**Étape 4** — Reprise du chantier `CHANTIER_DESIGN_REFONTE.md` Phase 1 (intégration `New/`) en **confrontant chaque composant `New/` à un mockup claude.ai Design correspondant** avant intégration. C'est là que claude.ai Design entre en pratique.

**Étape 5** — Phase 2 Dashboard refonte (avec mockup claude.ai Design dédié).

**Étape 6** — Phase 3 chantiers complémentaires (scrollbars theme-aware, alignement mobile, propagation idle).

### 12.5 Sur la propagation idle `#f97316` → `#FBBF24`

Faisable, **mais** :

- Beaucoup d'occurrences ne sont **pas** des statuts idle véhicule (warning fonctionnels, IN_PROGRESS, marque historique)
- Le travail est **investigation-heavy**, pas search-and-replace
- Doit être propagé vers le mobile aussi (signaler à la session)

Estimation honnête : **1-2 jours** d'audit puis modifications sélectives. Faisable en parallèle de l'orchestration design.

---

## 13. Conclusion d'audit

### 13.1 État réel du design system TrackYu

Note honnête : **bonne maturité**.

- Architecture tokens en place ✅
- 3 thèmes fonctionnels avec switcher ✅
- Personnalisation tenant fonctionnelle (AppearanceContext) ✅
- 40+ composants partagés ✅
- Classes utilitaires complètes (`@layer components`) ✅
- Tailwind v4 avec `@theme inline` (état de l'art) ✅
- Phase 1 harmonisation `slate-*` largement faite (~7000 remplacements) ✅
- 15 composants premium prêts à intégrer dans `New/` ✅
- Documentation des chantiers ✅

Points d'amélioration restants :

- Convergence vers une seule convention de styling (Tailwind v4 natif vs arbitrary vs inline)
- Refonte profonde des 3 points chauds : FleetTable, ReplayControlPanel, DashboardView
- Propagation `dark:` Tailwind résiduels (Phase 2 `design-harmonisation`)
- Alignement mobile (Phase 3 `CHANTIER_DESIGN_REFONTE`)
- Factorisation StatCard / RadialGauge / palette Recharts
- Décision idle propagation

### 13.2 Ce que l'utilisateur attendait peut-être

L'utilisateur pensait sans doute que le repo n'avait pas de design system structuré et qu'il fallait tout construire depuis claude.ai Design. La réalité est différente : **le repo a un design system, il est en cours de refonte avancée, et claude.ai Design devient un nouvel outil dans une chaîne déjà rodée**.

→ La conversation doit être **recadrée** : on ne refonde pas, on **continue** + on **intègre Design comme source mockup**.

### 13.3 Prochaine étape

L'utilisateur doit prendre les **3 décisions stratégiques (section 12.3)** avant qu'une étape suivante puisse être planifiée. En l'état, j'attends ses arbitrages.

---

## Annexe A — Index des fichiers analysés

| Fichier                                    | Rôle                            | Lignes lues     |
| ------------------------------------------ | ------------------------------- | --------------- |
| `src/index.css`                            | Design system canonique web     | 1218 (intégral) |
| `index.html`                               | Entry HTML, Inter, CSP          | 210 (intégral)  |
| `index.tsx`                                | Provider stack                  | 45              |
| `App.tsx`                                  | Routing + theme switcher header | 813             |
| `package.json`                             | Stack & versions                | 102             |
| `contexts/ThemeContext.tsx`                | Bascule preset + classe `.dark` | 94 (intégral)   |
| `contexts/AppearanceContext.tsx`           | Personnalisation tenant         | 195 (intégral)  |
| `components/Button.tsx`                    | Wrapper `.btn`                  | 75 (intégral)   |
| `New/index.css.txt`                        | Version "Design v1" simplifiée  | 94 (intégral)   |
| `docs/frontend/CHANTIER_DESIGN_REFONTE.md` | Charter chantier 2026-04-24     | 254 (intégral)  |
| `docs/frontend/design-harmonisation.md`    | Charter chantier 2026-04-11     | 179 (intégral)  |
| `.claude/skills/frontend-design-system.md` | Skill Claude design system      | 97 (intégral)   |
| Inventaire `features/**/*.tsx`             | 184 fichiers via Glob           | structure       |
| Inventaire `components/**/*.tsx`           | 40 fichiers via Glob            | structure       |
| Mesures dette via Explore agent            | 8 sections chiffrées            | rapport agent   |

## Annexe B — Vocabulaire de l'audit

- **Token canonique** = variable CSS principale, source de vérité (`--bg-app`, `--brand-primary`)
- **Token alias** = variable CSS pointant vers un canonique pour rétro-compatibilité (`--bg-primary` → `var(--bg-app)`)
- **Couche 1 / 2 / 3** = palette / sémantique / overrides par mode/tenant (terminologie charter section 3.4)
- **`@theme inline`** = directive Tailwind v4 qui expose des CSS variables comme tokens utilisables en classes (`bg-bg-primary`)
- **Chantier `harmonisation`** = `docs/frontend/design-harmonisation.md` (Phase 1 ✅ commit `344d1d2`)
- **Chantier `refonte`** = `docs/frontend/CHANTIER_DESIGN_REFONTE.md` (Phase 0 ✅ commit `be47b5e` + `c5b312e`)
- **Chantier `umbrella`** (proposé) = `docs/design-system/CHANTIER_REFONTE_DESIGN.md` (charter récent, ce dossier)
- **Dossier `New/`** = composants premium prêts à intégrer (15 fichiers à la racine)

---

_Fin de l'audit. À lire avant toute prise de décision sur la suite du chantier._
