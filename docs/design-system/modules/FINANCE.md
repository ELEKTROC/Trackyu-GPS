# Module Spec — FINANCE (Facturation · Paiements · Recouvrement)

> Sous-module de **Vente** (`/vente`) qui regroupe les onglets `factures` + `paiements` + `recouvrement`.
> Les onglets `contrats` + `abonnements` + `planning` + `pipeline` sont hors-périmètre de ce doc (gérés dans `VENTE.md` à venir).
>
> **Objectif chantier** : passer le menu facture V2 de la lecture seule à la **parité CRUD** avec le legacy, en respectant les mockups Design (Templates A + G + sections vente-facturation/recouvrement).

---

## 0. Identité du module

| Champ                   | Valeur                                                                    |
| ----------------------- | ------------------------------------------------------------------------- |
| **Nom court**           | Finance                                                                   |
| **Nom complet**         | Facturation · Paiements · Recouvrement                                    |
| **Vit dans**            | `VentePage` (`/vente`), onglets `factures` / `paiements` / `recouvrement` |
| **Type**                | 🟦 Template universel (A + G)                                             |
| **Statut construction** | 🟧 EN COURS (lecture livrée, CRUD en chantier 2026-05-02)                 |
| **Priorité**            | P0 — bloquant parité legacy (D16)                                         |
| **Dépendances**         | Contrats + Abonnements (pour smart match), Tiers (clients), Catalog items |

---

## 1. Mockups Design — sources fidèles

### Templates de référence

| Template                            | Fichier mockup                                                                                            | Page V2 démo                                                                               | Usage métier                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **A** Document commercial — Facture | [`tpl-views.jsx:36-130`](../../../trackyu-front-V2/_design-source/_raw/tpl-views.jsx) (`TplAFormInvoice`) | [`InvoicePage.tsx`](../../../trackyu-front-V2/src/pages/templates/InvoicePage.tsx)         | InvoiceFormModal (create/edit)                                       |
| **A** variante — Écriture comptable | [`tpl-views.jsx:133-189`](../../../trackyu-front-V2/_design-source/_raw/tpl-views.jsx) (`TplAFormEntry`)  | InvoicePage (mode `entry`)                                                                 | JournalEntryModal (P3, hors lot)                                     |
| **G** Modale action 420px           | [`tpl-views2.jsx:143-174`](../../../trackyu-front-V2/_design-source/_raw/tpl-views2.jsx) (`TplGModal`)    | [`QuickActionPage.tsx`](../../../trackyu-front-V2/src/pages/templates/QuickActionPage.tsx) | PaymentModal · ReminderModal · SendInvoiceModal · DeleteConfirmModal |

### Vues métier de référence

| Vue Design                                                     | Source                                                                                                                    | Cible V2                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Liste factures                                                 | [`vc-billing-views.jsx:18-85`](../../../trackyu-front-V2/_design-source/_raw/vc-billing-views.jsx) (`VcInvoicesList`)     | `ViewInvoicesList` ([VentePage:1116](../../../trackyu-front-V2/src/features/vente/VentePage.tsx)) ✅ déjà conforme |
| Détail facture (doc + actions panel + timeline)                | [`vc-billing-views.jsx:88-286`](../../../trackyu-front-V2/_design-source/_raw/vc-billing-views.jsx) (`VcInvoiceDetail`)   | `InvoiceDetailPanel` (à enrichir avec panel ACTIONS)                                                               |
| Kanban Relances 3 buckets                                      | [`vc-billing-views.jsx:289-344`](../../../trackyu-front-V2/_design-source/_raw/vc-billing-views.jsx) (`VcRemindersBoard`) | `ViewRelances` ([VentePage:1230](../../../trackyu-front-V2/src/features/vente/VentePage.tsx)) ✅ déjà conforme     |
| Liste paiements                                                | [`vc-billing-views.jsx:347-417`](../../../trackyu-front-V2/_design-source/_raw/vc-billing-views.jsx) (`VcPaymentsList`)   | `ViewPaymentsList` ([VentePage:1359](../../../trackyu-front-V2/src/features/vente/VentePage.tsx)) ✅ déjà conforme |
| Rapprochement bancaire (mouvements + suggestions)              | [`vc-billing-views.jsx:420-510`](../../../trackyu-front-V2/_design-source/_raw/vc-billing-views.jsx) (`VcReconciliation`) | `ViewRapprochement` ([VentePage:1411](../../../trackyu-front-V2/src/features/vente/VentePage.tsx)) ⚠ mock à câbler |
| Recouvrement Overview (KPIs + balance âgée + top 5 + activité) | [`vr-views.jsx:4-119`](../../../trackyu-front-V2/_design-source/_raw/vr-views.jsx) (`VrOverview`)                         | LOT 6 — à créer                                                                                                    |
| Dossier focus recouvrement                                     | [`vr-views.jsx:205-378`](../../../trackyu-front-V2/_design-source/_raw/vr-views.jsx) (`VrDossierFocus`)                   | LOT 6 — à créer                                                                                                    |
| Workflow pipeline 5 étapes                                     | [`vr-views.jsx:381-458`](../../../trackyu-front-V2/_design-source/_raw/vr-views.jsx) (`VrWorkflow`)                       | LOT 6 — à créer                                                                                                    |

