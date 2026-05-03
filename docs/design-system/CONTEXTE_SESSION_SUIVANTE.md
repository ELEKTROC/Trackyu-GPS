# CONTEXTE — Prochaine session Claude Code

> Préparé le **2026-05-02 fin de session 11-bis** — Chantier **FINANCE V2** (menu Facture + Recouvrement) livré et déployé prod.
>
> **Lire ce fichier + STATE.md + modules/FINANCE.md avant toute reprise du chantier.**

---

## BOOTSTRAP OBLIGATOIRE — dans cet ordre

```
1. CLAUDE.md (auto-loaded) — règles permanentes
2. docs/design-system/STATE.md — état global du chantier (Session 11-bis)
3. docs/design-system/CHANGELOG.md — entrée Session 11-bis (2026-05-02)
4. docs/design-system/modules/FINANCE.md — spec module facture (290+ L)
5. Ce fichier CONTEXTE_SESSION_SUIVANTE.md (passation chirurgicale)
```

---

## 🎯 ÉTAT DU CHANTIER FINANCE V2

| Lot                     | Périmètre                                                                                     | Statut                                            |
| ----------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **LOT 1**               | Relancer (4 entry points + ReminderModal Template G)                                          | ✅ déployé prod                                   |
| **LOT 2**               | Saisir paiement (PaymentModal + boutons)                                                      | ✅ déployé prod                                   |
| **LOT 3**               | Nouvelle facture / Éditer / Supprimer (Zod + RHF inaugurés V2)                                | ✅ déployé prod                                   |
| **LOT 4**               | Actions panel détail (refonte fidélité Design + send email + PDF + avoir)                     | ✅ déployé prod                                   |
| **LOT 5**               | Filtres avancés + ColumnManager + Export CSV                                                  | ✅ déployé prod                                   |
| **LOT 6**               | Recouvrement complet (Overview/Liste/Focus/Workflow Kanban)                                   | ✅ déployé prod                                   |
| **Suivis livrés**       | Auto-Objet · STANDARD retiré · mark-paid retiré · vatRate dynamique · fix encodage PDF (NBSP) | ✅ déployés                                       |
| **Items détaillés PDF** | Backend `GET /finance/invoices/:id` + frontend `useInvoiceDetail` + intégration PDF           | ✅ déployé prod (vérifié Session 12 — 2026-05-02) |

**🏆 13/13 actions critiques résolues + items détaillés PDF = chantier FINANCE V2 100 % en prod.**

URL prod : https://live.trackyugps.com/ (port 8082)

---

## ✅ DÉPLOIEMENT FINAL — confirmé prod (Session 12, 2026-05-02)

Vérifications passées :

- **Backend** : `getInvoiceById` (3 occurrences) présent dans `/var/www/trackyu-gps/backend/dist/controllers/financeController.js` · route `invoices/:id` (4 occurrences) dans `dist/routes/financeRoutes.js` · `findInvoiceById` dans `dist/repositories/financeRepository.js` · `GET /api/v1/finance/invoices/:uuid` répond HTTP 401 (auth requise = endpoint vivant)
- **Frontend V2** : bundle prod `index-CDrPzSwq.js` · `Content-Length: 467 488` · `Last-Modified: Sat, 02 May 2026 18:44:47 GMT` · taille et hash identiques au build local (`dist/assets/index-CDrPzSwq.js`) → c'est bien le build avec `fetchInvoiceWithItems` + `useInvoiceDetail` qui est en prod

→ Plus rien à déployer côté FINANCE V2.

---

## 🟧 PHASE 2 BACKEND RECOUVREMENT — code livré, attend déploiement (Session 12-bis, 2026-05-02)

Activation des 6 boutons "ACTIONS DE RECOUVREMENT" du panel `ViewRecovFocus` (qui étaient `disabled`). **Migration SQL + 10 endpoints + 4 modales + panel refait avec labels dynamiques + bloc HISTORIQUE.**

### Décisions tranchées avec l'utilisateur

