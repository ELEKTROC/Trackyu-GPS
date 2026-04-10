# Audit UI/UX — Harmonisation des vues principales TrackYu GPS

**Date:** 6 mars 2026  
**Référence:** `SupplierInvoicesView.tsx` (le standard redesigné)  
**Fichiers audités:**

| # | Fichier | Lignes |
|---|---------|--------|
| 1 | `features/finance/components/SupplierInvoicesView.tsx` | 696 |
| 2 | `features/crm/components/ContractsView.tsx` | 835 |
| 3 | `features/finance/components/FinanceView.tsx` | 2376 |
| 4 | `features/finance/components/AccountingView.tsx` | 808 |
| 5 | `features/crm/components/LeadFormModal.tsx` | 260 |
| 6 | `features/fleet/components/FleetTable.tsx` | 1360 |
| 7 | `features/crm/components/TiersView.tsx` | 455 |

> **Note:** `QuotesView.tsx` n'existe pas en tant que fichier séparé — les devis sont gérés dans `FinanceView.tsx` avec `mode="QUOTES"`. `AdminTiersView.tsx` n'existe pas — les tiers sont gérés dans `TiersView.tsx`. `FleetView.tsx` n'existe pas — la vue flotte est `FleetTable.tsx`. `InvoiceList.tsx` est aussi dans `FinanceView.tsx` avec `mode="INVOICES"`.

---

## 1. MODALS — Pattern & Structure

### Constat

| Fichier | Pattern utilisé | Header icon | Footer | Problème |
|---------|----------------|-------------|--------|----------|
| **SupplierInvoicesView** (ref) | Inline `<div>` custom modal | ✅ Icon (CreditCard) + titre | ✅ Total + Annuler/Enregistrer | — |
| **ContractsView** L810 | `<Modal>` component | ❌ Texte seul (via `title` prop) | ❌ Pas de footer (délégué à `ContractForm`) | Incohérent |
| **FinanceView** ~L1100+ | `<Modal>` component (via InvoiceForm) | ❌ Texte seul | ❌ Délégué au formulaire enfant | Incohérent |
| **AccountingView** L782-800 | `<EntryModal>` + `<PaymentModal>` (extracted partials) | ❓ Non vérifié (partials) | ❓ Non vérifié (partials) | Pattern différent |
| **LeadFormModal** L106 | `<Modal>` component | ❌ Texte seul (via `title` prop) | ✅ Inline buttons dans le children | Boutons dans le body, pas le footer |
| **FleetTable** | Pas de modal de création/édition | N/A | N/A | — |
| **TiersView** L426 | `<Modal>` via `<TierForm>` | ❌ Texte seul | ❌ Délégué à TierForm | Incohérent |

### Inconsistances identifiées

1. **Deux patterns de modals incompatibles:**
   - `SupplierInvoicesView` utilise un **custom inline modal** (`<div className="fixed inset-0 z-50">`) avec backdrop `bg-slate-900/70 backdrop-blur-sm` — L277-280
   - Tous les autres utilisent le **`<Modal>` component** (`components/Modal.tsx`) qui utilise `createPortal` et `bg-slate-900/60 backdrop-blur-sm` avec animation `slide-in-from-bottom`

2. **Header avec icon:** Seul `SupplierInvoicesView` L289-295 a un header avec icon dans un cercle bleu. Le composant `<Modal>` n'a qu'un `title` string sans icon.

3. **Footer avec total:** Seul `SupplierInvoicesView` L671-692 affiche le total TTC dans le footer. Le composant `<Modal>` supporte `footer` prop mais aucune autre vue ne l'utilise.

4. **Boutons de footer:** `LeadFormModal` L244-247 place les boutons Cancel/Save dans le `children` au lieu du `footer` prop.

### Recommandations

- **Étendre `<Modal>`** pour supporter un `headerIcon` et un `headerDescription` prop
- Migrer `SupplierInvoicesView` vers `<Modal>` avec le footer prop pour le total
- Standardiser : tous les boutons d'action dans le `footer` prop de `<Modal>`