---

## 2. Routes & navigation

```tsx
{ path: '/vente', element: <VentePage />, // existant
  children: [
    // Onglets gérés en interne via `?tab=factures|paiements|recouvrement`
    { path: 'factures/:id', element: <InvoiceFormPage /> }, // LOT 3 (route plein écran)
  ]
}
```

### Triggers entrants

- Sidebar → `/vente` → tab `factures`
- Notifications (alerte impayé) → `/vente?tab=recouvrement&id=DOSSIER-X`
- Dashboard (KPI factures en retard) → `/vente?tab=factures&filter=late`

### Triggers sortants

- Cliquer sur référence contrat → `/vente?tab=contrats&id=CTR-X`
- Cliquer sur véhicule (plaque) → `/fleet?vehicleId=X`

---

## 3. Data structure

### Types V2 (déjà existants — [`types/finance.ts`](../../../trackyu-front-V2/src/types/finance.ts))

- `Invoice` (riches : status 7 valeurs, items, recovery fields, payment dates, etc.)
- `Payment` (workflow approval, multi-allocations)
- `JournalEntry`
- `SupplierInvoice`
- `BankTransaction`

### Endpoints backend (vérifiés en prod 2026-05-02)

| Méthode | Endpoint                                        | Permission backend | Hook V2                                  |
| ------- | ----------------------------------------------- | ------------------ | ---------------------------------------- |
| GET     | `/api/v1/finance/invoices?page&limit`           | `VIEW_FINANCE`     | `useInvoices` ✅ existe                  |
| POST    | `/api/v1/finance/invoices`                      | `CREATE_INVOICES`  | `useInvoiceMutations.create` 🟧 LOT 3    |
| PUT     | `/api/v1/finance/invoices/:id`                  | `EDIT_INVOICES`    | `useInvoiceMutations.update` 🟧 LOT 3    |
| DELETE  | `/api/v1/finance/invoices/:id`                  | `DELETE_INVOICES`  | `useInvoiceMutations.delete` 🟧 LOT 4    |
| POST    | `/api/v1/finance/invoices/:id/send`             | `EDIT_INVOICES`    | `useInvoiceMutations.send` 🟧 LOT 4      |
| GET     | `/api/v1/finance/payments`                      | `VIEW_PAYMENTS`    | `usePayments` ✅ existe                  |
| POST    | `/api/v1/finance/payments`                      | `CREATE_PAYMENTS`  | `usePaymentMutations.create` 🟧 LOT 2    |
| DELETE  | `/api/v1/finance/payments/:id`                  | `DELETE_PAYMENTS`  | `usePaymentMutations.delete` 🟧 LOT 4    |
| POST    | `/api/v1/recovery/invoices/:id/remind`          | (auth)             | `useReminderMutations.send` 🟧 LOT 1     |
| POST    | `/api/v1/recovery/invoices/:id/mark-paid`       | (auth)             | `useReminderMutations.markPaid` 🟧 LOT 4 |
| POST    | `/api/v1/recovery/invoices/:id/partial-payment` | (auth)             | `usePaymentMutations.partial` 🟧 LOT 2   |
| GET     | `/api/v1/recovery/overdue-invoices`             | (auth)             | `useRecovery.items` ✅ existe            |
| GET     | `/api/v1/recovery/stats`                        | (auth)             | `useRecovery.stats` ✅ existe            |

