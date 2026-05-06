# Audit Module 3 — Fleet (Flotte)

> Date : 2026-02-28
> Fichiers audités : 22 fichiers (3 composants principaux + 16 detail-blocks + backend routes/controllers/repos)
> Lignes analysées : ~4 500 (frontend) + ~950 (backend)

---

## Résumé

| Sévérité        | Nombre | Corrigées |
| --------------- | ------ | --------- |
| 🔴 Critique     | 5      | 1         |
| 🟠 Moyen        | 18     | 8         |
| 🟡 Mineur       | 22     | 5         |
| 🔵 Amélioration | 14     | 0         |
| **Total**       | **59** | **14**    |

### Erreurs lint FleetTable.tsx : 50+ → 26 (24 corrigées)

---

## Fichiers audités

### Frontend

| Fichier                              | Lignes | Rôle                                                        |
| ------------------------------------ | ------ | ----------------------------------------------------------- |
| `FleetTable.tsx`                     | 1398   | Vue principale flotte (table/cartes/virtualisé)             |
| `VehicleDetailPanel.tsx`             | 596    | Panneau détail véhicule (10 blocs configurables)            |
| `FuelChart.tsx`                      | 43     | Graphique courbe carburant                                  |
| `SharedBlocks.tsx`                   | 100    | Composants utilitaires ConfigurableRow / CollapsibleSection |
| `ActivityBlock.tsx`                  | ~80    | Bloc activité                                               |
| `AlertsBlock.tsx`                    | ~60    | Bloc alertes                                                |
| `BehaviorBlock.tsx`                  | ~90    | Bloc comportement                                           |
| `ExpensesBlock.tsx`                  | ~80    | Bloc dépenses                                               |
| `FuelBlock.tsx`                      | ~100   | Bloc carburant                                              |
| `GpsBlock.tsx`                       | ~70    | Bloc GPS                                                    |
| `MaintenanceBlock.tsx`               | ~100   | Bloc maintenance                                            |
| `PhotoBlock.tsx`                     | 177    | Bloc photo véhicule                                         |
| `SensorsBlock.tsx`                   | ~80    | Bloc capteurs                                               |
| `ViolationsBlock.tsx`                | ~70    | Bloc violations                                             |
| `modals/FuelModalContent.tsx`        | 109    | Modal détail carburant                                      |
| `modals/MaintenanceModalContent.tsx` | ~100   | Modal détail maintenance                                    |
| `modals/ViolationsModalContent.tsx`  | ~100   | Modal détail violations                                     |

### Backend

| Fichier                      | Lignes | Rôle                                        |
| ---------------------------- | ------ | ------------------------------------------- |
| `vehicleRoutes.ts`           | 43     | Routes backward-compat /api/vehicles        |
| `fleetRoutes.ts`             | 60     | Routes /api/fleet/\*                        |
| `objectController.ts`        | 439    | CRUD véhicules + positions/fuel/maintenance |
| `fleetController.ts`         | 160    | Trajets, capteurs, analytics                |
| `vehicleReportController.ts` | 115    | Génération PDF                              |
| `fleetRepository.ts`         | 143    | Data access fleet                           |
| `vehicleReportRepository.ts` | 50     | Data access rapports                        |

---

## Anomalies détectées

### 🔴 Critiques

#### C1 — vehicleReportRepository: Aucun filtrage tenant_id (BACKEND) ✅

- **Fichier** : `backend/src/repositories/vehicleReportRepository.ts` L8-50
- **Impact** : Toutes les requêtes (`findVehicleById`, `findTrips`, `findFuelRecords`, `findMaintenanceRecords`, `findAlerts`) ne filtraient **pas** par `tenant_id`. Un utilisateur authentifié pourrait accéder aux données de n’importe quel véhicule cross-tenant.
- **Correction** : Ajout du paramètre `tenantId?` à toutes les fonctions avec JOIN sur `objects.tenant_id`
- **Statut** : ✅ Corrigé (commit 7828295)

#### C2 — objectController: WebSocket broadcast global (BACKEND) ✅

