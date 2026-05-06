# Audit backend — Sécurité

**Date** : 2026-04-18
**Dernière mise à jour** : 2026-04-20
**Scope** : VPS prod `148.230.126.62:/var/www/trackyu-gps/backend/dist` (canonical) + repo Git TS `trackyu-backend` (migration D1)
**Méthode** : SSH read-only, grep sur code compilé + docker-compose + .env

---

## Note backport src/ (D1, 2026-04-20)

Les patches sécurité S5 (P1), S6, S10, S11 (volet middleware) sont désormais présents à l'identique dans `src/` (TypeScript) via Phase 2.4 du chantier D1 — fin du "patch dist-only" pour ces items. Détails par item ci-dessous. Reste S4 (controllers), S11 (controllers/repositories) et S8 (console.log progressif) dans les phases 2.6+.

---

## 🚨 Critiques (à corriger cette semaine)

### S1 — ~~`routes/vehicleExtrasRoutes.js` : SQL cassé + pool parallèle~~ ✅ Corrigé 2026-04-19

- Fichier entièrement réécrit : placeholders SQL `$1,$2,…` restaurés, pool commun `config/database` utilisé (RLS actif), `authenticateToken` + `requireAnyPermission(['VIEW_FLEET','MANAGE_FLEET'])` / `requirePermission('MANAGE_FLEET')` sur toutes les routes, pool local + fallback `fleet_password` supprimés.
- Backup : `/var/www/trackyu-gps/backend/dist.bak/s1-20260419T162903Z/vehicleExtrasRoutes.js`.
- Vérifié : `/api/fleet-tires` & `/api/v1/fleet-tires` → 401 sans token, backend healthy.

### S2 — ~~Secrets en clair dans `docker-compose.yml`~~ ✅ Corrigé 2026-04-19

- `REDIS_PASSWORD` (command + REDIS_URL) et `FIREBASE_SERVICE_ACCOUNT` (JSON complet avec clé privée, 2315 chars) sortis vers `/var/www/trackyu-gps/.env`.
- Fallbacks dangereux durcis : `${DB_USER:-fleet_user}` → `${DB_USER:?DB_USER required}` (démarrage refuse si .env manque), idem DB_PASS, DB_NAME, REDIS_PASSWORD, FIREBASE_SERVICE_ACCOUNT.
- Overlay healthcheck : password redis hardcodé remplacé par `${REDIS_PASSWORD}`.
- `chmod 600 /var/www/trackyu-gps/.env`. Pas de repo git sur le VPS → pas de fuite historique.
- Rotation effective du password Redis : ✅ **faite 2026-04-19** — nouveau password 32 bytes hex (64 chars) généré via `openssl rand -hex 32`, remplacé dans `.env`, `docker compose up -d --no-deps redis backend` (recréation coordonnée). Redis healthy, Socket.IO Redis adapter reconnecté, DBSIZE=18 préservé (volume `redis_data` intact). Backup : `/var/www/trackyu-gps/.env.bak-redis-rotation-*` chmod 600.
- Backup (S2 initial) : `/var/www/trackyu-gps/backup/s2s3-20260419T164345Z/`.

### S3 — ~~`ACCESS_TOKEN_EXPIRY=86400` (24 h)~~ ✅ Corrigé 2026-04-19

- `.env` : `ACCESS_TOKEN_EXPIRY=15m` + `ACCESS_TOKEN_EXPIRY_SECONDS=900`.
- `docker-compose.yml` : valeurs inline remplacées par `${ACCESS_TOKEN_EXPIRY:-15m}` et `${ACCESS_TOKEN_EXPIRY_SECONDS:-900}`.
- Backend recréé, 35 sessions actives (5 users) : refresh tokens 7j intacts → reconnexion silencieuse au prochain call.

### S4 — ~~`Math.random()` pour secrets~~ ✅ Corrigé 2026-04-19

- `userController.js:159,429,463` : 3 temp passwords → `crypto_1.randomBytes(9).toString('base64url').slice(0,12)` (et variant 10+2 upper).
- `utils/registrationParser.js:58` : `chars.charAt(crypto.randomInt(0, chars.length))` + import `crypto` ajouté.
- `ApiKeyController.js:105` : ID clé API → `crypto_1.default.randomBytes(6).toString('hex').slice(0,9)`.
- Backup : `/var/www/trackyu-gps/backend/dist.bak/s4-20260419T162528Z/`. Node `--check` OK, backend healthy, GPS ingère.

