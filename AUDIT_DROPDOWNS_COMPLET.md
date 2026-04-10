# 🔍 Audit Complet des Dropdowns — TrackYu GPS

> **Date** : Généré automatiquement  
> **Périmètre** : Tous les fichiers `.tsx` du projet  
> **Critères** : Dark mode, Accessibilité, Cohérence stylistique, Fonctionnalité, Menus custom  

---

## 📊 Résumé Statistique

| Métrique | Valeur |
|----------|--------|
| **Fichiers avec dropdowns** | **~50+** |
| **Nombre total de `<select>` natifs** | **~200+** |
| **Dropdowns custom (div + absolute)** | **~25+** |
| **Composant `<Select>` (form/Select.tsx)** | Utilisé dans **~30+ formulaires** via import |
| **Bugs critiques (aucun dark mode)** | **4 fichiers / ~6 selects** |
| **Bugs majeurs (dark:text-\* manquant)** | **~15 fichiers / ~45+ selects** |
| **Selects conformes (dark mode complet)** | **~25+ fichiers** |
| **Aucune lib HeadlessUI / Radix / Listbox** | Confirmé — tout est natif ou custom |

---

## 🏆 Composant de Référence : `components/form/Select.tsx`

Le composant `<Select>` encapsule un `<select>` natif avec **tous les bons patterns** :

```tsx
// ✅ Dark mode complet
"dark:text-slate-100 dark:bg-slate-800 dark:border-slate-600"
// ✅ Focus ring
"focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
// ✅ État erreur
"border-red-500 dark:border-red-500 focus:ring-red-500/20"
// ✅ État désactivé  
"disabled:bg-slate-100 dark:disabled:bg-slate-700"
```

**Recommandation** : Migrer TOUS les `<select>` natifs vers ce composant.

---

## 🔴 Bugs Critiques — Aucun Dark Mode (Pattern D)

Ces selects n'ont **aucune classe dark mode** et restent en fond blanc/texte noir en mode sombre.

| # | Fichier | Ligne | Contexte | Classes actuelles |
|---|---------|-------|----------|-------------------|
| 1 | `features/tech/components/monitoring/OfflineTrackerList.tsx` | ~524 | Pagination | `bg-white border border-slate-200` |
| 2 | `features/support/components/FAQView.tsx` | ~553 | Catégorie article | `border border-slate-300 rounded-lg` |
| 3 | `features/support/components/FAQView.tsx` | ~594 | Statut article | `border border-slate-300 rounded-lg` |
| 4 | `features/map/components/ReplayControlPanel.tsx` | ~721 | Sélection période | `bg-slate-50 border border-slate-200` |
| 5 | `features/map/components/ReplayControlPanel.tsx` | ~837 | Vitesse lecture | `bg-transparent` uniquement |

**Impact** : En dark mode, ces selects apparaissent comme des rectangles blancs sur fond sombre — fortement visible.

### Correction requise :
```tsx
// OfflineTrackerList.tsx L524 — AVANT
className="bg-white border border-slate-200 ..."
// APRÈS
className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 ..."

// FAQView.tsx L553, L594 — AVANT
className="w-full px-3 py-2 border border-slate-300 rounded-lg"
// APRÈS
className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"

// ReplayControlPanel.tsx L721 — AVANT
className="bg-slate-50 border border-slate-200 rounded-lg ..."
// APRÈS
className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 ..."

// ReplayControlPanel.tsx L837 — AVANT
className="bg-transparent text-sm font-medium text-slate-600 ..."
// APRÈS
className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 ..."
```

---

## 🟠 Bugs Majeurs — `dark:text-*` Manquant (Pattern C)

Ces selects ont `dark:bg-*` et `dark:border-*` mais **oublient `dark:text-*`**, rendant le texte potentiellement illisible (texte sombre sur fond sombre).

### Module Admin (~25+ selects affectés)

