# CHANTIER — Refonte Design TrackYu (umbrella)

> **Document maître umbrella** du chantier de refonte design TrackYu.
> Il **englobe** deux sous-chantiers déjà en cours et **intègre claude.ai Design** comme nouvelle source de mockups.
> Toute session Claude (frontend web, backend, mobile, ou autre) qui travaille sur le design DOIT lire ce document avant d'agir.
>
> **Statut** : 🟧 **PIVOT REWRITE** (D12 acté 2026-04-26) — abandon de l'adaptation legacy au profit de la **construction d'un nouveau frontend `trackyu-front-V2`** à partir des mockups Design comme code source. Backend intact.
> **Dernière mise à jour** : 2026-04-26 (v0.5 — pivot rewrite D12-D17)
>
> ➡️ **État courant temps réel** : voir [STATE.md](STATE.md)
> **Pilote** : utilisateur (smartrackci@gmail.com)
> **Orchestrateur** : session Claude Code frontend web

---

## 1. Synthèse exécutive

TrackYu **reconstruit son frontend web** à partir des mockups produits par claude.ai Design. Le backend (API, services, types DB, mobile Expo) reste **intact**.

### Pivot D12 (2026-04-26)

Initialement, le projet visait à **adapter** progressivement le frontend legacy `TRACKING/` (~184 .tsx, dette accumulée, structure non-standard). Après audit + production de Phase 1 docs + livraison du mockup pilote Fleet, décision de **pivoter vers un rewrite complet** :

| Constat                                                 | Implication                               |
| ------------------------------------------------------- | ----------------------------------------- |
| Aucun user en prod (juste superadmin + assistant)       | Risque migration nul                      |
| Code Design exceptionnel + cohérence visuelle naturelle | Design = source code, pas juste référence |
| Tech debt importante dans le legacy                     | Rewrite = clean slate                     |
| 3 sessions Claude parallèles disponibles                | Parallélisation fortement possible        |

→ Création de **`trackyu-front-V2`** comme nouveau projet frontend. Le legacy `TRACKING/` devient référence métier en **archive read-only**.

### Principes (révisés D12)

1. **Continuité métier stricte.** Les API, types, i18n, RBAC, services backend restent identiques. Aucune rupture côté backend / mobile / contrats fonctionnels.
2. **Continuité visuelle stricte.** Les tokens DLS restent stables (palette `#d96d4c`, idle `#FBBF24`, statuts véhicule, sémantiques). Le code Design hérite du DLS en construction.
3. **Cohérence inter-sessions.** Le design system est consommé identiquement par toutes les sessions Claude (V2, mobile, future). Source canonique : `docs/design-system/`.
4. **Pas de dérive.** Chaque module construit est validé avant le suivant. Patterns émergents intégrés au DLS pour propagation.

---

## 2. Vision long terme

À la fin du chantier, TrackYu présente :

- **Marketing** (`trackyugps.com`, futur) : look professionnel light, accents oranges terracotta, typographie forte, niveau Wialon / Geotab / Samsara.
- **Auth** (connexion, inscription, reset) : expérience immersive dark, transition cohérente vers l'app.
- **App web** : 2 modes au choix de l'utilisateur (clair / sombre), identité visuelle cohérente avec marketing et auth, **personnalisable par tenant** (white-label : couleur de marque, logo, font, density).
- **App mobile** : strictement aligné sur le même langage que l'app web (2 modes + accent tenant), traduit dans la stack mobile (Expo + NativeWind).
- **Communications externes** (emails, PDFs, notifications) : respectent la même charte.

Critère de réussite : un nouveau développeur (ou une nouvelle session Claude) doit produire un écran qui se fond visuellement dans l'existant en lisant uniquement ce dossier `docs/design-system/`.

---

## 3. Décisions actées (verrouillées)

Toute modification ultérieure passe par le changelog (section 14) avec accord explicite de l'utilisateur.

### 3.1 Couleur de marque (CRITIQUE)

**Brand orange officiel** = **`#d96d4c`** (terracotta vif).

| Variante                 | Valeur                                                                | Usage                              |
| ------------------------ | --------------------------------------------------------------------- | ---------------------------------- |
| `--brand-primary`        | `#d96d4c`                                                             | CTA, accents, focus, hover de base |
| `--brand-primary-light`  | `#e08a70`                                                             | États légers, hovers doux          |
| `--brand-primary-dim`    | `rgba(217, 109, 76, 0.1)` (dark) / `rgba(217, 109, 76, 0.05)` (light) | Fonds tintés, badges, chips actifs |
| `--brand-primary-strong` | `#c85f0e`                                                             | Hover fort, états appuyés          |
| `--brand-primary-deep`   | `#8b3a00`                                                             | Stops gradient                     |
| `--brand-gradient`       | `linear-gradient(135deg, #d96d4c 0%, #c85f0e 50%, #8b3a00 100%)`      | Logos, accents premium             |

**Décision validée** suite à essais des candidats `#F58220`, `#FF5C00`, `#c45b3a`. **Pas de bascule vers `#F97316`** (couleur claude.ai Design v1) — c'est claude.ai Design qui s'aligne sur TrackYu, pas l'inverse.

### 3.2 Mode d'affichage — 2 modes (clair / sombre) + accent tenant

L'app web et mobile proposent **deux modes**, l'utilisateur choisit son mode, le tenant définit son **accent de marque** :

| Dimension            | Valeurs                             | Source                                                                      |
| -------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| **Mode**             | `dark` (sombre) ou `light` (clair)  | Préférence user (switcher header, persistance localStorage `trackyu-theme`) |
| **Accent de marque** | `#d96d4c` par défaut, surchargeable | Charte tenant via `AppearanceContext` (cf. 3.3)                             |

Modèle white-label cohérent : chaque tenant a **son** accent qui se décline automatiquement en clair et sombre. Aligné avec Notion / GitHub / Slack / Linear.

