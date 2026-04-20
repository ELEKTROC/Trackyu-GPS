# Audit backend — Architecture

**Date** : 2026-04-18

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

### A1 — Pattern repository court-circuité

- **257 appels `pool.query` / `query(` directement dans `routes/*`**.
- Seulement **2 imports `repositories/*` depuis `routes/`**.
- Conséquence : toute la logique SQL + mapping + validation tenant est dispersée dans les handlers de routes, dupliquée, non testable.
- **Fix** : interdire les imports `db`/`pool` dans `routes/*` (règle ESLint `no-restricted-imports`). Chaque route délègue à `controllers/<X>Controller.js` qui délègue à `services/<X>Service.js` → `repositories/<X>Repo.js`.
- Migration progressive : commencer par les 5 routes les plus hot (`vehicleRoutes`, `fleetRoutes`, `invoiceRoutes`, `userRoutes`, `authRoutes`).

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

| #   | Action                                               | Effort   | Ordre     |
| --- | ---------------------------------------------------- | -------- | --------- |
| A4  | Suppression `.bak` + `.dockerignore`                 | 5 min    | immédiat  |
| A3  | Déplacer scripts one-off                             | 1 h      | semaine   |
| A1  | ESLint `no-restricted-imports` + migrer top-5 routes | 8 h      | sprint    |
| A5  | Splitter controllers > 800 lignes                    | 6 h      | sprint    |
| A2  | Inventaire 24 routes sans controller                 | 2 h      | sprint    |
| A7  | Plan retrait alias `/api`                            | 1 h plan | trimestre |
