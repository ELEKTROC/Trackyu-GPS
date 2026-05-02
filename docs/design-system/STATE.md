# STATE — État courant du chantier (single source of truth)

> ⚡ **Toute session Claude qui démarre lit ce fichier en premier.** Réponse en 30 secondes : où on en est, ce qui se passe, ce qui vient.
>
> Mis à jour à la fin de chaque session significative.
>
> Dernière mise à jour : **2026-05-02 (Session 12) — Chantier RAPPORTS V2 — Pilote R-ACT-01 Trajets détaillés livré en prod**. Backend `POST /api/v1/reports/activity/trips` (controller + repository + route + mount v1Router) — RBAC tenant + clientId, query KPIs agrégés, query summary par véhicule (`GROUP BY o.id`), query détails limités 100/véhicule (window function `ROW_NUMBER() OVER (PARTITION BY object_id)`), seuils 500/5000. Format réponse groupé : `summaryColumns + detailColumns + groups[]` (pattern transposé du mobile `ReportGroup`). Frontend V2 : types réponse + `useTripsReport` mutation + `ReportFilterPanel` (cascade revendeur→client→véhicule, RBAC role-based) + `MultiSelectField` (recherche, pagination 20/page, fermeture au clic, "Tout cocher") + `ExpandableReportTable` (rows expand chevron 90°, sous-tableau détails, tout déployer/replier) + `RptDetailTrips` (toggle filtres auto-masqué après génération, ColumnManager, exports désactivés MVP). Colonnes summary : Engin · Plaque · **Client** · Conducteur · Trajets · Distance totale · Durée totale · Vit. moy. · Vit. max. Colonnes détail : Date · H. départ · H. arrivée · Départ · Arrivée · Durée · Distance · Vit. moy. · Vit. max. **Bugs fixés** : (1) cascade vide → `useVenteClients` lisait `r.reseller_id` snake mais backend renvoie `resellerId` camel → double-lecture mappée. (2) DateRangePicker dropdown caché sous sidebar → alignement auto droite/gauche via `getBoundingClientRect`. (3) DateRangePicker raccourcis enrichis (Hier · Sem. préc. · Mois préc.) + format input `dd-mm-yyyy` custom (input texte + parser au lieu de `<input type=date>`). (4) tableau caché >500 trajets → `if (!truncated)` → `if (!exportOnly)` (affiche les 500 plus récents jusqu'à 5000). 🚀 **Déployé prod 2026-05-02 ~18:43** (backend `deploy.ps1 -backend -nobuild -force` + frontend `deploy-v2.ps1 -nobuild`). Reste : 77 autres rapports à porter, exports CSV/Excel/PDF (boutons désactivés).
>
> Session 12-bis (2026-05-02) — **Audit prod chantier FINANCE V2** : tout confirmé en prod. Backend `getInvoiceById` (3×) + route `invoices/:id` (4×) + `findInvoiceById` (1×) présents dans `/var/www/trackyu-gps/backend/dist/`. Endpoint répond HTTP 401 (auth = enregistré). Frontend V2 bundle prod `index-CDrPzSwq.js` (467 488 B, Last-Modified 2026-05-02 18:44:47) = identique build local. Doc passation [`CONTEXTE_SESSION_SUIVANTE.md`](CONTEXTE_SESSION_SUIVANTE.md) mis à jour (statut "🟧 en attente" → "✅ déployé"). **Phase 2 backend recouvrement livrée (build vert, attend deploy)** : migration SQL `20260502_recovery_dossiers_and_actions.sql` (tables `recovery_dossiers` 4 statuts + `recovery_actions` 9 types + index partiel "1 dossier ouvert max par tier"). Backend = 9 endpoints (formal-notice/log-call/note/suspend·unsuspend/litigation·exit·cancel·reopen) + `GET /dossiers/:tierId` (détail + historique 100 actions) — toutes transitions réversibles, validation Zod, `requirePermission('MANAGE_INVOICES')` pour les 4 actions engageantes, auth simple pour log-call/note. Frontend = `useDossier(tierId)` + `useRecoveryActions()` (9 mutations) + 1 fichier `RecoveryActionModals.tsx` (FormalNotice/LogCall/Note + DossierTransitionModal générique 6 actions). `ViewRecovFocus` panel ACTIONS refait : 6 boutons dynamiques (label/icône changent selon backend status — "Suspendre"↔"Réactiver", "Transférer contentieux"↔"Sortir contentieux", "Annuler"↔"Réouvrir") + badge status dossier (SUSPENDU/CONTENTIEUX/ANNULÉ) + nouveau bloc HISTORIQUE DOSSIER (8 dernières actions, icônes + auteur + horodatage). VentePage 263.79 kB (+14 kB), backend dist build vert.
>
> Session 11-bis (2026-05-02) — Chantier FINANCE V2 démarré : 13 régressions vs legacy CRUD complet identifiées. Spec [`modules/FINANCE.md`](modules/FINANCE.md) créée (290 L, 6 lots). **LOT 1 ✅** Relancer (`useRecovery.useMutation` + `ReminderModal` Template G 420px + 4 branchements VentePage). **LOT 2 ✅** Saisir paiement (`usePaymentMutations` POST/DELETE /finance/payments snake_case + `PaymentModal` Template G + boutons "💰 Saisir paiement" pré-remplis). **LOT 3 ✅** Nouvelle facture / édition / suppression : **inauguration Zod 4 + react-hook-form en V2** via `invoiceFormSchema` (refine échéance ≥ émission), `useInvoiceMutations` (POST/PUT/DELETE/send + mapping camelCase→snake_case items.unit_price), `InvoiceFormModal` (Dialog 1000px port Template A fidèle). Branchements `+ Nouvelle facture` + `✏ Éditer` + `🗑 Supprimer`. **Décision métier** : pas de "Marquer comme payée" en UI. **LOT 4 ✅** Actions panel détail (refonte fidélité `VcInvoiceDetail`). **LOT 5 ✅** Filtres + ColumnManager + Export CSV. **Suivi LOT 5** : `mapInvoice` expose `category`, auto-génération Objet `{Type} {Catégorie}{ - PLATE}` (port `generateSubject` legacy), STANDARD retiré (3 valeurs UI : Installation/Abonnement/Autres ventes, default Installation). **LOT 6 ✅** Recouvrement complet livré en 1j : `useRecovery` enrichi (types dossier + agrégation `tierId` + `dossiersByStage` Kanban 5 étapes + `criticalCount`). `ViewRecovListe` : recherche + Sévérité + Relancer câblé. `ViewRecovFocus` : sélecteur dossier réel + header XL + 4 stats + RELANCER par facture + panel 6 actions Phase 2 disabled. `ViewRecovWorkflow` : Kanban 5 étapes amiable/R1/R2/MED/contentieux avec dossiers réels. **🚀 DÉPLOYÉ PROD 2026-05-02** via `deploy-v2.ps1 -nobuild` → live.trackyugps.com HTTP 200. **PDF items détaillés** : backend route `GET /finance/invoices/:id` ajoutée + `findInvoiceById` + `getInvoiceById` controller (déployé `deploy.ps1 -backend -nobuild -force` 4:20s). Frontend `useInvoiceDetail` + `fetchInvoiceWithItems` + intégration PDF multi-lignes (déployé). **🏆 13/13 actions critiques résolues** + items détaillés PDF. **Chantier FINANCE V2 : COMPLET**, parité legacy atteinte, en prod. Doc passation : [`CONTEXTE_SESSION_SUIVANTE.md`](CONTEXTE_SESSION_SUIVANTE.md). Reste pour les sessions futures : Phase 2 backend (6 endpoints recouvrement actions), smart contract matching, cleanup mocks.
>
> Session 11 (2026-05-02) — **Bootstrap tests automatisés V2 — 0 → 195 tests verts**. Infra Vitest installée (`vitest.config.ts` + `src/test/setup.ts` matchMedia/RO/IO stubs). 8 fichiers de tests livrés en 4 commits V2 : `utils/dateRange` (11) · `features/settings/SettingsPage.smoke` (6) · `mapInvoice` (53) · `vehicleStatus` (24) · `geo` (22) · `currencies` (35) · `mapContract` (27) · `formatDuration` (17). **Tier 1 utils purs ✅ COMPLET** (vehicleStatus + geo + currencies + dateRange). **Tier 1 mappers métier 2/2 ✅** (mapInvoice + mapContract). Plan de tests rédigé (`docs/design-system/TESTING_PLAN.md` — Tier 1-4, backlog 14 items). 2 feedback memories enregistrées (pièges Vitest hoisting/regex FR + conventions co-localisation/date pivot 15/06/2026). 2 items Tier 1 bloqués sur refactor extract (`getBillingMonths` dans VentePage.tsx · `useVehicleFuel` mappers inline). Constat de départ : tests legacy non portables littéralement (cibles inexistantes en V2 — `SettingsView` legacy + hook `useDateRange` stateful), réécrits comme équivalents fonctionnels adaptés.
>
> Session 10 (2026-05-02) — Chantier geocoding livré : Phase 1 cache buckets ×32 plus rapide · Phase 2 container Nominatim self-hosted (dump CI ~50 MB PBF) · Phase 3 service refactor Nominatim primary + Google fallback. Provider tagué dans `geocoded_addresses.provider`. Coût Google ~0 € pour ~95% du trafic CI. Latence reverse 29-99 ms (vs 200-500 ms Google) · 0 erreur prod post-deploy. Backups conservés sur VPS pour rollback safe. Préparation KVM2 + connexion balises offline mai 2026.\*\*

---

## 🎯 Où on en est

**Chantier actif** : Refonte frontend complet — **rewrite vers `trackyu-front-V2`** à partir des mockups claude.ai Design (D12 acté 2026-04-26).

**Phase courante** : ✅ Phase 2 Design · ✅ Phase 3 Bootstrap V2 · 🟢 **Phase 4 en cours** — étape 2 ✅ · Sprint 1 ✅ · **Phase 4.0 Sprint 2 (primitives atomiques) ✅** · **Phase 4.1 Templates A-H ✅ COMPLÈTE** · **Phase 4.2 démarrée** (DashboardPage livré) — prêt pour **Phase 4.2 modules métier (Fleet → Stock → CRM → …)**.

**Pilote Phase 4 retenu** : **Option B — Templates UI A-H d'abord** (D27, 2026-04-27 PM). Les 8 templates sont livrés. Phase 4.2 modules métier démarre avec Fleet.

**Scope V2 révisé** : landing page + site public **inclus** dans V2 (D29). DNS `live.trackyugps.com` pointera V2 (cible définitive).

**Progression globale** :

```
Phase 1   ✅ Fondations docs (DLS, BLUEPRINT, RBAC_MATRIX, MAPPING_DLS, etc.)
Phase 2   ✅ Mockups Design — 15 modules + Site public 8 pages + 5 produits + Templates UI A-H + light-preview + tc-theme + assets/brand
Phase 3   ✅ Bootstrap trackyu-front-V2 (init + provider stack + build OK)
Phase 4
  4/Étape 1  ✅ Cadrage : MAPPING_DLS.md + Q1-Q6 arbitrées (suivre Design)
  4/Étape 2  ✅ Foundation tokens (2a polices · 2b dark · 2b' light · 2c ombres+tcpulse · 2d favicon brand)
  4/Étape 3  ✅ Phase 4.0 — Sprint 1 (AppShell + Sidebar + Topbar Design) COMPLET :
              ├─ 1A ✅ logo brand white + config navigation.ts (5 groupes)
              ├─ 1B ✅ composants layout primitifs : Sidebar / Topbar / SubHeader / Tabs (v1)
              ├─ 1C ✅ AppShell flex + router Outlet + HomePage refactor (Topbar+SubHeader)
              ├─ 1D-1 ✅ Sidebar refactor Design fidèle (hover-to-expand 80↔256px · 5 groupes · badges · footer SK · placeholder logout) + fix favicon.ico 404 + fix Vite HMR IPv4 binding (vite.config.ts host:127.0.0.1)
              └─ 1D-2 ✅ Topbar enrichi archi β modulaire — 5 sous-composants standards : LivePill · DatePill (ticker 30s) · SearchInput (240px + Ctrl K + handler global) · ThemeToggleButton · NotificationsButton + Topbar.tsx orchestre · slot `actions` après les 5 standards · HomePage.tsx allégée
  4/Étape 4  ✅ Phase 4.0 — Sprint 2 (primitives atomiques) COMPLET :
              Button · Badge · LicensePlate · Pill · Ref · KPICard · ChartCard · Avatar (+ entity mode)
              FilterChip · IconButton · Inputs · DataTable · Toolbar · BulkActionsBar · Pagination · EmptyState · ColumnManager
              Galerie /templates (route + 8 cards)
              + nouveaux primitifs Phase 4.1 : Dialog · Stepper · Timeline · RelationStat · FleetStatusCard · MiniStatCard · ListCard/ListRow/BadgeTag
  4/Étape 5  ✅ Phase 4.1 — Templates UI A-H TOUS LIVRÉS (ordre C→G→D→H→F→E→B→A) :
              ├─ Template C ✅ EntityFormPage (/templates/entity) — Fiche entité CRUD + Avatar entity + RelationStat
              ├─ Template G ✅ QuickActionPage (/templates/quick-action) — Modale action rapide + Dialog primitive
              ├─ Template D ✅ RulePage (/templates/rule) — Règle conditionnelle SI/ALORS sections colorées
              ├─ Template H ✅ WizardPage (/templates/wizard) — Wizard CSV import + Stepper primitive
              ├─ Template F ✅ AssetTabsPage (/templates/asset-tabs) — Fiche asset multi-tabs (véhicule)
              ├─ Template E ✅ GeoObjectPage (/templates/geo) — Géofence objet carto + carte placeholder
              ├─ Template B ✅ ProcessFormPage (/templates/process) — Process form + detail 2col + Timeline primitive
              └─ Template A ✅ InvoicePage (/templates/invoice) — Facture + Écriture comptable
  4/Étape 6  🟢 Phase 4.2 — modules métier DÉMARRÉE :
              ├─ DashboardPage ✅ (/) — 4 sections KPI×6 + Fleet + Mini stats + Charts×3 + Listes×3 (22.51 kB lazy)
              ├─ FleetPage ✅ (/fleet) — table 10 col + filter bar + VehicleDrawer 480px (Activité tab complet) + FuelGauge + ScoreGauge (29.38 kB lazy)
              ├─ StockPage ✅ (/stock) — overview + boîtiers + SIM + SAV/RMA interactif (ENVOYER/REÇU OK/REMPLACÉ/REBUT/RESTAURER) · 32.39 kB
              ├─ PreventePage ✅ (/prevente) — overview (KPIs + Funnel + Donut + Chart) + Leads Liste + Kanban DISTINCTIF (5 col · pinned/won · tags) · 27.24 kB
              ├─ SupportPage ✅ (/support) — 4 onglets · inbox 3-col 360px|1fr|300px · 51.47 kB
              ├─ TechPage ✅ (/tech) — 5 onglets · Planning calendrier semaine DISTINCTIF · 42.84 kB
              ├─ MonitoringPage ✅ (/monitoring) — 7 onglets (flotte/pipeline/alertes/offline/anomalies/système/utilisateurs) · 49.32 kB
              ├─ ComptaPage ✅ (/compta) — 6 onglets · Finance tab = Caisse|Banque sous-onglets internes · 27.69 kB
              ├─ SettingsPage ✅ (/settings) — navigation 2 niveaux (5 groupes L1 × sous-onglets L2) · 10 vues · 75.89 kB
              ├─ AdminPage ✅ (/admin) — 13 onglets · colonne Solde revendeurs · 34.57 kB
              ├─ ReportsPage ✅ (/reports) — 11 onglets · catalogue 10 catégories · 3 détails (Km/Alertes/MRR) · 42.21 kB
              ├─ AgendaPage ✅ (/agenda) — calendrier Avril 2026 · 3 onglets · modal détail intervention · 16.16 kB
              ├─ MapPage ✅ (/map) — 4 onglets · live sidebar groupée par client + VehicleDetailPanel 6 blocs (▲▼ réorganisables) · Replay · Géofences · Alertes · 64.73 kB
              ├─ VentePage ✅ (/vente) — 7 onglets · overview MRR + clients + Pipeline timeline DISTINCTIF + Contrats/Abonnements/Planning Gantt + Factures + Paiements + Recouvrement · 102 kB
              ├─ Site public ✅ (trackyugps.com) — landing + connexion carousel + tarifs + essai-gratuit + solutions + contact + clients + 5 pages produit + mentions légales + RGPD
              └─ V2 DÉPLOYÉ ✅ live.trackyugps.com → port 8082 · trackyugps.com → /landing redirect
Phase 5   🟢 EN COURS —
              ├─ Auth réelle ✅ · RBAC sidebar ✅ · AppearanceProvider ✅ · User layout ✅
              ├─ Anti-FOUC ✅ (inline script index.html → data-theme avant React mount)
              ├─ Dashboard ✅ Phase A+B complet : fleet status · revenus · alertes · contrats · tickets · interventions · stock · leads
              ├─ Fleet ✅ : liste réelle · pagination · filter chips · header stats live · Vehicle interface étendu (address/battery/isImmobilized/isPanne/daysUntilExpiration)
              ├─ Alertes ✅ : Monitoring AlertsTab (3 sous-onglets) · Dashboard liste non lues
              ├─ Support/Tickets ✅ : useTickets · ListTab · OverviewTab · SlaTab · KanbanTab · lookup guards
              ├─ Tech/Interventions ✅ : useInterventionsData · ListTab · OverviewTab (pipeline+courbe+stock tech) · PlanningTab (D&D persistant) · InterventionModal
              ├─ Fleet Drawer ✅ : useVehicleActivity (day-stats+trips) · useVehicleFuel (fuel-history+stats+events) · useVehicleAlerts · useVehicleMaintenance → 4 onglets connectés
              ├─ vehicleType FR ✅ : fix bug car→bus + labels Voiture/Camion/Bus/Moto
              ├─ v1.trackyugps.com ✅ : Caddy port 8080 (legacy) configuré
              ├─ Vente ✅ :
              │   ├─ useContracts (GET /contracts, mapContractRow camelCase) · table 268 contrats
              │   ├─ useSubscriptions (enrichissement réactif useMemo, fix closure) · table
              │   ├─ useInvoices (paginé serveur, 7133 factures) · table + colonne Plaque/Contrat/Période/Revendeur
              │   ├─ Planning : getBillingMonths (algo legacy) · Kanban 3 colonnes filtrés · FilterChip V2 · export CSV · colonne Installé · barre totaux · année depuis 2020
              │   ├─ Relances : 3 colonnes Kanban par sévérité (1-30j/31-60j/60+j) · cards colorées
              │   ├─ Stats SubHeader dynamiques : contrats (total/actifs/MRR normalisé) + factures colorées
              │   └─ PeriodSelector + date range dans SubHeader VentePage
              ├─ Pagination systémique ✅ : DataTable.perPage prop → toutes les tables auto-paginées (10/page)
              ├─ Map ✅ redesign complet :
              │   ├─ Chips 5 blocs horizontaux colorés (Tous + En route/Au ralenti/Arrêté/Hors ligne) · cliquables
              │   ├─ Sidebar : checkboxes multi-select · recherche multicritères (ID/alias/client/branche/conducteur) · filtres (6 critères) · groupement branche (GET /branches) · tri alpha
              │   ├─ Card 4 lignes : ID+vitesse · alias/modèle+conducteur · adresse/coords · icônes (batterie%·immobilisé·panne·abonnement)
              │   ├─ Toggle ☰ configuration card (panneau cochable max 5 icônes)
              │   ├─ Toolbar : Afficher/Masquer tout · placeholders toggles à venir
              │   ├─ Aucun marker par défaut · cocher pour afficher · vitesse <70 vert / 70-119 jaune / ≥120 rouge
              │   └─ Animation tcpulse sur véhicules En route
              ├─ Backend ✅ : COALESCE(p.address, o.address) dans findAllWithPosition
              └─ DB ✅ : 1849 positions fictives injectées (Abidjan ±4.5km · timestamp=created_at · supersédées dès vrai GPS)
              ── Session B ✅ 2026-04-29 : Stock (3406 boîtiers+4571 SIM) · Agenda (interventions+CRM) · Settings (538 branches+276 users) · Monitoring (6 onglets live) · Rapports (KM+Alertes+MRR) connectés
              ── Session 7 ✅ 2026-04-30 : Julie IA (Groq→Gemini→DeepSeek) · Facture détail (sous-onglet EN DÉTAIL) · Devis détail · Audit thème clair (80 fixes, light=défaut) · Guide utilisateur (Settings → Centre d'aide → 📘) · multi-provider fallback
              ── Session 8 ✅ 2026-04-30 : Fix 4 bugs runtime prod (POI 404 · Trash 500 · Resellers 500 timeout · RuleEval column status) · audit drift schéma SQL/code · alignement repos backend & V2 sur état prod · patch deploy-v2.ps1 (--force-local bsdtar)
              ── Prochaine action : tests fonctionnels UI prod (Settings POI, Admin Corbeille, Admin Revendeurs) · drift schéma 1 (contracts.vehicle_count → migration) · drift schéma 2 (scheduleRuleRoutes enabled → is_active) · Admin/CRM Phase 6
```

---

## 📦 Livraison Design — récap final

**15 modules métier** (tous bouclés Vague 1+2) :

- Dashboard · Fleet · Carte en direct · Stock · Prévente CRM · Vente (5 sous-modules) · Clients · Support · Tech · Settings · Rapports · Comptabilité · Monitoring · Agenda · Administration

**Bonus livrés non prévus initialement** :

- 🆕 **Site public** (8 pages) : index, connexion, contact, essai-gratuit, solutions, tarifs, mentions-légales, politique-confidentialité → futur `trackyugps.com` vitrine SaaS
- 🆕 **5 pages produit** dans `produits/` : carburant-maintenance, chauffeurs, materiel, plateforme, telematique
- 🆕 **Templates UI** (`templates-ui.html`) : galerie 14 artboards = **8 groupes A-H** (Document commercial, Process, Fiche entité, Règle, Carto, Multi-tabs, Modale action, Wizard CSV) — **matche exactement la classification des 28+ forms du legacy**

**Total** : ~100 artboards, 102 fichiers déposés dans `trackyu-front-V2/_design-source/_raw/`.

---

## 📑 Handoff Design reçu — 3 docs

Déposés dans [`trackyu-front-V2/_design-source/_handoff/`](../../trackyu-front-V2/_design-source/_handoff/) :

| Doc                  | Contenu                                                                                                       | Taille |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| **CLAUDE.md**        | Stack, conventions, layout `tc-root`, table 17 modules, patterns d'intégration, notes dev                     | 8.2 KB |
| **FILE-TREE.md**     | Arbre annoté ~90 fichiers, rôle précis de chaque, convention `{module}-data/views/main`                       | 7.5 KB |
| **DESIGN-TOKENS.md** | Couleurs (3+2+3+6+10), typo (3 polices, 16 tailles), espacements, radius, ombres, animations, composants clés | 7.4 KB |

→ Lecture **obligatoire** avant d'attaquer Phase 4 (déjà faite session 2026-04-27 PM, voir CHANGELOG entry).

---

## ⚙️ Stack Design vs Stack V2 — divergence à gérer

|           | Design (mockups)                               | V2 (notre cible)                           |
| --------- | ---------------------------------------------- | ------------------------------------------ |
| Framework | React 18 + Babel inline                        | React 19 + Vite + TS 5.8                   |
| CSS       | **styles JS inline** (`const T = { bg: ... }`) | **Tailwind 4 + tokens CSS** (`var(--xxx)`) |
| Routing   | aucun (1 .html par module)                     | React Router v7                            |
| Bundler   | aucun                                          | Vite 6                                     |

→ **Conséquence** : on ne peut **pas copier-coller** les `.jsx` Design dans `src/features/`. **Traduction obligatoire** : objets `style={{...}}` JS → classes Tailwind / `var(--xxx)`. C'était attendu (D19 : code Design mutable).

→ **Approche recommandée** (à valider en début de prochaine session) :

1. Produire `src/styles/design-tokens.css` (port direct des tokens Design en CSS vars)
2. Brancher dans `index.css` via `@theme inline` Tailwind 4
3. Pour chaque module : lire `<module>-views.jsx` Design → réécrire en composants V2 avec classes Tailwind

---

## 🔄 Ce qui est en cours

### Côté Claude Code (Phase 4.1 COMPLÈTE + Phase 4.2 démarrée — 2026-04-27 nuit)

**Phase 4.0 Sprint 1 + 1D-2 (rappel — déjà livrés)**

- [x] AppShell + Sidebar hover-to-expand + Topbar β modulaire (5 sous-composants) + fix HMR/favicon

**Phase 4.0 Sprint 2 — primitives atomiques (livrées)**

- [x] Button · Badge · LicensePlate · Pill · Ref · KPICard · ChartCard · Avatar · FilterChip · IconButton
- [x] Inputs (Input · Select · Textarea · SearchInput · NumberInput · ColorInput · DateInput · TimeInput)
- [x] DataTable + Toolbar + BulkActionsBar + Pagination + EmptyState + ColumnManager
- [x] Galerie `/templates` (route + page index 8 cartes)

**Phase 4.1 — Templates A-H (TOUS livrés)**

- [x] Template C — EntityFormPage (`/templates/entity`)
- [x] Template G — QuickActionPage (`/templates/quick-action`) + Dialog primitive
- [x] Template D — RulePage (`/templates/rule`)
- [x] Template H — WizardPage (`/templates/wizard`) + Stepper primitive
- [x] Template F — AssetTabsPage (`/templates/asset-tabs`)
- [x] Template E — GeoObjectPage (`/templates/geo`)
- [x] Template B — ProcessFormPage (`/templates/process`) + Timeline primitive
- [x] Template A — InvoicePage (`/templates/invoice`)
- [x] **Nouveaux primitifs** : Dialog · Stepper · Timeline · RelationStat · Avatar entity mode · FleetStatusCard · MiniStatCard · ListCard/ListRow/BadgeTag

**Infrastructure**

- [x] React.lazy code splitting sur toutes les routes (bundle warning 500 kB résolu — main chunk 438 kB stable)
- [x] Build : 1828 modules · 438 kB main chunk · 0 warning · 7.41s

**Phase 4.2 — modules métier (en cours)**

- [x] DashboardPage (`/`) — port fidèle `tableau-de-bord.html` · 4 sections (KPI×6 · Fleet réel · Mini stats · Charts×3 · Listes×3) · 22.51 kB lazy
- [x] FleetPage (`/fleet`) — port fidèle `fleet-mockup.jsx` · table dense + FilterBar + VehicleDrawer 480px · FuelGauge + ScoreGauge · 29.38 kB lazy — **1833 modules · 439 kB · 7.74s**
- [x] StockPage (`/stock`) — 5 onglets : overview + boîtiers GPS + SIM + SAV/RMA pipeline interactif + stubs · boutons FR (ENVOYER/REÇU OK/REMPLACÉ/REBUT/RESTAURER)
- [x] PreventePage (`/prevente`) — vue d'ensemble + Leads Liste + Leads Kanban · 7 onglets
- [x] SupportPage (`/support`) — 4 onglets · inbox 3-col 360px|1fr|300px · 51.47 kB
- [x] TechPage (`/tech`) — 5 onglets · Planning calendrier semaine DISTINCTIF · 42.84 kB
- [x] MonitoringPage (`/monitoring`) — 7 onglets (flotte/pipeline/alertes/offline/anomalies/système/utilisateurs) · 49.32 kB
- [x] ComptaPage (`/compta`) — 6 onglets · Finance tab = sous-onglets Caisse|Banque internes · 27.69 kB
- [x] SettingsPage (`/settings`) — navigation 2 niveaux (5 groupes L1 × sous-onglets L2) · 10 vues · 75.89 kB
- [x] AdminPage (`/admin`) — 13 onglets · colonne Solde revendeurs (À jour / Impayé + montant + jours retard) · 34.57 kB
- [x] ReportsPage (`/reports`) — 11 onglets · catalogue 10 catégories · 3 rapports détail · export PDF/Excel · bouton IA · 42.21 kB
- [x] AgendaPage (`/agenda`) — calendrier Avril 2026 · 3 onglets Tous/Technique/Commercial · modal détail intervention · 16.16 kB
- [x] MapPage (`/map`) — 4 onglets · live sidebar groupée par client + popup + VehicleDetailPanel (6 blocs ▲▼) · Replay timeline · Géofences · Alertes · 64.73 kB
- [x] VentePage (`/vente`) — 7 onglets · Pipeline timeline DISTINCTIF · Planning Gantt factures · Recouvrement · 102 kB
- [x] **Site public** (trackyugps.com) — landing + connexion carousel 6 images + tarifs + essai-gratuit (stepper) + solutions + contact + clients + 5 produits + légal
- [x] **V2 déployé prod** → live.trackyugps.com (port 8082) · trackyugps.com redirect /landing · Caddy SSL

**Points différés / ouverts**

- [ ] Couleur texte items sidebar (`#e2e8f0` appliqué, pas visible — à diagnostiquer DevTools)
- [ ] Production `INTEGRATION_PLAYBOOK_V2.md` — différé après premier module métier
- [ ] Réorganisation `_raw/` + AuthContext branchement — Phase 4.x

### Côté utilisateur

- [x] Validation Phase 0bis prod (déployée 2026-04-27)
- [x] Tous mockups Design produits + 3 docs handoff déposés
- [x] Pilote Phase 4 tranché : Option B (Templates A-H d'abord) → accompli
- [x] Q1-Q6 MAPPING_DLS toutes tranchées "suivre Design"
- [x] Scope V2 confirmé : landing + site public dans V2 (DNS `live.trackyugps.com` → V2)
- [x] Validation Sprint 1D-2 (Topbar enrichi opérationnel)
- [ ] Configuration DNS `live.trackyugps.com` → V2 (en cours côté Hostinger)
- [ ] Demander à claude.ai Design de propager le light aux 14 modules

---

## 🚦 Prochaine action concrète

### Session 2026-04-30 (7-bis) — Audits Frontend + Map + Dashboard

**Phase A déployée prod** ✅ (ErrorBoundary + Toast + NotificationsPanel + 10 modales câblées + barrel imports + Réductions + PasswordModal).

**Phase B + C en attente déploiement** ⚠️ :

- Map fixes (mode détail GoogleMapView · ViewReplay réécrit avec `useReplayData` · IMMOBILISER API · ViewAlerts useAlerts(200) · 6 mineurs)
- Dashboard fixes (4 critiques · 4 nav links · code mort retiré · erreurs Phase B loggées)
- 🆕 D&D sections Dashboard avec `@dnd-kit/sortable` + persistance localStorage

**Action #1 demain** — déployer Phases B+C :

```bash
cd "C:\Users\ADMIN\Desktop\TRACKING"
powershell -File .\deploy-v2.ps1 -nobuild
```

(Build déjà à jour dans `trackyu-front-V2/dist/`.)

**Action #2** — tester le D&D Dashboard en prod et valider la persistance localStorage.

**Action #3** — décider de la suite des audits :

1. Audits autres modules (Stock · Prévente · Vente · Compta · Tech · Support · Monitoring · Settings · Admin · Reports · Agenda)
2. Sparklines KPI Dashboard depuis `activityByDay` (au lieu des paths fixes)
3. DateRangePicker Dashboard global (Sections 2/3/4 ignorent le range actuellement)

→ **Règle cardinale** : pas-à-pas, accord explicite utilisateur avant chaque nouveau module. Build vert entre chaque étape.

→ **Voir** [`CONTEXTE_SESSION_SUIVANTE.md`](CONTEXTE_SESSION_SUIVANTE.md) pour le détail complet de la session.

---

## 🔒 Décisions actées (récap rapide)

Voir [CHANGELOG.md](CHANGELOG.md) pour le détail.

| ID      | Décision                                                                                                 | Court                                                                                                                                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1      | Brand orange `#d96d4c`                                                                                   | Pas `#F97316`                                                                                                                                                                                                                   |
| D2      | Charter umbrella                                                                                         | `CHANTIER_REFONTE_DESIGN.md` = source                                                                                                                                                                                           |
| D3      | Dossier `New/` suspendu                                                                                  | Pas touché                                                                                                                                                                                                                      |
| D4      | 2 modes clair/sombre + accent tenant                                                                     | Plus d'`ocean`                                                                                                                                                                                                                  |
| D5      | Dashboard v1 corrigé                                                                                     | Validé                                                                                                                                                                                                                          |
| D6      | Labels FR systématique                                                                                   | Statuts traduits                                                                                                                                                                                                                |
| D7      | Fleet seul d'abord                                                                                       | Pilote pris                                                                                                                                                                                                                     |
| D8      | Mode dual livré toujours                                                                                 | Clair + sombre                                                                                                                                                                                                                  |
| D9      | RBAC = code, pas mockup                                                                                  | RBAC_MATRIX référence                                                                                                                                                                                                           |
| D10     | Niveau créativité B (équilibré)                                                                          | MUSTS / LIBERTÉS / NUDGES                                                                                                                                                                                                       |
| D11     | Template universel                                                                                       | + atypiques                                                                                                                                                                                                                     |
| **D12** | **PIVOT REWRITE**                                                                                        | `trackyu-front-V2`                                                                                                                                                                                                              |
| D13     | Nom : `trackyu-front-V2`                                                                                 | —                                                                                                                                                                                                                               |
| D14     | Stack reproduite + React Router v7                                                                       | —                                                                                                                                                                                                                               |
| D15     | Copie sélective depuis legacy                                                                            | services/types/i18n/lib                                                                                                                                                                                                         |
| D16     | DNS sur legacy jusqu'à parité totale                                                                     | Pas de coexistence partielle                                                                                                                                                                                                    |
| D17     | Legacy archive read-only après bascule                                                                   | —                                                                                                                                                                                                                               |
| D18     | Mode dual livré en 2 temps (sombre vague + claires en batch)                                             | Assouplissement tactique D8                                                                                                                                                                                                     |
| D19     | Code Design **mutable** : on édite à l'intégration                                                       | Divergences mineures = pas de regen                                                                                                                                                                                             |
| D20     | Briefer Design **par couches** (Cadre → Archi → Détail)                                                  | Pas tout d'un coup                                                                                                                                                                                                              |
| D21     | Production Design **zoom out → zoom in**                                                                 | Vague 1 aperçu global × 14 modules · vagues suivantes détail au besoin                                                                                                                                                          |
| D22     | Bootstrap V2 démarre **maintenant**                                                                      | En parallèle de Vague 1 Design                                                                                                                                                                                                  |
| D23     | ~~Modèle Iteratif · pilote Fleet~~                                                                       | **Remplacé par D27**                                                                                                                                                                                                            |
| **D24** | **Phase 4 attend les 14 mockups Design complets**                                                        | ✅ **SATISFAIT 2026-04-27**                                                                                                                                                                                                     |
| D25     | Réorganisation **Compta ↔ Vente**                                                                        | Compta 4 onglets N1 (avec 2 containers)                                                                                                                                                                                         |
| **D26** | **Stack divergence assumée : pas de copy-paste, traduction styles JS → Tailwind/tokens à l'intégration** | Conséquence directe D19                                                                                                                                                                                                         |
| **D27** | **Pilote Phase 4 = Option B Templates UI A-H d'abord** (vs Fleet D23)                                    | Atomic d'abord — vélocité 2-3× sur les 14 modules suivants. Aligné philosophie atomic design                                                                                                                                    |
| **D28** | **Q1-Q6 MAPPING_DLS toutes tranchées "suivre Design"**                                                   | Peach `#f4a87a` light · Hover `#c85f0e` · Warning amber `#f59e0b` · Info bleu `#3b82f6` · Purple cluster séparé `#a855f7` · Padding bouton 9×14 (web desktop, mobile=Expo) · h2-display 24px Archivo · section title 9.5px mono |
| **D29** | **Scope V2 inclut landing page + site public** (révision vs STATE.md initial)                            | DNS `live.trackyugps.com` pointe V2 — landing + auth + app authentifiée dans **un seul build** V2                                                                                                                               |
| **D30** | **Light theme V2 aligné directement sur Design T_LIGHT** (tc-theme.jsx fourni)                           | Pas d'extrapolation — valeurs Design réelles. Variantes light des clusters sémantiques = pattern Tailwind v4 standard 50/100/200/600/800/900                                                                                    |

---

## 🚧 Blocages actifs

**Aucun bloqueur dur** actuellement. Dépendances séquentielles + 1 point à diagnostiquer :

- **Couleur items sidebar** : `#e2e8f0` appliqué mais pas visible (différé sur accord — à diagnostiquer DevTools : cache navigateur profond, Service Worker résiduel, ou règle CSS ancestrale qui override `color`)
- **Phase 5 switch DNS** dépend de la **parité fonctionnelle totale** (D16)

---

## 📚 Documents à connaître (par ordre de priorité de lecture)

Pour une nouvelle session Claude qui débarque :

1. **[CLAUDE.md](../../CLAUDE.md)** — règles permanentes (auto-loaded)
2. **STATE.md** (ce fichier) — état temps réel
3. **[CHANGELOG.md](CHANGELOG.md)** — historique décisions (entry 2026-04-27 PM = la plus utile)
4. **[`trackyu-front-V2/_design-source/_handoff/CLAUDE.md`](../../../trackyu-front-V2/_design-source/_handoff/CLAUDE.md)** — guide intégration Design (LECTURE OBLIGATOIRE Phase 4)
5. **[`trackyu-front-V2/_design-source/_handoff/FILE-TREE.md`](../../../trackyu-front-V2/_design-source/_handoff/FILE-TREE.md)** — carte des ~90 fichiers .jsx
6. **[`trackyu-front-V2/_design-source/_handoff/DESIGN-TOKENS.md`](../../../trackyu-front-V2/_design-source/_handoff/DESIGN-TOKENS.md)** — tokens Design extraits
7. **[CHANTIER_REFONTE_DESIGN.md](CHANTIER_REFONTE_DESIGN.md)** — charter umbrella v0.5
8. **[DLS.md](DLS.md)** — référence canonique tokens / composants V2
9. **[BLUEPRINT.md](BLUEPRINT.md)** — brief Design des écrans
10. **[RBAC_MATRIX.md](RBAC_MATRIX.md)** — matrice rôles × permissions
11. **[INTEGRATION_PLAYBOOK.md](INTEGRATION_PLAYBOOK.md)** — workflow build/intégration (à mettre à jour avec retour Phase 4)
12. **[modules/](modules/)** — specs par module (à construire au fur et à mesure de Phase 4)

---

## 🗂️ Architecture des dossiers (état actuel)

```
c:/Users/ADMIN/Desktop/
├── TRACKING/                              ← legacy frontend (encore en prod jusqu'à D16/D17)
│   └── docs/design-system/                ← docs umbrella (CHARTER + STATE + CHANGELOG + MAPPING_DLS + DLS + BLUEPRINT + ...)
├── trackyu-front-V2/                      ← V2 (cible D12 — DNS live.trackyugps.com en cours)
│   ├── public/
│   │   ├── favicon.svg / .ico / 32x32 / 180x180
│   │   └── brand/logo-mark-white.svg      ← logo blanc Sidebar header
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/                    ← AppShell · Sidebar · SubHeader · Tabs
│   │   │   │   └── topbar/                ← LivePill · DatePill · SearchInput · ThemeToggleButton · NotificationsButton
│   │   │   └── ui/                        ← 🆕 Sprint 2 + Phase 4.1 : Button · Badge · LicensePlate · Pill · Ref
│   │   │                                      KPICard · ChartCard · Avatar(+entity) · FilterChip · IconButton
│   │   │                                      Input · Select · Textarea · … · DataTable · Toolbar · Pagination
│   │   │                                      EmptyState · ColumnManager · Dialog · Stepper · Timeline
│   │   │                                      RelationStat · FleetStatusCard · MiniStatCard · ListCard · BadgeTag
│   │   ├── config/navigation.ts           ← MAIN_NAV (5 groupes, 10+ routes navigables)
│   │   ├── contexts/                      ← Theme + Appearance
│   │   ├── features/
│   │   │   └── dashboard/DashboardPage.tsx ← 🆕 Phase 4.2 — port tableau-de-bord.html (22.51 kB lazy)
│   │   ├── pages/
│   │   │   ├── templates/                 ← 🆕 Phase 4.1 — 8 templates (entity · quick-action · invoice · process · rule · wizard · asset-tabs · geo)
│   │   │   └── TemplatesGalleryPage.tsx   ← galerie /templates
│   │   ├── router.tsx                     ← React.lazy sur toutes les routes (code splitting — 438 kB main chunk)
│   │   └── index.css                      ← DLS V2 complet (tokens dark+light + ombres + tcpulse + polices)
│   ├── _design-source/                    ← read-only Design source
│   │   ├── _handoff/                      ← 3 docs Design (CLAUDE + FILE-TREE + DESIGN-TOKENS)
│   │   └── _raw/                          ← ~110 fichiers (mockups + light-preview + tc-theme + tc-styles-light + assets/brand/)
│   ├── index.html                         ← preload Inter + Archivo Black + JetBrains Mono + favicons brand
│   ├── vite.config.ts                     ← host:'127.0.0.1' (fix HMR WebSocket Windows IPv4)
│   └── (Vite 6 + React 19 + TS 5.8 + Tailwind 4 + React Router 7 — build 1828 modules · 438 kB · 0 warning)
├── trackyu-backend/                       ← intact
└── TRACKING/trackyu-mobile-expo/          ← session mobile (parallèle, app Expo couvre mobile)
```

---

## 🛠️ Protocole de bootstrap pour nouvelle session Claude

À copier-coller en haut de toute nouvelle session si CLAUDE.md ne suffit pas :

```
1. Lire CLAUDE.md (auto-loaded) — règles permanentes
2. Lire docs/design-system/STATE.md (ce fichier) — Phase 4.1 ✅ Templates A-H complets · Phase 4.2 démarrée (Dashboard livré)
3. Lire docs/design-system/CHANGELOG.md — entry 2026-04-27 nuit (Phase 4.1 + Phase 4.2 DashboardPage)
4. Lire trackyu-front-V2/_design-source/_handoff/CLAUDE.md — guide intégration Design
5. Si tâche Fleet : lire trackyu-front-V2/_design-source/_raw/fleet-views.jsx + docs/design-system/modules/FLEET.md
6. Procéder : Phase 4.2 → FleetPage puis modules suivants selon ordre BLUEPRINT
```

---

## 📝 Comment mettre à jour ce fichier

À la fin de chaque session significative, mettre à jour :

1. **Dernière mise à jour** (date + titre)
2. **Où on en est** (phase + progression)
3. **Ce qui est en cours** (cases cochées / décochées)
4. **Prochaine action** (utilisateur + Claude)
5. **Blocages actifs**

Ne **pas** dupliquer le CHANGELOG ici. STATE.md = présent. CHANGELOG = passé détaillé.

---

_State of the union du chantier. Lu en premier. Mis à jour à chaque step._
