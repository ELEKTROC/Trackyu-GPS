# TESTING_PLAN — Stratégie de tests V2

> Plan de tests prioritaires pour `trackyu-front-V2/`. À lire **après** STATE.md.
>
> Dernière mise à jour : **2026-05-02** — bootstrap infra + 8 fichiers tests → **195 tests verts**. Tier 1 utils purs ✅ COMPLET (4/4). Tier 1 mappers : `mapInvoice` ✅ + `mapContract` ✅. `formatDuration` ✅. Bloqués : `getBillingMonths` (extract requis), `useVehicleFuel` (refactor mappers inline).

---

## 🎯 Constat de départ (2026-05-02)

| Repo                       | Tests unitaires                                                                                                                                                                                                                                                                       | Infra                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Legacy `TRACKING/`         | 2 fichiers (`SettingsIntegration` + `useDateRange`)                                                                                                                                                                                                                                   | Vitest installé                                             |
| **V2 `trackyu-front-V2/`** | **2 fichiers nouveaux** ([`utils/__tests__/dateRange.test.ts`](../../../trackyu-front-V2/src/utils/__tests__/dateRange.test.ts) + [`features/settings/__tests__/SettingsPage.smoke.test.tsx`](../../../trackyu-front-V2/src/features/settings/__tests__/SettingsPage.smoke.test.tsx)) | ✅ Vitest 4 + jsdom + RTL + setup file + `vitest.config.ts` |

**Les tests legacy n'ont pas été portés à l'identique** : les cibles (`SettingsView` legacy, `hooks/useDateRange`) n'existent pas dans V2. À la place, on a écrit deux tests **équivalents fonctionnels** adaptés à l'architecture V2 :

- `utils/dateRange.ts` (`periodToRange`, `formatDateRange`)
- `features/settings/SettingsPage.tsx` (navigation 2 niveaux)

---

## 🛠️ Infra installée

```
trackyu-front-V2/
├── vitest.config.ts                ← jsdom · alias '@' · setupFiles · coverage v8
├── src/test/setup.ts               ← @testing-library/jest-dom + matchMedia/RO/IO stubs
└── src/**/__tests__/*.test.{ts,tsx}
```

**Convention de localisation** : tests **co-localisés** dans `__tests__/` à côté du code testé (pas un dossier `tests/` séparé). Cohérent avec V2 (architecture par feature).

**Commandes** :

```bash
npm test                  # mode watch
npm test -- --run         # one-shot
npm test -- --coverage    # rapport couverture v8
```

---

## 📊 Plan de tests prioritaires

### Tier 1 — code métier critique (à attaquer en premier)

Ces modules calculent ou transforment des données métier. Une régression silencieuse = mauvais chiffres facturés / affichés. **Couverture cible : 80 %.**