| #   | Décision                                                                                                                           | Effet                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | Option B = vraie table `recovery_dossiers` dédiée (cycle de vie indépendant) + table `recovery_actions` qui référence `dossier_id` | 2 nouvelles tables                  |
| 2   | 3 actions état réversibles (suspend↔unsuspend, transfer-litigation↔exit-litigation, cancel↔reopen)                                 | 6 endpoints transition + 3 inverses |
| 3   | Mise en demeure = email simple via `recoveryService.sendManualReminder` + log (pas de PDF lettre formelle)                         | Réutilise infra existante           |
| 4   | `requirePermission('MANAGE_INVOICES')` pour formal-notice / suspend / litigation / cancel + auth simple pour log-call / note       | RBAC strict                         |
| 5   | Migration SQL = pattern existant `migrations/YYYYMMDD_description.sql`, exécution manuelle via ssh+psql                            | Pas d'outil de migration            |

### Fichiers livrés

**Migration SQL** (1) :

- `trackyu-backend/migrations/20260502_recovery_dossiers_and_actions.sql` — 100 % idempotente, index partiel `idx_recovery_dossiers_one_open` qui garantit "1 dossier ouvert max par (tenant, tier)" tout en permettant N dossiers CANCELLED historiques

**Backend** (3 modifiés) :

- `src/repositories/recoveryRepository.ts` — +8 fonctions Phase 2 (`getOrCreateOpenDossier`, `updateDossierStatus`, `insertRecoveryAction`, `findRecoveryActionsByDossier`, etc.)
- `src/controllers/recoveryController.ts` — +10 handlers via helper DRY `performStatusTransition` (6 transitions) + `formalNotice`/`logCall`/`addNote` + `getDossierByTier`
- `src/routes/recoveryRoutes.ts` — +10 routes avec permissions ciblées

**Frontend V2** (2 modifiés + 1 nouveau) :

- `src/features/vente/hooks/useRecovery.ts` — +`useDossier(tierId)` + `useRecoveryActions()` (9 mutations) + types `RecoveryBackendStatus`/`RecoveryActionBackend`/etc.
- `src/features/vente/modals/RecoveryActionModals.tsx` — **nouveau** ~370 L : `FormalNoticeModal` + `LogCallModal` + `NoteModal` + `DossierTransitionModal` (générique pour 6 transitions)
- `src/features/vente/VentePage.tsx` — `ViewRecovFocus` refait : composant `RecoveryActionsPanel` (6 boutons dynamiques selon `backendStatus` — "Suspendre"↔"Réactiver" etc., badge status non-ACTIVE) + bloc HISTORIQUE DOSSIER (8 dernières actions avec icônes/labels FR + auteur + horodatage)

### Build

```
Backend  : tsc OK (recoveryController.js + recoveryRepository.js + recoveryRoutes.js dans dist/)
Frontend : ✓ built in 15.36s · VentePage 263.79 kB (+13.88 kB) · 0 erreur 0 warning
```

### Plan de déploiement (séquencé)

```powershell
# 1. Migration SQL en prod
scp c:\Users\ADMIN\Desktop\trackyu-backend\migrations\20260502_recovery_dossiers_and_actions.sql root@148.230.126.62:/tmp/
ssh root@148.230.126.62 "docker cp /tmp/20260502_recovery_dossiers_and_actions.sql trackyu-gps-postgres-1:/tmp/ && docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -f /tmp/20260502_recovery_dossiers_and_actions.sql"

# 2. Backend prod (TOUJOURS -force)
cd c:\Users\ADMIN\Desktop\TRACKING
.\deploy.ps1 -backend -nobuild -force

# 3. Frontend V2 prod
.\deploy-v2.ps1 -nobuild
```

### Vérifications post-deploy

