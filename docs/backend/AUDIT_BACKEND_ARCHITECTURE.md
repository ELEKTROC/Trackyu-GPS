# Audit backend — Architecture

**Date** : 2026-04-18
**Dernière mise à jour** : 2026-04-20

---

## Inventaire

| Couche                              | Fichiers |
| ----------------------------------- | -------- |
| Routes                              | 76       |
| Controllers                         | 52       |
| Services                            | 32       |
| Repositories                        | 43       |
| Workers                             | 4+       |
| Scripts one-off à la racine `dist/` | **70**   |

---

## 🚨 Critiques

### A1 — Pattern repository court-circuité — 🔄 socle TS livré 2026-04-20

- **257 appels `pool.query` / `query(` directement dans `routes/*`** (inchangé côté dist prod).
- Seulement **2 imports `repositories/*` depuis `routes/`**.
- Conséquence : toute la logique SQL + mapping + validation tenant est dispersée dans les handlers de routes, dupliquée, non testable.
- **Avancement D1 (Phase 2.5 Lot A)** : `src/repositories/BaseRepository.ts` livré (commit `592da64`, merge `ac2df49`, 510 LOC) — classe générique `BaseRepository<TEntity>` avec :
  - CRUD complet (`findAll`, `findById`, `findOne`, `create`, `update`, `delete`, `softDelete`, `restore`, `count`, `exists`, `findPaginated`)
  - Isolation tenant via `isStaffUser()` helper (STAFF bypass le filtre `tenant_id`)
  - Soft-delete (`deleted_at IS NULL`)
  - Mapping snake_case ↔ camelCase via `ColumnMapping<TEntity>` + helper `col(dbColumn, { fromDb, toDb })`
  - Pagination + transactions (`withTransaction`)
  - Type `QueryParam` partagé (`src/types/common.ts`, Phase 2.3)
- **Fix** : interdire les imports `db`/`pool` dans `routes/*` (règle ESLint `no-restricted-imports`). Chaque route délègue à `controllers/<X>Controller.ts` → `services/<X>Service.ts` → `repositories/<X>Repository.ts extends BaseRepository<T>`.
- Migration progressive en 4 lots (Phase 2.5 B/C/D/E) : Fleet/Tech (~13), Finance/CRM (~9), Admin/Support (~11), AI/divers (~9) — total **42 repositories** à convertir + BaseRepository socle ✅.
- Après Phase 2.5 : migrer controllers/services puis routes (top-5 `vehicleRoutes`, `fleetRoutes`, `invoiceRoutes`, `userRoutes`, `authRoutes`) en Phase 2.6+, avec ESLint gate au merge.

### A2 — Ratio couches incohérent

- 76 routes, 52 controllers, 32 services, 43 repositories.
- Il devrait y avoir 1 controller par route (ou équivalent). 24 routes n'ont pas de controller dédié → logique dans les fichiers route.
- Services moins nombreux que repositories → inversion (normalement 1 service orchestre N repo).
- **Fix** : cartographier les 24 routes orphelines + statuer au cas par cas (extraire controller vs garder inline si trivial).

---

## 🟠 Importants

### A3 — 70 scripts one-off pollués dans `dist/`

- `check-db-tables.js`, `diagnose-uuid.js`, `seed-admin.js`, `migrate_clients_to_tiers.js`, etc.
- Ces scripts ne sont pas dans le cycle applicatif mais présents dans l'artefact de prod. Risque : exécution accidentelle via `node dist/diagnose-foo.js` avec credentials prod.
- **Fix** :
  - Déplacer dans `backend/scripts/` (source) et `dist/scripts/` (build isolé).
  - Exclure du `Dockerfile` COPY.
  - Archiver les one-off déjà utilisés dans `archive/` du repo.

### A4 — 5 fichiers `.bak` en production

```
gps-server/server.js.bak
workers/positionWorker.js.bak
routes/monitoringRoutes.js.bak
controllers/deviceController.js.bak
controllers/tierController.js.bak
```

- **Fix** : suppression immédiate (`find dist -name '*.bak' -delete`) + `.dockerignore`.

### A5 — Monolithes `controllers/*`

- `financeController.js` : 1 082 lignes
- `interventionController.js` : 1 003 lignes
- `vehicleController.js` : 845 lignes
- Au-delà de 500 lignes, un controller mélange plusieurs responsabilités.
- **Fix** : splitter `financeController` → `invoiceController` / `paymentController` / `creditNoteController` (routes déjà séparées, symétrie à retrouver).

---

## 🟡 À surveiller

### A6 — 9 TODO/FIXME seulement

- Faible, signe de **nettoyage actif ou de TODO non écrits**. Vérifier dans l'historique qu'ils ne sont pas silencieusement supprimés.
- Action : pas de fix, mais vérifier qu'on en rajoute quand on reporte une tâche au lieu de la laisser en mémoire humaine.

### A7 — v1Router + alias `/api`

- `index.js` monte `v1Router` sur `/api/v1` + alias backward-compat `/api`. Ok court terme, mais chaque endpoint existe sous deux chemins → cache, rate-limit, audit potentiellement divisés.
- **Fix** : planifier retrait de l'alias `/api` (301 vers `/api/v1`) avec un délai client (~6 mois). Mesurer via logs quels clients restent sur l'ancien.

---

## ✅ Déjà solide

- Séparation `routes/controllers/services/repositories` **existe** — le squelette est là, l'exécution est partielle.
- `middleware/` centralisé (auth, rateLimit, upload, audit, errorHandler).
- `schemas/` Zod pour validation input.
- `jobs/`, `workers/` isolés (GPS ingestion, notifications).
- `utils/` partagés (encryption, jwt, logger).
- `migrations/` versionnées.

---

## Plan

| #   | Action                                                  | Effort   | État          |
| --- | ------------------------------------------------------- | -------- | ------------- |
| A4  | Suppression `.bak` + `.dockerignore`                    | 5 min    | ✅            |
| A3  | Déplacer scripts one-off                                | 1 h      | ✅            |
| A1  | BaseRepository socle + migration 43 repositories + ESLint gate sur routes | 8 h | 🔄 socle ✅ (Phase 2.5 Lot A) — Lots B/C/D/E à venir |
| A5  | Splitter controllers > 800 lignes                       | 6 h      | ⏳ Phase 2.6  |
| A2  | Inventaire 24 routes sans controller                    | 2 h      | ⏳            |
| A7  | Plan retrait alias `/api`                               | 1 h plan | trimestre     |
