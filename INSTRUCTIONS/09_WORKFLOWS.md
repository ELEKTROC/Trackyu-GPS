# 📋 Workflows de Développement

## 🎯 Ajouter un Nouveau Module Frontend

### Étapes

1. **Créer la structure**
```
features/{module}/
└── components/
    ├── {Module}View.tsx      # Vue principale
    ├── {Entity}Form.tsx      # Formulaire création/édition
    └── {Entity}List.tsx      # Liste avec filtres
```

2. **Ajouter le lazy import** (`/LazyViews.tsx`)
```typescript
export const Lazy{Module}View = withLazyLoad(
  () => import('./features/{module}/components/{Module}View').then(m => ({ default: m.{Module}View })),
  '{Module}'
);
```

3. **Ajouter la vue dans App.tsx** (section `renderView`)
```typescript
case View.{MODULE}:
  return <Lazy{Module}View />;
```

4. **Ajouter la permission** (`/types.ts`)
```typescript
type Permission = 
  // ... existing
  | 'VIEW_{MODULE}'
  | 'CREATE_{ENTITY}'
  | 'EDIT_{ENTITY}'
  | 'DELETE_{ENTITY}'
```

5. **Ajouter au menu** (`/components/Sidebar.tsx`)
```typescript
{ 
  view: View.{MODULE}, 
  label: "{Module}", 
  icon: IconName, 
  requiredPerm: 'VIEW_{MODULE}' 
}
```

6. **Ajouter les méthodes API** (`/services/api.ts`)
```typescript
{module}: {
  list: () => apiCall<{Entity}[]>('GET', '/api/{module}'),
  getById: (id: string) => apiCall<{Entity}>('GET', `/api/{module}/${id}`),
  create: (data: {Entity}Input) => apiCall<{Entity}>('POST', '/api/{module}', data),
  update: (id: string, data: Partial<{Entity}>) => apiCall<{Entity}>('PUT', `/api/{module}/${id}`, data),
  delete: (id: string) => apiCall<void>('DELETE', `/api/{module}/${id}`),
}
```

---

## ⚙️ Ajouter une Nouvelle Route Backend

### Étapes

1. **Créer le fichier routes** (`/backend/src/routes/{entity}Routes.ts`)
```typescript
import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';
import * as controller from '../controllers/{entity}Controller';

const router = Router();

router.get('/', authenticateToken, requirePermission('VIEW_{ENTITY}'), controller.list);
router.get('/:id', authenticateToken, requirePermission('VIEW_{ENTITY}'), controller.getById);
router.post('/', authenticateToken, requirePermission('CREATE_{ENTITY}'), controller.create);
router.put('/:id', authenticateToken, requirePermission('EDIT_{ENTITY}'), controller.update);
router.delete('/:id', authenticateToken, requirePermission('DELETE_{ENTITY}'), controller.delete);

export default router;
```

2. **Créer le controller** (`/backend/src/controllers/{entity}Controller.ts`)
```typescript
import { Request, Response } from 'express';
import pool from '../db/pool';

export const list = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM {entities} WHERE tenant_id = $1',
      [req.user.tenantId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ... autres méthodes
```

3. **Enregistrer la route** (`/backend/src/index.ts`)
```typescript
import {entity}Routes from './routes/{entity}Routes';
app.use('/api/{entity}', {entity}Routes);
```

4. **Ajouter les méthodes dans api.ts** (voir section Frontend)

---

## 🗄️ Créer une Migration Base de Données

### Étapes

1. **Créer le fichier SQL**
```bash
# Format: YYYYMMDD_description.sql
backend/migrations/20260115_add_vehicle_color.sql
```

2. **Écrire la migration**
```sql
-- Migration: 20260115_add_vehicle_color.sql
-- Description: Ajouter le champ couleur aux véhicules

ALTER TABLE vehicles ADD COLUMN color VARCHAR(50);

-- Index si nécessaire
CREATE INDEX idx_vehicles_color ON vehicles(color);

-- Rollback (commenté pour référence)
-- ALTER TABLE vehicles DROP COLUMN color;
```