1. **Tables créées** : `ssh root@148.230.126.62 "docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -c '\dt recovery_*'"` → recovery_dossiers + recovery_actions présentes
2. **Endpoint vivant** : `curl -s -o /dev/null -w "%{http_code}\n" https://live.trackyugps.com/api/v1/recovery/dossiers/test-tier-id` → 401 (auth requise)
3. **Backend logs** : `ssh root@148.230.126.62 "docker logs trackyu-gps-backend-1 --tail 30"` → pas d'erreur startup
4. **E2E manuel** : `https://live.trackyugps.com/vente?tab=recouvrement` → onglet `Dossier client` → cliquer chaque action des 6 boutons :
   - ⚠ Mise en demeure → modale 460px → confirmer → toast succès + email envoyé
   - ☎ Noter un appel → modale → contexte/durée/résultat → toast succès
   - ✎ Ajouter une note → modale → note required → toast succès
   - ⏸ Suspendre auto → modale avec motif → confirmer → badge SUSPENDU apparaît + bouton devient "Réactiver relances" + bloc HISTORIQUE liste l'action
   - ⚖ Transférer contentieux → idem → badge CONTENTIEUX
   - ✕ Annuler recouvrement → idem → badge ANNULÉ + bouton "Réouvrir"

---

## 📋 RESTE À FAIRE — par priorité

### 🟡 Phase 2 backend — 6 endpoints recouvrement

Les 6 boutons "ACTIONS DE RECOUVREMENT" du panel `ViewRecovFocus` ([VentePage.tsx ~L2078-2107](../../trackyu-front-V2/src/features/vente/VentePage.tsx)) sont **disabled** car les endpoints backend n'existent pas. Pour les activer :

| Action UI                 | Endpoint à créer                                             | Permission      | DB                                                              |
| ------------------------- | ------------------------------------------------------------ | --------------- | --------------------------------------------------------------- |
| ⚠ Mise en demeure         | `POST /api/v1/recovery/invoices/:id/formal-notice`           | MANAGE_INVOICES | + table `recovery_actions` (date, user, type, dossier_id, note) |
| ☎ Noter un appel          | `POST /api/v1/recovery/invoices/:id/log-call`                | (auth)          | idem                                                            |
| ✎ Ajouter une note        | `POST /api/v1/recovery/invoices/:id/note`                    | (auth)          | idem                                                            |
| ⏸ Suspendre relances auto | `POST /api/v1/recovery/dossiers/:tierId/suspend-auto`        | MANAGE_INVOICES | flag `is_recovery_suspended` sur tiers                          |
| ⚖ Transférer contentieux  | `POST /api/v1/recovery/dossiers/:tierId/transfer-litigation` | MANAGE_INVOICES | + status `litigation` sur dossier                               |
| ✕ Annuler recouvrement    | `POST /api/v1/recovery/dossiers/:tierId/cancel`              | MANAGE_INVOICES | + status `cancelled` sur dossier                                |

Côté front une fois les endpoints livrés :

- Retirer les `disabled` dans `ViewRecovFocus` panel ACTIONS
- Créer modales correspondantes (toutes Template G 420px, pattern QuickActionPage / ReminderModal)
- Brancher hooks dans `useRecovery` (mutations)

### 🟢 Améliorations frontend (basse priorité)

#### Smart contract matching (LOT 3)

Dans `InvoiceFormModal`, quand l'utilisateur sélectionne un contrat, préremplir auto :

- `licensePlate` depuis le véhicule lié au contrat
- `items[]` depuis le catalogue du contrat
- `subject` adapté à la période courante

Implémentation : `useEffect` watch `contractId`, fetch contract details, `setValue` sur les champs.

#### Édition facture : items réels au lieu de synthèse

Actuellement `mapInvoiceToFormDefaults` recrée 1 item synthétique en édition. Avec le nouvel endpoint `GET /finance/invoices/:id` (livré quand déployé), faire :

```ts
async function handleEdit(inv: any) {
  const detail = await fetchInvoiceWithItems(inv.id);
  setEditInvoice(detail);
  setInvoiceFormOpen(true);
}
```

Adapter `mapInvoiceToFormDefaults` pour mapper `items[].unit_price` (backend) → `items[].price` (formulaire Zod).

#### Cleanup mocks `venteData.ts`

