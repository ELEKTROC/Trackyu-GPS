# Skill — Design system frontend TrackYu

## Principe

Tous les composants utilisent les **tokens CSS** définis dans `src/index.css`. Jamais de classes Tailwind `slate-*` codées en dur (sauf exceptions listées ci-dessous).

---

## Tokens CSS disponibles

### Fonds

| Token                | Usage                                |
| -------------------- | ------------------------------------ |
| `var(--bg-primary)`  | Fond principal de l'app              |
| `var(--bg-elevated)` | Cartes, panneaux                     |
| `var(--bg-surface)`  | Surface secondaire (sidebar, footer) |

### Texte

| Token                   | Usage                       |
| ----------------------- | --------------------------- |
| `var(--text-primary)`   | Texte principal             |
| `var(--text-secondary)` | Texte secondaire, labels    |
| `var(--text-muted)`     | Texte atténué, placeholders |

### Bordures & couleurs

| Token                  | Usage                               |
| ---------------------- | ----------------------------------- |
| `var(--border)`        | Bordures standard                   |
| `var(--border-strong)` | Bordures accentuées                 |
| `var(--primary)`       | Couleur principale (orange TrackYu) |
| `var(--primary-dim)`   | Fond primaire atténué               |

---

## Classes utilitaires disponibles

```
.filter-chip      — chips de filtre
.icon-btn         — bouton icône
.toolbar          — barre d'outils
.page-title       — titre de page
.page-subtitle    — sous-titre de page
.section-title    — titre de section (utilise --text-secondary)
.th-base          — en-tête de tableau
.td-base          — cellule de tableau
.tr-hover         — ligne tableau avec hover
.pagination-btn   — bouton pagination
```

---

## Couleurs statut véhicule (fixes, ne pas changer)

```
moving  → #22c55e  (vert)
idle    → #f97316  (orange)
stopped → #ef4444  (rouge)
offline → #6b7280  (gris)
```

---

## Exceptions intentionnelles (ne PAS modifier)

- `SensorsBlock.tsx` — `bg-slate-900` (affichage capteur technique)
- `MapView.tsx` — `border-slate-700/50` (carte Leaflet)
- Bulles chat SMS / previews PDF / logos — `bg-white` voulu
- Badges statut "Annulé" / "Inactif" — `bg-slate-100`

---

## Audit rapide d'un fichier

```bash
grep -n "slate-" features/xxx/components/Xxx.tsx
```

---

## Stratégie de thème — web (cible 2026-04-26)

- **2 modes** : `dark` (sombre) ou `light` (clair) — switcher dans header
- **Accent de marque** = couleur primaire = surchargeable par tenant via `AppearanceContext`
- Brand orange officiel TrackYu : `#d96d4c` (terracotta)
- Le thème `ocean` a été retiré (Phase 0bis 2026-04-26) — un tenant qui veut un accent bleu pose `primaryColor: '#38bdf8'` dans sa charte

## Palette mobile (Expo, session parallèle)

- 3 thèmes white-label (dark / ocean / light) — encore en place côté mobile
- Cible : aligner sur le web (2 modes + accent tenant) lors d'une phase ultérieure
- `useTheme()` hook dans tous les composants mobiles

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill : `docs/frontend/` (design-harmonisation, AUDIT*UI_UX*\*, AUDIT_DROPDOWNS_COMPLET).

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
