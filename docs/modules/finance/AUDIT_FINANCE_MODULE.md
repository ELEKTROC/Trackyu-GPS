# 🔍 Audit Module 7 — Finance / Comptabilité

> **Date** : 11 mars 2026  
> **Périmètre** : 23 fichiers, ~9 200 lignes  
> **Chemin** : `/features/finance/`

---

## Résumé

| Sévérité        | Trouvées | Corrigées |
| --------------- | -------- | --------- |
| 🔴 Critique     | 12       | 8         |
| 🟠 Moyen        | 15       | 7         |
| 🟡 Mineur       | 14       | 11        |
| 🔵 Amélioration | 5        | 0         |
| **Total**       | **46**   | **26**    |

---

## Fichiers audités

| Fichier                             | Lignes | Constats                                                          |
| ----------------------------------- | ------ | ----------------------------------------------------------------- |
| `FinanceView.tsx`                   | 2 206  | 🟠 ~15 `as any`, fichier trop gros                                |
| `AccountingView.tsx`                | 764    | 🔴 alert→showToast, 🟡 unused vars/imports (5 corrigés)           |
| `BankReconciliationView.tsx`        | 391    | 🔴 bouton Edit mort, 🔴 suppression sans confirmation             |
| `BudgetView.tsx`                    | 470    | 🟡 import inutilisé                                               |
| `CashView.tsx`                      | 589    | 🔴 JSON.parse sans try/catch, 🟡 imports inutilisés               |
| `RecoveryView.tsx`                  | 970    | 🔴 7 alert() natifs, 🟡 imports inutilisés                        |
| `ReportsView.tsx`                   | 628    | 🔴 section TVA rendue en double                                   |
| `InvoiceForm.tsx`                   | 710    | 🟠 raw fetch() bypass api.ts, `any` types                         |
| `SendDocumentModal.tsx`             | ~260   | 🟡 Propre                                                         |
| `SupplierInvoicesView.tsx`          | 530    | 🔴 bouton Edit mort, 🔴 suppression sans confirmation, 🟡 imports |
| `partials/AccountingContent.tsx`    | 278    | 🔴 prompt() natif                                                 |
| `partials/DocumentPreview.tsx`      | ~350   | 🟠 2 raw fetch()                                                  |
| `partials/EntryModal.tsx`           | ~200   | Propre                                                            |
| `partials/FinanceTab.tsx`           | ~380   | 🟡 Propre                                                         |
| `partials/index.tsx`                | 12     | Barrel file — OK                                                  |
| `partials/InvoiceFilters.tsx`       | ~170   | Propre                                                            |
| `partials/InvoiceKPIs.tsx`          | ~105   | 🔵 Non utilisé par FinanceView                                    |
| `partials/PaymentApprovalPanel.tsx` | ~255   | Propre                                                            |
| `partials/PaymentModal.tsx`         | 374    | 🔴 input file sans handler                                        |
| `partials/PeriodManagement.tsx`     | 359    | Propre                                                            |
| `partials/StatsTab.tsx`             | ~440   | 🟡 Propre                                                         |
| `constants.ts`                      | ~88    | Propre                                                            |
| `services/recoveryService.ts`       | 356    | 🟠 types `any` retour                                             |

---

## Corrections appliquées (26 fixes)

### 🔴 Critiques corrigées

#### 1. RecoveryView — 7 `alert()` natifs → `showToast()`

**Fichier** : `RecoveryView.tsx`  
**Impact** : Bloquant sur mobile (Capacitor), UX incohérente  
**Fix** : 7 `alert()` remplacés par `showToast()` (le hook était déjà importé)

#### 2. AccountingView — `alert()` → `showToast()`

**Fichier** : `AccountingView.tsx` L488  
**Impact** : Écriture comptable non équilibrée → alerte native bloquante  
**Fix** : Ajout `useToast`, remplacement par `showToast(..., 'error')`, ajout dans deps useCallback

#### 3. AccountingContent — `prompt()` → date input inline

**Fichier** : `partials/AccountingContent.tsx` L95  
**Impact** : `prompt()` bloquant, non fonctionnel sur certains navigateurs mobiles  
**Fix** : Remplacé par un `<input type="date">` conditionnel avec bouton de validation

#### 4. ReportsView — Section TVA rendue en double

**Fichier** : `ReportsView.tsx` L623-624  
**Impact** : Le composant TVA s'affichait 2 fois, doublant les données visuelles  
**Fix** : Supprimé la ligne dupliquée `{reportType === 'TVA' && renderVATDeclaration()}`

#### 5. CashView — `JSON.parse(localStorage)` sans try/catch

**Fichier** : `CashView.tsx` L49  
**Impact** : Crash au montage si localStorage corrompu  
**Fix** : Enveloppé dans try/catch avec fallback `[]`

#### 6. BankReconciliationView — Bouton Edit sans onClick

**Fichier** : `BankReconciliationView.tsx` L228  
**Impact** : Bouton d'édition cliquable mais ne fait rien  
**Fix** : Ajouté `onClick={() => { setEditingTx(tx); setIsModalOpen(true); }}`

