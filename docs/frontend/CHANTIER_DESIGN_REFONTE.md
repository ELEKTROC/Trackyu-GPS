# Chantier — Refonte Design Web TrackYu

**Statut** : en cours, pause pendant chantier stats backend/frontend (useVehicleStats). Reprendre après.
**Dernière mise à jour** : 2026-04-24
**Branche** : `chore/phase-2-10-gps-server`
**Commits déjà poussés** :

- `be47b5e` — feat(design): Phase 0 tokens canoniques + fixes contraste blocs véhicule
- `c5b312e` — feat(fleet): hook useVehicleStats + harmonisation design blocs véhicule

---

## Contexte & vision

Refonte complète du design web pour aligner sur la charte logo TrackYu GPS et converger vers les maquettes mobile (3 thèmes white label **Light / Dark / Ocean**). Identité cockpit premium, benchmark Samsara/Motive, à dépasser TRAKZEE.

**Logo** (fichier `docs/charte/` à intégrer) : wordmark "Trackyu GPS", "a" remplacé par flèche/montagne orange, tagline **SIMPLE. PUISSANT. FIABLE.**

---

## Décisions validées par l'utilisateur

| #   | Sujet                           | Décision                                                                                                                                                                                            |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Stratégie tokens                | **Option B** : nouveaux tokens canoniques (`--bg-app`, `--bg-card`, `--brand-primary`...) + aliases backward-compat (`--primary: var(--brand-primary)`, etc.) pour migration progressive sans casse |
| 2   | Bug `DEFAULT_APPEARANCE`        | `#2563eb` retiré, override conditionnel uniquement si tenant a primaryColor explicite                                                                                                               |
| 3   | Scope intégration               | Tout le dossier `New/` en une fois (cohérence premium)                                                                                                                                              |
| 4   | Drag & Drop Dashboard           | **Retirer** (cockpit fixe et prévisible)                                                                                                                                                            |
| 5   | Sparklines KPI                  | **Mock Phase 1**, branchement données Phase 2                                                                                                                                                       |
| 6   | Ordre phases                    | Phase 0 tokens **impérative d'abord**                                                                                                                                                               |
| 7   | FuelBlock props                 | `level` / `percentage` / `maxCapacity`                                                                                                                                                              |
| 8   | Orange final                    | **`#d96d4c`** (terracotta vif, après essais `#F58220`, `#FF5C00`, `#c45b3a`)                                                                                                                        |
| 9   | Block headers                   | **Discrets** : `bg-[var(--brand-primary-dim)]` + `border-b` + `text-[var(--text-secondary)]` + icône primary. Les **données** sont reines, le header = simple démarcation                           |
| 10  | Panel header VehicleDetailPanel | Solide `var(--brand-primary)` + texte blanc pour hiérarchie globale                                                                                                                                 |

---

## Phase 0 — DONE ✅ (commit `be47b5e` + `c5b312e`)

### `src/index.css` — tokens canoniques + aliases

Nouveaux tokens canoniques (utiliser en priorité dans tout nouveau code) :

- `--bg-app`, `--bg-card`, `--bg-elevated`
- `--brand-primary`, `--brand-primary-light`, `--brand-primary-dim`, `--brand-gradient`
- `--text-main`, `--text-secondary`, `--text-muted`, `--text-inverse`, `--text-on-primary`
- `--border-ui`, `--border-strong`
- `--brand-sidebar-bg`, `--brand-sidebar-text`

Aliases backward-compat (support des 186+ fichiers existants) :

- `--bg-primary → var(--bg-app)`
- `--bg-surface → var(--bg-card)`
- `--primary → var(--brand-primary)`
- `--primary-dim → var(--brand-primary-dim)`
- `--border → var(--border-ui)`
- `--text-primary → var(--text-main)`

### Valeurs finales par thème

**Dark**

```
--bg-app: #0d0d0f
--bg-card: #16161a
--bg-elevated: #1c1c21
--brand-primary: #d96d4c
--brand-primary-light: #e08a70
--brand-primary-dim: rgba(217, 109, 76, 0.1)
--text-main: #f9fafb
--border-ui: rgba(255, 255, 255, 0.12)
--brand-sidebar-bg: #111114
```

**Ocean**