| # | Fichier | Lignes | Nb selects | Classes dark présentes | Manque |
|---|---------|--------|------------|------------------------|--------|
| 1 | `panels/DeviceConfigPanelV2.tsx` | 508, 963, 1071 | 3 | `dark:bg-slate-800 dark:border-slate-700` | `dark:text-*` |
| 2 | `RoleManagerV2.tsx` | 753 | 1 | `dark:bg-slate-900 dark:border-slate-700` | `dark:text-*` |
| 3 | `panels/StaffPanelV2.tsx` | 579, 592, 963, 984, 998, 1534, 1563+ | ~16 | `dark:bg-slate-900 dark:border-slate-700` | `dark:text-*` |
| 4 | `panels/AuditLogsPanelV2.tsx` | 610, 622, 634 | 3 | `dark:bg-slate-900 dark:border-slate-700` | `dark:text-*` |
| 5 | `DocumentTemplatesPanelV2.tsx` | 595 | 1 | `dark:bg-slate-800 dark:border-slate-700` | `dark:text-*` |
| 6 | `WebhooksPanelV2.tsx` | 658 | 1 | `dark:bg-slate-800 dark:border-slate-700` | `dark:text-*` |
| 7 | `forms/ResellerFormV2.tsx` | 350 | 1 | `dark:bg-slate-800 dark:border-slate-700` | `dark:text-*` |
| 8 | `panels/ResellersPanelV2.tsx` | 483 | 1 | `dark:bg-slate-900 dark:border-slate-700` | `dark:text-*` |

### Module Support (~6+ selects affectés)

| # | Fichier | Lignes | Nb selects | Classes dark présentes | Manque |
|---|---------|--------|------------|------------------------|--------|
| 9 | `SupportSettingsPanel.tsx` | 424, 480, 615, 633, 728, 752 | 6 | `dark:bg-slate-800 dark:border-slate-600` | `dark:text-*` |

### Module Tech (~3 selects affectés)

| # | Fichier | Lignes | Nb selects | Classes dark présentes | Manque |
|---|---------|--------|------------|------------------------|--------|
| 10 | `TechView.tsx` | 663, 676, 689 | 3 | `dark:bg-slate-900 dark:border-slate-600` | `dark:text-*` |

### Module Finance (~1 select affecté)

| # | Fichier | Lignes | Nb selects | Classes dark présentes | Manque |
|---|---------|--------|------------|------------------------|--------|
| 11 | `BudgetView.tsx` | ~157 | 1 | `dark:bg-slate-800 dark:border-slate-700` | `dark:text-*` |

### Module CRM (~3 selects affectés)

| # | Fichier | Lignes | Nb selects | Classes dark présentes | Manque |
|---|---------|--------|------------|------------------------|--------|
| 12 | `SubscriptionsView.tsx` | 514, 527 | 2 | `dark:bg-slate-800 dark:border-slate-700` | `dark:text-*` |
| 13 | `TierDetailModal.tsx` | ~962 | 1 | `dark:bg-slate-900 dark:border-slate-700` | `dark:text-*` |

### Correction type (à appliquer partout) :
```tsx
// AVANT (typique)
className="px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700"

// APRÈS — ajouter dark:text-white ou dark:text-slate-200
className="px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
```

---

## 🟡 Incohérences Stylistiques

### 1. Border color inconsistante

| Pattern | Fichiers utilisant | Recommandé |
|---------|-------------------|------------|
| `border` (sans couleur spécifique) | SupportSettingsPanel, DeviceConfigPanelV2, StaffPanelV2 | ❌ Ambigu |
| `border border-slate-200` | StockTable, StockMovementsTable, InvoiceFilters, FleetTable | ✅ Explicite |
| `border border-slate-300` | FAQView (article form) | ⚠️ Plus sombre que la norme |

**Recommandation** : Standardiser sur `border border-slate-200 dark:border-slate-700` pour les filtres, et `border border-slate-200 dark:border-slate-600` pour les formulaires.

### 2. Background color inconsistante

