# Plan — Remise au carré `backend/src/`

**Référence audit** : [AUDIT_BACKEND_DETTE.md § D1](AUDIT_BACKEND_DETTE.md)
**Créé** : 2026-04-19 | **Mis à jour** : 2026-04-21
**Statut** : ✅ **TERMINÉ** 2026-04-21 — 77/77 routes, build propre, prod déployé, smoke test OK, gouvernance active
**Criticité** : 🚨 Critique (blocage de toute autre dette code tant que non fait)

---

## Diagnostic initial (2026-04-19)

| Métrique                                                   | Valeur                                 |
| ---------------------------------------------------------- | -------------------------------------- |
| `dist/` fichiers runtime (hors migrations/scripts/archive) | **241**                                |
| `src/` fichiers TS                                         | **234**                                |
| `dist/` dernière modif                                     | 2026-04-19 (patches Python quotidiens) |
| `src/` dernière modif typique                              | **2026-01-19** (3 mois d'écart)        |
| `tsc --noEmit` sur `src/`                                  | ❌ cassé (non vérifié ce sprint)       |
| CI                                                         | ❌ aucune                              |

**Patches déjà appliqués depuis l'audit (hors src/)** :
S1, S2, S3, S4, S6, S7, S10, S11 (sécurité) · P1, P2, P5, P7, P8 (perf) · D2 (partiel), D4, D5, D8 (dette) · S5 P1 bcrypt · endpoint reveal-password. **~15 patches**.

---

## Principe directeur

**Ne pas tenter un big-bang**. Remise au carré **progressive** avec dist/ comme source de vérité, src/ reconstruit fichier par fichier depuis les `.js` compilés. Les patches Python continuent tant que src/ n'est pas prêt.

---

## Phases — État au 2026-04-21

### ✅ Phase 0 — Inventaire + freeze léger

**Terminée** — 2026-04-19/20

- Diff dist/ ↔ src/ effectué : 3 catégories (paires, dist-only, src-only)
- `tsc --noEmit` baseline établi : **3 erreurs stables** (RoleController ZodError + alertConfigRoutes ×2)
- Rapport `MIGRATION_PROGRESS.md` créé dans trackyu-backend
- Repo Git `trackyu-backend` créé (github.com/ELEKTROC/trackyu-backend) — snapshot VPS src/ + outillage D1 Phase 1

---

### ✅ Phase 1 — Outillage

**Terminée** — 2026-04-20

- Repo `trackyu-backend` sur GitHub = CI + historique Git dès le départ
- Branch par lot, merge sur main avec `tsc --noEmit` vérifié avant chaque merge
- Baseline tsc : 3 erreurs fixes (RoleController + alertConfigRoutes) = signal de régression immédiat

---

### 🟡 Phase 2 — Réconciliation src/ ↔ dist/

**En cours** — démarrée 2026-04-20

Découpée en sous-phases exécutées en lots numérotés (A–W+ pour controllers).

#### Phase 2.5 — Utils + Config + Types + Schemas + Middleware + Services

**✅ Terminée** (Lots A–K, voir MIGRATION_PROGRESS.md §2.5)

Couvre : config/, types/, schemas/, utils/, middleware/, services/ — ~30 fichiers. Baseline tsc stable.

#### Phase 2.6 — Repositories

**✅ Terminée** (Lots L, voir MIGRATION_PROGRESS.md §2.6)

~30 repositories migrés. Patterns : `QueryResult<Row>`, types d'input dédiés.

#### Phase 2.7 — Jobs / Workers

**✅ Terminée** — 2026-04-21 — 9 fichiers

`jobs/types`, `jobs/queue`, `jobs/index`, `jobs/notificationJobs` (stub→réel), `jobs/workers/emailWorker`, `smsWorker`, `notifWorker`, `pdfWorker`, `tripWorker`

#### Phase 2.8 — Controllers

**🟡 En cours — 48/52 (92.3%)**

| Lot | Controllers                                                                                                                    | Statut |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| M   | userController, tierController                                                                                                 | ✅     |
| N   | authController, ApiKeyController, SettingsController                                                                           | ✅     |
| O   | interventionController                                                                                                         | ✅     |
| P   | vehicleController, clientController, auditController                                                                           | ✅     |
| Q   | contractController, creditNoteController, paymentReminderController                                                            | ✅     |
| R   | crmController, leadController, leadScoringController, crmActivityController                                                    | ✅     |
| S   | faqController, manualNotificationController, numberingController, systemController                                             | ✅     |
| T   | rmaController, stockMovementController, stockMovementControllerExtensions, supplierController                                  | ✅     |
| U   | fleetController, vehicleReportController, interventionReportController, techController                                         | ✅     |
| V   | smsCommandController, trashController, resellerStatsController, messageTemplatesController, recoveryController                 | ✅     |
| W   | pushNotificationController, deviceCommandController, sendController, csvImportController, registrationRequestsController       | ✅     |
| X   | integrationCredentialsController, WebhookDeliveryController, TenantController, salesPipelineController, adminFeatureController | ✅     |
| Y   | aiController, discoveredDeviceController, objectController, RoleController, financeController                                  | ✅     |

**Restant** : 0 controller — Phase 2.8 terminée ✅

#### Phase 2.9 — Routes

**🟡 74/77 ✅ — 3 fichiers avec écarts réels** — audit complet 2026-04-21

**Méthodologie** : comparaison `router.(get|post|put|patch|delete)` count local vs VPS dist pour chaque fichier.

| Fichier               | Local | VPS | Statut                         |
| --------------------- | ----- | --- | ------------------------------ |
| 72 fichiers autres    | =     | =   | ✅ parité exacte               |
| `v1Router`            | n/a   | n/a | ✅ pattern `router.use()` — OK |
| `vehicleExtrasRoutes` | n/a   | n/a | ✅ pattern `router.use()` — OK |
| `adminFeatureRoutes`  | 25    | 20  | ❌ see below                   |
| `auditRoutes`         | 3     | 2   | ❌ see below                   |
| `interventionRoutes`  | 8     | 5   | ❌ see below                   |

**Écarts détaillés :**

`adminFeatureRoutes.ts` — notre src a 7 routes roles en trop (CRUD roles, assign/remove — déjà couvertes par `roleRoutes`) et manque 3 endpoints VPS (`POST /webhooks/:id/test`, `GET /whitelabel`, `PUT /whitelabel`) + manque `requireAdmin`/`requireAnyPermission` sur les routes existantes.

`auditRoutes.ts` — notre src a un `router.use(requireAdmin)` superflu. VPS = `authenticateToken` seul. Notre version est plus restrictive (bloque non-admin).

`interventionRoutes.ts` — notre src a 3 routes supplémentaires (`GET /stats`, `GET /:id`, `GET /:id/history`) absentes du VPS `interventionRoutes` (déjà couvertes par `techRoutes`). VPS a `requirePermission` sur toutes les routes, notre src n'en a pas.

**Plan de correction (Lot Z) :**

1. `adminFeatureRoutes.ts` : retirer les 7 routes roles, ajouter `POST /webhooks/:id/test` + `GET/PUT /whitelabel` + middleware auth sur toutes les routes
2. `auditRoutes.ts` : retirer `router.use(requireAdmin)` → garder seulement `authenticateToken`
3. `interventionRoutes.ts` : aligner sur VPS (4 routes avec `requirePermission`, supprimer les 3 redondantes)

---

### 🟡 Phase 3 — Bascule build → deploy

**Partiellement terminée** — 2026-04-21

| Étape                       | Statut | Notes                                                                |
| --------------------------- | ------ | -------------------------------------------------------------------- |
| Build local `npm run build` | ✅     | Premier build propre depuis ~90 j, 0 erreur TS                       |
| Audit dist local vs VPS     | ✅     | 341/341 fichiers, 7 routes à parité, endpoint count vérifié          |
| Déploiement prod            | ✅     | `deploy.ps1 -backend -nobuild` — HTTP 200 — 4m20s                    |
| Smoke test applicatif       | ✅     | 8 endpoints testés — fix DB fiscal_years/chart_of_accounts (500→200) |
| Verrou direct-dist          | ✅     | `DO_NOT_PATCH.txt` dans `/var/www/trackyu-gps/backend/dist/`         |
| CI typecheck required check | ✅     | `continue-on-error` retiré — bloquant sur tout PR/push main          |

**Note architecture** : pas de staging backend séparé — le frontend staging pointe sur le même backend port 3001. "Staging" backend = prod backend.

---

### ✅ Phase 4 — Gouvernance (2026-04-21)

- 1 PR = 1 modification src obligatoire (sauf hotfix)
- Hotfix direct-dist autorisé pour sécu/P1 uniquement, avec PR `backport-src` dans les 48 h
- `deploy.ps1` recompile src → upload dist, jamais scp dist patché
- Cycle MAJ dépendances trimestriel (cf. D3)

---

## Estimation révisée — état au 2026-04-21

| Phase                             | Estimation     | Statut                                 |
| --------------------------------- | -------------- | -------------------------------------- |
| 0 Inventaire + freeze             | 2 j            | ✅ Fait                                |
| 1 Outillage (repo + CI)           | 2 j            | ✅ Fait                                |
| 2.5 Utils/Config/Types/Middleware | 2 j            | ✅ Fait                                |
| 2.6 Repositories                  | 1 j            | ✅ Fait                                |
| 2.7 Jobs/Workers                  | ✅ terminé     | ✅ Fait                                |
| 2.8 Controllers (52/52 faits)     | ✅ terminé     | ✅ 100%                                |
| 2.9 Routes (77/77 ✅)             | ✅ terminé     | Lot Z 2026-04-21                       |
| 3 Bascule                         | ✅ terminé     | Build + prod + smoke test + verrou     |
| 4 Gouvernance                     | ✅ terminé     | CI required + deploy.ps1 + verrou dist |
| **Chantier D1**                   | **✅ TERMINÉ** | **2026-04-21**                         |

---

## Risques

| Risque                                            | Mitigation                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| Nouvelle urgence prod pendant migration           | Garder direct-dist ouvert pour sécu ; bloquer seulement les features     |
| Divergence src ↔ dist pendant Phase 2             | Backporter tout patch > 5 lignes vers src au fur et à mesure             |
| tsc casse sur dépendances majeures en retard (D3) | Freezer les MAJ majeures jusqu'après Phase 3                             |
| Régression au build-deploy                        | Backup dist complet + smoke test scripté (GPS ingest, login, /api/users) |

---

## Interdépendances

| Item                       | Relation                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------- |
| **D2** bcrypt 6            | Doit être testé **après** Phase 3 (risque upgrade bcrypt + migration en parallèle) |
| **D3** MAJ majeures        | À cadencer après Phase 4                                                           |
| **A1** pattern repository  | ✅ Traité pendant Phase 2 (controllers refactorés en même temps)                   |
| **A5** splitter monolithes | ✅ Opportuniste en Phase 2 — controllers slim avec repos                           |
| **S8** console.log         | ✅ Nettoyé pendant Phase 2 (logger structuré partout)                              |

---

## Prochaine étape

**Lot Z** (3 fichiers) — corrections routes :

1. `adminFeatureRoutes.ts` : retirer roles, ajouter webhook/test + whitelabel + middleware auth
2. `auditRoutes.ts` : retirer `router.use(requireAdmin)` superflu
3. `interventionRoutes.ts` : aligner VPS (requirePermission + retirer routes redondantes)

Puis : **smoke test** (GPS ingest, login, /api/users, nouveaux endpoints) + **verrou direct-dist** → Phase 4 gouvernance.
