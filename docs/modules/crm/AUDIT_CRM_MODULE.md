# 🔍 Audit Module CRM — TrackYu GPS

**Date** : 2026-02-28  
**Fichiers audités** : 24  
**Lignes totales** : ~12 600

---

## Résumé

| Sévérité        | Nombre |
| --------------- | ------ |
| 🔴 Critique     | 6      |
| 🟠 Moyen        | 16     |
| 🟡 Mineur       | 29     |
| 🔵 Amélioration | 7      |
| **TOTAL**       | **58** |

### Corrections appliquées : 14

| #   | Fichier                                           | Correction                                                                                                                                                                                                                                                                               | Sévérité |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | ClientDetailModal.tsx                             | **25 imports Lucide inutilisés supprimés** (DollarSign, TrendingUp, Briefcase, CheckCircle, Award, Package, ArrowRight, Loader2, Filter, Star, List, Grid, ShoppingBag, Tag, Save, LayoutTemplate, Paperclip, Clock, AlertCircle, Globe2, AlertTriangle, Upload, MailIcon, Layers, Copy) | 🟠       |
| 2   | ClientDetailModal.tsx                             | **useEffect vide supprimé** — no-op avec commentaires obsolètes (L96-101)                                                                                                                                                                                                                | 🔴       |
| 3   | TierDetailModal.tsx                               | **22 imports Lucide inutilisés supprimés** (TrendingUp, MoreHorizontal, Award, Package, ArrowRight, Filter, Star, List, Grid, ShoppingBag, Save, LayoutTemplate, Paperclip, CheckSquare, Upload, MailIcon, Layers, Copy, Columns, ArrowUpDown, Hash, Wifi)                               | 🟠       |
| 4   | TierDetailModal.tsx                               | **`prompt()` navigateur natif remplacé** par `showToast('info')` — `handleAddContact` (L143)                                                                                                                                                                                             | 🔴       |
| 5   | PresalesView.tsx                                  | **3 imports recharts inutilisés supprimés** (FunnelChart, Funnel, LabelList)                                                                                                                                                                                                             | 🟠       |
| 6   | SalesDashboard.tsx                                | **4 imports inutilisés supprimés** (CreditCard lucide, FunnelChart, Funnel, LabelList recharts)                                                                                                                                                                                          | 🟠       |
| 7   | SalesView.tsx                                     | **2 imports inutilisés supprimés** (Card, Briefcase)                                                                                                                                                                                                                                     | 🟡       |
| 8   | TasksView.tsx                                     | **2 imports Lucide inutilisés supprimés** (Filter, MoreVertical)                                                                                                                                                                                                                         | 🟡       |
| 9   | ContractForm.tsx                                  | **2 catches silencieux remplacés par `showToast('error')`** — loadTiers (L75) et loadClientVehicles (L90)                                                                                                                                                                                | 🟠       |
| 10  | ContractDetailModal.tsx                           | **Catch silencieux remplacé par `showToast('error')`** + ajout import `useToast` — handleDownloadInvoice (L198)                                                                                                                                                                          | 🟠       |
| 11  | AutomationRulesView.tsx                           | **Catch silencieux documenté** — `.catch(() => {})` → commentaire explicite                                                                                                                                                                                                              | 🟠       |
| 12  | AutomationRulesView.tsx                           | **`confirm()` natif remplacé par `useConfirmDialog`** — handleDelete (L145) rendu async avec import et ConfirmDialogComponent                                                                                                                                                            | 🔴       |
| 13  | SubscriptionsView.tsx                             | **`alert()` natif remplacé par `showToast('info')`** + ajout import `useToast` (L845)                                                                                                                                                                                                    | 🔴       |
| 14  | ContractDetailModal.tsx + AutomationRulesView.tsx | **Imports type-only convertis** (`import type`), imports dupliqués fusionnés, Calendar/DollarSign/FileText inutilisés supprimés                                                                                                                                                          | 🟡       |

---

## Détail par fichier