⚠ **Permission mismatch frontend↔backend** : front a `MANAGE_INVOICES` global, backend exige `CREATE_INVOICES` / `EDIT_INVOICES` / `DELETE_INVOICES` séparées. Stratégie : gate UI sur `MANAGE_INVOICES` ; le backend rejette si fine permission manque → toast erreur. À harmoniser à terme.

---

## 4. RBAC

| Action                               | Permission front   | Rôles autorisés (V2 AuthContext)                                  |
| ------------------------------------ | ------------------ | ----------------------------------------------------------------- |
| Voir factures/paiements/recouvrement | `VIEW_FINANCE`     | SUPERADMIN, ADMIN, RESELLER_ADMIN, MANAGER, COMMERCIAL, COMPTABLE |
| Créer / éditer facture               | `MANAGE_INVOICES`  | SUPERADMIN, ADMIN, RESELLER_ADMIN, COMMERCIAL, COMPTABLE          |
| Saisir paiement                      | `APPROVE_PAYMENTS` | SUPERADMIN, ADMIN, RESELLER_ADMIN, MANAGER, COMPTABLE             |
| Relancer                             | `MANAGE_INVOICES`  | idem facture                                                      |

CLIENT / SOUS_COMPTE n'ont **pas** `VIEW_FINANCE` → onglet caché par RBAC.

---

## 5. Composants à créer (architecture cible)

```
trackyu-front-V2/src/features/vente/
├─ hooks/
│  ├─ useInvoices.ts                    ✅ existe (lecture)
│  ├─ usePayments.ts                    ✅ existe (lecture)
│  ├─ useRecovery.ts                    ✅ existe (sendReminder pas branché UI)
│  ├─ useReminderMutations.ts           🟧 LOT 1 — sendReminder + markPaid + invalidations
│  ├─ usePaymentMutations.ts            🟧 LOT 2 — create / delete / partial-payment
│  └─ useInvoiceMutations.ts            🟧 LOT 3 — create / update / delete / send
├─ modals/
│  ├─ ReminderModal.tsx                 🟧 LOT 1 — Dialog 420px (Template G)
│  ├─ PaymentModal.tsx                  🟧 LOT 2 — Dialog 420px (Template G — port QuickActionPage)
│  ├─ InvoiceFormModal.tsx              🟧 LOT 3 — Dialog 900px ou route (Template A)
│  ├─ DeleteConfirmModal.tsx            🟧 LOT 4 — Dialog 380px générique
│  └─ SendInvoiceModal.tsx              🟧 LOT 4 — Dialog 420px
├─ panels/
│  ├─ InvoiceDetailPanel.tsx            🟧 LOT 4 — extraction VentePage `ViewInvoiceDetail` + panel ACTIONS
│  └─ DossierRecouvrementPanel.tsx      🟧 LOT 6 (option) — VrDossierFocus port
├─ pages/                               (LOT 6 si on les fait)
│  ├─ RecouvrementOverviewPage.tsx      🟧 LOT 6
│  ├─ RecouvrementDossiersPage.tsx      🟧 LOT 6
│  └─ RecouvrementWorkflowPage.tsx      🟧 LOT 6
└─ VentePage.tsx                        ✏️ MAJ — câble tous les `disabled`
```

---

## 6. Patterns DLS consommés

- `Dialog` (port `TplGModal` 420px)
- `FormField` (label JetBrains Mono 10px 700 uppercase letter-spacing .06em)
- `Input` / `Select` / `NumberInput` (suffix XOF) / `Textarea` / `Checkbox`
- `Button` (variants `primary` orange `#d96d4c` + boxShadow / `ghost` / `danger`)
- `Card` (bg-card + border + radius 12)
- `Badge` (statuts métier paid/issued/late/partial/draft + couleurs Design)
- `Toolbar` + `ToolbarSearch` + `FilterChip` + `FilterGroup` + `ResetFiltersButton`
- `DataTable` + `Pagination` + `BulkActionsBar` + `ColumnManager`
- `Timeline` (panel détail historique)
- `Toast` via `useToast()` (success/error/warning/info)

### Tokens CSS