---

## 2. FORMULAIRES — Input & Label Styling

### Constat

| Fichier | Input classes | Label classes | Form components |
|---------|-------------|-------------|---------|
| **SupplierInvoicesView** (ref) | `inputCls` constant (shared) L40 | `labelCls` constant (shared) L41 | `<input>`, `<select>`, `<textarea>` natifs |
| **ContractsView** | Délégué à `<ContractForm>` | Délégué à `<ContractForm>` | Non visible ici |
| **FinanceView** | Délégué à `<InvoiceForm>` | Délégué à `<InvoiceForm>` | Non visible ici |
| **AccountingView** | Délégué à `<EntryModal>` / `<PaymentModal>` | Délégué aux partials | Non visible ici |
| **LeadFormModal** L107+ | `<Input>`, `<Select>`, `<Textarea>` from `components/form` | `<FormField>`, `<FormGrid>` from `components/form` | ✅ Components partagés |
| **FleetTable** L888 | Inline `<input>` / `<select>` natifs | Aucun label formel | Natifs, classes hétérogènes |
| **TiersView** L410 | Inline `<input>` natif, `pl-10 pr-4 py-2 border rounded-lg text-sm bg-slate-50` | Aucun | Classes ad hoc |

### Inconsistances identifiées

1. **3 systèmes de styling différents:**
   - `SupplierInvoicesView` : constantes `inputCls` / `labelCls` / `sectionCls` (L40-42)
   - `LeadFormModal` : composants `<Input>`, `<Select>`, `<FormField>`, `<FormGrid>` de `components/form/`
   - Tous les autres : classes inline ad hoc variées

2. **Différences concrètes d'input:**
   - `inputCls` (ref) : `p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700`
   - `<Input>` component : `px-3 py-2.5 rounded-lg border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800` — couleur de fond dark différente (`slate-800` vs `slate-700`)
   - `TiersView` search L410 : `py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900` — fond clair en mode light !
   - `FleetTable` search L888 : `py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900`

3. **Labels inconsistants:**
   - `labelCls` (ref) : `text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1`
   - `<FormField>` : classes propres au composant
   - `ContractsView` table headers : `text-xs font-bold text-slate-500 uppercase` (similaire mais sans tracking-wide)

4. **Sections visuelles:** Seul `SupplierInvoicesView` utilise `sectionCls` avec des sections groupées par icon + titre h4. Aucune autre vue n'a ce pattern.

### Recommandations

- Créer un fichier `utils/formStyles.ts` exportant `inputCls`, `labelCls`, `sectionCls` comme constantes partagées
- Ou migrer vers les composants `<Input>`, `<FormField>` partout en harmonisant les couleurs dark mode
- Standardiser : tous les formulaires utilisent des sections visuelles avec icon + titre

---

## 3. STATUS BADGES — Labels & Couleurs

### Constat

| Fichier | Status source | Langue | Format | Dark mode |
|---------|-------------|--------|--------|-----------|
| **SupplierInvoicesView** L27-32 | `STATUS_LABELS` object `{label, className}` | 🇫🇷 FR | `rounded-full text-xs font-bold` | ✅ `dark:bg-*/30 dark:text-*` |
| **ContractsView** L24-30 | `STATUS_LABELS` Record (string only) + `getStatusColor()` L334 | 🇫🇷 FR | `rounded-full text-xs font-bold` badge via `getStatusColor()` | ⚠️ Pas de dark mode dans `getStatusColor()` |
| **FinanceView** L527-538 | `getStatusBadge()` function inline | 🇫🇷 FR (féminin/masculin correct) | `rounded-full text-xs font-bold` | ✅ dark mode |
| **FleetTable** | `<StatusBadge>` component from `components/StatusBadge` | Mix FR/EN | Component | ✅ (dans le component) |
| **TiersView** | Délégué à `<TierList>` | Non visible ici | Non visible ici | Non visible ici |

