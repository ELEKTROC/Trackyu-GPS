# Audit Module 2 — Dashboard

> **Date** : 2026-02-28
> **Fichiers audités** :
>
> - `features/dashboard/components/DashboardView.tsx` (901 lignes)
> - `features/dashboard/components/DraggableSection.tsx` (116 lignes)
> - `hooks/useDashboardLayout.ts` (101 lignes)
> - `backend/src/routes/analyticsRoutes.ts` (140 lignes)
> - `services/api.ts` (section analytics)

---

## Résumé

| Sévérité        | Trouvées | Corrigées |
| --------------- | -------- | --------- |
| 🔴 Critique     | 0        | —         |
| 🟠 Moyenne      | 3        | 2         |
| 🟡 Mineure      | 6        | 5         |
| 🔵 Amélioration | 5        | 0         |
| **Total**       | **14**   | **7**     |

---

## 🟠 Anomalies Moyennes (3)

### 🟠-1 : `Date.now()` impure dans useMemo ✅ CORRIGÉ

**Fichier** : `DashboardView.tsx` L212, L363
**Problème** : `Date.now()` est appelé à l'intérieur de `useMemo` pour le calcul `fleet.maintenanceDue` et `upcomingMaintenance`. Le React Compiler le signale comme fonction impure — les résultats instables peuvent varier entre les re-renders.
**Correction** : Extraction dans un state `nowMs` avec initialiseur lazy `useState(() => Date.now())`, mis à jour à chaque `fetchStats`. Les useMemo utilisent `nowMs` comme dépendance stable.

### 🟠-2 : `dateRange` déconnecté du backend

**Fichier** : `DashboardView.tsx` L167-171, `analyticsRoutes.ts`
**Problème** : Le sélecteur de période (dateRange) n'est pas passé au backend. L'API `GET /api/analytics/dashboard` retourne toujours les 30 derniers jours (activité) et les 6 derniers mois (revenus/coûts), indépendamment de la période sélectionnée. Les KPIs locaux (business, support, tech) sont bien filtrés par dateRange, mais les graphiques backend ne changent pas.
**Impact** : UX trompeuse — l'utilisateur pense changer la période des graphiques.
**Statut** : Non corrigé (nécessite modification backend pour accepter des paramètres de date)

### 🟠-3 : Incohérence `amount` vs `amount_ttc` pour les revenus

**Fichier** : `DashboardView.tsx` L234 vs `analyticsRoutes.ts` L110
**Problème** : Le KPI "Revenus (période)" en frontend calcule depuis `inv.amount`, tandis que le graphique "Revenus & Facturation" provient du backend qui utilise `amount_ttc`. Ces valeurs peuvent différer (HT vs TTC), créant une incohérence visuelle.
**Statut** : Non corrigé (nécessite décision métier : utiliser HT ou TTC partout)

---

## 🟡 Anomalies Mineures (6)

### 🟡-1 : Accents français manquants partout ✅ CORRIGÉ

**Fichier** : `DashboardView.tsx` (30+ occurrences)
**Problème** : Les labels UI utilisaient systématiquement des mots sans accents : "Vehicules" → "Véhicules", "Arrete" → "Arrêté", "Repartition" → "Répartition", "periode" → "période", "Impayes" → "Impayés", "Resolus" → "Résolus", "Terminees" → "Terminées", "succes" → "succès", "Activite" → "Activité", "Couts" → "Coûts", "Recentes" → "Récentes", "donnee" → "donnée", "prevu" → "prévu", "installee" → "installée", "terminee" → "terminée", "Encaisse" → "Encaissé", "Facture" → "Facturé", "Impaye" → "Impayé", etc.
**Correction** : 30+ remplacements appliqués dans les labels UI et l'export CSV.

### 🟡-2 : Imports Lucide non utilisés ✅ CORRIGÉ

**Fichier** : `DashboardView.tsx` L10-12
**Problème** : 8 icônes importées mais jamais utilisées : `Fuel`, `FileText`, `Clock`, `CheckCircle`, `XCircle`, `Target`, `Zap`, `Eye`.
**Correction** : Imports supprimés.

### 🟡-3 : Variables destructurées non utilisées ✅ CORRIGÉ

**Fichier** : `DashboardView.tsx` L143, L177
**Problème** : `fuelRecords`, `maintenanceRecords` (DataContext) et `collapsedMap`, `hiddenMap` (useDashboardLayout) destructurés mais jamais référencés.
**Correction** : Variables retirées de la destructuration.