3. **Exécuter en local**
```bash
cd backend && npm run db:migrate
```

4. **Déployer en production**
```bash
# Option 1: Via deploy.ps1
.\deploy.ps1 -backend

# Option 2: Migration manuelle via SSH
ssh root@148.230.126.62 "cat /var/www/trackyu-gps/backend/migrations/20260115_add_vehicle_color.sql | docker exec -i trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db"
```

5. **Mettre à jour les types** (`/types.ts`)
```typescript
interface Vehicle {
  // ... existing
  color?: string;  // Nouveau champ
}
```

---

## 🚀 Déployer en Production

### ⚠️ IMPORTANT - Architecture Docker

Le backend utilise une **image Docker** avec le code intégré (`COPY dist ./dist` dans le Dockerfile).

**Conséquences :**
- Un simple `docker restart` ne met PAS à jour le code
- Il faut **reconstruire l'image** avec `docker-compose build --no-cache backend`
- Le script `deploy.ps1` fait cela automatiquement

**Erreur courante :**
```bash
# ❌ MAUVAIS - Ne met PAS à jour le code
docker restart trackyu-gps_backend_1

# ❌ MAUVAIS - Copie les fichiers mais le conteneur utilise l'image
scp -r backend/dist/* server:/var/www/trackyu-gps/backend/dist/
docker restart trackyu-gps_backend_1

# ✅ BON - Utiliser le script de déploiement
.\deploy.ps1 -backend
```

### Commandes de déploiement

### Frontend uniquement
```powershell
.\deploy.ps1 -frontend
```

### Backend uniquement
```powershell
.\deploy.ps1 -backend
```

### Tout déployer
```powershell
.\deploy.ps1 -all
```

### Options avancées
```powershell
# Déployer sans rebuilder (utilise le build existant)
.\deploy.ps1 -frontend -nobuild

# Simuler le déploiement sans exécuter
.\deploy.ps1 -dryrun

# Combiner les options
.\deploy.ps1 -backend -nobuild
```

### Vérifications automatiques
Le script effectue automatiquement :
- Test connexion SSH avant déploiement
- Vérification du nombre de fichiers déployés vs locaux
- Vérification spécifique des fichiers vendor (vendor-*.js)
- Health check HTTP du backend (/api/health)

### Déploiement manuel

```bash
# 1. Build local
npm run build

# 2. Copier vers le serveur
scp -r dist/* root@148.230.126.62:/var/www/trackyu-gps/dist/

# 3. Backend
cd backend && npm run build
scp -r dist/* root@148.230.126.62:/var/www/trackyu-gps/backend/dist/

# 4. Redémarrer le backend
ssh root@148.230.126.62 "cd /var/www/trackyu-gps && docker-compose restart backend"
```

---

## 🔄 Workflow Git

### Convention de commits
```bash
feat(module): description     # Nouvelle fonctionnalité
fix(module): description      # Correction de bug
chore: description           # Maintenance
refactor(module): description # Refactorisation
docs: description            # Documentation
style: description           # Formatage
test: description            # Tests
```

### Branches
```bash
main        # Production stable
develop     # Développement actif
feature/*   # Nouvelles fonctionnalités
fix/*       # Corrections de bugs
```

### Avant de committer

**Husky pre-commit hooks** (automatique) :
- `tsc --noEmit` sur frontend et backend (bloque si erreurs TypeScript)
- Scan de secrets dans les fichiers staged (bloque si credentials détectés)

```powershell
# Vérification manuelle supplémentaire si nécessaire
git status
git diff --staged | Select-String -Pattern "password|secret|api_key|token"
npm run build
```

### Après un push

**GitHub Actions CI/CD** (`.github/workflows/ci.yml`) s'exécute automatiquement :

