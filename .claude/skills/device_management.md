# Skill — Gestion des boîtiers GPS & Analyse des données brutes

## Inventaire des modèles en production (mis à jour 2026-04-26)

| device_model      | Nb     | Protocole réel           | GT06 variant   | IMEI préfixes | Notes                                                                     |
| ----------------- | ------ | ------------------------ | -------------- | ------------- | ------------------------------------------------------------------------- |
| J16_JimiIoT       | 1142   | GT06 0x12/0x22           | CONCOX         | 86494, 86934  | Modèle dominant                                                           |
| Seeworld_Seeworld | 349    | GT06                     | GENERIC        | —             |                                                                           |
| GT800_Concox      | 170    | GT06 + 0x94 ExternalVolt | GENERIC        | —             | Capteur ADC carburant                                                     |
| X3_Concox         | 112    | GT06 0x22 V3 + 0x94      | GENERIC/CONCOX | 86513         | ADC 0-5V                                                                  |
| **JT808 BLE**     | **55** | **JT808** « débridé »    | n/a            | **15042**     | **Capteur BLE livre volume direct (ex-GT02_Unknown, renommé 2026-04-26)** |
| ET25_Concox       | 20     | GT06                     | GENERIC        | 35250         | CANBUS fuel                                                               |
| ST901_Sinotrack   | 16     | GT06                     | GENERIC        | —             |                                                                           |
| Unknown_Concox    | 12     | GT06                     | GENERIC        | 86209         |                                                                           |
| TK309_Unknown     | 5      | GT06                     | GENERIC        | 35231         |                                                                           |
| Unknown_86287     | 3      | GT06                     | GENERIC        | 86287         | Non identifié                                                             |
| Unknown_86973     | 1      | GT06 0x12                | GENERIC        | 86973         | Parser custom                                                             |
| BW09_Unknown      | 1      | GT06                     | GENERIC        | 86800         |                                                                           |

> ⚠ **JT808 BLE (IMEI 15042xxx)** — protocole JT808 « débridé » + capteur BLE iBeacon (CPM212/équiv.) qui broadcast directement le **volume calibré par la jauge** via app mobile. Tag JT808 0x02 = `readUInt16BE / 10` = litres directs. Pipeline backend bypass `computeFuelLiters` pour ce modèle (sinon double-conversion ADC qui détruit la valeur). Frontend masque calibration*table + voltage*\*\_mv. Catalogue : `device_model_configs` brand=JT808, model=BLE, imei_prefixes={15042}.

---

## Décodage manuel des trames brutes

### GT06 Short Packet (`78 78`)

```
78 78 [LEN 1B] [PROTO 1B] [PAYLOAD...] [SERIAL 2B] [CRC 2B] 0D 0A
```

Exemple raw AA (`78 78 11 01 ...`) :

- Offset 0-1 : `78 78` — start
- Offset 2 : longueur payload
- Offset 3 : protocole (0x01=login, 0x22=position, 0x13=status...)
- Offset 4-11 : IMEI BCD 8 bytes (login seulement)
- Fin-5/-4 : serial 2B, CRC 2B

### GT06 Long Packet (`79 79`)

```
79 79 [LEN 2B] [PROTO 1B] [PAYLOAD...] [SERIAL 2B] [CRC 2B] 0D 0A
```

Utilisé pour 0x94 ExternalVolt et paquets étendus Concox.

### JT808 (`7e ... 7e`)

```
7e [MsgID 2B] [Attr 2B] [Phone BCD 6B] [Serial 2B] [Body] [Checksum 1B] 7e
```

| MsgID  | Type             |
| ------ | ---------------- |
| 0x0100 | Enregistrement   |
| 0x0102 | Authentification |
| 0x0002 | Heartbeat        |
| 0x0200 | Rapport position |

**Body 0x0200 :**

```
[Alarm 4B] [Status 4B] [Lat 4B] [Lng 4B] [Alt 2B] [Speed 2B] [Bearing 2B] [Time 6B BCD]
[Additional items: tag 1B | len 1B | value...]
```

Carburant : tag `0x02`, len=2 → `readUInt16BE / 10` = litres

