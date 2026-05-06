# Audit backend — Dette technique

**Date** : 2026-04-18
**Dernière mise à jour** : 2026-04-20

---

## 🚨 Critique

### D1 — `src/` abandonné, `dist/` patché en direct — 🔄 Phases 1 + 2.1-2.4 + 2.5 Lot A mergées (2026-04-20)

**État au 2026-04-20** : chantier structuré et en exécution continue.

#### Repo Git dédié

- **Local** : `c:/Users/ADMIN/Desktop/trackyu-backend/`
- **GitHub** : [github.com/ELEKTROC/trackyu-backend](https://github.com/ELEKTROC/trackyu-backend) (privé)
- **Branche principale** : `main`
- Snapshot initial rapatrié depuis VPS `148.230.126.62:/var/www/trackyu-gps/backend/` (src/, migrations/, scripts/, configs — dist/, node_modules/, .env exclus via .gitignore).
- Tracking granulaire : [MIGRATION_PROGRESS.md](https://github.com/ELEKTROC/trackyu-backend/blob/main/MIGRATION_PROGRESS.md) coche chaque fichier migré, survit aux compactions de session.

#### Inventaire initial (Phase 0, 2026-04-19)

- **`dist/index.js` dernière modif : 2026-04-19** (patches Python)
- **`src/index.ts` dernière modif : ≈ 2026-01-19** (drift max mesuré : **90.7 j**)
- **261 fichiers runtime**, **152 paires src+dist**, **109 dist-only (42 %)**, **0 orphan src**. Rapport : [SRC_DIST_INVENTORY.md](SRC_DIST_INVENTORY.md) · données brutes : [SRC_DIST_INVENTORY.csv](SRC_DIST_INVENTORY.csv).
- Top drift (91 j) : `authController`, `ApiKeyController`, `ticketController`, `rateLimiter`, `userRoutes`, `database config`, `fleetRoutes`, `SettingsController`, `analyticsRoutes`.
- Répartition des 109 dist-only : **39 repositories/**, **14 routes/**, **12 gps-server/parsers/**, **9 controllers/**, **8 services/**, **7 jobs/**, autres.
- **Plan détaillé** : voir [PLAN_SRC_REMISE_AU_CARRE.md](PLAN_SRC_REMISE_AU_CARRE.md). Approche incrémentale sans big-bang, garde-rails pour hotfix sécu pendant la migration.

#### Progression par phase

| Phase     | Objet                 | Fichiers              | État | PR  | Commit merge                                                                |
| --------- | --------------------- | --------------------- | ---- | --- | --------------------------------------------------------------------------- |
| 1         | Outillage (typecheck, CI, ESLint, MIGRATION_PROGRESS) | 5 | ✅ 2026-04-20 | —   | `89ebb22` + `509d8df` + `708c146`                                           |
| 2.1       | Utils                 | 7 (3 paired + 4 new)  | ✅ 2026-04-20 | #1  | `78d2ffb`                                                                   |
| 2.2       | Config                | 2 (database.ts + aiKnowledgeBase.ts) | ✅ 2026-04-20 | #2  | `b09ee2c`                                                                   |
| 2.3       | Types                 | 1 (common.ts)         | ✅ 2026-04-20 | #3  | `3a2e81a`                                                                   |
| 2.4       | Middleware            | 7 (4 paired + 3 new)  | ✅ 2026-04-20 | #4  | `1cc0cd6`                                                                   |
| 2.5 Lot A | BaseRepository socle  | 1 (510 LOC)           | ✅ 2026-04-20 | #5  | `ac2df49`                                                                   |
| 2.5 Lot B | Fleet & Tech repos    | ~13                   | ⏳   | —   | —                                                                           |
| 2.5 Lot C | Finance & CRM repos   | ~9                    | ⏳   | —   | —                                                                           |
| 2.5 Lot D | Admin & Support repos | ~11                   | ⏳   | —   | —                                                                           |
| 2.5 Lot E | AI / divers repos     | ~9                    | ⏳   | —   | —                                                                           |
| 3         | Déblocage build TS + bascule dist/ régénéré | —       | ⏳   | —   | —                                                                           |

#### CI & garde-fous

- Workflow `.github/workflows/typecheck.yml` lance `tsc --noEmit` sur chaque PR et push main.
- Step "tsc" = **informationnel** Phase 1-2 (`continue-on-error: true`).
- **Gate bloquant** "Scoped gate — 0 erreur dans dossiers migrés" actif sur `src/(utils|config|types|middleware|repositories)/` — ratchet anti-régression étendu à chaque phase mergée.
- `.npmrc` : `legacy-peer-deps=true` (conflit openai@4.104 peerOptional zod@^3 vs zod@^4.2 projet).
- Scripts `build` / `build:tsc` / `prod:build` **volontairement bloqués** (exit 1) tant que Phase 3 non atteinte — évite d'écraser les patches prod `dist/`.

#### Patches à backporter vers src/ — statut

| Patch | Fichier(s) concerné(s)                 | Backporté en src ? | Phase            |
| ----- | -------------------------------------- | ------------------ | ---------------- |
| S1    | `routes/vehicleExtrasRoutes.js`        | ⏳                 | Routes (Phase 3) |
| S2    | `.env` / `docker-compose.yml`          | N/A (infra)        | —                |
| S3    | `.env` ACCESS_TOKEN_EXPIRY             | N/A (infra)        | —                |
| S4    | `controllers/userController`, `utils/registrationParser`, `ApiKeyController` | ⏳ | Controllers (Phase 2.6+) |
| S5    | `utils/bcryptConfig` (P1)              | ✅                 | 2.1 Utils        |
| S6    | `middleware/uploadMiddleware`          | ✅                 | 2.4 Middleware   |
| S7    | `.env*` chmod                          | N/A (infra)        | —                |
| S8    | `console.log` → logger (runtime)       | ⏳ progressif      | Par phase        |
| S10   | `middleware/rateLimiter` (geocodeLimiter) | ✅              | 2.4 Middleware   |
| S11   | `middleware/rateLimiter` (revealPasswordLimiter) + `middleware/auditMiddleware` (sanitizeBody étendu) | ✅ (middleware) + ⏳ (controllers/repositories) | 2.4 + Phase 2.6 |
| P1    | dashboard cache                        | ⏳                 | Controllers/services |
| P2    | `config/database` (slow log)           | ✅                 | 2.2 Config       |
| P5    | `config/database` (pool monitoring)    | ✅                 | 2.2 Config       |
| P7    | `config/database` / redis config       | ✅                 | 2.2 Config       |
| P8    | indexes DB + query fixes               | N/A (DDL)          | —                |
| D2    | `package.json`                         | ⏳                 | Après Phase 3    |

#### Commits clés

- `9ce4432` initial snapshot VPS src/
- `89ebb22` outillage Phase 1 (typecheck, CI, ESLint, MIGRATION_PROGRESS)
- `f489170` Phase 2.1 pilote utils/ (7 fichiers)
- `509d8df` .npmrc legacy-peer-deps (fix ERESOLVE zod/openai CI)
- `708c146` CI : step-level continue-on-error + scoped gate src/utils/
- `78d2ffb` merge PR #1 Phase 2.1
- `e1a11fd` Phase 2.2 Config (database.ts + aiKnowledgeBase.ts)
- `b09ee2c` merge PR #2 Phase 2.2
- `f1fc1ad` Phase 2.3 Types (common.ts)
- `3a2e81a` merge PR #3 Phase 2.3
- `61849c1` Phase 2.4 Middleware (7 fichiers, 911 insertions)
- `1cc0cd6` merge PR #4 Phase 2.4
- `592da64` Phase 2.5 Lot A BaseRepository socle (510 LOC, 523 insertions)
- `ac2df49` merge PR #5 Phase 2.5 Lot A

#### Risques maîtrisés

- **Hotfix prod** : les patches `dist/` restent autorisés pour hotfix sécu/P1 uniquement, avec PR backport-src < 48 h.
- **Régression TS** : scoped gate bloquant sur les dossiers déjà migrés (impossible de commiter une régression dans `src/utils|config|types|middleware|repositories/`).
- **Credentials follow-up S5** : `dg@trackyugps.com / admin123` dans `src/scripts/fix-users.ts`, `reset-passwords.ts`, `test-login-api.ts`, `test_login_local.ts`, `test_api_login.ts` — documenté dans README du repo, à rotate avant Phase 3.

#### Reste à livrer

1. Lots 2.5 B/C/D/E — 42 repositories (Fleet/Tech, Finance/CRM, Admin/Support, AI/divers).
2. Phase 2.6 Controllers/Services (dépend de 2.5).
3. Phase 2.7 Routes (backport patches S1/S4 + migration TS).
4. Phase 3 — Déblocage `build:tsc`, génération `dist/` reproductible, bascule prod (abandon des patches Python one-shot).

---

## 🟠 Importants

### D2 — ~~45 vulnérabilités npm~~ ⚠️ Partiellement corrigé 2026-04-19 (45 → 34)

- Étape 1 (safe) : bump patches directs `axios ^1.13.2 → ^1.15.0` + `express-rate-limit ^8.2.1 → ^8.2.2`, puis `npm audit fix --package-lock-only` (non-force). Image backend rebuild + deploy vérifié healthy. Restant : 34 vulns (8 low, 1 mod, 24 high, 1 critical).
- Étape 2 (breaking) non appliquée : `npm audit fix --force` passe `bcrypt 5→6` (chaîne tar/node-pre-gyp/bcrypt). À planifier en staging (tester hashs existants + rehash opportuniste cf. S5).
- Backup : `/var/www/trackyu-gps/backup/d2-20260419T165934Z/` (package.json + package-lock.json originaux).

### D3 — Versions majeures en retard

| Package        | Current     | Latest | Note                         |
| -------------- | ----------- | ------ | ---------------------------- |
| express        | 4.22.1      | 5.2.1  | Migration majeure, planifier |
| multer         | 1.4.5-lts.2 | 2.1.1  | API différente, à tester     |
| openai         | 4.104.0     | 6.34.0 | 2 majeures, breaking         |
| stripe         | 20.2.0      | 22.0.2 | 2 majeures                   |
| bcrypt         | 5.1.1       | 6.0.0  | Couplé à D2                  |
| dotenv         | 16.6.1      | 17.4.2 | Majeure                      |
| @types/express | 4.17.25     | 5.0.6  | Suit express                 |
| @types/node    | 20          | 25     | Suit Node LTS                |

- **Fix** : cycle trimestriel de mise à jour majeure, un paquet à la fois, avec staging test.

### D4 — ~~5 fichiers `.bak`~~ ✅ Corrigé 2026-04-19

- **24 fichiers** `.bak*` trouvés dans `dist/` (plus que les 5 annoncés audit) — déplacés vers `/var/www/trackyu-gps/backup/d4-bak-20260419/` (au cas où).

### D5 — ~~70 scripts one-off à la racine `dist/`~~ ✅ Corrigé 2026-04-19

- 70 fichiers `.js` racine analysés. **Runtime réel** : uniquement `index.js`, `socket.js` (requiré par index.js) et `create_advanced_admin_tables.js` (require direct dans index.js pour bootstrap tables admin — nom trompeur de "one-off" alors qu'il est en boot path).
- 67 scripts déplacés vers `dist/scripts-archive-20260419T205217Z/` (pas supprimés, disponibles pour rollback). Dossier horodaté pour traçabilité.
- Vérif : backend redémarré 2 fois, healthcheck 200 (1er restart a révélé `create_advanced_admin_tables` manquant → restauré depuis archive en 10 s).
- **À faire lors de D1 (remise au carré `src/`)** : renommer `create_advanced_admin_tables.js` → `bootstrap/ensureAdminTables.js` et isoler le vrai one-off dans `scripts/`.

---

## 🟡 À surveiller

### D6 — 9 TODO/FIXME seulement

- Ratio anormalement bas pour une codebase de ~40 k lignes. Soit nettoyage actif (bien), soit refus culturel de marquer la dette (mal).
- Action : encourager le marquage TODO avec auteur + date + ticket (`// TODO(smartrack, 2026-04-18, INGEST-42): ...`).

### D7 — `console.log` × 199 (cf. S8 sécurité)

- Déjà listé. Symptôme de debug laissé en prod → dette faible mais visible dans logs Docker.

### D8 — ~~`vehicles_legacy` table présente~~ ✅ Corrigé 2026-04-19

- Table 1.76 MB / 0 rows, aucune référence dans le code backend (grep `vehicles_legacy` sur `dist/` = 0 hits hors `.bak`).
- Schema dumpé préventivement : `/var/backups/trackyu/vehicles_legacy_schema_20260419T204419Z.sql` (136 lignes).
- `DROP TABLE vehicles_legacy` exécuté. ~1.76 MB libérés.

### D9 — Node 20 vs derniers types @types/node 25

- Node 20 est LTS jusqu'oct 2026. Migration Node 22 LTS à planifier d'ici fin Q3.

---

## ✅ Points forts

- Pas de fichiers `.orig`, `.rej`, `.conflict` (conflit de merge laissé).
- Pas de `@deprecated` annotations oubliées.
- Migrations versionnées avec timestamps propres.
- `package-lock.json` présent (lockfile discipline).

---

## Plan

| #   | Action                                  | Effort                  | État          |
| --- | --------------------------------------- | ----------------------- | ------------- |
| D2  | `npm audit fix` + test bcrypt 6 staging | 4 h                     | 🔄 45→34      |
| D1  | Remise au carré `src/`                  | 2 j planning + 5 j exec | 🔄 en cours (Phase 1 + 2.1-2.4 + 2.5A ✅) |
| D4  | Supprimer `.bak`                        | 5 min                   | ✅            |
| D5  | Trier scripts one-off                   | 2 h                     | ✅            |
| D3  | Cycle MAJ majeures trimestriel          | 1 j / trim              | récurrent     |
| D8  | DROP `vehicles_legacy`                  | 10 min                  | ✅            |
| D7  | console.log → logger                    | 2 h (cf. S8)            | 🔄 progressif par phase D1 |
