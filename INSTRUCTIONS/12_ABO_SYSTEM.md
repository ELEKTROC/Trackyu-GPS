# Système ABO — Architecture d'Abonnement Unifié TrackYu GPS

> Document de référence décrivant le principe du système d'abonnement ABO, son architecture technique, ses règles métier et ses impacts sur l'ensemble de la plateforme.

**Date de mise en place** : 4 mars 2026  
**Commits** : `77303ec` (DB) → `e081cec` (Backend) → `afec65f` (Frontend + Cleanup)  
**Statut** : ✅ Déployé en production

---

## 1. Principe fondamental

### 1.1 Problème résolu

Avant le système ABO, la plateforme gérait **deux entités distinctes** :

| Entité | Table | Rôle |
|--------|-------|------|
| **Vehicle** | `vehicles` | Représentait un véhicule + ses données GPS |
| **Device** (BOX) | `devices` | Représentait un tracker GPS physique |

Cette séparation causait plusieurs problèmes :

- **Rupture d'historique** : Quand on remplaçait un tracker GPS sur un véhicule, l'historique GPS était lié à l'ancien tracker (via `vehicle_id`), pas au service d'abonnement
- **Double gestion** : Créer un véhicule + un device + les associer = 3 opérations
- **Incohérence des FK** : `positions.vehicle_id`, `trips.vehicle_id`, etc. référençaient tantôt le véhicule, tantôt le device
- **Pas de notion d'abonnement** : Aucun identifiant stable pour le service rendu au client

### 1.2 Solution : L'entité unifiée "Object"

Le système ABO fusionne **Véhicule + Tracker GPS** en une seule entité appelée **Object** (objet suivi), identifiée par un **code d'abonnement unique et permanent** : `ABO-XXXXXX`.

```
AVANT :                          APRÈS :
┌──────────┐   ┌──────────┐     ┌─────────────────────────┐
│ Vehicle   │   │ Device   │     │ Object (ABO-A3K7B9)     │
│ (UUID)    │◄──│ (BOX)    │ ──► │  ├─ Données véhicule    │
│ name,     │   │ imei,    │     │  │  (name, plate, brand) │
│ plate,    │   │ model,   │     │  ├─ Données tracker      │
│ status    │   │ status   │     │  │  (imei, model, serial)│
└──────────┘   └──────────┘     │  ├─ Télémétrie           │
                                │  │  (speed, fuel, pos)    │
                                │  └─ Abonnement            │
                                │     (client, contrat)     │
                                └─────────────────────────┘
```

**Le code ABO est l'identifiant permanent du service**. Le matériel (tracker) peut changer, le véhicule peut changer, mais le code ABO reste.

---

## 2. Spécification du code ABO

### 2.1 Format

| Propriété | Valeur |
|-----------|--------|
| **Préfixe** | `ABO-` |
| **Longueur du code** | 6 caractères alphanumériques |
| **Format complet** | `ABO-XXXXXX` (10 caractères total) |
| **Charset** | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (29 caractères) |
| **Exclusions** | `0` (zéro), `O` (o majuscule), `1` (un), `I` (i majuscule) — évite la confusion visuelle |
| **Combinaisons possibles** | 29^6 = **594 823 321** (~594 millions) |
| **Collision** | Quasi-impossible pour < 100 000 objets |

### 2.2 Exemples

```
ABO-A3K7B9
ABO-XVNP42
ABO-8RFT6C
ABO-WQJ3M5
```

### 2.3 Génération

**En base de données** (migration SQL) :
```sql
CREATE OR REPLACE FUNCTION generate_abo_code() RETURNS VARCHAR(20) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := 'ABO-';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

**En backend Node.js** (objectController.ts) :
```typescript
import crypto from 'crypto';

const ABO_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateAboCode(): string {
  let code = 'ABO-';
  for (let i = 0; i < 6; i++) {
    code += ABO_CHARS[crypto.randomInt(ABO_CHARS.length)]; // Cryptographiquement sûr
  }
  return code;
}