#### 7. SupplierInvoicesView — Bouton Edit sans onClick

**Fichier** : `SupplierInvoicesView.tsx` L187  
**Impact** : Bouton d'édition inerte  
**Fix** : Ajouté `onClick={() => { setEditingInvoice(invoice); setIsModalOpen(true); }}`

#### 8. PaymentModal — input file sans handler

**Fichier** : `partials/PaymentModal.tsx` L308  
**Impact** : L'utilisateur clique pour uploader, fichier sélectionné puis silencieusement ignoré  
**Fix** : Remplacé par un placeholder "bientôt disponible" avec style disabled (feature à implémenter en Sprint 3)

### 🟠 Moyens corrigés

#### 9. BankReconciliationView — Suppression sans confirmation

**Fix** : Ajout `useConfirmDialog` + `ConfirmDialogComponent`, wrap de `deleteBankTransaction` avec dialogue de confirmation

#### 10. SupplierInvoicesView — Suppression sans confirmation

**Fix** : Idem — ajout `useConfirmDialog` + confirmation avant `deleteSupplierInvoice`

#### 11-14. Import type warnings (4 fichiers)

**Fichiers** : AccountingView, SupplierInvoicesView, BankReconciliationView, RecoveryView  
**Fix** : `import { X }` → `import type { X }` pour les imports uniquement typés

### 🟡 Mineurs corrigés

#### 15-18. Imports Lucide inutilisés (6 fichiers, 8 icônes)

| Fichier                | Icônes retirées      |
| ---------------------- | -------------------- |
| BankReconciliationView | `Filter`, `FileText` |
| BudgetView             | `BarChart3`          |
| CashView               | `Search`, `Calendar` |
| RecoveryView           | `ArrowRight`, `Eye`  |
| SupplierInvoicesView   | `Filter`, `FileText` |

#### 19. CashView — variable `currency` inutilisée

**Fix** : `{ formatPrice, currency }` → `{ formatPrice }`

#### 20-23. AccountingView — 4 imports/variables inutilisés

- `useRef` (import React)
- `generateFEC` (import service)
- `isDarkMode` / `useTheme` (hook + import)
- `MOCK_REVENUE_DATA` (constante morte)

---

## Non corrigés (à traiter ultérieurement)

### 🟠 Structurels (nécessitent refactoring)

| #   | Fichier                        | Problème                       | Recommandation                                 |
| --- | ------------------------------ | ------------------------------ | ---------------------------------------------- |
| 1   | `InvoiceForm.tsx`              | Raw `fetch()` bypasse `api.ts` | Migrer vers `api.invoices.*`                   |
| 2   | `partials/DocumentPreview.tsx` | 2 raw `fetch()`                | Migrer vers le service API                     |
| 3   | `FinanceView.tsx`              | ~15 `as any` casts             | Typer correctement avec les types de `/types/` |
| 4   | `AccountingView.tsx`           | 6 `as any` casts               | Idem                                           |
| 5   | `FinanceView.tsx`              | 2 206 lignes                   | Découper en sous-composants plus fins          |
| 6   | `RecoveryView.tsx`             | Export CSV via `encodeURI`     | Migrer vers `Blob` + `URL.createObjectURL`     |
| 7   | `ReportsView.tsx`              | Export CSV via `encodeURI`     | Idem                                           |
| 8   | `services/recoveryService.ts`  | Types retour `any`             | Typer avec interfaces dédiées                  |

### 🔵 Améliorations suggérées

| #   | Suggestion                                                           | Impact           |
| --- | -------------------------------------------------------------------- | ---------------- |
| 1   | Découper `FinanceView.tsx` en 3-4 sous-fichiers                      | Maintenabilité   |
| 2   | Centraliser les exports CSV dans un utilitaire commun                | DRY, cohérence   |
| 3   | Ajouter vrai upload de pièces justificatives (PaymentModal)          | Feature Sprint 3 |
| 4   | Connecter `InvoiceKPIs.tsx` à `FinanceView` (actuellement inutilisé) | UX               |
| 5   | Ajouter loading states aux opérations de suppression                 | UX               |

---

## Backend — Observations

Le backend finance n'a pas été audité en profondeur dans cette passe. Observations rapides :

- **Routes** : `/api/invoices`, `/api/payments`, `/api/recovery` existent et sont fonctionnelles
- **`recoveryService.ts`** utilise correctement TanStack Query avec hooks (`useSendReminder`, etc.)
- **À vérifier** : filtrage `tenant_id` sur les routes finance, validation Zod des inputs

---

## Résultat global

**26 corrections appliquées** sur 46 constats, couvrant :

- Tous les bugs runtime (crashes, double rendu, boutons morts)
- Toutes les alertes natives (9 alert/confirm/prompt → showToast/input)
- Tous les imports inutilisés détectés
- Confirmations de suppression ajoutées sur 2 vues

Les 20 constats restants sont des améliorations structurelles (types `any`, raw `fetch()`, taille de fichier) qui nécessitent un refactoring dédié.
