# DLS — Design Language Spec TrackYu

> **Source canonique du langage visuel TrackYu.**
> Référence pour toute session Claude (frontend web, mobile, backend) qui produit ou intègre un écran TrackYu.
> Référencé par [CHANTIER_REFONTE_DESIGN.md](CHANTIER_REFONTE_DESIGN.md) sections 3.5, 6, 8.
>
> **Toute évolution = entrée au [CHANGELOG.md](CHANGELOG.md).**
>
> Dernière mise à jour : 2026-04-26 (v1.0 — extraction depuis `src/index.css` existant)

---

## 1. Principes

1. **Trois couches de tokens** — palette canonique (couche 1) → tokens sémantiques (couche 2) → overrides par mode et tenant (couche 3).
2. **Les composants ne consomment que les tokens canoniques (couche 1) ou sémantiques (couche 2)**, jamais la palette brute hardcodée.
3. **Deux modes** : clair / sombre, gérés par `[data-theme='dark'|'light']` sur `<html>` + classe `.dark` Tailwind.
4. **Personnalisation tenant** via `AppearanceContext` qui override certains tokens à la volée (couleurs, font, density, sidebar, radius).
5. **Tailwind v4 avec `@theme inline`** — les CSS variables sont exposées comme tokens Tailwind utilisables en classe (`bg-bg-primary`, `text-text-primary`, etc.).
6. **Identité visuelle** : terracotta `#d96d4c` accent + dark immersif (`#0d0d0f`) ou paper light (`#f8fafc`). Premium SaaS, niveau Wialon / Geotab / Samsara.

---

## 2. Couche 1 — Palette canonique

Définie dans `src/index.css` lignes 174-446 (sections `[data-theme='dark']` et `[data-theme='light']`).

### 2.1 Brand (couleur de marque)

| Token                   | Valeur                                                                | Usage                                     |
| ----------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| `--brand-primary`       | `#d96d4c` (terracotta)                                                | CTA, accents, focus, hover de base        |
| `--brand-primary-light` | `#e08a70`                                                             | États légers, hovers doux                 |
| `--brand-primary-dim`   | `rgba(217, 109, 76, 0.1)` (dark) / `rgba(217, 109, 76, 0.05)` (light) | Fonds tintés, badges actifs, chips actifs |
| `--brand-gradient`      | `linear-gradient(135deg, #d96d4c 0%, #c85f0e 50%, #8b3a00 100%)`      | Logos, accents premium                    |

> Tout tenant peut surcharger `--brand-primary` via `AppearanceContext` pour son white-label. Voir section 6.

### 2.2 Surfaces (fonds)

| Token           | Dark                  | Light                    | Usage                                              |
| --------------- | --------------------- | ------------------------ | -------------------------------------------------- |
| `--bg-app`      | `#0d0d0f`             | `#f8fafc`                | Fond principal de l'app                            |
| `--bg-card`     | `#16161a`             | `#ffffff`                | Surface des cartes / panels                        |
| `--bg-elevated` | `#1c1c21`             | `#f1f5f9`                | Surface élevée (input, hover row, header de table) |
| `--bg-overlay`  | `rgba(0, 0, 0, 0.65)` | `rgba(15, 23, 42, 0.45)` | Overlay modale / drawer                            |

### 2.3 Texte

| Token               | Dark      | Light     | Usage                                    |
| ------------------- | --------- | --------- | ---------------------------------------- |
| `--text-main`       | `#f9fafb` | `#0f172a` | Texte principal                          |
| `--text-secondary`  | `#9ca3af` | `#64748b` | Texte secondaire, labels                 |
| `--text-muted`      | `#8e8e93` | `#94a3b8` | Texte atténué, placeholders, séparateurs |
| `--text-inverse`    | `#0d0d0f` | `#ffffff` | Texte sur fond contrasté inverse         |
| `--text-on-primary` | `#ffffff` | `#ffffff` | Texte sur fond brand-primary             |

### 2.4 Bordures

| Token             | Dark                        | Light                 | Usage                                   |
| ----------------- | --------------------------- | --------------------- | --------------------------------------- |
| `--border-ui`     | `rgba(255, 255, 255, 0.12)` | `rgba(0, 0, 0, 0.08)` | Bordure standard                        |
| `--border-strong` | `#3a3a3e`                   | `#cbd5e1`             | Bordure accentuée (hover button, focus) |

### 2.5 Sidebar

| Token                    | Valeur                               | Usage                                      |
| ------------------------ | ------------------------------------ | ------------------------------------------ |
| `--brand-sidebar-bg`     | `#111114` (dark) / `#ffffff` (light) | Fond sidebar (override par `data-sidebar`) |
| `--brand-sidebar-text`   | `#ffffff` (dark) / `#0f172a` (light) | Texte sidebar                              |
| `--brand-sidebar-border` | (variante selon `data-sidebar`)      | Bordure sidebar                            |