async function generateUniqueAboCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateAboCode();
    const exists = await pool.query('SELECT 1 FROM objects WHERE id = $1', [code]);
    if (exists.rows.length === 0) return code;
  }
  // Fallback : timestamp-based (extrêmement improbable)
  return `ABO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
```

**Sécurité de la génération** :
- Le backend utilise `crypto.randomInt()` (CSPRNG) au lieu de `Math.random()`
- 10 tentatives de génération avec vérification d'unicité en DB
- Fallback basé sur timestamp si les 10 tentatives échouent (probabilité astronomiquement faible)

---

## 3. Règles métier du système ABO

### 3.1 Table des règles

| # | Règle | Description | Implémentation |
|---|-------|-------------|----------------|
| 1 | **PK = ABO-XXXXXX** | L'identifiant primaire de `objects` est le code ABO | `objects.id VARCHAR(20) PRIMARY KEY` |
| 2 | **1 objet = 1 IMEI = 1 ABO** | Chaque objet a au plus un IMEI, et chaque IMEI est unique | `UNIQUE INDEX ON objects(imei) WHERE imei IS NOT NULL` |
| 3 | **Positions → objects.id** | Les positions GPS sont liées à l'objet, pas au tracker physique | `positions.object_id FK → objects.id` |
| 4 | **Contrats → ABO codes** | Les contrats référencent les codes ABO dans `vehicle_ids` (JSONB array) | `contracts.vehicle_ids = ['ABO-XXX', 'ABO-YYY']` |
| 5 | **SIM / ACC dans devices** | Les accessoires (SIM, ACC) restent dans la table `devices` avec FK vers `objects` | `devices.object_id FK → objects.id` |
| 6 | **IMEI obligatoire pour opérer** | Un objet sans IMEI existe mais ne peut pas tracker de position | Validation dans `objectController.create()` |
| 7 | **Changement de balise** | Changer de tracker = mettre à jour `objects.imei` + `device_model` | L'historique GPS reste lié au même ABO |
| 8 | **Changement de véhicule** | Déplacer le tracker vers un autre véhicule = mettre à jour `plate`, `brand`, `model` | Le code ABO suit le service, pas le véhicule physique |
| 9 | **Historique GPS → ABO** | L'historique suit le code ABO, pas l'IMEI physique ni le véhicule | Continuité garantie par `positions.object_id` |
| 10 | **Multi-tenant** | Chaque objet est isolé par `tenant_id` | Filtrage systématique dans toutes les requêtes |

### 3.2 Scénarios opérationnels

#### Scénario A : Remplacement d'un tracker défectueux

```
Avant : ABO-A3K7B9 → IMEI 860000001 → Véhicule "Toyota Hilux AB-1234"
Action : UPDATE objects SET imei = '860000002', device_model = 'GT06N' WHERE id = 'ABO-A3K7B9'
Après : ABO-A3K7B9 → IMEI 860000002 → Véhicule "Toyota Hilux AB-1234"

✅ L'historique GPS reste accessible via ABO-A3K7B9
✅ Les positions anciennes (IMEI 860000001) ET nouvelles (IMEI 860000002) sont sous le même ABO
```

#### Scénario B : Déplacement du tracker vers un autre véhicule

```
Avant : ABO-A3K7B9 → IMEI 860000001 → "Toyota Hilux AB-1234"
Action : UPDATE objects SET plate = 'CD-5678', name = 'Hyundai H100', brand = 'Hyundai', model = 'H100' WHERE id = 'ABO-A3K7B9'
Après : ABO-A3K7B9 → IMEI 860000001 → "Hyundai H100 CD-5678"

✅ L'abonnement continue de facturer le client
✅ L'historique GPS est continu sous ABO-A3K7B9
⚠️ Note : L'historique du "Toyota Hilux" n'est plus séparable facilement (par design)
```

#### Scénario C : Création d'un nouvel abonnement

```
1. Génération du code ABO-XVNP42
2. INSERT INTO objects (id, tenant_id, imei, name, plate, ...) VALUES ('ABO-XVNP42', ...)
3. Le code apparaît dans l'interface comme identifiant de l'objet
4. Toutes les positions GPS entrantes pour cet IMEI seront INSERT avec object_id = 'ABO-XVNP42'
```

