# Chantier Design — Harmonisation Web ↔ Mobile

**Date de début :** 2026-04-11  
**Commit Phase 1 :** `344d1d2` — _style(design): harmonisation tokens CSS — Phase 1 (batch global)_  
**Statut :** Phase 1 terminée ✅ — Phase 2 en attente

---

## Contexte

L'application web a été construite sur plusieurs sessions par différents agents IA, sans cohérence de design. Chaque vue utilisait ses propres classes Tailwind hardcodées (`text-slate-500 dark:text-slate-400`, `bg-white dark:bg-slate-900`, etc.) au lieu des tokens CSS du design system centralisé.

**Objectif :** Aligner le web sur les 3 thèmes de la version mobile (dark orange/noir/blanc, ocean, light) en utilisant exclusivement les variables CSS canoniques définies dans `src/index.css`.

### Design system de référence

| Token              | Dark      | Ocean     | Light     |
| ------------------ | --------- | --------- | --------- |
| `--bg-primary`     | `#0D0D0F` | `#0F1923` | `#F8FAFC` |
| `--bg-surface`     | `#1A1A1E` | `#162130` | `#FFFFFF` |
| `--bg-elevated`    | `#252529` | `#1E2D40` | `#F1F5F9` |
| `--primary`        | `#E8771A` | `#0EA5E9` | `#E8771A` |
| `--text-primary`   | `#F9FAFB` | `#F0F9FF` | `#0F172A` |
| `--text-secondary` | `#9CA3AF` | `#7DD3FC` | `#64748B` |
| `--border`         | `#2A2A2E` | `#1E3A52` | `#E2E8F0` |

---

## Phase 1 — Terminée ✅

### Ce qui a été fait

**Batch global (186 fichiers, ~7000 remplacements) :**

| Pattern supprimé                                            | Remplacé par                                         |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| `text-slate-{400-800} dark:text-*`                          | `text-[var(--text-primary/secondary/muted)]`         |
| `bg-white dark:bg-slate-{7,8,9}00`                          | `bg-[var(--bg-surface)]` / `bg-[var(--bg-elevated)]` |
| `bg-slate-{50,100} dark:bg-slate-*`                         | `bg-[var(--bg-elevated)]`                            |
| `border-slate-{100-300} dark:border-slate-*`                | `border-[var(--border)]`                             |
| `divide-slate-* dark:divide-slate-*`                        | `divide-[var(--border)]`                             |
| `dark:border/bg/text-slate-*` orphelins                     | tokens CSS                                           |
| `bg-slate-800 dark:bg-white text-white dark:text-slate-900` | `filter-chip.active`                                 |
| `border-white dark:border-slate-900` (timeline dots)        | `border-[var(--bg-surface)]`                         |
| `text-slate-{400-800}` standalone                           | `text-[var(--text-secondary/muted)]`                 |
| `dark:hover:bg-slate-*`                                     | `hover:bg-[var(--bg-elevated)]`                      |

**Corrections CSS (`src/index.css`) :**

- `.section-title` : `--text-muted` → `--text-secondary` (était quasi-invisible en dark mode)
- `.th-base` : même correction
- Sidebar nav active : `--nav-active` (fill orange) → `--primary-dim` (alignement comportement mobile)

**Composants migrés vers `<SearchBar>` :**

- `ContractsView.tsx`
- `CRMView.tsx`
- `SubscriptionsView.tsx`
- `TasksView.tsx`
- `FleetTable.tsx`
- `SupportViewV2.tsx`

**Composants migrés vers `.filter-chip` :**

- `SupportViewV2.tsx` (tabs tickets)
- `ContractsView.tsx` (status filters)
- `TasksView.tsx` (status filters)
- `TiersView.tsx` (type filters)
- `AlertsConsole.tsx` (main tabs)
- `CRMView.tsx` (view mode toggle)

**Classes utilitaires ajoutées dans `@layer components` :**