```
--bg-app: #080e1a
--bg-card: #0f172a
--bg-elevated: #1e293b
--brand-primary: #38bdf8
--brand-primary-light: #7dd3fc
--brand-primary-dim: rgba(56, 189, 248, 0.1)
--text-main: #f1f5f9
--border-ui: rgba(148, 163, 184, 0.15)
--brand-sidebar-bg: #0f172a
```

**Light**

```
--bg-app: #f8fafc
--bg-card: #ffffff
--bg-elevated: #f1f5f9
--brand-primary: #d96d4c
--brand-primary-light: #e08a70
--brand-primary-dim: rgba(217, 109, 76, 0.05)
--text-main: #0f172a
--border-ui: rgba(0, 0, 0, 0.08)
--brand-sidebar-bg: #ffffff
```

### `contexts/AppearanceContext.tsx` — bug critique fixé

Le `DEFAULT_APPEARANCE.primaryColor = '#2563eb'` (bleu) **écrasait** `--brand-primary` au boot. Corrigé :

- Valeurs par défaut = `''` (vide)
- `applyToDOM` override `--primary`/`--brand-primary` **uniquement si** tenant a custom explicite
- Sinon `removeProperty` → le thème CSS (dark/ocean/light) reprend le contrôle

### Composants migrés (design + contraste)

- **`SharedBlocks.tsx`** : `CollapsibleSection` header discret (tint primary 10-15% + border-b + text-secondary)
- **`VehicleDetailPanel.tsx`** : header panel solide `var(--brand-primary)` + texte blanc + overlay `bg-black/20` pour status row
- **`ActivityBlock.tsx`** : labels Conduite/Ralenti/Arrêt/Hors ligne colorés via `var(--status-*)` (vert/orange/rouge/gris), labels "Dernier trajet"/"Distance" passés à `text-secondary`
- **`FuelBlock.tsx`** : tooltip semaine theme-aware (`--bg-card` + `--clr-*-strong`), tab actif `--bg-card` au lieu de `--card,white` inexistant
- **`AlertsBlock.tsx`** : fonds via `--clr-danger/warning/caution-dim` (adaptent par thème)
- **`VehicleDetailPanel.tsx`** statusColors : variantes `--clr-*-strong/-dim` (contraste optimal dark + light)

---

## Phase 1 — À FAIRE ⏳ (intégration dossier `New/`)

Après le chantier stats, reprendre l'intégration du dossier `New/` qui contient les composants à refonder pour matcher les maquettes utilisateur.

### Fichiers dans `New/` (déjà prêts, à intégrer)

Chemin : `c:/Users/ADMIN/Desktop/TRACKING/New/`