| Pattern | Fichiers | Recommandé |
|---------|----------|------------|
| `bg-white dark:bg-slate-800` | InvoiceFilters, TicketFormModal | ✅ Standard formulaires |
| `bg-white dark:bg-slate-900` | StockTable, StockMovementsTable | ⚠️ Plus sombre |
| `bg-slate-50 dark:bg-slate-900` | StaffPanelV2, AuditLogsPanelV2, RoleManagerV2 | ⚠️ Incohérent |
| `bg-slate-50 dark:bg-slate-800` | DeviceConfigPanelV2, WebhooksPanelV2 | ⚠️ |

**Recommandation** :  
- **Filtres de toolbar** → `bg-white dark:bg-slate-800` ou `bg-slate-50 dark:bg-slate-800`
- **Formulaires modaux** → `bg-white dark:bg-slate-800`
- **Petits selects inline** → `bg-white dark:bg-slate-900`

### 3. Dark border color inconsistante

| Pattern | Fréquence |
|---------|-----------|
| `dark:border-slate-600` | InvoiceFilters, SupportSettingsPanel, TechSettingsPanel, BudgetView |
| `dark:border-slate-700` | StaffPanelV2, AuditLogsPanelV2, DeviceConfigPanelV2, SubscriptionsView |

**Recommandation** : Standardiser sur `dark:border-slate-700` partout, ou `dark:border-slate-600` pour les formulaires modaux (comme le composant `Select.tsx` de référence).

### 4. Text color dark inconsistante

| Pattern | Fichiers |
|---------|----------|
| `dark:text-white` | TicketFormModal, AutomationRulesView, TechSettingsPanel |
| `dark:text-slate-200` | InvoiceFilters, FinanceView |
| `dark:text-slate-300` | StockModals (selectClass) |
| `dark:text-slate-100` | Composant Select.tsx de référence |

**Recommandation** : Standardiser sur `dark:text-slate-200` (cohérent avec inputs) ou `dark:text-white` (plus lisible).

---

## ♿ Accessibilité

### Selects SANS label, aria-label, NI title

| Fichier | Lignes | Contexte |
|---------|--------|----------|
| `StaffPanelV2.tsx` | 963, 984, 998, 1534, 1563 | Selects du formulaire employé (nationality, sex, family status, etc.) |
| `FAQView.tsx` | 553, 594 | Catégorie et Statut (formulaire article) |
| `BudgetView.tsx` | ~421 | Select compte comptable dans le modal |
| `SubscriptionsView.tsx` | 514, 527 | Filtres statut et revendeur |
| `TierDetailModal.tsx` | ~962 | Chart period select |
| `ReplayControlPanel.tsx` | 837 | Vitesse de lecture |

### Selects avec `title` (acceptable mais pas optimal)

| Fichier | Lignes |
|---------|--------|
| `SupportSettingsPanel.tsx` | 424, 480, 633, 728, 752 |
| `StaffPanelV2.tsx` | 579, 592 |
| `AuditLogsPanelV2.tsx` | 610, 622, 634 |
| `RoleManagerV2.tsx` | 753 |
| `TierDetailModal.tsx` | ~962 |
| `ReplayControlPanel.tsx` | 721, 837 |
| `MyAccountView.tsx` | 220 |

### Selects avec `aria-label` ✅ (best practice)

| Fichier | Lignes |
|---------|--------|
| `DateRangeSelector.tsx` | `aria-label="Période"` |
| `InvoiceFilters.tsx` | 83, 113, 133 — tous `aria-label` ✅ |
| `FinanceView.tsx` | 1168, 1194, 1212 — `aria-label` ✅ |
| `BudgetView.tsx` | ~157 — `aria-label="Année budgétaire"` ✅ |
| `ResellersPanelV2.tsx` | 483 — `aria-label="Filtrer par statut"` ✅ |
| `OfflineTrackerList.tsx` | 524 — `aria-label` ✅ |

### Selects avec `id` + `<label htmlFor>` ✅✅ (gold standard)

| Fichier | Lignes |
|---------|--------|
| `EscalateTicketModal.tsx` | 112, 147 |

