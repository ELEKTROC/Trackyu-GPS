# UI/UX Design Consistency Audit Report

**Project:** TrackYu GPS - SaaS Fleet Management  
**Date:** 2026-02-04  
**Scope:** All `features/**/*.tsx` + `components/*.tsx`  
**Status:** READ-ONLY audit — no modifications made

---

## Executive Summary

The codebase has a solid foundation with shared components (`Card`, `Modal`, `EmptyState`, `Skeleton`) but suffers from **significant inconsistencies across modules**, particularly between older admin-module files (using `gray` palette) and newer modules (using `slate` palette). The most impactful issues are: mixed color palettes, inconsistent form input focus styles, heavy use of native `confirm()` dialogs, and underutilization of shared `EmptyState` and `Skeleton` components.

**Severity Distribution:**

- 🔴 CRITICAL: 2 issues
- 🟠 HIGH: 6 issues
- 🟡 MEDIUM: 7 issues
- 🔵 LOW: 4 issues

---

## 1. DESIGN SYSTEM CONSISTENCY

### 1.1 🔴 CRITICAL — Mixed Color Palettes (`gray` vs `slate`)

The application mixes `text-gray-*` and `text-slate-*` extensively, creating visible color inconsistencies between modules.

**`text-gray-*` dominant files (80+ matches):**
| File | Lines | Pattern |
|------|-------|---------|
| `features/admin/components/forms/ResellerDrawerForm.tsx` | Throughout | `text-gray-600`, `text-gray-500`, `text-gray-400`, `dark:text-gray-300`, `divide-gray-700` |
| `features/support/components/SupportSettingsPanel.tsx` | Throughout | `text-gray-700`, `bg-gray-200`, `border-gray-300` |
| `features/tech/components/TechSettingsPanel.tsx` | L921 | `bg-gray-200`, `peer-focus:ring-blue-300`, `dark:bg-gray-700`, `border-gray-300` |
| `features/admin/components/ClientReconciliation.tsx` | Throughout | `text-gray-600`, `text-gray-500` |
| `features/crm/components/ContractsView.tsx` | Throughout | Mixed `gray` and `slate` in same file |

**`text-slate-*` dominant files (80+ matches):**
| File | Lines | Pattern |
|------|-------|---------|
| `features/finance/components/FinanceView.tsx` | Throughout | `text-slate-500`, `text-slate-800`, `bg-slate-50` |
| `features/tech/components/TechView.tsx` | Throughout | `text-slate-500`, `text-slate-800`, `bg-slate-100` |
| `features/fleet/components/FleetTable.tsx` | Throughout | `text-slate-200`, `border-slate-700` |
| `features/map/components/MapView.tsx` | Throughout | `text-slate-500`, `bg-slate-100` |
| `features/dashboard/components/DashboardView.tsx` | Throughout | `text-slate-500`, `bg-slate-50` |