---

## 🟠 Importants (sprint en cours)

### S5 — ~~bcrypt rounds = 10~~ ✅ Phase 1 corrigée 2026-04-19 (rehash opportuniste = Phase 2)

- **Phase 1 (fait)** : `BCRYPT_ROUNDS=12` centralisé via `utils/bcryptConfig.js` (exposé `parseInt(process.env.BCRYPT_ROUNDS || '12', 10)`, clamp 10-15).
- 13 call sites patchés dans 5 fichiers : `authController.js`, `userController.js`, `tierController.js`, `ApiKeyController.js`, `services/registrationWorkflows.js`. Toutes les `bcrypt.genSalt(10)`, `bcrypt.hash(X, 10)`, `bcrypt.hashSync(X, 10)` → `BCRYPT_ROUNDS`.
- `BCRYPT_ROUNDS=12` ajouté à `/var/www/trackyu-gps/.env` + `docker-compose.yml` (`${BCRYPT_ROUNDS:-12}`).
- Backend recréé, healthy, GPS ingestion intact, login smoke test OK (401 pour user inconnu).
- **Impact** : anciens hashes `$2b$10$` restent valides (bcrypt.compare symétrique). Tous les NOUVEAUX hashes (register, reset, change-password, admin create user, client create) utilisent 12 rounds.
- **Backup** : `dist.bak/s5-20260419T232005Z/` + `docker-compose.yml.bak-s5-*`. Script : `patch_s5_bcrypt.py`.
- **Phase 2 (à faire)** : rehash opportuniste dans `authController.js:188` (après `bcrypt.compare` OK, si `hash.startsWith('$2b$10$')` → rehash + UPDATE non-bloquant). Migration progressive sans disruption.
- **Backport src/ (D1 Phase 2.1 Utils, 2026-04-20)** : `utils/bcryptConfig.ts` présent dans [trackyu-backend](https://github.com/ELEKTROC/trackyu-backend). Le dist/ prod restera la source tant que Phase 3 non atteinte.

### S6 — ~~Upload magic bytes partiels~~ ✅ Corrigé 2026-04-19

- `uploadMiddleware.js` étendu sans dep additionnelle :
  - Binaires : OLE (`D0CF11E0…` pour DOC/XLS), ZIP (`PK\x03\x04…` pour DOCX/XLSX/ZIP), RAR v4+v5, WebP (RIFF + offset 8 = `WEBP`)
  - Texte TXT/CSV : fonction `isTextSafe` (accepte tab/LF/CR + printable ASCII + UTF-8 multi-byte, rejette bytes de contrôle suspects)
  - SVG : détection XML (`<?xml` ou `<svg` dans les 256 premiers chars)
  - Fallback changé `true` → `false` : tout mimetype whitelist non couvert = rejet (defense in depth)
- 16/16 tests validés en container : 9 types légitimes acceptés, 7 spoofs (EXE en .png/.pdf, bin en .doc/.rar, CSV binaire, WebP faux, SVG non-XML) rejetés.
- Backup : `/var/www/trackyu-gps/backup/s6-20260419/`. Script : `patch_s6_magic_bytes.py`.
- **Backport src/ (D1 Phase 2.4 Middleware, 2026-04-20)** : `src/middleware/uploadMiddleware.ts` réécrit avec la même logique magic bytes (MAGIC_BYTES_EXTENDED + `validateMagicBytes` + `isTextSafe` + détection SVG XML). Commit `61849c1`.

### S7 — ~~Permissions `.env`~~ ✅ Corrigé 2026-04-19

- Tous les `.env*` actifs en `600` : `/var/www/trackyu-gps/.env`, `backend/.env`, `backend/.env.example`, fichiers backup.
- Fichiers `backend/.env.save` et `.env.save.1` (traces édit nano contenant anciens secrets) déplacés vers `backup/d4-bak-20260419/` en 600.

### S8 — ~~199 `console.log` en code prod~~ ✅ Re-scopé 2026-04-19

- Vérification ciblée (`console.*` avec token/password/secret/bearer dans `controllers/middleware/routes/services/utils/repositories`) : **0 occurrence sensible dans le code runtime**.
- Les seules lignes contenant password/hash/token sont dans `scripts/` (one-off, non chargés par le serveur) et `scripts-archive-*/` (archivé D5).
- Reste : 1059 `console.*` répartis dans 116 fichiers runtime — dette de propreté (bruit dans docker logs), **pas risque sécurité**. À traiter lors de la remise au carré `src/` (D1), pas en urgence.
- Migration scripts `migrations/zoho/*` = console.log légitime (scripts one-off, pas de logger nécessaire).

---

## 🟡 À surveiller

### S11 — ~~**Mot de passe en clair en DB**~~ ✅ Corrigé 2026-04-19 (chiffrement AES-256-GCM + endpoint contrôlé)

- **Contexte métier conservé** : support (STAFF sauf TECH) doit pouvoir récupérer un mot de passe utilisateur (alignement avec TRAKZEE). Solution : chiffrement réversible avec contrôles d'accès stricts au lieu de stockage en clair.
- **Backend** (prod, pas de staging) :
  - Colonne `users.encrypted_password TEXT` ajoutée (format AES-256-GCM `iv:authTag:ciphertext` base64 via `utils/encryption.js` existant, clé `ENCRYPTION_KEY` déjà en `.env` chmod 600).
  - 273/273 users migrés (`plain_password` → `encrypted_password`), roundtrip vérifié par échantillon.
  - Points d'écriture patchés pour chiffrer + mettre `plain_password = NULL` :
    - `authController.js:79` (changement mot de passe user)
    - `userRepository.js:107` (createUser INSERT)
    - `userRepository.js:305` (setPassword reset flow)
  - `USER_COLS` ne retourne plus `plain_password`.
  - Filtre payload `GET /users` + `GET /users/:id` : strip `plain_password` **et** `encrypted_password`, ajout flag `hasPassword: boolean` (toutes branches : canSeeAllPasswords / client-self / defaut / getUserById).
  - Nouvel endpoint `POST /users/:id/reveal-password` :
    - Re-auth obligatoire (bcrypt compare du mot de passe du caller)
    - Self-view universel (tout rôle peut voir son propre mot de passe)
    - Règles autres : TECH et CLIENT refusés ; STAFF hors TECH voit son propre tenant ; `tenant_default` voit cross-tenant
    - Audit log (`action=PASSWORD_REVEALED`, entité USER, `isSelf`, `targetEmail`, IP, UA)
    - Rate limiter Redis `rl:reveal-pwd:` = 20 req/h/user (`revealPasswordLimiter` dans `rateLimiter.js`)
  - Colonne `plain_password` vidée (`UPDATE users SET plain_password = NULL` → 273 rows). `DROP COLUMN` planifié après 48 h d'observation prod.
- **Backup** : `/var/www/trackyu-gps/backend/dist.bak/s11-20260419T213159Z/` (authController, userController, userRepository originaux).
- **Scripts** : `patch_s11_encrypt_writes.py` + `patch_s11_usercontroller.py` + `patch_s11_reveal_endpoint.py` + `migrate_plain_to_encrypted.js`.
- **Smoke test** : endpoint répond 401 sans auth, backend healthy, aucune erreur au restart.
- **Frontend (staging déployé 2026-04-19)** :
  - `services/api/admin.ts` : `plain_password` retiré du mapping, flag `hasPassword` + fonction `revealPassword(userId, adminPassword)`.
  - `services/api/usePasswordReveal.ts` + `PasswordRevealModal.tsx` : hook réutilisable (unlock 5 min RAM, jamais persisté) + modal ré-auth partagé.
  - `SettingsView.tsx` : reveal par ligne (plus de reveal global) + modal extrait.
  - `StaffPanelV2.tsx` : reveal par ligne sur la colonne mot de passe (SUPERADMIN only côté UI, backend vérifie règles).
  - `MyAccountView.tsx` : nouveau bloc « Voir mon mot de passe » (self-view universel).
  - `types.ts` : `hasPassword?: boolean` ajouté à `SystemUser`.
  - Déployé sur https://staging.trackyugps.com via `deploy-staging.ps1 -frontend`.
- **Reste** :
  - Tester les 3 surfaces sur staging (reveal par ligne + self-view + erreurs mauvais mot de passe)
  - Déployer en prod web après validation staging (approbation explicite requise)
  - `DROP COLUMN plain_password` après 48 h d'observation prod
- **Backport src/ (D1 Phase 2.4 Middleware, 2026-04-20)** : `revealPasswordLimiter` (20/h) présent dans `src/middleware/rateLimiter.ts`. `auditMiddleware.ts` : `sanitizeBody` rendu récursif + liste SENSITIVE étendue (plain_password, encrypted_password, reset_token, authorization, cin, iban…). Les points d'écriture chiffrement (`authController`, `userRepository`) seront backportés en Phase 2.6 (Controllers/Services) puis 2.7 (Routes). Commit `61849c1`.

### S9 — CSP `unsafe-inline` sur styles

- Helmet config autorise `style-src 'self' 'unsafe-inline'`. Nécessaire pour MUI/Tailwind inline, mais ouvre XSS stylistique.
- **Fix futur** : nonces si migration Emotion SSR.

### S10 — ~~Pas de rate-limit sur `/api/fleet/geocode`~~ ✅ Corrigé 2026-04-19

- Provider réel = **Google Maps** (pas Nominatim comme l'audit initial supposait). Risque = abus de quota facturé.
- Cache DB **déjà en place** via table `geocoded_addresses` + `ReverseGeocodingService` (rayon 20 m). Cache Redis additionnel non nécessaire.
- Ajout : `exports.geocodeLimiter` dans `middleware/rateLimiter.js` (windowMs 1 min, max 60 req/min/tenant, Redis-backed prefix `rl:geocode:`, fallback IP pour anonymes).
- Appliqué sur `router.get('/geocode', rateLimiter_1.geocodeLimiter, requirePermission('VIEW_FLEET'), …)` dans `routes/fleetRoutes.js:152`.
- Backup : `dist.bak/s10-20260419T204614Z/`. Script : `patch_s10_geocode_limiter.py`.
- **Backport src/ (D1 Phase 2.4 Middleware, 2026-04-20)** : `src/middleware/rateLimiter.ts` full rewrite avec les 6 limiters (auth/api/passwordReset/ai/geocode/revealPassword) + dynamic `rate-limit-redis` store + ioredis client + `keyGenerator` par tenant (fallback IP). Commit `61849c1`.

---

## ✅ Déjà solide

- Helmet strict (CSP, HSTS, X-Frame-Options).
- CORS whitelist explicite (pas de `*`).
- JWT HS256 + validation `aud`/`iss`, refresh token opaque UUID avec détection de famille (revoke en cascade).
- Cookies `httpOnly` + `secure` + `sameSite=strict`.
- Rate-limit tiered Redis-backed (auth 10/15min, api 300/min, reset 5/h, ai 10/min).
- RLS via `AsyncLocalStorage` → chaque requête DB porte le tenant.
- Swagger protégé par basic-auth en prod.
- Impersonation SUPERADMIN-only, auditée.

---

## Plan

| #   | Action                                          | Effort                          | État                                    |
| --- | ----------------------------------------------- | ------------------------------- | --------------------------------------- |
| S1  | Fix `vehicleExtrasRoutes.js` + pool commun      | 2 h                             | ✅                                      |
| S2  | Rotation secrets + `.env.prod`                  | 1 h                             | ✅                                      |
| S3  | Remettre `ACCESS_TOKEN_EXPIRY=900`              | 5 min                           | ✅                                      |
| S4  | Remplacer `Math.random()` (3 fichiers)          | 30 min                          | ✅                                      |
| S5  | bcrypt 12 (P1 ✅) + rehash opportuniste (P2 ⏳) | 1 h                             | 🔄                                      |
| S6  | magic bytes uploads                             | 1 h                             | ✅                                      |
| S7  | `chmod 600 .env*`                               | 2 min                           | ✅                                      |
| S8  | purge `console.log` → logger                    | 2 h                             | ✅ (re-scopé : 0 fuite sensible)        |
| S10 | rate-limit `/api/fleet/geocode`                 | 30 min                          | ✅                                      |
| S11 | AES-GCM `encrypted_password` + endpoint reveal  | 1 j (back prod + front staging) | 🔄 valider staging → prod → DROP COLUMN |