### Inconsistances identifiées

1. **4 implémentations différentes de status badges:**
   - `SupplierInvoicesView` : objet `{label, className}` — le plus propre
   - `ContractsView` : labels séparés des couleurs (`STATUS_LABELS` record + `getStatusColor()` function) — 2 sources de vérité
   - `FinanceView` : fonction `getStatusBadge()` qui retourne du JSX
   - `FleetTable` : composant `<StatusBadge>` dédié

2. **Dark mode manquant dans ContractsView:**
   - `getStatusColor()` L334-340 retourne `bg-green-100 text-green-800 border-green-200` sans classes `dark:*`
   - Tous les badges sont illisibles en dark mode dans ContractsView

3. **Genre grammatical français:**
   - `FinanceView` gère correctement le genre (Payée vs Payé, Envoyée vs Envoyé) — L529-536
   - `SupplierInvoicesView` utilise des labels neutres (Payé, En retard)
   - `ContractsView` utilise des labels masculins (Actif, Suspendu, Expiré)

### Recommandations

- Standardiser sur le pattern `STATUS_LABELS = { KEY: { label, className } }` avec dark mode
- Centraliser dans un fichier partagé `utils/statusStyles.ts`
- Créer un composant `<StatusBadge>` universel qui accepte `status` + `variant` (invoice/quote/contract/vehicle)

---

## 4. TABLES — Headers, Tri, Lignes Cliquables, Empty State

### Constat

| Fichier | Headers triables | Rows clickable | Empty state | Pagination |
|---------|-----------------|---------------|-------------|------------|
| **SupplierInvoicesView** | ✅ `<SortableHeader>` + `useTableSort` | ✅ `onClick={openEdit}` L224 | ✅ Icon (CreditCard) + texte L261-267 | ❌ Non |
| **ContractsView** | ⚠️ Custom SortIcon, pas `<SortableHeader>` | ❌ Non (boutons dans cellules) | ✅ Icon + texte + CTA L567-590 | ✅ Oui |
| **FinanceView** | ✅ `<SortableHeader>` + `useTableSort` | ⚠️ Partiel (number clickable, pas la row) | ❌ Non visible | ✅ Oui |
| **FleetTable** | ⚠️ Custom sort via `handleSort` L247 | ✅ `onClick={onVehicleClick}` | ❌ Non visible | ✅ Oui |
| **TiersView** | Délégué à `<TierList>` | Délégué à `<TierList>` | Non visible | Non visible |

### Inconsistances identifiées

1. **3 systèmes de tri différents:**
   - `SupplierInvoicesView` + `FinanceView` : `useTableSort` hook + `<SortableHeader>` component ✅
   - `ContractsView` L380-395 : custom `SortIcon` component + `handleSort` function — réinvente la roue
   - `FleetTable` L247-252 : custom `sortConfig` state + `handleSort` — réinvente aussi

2. **Lignes cliquables:**
   - `SupplierInvoicesView` : toute la `<tr>` est cliquable (cursor-pointer) → ouvre l'édition
   - `ContractsView` : **pas de `<tr>` clickable** — il faut cliquer sur le bouton "eye" ou le numéro de contrat
   - `FinanceView` : seulement le numéro de facture est cliquable (L1482) — pas la row entière
   - `FleetTable` : toute la row est cliquable (`onClick`)

3. **Empty state:**
   - `SupplierInvoicesView` : Icon CreditCard + "Aucune dépense fournisseur" — simple et propre
   - `ContractsView` : Icon FileText + 2 variantes (filtres vs vide) + CTA "Nouveau Contrat" — le plus complet
   - `FinanceView` : **aucun empty state visible** — table vide sans indication
   - `FleetTable` : **aucun empty state visible dans la table elle-même**

4. **Pagination:**
   - `ContractsView` L798-816 : chevrons + "Page X sur Y" + select items/page
   - `FinanceView` : pattern similaire mais embedded dans le bottom
   - `SupplierInvoicesView` : **pas de pagination** — problème potentiel avec beaucoup de données
   - `FleetTable` : pagination + items per page configurables

