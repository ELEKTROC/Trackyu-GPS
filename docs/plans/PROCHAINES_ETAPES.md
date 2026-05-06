# 🎯 PROCHAINES ÉTAPES - TrackYu GPS

**Date** : 2026-02-03  
**Status** : ✅ Corrections terminées - Prêt pour tests

---

## 📋 PLAN D'ACTION (4 PHASES)

⚠️ **APPLICATION DÉJÀ EN PRODUCTION** - Approche prudente obligatoire

### PHASE 1 : Tests Locaux COMPLETS (2h) ⚡ **À FAIRE MAINTENANT**

#### A. Clone de la DB Production vers Local (CRITIQUE)

```powershell
# 1. SSH vers production et dump la DB
ssh root@148.230.126.62

# Dump production (avec compression)
docker exec trackyu-gps_postgres_1 pg_dump -U fleet_user -Fc fleet_db > /tmp/prod_dump_20260203.dump

# Transférer vers local
exit
scp root@148.230.126.62:/tmp/prod_dump_20260203.dump ./

# 2. Restaurer en local (DB de test)
# ATTENTION: NE PAS écraser votre DB dev actuelle
createdb -U fleet_user fleet_db_test

pg_restore -U fleet_user -d fleet_db_test prod_dump_20260203.dump

# 3. Se connecter à la DB test
psql -U fleet_user -d fleet_db_test

# 2. Exécuter la migration sur DB TEST (clone production)
\i backend/src/db/migrations/20260203_security_fixes.sql

# ⚠️ Surveiller les erreurs attentivement

# 4. Vérifier les index créés
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename IN ('users', 'vehicles', 'devices', 'positions', 'leads')
ORDER BY tablename, indexname;

# 5. Vérifier les contraintes
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE conrelid::regclass::text IN ('users', 'devices', 'leads');

# 6. Quitter
\q
```

#### B. Tester le backend avec données RÉELLES de production

```powershell
# Modifier temporairement .env pour pointer vers fleet_db_test
# DATABASE_URL=postgresql://fleet_user:password@localhost:5432/fleet_db_test

cd backend
npm run dev
```

**Test 1 : Login avec VRAI utilisateur production**g on port 3001`

- Aucune erreur au démarrage
- Connexion DB réussie

#### C. Tests RÉELS avec données production

**⚠️ CRITIQUE** : Tester avec de VRAIES données clients

#### C. Tester l'API avec curl

**Test 1 : Login**

```powershell
# Remplacez par vos credentials
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@trackyugps.com","password":"votre_mot_de_passe"}'

$token = $response.token
Write-Host "Token: $token"
```

**Test 2 : Isolation Tenant (doit échouer)**

```powershell
# Tentative UPDATE user d'un autre tenant
Invoke-RestMethod -Uri "http://localhost:3001/api/users/AUTRE_USER_ID" `
  -Method PUT `
  -Headers @{"Authorization"="Bearer $token"} `
  -ContentType "application/json" `
  -Body '{"name":"Hacker"}'
# Attendu: 403 Forbidden ou 404 Not Found
```

**Test 3 : RBAC Finance (doit échouer si pas permission)**

```powershell
# Tentative DELETE invoice sans permission
Invoke-RestMethod -Uri "http://localhost:3001/api/invoices/INVOICE_ID" `
  -Method DELETE `
  -Headers @{"Authorization"="Bearer $token"}
# Attendu: 403 Forbidden si pas permission DELETE_INVOICE
```

**Test 4 : WebSocket Auth (doit réussir)**

```powershell
# Frontend devrait pouvoir se connecter
# Vérifier dans console navigateur: socket.connected === true
```

**Test 5 : Doublons Leads**

```powershell
# Créer un lead
$lead1 = Invoke-RestMethod -Uri "http://localhost:3001/api/leads" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"} `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","company_name":"Test Corp"}'

# Tentative doublon (doit échouer)
$lead2 = Invoke-RestMethod -Uri "http://localhost:3001/api/leads" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"} `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","company_name":"Different Corp"}'
# Attendu: 409 Conflict
```

---

#### D. Tests Frontend complet

#### A. Vérifier/Créer environnement staging

**Option 1 : Serveur staging dédié (RECOMMANDÉ)**

```powershell
# Serveur distinct de production
# Exemple: staging.trackyugps.com
```

**Option 2 : Docker local avec données production (MINIMUM)**

```powershell
# Si pas de staging serveur, utiliser Docker local
docker-compose -f docker-compose.staging.yml up -d