**Recommandation** : Appliquer `aria-label` sur tous les selects filtres. Pour les formulaires, préférer `<label htmlFor>` + `id`.

---

## ✅ Fichiers Conformes (Dark Mode Complet)

Ces fichiers ont des selects avec `dark:bg-*`, `dark:border-*` ET `dark:text-*` :

| Fichier | Nb selects | Notes |
|---------|------------|-------|
| `components/form/Select.tsx` | Composant réutilisable | Gold standard |
| `components/DateRangeSelector.tsx` | 1 | + aria-label |
| `features/fleet/components/FleetTable.tsx` | 3 | + FilterDropdown custom |
| `features/map/components/MapView.tsx` | 4 | Tous conformes |
| `features/support/components/EscalateTicketModal.tsx` | 2 | + id/htmlFor |
| `features/support/components/partials/TicketFormModal.tsx` | ~8 | + title attrs |
| `features/settings/components/MyOperationsView.tsx` | 1 | Conforme |
| `features/settings/components/MyAccountView.tsx` | 1 | + title |
| `features/settings/components/SettingsView.tsx` | 1 | Pagination conforme |
| `features/admin/components/panels/RegistrationRequestsPanel.tsx` | 1 | Conforme |
| `features/finance/components/FinanceView.tsx` | 2 (L1614, L1761) | Pagination + paiement |
| `features/crm/components/AutomationRulesView.tsx` | 3 (L229, L401, L443) | dark:text-slate-300/white |
| `features/stock/components/partials/StockTable.tsx` | 4 | Tous conformes |
| `features/stock/components/partials/StockMovementsTable.tsx` | 1 | Conforme |
| `features/stock/components/partials/StockOverview.tsx` | 1 | Conforme |
| `features/finance/components/partials/InvoiceFilters.tsx` | 3 | + aria-label |
| `features/tech/components/TechSettingsPanel.tsx` | ~8 | dark:text-white |
| `features/tech/components/TechView.tsx` | 1 (L559) | Pagination conforme |

---

## 🔧 Dropdowns Custom (div + useState + absolute)

Ces composants implémentent des menus déroulants custom sans `<select>` natif.

| Fichier | State Variable | Type | Dark Mode Panel |
|---------|---------------|------|-----------------|
| `FleetTable.tsx` | `FilterDropdown` component | Filtre multi-option | ✅ `dark:bg-slate-800 dark:border-slate-700` |
| `FleetTable.tsx` | Status hover dropdown | Menu contextuel | ✅ `dark:bg-slate-800` |
| `TicketFormModal.tsx` | `isClientDropdownOpen` | Recherche client | ✅ dark classes visibles |
| `TechView.tsx` | `isFilterMenuOpen` | Panneau filtre | ✅ `dark:bg-slate-800 dark:border-slate-700` |
| `FinanceView.tsx` | `showExportMenu` | Menu export | À vérifier |
| `FinanceView.tsx` | `actionMenuId` | Menu action row | À vérifier |
| `InterventionList.tsx` | `isFilterMenuOpen`, `isExportMenuOpen` | Filtres + Export | À vérifier |
| `TiersView.tsx` | `isFilterMenuOpen`, `isImportMenuOpen` | Filtres + Import | À vérifier |
| `TierList.tsx` | `openMenuId` | Menu action row | À vérifier |
| `ContractsView.tsx` | `statusMenuId` | Menu transition statut | À vérifier |
| `SettingsView.tsx` | `isColumnMenuOpen`, `statusMenuOpen` | Colonnes + Statut | À vérifier |
| `AlertForm.tsx` | `isVehicleDropdownOpen`, `isUserDropdownOpen` | Multi-select véhicules/users | À vérifier |
| `MaintenanceForm.tsx` | `isVehicleDropdownOpen`, `isUserDropdownOpen` | Multi-select | À vérifier |
| `ReplayControlPanel.tsx` | `isVehicleDropdownOpen` | Sélection véhicule | À vérifier |
| `InvoiceForm.tsx` | `isPlateDropdownOpen`, `openCatalogIndex` | Multi-select plaques | À vérifier |
| `InterventionVehicleTab.tsx` | `isMaterialMenuOpen` | Multi-select matériel | À vérifier |
| `CatalogList.tsx` | `isColumnMenuOpen` | Gestionnaire colonnes | À vérifier |
| `ReportFilterBar.tsx` | `isGenerateMenuOpen` | Menu génération | À vérifier |
| `ReportTable.tsx` | `isColumnMenuOpen` | Gestionnaire colonnes | À vérifier |
| `RecoveryView.tsx` | `isColumnMenuOpen` | Gestionnaire colonnes | À vérifier |
| `NotificationCenter.tsx` | `isFilterMenuOpen` | Filtre notifications | À vérifier |
| `AccountingContent.tsx` | `isColumnMenuOpen` | Gestionnaire colonnes | À vérifier |
| `InvoiceFilters.tsx` | `showExportMenu` | Menu export | À vérifier |

