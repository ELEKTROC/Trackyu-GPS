# D1 Phase 0 — Inventaire drift `src/` ↔ `dist/`

**Date exécution** : 2026-04-19
**Source** : VPS `148.230.126.62` — `/var/www/trackyu-gps/backend/`
**Script** : `c:/tmp/inventory_src_dist.py` (copie : `/tmp/inventory_src_dist.py` sur VPS)
**Sorties brutes** : [SRC_DIST_INVENTORY.csv](SRC_DIST_INVENTORY.csv) · [SRC_DIST_INVENTORY_summary.json](SRC_DIST_INVENTORY_summary.json)

Référence : [PLAN_SRC_REMISE_AU_CARRE.md — Phase 0](PLAN_SRC_REMISE_AU_CARRE.md) · [AUDIT_BACKEND_DETTE.md § D1](AUDIT_BACKEND_DETTE.md)

---

## Synthèse

| Indicateur                                                     | Valeur                               |
| -------------------------------------------------------------- | ------------------------------------ |
| Fichiers runtime `dist/*.js` (hors migrations/scripts/archive) | **261**                              |
| Paires `src/X.ts` + `dist/X.js`                                | **152** (58 %)                       |
| `dist/` sans `src/` correspondant                              | **109** (42 %)                       |
| `src/` orphelins sans `dist/`                                  | **0**                                |
| Drift max `src → dist`                                         | **90.7 jours** (≈ 3 mois)            |
| Date de bascule `dist`-only estimée                            | **≈ 2026-01-19** (arrêt du build TS) |

Le reste des `dist/` sans `src/` correspond à **tout le code ajouté ou réorganisé depuis l'abandon de `src/` en janvier 2026**, majoritairement :