**Décodage Phone → IMEI :**
`01 50 42 02 01 02` → `015042020102` → strip leading 0 → `15042020102`

---

## Protocoles GT06 — codes importants

| Code       | Type         | Description                                    |
| ---------- | ------------ | ---------------------------------------------- |
| 0x01       | Login        | IMEI BCD 8B, variant détecté ici               |
| 0x10       | Position     | Standard V1                                    |
| 0x11       | Position     | LBS + GPS                                      |
| 0x12       | Position     | V3 format (satellites = 4 bits bas de gpsInfo) |
| 0x13       | Heartbeat    | voltLevel + gsmLevel + statusInfo → batterie   |
| 0x22       | Position     | V3 étendu (J16, X3)                            |
| 0x23       | Heartbeat    | long packet                                    |
| 0x94 long  | ExternalVolt | `rawVolt × 10 = mV` (ADC capteur carburant)    |
| 0x94 short | Position     | diviseur 100 000 (au lieu de 1 800 000)        |
| 0x80       | ACK commande | réponse TCP à une commande envoyée             |
| 0x17       | LBS only     | Pas de GPS fix                                 |
| 0xA0, 0x32 | Position     | Variantes constructeur                         |

### Décodage coordonnées GT06

```
Standard (0x10, 0x11, 0x22...) :
  lat = readUInt32BE / 1_800_000.0
  lng = readUInt32BE / 1_800_000.0

V3 (0x94 short, 0x12, 0xA0, 0x32) :
  lat = readUInt32BE / 100_000.0
  lng = readUInt32BE / 100_000.0

courseRaw = readUInt16BE :
  heading = courseRaw & 0x03FF
  isWest  = (courseRaw >> 10) & 0x01
  isNorth = (courseRaw >> 11) & 0x01
```

### ACC (contact) — GT06 V3

```typescript
// Offset gpsStart + 12 + 8 (V3 uniquement)
acc = buf[accOffset] === 0x01; // true = moteur ON
```

---

## Pipeline carburant — deux régimes (révisé 2026-05-05)

### A. Capteurs ADC mV — `computeFuelLiters(rawValue, vehicle)`

Pour CONCOX GT800/X3 et autres capteurs ADC. Ordre de priorité **rawValue → litres** :

| Priorité | Source                                   | Logique                                       |
| -------- | ---------------------------------------- | --------------------------------------------- |
| 1        | `calibration_table` ≥ 2 points           | Interpolation piecewise linéaire entre points |
| 2        | `sensor_config.v_empty_mv` / `v_full_mv` | Interpolation linéaire 2 points               |
| 3        | Fallback                                 | `(rawValue / 5000) × tank_capacity`           |

Puis × `sensor_config.factor` (défaut 1) puis clamp à [0, tank_capacity].

```typescript
liters = interpolate(rawValue, calibOrSensorConfig) × factor
liters = clamp(liters, 0, tank_capacity)
pct    = round((liters / tank_capacity) × 100)
```

### B. JT808 BLE — bypass direct

Pour `device_model === 'JT808 BLE'` (IMEI 15042xxx). Le capteur BLE livre déjà le volume calibré. Pas de `computeFuelLiters` appelé. Code dans `processMessage` (`positionWorker.ts`) :

```typescript
liters = clamp(data.fuel × factor, 0, tank_capacity)
pct    = round((liters / tank_capacity) × 100)
fuel_raw = round(data.fuel × 10)  // uint16 brut préservé pour recalcul futur
```

⚠️ **Prérequis indispensables du bypass** (2026-05-05) :

- `cacheService.ts` SELECT doit inclure `device_model` ET `sensor_config` (sinon `vehicle.device_model` = undefined → bypass ignoré)
- Commits backend : `3bdb548` (fix cacheService + positionWorker)

**Historique régression** : le bypass a été livré en patch dist/ direct (2026-04-26) puis écrasé lors du prochain deploy. Le src/ n'avait jamais le code. Résultat : 112 536 positions avec fuel_liters ×14 trop petits (fallback ADC `raw/5000×350` au lieu de litres directs). Backfill SQL appliqué 2026-05-05.