**Note** : Les dropdowns custom à base de `ColumnManager` sont un composant réutilisable — vérifier le dark mode du composant `ColumnManager` une seule fois.

---

## 📋 Table Complète de TOUS les Dropdowns

### Légende Statut
- ✅ = Conforme (dark mode complet + accessibilité)
- ⚠️ = Partiel (dark:text manquant ou styling incomplet)
- ❌ = Non conforme (pas de dark mode)
- 🔍 = Non inspecté (identifié par grep, pattern probable déduit)

| # | Fichier | Ligne(s) | Type | Rôle | Dark | A11y | Statut |
|---|---------|----------|------|------|------|------|--------|
| 1 | `components/form/Select.tsx` | - | Custom `<Select>` | Composant partagé | ✅ Complet | Dépend parent | ✅ |
| 2 | `components/DateRangeSelector.tsx` | ~40 | `<select>` | Période prédéfinie | ✅ Complet | `aria-label` | ✅ |
| 3 | `features/fleet/FleetTable.tsx` | 854, 869 | `<select>` | Filtres client/véhicule | ✅ | `aria-label` possible | ✅ |
| 4 | `features/fleet/FleetTable.tsx` | 1302 | `<select>` | Pagination | ✅ | — | ✅ |
| 5 | `features/fleet/FleetTable.tsx` | — | `FilterDropdown` | Filtre custom | ✅ Panel dark | — | ✅ |
| 6 | `features/map/MapView.tsx` | 1185 | `<select>` | Filtre statut | ✅ | — | ✅ |
| 7 | `features/map/MapView.tsx` | 1199 | `<select>` | Filtre client | ✅ | — | ✅ |
| 8 | `features/map/MapView.tsx` | 1212 | `<select>` | Filtre type | ✅ | — | ✅ |
| 9 | `features/map/MapView.tsx` | 1228 | `<select>` | Filtre géofence | ✅ | — | ✅ |
| 10 | `features/map/ReplayControlPanel.tsx` | ~721 | `<select>` | Période replay | ❌ Aucun | `title` | ❌ |
| 11 | `features/map/ReplayControlPanel.tsx` | ~837 | `<select>` | Vitesse lecture | ❌ Aucun | `title` | ❌ |
| 12 | `features/support/EscalateTicketModal.tsx` | 112 | `<select>` | Agent escalade | ✅ | `id/htmlFor` | ✅ |
| 13 | `features/support/EscalateTicketModal.tsx` | 147 | `<select>` | Priorité escalade | ✅ | `id/htmlFor` | ✅ |
| 14 | `features/support/TicketFormModal.tsx` | 299-551 | `<select>` ×8 | Formulaire ticket | ✅ | `title` | ✅ |
| 15 | `features/support/TicketFormModal.tsx` | ~257 | Custom dropdown | Recherche client | ✅ | — | ✅ |
| 16 | `features/support/SupportViewV2.tsx` | ~1905 | `<select>` | Config priorité | ⚠️ `dark:bg` ok, `dark:border` manque | — | ⚠️ |
| 17 | `features/support/SupportSettingsPanel.tsx` | 424, 480 | `<select>` ×2 | Icône catégorie (new/edit) | ⚠️ No `dark:text` | `title` | ⚠️ |
| 18 | `features/support/SupportSettingsPanel.tsx` | 615, 633 | `<select>` ×2 | Catégorie/Priorité subcatégorie (new) | ⚠️ No `dark:text` | `title` | ⚠️ |
| 19 | `features/support/SupportSettingsPanel.tsx` | 728, 752 | `<select>` ×2 | Catégorie/Priorité subcatégorie (edit) | ⚠️ No `dark:text` | `title` | ⚠️ |
| 20 | `features/support/FAQView.tsx` | ~553 | `<select>` | Catégorie article FAQ | ❌ Aucun | `<label>` | ❌ |
| 21 | `features/support/FAQView.tsx` | ~594 | `<select>` | Statut article FAQ | ❌ Aucun | `<label>` | ❌ |
| 22 | `features/admin/DeviceConfigPanelV2.tsx` | 508 | `<select>` | Précision GPS | ⚠️ No `dark:text` | — | ⚠️ |
| 23 | `features/admin/DeviceConfigPanelV2.tsx` | 963 | `<select>` | Filtre pays | ⚠️ No `dark:text` | — | ⚠️ |
| 24 | `features/admin/DeviceConfigPanelV2.tsx` | 1071 | `<select>` | Pays modal | ⚠️ No `dark:text` | — | ⚠️ |
| 25 | `features/admin/RoleManagerV2.tsx` | 753 | `<select>` | Catégorie permission | ⚠️ No `dark:text` | `title` | ⚠️ |
| 26 | `features/admin/StaffPanelV2.tsx` | 579, 592 | `<select>` ×2 | Filtres statut/tri | ⚠️ No `dark:text` | `title` | ⚠️ |
| 27 | `features/admin/StaffPanelV2.tsx` | 963, 984, 998 | `<select>` ×3 | Nationalité/Sexe/Situation | ⚠️ No `dark:text` | ❌ Aucun label | ⚠️ |
| 28 | `features/admin/StaffPanelV2.tsx` | 1534, 1563+ | `<select>` ×10+ | Autres champs formulaire | ⚠️ No `dark:text` | Variable | ⚠️ |
| 29 | `features/admin/AuditLogsPanelV2.tsx` | 610, 622, 634 | `<select>` ×3 | Filtres action/entité/statut | ⚠️ No `dark:text` | `title` | ⚠️ |
| 30 | `features/admin/DocumentTemplatesPanelV2.tsx` | 595 | `<select>` | Type document | ⚠️ No `dark:text` | — | ⚠️ |
| 31 | `features/admin/WebhooksPanelV2.tsx` | 658 | `<select>` | Événement simulateur | ⚠️ No `dark:text` | — | ⚠️ |
| 32 | `features/admin/ResellerFormV2.tsx` | 350 | `<select>` | Pays revendeur | ⚠️ No `dark:text` | — | ⚠️ |
| 33 | `features/admin/ResellersPanelV2.tsx` | 483 | `<select>` | Filtre statut | ⚠️ No `dark:text` | `aria-label` | ⚠️ |
| 34 | `features/admin/RegistrationRequestsPanel.tsx` | 562 | `<select>` | Tenant select | ✅ | — | ✅ |
| 35 | `features/settings/SettingsView.tsx` | 847 | `<select>` | Pagination | ✅ | — | ✅ |
| 36 | `features/settings/MyOperationsView.tsx` | 243 | `<select>` | Filtre | ✅ | — | ✅ |
| 37 | `features/settings/MyAccountView.tsx` | 220 | `<select>` | Langue | ✅ | `title` | ✅ |
| 38 | `features/tech/TechView.tsx` | 559 | `<select>` | Pagination | ✅ | — | ✅ |
| 39 | `features/tech/TechView.tsx` | 663, 676, 689 | `<select>` ×3 | Filtres statut/type/tech | ⚠️ No `dark:text` | — | ⚠️ |
| 40 | `features/tech/monitoring/OfflineTrackerList.tsx` | ~524 | `<select>` | Pagination | ❌ Aucun | `aria-label` | ❌ |
| 41 | `features/tech/TechSettingsPanel.tsx` | 566, 712, 735 | `<select>` ×3 | Types intervention (icon, filter, nature type) | ✅ `dark:text-white` | — | ✅ |
| 42 | `features/tech/TechSettingsPanel.tsx` | 954, 977, 1000 | `<select>` ×3 | Devices (type filter, type, protocol) | ✅ `dark:text-white` | — | ✅ |
| 43 | `features/finance/FinanceView.tsx` | 1168, 1194, 1212 | `<select>` ×3 | Filtres statut/revendeur/catégorie | ⚠️ `border` sans couleur | `aria-label` | ⚠️ |
| 44 | `features/finance/FinanceView.tsx` | 1614 | `<select>` | Pagination | ✅ | — | ✅ |
| 45 | `features/finance/FinanceView.tsx` | 1761 | `<select>` | Méthode paiement | ✅ | — | ✅ |
| 46 | `features/finance/InvoiceFilters.tsx` | 83, 113, 133 | `<select>` ×3 | Filtres statut/revendeur/catégorie | ✅ | `aria-label` ×3 | ✅ |
| 47 | `features/finance/BudgetView.tsx` | ~157 | `<select>` | Année budgétaire | ⚠️ No `dark:text` | `aria-label` | ⚠️ |
| 48 | `features/finance/BudgetView.tsx` | ~421 | `<select>` | Compte comptable (modal) | ⚠️ No `dark:text` | `<label>` | ⚠️ |
| 49 | `features/crm/AutomationRulesView.tsx` | 229 | `<select>` | Filtre trigger | ✅ `dark:text-slate-300` | — | ✅ |
| 50 | `features/crm/AutomationRulesView.tsx` | 401, 443 | `<select>` ×2 | Modal trigger/action | ✅ `dark:text-white` | — | ✅ |
| 51 | `features/crm/SubscriptionsView.tsx` | 514, 527 | `<select>` ×2 | Filtres statut/revendeur | ⚠️ No `dark:text` | ❌ Aucun | ⚠️ |
| 52 | `features/crm/TierDetailModal.tsx` | ~962 | `<select>` | Période CA | ⚠️ No `dark:text` | `title` | ⚠️ |
| 53 | `features/stock/partials/StockTable.tsx` | 189, 205, 224 | `<select>` ×3 (+1 conditionnel) | Filtres client/statut/opérateur | ✅ | — | ✅ |
| 54 | `features/stock/partials/StockTable.tsx` | ~496 | `<select>` | Pagination | ✅ | — | ✅ |
| 55 | `features/stock/partials/StockMovementsTable.tsx` | ~67 | `<select>` | Filtre type mouvement | ✅ | — | ✅ |
| 56 | `features/stock/partials/StockOverview.tsx` | ~225 | `<select>` | Filtre historique | ✅ | — | ✅ |