L'ancien thème `ocean` (bleu sombre `#38bdf8`) est **supprimé** comme thème pré-fabriqué. Tout tenant qui veut un accent bleu pose `primaryColor: '#38bdf8'` dans sa charte. Décision actée 2026-04-26 (D4) — aucun user impacté car app pas encore ouverte.

| Surface                                    | Mode par défaut         | Personnalisable user                      |
| ------------------------------------------ | ----------------------- | ----------------------------------------- |
| Pages marketing publiques (vitrine future) | Light                   | non (charte plateforme)                   |
| Pages auth (connexion/inscription/reset)   | Dark immersif           | partiel (logo + accent tenant uniquement) |
| App web modules opérationnels + admin      | clair / sombre au choix | oui (mode + accent tenant)                |
| App mobile                                 | clair / sombre au choix | oui (alignement web)                      |
| Emails / PDFs / notifications              | Light                   | partiel (logo + accent)                   |

### 3.3 Personnalisation tenant (white-label) — déjà opérationnelle

Le `AppearanceContext` (`contexts/AppearanceContext.tsx`) gère **déjà** la personnalisation par tenant. Surchargeable au login depuis `api.tenants.getCurrent()` :

| Setting          | Valeurs                                                           | CSS variable override                                 |
| ---------------- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| `primaryColor`   | hex string ou `''` (théme reprend la main)                        | `--primary` + `--brand-primary`                       |
| `secondaryColor` | hex string                                                        | `--brand-secondary`                                   |
| `accentColor`    | hex string                                                        | `--brand-accent`                                      |
| `fontFamily`     | Inter, Roboto, Poppins, Nunito, Open Sans, DM Sans, Source Sans 3 | `--brand-font` (auto-load Google Fonts si nécessaire) |
| `fontSize`       | small / default / large                                           | `--brand-font-size`                                   |
| `borderRadius`   | none / small / default / large                                    | `--brand-radius`                                      |
| `sidebarStyle`   | dark / light / colored                                            | `data-sidebar` attribut sur `<html>`                  |
| `tableDensity`   | compact / standard / comfortable                                  | `data-density` + `--brand-density-py`                 |
| `logoUrl`        | URL                                                               | (consommé par composants logo)                        |

Panneau d'administration : [features/admin/components/panels/WhiteLabelPanel.tsx](../../features/admin/components/panels/WhiteLabelPanel.tsx) (à auditer pour confirmer la couverture des 9 settings).

### 3.4 Couleur "idle" (statut véhicule)

**Cible** : `#FBBF24` (jaune ambre), au lieu de l'actuel `#f97316` (orange).

**Raison** : `#f97316` colle visuellement à l'orange de marque historique. Avec le brand `#d96d4c` on est moins en conflit visuel — mais idle reste à propager pour clarté sémantique stricte (statut ≠ identité).

**Couleurs de statut véhicule officielles (cible post-propagation)** :

| Statut   | Couleur       | Sémantique                                            |
| -------- | ------------- | ----------------------------------------------------- |
| moving   | `#22C55E`     | vert — en mouvement                                   |
| **idle** | **`#FBBF24`** | **jaune ambre — moteur tournant à l'arrêt (NOUVEAU)** |
| stopped  | `#EF4444`     | rouge — moteur coupé                                  |
| alert    | `#DC2626`     | rouge foncé — alerte critique                         |
| offline  | `#6B7280`     | gris — hors ligne                                     |

**Mode opératoire** : ce **n'est pas** un sed. L'audit montre 197 occurrences de `#f97316` mais beaucoup sont des warnings fonctionnels, IN_PROGRESS, ou marque historique. Investigation cas par cas requise.

### 3.5 Architecture des tokens — déjà en 3 couches

Modèle déjà en place dans `src/index.css` :

```
┌────────────────────────────────────────────────────────────────┐
│ COUCHE 1 — Palette canonique                                   │
│   --bg-app, --bg-card, --bg-elevated,                          │
│   --brand-primary, --brand-primary-light, --brand-primary-dim, │
│   --brand-gradient,                                            │
│   --text-main, --text-secondary, --text-muted,                 │
│   --border-ui, --border-strong,                                │
│   --brand-sidebar-bg, --brand-sidebar-text                     │
│   ✅ Définie pour 2 modes (dark / light)                       │
└────────────────────────────────────────────────────────────────┘
                            │ (référencée par)
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ COUCHE 2 — Alias backward-compat (utilisés par 186+ fichiers)  │
│   --bg-primary    → var(--bg-app)                              │
│   --bg-surface    → var(--bg-card)                             │
│   --primary       → var(--brand-primary)                       │
│   --primary-dim   → var(--brand-primary-dim)                   │
│   --text-primary  → var(--text-main)                           │
│   --border        → var(--border-ui)                           │
└────────────────────────────────────────────────────────────────┘
                            │ (overridée par)
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ COUCHE 3 — Overrides par mode et par tenant                    │
│   [data-theme='dark']  { ... }                                 │
│   [data-theme='light'] { ... }                                 │
│   [data-sidebar='dark'/'light'/'colored'] { ... }              │
│   AppearanceContext.applyToDOM() → style.setProperty(...)      │
└────────────────────────────────────────────────────────────────┘
```

**Règles** :

- Nouveau code : **utiliser de préférence les tokens canoniques (couche 1)** ou les classes utilitaires (`.btn`, `.card`, etc.)
- Les alias (couche 2) restent supportés pour les 186+ fichiers existants
- Les composants ne consomment **jamais** la palette brute hardcodée (`#d96d4c` direct dans un `.tsx`)

### 3.6 Convention de nommage des tokens

Sémantique conservé. Nouveaux tokens : préfixés `--brand-*` (canonique) ou nommés par rôle (`--bg-*`, `--text-*`, `--border-*`, `--status-*`, `--clr-*` pour sémantiques fonctionnelles).

### 3.7 Workflow de production