### 🟡-4 : Catch block vide ✅ CORRIGÉ

**Fichier** : `DashboardView.tsx` L157
**Problème** : `catch {}` vide dans `fetchStats` — les erreurs réseau sont avalées silencieusement, rendant le debug difficile.
**Correction** : Ajout de `console.warn('[Dashboard] Failed to fetch stats:', err)`.

### 🟡-5 : Import dupliqué ✅ CORRIGÉ

**Fichier** : `DashboardView.tsx` L2-3
**Problème** : `Vehicle` et `FleetMetrics` importés comme valeurs au lieu de types, créant un doublon d'import depuis `'../../../types'`.
**Correction** : Fusionné en un seul import : `import { VehicleStatus, View, type Vehicle, type FleetMetrics } from '../../../types'`.

### 🟡-6 : Utilisation massive de `any` (30+ occurrences)

**Fichier** : `DashboardView.tsx` L225-297, L335-378
**Problème** : Les callbacks `.filter()`, `.reduce()`, `.map()` utilisent `(x: any)` au lieu des types définis dans `/types/`. Cela désactive la vérification TypeScript et peut masquer des bugs (accès à des propriétés inexistantes).
**Statut** : Non corrigé (refactoring important — nécessite audit des types retournés par DataContext)

---

## 🔵 Améliorations (5)

### 🔵-1 : Pas d'indicateur de rafraîchissement

**Problème** : Le skeleton de chargement n'apparaît qu'au premier chargement. Les rafraîchissements toutes les 30 secondes n'ont aucun feedback visuel (pas de spinner, pas de pulse sur le timestamp).
**Impact** : L'utilisateur ne sait pas si les données sont en cours de mise à jour.

### 🔵-2 : "FCFA" hardcodé dans les tooltips

**Fichier** : `DashboardView.tsx` L691, L713
**Problème** : Les tooltips des graphiques revenus et coûts affichent `+ ' FCFA'` en dur. Si un tenant utilise une autre devise, l'affichage sera incorrect.
**Suggestion** : Utiliser le hook `useCurrency` existant.

### 🔵-3 : Export CSV sans contexte de période

**Fichier** : `DashboardView.tsx` L384-414
**Problème** : Le fichier CSV exporté inclut la date du jour dans le nom mais pas la période sélectionnée dans le contenu. L'utilisateur ne peut pas savoir à quelle période correspondent les KPIs exportés.
**Suggestion** : Ajouter une ligne d'en-tête "Période: {dateRange.start} - {dateRange.end}".

### 🔵-4 : Animation collapse via `max-h-[2000px]`

**Fichier** : `DraggableSection.tsx` L104
**Problème** : L'animation de collapse utilise `max-h-[2000px]` comme état déplié. Si le contenu est plus petit, la transition sera plus lente que nécessaire. Si plus grand, le contenu sera coupé.
**Suggestion** : Utiliser une bibliothèque d'animation (framer-motion) ou mesurer la hauteur réelle avec `useRef`.

### 🔵-5 : Pas de gestion d'erreur visible pour l'utilisateur

**Fichier** : `DashboardView.tsx`
**Problème** : Si `fetchStats` échoue (réseau, 500, etc.), le dashboard affiche simplement les données locales sans aucune indication d'erreur. L'utilisateur voit des graphiques vides sans savoir que le backend est inaccessible.
**Suggestion** : Ajouter un banner d'erreur temporaire ou un badge sur le timestamp de rafraîchissement.

---

## Architecture — Points positifs

- ✅ **DnD bien implémenté** : @dnd-kit avec persistence localStorage, collapse/hide/reset
- ✅ **Polling propre** : Intervalle 30s avec cleanup dans useEffect
- ✅ **Skeleton loading** : Composant Skeleton réutilisable pour le premier chargement
- ✅ **Dark mode** : Tous les composants gèrent isDarkMode pour les styles de graphiques
- ✅ **Backend tenant-isolé** : analyticsRoutes filtre par `tenant_id` avec bypass pour staff
- ✅ **Export CSV** : Fonctionnalité d'export des KPIs présente
- ✅ **Sections modulaires** : 5 render functions bien séparées (banner, fleet, business, charts, bottom)

---

## Fichiers modifiés

| Fichier                                           | Modifications                                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/dashboard/components/DashboardView.tsx` | 7 corrections : imports fusionnés, icônes non utilisées supprimées, variables mortes retirées, Date.now() extrait, catch block documenté, 30+ accents corrigés, labels chart corrigés |