| Job | Étapes |
|-----|--------|
| **frontend** | npm ci → tsc --noEmit → vitest run → vite build → bundle size check |
| **backend** | npm ci → tsc --noEmit → jest → esbuild |
| **security** | npm audit → secrets scan (grep hardcoded keys) |

Les tests doivent passer avant de merger sur `main` ou `develop`.

### Fichiers à ne JAMAIS committer
- `.env` (secrets)
- `*.log`
- `node_modules/`
- `dist/` (sauf déploiement manuel)

---

## 🧪 Tests

### Frontend (Vitest 4.0.15)
```bash
npm run test           # Mode watch
npx vitest run         # Exécution unique
npx vitest run --coverage  # Avec couverture
```

| Métrique | Valeur |
|----------|--------|
| Tests pass | 155 / 189 (82%) |
| Suites pass | 5 / 19 |
| Config | `vitest.config.ts` + `setupTests.ts` |

### Backend (Jest 30.2)
```bash
cd backend && npx jest --verbose
```

| Métrique | Valeur |
|----------|--------|
| Tests pass | 78 / 78 (100%) |
| Fichiers | `auth.test.ts` (40) + `tenant-isolation.test.ts` (35) + `utils.test.ts` (3) |
| Config | `jest.config.ts` + `tests/setup.ts` |

### Tests de charge GPS
```bash
npm run load-test:100   # 100 trackers simulés
npm run load-test:1000  # 1000 trackers simulés
```

---

## 🐛 Debugging

### Frontend (Chrome DevTools)
1. Ouvrir les DevTools (F12)
2. Onglet Network pour les requêtes API
3. Onglet Console pour les erreurs
4. React DevTools pour l'état des composants

### Backend (Logs)
```bash
# Logs en temps réel
ssh root@148.230.126.62 "docker logs -f trackyu-gps_backend_1"

# Logs avec filtres
docker logs trackyu-gps_backend_1 2>&1 | grep -i error
```

### Base de données
```bash
# Connexion psql
docker exec -it trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db

# Requêtes de debug
SELECT * FROM vehicles WHERE tenant_id = 'xxx' LIMIT 10;
```

## 🧪 Déploiement Staging

### Prérequis
- DNS : staging.trackyugps.com → 148.230.126.62
- Conteneurs staging démarrés

### Workflow recommandé

```bash
# 1. Tester en local
npm run build

# 2. Déployer sur staging
scp -r dist/* root@148.230.126.62:/var/www/trackyu-gps-staging/dist/
ssh root@148.230.126.62 "docker restart staging_frontend"

# 3. Tester staging (4-8h minimum)
https://staging.trackyugps.com

# 4. Si OK, déployer en production
.\deploy.ps1 -all
```

### Vérification staging
```bash
# Logs backend staging
ssh root@148.230.126.62 "docker logs -f staging_backend"

# Test API staging
curl https://staging.trackyugps.com/api/auth/login
```

---

## 💾 Sauvegarde Base de Données

### Avant déploiement/migration
```bash
# Toujours sauvegarder avant d’intervenir en production
./scripts/backup-db.sh manual
```

### Automatisation cron
```bash
0 2 * * * /var/www/trackyu-gps/scripts/backup-db.sh daily
0 3 * * 0 /var/www/trackyu-gps/scripts/backup-db.sh weekly
```

Rétention : 7 daily, 4 weekly, 10 manual.

---

## 📄 Onboarding Développeur

1. Cloner le repo
2. Copier `.env.example` → `.env` et remplir les variables
3. `npm install --legacy-peer-deps`
4. `cd backend && npm install`
5. `docker-compose up -d` (TimescaleDB + Redis)
6. `cd backend && npm run db:migrate`
7. `npm run dev` (frontend) + `cd backend && npm run dev` (backend)

---

*Dernière mise à jour : 2026-02-10*
