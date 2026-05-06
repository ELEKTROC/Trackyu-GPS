# Audit backend — Performance

**Date** : 2026-04-18
**Dernière mise à jour** : 2026-04-20
**Scope** : VPS prod + PostgreSQL/TimescaleDB + Redis + Socket.io + repo Git TS `trackyu-backend` (migration D1)

---

## Note backport src/ (D1, 2026-04-20)

Les patches perf P2 (slow query log), P5 (pool PG monitoring) et P7 (Redis maxmemory) sont désormais présents à l'identique dans `src/config/database.ts` (TypeScript) via Phase 2.2 du chantier D1. Voir `commit e1a11fd` (Phase 2.2) → merge `b09ee2c` dans [trackyu-backend](https://github.com/ELEKTROC/trackyu-backend).

---

## État actuel

| Métrique                 | Valeur                                                    |
| ------------------------ | --------------------------------------------------------- |
| Taille DB (top table)    | `zoho_invoices` 8 MB, `invoices` 6.6 MB                   |
| Hypertable `positions`   | 6.7 MB, 13 920 rows                                       |
| Indexes DB               | 317 total, 79 sur `tenant_id`                             |
| Pool PG                  | `max=20 min=5`, statement_timeout 10 s, PgBouncer frontal |
| Redis                    | 2.5 MB / peak 3 MB, pas de `maxmemory` configuré          |
| Socket.io rooms          | 104 patterns `socket.join` (vehicle:ID, tenant, support)  |
| Queries `SELECT *`       | 172 occurrences                                           |
| Queries paginées (LIMIT) | 47 seulement                                              |

---

## 🚨 Critiques

### P1 — ~~Cache applicatif dashboard~~ ✅ Partiellement corrigé 2026-04-19

- `/api/analytics/dashboard` câblé sur `CacheService` (déjà présent, utilisé côté pipeline GPS). Clé `analytics:dashboard:<tenantId|'staff'>`, TTL 90 s, header `X-Cache: MISS|HIT`.
- Mesure prod : MISS 98 ms → HIT 41 ms (-58 %) sur SUPERADMIN avec 4 agrégations (status/activity30j/cost6m/revenue6m).
- Backup : `/var/www/trackyu-gps/backup/p1-20260419T170000Z/`. Script local : `patch_p1_dashboard_cache.py`.
- **Reste à faire** (étendre P1) : permissions/roles, tiers, résultats géocodage, paramètres tenant — à traiter route par route au fil du sprint.

### P2 — ~~Pas de slow query log~~ ✅ Corrigé 2026-04-19

- `log_min_duration_statement = 500` en vigueur, `log_line_prefix '%t [%p]: user=%u,db=%d,app=%a,client=%h '`, PostgreSQL reload sans downtime. Logs visibles via `docker logs trackyu-gps-postgres-1`.
- **Backport src/ (D1 Phase 2.2 Config, 2026-04-20)** : configuration reflétée dans `src/config/database.ts`.

---

## 🟠 Importants

### P3 — 172 × `SELECT *` ⚠️ Campagne ciblée 2026-04-19

- `authRepository.checkUserExists` et `checkPendingRegistration` : `SELECT * → SELECT 1 LIMIT 1` (usage = existence uniquement). Gain marginal en perf mais élimine 2 fuites potentielles si mapping front pas strict.
- `authRepository.findUserByEmail` et `findUserById` : `SELECT *` **conservés** — nécessaires pour `bcrypt.compare(password_hash)`. Les responses API sont sanitizées en aval (`userController.js:79,127` filtre `password_hash`, `reset_token`, `plain_password`).
- **Découverte critique au passage** : colonne `users.plain_password` stocke les mots de passe **en clair** en DB. Voir S11 dans le rapport sécurité — priorité > P3.
- **Reste** : 170 autres `SELECT *` à analyser. Priorité `invoices*`, `tenants*` au prochain sprint.

### P4 — 47 `LIMIT` seulement pour 592 `SELECT FROM`

- Ratio < 8 %. Routes comme `GET /fleet/vehicles`, `GET /invoices`, `GET /audit-logs` retournent probablement des listes non bornées.
- **Fix** : pagination cursor-based obligatoire (par `id` ou `created_at desc + id tiebreaker`) sur toutes les routes liste.

### P5 — ~~Pool PG sans instrumentation~~ ✅ Corrigé 2026-04-19

- `config/database.js` : `setInterval(30 s)` qui surveille `pool.waitingCount`. Log warning `[PoolMonitor] Contention detected` (totalCount, idleCount, waitingCount, streakCycles) dès 2 cycles consécutifs de waiting > 0. Log info `Contention resolved` à la fin d'un streak. Silencieux en healthy state. `.unref()` pour ne pas bloquer l'arrêt process.
- Backup : `dist.bak/p5-20260419T204828Z/`. Script : `patch_p5_pool_monitor.py`.
- **Backport src/ (D1 Phase 2.2 Config, 2026-04-20)** : pool monitor reflété dans `src/config/database.ts`. Commit `e1a11fd`.

### P6 — Rooms Socket.io granulaires mais pas de back-pressure

- `vehicle:{id}` émet à chaque position reçue (GT06 ~30 s). 1841 véhicules → potentiel 60 msg/s par client superadmin connecté à tous.
- **Fix** :
  - Filtre côté serveur : un client reçoit seulement ses véhicules visibles (déjà le cas via rooms, ✅).
  - Ajouter un `throttle` 1 Hz pour les clients CLIENT/USER dans un écran multi-véhicules.