Variantes via `[data-sidebar='dark'|'light'|'colored']` (orthogonal au thème) :

- `data-sidebar='dark'` → quasi-noir `#131316`
- `data-sidebar='light'` → blanc `#ffffff`
- `data-sidebar='colored'` → `var(--primary)` (couleur de marque pleine)

### 2.6 Statuts véhicule (invariants)

Définis dans `:root` lignes 144-148, identiques entre dark et light :

| Token              | Valeur        | Statut                                                                      |
| ------------------ | ------------- | --------------------------------------------------------------------------- |
| `--status-moving`  | `#22c55e`     | En mouvement (vert)                                                         |
| `--status-idle`    | **`#FBBF24`** | Moteur tournant à l'arrêt (jaune ambre) — **valeur cible post propagation** |
| `--status-stopped` | `#ef4444`     | Moteur coupé (rouge)                                                        |
| `--status-alert`   | `#dc2626`     | Alerte critique (rouge foncé)                                               |
| `--status-offline` | `#6b7280`     | Hors ligne (gris)                                                           |

> **État courant** : la valeur `--status-idle` dans `src/index.css` est encore `#f97316` (orange) au moment de cette v1.0. Migration à `#FBBF24` programmée Phase 4 du chantier.

### 2.7 Sémantiques fonctionnelles (`--clr-*`)

7 nuances par famille (success / danger / warning / caution / info / emerald) déclinées par thème :

```
--clr-{family}            : couleur principale
--clr-{family}-strong     : variante intense
--clr-{family}-dim        : tint très clair / fond très subtil
--clr-{family}-muted      : tint moyen
--clr-{family}-border     : bordure colorée
--clr-{family}-badge      : fond badge solide
--clr-{family}-badge-text : texte badge solide
```

| Famille   | Dark `--clr-*` | Light `--clr-*` | Usage                                      |
| --------- | -------------- | --------------- | ------------------------------------------ |
| `success` | `#4ade80`      | `#16a34a`       | Validation, OK                             |
| `danger`  | `#f87171`      | `#dc2626`       | Erreur, suppression                        |
| `warning` | `#fb923c`      | `#ea580c`       | Attention (orange — distinct de la marque) |
| `caution` | `#fbbf24`      | `#d97706`       | Avertissement (ambre — proche idle)        |
| `info`    | `#c084fc`      | `#9333ea`       | Information neutre (violet, pas bleu)      |
| `emerald` | `#34d399`      | `#059669`       | Catégorie technique distincte              |

### 2.8 Couleurs fonctionnelles (legacy)

Maintenues pour rétro-compatibilité :

```
--color-success : #22c55e   (équivalent --clr-success-strong)
--color-warning : #f97316   (legacy — utiliser --clr-warning ou --clr-caution)
--color-error   : #ef4444   (équivalent --status-stopped)
--color-info    : #3b82f6   (legacy — préférer --clr-info violet)
```

---

## 3. Couche 2 — Tokens sémantiques (alias backward-compat)

Définis dans `src/index.css` lignes 204-212 et 394-402. Pointent vers la couche 1.

```
--bg-primary    → var(--bg-app)
--bg-surface    → var(--bg-card)
--primary       → var(--brand-primary)
--primary-light → var(--brand-primary-light)
--primary-dim   → var(--brand-primary-dim)
--text-primary  → var(--text-main)
--border        → var(--border-ui)
--brand-secondary → var(--brand-primary-light)
```

> **Règle d'usage** : nouveau code → tokens canoniques (couche 1). Code existant peut continuer d'utiliser ces alias jusqu'à migration progressive.

### 3.1 Tokens Tailwind v4 exposés via `@theme inline`

Définis dans `src/index.css` lignes 8-75. Génèrent des classes Tailwind utilisables :

| CSS Variable             | Classe Tailwind                                |
| ------------------------ | ---------------------------------------------- |
| `--color-primary`        | `text-primary`, `bg-primary`, `border-primary` |
| `--color-bg-primary`     | `bg-bg-primary`                                |
| `--color-bg-surface`     | `bg-bg-surface`                                |
| `--color-bg-elevated`    | `bg-bg-elevated`                               |
| `--color-text-primary`   | `text-text-primary`                            |
| `--color-text-secondary` | `text-text-secondary`                          |
| `--color-text-muted`     | `text-text-muted`                              |
| `--color-border`         | `border-border`                                |
| `--color-status-moving`  | `text-status-moving`, `bg-status-moving`       |
| `--color-status-idle`    | `text-status-idle`, `bg-status-idle`           |
| `--color-clr-success`    | `text-clr-success`                             |
| `--color-clr-danger`     | `text-clr-danger`                              |
| etc.                     |                                                |

→ **Convention de styling cible** : utiliser ces classes Tailwind v4 natives (`bg-bg-primary`) plutôt que arbitrary value (`bg-[var(--bg-primary)]`) ou inline style.

