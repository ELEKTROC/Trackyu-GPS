# Skill — UX/UI TrackYu

## Principes directeurs

- **Puissant mais lisible** — app pro pour gestionnaires de flotte, pas grand public
- **Dense mais aéré** — maximum d'info visible sans surcharge visuelle
- **Benchmark** : Samsara / Motive (web) — TRAKZEE à dépasser (mobile)
- Robuste > beau — jamais sacrifier la fiabilité pour l'esthétique

## Design system web

Voir `.claude/skills/frontend-design-system.md` pour les tokens CSS complets.

## Patterns de composants établis

### Listes avec lazy load

```tsx
// Ne jamais charger sans filtre posé
const [shouldLoad, setShouldLoad] = useState(false);
const { data } = useQuery({
  enabled: shouldLoad,
  queryFn: () => api.list(filters),
});
```

### Skeletons de chargement

```tsx
import { ListItemSkeleton, StatsCardSkeleton } from 'components/Skeleton';
// Afficher pendant isLoading, jamais de spinner seul
```

### États vides

```tsx
<div className="p-6 text-center text-sm text-[var(--text-muted)]">Aucun enregistrement</div>
```

### Modales

```tsx
import { Modal } from 'components/Modal';
// Toujours un bouton "Fermer" en footer
// Titre descriptif (pas juste "Détails")
```

## Composants clés VehicleDetailPanel

- `CollapsibleSection` — blocs repliables avec config ordre/visibilité
- `ConfigurableRow` — champ masquable en mode config
- `FuelBlock` — jauge semi-circulaire + stats 2×2 + graphique semaine
- `FuelModalContent` — courbe niveau + courbe ralenti + événements ⛽/⚠
- `ActivityBlock`, `AlertsBlock`, `SensorsBlock`...

## Responsive

- App web : **desktop uniquement** (min 1280px) — pas de responsive mobile
- App mobile : Expo React Native — NativeWind v4
- Ne pas essayer de rendre l'app web mobile-friendly

## Accessibilité minimale

- `aria-label` sur tous les boutons icône (sans texte visible)
- Contraste couleur suffisant (WCAG AA minimum)
- Focus visible sur les éléments interactifs

## Animations

- Transitions CSS : `transition-colors`, `transition-all` (durée 150-200ms)
- Pas d'animations complexes sur les données temps réel (performance)
- `animate-spin` uniquement pour les loaders

## Formulaires

- Validation Zod côté client + serveur
- Erreurs inline sous le champ (`errors.field?.message`)
- `react-hook-form` pour tous les formulaires
- Jamais de `alert()` — utiliser `ConfirmDialog` pour les actions destructives

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill : `docs/frontend/` (AUDIT_UI_UX_CONSISTENCY, AUDIT_UI_UX_HARMONIZATION, AUDIT_DROPDOWNS_COMPLET, design-harmonisation).

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