- `var(--brand-primary)` / `var(--brand-primary-light)` (totaux TTC)
- `var(--bg-card)` / `var(--bg-elevated)` / `var(--bg-app)`
- `var(--text-main)` / `var(--text-secondary)` / `var(--text-muted)`
- `var(--border-ui)` / `var(--border-strong)`
- `var(--clr-success/danger/warning/info)`

### Couleurs statuts métier (hex direct admis)

- paid `#22c55e` · issued `#3b82f6` · late `#ef4444` · partial `#f59e0b` · draft `#94a3b8`
- MED `#7f1d1d` · contentieux `#581c87`

### Format

- Devise : `"135 700 XOF"` (espaces séparateurs, devise après)
- Date : `"27 avr. 2026"` (`toLocaleDateString('fr-FR', {day:'numeric',month:'short',year:'numeric'})`)
- Référence : `"FA-2026-0048"` JetBrains Mono orange brand

---

## 7. Validation forms

- LOT 1 (3 champs) + LOT 2 (6 champs) : **validation manuelle légère** (champs obligatoires, format montant)
- LOT 3 (15+ champs + lignes dynamiques + calculs) : **Zod 4.1 + react-hook-form** + `@hookform/resolvers` (déjà installés en V2, première utilisation V2)

---

## 8. États visuels

| État             | Comportement                                       |
| ---------------- | -------------------------------------------------- |
| Loading initial  | "Chargement…" 40px placeholder centré              |
| Loading mutation | Bouton primary `loading` (spinner inline)          |
| Empty list       | "Aucune facture" centré opacity .5                 |
| Empty filter     | Bouton "Effacer filtres"                           |
| Error mutation   | Toast error avec `error.message` du backend        |
| Success mutation | Toast success + invalidation queries + close modal |

---

## 9. Lots de livraison

| Lot       | Périmètre                                                                          | Effort      | Statut              |
| --------- | ---------------------------------------------------------------------------------- | ----------- | ------------------- |
| **LOT 1** | Relancer (Kanban + 4 endroits panel détail)                                        | 0.5j        | ✅ LIVRÉ 2026-05-02 |
| **LOT 2** | Saisir paiement (Template G modal + bouton panel détail pré-rempli)                | 1j          | ✅ LIVRÉ 2026-05-02 |
| **LOT 3** | Nouvelle facture / édition / suppression (Template A + Zod inauguration V2)        | 2.5j        | ✅ LIVRÉ 2026-05-02 |
| **LOT 4** | Actions panel détail (refonte fidélité VcInvoiceDetail + send email + PDF + avoir) | 1.5j        | ✅ LIVRÉ 2026-05-02 |
| **LOT 5** | Filtres avancés + ColumnManager + Export CSV                                       | 1.5j        | ✅ LIVRÉ 2026-05-02 |
| **LOT 6** | Recouvrement complet (Overview + DossierFocus + Workflow)                          | 1j (révisé) | ✅ LIVRÉ 2026-05-02 |

### Garde-fous appliqués partout

1. Build vert (`npm run build`) entre chaque lot
2. Tokens CSS uniquement (zéro `slate-*`, hex Design admis pour statuts métier seulement)
3. Toast systématique succès/erreur
4. `queryClient.invalidateQueries` après chaque mutation
5. `hasPermission('MANAGE_INVOICES')` gate les boutons sensibles
6. Aucune modif de `services/api/finance.ts` (legacy port — sera supprimé)
7. Aucun déploiement sans accord explicite utilisateur
8. MAJ STATE.md + CHANGELOG.md à chaque lot livré

---

## 10. Checklist build

```
[x] Mockups Design réceptionnés (Templates A+G + vc-billing + vr-views)
[x] Module spec créé (ce fichier)
[x] Types finance.ts présents
[x] Routes backend vérifiées
[ ] LOT 1 — Relancer livré
[ ] LOT 2 — Saisir paiement livré
[ ] LOT 3 — Nouvelle facture livré (Zod inauguré)
[ ] LOT 4 — Actions panel détail livré
[ ] LOT 5 — Filtres + Export livré
[ ] LOT 6 — Recouvrement complet (optionnel)
[ ] Tokens CSS uniquement (audit final)
[ ] RBAC guards testés (3 rôles : ADMIN, COMMERCIAL, CLIENT)
[ ] Mode clair + sombre testés
[ ] STATE.md mis à jour
[ ] CHANGELOG.md entrée datée
```