Vérifier si `VR_DOSSIERS`, `VR_WORKFLOW`, `VR_HISTORY`, `VC_INVOICES`, `VC_PAYMENTS` sont encore utilisés :

```bash
grep -rn "VR_DOSSIERS\|VR_WORKFLOW\|VC_INVOICES\|VC_PAYMENTS" trackyu-front-V2/src/
```

Si plus utilisés → retirer du fichier pour réduire bundle.

#### RBAC mismatch front/back

Front gate sur `MANAGE_INVOICES` (1 perm globale). Backend exige `CREATE_INVOICES` / `EDIT_INVOICES` / `DELETE_INVOICES` (fines). Backend rejette si fine manque → toast erreur (acceptable).

Pour harmoniser : soit ajouter les fines au front (`AuthContext.tsx` ROLE_PERMISSIONS), soit consolider côté backend (mais ça impacte migration permissions DB).

#### Mobile Money sous-types

Actuellement `MOBILE_MONEY` = enum unique côté backend. La précision (MTN/Orange/Wave/Moov) est encodée dans le champ `reference` côté front (ex: `"Mobile Money MTN · MMTN-2026-9987"`). Pour traçabilité propre :

- Ajouter au backend `payment_provider: 'MTN' | 'ORANGE' | 'MOOV' | 'WAVE' | null` dans la table `payments`
- Modifier `PaymentSchema` Zod backend
- Adapter `PaymentModal` V2 : enum `provider` séparé de `method`

#### Endpoint backend send : multi-destinataires

Actuellement `POST /finance/invoices/:id/send` accepte `{ to: string, cc?: string }` — un seul email. Pour multi-To/Cc :

- Backend : enrichir Zod `sendInvoiceEmailSchema` pour `to: string | string[]`
- Frontend : `SendInvoiceModal` accepte tags multiples (séparés par virgule ou ligne)

---

## 📐 MÉTHODOLOGIE & WORKFLOW

### Boucle stable utilisée pour les 6 lots

```
Audit / lecture mockup _design-source/_raw/
   ↓
Spec MODULE.md (créer ou MAJ)
   ↓
Présenter plan + questions numérotées
   ↓ (accord explicite utilisateur)
LOT N — coder fichiers ciblés
   ↓
Build vert (npm run build)
   ↓
MAJ STATE.md + CHANGELOG.md + MODULE.md changelog
   ↓
Présenter diff + tests manuels suggérés
   ↓ (accord deploy explicite)
Deploy → vérification HTTP 200 prod
   ↓
Lot suivant
```

### Règles cardinales — respecter strictement

- **Toujours répondre en français**
- **Accord explicite avant toute modif de code** (même en auto-mode pour actions destructives/prod)
- **Numéroter les questions** (1, 2, 3...) quand plusieurs
- **Build vert** entre chaque lot (`npm run build` dans `trackyu-front-V2/`)
- **Tokens CSS uniquement** : `var(--brand-primary)` etc., **jamais** `slate-*` / `gray-*` / `zinc-*`
- **Couleurs statuts métier admises en hex** : paid `#22c55e` · issued `#3b82f6` · late `#ef4444` · partial `#f59e0b` · draft `#94a3b8` · MED `#7f1d1d` · contentieux `#581c87`
- **Toast systématique** sur succès / erreur (`useToast()`)
- **Invalidation React Query** systématique après mutation (`queryClient.invalidateQueries`)
- **`hasPermission('MANAGE_INVOICES')`** gate les boutons sensibles
- **Aucun `git add .`** ni `git add -A` — toujours fichiers spécifiques
- **Commit uniquement après accord explicite** de l'utilisateur

---

## ⚠️ ERREURS À NE PAS REFAIRE

### 1. NBSP dans le PDF jspdf

**Erreur** : utiliser `n.toLocaleString('fr-FR')` dans le helper PDF → produit espaces NBSP ` ` ou NNBSP ` ` que la police Helvetica par défaut ne gère pas → affichage `&` cassé en prod (incident vu en screenshot 2026-05-02).