# Avec DB clone production
```

**⚠️ SI PAS DE STAGING** :

- Risque élevé ❌
- Tests locaux doivent être EXHAUSTIFS
- Déploiement production = fenêtre maintenance LONGUE (2-3h)
- Rollback plan OBLIGATOIRE✅ Login avec utilisateur STAFF

3. ✅ Accès Dashboard (graphiques, KPIs)
4. ✅ Carte GPS temps réel (WebSocket connecté)
5. ✅ Liste véhicules (affichage correct)
6. ✅ Créer un lead (détection doublons)
7. ✅ Créer une facture
8. ✅ Créer un ticket support
9. ✅ Navigation complète tous modules
10. ✅ Vérifier console navigateur (0 erreur JS)

**Durée minimale** : 30-45 min de navigation

---

### PHASE 2 : Validation Environnement Staging (OBLIGATOIRE) 🎭

⚠️ **NE JAMAIS déployer directement en production sans staging**

```powershell
mkdir backend\tests\security
New-Item backend\tests\security\tenant-isolation.test.ts
New-Item backend\tests\security\rbac.test.ts
New-Item backend\tests\security\gps-spoofing.test.ts
```

#### B. Template test isolation

````typescript
// backend/tests/security/tenant-isolation.test.ts
import request from 'supertest';
import app from '../../src/index';
import pool from '../../src/db/pool';

describe('Tenant Isolation', () => {
  let tenant1Token: string;
  let tenant2Token: string;
  let tenant1UserId: string;
  let tenant2UserId: string;

  beforeAll(async () => {
    // Setup test data
    // Login tenant1 user
    // Login tenant2 user
  });

  afterAll(async () => {
    // Cleanup
    await pool.end();
  });

  test('User from tenant1 cannot UPDATE user from tenant2', async () => {
    const res = await request(app)
      .put(`/api/users/${tenant2UserId}`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({ name: 'Hacker' });

    expect(res.status).toBe(403);
  });

  test('User from tenant1 cannot access vehicles from tenant2', async () => {
    const res = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${tenant1Token}`);

    expect(res.status).toBe(200);
    // Vérifier que les véhicules retournés sont SEULEMENT de tenant1
    res.body.forEach(vehicle => {
      expect(vehicle.tenant_id).toBe('tenant1_id');
    });
  });

  test('SUPER_ADMIN can access all tenants', async () => {
    // Login SUPER_ADMIN
    // Tester accès cross-tenant
### PHASE 3 : Déploiement Staging avec Monitoring (4-8h) 🚀

⚠️ **Staging OBLIGATOIRE** - Ne pas passer directement en production

#### A. Commit & Push (après tests locaux réussis)

#### C. Exécuter les tests

```powershell
cd backend
npm test -- tests/security/
````

---

### PHASE 3 : Déploiement Staging (30 min) 🚀

#### A. Commit & Push

```powershell
# 1. Vérifier les fichiers modifiés
git status

# 2. Voir les différences
git diff backend/src/controllers/userController.ts
git diff backend/src/socket.ts

# 3. Créer branche feature
git checkout -b feature/security-fixes-20260203

# 4. Ajouter les fichiers
git add backend/src/controllers/
git add backend/src/routes/
git add backend/src/socket.ts
git add backend/src/gps-server/parsers/gt06.ts
git add backend/src/db/migrations/20260203_security_fixes.sql
git add VERIFICATION_CORRECTIONS.md
git add RESUME_CORRECTIONS.md

# 5. Commit
git commit -m "fix(security): 15+ critical vulnerabilities - tenant isolation, RBAC, WebSocket auth, GPS spoofing

- userController: Email global unique, tenant isolation on UPDATE/DELETE
- vehicleController: GPS ownership verification, coordinate validation, SQL injection fix
- ticketController: SUPER_ADMIN cross-tenant access
- leadController: Backend duplicate detection
- financeRoutes: RBAC permissions on DELETE operations
- tierRoutes: Zod validation + RBAC
- socket.ts: JWT authentication middleware
- gt06.ts: IMEI variable extraction

Migration:
- 15+ performance indexes
- Email/IMEI/lead uniqueness constraints
- Duplicate cleanup
- 10 new RBAC permissions

Security Score: 52/100 → 78/100 (+26 points)

Refs: VERIFICATION_CORRECTIONS.md, RESUME_CORRECTIONS.md"

# 6. Push
git push origin feature/security-fixes-20260203
```

#### B. Déployer sur Staging

**Option 1 : CI/CD auto (si configuré)**

```powershell
# Le push déclenche auto le déploiement staging
# Monitorer les logs CI/CD
```

**Option 2 : Déploiement manuel**

````powershell
# SSH vers serveur staging
ssh root@staging.trackyugps.com

# Pull les changements
cd /var/www/trackyu-gps
git fetch origin
git checkout feature/security-fixes-20260203

# Build backend
cd backend
npm install
npm run build

# Migration DB
psql -U fleet_user -d fleet_db < src/db/migrations/20260203_security_fixes.sql

# Redémarrer backend
docker-compose restart backend

# Vérifier
docker logs -f trackyu-gps_backend_1
#### D. Monitoring INTENSIF (4-8h MINIMUM)

```powershell
# Surveiller les logs EN CONTINU
ssh root@staging.trackyugps.com "docker logs -f --tail=100 trackyu-gps_backend_1"

# Surveiller les erreurs
ssh root@staging.trackyugps.com "docker logs trackyu-gps_backend_1 2>&1 | grep -i error"

# Métriques (si Grafana configuré)
# Ouvrir https://staging.trackyugps.com:3000
````

#### E. Tests utilisateurs RÉELS sur staging

**⚠️ CRITIQUE** : Inviter 2-3 utilisateurs pilotes

**Checklist tests utilisateurs** :

- [ ] Login/logout (5x minimum)
- [ ] Navigation tous modules (Admin, Fleet, CRM, Finance, Map, Stock, Support)
- [ ] Créer/Modifier/Supprimer entités (véhicules, factures, leads, tickets)
- [ ] WebSocket temps réel (carte GPS)
- [ ] Export PDF/CSV
- [ ] Recherche et filtres
- [ ] Mobile (si Capacitor)
- [ ] Performance (pages < 2s)

**Durée recommandée** : 4-8h utilisation normale

### PHASE 4 : Déploiement Production (3-4h avec fenêtre maintenance) 🏭

⚠️ **PRODUCTION = AUCUNE ERREUR TOLÉRÉE**

#### A. Planification STRICTE

**Checklist pré-déploiement OBLIGATOIRE** :

- [ ] Tests staging réussis (4-8h monitoring MINIMUM)
- [ ] Tests utilisateurs pilotes OK (2-3 personnes)
- [ ] Performance staging validée (< 200ms)
- [ ] 0 erreur logs staging 24h avant
- [ ] Fenêtre maintenance communiquée **7 JOURS AVANT** (pas 48h)
- [ ] Backup DB production testé (restore en < 5min)
- [ ] Équipe complète disponible (Dev + DevOps + Support)
- [ ] Plan de communication clients préparé

#### B. Communication Clients (7 JOURS avant)

**J-7 : Email + SMS + Notification in-app**
**J-3 : Rappel email**
**J-1 : Rappel SMS + Notification push**
**H-2 : Bannière warning sur l'app**

**Template Email J-7** :

````
Objet: [IMPORTANT] Maintenance planifiée TrackYu GPS - Dimanche 10 février 2h-5h

Chers clients,

Une maintenance de sécurité majeure sera effectuée :
📅 Date : Dimanche 10 février 2026
🕐 Horaire : 02h00 - 05h00 (GMT)
⏱️ Durée estimée : 2-3 heuresès migration
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

# Index utilisés
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- Index jamais utilisés
ORDER BY pg_relation_size(indexrelid) DESC;
```est API
# ... répéter tests Phase 1
````

#### D. Monitoring (2-4h)

```powershell
# Surveiller les logs
ssh root@staging.trackyugps.com "docker logs -f --tail=100 trackyu-gps_backend_1"

# Surveiller les erreurs
ssh root@staging.trackyugps.com "docker logs trackyu-gps_backend_1 2>&1 | grep -i error"

# Métriques (si Grafana configuré)
# Ouvrir https://staging.trackyugps.com:3000
```

---

### PHASE 4 : Déploiement Production (2h avec fenêtre maintenance) 🏭

#### A. Planification

**Checklist pré-déploiement** :

- [ ] Tests staging réussis (2-4h monitoring)
- [ ] Fenêtre maintenance communiquée (48h avant)
- [ ] Backup DB production planifié
- [ ] Équipe disponible pour rollback
- [ ] Plan de communication clients

**Horaire recommandé** : Dimanche 23h-1h (faible trafic)
Impact:
⚠️ Service TOTALEMENT interrompu 2-3 heures
⚠️ Tracking GPS non disponible temporairement
⚠️ Aucune alerte envoyée pendant maintenance
✅ Données GPS sauvegardées (aucune perte)
✅ Historique complet accessible après
✅ Trackers continuent d'envoyer (stockage différé)

Améliorations apportées:

#### C. Procédure Déploiement Production (STRICTE)

**⚠️ Checklist pré-déploiement (1h avant)** :

- [ ] Équipe en ligne (Dev + DevOps + Support)
- [ ] Rollback plan imprimé/affiché
- [ ] Backups testés (restore < 5min)
- [ ] Clients prévenus (bannière activée)
- [ ] Monitoring prêt (Grafana ouvert)

````powershell
# T-60min : Activer bannière maintenance
ssh root@148.230.126.62
# TODO: Endpoint API pour activer mode maintenance

# T-30min : SSH Production
ssh root@148.230.126.62

# T-15min : Backup TRIPLE SÉCURITÉ
cd /var/www/trackyu-gps
DATE=$(date +%Y%m%d_%H%M%S)

# Backup 1: DB format SQL
docker exec trackyu-gps_postgres_1 pg_dump -U fleet_user fleet_db > "backups/db_$DATE.sql"
# Backup code complet
tar -czf "backups/code_$DATE.tar.gz" backend/ dist/ node_modules/

# Backup Redis (cache actuel)
docker exec trackyu-gps_redis_1 redis-cli SAVE
docker cp trackyu-gps_redis_1:/data/dump.rdb "backups/redis_$DATE.rdb"

# Vérifier TOUS les backups
ls -lh backups/
# ATTENDRE confirmation taille > 0

# Tester restore backup DB (CRITIQUE)
echo "Test restore..."
docker exec trackyu-gps_postgres_1 createdb -U fleet_user fleet_db_test_restore
docker exec -i trackyu-gps_postgres_1 pg_restore -U fleet_user -d fleet_db_test_restore < "backups/db_$DATE.dump"
docker exec trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db_test_restore -c "SELECT COUNT(*) FROM users;"
# Si erreur = STOP déploiement

# T-0min : STOP APPLICATION
docker-compose down
# ⚠️ App totalement arrêtée = clients bloqués

# 3. Merge feature branchtgres_1:/tmp/pgdata_$DATE.tar.gz "backups/"
# 5. Restart DB container UNIQUEMENT
docker-compose up -d postgres

# Attendre DB ready
sleep 10

# 6. Migration DB (MOMENT CRITIQUE)
echo "Début migration DB..."
cat src/db/migrations/20260203_security_fixes.sql | docker exec -i trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db 2>&1 | tee migration_output.log
# 8. Restart TOUS les services
cd /var/www/trackyu-gps
docker-compose up -d

# 9. Vérifier démarrage (CRITIQUE)
docker logs -f --tail=100 trackyu-gps_backend_1

# Attendu dans les 30 secondes:
# ✓ Connected to PostgreSQL
# ✓ Connected to Redis
# ✓ Server running on port 3001
# ✓ GPS server listening on port 5000
# ✓ Socket.IO initialized

# Si erreur = ROLLBACK IMMÉDIAT

# 10. Tests smoke COMPLETS (5-10 min)
# Test 1: Health check
curl https://trackyugps.com/api/health
# Attendu: {"status":"ok"}

# Test 2: Login
curl -X POST https://trackyugps.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trackyugps.com","password":"xxx"}'
# Attendu: {"token":"..."}

# Test 3: Liste véhicules
TOKEN="..." # Copier du test 2
curl https://trackyugps.com/api/vehicles \
#### E. ROLLBACK (si problème) ⚠️ PROCÉDURE URGENCE

**Décision rollback si** :
- Backend ne démarre pas après 2 min
- Erreur critique logs (FATAL, CRITICAL)
- Tests smoke échouent (> 2/7)
- Performance dégradée > 50%
- Plaintes clients > 3 en 10 min

**PROCÉDURE ROLLBACK < 10 MIN** :

```powershell
# 1. STOP tout
docker-compose down

# 2. Restaurer DB (format custom = plus rapide)
DATE="20260203_HHMMSS" # Remplacer par votre backup
docker-compose up -d postgres
sleep 10

# Drop DB actuelle (corrompue)
docker exec trackyu-gps_postgres_1 psql -U fleet_user -c "DROP DATABASE fleet_db;"
docker exec trackyu-gps_postgres_1 psql -U fleet_user -c "CREATE DATABASE fleet_db;"

# Restore backup
docker exec -i trackyu-gps_postgres_1 pg_restore -U fleet_user -d fleet_db < "backups/db_$DATE.dump"

# Vérifier restore
docker exec trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db -c "SELECT COUNT(*) FROM users;"

# 3. Restaurer code
git reset --hard HEAD~1
cd backend
npm install
npm run build

# 4. Restaurer Redis
docker cp "backups/redis_$DATE.rdb" trackyu-gps_redis_1:/data/dump.rdb

# 5. Restart ALL
cd /var/www/trackyu-gps
docker-compose up -d

# 6. Vérifier IMMÉDIATEMENT
docker logs -f --tail=50 trackyu-gps_backend_1
curl https://trackyugps.com/api/health

# 7. Communication clients
# Email: "Incident technique résolu - Service rétabli"
````

**Temps rollback cible : < 10 minutes**1. Monitoring INTENSIF 2h minimum
docker logs -f trackyu-gps_backend_1 | grep -i "error\|critical\|fatal\|warning"

# 12. Désactiver mode maintenance (si tests OK)

# TODO: Endpoint API

# 13. Communication clients (si OK)

# Email: "Maintenance terminée avec succès"

# 14. Monitoring 24-48h

# Surveiller logs, performance, alertes clients

```

#### D. Checklist validation production

**0-30 min après déploiement** :
- [ ] Backend démarré sans erreur
- [ ] DB connectée
- [ ] Redis connecté
- [ ] GPS server actif (port 5000)
- [ ] WebSocket connecté
- [ ] Tests smoke réussis (7/7)
- [ ] 0 erreur logs

**30-120 min après** :
- [ ] 10+ utilisateurs connectés
- [ ] GPS tracking temps réel OK
- [ ] Création factures OK
- [ ] Création tickets OK
- [ ] Performance < 200ms
- [ ] 0 erreur critique logs

**2-24h après** :
- [ ] Tous modules testés
- [ ] Performance stable
- [ ] 0 régression
- [ ] Clients satisfaits (0 plainte)

**SI 1 SEUL critère échoue = ROLLBACK**orrections bugs mineurs

Impact:
⚠️ Service interrompu 30-60 minutes
✅ Données GPS sauvegardées (aucune perte)
✅ Historique accessible après maintenance

Merci de votre compréhension.
L'équipe TrackYu GPS
```

#### C. Procédure Déploiement Production

```powershell
# 1. SSH Production
ssh root@148.230.126.62

# 2. Backup COMPLET
cd /var/www/trackyu-gps
DATE=$(date +%Y%m%d_%H%M%S)

# Backup DB
docker exec trackyu-gps_postgres_1 pg_dump -U fleet_user fleet_db > "backups/db_$DATE.sql"

# Backup code
tar -czf "backups/code_$DATE.tar.gz" backend/ dist/

# Vérifier backup
ls -lh backups/

# 3. Merge feature branch
git fetch origin
git checkout main
git merge feature/security-fixes-20260203

# 4. Build backend
cd backend
npm install
npm run build

# 5. Migration DB
psql -U fleet_user -d fleet_db < src/db/migrations/20260203_security_fixes.sql

# OU via Docker
cat src/db/migrations/20260203_security_fixes.sql | docker exec -i trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db

# 6. Flush Redis cache
docker exec -it trackyu-gps_redis_1 redis-cli FLUSHALL

# 7. Redémarrer services
cd /var/www/trackyu-gps
docker-compose restart backend

# 8. Vérifier démarrage
docker logs -f --tail=50 trackyu-gps_backend_1
# Attendu: "✓ Server running on port 3001"

# 9. Tests smoke
curl -X POST https://trackyugps.com/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@trackyugps.com","password":"xxx"}'

# 10. Monitoring 24h
docker logs -f trackyu-gps_backend_1 | grep -i "error\|critical\|fatal"
```

#### D. Rollback (si problème) < 5 min

```powershell
# 1. Restaurer code
git reset --hard HEAD~1
cd backend && npm install && npm run build
docker-compose restart backend

# 2. Restaurer DB
docker exec -i trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db < backups/db_20260203_230000.sql

# 3. Flush cache
docker exec -it trackyu-gps_redis_1 redis-cli FLUSHALL

# 4. Vérifier
curl https://trackyugps.com/api/health
```

---

## 📊 CRITÈRES DE SUCCÈS

### Phase 1 (Tests Locaux) ✅

- [ ] Migration SQL exécutée sans erreur
- [ ] Backend démarre sur port 3001
- [ ] Login réussit et retourne JWT
- [ ] Test isolation tenant échoue correctement (403)
- [ ] Test RBAC échoue sans permission (403)
- [ ] Test doublon lead retourne 409

### Phase 2 (Tests Auto) ✅

- [ ] Tests tenant-isolation passent (5/5)
- [ ] Tests RBAC passent (4/4)
- [ ] Tests GPS-spoofing passent (3/3)

### Phase 3 (Staging) ✅

- [ ] Déploiement staging réussi
- [ ] Migration staging sans erreur
- [ ] Tests E2E staging passent
- [ ] Aucune erreur logs 2-4h

### Phase 4 (Production) ✅

- [ ] Backup DB production réussi
- [ ] Déploiement production sans erreur
- [ ] Migration production réussie
- [ ] Tests smoke passent
- [ ] Monitoring 24h : 0 erreur critique
- [ ] Performance maintenue (< 200ms)

---

## 🆘 EN CAS DE PROBLÈME

### Build échoue

```powershell
# Vérifier erreurs TypeScript
cd backend
npx tsc --noEmit

# Si erreurs de types, corriger fichiers concernés
# Puis rebuild
npm run build
```

### Migration échoue

```powershell
# Rollback migration
psql -U fleet_user -d fleet_db

BEGIN;
-- Copier les commandes ROLLBACK de 20260203_security_fixes.sql
-- Exemple:
DROP INDEX IF EXISTS idx_users_tenant;
DROP INDEX IF EXISTS idx_vehicles_tenant;
-- etc.
COMMIT;

# Restaurer backup
psql -U fleet_user -d fleet_db < backup_pre_corrections_20260203.sql
```

### Backend ne démarre pas

```powershell
# Vérifier logs
docker logs trackyu-gps_backend_1

# Vérifier PostgreSQL
docker exec -it trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db -c "SELECT version();"

# Vérifier Redis
docker exec -it trackyu-gps_redis_1 redis-cli PING

# Restart complet
docker-compose down
docker-compose up -d
```

### Performance dégradée

```powershell
# Vérifier les slow queries
psql -U fleet_user -d fleet_db

SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Analyser un index manquant
EXPLAIN ANALYZE SELECT * FROM vehicles WHERE tenant_id = 'xxx';
```

---

## 📞 CONTACTS URGENCE

| Rôle         | Contact                | Disponibilité |
| ------------ | ---------------------- | ------------- |
| **Lead Dev** | [Votre contact]        | 24/7          |
| **DevOps**   | [Votre contact]        | 24/7          |
| **DB Admin** | [Votre contact]        | On-call       |
| **Support**  | support@trackyugps.com | 9h-18h        |

---

## 📝 RAPPORT POST-DÉPLOIEMENT

**À compléter après Phase 4** :

```markdown
# Rapport Déploiement Production - Security Fixes

Date: **\_**
Durée: **\_**
Downtime: **\_**

## Métriques

- Build: OK / KO
- Migration: OK / KO
- Tests smoke: **_/_**
- Erreurs 24h: \_\_\_

## Problèmes rencontrés

-

## Rollback effectué

- Oui / Non
- Raison:

## Performance

- Latence API avant: \_\_\_ ms
- Latence API après: \_\_\_ ms
- Score sécurité: 52/100 → 78/100

## Recommandations

-
```

---

**PRÊT À COMMENCER PAR PHASE 1 !** 🚀

Lancez les tests locaux et tenez-moi informé des résultats.