---

## 4. Couche 3 — Overrides par mode et par tenant

### 4.1 Mode (clair / sombre)

Posé sur `<html>` par [`contexts/ThemeContext.tsx`](../../contexts/ThemeContext.tsx) :

```
[data-theme='dark']  + classe .dark → active palette dark
[data-theme='light']                → active palette light
```

Persistance : `localStorage['trackyu-theme']`.

API React :

```typescript
const { theme, setTheme, toggleTheme, isDarkMode } = useTheme();
// theme: 'dark' | 'light'
// isDarkMode: boolean
```

### 4.2 Tenant (charte white-label)

Posé sur `<html>` par [`contexts/AppearanceContext.tsx`](../../contexts/AppearanceContext.tsx) après login :

| Setting          | Override                                                    | Source backend                 |
| ---------------- | ----------------------------------------------------------- | ------------------------------ |
| `primaryColor`   | `--primary`, `--brand-primary`                              | `tenant.primary_color`         |
| `secondaryColor` | `--brand-secondary`                                         | `tenant.secondary_color`       |
| `accentColor`    | `--brand-accent`                                            | `tenant.settings.accentColor`  |
| `fontFamily`     | `--brand-font` (auto-load Google Fonts)                     | `tenant.font_family`           |
| `fontSize`       | `--brand-font-size` (`14px` / `16px` / `18px`)              | `tenant.font_size`             |
| `borderRadius`   | `--brand-radius` (`0px` / `0.25rem` / `0.5rem` / `0.75rem`) | `tenant.settings.borderRadius` |
| `sidebarStyle`   | `data-sidebar` (`dark` / `light` / `colored`)               | `tenant.settings.sidebarStyle` |
| `tableDensity`   | `data-density` + `--brand-density-py`                       | `tenant.settings.tableDensity` |
| `logoUrl`        | (consommé par composants logo)                              | `tenant.logo_url`              |

→ Si un setting tenant est vide (`''`), le thème CSS reprend la main (couche 1).

API React :

```typescript
const { appearance, isLoaded } = useAppearance();
```

---

## 5. Typographie

### 5.1 Polices

| Famille                                                         | Rôle                                                                      | État                                                      | Note                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------- |
| **Inter**                                                       | Corps & UI (toutes les UI text classes)                                   | ✅ chargée par défaut (`index.html` preload Google Fonts) | Font stack par défaut                       |
| **Archivo Black**                                               | Display (titres marketing, h1/h2 emphatiques)                             | 🟧 à ajouter (Q-A charter)                                | Réservé aux titres signature, pas pour body |
| **JetBrains Mono**                                              | Mono (labels uppercase, valeurs numériques techniques, IMEI, coordonnées) | 🟧 à ajouter (Q-A charter)                                | Identité techno premium                     |
| Roboto / Poppins / Nunito / Open Sans / DM Sans / Source Sans 3 | Surcharge tenant                                                          | ✅ via `AppearanceContext.loadGoogleFont()`               | Ne pas utiliser dans le code par défaut     |

Font stack standard (`--brand-font`) :