- **39 `repositories/`** — _l'intégralité du pattern repository a été créé post-abandon_ → explique pourquoi A1 (257 `pool.query` en routes) n'a jamais pu être généralisé : le refactor vers repositories ne peut pas être backporté en TS tant que `src/` n'est pas à jour.
- **14 `routes/`** — `meRoutes`, `portalRoutes`, `towProvidersRoutes`, `trashRoutes`, `uploadRoutes`, `v1Router`, `vehicleExtrasRoutes` (celui-là même qui a causé **S1 — SQL cassé**), etc.
- **12 `gps-server/parsers/`** — modèles GT06 (concox-x3, j16, unknown-86973), plus H02, Meitrack, Queclink, Suntech, Teltonika, WialonIps.
- **9 `controllers/`** — `aiController`, `discoveredDeviceController`, `messageTemplatesController`, `objectController`, `resellerStatsController`, `smsCommandController`, `tierController`, `trashController`, `userController`.
- **8 `services/`** — ChartService, EcoDrivingService, ReverseGeocodingService, TPMSService, VideoEventService, orangeSmsService, registrationWorkflows, subscriptionSyncService, taskReminderService, servicesHooks.
- **7 `jobs/`** — index, notificationJobs, queue, types + 5 workers (email, notif, pdf, sms, trip).
- **3 `middleware/`** — httpMetrics, tenantContext, uploadMiddleware.
- **4 `utils/`** — bcryptConfig (créé aujourd'hui), registrationParser, safeInterval, tierHelper.
- **1 `workers/positionWorker.js`**

---

## Top 20 drift (paires src+dist divergentes)

Fichiers modifiés en direct dans `dist/` sans que `src/` ait suivi.

| #   | Fichier                               | Drift |
| --- | ------------------------------------- | ----- |
| 1   | `controllers/authController.js`       | 91 j  |
| 2   | `controllers/ApiKeyController.js`     | 91 j  |
| 3   | `controllers/ticketController.js`     | 91 j  |
| 4   | `middleware/rateLimiter.js`           | 91 j  |
| 5   | `routes/userRoutes.js`                | 91 j  |
| 6   | `config/database.js`                  | 91 j  |
| 7   | `routes/fleetRoutes.js`               | 91 j  |
| 8   | `controllers/SettingsController.js`   | 91 j  |
| 9   | `routes/analyticsRoutes.js`           | 91 j  |
| 10  | `services/scheduler.js`               | 88 j  |
| 11  | `controllers/monitoringController.js` | 88 j  |
| 12  | `gps-server/server.js`                | 88 j  |
| 13  | `services/socketThrottle.js`          | 88 j  |
| 14  | `routes/monitoringRoutes.js`          | 87 j  |
| 15  | `gps-server/parsers/gt06.js`          | 87 j  |
| 16  | `services/ruleEvaluationService.js`   | 87 j  |
| 17  | `routes/subscriptionRoutes.js`        | 87 j  |
| 18  | `controllers/deviceController.js`     | 86 j  |
| 19  | `socket.js`                           | 86 j  |
| 20  | `routes/catalogRoutes.js`             | 86 j  |

**Observations** :

- `authController.js` en tête — c'est là que S3, S4, S5 P1, S5 P2, S11 ont été patchés → patches **les plus critiques à backporter** en Phase 2.
- `middleware/rateLimiter.js` — patchs S10 (rate-limit geocode) + S11 (rate-limit reveal-password).
- `gps-server/parsers/gt06.js` — corrections CRC ISO-HDLC + variants CONCOX/COBAN déployées 2026-04-03.

---

## Implications pour le plan D1

### Ce qui change vs. le plan initial

- **Ratio plus lourd** : 42 % de dist-only (109 / 261) au lieu des ~7 fichiers initialement estimés dans l'audit. Le plan reste valide mais la Phase 2 (réconciliation) représente **plus de création que de sync** pour ces 109 fichiers.
- **0 orphelin** : aucune suppression à faire côté `src/`. Tout ce qui existe en `src/` est encore référencé en `dist/`.

### Ce qui se confirme

- **3 mois de drift** correspond bien à la date de bascule `dist`-only (mi-janvier 2026).
- **Les 15 patches listés dans le plan** (S1-S11, P1-P8, D2...) portent majoritairement sur les top 20 du tableau ci-dessus → ordre de migration suggéré reste pertinent.
- **Pattern repository** (A1) peut être traité **pendant** Phase 2 — les 39 fichiers `repositories/*.js` n'ayant pas de `src/`, leur migration TS est une création pure (pas un diff à résoudre).

### Risques nouveaux identifiés

1. **Les 39 repositories** représentent un gros effort TS pur (définir interfaces, types de retour, gestion transactions). Estimation revue : **Phase 2 → 5 j → 7 j** (ajout 2 j pour création TS des repositories).
2. **Les 12 parsers GPS** (gt06-models, protocoles tiers) sont critiques runtime, nécessitent des types précis (Buffer, bitmask). Tests unitaires à prévoir avant bascule Phase 3.
3. **`v1Router.js`** (sans src) — point d'entrée de tous les `/api/v1/*`. Aucune marge d'erreur lors de la bascule.

---

## Recommandation

**Proposer à l'équipe le plan ajusté** (Phase 2 passe de 5 j à 7 j) avant de démarrer Phase 1.

Alternative plus pragmatique si le planning ne tient pas :

> **Scoping réduit** — ne pas chercher à tout migrer. Isoler `src/` sur le **périmètre "core critique"** (controllers, middleware, routes/userRoutes + authController + les 5 controllers les plus modifiés), laisser les **39 repositories et les 12 parsers en dist-only documenté** avec ESLint rule qui bloque tout nouveau dist-only hors de cette zone.
>
> → Effort Phase 2 **divisé par 3** (~2 j), dette "maîtrisée" plutôt qu'éliminée, CI type-check sur le core.

À arbitrer avec le budget disponible.

---

## Prochaines actions (Phase 1)

Sous réserve d'alignement sur l'ampleur révélée :

1. CI GitHub Actions `backend-typecheck.yml` : `npm ci && npx tsc --noEmit` déclenché sur PR touchant `backend/src/`. Label `type-check-skip` tant que Phase 2 pas finie.
2. ESLint config dédiée backend avec `no-restricted-imports` (interdire `pool` direct hors repositories) + `no-console` warn.
3. Script `npm run build:watch` pour itération locale pendant la migration.

**Effort estimé Phase 1** : 2 j (inchangé).