### Recommandations

- Migrer `ContractsView` et `FleetTable` vers `useTableSort` + `<SortableHeader>`
- Rendre toutes les lignes de tableaux cliquables uniformément
- Ajouter empty state dans `FinanceView`
- Ajouter pagination dans `SupplierInvoicesView`

---

## 5. TOOLBAR — Barre de recherche + Actions

### Constat

| Fichier | Search position | Search classes | Primary button | Filters |
|---------|----------------|---------------|----------------|---------|
| **SupplierInvoicesView** L184-197 | Left, `flex-1 max-w-md` | `pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm` | Right, `bg-blue-600` | ❌ Non |
| **ContractsView** L511-555 | Inside Card, `flex-1 max-w-md min-w-[200px]` | `pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900` | Right of Card / Header | ✅ Status pills + reseller dropdown |
| **FinanceView** L1169-1248 | Right cluster (inline with title) | `pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm w-full sm:w-64` | Far right | ✅ Status dropdown + reseller + category |
| **FleetTable** L888-925 | Left, `flex-1` | `pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900` | Right cluster | ✅ Client + Vehicle + Status dropdowns |
| **TiersView** L363-412 | Inside Card, `flex-1 max-w-md` | `pl-10 pr-4 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900` | Header right | ✅ Type pills |

### Inconsistances identifiées

1. **Search input background:**
   - `bg-white dark:bg-slate-800` (SupplierInvoices, FinanceView)
   - `bg-white dark:bg-slate-900` (ContractsView, FleetTable)
   - `bg-slate-50 dark:bg-slate-900` (TiersView — fond gris en light !)

2. **Search bar position:**
   - Left (SupplierInvoices, FleetTable) vs Inside Card (Contracts, Tiers) vs Right cluster (FinanceView)
   - `max-w-md` vs `w-full sm:w-64` vs `flex-1`

3. **Status filter pattern:**
   - `ContractsView` + `TiersView` : **pill/chip buttons** (rounded-full, toggle active class)
   - `FinanceView` : **`<select>` dropdown** avec icon Filter
   - `SupplierInvoicesView` : **aucun filtre de statut**
   - `FleetTable` : dropdown hover pour statut

4. **Primary button styling:**
   - Tous utilisent `bg-blue-600 text-white rounded-lg` ✅ cohérent
   - Mais variation : `shadow-sm` (Contracts, Tiers) vs pas de shadow (SupplierInvoices, FinanceView)

### Recommandations

- Standardiser le fond du search input : `bg-white dark:bg-slate-800`
- Adopter un pattern unique pour les filtres de statut (pills pour <= 5 options, dropdown pour > 5)
- Ajouter filtre statut à `SupplierInvoicesView`

---

## 6. TOAST / NOTIFICATIONS — Feedback après mutations

### Constat

| Fichier | useToast | Messages FR | Après create | Après update | Après delete |
|---------|---------|-------------|-------------|-------------|-------------|
| **SupplierInvoicesView** | ✅ L8/46 | ✅ | ✅ 'Dépense créée avec succès' | ✅ 'Dépense mise à jour' | ✅ 'Dépense supprimée' |
| **ContractsView** | ✅ L14/48 | ✅ | ✅ 'Contrat créé' | ✅ 'Contrat mis à jour' | ✅ 'Contrat supprimé' |
| **FinanceView** | ✅ L16 | ✅ | ✅ 'Document créé avec succès' | ✅ 'Document mis à jour' | ✅ via confirm |
| **AccountingView** | ❌ Pas de useToast | N/A | ❌ Pas de feedback | ❌ Pas de feedback | N/A |
| **LeadFormModal** | ✅ L4/28 | ✅ | ✅ via parent | ⚠️ Avertissement doublon | N/A |
| **FleetTable** | ✅ L7 | ✅ | ✅ Import feedback | N/A | N/A |
| **TiersView** | ✅ L9 | ✅ | ✅ via parent | ✅ | N/A |