```
'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

### 5.2 Échelle typographique

Définie dans `src/index.css` lignes 56-60 (CSS variables) + classes utilitaires.

| Token / Classe        | Taille           | Poids recommandé        | Usage                                 |
| --------------------- | ---------------- | ----------------------- | ------------------------------------- |
| `--font-size-display` | 2rem (32px)      | 800-900 (Archivo Black) | Titres majeurs marketing / hero       |
| `.page-title`         | 1.375rem (22px)  | 800                     | Titre de page (header App)            |
| `--font-size-title`   | 1.25rem (20px)   | 700                     | Titre de section principal            |
| `--font-size-body`    | 0.9375rem (15px) | 400-500                 | Corps de texte standard               |
| `--font-size-sm`      | 0.8125rem (13px) | 400-500                 | Texte secondaire, labels d'input      |
| `--font-size-xs`      | 0.6875rem (11px) | 600-700                 | Labels, badges, headers de table      |
| `text-[10px]`         | 10px             | 600                     | Mini-labels (KPI subtitle)            |
| `text-[9px]`          | 9px              | 700                     | Très petits labels (status uppercase) |

### 5.3 Patterns identitaires typographiques

- `font-black` (weight 900) sur les **labels importants** (KPI, statuts, totaux)
- `uppercase tracking-widest` pour **labels uppercase**
- `tracking-tighter` pour **titres display**
- `font-mono` (JetBrains Mono) sur **tous les nombres** (valeurs, IMEI, coordonnées, durées) — identité techno
- `tabular-nums` sur les **chiffres dans les KPI** (alignement colonne)
- Petites tailles + densité : `text-[9px]`, `text-[10px]`, `text-[11px]` valides pour micro-labels
- Glow orange : `drop-shadow-[0_0_Xpx_var(--brand-primary)]` sur éléments clés
- Bordures : préférer `rgba(...)` transparentes (pas d'hex opaque)

---

## 6. Échelles

### 6.1 Border radius

Définis dans `src/index.css` lignes 63-69. Token Tailwind v4 : `rounded-{name}`.

| Token            | Valeur               | Usage                                          |
| ---------------- | -------------------- | ---------------------------------------------- |
| `--radius-xs`    | 0.25rem (4px)        | Checkbox, mini-tags                            |
| `--radius-sm`    | 0.5rem (8px)         | Bouton sm, input, filter-chip, icon-btn        |
| `--radius-md`    | 0.75rem (12px)       | Bouton lg, mini-map, float-alert               |
| `--radius-card`  | 0.875rem (14px)      | Carte standard (`.card`)                       |
| `--radius-lg`    | 1rem (16px)          | Mega-menu, footer-bottom, mod card             |
| `--radius-xl`    | 1.25rem (20px)       | Dash, plan, feat, showcase-img                 |
| `--radius-full`  | 9999px               | Pills, badges, eyebrow, plan-badge             |
| `--brand-radius` | 0.75rem (par défaut) | Surchargeable par tenant via AppearanceContext |

### 6.2 Spacing

| Token         | Valeur         |
| ------------- | -------------- |
| `--space-xs`  | 0.25rem (4px)  |
| `--space-sm`  | 0.5rem (8px)   |
| `--space-md`  | 0.75rem (12px) |
| `--space-lg`  | 1rem (16px)    |
| `--space-xl`  | 1.5rem (24px)  |
| `--space-2xl` | 2rem (32px)    |
| `--space-3xl` | 3rem (48px)    |

### 6.3 Ombres

```
--shadow-sm : 0 1px 3px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)
--shadow-md : 0 4px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.12)
--shadow-lg : 0 8px 24px rgba(0,0,0,0.35), 0 4px 8px rgba(0,0,0,0.15)
```

### 6.4 Motion

Animations définies dans `src/index.css` lignes 530-570 :

- `fadeIn` (0.3s ease-out) — apparition simple
- `slideIn` (0.3s ease-out) — slide depuis le haut
- `pulse-slow` (2s ease-in-out infinite) — pulsation douce (live indicators)
- `view-enter` (0.2s ease-out) — transition de vue
- `loading-bar` (1.5s ease-in-out infinite) — barre de chargement
- `haptic-pulse` (0.15s ease-out) — feedback tactile mobile
- `skeleton-shimmer` (1.5s ease-in-out infinite) — skeleton loader

Respect `prefers-reduced-motion` :

```css
@media (prefers-reduced-motion: reduce) {
  .animate-view-enter,
  .animate-loading-bar {
    animation: none;
  }
}
```

---

## 7. Composants atomiques

Définis dans `src/index.css` lignes 853-1217 dans `@layer components`.

### 7.1 Boutons (`.btn`)

```html
<!-- Primary md -->
<button class="btn btn-md btn-primary">Action</button>

<!-- Secondary sm full-width -->
<button class="btn btn-sm btn-secondary btn-full">Annuler</button>

<!-- Ghost lg avec icône -->
<button class="btn btn-lg btn-ghost"><Icon /> Retour</button>

<!-- Danger -->
<button class="btn btn-md btn-danger">Supprimer</button>
```

| Classe               | Effet                                                               |
| -------------------- | ------------------------------------------------------------------- |
| `.btn`               | Base : flex inline, gap, weight 700, transition, active:scale(0.97) |
| `.btn-sm`            | 13px, padding 7×14, radius 8px, min-height 32px                     |
| `.btn-md`            | 14px, padding 12×20, radius 10px, min-height 44px (touch)           |
| `.btn-lg`            | 15px, padding 15×24, radius 12px, min-height 52px                   |
| `.btn-full`          | width 100%                                                          |
| `.btn-primary`       | bg `var(--primary)`, hover `var(--primary-light)`                   |
| `.btn-secondary`     | border 1.5px primary, transparent bg                                |
| `.btn-ghost`         | transparent, hover `var(--bg-elevated)`                             |
| `.btn-danger`        | bg `var(--color-error)`                                             |
| `.btn:focus-visible` | shadow ring `var(--primary-dim)`                                    |

Wrapper React : [`components/Button.tsx`](../../components/Button.tsx) avec props `variant`, `size`, `loading`, `fullWidth`, `leftIcon`, `rightIcon`.

### 7.2 Cartes (`.card`)

```html
<div class="card">
  <!-- bg-card + border + shadow-sm + radius 14px + padding 14px -->
  <div class="card-elevated"><!-- bg-elevated --></div>