### Fichiers non inspectés (identifiés par grep) :

| # | Fichier | Lignes estimées | Nb selects | Pattern probable |
|---|---------|-----------------|------------|------------------|
| 57 | `features/crm/CRMView.tsx` | 423, 482, 493 | 3 | 🔍 |
| 58 | `features/tech/InterventionTechTab.tsx` | 531, 557 | 2 | 🔍 |
| 59 | `features/tech/InterventionVehicleTab.tsx` | 123, 181, 207, 303 | 4 | 🔍 |
| 60 | `features/tech/InterventionSignatureTab.tsx` | 116 | 1 | 🔍 |
| 61 | `features/tech/InterventionRequestTab.tsx` | Variable | 3-5 | 🔍 |
| 62 | `features/finance/BankReconciliationView.tsx` | 342, 355 | 2 | 🔍 |
| 63 | `features/finance/RecoveryView.tsx` | 406, 420 | 2 | 🔍 |
| 64 | `features/finance/SendDocumentModal.tsx` | 225 | 1 | 🔍 |
| 65 | `features/support/CreateTicketModal.tsx` | 101, 167, 184 | 3 | 🔍 |
| 66 | `features/support/ScheduleReportModal.tsx` | 86, 101 | 2 | 🔍 |
| 67 | `features/crm/CatalogList.tsx` | 245 | 1 | 🔍 |
| 68 | `features/reports/ReportFilterBar.tsx` | 229 | 1 | 🔍 |
| 69 | `features/reports/ReportTable.tsx` | 345, 484 | 2 | 🔍 |

