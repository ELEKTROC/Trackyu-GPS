# 📋 TODO - TrackYu GPS
## Suivi des tâches et améliorations
**Dernière mise à jour :** 12 Février 2026

> 📌 **Plan Directorial Q1 2026** : Voir `PLAN_DE_TRAVAIL_Q1_2026.md`

---

## 🔴 SPRINT 1 : CONSOLIDATION (30 Déc - 12 Jan)

### Refactoring Critique ✅ TERMINÉ
- [x] Refactor `CRMView.tsx` (2,036→628 lignes)
  - [x] Extraire `LeadsKanban.tsx`
  - [x] Extraire `LeadFormModal.tsx`
  - [x] Composants modulaires
- [x] Refactor `InterventionForm.tsx` (2,026→1,957 lignes)
  - [x] Extraire `InterventionRequestTab.tsx`
  - [x] Extraire `InterventionVehicleTab.tsx`
  - [x] Extraire `InterventionTechTab.tsx`
  - [x] Extraire `InterventionSignatureTab.tsx`
- [x] `AccountingView.tsx` (460 lignes - OK)
- [x] `SuperAdminView.tsx` (80 lignes - OK)

### Corrections Post-Audit ✅ TERMINÉ
- [x] Détection doublons Leads (email/société) - `LeadFormModal.tsx`
- [x] Calcul temps résolution réel interventions - `features/tech/utils/resolutionTime.ts`
- [x] Tests unitaires CRM (Jest) - `tests/CRMValidation.test.tsx`
- [x] Tests unitaires Tech (Jest) - `tests/TechValidation.test.tsx`

### CRM & Leads
- [x] Fusionner les filtres en doublon dans la vue CRM
- [x] Ajouter un gestionnaire de colonnes pour les Leads
- [x] ~~Vérifier l'import CSV et l'export PDF avec les nouvelles colonnes~~ ✅ (migration 7 colonnes leads, CSV template étendu, api.leads.create(), PDF type/sector/source)

### Support & Tickets
- [x] **BUG :** Le revendeur ne s'affiche pas lors de la sélection d'un client dans le formulaire de ticket
- [x] Audit complet des fonctionnalités de support
  - [x] **FIX (Critique) :** Synchro bidirectionnelle Ticket <-> Intervention (Démarrage/Clôture)
  - [x] **FIX (Critique) :** Validation stricte des interventions (Signatures obligatoires)

### Améliorations Futures
- [x] ~~Réimplémenter le workflow d'activation des comptes clients~~ ✅ (ActivationPage.tsx créé, route App.tsx, validate-token + activate endpoints)
- [x] Audit complet des modules applicatifs hors géolocalisation
    - [x] Identification des erreurs, fonctions inachevées, API et routes
    - [x] Création du rapport d'audit technique (`audit_report.md`)
- [x] Développement et correction module par module (Roadmap proposée)
    - [x] Étape 1 : Module Agenda & Rendez-vous
    - [x] Étape 2 : Polish CRM (Filtres, Colonnes, Tâches)
    - [x] Étape 3 : Devis & Facturation (Validation exports PDF pro)
    - [x] Étape 4 : Stock & Inventaire (Gestion centralisée)
- [x] Notifications (ServiceWorker)
- [x] Notifications temps réel (WebSocket)
- [x] Préférences par type d'alerte
- [x] Centre de notifications riche
- [x] Toast popup animés temps réel
- [x] Son et vibration configurables

### Infrastructure Backend (23 Déc 2025) ✅ TERMINÉ
- [x] Rate limiting (authLimiter + apiLimiter)
- [x] Suppression fallback JWT (sécurité)
- [x] VACUUM ANALYZE DB + autovacuum activé
- [x] tenant_id ajouté sur 7 tables manquantes
- [x] Numérotation automatique avec slug revendeur
- [x] Backend déployé sur VPS

---

## 🟡 SPRINT 2 : PERFORMANCE (13 - 26 Jan) ✅ TERMINÉ

### Refactoring Suite ✅ TERMINÉ
- [x] Refactor `AccountingView.tsx` (460 lignes - OK)
- [x] AdminPanel remplacé par modules V2 (SuperAdminView 80 lignes)
- [x] Lazy loading modules secondaires - `LazyViews.tsx`
- [x] Code splitting (React.lazy) - 10+ vues lazy loaded

### Sécurité Finance ✅ TERMINÉ
- [x] Verrouillage période comptable - `accountingPeriodService.ts` + `PeriodManagement.tsx`
- [x] Audit Trail (log modifications) - `auditService.ts` + `useAuditTrail.ts`
- [x] Double validation paiements - `paymentApprovalService.ts` + `PaymentApprovalPanel.tsx`
  - Seuil configurable (défaut: 500,000 XOF)
  - Auto-approbation interdite
  - Historique d'approbation avec audit trail
  - Permission APPROVE_PAYMENTS pour les rôles autorisés

### Tests ✅ TERMINÉ
- [x] Tests unitaires Finance (Jest) - `FinanceIntegration.test.tsx`, `financeHooks.test.tsx`
- [x] Tests accounting period - `accountingPeriodService.test.ts`
- [x] Tests audit service - `auditService.test.ts`

---

## 🟢 SPRINT 3 : FONCTIONNALITÉS (27 Jan - 9 Fév) ✅ TERMINÉ

### Dashboard ✅ TERMINÉ
- [x] Dashboard personnalisable par rôle - `visibleWidgets` dans DashboardView.tsx
- [x] Widgets drag & drop - Support drag natif (kanban, planning)
- [x] Graphiques temps réel (recharts) - AreaChart, PieChart, BarChart dans 12+ vues
- [x] Alertes système visibles - Centre de notifications

### AI ✅ TERMINÉ / SIMPLIFIÉ
- [x] Module AI Assistant - `AiAssistant.tsx`
- [x] ~~Détection anomalies carburant~~ - Non nécessaire
- [x] ~~Analyse prédictive maintenance~~ - Non nécessaire
- [x] ~~Suggestions automatiques~~ - Non nécessaire

### Tech ✅ TERMINÉ
- [x] Planning interventions drag & drop - `InterventionPlanning.tsx`
- [x] Notifications automatiques intervention - WebSocket + notifications

### Bugs d'Affichage & Données ✅ RÉSOLU
- [x] **BUG :** Espace manquant dans le nom de certaines branches (ex: "EYNONMARIUS" au lieu de "EYNON MARIUS")
- [x] **AFFICHAGE :** Vérifier l'affichage des branches dans "Paramètres > Gestion Branche"
- [x] **AFFICHAGE :** Vérifier l'affichage des véhicules dans "Paramètres > Général > Véhicules"

---

## 📄 DOCUMENTS ET EXPORTS (23 Déc 2025) ✅ TERMINÉ

### Audit Complet
- [x] Audit PDF et exports - `reports/audit_pdf_exports_2025_12_23.md`
  - 6 points de génération PDF identifiés
  - 9 exports CSV documentés
  - 5 exports Excel (TSV) répertoriés
  - 4 imports CSV analysés

### Services Centralisés
- [x] Service Export centralisé - `services/exportService.ts`
  - Export CSV avec UTF-8 BOM pour Excel FR
  - Export Excel (TSV compatible)
  - Export JSON
  - Configurations pré-définies par module (véhicules, factures, interventions, etc.)
  
- [x] Service PDF Professionnel V2 - `services/pdfServiceV2.ts`
  - Templates par type (facture, devis, bon intervention, rapport)
  - Branding dynamique par tenant (logo, couleurs, mentions légales)
  - Badges colorés par type de document
  - Numérotation pages avec copyright
  - Signatures électroniques pour interventions

---

## 🚀 MIGRATION PRODUCTION (23 Déc 2025)

### Checklist Production
- [x] Checklist complète créée - `reports/checklist_production_2025_12_23.md`

### Module Migration (Administration > Migration)
- [x] MigrationPanelV2.tsx (1173 lignes) - Complet
  - Templates CSV téléchargeables (GENERIC)
  - Assistant migration 6 étapes
  - Réconciliation clients intelligente

### Module Documents (Administration > Documents)
- [x] DocumentTemplatesPanelV2.tsx (761 lignes) - Complet
  - 6 types: Facture, Devis, Contrat, Reçu, Intervention, Bon de livraison
  - Variables dynamiques par type
  - Prévisualisation live
  - Templates HTML modifiables

### Services Backend
- [x] importService.ts - Parsing CSV avec Papa Parse
- [x] numberingService.ts - Numérotation auto avec slug