- **Fichier** : `backend/src/controllers/objectController.ts` L200-219
- **Impact** : `io.emit('vehicle:update', ...)` diffusait les positions en temps réel à **tous** les clients connectés, sans filtrage par tenant. Fuite de données GPS cross-tenant.
- **Correction** : Remplacé par `io.to(\`tenant:${obj.tenant_id}\`).emit('vehicle:update', ...)`
- **Statut** : ✅ Corrigé (commit 7828295)

#### C3 — objectController: Tenant override via req.body (BACKEND) ✅

- **Fichier** : `backend/src/controllers/objectController.ts` L95
- **Impact** : `createObject()` acceptait `req.body.tenantId` en fallback. Un utilisateur normal pouvait créer un véhicule dans un autre tenant en envoyant un `tenantId` dans le body.
- **Correction** : Supprimé le fallback `req.body.tenantId` - tenantId vient uniquement du token JWT
- **Statut** : ✅ Corrigé (commit 7828295)

#### C4 — FuelModalContent: Variable `vehicle` indéfinie → ReferenceError ✅

- **Fichier** : `detail-blocks/modals/FuelModalContent.tsx` L27
- **Problème** : `vehicle?.fuelType` référence une variable `vehicle` qui n'existe pas dans le scope — le composant ne reçoit pas de prop `vehicle`. Cause un `ReferenceError` à l'exécution.
- **Correction** : Remplacé par `r.fuelType || 'Diesel'` (utilise la donnée du refill directement)
- **Statut** : ✅ Corrigé

#### C5 — fleetRepository: Interpolation SQL du paramètre interval (BACKEND) ✅

- **Fichier** : `backend/src/repositories/fleetRepository.ts` L97-143
- **Impact** : `INTERVAL '${interval}'` était directement interpolé dans le SQL. Risque d’injection SQL si appelé depuis un autre contexte.
- **Correction** : Ajout allowlist VALID_INTERVALS, conversion en `make_interval(days => $n)` paramétrisé
- **Statut** : ✅ Corrigé (commit 7828295)

---

### 🟠 Moyens

#### M1 — FleetTable: Export CSV — BOM et newline échappés ✅

- **Fichier** : `FleetTable.tsx` L669-675
- **Problème** : `'\\n'` et `'\\uFEFF'` étaient des chaînes littérales avec double-backslash au lieu de vrais caractères newline/BOM. L'export CSV générait un fichier corrompu.
- **Statut** : ✅ Corrigé

#### M2 — FleetTable: showToast reçoit des fonctions au lieu de strings ✅

- **Fichier** : `FleetTable.tsx` L191, L625, L628, L688
- **Problème** : `TOAST.FLEET.VEHICLE_IMPORTED` et `TOAST.IO.EXPORT_SUCCESS/ERROR` sont des fonctions, pas des strings. TypeScript le signalait en erreur.
- **Correction** : Ajouté les appels avec arguments : `TOAST.FLEET.VEHICLE_IMPORTED(data.length)`, `TOAST.IO.EXPORT_SUCCESS('PDF', count)`, `TOAST.IO.EXPORT_ERROR('CSV')`
- **Statut** : ✅ Corrigé

#### M3 — FleetTable: `vehicles` conditional instabilise les useMemo ✅

- **Fichier** : `FleetTable.tsx` L137
- **Problème** : `const vehicles = Array.isArray(vehiclesProp) ? vehiclesProp : []` crée une nouvelle référence à chaque rendu, invalidant 6 useMemo dépendants.
- **Correction** : Emballé dans `useMemo(() => ..., [vehiclesProp])`
- **Statut** : ✅ Corrigé

#### M4 — PhotoBlock: Race condition async setIsUploading ✅

- **Fichier** : `PhotoBlock.tsx` L37-55
- **Problème** : `setIsUploading(false)` dans le `finally` se déclenche immédiatement, avant que le `FileReader.onload` async ne termine. Le spinner disparaît avant la fin du chargement.
- **Correction** : Déplacé `setIsUploading(false)` dans `reader.onload` et `reader.onerror`, supprimé le `finally`
- **Statut** : ✅ Corrigé

#### M5 — PhotoBlock: Catch vide avale les erreurs silencieusement ✅

- **Fichier** : `PhotoBlock.tsx` L48
- **Correction** : Ajouté `console.warn('Erreur lors du traitement de la photo:', error)`
- **Statut** : ✅ Corrigé

