# 🔍 AUDIT COMPLET - Impact Refactoring `vehicles` → `objects` Table

> **Date** : Juin 2026  
> **Objectif** : Fusionner `vehicles` + `devices` (WHERE type='BOX') en une nouvelle table `objects` avec code ABO comme PK (ex: `ABO-M3F7A2`)  
> **Scope** : Identifier CHAQUE référence à `vehicles` et `devices(BOX)` dans le codebase  
> **⚠️ RESEARCH ONLY - AUCUN FICHIER MODIFIÉ**

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Base de données - Schéma & FK](#2-base-de-données---schéma--fk)
3. [Backend - Routes API](#3-backend---routes-api)
4. [Backend - Controllers](#4-backend---controllers)
5. [Backend - Services](#5-backend---services)
6. [Backend - GPS Server (Pipeline temps réel)](#6-backend---gps-server-pipeline-temps-réel)
7. [Backend - MQTT](#7-backend---mqtt)
8. [Backend - WebSocket / Socket.IO](#8-backend---websocket--socketio)
9. [Backend - Schemas (Zod validation)](#9-backend---schemas-zod-validation)
10. [Backend - Entry Point (index.ts)](#10-backend---entry-point-indexts)
11. [Frontend - Types partagés (types.ts)](#11-frontend---types-partagés-typests)
12. [Frontend - DataContext (State Management)](#12-frontend---datacontext-state-management)
13. [Frontend - Service API (api.ts)](#13-frontend---service-api-apits)
14. [Frontend - App.tsx (Root Component)](#14-frontend---apptsx-root-component)
15. [Frontend - Feature: Fleet](#15-frontend---feature-fleet)
16. [Frontend - Feature: Map](#16-frontend---feature-map)
17. [Frontend - Feature: Dashboard](#17-frontend---feature-dashboard)
18. [Frontend - Feature: Tech (Interventions)](#18-frontend---feature-tech-interventions)
19. [Frontend - Feature: Stock](#19-frontend---feature-stock)
20. [Frontend - Feature: CRM](#20-frontend---feature-crm)
21. [Frontend - Feature: Finance](#21-frontend---feature-finance)
22. [Frontend - Feature: Reports](#22-frontend---feature-reports)
23. [Frontend - Feature: Settings](#23-frontend---feature-settings)
24. [Frontend - Feature: Admin](#24-frontend---feature-admin)
25. [Frontend - Feature: Support](#25-frontend---feature-support)
26. [Frontend - Hooks](#26-frontend---hooks)
27. [Frontend - Schemas (Zod)](#27-frontend---schemas-zod)
28. [Frontend - Components (Sidebar, Lazy)](#28-frontend---components-sidebar-lazy)
29. [Migrations DB existantes](#29-migrations-db-existantes)
30. [Mobile (Capacitor/React Native)](#30-mobile-capacitorreact-native)
31. [Synthèse quantitative](#31-synthèse-quantitative)
32. [Plan de migration recommandé](#32-plan-de-migration-recommandé)

---

## 1. Résumé exécutif

### Impact global

| Métrique | Valeur |
|----------|--------|
| **Fichiers impactés (backend)** | ~25+ |
| **Fichiers impactés (frontend)** | ~35+ |
| **Tables DB avec FK vers `vehicles`** | 8+ (positions, alerts, trips, vehicle_sensors, fuel_records, maintenance_records, notification_logs, tickets) |
| **Tables DB avec FK vers `devices`** | 1 (sim_cards via device_id) |
| **Colonnes `vehicle_id` dans d'autres tables** | ~12+ colonnes FK |
| **Colonnes `assigned_vehicle_id` dans devices** | 1 (link BOX→Vehicle) |
| **Routes API impactées** | ~20+ endpoints |
| **WebSocket events impactés** | `vehicle:update`, `vehicle:immobilization` |
| **MQTT topics impactés** | `fleet/vehicles/{id}/telemetry` |
| **Risque global** | 🔴 **TRÈS ÉLEVÉ** - Refactoring transversal |

### Tables concernées par le plan

| Table actuelle | Action | Nouvelle table |
|----------------|--------|----------------|
| `vehicles` | **SUPPRIMER** (après migration) | `objects` |
| `devices` (WHERE type='BOX') | **FUSIONNER** dans `objects` | `objects` |
| `devices` (WHERE type!='BOX') | **GARDER** tel quel | `devices` (SIM, SENSOR, ACCESSORY) |
| `positions` | **FK** vehicle_id → object_id | `positions` |
| `alerts` | **FK** vehicle_id → object_id | `alerts` |
| `trips` | **FK** vehicle_id → object_id | `trips` |

---

## 2. Base de données - Schéma & FK

### 2.1. Table `vehicles` (à supprimer)

**Fichier** : `backend/src/db/schema.sql` L71-96  
**Criticité** : 🔴 HIGH  
**Opération** : DEFINE

```sql
CREATE TABLE vehicles (
    id VARCHAR(50) PRIMARY KEY,          -- Devient ABO-xxx dans objects
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
    type VARCHAR(20) NOT NULL,           -- TRUCK, CAR, VAN
    plate VARCHAR(20),
    driver_name VARCHAR(100),
    client_id VARCHAR(50),
    fuel_level INTEGER DEFAULT 100,
    battery_voltage DECIMAL(4, 2),
    mileage DECIMAL(10, 2) DEFAULT 0,
    odometer_source VARCHAR(20) DEFAULT 'GPS',
    tank_capacity INTEGER,
    fuel_sensor_type VARCHAR(20) DEFAULT 'CANBUS',
    calibration_table JSONB,
    fuel_type VARCHAR(20),
    theoretical_consumption DECIMAL(4, 1),
    refill_threshold DECIMAL(5, 2) DEFAULT 5.0,
    theft_threshold DECIMAL(5, 2) DEFAULT 3.0,
    excessive_idling_threshold INTEGER DEFAULT 10,
    status_changed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP, updated_at TIMESTAMP
);
```

**Colonnes ajoutées par migrations** (non dans schema.sql initial) :
- `imei` VARCHAR — migration `20260226_add_imei_tracker_model_to_vehicles.sql`
- `tracker_model` VARCHAR — même migration
- `tenant_id` VARCHAR — ajouté dynamiquement

### 2.2. Table `devices` (type='BOX' → fusionner dans objects)

**Fichier** : `backend/src/db/schema.sql` L136-157  
**Criticité** : 🔴 HIGH  
**Opération** : DEFINE

```sql
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50),
    type VARCHAR(20) NOT NULL,           -- BOX | SIM | SENSOR | ACCESSORY
    model VARCHAR(100),
    serial_number VARCHAR(100),
    imei VARCHAR(50),
    iccid VARCHAR(50),
    phone_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'IN_STOCK',
    location VARCHAR(50) DEFAULT 'CENTRAL',
    technician_id VARCHAR(50),
    assigned_vehicle_id VARCHAR(50),     -- ⚠️ FK vers vehicles.id
    assigned_client_id VARCHAR(50),
    transfer_status VARCHAR(20) DEFAULT 'NONE',
    entry_date TIMESTAMP, created_at TIMESTAMP, updated_at TIMESTAMP
);
```

### 2.3. Tables avec Foreign Keys vers `vehicles(id)`

| Table | Colonne FK | ON DELETE | Fichier source | Criticité |
|-------|-----------|-----------|----------------|-----------|
| **positions** | `vehicle_id` NOT NULL | (none - implicit restrict) | `backend/src/db/schema.sql` L100 | 🔴 HIGH |
| **alerts** | `vehicle_id` | (none) | `backend/src/db/schema.sql` L127 | 🔴 HIGH |
| **trips** | `vehicle_id` | CASCADE | `backend/src/create_fleet_enhancements.ts` L31 | 🔴 HIGH |
| **fuel_records** | `vehicle_id` | CASCADE | `backend/src/create_fleet_enhancements.ts` L67 | 🟡 MEDIUM |
| **vehicle_positions** | `vehicle_id` | CASCADE NOT NULL | `backend/src/schema.sql` L105 | 🔴 HIGH |
| **drivers** | `current_vehicle_id` | SET NULL | `backend/src/create_missing_tables.ts` L20 | 🟡 MEDIUM |
| **maintenance_records** | `vehicle_id` | (none) | `backend/src/create_missing_tables.ts` L60 | 🟡 MEDIUM |
| **vehicle_sensors** | `vehicle_id` | (none) | `backend/src/create_missing_tables.ts` L77 | 🟡 MEDIUM |
| **commands** | `vehicle_id` | (none) | `backend/src/create_missing_tables.ts` L134 | 🟡 MEDIUM |
| **notification_logs** | `vehicle_id` | SET NULL | `backend/src/create_notification_logs_table.ts` L35 | 🟢 LOW |
| **tickets** | `vehicle_id` | SET NULL | `backend/src/db/migrations/20241229_tickets_system.sql` L10 | 🟡 MEDIUM |
| **fuel_alerts** | `vehicle_id` | CASCADE | `backend/src/db/migrations/20241229_settings_tables.sql` L141 | 🟡 MEDIUM |
| **scheduled_tasks** | `vehicle_id` | CASCADE | `backend/src/create_fleet_tables.ts` L14 | 🟡 MEDIUM |
| **geofence_alerts** | `vehicle_id` | CASCADE | `backend/src/create_fleet_tables.ts` L43 | 🟡 MEDIUM |
| **tech_interventions** | `vehicle_id` | CASCADE | `backend/src/create_tech_tables.ts` L15 | 🟡 MEDIUM |

### 2.4. Tables avec FK vers `devices(id)`

| Table | Colonne FK | ON DELETE | Fichier source |
|-------|-----------|-----------|----------------|
| **sim_cards** | `device_id` | SET NULL | `backend/src/create_sim_table.ts` L21 |

### 2.5. Colonnes `assigned_vehicle_id` dans `devices`

La colonne `devices.assigned_vehicle_id` est l'actuel lien BOX→Vehicle. Dans le nouveau modèle, elle disparaît car BOX et Vehicle fusionnent en un seul `object`.

**Impact FK** : `backend/src/schema.sql` L324 — `assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL`

### 2.6. Table `interventions` — colonnes véhicule embarquées

**Fichier** : `backend/src/db/schema.sql` L159-200  
**Criticité** : 🟡 MEDIUM (données snapshot, pas FK stricte)

Colonnes impactées :
- `vehicle_id VARCHAR(50)` — L170
- `license_plate VARCHAR(20)` — L177
- `vin VARCHAR(50)` — L178
- `vehicle_brand VARCHAR(50)` — L179
- `vehicle_model VARCHAR(50)` — L180
- `vehicle_mileage INTEGER` — L181
- `target_vehicle_id` — migration `20260206_add_transfer_columns.sql` L5
- `vehicle_type` — migration `20260207_add_missing_intervention_columns.sql` L25
- `vehicle_year` — migration L26
- `vehicle_color` — migration L27

### 2.7. Table `contracts` — colonne `vehicle_ids` JSONB

**Fichier** : migration `20260210192451_contracts_audit_improvements.sql` L10  
**Criticité** : 🔴 HIGH

```sql
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vehicle_ids JSONB;
```

Contient un tableau JSON d'IDs véhicules. La migration `20260211_contracts_numbering_vehicles.sql` crée une fonction `match_contract_vehicles()` qui fait `FROM vehicles v` (L125, L138) pour matcher les plaques.

---

## 3. Backend - Routes API

### 3.1. `backend/src/routes/vehicleRoutes.ts`
**Criticité** : 🔴 HIGH | **Opération** : BOTH (CRUD)

| Ligne | Route | Permission | Fonction |
|-------|-------|------------|----------|
| L17 | `GET /` | VIEW_FLEET | getVehicles |
| L18 | `GET /:id` | VIEW_FLEET | getVehicleById |
| L19 | `POST /` | CREATE_VEHICLES | createVehicle |
| L20 | `PUT /:id` | EDIT_VEHICLES | updateVehicle |
| L21 | `DELETE /:id` | DELETE_VEHICLES | deleteVehicle |
| L24 | `GET /:id/history/snapped` | VIEW_FLEET | getVehicleHistorySnapped |
| L25 | `POST /snap` | VIEW_FLEET | snapPath |

**Enregistrement** : `backend/src/index.ts` L8 (import), L201 `app.use('/api/vehicles', vehicleRoutes)`

### 3.2. `backend/src/routes/fleetRoutes.ts`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Route | Fonction |
|-------|-------|----------|
| L38-75 | `GET /vehicles` | getVehicles (duplicate mount) |
| L42 | `POST /vehicles` | createVehicle |
| L44 | `PUT /vehicles/:id` | updateVehicle |
| L46 | `DELETE /vehicles/:id` | deleteVehicle |
| L50 | `POST /vehicles/:id/immobilize` | toggleImmobilization |
| L54 | `GET /vehicles/:id/fuel-history` | getFuelHistory |
| L56 | `GET /vehicles/:id/fuel-stats` | getFuelStats |
| L58 | `GET /vehicles/:id/maintenance` | getMaintenanceRecords |
| L60 | `GET /vehicles/:id/alerts` | getVehicleAlerts |
| L62 | `GET /vehicles/:id/history/snapped` | getVehicleHistorySnapped |
| L66 | `GET /vehicles/:id/report` | generateVehicleReport |
| L70 | `GET /vehicles/:vehicleId/trips` | getVehicleTrips |
| L72 | `POST /vehicles/:vehicleId/analyze` | calculateTrips |
| L74 | `GET /vehicles/:vehicleId/sensors` | getVehicleSensors |

**Enregistrement** : `backend/src/index.ts` L29 (import), L225 `app.use('/api/fleet', fleetRoutes)`

### 3.3. `backend/src/routes/deviceRoutes.ts`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Route | Fonction |
|-------|-------|----------|
| L11 | `GET /` | getDevices (includes LEFT JOIN vehicles) |
| L12 | `POST /` | createDevice (includes assigned_vehicle_id) |
| L13 | `PUT /:id` | updateDevice |
| L14+ | `DELETE /:id` | deleteDevice |
| L15+ | `GET /raw/:imei` | getRawDataByImei (queries vehicles table) |
| L16+ | `GET /connected` | getConnectedDevices (queries vehicles table) |
| L17+ | `POST /:id/command` | sendDeviceCommand (queries vehicles for model) |

**Enregistrement** : `backend/src/index.ts` L12 (import), L204 `app.use('/api/devices', deviceRoutes)`

### 3.4. Autres routes avec références vehicle

| Fichier | Lignes | Type réf. | Opération | Criticité |
|---------|--------|-----------|-----------|-----------|
| `commandRoutes.ts` | L10, 67, 70-71 | vehicleId, vehicle_id | WRITE | 🔴 HIGH |
| `driverRoutes.ts` | L48, 52-53, 66, 68-69 | vehicleId, vehicle_id | BOTH | 🔴 HIGH |
| `groupRoutes.ts` | L47, 51-52, 65, 67-68 | vehicleIds, vehicle_ids (JSON) | BOTH | 🔴 HIGH |
| `subscriptionRoutes.ts` | L18, 99, 110, 116, 144, 158, 165 | vehicleCount, vehicle_count | BOTH | 🟡 MEDIUM |
| `maintenanceRuleRoutes.ts` | L15, 79, 82-83, 101, 103-104 | vehicleIds, vehicle_ids | BOTH | 🟡 MEDIUM |
| `scheduleRuleRoutes.ts` | L17, 71, 74-75, 96, 98 | vehicleIds, vehicle_ids | BOTH | 🟡 MEDIUM |
| `analyticsRoutes.ts` | L20-21 | `SELECT ... FROM vehicles GROUP BY status` | READ | 🔴 HIGH |
| `poiRoutes.ts` | L67, 84, 113 | `requirePermission('EDIT_VEHICLES')` | permission | 🟢 LOW |
| `roleRoutes.ts` | L236 | VIEW_VEHICLES, CREATE/EDIT/DELETE_VEHICLES | permission def | 🟡 MEDIUM |

---

## 4. Backend - Controllers

### 4.1. `backend/src/controllers/vehicleController.ts`
**Criticité** : 🔴 HIGH (CRITIQUE) | **Opération** : BOTH  
**C'est le fichier le plus impacté du backend. 100% du contenu référence `vehicles`.**

| Ligne | Fonction | Requête SQL | Impact |
|-------|----------|------------|--------|
| L12-33 | vehicleSchema / updateVehicleSchema | Zod validation interne | Schema renaming |
| L61 | `getVehicles()` | `SELECT * FROM vehicles ... LEFT JOIN positions` | Table rename + FK |
| L108 | `getVehicleById()` | `SELECT * FROM vehicles WHERE id = $1` | Table rename |
| L135 | `createVehicle()` | `INSERT INTO vehicles (id, name, status, type, plate, ...)` | Table rename + PK strategy |
| L191 | `updateVehicle()` | `UPDATE vehicles SET ... WHERE id` | Table rename |
| L257 | `updatePosition()` | `INSERT INTO positions ... + UPDATE vehicles SET status` | FK rename |
| L341 | Socket emit | `io.emit('vehicle:update', ...)` | Event rename |
| L350 | `getVehicleHistorySnapped()` | `SELECT FROM positions WHERE vehicle_id` | FK rename |
| L414 | `deleteVehicle()` | `DELETE FROM vehicles` + position check | Table rename |
| L509 | `toggleImmobilization()` | `UPDATE vehicles SET ... + io.emit('vehicle:immobilization')` | Both |
| L827 | trips query | `FROM trips t` with vehicle_id | FK rename |

### 4.2. `backend/src/controllers/deviceController.ts`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Fonction | Impact |
|-------|----------|--------|
| L16-24 | `getDevices()` | `LEFT JOIN vehicles ON d.assigned_vehicle_id = v.id` → Join changes |
| L44, 53-54 | SIM card mapping | vehicle_name, vehicle_plate NULLs → removed for SIM/SENSOR |
| L77-78 | `createDevice()` | Extracts vehicle_id/assignedVehicleId from body → BOX no longer has this |
| L135 | INSERT device | `INSERT INTO devices ... assigned_vehicle_id` |
| L153-154 | `updateDevice()` | Updates effectiveVehicleId |
| L203-207 | VEHICLE ASSIGNMENT | Auto-creates vehicle when device status=INSTALLED → **CRITICAL**: This auto-creation logic FUSES into object creation |
| L247-256 | Device detail fetch | JOINed vehicle names → irrelevant for BOX |
| L337-367 | `getRawData()` | Queries `vehicles WHERE imei = $1` then `positions WHERE vehicle_id` → changes to `objects` |
| L385-408 | `getConnectedDevices()` | Queries `vehicles` updated in last 5 minutes → changes to `objects` |

### 4.3. `backend/src/controllers/interventionController.ts`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Logic | Impact |
|-------|-------|--------|
| L81-92 | Extract vehicle fields from request | vehicleId, vehicleType, vehicleBrand, vehicleModel, vehicleYear, vehicleColor, vehicleMileage, targetVehicleId |
| L147-192 | INSERT intervention | All vehicle fields stored as snapshot |
| L250-268 | Update fields list | Vehicle field names in updatable list |
| L346-752 | **Status completion logic** | **MOST CRITICAL**: Updates `devices SET assigned_vehicle_id` for BOX/SIM installations; handles Retrait/Transfert changing `assigned_vehicle_id`; removes vehicle from contract `vehicle_ids` array |

### 4.4. `backend/src/controllers/fleetController.ts`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Fonction | SQL Impact |
|-------|----------|------------|
| L9-50 | `getVehicleTrips()` | `SELECT id FROM vehicles WHERE id = $1` + `FROM trips WHERE vehicle_id = $1` |
| L60-90 | `getTripDetails()` | `FROM trips WHERE id = $1` + `WHERE vehicle_id = $1` (positions) |
| L96-120 | `getVehicleSensors()` | `SELECT id FROM vehicles WHERE id = $1` + `FROM vehicle_sensors WHERE vehicle_id = $1` |
| L127-260 | `calculateTrips()` | `SELECT id FROM vehicles WHERE id = $1` + massive positions query + `INSERT INTO trips (vehicle_id, ...)` |

### 4.5. `backend/src/controllers/contractController.ts`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Logic | Impact |
|-------|-------|--------|
| L21-70 | `checkVehicleExclusivity()` | Validates vehicle_ids against contracts |
| L76-95 | Response mapping | vehicleIds, vehicleCount |
| L192-227 | `createContract()` | `INSERT ... vehicle_ids JSONB` |
| L258-292 | `updateContract()` | `UPDATE ... vehicle_ids` |

### 4.6. `backend/src/controllers/alertController.ts`
**Criticité** : 🔴 HIGH | **Opération** : READ

| Ligne | Logic |
|-------|-------|
| L53-55 | `SELECT alerts LEFT JOIN vehicles` for vehicle name resolution |
| L75-80, 113-114, 136-137, 168-169, 203-204 | All verify alert belongs to vehicle's tenant via `JOIN vehicles` |

### 4.7. `backend/src/controllers/vehicleReportController.ts`
**Criticité** : 🔴 HIGH | **Opération** : READ

| Ligne | Logic |
|-------|-------|
| L8 | `generateVehicleReport()` |
| L21 | `SELECT * FROM vehicles WHERE id = $1` |
| L39-40 | `SELECT * FROM trips WHERE vehicle_id = $1` |
| L50, 60, 70 | Multiple queries with `WHERE vehicle_id = $1` (positions, alerts, fuel) |
| L82 | PDF filename: `vehicle_report_${vehicle.name}` |

### 4.8. `backend/src/controllers/aiController.ts`
**Criticité** : 🟡 MEDIUM | **Opération** : READ

| Ligne | Logic |
|-------|-------|
| L162-191 | Queries `vehicles` table to build AI context (vehicle list, stats per status) |
| L237-238 | Counts `assigned_vehicle_id` in devices |
| L340-383 | Builds `vehicleContext` string for AI prompts |

### 4.9. `backend/src/controllers/deviceCommandController.ts`
**Criticité** : 🔴 HIGH | **Opération** : READ

| Ligne | Logic |
|-------|-------|
| L26 | `SELECT model, tracker_model FROM vehicles WHERE imei = $1 AND tenant_id = $2` → moves to `objects` |

---

## 5. Backend - Services

### 5.1. `backend/src/services/cacheService.ts`
**Criticité** : 🔴 HIGH (CRITIQUE) | **Opération** : READ + CACHE

| Ligne | Méthode | Impact |
|-------|---------|--------|
| L53-56 | TTL constants | `VEHICLE_BY_IMEI_TTL = 300`, `DEVICE_BY_IMEI_TTL = 600` → merge into one |
| L59-64 | `CachedVehicle` interface | Fields: id, name, tenant_id, imei, calibration_table, fuel_sensor_type, tank_capacity, etc. → becomes CachedObject |
| L86-133 | `getVehicleByImei()` | `SELECT id, name, tenant_id, ... FROM vehicles WHERE imei = $1` → `FROM objects WHERE imei = $1` |
| L139-167 | `isDeviceKnown()` | `SELECT imei FROM devices WHERE imei = $1` → Must now check both `objects` AND `devices` |
| L173-226 | `getLastPosition(vehicleId)` / `setLastPosition(vehicleId)` | Cache key: `vehicle:lastpos:${vehicleId}` → `object:lastpos:${objectId}` |
| L231-237 | `invalidateVehicle(imei)` | Deletes `vehicle:imei:${imei}` → `object:imei:${imei}` |

### 5.2. `backend/src/services/positionBuffer.ts`
**Criticité** : 🔴 HIGH | **Opération** : WRITE

| Ligne | Impact |
|-------|--------|
| L16-25 | `BufferedPosition` interface has `vehicle_id: string` → `object_id: string` |
| L54 | `CacheService.setLastPosition(position.vehicle_id, ...)` |
| L86 | `INSERT INTO positions (vehicle_id, ...)` → `(object_id, ...)` |
| L99-108 | Batch arrays map `p => p.vehicle_id` |

### 5.3. `backend/src/services/numberingService.ts`
**Criticité** : 🔴 HIGH | **Opération** : WRITE

| Ligne | Impact |
|-------|--------|
| L25 | Module type includes `'device'` |
| L40 | Module type includes `'vehicle'` |
| L259 | Prefix `quote: 'DEV'` (devis, not device) |
| L266 | Prefix `device: 'BOI'` |
| L281 | Prefix `vehicle: 'VEH'` → **MUST CHANGE** to `'ABO'` format or remove |

**⚠️ CRITIQUE**: Le système de numérotation VEH-xxxx doit être remplacé par le format ABO-M3F7A2. Le module 'vehicle' dans numberingService.ts génère des IDs incrémentaux qui ne correspondent pas au nouveau format.

### 5.4. `backend/src/services/ruleEvaluationService.ts`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Impact |
|-------|--------|
| L28-29 | `ScheduleRule` type: `vehicle_ids: string[]`, `all_vehicles: boolean` |
| L42-68 | `VehicleContext` interface: `vehicleId`, `vehicleName`, `latitude`, `longitude`, `speed`, etc. → Rename to ObjectContext |
| L112-468 | `evaluateRulesForVehicle()` + all sub-evaluators → rename to `evaluateRulesForObject()` |
| L431 | `INSERT INTO alerts ... vehicle_id` → `object_id` |
| L461 | `SELECT FROM devices WHERE vehicle_id = $1` → `WHERE object_id = $1` |

### 5.5. `backend/src/services/socketThrottle.ts`
**Criticité** : 🔴 HIGH | **Opération** : WRITE

| Ligne | Impact |
|-------|--------|
| L33-35 | `emitVehicleUpdate(vehicleId, tenantId, data)` → rename |
| L37-46 | Emitter map keyed by vehicleId |
| L87-100 | `doEmit()` → emits `'vehicle:update'` event to tenant rooms / superadmin |
| L124 | `getStats()` returns `activeVehicles` count |

### 5.6. Autres services

| Service | Lignes | Impact | Criticité |
|---------|--------|--------|-----------|
| `metricsService.ts` | L154-155 | Prometheus gauge `active_vehicles` → rename | 🟢 LOW |
| `resellerSyncService.ts` | L78 | `max_vehicles` in tenant sync | 🟡 MEDIUM |

---

## 6. Backend - GPS Server (Pipeline temps réel)

### 6.1. `backend/src/gps-server/server.ts`
**Criticité** : 🔴 CRITIQUE | **Opération** : BOTH  
**C'est le cœur du pipeline GPS temps réel.**

| Ligne | Logic | Impact |
|-------|-------|--------|
| L23 | Import `evaluateRulesForVehicle`, `VehicleContext` | Rename imports |
| L226 | `CacheService.isDeviceKnown(data.imei)` | Now must check `objects` table too |
| L256 | `CacheService.getVehicleByImei(data.imei)` → `getObjectByImei()` | Cache lookup rename |
| L258-498 | **Main processing block (if vehicle found)** : |
| L264-285 | Odometer calculation using vehicle data | Uses `vehicle.mileage` |
| L285-337 | Fuel processing with `vehicle.calibration_table`, `vehicle.fuel_sensor_type` | Data now in `objects` |
| L337 | `positionBuffer.add({ vehicle_id: vehicle.id, ... })` → `object_id` |
| L389 | `UPDATE vehicles SET status=$1, fuel_level=$3 ... WHERE id=$4` → `UPDATE objects` |
| L319, 376, 417 | `INSERT INTO alerts ... vehicle_id` → `object_id` |
| L490-498 | `evaluateRulesForVehicle(VehicleContext)` → `evaluateRulesForObject()` |

### 6.2. `backend/src/gps-server/types.ts`
**Criticité** : 🟡 MEDIUM | **Opération** : DEFINE  
Defines `ParsedGPSData` with `imei` field — no direct vehicle reference but consumed by server.ts.

---

## 7. Backend - MQTT

### 7.1. `backend/src/mqtt.ts`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Impact |
|-------|--------|
| L8 | Topic: `fleet/vehicles/{vehicleId}/telemetry` → `fleet/objects/{objectId}/telemetry` |
| L25 | Subscribe: `fleet/vehicles/+/telemetry` |
| L38 | Parse vehicleId from topic path |
| L46 | `UPDATE vehicles SET lat=$1, lng=$2 ... WHERE id` → `UPDATE objects` |
| L59 | `SELECT tenant_id FROM vehicles WHERE id = $1` → `FROM objects` |
| L65 | `INSERT INTO vehicle_positions (vehicle_id, tenant_id, ...)` → table + column rename |
| L72 | Event data: `{ id: vehicleId, ... }` |
| L82, 86 | `emit('vehicle:update', ...)` to tenant + superadmin rooms |

---

## 8. Backend - WebSocket / Socket.IO

### Events impactés

| Event | Emitter files | Listener files | Impact |
|-------|--------------|----------------|--------|
| `vehicle:update` | vehicleController.ts L341, socketThrottle.ts L93/L97, mqtt.ts L82/L86, gps-server/server.ts (via throttle) | DataContext.tsx L254 | Rename to `object:update` |
| `vehicle:immobilization` | vehicleController.ts L509 | (frontend listener) | Rename to `object:immobilization` |

---

## 9. Backend - Schemas (Zod validation)

### 9.1. `backend/src/schemas/index.ts`
**Criticité** : 🔴 HIGH | **Opération** : DEFINE

| Ligne | Schema | Champs impactés |
|-------|--------|-----------------|
| L93-110 | `VehicleSchema` / `VehicleUpdateSchema` | Tout le schéma → renommer ObjectSchema |
| L115-145 | `DeviceSchema` / `DeviceUpdateSchema` | `assignedVehicleId`, `assigned_vehicle_id`, `vehicle_id` → retirer pour BOX, garder pour SIM/SENSOR |
| L250 | SubscriptionSchema | `vehicleCount` |
| L265 | CommandSchema | `vehicleId` |
| L295 | AlertSchema | `vehicle_id` |
| L316 | DeviceCommandSchema | `deviceId` |
| L447 | MaintenanceSchema | `vehicleId` |
| L472 | GroupSchema | `vehicleIds` |
| L501 | FuelRecordSchema | `vehicleId` |
| L540 | ContractSchema | `vehicleCount` |
| L604, L620 | ScheduleRuleSchema | `vehicleId` |

---

## 10. Backend - Entry Point (index.ts)

**Fichier** : `backend/src/index.ts`  
**Criticité** : 🔴 HIGH | **Opération** : DEFINE

| Ligne | Import/Registration |
|-------|--------------------|
| L8 | `import vehicleRoutes from './routes/vehicleRoutes'` |
| L12 | `import deviceRoutes from './routes/deviceRoutes'` |
| L13 | `import discoveredDeviceRoutes from './routes/discoveredDeviceRoutes'` |
| L18 | `import stockMovementRoutes from './routes/stockMovementRoutes'` |
| L29 | `import fleetRoutes from './routes/fleetRoutes'` |
| L201 | `app.use('/api/vehicles', vehicleRoutes)` → `/api/objects` |
| L204 | `app.use('/api/devices', deviceRoutes)` |
| L205 | `app.use('/api/discovered-devices', discoveredDeviceRoutes)` |
| L225 | `app.use('/api/fleet', fleetRoutes)` — sub-routes include `/vehicles/*` |

---

## 11. Frontend - Types partagés (types.ts)

**Fichier** : `types.ts` (racine)  
**Criticité** : 🔴 HIGH (CRITIQUE) | **Opération** : DEFINE

| Ligne | Type/Enum | Impact |
|-------|-----------|--------|
| L1-7 | `VehicleStatus` enum | Rename to ObjectStatus or keep for backwards compat |
| L52 | Permissions: `VIEW_VEHICLES`, `CREATE_VEHICLES`, `EDIT_VEHICLES`, `DELETE_VEHICLES` | Rename to *_OBJECTS |
| L82 | Device permissions: `VIEW_DEVICES`, `CREATE_DEVICES`, `EDIT_DEVICES`, `DELETE_DEVICES` | Keep for SIM/SENSOR |
| L299-300 | `Contract`: `vehicleCount`, `vehicleIds` | → objectCount, objectIds |
| L383 | `Alert`: `vehicleId` | → objectId |
| L428 | `Command`: `vehicleId` | → objectId |
| L458-474 | `Intervention`: vehicleName, vehicleType, vehicleBrand, vehicleModel, vehicleYear, vehicleColor, vehicleMileage | Keep as snapshot data (rename field names) |
| L505 | `targetVehicleId` | → targetObjectId |
| L554 | `DeviceType = 'BOX' \| 'SIM' \| 'SENSOR' \| 'ACCESSORY'` | BOX moves to ObjectType; DeviceType = SIM/SENSOR/ACCESSORY |
| L559-577 | `DeviceStock` interface | `assignedVehicleId`, `vehicleName`, `vehiclePlate` → remove for BOX items |
| L630, 642, 655 | `Trip`/`Position`: `vehicleId` | → objectId |
| L653-693 | **`Vehicle` interface** (full definition) | → **`TrackedObject` interface** (or `FleetObject`) |
| L758-759 | Form aliases: vehicleType, deviceType | Consolidate |
| L764-765 | Dashboard stats: `totalVehicles`, `activeVehicles` | → totalObjects, activeObjects |
| L803-804 | `FuelRecord`: vehicleId, vehicleName | → objectId, objectName |
| L933 | `MaintenanceRecord`: vehicleId | → objectId |
| L1030, L1064 | `Subscription`: vehicleCount, maxVehicles | → objectCount, maxObjects |
| L1106-1107 | `ScheduleRule`: vehicleId, vehicleName | → objectId, objectName |
| L1377, L1384-1385 | `Command`: vehicleCount, vehicleId | → objectCount, objectId |
| L1417-1418, L1446, L1462 | Rule configs: vehicleIds, allVehicles | → objectIds, allObjects |

---

## 12. Frontend - DataContext (State Management)

**Fichier** : `contexts/DataContext.tsx`  
**Criticité** : 🔴 HIGH (CRITIQUE) | **Opération** : BOTH

| Ligne | Reference | Impact |
|-------|-----------|--------|
| L3 | `import { Vehicle, DeviceStock, VehicleStatus, VehiclePositionHistory }` | Type renames |
| L24 | `vehicles: Vehicle[]` in context type | → `objects: TrackedObject[]` |
| L80-81 | `addVehicle`/`updateVehicle` mutations | → addObject/updateObject |
| L88-90 | `addDevice`/`updateDevice`/`deleteDevice` | Keep for SIM/SENSOR |
| L207-208 | `getVehicleHistory`/`getVehicleHistorySnapped` | → getObjectHistory |
| L211-223 | Vehicle-specific data fetchers (fuel, maintenance, alerts, immobilization) | → object-specific |
| L254-258 | Socket listener `'vehicle:update'` → updates query cache `['vehicles', tenantId]` | → `'object:update'` + `['objects', tenantId]` |
| L310-313 | `useQuery` for vehicles: `api.vehicles.list(tenantId)`, queryKey `['vehicles']` | → `api.objects.list()`, `['objects']` |
| L562 | `vehicles` array safety | rename |
| L691-701 | `addVehicleMutation`/`updateVehicleMutation` | → addObjectMutation/updateObjectMutation |
| L741-749 | `addDeviceMutation` using `api.stock.create` | Keep for SIM/SENSOR |

---

## 13. Frontend - Service API (api.ts)

**Fichier** : `services/api.ts`  
**Criticité** : 🔴 HIGH (CRITIQUE) | **Opération** : BOTH (4000+ lines)

| Ligne | Section | API Calls | Impact |
|-------|---------|-----------|--------|
| L1 | Imports | `Vehicle, DeviceStock, VehiclePositionHistory` | Type renames |
| L13 | DB_KEYS | `VEHICLES = 'db_vehicles_v2'` | → `'db_objects_v2'` |
| L315-498 | **`api.vehicles`** object | `list()`, `update()`, `create()`, `getHistory()`, `logPosition()`, `toggleImmobilization()` | → `api.objects` |
| L315 | `list()` | `GET /fleet/vehicles` | → `GET /fleet/objects` or new URL |
| L340 | `update()` | `PUT /fleet/vehicles/:id` | → `PUT /fleet/objects/:id` |
| L365 | `create()` | `POST /fleet/vehicles` | → `POST /fleet/objects` |
| L400 | `getHistory()` | `GET /fleet/vehicles/:id/history/snapped` | → objects |
| L450 | `toggleImmobilization()` | `POST /fleet/vehicles/:id/immobilize` | → objects |
| L509-594 | `api.fuel` | Routes with vehicleId params | → objectId |
| L590+ | `api.maintenance` | vehicleId-based routes | → objectId |
| L5640-5658 | `api.fleet.getTrips()` / `analyzeTrips()` | `GET /fleet/vehicles/${vehicleId}/trips` | → objects |

---

## 14. Frontend - App.tsx (Root Component)

**Fichier** : `App.tsx`  
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Reference | Impact |
|-------|-----------|--------|
| L2 | `import { Vehicle, VehicleStatus, View, FleetMetrics }` | Type renames |
| L31 | `import { VehicleDetailPanel }` | → ObjectDetailPanel |
| L48 | `const { vehicles, ... } = useDataContext()` | → objects |
| L57 | `const [selectedVehicle, setSelectedVehicle] = useState<Vehicle \| null>(null)` | → selectedObject |
| L77 | `const [replayVehicle, setReplayVehicle] = useState<Vehicle \| null>(null)` | → replayObject |
| L104 | `link: { view: 'MAP', id: alert.vehicleId }` | → objectId |
| L141-142 | `if (selectedVehicle) { setSelectedVehicle(null); }` | rename |
| L163-168 | `metrics` computed from `vehicles` array | totalVehicles, activeVehicles, etc. → totalObjects |

---

## 15. Frontend - Feature: Fleet

### 15.1. `features/fleet/components/FleetTable.tsx`
**Criticité** : 🔴 HIGH | **Opération** : READ

| Ligne | Impact |
|-------|--------|
| L2, 16-19 | `Vehicle` type imports |
| L24-59 | Column definitions including 'vehicle' |
| L134-362 | Full component: vehicle filtering, sorting, pagination |

### 15.2. `features/fleet/components/VehicleDetailPanel.tsx`
**Criticité** : 🔴 HIGH | **Opération** : READ  
Entire component is a vehicle detail view. Must be renamed and refactored.

### 15.3. Detail Blocks
| Fichier | Criticité | Impact |
|---------|-----------|--------|
| `detail-blocks/PhotoBlock.tsx` | 🟡 MEDIUM | localStorage key `'vehicle_photos'` |
| `detail-blocks/ActivityBlock.tsx` | 🟡 MEDIUM | Vehicle status, location, mileage display |
| `detail-blocks/modals/FuelModalContent.tsx` | 🟢 LOW | `vehicle.fuelType` reference |

---

## 16. Frontend - Feature: Map

### 16.1. `features/map/components/MapView.tsx`
**Criticité** : 🔴 HIGH | **Opération** : READ

| Ligne | Impact |
|-------|--------|
| L5, 13, 21-22, 26, 42 | Imports: Vehicle, VehicleDetailPanel, VehicleListCard, VirtualVehicleList, AnimatedVehicleMarker |
| L140-244 | `MobileVehicleBottomSheet` component |
| L270-378 | MapView: `vehicles` prop, `focusedVehicle`, `replayVehicle`, `selectedVehicle` state |
| L293 | `SidebarTab = 'vehicles' \| 'places' \| 'drivers'` |
| L446 | `activeTab` default `'vehicles'` |
| L710 | Filtered vehicles for sidebar list |

### 16.2. `features/map/components/GoogleMapComponent.tsx`
**Criticité** : 🔴 HIGH

| Ligne | Impact |
|-------|--------|
| L3-66, L187-223 | Vehicle markers on Google Maps, Vehicle type references |

### 16.3. Other Map Components
| Fichier | Criticité | Impact |
|---------|-----------|--------|
| `AnimatedVehicleMarker.tsx` | 🟡 MEDIUM | Animated Leaflet vehicle markers |
| `VehicleListCard.tsx` | 🟡 MEDIUM | Vehicle list card for map sidebar |
| `VirtualVehicleList.tsx` | 🟡 MEDIUM | Virtualized vehicle list |
| `ReplayControlPanel.tsx` | 🟡 MEDIUM | `selectedVehicle?.maxSpeed` reference |

---

## 17. Frontend - Feature: Dashboard

### 17.1. `features/dashboard/components/DashboardView.tsx`
**Criticité** : 🔴 HIGH | **Opération** : READ

| Ligne | Impact |
|-------|--------|
| L2 | `import { Vehicle, FleetMetrics, VehicleStatus }` |
| L35-36 | Props: `vehicles: Vehicle[]`, `metrics: FleetMetrics` |
| L120 | Component receives `vehicles` prop |
| L161-169 | Fleet metrics computed from `vehicles` array: MOVING, IDLE, STOPPED, OFFLINE counts, kmToday, utilization, alertsCount |

---

## 18. Frontend - Feature: Tech (Interventions)

### 18.1. `features/tech/hooks/useInterventionForm.ts`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Impact |
|-------|--------|
| L15 | `import * as deviceService` |
| L49 | Destructures `vehicles, clients, stock` from DataContext |
| L55 | Active tab includes `'VEHICLE'` |
| L97-99 | `if (initialData.vehicleId)` → `getVehicleUpdates()` |
| L139-154 | Auto-populate old device info when Vehicle selected for Replacement/Removal |
| L142 | `vehicles.find(veh => veh.id === formData.vehicleId)` |
| L144 | `stock.find(d => d.assignedVehicleId === v.id && d.type === 'BOX')` → **CRITICAL**: BOX lookup via assignedVehicleId disappears |
| L163-196 | Client vehicle filtering: `vehicles.filter(...)` |
| L198-267 | `getVehicleUpdates()` helper: populates vehicleBrand, vehicleModel etc. from vehicle data + finds vehicle contracts |

### 18.2. `features/tech/services/deviceService.ts`
**Criticité** : 🟡 MEDIUM | **Opération** : WRITE

| Ligne | Impact |
|-------|--------|
| L3-90 | Device command functions (ping, cutEngine, configureAPN, configureIP) using IMEI |

### 18.3. `features/tech/constants.ts`
**Criticité** : 🟢 LOW  
L119: Tab definition `'vehicle'`

---

## 19. Frontend - Feature: Stock

### 19.1. `features/stock/components/StockView.tsx`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Impact |
|-------|--------|
| L5-11 | Imports `DeviceStock` type |
| L101 | Uses `vehicles` and `stock` from DataContext |
| L135, L140 | BOX type as default for new items |
| L233 | Filters stock for BOX type → **These BOX items move to `objects` table** |

**⚠️ CRITICAL**: StockView currently shows BOX alongside SIM/SENSOR/ACCESSORY. After refactoring, BOX items are in `objects` table and should NOT appear in stock list (or show differently).

---

## 20. Frontend - Feature: CRM

### 20.1. `features/crm/components/CRMView.tsx`
**Criticité** : 🟡 MEDIUM | L51: destructures `vehicles` from context

### 20.2. `features/crm/components/TierDetailModal.tsx`
**Criticité** : 🔴 HIGH

| Ligne | Impact |
|-------|--------|
| L15, L49 | Vehicle type import, vehicles from context |
| L519 | VEHICLES tab |
| L944-1007 | Client's vehicles with status, contract, invoice info |

### 20.3. `features/crm/components/ContractDetailModal.tsx`
**Criticité** : 🔴 HIGH

| Ligne | Impact |
|-------|--------|
| L8, 30, 36, 45-46 | Vehicle references |
| L376, 384 | vehicleIds |
| L511 | VEHICLES tab |
| L586-606 | Contract vehicle management with pagination |

### 20.4. `features/crm/components/ContractForm.tsx`
**Criticité** : 🔴 HIGH

| Ligne | Impact |
|-------|--------|
| L2-63 | Vehicle selection, clientVehicles loading, vehicleIds/vehicleCount fields |

### 20.5. `features/crm/components/AutomationRulesView.tsx`
**Criticité** : 🟢 LOW | L28: `VEHICLE_ALERT` trigger type

---

## 21. Frontend - Feature: Finance

### 21.1. `features/finance/components/FinanceView.tsx`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Impact |
|-------|--------|
| L12 | `import { ... Vehicle ... }` |
| L90 | Destructures `vehicles` from context |
| L515 | `intervention.vehicleId` in description |
| L886-910 | Contract vehicle management: vehicleCount, vehicleIds, handleAddVehicleToContract |
| L1491 | Passes `vehicles` prop |

### 21.2. `features/finance/components/AccountingView.tsx`
**Criticité** : 🟡 MEDIUM

| Ligne | Impact |
|-------|--------|
| L93 | Payment form: `vehicleId: string` |
| L107 | Destructures `vehicles` from context |
| L528-542 | Auto-fill vehicleId from invoice licensePlate: `vehicles.find(v => v.name === inv.licensePlate \|\| v.plate === inv.licensePlate)` |

---

## 22. Frontend - Feature: Reports

### 22.1. `features/reports/components/tabs/ActivityReports.tsx`
**Criticité** : 🔴 HIGH | **Opération** : READ

| Ligne | Impact |
|-------|--------|
| L2, 14, 18 | `Vehicle` import, `vehicles: Vehicle[]` prop |
| L22 | `selectedVehicles` state |
| L35-53 | `clientVehicleMap`, `filteredVehicles` computations |
| L58-86 | Report data mapped from vehicles array |

### 22.2. `features/reports/components/tabs/FuelReports.tsx`
**Criticité** : 🔴 HIGH | **Opération** : READ

| Ligne | Impact |
|-------|--------|
| L2, 15, 19 | `Vehicle` import, `vehicles: Vehicle[]` prop |
| L24 | `selectedVehicles` state |
| L37-63 | Vehicle-fuel mapping, filtering by selectedVehicles |

---

## 23. Frontend - Feature: Settings

### 23.1. `features/settings/components/SettingsView.tsx`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Impact |
|-------|--------|
| L16 | `import { ... Vehicle, VehicleStatus ... }` |
| L23 | `import { VehicleSchema }` |
| L32 | `const VehicleForm = lazy(() => import('./forms/VehicleForm'))` |
| L162-173 | Mock data: `vehicleCount`, subscription creation |

### 23.2. `features/settings/components/forms/VehicleForm.tsx`
**Criticité** : 🔴 HIGH  
Entire vehicle form component. Must be renamed/refactored to ObjectForm.

### 23.3. `features/settings/components/forms/GroupForm.tsx`
**Criticité** : 🔴 HIGH

| Ligne | Impact |
|-------|--------|
| L8 | `import { Vehicle, VehicleStatus }` |
| L17 | `VEHICLE_TYPE` filter |
| L79-115 | `vehicleIds` field, `accessibleVehicles` computation, vehicle filtering by client |

### 23.4. `features/settings/components/ResellerForm.tsx`
**Criticité** : 🟡 MEDIUM

| Ligne | Impact |
|-------|--------|
| L37, 73, 117, 284 | `maxVehicles` field in reseller form |

---

## 24. Frontend - Feature: Admin

### 24.1. `features/admin/components/panels/DeviceConfigPanelV2.tsx`
**Criticité** : 🔴 HIGH | **Opération** : BOTH

| Ligne | Impact |
|-------|--------|
| L37-45 | Vehicle imports/types |
| L152-180 | Queries `api.vehicles.list()` for device configuration |
| L278-322 | Vehicle filtering for device assignment |
| L545-617 | Vehicle selection UI, vehicle_name display |

### 24.2. `features/admin/permissions/permissionStructure.ts`
**Criticité** : 🟡 MEDIUM

| Ligne | Impact |
|-------|--------|
| L32, 44 | 'vehicles' module in permission structure |
| L101-174 | Full 'vehicles' permission sub-sections: general, device, client, maintenance, documents, alerts |

### 24.3. `features/admin/components/forms/ResellerDrawerForm.tsx`
**Criticité** : 🟡 MEDIUM

| Ligne | Impact |
|-------|--------|
| L41, 88, 120-124, 171, 214, 551, 598 | maxVehicles, vehicleCount in reseller management |

### 24.4. `features/admin/components/DocumentTemplatesPanelV2.tsx`
**Criticité** : 🟡 MEDIUM

| Ligne | Impact |
|-------|--------|
| L105-107, 228-229 | Template variables: `{{vehicle.immat}}`, `{{vehicle.brand}}`, `{{vehicle.model}}` |

### 24.5. `features/admin/components/panels/AuditLogsPanelV2.tsx`
**Criticité** : 🟢 LOW

| Ligne | Impact |
|-------|--------|
| L89, 111 | `VEHICLE` entity type in audit logs filter |

---

## 25. Frontend - Feature: Support

### 25.1. `features/support/components/SupportViewV2.tsx`
**Criticité** : 🟡 MEDIUM | **Opération** : BOTH

| Ligne | Impact |
|-------|--------|
| L66 | Destructures `vehicles` from context |
| L120 | Ticket form: `vehicleId: ''` |
| L201-213 | `clientVehicles` filtering, `vehicleCount` computation |
| L228 | Vehicle name resolution: `vehicles.find(v => v.id === t.vehicleId)?.name` |
| L277 | Reset ticket form with `vehicleId: ''` |

---

## 26. Frontend - Hooks

| Hook | Fichier | Lignes | Impact | Criticité |
|------|---------|--------|--------|-----------|
| `useNotifications` | `hooks/useNotifications.ts` | L31-32, 167, 190, 194, 200 | vehicleId, vehicleName in notification payload | 🟡 MEDIUM |
| `useAnimatedPosition` | `hooks/useAnimatedPosition.ts` | L10 | "animate vehicle position changes" comment | 🟢 LOW |

---

## 27. Frontend - Schemas (Zod)

| Schema | Fichier | Lignes impactées | Criticité |
|--------|---------|-------------------|-----------|
| **VehicleSchema** | `schemas/vehicleSchema.ts` | L3-28 | 🔴 HIGH → Rename ObjectSchema |
| **InterventionSchema** | `schemas/interventionSchema.ts` | L48-60, 80, 118 | 🔴 HIGH: vehicleId, vehicleType, vehicleBrand, vehicleModel, vehicleYear, vehicleColor, vehicleMileage, oldDeviceImei |
| **ContractSchema** | `schemas/financeSchema.ts` | L80-81 | 🟡 MEDIUM: vehicleCount, vehicleIds |
| **DeviceStockSchema** | `schemas/stockSchema.ts` | L3, 16 | 🔴 HIGH: assignedVehicleId → remove for BOX |
| **SubUserSchema** | `schemas/subUserSchema.ts` | L6-7, 51-52, 68-69, 84-85, 100-101 | 🟡 MEDIUM: canViewVehicles, canEditVehicles, vehicleIds, allVehicles |
| **TicketSchema** | `schemas/ticketSchema.ts` | L20 | 🟢 LOW: vehicleId optional |
| **ScheduleSchema** | `schemas/scheduleSchema.ts` | L33-34 | 🟡 MEDIUM: vehicleIds, allVehicles |
| **NotificationSchema** | `schemas/notificationSchema.ts` | L24, 38 | 🟢 LOW: vehicleAlerts, 'vehicle_alert' |
| **MaintenanceSchema** | `schemas/maintenanceSchema.ts` | L21 | 🟡 MEDIUM: vehicleIds |
| **TierSchema** | `schemas/tierSchema.ts` | L38, 64 | 🟡 MEDIUM: vehicleCount, maxVehicles |

---

## 28. Frontend - Components (Sidebar, Lazy)

### 28.1. `components/Sidebar.tsx`
**Criticité** : 🟢 LOW  
Uses dynamic menu from `getSortedSidebarMenu()`. The `Truck` icon (L4, L14) is mapped for fleet items. No hardcoded vehicle text — menu items come from configuration. **Impact minimal** : just icon mapping.

### 28.2. `LazyViews.tsx`
**Criticité** : 🟢 LOW

| Ligne | Impact |
|-------|--------|
| L79-81 | `LazyStockView` — loads StockView |
| L119-120 | `LazyFleetTable` — loads FleetTable |

No direct vehicle references in lazy loading wrappers — they just import the components.

---

## 29. Migrations DB existantes

### Migrations referencing vehicles

| Migration | Impact | Criticité |
|-----------|--------|-----------|
| `20260206_add_transfer_columns.sql` | Adds `target_vehicle_id` to interventions + index | 🟡 MEDIUM |
| `20260207_add_missing_intervention_columns.sql` | Adds `vehicle_type`, `vehicle_year`, `vehicle_color` to interventions | 🟡 MEDIUM |
| `20260210192451_contracts_audit_improvements.sql` | Adds `vehicle_ids JSONB` to contracts | 🔴 HIGH |
| `20260211_contracts_numbering_vehicles.sql` | Function `match_contract_vehicles()` queries `FROM vehicles v` to match plates | 🔴 HIGH |
| `20260226_add_imei_tracker_model_to_vehicles.sql` | Adds `imei`, `tracker_model` to vehicles table | 🔴 HIGH |
| `20260226_update_location_client_for_installed_devices.sql` | Updates device locations | 🟡 MEDIUM |
| `20260224_discovered_devices.sql` | Creates `discovered_devices` table | 🟢 LOW |
| `20241229_settings_tables.sql` | `fuel_alerts` with `vehicle_id REFERENCES vehicles(id)` | 🟡 MEDIUM |
| `20241229_tickets_system.sql` | `tickets` with `vehicle_id REFERENCES vehicles(id)` | 🟡 MEDIUM |

### Table creation scripts

| Script | Tables with vehicle FK | Criticité |
|--------|----------------------|-----------|
| `create_fleet_enhancements.ts` | trips, fuel_records → `REFERENCES vehicles(id)` | 🔴 HIGH |
| `create_fleet_tables.ts` | scheduled_tasks, geofence_alerts → `REFERENCES vehicles(id)` | 🟡 MEDIUM |
| `create_missing_tables.ts` | drivers, maintenance_records, vehicle_sensors, commands → `REFERENCES vehicles(id)` | 🔴 HIGH |
| `create_tech_tables.ts` | tech_interventions → `REFERENCES vehicles(id)` | 🟡 MEDIUM |
| `create_notification_logs_table.ts` | notification_logs → `REFERENCES vehicles(id)` | 🟢 LOW |
| `create_sim_table.ts` | sim_cards → `REFERENCES devices(id)` | 🟡 MEDIUM |

---

## 30. Mobile (Capacitor/React Native)

### 30.1. React Native Navigation Types
**Fichier** : `trackyu-mobile/src/navigation/types.ts`  
**Criticité** : 🟡 MEDIUM

| Ligne | Impact |
|-------|--------|
| L8 | `VehicleDetail: { vehicleId: string }` in navigation params → `ObjectDetail: { objectId: string }` |

### 30.2. Capacitor WebView
**Criticité** : 🟢 LOW  
Capacitor loads the web app, so all frontend changes automatically propagate. No separate native vehicle code.

---

## 31. Synthèse quantitative

### Par criticité

| Criticité | Nombre de fichiers | Exemples |
|-----------|--------------------|----------|
| 🔴 **HIGH** | ~30 | vehicleController.ts, cacheService.ts, gps-server/server.ts, api.ts, DataContext.tsx, types.ts, positionBuffer.ts, fleetController.ts |
| 🟡 **MEDIUM** | ~20 | subscriptionRoutes.ts, tierSchema.ts, ResellerForm.tsx, SupportViewV2.tsx, mqtt.ts |
| 🟢 **LOW** | ~10 | LazyViews.tsx, Sidebar.tsx, metricsService.ts, AuditLogsPanelV2.tsx |

### Par couche

| Couche | Fichiers impactés |
|--------|-------------------|
| **Database Schema** | 6 files (schema.sql, create_*.ts) + 9 migrations |
| **Backend Routes** | 10+ route files |
| **Backend Controllers** | 9 controller files |
| **Backend Services** | 7 service files |
| **Backend GPS Server** | 2 files (server.ts, types.ts) |
| **Backend Other** | 3 files (index.ts, mqtt.ts, socketThrottle.ts) |
| **Frontend Types** | 1 file (types.ts) — 30+ type references |
| **Frontend State** | 2 files (DataContext.tsx, api.ts) |
| **Frontend Features** | 20+ component files across 10 feature modules |
| **Frontend Schemas** | 10 schema files |
| **Frontend Hooks** | 2 hook files |
| **Mobile** | 1 file |

### Opérations par type

| Type | Count | Description |
|------|-------|-------------|
| **SQL Table rename** | 1 | vehicles → objects |
| **SQL Column rename** | 12+ | vehicle_id → object_id across many tables |
| **SQL FK migration** | 15+ | All FKs pointing to vehicles(id) |
| **API URL changes** | 20+ | /vehicles → /objects in routes |
| **WebSocket event rename** | 2 | vehicle:update, vehicle:immobilization |
| **MQTT topic rename** | 1 | fleet/vehicles/+/telemetry |
| **TypeScript type rename** | 30+ | Vehicle → TrackedObject (or FleetObject) |
| **Cache key rename** | 3+ | vehicle:imei, vehicle:lastpos |
| **Permission rename** | 4+ | VIEW/CREATE/EDIT/DELETE_VEHICLES |
| **Numbering system change** | 1 | VEH-xxxx → ABO-xxxxxx format |

---

## 32. Plan de migration recommandé

### Phase 1 — Database (HAUTE PRIORITÉ)
1. **Créer la table `objects`** avec toutes les colonnes fusionnées (vehicles + devices.BOX)
2. **Migrer les données** : INSERT INTO objects SELECT ... FROM vehicles JOIN devices
3. **Créer une VIEW `vehicles`** temporaire pointant vers `objects` (rétro-compatibilité)
4. **Migrer les FK** : ALTER TABLE positions RENAME COLUMN vehicle_id TO object_id + ADD CONSTRAINT
5. **Mettre à jour le numbering** : Remplacer VEH-xxxx par ABO-xxxxxx

### Phase 2 — Backend Core (HAUTE PRIORITÉ)
1. **CacheService** → Renommer méthodes et clés Redis
2. **GPS Server** → Adapter le pipeline IMEI→Object
3. **PositionBuffer** → Renommer vehicle_id → object_id
4. **vehicleController** → Refactorer en objectController
5. **Schemas Zod backend** → Renommer VehicleSchema → ObjectSchema

### Phase 3 — Backend Routes & API
1. **Créer nouvelles routes** /api/objects/* en parallèle de /api/vehicles/*
2. **Adapter fleetRoutes** → sous-routes /objects/
3. **Mettre à jour index.ts** → nouvel enregistrement
4. **WebSocket events** → émettre les deux noms temporairement
5. **MQTT** → nouveau topic + ancien en parallèle

### Phase 4 — Frontend Types & State
1. **types.ts** → Créer TrackedObject + aliases de rétro-compatibilité
2. **DataContext** → Adapter queries vers /api/objects
3. **api.ts** → Ajouter api.objects, garder api.vehicles en alias

### Phase 5 — Frontend Components (VOLUME ÉLEVÉ)
1. Renommer les composants un par un (Fleet, Map, Dashboard, etc.)
2. Adapter les schemas Zod frontend
3. Mettre à jour les formulaires (VehicleForm → ObjectForm)

### Phase 6 — Cleanup
1. Supprimer la VIEW `vehicles` rétro-compatible
2. Supprimer les anciennes routes /api/vehicles
3. Supprimer les anciens types Vehicle
4. DROP TABLE vehicles (si plus utilisée)
5. Nettoyer les devices.assigned_vehicle_id pour type!='BOX'

### ⚠️ Risques identifiés

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Downtime GPS pipeline** | Perte de données position | Migration en temps mort + vue rétro-compatible |
| **Cache Redis invalidation** | Données stale | Flush Redis complet après migration |
| **Mobile app en production** | Crash si API change | Garder anciens endpoints actifs pendant transition |
| **Interventions en cours** | assigned_vehicle_id cassé | Migrer les données intervention.vehicle_id en même temps |
| **Contracts vehicle_ids JSONB** | IDs orphelins | Script de migration des IDs dans le JSON |
| **Numbering counters** | Séquence cassée | Nouveau module de génération ABO-xxx |

---

> **Fin de l'audit** — Ce document inventorie TOUS les fichiers et lignes impactés par la migration `vehicles` → `objects`.  
> Aucun fichier n'a été modifié. Ce rapport est la base pour planifier le refactoring.