### Inconsistances identifiées

1. **AccountingView n'utilise pas `useToast`:**
   - L489 : utilise `alert()` natif pour "écriture non équilibrée"
   - Après ajout d'écriture comptable ou paiement : aucun feedback toast

### Recommandations

- Remplacer tous les `alert()` de `AccountingView` par `showToast`

---

## 7. CONFIRMATION DIALOGS — Suppression & Actions destructives

### Constat

| Fichier | Pattern | Composant |
|---------|---------|-----------|
| **SupplierInvoicesView** L248 | `window.confirm()` | ❌ Natif |
| **ContractsView** L49/304/311 | `useConfirmDialog` | ✅ `<ConfirmDialog>` |
| **FinanceView** L18/97 | `useConfirmDialog` | ✅ `<ConfirmDialog>` |
| **AccountingView** L489 | `alert()` | ❌ Natif |
| **FleetTable** | Aucune suppression directe | N/A |
| **TiersView** | Délégué aux sous-composants | N/A |

### Inconsistances identifiées

1. **`SupplierInvoicesView` utilise `window.confirm()` L248** au lieu de `useConfirmDialog` — c'est la vue "référence" mais elle utilise le pattern le moins bon.

2. **`AccountingView` utilise `alert()` L489** — devrait être un toast ou un dialog.

3. **Autres modules non audités** utilisent aussi `window.confirm()` :
   - `SupportViewV2.tsx` L471
   - `ResellerDrawerForm.tsx` L220
   - `OfflineTrackerList.tsx` L262

### Recommandations

- Migrer `SupplierInvoicesView` de `window.confirm()` → `useConfirmDialog`
- Migrer `AccountingView` de `alert()` → `showToast`
- Plan de migration pour les autres fichiers

---

## 8. DATE FORMATTING

### Constat

| Fichier | Méthode | Locale | Cohérent |
|---------|---------|--------|----------|
| **SupplierInvoicesView** L226/230 | `new Date().toLocaleDateString('fr-FR')` | ✅ fr-FR | ✅ |
| **ContractsView** L405/656 | `new Date().toLocaleDateString('fr-FR')` | ✅ fr-FR | ✅ |
| **FinanceView** L345/1430 | `new Date().toLocaleDateString('fr-FR')` | ✅ fr-FR | ✅ |
| **FleetTable** L498 | `vehicle.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })` | ⚠️ Pas de locale explicite | ⚠️ |
| **LeadFormModal** L193 | `toLocaleString('fr-FR')` | ✅ fr-FR | ✅ |
| **TiersView** L248 | `new Date(t.createdAt).toLocaleDateString('fr-FR')` | ✅ fr-FR | ✅ |

### Inconsistances identifiées

1. **`FleetTable` L498** : `.toLocaleTimeString([], ...)` — pas de locale `fr-FR` explicite. Fonctionne en pratique mais pas garanti sur mobile/Capacitor.

2. **Aucune utilisation de `date-fns`** dans les fichiers audités — tout utilise `Date.toLocaleDateString('fr-FR')` natif. OK pour la cohérence mais perdent les avantages de date-fns (relative time, format personnalisé).

### Recommandations

- Ajouter `'fr-FR'` explicitement dans `FleetTable` L498
- Acceptable en l'état sinon — cohérent sur `.toLocaleDateString('fr-FR')`

---

## 9. CURRENCY FORMATTING

### Constat

| Fichier | Method | Hook |
|---------|--------|------|
| **SupplierInvoicesView** L7/45 | `useCurrency()` → `formatPrice()` | ✅ |
| **ContractsView** L20/50 | `useCurrency()` → `formatPrice()` | ✅ |
| **FinanceView** L25 | `useCurrency()` → `formatPrice()` | ✅ |
| **AccountingView** L15/102 | `useCurrency()` → `formatPrice()` | ✅ |
| **LeadFormModal** L193/203 | `toLocaleString('fr-FR')` | ❌ Pas de hook |
| **FleetTable** | N/A (pas de montants) | N/A |
| **TiersView** | N/A (délégué à TierList) | N/A |