#### M6 — SharedBlocks: `isVisible` par défaut undefined → blocs cachés ✅

- **Fichier** : `SharedBlocks.tsx` L43
- **Problème** : `isVisible?: boolean` sans valeur par défaut. En mode normal (pas config), `if (!isVisible) return null` cache les blocs quand le parent ne passe pas la prop.
- **Correction** : Défaut `isVisible = true`
- **Statut** : ✅ Corrigé

#### M7 — SharedBlocks: `onMoveUp`/`onMoveDown` sans optional chaining ✅

- **Fichier** : `SharedBlocks.tsx` L60-61
- **Problème** : `onClick={onMoveUp}` appelé directement alors que les props sont optionnelles. Cause une erreur si le parent ne passe pas ces callbacks.
- **Correction** : `onClick={() => onMoveUp?.()}`
- **Statut** : ✅ Corrigé

#### M8 — VehicleDetailPanel: Modals MaintenanceModal et ViolationsModal non fonctionnels

- **Fichier** : `VehicleDetailPanel.tsx` + `modals/MaintenanceModalContent.tsx` + `modals/ViolationsModalContent.tsx`
- **Problème** : Ces deux modals n'acceptent aucune prop et utilisent des données 100% hardcodées (mock). Aucune donnée réelle n'est affichée.
- **Statut** : ⬜ Non corrigé (nécessite refactoring pour passer les données)

#### M9 — vehicleRoutes: Endpoint /health/db sans authentification (BACKEND)

- **Fichier** : `backend/src/routes/vehicleRoutes.ts` L17
- **Impact** : `/api/vehicles/health/db` est accessible sans token JWT. Expose des infos d'infrastructure (nombre de tables, pool stats).
- **Statut** : ⬜ Non corrigé

#### M10 — fleetRepository: NOW() interpolé en string (BACKEND)

- **Fichier** : `backend/src/repositories/fleetRepository.ts` L62-66
- **Impact** : Quand `endTime` est null, le paramètre `$3` reçoit la string `'NOW()'` au lieu de la fonction SQL. Retourne possiblement zéro résultats.
- **Statut** : ⬜ Non corrigé

#### M11 — fleetController: Boucle INSERT sans transaction (BACKEND)

- **Fichier** : `backend/src/controllers/fleetController.ts` L83-87
- **Impact** : `calculateTrips()` insère des trajets en boucle sans `BEGIN/COMMIT`. Si un INSERT échoue, des trajets partiels persistent.
- **Statut** : ⬜ Non corrigé

#### M12 — FleetTable: 12 imports Lucide inutilisés ✅

- **Fichier** : `FleetTable.tsx` L4
- **Imports supprimés** : Check, Activity, PauseCircle, WifiOff, DollarSign, Gauge, Calendar, TrendingUp, TrendingDown, BarChart3, PieChartIcon, LineChart
- **Statut** : ✅ Corrigé

#### M13 — FleetTable: Import dupliqué '../../../types' ✅

- **Fichier** : `FleetTable.tsx` L2-3
- **Correction** : Fusionné en `import { type Vehicle, VehicleStatus } from '../../../types'`
- **Statut** : ✅ Corrigé

#### M14 — FuelModalContent: Imports inutilisés LineChart et Line ✅

- **Fichier** : `modals/FuelModalContent.tsx` L2
- **Correction** : Supprimés de l'import Recharts
- **Statut** : ✅ Corrigé

#### M15 — FleetTable: Variable `alerts` déstructurée mais inutilisée ✅

- **Fichier** : `FleetTable.tsx` L139
- **Correction** : Supprimée de la déstructuration `useDataContext()`
- **Statut** : ✅ Corrigé

#### M16 — FleetTable: Variable `count` dans handleImport jamais lue ✅

- **Fichier** : `FleetTable.tsx` L151
- **Correction** : Supprimée
- **Statut** : ✅ Corrigé

#### M17 — FleetTable: `let result` → `const result` ✅

- **Fichier** : `FleetTable.tsx` L316
- **Statut** : ✅ Corrigé

#### M18 — FleetTable: `onLocationClick && onLocationClick(vehicle)` expression ✅