</div>
```

### 7.3 Inputs (`.input-base`)

```html
<input class="input-base" placeholder="Saisir..." />
```

| Propriété    | Valeur                                                     |
| ------------ | ---------------------------------------------------------- |
| `width`      | 100%                                                       |
| `bg`         | `var(--bg-elevated)`                                       |
| `border`     | 1px solid `var(--border)`                                  |
| `radius`     | `var(--radius-sm)` (8px)                                   |
| `min-height` | 44px (touch)                                               |
| `padding`    | 10px 14px                                                  |
| `:focus`     | border `var(--primary)` + shadow ring `var(--primary-dim)` |
| `:disabled`  | opacity 0.5                                                |

### 7.4 Badges (`.badge`)

```html
<!-- Statut véhicule -->
<span class="badge badge-moving">En mouvement</span>
<span class="badge badge-idle">Au ralenti</span>
<span class="badge badge-stopped">Arrêté</span>
<span class="badge badge-offline">Hors ligne</span>
<span class="badge badge-alert">Alerte</span>

<!-- Sémantique -->
<span class="badge badge-success">OK</span>
<span class="badge badge-warning">Attention</span>
<span class="badge badge-error">Erreur</span>
<span class="badge badge-info">Info</span>
<span class="badge badge-neutral">Neutre</span>
```

### 7.5 Filter chip (`.filter-chip`)

```html
<button class="filter-chip">Tous</button> <button class="filter-chip active">En cours</button>
```

État actif : bg `var(--primary-dim)` + border `var(--primary)` + texte `var(--primary)`.

### 7.6 Icon button (`.icon-btn`)

```html
<button class="icon-btn"><Icon /></button> <button class="icon-btn active"><Icon /></button>
```

Border 1px, padding 7×12, radius 8px, transparent bg. État actif identique à filter-chip.

### 7.7 Toolbar (`.toolbar`)

```html
<div class="toolbar">
  <SearchBar />
  <div class="toolbar-section">
    <button class="filter-chip active">Tous</button>
    <button class="filter-chip">Actifs</button>
  </div>
  <button class="icon-btn">Export</button>
</div>
```

### 7.8 Titres

```html
<h1 class="page-title">Tableau de bord</h1>
<!-- 22px font-black -->
<p class="page-subtitle">47 véhicules actifs</p>
<!-- 13px secondary -->
<h3 class="section-title">FLOTTE TEMPS RÉEL</h3>
<!-- 11px uppercase tracking-wider secondary -->
```

### 7.9 Tableau (`.th-base` / `.td-base` / `.tr-hover`)

```html
<table>
  <thead>
    <tr>
      <th class="th-base">Véhicule</th>
      <th class="th-base">Statut</th>
    </tr>
  </thead>
  <tbody>
    <tr class="tr-hover">
      <td class="td-base">TY-042</td>
      <td class="td-base">...</td>
    </tr>
  </tbody>