#### Scénario D : Résiliation d'abonnement

```
Le code ABO reste en base (soft-delete ou changement de status)
L'historique reste consultable
L'IMEI peut être réaffecté à un nouvel ABO si le tracker est récupéré
```

---

## 4. Architecture base de données

### 4.1 Table `objects` (source de vérité)

```sql
CREATE TABLE objects (
    -- Identité (ABO code = clé primaire)
    id VARCHAR(20) PRIMARY KEY,        -- ABO-XXXXXX
    tenant_id VARCHAR(50) NOT NULL,

    -- Champs tracker GPS
    imei VARCHAR(50),                  -- UNIQUE (conditionnel, WHERE NOT NULL)
    device_model VARCHAR(100),
    device_serial VARCHAR(100),
    device_status VARCHAR(50),         -- IN_STOCK, INSTALLED, RMA_PENDING, etc.
    device_location VARCHAR(50),       -- CENTRAL, SIEGE, TECH, CLIENT
    technician_id VARCHAR(50),
    transfer_status VARCHAR(20),

    -- Champs véhicule
    name VARCHAR(255),
    plate VARCHAR(100),
    vin VARCHAR(50),
    brand VARCHAR(50),
    model VARCHAR(100),
    vehicle_type VARCHAR(20),          -- CAR, TRUCK, MOTORCYCLE, etc.
    driver_name VARCHAR(100),

    -- Relations
    client_id VARCHAR(50),
    contract_id VARCHAR(50),
    group_id VARCHAR(50),
    branch_id VARCHAR(50),

    -- Télémétrie temps réel
    status VARCHAR(20) DEFAULT 'OFFLINE',
    speed NUMERIC(5,2) DEFAULT 0,
    mileage NUMERIC(10,2) DEFAULT 0,
    fuel_level INTEGER DEFAULT 100,
    battery_voltage NUMERIC(4,2),
    is_immobilized BOOLEAN DEFAULT false,

    -- Gestion carburant
    tank_capacity INTEGER,
    fuel_sensor_type VARCHAR(20),
    calibration_table JSONB,
    ...

    -- Dates
    install_date TIMESTAMPTZ,
    entry_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 Index clés

```sql
CREATE INDEX idx_objects_tenant_id ON objects(tenant_id);
CREATE INDEX idx_objects_imei ON objects(imei);
CREATE UNIQUE INDEX idx_objects_imei_unique ON objects(imei) WHERE imei IS NOT NULL;
CREATE INDEX idx_objects_client_id ON objects(client_id);
CREATE INDEX idx_objects_status ON objects(status);
CREATE INDEX idx_objects_device_status ON objects(device_status);
CREATE INDEX idx_objects_contract_id ON objects(contract_id);
```

L'index unique conditionnel sur `imei` (`WHERE imei IS NOT NULL`) permet :
- Plusieurs objets sans IMEI (en stock, en attente de tracker)
- Unicité stricte quand un IMEI est assigné (pas de double assignation)

### 4.3 Tables dépendantes (FK vers objects)

| Table | Colonne FK | Relation | Description |
|-------|-----------|----------|-------------|
| `positions` | `object_id` | N:1 | Historique GPS (hypertable TimescaleDB) |
| `trips` | `object_id` | N:1 | Trajets calculés |
| `alerts` | `object_id` | N:1 | Alertes (excès vitesse, géofence, etc.) |
| `commands` | `object_id` | N:1 | Commandes envoyées au tracker |
| `tickets` | `object_id` | N:1 | Tickets support technique |
| `devices` | `object_id` | N:1 | Accessoires SIM/ACC associés |
| `contracts` | `vehicle_ids` (JSONB) | N:M | Codes ABO dans un tableau JSONB |

### 4.4 Vue de compatibilité `vehicles`

Pour assurer la rétrocompatibilité pendant la transition, une **VIEW SQL** nommée `vehicles` est créée au-dessus de la table `objects` :

```sql
CREATE OR REPLACE VIEW vehicles AS
SELECT
    id,
    tenant_id,
    name,
    status,
    vehicle_type AS type,
    plate, vin, brand, model,
    driver_name,
    client_id, contract_id, group_id, branch_id,
    fuel_level, battery_voltage, mileage, ...
    imei,
    device_model AS tracker_model,
    ...