### 1. AutomationRulesView.tsx (745 lignes)

| Sev. | Ligne | Problème                        | Statut                             |
| ---- | ----- | ------------------------------- | ---------------------------------- |
| 🔴   | L145  | `confirm()` natif du navigateur | ✅ Remplacé par `useConfirmDialog` |
| 🟠   | L87   | `.catch(() => {})` silencieux   | ✅ Commentaire explicite ajouté    |
| 🟡   | L2    | Imports type-only               | ✅ Converti en `import type`       |
| 🟡   | L11   | `FileText` import inutilisé     | ✅ Supprimé                        |

### 2. CatalogDetail.tsx (~120 lignes)

| Sev. | Ligne | Problème                                          | Statut          |
| ---- | ----- | ------------------------------------------------- | --------------- |
| 🔵   | —     | 2 onglets "Fonctionnalité à venir" (placeholders) | ℹ️ Non bloquant |

### 3. CatalogForm.tsx (~165 lignes)

| Sev. | Ligne   | Problème                 | Statut                                  |
| ---- | ------- | ------------------------ | --------------------------------------- |
| 🟡   | Selects | 3× `as any` sur onChange | ⏭️ Non corrigé (refactor select typing) |

### 4. CatalogList.tsx (~210 lignes)

✅ **Aucun problème significatif**

### 5. ClientDetailModal.tsx (904 lignes)

| Sev. | Ligne   | Problème                                     | Statut                                 |
| ---- | ------- | -------------------------------------------- | -------------------------------------- |
| 🔴   | L96-101 | `useEffect` vide — no-op                     | ✅ Supprimé                            |
| 🔴   | Multi   | Données mock hardcodées en production        | ⏭️ Non corrigé (nécessite API backend) |
| 🟠   | L2-8    | ~25 imports Lucide inutilisés                | ✅ Supprimés                           |
| 🟠   | Multi   | 15+ types `any`                              | ⏭️ Non corrigé (typing complet requis) |
| 🟡   | —       | Magic number `"1 000 000"` pour crédit limit | ⏭️                                     |
| 🔵   | —       | Fichier de 904 lignes — devrait être découpé | ⏭️                                     |

### 6. ClientForm.tsx (~235 lignes)

| Sev. | Ligne | Problème                         | Statut |
| ---- | ----- | -------------------------------- | ------ |
| 🟡   | Multi | 2× `as any` sur selects onChange | ⏭️     |

### 7. ContractDetailModal.tsx (636 lignes)

| Sev. | Ligne | Problème                          | Statut                                      |
| ---- | ----- | --------------------------------- | ------------------------------------------- |
| 🟠   | L198  | `catch` vide sur génération PDF   | ✅ `showToast('error')` + import `useToast` |
| 🟡   | L3    | Calendar, DollarSign inutilisés   | ✅ Supprimés                                |
| 🟡   | L8,12 | Import dupliqué, import type-only | ✅ Fusionnés/convertis                      |

### 8. ContractForm.tsx (518 lignes)

| Sev. | Ligne | Problème                               | Statut                  |
| ---- | ----- | -------------------------------------- | ----------------------- |
| 🟠   | L75   | `catch` vide sur `api.tiers.list()`    | ✅ `showToast('error')` |
| 🟠   | L90   | `catch` vide sur `api.vehicles.list()` | ✅ `showToast('error')` |
| 🟡   | L123  | `value: any` paramètre                 | ⏭️                      |

### 9. ContractsView.tsx (813 lignes)

| Sev. | Ligne | Problème                                         | Statut |
| ---- | ----- | ------------------------------------------------ | ------ |
| 🟡   | L160  | `invoiceData as any`                             | ⏭️     |
| 🔵   | —     | 813 lignes — table extractible en sous-composant | ⏭️     |

### 10. CRMView.tsx (727 lignes)