**Balises sans capteur BLE actif** : certaines 15042xxx n'envoient jamais le tag 0x02 (BLE non appairé). Elles ont `fuel_liters = NULL` sur toutes leurs positions. `fuel_level` = NULL en DB (pas 100%). Diagnostic : `raw_data->>'fuel' IS NULL` sur toutes les positions → action terrain (appairage via app mobile).

Anomalie hardware connue :

- **15042020064** (872W HOWO) : capteur figé à raw=640 (64L impossible). Clampé à 350L = 100%. Action terrain.
- **15042020175** (7321GJ01) : tag 0x02 absent des trames (BLE non appairé). NULL partout.

### Points d'entrée alimentant chaque pipeline

| Source                                                        | rawValue                   | Pipeline | Extrait par                        |
| ------------------------------------------------------------- | -------------------------- | -------- | ---------------------------------- |
| **GT06 0x94 ExternalVolt** (CONCOX GT800, X3)                 | `extMv` (mV)               | A        | `gt06.ts` `rawVolt × 10`           |
| **JT808 tag 0x02 sur device_model JT808 BLE** (IMEI 15042xxx) | `data.fuel` litres directs | **B**    | `jt808.ts:215` `readUInt16BE / 10` |
| **GT06 position `fuel` field** (rare, autres modèles)         | `data.fuel`                | A        | Parser protocole                   |

### Table de calibration (jsonb)

Stockée dans `objects.calibration_table` comme array :

```json
[
  { "voltage": 0, "liters": 0 },
  { "voltage": 500, "liters": 35 },
  { "voltage": 1000, "liters": 70 },
  { "voltage": 5000, "liters": 350 }
]
```

Le champ s'appelle `voltage` même quand le raw est en litres/hauteur/raw JT808 — c'est juste l'axe X de la table. Nom conservé pour compatibilité historique.

### Facteur de conversion (`sensor_config.factor`)

Multiplicateur appliqué EN FIN de pipeline (priorité : interpolation → puis × factor). Configurable par le manager via le formulaire véhicule (champ "Facteur de conversion", défaut 1). Utile pour :

- Corriger un capteur dont le max sature à une valeur aberrante (ex: raw 6400 pour tank 350 → factor 0.0547)
- Ajuster une calibration approximative

### Cache `lastFuelCache`

Si 0x94 alimente le cache puis la position GPS suivante n'a pas de fuel → réutilise la dernière valeur (évite les trous dans le graph).

### Mise à jour DB

- `positions.fuel_liters` : valeur **convertie** (après calibration + factor + clamp)
- `positions.fuel_raw` : valeur **brute** capteur (extMv pour 0x94, raw UInt16 pour JT808/GT06) — **ajouté phase 1 (2026-04-24)** pour préserver la source de vérité et permettre recalcul historique sans perte
- `objects.fuel_level` : pct global véhicule, mis à jour à chaque nouvelle valeur (0x94 ET JT808)

### Backfill fuel_raw historique

Script ponctuel `scripts/backfill_fuel_raw.ts` parcourt `raw_data` JSON des positions existantes et remplit `fuel_raw` rétroactivement.