</table>
```

### 7.10 Form error (`.form-error`)

```html
<input class="input-base" /> <span class="form-error"><AlertCircle /> Champ requis</span>
```

### 7.11 Skeleton (`.skeleton`)

```html
<div class="skeleton w-32 h-6 rounded-md"></div>
```

Shimmer animation 1.5s infinie.

### 7.12 Divider (`.divider`)

```html
<hr class="divider" />
```

---

## 8. Composants partagés (catalog)

Tous dans [`components/`](../../components/). Ces composants encapsulent les patterns du DLS et la logique React (états, props, callbacks).

| Composant                  | Rôle                           | Fichier                                                                        |
| -------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `Button`                   | Wrapper sur `.btn`             | [`components/Button.tsx`](../../components/Button.tsx)                         |
| `Card`                     | Carte standard                 | [`components/Card.tsx`](../../components/Card.tsx)                             |
| `MobileCard`               | Carte adaptée mobile           | [`components/MobileCard.tsx`](../../components/MobileCard.tsx)                 |
| `Modal`                    | Modale centrée + overlay       | [`components/Modal.tsx`](../../components/Modal.tsx)                           |
| `ConfirmDialog`            | Modal confirmation destructive | [`components/ConfirmDialog.tsx`](../../components/ConfirmDialog.tsx)           |
| `ImportModal`              | Drag-drop fichier + preview    | [`components/ImportModal.tsx`](../../components/ImportModal.tsx)               |
| `Drawer`                   | Panel latéral animé            | [`components/Drawer.tsx`](../../components/Drawer.tsx)                         |
| `BottomSheet`              | Sheet bas-écran (mobile)       | [`components/BottomSheet.tsx`](../../components/BottomSheet.tsx)               |
| `VehicleBottomSheet`       | Quick view véhicule mobile     | [`components/VehicleBottomSheet.tsx`](../../components/VehicleBottomSheet.tsx) |
| `MobileFilterSheet`        | Filtres en bottom sheet        | [`components/MobileFilterSheet.tsx`](../../components/MobileFilterSheet.tsx)   |
| `Tabs`                     | Onglets                        | [`components/Tabs.tsx`](../../components/Tabs.tsx)                             |
| `Pagination`               | Pagination numbered            | [`components/Pagination.tsx`](../../components/Pagination.tsx)                 |
| `SortableHeader`           | Header de table triable        | [`components/SortableHeader.tsx`](../../components/SortableHeader.tsx)         |
| `ColumnManager`            | Toggle visibilité colonnes     | [`components/ColumnManager.tsx`](../../components/ColumnManager.tsx)           |
| `SearchBar`                | Barre de recherche compacte    | [`components/SearchBar.tsx`](../../components/SearchBar.tsx)                   |
| `SearchInput`              | Input recherche standalone     | [`components/SearchInput.tsx`](../../components/SearchInput.tsx)               |
| `DateInput`                | Input date single              | [`components/DateInput.tsx`](../../components/DateInput.tsx)                   |
| `DateRangeSelector`        | Picker date range avec presets | [`components/DateRangeSelector.tsx`](../../components/DateRangeSelector.tsx)   |
| `Badge`                    | Badge générique                | [`components/Badge.tsx`](../../components/Badge.tsx)                           |
| `StatusBadge`              | Badge statut véhicule          | [`components/StatusBadge.tsx`](../../components/StatusBadge.tsx)               |
| `EmptyState`               | Illustration + CTA quand vide  | [`components/EmptyState.tsx`](../../components/EmptyState.tsx)                 |
| `Skeleton` / `SkeletonBox` | Skeleton loader                | [`components/Skeleton.tsx`](../../components/Skeleton.tsx)                     |
| `FormStepper`              | Wizard multi-étapes            | [`components/FormStepper.tsx`](../../components/FormStepper.tsx)               |
| `SignaturePad`             | Canvas signature               | [`components/SignaturePad.tsx`](../../components/SignaturePad.tsx)             |
| `CommandPalette`           | Recherche globale Ctrl+K       | [`components/CommandPalette.tsx`](../../components/CommandPalette.tsx)         |
| `Sidebar`                  | Sidebar desktop                | [`components/Sidebar.tsx`](../../components/Sidebar.tsx)                       |
| `BottomNavigation`         | Bottom nav mobile              | [`components/BottomNavigation.tsx`](../../components/BottomNavigation.tsx)     |
| `ErrorBoundary`            | Fallback erreur                | [`components/ErrorBoundary.tsx`](../../components/ErrorBoundary.tsx)           |
| `OfflineBanner`            | Banner offline                 | [`components/OfflineBanner.tsx`](../../components/OfflineBanner.tsx)           |
| `NotificationToast`        | Toast non-bloquant             | [`components/NotificationToast.tsx`](../../components/NotificationToast.tsx)   |
| `GlobalLoadingBar`         | Top progress bar               | [`components/GlobalLoadingBar.tsx`](../../components/GlobalLoadingBar.tsx)     |
| `InstallPrompt`            | Bouton "Installer l'app" PWA   | [`components/InstallPrompt.tsx`](../../components/InstallPrompt.tsx)           |
| `PullToRefresh`            | Pull to refresh mobile         | [`components/PullToRefresh.tsx`](../../components/PullToRefresh.tsx)           |

### Form components (`components/form/`)

| Composant          | Rôle                             |
| ------------------ | -------------------------------- |
| `FormField`        | Wrapper field avec label + error |
| `FormGrid`         | Grid responsive pour form        |
| `FormSection`      | Section avec titre               |
| `FormActions`      | Footer actions (Submit / Cancel) |
| `Input`            | Input texte                      |
| `Textarea`         | Textarea                         |
| `Select`           | Select natif                     |
| `SearchableSelect` | Select avec search (combobox)    |

---

## 9. Patterns métier figés

### 9.1 Layout app authentifié

```
┌──────────────────────────────────────────────┐
│  Sidebar │  Header (breadcrumb + actions)    │
│  (80/256)│ ─────────────────────────────────  │
│          │                                   │
│  - groups│         Main content              │
│    nav   │                                   │
│          │                                   │
│  - user  │                                   │
│  - logout│                                   │
└──────────────────────────────────────────────┘
                  │  BottomNavigation (mobile)  │
                  └─────────────────────────────┘
```

### 9.2 Layout auth (full dark immersif)

Split 1.2fr / 1fr (visuel à gauche, formulaire à droite, sur desktop ; stacké sur mobile).

### 9.3 Statuts véhicule

Chaque card / badge / marker véhicule a un **border-left coloré** ou un **dot coloré** correspondant au statut, avec un label uppercase :

```html
<div style="border-left: 4px solid var(--status-moving)">
  <span class="text-status-moving">MOVING</span>
  <p class="font-black">31</p>
  <p class="text-xs text-text-muted">66% · vitesse moy. 58 km/h</p>