### Inconsistances identifiées

1. **`LeadFormModal` L193, L203** : utilise `(product.price ?? 0).toLocaleString('fr-FR')` au lieu de `formatPrice()` du hook `useCurrency`. Le formatage peut différer (pas de symbole FCFA, pas de config tenant).

### Recommandations

- Migrer `LeadFormModal` vers `useCurrency()` → `formatPrice()`

---

## 10. DARK MODE

### Constat

| Fichier | Completeness | Problèmes identifiés |
|---------|-------------|---------------------|
| **SupplierInvoicesView** | ✅ Complet | — |
| **ContractsView** | ⚠️ Partiel | `getStatusColor()` L334-340 : aucune classe `dark:` |
| **FinanceView** | ✅ Complet | — |
| **AccountingView** | ✅ Complet | — |
| **LeadFormModal** | ✅ Complet (via `<Input>` component) | — |
| **FleetTable** | ✅ Complet | — |
| **TiersView** | ⚠️ Partiel | Search bar `bg-slate-50` en light — devrait être `bg-white` |

### Inconsistances identifiées

1. **ContractsView `getStatusColor()` L334-340** — manque toutes les variantes dark :
   ```
   'ACTIVE': 'bg-green-100 text-green-800 border-green-200'  ← pas de dark:
   'DRAFT': 'bg-blue-100 text-blue-800 border-blue-200'      ← pas de dark:
   ```

2. **TiersView search L410** : `bg-slate-50 dark:bg-slate-900` — le fond gris en light mode est incohérent avec les autres search inputs qui sont `bg-white`.

### Recommandations

- Ajouter dark mode à `getStatusColor()` dans `ContractsView`
- Aligner le search input de `TiersView` sur `bg-white dark:bg-slate-800`

---

## 11. FORM SECTIONS — Visual Organization

### Constat

| Fichier | Sections visuelles | Icons dans sections | sectionCls |
|---------|-------------------|--------------------|-----------| 
| **SupplierInvoicesView** (ref) | ✅ 5 sections | ✅ Building2, Calculator, Banknote | ✅ `sectionCls` |
| **ContractsView** | ❌ Délégué à ContractForm | — | — |
| **FinanceView** | ❌ Délégué à InvoiceForm | — | — |
| **LeadFormModal** | ⚠️ `FormGrid` + `FormField` | ❌ Pas d'icons de section | ❌ Pas de sectionCls |
| **All others** | ❌ Pas de sections visuelles | ❌ | ❌ |

### Recommandations

- Appliquer le pattern sections visuelles (icon + titre + `sectionCls`) dans `LeadFormModal`, `ContractForm`, `InvoiceForm`, `TierForm`

---

## 12. PAYMENT METHOD — Interaction Pattern

### Constat

| Fichier | Pattern |
|---------|---------|
| **SupplierInvoicesView** L492-520 | ✅ **Visual button cards** (grid 2x2, icon + label, border highlight) + champs conditionnels animés |
| **FinanceView** ~L700 | `<select>` dropdown (dans `paymentForm.method`) |
| **AccountingView** | `<select>` dans PaymentModal partial |

### Inconsistances identifiées

1. Seul `SupplierInvoicesView` utilise les **button cards visuelles** pour le mode de paiement. Les autres utilisent un simple `<select>` dropdown. Le pattern cards est bien plus UX-friendly.

### Recommandations

- Extraire le composant payment method cards en composant partagé
- L'utiliser dans `PaymentModal` et partout où un mode de paiement est sélectionné

---

## 13. READ-ONLY AUTO-RESOLVED FIELDS

### Constat