**Why this matters:** Users navigating from the Finance module (slate) to Admin > Resellers (gray) will see subtle but noticeable text color differences. `gray-500` (#6b7280) ≠ `slate-500` (#64748b) — they have different blue undertones.

**Recommendation:** Standardize on `slate` (matches the shared `Card`, `Modal`, and `EmptyState` components which all use `slate`).

---

### 1.2 🟠 HIGH — Shadow Hierarchy Inconsistency

The shadow elevation system is inconsistent, with similar component types using different shadow levels:

| Shadow Level | Intended Use         | Actual Use (Inconsistencies)                                                                                                                            |
| ------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadow-sm`  | Cards, containers ✅ | Most cards — consistent                                                                                                                                 |
| `shadow-md`  | Hover states         | `InterventionPlanning.tsx:218` — on static planning items                                                                                               |
| `shadow-lg`  | Elevated dropdowns   | `FleetTable.tsx:773` — on a static table container; `FinanceTab.tsx` — on gradient stat cards with colored shadows like `shadow-lg shadow-green-500/30` |
| `shadow-xl`  | Dropdowns/popups     | `RoleManagerV2.tsx` — on loading overlay; `DeviceConfigPanelV2.tsx` — on modals                                                                         |
| `shadow-2xl` | Modals only          | `TierForm.tsx:99`, `CashView.tsx:326`, `InterventionForm.tsx:115`, `MapView.tsx` — used on both modals AND floating map panels                          |

**Key Issues:**

- `InterventionForm.tsx:115` uses `shadow-2xl` on an inline modal while the shared `Modal.tsx` component uses `sm:shadow-2xl` — consistent but the inline version doesn't use the shared component at all.
- `FleetTable.tsx:773` applies `shadow-lg` to a table — heavier shadow than similar list containers in other modules that use `shadow-sm`.
- Stat cards in `FinanceTab.tsx` use colored shadows (`shadow-lg shadow-green-500/30`) which don't appear anywhere else in the app.

---

### 1.3 🟠 HIGH — Border Radius Inconsistency

| Element Type | Expected                               | Files with Deviations                                                                     |
| ------------ | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| Buttons      | `rounded-lg`                           | Mostly consistent ✅                                                                      |
| Cards        | `rounded-xl` (from shared `Card.tsx`)  | Many inline cards use `rounded-lg` instead                                                |
| Modals       | `rounded-xl` (from shared `Modal.tsx`) | `App.tsx` chat widget uses `rounded-2xl`; `MapView.tsx` mobile panel uses `rounded-t-2xl` |
| Inputs       | `rounded-lg`                           | `FleetTable.tsx:99` uses `rounded` (no size); `RoleManager.tsx:345` uses `rounded`        |
| Badges/pills | `rounded-full`                         | Consistent ✅                                                                             |

**Specific inputs with bare `rounded` (4px) instead of `rounded-lg` (8px):**

- `FleetTable.tsx:99` — `rounded bg-slate-50`
- `RoleManager.tsx:345` — `rounded px-3 py-1.5`
- `RoleManager.tsx:352` — `rounded px-3 py-1`
- `CRMView.tsx:648` — `rounded bg-white`
- `ReportFilterBar.tsx:122` — `rounded bg-slate-50`

---

### 1.4 🟡 MEDIUM — Font Weight Inconsistency in Labels

Form labels use inconsistent font weight patterns:

| Pattern                                          | Files                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `text-xs font-bold text-slate-500 uppercase`     | `TierForm.tsx`, `InterventionVehicleTab.tsx`, `FinanceView.tsx` — Most forms ✅ |
| `text-sm font-bold text-slate-600`               | `FinanceView.tsx:1974, 2006, 2026, 2047` — Credit note form only                |
| `text-xs text-slate-600` (no bold, no uppercase) | `TechView.tsx:501, 514, 527` — Filter labels                                    |
| `text-xs font-bold text-slate-500 uppercase`     | Label pattern A — Dominant                                                      |

The credit note modal in `FinanceView.tsx` uses `text-sm font-bold text-slate-600` while every other form in the same file uses `text-xs font-bold text-slate-500 uppercase` — creating a visual mismatch within the same view.

---

### 1.5 🟡 MEDIUM — Button Style Inconsistency

Primary action buttons use two subtly different patterns:

| Pattern                                                                    | Examples                                                                                                                                                  |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold`            | `CRMView.tsx:407`, `FinanceView.tsx:1103`, `BankReconciliationView.tsx:161`, `SupplierInvoicesView.tsx:134`, `BudgetView.tsx:158` — Finance & CRM modules |
| `bg-blue-600 text-white text-sm font-bold rounded-lg px-4 py-2 shadow-sm`  | `TechView.tsx:483` — with `shadow-sm`                                                                                                                     |
| `bg-blue-600 text-white text-sm font-bold rounded px-3 py-1.5`             | `TechView.tsx:704` — `rounded` not `rounded-lg`, smaller padding                                                                                          |
| `bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm` | `CRMView.tsx:413`, `TechTeamView.tsx:119` — Secondary CTAs using green                                                                                    |

**No shared Button component exists.** All buttons are inline Tailwind — this is the root cause of deviations.

---

## 2. UX PATTERNS

### 2.1 🔴 CRITICAL — Native `confirm()` Dialogs for Destructive Actions

**16+ files use browser-native `window.confirm()` / `confirm()` for destructive actions** instead of a consistent, styled confirmation modal:

| File                           | Line | Pattern                                            |
| ------------------------------ | ---- | -------------------------------------------------- |
| `FinanceView.tsx`              | L536 | `confirm('Êtes-vous sûr de vouloir supprimer...')` |
| `FinanceView.tsx`              | L922 | `confirm('Êtes-vous sûr de vouloir annuler...')`   |
| `FinanceView.tsx`              | L969 | `confirm('Êtes-vous sûr de vouloir supprimer...')` |
| `StaffPanelV2.tsx`             | L337 | `window.confirm('Êtes-vous sûr...')`               |
| `DocumentTemplatesPanelV2.tsx` | L349 | `confirm('Êtes-vous sûr...')`                      |
| `SupportSettingsPanel.tsx`     | L970 | `confirm('Êtes-vous sûr...')`                      |
| `CRMView.tsx`                  | L469 | `confirm('Supprimer ce lead ?')`                   |
| `MessageTemplatesPanel.tsx`    | L274 | `confirm('Êtes-vous sûr...')`                      |
| `ResellersPanelV2.tsx`         | L302 | `confirm('Êtes-vous sûr...')`                      |
| `RoleManager.tsx`              | L259 | `window.confirm('Êtes-vous sûr...')`               |
| `RecoveryView.tsx`             | L319 | `confirm('Êtes-vous sûr...')`                      |
| `ContractsView.tsx`            | L213 | `window.confirm('Êtes-vous sûr...')`               |
| `InterventionList.tsx`         | L208 | `confirm('Êtes-vous sûr...')`                      |
| `MyAccountView.tsx`            | L376 | `window.confirm('Êtes-vous sûr...')`               |
| `TasksView.tsx`                | L36  | `confirm('Êtes-vous sûr...')`                      |
| `LeadsList.tsx`                | L298 | `confirm('Supprimer ce lead ?')`                   |
| `LeadsKanban.tsx`              | L111 | `confirm('Supprimer ce lead ?')`                   |
| `ClientDetailModal.tsx`        | L389 | `confirm('Êtes-vous sûr...')`                      |
| `TierDetailModal.tsx`          | L570 | `confirm('Êtes-vous sûr...')`                      |
| `WebhooksPanelV2.tsx`          | L256 | `confirm('Êtes-vous sûr...')`                      |

**Meanwhile, some files DO use custom confirmation UIs:**

- `SupportViewV2.tsx:1518` — styled `Confirmer` button in a custom dialog
- `DeviceConfigPanelV2.tsx:812` — `deleteConfirm` state for inline confirmation
- `StockModals.tsx:227` — custom "Confirmer le transfert" button

**Why critical:** Native `confirm()` dialogs are **unstyled**, break dark mode, can't be customized, and feel jarring. The inconsistency (some custom, some native) makes the UX unpredictable.

---

### 2.2 🟠 HIGH — EmptyState Component Severely Underutilized

A well-designed `EmptyState` component exists in `components/EmptyState.tsx` with icon, title, description, and action button — but it's **imported in only 1 file** (`StockView.tsx`).

**All other empty states are ad-hoc inline HTML with inconsistent styling:**

| File                            | Line  | Empty State Markup                                                                                      |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| `DashboardView.tsx`             | L645  | `<p className="text-sm">Aucune donnée disponible</p>` — plain text, no icon                             |
| `DashboardView.tsx`             | L770  | `<div className="text-center text-slate-400 text-xs py-4">Aucun entretien prévu</div>` — different size |
| `FleetTable.tsx`                | L1554 | `<p className="font-medium">Aucun véhicule trouvé</p>` — bold, no icon                                  |
| `FleetTable.tsx`                | L1641 | `Aucun véhicule trouvé pour ces filtres.` — different text                                              |
| `ContractsView.tsx`             | L365  | `<FileText className="w-12 h-12 mb-2 opacity-20"/>Aucun contrat trouvé` — inline icon, opacity hack     |
| `RecoveryView.tsx`              | L501  | `Aucune facture trouvée.` — plain text in `<td>`                                                        |
| `AuditLogsPanelV2.tsx`          | L582  | `<p className="font-medium">Aucun log trouvé</p>`                                                       |
| `StaffPanelV2.tsx`              | L579  | `<p className="font-medium">Aucun utilisateur trouvé</p>`                                               |
| `ResellersPanelV2.tsx`          | L496  | `<p className="font-medium">Aucun revendeur trouvé</p>`                                                 |
| `RegistrationRequestsPanel.tsx` | L526  | `<p className="text-slate-500">Aucune demande trouvée</p>`                                              |
| `DocumentTemplatesPanelV2.tsx`  | L486  | `<h3 className="text-lg font-medium">Aucun modèle créé</h3>` — uses `<h3>`                              |
| `HelpCenterPanelV2.tsx`         | L524  | `<p className="text-slate-500 font-medium">Aucun article trouvé</p>`                                    |
| `MapView.tsx`                   | L1266 | `<div className="p-8 text-center text-slate-400 text-sm">Aucun élément trouvé.</div>`                   |
| `SupportViewV2.tsx`             | L851  | `<p>Aucun ticket trouvé</p>` — no styling at all                                                        |
| `OfflineTrackerList.tsx`        | L211  | `Aucun véhicule hors ligne correspondant aux critères.` — plain                                         |
| `MonitoringView.tsx`            | L278  | `<p>Aucun événement récent</p>` — no styling                                                            |
| `AlertsConsole.tsx`             | L113  | Conditional text in `<p>` — no icon                                                                     |

**Impact:** Users see wildly different empty state presentations — some have icons, some are bold, some are plain text, some are in table cells. This hurts perceived quality.

---

### 2.3 🟠 HIGH — Loading States: Mixed Patterns, No Shared Skeleton Usage

The `Skeleton.tsx` component is **never imported** anywhere in the features. Instead:

| Pattern                                          | Files                                                                                                                                                                            | Count                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `Loader2` spinner icon (Lucide)                  | `ClientReconciliation.tsx`, `RoleManagerV2.tsx`, `DeviceConfigPanelV2.tsx`, `DocumentTemplatesPanelV2.tsx`, `MessageTemplatesPanel.tsx`, `ContractsView.tsx`, `SettingsView.tsx` | 10+ files                                       |
| Local `SkeletonCard` / `SkeletonChart` component | `DashboardView.tsx:359-375`                                                                                                                                                      | 1 file — defines own skeleton inline            |
| `loading ? '...' : value` text placeholder       | `SystemMetricsPanel.tsx:214-424`                                                                                                                                                 | 1 file, 15+ values                              |
| `Chargement...` text                             | `ClientForm.tsx:90`, `InvoiceForm.tsx:412`                                                                                                                                       | 2 files                                         |
| `RefreshCw` with `animate-spin`                  | `AuditLogsPanelV2.tsx:391`, `RegistrationRequestsPanel.tsx:410`, `SystemMetricsPanel.tsx:204`                                                                                    | 3 files — using a different icon than `Loader2` |

**Key issue:** `DashboardView.tsx` creates its own inline `SkeletonCard` and `SkeletonChart` components instead of using the shared `Skeleton.tsx`. The shared Skeleton has rich features (variants, animations) that are completely unused.

---

### 2.4 🟠 HIGH — Inline Modals Bypassing Shared `Modal.tsx`

The shared `Modal.tsx` is used in 25+ files (good adoption). However, **6 files create inline modal overlays** bypassing the shared component:

| File                          | Line  | Implementation                                                                       |
| ----------------------------- | ----- | ------------------------------------------------------------------------------------ |
| `PhotoBlock.tsx`              | L154  | `fixed inset-0 z-[100] bg-black/90` — fullscreen image viewer                        |
| `InterventionDetailModal.tsx` | L159  | `fixed inset-0 z-[100]` — intervention detail                                        |
| `InterventionForm.tsx`        | L107  | `fixed inset-0 z-[100]` — intervention form                                          |
| `NotificationCenter.tsx`      | L87   | `fixed inset-0 bg-slate-900/50 z-[105]` — notification drawer (uses higher z-index!) |
| `SupplierInvoicesView.tsx`    | L192  | `fixed inset-0 bg-black/50 z-[60]` — different z-index!                              |
| `TierDetailModal.tsx`         | L1104 | `fixed inset-0 z-[60]` — confirmation sub-modal                                      |

**Z-index chaos:**

- Shared `Modal.tsx`: `z-[100]`
- `NotificationCenter.tsx`: `z-[105]` — higher than modal!
- `SupplierInvoicesView.tsx`: `z-[60]` — lower than modal
- `TierDetailModal.tsx`: `z-[60]` — lower than modal

This means notification center will render OVER a modal, while supplier invoice dialog renders UNDER one.

---

### 2.5 🟡 MEDIUM — `alert()` Used for User Feedback

Some files use `window.alert()` instead of the `useToast()` hook:

| File                     | Line | Usage                                               |
| ------------------------ | ---- | --------------------------------------------------- |
| `RecoveryView.tsx`       | L177 | `alert('ℹ️ Aucune nouvelle relance nécessaire...')` |
| `ReplayControlPanel.tsx` | L603 | `alert('Aucune donnée d\'historique à exporter')`   |
| `ReplayControlPanel.tsx` | L625 | `alert('Aucune donnée d\'historique à exporter')`   |

Native `alert()` blocks the thread and breaks the styled UX.

---

## 3. ACCESSIBILITY

### 3.1 🟠 HIGH — Inconsistent Focus Styles on Inputs

Focus styles on form inputs use **two incompatible patterns**:

| Pattern                                               | Files                                                                                                                                                                                                                                                                     | Behavior                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `focus:outline-none focus:ring-2 focus:ring-blue-500` | `FleetTable.tsx`, `RecoveryView.tsx`, `StockTable.tsx`, `TechView.tsx`, `MapView.tsx`, `ReplayControlPanel.tsx`                                                                                                                                                           | Removes outline, adds ring ✅                                                              |
| `outline-none focus:ring-2 focus:ring-blue-500`       | `CRMView.tsx`, `SettingsView.tsx`, `RoleManager.tsx`, `ContractsView.tsx`, `FinanceTab.tsx`, `TicketFormModal.tsx`, `TicketList.tsx`, `TicketDetail.tsx`, `InterventionList.tsx`, `MyOperationsView.tsx`, `OfflineTrackerList.tsx`, `UserMonitoring.tsx`, `TechStats.tsx` | `outline-none` is ALWAYS active (not just on focus), removes the outline even when tabbing |
| `focus:outline-none` only (no ring)                   | `ReplayControlPanel.tsx:676,737,749,835`, `MapView.tsx:1798`                                                                                                                                                                                                              | **No visible focus indicator at all**                                                      |
| `focus:bg-blue-50` (background change)                | `InterventionTechTab.tsx:848,860`                                                                                                                                                                                                                                         | Background change instead of ring                                                          |

**Worst offenders — inputs with NO visible focus indicator:**

- `ReplayControlPanel.tsx:676` — `bg-transparent border-none text-sm focus:outline-none flex-1`
- `ReplayControlPanel.tsx:737` — `bg-transparent border-none text-sm focus:outline-none`
- `ReplayControlPanel.tsx:749` — `bg-transparent border-none text-sm focus:outline-none`
- `ReplayControlPanel.tsx:835` — `bg-transparent text-sm font-medium focus:outline-none cursor-pointer`
- `MapView.tsx:1798` — `bg-transparent border-none text-sm focus:outline-none`

These inputs are **invisible to keyboard users** since they have no border, no background, and no focus indicator.

---

### 3.2 🟡 MEDIUM — Sparse `aria-label` Coverage

Only a handful of files use `aria-label` attributes (found in ~10 files). Many icon-only buttons lack labels:

**Files WITH good accessibility:**

- `FinanceView.tsx` — Uses `aria-label` on search, filter, checkboxes ✅
- `FleetTable.tsx` — Uses `aria-label` on filter, select-all, pagination ✅
- `InvoiceForm.tsx` — Uses `aria-label` on all form fields ✅
- `SupportSettingsPanel.tsx` — Uses `aria-label` on SLA inputs ✅
- `Modal.tsx` — Close button has `aria-label="Fermer"` ✅

**Files WITHOUT aria-labels on icon-only buttons (sampling):**

- Most icon-only action buttons (edit, delete, view) across `TechView.tsx`, `ContractsView.tsx`, `RecoveryView.tsx`, `StaffPanelV2.tsx`, `ResellersPanelV2.tsx` lack `aria-label`
- The shared `Card.tsx` properly adds `role="button"` and `tabIndex` when clickable ✅

---

### 3.3 🟡 MEDIUM — Labels Without `htmlFor` / Not Associated with Inputs

Form labels in many files use `<label>` tags but don't use `htmlFor` to associate with input `id`:

| File                         | Example                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `TierForm.tsx`               | `<label className="...">Nom</label>` + `<input>` — no `htmlFor`/`id` association |
| `InterventionVehicleTab.tsx` | Same pattern across 15+ labels                                                   |
| `FinanceView.tsx`            | Same pattern in payment form                                                     |
| `TicketFormModal.tsx`        | Same pattern throughout                                                          |

Screen readers cannot reliably associate these labels with their inputs.

---

### 3.4 🔵 LOW — Toggle Switch Uses Non-Semantic Markup

`TechSettingsPanel.tsx:911-921` implements a toggle switch with raw divs and peer classes:

```
<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full...">
```

This uses `gray` (not `slate`), and the toggle is built with CSS-only pseudo elements. It should be a proper `<Switch>` or at minimum have `role="switch"` and `aria-checked`.

---

## 4. SPECIFIC FILE ISSUES

### 4.1 🟡 MEDIUM — `FinanceView.tsx` Internal Inconsistencies

This single file (2000+ lines) has internal inconsistencies:

- Lines 1457-1539: labels use `text-xs font-bold text-slate-500 uppercase`
- Lines 1974-2047: labels use `text-sm font-bold text-slate-600` — different size AND shade
- Line 1303 region: uses `text-gray-500` while rest of file uses `text-slate-500`

### 4.2 🟡 MEDIUM — `ResellerDrawerForm.tsx` Entirely in `gray` Palette

This file is the most visible offender — it consistently uses `gray` while the App shell and all sibling admin panels use `slate`. Lines include:

- `divide-gray-700`, `text-gray-600`, `text-gray-500`, `text-gray-400`, `dark:text-gray-300`, `dark:divide-gray-700`

### 4.3 🔵 LOW — `TechSettingsPanel.tsx` Mixes `gray` and `slate`

Line 921: Uses `bg-gray-200`, `dark:bg-gray-700`, `border-gray-300`, `dark:border-gray-600` for the toggle switch, while the rest of the file uses `slate`.

### 4.4 🔵 LOW — `ReplayControlPanel.tsx` Dark Mode Missing

The replay control panel has several elements without dark mode variants:

- Line 957: `<tbody className="divide-y divide-slate-200 bg-white">` — no `dark:` variants
- Line 1005: Same pattern
- Line 1051: Same pattern
- Line 1346: Same pattern

### 4.5 🔵 LOW — Input Padding Variations

Inputs have inconsistent padding:
| Padding | Files |
|---------|-------|
| `pl-9 pr-4 py-2` | Most search inputs (standard) |
| `pl-7 pr-2 py-1.5` | `FleetTable.tsx:99`, `ReportFilterBar.tsx:122` — smaller |
| `pl-10 pr-4 py-2` | `FleetTable.tsx:1169`, `RecoveryView.tsx:390` — larger left |
| `px-3 py-2` | `TicketFormModal.tsx` — all fields |
| `pl-3 pr-8 py-2` | `FleetTable.tsx:1180,1195` — selects |
| `pl-3 pr-8 py-1.5` | `StockTable.tsx:196,212,231` — smaller selects |

---

## 5. RECOMMENDED ACTIONS (Priority Order)

### Immediate (High Impact, Low Effort)

1. **Find & replace `gray` → `slate`** in `ResellerDrawerForm.tsx`, `TechSettingsPanel.tsx:921` toggle, and scattered `gray` references
2. **Replace all `confirm()` calls with a shared `ConfirmDialog` component** — create one using the existing `Modal.tsx`
3. **Replace `alert()` calls in `RecoveryView.tsx` and `ReplayControlPanel.tsx` with `useToast()`**

### Short Term (Design System Cleanup)

4. **Create a shared `Button` component** with variants: `primary`, `secondary`, `danger`, `ghost` — to eliminate inline button class repetition
5. **Adopt `EmptyState` component across all views** — currently used in only 1 of 20+ views that need it
6. **Replace `DashboardView.tsx` inline skeletons with shared `Skeleton.tsx`**
7. **Standardize input focus styles** to `focus:outline-none focus:ring-2 focus:ring-blue-500` everywhere
8. **Fix inputs with NO focus indicator** in `ReplayControlPanel.tsx` and `MapView.tsx`

### Medium Term (Accessibility)

9. **Add `aria-label` to all icon-only buttons**
10. **Associate all `<label>` elements with inputs via `htmlFor`/`id`**
11. **Standardize z-index values** — define a z-index scale in Tailwind config
12. **Add `role="switch"` and `aria-checked` to custom toggles**

### Long Term (Architecture)

13. **Create a form input component** wrapping label + input + error with consistent sizing
14. **Add dark mode variants to `ReplayControlPanel.tsx` tables**
15. **Refactor inline modals to use shared `Modal.tsx`** or extend it for specialized cases (image viewer, drawer)

---

## Component Adoption Scorecard

| Component        | File                        | Adoption           | Notes                               |
| ---------------- | --------------------------- | ------------------ | ----------------------------------- |
| `Card.tsx`       | `components/Card.tsx`       | **25+ files** ✅   | Well adopted                        |
| `Modal.tsx`      | `components/Modal.tsx`      | **25+ files** ✅   | Good, but 6 inline modals bypass it |
| `EmptyState.tsx` | `components/EmptyState.tsx` | **1 file** ❌      | Severely underused                  |
| `Skeleton.tsx`   | `components/Skeleton.tsx`   | **0 files** ❌     | Not used at all                     |
| Button (shared)  | N/A                         | **Does not exist** | Should be created                   |
| ConfirmDialog    | N/A                         | **Does not exist** | 16+ files use native `confirm()`    |

---

_End of audit. No files were modified._