---

## 11. Notes & décisions

- **Permission mismatch front/back** : signalé. Front gate sur `MANAGE_INVOICES` global, backend a permissions fines. Backend rejette si fine perm manque → toast.
- **InvoicePage.tsx (template demo)** conservé tel quel à `/templates/invoice`. La modale métier `InvoiceFormModal` est une **extraction** du body, pas un remplacement.
- **QuickActionPage.tsx** conservé à `/templates/quick-action`. PaymentModal et ReminderModal sont des extractions.
- **services/api/finance.ts** (legacy port 2058 lignes) **NE PAS UTILISER** : il appelle `fetch()` directement et mélange mock/real. Les nouveaux hooks (`useXxxMutations`) utilisent `httpPost/Put/Delete` du `services/api/client.ts` (auto-refresh token, route safety).
- **🚫 Pas d'action "Marquer comme payée" en UI** (décision métier 2026-05-02) : le passage d'une facture en `PAID` nécessite **obligatoirement** la saisie d'un paiement (LOT 2 = `PaymentModal`). L'endpoint backend `POST /recovery/invoices/:id/mark-paid` existe mais **n'est pas exposé** côté front. Raison : rigueur comptable, traçabilité de la trésorerie, pas de raccourci administratif. Le mockup Design `VcInvoiceDetail` montrait ce bouton — divergence assumée.
- **Mobile Money** : 4 sous-méthodes (MTN/Orange/Moov/Wave) consolidées en un seul enum backend `MOBILE_MONEY` (limitation actuelle). La précision est conservée dans le champ `reference` (ex : `"Mobile Money MTN · MMTN-2026-9987"`). À enrichir lorsque le backend acceptera un sous-type.

---

## 12. Changelog du module