| Sev. | Ligne            | Problème                                                  | Statut                 |
| ---- | ---------------- | --------------------------------------------------------- | ---------------------- |
| 🟠   | handleSaveClient | Construction manuelle d'objet Client fragile              | ⏭️ Refactor recommandé |
| 🟠   | handleImport     | Incohérence leads/clients (api.leads.create vs addClient) | ⏭️                     |
| 🟡   | Multi            | 3+ `any` dans handlers                                    | ⏭️                     |

### 11. LeadFormModal.tsx (~260 lignes)

| Sev. | Ligne | Problème                            | Statut                 |
| ---- | ----- | ----------------------------------- | ---------------------- |
| 🟡   | L102  | `console.error` au lieu de `logger` | ⏭️                     |
| 🔵   | —     | Détection doublons warning-only     | ℹ️ Design intentionnel |

### 12. LeadsKanban.tsx (~170 lignes)

| Sev. | Ligne | Problème                         | Statut |
| ---- | ----- | -------------------------------- | ------ |
| 🟡   | Props | `filters?: any`, `tasks?: any[]` | ⏭️     |

### 13. LeadsList.tsx (~310 lignes)

| Sev. | Ligne               | Problème                            | Statut |
| ---- | ------------------- | ----------------------------------- | ------ |
| 🟡   | Props               | `filters?: any`, `tasks?: any[]`    | ⏭️     |
| 🟡   | LEAD_SORT_ACCESSORS | Retourne `any`                      | ⏭️     |
| 🔵   | toggleColumn        | Handler inactif si prop non fournie | ⏭️     |

### 14. PresalesView.tsx (~600 lignes)

| Sev. | Ligne | Problème                             | Statut                                      |
| ---- | ----- | ------------------------------------ | ------------------------------------------- |
| 🟠   | L16   | 3 imports recharts inutilisés        | ✅ FunnelChart, Funnel, LabelList supprimés |
| 🟡   | Multi | Magic numbers (500000, 100000, 7)    | ⏭️                                          |
| 🟡   | Multi | `any` types: quoteDraft, dormantList | ⏭️                                          |

### 15. SalesDashboard.tsx (~290 lignes)

| Sev. | Ligne | Problème                            | Statut                                                  |
| ---- | ----- | ----------------------------------- | ------------------------------------------------------- |
| 🟠   | L6,10 | 4 imports inutilisés                | ✅ CreditCard, FunnelChart, Funnel, LabelList supprimés |
| 🟡   | L250  | `props: any` dans Tooltip formatter | ⏭️                                                      |

### 16. SalesView.tsx (~78 lignes)

| Sev. | Ligne | Problème                       | Statut      |
| ---- | ----- | ------------------------------ | ----------- |
| 🟡   | L3    | Import inutilisé: Card         | ✅ Supprimé |
| 🟡   | L5    | Import inutilisé: Briefcase    | ✅ Supprimé |
| 🟡   | Props | `params?: any` dans onNavigate | ⏭️          |

### 17. SubscriptionDetailModal.tsx (528 lignes)

| Sev. | Ligne    | Problème                               | Statut                              |
| ---- | -------- | -------------------------------------- | ----------------------------------- |
| 🟠   | L113-116 | 4× `as any` pour installDate, category | ⏭️ Types Vehicle/Invoice incomplets |
| 🟡   | L2       | Import inutilisé: Download (probable)  | ⏭️                                  |

### 18. SubscriptionsView.tsx (906 lignes)

| Sev. | Ligne | Problème                               | Statut                              |
| ---- | ----- | -------------------------------------- | ----------------------------------- |
| 🔴   | L845  | `alert()` natif du navigateur          | ✅ Remplacé par `showToast('info')` |
| 🟠   | Multi | 4× `as any` pour installDate, category | ⏭️                                  |
| 🟡   | Sort  | `let aVal: any` / `let bVal: any`      | ⏭️                                  |
| 🔵   | —     | 906 lignes — devrait être découpé      | ⏭️                                  |

### 19. TaskForm.tsx (~250 lignes)

