# ⚠️ Consignes pour Agents IA

> Ce document liste les erreurs fréquentes à éviter et les bonnes pratiques à suivre.

## 🔴 Erreurs Critiques (Bugs en Production)

### 1. Oublier le filtrage `tenant_id`

**TOUJOURS** filtrer par `tenant_id` pour l'isolation multi-tenant :

```typescript
// ❌ MAUVAIS - Fuite de données entre tenants
const vehicles = await db.query('SELECT * FROM vehicles');

// ✅ BON - Isolation par tenant
const vehicles = await db.query(
  'SELECT * FROM vehicles WHERE tenant_id = $1',
  [req.user.tenantId]
);
```

### 2. Créer des doublons d'entités

Vérifier l'existence avant création (pattern 409 Conflict) :

```typescript
// ❌ MAUVAIS - Création sans vérification
await db.query('INSERT INTO devices (imei) VALUES ($1)', [imei]);

// ✅ BON - Vérification préalable
const existing = await db.query(
  'SELECT id FROM devices WHERE imei = $1 AND tenant_id = $2',
  [imei, tenantId]
);
if (existing.rows.length > 0) {
  return res.status(409).json({ error: 'Device already exists' });
}
```

**Champs uniques à vérifier :**
- `devices.imei`
- `users.email`
- `tiers.email` (par type et tenant)
- `tenants.slug`
- `invoices.number` (par tenant)

### 3. Ne pas invalider le cache TanStack Query

```typescript
// ❌ MAUVAIS - UI désynchronisée
await api.vehicles.create(data);

// ✅ BON - Cache invalidé
await api.vehicles.create(data);
queryClient.invalidateQueries({ queryKey: ['vehicles'] });
```

### 4. Appels API directs

```typescript
// ❌ MAUVAIS - Ne fonctionne pas avec mode mock
const response = await fetch('/api/vehicles');

// ✅ BON - Service centralisé
import { api } from '../services/api';
const vehicles = await api.vehicles.list();
```

---

## 🟡 Erreurs Moyennes (Régressions)

### 5. Créer des composants en double

**TOUJOURS** vérifier avant de créer :
```
/components/              → Composants UI génériques
/features/{module}/components/  → Composants spécifiques
```

### 6. Hardcoder les URLs API

```typescript
// ❌ MAUVAIS
const API_URL = 'http://localhost:3001';

// ✅ BON
import { API_BASE_URL } from '../utils/apiConfig';
```

### 7. Modifier la DB sans migration

```bash
# ❌ MAUVAIS - Modification directe
ALTER TABLE vehicles ADD COLUMN color VARCHAR(50);

# ✅ BON - Migration
# 1. Créer backend/migrations/YYYYMMDD_add_color.sql
# 2. npm run db:migrate
```

### 8. Déployer le backend sans reconstruire l'image Docker

```bash
# ❌ MAUVAIS - Le conteneur utilise l'ancienne image
scp -r backend/dist/* server:/var/www/trackyu-gps/backend/dist/
docker restart trackyu-gps_backend_1

# ❌ MAUVAIS - docker cp ne survit pas au restart
docker cp fichier.js trackyu-gps_backend_1:/app/dist/

# ✅ BON - Utiliser le script de déploiement
.\deploy.ps1 -backend
# OU manuellement:
# 1. Copier backend/dist/* sur le serveur
# 2. docker-compose build --no-cache backend
# 3. docker-compose stop backend && docker-compose rm -f backend
# 4. docker-compose up -d backend
```

### 9. Oublier les permissions RBAC

```typescript
// ❌ MAUVAIS
router.get('/data', controller.getData);

// ✅ BON
router.get('/data', authenticateToken, requirePermission('VIEW_DATA'), controller.getData);
```

### 10. Utiliser `window.confirm()` natif

```typescript
// ❌ MAUVAIS - Popup native, pas stylée
if (window.confirm('Supprimer ?')) { ... }

// ✅ BON - Composant ConfirmDialog
import { useConfirmDialog } from '../hooks/useConfirmDialog';
const { confirm, ConfirmDialogComponent } = useConfirmDialog();
const ok = await confirm({ title: 'Confirmer', message: '...', variant: 'danger' });
```

### 11. Utiliser react-window v2

```typescript
// ❌ MAUVAIS - react-window v2 a une API cassante
import { List } from 'react-window';

// ✅ BON - react-window v1.8.10
import { FixedSizeList as List } from 'react-window';
```

### 12. Utiliser la syntaxe TailwindCSS 3.x

```css
/* Le projet utilise TailwindCSS 4.1 */
/* Vérifier la compatibilité des classes utilitaires */
/* La palette utilise slate (pas gray) pour la cohérence */
```