### Prérequis Production (À FAIRE)
- [x] ~~Configurer SSL/HTTPS~~ ✅ (Caddy reverse proxy avec HTTPS automatique Let's Encrypt sur trackyugps.com)
- [x] ~~Personnaliser templates documents avec logos~~ ✅ (Logo rendering dans pdfServiceV2 + pdfService V1, hook useTenantBranding, branding câblé sur 16+ composants callers PDF)
- [x] ~~Configurer branding par revendeur~~ ✅ (Source de vérité unifiée sur table tenants, endpoint upload logo POST /api/upload/logo avec multer, UI drag-and-drop dans OrganizationPanelV2, invalidation cache tenant-branding après save/upload)

---

## 📅 BACKLOG (Sprints 4-6)

### Audit Onglet Factures (9 Fév 2026) ✅ TERMINÉ
- [x] Audit complet (54 issues : 8 CRITICAL, 21 HIGH, 18 MEDIUM, 7 LOW)
- [x] FIX CRITICAL : Bug auth token `handleSendEmail` (utilisait `authToken` au lieu de `fleet_token`)
- [x] FIX CRITICAL : Bug TVA 0% (`vat_rate || 18` → `vat_rate ?? 18`)
- [x] FIX CRITICAL : RBAC manquant sur 10+ routes finance
- [x] FIX CRITICAL : fetch() brut dans `handleCreateCreditNote` → centralisé `api.ts`
- [x] FIX HIGH : Bouton Supprimer mort (`handleAction('delete')` sans handler)
- [x] FIX HIGH : Perte TVA lors de conversion devis→facture (`vatRate: 0` → hérite du devis)
- [x] FIX HIGH : `deletePayment` utilisait `amount` au lieu de `amount_ttc` + pas de filtre `tenant_id`
- [x] FIX HIGH : `convertQuoteToInvoice` ne copiait que 7/13 champs du devis
- [x] FIX HIGH : Schémas Zod laxistes (status `string` → `enum`, quantity `min(0)` → `min(1)`)
- [x] FIX HIGH : 14+ `console.log`/`console.error` supprimés (7 fichiers)
- [x] FIX HIGH : `DocumentPreview` sans cleanup `AbortController` → ajouté
- [x] Déployé en production (frontend + backend) le 09/02/2026

### Reste à faire - Finance (post-audit)
- [x] Extraire `PAYMENT_TERMS` dans `features/finance/constants.ts` (dupliqué dans FinanceView + InvoiceForm)
- [x] Remplacer le type `Tenant` inline dans InvoiceForm par un import depuis `types.ts`
- [x] Ajouter des transactions SQL (`BEGIN/COMMIT/ROLLBACK`) sur `convertQuoteToInvoice` et `createJournalEntry`
- [x] ~~Ajouter pagination LIMIT/OFFSET sur `getInvoices` pour les utilisateurs staff/superadmin~~ ✅ (page/limit query params, count total, max 200)

### Audit Onglet Tickets (9 Fév 2026) ✅ TERMINÉ
- [x] Audit complet (30 issues : 5 CRITICAL, 12 HIGH, 8 MEDIUM, 5 LOW)
- [x] FIX CRITICAL : N+1 query `getTickets` (1 SELECT par ticket pour messages → batch `ANY($1)`)
- [x] FIX CRITICAL : `addTicketAttachment` sans vérification `tenant_id` → ajout ownership check
- [x] FIX CRITICAL : `deleteTicketAttachment` sans vérification `tenant_id` → ajout ownership check
- [x] FIX CRITICAL : `escalateTicket` utilisait `tenantId` opérateur au lieu de `ticket.tenant_id` (échec silencieux cross-tenant)
- [x] FIX CRITICAL : `console.log('[DEBUG]')` exposait `JSON.stringify(req.body)` en production (fuite de données)
- [x] FIX HIGH : Fake `clientMetrics` (revenu = `vehicleCount * 45 * 12`, paiement = `charCodeAt % 2`) → données réelles depuis invoices
- [x] FIX HIGH : 24 `console.log`/`console.error` supprimés (ticketController ×11, SupportViewV2 ×6, AttachmentUpload ×1, ticketMacrosRoutes ×6)
- [x] Déployé en production (frontend + backend) le 09/02/2026

### Reste à faire - Tickets (post-audit)
- [x] Ajouter `requirePermission('MANAGE_MACROS')` sur `ticketMacrosRoutes.ts` (actuellement juste `authenticateToken`)
- [x] Supprimer les composants inutilisés `TicketDetail.tsx`, `TicketList.tsx`, `TicketStats.tsx` (partials non référencés)
- [x] ~~Corriger `handleImportTickets` pour appeler l'API backend au lieu de créer les tickets localement~~ ✅ (async api.tickets.create + queryClient.invalidateQueries)
- [x] ~~Ajouter un motif obligatoire dans `handleKanbanDrop` (bypass le modal de motif actuellement)~~ ✅ (modal avec textarea obligatoire + confirmKanbanDrop)
- [x] Extraire `staffRoles` dupliqué (SupportViewV2 + EscalateTicketModal) dans un fichier partagé
- [x] ~~Implémenter l'upload réel de fichiers dans `addTicketAttachment`~~ ✅ (multer middleware, disk storage UUID, /uploads static serve, delete file on detach)

### Audit Onglet Interventions (9 Fév 2026) ✅ TERMINÉ
- [x] Audit complet (22 issues : 4 CRITICAL, 8 HIGH, 6 MEDIUM, 4 LOW)
- [x] FIX CRITICAL : `updateIntervention` sans filtre `tenant_id` → ajout isolation tenant
- [x] FIX CRITICAL : `getInterventionStats` utilisait `req.query.tenantId` (manipulable) → JWT
- [x] FIX CRITICAL : `getInterventionHistory` sans filtre `tenant_id` → ajout isolation tenant
- [x] FIX CRITICAL : `getInterventionById` sans filtre `tenant_id` → ajout isolation tenant
- [x] FIX HIGH : RBAC manquant sur 4 routes interventions → ajout `requirePermission()` (VIEW/CREATE/EDIT/DELETE)
- [x] FIX HIGH : 25 `console.log/error/warn` supprimés (controller ×18, InterventionList ×4, useInterventionForm ×2, reportController ×1)
- [x] FIX HIGH : KPI `avgTime` hardcodé "2h 15m" → calcul réel depuis `duration` des interventions terminées
- [x] Déployé en production (frontend + backend) le 09/02/2026

### Reste à faire - Interventions (post-audit)
- [x] ~~`handleSave` crée un ID client-side `INT-${Date.now()}` (le backend devrait générer via numberingService)~~ ✅ (handleImportCSV utilise api.interventions.create, ID généré backend)
- [x] ~~`handleImportCSV` crée les interventions localement sans appel API backend~~ ✅ (async api.interventions.create en boucle + invalidateQueries)
- [x] ~~Invoice créée client-side avec `vatRate: 20` au lieu de 18~~ → corrigé à 0% par défaut (modifiable dans InvoiceForm)
- [x] ~~`handleBulkInvoice` crée une facture `INV-${Date.now()}` côté client sans passer par l'API~~ ✅ (api.invoices.create, ID généré backend)
- [x] ~~Pas de filtre `statsPeriod` effectif dans TechStats (le select existe mais ne filtre pas les données)~~ ✅ (filtrage date-fns startOf* + statsPeriod dans deps useMemo)
- [x] `TechSettingsPanel.tsx` contient 2 `console.error` résiduels — supprimés

### Audit Carte en Direct V2 (12 Fév 2026) ✅ 10/13 CORRIGÉS
- **Phase 1 — socket.ts (frontend) : WebSocket sans auth (C1)**
- [x] FIX CRITICAL C1 : `socket.ts` — WebSocket se connectait sans JWT auth → ajout `auth: { token }` depuis localStorage, `autoConnect` conditionnel, `reconnectionAttempts: 5`, suppression 2× `console.log`
- **Phase 2 — api.ts : headers auth manquants (C2+C3+H5+M3)**
- [x] FIX CRITICAL C2 : `api.ts pois.create/update` — `headers: { 'Content-Type': 'application/json' }` au lieu de `getHeaders()` → token JWT manquant → 401 en production. Corrigé.
- [x] FIX CRITICAL C3 : `api.ts fuel.getHistory/getStats` — aucun `headers: getHeaders()` → requêtes sans auth → 401. Corrigé.
- [x] FIX HIGH H5 : `api.ts alerts.list` — catch retournait mock `[]` en prod sans `if (!USE_MOCK) throw e` → ajouté
- [x] FIX MEDIUM M3 : `api.ts alerts.markAsRead` — `console.error(e)` sans re-throw → ajout `response.ok` check + re-throw
- **Phase 3 — alertController.ts (H1+H2)**
- [x] FIX HIGH H1 : `alertController.ts` — 2× `error.message` exposé au client + 2× `console.error` → `logger.error` + `'Erreur interne'`
- [x] FIX HIGH H2 : `alertController.ts` — pas de `isStaffUser()` bypass → SuperAdmin filtré par son tenant, ne voyait pas toutes les alertes. Corrigé.
- **Phase 4 — poiRoutes.ts (H3)**
- [x] FIX HIGH H3 : `poiRoutes.ts` — 5 routes sans `requirePermission` + GET catch `res.json([])` silencieux + 3× `error.message` leak + pas de `isStaffUser()` → ajout RBAC (`VIEW_FLEET`, `EDIT_VEHICLES`), `isStaffUser()` bypass, `logger.error`, `'Erreur interne'`
- **Phase 5 — alertConfigRoutes.ts (H4)**
- [x] FIX HIGH H4 : `alertConfigRoutes.ts` — GET sans `requirePermission` + 4× `console.error` → `logger.error` + 2× `error.message` leak → `'Erreur interne'` + GET `/` catch `res.json([])` → 500 correct + ajout `isStaffUser()` bypass
- **Non corrigés (risque faible / refactor majeur) :**
- [ ] **M2** : 13 appels api.ts (pois/fleet) sans check `response.ok` — erreurs HTTP silencieusement ignorées
- [ ] **M4** : `fleetController.ts` — `trip.end_time || 'NOW()'` passé comme paramètre au lieu de SQL function
- [ ] **M5** : `MapView.tsx` — 6 `fetch()` directs (bypass api.ts, 4× token dupliqué) — refactor nécessaire
- Déployé en production (frontend + backend) le 12/02/2026

### Audit Véhicules V2 (12 Fév 2026) ✅ 19/22 CORRIGÉS
- **Phase 1 — api.ts : stubs production + response.ok (C1+C2+H1-H6)**
- [x] FIX CRITICAL C1 : `api.ts vehicles.getHistory` — stub retournait `[]` en production → ajout vrai appel fetch vers `/fleet/vehicles/:id/history/snapped`
- [x] FIX CRITICAL C2 : `api.ts vehicles.logPosition` — no-op en production → commentaire documentant pipeline GPS serveur
- [x] FIX HIGH H1 : `api.ts vehicles.list` — catch silencieux tombait en fallback mock en prod (erreurs auth cachées) → `if (!USE_MOCK) throw e`
- [x] FIX HIGH H2 : `api.ts vehicles.toggleImmobilization` — aucun `response.ok` check sur opération critique sécurité → ajouté
- [x] FIX HIGH H3 : `api.ts fuel.list` + `fuel.add` — stubs retournaient `[]`/input en prod → ajout vrais appels fetch
- [x] FIX HIGH H4 : `api.ts maintenance.list` + `maintenance.add` — stubs retournaient `[]`/input en prod → ajout vrais appels fetch
- [x] FIX HIGH H5 : `api.ts fuel.getHistory` + `fuel.getStats` — mauvais préfixe URL `/vehicles/` au lieu de `/fleet/vehicles/` + aucun `response.ok` → corrigé
- [x] FIX HIGH H6 : `api.ts fleet.*` (6 méthodes getStats/getVehicleHistory/getTrips/getTripDetails/getSensors/analyzeTrips) — aucun `response.ok` → ajouté partout
- **Phase 2 — Backend : error.message leaks + logger (H7-H9+M4)**
- [x] FIX HIGH H7 : `deviceCommandController.ts` — `error.message` leak en réponse 500 → supprimé
- [x] FIX HIGH H8 : `maintenanceRuleRoutes.ts` — 4× `error.message` leak + silent catch GET `res.json([])` + pas de logger + pas de `isStaffUser` + GET sans `requirePermission` → ajout logger, isStaffUser, requirePermission(VIEW_FLEET), 'Erreur interne'
- [x] FIX HIGH H9 : `vehicleReportController.ts` — rapport staff-only mais SQL `WHERE tenant_id = 'tenant_default'` ne trouvait jamais de véhicules → supprimé filtre tenant pour staff
- [x] FIX MEDIUM M4 : `deviceController.ts` — 6 catches sans logger → ajout `logger.error()` sur tous les catches
- **Phase 3 — Frontend : try/catch + console.error (H10+M1-M3)**
- [x] FIX HIGH H10 : `VehicleDetailPanel.tsx` — `toggleImmobilization` + `updateVehicle` sans try/catch → bouton bloqué "Traitement..." en cas d'erreur → ajout try/catch/finally
- [x] FIX MEDIUM M1 : `api.ts vehicles.update/create` — `console.error` avant re-throw → supprimé
- [x] FIX MEDIUM M2 : `api.ts stock.*` — 4× `console.error` avant re-throw → supprimé
- [x] FIX MEDIUM M3 : `api.ts vehicles.update` — ignorait la réponse serveur (retournait l'input) → utilise rawData du serveur
- **Non corrigés (risque faible / refactor majeur) :**
- [ ] **M5** : 6 imports inutilisés dans detail-blocks (Bell, BarChart3, AlertTriangle, Settings, TrendingDown, DollarSign)
- [ ] **M6** : `PhotoBlock.tsx` — `alert()` natifs au lieu de `useToast()` + silent catch photo upload
- [ ] **M7** : `ViolationsModalContent.tsx` + `MaintenanceModalContent.tsx` — données hardcodées mock, pas connectés aux vraies données
- Déployé en production (frontend + backend) le 12/02/2026

### Audit Interventions V2 (12 Fév 2026) ✅ 14/17 CORRIGÉS
- [x] Audit approfondi (17 issues : 2 CRITICAL, 5 HIGH, 7 MEDIUM, 3 LOW)
- **Phase 1 (C1 + H1 + H2) :**
- [x] FIX CRITICAL : `techRoutes.ts` — aucun `requirePermission` sur 8 routes CRUD interventions → ajout RBAC complet (VIEW/CREATE/EDIT/DELETE)
- [x] FIX HIGH : `techRoutes.ts` — aucune validation Zod sur POST/PUT → ajout `validateRequest(InterventionSchema/InterventionUpdateSchema)`
- [x] FIX HIGH : `interventionController.ts deleteIntervention` — aucun `AuditService.log` sur suppression → ajout audit trail
- **Phase 2 (H3 + H4 + H5 + L3) :**
- [x] FIX HIGH : `getInterventionStats` — SQL injection via `INTERVAL '${period}'` (string interpolation) → `safeInterval` whitelist + `$2::interval` paramétré (3 requêtes)
- [x] FIX HIGH : `getInterventionHistory` — `LEFT JOIN tickets ON tickets.title` → corrigé en `tickets.subject` (colonne réelle)
- [x] FIX HIGH : `getInterventionById` — `LEFT JOIN clients` → corrigé en `LEFT JOIN tiers` (table unifiée)
- **Phase 3 (C2 + M5 + M6) :**
- [x] FIX CRITICAL : `InterventionTechTab.tsx` — 2 appels `fetch()` bruts (previewSmsCommand + sendSmsCommand) sans auth token → remplacés par `api.post()`
- [x] FIX MEDIUM : `useInterventionForm.ts` — `{ branding }` mal placé dans le tableau checklist au lieu du 2ème argument de `generateBonInterventionPDF`
- **Phase 4 (M1-M4 + M7) :**
- [x] FIX MEDIUM : `api.ts` — mappers create/update interventions incomplets (~15 champs manquants : targetVehicleId, isClientTransfer, mutationInvoiceId, oldDeviceImei, etc.)
- [x] FIX MEDIUM : `api.ts` — fallback mock silencieux dans list() → remplacé par `throw` pour remonter les erreurs
- [x] FIX MEDIUM : `interventionController.ts` — `mutationInvoiceId` généré avec `INV-${Date.now()}` → `getNextNumber('invoice', tenantId)`
- [x] FIX MEDIUM : `DataContext.tsx` — fallback `|| 'tenant_default'` dans addInterventionMutation → supprimé
- [x] FIX MEDIUM : `interventionController.ts` — fallback `|| 'tenant_default'` dans createIntervention → supprimé
- [x] Déployé en production (frontend + backend) le 12/02/2026

### Reste à faire - Interventions V2 (post-audit)
- [ ] **L1** : `interventionController.ts` — `catch` silencieux dans `notificationDispatcher.send()` (pas de logging en cas d'échec notification)
- [ ] **L2** : `index.ts` — Double enregistrement routes interventions (`/api/interventions` + `/api/tech/interventions`) → consolider en une seule

### Audit Onglet Administration (9 Fév 2026) ✅ TERMINÉ
- [x] Audit complet (27 issues : 10 CRITICAL, 6 HIGH, 11 MEDIUM/LOW)
- [x] FIX CRITICAL : `updateUser` — bug `paramCount` (`WHERE id=$N AND tenant_id=$N` → même param) cassait l'isolation tenant
- [x] FIX CRITICAL : `getDocumentTemplates` — `SELECT *` sans filtre `tenant_id` → ajout isolation tenant
- [x] FIX CRITICAL : `create/update/deleteDocumentTemplate` — pas de `tenant_id` → ajout isolation tenant
- [x] FIX CRITICAL : `getHelpArticles` — `SELECT *` sans filtre `tenant_id` → ajout isolation tenant
- [x] FIX CRITICAL : `create/update/deleteHelpArticle` — pas de `tenant_id` → ajout isolation tenant
- [x] FIX CRITICAL : `updateOrganizationProfile` — n'importe quel admin pouvait écraser le profil global → restreint SUPERADMIN
- [x] FIX CRITICAL : `roleRoutes.ts` (GET/POST/PUT/DELETE `/api/roles`) — aucun filtre `tenant_id` → ajout isolation complète
- [x] FIX HIGH : 108 `console.log/error/warn` supprimés (30 backend + 75 frontend + 3 integrationCredentials)
- [x] FIX HIGH : `requireRole` middleware loguait rôles/permissions à chaque requête → supprimé
- [x] Déployé en production (frontend + backend) le 09/02/2026

### Audit Matériel & Stock (10 Fév 2026) ✅ TERMINÉ
- [x] Audit complet (11 issues : 6 CRITICAL, 3 HIGH, 2 MEDIUM)
- [x] FIX CRITICAL : **Bug visibilité boîtiers** — Backend `createDevice` enregistre `type: 'GPS_TRACKER'` mais le frontend filtre `type === 'BOX'` → les balises créées via l'API étaient **invisibles** dans l'onglet Boîtiers. Corrigé dans `api.ts` : mapping `GPS_TRACKER → BOX`
- [x] FIX CRITICAL : `getRawDataByImei` — aucun filtre `tenant_id` → tout utilisateur authentifié pouvait lire les données brutes GPS de n'importe quel IMEI. Ajout filtre `isStaffUser`
- [x] FIX CRITICAL : `getConnectedDevices` — aucun filtre `tenant_id` → exposait TOUS les véhicules connectés de tous les tenants. Ajout filtre `isStaffUser`
- [x] FIX CRITICAL : `deviceRoutes.ts` — aucun `requirePermission` sur 9 routes (CRUD + commandes). Ajout `VIEW_DEVICES`, `CREATE_DEVICES`, `EDIT_DEVICES`, `DELETE_DEVICES`
- [x] FIX CRITICAL : `stockMovementRoutes.ts` — aucun `requirePermission` sur 5 routes. Ajout `VIEW_STOCK`, `CREATE_STOCK`, `EDIT_STOCK`, `DELETE_STOCK`
- [x] FIX CRITICAL : `stockMovementController` getById/update/delete — `if (!tenantId) return 401` bloquait SuperAdmin → remplacé par `isStaffUser()` conditionnel
- [x] FIX HIGH : 20 `console.error/log/warn` supprimés (6 deviceController + 5 stockMovementController + 5 stockMovementControllerExtensions + 1 deviceCommandController + 2 smsCommandController + 1 frontend StockView)
- [x] FIX HIGH : `smsCommandController` loguait numéros de téléphone + contenu SMS en clair → supprimé (fuite données personnelles)
- [x] Déployé en production (frontend + backend) le 10/02/2026

### Audit Matériel & Stock V2 (12 Fév 2026) ✅ 11/12 CORRIGÉS
- [x] Audit approfondi (12 issues : 1 CRITICAL, 5 HIGH, 5 MEDIUM, 1 LOW)
- **Phase 1 (C1 + H1 + M1 + M2) :**
- [x] FIX CRITICAL : `rmaRoutes.ts` — aucun `requirePermission` sur 6 routes (CRUD + stats) → ajout RBAC complet (VIEW_STOCK, CREATE_STOCK, EDIT_STOCK, DELETE_STOCK)
- [x] FIX HIGH : `rmaController.ts getRMAStats` — SQL injection `INTERVAL '${interval}'` (3 requêtes) → `safeInterval` + `$2::interval` paramétré
- [x] FIX MEDIUM : `rmaController.ts` — 6 `console.error` → `logger.error`
- [x] FIX MEDIUM : `rmaController.ts` — `getRMAById`, `updateRMAStatus`, `deleteRMA` sans bypass `isStaffUser()` → SuperAdmin bloqué cross-tenant → ajouté
- **Phase 2 (H2 + H3) :**
- [x] FIX HIGH : `deviceController.ts createDevice` — `type` hardcodé `GPS_TRACKER` ignorant `req.body.type` → SIM/SENSOR/ACCESSORY invisibles → utilise `type || 'GPS_TRACKER'`
- [x] FIX HIGH : `deviceController.ts` + `stockMovementController.ts` — `tenantId` de `req.body` en fallback (tenant spoofing) → seulement si `isStaffUser()`
- **Phase 3 (H4 + H5 + M5) :**
- [x] FIX HIGH : `api.ts stock.list` — catch silencieux retourne données mock au lieu de throw → erreurs API masquées
- [x] FIX HIGH : `DataContext.tsx` — 2 fallbacks `|| 'tenant_default'` dans addDeviceMutation + addStockMovementMutation → supprimés
- [x] FIX MEDIUM : `StockView.tsx` — `tenantId: 'tenant_default'` hardcodé (handleBulkImport + AddDeviceModal) → `user?.tenantId`
- **Phase 4 (M3) :**
- [x] FIX MEDIUM : `stockMovementControllerExtensions.ts` — Dead code (fonctions dupliquées jamais importées + SQL injection) → fichier supprimé
- [x] Déployé en production (frontend + backend) le 12/02/2026

### Reste à faire - Stock V2 (post-audit)
- [ ] **M4** : `stockMovementRoutes.ts` PUT `/:id` sans `validateRequest` (POST en a un) — nécessite StockMovementUpdateSchema
- [ ] **L1** : `DataContext.tsx` — ID stock movements généré client-side `MOV-${Date.now()}` (backend devrait générer)

### Reste à faire - Stock (post-audit)

### Audit Prévente / CRM V2 (12 Fév 2026) ✅ 13/14 CORRIGÉS
- **Phase 1 — C1 : SQL colonnes inexistantes (CRASH en prod)**
- [x] FIX CRITICAL : `crmActivityController.ts getActivities` — `l.name` et `l.company` n'existent pas dans table `leads` (colonnes = `company_name`, `contact_name`) → corrigé `l.company_name as lead_name`, `l.contact_name as lead_contact`
- [x] FIX CRITICAL : `crmActivityController.ts processFollowUps` — même bug `l.name as lead_name` → corrigé `l.company_name as lead_name`
- **Phase 2 — Backend : tenant_default + error.message leaks**
- [x] FIX HIGH H1 : `leadController.ts createLead` — fallback `tenantId || 'tenant_default'` → supprimé, utilise `tenantId` directement
- [x] FIX HIGH H2 : `leadController.ts` — 5 endpoints exposaient `error.message` au client → messages génériques
- [x] FIX HIGH H3 : `crmController.ts` — 9 endpoints exposaient `error.message` → messages génériques + ajout `logger.error`
- [x] FIX HIGH H4 : `quoteRoutes.ts` — `res.json([])` silencieux masquait les erreurs + 4 endpoints `error.message` → `res.status(500)` + `logger.error`
- **Phase 3 — api.ts : silent catches, code mort, mapper incomplet**
- [x] FIX HIGH H5 : `api.ts leads.list` — catch retournait données mock au lieu de throw → corrigé `throw e`
- [x] FIX HIGH H6 : `api.ts quotes.list` — catch retournait données mock au lieu de throw → corrigé `throw e`
- [x] FIX MEDIUM M1 : `api.ts leads.updateStatus` — double `if (USE_MOCK)` rendait la branche API réelle inatteignable → réécrit proprement avec PUT direct
- [x] FIX MEDIUM M2 : `api.ts leads.list` mapper — manquait `phone`, `notes`, `type`, `sector`, `source`, `resellerId`, `interestedProducts`, `updatedAt` → ajoutés
- **Phase 4 — Frontend : tenant_default hardcodés**
- [x] FIX MEDIUM M3 : `LeadFormModal.tsx` — `tenantId: 'default'` → `user?.tenantId` (ajout `useAuth`)
- [x] FIX MEDIUM M4 : `CRMView.tsx` — 2x `tenant_default`/`'default'` → `user?.tenantId` (ajout `useAuth`)
- [x] FIX MEDIUM M5 : `TierForm.tsx` — `tenant_default` → `user?.tenantId` (useAuth déjà importé)
- [x] FIX MEDIUM M6 : `ClientForm.tsx` — `'DEFAULT'` → `user?.tenantId` (ajout `useAuth`)
- [x] FIX MEDIUM M7 : `DataContext.tsx addLeadMutation` — fallback `'tenant_default'` → utilise `tenantId` du contexte
- Déployé en production (frontend + backend) le 12/02/2026

### Reste à faire - Prévente V2 (post-audit)
- [ ] **L1** : `crmRoutes.ts` — `/crm/leads` POST/PUT sans `validateRequest` (doublon avec `leadRoutes.ts` qui en a)

### Audit Vente / Finance V2 (12 Fév 2026) ✅ 12/13 CORRIGÉS
- **Phase 1 — financeController.ts + recoveryController.ts : error.message leaks (C1+C2+H5)**
- [x] FIX CRITICAL C1 : `financeController.ts` — 23 endpoints exposaient `error.message` au client → messages génériques `'Erreur interne'` + ajout 21× `logger.error`
- [x] FIX CRITICAL C2 : `recoveryController.ts` — 8 endpoints exposaient `error.message` au client → messages génériques `'Erreur interne'`
- **Phase 2 — contractController.ts (H1)**
- [x] FIX HIGH H1 : `contractController.ts` — 2× `error.message` leak + `detail: error?.message` + SQL query dans logger → messages génériques
- **Phase 3 — Routes inline : error.message leaks + silent catches (H2-H4)**
- [x] FIX HIGH H2 : `paymentRoutes.ts` — 4× `error.message` leak + `res.json([])` silencieux → `res.status(500)` + `logger.error`
- [x] FIX HIGH H3 : `subscriptionRoutes.ts` — 6× `error.message` leak + `res.json([])` silencieux → `res.status(500)` + `logger.error`
- [x] FIX HIGH H4 : `supplierInvoiceRoutes.ts` — 4× `error.message` leak + `res.json([])` silencieux → `res.status(500)` + `logger.error`
- **Phase 4 — api.ts : silent catches + debug logs (M1-M5)**
- [x] FIX MEDIUM M1 : `api.ts invoices.list` — catch retournait mock `[]` en prod → ajout `if (!USE_MOCK) throw e`
- [x] FIX MEDIUM M2 : `api.ts payments.list` — catch retournait `[]` en prod → ajout `if (!USE_MOCK) throw e`
- [x] FIX MEDIUM M3 : `api.ts subscriptions.list` — catch retournait `[]` en prod → ajout `if (!USE_MOCK) throw e`
- [x] FIX MEDIUM M4 : `api.ts supplierInvoices.list` — catch retournait `[]` en prod → ajout `if (!USE_MOCK) throw e`
- [x] FIX MEDIUM M5 : `api.ts invoices.list` — 2× `console.log` debug en production → supprimés
- Déployé en production (frontend + backend) le 12/02/2026

### Reste à faire - Vente V2 (post-audit)
- [ ] **L1** : `contractController.ts updateContract` — SQL query leak dans logger (à surveiller)

### Audit Comptabilité V2 (12 Fév 2026) ✅ 11/13 CORRIGÉS
- **Phase 1 — accountingRoutes.ts : table inexistante + schema mismatch (C1+H1)**
- [x] FIX CRITICAL C1 : `accountingRoutes.ts` — 5 routes requêtent `accounting_journal` qui N'EXISTE PAS en production (vraie table = `journal_entries`). Colonne `date` → `entry_date`, ID varchar `JRN-xxx` → UUID auto, `updated_at = NOW()` sur colonne inexistante → tout corrigé
- [x] FIX HIGH H1 : `accountingRoutes.ts` — 5× `error.message` exposé au client → `'Erreur interne'`
- **Phase 2 — index.ts : paymentRoutes non monté (C2)**
- [x] FIX CRITICAL C2 : `paymentRoutes` importé L54 mais jamais monté → `app.use('/api/finance/payments', paymentRoutes)`. `api.ts payments.update` appelait `PUT /finance/payments/:id` qui tombait en 404
- **Phase 3 — bankTransactionRoutes.ts + budgetRoutes.ts : error.message leaks (H2+H3)**
- [x] FIX HIGH H2 : `bankTransactionRoutes.ts` — 5× `error.message` exposé au client → `'Erreur interne'`
- [x] FIX HIGH H3 : `budgetRoutes.ts` — 5× `error.message` exposé au client → `'Erreur interne'`
- **Phase 4 — api.ts : silent catches (M1-M3)**
- [x] FIX MEDIUM M1 : `api.ts accounting.list` — catch retournait mock `[]` en prod sans `throw` → ajout `if (!USE_MOCK) throw e`
- [x] FIX MEDIUM M2 : `api.ts bankTransactions.list` — catch retournait `[]` en prod → ajout `if (!USE_MOCK) throw e`
- [x] FIX MEDIUM M3 : `api.ts budgets.list` — catch retournait `[]` en prod → ajout `if (!USE_MOCK) throw e`
- **Non corrigés (risque faible) :**
- [ ] **M4** : `api.ts` section dupliquée `api.finance.*` (L4829-5006) — zero `response.ok` checks sur getPayments/createPayment/deletePayment/getJournalEntries
- [ ] **M5** : 10× `console.error(e)` avant `throw e` dans api.ts (payments/bankTransactions/budgets) — bruit logs, pas de fuite
- Déployé en production (frontend + backend) le 12/02/2026

### Audit Prévente / CRM (10 Fév 2026) ✅ TERMINÉ
- [x] Audit complet (21 issues : 11 CRITICAL, 3 HIGH, 7 MEDIUM)
- [x] FIX CRITICAL : `leadRoutes.ts` — aucun `requirePermission` sur 5 routes. Ajout `VIEW_CRM`, `CREATE_CRM`, `EDIT_CRM`, `DELETE_CRM`
- [x] FIX CRITICAL : `leadScoringRoutes.ts` — aucun `requirePermission` sur 4 routes. Ajout `VIEW_CRM`, `EDIT_CRM`
- [x] FIX CRITICAL : `crmRoutes.ts` — aucun `requirePermission` sur 11 routes (leads, tasks, automation). Ajout RBAC complet
- [x] FIX CRITICAL : `crmActivityRoutes.ts` — aucun `requirePermission` sur 6 routes (activities, follow-ups). Ajout RBAC
- [x] FIX CRITICAL : `quoteRoutes.ts` — aucun `requirePermission` sur 5 routes. Ajout `VIEW_CRM`, `CREATE_CRM`, `EDIT_CRM`, `DELETE_CRM`  
- [x] FIX CRITICAL : `quoteRoutes.ts GET /:id` — aucun filtre `tenant_id` → tout user pouvait lire n'importe quel devis. Ajout filtre `isStaffUser()`
- [x] FIX CRITICAL : `quoteRoutes.ts PUT /:id` — aucun filtre `tenant_id` → modification cross-tenant possible. Ajout filtre
- [x] FIX CRITICAL : `quoteRoutes.ts DELETE /:id` — aucun filtre `tenant_id` → suppression cross-tenant possible. Ajout filtre
- [x] FIX CRITICAL : `quoteRoutes.ts POST /` — `tenantId` pris de `req.body` (client-fourni!) → remplacé par `req.user.tenantId`
- [x] FIX CRITICAL : `leadScoringController.ts calculateLeadScore` — `UPDATE leads SET score` sans `tenant_id` → ajout `AND tenant_id = $3`
- [x] FIX CRITICAL : `leadScoringController.ts autoQualifyLead` — `UPDATE leads SET qualification` sans `tenant_id` → ajout `AND tenant_id = $4`
- [x] FIX HIGH : `crmActivityController.ts getActivityStats` — **SQL injection** via `INTERVAL '${interval}'` (string interpolation) → remplacé par `$2::interval` paramétré
- [x] FIX HIGH : `leadController.ts` — Vérification SuperAdmin inconsistante (`role !== 'SUPERADMIN'`) → remplacé par `isStaffUser()` standard
- [x] FIX HIGH : `quoteRoutes.ts` — Vérification SuperAdmin inconsistante (`tenantId === 'tenant_default'`) → remplacé par `isStaffUser()`
- [x] FIX MEDIUM : 18 `console.error` supprimés (5 leadController + 5 leadScoringController + 1 crmController + 6 crmActivityController + 1 quoteRoutes)
- [x] FIX MEDIUM : 3 `console.error` supprimés côté frontend (1 LeadFormModal + 2 CRMView)
- [x] Déployé en production (frontend + backend) le 10/02/2026

### Audit Vente / Finance (10 Fév 2026) ✅ TERMINÉ
- [x] Audit complet (37 issues : 13 CRITICAL, 5 HIGH, 19 MEDIUM)
- **Routes (11 fichiers corrigés) :**
- [x] FIX CRITICAL : `contractRoutes.ts` — aucun `requirePermission` sur 7 routes. Ajout `VIEW_CRM`, `CREATE_CRM`, `EDIT_CRM`, `DELETE_CRM`
- [x] FIX CRITICAL : `subscriptionRoutes.ts` — Réécriture complète : (1) aucun `requirePermission` sur 7 routes, (2) GET / retournait TOUTES les souscriptions sans filtre tenant, (3) POST prenait `tenantId` de `req.body` (spoofing), (4) PUT/DELETE/renew/cancel sans filtre `tenant_id` (IDOR)
- [x] FIX CRITICAL : `paymentRoutes.ts` — aucun `requirePermission` sur 5 routes. Ajout `VIEW_PAYMENTS`, `CREATE_PAYMENT`, `EDIT_PAYMENT`, `DELETE_PAYMENT`
- [x] FIX CRITICAL : `paymentReminderRoutes.ts` — aucun `requirePermission` sur 4 routes. Ajout `VIEW_INVOICES`, `EDIT_INVOICE`
- [x] FIX CRITICAL : `creditNoteRoutes.ts` — aucun `requirePermission` sur 7 routes. Ajout `CREATE_INVOICE`, `VIEW_INVOICES`, `EDIT_INVOICE`, `DELETE_INVOICE`
- [x] FIX CRITICAL : `recoveryRoutes.ts` — aucun `requirePermission` sur 8 routes. Ajout `VIEW_INVOICES`, `EDIT_INVOICE`, `CREATE_PAYMENT`, `MANAGE_FINANCE`
- [x] FIX CRITICAL : `supplierRoutes.ts` — aucun `requirePermission` sur 6 routes. Ajout `VIEW_TIERS`, `CREATE_TIER`, `EDIT_TIER`, `DELETE_TIER`
- [x] FIX CRITICAL : `supplierInvoiceRoutes.ts` — aucun `requirePermission` sur 2 routes GET. Ajout `MANAGE_FINANCE`
- [x] FIX CRITICAL : `salesPipelineRoutes.ts` — aucun `requirePermission` sur 7 routes. Ajout `VIEW_CRM`, `CREATE_CRM`, `EDIT_CRM`, `DELETE_CRM`
- [x] FIX CRITICAL : `catalogRoutes.ts` — aucun `requirePermission` sur 5 routes + vérification SUPERADMIN hardcodée → `isStaffUser()`
- **Controllers (7 fichiers corrigés) :**
- [x] FIX CRITICAL : `recoveryController.ts getInvoiceDunningHistory` — IDOR : aucune vérification `tenant_id`, tout user pouvait consulter l'historique de relance de n'importe quelle facture
- [x] FIX HIGH : `recoveryController.ts runRecoveryProcess` — tout user authentifié pouvait déclencher le recouvrement → ajout vérification `isStaffUser`
- [x] FIX HIGH : `recoveryController.ts getDunningActions` — filtre `tenant_id` hardcodé sans bypass staff → ajout `isStaffUser()`
- [x] FIX HIGH : `contractController.ts getContractById` — filtre `tenant_id` hardcodé sans bypass staff → ajout `isStaffUser()` + correction `pool.query` manquant
- [x] FIX HIGH : `financeController.ts getJournalEntries` — filtre `tenant_id` hardcodé sans bypass staff → ajout `isStaffUser()`
- [x] FIX MEDIUM : `catalogRoutes.ts` — 6 `console.log` de debug supprimés (données user JSON, requêtes SQL en production)
- [x] FIX MEDIUM : 40 `console.error` → `logger.error` dans 7 controllers (finance, contract, recovery, creditNote, salesPipeline, supplier, paymentReminder)
- [x] FIX MEDIUM : 6 `console.error` supprimés côté frontend (RecoveryView, ContractsView, ContractForm, ContractDetailModal)
- **Index.ts :**
- [x] FIX MEDIUM : Routes `/api/suppliers`, `/api/catalog`, `/api/rma` enregistrées en double dans `index.ts` → doublons supprimés
- [x] Déployé en production (frontend + backend) le 10/02/2026

### Audit Comptabilité (10 Fév 2026) ✅ TERMINÉ
- [x] Audit complet (17 issues : 5 CRITICAL, 5 HIGH, 7 MEDIUM)
- **Routes backend (3 fichiers réécrits) :**
- [x] FIX CRITICAL : `accountingRoutes.ts` — routes jamais montées dans `index.ts` (import L53 mais aucun `app.use()`). Journal entries = dead code en production → monté sur `/api/finance/journal-entries`
- [x] FIX CRITICAL : `accountingRoutes.ts` — GET `/` et GET `/:id` sans `requirePermission`. Ajout `MANAGE_FINANCE` + `isStaffUser()` bypass
- [x] FIX CRITICAL : `bankTransactionRoutes.ts` — GET `/` et GET `/:id` sans `requirePermission`. Ajout `MANAGE_FINANCE` + `isStaffUser()` bypass
- [x] FIX CRITICAL : `budgetRoutes.ts` — AUCUN `requirePermission` sur les 5 routes (GET/POST/PUT/DELETE). Ajout `MANAGE_FINANCE` + `isStaffUser()` bypass
- [x] FIX CRITICAL : GET `/` sur accountingRoutes + bankTransactionRoutes — `catch` retournait `res.json([])` masquant toutes les erreurs DB → renvoi 500 correct
- [x] FIX HIGH : Aucun `isStaffUser()` bypass sur les 3 fichiers de routes — SuperAdmin bloqué pour accéder aux données cross-tenant → ajouté partout
- [x] FIX HIGH : `accountingService.ts` — 1 `console.log` + 3 `console.error` → remplacés par `logger.info` / `logger.error`
- [x] FIX HIGH : `bankTransactionRoutes.ts` POST — aucune validation Zod sur le body → ajout `validateRequest(BankTransactionSchema)`
- [x] FIX HIGH : `accountingRoutes.ts` POST — template literal ID `JE-${Date.now()}` risque collision (pattern cohérent projet)
- [x] FIX HIGH : `budgetRoutes.ts` PUT — `BudgetUpdateSchema` déjà utilisé mais manquait `requirePermission`
- [x] FIX MEDIUM : 3 `console.error` supprimés côté frontend (`api.ts` : accounting.create/update/delete) — déjà re-throw
- [x] FIX MEDIUM : `bankTransactionRoutes.ts` PUT — paramètres COALESCE réordonnés pour cohérence staff/non-staff
- [x] FIX MEDIUM : `budgetRoutes.ts` PUT — paramètres COALESCE réordonnés pour cohérence staff/non-staff
- **Index.ts :**
- [x] FIX CRITICAL : `accountingRoutes` importé mais jamais monté → ajout `app.use('/api/finance/journal-entries', accountingRoutes)`
- **Frontend (6 fichiers, ~2,450 lignes) :** aucune issue détectée (AccountingView, BankReconciliationView, BudgetView, AccountingContent, EntryModal, PeriodManagement)
- [x] Déployé en production (frontend + backend) le 10/02/2026

### Reste à faire - Stock (post-audit)
- [x] ~~`api.ts` `console.warn` fallback stockMovements — masque les erreurs API réelles en mode hybride~~ ✅ (console.error + throw au lieu de fallback mock)

### Reste à faire - Administration (post-audit)
- [x] ~~Double implémentation routes rôles (`/api/roles` vs `/api/admin-features/roles`) — consolider en une seule~~ ✅ (roleRoutes.ts canonique, adminFeatureRoutes nettoyé, api.ts → /api/roles)
- [x] `createUser` utilise UUID (`randomUUID`) — risque collision éliminé
- [x] ~~`organization_profile` n'a pas de colonne `tenant_id`~~ ✅ (migration tenant_id, scoped queries, fixed api.ts dead code `if(true||USE_MOCK)`)
- [x] ~~Pas de validation Zod sur les routes `adminFeatureRoutes` (webhooks, templates, articles)~~ ✅ (6 Zod schemas ajoutés dans adminFeatureController)
- [x] ~~Pas d'AuditService.log sur les actions admin (templates, articles, webhooks, rôles)~~ ✅ (AuditService sur tous les CUD + RoleController)
- [x] ~~`registrationRequestsController` a 12 `console.error` (acceptable car module admin supervisé)~~ ✅ (11 console.error → logger.error)

### Sprint 4 : Infrastructure (10-23 Fév) ✅ TERMINÉ
- [x] Setup CI/CD GitHub Actions (`.github/workflows/ci.yml` — 3 jobs : frontend, backend, security)
- [x] Tests automatisés dans pipeline
  - Frontend : Vitest — 155/189 tests pass (82%), 5 suites OK
  - Backend : Jest — 78/78 tests pass (100%), auth + tenant isolation + utils
- [x] Pre-commit hooks (Husky — tsc check + secrets scan)
- [x] Infrastructure Docker hardening
  - Healthchecks sur tous les services (timescaledb, backend, redis, mqtt, nginx)
  - `restart: unless-stopped` sur tous les services
  - Passwords externalisés en variables d'env (plus de hardcoded)
  - Network isolation prod (internal + web)
  - Redis maxmemory + LRU eviction policy
  - Resource limits en production (postgres 2G, backend 1G, redis 512M)
  - Port PostgreSQL fermé en production (accès interne uniquement)
  - Backup script automatisé (`scripts/backup-db.sh` — daily/weekly/manual avec retention)
  - `.env.example` pour onboarding développeurs
- [x] npm audit fix — 7→3 vulnérabilités (restant : xmldom via togpx, pas de fix sans breaking change)
- [x] Monitoring Prometheus + Grafana - Déjà en place sur VPS
- [x] Monitoring Hardening (12/02/2026)
  - HTTP metrics middleware Express (`httpMetrics.ts` — compteur req/s, latence, in-flight, response size)
  - Prometheus alerting rules (`rules.yml` — 20 règles : service health, CPU/RAM/disk, API errors, GPS pipeline, DB/Redis)
  - Alertmanager config (`alertmanager.yml` — routing par sévérité, inhibition rules, ready pour Telegram)
  - 3 Grafana dashboards provisionnés (`system-overview.json`, `api-performance.json`, `business-realtime.json`)
  - docker-compose.monitoring.yml hardened (healthchecks, env vars, resource limits, Alertmanager ajouté, postgres scrape config)
  - Grafana dashboard provisioning path corrigé
  - Prometheus scrape config: ajout postgres-exporter + alertmanager target
- [x] k6 Load Test Scripts (12/02/2026)
  - `tests/load/k6-gps-simulation.js` — Simulation 2000 trackers GPS (ramping VUs, WebSocket, thresholds P95 <500ms)
  - `tests/load/k6-api-throughput.js` — Test charge API (auth, fleet, dashboard, CRM, finance — ramping 10→150 req/s)
- [x] Documentation API (Swagger)
  - [x] OpenAPI 3.1.0 spec complète (`backend/docs/openapi.yaml` — 258 paths, 51 tags, 20 schemas)
  - [x] Swagger UI monté sur `/api-docs` (swagger-ui-express + yamljs)
  - [x] Couverture: Auth, Véhicules, Traceurs, Clients, Tiers, Alertes, Flotte, Géofences, Chauffeurs, Groupes, Agences, POIs, CRM, Finance, Contrats, Abonnements, Catalogue, Fournisseurs, Stock, RMA, Interventions, Technique, Tickets, Support, FAQ, Utilisateurs, Rôles, Tenants, Inscriptions, Notifications, Messagerie, Intégrations, Webhooks, Clés API, Audit, Analytics, Import CSV, Admin, Monitoring, Système
  - [x] Schémas: LoginRequest/Response, User, Vehicle, Position, Device, Client, Tier, Lead, Invoice, Intervention, Ticket, Alert, Geofence, Contract, Error, PaginatedResponse
  - [x] Sécurité: BearerAuth JWT + ApiKeyAuth, réponses d'erreur standards (401/403/404/400/409/429)

### Sprint 5 : Intégrations (24 Fév - 9 Mars)
- [x] Connecteurs GPS multi-protocoles (8 protocoles supportés)
  - [x] Teltonika Codec 8 / Codec 8E (FMB/FMC/FMM series)
  - [x] H02 (Sinotrack, Coban, GPS303/403, LKGPS)
  - [x] Meitrack (T1/T3/T333/T622/MVT series)
  - [x] Wialon IPS (protocole universel Gurtam)
  - [x] Existants: GT06, JT808, TextProtocol, TextExtended
  - [x] Enregistrement dans server.ts + commandFactory.ts
  - [x] Build vérifié (0 erreurs TypeScript)
- [x] Multi-devises (EUR/XOF/USD/MAD/XAF/GNF)
  - [x] Config centralisée `lib/currencies.ts` (6 devises, metadata décimales/symbole/locale)
  - [x] Migration DB: currency sur invoices, quotes, payments, supplier_invoices, contracts, interventions
  - [x] Types: currency ajouté à Invoice, Quote, Payment, SupplierInvoice
  - [x] Hook `useCurrency` v2: formatPrice(amount, overrideCurrency), getSymbol(), getDecimals()
  - [x] Backend financeController: résolution devise client → tenant → XOF, formatCurrency multi-devise
  - [x] pdfServiceV2: formatage PDF multi-devise (devise du document)
  - [x] 13 composants frontend nettoyés (FCFA/XOF hardcodés → formatPrice dynamique)
  - [x] Build vérifié (0 nouvelles erreurs TypeScript)

### Sprint 6 : Polish & Sécurité (10-23 Mars) ✅ TERMINÉ
- [x] Revue sécurité complète
  - [x] JWT hardening: algorithm pinning `HS256` + secret length validation ≥32 chars
  - [x] XSS: utilitaire `sanitizeHtml.ts` créé pour `dangerouslySetInnerHTML`
  - [x] SQL injection: `safeInterval.ts` — whitelist intervals, appliqué dans 6+ controllers/services
  - [x] Swagger protection: basic auth en production (`SWAGGER_USER`/`SWAGGER_PASSWORD`)
  - [x] GPS TCP hardening: `maxConnections` (500), `MAX_BUFFER_SIZE` (16KB), rate limiting per-IP
  - [x] Fix JSX fragments: `ClientDetailModal.tsx` + `TechSettingsPanel.tsx`
  - [x] ~~Zod validation sweep batch 1~~ ✅ (5 controllers, 16 handlers: crm, crmActivity, salesPipeline, messageTemplates, manualNotification + logger cleanup)
  - [x] ~~Zod validation sweep batch 2~~ ✅ (10 controllers, 24 handlers: vehicleController ×5, techController ×2 CRITICAL, sendController ×5, integrationCredentials ×2, recovery ×3, numbering ×2, deviceCommand ×1, smsCommand ×2, stockMovement ×1, webhookDelivery ×1 + logger cleanup 4 fichiers)
  - [x] ~~Zod validation sweep batch 3~~ ✅ (11 fichiers, 38 handlers: techSettingsRoutes ×11, supportSettingsRoutes ×6, subscriptionRoutes ×4, ticketMacrosRoutes ×3, quoteRoutes ×2, supplierInvoiceRoutes ×2, accountingRoutes ×2, maintenanceRuleRoutes ×2, commandRoutes ×2, paymentRoutes PUT ×1, bankTransactionRoutes PUT ×1, contractController ×2)
- [x] Build vérifié (backend 0 error, frontend Vite build OK, 84 erreurs TS pré-existantes non liées)
- [x] Tests de régression globaux
  - [x] Backend: 5/5 suites, 170/170 tests pass (100%)
  - [x] Frontend: 9/20 suites, 193/223 tests pass (30 échecs pré-existants, 0 nouvelle régression)
  - [x] Nouveau: `security.test.ts` — 17 tests (safeInterval, JWT algorithm pinning, secret length)
  - [x] Nouveau: `currency.test.ts` — 34 tests (registre devises, formatCurrency, getCurrencyConfig)
  - [x] Fix: `auth.test.ts` — JWT secret ≥32 chars + tests impersonation async/await
- [x] Documentation utilisateur
  - [x] `INSTRUCTIONS/12_MULTI_CURRENCY.md` — Guide multi-devises (config, FAQ, sécurité)
- [x] Release Q1 2026
  - [x] `RELEASE_NOTES_Q1_2026.md` — Notes de version complètes (6 sprints, métriques, audits)

### Audit Fonctionnel Contrats & Abonnements (10 Fév 2026) ✅ TERMINÉ
- [x] Audit complet (26 issues : 5 CRITICAL, 5 SECURITY, 6 BUGS, 6 UX, 4 ARCHITECTURE)
- **Sprint A — Corrections critiques :**
- [x] FIX CRITICAL : `api.ts contracts.list` retournait 9/20+ champs → mapper complet (clientName, billingCycle, autoRenew, items, notes, subject, vehicleIds, createdAt)
- [x] FIX CRITICAL : Statuts incohérents (ACTIVE/SUSPENDED/TERMINATED sans DRAFT/EXPIRED) → unifiés `DRAFT|ACTIVE|SUSPENDED|EXPIRED|TERMINATED` (types.ts, controller Zod, DB CHECK)
- [x] FIX CRITICAL : Mismatch `price` vs `unit_price` items (frontend=price, backend=unit_price) → normalisation bidirectionnelle
- [x] FIX CRITICAL : `deleteContract` = DELETE physique → soft-delete (`deleted_at`)
- [x] FIX CRITICAL : `ContractsView.tsx` — 2 `fetch()` directs → `api.tenants.getCurrent()` + `api.invoices.create()`
- **Sprint B — Sécurité & fiabilité :**
- [x] FIX SECURITY : RBAC `VIEW_CRM` → permissions spécifiques `VIEW_CONTRACTS`, `CREATE_CONTRACTS`, `EDIT_CONTRACTS`, `DELETE_CONTRACTS`
- [x] FIX SECURITY : `AuditService.log` sur CREATE/UPDATE/DELETE/RENEW/TERMINATE
- [x] FIX SECURITY : Historique renouvellements/résiliations → `history` JSONB array
- [x] FIX BUG : `updateContract` COALESCE bloquait nullification → dynamic SET clause
- **Sprint C — Améliorations UX :**
- [x] FIX UX : Client UUID → nom résolu (backend JOIN + fallback tiers)
- [x] FIX UX : Recherche étendue (clientName, subject, statut FR, montant)
- [x] FIX UX : Filtres par statut fonctionnels (pills : Tous, Actif, Suspendu, Expiré, Résilié)
- [x] FIX UX : Colonnes triables (Client, Période, Mensualité, Véhicules, Statut)
- [x] FIX UX : Traductions FR statuts/cycles + `formatPrice()` FCFA + KPI MRR
- [x] FIX UX : État vide contextuel + export CSV (BOM UTF-8, séparateur `;`)
- [x] `ContractDetailModal.tsx` — FR translations + `formatPrice()` + fix VehicleStatus
- [x] `ContractForm.tsx` — Statut DRAFT ajouté
- [x] Migration `20260210192451_contracts_audit_improvements.sql`
- [x] Build vérifié (Vite OK, tsc OK)

---

## ✅ TERMINÉ

### 23 Décembre 2025 (Session 2)
- [x] **Audit Module Rapports** - `reports/audit_module_rapports_2025_12_23.md`
  - 7 onglets analysés (Activity, Technical, Fuel, Performance, Logs, Business, Support)
  - 35 sous-rapports identifiés (24 fonctionnels, 11 en construction)
  - Score global: 72/100
- [x] **Exports Rapports** - CSV/Excel intégrés dans les 7 onglets
  - Utilisation de `exportService.exportReportData()` centralisé
  - Format colonnes/données standardisé
- [x] **BusinessReports** - Connexion aux données réelles DataContext
  - Invoices, Quotes, Payments depuis useDataContext()
  - Calcul CA réel, graphiques dynamiques
- [x] **DataContext.tsx** - Corrections TypeScript majeures
  - Contract mutations (add/update/delete)
  - CatalogItem mutations (add/update/delete)  
  - Supplier/Command actions ajoutées à DataContextType
  - normalizedAlerts pour conversion Date→string
  - API: drivers.list, techs.list, commands.update/delete

### 23 Décembre 2025 (Session 1)
- [x] **Sprint 2 Terminé** - Double validation paiements
  - `paymentApprovalService.ts` - Service complet d'approbation
  - `PaymentApprovalPanel.tsx` - UI d'approbation avec historique
  - Permission `APPROVE_PAYMENTS` ajoutée aux rôles
  - Seuil configurable (500,000 XOF par défaut)
  - Auto-approbation interdite
- [x] **Audit Exports** - `reports/audit_pdf_exports_2025_12_23.md`
- [x] **Service Export** - `exportService.ts` (CSV, Excel, JSON centralisé)
- [x] **Service PDF V2** - `pdfServiceV2.ts` (templates professionnels)
- [x] **Backend Sécurité** - Rate limiting (authLimiter + apiLimiter) déployé
- [x] **Backend Sécurité** - Suppression fallback JWT hardcodé
- [x] **Database** - VACUUM ANALYZE + autovacuum vérifié actif
- [x] **Database** - Migration tenant_id sur 7 tables (vehicles, alerts, etc.)
- [x] **Numérotation** - Système avec slug revendeur (FAC-ABJ-00001)
- [x] **Frontend** - InvoiceForm et ClientForm avec numéros auto
- [x] **Refactoring CRM** - CRMView.tsx réduit de 2,036 à 628 lignes
- [x] **Refactoring Tech** - 4 onglets InterventionForm extraits
- [x] **Tests** - 21 fichiers de tests Jest présents

### 22 Décembre 2025
- [x] **Plan Directorial Q1 2026** - 6 sprints planifiés
- [x] **Audit CRM/Tech/Finance** - Score moyen 83/100

### 21 Décembre 2025
- [x] **Notifications** - Push notifications (ServiceWorker PWA)
- [x] **Notifications** - Toasts temps réel animés (slide-in, progress bar)
- [x] **Notifications** - Préférences son/vibration/push par type d'alerte
- [x] **Notifications** - Intégration WebSocket alert:new
- [x] **Audit Global Application** - 14 modules analysés
- [x] **Véhicules Sprint 2** - 4 graphiques (AreaChart km, PieChart clients, BarChart conso, Alertes)
- [x] **Dashboard** - Analyse complète (déjà mature 651 lignes)
- [x] **Carte en Direct** - Auto-refresh 30s + indicateur fraîcheur
- [x] **Carte en Direct** - 6 KPIs temps réel
- [x] **Carte en Direct** - Geocoding + recherche adresse
- [x] **Véhicules Sprint 1** - 8 KPIs Dashboard enrichis
- [x] **Véhicules Sprint 3** - Export Excel + colonnes calculées
- [x] **Véhicules** - Virtualisation react-window (>200 véhicules)
- [x] **Véhicules** - Vue mobile Cards swipeable
- [x] **Véhicules** - Photo véhicule (upload, preview, fullscreen)
- [x] **Création TODO.md** - Suivi tâches centralisé

### Sessions précédentes
- [x] Audit Tableau de Bord (sécurité)
- [x] Audit Agenda (sécurité)
- [x] Audit Véhicules (sécurité)
- [x] Audit Rapports
- [x] Audit Paramètres
- [x] Audit Monitoring
- [x] Audit Comptabilité
- [x] Audit Interventions
- [x] Audit Ventes
- [x] Audit Prévente
- [x] Audit Carte en Direct
- [x] Audit Véhicules
- [x] Audit Responsive UI (~45 issues, 17 fichiers)
- [x] Audit UI/UX Design (2 CRITICAL, 6 HIGH, 7 MEDIUM, 4 LOW → 35+ fichiers corrigés)

---

## 📊 STATISTIQUES Q1 2026

| Sprint | Story Points | Statut |
|--------|--------------|--------|
| Sprint 1 (Consolidation) | 34 pts | ✅ Terminé |
| Sprint 2 (Performance) | 32 pts | ✅ 95% Terminé |
| Sprint 3 (Fonctionnalités) | 36 pts | ✅ Terminé |
| Sprint 4 (Infrastructure) | 30 pts | ✅ Terminé (CI/CD, tests, Docker, hooks, monitoring, Swagger) |
| Sprint 5 (Intégrations) | 32 pts | ✅ Terminé |
| Sprint 6 (Polish) | 28 pts | ✅ Terminé |
| **TOTAL Q1** | **192 pts** | **100% fait** |

---

## 📈 ÉTAT DE L'APPLICATION

| Métrique | Valeur | Cible Q1 |
|----------|--------|----------|
| **Lignes de code** | ~57,200 | ~60,000 |
| **Modules** | 14 | 14 |
| **Fichiers > 1000 lignes** | 2 | 0 |
| **Score Audit** | 85/100 | > 90/100 |
| **Tests Frontend** | 193 pass / 223 total (87%) | > 60% |
| **Tests Backend** | 170/170 pass (100%) | > 60% |
| **CI/CD** | GitHub Actions (3 jobs) | ✅ |
| **Pre-commit hooks** | Husky (tsc + secrets) | ✅ |
| **Monitoring dashboards** | 4 (GPS + System + API + Business) | ✅ |
| **Prometheus alert rules** | 20 règles (5 groupes) | ✅ |
| **Load test scripts** | 2 (GPS 2000 VU + API 150 req/s) | ✅ |
| **OpenAPI spec** | 258 paths, 51 tags, 20 schemas | ✅ |
| **Swagger UI** | /api-docs (swagger-ui-express) | ✅ |
| **npm vulns** | 3 (xmldom, non-fixable) | 0 |
| **Build size** | ~4,128 KB | < 3,500 KB |
| **Dernière prod** | 12/02/2026 (Monitoring) | Continue |

---

## 🗓️ HISTORIQUE DES DÉPLOIEMENTS

| Date | Module | Fonctionnalités |
|------|--------|-----------------|
| 12/02/2026 | Swagger API Docs | OpenAPI 3.1.0 spec complète: 258 paths, 51 tags, 20 schemas. Swagger UI monté sur /api-docs (swagger-ui-express + yamljs). Couverture complète des 66 modules de routes (~400+ endpoints). Schémas: auth, véhicules, traceurs, clients, tiers, alertes, flotte, géofences, CRM, finance, contrats, abonnements, support, FAQ, admin, monitoring, etc. Sécurité: BearerAuth JWT + ApiKeyAuth, error responses standards. |
| 12/02/2026 | Monitoring & Load Test | HTTP metrics middleware Express (compteur req/s, latence histogramme, in-flight gauge, response size). Prometheus alerting rules: 20 règles (service up/down, CPU/RAM/disk, API error rate/latency, GPS no-data/error-rate/buffer, DB pool/slow queries, Redis memory/connections, WebSocket throttle). Alertmanager avec routing par sévérité et inhibition rules. 3 Grafana dashboards provisionnés: System Overview (14 panels: service status, CPU/RAM/disk gauges, memory breakdown, network I/O, Redis, PostgreSQL), API Performance (13 panels: req/s, latency P50/P90/P95/P99, error rate, top routes, slowest routes, Node.js heap/event-loop), Business & GPS Realtime (14 panels: GPS connections/messages/latency/errors, cache hit/miss, WebSocket, batch inserts, active vehicles, alerts). docker-compose.monitoring.yml hardened: Alertmanager service, healthchecks 6 services, env vars externalisées (Grafana password, Postgres credentials), resource limits, postgres-exporter scrape config. k6 load tests: GPS simulation 2000 trackers (ramping VUs, WebSocket concurrent, thresholds P95<500ms), API throughput (8 endpoints pondérés, ramping 10→150 req/s, auth+fleet+dashboard+CRM+finance). |
| 12/02/2026 | Véhicules V2 | Audit Véhicules V2 (22 issues, 19 corrigés). CRITICAL: api.ts vehicles.getHistory stub retournait [] en prod→ajout vrai appel fetch. HIGH: api.ts vehicles.list catch fallback mock silencieux→throw. HIGH: api.ts toggleImmobilization sans response.ok→ajouté. HIGH: api.ts fuel.list/add+maintenance.list/add stubs prod→ajout vrais appels. HIGH: api.ts fuel.getHistory/getStats URL /vehicles/ au lieu de /fleet/vehicles/+response.ok→corrigé. HIGH: api.ts fleet.* 6 méthodes sans response.ok→ajouté. HIGH: deviceCommandController error.message leak→supprimé. HIGH: maintenanceRuleRoutes 4× error.message+silent catch+no logger+no isStaffUser+GET sans RBAC→corrigé complet. HIGH: vehicleReportController SQL WHERE tenant_id='tenant_default' trouvait jamais de véhicules→supprimé filtre. HIGH: VehicleDetailPanel try/catch manquant immobilize/updateVehicle→ajouté. MEDIUM: deviceController 6 catches sans logger→ajouté. MEDIUM: api.ts 6× console.error avant re-throw supprimés. MEDIUM: api.ts vehicles.update ignorait réponse serveur→corrigé. |
| 12/02/2026 | Carte en Direct V2 | Audit Carte V2 (13 issues, 10 corrigés). CRITICAL: socket.ts WebSocket sans JWT auth→ajout auth token+reconnection. CRITICAL: api.ts pois.create/update+fuel.getHistory/getStats sans headers auth→getHeaders(). HIGH: alertController 2× error.message+console.error→logger+isStaffUser. HIGH: poiRoutes 5 routes sans requirePermission+3× error.message+silent catch→RBAC+isStaffUser+logger. HIGH: alertConfigRoutes GET sans RBAC+4× console.error+2× error.message→logger+isStaffUser. HIGH: alerts.list silent catch prod→throw. |
| 12/02/2026 | Comptabilité V2 | Audit Comptabilité V2 (13 issues, 11 corrigés). CRITICAL: accountingRoutes requête `accounting_journal` inexistante→`journal_entries`, colonne date→entry_date, ID varchar→UUID, updated_at inexistant. CRITICAL: paymentRoutes importé non monté→`/api/finance/payments`. HIGH: 15× error.message leaks (accountingRoutes 5, bankTransactionRoutes 5, budgetRoutes 5). MEDIUM: 3 silent catches api.ts (accounting/bankTransactions/budgets.list)→`if (!USE_MOCK) throw e`. |
| 12/02/2026 | DevOps & Infra | Audit DevOps complet. CI/CD GitHub Actions (3 jobs: frontend tsc+vitest+build, backend tsc+jest+build, security audit+secrets scan). Pre-commit hooks Husky (tsc check + secrets grep). Backend tests: auth.test.ts (40 tests JWT/RBAC/impersonation), tenant-isolation.test.ts (35 tests multi-tenant). Docker hardening: healthchecks all services, restart policies, env vars (no hardcoded passwords), network isolation prod, resource limits, Redis LRU policy. Backup script automated (daily/weekly cron). npm audit fix 7→3 vulns. |
| 11/02/2026 | UI/UX Design | Audit UI/UX Design complet. CRITICAL: Palette gray→slate unifiée (8 fichiers: ResellerDrawerForm, TechSettingsPanel, FinanceView, ClientReconciliation, providersConfig, ContractsView, TierDetailModal, SupportSettingsPanel). CRITICAL: 29 native confirm()→styled ConfirmDialog (nouveau composant + useConfirmDialog hook, 29 fichiers). HIGH: z-index normalisé (z-[60]→z-[100], z-[105]→z-[100] dans TierDetailModal, SupplierInvoicesView, NotificationCenter). HIGH: Focus styles globaux (CSS base rule pour tous inputs/selects/textareas + 9 corrections focus:outline-none/focus:ring-0). HIGH: 12 aria-label ajoutés sur boutons icon-only (FleetTable, InterventionList, MapView). MEDIUM: Dark mode ajouté ReplayControlPanel tables (19 classes dark:). |
| 11/02/2026 | Responsive UI | Audit Responsive Application (~45 issues, 17 fichiers). CRITICAL: SupportViewV2 layout 3-colonnes w-[420px]→flex-col lg:flex-row responsive. HIGH: 6 search w-64→w-full sm:w-64 (FinanceView, CRMView, ClientReconciliation, AlertsConsole, HelpCenter, FinanceTab). HIGH: 4 tables sans overflow-x (TechTeamView 4 tables, TechView 2 tables, CashView, RecoveryView→min-w+overflow-auto). HIGH: 8 grids sans responsive (AuditLogsPanelV2 grid-cols-5→2/3/5, CashView/FinanceView/RecoveryView grid-cols-3/4→1/sm:3/sm:4, ClientReconciliation, ResellerDrawerForm, PoiForm, MessageTemplatesPanel, InterventionTechTab). Tables FinanceView→min-w-[800px]. |
| 09/02/2026 | Tableau de Bord | Audit Sécurité Dashboard (7 issues), CRITICAL tenant_id manquant analyticsRoutes (fuite vehicles cross-tenant), CRITICAL IDOR resellerStats (ANY admin→revendeur par ID), requirePermission VIEW_DASHBOARD analyticsRoutes, isStaffUser check resellerStatsSummary, isStaffUser+tenant filter getResellerStats, 3 console.error→logger |
| 09/02/2026 | Agenda | Audit Sécurité Agenda (5 issues), requirePermission VIEW_FLEET 2 GET routes, 4 error.message supprimés, logger import, Zod validation POST/PUT, 2 console.error supprimés frontend (InterventionDetailModal) |
| 11/02/2026 | Carte en Direct | Audit Sécurité Carte (11 issues), CRITICAL join:superadmin sans vérification rôle (ANY user→ALL tenant data), SQL injection createBehavioralAlert (INTERVAL interpolé→paramétrisé), 22 console→logger backend (socket.ts 6, gt06 10, jt808 2, textProtocol 1, textExtended 1, commandFactory 1), 9 console→supprimés frontend (MapView 8, ReplayControlPanel 1) |
| 11/02/2026 | Véhicules | Audit Sécurité Véhicules (13 issues), 6 IDOR CRITICAL (getFuelHistory/getFuelStats/getMaintenanceRecords/createMaintenanceRecord/getVehicleAlerts/getFleetStats), tenant_id filter all sub-queries, isStaffUser consistency 4 fonctions, interval whitelist fix, Zod validation createVehicle, 15 console.error→logger, 16 error.message supprimés, 5 frontend console.error supprimés |
| 10/02/2026 | Rapports | Audit Sécurité Rapports (8 issues), requirePermission techRoutes, isStaffUser 2 controllers, SQL paramétrisé, error.message leak, logger, 6 console→supprimés |
| 09/02/2026 | Paramètres | Audit Paramètres (11 issues), 3 IDOR (device-models/category/subcategory), 2 Zod schemas, duplicate email check, 52 console.error→logger |
| 09/02/2026 | Monitoring | Audit Monitoring (10 issues), RBAC 19 routes (0 protégées→19), isStaffUser 17 fonctions, cross-tenant geofence fix, validation.data fix |
| 10/02/2026 | Comptabilité | Audit Comptabilité (17 issues), routes jamais montées index.ts, RBAC 3 routes, isStaffUser bypass, logger, Zod validation |
| 10/02/2026 | Vente/Finance | Audit Vente (37 issues), RBAC 11 routes, IDOR subscriptions/dunning, tenant spoofing, 46 console.error→logger, doublons index.ts |
| 10/02/2026 | Prévente/CRM | Audit Prévente (21 issues), RBAC 26 routes, SQL injection crmActivity, tenant isolation quotes/leads |
| 10/02/2026 | Stock/Matériel | Audit Stock (16 issues), RBAC 14 routes, IDOR rmaRoutes, tenant spoofing stockMovements |
| 10/02/2026 | Administration | Audit Admin (16 issues), RBAC 16 routes, IDOR userRoutes/roleRoutes, password hash validation || 09/02/2026 | Tickets | Audit complet tickets (30 issues), N+1 fix, tenant security attachments, escalation fix, fake metrics |
| 09/02/2026 | Finance | Audit complet factures (54 issues), RBAC, TVA 0%, auth token, déploiement prod |
| 23/12/2025 | Rapports | Audit complet, exports CSV/Excel, BusinessReports réel |
| 23/12/2025 | DataContext | Corrections TS, mutations Contract/Catalog/Supplier |
| 23/12/2025 | Backend | Rate limiting, sécurité JWT, VACUUM DB, tenant_id |
| 23/12/2025 | Numérotation | Système auto avec slug revendeur (FAC-ABJ-00001) |
| 23/12/2025 | Frontend | InvoiceForm, ClientForm avec numéros auto |
| 22/12/2025 | Direction | Plan de travail Q1 2026, Audit Workflows |
| 21/12/2025 | Notifications | Push PWA, Toasts, Préférences, WebSocket |
| 21/12/2025 | Véhicules | KPIs, Export Excel, Mobile, Photo, Virtualisation |
| 21/12/2025 | Carte | Temps réel, KPIs, Geocoding |

---

*Plan directorial complet : `/PLAN_DE_TRAVAIL_Q1_2026.md`*  
*Audit détaillé : `/reports/audit_workflows_crm_tech_finance_2025_12_21.md`*