---

## 🎯 Plan de Correction Prioritaire

### Priorité 1 — Bugs critiques (5 min chacun)
1. **OfflineTrackerList.tsx L524** — Ajouter `dark:bg-slate-800 dark:border-slate-700 dark:text-white`
2. **FAQView.tsx L553, L594** — Ajouter `dark:bg-slate-800 dark:border-slate-600 dark:text-white`
3. **ReplayControlPanel.tsx L721** — Ajouter `dark:bg-slate-800 dark:border-slate-700 dark:text-white`
4. **ReplayControlPanel.tsx L837** — Ajouter `dark:text-slate-300`

### Priorité 2 — Batch `dark:text-white` manquant (~30 min)
Ajouter `dark:text-white` à tous les selects Pattern C dans :
- StaffPanelV2 (16 selects)
- DeviceConfigPanelV2 (3 selects)
- AuditLogsPanelV2 (3 selects)
- TechView (3 selects)
- SupportSettingsPanel (6 selects)
- RoleManagerV2, DocumentTemplatesPanelV2, WebhooksPanelV2, ResellerFormV2, ResellersPanelV2 (1 chacun)
- BudgetView (2 selects)
- SubscriptionsView (2 selects)
- TierDetailModal (1 select)

### Priorité 3 — Migration vers `<Select>` composant (long terme)
Remplacer progressivement les `<select>` natifs par le composant `<Select>` de `components/form/Select.tsx` pour garantir la cohérence.