FROM objects;
```

Des **INSTEAD OF triggers** redirigent les INSERT/UPDATE/DELETE sur la vue vers la table `objects` :

```sql
-- INSERT sur vehicles → INSERT dans objects (avec génération auto du code ABO)
CREATE TRIGGER vehicles_insert_trigger INSTEAD OF INSERT ON vehicles
FOR EACH ROW EXECUTE FUNCTION vehicles_insert_redirect();

-- UPDATE sur vehicles → UPDATE dans objects
CREATE TRIGGER vehicles_update_trigger INSTEAD OF UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION vehicles_update_redirect();

-- DELETE sur vehicles → DELETE dans objects
CREATE TRIGGER vehicles_delete_trigger INSTEAD OF DELETE ON vehicles
FOR EACH ROW EXECUTE FUNCTION vehicles_delete_redirect();
```

Cette vue permet au code legacy qui fait `SELECT * FROM vehicles` de continuer à fonctionner sans modification.

---

## 5. Impacts sur le backend

### 5.1 Fichiers impactés

| Fichier | Impact |
|---------|--------|
| `objectController.ts` (895 lignes) | **Nouveau** — CRUD complet pour objects, génération ABO |
| `vehicleController.ts` | **Migré** — Toutes les requêtes SQL pointent vers `objects` |
| `fleetController.ts` | **Migré** — Requêtes `FROM objects` |
| `deviceController.ts` | **Mis à jour** — Lookup IMEI dans `objects` |
| `contractController.ts` | **Mis à jour** — `vehicle_ids` contient des codes ABO |
| `aiController.ts` | **Migré** — `FROM objects` |
| `vehicleReportController.ts` | **Migré** — `FROM objects` |
| `resellerStatsController.ts` | **Migré** — `FROM objects` |
| `TenantController.ts` | **Migré** — `COUNT(*) FROM objects` |
| `interventionController.ts` | **Migré** — Lookup dans `objects` |
| `analyticsRoutes.ts` | **Migré** — Status distribution depuis `objects` |
| `cacheService.ts` | **Migré** — Lookup IMEI dans `objects` |
| `positionBuffer.ts` | **Migré** — INSERT avec `object_id` (code ABO) |
| `gps-server/server.ts` | **Migré** — Alertes liées à `object_id` |
| `mqtt.ts` | **Migré** — Lookup tenant depuis `objects` |
| `ruleEvaluationService.ts` | **Migré** — Lookup IMEI dans `objects` |

### 5.2 Routes

Le `objectController` est exposé via les routes existantes (redirection) :

```
vehicleRoutes.ts  → objectController (backward compat, même endpoints /api/vehicles/*)
fleetRoutes.ts    → objectController (endpoints /api/fleet/*)
```

### 5.3 Pipeline GPS temps réel

Le flux de données GPS a été entièrement adapté :

```
Tracker GPS (IMEI) → TCP :5000 → gps-server/server.ts
                                        │
                                        ▼
                                 CacheService.getVehicleByImei(imei)
                                 → SELECT FROM objects WHERE imei = $1
                                        │
                                        ▼
                                 positionBuffer.add({
                                     object_id: vehicle.id,  // ← ABO code
                                     latitude, longitude, speed, ...
                                 })
                                        │
                                        ▼
                                 INSERT INTO positions (object_id, ...)
                                 → object_id = 'ABO-A3K7B9'
```

Le `CacheService` met en cache la correspondance `IMEI → Object` dans Redis pour éviter des lookups DB répétés.

---

## 6. Impacts sur le frontend

### 6.1 Types TypeScript

Le fichier `types.ts` a été enrichi avec :

**`DeviceStatus`** — 11 statuts possibles pour le dispositif GPS :
```typescript
export type DeviceStatus =
  | 'IN_STOCK' | 'INSTALLED' | 'DEFECTIVE' | 'RETURNED'
  | 'RMA' | 'RMA_PENDING' | 'SENT_TO_SUPPLIER'
  | 'REPLACED_BY_SUPPLIER' | 'SCRAPPED' | 'LOST' | 'REMOVED';
```

**`TrackedObject`** — Type source de vérité :
```typescript
export interface TrackedObject {
  id: string;               // ABO-XXXXXX (clé primaire)
  subscriptionCode: string; // Alias pour id
  tenantId: string;
  imei: string;
  deviceModel?: string;
  deviceStatus?: DeviceStatus;
  name: string;
  plate?: string;
  // ... tous les champs de la table objects
}
```

**`Vehicle extends TrackedObject`** — Compatibilité ascendante :
```typescript
export interface Vehicle extends TrackedObject {
  client: string;      // = clientName || ''
  driver: string;      // = driverName || ''
  speed: number;       // km/h (default 0)
  fuelLevel: number;   // percentage (default 0)
  // ... champs calculés (maxSpeed, consumption, etc.)
}
```

### 6.2 Adaptateur API (api.ts)

La méthode `api.vehicles.list()` applique un **adaptateur lossless** qui :
1. Conserve **tous les champs TrackedObject** (`...v` spread)
2. Ajoute les **alias de compatibilité** (`client`, `driver`, `speed`, etc.)
3. Fournit des **valeurs par défaut** pour les champs obligatoires de `Vehicle`

```typescript
// Adaptateur lossless dans api.vehicles.list()
return data.map((v: any) => ({
  ...v,                          // ← Préserve TOUS les champs TrackedObject
  client: v.clientName || '',    // Alias compat
  driver: v.driverName || '',    // Alias compat
  speed: v.speed || 0,           // Default
  // ... autres alias
}));
```

### 6.3 Affichage dans l'interface

Les codes ABO apparaissent dans :
- La table de flotte (`FleetTable.tsx`) — colonne `subscriptionCode`
- Les détails d'un véhicule — `vehicle.id` affiche `ABO-XXXXXX`
- Les contrats — liste des `vehicleIds` (codes ABO)
- Les tickets de support — référence à l'objet via code ABO

---

## 7. Impacts sur les contrats

### 7.1 Stockage

Les contrats stockent les codes ABO dans le champ `vehicle_ids` (JSONB array) :

```json
{
  "id": "contract-uuid",
  "clientId": "client-uuid",
  "vehicle_ids": ["ABO-A3K7B9", "ABO-XVNP42", "ABO-8RFT6C"],
  "status": "ACTIVE",
  "monthlyFee": 45000
}
```

### 7.2 Exclusivité

La fonction `checkVehicleExclusivity()` dans `contractController.ts` vérifie qu'un même code ABO n'est pas dans plusieurs contrats actifs simultanément :

```sql
SELECT c.id, c.contract_number
FROM contracts c,
     jsonb_array_elements_text(c.vehicle_ids) AS vid(id)
WHERE c.status IN ('ACTIVE', 'SUSPENDED')
  AND c.tenant_id = $1
  AND c.id != $2    -- Exclure le contrat en cours d'édition
  AND vid.id = ANY($3)   -- Vérifier les ABO codes
```

### 7.3 Impact de la migration

Lors de la migration initiale, tous les anciens `vehicle_id` (UUID) dans `contracts.vehicle_ids` ont été convertis en codes ABO via la table de mapping :

```sql
UPDATE contracts c
SET vehicle_ids = (
    SELECT jsonb_agg(m.new_object_id)
    FROM jsonb_array_elements_text(c.vehicle_ids) AS vid(id)
    JOIN vehicle_to_object_map m ON m.old_vehicle_id = vid.id
)
WHERE c.vehicle_ids IS NOT NULL AND c.vehicle_ids != '[]'::jsonb;
```

---

## 8. Impacts sur les accessoires (SIM, ACC)

Les accessoires (cartes SIM, câbles ACC, relais) restent dans la table `devices` mais sont maintenant liés aux objets via `object_id` :

```sql
ALTER TABLE devices ADD COLUMN object_id VARCHAR(20);
ALTER TABLE devices ADD CONSTRAINT devices_object_id_fkey 
    FOREIGN KEY (object_id) REFERENCES objects(id);
```

Un code ABO peut avoir :
- 0 ou 1 SIM associée
- 0 ou N accessoires (ACC) associés

```
ABO-A3K7B9 (objects)
├── SIM Orange CI (devices, type=SIM, object_id=ABO-A3K7B9)
├── Relais coupure (devices, type=ACC, object_id=ABO-A3K7B9)
└── Microphone (devices, type=ACC, object_id=ABO-A3K7B9)
```

---

## 9. Migration des données existantes

### 9.1 Stratégie

La migration (535 lignes SQL) a été exécutée en **12 étapes** :

| Étape | Description |
|-------|-------------|
| 0 | Création de la fonction `generate_abo_code()` |
| 1 | Création de la table `objects` avec tous les champs fusionnés |
| 2 | Création des index (tenant, imei, client, status, etc.) |
| 3 | Peuplement depuis `vehicles LEFT JOIN devices(BOX)` |
| 3b | Récupération des devices BOX orphelins (sans véhicule) |
| 4 | Vérification des codes ABO uniques |
| 5 | Construction de la table de mapping `vehicle_to_object_map` |
| 6 | Migration des FK (positions, trips, alerts, commands, tickets) |
| 7 | Ajout des contraintes FK vers `objects` |
| 8 | Mise à jour des `contracts.vehicle_ids` avec codes ABO |
| 9 | Liaison des devices SIM/ACC vers `objects.id` |
| 10 | Ajout des compteurs de numérotation |
| 11 | Renommage `vehicles` → `vehicles_legacy`, création VIEW + triggers |
| 12 | Log du rapport de migration |

### 9.2 Correspondance des données

La fusion véhicule + device BOX utilise un `LEFT JOIN` :

```sql
FROM vehicles v
LEFT JOIN devices d ON (
    (d.imei IS NOT NULL AND v.imei IS NOT NULL AND d.imei = v.imei)   -- Match par IMEI
    OR (d.assigned_vehicle_id = v.id)                                   -- Match par assignation
) AND d.type = 'BOX'
```

- **Véhicule avec BOX** : Tous les champs fusionnés, device_status récupéré
- **Véhicule sans BOX** : `device_status = 'IN_STOCK'` si pas d'IMEI, `'INSTALLED'` sinon
- **BOX orphelin** : Créé comme objet avec `name = 'Balise ' + IMEI`, `status = 'OFFLINE'`

---

## 10. Diagramme des relations

```
                    ┌────────────────────┐
                    │     contracts      │
                    │ vehicle_ids: JSONB │──── ['ABO-XXX', 'ABO-YYY']
                    └────────────────────┘
                              │ (JSONB array)
                              ▼
┌──────────────┐    ┌────────────────────┐    ┌──────────────┐
│   devices    │    │     objects         │    │  positions   │
│ (SIM, ACC)   │───▶│  id: ABO-XXXXXX   │◀───│ object_id FK │
│ object_id FK │    │  imei (UNIQUE)     │    │ (TimescaleDB)│
└──────────────┘    │  tenant_id         │    └──────────────┘
                    │  name, plate, ...  │
                    │  device_model, ... │    ┌──────────────┐
                    │  status, speed, ...│◀───│    trips     │
                    └────────────────────┘    │ object_id FK │
                              ▲               └──────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              ┌──────────┐ ┌──────┐ ┌──────────┐
              │  alerts  │ │ cmds │ │ tickets  │
              │ obj_id FK│ │obj FK│ │ obj_id FK│
              └──────────┘ └──────┘ └──────────┘
```

---

## 11. Avantages du système ABO

### 11.1 Opérationnels

| Avantage | Explication |
|----------|-------------|
| **Continuité d'historique** | Le remplacement d'un tracker n'efface pas l'historique GPS |
| **Gestion simplifiée** | Une seule entité au lieu de deux (vehicle + device) |
| **Facturation claire** | 1 code ABO = 1 ligne de facturation = 1 service |
| **Swap facilité** | Changer de tracker = UPDATE 2 champs (imei + device_model) |
| **Traçabilité** | Chaque opération est identifiable par code ABO |

### 11.2 Techniques

| Avantage | Explication |
|----------|-------------|
| **FK unifiées** | Toutes les tables pointent vers `objects.id` (pas de jointures complexes) |
| **Cache simplifié** | Redis stocke `IMEI → ABO code`, une seule résolution |
| **Moins de JOIN** | Plus besoin de joindre `vehicles` + `devices` pour afficher un objet complet |
| **Scalabilité** | 594M codes possibles, largement suffisant |
| **Code lisible** | `ABO-A3K7B9` est plus parlant qu'un UUID `f47ac10b-58cc-4...` |

### 11.3 Business

| Avantage | Explication |
|----------|-------------|
| **Identifiant client** | Le client identifie son service par code ABO (imprimable, communiquable) |
| **Contrat clair** | Liste de codes ABO dans le contrat = liste de services souscrits |
| **Support technique** | Le technicien identifie l'objet par code ABO, pas par IMEI ou plaque |
| **Audit** | Toutes les opérations sont traçables par code ABO dans les logs |

---

## 12. Limites connues et points d'attention

| Limite | Détail | Mitigation |
|--------|--------|------------|
| **Historique par véhicule** | Si on déplace un tracker d'un véhicule A vers B, l'historique du véhicule A n'est plus séparable | Par design : l'ABO suit le service, pas le véhicule physique |
| **Codes non-séquentiels** | Les codes ABO sont aléatoires, pas séquentiels | Volontaire : évite de deviner les codes |
| **Dépendance IMEI** | Un objet sans IMEI ne peut pas tracker | Normal : le tracker physique est nécessaire pour recevoir des positions |
| **vehicles_legacy** | L'ancienne table `vehicles` reste en base (renommée) | Peut être supprimée après validation complète |
| **Ancien vehicle_id** | Les colonnes `vehicle_id` dans positions/trips/alerts restent (pas supprimées) | Conservation pour audit/rollback, les nouvelles colonnes `object_id` sont utilisées |

---

## 13. Résumé de la chronologie de déploiement

| Phase | Commit | Date | Contenu |
|-------|--------|------|---------|
| **Phase 1 — DB** | `77303ec` | Mars 2026 | Migration SQL, table objects, VIEW vehicles, triggers |
| **Phase 2 — Backend** | `e081cec` | Mars 2026 | 17 fichiers backend migrés vers `FROM objects` |
| **Phase 3 — Frontend** | `afec65f` | Mars 2026 | Types TrackedObject/Vehicle, adaptateur lossless |
| **Phase 4 — Cleanup** | `afec65f` | Mars 2026 | vehicleRoutes→objectController, fleetRoutes→objectController |

**Build status au déploiement** :
- Frontend Vite : ✅ SUCCESS
- Backend esbuild : ✅ 0 erreurs
- Health check production : ✅ HTTP 200

---

## 14. Glossaire

| Terme | Définition |
|-------|------------|
| **ABO** | Code d'**AB**onnement — identifiant permanent d'un objet suivi |
| **Object** | Entité unifiée (véhicule + tracker GPS + abonnement) |
| **TrackedObject** | Type TypeScript frontend pour un objet de la table `objects` |
| **Vehicle** | Type de compatibilité qui étend `TrackedObject` (alias legacy) |
| **BOX** | Type de device GPS (tracker physique), maintenant fusionné dans `objects` |
| **DeviceStatus** | Statut du matériel GPS (`IN_STOCK`, `INSTALLED`, `DEFECTIVE`, etc.) |
| **vehicle_ids** | Champ JSONB des contrats contenant un tableau de codes ABO |
| **vehicles VIEW** | Vue SQL de compatibilité qui lit depuis `objects` |
| **vehicles_legacy** | Ancienne table `vehicles` renommée (conservée pour rollback) |
