# Plan — Remise au carré `backend/src/`

**Référence audit** : [AUDIT_BACKEND_DETTE.md § D1](AUDIT_BACKEND_DETTE.md)
**Créé** : 2026-04-19 | **Mis à jour** : 2026-04-21
**Statut** : 🟡 Phase 2 en cours (Phase 2.8 controllers : 43/52 = 82.7%)
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

**⏳ Non démarrée** — 10 fichiers (0 paired + 10 new)

`jobs/index`, `notificationJobs`, `queue`, `types`, `workers/emailWorker`, `notifWorker`, `pdfWorker`, `reportWorker`, `alertWorker`, `financeWorker`

#### Phase 2.8 — Controllers

**🟡 En cours — 43/52 (82.7%)**

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
| X   | integrationCredentialsController, WebhookDeliveryController, TenantController, salesPipelineController, adminFeatureController | ⏳     |
| Y   | aiController, discoveredDeviceController, objectController, RoleController, financeController                                  | ⏳     |

**Restant** : 9 controllers (Lots X + Y)

#### Phase 2.9 — Routes

**⏳ Non démarrée** — 77 fichiers (62 paired + 15 new)

---

### ⏳ Phase 3 — Bascule build → deploy

**Non démarrée** — bloquée sur fin de Phase 2

1. Build local + comparaison `dist-new/` ↔ `dist-prod/`
2. Déploiement staging → smoke test 24 h
3. Bascule prod : `rm -rf dist && npm run build && scp dist → VPS → restart`
4. Verrou direct-dist (README dans `/var/www/…/dist/`)

---

### ⏳ Phase 4 — Gouvernance (continu)

- 1 PR = 1 modification src obligatoire (sauf hotfix)
- Hotfix direct-dist autorisé pour sécu/P1 uniquement, avec PR `backport-src` dans les 48 h
- `deploy.ps1` recompile src → upload dist, jamais scp dist patché
- Cycle MAJ dépendances trimestriel (cf. D3)

---

## Estimation révisée

| Phase                             | Estimation | Statut   |
| --------------------------------- | ---------- | -------- |
| 0 Inventaire + freeze             | 2 j        | ✅ Fait  |
| 1 Outillage (repo + CI)           | 2 j        | ✅ Fait  |
| 2.5 Utils/Config/Types/Middleware | 2 j        | ✅ Fait  |
| 2.6 Repositories                  | 1 j        | ✅ Fait  |
| 2.7 Jobs/Workers                  | 1 j        | ⏳ Reste |
| 2.8 Controllers (43/52 faits)     | ~1 j reste | 🟡 82.7% |
| 2.9 Routes (77 fichiers)          | 3–4 j      | ⏳ Reste |
| 3 Bascule                         | 2 j        | ⏳ Reste |
| **Total restant estimé**          | **~7 j**   |          |

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

**Lot X** (5 controllers) : `integrationCredentialsController`, `WebhookDeliveryController`, `TenantController`, `salesPipelineController`, `adminFeatureController` — fetch dist/ depuis VPS + migration.

Voir `MIGRATION_PROGRESS.md` dans `trackyu-backend/` pour le détail des fichiers restants.