### Priorité 4 — Accessibilité
Ajouter `aria-label` sur tous les selects filtres qui n'en ont pas.

---

## 📐 Standard Recommandé

```tsx
// ═══ SELECT FILTRE (toolbar) ═══
<select
  value={filter}
  onChange={(e) => setFilter(e.target.value)}
  aria-label="Filtrer par statut"
  className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
>

// ═══ SELECT FORMULAIRE (modal) ═══
<label htmlFor="country" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
  Pays
</label>
<select
  id="country"
  value={country}
  onChange={(e) => setCountry(e.target.value)}
  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
>

// ═══ OU MIEUX — Utiliser le composant partagé ═══
import { Select } from '../../../components/form';
<Select
  label="Pays"
  value={country}
  onChange={(e) => setCountry(e.target.value)}
  options={[
    { value: 'CI', label: "Côte d'Ivoire" },
    { value: 'SN', label: 'Sénégal' },
  ]}
/>
```

---

## ✅ Checklist de Validation Post-Correction

- [ ] Tous les `<select>` ont `dark:bg-*`, `dark:border-*`, ET `dark:text-*`
- [ ] Tous les filtres de toolbar ont `aria-label`
- [ ] Tous les selects de formulaire ont `<label htmlFor>` + `id`
- [ ] Les couleurs de fond dark sont cohérentes (`dark:bg-slate-800` standard)
- [ ] Les couleurs de bordure dark sont cohérentes (`dark:border-slate-700` filtres, `dark:border-slate-600` modals)
- [ ] Les menus custom div-based ont `dark:bg-*`, `dark:border-*`, `dark:text-*` sur le panel
- [ ] Test visuel en dark mode sur chaque page contenant des dropdowns
- [ ] Navigation au clavier fonctionnelle sur tous les selects