- **Fichier** : `FleetTable.tsx` L540
- **Correction** : `onLocationClick?.(vehicle)`
- **Statut** : ✅ Corrigé

---

### 🟡 Mineurs

| #   | Fichier                                      | Description                                                                                  | Statut     |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------- |
| m1  | FleetTable L580                              | Prix carburant hardcodé `1.8` (€/L) — devrait être configurable                              | ⬜         |
| m2  | FleetTable L589                              | `new Date().getTime()` dans useMemo stats — potentiellement impur                            | ⬜         |
| m3  | FleetTable L348-349                          | `any` type dans sort values — devrait être `Vehicle[keyof Vehicle]`                          | ⬜         |
| m4  | FleetTable L670                              | `(row as any)[h]` dans CSV — perte de typage                                                 | ⬜         |
| m5  | FleetTable L150                              | `handleImport(data: any[])` — devrait être typé                                              | ⬜         |
| m6  | FleetTable L692-711                          | `_handleTouchStart/Move/End` préfixés \_ (inutilisés) — dead code                            | ⬜         |
| m7  | FleetTable L712-794                          | `_MobileVehicleCard` préfixé \_ (inutilisé) — dead code à nettoyer                           | ⬜         |
| m8  | FleetTable L796-834                          | VirtualRow useCallback — deps manquantes `renderCell` et `toggleSelection`                   | ⬜         |
| m9  | VehicleDetailPanel                           | `loadSavedConfig()` appelé pendant le rendu (pas dans useMemo/useState)                      | ⬜         |
| m10 | VehicleDetailPanel                           | Types `any` dans callbacks fuelRecords/maintenanceRecords/alerts                             | ⬜         |
| m11 | Tous detail-blocks (9)                       | Prop `mockData: any` — nécessite interface typée                                             | ⬜         |
| m12 | AlertsBlock                                  | Manque locale 'fr-FR' sur `toLocaleTimeString()`                                             | ⬜         |
| m13 | FuelChart                                    | Utilise `v.id` au lieu de `v.name` pour les labels du graphique                              | ⬜         |
| m14 | ActivityBlock                                | Nombre magique `0.6` hardcodé sans explication                                               | ⬜         |
| m15 | ActivityBlock                                | Manque null guard sur `vehicle.location`                                                     | ⬜         |
| m16 | SharedBlocks                                 | Prop `badge` déclarée mais jamais rendue dans le JSX                                         | ⬜         |
| m17 | SharedBlocks                                 | Param `id` de ConfigurableRow inutilisé                                                      | ✅ Préfixé |
| m18 | PhotoBlock                                   | Import Vehicle en type import ✅                                                             | ✅ Corrigé |
| m19 | fleetRepository L30 vs vehicleReportRepo L13 | `object_id` vs `vehicle_id` pour la même table `trips` — incohérence                         | ⬜         |
| m20 | fleetController L101-103                     | Dernier trajet "en cours" silencieusement perdu si dernier point est en mouvement            | ⬜         |
| m21 | fleetController L94-95                       | Client pas libéré proprement dans le early return (positions.length === 0)                   | ⬜         |
| m22 | objectController L348                        | Fallback `'tenant_default'` pour tenantId dans maintenance — risque d'assignation incorrecte | ⬜         |

---

### 🔵 Améliorations

| #   | Fichier                 | Description                                                                     |
| --- | ----------------------- | ------------------------------------------------------------------------------- |
| a1  | 14/16 detail-blocks     | Manque dark mode sur la majorité des éléments                                   |
| a2  | Tous detail-blocks (9)  | Manque d'internationalisation (dates non formatées fr-FR)                       |
| a3  | MaintenanceModalContent | 100% données hardcodées — connecter aux vraies données                          |
| a4  | ViolationsModalContent  | 100% données hardcodées — connecter aux vraies données                          |
| a5  | FleetTable              | 1396 lignes — candidat au splitting (toolbar, table body, mobile cards, modals) |
| a6  | FleetTable              | Selects sans titre accessible (a11y)                                            |
| a7  | FleetTable              | 11 inline styles — migrer vers classes Tailwind                                 |
| a8  | FleetTable              | Inputs/checkbox import modal sans labels (a11y)                                 |
| a9  | VehicleDetailPanel      | Ajouter type interface `MockData` partagée                                      |
| a10 | objectController L159   | Message "Consider archiving" mais pas d'endpoint d'archive                      |
| a11 | BehaviorBlock           | Import `TrendingDown` inutilisé                                                 |
| a12 | ExpensesBlock           | Import `DollarSign` inutilisé                                                   |
| a13 | GpsBlock                | Import `Settings` inutilisé                                                     |
| a14 | MaintenanceBlock        | Import `Bell` inutilisé                                                         |