---

## 🟢 Bonnes Pratiques

### 9. Utiliser les types partagés

```typescript
// ❌ MAUVAIS - Type inline
const vehicle: { id: string; name: string } = ...

// ✅ BON - Type centralisé
import { Vehicle } from '../types';
const vehicle: Vehicle = ...
```

### 10. Validation Zod

```typescript
// ❌ MAUVAIS - Validation manuelle
if (!data.email || !data.email.includes('@')) { ... }

// ✅ BON - Schéma Zod
import { VehicleSchema } from '../schemas/vehicleSchema';
const result = VehicleSchema.safeParse(data);
```

### 11. Logger les actions sensibles

```typescript
AuditService.log({
  userId: req.user.id,
  action: 'DELETE',
  entityType: 'vehicle',
  entityId: vehicleId,
  details: { reason: 'Supprimé' }
});
```

### 12. Formats de données corrects

```typescript
// Dates
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
format(date, 'dd MMMM yyyy', { locale: fr });

// Monnaie
new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

// Icônes
import { Car, User } from 'lucide-react';
```

---

## 🔍 Checklist Avant Soumission

- [ ] `tenant_id` filtré dans toutes les requêtes DB
- [ ] Vérification d'existence avant INSERT
- [ ] Cache TanStack Query invalidé après mutations
- [ ] Pas d'URLs API hardcodées
- [ ] Pas de composants dupliqués
- [ ] Migration créée si modification DB
- [ ] Types importés depuis `/types.ts`
- [ ] Permissions RBAC sur les routes
- [ ] Textes UI en français
- [ ] `useConfirmDialog` au lieu de `window.confirm()`
- [ ] `FixedSizeList` (react-window v1) pour virtualisation
- [ ] Palette `slate` (pas `gray`) pour Tailwind
- [ ] Tests pass (78/78 backend, viser 155+ frontend)
- [ ] Pas de `console.log` — utiliser `logger` côté backend

---

## 📁 Fichiers à ne JAMAIS Modifier

| Fichier | Raison |
|---------|--------|
| `/types.ts` | Source de vérité |
| `/services/api.ts` | Impact global |
| `/contexts/AuthContext.tsx` | Auth critique |
| `/backend/src/index.ts` | Point d'entrée |
| `/utils/apiConfig.ts` | Détection mobile |
| `/backend/src/middleware/authMiddleware.ts` | Sécurité |

---

## 🚫 Patterns Interdits

```typescript
// ❌ console.log en production
console.log('debug', data);

// ❌ any sans justification
const data: any = ...

// ❌ Ignorer les erreurs
try { } catch (e) { /* silence */ }

// ❌ Import *
import * as Icons from 'lucide-react';

// ❌ Mutation directe
state.items.push(newItem);

// ❌ SQL injection
db.query(`SELECT * FROM users WHERE id = '${userId}'`);

// ❌ window.confirm natif
if (confirm('Supprimer ?')) { ... }
```

---

## 🧪 Contexte CI/CD

Les modifications sont validées automatiquement par :
1. **Husky pre-commit** : `tsc --noEmit` + scan secrets
2. **GitHub Actions** : tests frontend (Vitest) + backend (Jest) + security audit

**Objectifs tests :**
- Backend : 78/78 (100%) — ne pas casser
- Frontend : 155/189 (82%) — ne pas régresser

## 🛡️ Contexte Sécurité

**16 audits de sécurité ont été réalisés** (~250+ issues corrigées). Les patterns suivants sont établis dans tout le codebase :
- `isStaffUser()` pour le bypass SuperAdmin (pas `role === 'SUPERADMIN'`)
- `req.user.tenantId` comme source de vérité (jamais `req.body.tenantId`)
- `requirePermission()` sur toutes les routes
- `logger.error()` au lieu de `console.error()` côté backend
- Requêtes SQL paramétrées pour les intervalles et colonnes dynamiques

---

## 📝 Exemples de Code

| Besoin | Exemple |
|--------|---------|
| Module frontend | `/features/crm/` |
| Route CRUD | `/backend/src/routes/vehicleRoutes.ts` |
| Formulaire validation | `/features/crm/components/LeadFormModal.tsx` |
| Liste avec filtres | `/features/fleet/components/FleetView.tsx` |
| Export PDF/CSV | `/features/finance/components/InvoiceList.tsx` |
| WebSocket | `/features/map/components/MapView.tsx` |
| Détection doublons | `/backend/src/controllers/deviceController.ts:54` |

---

*Dernière mise à jour : 2026-02-10*