| Date       | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Par            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| 2026-05-02 | Création spec FINANCE.md (audit complet legacy/V2 + plan 6 lots)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Session 11     |
| 2026-05-02 | LOT 1 ✅ — Relancer livré : `useRecovery` enrichi avec `useMutation` (sendReminder + invalidations), `ReminderModal` (Template G 420px, canal/modèle/note + récap facture), 4 branchements VentePage (icône 🔔 liste, bouton RELANCER Kanban, cercle 🔔 panel EN DÉTAIL, bouton 🔔 FactureDetailPanel)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Session 11     |
| 2026-05-02 | Décision métier — "Marquer comme payée" retiré de l'UI : passage en PAID = saisie paiement obligatoire                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Session 11     |
| 2026-05-02 | LOT 2 ✅ — Saisir paiement livré : `usePaymentMutations` (POST/DELETE /finance/payments snake_case + invalidations), `PaymentModal` (Template G 420px, 6 champs, pré-remplissage si invoice fourni, méthodes MM MTN/Orange/Moov/Wave/Virement/Chèque/Espèces), branchement toolbar "+ Saisir paiement" + boutons "💰 Saisir un paiement" sur ViewInvoiceDetail (panel actions) et FactureDetailPanel (slide-in)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Session 11     |
| 2026-05-02 | LOT 3 ✅ — Nouvelle facture / édition / suppression livré : **inauguration Zod 4 + react-hook-form + @hookform/resolvers en V2** via `schemas/invoiceFormSchema.ts` (validation : client requis, date émission ≥ today, échéance ≥ émission, items min 1, qté ≥ 1, prix ≥ 0). `useInvoiceMutations` (POST/PUT/DELETE/send /finance/invoices, mapping camelCase→snake_case + items.unit_price, invalidations). `InvoiceFormModal` (Dialog 1000px, port Template A `TplAFormInvoice` fidèle : émetteur/destinataire 2 cols + références 4×2 cols + lignes éditables (Désignation/Période/Qté/PU/Total live) + totaux HT/TVA/TTC live + conditions + notes, footer Annuler/Brouillon/Émettre). Branchements VentePage : bouton `+ Nouvelle facture` toolbar, action `✏ Éditer` sur ligne (mode update préremplie via `mapInvoiceToFormDefaults`), action `🗑 Supprimer` + Dialog confirm. VentePage 241.71 kB (+114 kB pour Zod + RHF + modale, justifié par 1ère utilisation)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Session 11     |
| 2026-05-02 | LOT 4 ✅ — Actions panel détail livré : **refonte fidèle mockup `VcInvoiceDetail`** (capture utilisateur 2026-05-02) — bouton géant "Envoyer relance" 170px hauteur avec icône 🔔 huge (140px filigrane) + label bottom-right (variantes paid/draft/partial avec couleurs adaptées). Card actions séparée : `💰 Saisir paiement` (primary si non payée), `↓ Télécharger PDF`, `✉ Renvoyer par email`, `Émettre avoir` (ghost rouge si payée, mockup-fidèle). `SendInvoiceModal` Template G 460px (To/Cc/Subject/Message + validation email regex). `generateInvoicePDF` helper jspdf (header émetteur/FACTURE+ref/badge status, bloc client/refs/dates 3 cols, items autoTable, totaux HT/TVA/TTC, footer conditions). **Émettre avoir** réutilise `InvoiceFormModal` avec `invoiceType:'AVOIR'` + items préremplis. Lazy-import dynamique de jspdf (chunk 425 kB séparé chargé au premier clic PDF) → VentePage reste 245 kB. Branchements aussi sur `FactureDetailPanel` slide-in (PDF/Email/Relance/Avoir conditionnels). Build vert 15.07s, 0 warning chunk size.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Session 11     |
| 2026-05-02 | LOT 5 ✅ — Filtres + ColumnManager + Export CSV livré : **recherche texte fonctionnelle** (multi-critères ref/client/clientRef/plate/reseller/subject/sub) côté client, **filtre Catégorie** cycle 4 options (STANDARD/INSTALLATION/ABONNEMENT/AUTRES_VENTES), bouton **Réinitialiser filtres** quand au moins 1 actif. **`ColumnManager`** primitive câblée (popover 280px avec Checkbox + drag handle visuel) → 13 colonnes définies (4 lockées : sélection, ref, client, montant, actions ; 9 togglables) avec persistance `localStorage` clé `vente_invoices_visible_cols_v1` + reset. Render conditionnel `<TH/TD>` selon `isVis(key)`. **Export CSV** : helper `exportInvoicesCSV.ts` avec papaparse (séparateur `;` Excel FR, BOM UTF-8, 14 colonnes incluant client/contrat/abonnement/dates/montants/statut traduit), lazy-import dynamique au clic + state `isExporting` + filename `factures_YYYY-MM-DD.csv`. Bouton Toolbar `⬇ Exporter` actif avec disabled/loading + tooltip si liste vide, désactivé seulement si `displayed.length === 0`. Build vert 14.93s, VentePage 248 kB (+3 kB) — papaparse intégré dans chunk index.es lazy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Session 11     |
| 2026-05-02 | Suivi LOT 5 — `mapInvoice` enrichi (`category` + `normalizeCategory`). Auto-génération **Objet** (subject) dans InvoiceFormModal via `useEffect` + `watch/setValue` — port pattern legacy `generateSubject` : format `{Type} {Catégorie}{ - PLATE}` (ex: "Facture Abonnement - DC-5512"). Détection `^(Facture                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Devis          | Avoir | Proforma)\s/` pour ne pas écraser saisie manuelle. Mode édition skip totalement. Build VentePage 248.54 kB. | Session 11 |
| 2026-05-02 | Décision métier — **STANDARD retiré des catégories frontend**. 3 valeurs UI : INSTALLATION/ABONNEMENT/AUTRES_VENTES, default INSTALLATION. Anciennes factures DB avec `category=STANDARD` ou `null` restent valides (backend accepte toujours) mais ne match aucune option du filtre Catégorie côté front (comportement attendu).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Session 11     |
| 2026-05-02 | LOT 6 ✅ — Recouvrement complet livré (1j vs 3-4j estimés — port Design `VrViews` déjà fait, restait à câbler). **Étape A** : `useRecovery` enrichi avec types `RecoveryDossier` / `RecoveryDossierStatus` / `RecoveryDossierRisk` + agrégation `dossiers` (groupement par `tierId`/clientName) + `dossiersByStage` (Kanban 5 étapes amiable/R1/R2/MED/contentieux selon `oldestDays`) + `criticalCount`. Helpers `getDossierStatus` / `getDossierRisk`. Tri par risk décroissant + encours. **Étape B** `ViewRecovListe` : recherche texte (invoiceNumber/clientName/email) + FilterChip Sévérité 4 options + ResetFilters + bouton `✉ Relancer` rouge câblé sur `ReminderModal`. **Étape C** `ViewRecovFocus` : remplacé mock `VR_DOSSIERS[0]` par sélecteur `<select>` (liste tous les dossiers avec encours/retard/risque), default = premier (le plus à risque). Header XL avec border-left risque coloré + 4 stats (Encours/Plus ancien/Factures/Relances) basés sur dossier réel. Bouton Relancer top + bouton RELANCER par facture impayée (vraies données `selected.invoices`). Panel ACTIONS 6 boutons Phase 2 disabled (Mise en demeure/Appel/Note/Suspendre/Contentieux/Annuler — endpoints backend à venir). **Étape D** `ViewRecovWorkflow` : Kanban 5 étapes (`stages` array avec couleurs Design fidèles) basé sur `dossiersByStage` + cards par dossier sous chaque étape avec encours XOF. **Étape E** : banner "X dossiers critiques" branché sur `criticalCount` réel. SUBS dossiers count branché sur `dossiers.length`. Mocks `VR_DOSSIERS`/`VR_WORKFLOW` retirés (sauf `VR_HISTORY` conservé en mock — pas d'API histo backend). Build vert 15.35s, VentePage 249.91 kB. | Session 11     |
| 2026-05-02 | 🚀 **DÉPLOIEMENT PROD V2** — `deploy-v2.ps1 -nobuild` exécuté. Archive 16 MB uploadée vers `/var/www/trackyu-v2/dist`. Container `trackyu-v2-frontend` redémarré (`docker compose up -d`). Validation : HTTP 200 sur localhost:8082 (interne) **et** sur https://live.trackyugps.com/ (public, 0.35s, 2.6 kB). LOTS 1-6 + STANDARD retiré + auto-Objet + decision mark-paid retirée → tous en prod. trackyugps.com et live.trackyugps.com servent maintenant la nouvelle version. Statut spec : 13/13 actions critiques résolues, parité legacy atteinte. Reste à faire : tests fonctionnels manuels en prod (cliquer chaque action, vérifier toast + persistence backend).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Session 11     |
| 2026-05-02 | 🐛 **FIX PDF (post-deploy)** — Bug visuel détecté en prod : chiffres mal rendus (`&2&9 /&6&6&1&` au lieu de `2 829 / 66 618`) à cause de NBSP ` ` produit par `toLocaleString('fr-FR')` que jsPDF Helvetica ne gère pas. **Fix** : helper `fmt()` dédié au PDF avec regex `\B(?=(\d{3})+(?!\d))` insérant des espaces normaux U+0020. **TVA dynamique** : `vat_rate` ajouté à `BackendInvoice` + `vatRate: number` exposé dans `Invoice` via `mapInvoice` (default 18 si null), passé à `generateInvoicePDF` qui calcule HT et label `TVA X%` selon le taux tenant à l'émission (plus de 18% hardcodé). **Refonte layout** fidèle mockup `VcInvoiceDetail` : header FACTURE 24pt + badge statut 5 couleurs (mapping STATUS_FR) · bloc 3 cols stricte (FACTURÉ À · RÉFÉRENCES filtrées · DATES avec rouge si late + label retard) · autoTable colonnes calibrées · totaux avec ligne séparatrice orange 0.7pt + TOTAL TTC orange brand bold · Reçu (vert) + Reste dû (rouge) **conditionnels** (uniquement si paidRaw > 0) · footer 2 lignes (conditions + clause pénalités). Aussi `paidAmountRaw` exposé. **Redéployé prod** : HTTP 200 (0.46s public). Build VentePage 249.91 kB inchangé, chunk PDF 425.79 kB (+1 kB). **Limite assumée** : `useInvoices` ne renvoie pas le détail items → 1 ligne synthétique dans la table PDF (subject + amount HT). À enrichir avec endpoint `GET /finance/invoices/:id` Phase 2.                                                                                                                                                                                                                                                                        | Session 11     |
| 2026-05-02 | ✅ **Audit prod Session 12** — vérification que le chantier final (items détaillés PDF) est bien en prod. Backend : `getInvoiceById` (3×), route `invoices/:id` (4×), `findInvoiceById` (1×) tous présents dans `/var/www/trackyu-gps/backend/dist/`. Endpoint `GET /api/v1/finance/invoices/:uuid` répond HTTP 401 (auth requise = enregistré). Frontend V2 : bundle prod `index-CDrPzSwq.js` (467 488 B, Last-Modified 2026-05-02 18:44:47) = identique au build local. **Tout le chantier FINANCE V2 confirmé en prod, plus rien à déployer côté FINANCE.** Doc passation `CONTEXTE_SESSION_SUIVANTE.md` mis à jour pour refléter le statut final (✅ déployé partout).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Session 12     |
| 2026-05-02 | 🟧 **Phase 2 backend recouvrement livrée (build vert, attend deploy)** — activation des 6 boutons "ACTIONS DE RECOUVREMENT" qui étaient `disabled`. **Migration SQL** `20260502_recovery_dossiers_and_actions.sql` : tables `recovery_dossiers` (4 statuts ACTIVE/SUSPENDED/LITIGATION/CANCELLED + index partiel "1 dossier ouvert max par tier") et `recovery_actions` (9 types FORMAL_NOTICE/LOG_CALL/NOTE/SUSPEND/UNSUSPEND/LITIGATION/EXIT_LITIGATION/CANCEL/REOPEN, FK CASCADE dossier_id). **Backend** : 9 endpoints + 1 GET dossier (`recoveryRepository.ts` +8 fonctions, `recoveryController.ts` +10 handlers via helper `performStatusTransition` DRY, `recoveryRoutes.ts` +10 routes avec `requirePermission('MANAGE_INVOICES')` pour les 4 actions engageantes). Mise en demeure = email simple via `recoveryService.sendManualReminder` + log (action loggée même si email échoue). Toutes transitions réversibles avec validation `expectedFrom` (409 si invalide). **Frontend V2** : `useDossier(tierId)` query + `useRecoveryActions()` 9 mutations + `RecoveryActionModals.tsx` (FormalNotice/LogCall/Note + DossierTransitionModal générique pour 6 transitions). `ViewRecovFocus` panel ACTIONS refait : 6 boutons dynamiques (label/icône changent selon backend status — "Suspendre"↔"Réactiver", etc.) + badge status (SUSPENDU/CONTENTIEUX/ANNULÉ) + nouveau bloc HISTORIQUE DOSSIER (8 dernières actions, mapping FR `ACTION_LABELS`/`ACTION_ICONS`, horodatage + auteur). Build vert : VentePage 263.79 kB (+13.88 kB). Reste à déployer : migration SQL → backend → frontend V2.                                                                                      | Session 12-bis |
| 2026-05-03 | 🟢 **Priorité 3 b + c livrées** — **(b)** Édition facture avec items réels : handler `Éditer` ligne facture refait en async — fait `fetchInvoiceWithItems(inv.id)` AVANT d'ouvrir `InvoiceFormModal`, merge avec inv (items + vatRate réels), fallback silencieux sur synthèse 1 ligne en cas d'erreur. State `editLoadingId` pour griser le bouton ✏ pendant le fetch (~200ms). `mapInvoiceToFormDefaults` enrichi : si `inv.items[]` présent → mappe (snake `unit_price` → camel `price`, `period`, `quantity`) sinon recrée 1 item synthétique (rétrocompat). VTA dynamique selon `inv.vatRate` (default 18). **(c)** Cleanup mocks `venteData.ts` : audit `grep` → `VR_DOSSIERS`/`VR_WORKFLOW`/`VR_HISTORY` zero usage (remplacés par `useRecovery.dossiers`/`dossiersByStage` et `useDossier(tierId).actions` réels backend). Retirés du export venteData et de l'import VentePage. `VR_AGING` conservé (pas encore d'agrégation backend équivalente). `VC_INVOICES`/`VC_PAYMENTS` conservés (encore utilisés rapprochement bancaire mock + sous-titres SUBS). Build vert : VentePage 264.46 kB inchangé, sourcemap -4.8 kB.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Session 12-bis |

---

_Spec auto-suffisante. Lue avec STATE.md + CLAUDE.md, suffit pour reprendre le chantier sans contexte additionnel._