---

## Corrections appliquées (14 fixes)

### Frontend — FleetTable.tsx

1. **Import Vehicle en type** — `import { type Vehicle, VehicleStatus }`
2. **12 imports Lucide supprimés** — Check, Activity, PauseCircle, WifiOff, DollarSign, Gauge, Calendar, TrendingUp, TrendingDown, BarChart3, PieChartIcon, LineChart
3. **`vehicles` wrappé en useMemo** — stabilise la référence pour 6 hooks dépendants
4. **`alerts` supprimé** — déstructuration inutilisée de useDataContext
5. **`count` supprimé** — variable jamais lue dans handleImport
6. **`let result` → `const result`** — jamais réassigné
7. **`onLocationClick && onLocationClick(vehicle)` → `onLocationClick?.(vehicle)`**
8. **showToast avec fonctions** — `TOAST.FLEET.VEHICLE_IMPORTED(data.length)`, `TOAST.IO.EXPORT_SUCCESS('PDF', count)`, `TOAST.IO.EXPORT_ERROR('CSV')`
9. **CSV BOM et newline** — `'\\n'` → `'\n'`, `'\\uFEFF'` → `'\uFEFF'` (vrais caractères)
10. **Catch vides** — supprimé les variables `e`/`_e` non utilisées

### Frontend — FuelModalContent.tsx

11. **Variable `vehicle` indéfinie** — `vehicle?.fuelType` → `r.fuelType || 'Diesel'`
12. **Imports inutilisés** — supprimé `LineChart`, `Line` de recharts

### Frontend — PhotoBlock.tsx

13. **Race condition async** — déplacé `setIsUploading(false)` dans `onload`/`onerror` au lieu de `finally`

### Frontend — SharedBlocks.tsx

14. **isVisible default `true`** + **optional chaining** `onMoveUp?.()` / `onMoveDown?.()`

---

## Anomalies backend critiques (non corrigées — nécessitent tests)

| #   | Sévérité    | Description                                                   | Fichier                      |
| --- | ----------- | ------------------------------------------------------------- | ---------------------------- |
| C1  | 🔴 CRITIQUE | vehicleReportRepository — 0 filtrage tenant_id sur 5 requêtes | `vehicleReportRepository.ts` |
| C2  | 🔴 CRITIQUE | io.emit global — positions diffusées à tous les tenants       | `objectController.ts` L200   |
| C3  | 🔴 CRITIQUE | req.body.tenantId permet override du tenant                   | `objectController.ts` L95    |
| C5  | 🔴 HAUTE    | SQL interpolation directe de `interval`                       | `fleetRepository.ts` L97+    |
| M9  | 🟠 MOYEN    | /health/db sans auth — expose infos infra                     | `vehicleRoutes.ts` L17       |
| M10 | 🟠 MOYEN    | String 'NOW()' au lieu de SQL NOW()                           | `fleetRepository.ts` L62     |
| M11 | 🟠 MOYEN    | INSERT boucle sans transaction                                | `fleetController.ts` L83     |

> ⚠️ Les corrections backend nécessitent des tests d'intégration et une revue de sécurité avant application.

---

## Prochaines étapes recommandées

1. **URGENCE** : Corriger le broadcast WebSocket global (`io.emit` → `io.to(tenant:...)`)
2. **URGENCE** : Ajouter `tenant_id` à vehicleReportRepository
3. **HAUTE** : Supprimer le fallback `req.body.tenantId` dans createObject
4. **HAUTE** : Connecter les modals Maintenance/Violations aux vraies données
5. **MOYEN** : Extraire FleetTable en sous-composants (<500 lignes chacun)
6. **MOYEN** : Créer interface `MockData` typée pour les detail-blocks
7. **FAIBLE** : Dark mode complet sur les 14 detail-blocks
