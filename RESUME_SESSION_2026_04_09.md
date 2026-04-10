# Résumé session — 2026-04-09
> À lire en début de prochaine session

---

## Périmètre de la session

Audit backend production + correctifs bugs critiques (génération IDs, création user CLIENT).

---

## 1. Diagnostic VPS (SSH → Docker)

État des patches backend en production au moment de l'audit :

| Patch | Fichier | État |
|-------|---------|------|
| `normalizeRole` + SOUS_COMPTE/RESELLER/SUPPLIER | `userController.js` | ✅ Appliqué (3 occ.) |
| `get_next_number()` pour CLI-/REV- | `tierController.js` | ✅ Appliqué (3 occ.) |
| Fallback `TIER-Date.now()` | `tierController.js` | ✅ Supprimé (0 occ.) |
| `sub_role` dans USER_COLS | `userRepository.js` | ✅ Appliqué (4 occ.) |
| `require_password_change` | `userRepository.js` | ✅ Appliqué (1 occ.) |
| `permissions` dans insertUser | `userRepository.js` | ✅ Appliqué (7 occ.) |

---

## 2. DB — Correction appliquée directement en production

### Tier avec ID TIER- restant

| Ancien ID | Nouveau ID | Nom | Tenant |
|-----------|-----------|-----|--------|
| `TIER-1775718584024` | `CLI-ABJ-01511` | KACOU GHISLAIN | tenant_abj |

- Aucune FK dépendante (users, tickets, branches, contracts : 0 lignes liées)
- Renommage via `UPDATE tiers SET id = (SELECT get_next_number('tenant_abj', 'client')) WHERE id = 'TIER-1775718584024'`
- **0 IDs `TIER-` restants** en base après correction

---

## 3. Bugs identifiés + cause exacte

### Bug A — Génération TIER- côté frontend (TierForm)

**Cause** : `TierForm.tsx:73` générail `id: formData.id || \`TIER-${Date.now()}\`` pour les nouveaux tiers.
Le backend `tierController.js` branche sur `if (id) { newId = id; }` → bypass complet de `get_next_number()`.

**Constraint DB confirmée** :
```
chk_no_business_in_default: CLIENT/RESELLER/SUPPLIER interdits dans tenant_default
chk_default_tenant_staff_only: seuls SUPERADMIN/ADMIN/MANAGER/COMMERCIAL/TECH/SUPPORT_AGENT/AGENT_TRACKING/COMPTABLE dans tenant_default
```

### Bug B — Création user CLIENT échoue (SettingsView / DataContext)

**Cause** : `DataContext.tsx:1113` forçait `tenantId: tenantId || user.tenantId || 'tenant_default'`.
Pour un SUPERADMIN connecté sur `tenant_default`, tous les users créés héritaient de `tenant_default`
→ violation de `chk_default_tenant_staff_only` → HTTP 400.

Le formulaire collecte déjà `resellerId` (ex: `REV-ABJ-00001`) mais son `tenantId` (`tenant_abj`)
n'était jamais propagé à l'objet user envoyé au backend.

---

## 4. Fixes frontend (local, en attente de déploiement)

> ⚠️ NON déployés — le frontend local a des régressions potentielles.
> À déployer uniquement après stabilisation du build local.

### Fix 1 — `features/crm/components/TierForm.tsx:73`

```typescript
// AVANT
id: formData.id || `TIER-${Date.now()}`,

// APRÈS
// Pour les nouveaux tiers, ne pas fournir d'ID — backend génère CLI-/REV-/SUP- via get_next_number()
id: formData.id || undefined,
```

### Fix 2 — `features/settings/components/SettingsView.tsx` (création user)

```typescript
// AVANT
const newUser = {
    id: `USR-${Date.now()}`,
    ...data,
    name: ...,
    role: ...,
    // Pas de tenantId → héritage de tenant_default → contrainte DB
};

// APRÈS
// Dériver tenantId depuis le revendeur ou tier client sélectionné
const selectedReseller = resellers.find(r => r.id === dataAny.resellerId);
const selectedClientTier = tiers.find(t => t.id === dataAny.clientId);
const resolvedTenantId = selectedReseller?.tenantId || selectedClientTier?.tenantId;

const newUser = {
    ...data,
    name: ...,
    role: ...,
    ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}),
};
```

### Fix 3 — `contexts/DataContext.tsx:1113` (addUserMutation)

```typescript
// AVANT
mutationFn: (user: SystemUser) => api.users.create({
    ...user,
    tenantId: tenantId || user.tenantId || 'tenant_default', // contexte écrase user.tenantId
}),

// APRÈS
mutationFn: (user: SystemUser) => api.users.create({
    ...user,
    tenantId: user.tenantId || tenantId || 'tenant_default', // user.tenantId prioritaire
}),
```

---

## 5. Audit backend — Autres bugs identifiés (non corrigés)

| Sévérité | Fichier | Description |
|----------|---------|-------------|
| 🔴 CRITIQUE | `backend/src/routes/deviceRoutes.ts` | `requireAdmin` = no-op (`next()` direct) — routes `/api/admin/*` non protégées |
| 🟡 WARNING | `userFormSchema.ts:34` | `role: z.enum(['CLIENT', 'Admin', 'Manager', 'User', 'Viewer'])` — casse mixte vs backend uppercase |
| 🟡 WARNING | `services/api/admin.ts` | `parseInt(req.query.limit)` sans validation — `NaN` possible |
| 🟡 WARNING | `monitoring/alerts` | Shape réponse ambiguë — backend retourne tantôt `{alerts, total}` tantôt array brut |
| ℹ️ INFO | `users` table | IDs anciens = UUID, nouveaux = UUID (randomUUID) — les `USR-{ts}` frontaux sont ignorés par le backend |
| ℹ️ INFO | `alert_configs` | Table orpheline (remplacée par `schedule_rules`) |

---

## 6. Problèmes ouverts

| # | Problème | Priorité |
|---|----------|----------|
| P1 | Déploiement frontend bloqué — régressions locales à identifier et corriger | 🔴 |
| P2 | `requireAdmin` no-op sur `/api/admin/*` — sécurité critique à corriger | 🔴 |
| P3 | Module Reports mobile (`generators/`, `types.ts`, `reportsApi.test.ts`) — en cours d'investigation | 🟡 |
| P4 | `requirePasswordChange` non géré côté mobile LoginScreen | 🟡 |

---

## 7. Contexte technique rappel

- **Backend canonique** : `dist/` dans container Docker VPS (`trackyu-gps-backend-1`)
- **Path VPS** : `/app/dist/` (pas `/var/www/...`)
- **Patches** : scripts Python, exécutés via `ssh trackyu-vps "docker exec -i trackyu-gps-backend-1 sh -c ..."`
- **Frontend déploiement** : `.\deploy.ps1 -frontend` (delta, ~30s)
- **DB** : `docker exec 6e9a3283ca3b_trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db`
- **Tenants actifs** : `tenant_abj` (Abidjan), `tenant_smt` (SMT)
- **Contrainte clé** : `chk_default_tenant_staff_only` — CLIENT/SOUS_COMPTE interdits dans `tenant_default`