```css
.filter-chip        /* chip inactive/active */
.filter-chip.active /* bg primary-dim + text primary + border primary */
.icon-btn           /* bouton icône avec border */
.toolbar            /* conteneur flex gap aligné */
.page-title         /* 1.375rem font-black text-primary */
.page-subtitle      /* sm text-secondary */
.section-title      /* 11px bold uppercase text-secondary */
.th-base            /* header tableau */
.td-base            /* cellule tableau */
.tr-hover           /* ligne hover */
.form-error         /* message erreur formulaire */
.pagination-btn     /* bouton pagination */
.pagination-btn.active
```

---

## Phase 2 — À faire

### Patterns restants (estimés au 2026-04-13)

| Pattern                                   | Occurrences | Risque | Stratégie                                  |
| ----------------------------------------- | ----------- | ------ | ------------------------------------------ |
| `bg-slate-*` standalone                   | ~563        | Moyen  | Batch par niveau (50/100/700)              |
| `dark:hover:bg-slate-*`                   | ~230        | Faible | Batch sed 1 commande                       |
| `bg-white` sans dark:                     | ~83         | Faible | Majoritairement intentionnels (PDF, logos) |
| `border-slate-*` standalone               | ~25         | Faible | Batch sed                                  |
| Titres de pages (`text-xl/2xl font-bold`) | ~144        | Faible | Batch → `.page-title`                      |
| Inputs/selects sans token                 | ~50         | Moyen  | Fichier par fichier                        |

### Vues à traiter individuellement

**CRM :**

- `PipelineView.tsx` — colonnes Kanban colorées, ternaires inline
- `LeadsKanban.tsx` — cards leads
- `ContractDetailModal.tsx`, `SubscriptionDetailModal.tsx` — modales

**Finance :**

- `FinanceView.tsx` — onglets, table factures, filtres
- `AccountingView.tsx` — plan comptable, journal
- `CashView.tsx`, `RecoveryView.tsx`

**Admin :**

- `DocumentTemplatesPanelV2.tsx` — éditeur templates
- `OrganizationPanelV2.tsx` — formulaire organisation
- `RoleManagerV2.tsx` — matrice de permissions

**Priorités restantes :**

1. `dark:hover:bg-slate-*` → batch sed (rapide, sans risque)
2. `bg-slate-50` et `bg-slate-100` non-sémantiques → batch
3. PipelineView / LeadsKanban (très visibles)
4. FinanceView + AccountingView
5. Tous les titres de page → `.page-title`

### Cas intentionnels à NE PAS modifier

- `SensorsBlock.tsx` — fond `bg-slate-900` intentionnel (affichage capteur sur fond noir)
- `MapView.tsx` — `border-slate-700/50` (UI carte sur fond sombre)
- `MessageTemplatesPanel.tsx` — `bg-white` (bulles de chat SMS)
- Badges de statut sémantiques — `bg-slate-100 text-slate-700` pour "Annulé/Inactif"
- QR codes, previews PDF — fond blanc intentionnel
- Logos — `bg-white` pour affichage correct

---

## Architecture design system

```
src/index.css
└── [data-theme="dark"]     ← thème principal (orange/noir/blanc)
└── [data-theme="ocean"]    ← thème secondaire
└── [data-theme="light"]    ← thème clair
└── @layer components
    └── .filter-chip, .icon-btn, .toolbar
    └── .page-title, .page-subtitle, .section-title
    └── .th-base, .td-base, .tr-hover
    └── .form-error, .pagination-btn
    └── .btn (primary/secondary/danger/ghost)
    └── .card, .badge-*, .input-base
```

**ThemeContext** : applique `data-theme` + classe `dark` sur `<html>` simultanément.

---

## Commandes utiles pour Phase 2

```bash
# Batch dark:hover
find features -name "*.tsx" | xargs sed -i 's/dark:hover:bg-slate-[0-9]*/hover:bg-[var(--bg-elevated)]/g'

# bg-slate-50 non-sémantiques
find features -name "*.tsx" | xargs sed -i 's/\bbg-slate-50\b/bg-[var(--bg-elevated)]/g'

# bg-slate-100 non-sémantiques
find features -name "*.tsx" | xargs sed -i 's/\bbg-slate-100\b/bg-[var(--bg-elevated)]/g'

# Vérifier ce qui reste
grep -r "bg-slate-\|text-slate-\|border-slate-" features --include="*.tsx" | wc -l
```