```
┌─────────────┐   ┌────────────────┐   ┌─────────────┐   ┌──────┐   ┌──────┐
│  Capture    │ → │ claude.ai      │ → │ Claude Code │ → │ Stag │ → │ Prod │
│  écran      │   │ Design         │   │ (intégration)│   │ ing  │   │      │
│  existant   │   │ (mockup ALIGNÉ)│   │              │   │      │   │      │
└─────────────┘   └────────────────┘   └─────────────┘   └──────┘   └──────┘
   utilisateur     utilisateur          session Claude    deploy-     deploy.
                   itère + valide       (frontend web)    staging.ps1 ps1
                   ↑
                   palette TrackYu
                   (cf. section 3.1)
```

**Règle absolue** : claude.ai Design **doit être alimenté en palette TrackYu** avant chaque mockup. Tout mockup non-aligné est **rejeté** côté intégration (pas absorbé en silence).

Aucune intégration sans :

- Validation utilisateur du mockup côté Design
- Validation utilisateur de l'écran intégré sur staging avant prod

### 3.8 Source canonique du design system

Le dossier **`docs/design-system/`** est l'**unique source canonique** du langage visuel TrackYu. Toute autre représentation (CSS web, NativeWind mobile, templates email) est une traduction de cette source.

Quand le design system évolue, l'ordre est :

1. Mettre à jour le doc dans `docs/design-system/`
2. Propager dans chaque session (web `src/index.css`, mobile, etc.)
3. Marquer dans le changelog (section 14)

**Jamais l'inverse.**

### 3.9 Sort du dossier `New/`

**Suspendu** jusqu'à ce que claude.ai Design produise des mockups alignés sur la palette TrackYu (cf. section 3.1).

Les 15 composants dans `New/` (Sidebar, FleetTable, VehicleDetailPanel, FuelGauge, ActivityBlock, BehaviorBlock, AlertsBlock, FuelBlock, GpsBlock, FuelChart, FuelModalContent, MaintenanceModalContent, ViolationsModalContent, SharedBlocks, index.css.txt) **ne sont pas touchés**. Décision révisable une fois claude.ai Design opérationnel.

---

## 4. Décisions encore en attente

L'audit a montré que la plupart des questions Q1-Q7 du charter v0.1 sont déjà **tranchées par l'existant**. Reste ouvert :