| Fichier                                          | Cible d'intégration                                                               | Statut design                                                                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.css.txt`                                  | `src/index.css`                                                                   | ✅ Déjà intégré (Phase 0)                                                                                                                                              |
| `Sidebar.tsx`                                    | `components/Sidebar.tsx`                                                          | ⏳ À intégrer — sidebar collapsed 80px, hover → 256px, logo glow orange                                                                                                |
| `VehicleDetailPanel.tsx` (extrait améliorations) | `features/fleet/components/VehicleDetailPanel.tsx`                                | 🟡 Partiellement intégré — il reste à ajouter QuickStat (3 cols Vitesse/Fuel/Statut), backdrop-blur, Section component                                                 |
| `SharedBlocks.tsx`                               | `features/fleet/components/detail-blocks/SharedBlocks.tsx`                        | 🟡 Block header discret déjà fait, mais la version New/ a `animate-in fade-in slide-in-from-top-1` → nécessite plugin `tailwindcss-animate` ou remplacement manuel     |
| `ActivityBlock.tsx`                              | `features/fleet/components/detail-blocks/ActivityBlock.tsx`                       | ⏳ Refonte complète : position en glass card, grille télémétrie 2×2, replay button bas                                                                                 |
| `AlertsBlock.tsx`                                | `features/fleet/components/detail-blocks/AlertsBlock.tsx`                         | ⏳ Border-l-2 coloré par sévérité                                                                                                                                      |
| `BehaviorBlock.tsx`                              | `features/fleet/components/detail-blocks/BehaviorBlock.tsx`                       | ⏳ Jauge SVG score circulaire + drop-shadow orange + 3 stats cards (Freinages/Accél/Virages)                                                                           |
| `FuelBlock.tsx`                                  | `features/fleet/components/detail-blocks/FuelBlock.tsx`                           | ⏳ Refonte tabs Aujourd'hui/Semaine + FuelGauge centrale + 2 stats (Consommé/Économie)                                                                                 |
| `FuelGauge.tsx`                                  | `features/fleet/components/detail-blocks/FuelGauge.tsx` (nouveau fichier à créer) | ⏳ Composant **semi-circulaire 270°** (arcLength 0.75) avec drop-shadow `[0_0_8px_var(--brand-primary)]`, props `level` / `percentage` / `maxCapacity`, min/max en bas |
| `GpsBlock.tsx`                                   | `features/fleet/components/detail-blocks/GpsBlock.tsx`                            | ⏳ TechRow minimaliste + cards batterie/signal                                                                                                                         |
| `FleetTable.tsx`                                 | `features/fleet/components/FleetTable.tsx`                                        | ⏳ Refonte complète : `divide-y divide-transparent`, hover `bg-app`, IDs en orange brand, mini fuel gauge en barre, actions opacity-0 group-hover                      |
| `FuelChart.tsx`                                  | Nouveau fichier dans `features/fleet/components/`                                 | ⏳ AreaChart Recharts avec gradient primary                                                                                                                            |
| `FuelModalContent.tsx`                           | `features/fleet/components/detail-blocks/modals/FuelModalContent.tsx`             | ⏳ Stats 3 cards + timeline pleins                                                                                                                                     |
| `MaintenanceModalContent.tsx`                    | `features/fleet/components/detail-blocks/modals/MaintenanceModalContent.tsx`      | ⏳ Alerte critique + historique timeline                                                                                                                               |
| `ViolationsModalContent.tsx`                     | `features/fleet/components/detail-blocks/modals/ViolationsModalContent.tsx`       | ⏳ Grade géant A/B/C + journal événements                                                                                                                              |

### Patterns typographiques identitaires (à appliquer partout)