</div>
```

### 9.4 KPI card pattern

```html
<div class="card">
  <div class="flex items-start justify-between mb-3">
    <div class="p-2.5 rounded-[10px] bg-primary-dim">
      <Icon class="w-5 h-5 text-primary" />
    </div>
    <span
      class="text-[11px] font-bold px-1.5 py-0.5 rounded-full
                 bg-[rgba(34,197,94,0.12)] text-status-moving"
    >
      ↑ +12%
    </span>
  </div>
  <p class="page-title tabular-nums">47/52</p>
  <p class="text-xs text-text-muted">Véhicules actifs</p>
  <p class="text-[10px] text-text-muted">Utilisation 89%</p>
</div>
```

### 9.5 Block detail (panel véhicule)

Header discret (tint primary 10-15% + border-b + text-secondary), contenu en grille 2×2, replay button en bas si applicable.

### 9.6 Section header (avec breadcrumb mono)

```html
<div>
  <p class="text-xs font-mono text-text-muted">// SECTION · SOUS-SECTION</p>
  <h1 class="page-title">Bonjour {user.name} — vue d'ensemble.</h1>
</div>
```

---

## 10. Statuts véhicule officiels

| Statut   | Token              | Couleur               | Sémantique métier                                             |
| -------- | ------------------ | --------------------- | ------------------------------------------------------------- |
| moving   | `--status-moving`  | `#22C55E`             | Véhicule en mouvement (vitesse > 5 km/h)                      |
| **idle** | `--status-idle`    | **`#FBBF24` (cible)** | Moteur tournant, vitesse ≈ 0 (cible post-propagation Phase 4) |
| stopped  | `--status-stopped` | `#EF4444`             | Moteur coupé, position fixe                                   |
| alert    | `--status-alert`   | `#DC2626`             | Alerte critique active                                        |
| offline  | `--status-offline` | `#6B7280`             | Pas de fix GPS / hors couverture                              |

**Source de vérité métier** : [`utils/vehicleStatus.ts`](../../utils/vehicleStatus.ts) — `VEHICLE_STATUS_COLORS`. Tout composant qui affiche un statut véhicule doit consommer cette source, jamais hardcoder.

---

## 11. Accessibilité

### 11.1 Contraste

- **Texte normal** (≥ 14px) : ratio minimal **4.5:1** (WCAG AA)
- **Texte large** (≥ 18px ou 14px bold) : ratio minimal **3:1**
- **Composants UI** (boutons, focus rings) : ratio minimal **3:1** vs fond
- Validation côté color picker tenant : refuser si contraste insuffisant

### 11.2 Focus visible

Tous les inputs/selects/textareas/buttons ont un focus ring obligatoire :

```css
box-shadow: 0 0 0 2px var(--primary-dim);
border-color: var(--primary);
```

### 11.3 Touch targets

- Mobile : min **44×44px** (Apple) / **48×48px** (Google)
- Classes utilitaires : `.touch-target` (44px) / `.touch-target-lg` (48px)
- Inputs mobile : `min-height: 44px`, `font-size: 16px` (anti-zoom iOS)

### 11.4 Reduced motion

Respect `prefers-reduced-motion: reduce` :

```css
@media (prefers-reduced-motion: reduce) {
  .animate-* {
    animation: none;
  }
}
```

### 11.5 Sémantique HTML

- Headings hiérarchiques (`h1` → `h2` → `h3`, pas de saut)
- `aria-label` sur les boutons icon-only
- `role="button"` si div interactif (à éviter : préférer `<button>`)
- Labels associés aux inputs (`<label for>` ou wrap)

### 11.6 i18n

Toute chaîne UI passe par `t('key')`. Trois langues : FR (source) → EN (priorité) → ES (3e). Provider : [`i18n/`](../../i18n/).

---

## 12. Règles d'usage (do / don't)

### 12.1 ✅ DO

- ✅ Utiliser **les classes utilitaires** (`.btn`, `.card`, `.filter-chip`, etc.) en priorité
- ✅ Utiliser **les classes Tailwind v4 natives** (`bg-bg-primary`, `text-text-primary`) sinon
- ✅ Utiliser `var(--token)` dans des cas justifiés (animations, gradients dynamiques)
- ✅ Préférer `useTheme()` / `useAppearance()` plutôt que de lire `localStorage` directement
- ✅ Utiliser `--status-*` pour tout statut véhicule
- ✅ Utiliser `--clr-*` pour la sémantique fonctionnelle (success / danger / warning / caution / info)
- ✅ Utiliser **JetBrains Mono** sur tous les nombres techniques (IMEI, coordonnées, durées) une fois la police chargée
- ✅ Respecter les statuts véhicule officiels (section 10)

### 12.2 ❌ DON'T

