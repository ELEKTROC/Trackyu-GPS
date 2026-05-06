# MAPPING_DLS — Tokens Design ↔ DLS V2

> **Doc de référence** pour Phase 4 — table de correspondance exhaustive entre les tokens des mockups claude.ai Design et le DLS du projet `trackyu-front-V2`.
>
> Sert à produire ensuite `trackyu-front-V2/src/styles/design-tokens.css` (port direct des tokens) et à mettre à jour `src/index.css` (V2) pour intégrer les écarts.
>
> **Convention D26 (CHANGELOG 2026-04-27 PM)** : stack divergence assumée — pas de copy-paste depuis Design vers V2. La traduction se fait **token par token** ici, puis les composants V2 consomment les tokens via `var(--xxx)` ou classes Tailwind 4.
>
> Créé : 2026-04-27 PM (Phase 4 kickoff option B = pilote Templates UI A-H)
> Mis à jour : 2026-04-27 PM — Étape 2 livrée intégralement (2a/2b/2b'/2c/2d), validation visuelle OK
> Statut : **✅ APPLIQUÉ — étape 2 livrée, tokens Design portés dans `trackyu-front-V2/`**

---

## Légende des décisions

| Marqueur | Sens                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| ✅       | Token déjà aligné (Design = V2) — rien à faire                               |
| 🟢       | Aligner V2 sur Design (modifier la valeur dans `src/index.css` V2)           |
| 🆕       | Token absent V2, à ajouter                                                   |
| ⚠        | Écart à arbitrer avec l'utilisateur (deux philosophies différentes)          |
| 🟧       | Cas particulier — pas un token global, valeur fixe dans un composant à créer |

---

## 1. Couleurs de FOND (Background)

| Token Design     | Valeur Design | Token V2 (canonique) | Valeur V2 actuelle | Écart            | Décision                                                     |
| ---------------- | ------------- | -------------------- | ------------------ | ---------------- | ------------------------------------------------------------ |
| `bg`             | `#0a0a0b`     | `--bg-app`           | `#0d0d0f`          | -0.4% luminosité | 🟢 aligner V2 sur `#0a0a0b` (plus immersif, fidélité Design) |
| `surface`        | `#141416`     | `--bg-card`          | `#16161a`          | nuance proche    | 🟢 aligner V2 sur `#141416`                                  |
| `surfaceAlt`     | `#1a1a1d`     | `--bg-elevated`      | `#1c1c21`          | nuance proche    | 🟢 aligner V2 sur `#1a1a1d`                                  |
| (overlay modale) | non spécifié  | `--bg-overlay`       | `rgba(0,0,0,0.65)` | —                | ✅ garder valeur V2                                          |

**Conséquence** : 3 lignes à modifier dans `src/index.css` V2 (bloc `[data-theme='dark']`). Mode `light` à laisser tel quel (Design dark only — D18).

---

## 2. Couleurs de TEXTE

| Token Design     | Valeur Design           | Token V2 (canonique) | Valeur V2 actuelle | Écart                                            | Décision                                                                                     |
| ---------------- | ----------------------- | -------------------- | ------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `text`           | `rgba(255,255,255,.92)` | `--text-main`        | `#f9fafb`          | quasi-équivalent visuel (98% blanc vs 92% blanc) | 🟢 aligner V2 sur `rgba(255,255,255,.92)` (Design utilise systématiquement opacité, pas hex) |
| `textMuted`      | `rgba(255,255,255,.55)` | `--text-muted`       | `#8e8e93`          | équivalent visuel                                | 🟢 aligner V2 sur `rgba(255,255,255,.55)`                                                    |
| (intermédiaire)  | non spécifié            | `--text-secondary`   | `#9ca3af`          | Design n'a que 2 niveaux, V2 en a 3              | ✅ garder `--text-secondary` V2 — utile pour labels intermédiaires (entre text et textMuted) |
| (sur fond brand) | `#fff` (inline)         | `--text-on-primary`  | `#ffffff`          | —                                                | ✅ identique                                                                                 |

**Conséquence** : 2 lignes à modifier (text-main, text-muted dans dark). `--text-secondary` reste utile pour graduation.

---

## 3. Couleurs de BORDURES

| Token Design    | Valeur Design                               | Token V2 (canonique)                          | Valeur V2 actuelle             | Écart                          | Décision                                                             |
| --------------- | ------------------------------------------- | --------------------------------------------- | ------------------------------ | ------------------------------ | -------------------------------------------------------------------- |
| `border`        | `rgba(255,255,255,.08)`                     | `--border-ui`                                 | `rgba(255,255,255,0.12)`       | bordures Design plus discrètes | 🟢 aligner V2 sur `.08` (look plus premium, contour plus subtil)     |
| `borderHover`   | `rgba(217,109,76,.35)`                      | absent                                        | —                              | —                              | 🆕 ajouter `--border-hover` (utilisé sur dropdown hover, chip hover) |
| `borderFocus`   | `#d96d4c` + ring `rgba(217,109,76,.12) 3px` | géré dans `index.css` ligne 90 (focus inputs) | équivalent via `--primary-dim` | aligné fonctionnellement       | ✅ déjà OK                                                           |
| (border-strong) | non spécifié Design                         | `--border-strong`                             | `#3a3a3e` (dark)               | —                              | ✅ garder V2 (utile pour hover bouton secondaire)                    |

---

## 4. Couleurs ACCENT / BRAND

| Token Design    | Valeur Design                                                    | Token V2 (canonique)                                             | Valeur V2 actuelle     | Écart                                                               | Décision                                                                                                                                             |
| --------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accent`        | `#d96d4c`                                                        | `--brand-primary`                                                | `#d96d4c`              | —                                                                   | ✅ identique                                                                                                                                         |
| `accentHover`   | `#c85f0e`                                                        | absent (V2 utilise `--brand-primary-light` `#e08a70` pour hover) | écart palette          | ⚠ Design assombrit pour hover, V2 éclaircit                         | ⚠ **à arbitrer** — proposition : ajouter `--brand-primary-hover #c85f0e` (Design) et garder `--brand-primary-light` pour autres usages (badges doux) |
| `accentDark`    | `#8b3a00`                                                        | présent uniquement dans `--brand-gradient` (étape 100%)          | non isolé              | —                                                                   | 🆕 isoler `--brand-primary-dark #8b3a00` (utile pour gradients, ombres profondes)                                                                    |
| `accentLight`   | `#f4a87a`                                                        | `--brand-primary-light`                                          | `#e08a70`              | écart palette : Design plus chaud (peach), V2 plus tirant vers rose | ⚠ **à arbitrer** — quel choix conserver ? `#f4a87a` (Design) ou `#e08a70` (V2) ?                                                                     |
| `accentGlow`    | `rgba(217,109,76,.32)`                                           | absent (utilisé inline dans `index.css` pour shadow bouton)      | —                      | —                                                                   | 🆕 ajouter `--brand-primary-glow` (utilisé partout : shadow bouton primary, logo, focus ring)                                                        |
| `accentBg`      | `rgba(217,109,76,.10)`                                           | `--brand-primary-dim`                                            | `rgba(217,109,76,0.1)` | —                                                                   | ✅ identique                                                                                                                                         |
| (gradient logo) | `linear-gradient(135deg, #d96d4c 0%, #c85f0e 50%, #8b3a00 100%)` | `--brand-gradient`                                               | identique              | —                                                                   | ✅ identique                                                                                                                                         |

---

## 5. Couleurs SÉMANTIQUES (statuts métier)

### 5.1 Statuts véhicule (invariants TrackYu)

| Token Design (implicite) | Valeur Design                            | Token V2           | Valeur V2 actuelle                   | Décision                                                                                                              |
| ------------------------ | ---------------------------------------- | ------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| (moving)                 | `#22c55e`                                | `--status-moving`  | `#22c55e`                            | ✅ identique                                                                                                          |
| (idle)                   | `#fbbf24` (utilisé sur plaque + caution) | `--status-idle`    | `#f97316` (legacy) → cible `#FBBF24` | ⚠ propagation cible déjà actée DLS V2 §10. **Décision** : profiter de Phase 4 pour passer `--status-idle` à `#FBBF24` |
| (stopped)                | `#ef4444`                                | `--status-stopped` | `#ef4444`                            | ✅ identique                                                                                                          |
| (alert)                  | non spécifié Design                      | `--status-alert`   | `#dc2626`                            | ✅ garder V2                                                                                                          |
| (offline)                | `#6b7280`                                | `--status-offline` | `#6b7280`                            | ✅ identique                                                                                                          |

### 5.2 Sémantiques fonctionnelles

| Token Design   | Valeur Design    | Token V2 équivalent                                                  | Valeur V2             | Écart                                                                          | Décision                                                                                                      |
| -------------- | ---------------- | -------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `success`      | `#22c55e`        | `--color-success` (legacy) ou `--clr-success-strong`                 | `#22c55e` / `#86efac` | —                                                                              | ✅ aligné via `--color-success`                                                                               |
| `successLight` | `#86efac`        | `--clr-success-strong` (V2 dark)                                     | `#86efac`             | —                                                                              | ✅ identique                                                                                                  |
| `warning`      | `#f59e0b`        | `--color-warning` (legacy) `#f97316` ou `--clr-warning` `#fb923c`    | divergent             | ⚠ Design utilise amber-500 `#f59e0b`, V2 a 2 candidats orange-500 / orange-400 | ⚠ **à arbitrer** — proposition : aligner sur `#f59e0b` (Design) et déprécier `--color-warning #f97316` legacy |
| `warningLight` | `#fde68a`        | `--clr-caution-strong` `#fcd34d` ou `--clr-warning-strong` `#fdba74` | divergent             | —                                                                              | ⚠ idem ci-dessus                                                                                              |
| `error`        | `#ef4444`        | `--color-error` `#ef4444` ou `--clr-danger-strong` `#fca5a5`         | partiellement         | ✅ aligné via `--color-error`                                                  |
| `errorLight`   | `#fca5a5`        | `--clr-danger-strong` (V2 dark)                                      | `#fca5a5`             | —                                                                              | ✅ identique                                                                                                  |
| `info`         | `#3b82f6` (bleu) | `--color-info` (legacy) `#3b82f6` ou `--clr-info` `#c084fc` (violet) | ⚠ DIVERGENCE FORTE    | Design utilise BLEU pour info, V2 utilise VIOLET (`--clr-info`)                | ⚠ **à arbitrer** — palette d'info : bleu (Design + standard) ou violet (V2 actuel) ?                          |
| `infoLight`    | `#93c5fd`        | absent (V2 a `--clr-info-strong #d8b4fe` violet)                     | —                     | —                                                                              | dépend de la décision ⚠ ci-dessus                                                                             |
| `purple`       | `#a855f7`        | absent                                                               | —                     | —                                                                              | 🆕 ajouter `--clr-purple` (utilisé sur badges types, rôles admin, catégories spéciales)                       |
| `neutral`      | `#6b7280`        | `--status-offline` `#6b7280` ou `--nav-inactive`                     | identique             | ✅ aligné                                                                      |
| `neutralLight` | `#9ca3af`        | `--text-secondary` `#9ca3af`                                         | identique             | ✅ aligné                                                                      |

### 5.3 Pattern badge sémantique

Design utilise systématiquement : `color: {C}` + `background: {C}1f` (12% opacité) + `border: 1px solid {C}44` (27% opacité).

V2 : pattern non formalisé en token, géré au cas par cas.

| Pattern Design            | Décision V2                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `${color}1f` (12% bg)     | 🆕 documenter convention dans DLS section 9 + créer primitive `<Badge color="...">` qui calcule automatiquement |
| `${color}44` (27% border) | idem                                                                                                            |

---

## 6. TYPOGRAPHIE

### 6.1 Familles de polices

| Police Design      | Usage Design                                            | Statut V2                                           | Décision                                                                                      |
| ------------------ | ------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Inter**          | Corps, UI, boutons, labels                              | ✅ déjà chargée (preload `index.html`)              | ✅ rien à faire                                                                               |
| **Archivo Black**  | Titres h1/h2, KPI values, totaux, signature             | 🟧 absente — listée comme "à ajouter" dans DLS §5.1 | 🆕 ajouter `@import url(...)` Google Fonts dans `src/index.css` V2 + définir `--font-display` |
| **JetBrains Mono** | Numbers, refs (`FA-2026-XXX`), timestamps, IMEI, plaque | 🟧 absente — listée comme "à ajouter" dans DLS §5.1 | 🆕 ajouter `@import url(...)` Google Fonts + définir `--font-mono`                            |

### 6.2 Tailles & poids — table de correspondance

| Élément                                 | Design                                                                  | V2 actuel                                                 | Décision                                                                                                                                                                                                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page title (h1)                         | Archivo Black 22px ls -0.02em                                           | `.page-title` 1.375rem (22px) font-black                  | ✅ taille OK — basculer font-family de `font-black` Inter vers Archivo Black                                                                                                                                                                                                     |
| Section title h2 (sous-titre principal) | Archivo Black 24px ls -0.02em                                           | absent (V2 a `.section-title` 11px UPPER pour autre rôle) | ⚠ **rôle ambigu** : Design utilise h2 24px Archivo Black pour titre de section riche, V2 utilise `.section-title` pour mini-label uppercase. Ce sont deux choses différentes. Proposition : créer `.h2-display` (24px Archivo Black) + garder `.section-title` (11px UPPER mono) |
| KPI value                               | Archivo Black 28px ls -0.025em                                          | `.page-title` proche mais pas identique                   | 🆕 créer `.kpi-value`                                                                                                                                                                                                                                                            |
| KPI unit                                | JetBrains Mono 13px 400                                                 | absent                                                    | 🆕 utilitaire ou inline                                                                                                                                                                                                                                                          |
| Tab actif                               | Inter 13px 500 (600 actif)                                              | `Tabs.tsx` legacy                                         | 🟧 spécifié dans le composant Tabs V2 à créer                                                                                                                                                                                                                                    |
| Body text                               | Inter 13px 500                                                          | `--font-size-sm` 0.8125rem (13px)                         | ✅ aligné                                                                                                                                                                                                                                                                        |
| Table cell                              | Inter 12-13px 500                                                       | `--font-size-sm` (13px)                                   | ✅ aligné                                                                                                                                                                                                                                                                        |
| Table header                            | JetBrains Mono 10px 600 .10em UPPER                                     | `.th-base` legacy                                         | 🟧 spécifié dans DataTable V2 à créer                                                                                                                                                                                                                                            |
| Reference (`FA-2026-XXX`)               | JetBrains Mono 11-12px 600-700 + `#d96d4c`                              | absent V2                                                 | 🆕 créer primitive `<Ref>` ou utilitaire `.ref-mono`                                                                                                                                                                                                                             |
| Badge                                   | JetBrains Mono 10px 600 .04em UPPER                                     | partiellement (`.badge` legacy variants)                  | 🟧 spécifié dans Badge V2 à créer                                                                                                                                                                                                                                                |
| Section label uppercase                 | JetBrains Mono 9-9.5px 700-800 .06-.08em UPPER                          | `.section-title` 11px UPPER tracking-wider                | ⚠ Design 9.5px / V2 11px — taille à arbitrer                                                                                                                                                                                                                                     |
| Breadcrumb                              | JetBrains Mono 11px 400 .06em UPPER                                     | absent                                                    | 🟧 dans Topbar V2                                                                                                                                                                                                                                                                |
| Timestamp                               | JetBrains Mono 10-11px 400-500 textMuted                                | absent                                                    | 🟧 utilitaire                                                                                                                                                                                                                                                                    |
| Button                                  | Inter 13px 600-700                                                      | `.btn` (`Button.tsx`)                                     | ✅ aligné via composant                                                                                                                                                                                                                                                          |
| Plaque véhicule                         | JetBrains Mono 12px 700 + `#fbbf24` fond + `#0a0a0b` texte + 4px radius | absent                                                    | 🆕 créer primitive `<LicensePlate>`                                                                                                                                                                                                                                              |

### 6.3 Pattern signature TrackYu

| Pattern Design                                                 | Décision V2                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| `font-mono` sur tous les nombres (IMEI, valeurs, durées, refs) | ✅ aligné avec règle DLS §5.3 V2 — appliquer systématiquement |
| `tabular-nums` sur chiffres alignés (KPIs, totaux)             | ✅ aligné                                                     |
| `tracking-tighter` sur titres display                          | ✅ aligné                                                     |
| `uppercase tracking-widest` sur micro-labels                   | ✅ aligné                                                     |

---

## 7. ESPACEMENTS

### 7.1 Paddings

| Zone Design                 | Valeur Design              | Token V2                                   | Décision                                                 |
| --------------------------- | -------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| `tc-content` (page content) | `24px 28px 60px`           | absent (page padding via classes Tailwind) | 🟧 valeur fixe dans `<AppShell>` V2                      |
| `tc-top` (topbar)           | `18px 28px`, height `68px` | absent                                     | 🟧 valeur fixe dans Topbar V2                            |
| `tc-subhead`                | `22px 28px 14px`           | absent                                     | 🟧 valeur fixe dans SubHeader V2                         |
| `tc-tabs`                   | `0 28px`                   | absent                                     | 🟧 valeur fixe dans Tabs V2                              |
| Tab item                    | `14px 18px`                | absent                                     | 🟧 dans Tabs V2                                          |
| Sub-tab item                | `10px 16px`                | absent                                     | 🟧 dans Tabs V2                                          |
| Card / panel standard       | `18px` ou `18px 22px`      | absent                                     | 🆕 ajouter `--card-padding` ou utiliser `.card`          |
| KPI card                    | `18px`                     | absent                                     | 🟧 dans KPICard V2                                       |
| Table cell                  | `12px 14px`                | absent                                     | 🟧 dans DataTable V2                                     |
| Button standard             | `9px 14px`                 | dans `.btn-md`                             | ⚠ V2 actuel `padding 12×20` ≠ Design `9×14` — à arbitrer |
| Button large                | `11px 22px`                | `.btn-lg` `padding 15×24`                  | ⚠ écart                                                  |
| Badge                       | `4px 9px`                  | absent                                     | 🟧 dans Badge V2                                         |
| Input                       | `10px 14px`                | dans `.input-base`                         | ⚠ V2 `padding 10px 14px` ≈ identique ✅                  |
| Modal header/footer         | `16px 20px`                | absent                                     | 🟧 dans Modal V2                                         |

**Note** : la majorité des paddings Design sont **spécifiques composants** (pas globaux). Seuls les espacements généraux (4/8/12/16/24/32/48px) méritent d'être en tokens. V2 a déjà `--space-xs` à `--space-3xl` qui couvrent ces valeurs.

### 7.2 Gaps (entre éléments)

| Contexte Design    | Valeur   | V2  | Décision          |
| ------------------ | -------- | --- | ----------------- |
| KPI grid           | `14px`   | —   | 🟧 fixe dans grid |
| Chart grid         | `14px`   | —   | 🟧 fixe           |
| Between sections   | `14px`   | —   | 🟧 fixe           |
| Button group       | `10px`   | —   | 🟧 fixe           |
| Badge group        | `6px`    | —   | 🟧 fixe           |
| Form fields (grid) | `16px`   | —   | 🟧 fixe           |
| Stack vertical     | `8-10px` | —   | 🟧 fixe           |

→ **Décision globale** : garder `--space-*` V2 actuels (xs/sm/md/lg/xl/2xl/3xl) qui suffisent. Pas créer de tokens de gap spécifiques.

---

## 8. BORDER RADIUS

| Élément Design | Valeur                    | Token V2               | Valeur V2       | Décision                                                                 |
| -------------- | ------------------------- | ---------------------- | --------------- | ------------------------------------------------------------------------ |
| Card large     | `14px`                    | `--radius-card`        | 0.875rem (14px) | ✅ identique                                                             |
| Card standard  | `12px`                    | `--radius-md`          | 0.75rem (12px)  | ✅ identique                                                             |
| Card compact   | `10px`                    | absent                 | —               | 🆕 ajouter `--radius-card-compact` ou tolérer arbitrary `[10px]`         |
| Table wrapper  | `12px`                    | `--radius-md`          | 12px            | ✅ identique                                                             |
| Button         | `9px`                     | `--radius-sm` 8px      | écart 1px       | ⚠ tolérable. Proposition : ajouter `--radius-button: 9px` ou tolérer 8px |
| Input          | `8px`                     | `--radius-sm`          | 8px             | ✅ identique                                                             |
| Badge          | `6px`                     | absent                 | —               | 🆕 ajouter `--radius-badge: 6px` ou tolérer arbitrary                    |
| Sidebar logo   | `10px`                    | absent                 | —               | 🟧 fixe dans AppShell                                                    |
| Sidebar item   | `10px`                    | absent                 | —               | 🟧 fixe dans AppShell                                                    |
| Avatar rond    | `50%`                     | `--radius-full` 9999px | équivalent      | ✅                                                                       |
| Avatar square  | `8px`                     | `--radius-sm`          | 8px             | ✅                                                                       |
| Tab period     | `9px outer` / `7px inner` | absent                 | —               | 🟧 fixe dans composant                                                   |
| Search bar     | `10px`                    | absent                 | —               | 🟧 fixe dans SearchInput V2                                              |
| Dropdown       | `10px`                    | absent                 | —               | 🟧 fixe dans Select V2                                                   |
| Tooltip        | `6px`                     | absent                 | —               | 🆕 ou tolérer arbitrary                                                  |
| Modal          | `14px`                    | `--radius-card` 14px   | identique       | ✅                                                                       |
| Progress bar   | `3-4px`                   | absent                 | —               | 🟧 fixe dans composant                                                   |

---

## 9. OMBRES

| Usage Design             | Valeur                            | Token V2                                       | Décision                        |
| ------------------------ | --------------------------------- | ---------------------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| Bouton primaire          | `0 6px 18px rgba(217,109,76,.32)` | absent (utilisé inline)                        | 🆕 ajouter `--shadow-primary`   |
| Logo sidebar             | `0 8px 22px rgba(217,109,76,.35)` | absent                                         | 🟧 fixe dans AppShell           |
| Modal                    | `0 24px 64px rgba(0,0,0,.5)`      | `--shadow-lg` `0 8px 24px ... + 0 4px 8px ...` | écart valeur                    | 🆕 ajouter `--shadow-modal` (Design beaucoup plus profond) |
| Popover (column manager) | `0 18px 48px rgba(0,0,0,.4)`      | absent                                         | 🆕 ajouter `--shadow-popover`   |
| Pulse animation (live)   | keyframes box-shadow              | absent                                         | 🆕 ajouter `@keyframes tcpulse` |

---

## 10. ANIMATIONS

| Animation Design           | Détail                                                                                        | V2                     | Décision                                                |
| -------------------------- | --------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------- |
| `tcpulse`                  | live dot vert pulsant 1.6s ease-in-out infinite (box-shadow 0 0 0 0/6px rgba(34,197,94,.6/0)) | absent                 | 🆕 ajouter `@keyframes tcpulse` dans `src/index.css` V2 |
| Transitions générales      | `transition: all .15s`                                                                        | ad hoc dans composants | 🆕 ajouter `--transition-base: .15s`                    |
| Chevron rotation accordéon | `transform: rotate(180deg) .2s`                                                               | ad hoc                 | 🟧 utilitaire CSS ou Tailwind                           |

V2 dispose déjà de plusieurs animations (`fadeIn`, `slideIn`, `pulse-slow`, `view-enter`, `loading-bar`, `haptic-pulse`, `skeleton-shimmer` — DLS §6.4) qui restent valides. `tcpulse` Design est plus serré (1.6s) que `pulse-slow` V2 (2s) → on ajoute `tcpulse` en complément, pas en remplacement.

---

## 11. SYNTHÈSE — ce qui change concrètement dans V2

### 11.1 Tokens à modifier (alignement V2 → Design)

`src/index.css` bloc `[data-theme='dark']` :

- `--bg-app: #0a0a0b` (était `#0d0d0f`)
- `--bg-card: #141416` (était `#16161a`)
- `--bg-elevated: #1a1a1d` (était `#1c1c21`)
- `--text-main: rgba(255,255,255,.92)` (était `#f9fafb`)
- `--text-muted: rgba(255,255,255,.55)` (était `#8e8e93`)
- `--border-ui: rgba(255,255,255,.08)` (était `rgba(255,255,255,0.12)`)
- `--status-idle: #FBBF24` (était `#f97316` — propagation cible Phase 4 actée DLS §10)

**7 modifications** au total.

### 11.2 Tokens à AJOUTER (nouveaux tokens DLS V2)

**Couleurs** :

- `--brand-primary-hover: #c85f0e` (Design accentHover)
- `--brand-primary-dark: #8b3a00` (isolation depuis gradient)
- `--brand-primary-glow: rgba(217,109,76,.32)` (accentGlow)
- `--border-hover: rgba(217,109,76,.35)` (Design borderHover)
- `--clr-purple: #a855f7` + variantes éventuelles

**Typo** :

- `--font-display: 'Archivo Black', sans-serif`
- `--font-mono: 'JetBrains Mono', monospace`
- `@import url(...)` Google Fonts pour les 2 nouvelles polices

**Ombres** :

- `--shadow-primary: 0 6px 18px rgba(217,109,76,.32)`
- `--shadow-modal: 0 24px 64px rgba(0,0,0,.5)`
- `--shadow-popover: 0 18px 48px rgba(0,0,0,.4)`

**Animations** :

- `@keyframes tcpulse` (live dot)
- `--transition-base: .15s`

**~13 nouveaux tokens / utilitaires**.

### 11.3 Primitives à créer (composants — pas des tokens)

Listées ici pour mémoire, traitées en étape suivante (Phase 4.0) :

- `<AppShell>` — layout `tc-root` (sidebar 64px + main grid)
- `<LicensePlate>` — plaque véhicule jaune
- `<Pill>` — pill live + pulse (réutilisable pour autres pills)
- `<Ref>` — référence mono `FA-2026-XXX` colorée brand
- `<KPICard>` — KPI standard avec sparkline
- `<ChartCard>` — wrapper chart avec head/badge-mini
- `<Badge>` — formalisation pattern color/1f/44

---

## 12. ✅ Décisions arbitrées (Q1-Q6)

**Décision globale utilisateur (2026-04-27 PM)** : pour les 6 points de divergence, **suivre Design** systématiquement (Option A pour chacune). Cohérent avec règle cardinale Phase 4 : **fidélité totale au design**.

### Q1. Couleur de hover du bouton primaire — ✅ Option A (Design)

- **Retenu** : hover = `#c85f0e` (Design accentHover, orange plus foncé)
- **Retenu** : `--brand-primary-light` = `#f4a87a` (Design accentLight, peach chaud)
- **Conséquence** : modifier `--brand-primary-light` dans V2 (était `#e08a70`) + ajouter `--brand-primary-hover #c85f0e`

### Q2. Couleur warning — ✅ Option A (Design)

- **Retenu** : `warning = #f59e0b` (Design amber-500)
- **Conséquence** :
  - `--color-warning` (V2 legacy, était `#f97316`) → passer à `#f59e0b`
  - `--clr-warning` (V2 dark, était `#fb923c`) → passer à `#f59e0b`
  - `--clr-warning-strong` (V2 dark, était `#fdba74`) → passer à `#fde68a` (Design warningLight)

### Q3. Couleur info — ✅ Option A (Design)

- **Retenu** : `info = #3b82f6` (Design bleu-500), `infoLight = #93c5fd`
- **Conséquence** ⚠ **changement de palette** :
  - `--clr-info` (V2 dark, était `#c084fc` violet) → passer à `#3b82f6` bleu
  - `--clr-info-strong` (V2 dark, était `#d8b4fe`) → passer à `#93c5fd`
  - `--color-info` legacy déjà à `#3b82f6` ✅
- **Note** : la couleur violet n'est plus pour info — `--clr-purple #a855f7` (nouveau) prend le relais pour rôles admin / catégories spéciales (cf. §5.2 de ce doc)

### Q4. Section title — ✅ Option A (Design)

- **Retenu** : section title = `JetBrains Mono 9.5px 700 .08em UPPER`
- **Conséquence** : `.section-title` (V2, était 11px tracking-wider) → passer à 9.5px tracking-widest, font-mono, weight 700

### Q5. h2 display — ✅ Option A (Design)

- **Retenu** : créer nouvelle classe `.h2-display` = `Archivo Black 24px ls -0.02em`
- **Conséquence** : ajouter dans `src/index.css` V2 layer `@layer components` une classe `.h2-display`. `.page-title` reste à 22px (h1) et `.section-title` à 9.5px mono — 3 niveaux distincts

### Q6. Padding bouton — ✅ Option A (Design)

- **Retenu** : `btn 9px 14px` (Design compact)
- **Conséquence** : `.btn` (V2, était `padding 12×20` touch 44px) → passer à `padding 9×14`
- **Note accessibilité** ⚠ acceptée : V2 cible **desktop principalement** (mockups Design 1500px). Le mobile a son projet Expo séparé (responsive géré là-bas). Touch target 44px min ne s'applique pas au scope V2 web desktop.

---

## 13. Hors scope V2 (cf. règle 4 catégories de divergence)

Rappel : ces tokens/patterns Design existent mais sont **hors scope V2** (futur projet vitrine `trackyugps.com`) :

- Tous les tokens spécifiques à `_site-public/` (8 pages : index, connexion, contact, essai-gratuit, solutions, tarifs, mentions-légales, politique-confidentialité)
- Tous les tokens spécifiques à `produits/` (5 pages produits)
- Le `shared.css` du site public

→ Pas absorbés dans `MAPPING_DLS.md`. À traiter séparément quand vitrine SaaS sera lancée.

---

## 14. Prochaines étapes (après validation de ce doc)

1. **Toi** : relis ligne par ligne, valide / corrige / arbitre les 6 points Q1-Q6 ci-dessus
2. **Moi** : ne touche à RIEN dans `src/index.css` V2 ni dans le code tant que tu n'as pas validé
3. **Étape 2** (après ton OK) : produire `trackyu-front-V2/src/styles/design-tokens.css` (ou modifier directement `src/index.css` V2 — à décider) avec les changements de la section §11
4. **Étape 3** : valider visuellement (build V2 + `npm run dev` + check HomePage)
5. **Étape 4** : passer aux primitives (Phase 4.0)

**Aucune ligne de code modifiée à ce stade.** Ce doc est purement déclaratif.

---

## 15. Application — Étape 2 livrée 2026-04-27 PM

Toutes les modifications listées en §11 ont été appliquées dans `trackyu-front-V2/`. **Doc passé du statut "à valider" → "appliqué".**

### Fichiers V2 effectivement modifiés

| Fichier                                       | Lignes touchées                                     | Sous-étape    |
| --------------------------------------------- | --------------------------------------------------- | ------------- |
| `trackyu-front-V2/index.html`                 | 13 lignes (preload fonts + 3 favicon links)         | 2a + 2d       |
| `trackyu-front-V2/src/index.css`              | ~75 lignes (tokens dark + light + ombres + tcpulse) | 2b + 2b' + 2c |
| `trackyu-front-V2/public/favicon.svg`         | nouveau (copié depuis `_raw/assets/brand/`)         | 2d            |
| `trackyu-front-V2/public/favicon-32x32.png`   | nouveau                                             | 2d            |
| `trackyu-front-V2/public/favicon-180x180.png` | nouveau                                             | 2d            |

### Validation

- 4 builds successifs OK (1 par sous-étape) : **6.14s à 7.17s**, **CSS 32 → 35.84 kB** (+12%), **JS inchangé**
- Validation visuelle OK : toggle theme dark↔light fonctionnel sur HomePage, favicon brand visible, 0 erreur console DevTools

### Bonus livrés (au-delà de §11 initial)

- **2b'** — alignement light theme V2 sur Design T_LIGHT (rendu possible par découverte `tc-theme.jsx` dans `_raw/`)
- **2d** — favicon brand (rendu possible par découverte `_raw/assets/brand/`)
- **Nouveau cluster `--clr-purple`** créé en dark **et** light (récupère valeurs purple historiques de `--clr-info`)
- **`--color-warning` legacy aligné amber** (cohérence avec `--clr-warning`)

### Cluster `--clr-caution` non touché

V2 a 2 clusters distincts : `--clr-warning` (signaler une alerte) et `--clr-caution` (avertissement doux). Design n'a qu'un warning. Décision : **garder `--clr-caution` V2 actuel** (amber-400 dark) — distinction interne V2 utile pour graduations subtiles. À harmoniser plus tard si besoin.

### Sidebar icon active note

Design utilise `#e08a70` (pink-orange) pour `T_LIGHT.sbIconActive` — différent du peach `#f4a87a` qu'on a mis en `--brand-primary-light` (Q1). À traiter au cas par cas dans le composant `<Sidebar>` (Phase 4.0).

---

_Doc vivant — sera mis à jour au fil des décisions. Chaque arbitrage Q1-Q6 → entrée CHANGELOG.md._