| #   | Sujet                                                        | Hypothèse                                                                                                                                                                                                  | À confirmer                                                          |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Q-A | **Polices à ajouter** : Archivo Black + JetBrains Mono       | Inter en place + 6 polices auto-load via AppearanceContext. Archivo Black en preload statique (titres marketing/auth visibles dès première frame). JetBrains Mono via AppearanceContext (FOUT acceptable). | Validation utilisateur : "Oui ajouter, ou non garder Inter exclusif" |
| Q-B | **Mode par défaut nouveau user**                             | Actuellement `dark` (codé en dur dans `ThemeContext.tsx`). Après Phase 0bis : 2 modes seulement (`dark` ou `light`).                                                                                       | Conserver `dark` ou basculer "auto" (suit l'OS) ?                    |
| Q-C | **Ordre exact des écrans à refondre**                        | CHANTIER_DESIGN_REFONTE.md propose : Sidebar → blocks détail (Activity/Behavior/Alerts/Gps/Fuel) → modals → FleetTable → Dashboard refonte.                                                                | Conserver ou réordonner après pilote connexion ?                     |
| Q-D | **Sort de la coexistence `dark:` Tailwind + `[data-theme]`** | 1032 classes `dark:` sur 133 fichiers. Phase 2 du sous-chantier `design-harmonisation` cible `dark:hover:bg-slate-*` en batch.                                                                             | Continuer batch ou refonte profonde lors de la propagation Design ?  |
| Q-E | **Convention de styling cible**                              | 3 conventions coexistent (Tailwind v4 token natif `bg-bg-primary`, arbitrary `bg-[var(--bg-primary)]`, inline `style={{ backgroundColor: 'var(--bg-primary)' }}`)                                          | Imposer une convention unique progressivement ?                      |

Q1 à Q7 du charter v0.1 sont **fermées** :

- ~~Q1 (perimeter customization tenant)~~ → AppearanceContext couvre déjà 9 settings
- ~~Q2 (default mode new user)~~ → repris dans Q-B
- ~~Q3 (user vs tenant)~~ → déjà séparé (header switcher = user, AppearanceContext = tenant)
- ~~Q4 (white-label perimeter)~~ → déjà étendu (couleurs + font + density + sidebar + radius + logo)
- ~~Q5 (cohérence mobile)~~ → planifié Phase 4 ci-dessous
- ~~Q6 (polices)~~ → repris dans Q-A
- ~~Q7 (ordre des écrans)~~ → repris dans Q-C

---

## 5. Architecture technique — état actuel

### 5.1 Stack frontend web

- React 19.2 + Vite 6 + TypeScript 5.8
- **Tailwind 4.1.18** avec `@theme inline` (CSS variables exposées comme tokens Tailwind natifs)
- Capacitor 8 (wrapping Android natif optionnel)
- React Query 5.90, react-hook-form 7.68 + zod 4.1
- Leaflet, react-leaflet, react-leaflet-cluster, leaflet.heat (cartographie)
- Recharts 3.4 (graphes)
- react-window (virtualisation)
- socket.io-client 4.8 (WS temps réel)

### 5.2 Structure du repo

Non-standard : code à la racine (pas de `src/` central).

```
TRACKING/
├── App.tsx · index.tsx · index.html
├── components/        ← 40+ composants partagés
├── features/          ← 16 modules (admin, fleet, map, dashboard, crm, finance, support, tech, stock, settings, auth, etc.)
├── contexts/          ← Theme, Auth, Data, Appearance, Toast, Notification
├── hooks/ · services/ · lib/ · utils/ · i18n/
├── New/               ← 15 composants premium (suspendu, cf. 3.9)
├── docs/design-system/← documents du chantier (CHANTIER, AUDIT, DLS, etc.)
├── docs/frontend/     ← sous-chantiers (design-harmonisation, CHANTIER_DESIGN_REFONTE)
├── trackyu-mobile-expo/ ← session mobile (ne pas toucher)
└── src/index.css      ← UNIQUE fichier dans src/ (1218 lignes — source du design system)
```

### 5.3 Provider stack actuel

```
ErrorBoundary
└── QueryClientProvider
    └── I18nProvider
        └── ThemeProvider             ← bascule mode clair/sombre
            └── AuthProvider
                └── AppearanceProvider ← personnalisation tenant
                    └── DataProvider
                        └── NotificationProvider
                            └── ToastProvider
                                └── App
```

`AppearanceProvider` s'active après authentification et override les tokens via `api.tenants.getCurrent()`. Aucun changement structurel n'est requis pour le chantier visuel.

---

## 6. Documents associés

État vivant — mis à jour à chaque livraison.

### Documents umbrella (ce dossier `docs/design-system/`)

| Fichier                                       | Rôle                                                                                                                      | Statut                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **`CHANTIER_REFONTE_DESIGN.md`** (ce fichier) | Charter umbrella du chantier                                                                                              | ✅ v0.4                                                 |
| `AUDIT.md`                                    | Audit profond du repo : tokens existants, dette mesurée, écrans, theming, polices, conflits chantiers                     | ✅ 2026-04-26                                           |
| `DLS.md`                                      | Design Language Spec : tokens couches 1-2-3, typographie, échelles, composants atomiques, statuts, accessibilité          | ✅ v1.0 (2026-04-26)                                    |
| `SCREEN_MAP.md`                               | Inventaire 141 écrans / panels / modales en 7 vagues : composant, thème, dépendances métier, état, patterns DLS consommés | ✅ 2026-04-26                                           |
| `INTEGRATION_PLAYBOOK.md`                     | Mode d'emploi reproductible : "comment intégrer un mockup Design dans le repo" — checklist 15 points                      | ✅ v1.0 (2026-04-26)                                    |
| `BLUEPRINT.md`                                | Brief Design écrans principaux (~14 mockups) — patterns + tableaux + workflow batchs                                      | ✅ v1.1 (2026-04-26)                                    |
| `RBAC_MATRIX.md`                              | Matrice rôles × écrans × permissions (référence intégration, extrait du code)                                             | ✅ v1.0 (2026-04-26)                                    |
| `CHANGELOG.md`                                | Journal versionné du DLS et des décisions                                                                                 | ✅ initialisé 2026-04-26                                |
| `CROSS_SESSION_CONTRACT.md`                   | Contrat inter-sessions : comment web / mobile / backend consomment le DLS                                                 | 🟧 à produire (Phase 4 — quand session mobile s'aligne) |

### Sous-chantiers historiques (référencés)

| Fichier                                                                                      | Rôle                                                                                          | Statut                                                                                          |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`docs/frontend/design-harmonisation.md`](../frontend/design-harmonisation.md)               | Migration `slate-*` → tokens, Phase 1 ✅ commit `344d1d2` (~7000 remplacements, 186 fichiers) | Phase 2 ⏳ (rationaliser `dark:` Tailwind résiduels)                                            |
| [`docs/frontend/CHANTIER_DESIGN_REFONTE.md`](../frontend/CHANTIER_DESIGN_REFONTE.md)         | Tokens canoniques `--bg-app`/`--brand-primary`, refonte composants `New/`, refonte Dashboard  | Phase 0 ✅ commits `be47b5e` + `c5b312e`. Phase 1+2+3 ⏳ (en pause, ré-articulé via ce charter) |
| [`.claude/skills/frontend-design-system.md`](../../.claude/skills/frontend-design-system.md) | Skill Claude pour règles design système (à mettre à jour : couleur idle, brand `#d96d4c`)     | À mettre à jour avec ce charter                                                                 |

### Fichiers code de référence

| Fichier                                                                  | Rôle                                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [`src/index.css`](../../src/index.css)                                   | Source canonique des tokens et classes utilitaires (1218 lignes)                              |
| [`contexts/ThemeContext.tsx`](../../contexts/ThemeContext.tsx)           | Bascule mode (dark/light — `ocean` supprimé en Phase 0bis)                                    |
| [`contexts/AppearanceContext.tsx`](../../contexts/AppearanceContext.tsx) | Personnalisation tenant (9 settings)                                                          |
| [`utils/vehicleStatus.ts`](../../utils/vehicleStatus.ts)                 | `VEHICLE_STATUS_COLORS` — source de vérité statuts véhicule (point d'entrée propagation idle) |

---

## 7. Plan d'exécution par phases (révisé)

### Phase 0 — Cadrage et audit ✅ TERMINÉE

| Étape | Action                                      | Livrable                                         | Statut                                                            |
| ----- | ------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| 0.1   | Charter umbrella v0.1                       | `CHANTIER_REFONTE_DESIGN.md` (v0.1)              | ✅                                                                |
| 0.2   | Audit profond du repo                       | `AUDIT.md`                                       | ✅                                                                |
| 0.3   | Décisions stratégiques D1/D2/D3             | (échange)                                        | ✅ — D1 brand `#d96d4c` maintenu, D2 umbrella, D3 `New/` suspendu |
| 0.4   | Charter umbrella v0.2 (révision post-audit) | `CHANTIER_REFONTE_DESIGN.md` (v0.2 — ce fichier) | ✅                                                                |

### Phase 0bis — Suppression du thème `ocean` (clean cut, avant tout chantier visuel)

**Pourquoi avant Phase 1** : simplifier l'architecture sur un terrain vierge (aucun user en prod) avant de propager les écrans. Sinon chaque écran refait porterait inutilement la complexité 3 thèmes.

**Périmètre** : modifications minimales, code uniquement, ~30 min effort + tests.

| Étape  | Fichier                     | Action                                                                                                                                                                                                          |
| ------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0bis.1 | `contexts/ThemeContext.tsx` | Type `ThemePreset = 'dark' \| 'light'` (suppression `'ocean'`). Init : si localStorage contient `'ocean'`, basculer vers `'dark'` (1 ligne). `applyTheme` : suppression de la branche meta `theme-color` ocean. |
| 0bis.2 | `App.tsx` (header switcher) | Switcher 3 boutons → toggle 2 boutons (Sun / Moon). Suppression de l'icône `Waves`.                                                                                                                             |
| 0bis.3 | `src/index.css`             | Suppression du bloc `[data-theme='ocean']` (~95 lignes), suppression des règles spécifiques `[data-theme='ocean'][data-sidebar='dark']`, suppression du remap slate/gray spécifique ocean.                      |
| 0bis.4 | (recherche globale)         | Vérifier qu'aucun composant ne fait `theme === 'ocean'` ou `data-theme="ocean"` en condition                                                                                                                    |
| 0bis.5 | Test local                  | Toggle clair/sombre, vérifier qu'aucun écran ne casse, vérifier qu'aucun composant ne référence ocean                                                                                                           |
| 0bis.6 | `deploy-staging.ps1`        | Validation visuelle staging                                                                                                                                                                                     |
| 0bis.7 | Validation utilisateur      | Confirmer staging                                                                                                                                                                                               |
| 0bis.8 | `deploy.ps1 -frontend`      | Prod                                                                                                                                                                                                            |
| 0bis.9 | Mise à jour documentation   | `.claude/skills/frontend-design-system.md` (palette mobile + remap)                                                                                                                                             |

**Critère de réussite** : l'app fonctionne identiquement sur tous les écrans en mode `dark` et `light`. Le thème `ocean` n'est plus accessible nulle part.

**Risque résiduel** : un composant peut avoir un `if (theme === 'ocean')` non détecté → grep préalable obligatoire.

### Phase 1 — Fondations documentaires ✅ TERMINÉE

| Étape | Action                                                | Livrable                          | Statut                                                       |
| ----- | ----------------------------------------------------- | --------------------------------- | ------------------------------------------------------------ |
| 1.1   | Extraction du DLS depuis `src/index.css` existant     | `DLS.md` v1.0                     | ✅                                                           |
| 1.2   | Inventaire écrans + Screen Map (141 écrans, 7 vagues) | `SCREEN_MAP.md`                   | ✅                                                           |
| 1.3   | Playbook d'intégration                                | `INTEGRATION_PLAYBOOK.md` v1.0    | ✅                                                           |
| 1.4   | Changelog initial                                     | `CHANGELOG.md`                    | ✅                                                           |
| 1.5   | Charter umbrella v0.4 (cette mise à jour)             | `CHANTIER_REFONTE_DESIGN.md` v0.4 | ✅                                                           |
| 1.6   | Cross-session contract (web/mobile/backend)           | `CROSS_SESSION_CONTRACT.md`       | ⏸ reporté Phase 4 (à produire quand session mobile s'aligne) |

**Aucune modification de code dans cette phase. Tout est documentaire.**

### Phase 2 — Pilote dashboard (premier écran intégré)

**Bloquant** : (a) commit + déploiement Phase 0bis (suppression ocean), (b) corrections mockup dashboard reçu (3 corrections demandées : KPI tronqués, idle ambre, bleu maintenance).

> Note : initialement la Phase 2 ciblait la connexion, mais le mockup Design v1 reçu est sur le dashboard. On ajuste.

| Étape | Action                                                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1   | Localiser le composant cible : `features/dashboard/components/DashboardView.tsx` (1772 lignes)                                                               |
| 2.2   | Confronter le mockup corrigé au DLS — flagger les écarts                                                                                                     |
| 2.3   | Réappliquer le styling en utilisant les tokens canoniques (couche 1) ou les classes utilitaires existantes                                                   |
| 2.4   | Préserver `useAuth`, `useDataContext`, `useTranslation`, `useDateRange`, `useCurrency`, KPIs adaptés par rôle (CLIENT/TECH/COMMERCIAL/FINANCE/SUPPORT/ADMIN) |
| 2.5   | Si polices Archivo Black / JetBrains Mono validées (Q-A) : ajout dans `index.html` (preload statique)                                                        |
| 2.6   | Factorisation graphes Recharts : créer `lib/chart-colors.ts` qui lit `getComputedStyle`                                                                      |
| 2.7   | Validation locale (2 modes × 3 langues × 2 rôles minimum)                                                                                                    |
| 2.8   | `deploy-staging.ps1`                                                                                                                                         |
| 2.9   | Validation utilisateur sur staging                                                                                                                           |
| 2.10  | `deploy.ps1 -frontend`                                                                                                                                       |
| 2.11  | Mise à jour `SCREEN_MAP.md` : dashboard = ✅ intégré prod                                                                                                    |
| 2.12  | Mise à jour `CHANGELOG.md`                                                                                                                                   |

### Phase 3 — Propagation par vagues (selon SCREEN_MAP.md)

Une fois le pilote dashboard validé, propagation par vagues définies dans [`SCREEN_MAP.md`](SCREEN_MAP.md) :

| Vague | Périmètre                                                                                      | Référence SCREEN_MAP      |
| ----- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| 3.1   | **Chrome & Auth** : Connexion, Activation, Reset, Sidebar, Header, Bottom nav                  | Vague 1 (7 écrans)        |
| 3.2   | **Operations restants** : Map, Replay, FleetTable, VehicleDetailPanel + 5 blocs + 3 modals     | Vague 2 reste (15 écrans) |
| 3.3   | **Composants partagés** : Modal, Drawer, BottomSheet, CommandPalette, NotificationCenter, etc. | Vague 3 (22 composants)   |
| 3.4   | **Settings & Admin** : SettingsView + 6 onglets, Admin + 13 panels                             | Vague 4 (23 écrans)       |
| 3.5   | **Business** : Prévente, Vente, Comptabilité                                                   | Vague 5 (29 écrans)       |
| 3.6   | **Technique** : Interventions, Monitoring, Stock, Agenda                                       | Vague 6 (23 écrans)       |
| 3.7   | **Support & Rapports** : Tickets, Chat, FAQ, Reports + 7 onglets                               | Vague 7 (21 écrans)       |

À chaque écran : suivre [`INTEGRATION_PLAYBOOK.md`](INTEGRATION_PLAYBOOK.md) (13 étapes + checklist 15 points). Mise à jour `SCREEN_MAP.md` + `CHANGELOG.md` après chaque déploiement prod.

À chaque vague : staging → validation → prod → SCREEN_MAP.md mise à jour.

### Phase 4 — Chantiers complémentaires

Reprise des points résiduels :

- **Propagation idle `#FBBF24`** : investigation cas par cas (197 occurrences `#f97316`), modification `--status-idle` dans 3 thèmes + `VEHICLE_STATUS_COLORS` + composants concernés. **Signaler à la session mobile.**
- **Rationalisation `dark:` Tailwind** : reprise Phase 2 `design-harmonisation`, batch sur `dark:hover:bg-slate-*` (~230 occurrences estimées), `bg-slate-50/100` (~83 occurrences hors exceptions), titres → `.page-title`.
- **Refactor 3 conventions de styling** vers Tailwind v4 natif (`@theme inline`).
- **Factorisation StatCard / RadialGauge / palette Recharts** (lib `chart-colors.ts` qui lit `getComputedStyle`).
- **Scrollbars theme-aware** (actuellement `rgba(148,163,184,0.3)` hardcodé).
- **Mise à jour `.claude/skills/frontend-design-system.md`** avec couleur idle ambre + tokens canoniques.
- **Alignement mobile** : signaler tokens cibles (`#d96d4c`, idle `#FBBF24`) à la session mobile pour propagation symétrique dans `tokens.ts` / `themes.ts`.

---

## 8. Garde-fous (règles non-négociables)

1. **Aucun composant ne consomme la palette brute hardcodée.** Toujours passer par les tokens (couche 1 ou 2) ou les classes utilitaires.
2. **Aucun hex hardcodé** introduit dans les composants (sauf dans les exceptions documentées : graphes Recharts en attente de factorisation, cartes Leaflet, badges sémantiques figés).
3. **Aucune classe `slate-*` / `gray-*` / `zinc-*`** introduite (sauf exceptions documentées : `MapView.tsx`, `SensorsBlock.tsx`, bulles SMS, previews PDF, logos, badges "Annulé/Inactif").
4. **Aucune rupture sur la logique métier.** Hooks, props, handlers, validations, i18n, guards rôles, WS, calculs serveur, isolation tenant : strictement préservés.
5. **Aucune modification non sollicitée.** Une session qui touche un fichier ne modifie que ce que sa tâche exige.
6. **Aucun déploiement prod sans validation staging explicite** (CLAUDE.md).
7. **Aucun écran intégré sans mise à jour de `SCREEN_MAP.md`.**
8. **Aucune introduction de token (couche 1 ou 2) sans entrée dans `DLS.md` + `CHANGELOG.md`.**
9. **Pas de variation visuelle silencieuse.** Si un mockup propose un écart vs DLS, on tranche avec l'utilisateur avant intégration.
10. **Tests d'accessibilité** sur chaque écran refondu : contraste WCAG AA (4.5:1 texte normal, 3:1 large), focus visible au clavier, structure HTML.
11. **Aucun mockup claude.ai Design intégré s'il n'utilise pas la palette TrackYu** (cf. section 3.1).

---

## 9. Risques identifiés et mitigations

| Risque                                                                                   | Probabilité                 | Impact                         | Mitigation                                                                                         |
| ---------------------------------------------------------------------------------------- | --------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| **claude.ai Design produit un mockup non aligné** sur `#d96d4c`                          | Moyenne                     | Régression visuelle si intégré | Section 3.7 : rejet systématique des mockups non alignés                                           |
| **Dérive cumulative** entre écrans refondus                                              | Faible (DLS strict)         | Échec du chantier              | DLS + confrontation systématique                                                                   |
| **Régression métier** sur un écran refondu                                               | Moyenne                     | Bug en prod                    | Validation staging obligatoire + tests 3 langues / 2 rôles                                         |
| **Désynchronisation web ↔ mobile**                                                       | Élevée (déjà pré-existante) | Look incohérent                | `CROSS_SESSION_CONTRACT.md` + signalement explicite à chaque ajustement web                        |
| **Personnalisation tenant casse l'accessibilité** (couleur de marque illisible sur fond) | Moyenne                     | Plaintes utilisateurs          | Validation contraste WCAG côté color picker (refus si trop bas)                                    |
| **Performance** ajout polices (Archivo Black + JetBrains Mono)                           | Faible                      | Légère dégradation TTI         | Preload + `font-display: swap` + stratégie statique vs lazy (Q-A)                                  |
| **Coexistence `dark:` + `[data-theme]`** crée des écarts subtils                         | Élevée (existante)          | Look incohérent                | Phase 4 rationalisation                                                                            |
| **Dossier `New/` oublié et obsolète**                                                    | Moyenne                     | Code mort                      | Décision Phase 4 : intégrer ou supprimer après alignement Design                                   |
| **Perte de mémoire entre sessions Claude**                                               | Élevée                      | Dérive sur la durée            | Ce document + `CHANGELOG.md` mis à jour à chaque action + skill `frontend-design-system.md` à jour |
| **Tentation de "tout refaire d'un coup"**                                                | Moyenne                     | Effets de bord                 | Vagues phasées + validation explicite par vague                                                    |

---

## 10. Glossaire

| Terme                          | Définition                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| **DLS**                        | Design Language Spec — `DLS.md`, document de référence des tokens / composants / règles             |
| **Token canonique** (couche 1) | Variable CSS principale, source de vérité (`--bg-app`, `--brand-primary`)                           |
| **Token alias** (couche 2)     | Variable CSS pointant vers un canonique pour rétro-compatibilité (`--bg-primary` → `var(--bg-app)`) |
| **Override** (couche 3)        | Règle qui mappe les tokens selon le mode (`[data-theme]`) ou le tenant (`AppearanceContext`)        |
| **`@theme inline`**            | Directive Tailwind v4 qui expose des CSS variables comme tokens utilisables en classes              |
| **Composant atomique**         | Brique partagée (Button, Card, Badge…) — `components/`                                              |
| **Mockup**                     | Maquette visuelle générée par claude.ai Design                                                      |
| **Intégration**                | Étape où un mockup est traduit en code dans le repo                                                 |
| **Vague**                      | Lot d'écrans refondus ensemble pour un déploiement staging unique                                   |
| **Charte tenant**              | Personnalisation visuelle d'un tenant (couleur, logo, font, density) via `AppearanceContext`        |
| **White-label**                | App rebrandable par tenant                                                                          |
| **Sous-chantier**              | Chantier antérieur à ce charter, archivé sous `docs/frontend/`                                      |
| **Umbrella**                   | Ce charter — orchestre les sous-chantiers et le nouveau workflow Design                             |
| **Cross-session**              | Travail réparti entre plusieurs sessions Claude (frontend web, mobile, backend)                     |

---

## 11. Points de contact / où trouver quoi

| Besoin                                         | Endroit                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Décisions design                               | Ce fichier (sections 3 et 4)                                                         |
| Audit complet du repo                          | `AUDIT.md`                                                                           |
| Inventaire des tokens et composants            | `DLS.md` (à produire Phase 1)                                                        |
| État d'avancement par écran                    | `SCREEN_MAP.md` (à produire Phase 1)                                                 |
| Plan d'exécution                               | `MIGRATION_PLAN.md` (à produire Phase 1)                                             |
| Comment intégrer un mockup                     | `INTEGRATION_PLAYBOOK.md` (à produire Phase 1)                                       |
| Coordination entre sessions                    | `CROSS_SESSION_CONTRACT.md` (à produire Phase 1)                                     |
| Historique des décisions                       | `CHANGELOG.md` (à produire Phase 1)                                                  |
| Sous-chantier `harmonisation` (slate → tokens) | [`docs/frontend/design-harmonisation.md`](../frontend/design-harmonisation.md)       |
| Sous-chantier `refonte` (composants premium)   | [`docs/frontend/CHANTIER_DESIGN_REFONTE.md`](../frontend/CHANTIER_DESIGN_REFONTE.md) |
| Règles permanentes du projet                   | `CLAUDE.md` (racine du repo)                                                         |
| Skills techniques                              | `.claude/skills/frontend-design-system.md`, `ux_ui.md`, `mobile_frontend.md`         |
| Tokens CSS canoniques (code)                   | [`src/index.css`](../../src/index.css)                                               |
| Statuts véhicule (source code)                 | [`utils/vehicleStatus.ts`](../../utils/vehicleStatus.ts)                             |
| Bascule mode (code)                            | [`contexts/ThemeContext.tsx`](../../contexts/ThemeContext.tsx)                       |
| Personnalisation tenant (code)                 | [`contexts/AppearanceContext.tsx`](../../contexts/AppearanceContext.tsx)             |
| Mockups source                                 | claude.ai Design (compte utilisateur)                                                |

---

## 12. État actuel et prochaine étape

**Phase courante** : Phase 1 — Fondations documentaires ✅ **terminée**.

### Prochaine action attendue

**Côté utilisateur** :

1. **Phase 0bis** : commit + `deploy-staging.ps1` + validation + `deploy.ps1 -frontend` (suppression ocean, déjà exécutée en local)
2. Transmettre les **3 corrections du mockup dashboard** à claude.ai Design (KPI tronqués, idle ambre, bleu maintenance hors palette)
3. Réceptionner le mockup dashboard corrigé

**Côté Claude Code (cette session)** :

Aucune action tant que (a) Phase 0bis n'est pas en prod et (b) le mockup dashboard corrigé n'est pas reçu. Phase 2 (intégration code dashboard) démarre dès réception du mockup corrigé.

### Sessions parallèles à informer (à la fin de Phase 1 ou Phase 4)

- **Session mobile** (`trackyu-mobile-expo/`) : alignement futur sur tokens cibles (idle `#FBBF24`, brand `#d96d4c` confirmé). Pas d'action immédiate.
- **Session backend** (`trackyu-backend/`) : aucune action liée au design pur ; éventuellement enrichissement de l'API tenant (logo upload, color validation côté serveur) si demandé en Phase 4.

---

## 13. Décisions stratégiques prises

| Date       | Décision                                                                                                                                                                                                                                                                                                | Validation                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 2026-04-26 | **D1** — Couleur de marque `#d96d4c` maintenue. claude.ai Design s'aligne sur TrackYu.                                                                                                                                                                                                                  | ✅ utilisateur                   |
| 2026-04-26 | **D2** — `CHANTIER_REFONTE_DESIGN.md` devient l'**umbrella**. `design-harmonisation.md` et `CHANTIER_DESIGN_REFONTE.md` deviennent sous-chantiers historiques liés.                                                                                                                                     | ✅ utilisateur                   |
| 2026-04-26 | **D3** — Dossier `New/` **suspendu** le temps que claude.ai Design s'aligne. Les 15 composants ne sont pas touchés.                                                                                                                                                                                     | ✅ utilisateur                   |
| 2026-04-26 | **D4** — Stratégie d'affichage = **2 modes (clair/sombre) + accent tenant via AppearanceContext**. Suppression du thème `ocean` (redondant avec AppearanceContext). Aucun user impacté (app pas encore ouverte). Exécution programmée en Phase 0bis avant tout chantier visuel.                         | ✅ utilisateur                   |
| 2026-04-26 | **D5** — Mockup Design v1 du Dashboard reçu, 3 corrections demandées (KPI tronqués, idle ambre, maintenance bleue). Dashboard validé visuellement.                                                                                                                                                      | ✅ utilisateur                   |
| 2026-04-26 | **D6** — Convention labels FR systématique. Statuts Kanban traduits (`Nouveau` / `Qualifié` / `Proposition` / `Gagné` / `Perdu`). Scoring leads : `Chaud` / `Moyen` / `Dormant`.                                                                                                                        | ✅ utilisateur                   |
| 2026-04-26 | **D7** — Workflow Design : **Fleet seul d'abord** comme premier livrable.                                                                                                                                                                                                                               | ✅ utilisateur                   |
| 2026-04-26 | **D8** — Mode systématique : **clair ET sombre** livrés pour chaque mockup.                                                                                                                                                                                                                             | ✅ utilisateur                   |
| 2026-04-26 | **D9** — RBAC reste un concern code. RBAC_MATRIX.md sert de référence à l'intégration (pas dans les mockups).                                                                                                                                                                                           | ✅ utilisateur                   |
| 2026-04-26 | **D10** — Niveau d'ouverture créative Design = **B (Équilibré)**. MUSTS / LIBERTÉS / NUDGES. DLS vit, ne fige pas.                                                                                                                                                                                      | ✅ utilisateur                   |
| 2026-04-26 | **D11** — Stratégie production : **template universel + atypiques sur mesure**. 1 template × application aux 8 modules + 6 mockups atypiques (Dashboard, Fleet, Map, Replay, Tickets, Agenda, Monitoring).                                                                                              | ✅ utilisateur                   |
| 2026-04-26 | **D12** — **PIVOT REWRITE** : abandon adaptation legacy au profit construction `trackyu-front-V2` à partir des mockups Design comme code source. Backend intact. Charter D1 ("aucune rupture technique") **requalifié** : rupture technique frontend acceptée et choisie ; continuité métier maintenue. | ✅ utilisateur                   |
| 2026-04-26 | **D13** — Nom du nouveau projet : **`trackyu-front-V2`** (dossier `c:/Users/ADMIN/Desktop/trackyu-front-V2/`).                                                                                                                                                                                          | ✅ utilisateur                   |
| 2026-04-26 | **D14** — Stack `trackyu-front-V2` : reproduit l'existant (Vite 6 + React 19 + TS 5.8 + Tailwind 4) + Capacitor 8 (PWA Android) + **ajout React Router v7** (corrige le View enum non-standard du legacy).                                                                                              | ✅ utilisateur (mon avis validé) |
| 2026-04-26 | **D15** — Source initiale `trackyu-front-V2` : **copie sélective** depuis legacy `TRACKING/` (services/, types/, i18n/locales/, lib/, utils/vehicleStatus.ts, contexts/Theme + Appearance, src/index.css). Reste réécrit depuis Design.                                                                 | ✅ utilisateur (mon avis validé) |
| 2026-04-26 | **D16** — Migration : DNS reste sur legacy **jusqu'à parité fonctionnelle totale**. Switch nginx au moment de la bascule. Pas de coexistence partielle.                                                                                                                                                 | ✅ utilisateur                   |
| 2026-04-26 | **D17** — Sort du legacy : **archive read-only** dans `TRACKING/` après bascule. Accessible comme référence métier mais plus de modifications.                                                                                                                                                          | ✅ utilisateur                   |

---

## 14. Changelog

| Date       | Version | Auteur                                   | Changement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-26 | v0.1    | Claude Code (frontend web) + utilisateur | Création du charter — décisions provisoires, Q1-Q7 ouvertes, Phase 0 démarrée                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-04-26 | v0.2    | Claude Code (frontend web) + utilisateur | **Révision post-audit majeure** : intégration des découvertes `AUDIT.md`. Brand `#d96d4c` confirmé (D1). Charter devient umbrella (D2). `New/` suspendu (D3). Sections 3 / 4 / 5 / 6 / 7 / 11 / 13 entièrement révisées pour refléter l'existant (3 thèmes actifs, AppearanceContext fonctionnel, sous-chantiers référencés). Q1-Q7 fermées et remplacées par Q-A à Q-E (vraies questions ouvertes).                                                                                                                                 |
| 2026-04-26 | v0.3    | Claude Code (frontend web) + utilisateur | **Décision D4** : passage à 2 modes (clair/sombre) + accent tenant via AppearanceContext. Suppression du thème `ocean` (redondant). Section 3.2 réécrite. Phase 0bis ajoutée au plan d'exécution (suppression code ocean avant chantier visuel). Q-B mise à jour. Section 1 / 2 / 3.5 / 5.3 / 11 nettoyées des mentions "3 thèmes" et "ocean".                                                                                                                                                                                       |
| 2026-04-26 | v0.4    | Claude Code (frontend web) + utilisateur | **Phase 1 livrée** : production de `DLS.md` v1.0, `SCREEN_MAP.md` (141 écrans / 7 vagues), `INTEGRATION_PLAYBOOK.md` v1.0, `CHANGELOG.md`. `CROSS_SESSION_CONTRACT.md` reporté Phase 4. Phase 2 réorientée du pilote connexion vers le pilote dashboard (mockup Design v1 reçu). Section 6 / 7 / 8 / 12 mises à jour.                                                                                                                                                                                                                |
| 2026-04-26 | v0.5    | Claude Code (frontend web) + utilisateur | **PIVOT REWRITE** (D12-D17) : décision de reconstruire le frontend dans `trackyu-front-V2` à partir des mockups Design comme code source. Section 1 (synthèse) réécrite + ajout section "Pivot D12" + 4 principes révisés. Section 13 (décisions) enrichie avec D5-D17. Charter devient le **document maître du chantier rewrite** ; le legacy `TRACKING/` devient archive read-only après bascule. Le plan d'exécution sera détaillé dans [STATE.md](STATE.md) (état temps réel) + module-specs dans `docs/design-system/modules/`. |

---

> **Toute modification de ce document = entrée obligatoire au changelog (section 14).**