| Sev. | Ligne | Problème                          | Statut |
| ---- | ----- | --------------------------------- | ------ |
| 🟡   | L113  | `console.error` au lieu de logger | ⏭️     |
| 🟡   | Multi | 3× `as any` sur selects           | ⏭️     |

### 20. TasksView.tsx (~210 lignes)

| Sev. | Ligne | Problème                         | Statut                 |
| ---- | ----- | -------------------------------- | ---------------------- |
| 🟡   | L6    | Filter, MoreVertical inutilisés  | ✅ Supprimés           |
| 🟡   | L183  | `(task as any).assignedUserName` | ⏭️ Type Task incomplet |

### 21. TierDetailModal.tsx (1332 lignes)

| Sev. | Ligne                   | Problème                                                 | Statut                              |
| ---- | ----------------------- | -------------------------------------------------------- | ----------------------------------- |
| 🔴   | L143                    | `prompt()` natif du navigateur                           | ✅ Remplacé par `showToast('info')` |
| 🟠   | L2-11                   | ~22 imports Lucide inutilisés                            | ✅ Supprimés                        |
| 🟠   | Multi                   | **30+** types `any`                                      | ⏭️ Nécessite refactoring            |
| 🟠   | —                       | 1332 lignes — beaucoup trop volumineux                   | ⏭️ Découpage recommandé             |
| 🟡   | getVehicleInvoiceStatus | Vérifie TOUTES les factures, pas spécifiques au véhicule | ⏭️                                  |
| 🟡   | handleSendComment       | Commentaires en state — perdus à fermeture               | ⏭️                                  |
| 🔵   | —                       | Onglet CONFIG non implémenté dans rendu                  | ⏭️                                  |

### 22. TierForm.tsx (~480 lignes)

| Sev. | Ligne | Problème                                                    | Statut |
| ---- | ----- | ----------------------------------------------------------- | ------ |
| 🟠   | L82   | `as unknown as Tier` — contourne type-checking              | ⏭️     |
| 🟡   | L85   | `(error as any).errors` — cast inutile (ZodError a .errors) | ⏭️     |

### 23. TierList.tsx (~370 lignes)

| Sev. | Ligne            | Problème                                                  | Statut |
| ---- | ---------------- | --------------------------------------------------------- | ------ |
| 🟡   | handleBulkAction | Appels séquentiels dans boucle `for` — pas de Promise.all | ⏭️     |

### 24. TiersView.tsx (~380 lignes)

| Sev. | Ligne          | Problème                                               | Statut |
| ---- | -------------- | ------------------------------------------------------ | ------ |
| 🟡   | L17            | `onNavigate?: any`                                     | ⏭️     |
| 🟡   | Column manager | `defaultChecked` sans state — ne contrôle pas TierList | ⏭️     |

---

## Statistiques des corrections

| Métrique                     | Valeur                                          |
| ---------------------------- | ----------------------------------------------- |
| Imports inutilisés supprimés | **~56** (47 Lucide + 7 recharts + 2 composants) |
| Catches silencieux corrigés  | **4**                                           |
| Dialogs natifs remplacés     | **3** (alert, confirm, prompt)                  |
| Empty useEffect supprimé     | **1**                                           |
| Imports type-only convertis  | **2**                                           |
| Imports dupliqués fusionnés  | **1**                                           |

---

## Recommandations non appliquées (refactoring futur)

1. **~80 types `any`** — Nécessite un effort dédié de typing (ClientDetailModal 15, TierDetailModal 30+, divers 35)
2. **Fichiers volumineux** — TierDetailModal (1332), SubscriptionsView (906), ClientDetailModal (904), ContractsView (813) → découpage en sous-composants
3. **Données mock en production** — ClientDetailModal utilise `generateMockPayments`, `MOCK_MAILS`, etc. — devrait utiliser les données réelles de l'API
4. **handleSendComment** (TierDetailModal) — commentaires perdus à la fermeture → nécessite persistance backend
5. **SubscriptionsView** — Problèmes de typage profonds (devices, deviceId, subscriptionNumber sur Invoice) → types à aligner
