# 🗄️ Base de Données

## Stack

| Technologie | Version | Usage |
|-------------|---------|-------|
| PostgreSQL | 16 | Base principale |
| TimescaleDB | 2.x | Time-series (positions GPS) |
| Redis | 7.x | Cache, sessions |

## 📊 Schéma Principal

### Tables Multi-tenant

```sql
-- Tenants (organisations)
CREATE TABLE tenants (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Utilisateurs
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'USER',
  permissions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rôles personnalisés
CREATE TABLE roles (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  permissions TEXT[] NOT NULL,
  is_system BOOLEAN DEFAULT FALSE
);
```

### Tables Fleet

```sql
-- Véhicules
CREATE TABLE vehicles (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  plate VARCHAR(50),
  brand VARCHAR(100),
  model VARCHAR(100),
  device_id VARCHAR(50) REFERENCES devices(id),
  driver_id VARCHAR(50) REFERENCES drivers(id),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trackers GPS
CREATE TABLE devices (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  imei VARCHAR(20) UNIQUE NOT NULL,
  model VARCHAR(100),
  sim_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'IN_STOCK',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chauffeurs
CREATE TABLE drivers (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  license_number VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions GPS (hypertable TimescaleDB)
CREATE TABLE positions (
  time TIMESTAMPTZ NOT NULL,
  vehicle_id VARCHAR(50) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed REAL DEFAULT 0,
  heading REAL DEFAULT 0,
  fuel_liters REAL,
  raw_data TEXT
);
SELECT create_hypertable('positions', 'time');
```

### Tables CRM

```sql
-- Tiers (modèle unifié)
CREATE TABLE tiers (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  type VARCHAR(20) NOT NULL,  -- CLIENT | SUPPLIER | RESELLER | PROSPECT
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Côte d''Ivoire',
  -- Données spécifiques par type
  client_data JSONB,
  supplier_data JSONB,
  reseller_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  company_name VARCHAR(255),
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'NEW',
  source VARCHAR(50),
  assigned_to VARCHAR(50) REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
CREATE TABLE contacts (
  id VARCHAR(50) PRIMARY KEY,
  tier_id VARCHAR(50) REFERENCES tiers(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  position VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE
);
```

### Tables Finance