**Correction** : helper `fmt()` avec regex insérant des espaces normaux U+0020 :

```ts
function fmt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
```

### 2. Auto-génération `subject` — boucle infinie

**Erreur** : utiliser `watch('subject')` dans le `useEffect` qui `setValue` sur `subject` → re-render infini.

**Correction** : utiliser `getValues('subject')` (hors deps useEffect) au lieu de `watch`. Code propre dans `InvoiceFormModal.tsx`.

### 3. Action "Marquer comme payée" en UI

**Décision métier 2026-05-02** : pas de raccourci "Mark as paid". Pour passer une facture en `PAID`, **obligatoirement** saisir un paiement (LOT 2). Endpoint backend `POST /recovery/invoices/:id/mark-paid` existe mais **n'est pas exposé** en UI.

**Si quelqu'un demande de réintroduire** : refuser, expliquer la décision (rigueur comptable, traçabilité trésorerie). Mockup Design `VcInvoiceDetail` montrait ce bouton — divergence assumée et documentée dans FINANCE.md.

### 4. Catégorie STANDARD

**Décision 2026-05-02** : 3 catégories en UI uniquement : `INSTALLATION` / `ABONNEMENT` / `AUTRES_VENTES`. Default = `INSTALLATION`.

`STANDARD` reste valide côté backend (anciennes factures DB) mais ne match plus le filtre catégorie front. Le `normalizeCategory` dans `useInvoices` retourne `null` pour STANDARD.

### 5. Modifier `services/api/finance.ts`

Le fichier `trackyu-front-V2/src/services/api/finance.ts` (2058 L) est un **port legacy** qui mélange mock + fetch direct. **Ne PAS l'utiliser** ni le modifier — il sera supprimé.

À la place : créer des hooks dans `features/vente/hooks/` qui utilisent `httpGet/httpPost/httpPut/httpDelete` de `services/api/client.ts` (auto-refresh token, route safety).

### 6. Pipe `Select-Object -Last N` autour de scripts long-running PowerShell