- `font-black` (weight 900) sur les labels importants
- `uppercase tracking-widest` pour labels (uppercase) / `tracking-tighter` pour titres
- `font-mono` sur tous les nombres (valeurs, IMEI, coordonnées, durées)
- Text sizes très petits et dense : `text-[9px]`, `text-[10px]`, `text-[11px]`
- Glow orange sur éléments clés : `drop-shadow-[0_0_Xpx_var(--brand-primary)]`
- Bordures en rgba transparent (pas d'hex opaque)

### Points à clarifier au redémarrage

1. **Classes `animate-in fade-in slide-in-from-top-1`** (SharedBlocks.tsx New/) — Tailwind v4 sans `tailwindcss-animate`. Deux options :
   - (a) Ajouter la dep `tailwindcss-animate` au `package.json`
   - (b) Remplacer par des transitions CSS manuelles (`transition-all`, `animate-fadeIn` déjà dans index.css)

2. **Bug import** dans `New/GpsBlock.tsx:2` : `import { hardDrive }` → doit être `HardDrive` (PascalCase). Le symbole est inutilisé ailleurs dans le fichier, donc à retirer si pas besoin.

3. **VehicleDetailPanel.tsx de New/** est un **extrait d'améliorations**, pas le fichier complet (voir commentaire lignes 1-3). À intégrer **patterns par patterns** dans le fichier existant, pas remplacement direct.

---

## Phase 2 — Dashboard refonte complète ⏳

Sur brief utilisateur détaillé (rôle UI/UX + Data Viz) :

### Directives clés

**Simplification structurelle** :

- Supprimer toutes les **bordures** et **ombres portées** autour des blocs individuels
- Séparation visuelle uniquement par **contraste de couleur** : `bg-[var(--bg-card)]` sur `bg-[var(--bg-app)]`
- `var(--brand-radius)` (0.75rem) pour tous les arrondis
- **Retirer le Drag & Drop** (`DraggableSection` + `useDashboardLayout`) — cockpit fixe

**Modernisation Data Viz** :

- **KPIs du haut** : cartes avec **mini-tendance sparkline** (area chart) en fond ou à côté, évolution 24h
  - Données **mock Phase 1**, branchement données réelles Phase 2 (endpoint backend `/sparklines` à créer ou filtrage client)
- **Graphique central Carburant** : remplacer le bar chart rouge par un **AreaChart superposé** Consommation vs Recharges sur 24h
- **Jauge radiale "Score"** : SVG haute précision (inspiré `FuelGauge.tsx`), allumage `var(--brand-primary)`
  - Composant réutilisable à créer : `components/RadialGauge.tsx` (Score 0-100, Carburant 0-350, etc.)

**Télémétrie & Alertes (tableaux)** :

- Densité **compacte** via `var(--brand-density-py)` = 'compact'
- Remplacer les valeurs textuelles d'états (batterie 80%) par des **mini-barres de progression** colorées (custom div + % width)

**Contrainte absolue** : aucune couleur hexadécimale en dur. Tout passe par les variables CSS définies dans `AppearanceProvider`.

### Fichier cible

`features/dashboard/components/DashboardView.tsx` (1772 lignes actuellement).

### Références visuelles

3 maquettes envoyées (Light / Dark / Ocean) montrent :

- Jauge centrale "100" radiale
- 4-6 KPI cards en haut avec sparklines
- Area chart Activité Flotte + Area chart Sylvae Time
- Bar charts Mesure de fonction / Consumption Time
- Table dense avec status dots + quantité + timestamp

---

## Phase 3 — Chantiers complémentaires ⏳

- **Scrollbars theme-aware** — actuellement `rgba(148,163,184,0.3)` hardcodé dans `src/index.css`. À migrer vers `var(--text-muted)` ou équivalent.
- **Audit grep final** — `grep -rn "slate-\|bg-blue-\|text-purple-"` hors exceptions documentées (SensorsBlock.tsx bg-slate-900, MapView.tsx border-slate-700/50, bulles chat SMS, previews PDF, logos bg-white, badges Annulé/Inactif)
- **Mise à jour** `.claude/skills/frontend-design-system.md` et `docs/frontend/design-harmonisation.md` avec les nouveaux tokens canoniques `--brand-primary` / `--bg-app` / `--bg-card`
- **Mobile** (session parallèle) — aligner les tokens mobiles sur les mêmes valeurs (`#d96d4c` au lieu de `#E8771A`)

---

## Ordre de reprise recommandé

Une fois le chantier stats finalisé (`useVehicleStats` backend + frontend) :

1. **Phase 1.1** — Créer `FuelGauge.tsx` (composant semi-circulaire 270°, réutilisable). Tester dans `FuelBlock` existant.
2. **Phase 1.2** — Migrer `Sidebar.tsx` (collapsed/hover expand) — impact visuel fort + self-contained
3. **Phase 1.3** — Migrer les blocks un par un (ActivityBlock → BehaviorBlock → AlertsBlock → GpsBlock), staging test entre chaque
4. **Phase 1.4** — Migrer les modals (FuelModalContent, MaintenanceModalContent, ViolationsModalContent)
5. **Phase 1.5** — Refonte `FleetTable.tsx` (plus risqué car beaucoup de consommateurs de colonnes)
6. **Phase 2** — Dashboard refonte complète (sans DnD, sparklines mockées, RadialGauge, AreaChart, tables compactes)
7. **Phase 3** — Chantiers complémentaires (scrollbars, audit slate/blue/purple, skills)

À chaque phase : **staging → validation visuelle → commit** (règle CLAUDE.md filet de sécurité).

---

## Règles CLAUDE.md à respecter

- Charte graphique : **exclusivement** tokens CSS, jamais `slate-*` direct (sauf exceptions documentées)
- Deploy : `deploy-staging.ps1` → validation → `deploy.ps1 -frontend` (jamais prod sans staging validé)
- Git : `git add <fichiers-specifiques>`, jamais `git add -A`, vérifier `git diff --cached --name-only` avant commit
- Accord explicite requis avant toute modification de code
- Filet de sécurité sur changements risqués (staging test entre phases)

---

## Références

- **Skills** : `.claude/skills/frontend-design-system.md`, `.claude/skills/ux_ui.md`
- **Mémoire** : `project_design_harmonisation.md` (Phase 1 + 2 harmonisation tokens terminées 2026-04-11/13)
- **Docs** : `docs/frontend/design-harmonisation.md` (rapport complet Phase 1/2 historique)
- **Maquettes** : envoyées par user dans le chat (3 thèmes Light/Dark/Ocean, VehicleDetailPanel Dark+Light comparaison, Fleet table, charte logo)