---

## 🟡 À surveiller

### P7 — ~~Redis sans `maxmemory`~~ ✅ Corrigé 2026-04-19

- `CONFIG SET maxmemory 268435456` + `maxmemory-policy allkeys-lru` appliqués dynamiquement (sans restart). Usage 2.25 MB / 256 MB (0.88 %).
- Persisté dans `docker-compose.yml` : `redis-server --save 60 1 --loglevel warning --maxmemory 256mb --maxmemory-policy allkeys-lru --requirepass ...`.
- **Backport src/ (D1 Phase 2.2 Config, 2026-04-20)** : cohérence côté config TS validée dans le repo Git.

### P8 — ~~Indexes manquants sur top slow queries~~ ✅ Partiellement corrigé 2026-04-19

- **Slow query #1 (famille `tiers` + correlated subquery devices)** : `SELECT t.*, (SELECT COUNT(*) FROM devices d WHERE d.assigned_client_id = t.id AND d.status='INSTALLED') FROM tiers t WHERE t.tenant_id=$1 ORDER BY t.created_at DESC` — observée 10+ fois sur 24h, 1.1–1.5 s chacune.
  - Cause : SeqScan sur `devices` (3361 rows) répété 1509 fois (193 k buffer hits).
  - Fix : `CREATE INDEX CONCURRENTLY idx_devices_assigned_client_status ON devices (assigned_client_id, status)`. Subplan passe en **Index Only Scan**.
  - Mesure : **645 ms → 8.3 ms (-98.7 %)**, buffers 193 312 → 3 213.
- **Doublon d'index nettoyé** : `idx_tiers_tenant_id` (0 scans) supprimé, `idx_tiers_tenant` conservé (56 scans, 12 k lectures).
- **Slow query #2 (invoices) ✅ corrigée 2026-04-19** : `financeRepository.js:105` cast inutile `c.id::text = i.contract_id::text` retiré (colonnes déjà `uuid`). Plan : Merge Right Join + 2 Sorts → Hash Left Join direct. Mesure brute : **35 ms → 19 ms (-46 %)**. Sous charge (plaintes à 1.0–2.5 s observées) gain attendu supérieur. Backup : `dist.bak/p8b-*/`.
- **Reste ouvert (décision produit requise)** :
  - `payments` LEFT JOIN invoices (1.1 s) : filtrée par tenant si non-staff, **mais pas de LIMIT** → staff plein-scan. À discuter : LIMIT par défaut 1000 + cursor pagination vs usage export.
  - `journal_entries` JOIN lines (1.66 s) : idem, pas de LIMIT staff-side.
- **Bug applicatif corrigé 2026-04-19** : tables `user_preferences` et `tenant_settings` n'existaient pas (script `create_settings_tables.js` jamais exécuté en prod). Créées via DDL `IF NOT EXISTS` (UUID PK, user_id/tenant_id UNIQUE, indexes). Les erreurs `relation "user_preferences" does not exist` ont cessé.
- 79 indexes `tenant_id` / 317 total déjà en place — l'analyse composite continue route par route au fil du sprint.

### P9 — ~~`zoho_invoices` 8 MB avec 0 rows~~ ❎ Faux positif 2026-04-19

- Les stats `n_live_tup=0` étaient obsolètes (pas d'ANALYZE récent). Les tables zoho sont **pleines** : zoho_invoices 6597 rows, zoho_payments 4416, zoho_invoice_items 8821, zoho_recurring_invoices 1671, zoho_quotes 701, zoho_recurring_invoice_items 1682, zoho_quote_items 1361.
- `VACUUM FULL` exécuté sur les 7 tables : `found 0 removable` → pas de bloat réel. Gain ~4 % (réorganisation des pages).
- `ANALYZE` global forcé → stats à jour pour le query planner. Gain indirect sur futurs EXPLAIN.
- À retenir : ne pas se fier à `pg_stat_user_tables` sans ANALYZE préalable.

---

## ✅ Déjà solide

- PgBouncer transaction mode pour REST + `directPool` dédié pour LISTEN/NOTIFY.
- `statement_timeout=10s` — tue les queries runaway.
- TimescaleDB pour `positions` + `eco_driving_events` (compression auto).
- Socket.io rooms par véhicule/tenant (pas de broadcast global).
- Rate-limit Redis-backed cohérent multi-instance.

---

## Plan

| #   | Action                                        | Effort               | Gain estimé         |
| --- | --------------------------------------------- | -------------------- | ------------------- |
| P1  | Redis cache permissions + tiers               | 4 h                  | -40 % P95 dashboard |
| P2  | Slow query log 500 ms                         | 15 min               | Visibilité          |
| P3  | Remplacer `SELECT *` sur user/tenant/invoices | 3 h                  | Sécu + perf         |
| P4  | Pagination cursor-based routes liste          | 6 h                  | Listes bornées      |
| P7  | Redis maxmemory + LRU                         | 10 min               | Protection OOM      |
| P8  | EXPLAIN ANALYZE top-10 + indexes              | 3 h                  | -20 % queries       |
| P9  | VACUUM FULL zoho\_\*                          | 30 min (maintenance) | -25 MB bloat        |