**Incident 2026-05-02** : `npm run build 2>&1 | Select-Object -Last 5` dans `deploy-v2.ps1` produit illusion de blocage (PowerShell buffer toute la sortie jusqu'à exit du process). Le `Select-Object -Last 5` est toujours présent dans `deploy-v2.ps1` ligne 26 — **à corriger**.

**Correction** : ne JAMAIS pipe Select-Object autour d'un script long-running. Utiliser `2>&1` simple ou rediriger vers fichier temp si on veut filtrer après coup.

### 7. Backend deploy sans `-force`

**Incident 2026-04-30 (5 min de prod 502)** : `deploy.ps1 -backend -nobuild` (sans `-force`) en mode delta → corruption de fichiers dans `dist/`.

**Règle** : Backend = **TOUJOURS** `deploy.ps1 -backend -nobuild -force`. Le mode delta est cassé pour Node.js.

### 8. Patch direct `dist/` sur le VPS

**JAMAIS** modifier `/var/www/trackyu-gps/backend/dist/` directement (un fichier `DO_NOT_PATCH.txt` est présent). Toujours : modifier `src/` local → `npm run build` dans `trackyu-backend/` → `deploy.ps1 -backend -nobuild -force` depuis `TRACKING/`.

### 9. Charger toutes les listes admin sans filtre

**Pattern obligatoire** : dans les vues admin avec gros volumes, ne **rien charger** tant que l'utilisateur n'a pas posé un filtre/recherche. Pattern `shouldLoadData + enabled` dans React Query.

### 10. Calculs côté client

**Règle** : tous les calculs **métier** (trajets, arrêts, stats, niveaux carburant, totaux factures avec taxes complexes) = **source serveur uniquement**, jamais recalculé côté client.

Calculs front admis : agrégats simples (count, somme) à des fins d'affichage immédiat — comme dans `useRecovery.dossiers` qui agrège par client (groupement local).

### 11. Hex direct

**Erreur** : utiliser `bg-slate-900` ou `text-gray-500` directement dans les composants V2.

**Correction** : tokens CSS uniquement (`var(--bg-card)`, `var(--text-muted)`, etc.). Hex direct admis seulement pour les couleurs statuts métier (paid/issued/late/...) qui sont fixées par le Design.

### 12. Lazy import des libs lourdes

**Pattern à suivre** pour libs > 100 kB :

```ts
async function downloadXxx(...) {
  const { generateXxx } = await import('./utils/generateXxx');
  generateXxx(...);
}
```

Appliqué pour jspdf (425 kB) et papaparse (xlsx) — chunks lazy chargés au premier clic. Sans ça, VentePage faisait 672 kB. Avec, 250 kB.

---

## 📂 FICHIERS CLÉS — référence rapide

### Architecture frontend FINANCE V2

```
trackyu-front-V2/src/features/vente/
├─ VentePage.tsx                            (~2300 L · onglets factures/paiements/recouvrement/contrats/...)
├─ venteData.ts                             (mocks restants : surtout VR_HISTORY)
├─ hooks/
│  ├─ useInvoices.ts                        (lecture liste + useInvoiceDetail + fetchInvoiceWithItems)
│  ├─ useInvoiceMutations.ts                (POST/PUT/DELETE/send)
│  ├─ useContracts.ts                       (lecture)
│  ├─ useSubscriptions.ts                   (lecture)
│  ├─ usePayments.ts                        (lecture)
│  ├─ usePaymentMutations.ts                (POST/DELETE)
│  ├─ useRecovery.ts                        (overdue + sendReminder + dossiers + dossiersByStage + criticalCount)
│  └─ useVenteClients.ts                    (lecture tiers CLIENT)
├─ schemas/
│  └─ invoiceFormSchema.ts                  (Zod 1ère utilisation V2 — refine dueDate ≥ date)
├─ modals/
│  ├─ ReminderModal.tsx                     (Template G 420px relance — canal/modèle/note)
│  ├─ PaymentModal.tsx                      (Template G 420px paiement — 6 champs + récap)
│  ├─ InvoiceFormModal.tsx                  (Template A Dialog 1000px + Zod + RHF + useFieldArray)
│  └─ SendInvoiceModal.tsx                  (Template G 460px envoi email + validation regex)
└─ utils/
   ├─ generateInvoicePDF.ts                 (jspdf lazy 425 kB · helper fmt sans NBSP · accepte items[])
   └─ exportInvoicesCSV.ts                  (papaparse lazy · BOM UTF-8 · délimiteur `;` Excel FR)
```

### Architecture backend (ce qui a été touché Session 11-bis)

```
trackyu-backend/src/
├─ routes/
│  ├─ financeRoutes.ts                      (+ GET /invoices/:id 2026-05-02)
│  └─ recoveryRoutes.ts                     (déjà existant : remind, mark-paid, partial-payment, history)
├─ controllers/
│  └─ financeController.ts                  (+ getInvoiceById 2026-05-02)
└─ repositories/
   └─ financeRepository.ts                  (+ findInvoiceById 2026-05-02)
```

### Mockups Design source de vérité

```
trackyu-front-V2/_design-source/_raw/
├─ tpl-views.jsx          (Template A · TplAFormInvoice — facture)
├─ tpl-views2.jsx         (Template G · TplGModal — modale 420px)
├─ tpl-data.jsx           (TPL_A_FORM, TPL_G_DATA)
├─ vc-billing-views.jsx   (VcInvoicesList, VcInvoiceDetail, VcRemindersBoard, VcReconciliation)
├─ vc-billing-data.jsx    (mocks vente-billing)
├─ vr-views.jsx           (VrOverview, VrDossiersList, VrDossierFocus, VrWorkflow)
└─ vr-data.jsx            (mocks recouvrement)
```

### Documentation

```
TRACKING/docs/design-system/
├─ STATE.md                                 (état temps réel — lire en 1er)
├─ CHANGELOG.md                             (journal versionné)
├─ CONTEXTE_SESSION_SUIVANTE.md             (ce fichier — passation FINANCE)
├─ modules/
│  ├─ _TEMPLATE.md                          (gabarit module)
│  ├─ FLEET.md                              (existant)
│  └─ FINANCE.md                            (créé Session 11-bis — spec module FINANCE V2 ~290 L)
├─ CHANTIER_REFONTE_DESIGN.md               (charter umbrella v0.5)
├─ DLS.md                                   (référence canonique tokens / composants V2)
├─ BLUEPRINT.md                             (brief Design des écrans)
└─ RBAC_MATRIX.md                           (matrice rôles × permissions)
```

---

## 🔌 ENDPOINTS BACKEND FINANCE — état complet

| Méthode     | Endpoint                                                     | Permission      | Statut                                  |
| ----------- | ------------------------------------------------------------ | --------------- | --------------------------------------- |
| GET         | `/api/v1/finance/invoices`                                   | VIEW_INVOICES   | ✅ live                                 |
| GET         | `/api/v1/finance/invoices/:id`                               | VIEW_INVOICES   | ✅ live (vérifié 2026-05-02 Session 12) |
| POST        | `/api/v1/finance/invoices`                                   | CREATE_INVOICES | ✅ live                                 |
| PUT         | `/api/v1/finance/invoices/:id`                               | EDIT_INVOICES   | ✅ live                                 |
| DELETE      | `/api/v1/finance/invoices/:id`                               | DELETE_INVOICES | ✅ live                                 |
| POST        | `/api/v1/finance/invoices/:id/send`                          | EDIT_INVOICES   | ✅ live                                 |
| GET         | `/api/v1/finance/invoices/:invoiceId/payment-history`        | VIEW_PAYMENTS   | ✅ live                                 |
| GET         | `/api/v1/finance/payments`                                   | VIEW_PAYMENTS   | ✅ live                                 |
| POST        | `/api/v1/finance/payments`                                   | CREATE_PAYMENTS | ✅ live                                 |
| DELETE      | `/api/v1/finance/payments/:id`                               | DELETE_PAYMENTS | ✅ live                                 |
| GET         | `/api/v1/recovery/overdue-invoices`                          | (auth)          | ✅ live                                 |
| GET         | `/api/v1/recovery/stats`                                     | (auth)          | ✅ live                                 |
| GET         | `/api/v1/recovery/invoices/:id/history`                      | (auth)          | ✅ live                                 |
| POST        | `/api/v1/recovery/invoices/:id/remind`                       | (auth)          | ✅ live (LOT 1 câblé UI)                |
| POST        | `/api/v1/recovery/invoices/:id/mark-paid`                    | (auth)          | ✅ live (UI volontairement non exposée) |
| POST        | `/api/v1/recovery/invoices/:id/partial-payment`              | (auth)          | ✅ live (à câbler dans Phase 2)         |
| **À CRÉER** | POST `/api/v1/recovery/invoices/:id/formal-notice`           | MANAGE_INVOICES | ⬜ Phase 2                              |
| **À CRÉER** | POST `/api/v1/recovery/invoices/:id/log-call`                | (auth)          | ⬜ Phase 2                              |
| **À CRÉER** | POST `/api/v1/recovery/invoices/:id/note`                    | (auth)          | ⬜ Phase 2                              |
| **À CRÉER** | POST `/api/v1/recovery/dossiers/:tierId/suspend-auto`        | MANAGE_INVOICES | ⬜ Phase 2                              |
| **À CRÉER** | POST `/api/v1/recovery/dossiers/:tierId/transfer-litigation` | MANAGE_INVOICES | ⬜ Phase 2                              |
| **À CRÉER** | POST `/api/v1/recovery/dossiers/:tierId/cancel`              | MANAGE_INVOICES | ⬜ Phase 2                              |

---

## 🗂️ DÉCISIONS ACTÉES — récap

| Date       | Décision                                                                            | Pourquoi                                                                   |
| ---------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 2026-05-02 | Pas de "Marquer comme payée" en UI                                                  | Rigueur comptable, traçabilité trésorerie                                  |
| 2026-05-02 | STANDARD retiré des catégories                                                      | 3 valeurs UI suffisantes (Installation/Abonnement/Autres ventes)           |
| 2026-05-02 | TVA dynamique selon `inv.vatRate`                                                   | Reflète le taux tenant à l'émission                                        |
| 2026-05-02 | Auto-Objet `{Type} {Catégorie}{ - PLATE}`                                           | Gain de saisie · port pattern legacy `generateSubject`                     |
| 2026-05-02 | InvoiceFormModal = Dialog 1000px (pas route)                                        | Édition fluide depuis liste sans perdre contexte                           |
| 2026-05-02 | Mobile Money 4 sous-types → enum unique `MOBILE_MONEY` + précision dans `reference` | Limitation backend actuelle (à enrichir Phase 2)                           |
| 2026-05-02 | jspdf + papaparse en dynamic import                                                 | Bundle initial VentePage 250 kB au lieu de 672 kB                          |
| 2026-05-02 | Items détaillés via GET /finance/invoices/:id                                       | Vraies multi-lignes dans PDF (vs synthèse 1 ligne)                         |
| 2026-05-02 | RBAC mismatch front (MANAGE_INVOICES) / back (CREATE/EDIT/DELETE_INVOICES)          | Backend rejette si fine perm manque, toast erreur · à harmoniser plus tard |

---

## 🛠️ COMMANDES UTILES

### Build

```powershell
# Frontend V2
cd c:\Users\ADMIN\Desktop\trackyu-front-V2
npm run build

# Backend
cd c:\Users\ADMIN\Desktop\trackyu-backend
npm run build
```

### Deploy

```powershell
cd c:\Users\ADMIN\Desktop\TRACKING

# Frontend V2 prod (live.trackyugps.com port 8082)
.\deploy-v2.ps1 -nobuild

# Backend prod (TOUJOURS -force)
.\deploy.ps1 -backend -nobuild -force

# Frontend legacy staging (si jamais)
.\deploy-staging.ps1 -nobuild

# Frontend legacy prod (legacy)
.\deploy.ps1 -frontend
```

### Vérif post-deploy

```powershell
# Frontend public
curl -s -o /dev/null -w "HTTP %{http_code} | %{time_total}s\n" https://live.trackyugps.com/

# Backend logs
ssh root@148.230.126.62 "docker logs trackyu-gps-backend-1 --tail 50"

# Backend SQL — vérifier mapping invoices.vat_rate
ssh root@148.230.126.62 "docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -c 'SELECT vat_rate, COUNT(*) FROM invoices GROUP BY vat_rate;'"
```

### Tests E2E manuels FINANCE V2

```
1. Aller sur https://live.trackyugps.com/vente?tab=factures
2. Cliquer 👁 → ✏ → 🗑 → 🔔 → 💰 → ↓ PDF → ✉ Email → ✂ Avoir
3. Toolbar : recherche · Statut · Catégorie · ResetFilters · Colonnes (toggle) · Exporter · + Nouvelle facture
4. Tab Recouvrement → Vue d'ensemble → Dossiers → Dossier client (sélecteur) → Workflow Kanban 5 étapes
```

---

## 📞 CONTACTS / ACCÈS

- **VPS prod** : `ssh root@148.230.126.62` (Hostinger ; KVM2 attendu mai 2026)
- **DB** : `postgres://fleet_user:fleet_password@localhost:5432/fleet_db` (depuis container postgres)
- **Compte test SUPERADMIN** : `superadmin@trackyugps.com`
- **Domaines** :
  - https://live.trackyugps.com — V2 prod (port 8082) ✅ chantier livré
  - https://trackyugps.com — V2 prod + redirect / → /landing
  - https://staging.trackyugps.com — staging legacy (pas V2)
  - https://v1.trackyugps.com — legacy port 8080

---

_Document de passation. Lire avant toute reprise du chantier FINANCE._