- Idempotent (n'écrase pas les valeurs déjà remplies)
- Batchs 1000 + pauses 500ms → non-bloquant pour l'ingestion live
- Options : `--vehicle=ABO-xxx` (test), `--limit=N`, `--dry-run`

### Détection automatique events (table `fuel_events`)

Worker `FuelEventDetector.ts` appelé fire-and-forget après chaque flush bulk des positions.

**Algorithme** : peak-to-peak dans fenêtre 20 min AVEC **filtre médian-de-3** appliqué via SQL `LAG/LEAD` :

```sql
-- Pré-traitement anti-bruit : median-of-3 glissant
WITH laglead AS (
  SELECT
    fuel_liters AS raw_liters,
    LAG(fuel_liters)  OVER (ORDER BY time) AS prev_l,
    LEAD(fuel_liters) OVER (ORDER BY time) AS next_l,
    ...
  FROM positions WHERE object_id = $1 AND time > now - INTERVAL '20 min'
),
w AS (
  SELECT
    CASE
      WHEN prev_l IS NULL OR next_l IS NULL THEN raw_liters  -- bords
      ELSE (prev_l + raw_liters + next_l
            - LEAST(prev_l, raw_liters, next_l)
            - GREATEST(prev_l, raw_liters, next_l))          -- médiane
    END AS fuel_liters
  FROM laglead
)
SELECT MIN(fuel_liters), MAX(fuel_liters), ... FROM w;
```

→ Spike isolé éliminé, vrais refills/vols (≥ 2 lectures consécutives) préservés.

**Détection REFILL** : `max_liters - min_liters > refill_threshold × tank/100` ET `max_time > min_time`
**Détection THEFT** : `max_liters - min_liters > theft_threshold × tank/100` ET `min_time > max_time` ET `max_speed < 5 km/h`

**Confidence score** (corrélation contextuelle) :

- REFILL stationné + ignition OFF : 95% · REFILL moteur ON/mouvement : 75%
- THEFT ignition OFF : 95% · THEFT ignition ON stationnaire : 80%

**Anti-doublons** : cooldown 10 min par `(object_id, type)`.

**Reverse geocoding** : `start_address` et `end_address` résolus via `ReverseGeocodingService` avant INSERT (silent fail si quota épuisé).

**Audit trail** : chaque event stocke `calibration_snapshot` (sensor_config + calibration_table du moment) → permet re-vérification event passé avec calibration d'époque.

### Agrégation courbe (`getFuelHistory`)

Résolution adaptative via `date_bin(INTERVAL, time, epoch)` (PostgreSQL 14+) :

- 1h → buckets 1 min (60 pts)
- 24h → 5 min (288 pts)
- 7d → 30 min (336 pts)
- 30d → 2h (360 pts)

Événements courts (vol 10 min, recharge 3 min) restent visibles.

### KPIs fusionnés (`getFuelStats`)

Lecture **fuel_records** (saisies manuelles historiques) + **fuel_events** (auto-détection, exclut `DISMISSED`) → totaux REFILL / THEFT cohérents avec les events listés dans la modal dédiée.

---

## Pipeline batterie — paquet 0x13

```typescript
// contentStart = byte après proto
voltLevel  = buf[contentStart]       // byte 0
gsmLevel   = buf[contentStart + 1]   // byte 1
statusInfo = buf[contentStart + 4]   // byte 4
charging   = (statusInfo & 0x01) === 1
accOn      = (statusInfo & 0x02) === 2

// Calcul %  selon modèle :
X3_Concox / GT800_Concox / ET25_Concox :
  battPct = Math.round(Math.min(6, gsmLevel) / 6 * 100)   // échelle 0-6

Autres modèles :
  battPct = Math.min(4, voltLevel) * 25                    // échelle 0-4 → 0/25/50/75/100%
```

---

## Dispatch des protocoles (server.ts)

```typescript
// Ordre de détection (canParse)
GT06     : buf[0] === 0x78 && buf[1] === 0x78  ||  buf[0] === 0x79 && buf[1] === 0x79
JT808    : buf[0] === 0x7e
Queclink : ASCII commence par "+RESP:" ou "+ACK:"
Suntech  : ASCII commence par "SA"
H02      : ASCII contient "*HQ,"
Meitrack : ASCII commence par "$$"
Wialon   : ASCII commence par "#..."
```

> Le serveur teste chaque parseur via `canParse()`. Le PREMIER qui retourne `true` gagne. Ordre d'enregistrement = ordre de priorité.

---

## Dispatching modèle → parser spécifique (GT06)

```typescript
// À la connexion login 0x01 :
db.query('SELECT device_model FROM objects WHERE imei = $1')
→ imeiModelCache.set(imei, deviceModel)
→ socketModelMap.set(socket, getModelParser(deviceModel))

// Registry (gt06-models/registry.ts) :
'J16_JimiIoT'       → J16Parser
'X3_Concox'         → ConcoxX3Parser
'Unknown_86973'     → Unknown86973Parser
'GT800_Concox'      → BaseGT06ModelParser (base)
... tous les autres → BaseGT06ModelParser (base)
```

---

## Filtres qualité dans positionWorker.ts

| Filtre         | Condition                              | Action                         |
| -------------- | -------------------------------------- | ------------------------------ |
| GPS Jump       | avgSpeed > 150 km/h ET distance > 500m | Reject + alerte GPS_JUMP       |
| Proto-dedup    | Δt < 2s ET distance < 10m              | Skip (JimiIoT double envoi)    |
| Anti-drift     | speed < 2 ET dist < 50m ET Δt < 30s    | Skip (bruit GPS stationnement) |
| Distance nulle | speed < 2 ET dist < 15m                | distanceDelta = 0              |

---

## Analyse d'une trame brute — méthode

### Étape 1 : identifier le protocole

```
Commence par 78 78 / 79 79 → GT06
Commence par 7e → JT808
Commence par +RESP → Queclink
Commence par SA2 → Suntech
Contient *HQ → H02
Commence par $$ → Meitrack
```

### Étape 2 (GT06) : lire le byte de protocole

- Offset 3 (short) ou offset 4 (long)
- `0x01` → login, lire IMEI BCD à offset 4
- `0x22` → position V3, gpsInfo & 0x0F = satellites
- `0x13` → batterie/heartbeat, lire voltLevel/gsmLevel
- `0x94` long → ExternalVolt, rawVolt à offset 6

### Étape 3 : vérifier le CRC

```typescript
// CONCOX/J16 : ISO-HDLC (poly 0x8408, init 0xFFFF, xorout 0xFFFF)
GT06Parser.crc16(buf, 2, len + 1);

// COBAN/SINOTRACK : IBM/Modbus (poly 0xA001, init 0xFFFF)
GT06Parser.crc16Ibm(buf, 2, len + 1);

// CRC stocké : buf.readUInt16BE(len+1)
```

### Étape 4 : décoder les coordonnées

Voir formule section ci-dessus. Attention au diviseur : 1 800 000 (standard) vs 100 000 (V3 0x94 short).

---

## Diagnostics terrain

### Balise muette (aucune position)

```bash
# Vérifier si la balise s'est déjà connectée
docker logs trackyu-gps-backend-1 2>&1 | grep "IMEI <imei>"

# Vérifier en DB
SELECT * FROM devices WHERE imei = '<imei>';
SELECT time, speed, raw_data FROM positions WHERE imei = '<imei>' ORDER BY time DESC LIMIT 5;
```

### IMEI inconnu (pas dans objects)

```bash
# Voir unknownImeiLog
GET /api/admin/gps-stats → "unknownImeis"
```

### Fuel NULL malgré raw_data.fuel présent

- Vérifier que `tank_capacity > 0` dans objects
- Si `fuel` direct (JT808/GT06 extended) : pas de tank_capacity requis, valeur insérée directement
- Si `externalVolt_mV` (GT06 0x94) : tank_capacity obligatoire pour conversion

### Variant GENERIC sur balise Concox

```sql
-- Forcer le variant
UPDATE devices SET gt06_variant = 'CONCOX' WHERE imei = '<imei>';
-- Ou via API
PATCH /api/devices/<imei>/variant   { "variant": "CONCOX" }
```

### Décoder la trame brute manuellement

```sql
SELECT raw_data::jsonb->>'raw' FROM positions WHERE imei = '<imei>' ORDER BY time DESC LIMIT 1;
-- Ensuite décoder avec les règles ci-dessus
```

---

## Ajouter un nouveau modèle inconnu

1. Identifier le protocole (analyse trame)
2. Créer `src/gps-server/parsers/gt06-models/nouveau-modele.ts` si GT06 avec IO spécifiques
3. Enregistrer dans `registry.ts`
4. Mettre à jour `device_model` dans `objects` pour les IMEI concernés
5. Tester : `npm run test -- --grep "GT06"`

**Pattern parser custom :**

```typescript
export class NouveauParser extends BaseGT06ModelParser {
  get modelName() {
    return 'Nouveau_Fabricant';
  }
  extractLocationIO(buf, gpsStart, protocol): LocationIO {
    const base = super.extractLocationIO(buf, gpsStart, protocol);
    // Lire les IO spécifiques après gpsStart + 20
    return { ...base, fuelRaw: buf[gpsStart + 20] };
  }
}
```

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill : `docs/modules/gps/BALISES_NON_ASSIGNEES.md` (inventaire balises non assignées).

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