| Fichier | Pattern |
|---------|---------|
| **SupplierInvoicesView** L335-341 | ✅ Revendeur auto-résolu avec affichage read-only styled (`bg-slate-100 dark:bg-slate-800 text-slate-600`) |
| **All others** | ❌ Pas d'auto-résolution visible ou caché dans sous-composants |

### Recommandations

- Appliquer ce pattern partout où un revendeur est auto-résolu (InvoiceForm, ContractForm, etc.)

---

## RÉSUMÉ — Priorités d'harmonisation

### 🔴 Critiques (Impact visuel en production)

| # | Problème | Fichier(s) | Ligne(s) |
|---|---------|-----------|---------|
| 1 | **Status badges sans dark mode** | ContractsView | L334-340 |
| 2 | **`window.confirm()` au lieu de ConfirmDialog** | SupplierInvoicesView | L248 |
| 3 | **`alert()` au lieu de toast** | AccountingView | L489 |
| 4 | **Pas de feedback toast pour mutations** | AccountingView | L489-518 |

### 🟡 Importants (Cohérence UX)

| # | Problème | Fichier(s) | Ligne(s) |
|---|---------|-----------|---------|
| 5 | **2 patterns de modal** (inline vs `<Modal>`) | SupplierInvoicesView vs tous les autres | L277 |
| 6 | **3 systèmes de tri** (useTableSort vs custom) | ContractsView L380, FleetTable L247 | — |
| 7 | **Lignes non cliquables** dans certaines tables | ContractsView, FinanceView | — |
| 8 | **Pas de pagination** dans SupplierInvoicesView | SupplierInvoicesView | — |
| 9 | **Pas d'empty state** dans FinanceView | FinanceView | — |
| 10 | **Currency via `toLocaleString` au lieu de `formatPrice`** | LeadFormModal | L193, L203 |

### 🟢 Nice to have (Polish UX)

| # | Problème | Fichier(s) |
|---|---------|-----------|
| 11 | Sections visuelles avec icons manquantes dans les formulaires | LeadFormModal, ContractForm, InvoiceForm |
| 12 | Payment method cards non partagées | Seulement SupplierInvoicesView |
| 13 | Search input background inconsistant (`bg-slate-50` vs `bg-white`) | TiersView L410 |
| 14 | Locale manquante dans `toLocaleTimeString` | FleetTable L498 |
| 15 | Pas de footer total dans les modals de facturation | Seulement SupplierInvoicesView en a |
| 16 | Header icon dans modal absent partout sauf SupplierInvoicesView | Toutes les vues avec Modal |

---

### Plan d'action proposé (par batch)

**Batch 1 — Quick wins (30 min):**
- Fix dark mode dans `ContractsView.getStatusColor()`
- Remplacer `window.confirm` → `useConfirmDialog` dans `SupplierInvoicesView`
- Remplacer `alert()` → `showToast` dans `AccountingView`
- Fixer `toLocaleTimeString` avec locale `fr-FR` dans `FleetTable`
- Fixer `toLocaleString` → `formatPrice` dans `LeadFormModal`

**Batch 2 — Normalisation tables (1h):**
- Migrer `ContractsView` sort vers `useTableSort` + `<SortableHeader>`
- Migrer `FleetTable` sort vers `useTableSort` + `<SortableHeader>`
- Ajouter rows cliquables dans `ContractsView` et `FinanceView`
- Ajouter empty state dans `FinanceView`
- Ajouter pagination dans `SupplierInvoicesView`

**Batch 3 — Standardisation modals (2h):**
- Étendre `<Modal>` avec `headerIcon` prop
- Migrer `SupplierInvoicesView` vers `<Modal>` component
- Standardiser tous les footer buttons via `footer` prop

**Batch 4 — Form harmonization (2h):**
- Créer `utils/formStyles.ts` avec constantes partagées
- Ou migrer les formulaires inline vers `<FormField>` / `<Input>` / `<Select>`
- Appliquer sections visuelles (sectionCls + icon) dans tous les formulaires
- Extraire payment method cards en composant partagé