| Cible                                    | Fichier                                                                                                                  | Pourquoi prioritaire                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `mapInvoice`                             | [`features/vente/hooks/useInvoices.ts:84`](../../../trackyu-front-V2/src/features/vente/hooks/useInvoices.ts#L84)        | 7133 factures en prod — sérialisation backend snake_case → camelCase, montants, statuts |
| `getBillingMonths` (algo planning)       | [`features/vente/VentePage.tsx`](../../../trackyu-front-V2/src/features/vente/VentePage.tsx)                             | Algo legacy porté — 3 colonnes Kanban (1-30j / 31-60j / 60+j) — calculs date-sensible   |
| `useContracts` mapper                    | [`features/vente/hooks/useContracts.ts`](../../../trackyu-front-V2/src/features/vente/hooks/useContracts.ts)             | 268 contrats — mapping camelCase + enrichissement                                       |
| `useSubscriptions` enrichissement        | [`features/vente/hooks/useSubscriptions.ts`](../../../trackyu-front-V2/src/features/vente/hooks/useSubscriptions.ts)     | `useMemo` réactif — bug closure déjà corrigé une fois                                   |
| `useDashboardData` agrégations           | [`features/dashboard/useDashboardData.ts`](../../../trackyu-front-V2/src/features/dashboard/useDashboardData.ts)         | KPI Dashboard = vitrine — fausses valeurs visibles direct                               |
| `useVehicleActivity` (day-stats + trips) | [`features/fleet/hooks/useVehicleActivity.ts`](../../../trackyu-front-V2/src/features/fleet/hooks/useVehicleActivity.ts) | Calcul jour calendaire 00:00→23:59 (règle métier dédiée)                                |
| `useVehicleFuel` (events fuel)           | [`features/fleet/hooks/useVehicleFuel.ts`](../../../trackyu-front-V2/src/features/fleet/hooks/useVehicleFuel.ts)         | Précision carburant = chantier stratégique                                              |
| `vehicleStatus` (utils)                  | [`utils/vehicleStatus.ts`](../../../trackyu-front-V2/src/utils/vehicleStatus.ts)                                         | Couleurs fixes moving/idle/stopped/offline (règle métier)                               |
| `geo` (utils)                            | [`utils/geo.ts`](../../../trackyu-front-V2/src/utils/geo.ts)                                                             | Distance / haversine / projection coords                                                |
| `currencies` (lib)                       | [`lib/currencies.ts`](../../../trackyu-front-V2/src/lib/currencies.ts)                                                   | Formatage XOF/EUR — apparait sur factures, contrats, dashboard                          |

**Approche** : tests **purs**, pas de RTL. Mock minimaliste de `fetch` ou des modules `services/api/*` quand nécessaire (préférer extraire les mappers en fonctions pures testables séparément).

### Tier 2 — composants UI critiques

Composants qui supportent **toutes les pages**. Une régression = tout casse.

| Cible                                            | Pourquoi                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `DataTable`                                      | Pagination, tri, sélection, bulk actions, ColumnManager — utilisé partout |
| `VehicleDrawer` (4 onglets connectés)            | Cœur module Fleet — Activité/Carburant/Alertes/Maintenance                |
| `MapPage` filter chips + recherche multicritères | 6 critères, groupement par branche, tri alpha — logique non triviale      |
| `AppearanceProvider`                             | Anti-FOUC + theme switch — une régression visible immédiatement           |
| `Pagination` primitive                           | Utilisé sur ~15 pages                                                     |

### Tier 3 — smoke tests pages

1 test par page principale qui vérifie qu'elle render sans crash avec contexts mockés. Sert de garde-fou contre les régressions catastrophiques.

| Page            | Justification                           |
| --------------- | --------------------------------------- |
| `DashboardPage` | Page d'accueil                          |
| `FleetPage`     | Module le plus utilisé                  |
| `VentePage`     | 102 kB, 7 onglets — le plus complexe    |
| `MapPage`       | 64 kB, plusieurs sous-onglets + Leaflet |
| `SettingsPage`  | ✅ **Déjà fait** (2026-05-02)           |
| `AdminPage`     | 13 onglets, RBAC critique               |

### Tier 4 — intégration légère

| Cible                     | Description                                                                      |
| ------------------------- | -------------------------------------------------------------------------------- |
| Auth flow                 | login → cookie set → redirect → user en localStorage                             |
| RBAC sidebar              | Pour chaque rôle (12 rôles), check les routes visibles vs `RBAC_MATRIX.md`       |
| Pagination Vente factures | 7133 factures paginées **côté serveur** — vérifier l'appel API avec page/perPage |

---

## 🧪 Conventions de tests

### Localisation

- Tests **co-localisés** dans `src/<feature>/__tests__/<file>.test.ts(x)`
- Pas de dossier `tests/` racine (≠ legacy)

### Nommage

- `.test.ts` pour fonctions pures (utils, mappers)
- `.test.tsx` pour composants React
- `.smoke.test.tsx` pour smoke tests (rendu sans crash)
- `.integration.test.tsx` pour tests qui touchent plusieurs modules

### Mocking

- **Hooks data métier** : mocker `fetch` ou les modules `services/api/*` — pas React Query lui-même
- **Pages complètes** : mocker les sous-vues (comme `SettingsPage.smoke.test.tsx`) pour isoler la logique de la page
- **Contextes Auth/Theme/Appearance** : mocker via `vi.mock('@/contexts/...')` plutôt que les Providers réels
- **Toast** : mock simple `{ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }`

### Dates / horloge

- Toujours `vi.useFakeTimers()` + `vi.setSystemTime(FIXED)` pour les tests date-sensibles
- Date pivot recommandée : **lundi 15 juin 2026 12:00 UTC** (lundi → expose pivot semaine, mois 30 jours, année non-bissextile)

---

## 📝 Backlog (à ouvrir comme tickets)

À traiter dans l'ordre Tier 1 → Tier 2 → Tier 3 → Tier 4 :

- [x] `mapInvoice` test (sérialisation Invoice complète + edge cases statuts) — **53 tests · livré 2026-05-02**
- [ ] `getBillingMonths` test (algo planning facturation)
- [x] `useContracts` mapper test (`mapContract` — fallbacks, calcDuration, formatAmount, mapStatus) — **27 tests · livré 2026-05-02**
- [ ] `useDashboardData` agrégations test
- [~] `useVehicleActivity` : `formatDuration` helper testé (17 tests, livré 2026-05-02). Le hook lui-même nécessite mock React Query — différé Tier 2
- [ ] `useVehicleActivity` day-stats test (jour calendaire) — différé (mock React Query requis)
- [ ] `useVehicleFuel` events test — bloqué : mappers défensifs (snake_case ↔ camelCase) inline dans queryFn, refactor extract requis avant test
- [x] `vehicleStatus` test (4 statuts × labels FR + couleurs métier fixes) — **24 tests · livré 2026-05-02**
- [x] `geo` test (isValidCoord + haversine Abidjan/Paris-NY/antipodes) — **22 tests · livré 2026-05-02**
- [x] `currencies` test (XOF/EUR/USD/MAD/GNF + edge cases) — **35 tests · livré 2026-05-02**
- [ ] `DataTable` test (pagination, tri, sélection)
- [ ] `VehicleDrawer` test (4 onglets)
- [ ] Smoke `DashboardPage`, `FleetPage`, `VentePage`, `MapPage`, `AdminPage`
- [ ] Auth flow integration test
- [ ] RBAC sidebar matrix test (12 rôles)

**Estimation grossière** : Tier 1 = ~3 jours · Tier 2 = ~2 jours · Tier 3 = ~1 jour · Tier 4 = ~2 jours. Total ~8 jours-dev pour atteindre une base de couverture saine (60-70 %).

---

## 🔄 Maintenance de ce plan

- Cocher les items du backlog au fur et à mesure
- Ajouter une entrée dans CHANGELOG quand un Tier est terminé
- Mettre à jour la couverture cible si on monte au-delà de 70 %
- Si on ajoute un nouveau hook critique → l'inscrire en Tier 1