```sql
-- Factures
CREATE TABLE invoices (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  tier_id VARCHAR(50) REFERENCES tiers(id),
  number VARCHAR(50) UNIQUE,
  date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'DRAFT',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lignes de facture
CREATE TABLE invoice_items (
  id VARCHAR(50) PRIMARY KEY,
  invoice_id VARCHAR(50) REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL
);

-- Paiements
CREATE TABLE payments (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  invoice_id VARCHAR(50) REFERENCES invoices(id),
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(50),  -- CASH | BANK | WAVE | ORANGE_MONEY
  reference VARCHAR(100),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devis
CREATE TABLE quotes (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  tier_id VARCHAR(50) REFERENCES tiers(id),
  number VARCHAR(50),
  date DATE NOT NULL,
  valid_until DATE,
  total DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tables Avancées [NEW]

#### Gestion Flotte Avancée
```sql
-- Flottes (Succursales)
CREATE TABLE branches (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  client_id VARCHAR(50) REFERENCES tiers(id),
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- Groupes de véhicules
CREATE TABLE groups (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  vehicle_ids TEXT[], -- Tableau d'IDs véhicules
  status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- Points d'Intérêt (POI)
CREATE TABLE pois (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius INT DEFAULT 50,
  is_shared BOOLEAN DEFAULT FALSE
);
```

#### Configuration & Règles
```sql
-- Config Alertes
CREATE TABLE alert_configs (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- SPEED, GEOFENCE, etc.
  threshold DOUBLE PRECISION,
  is_active BOOLEAN DEFAULT TRUE,
  notifications JSONB -- { email: true, sms: false ... }
);

-- Profils Éco-conduite
CREATE TABLE eco_driving_profiles (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  max_speed INT DEFAULT 120,
  video_url TEXT,
  is_default BOOLEAN DEFAULT FALSE
);

-- Règles de Planification
CREATE TABLE schedule_rules (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  days_of_week INT[], -- [0, 1, 2...] (Dimanche=0)
  start_time VARCHAR(5), -- "08:00"
  end_time VARCHAR(5),   -- "18:00"
  action VARCHAR(20) DEFAULT 'ALERT'
);
```

#### Système & Admin
```sql
-- Intégrations (Clés API chiffrées)
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  provider VARCHAR(50), -- ORANGE_SMS, WAVE...
  config JSONB,
  status VARCHAR(20) DEFAULT 'INACTIVE'
);

-- Webhooks (Événements sortants)
CREATE TABLE webhooks (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL,
  events JSONB, -- ['invoice.paid', ...]
  secret VARCHAR(100)
);
```

## 🔄 Migrations

### Créer une Migration

```bash
# 1. Créer le fichier SQL
# backend/migrations/{YYYYMMDD}_{description}.sql

# Exemple: backend/migrations/20260115_add_vehicle_color.sql
```

```sql
-- Migration: 20260115_add_vehicle_color.sql
-- Description: Ajouter le champ couleur aux véhicules

ALTER TABLE vehicles ADD COLUMN color VARCHAR(50);

-- Rollback (commenté)
-- ALTER TABLE vehicles DROP COLUMN color;
```

### Exécuter les Migrations

```bash
# Local
cd backend && npm run db:migrate

# Production (via SSH + Docker)
ssh root@148.230.126.62 "cat /var/www/trackyu-gps/backend/migrations/20260115_add_vehicle_color.sql | docker exec -i trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db"
```

## 🔍 Requêtes Utiles

### Statistiques Véhicules

```sql
-- Véhicules actifs par tenant
SELECT tenant_id, COUNT(*) as total
FROM vehicles
WHERE status = 'ACTIVE'
GROUP BY tenant_id;

-- Positions aujourd'hui par véhicule
SELECT vehicle_id, COUNT(*) as positions_count
FROM positions
WHERE time >= CURRENT_DATE
GROUP BY vehicle_id;
```

### Statistiques Finance

```sql
-- CA par mois
SELECT 
  DATE_TRUNC('month', date) as month,
  SUM(total) as revenue
FROM invoices
WHERE status = 'PAID' AND tenant_id = $1
GROUP BY month
ORDER BY month DESC;

-- Factures impayées
SELECT * FROM invoices
WHERE status = 'SENT'
  AND due_date < CURRENT_DATE
  AND tenant_id = $1;
```

### Nettoyage

```sql
-- Supprimer les positions > 1 an
DELETE FROM positions WHERE time < NOW() - INTERVAL '1 year';

-- Supprimer les logs anciens
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
```

## ⚠️ Règles Importantes

### Isolation Multi-tenant

```sql
-- ✅ TOUJOURS filtrer par tenant_id
SELECT * FROM vehicles WHERE tenant_id = $1;

-- ❌ JAMAIS sans filtre tenant
SELECT * FROM vehicles;  -- DANGER: fuite de données!
```

### Requêtes Paramétrées

```typescript
// ✅ Paramètres
await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ Concaténation (SQL injection)
await pool.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

### Vérification Doublons

```sql
-- Avant INSERT, vérifier l'unicité
-- Champs uniques:
-- - devices.imei
-- - users.email
-- - tenants.slug
-- - invoices.number (par tenant)
```

## 📊 Index Recommandés

```sql
-- Performance multi-tenant
CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_tiers_tenant ON tiers(tenant_id);

-- Recherche
CREATE INDEX idx_vehicles_plate ON vehicles(plate);
CREATE INDEX idx_devices_imei ON devices(imei);
CREATE INDEX idx_users_email ON users(email);

-- Time-series
CREATE INDEX idx_positions_vehicle_time ON positions(vehicle_id, time DESC);
```

## 🧪 Base de Données Staging

| Élément | Production | Staging |
|---------|------------|----------|
| Database | fleet_db | fleet_db_staging |
| Port | 5432 | 5433 |
| Container | trackyu-gps_postgres_1 | staging_postgres |

```bash
# Connexion staging
docker exec -it staging_postgres psql -U fleet_user -d fleet_db_staging

# Clone production → staging
docker exec trackyu-gps_postgres_1 pg_dump -U fleet_user --no-owner fleet_db | \
  docker exec -i staging_postgres psql -U fleet_user -d fleet_db_staging
```

## 💾 Sauvegarde Automatisée

**Toujours exécuter un backup avant une migration en production :**

```bash
# Script : scripts/backup-db.sh
./scripts/backup-db.sh manual   # Backup avant migration

# Cron automatisé (production)
0 2 * * * /var/www/trackyu-gps/scripts/backup-db.sh daily
0 3 * * 0 /var/www/trackyu-gps/scripts/backup-db.sh weekly
```

Rétention : 7 daily, 4 weekly, 10 manual.

## 🛡️ Docker Healthcheck

Le container PostgreSQL a un healthcheck intégré dans `docker-compose.yml` :
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

---

*Dernière mise à jour : 2026-02-10*
