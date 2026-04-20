# Audit backend — Dette technique

**Date** : 2026-04-18

---

## 🚨 Critique

### D1 — `src/` abandonné, `dist/` patché en direct — 🔄 Phase 0 exécutée 2026-04-19

- **`dist/index.js` dernière modif : 2026-04-19** (patches Python en cours)
- **`src/index.ts` dernière modif : ≈ 2026-01-19** (drift max mesuré : **90.7 j**)
- Inventaire Phase 0 exécuté sur VPS prod → **261 fichiers runtime**, **152 paires src+dist**, **109 dist-only (42 %)**, **0 orphan src**. Rapport : [SRC_DIST_INVENTORY.md](SRC_DIST_INVENTORY.md) · données brutes : [SRC_DIST_INVENTORY.csv](SRC_DIST_INVENTORY.csv).
- Top drift (91 j) : `authController`, `ApiKeyController`, `ticketController`, `rateLimiter`, `userRoutes`, `database config`, `fleetRoutes`, `SettingsController`, `analyticsRoutes`. Confirme que les patches critiques S1-S11/P1-P8 touchent bien ces fichiers-là.
- Répartition des 109 dist-only : **39 repositories/** (le pattern entier post-abandon), **14 routes/**, **12 gps-server/parsers/**, **9 controllers/**, **8 services/**, **7 jobs/**, autres.
- Le build TS est cassé, toute correction passe par des patches Python sur le VPS → aucune réversibilité Git, aucune revue, pas de type checking, pas de CI.
- **Plan détaillé** : voir [PLAN_SRC_REMISE_AU_CARRE.md](PLAN_SRC_REMISE_AU_CARRE.md). 4 phases (Phase 2 rééstimée à 7 j au lieu de 5 j après ampleur révélée), approche incrémentale sans big-bang, garde-rails pour hotfix sécu pendant la migration.
- **Alternative "scoping réduit"** documentée dans SRC_DIST_INVENTORY.md : figer les 39 repositories et 12 parsers en dist-only documenté, migrer seulement le core critique → effort /3.
- **Patches à backporter vers src/** lors de la Phase 2 : S1, S2, S3, S4, S5 P1+P2, S6, S7, S10, S11, P1, P2, P5, P7, P8, D2 (≈ 17 patches depuis l'audit).

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

| #   | Action                                  | Effort                  | Priorité     |
| --- | --------------------------------------- | ----------------------- | ------------ |
| D2  | `npm audit fix` + test bcrypt 6 staging | 4 h                     | **urgent**   |
| D1  | Plan remise au carré `src/`             | 2 j planning + 5 j exec | **critique** |
| D4  | Supprimer `.bak`                        | 5 min                   | immédiat     |
| D5  | Trier scripts one-off                   | 2 h                     | semaine      |
| D3  | Cycle MAJ majeures trimestriel          | 1 j / trim              | récurrent    |
| D8  | DROP `vehicles_legacy`                  | 10 min                  | quand ok     |
| D7  | console.log → logger                    | 2 h (cf. S8)            | sprint       |
