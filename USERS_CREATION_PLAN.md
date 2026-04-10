# Plan — Création de comptes utilisateurs TrackYu
> Dernière mise à jour : 2026-04-06 (session 3) — BACKEND TERMINÉ ✅ | FRONTEND PENDING
> Contexte : Système de gestion GPS multi-tenant (tenant_abj / tenant_smt)

---

## Objectif final

Permettre la création complète et cohérente de :
- **Utilisateurs principaux** (CLIENT, RESELLER, ADMIN, STAFF...)
- **Sous-utilisateurs** (SOUS_COMPTE rattaché à un client)
- **Branches** (agences/filiales rattachées à un client)
- **Comptes liés à un Tier** (création automatique lors de la création d'un client CRM)

---

## Architecture des entités

```
tenants         (tenant_abj, tenant_smt)
    └── tiers           (CLI-ABJ-xxxxx, REV-ABJ-x, SUP-SMT-xxxxx)
            ├── users           (compte d'accès à la plateforme)
            │       └── sub-users   (SOUS_COMPTE rattachés au client)
            └── branches        (agences/filiales du client)
                    └── vehicles    (véhicules rattachés à la branche)
```

**Règle clé** : `clientId` dans `users`, `branches`, `vehicles` = `tiers.id` (format `CLI-{SLUG}-{NNNNN}`)

---

## Chemins de création (entrées)

| # | Entrée | Formulaire | Cible |
|---|--------|------------|-------|
| A | Paramètres → Gestion → Utilisateurs | `UserForm` (7 onglets) | `users` (rôle CLIENT) |
| B | Paramètres → Gestion → Sous-utilisateurs | `SubUserForm` | `users` (rôle SOUS_COMPTE) |
| C | CRM → Tier → TierForm (checkbox) | `TierForm` + `createUserAccount` | `tiers` + `users` liés |
| D | Paramètres → Gestion → Branches | `BranchForm` | `branches` |

---

## Avancement par chemin

### Chemin A — UserForm (Paramètres → Utilisateurs) ✅ COMPLET

| Étape | Statut | Notes |
|-------|--------|-------|
| Formulaire collecte nom, email, mot de passe, rôle, clientId | ✅ | 7 onglets : Personnel, Sécurité, Paramètres, Permissions, Sous-comptes, Documents, Branches |
| `handleFormSubmit` crée l'objet `newUser` | ✅ Corrigé | ID : `USR-${Date.now()}` (plus `Math.random()`) |
| `addUser()` → `api.users.create()` → `POST /api/users` | ✅ | Via DataContext mutation |
| Backend `POST /api/users` : hash password, INSERT users | ✅ | `userController.createUser` — bcrypt + tenant isolation |
| Branche par défaut créée automatiquement | ✅ Corrigé | `clientId: data.clientId` (plus `companyName`) |
| Erreur backend surfacée à l'utilisateur | ✅ Corrigé | `mutateAsync` + try/catch → toast `error` avec message exact |
| Mot de passe transmis depuis UserForm vers API | ✅ Vérifié | Chemin complet intact : form → payload → bcrypt backend |
| Lien `users.clientId` → `tiers.id` (format CLI-xxx) | ✅ Corrigé | Sélecteur dropdown clients dans Tab 0 → alimente `clientId` + `companyName` |
| `subRole`, `clientId`, `branchId`, `vehicleIds`, `allVehicles` persistés | ✅ Corrigé | DB migration + patch userRepository.js + userController.js + services/api/admin.ts |

### Chemin B — SubUserForm (Paramètres → Sous-utilisateurs) ✅ COMPLET

| Étape | Statut | Notes |
|-------|--------|-------|
| Formulaire collecte nom, email, rôle (Manager/User/Viewer), véhicules, permissions | ✅ | `SubUserForm` avec sélecteur client, branches, véhicules |
| `role` forcé à `SOUS_COMPTE` à la création | ✅ Corrigé | `subRole: data.role` préservé pour Manager/User/Viewer |
| `subRole` persisté en base | ✅ Corrigé | Colonne `sub_role varchar(30)` + patch backend |
| `clientId` lié au tier parent | ✅ Fonctionnel | Sélecteur présent dans SubUserForm, transmis via payload, sauvegardé |
| `addUser()` → `POST /api/users` | ✅ | |
| Filtrage onglet subaccounts → affiche `SOUS_COMPTE` seulement | ✅ Corrigé | |
| Permissions granulaires persistées à la **création** | ✅ Corrigé | `insertUser` inclut maintenant `permissions` ($40) — format JSON array |

### Chemin C — TierForm (CRM → checkbox createUserAccount) ✅ COMPLET

| Étape | Statut | Notes |
|-------|--------|-------|
| `TierForm` crée le tier CLIENT avec ID `CLI-{SLUG}-{NNNNN}` | ✅ Corrigé | `get_next_number()` actif en backend |
| Checkbox `createUserAccount` dans TierForm UI | ✅ Présent | `TierForm.tsx:538` — checked par défaut |
| Backend `POST /api/tiers` avec `createUserAccount: true` | ✅ | `tierController.js` gère le cas — crée user avec email + mot de passe temp |
| Frontend `SettingsView` : appel `addUser()` si `createUserAccount === 'on'` | ✅ Corrigé | Avant = toast mort, maintenant appel réel |
| Email d'invitation ou mot de passe temporaire envoyé | ✅ Backend | `sendPasswordResetEmail` si email réel fourni |
| Lien `users.clientId` = `tiers.id` (le CLI-xxx nouvellement créé) | ✅ Corrigé | `USR-${Date.now()}` normalisé — patch `tierController.js` appliqué |

### Chemin D — BranchForm (Paramètres → Branches) ✅ COMPLET

| Étape | Statut | Notes |
|-------|--------|-------|
| Formulaire crée une branche avec `clientId` | ✅ | `addBranch()` → `POST /api/branches` |
| Branche par défaut auto-créée à la création d'un user (chemin A) | ✅ Corrigé | `clientId: data.clientId` (plus `companyName`) |
| Rattachement branche → tier (FK `branches.client_id → tiers.id`) | ✅ DB | Contrainte FK CASCADE en base |

---

## Problèmes ouverts

### Frontend (session suivante)

| # | Problème | Fichier | Impact |
|---|----------|---------|--------|
| F1 | `requirePasswordChange: true` non géré côté frontend | `LoginScreen` / `AuthContext` | L'utilisateur peut se connecter sans être redirigé vers le changement de mot de passe |
| F2 | Écran "Changer votre mot de passe" à créer | `features/auth/` ou `features/settings/` | Nécessaire pour fermer la boucle de sécurité |
| F3 | Après changement de mot de passe → backend doit remettre `require_password_change = false` | `authController.resetPassword` ou nouvel endpoint | Vérifier que le `resetPassword` existant fait bien cela |

### Mineurs

| # | Problème | Fichier | Impact |
|---|----------|---------|--------|
| M4 | Format ID user incohérent en base (UUID anciens vs `USR-{ts}` nouveaux) | `users` table | Traçabilité — pas bloquant pour les nouvelles créations |
| m2 | Branche par défaut créée sans attendre l'ID réel backend | `SettingsView.tsx:1104` | Si `addUser` async échoue, branche orpheline possible |

---

## Résolus

| # | Problème | Résolution |
|---|----------|------------|
| C1 | ID user créé via Tier = `usr-{tierId}-{ts}` | ✅ → `USR-${Date.now()}` |
| C2 | `onError` sur `addUserMutation` = log seulement | ✅ → `mutateAsync` + toast `error` |
| M1 | `data.password` non transmis | ✅ Vérifié fonctionnel |
| M2 | `users.clientId` dans UserForm non lié à tiers.id | ✅ → sélecteur dropdown CLI-xxx |
| M3 | Checkbox `createUserAccount` absente du TierForm | ✅ Déjà présente (`TierForm.tsx:538`) |
| m1 | `subRole` non persisté en backend | ✅ → DB `sub_role varchar(30)` + patch repository + controller + API frontend |
| m3 | Permissions SOUS_COMPTE absentes de `insertUser` | ✅ → colonne `permissions` + $40 ajoutés dans INSERT SQL + controller |

---

## Prochaines étapes (ordre de priorité)

```
1. [x] Vérifier data.password dans api.users.create()                     (M1) ✅
2. [x] Vérifier users.clientId = tiers.id dans UserForm                   (M2) ✅
3. [x] Toast d'erreur dans onError de addUserMutation                      (C2) ✅
4. [x] Normaliser ID user créé via Tier (USR-{ts})                        (C1) ✅
5. [x] Checkbox createUserAccount dans TierForm UI                         (M3) ✅
6. [x] Persister subRole en backend (sub_role varchar(30))                 (m1) ✅
7. [x] Ajouter permissions dans insertUser (colonne + valeur)              (m3) ✅
8. [x] Tester le flux complet end-to-end (création → login)               ✅
```

---

## Flux backend actif — `POST /api/users`

```
Frontend (UserForm / SubUserForm)
    → api.users.create(payload)
        → POST /api/users
            → authMiddleware (JWT requis)
            → requireAdmin
            → validateRequest(UserSchema)
            → createUser()
                → check email unique
                → bcrypt.hash(password, 10)
                → userRepository.insertUser(id, data)
                    → INSERT users (id, email, password_hash, plain_password, name, role,
                                    tenant_id, avatar, phone, [34 champs RH],
                                    client_id, branch_id, vehicle_ids, all_vehicles, sub_role)
                → INSERT user_tenant_access (si allowedTenants fourni)
                → upsertSubUser() pour chaque sous-compte (si fournis)
                → AuditService.log()
            → 201 { id, email, name, role, tenant_id, sub_role, client_id, ... }
```

## Flux backend actif — `POST /api/tiers` avec createUserAccount

```
Frontend (TierForm → createUserAccount: true)
    → api.tiers.create(payload)
        → POST /api/tiers
            → createTier()
                → get_next_number(tenant_id, 'client') → CLI-{SLUG}-{N}
                → INSERT tiers
                → [si createUserAccount]
                    → génère email si absent
                    → userId = USR-${Date.now()}
                    → INSERT users (userId, email, hash, CLIENT, tenantId)
                    → sendPasswordResetEmail (si email réel)
            → 201 { tier + _userAccount }
```

---

## Mots de passe — Logique par chemin de création

### Chemin A — UserForm (CLIENT / MANAGER / TECH…)

| Cas | Source du mot de passe | Stockage |
|-----|----------------------|----------|
| `sendInvite: false` (normal) | Saisi par l'admin dans le formulaire | `bcrypt.hash(password, 10)` → `password_hash` + `plain_password` (clair) |
| `sendInvite: true` | `Math.random().toString(36).slice(-12)` (12 chars alphanumériques) | idem + email de reset envoyé à l'utilisateur |

### Chemin B — SubUserForm (SOUS_COMPTE)

| Cas | Source du mot de passe |
|-----|----------------------|
| `sub.password` fourni | Mot de passe saisi → `bcrypt.hash()` |
| Aucun password fourni | **`'Trackyu2025!'` hardcodé** ⚠️ — le SubUserForm n'a pas de champ password |

> ✅ **Résolu** : SOUS_COMPTE sans password → `Trackyu2025!` par défaut + `require_password_change = true` → l'utilisateur est forcé de changer à la 1ère connexion.

### Chemin C — TierForm + createUserAccount

| Étape | Détail |
|-------|--------|
| Mot de passe généré | **`'Trackyu2025!'` hardcodé** |
| Email réel fourni | JWT reset token (7 jours) envoyé → user doit définir son propre mot de passe |
| Email généré auto | `tempPassword` retourné dans la réponse API (à afficher à l'admin) |

> ✅ Le mot de passe `Trackyu2025!` est temporaire — `require_password_change = true` est toujours mis sur ces comptes. L'utilisateur est forcé de changer à la 1ère connexion.

#### Logique `require_password_change`

| Cas | Valeur | Comportement |
|-----|--------|-------------|
| SOUS_COMPTE sans password | `true` | Login OK + `requirePasswordChange: true` dans réponse → frontend redirige vers changement |
| `sendInvite: true` | `true` | idem |
| createUserAccount (Tier) | `true` | idem |
| Password explicite fourni | `false` | Login normal |

La colonne `require_password_change` est remise à `false` par le `resetPassword` existant lorsque l'utilisateur choisit son nouveau mot de passe.

## Stockage en base

| Colonne | Contenu |
|---------|---------|
| `password_hash` | Hash bcrypt (10 rounds) |
| `plain_password` | Mot de passe **en clair** ⚠️ — utilisé pour la récupération admin, présent dans tous les chemins |

---

## IDs — Convention en vigueur

| Entité | Format | Exemple | Générateur |
|--------|--------|---------|------------|
| Client | `CLI-{SLUG}-{NNNNN}` | `CLI-ABJ-01507` | `get_next_number()` |
| Revendeur | `REV-{SLUG}-{NNNNN}` | `REV-ABJ-00002` | `get_next_number()` |
| Fournisseur | `SUP-{SLUG}-{NNNNN}` | `SUP-SMT-00005` | `get_next_number()` |
| Utilisateur | `USR-{timestamp}` | `USR-1775257265918` | `Date.now()` |
| Tenant | `tenant_{slug}` | `tenant_abj` | Manuel |
| Véhicule | `ABO-{hex6}` | `ABO-7C02B7` | ? |

---

## DB — Migrations appliquées

| Date | Migration | Résultat |
|------|-----------|---------|
| 2026-04-06 | `users.client_id` : `uuid` → `varchar(50)` | ✅ |
| 2026-04-06 | `users.branch_id` : `uuid` → `varchar(50)` | ✅ |
| 2026-04-06 | `users.sub_role` : ADD COLUMN `varchar(30)` | ✅ |
| 2026-04-06 | IDs `TIER-{ts}` → `CLI-ABJ-*` / `CLI-SMT-*` (3 records) | ✅ |
