# Résumé session — 2026-04-06
> À lire en début de prochaine session

---

## Ce qui a été fait (backend complet)

### 1. DB — Migrations appliquées sur VPS

| Migration | Résultat |
|-----------|----------|
| `users.client_id` : `uuid` → `varchar(50)` | ✅ |
| `users.branch_id` : `uuid` → `varchar(50)` | ✅ |
| `users.sub_role` : ADD COLUMN `varchar(30)` | ✅ |
| `users.require_password_change` : ADD COLUMN `boolean DEFAULT false` | ✅ |
| IDs `TIER-{ts}` → formats corrects (3 records) | ✅ |

### 2. Backend VPS — Patches appliqués (`dist/`)

| Fichier | Changements |
|---------|-------------|
| `repositories/userRepository.js` | USER_COLS + insertUser 40 colonnes (client_id, branch_id, vehicle_ids, all_vehicles, sub_role, permissions) |
| `controllers/userController.js` | destructure 6 champs, pass à insertUser, normalizeRole + SOUS_COMPTE, require_password_change logic |
| `controllers/tierController.js` | get_next_number, USR-{ts}, client_id lié au tier, require_password_change = true |
| `controllers/authController.js` | requirePasswordChange dans réponse login |
| `schemas/index.js` | UserSchema : 6 champs ajoutés (subRole, clientId, branchId, vehicleIds, allVehicles, permissions) |

### 3. Frontend local — Patch appliqué

| Fichier | Changement |
|---------|------------|
| `services/api/admin.ts` | payload `create` inclut subRole, clientId, branchId, vehicleIds, allVehicles |

### 4. Protection build TypeScript

- `package.json` VPS : scripts `build`, `build:tsc`, `prod:build`, `prod:update` bloqués
- `src/controllers/userController.ts.archive` et `tierController.ts.archive` — archivés
- `BACKEND_ARCHITECTURE.md` créé sur VPS

### 5. Logique mot de passe (testée E2E)

| Cas | Comportement |
|-----|-------------|
| SOUS_COMPTE sans password | `Trackyu2025!` par défaut + `require_password_change = true` |
| `sendInvite: true` | Password random 12 chars + `require_password_change = true` |
| createUserAccount (Tier) | `Trackyu2025!` + `require_password_change = true` |
| Password explicite fourni | Hash normal, `require_password_change = false` |
| Login avec flag `true` | Token émis + `requirePasswordChange: true` dans réponse |

---

## Tests E2E passés (tous ✅)

| Chemin | Résultat |
|--------|----------|
| A — UserForm CLIENT | role + client_id + permissions OK |
| B — SubUserForm SOUS_COMPTE | role=SOUS_COMPTE + sub_role + client_id + vehicle_ids + permissions OK |
| C — TierForm createUserAccount | tier CLI-ABJ-{N} + user.client_id = tier.id OK |
| D — BranchForm | branch_id + client_id OK |

---

## Ce qui reste (prochaine session)

### Priorité 1 — Frontend : gestion `requirePasswordChange`

Le backend retourne `requirePasswordChange: true` dans la réponse login quand l'utilisateur doit changer son mot de passe.

**À faire côté frontend :**

1. **Détecter** `user.requirePasswordChange === true` dans le handler login (AuthContext / LoginScreen)
2. **Rediriger** vers un écran "Changer votre mot de passe" au lieu du dashboard
3. **Créer l'écran** avec :
   - Champ "Nouveau mot de passe" (min 8 chars, confirmation)
   - Appel `PATCH /api/auth/change-password` ou `POST /api/auth/reset-password`
   - Succès → remettre `require_password_change = false` en backend + rediriger dashboard
4. **Vérifier** que `resetPassword` existant (`POST /api/auth/reset-password`) remet le flag à `false`

**Fichiers concernés :**
- `contexts/DataContext.tsx` ou `contexts/AuthContext` — intercepter `requirePasswordChange`
- `features/auth/` ou `features/settings/` — nouvel écran
- Mobile : `trackyu-mobile-expo/src/screens/` — même logique

### Priorité 2 — Régression frontend (autre session)

Le frontend a subi une régression (mentionné en début de session, traitement dédié).

### Priorité 3 — Synchronisation backend TS (autre session)

- Sources `.ts` archivées, dist = source canonique
- Plan de sync discuté mais non démarré (effort 3-5 semaines, pas prioritaire)

---

## Fichiers locaux créés cette session

```
TRACKING/
├── USERS_CREATION_PLAN.md          — Plan complet, à jour
├── RESUME_SESSION_2026_04_06.md    — Ce fichier
├── patch_user_sub_role.py          — (première tentative, remplacée par v2)
├── patch_user_sub_role_v2.py       — Fixes 3-7 userRepository + userController
├── patch_insertuser_fix.py         — Fix INSERT SQL 34→40 cols + permissions
├── patch_normalize_role.py         — SOUS_COMPTE dans whitelist normalizeRole
├── patch_tier_client_id.py         — client_id = newId dans INSERT users tierController
├── patch_require_password_change.py — Colonne + flag login + tierController
├── patch_sous_compte_password.py   — SOUS_COMPTE accepte null password
└── migrate_users_sub_role.py       — Migration DB (déjà exécutée)
```

---

## Commandes utiles VPS

```bash
# Login admin
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dg@trackyugps.com","password":"TrackYu2026!"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])"

# Vérifier un user en base
docker exec 6e9a3283ca3b_trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -c \
  "SELECT id, email, role, client_id, sub_role, require_password_change FROM users WHERE email = 'xxx';"

# Redémarrer le backend
docker restart trackyu-gps-backend-1

# Logs
docker logs --tail=20 trackyu-gps-backend-1
```