- ❌ Hardcoder un hex dans un composant (`#d96d4c`, `#0d0d0f`, etc.)
- ❌ Utiliser `slate-*`, `gray-*`, `zinc-*` Tailwind directement (sauf exceptions documentées)
- ❌ Utiliser `dark:` Tailwind pour gérer le dark mode dans du nouveau code (le système `[data-theme]` suffit)
- ❌ Mélanger 3 conventions de styling dans un même composant (Tailwind natif + arbitrary + inline style)
- ❌ Réinventer un pattern qui existe dans `@layer components` (.btn, .card, etc.)
- ❌ Surcharger `--brand-primary` ou `--primary` ailleurs que dans `AppearanceContext`
- ❌ Utiliser un `var(--orange)` ou `var(--ink)` (palette Design v1) — ces tokens n'existent pas dans TrackYu
- ❌ Modifier `src/index.css` sans entrée au [`CHANGELOG.md`](CHANGELOG.md)

### 12.3 Exceptions documentées (à NE PAS toucher)

| Fichier / pattern                                                 | Raison                                        |
| ----------------------------------------------------------------- | --------------------------------------------- |
| `MapView.tsx` `border-slate-700/50`                               | Carte Leaflet, fond carte sombre intentionnel |
| `SensorsBlock.tsx` `bg-slate-900`                                 | Affichage capteur technique sur fond noir     |
| `MessageTemplatesPanel.tsx` `bg-white`                            | Bulles de chat SMS (look messagerie)          |
| Document previews PDF                                             | `bg-white` — preview imprimable               |
| Logos dans `bg-white`                                             | Affichage correct logo client                 |
| Badges de statut "Annulé / Inactif" `bg-slate-100 text-slate-700` | Sémantique figée                              |
| QR codes                                                          | Fond blanc obligatoire                        |

---

## 13. Tokens hors-charte (à supprimer / migrer)

Au cours de la refonte, ces patterns sont à éliminer :

| Pattern                                                 | Ce qu'il y a actuellement                                    | Action                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `--color-warning : #f97316` (legacy)                    | Confusion potentielle avec `--status-idle` orange historique | Migrer vers `--clr-warning` (orange-400) ou `--clr-caution` (ambre-400) |
| `--color-info : #3b82f6` (legacy)                       | Bleu non aligné avec `--clr-info` (violet)                   | Préférer `--clr-info`                                                   |
| `--color-slate-950: var(--bg-primary)` (remap Tailwind) | Astuce pour intercepter `bg-slate-950`                       | À supprimer une fois la migration `slate-*` terminée                    |
| `.dark *` selectors (1032 occurrences)                  | Système Tailwind `dark:` qui coexiste avec `[data-theme]`    | Migrer vers tokens sémantiques (Phase 4)                                |
| 3 conventions de styling                                | Tailwind natif vs arbitrary vs inline                        | Converger vers Tailwind v4 natif (Phase 4)                              |
| 342 hex hardcodés (graphes Recharts)                    | Couleurs séries hardcodées                                   | Factoriser dans `lib/chart-colors.ts` qui lit `getComputedStyle`        |

---

## 14. Surfaces et leur thème

| Surface                                      | Thème par défaut             | Tenant override autorisé                  |
| -------------------------------------------- | ---------------------------- | ----------------------------------------- |
| Pages marketing publiques                    | Light                        | Non (charte plateforme)                   |
| Pages auth (connexion / inscription / reset) | Dark immersif                | Logo + accent uniquement                  |
| App web — modules opérationnels + admin      | clair / sombre au choix user | Oui (mode + 9 settings AppearanceContext) |
| App mobile                                   | clair / sombre au choix user | Oui (alignement web)                      |
| Emails / PDFs / notifications                | Light                        | Logo + accent                             |

---

## 15. Référence code

| Fichier                                                                  | Rôle                                                             |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [`src/index.css`](../../src/index.css)                                   | Source canonique web (1218 lignes)                               |
| [`contexts/ThemeContext.tsx`](../../contexts/ThemeContext.tsx)           | Bascule clair/sombre                                             |
| [`contexts/AppearanceContext.tsx`](../../contexts/AppearanceContext.tsx) | Personnalisation tenant (9 settings)                             |
| [`utils/vehicleStatus.ts`](../../utils/vehicleStatus.ts)                 | Source de vérité statuts véhicule                                |
| [`components/`](../../components/)                                       | Composant catalog partagé                                        |
| [`tailwind.config`](#)                                                   | Configuration Tailwind v4 (via `@theme inline` dans `index.css`) |

---

## 16. Évolution du DLS

Toute évolution suit cet ordre :

1. Discussion avec l'utilisateur (proposition + justification)
2. Mise à jour de **ce document** (DLS.md)
3. Entrée correspondante dans [`CHANGELOG.md`](CHANGELOG.md)
4. Propagation dans `src/index.css` (web)
5. Signalement à la session mobile (alignement `tokens.ts` / `themes.ts` quand pertinent)
6. Mise à jour de [`SCREEN_MAP.md`](SCREEN_MAP.md) si patterns nouveaux

**Jamais l'inverse.**

---

_Référence permanente du langage visuel TrackYu. Lecture obligatoire avant toute intégration._
