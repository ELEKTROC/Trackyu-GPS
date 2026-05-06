# Skill — Ingestion de données GPS

## Pipeline temps réel

```
Balise GPS (TCP port 5000)
  → gps-server/server.js (parsing protocole)
  → Redis queue : gps_incoming_queue
  → workers/positionWorker.ts (traitement)
  → INSERT INTO positions (bulk, toutes les 2s)
  → UPDATE objects (statut, vitesse, kilométrage)
  → Socket.io emit (temps réel frontend/mobile)
```

## Formats d'entrée supportés (9 protocoles actifs)

| Protocole                        | Port      | Format           | Modèles couverts                                                                     |
| -------------------------------- | --------- | ---------------- | ------------------------------------------------------------------------------------ |
| GT06 / CONCOX / COBAN / Seeworld | 5001→5000 | Binaire `7e`     | JimiIoT J16, Coban, Sinotrack, Seeworld S102                                         |
| H02                              | 5001→5000 | ASCII `*HQ,...#` | Sinotrack, TK103, GT02H                                                              |
| JT808                            | 5001→5000 | Binaire `7e`     | Génériques CN, **JT808 BLE** (IMEI 15042xxx, capteur fuel BLE livrant volume direct) |
| Meitrack                         | 5001→5000 | ASCII `$$...`    | MVT600, T399, T1                                                                     |
| Teltonika Codec8/8E              | 5001→5000 | Binaire          | FMB120, FMB920, FMB640                                                               |
| Queclink ASCII                   | 5001→5000 | `+RESP:GT...`    | GV300, GV500, GL300, GL500                                                           |
| Suntech ASCII                    | 5001→5000 | `SA200STT;...`   | ST310, ST340, ST600, ST900                                                           |
| WialonIPS                        | 5001→5000 | Texte IPS v2     | Wialon compatibles                                                                   |
| TextProtocol                     | 5001→5000 | Fallback texte   | Génériques                                                                           |

> Port externe VPS : 5001 (host) → 5000 (container Docker)

## Données parsées et stockées

Champ `raw_data` (JSONB) contient tout le parsé brut. Colonnes dédiées :

- `latitude`, `longitude` — position GPS
- `speed` — vitesse km/h
- `heading` — cap en degrés
- `fuel_liters` — litres (depuis `raw_data.fuel` via positionWorker)
- `time` — horodatage GPS (peut différer de l'heure serveur → replay détection)

## Pipeline de filtrage (positionWorker.ts)

```
Paquet reçu
  → assessGpsQuality()        — satellites, HDOP, coords (0,0), timestamp > 5min
  → KalmanFilter2D.filter()   — lissage 2D par IMEI (Q/R configurables via env)
  → DeadReckoning.extrapolate() — si GPS perdu (fiable ~30s, abandon > 2min)
  → antiDrift                 — speed < 2km/h ET dist < 50m ET Δt < 30s → ignoré
  → INSERT positions (bulk)
  → socketThrottle.emitVehicleUpdate()  — MOVING=1s, IDLE=3s, STOPPED=8s
```

## Bulk insert

`positionWorker.ts` bufferise les positions et flush toutes les `BULK_INSERT_INTERVAL_MS` ms.
Si le bulk échoue → fallback en inserts individuels.
Les deux branches INSERT incluent `fuel_liters` (fix 2026-04-21).

## Données carburant

Deux pipelines selon le `device_model` du véhicule :

### A. Capteurs ADC mV — pipeline `computeFuelLiters(rawValue, vehicle)`

Pour CONCOX GT800/X3 (0x94 ExternalVolt, capteur ADC 0-5V). Ordre de priorité :

1. **`calibration_table`** (≥ 2 points) → interpolation piecewise linéaire
2. **`sensor_config.v_empty_mv` / `v_full_mv`** → interpolation linéaire 2 points
3. **Fallback** : `(raw / 5000) × tank_capacity`

Puis × `sensor_config.factor` (défaut 1) et clamp à [0, tank_capacity].

### B. JT808 BLE (IMEI 15042xxx) — bypass direct

Le capteur BLE (CPM212/équiv.) livre le volume **déjà calibré par la jauge** via app mobile dédiée. Le tag JT808 0x02 = `readUInt16BE / 10` = litres directs. Aucune calibration côté serveur.

```
fuel_liters = clamp(data.fuel × factor, 0, tank_capacity)
fuel_raw    = uint16 brut (= data.fuel × 10) pour préserver la précision décimale
```

Le formulaire véhicule masque les champs `calibration_table` et `voltage_*_mv` quand `device_model === 'JT808 BLE'`. Seul `factor` (sensor_config.factor) reste utilisable pour ajustement fin.

⚠️ **Prérequis du bypass** (backporté dans src/ le 2026-05-05, commit `3bdb548`) :

- `cacheService.ts` SELECT doit inclure `device_model` ET `sensor_config`
- Sans eux, `vehicle.device_model === undefined` → bypass jamais déclenché → fallback ADC erroné

**Balise sans capteur actif** : si le tag 0x02 est absent des trames (BLE non appairé), `raw_data->>'fuel' = NULL` → `fuel_liters = NULL` sur toutes les positions → `fuel_level = NULL` en DB. Ne pas confondre avec un bug logiciel.

### Sources du raw selon protocole

- **GT06 0x94 ExternalVolt** (CONCOX GT800, X3) : `extMv` (mV) = `rawVolt × 10` → pipeline A
- **JT808 tag 0x02** sur device_model `'JT808 BLE'` (IMEI 15042xxx) : `data.fuel` = litres directs → pipeline B
- **JT808 tag 0x02** autres modèles : `data.fuel` raw → pipeline A (rare actuellement)
- **GT06 position** avec champ `fuel` : `data.fuel` du parser → pipeline A

Tous convergent vers la DB unique `positions.fuel_liters` + `objects.fuel_level` (%).

Table `fuel_records` : événements manuels REFILL / THEFT (saisie opérateur).
Pas de table `fuel_history` dédiée — historique = requête sur `positions.fuel_liters`.

Détail complet du pipeline : voir `device_management.md`.

## Devices inconnus

IMEI non enregistré dans `objects` → stocké dans `discovered_devices` pour revue admin.
Ne génère pas de position.

## Rate limiting

- Max 300 messages/min par IMEI
- Max 5 paquets sans IMEI valide par socket
- Max 200 connexions par IP
- Geocoding endpoint `/fleet/geocode` : 60 req/min/IP (`geocodeLimiter` Redis)

## Reverse geocoding (chantier livré 2026-05-02)

`positionWorker` appelle `ReverseGeocodingService.resolve(lat, lng)` après chaque position validée → UPDATE `positions.address` + `objects.address`. Pipeline async (ne bloque pas le bulk insert).

**Architecture** :

1. **Cache spatial DB** (`geocoded_addresses` table) : lookup via colonnes générées `lat_bucket`/`lng_bucket` (`floor(coord*10000)::int` ≈ 11 m). Recherche ± 1 bucket = 9 buckets max scannés. **0.17 ms** vs 5.32 ms ancien seq scan.
2. **Provider Nominatim PRIMARY** (self-hosted, container `trackyu-nominatim`, dump CI ~50 MB PBF, accès interne `http://nominatim:8080`). 29-99 ms par appel. Couvre Côte d'Ivoire uniquement.
3. **Provider Google FALLBACK** si Nominatim renvoie null (hors-CI ou rare miss). Provider tagué dans colonne `provider` ('nominatim' / 'google' / 'none').
4. **Mémorisation null** : `last_null_at` colonne, retry après 7 jours seulement → évite spammer providers sur coords stériles (océan, désert).

**Single entry point** : `ReverseGeocodingService.resolve(lat, lng)` — ne pas appeler `GoogleMapsService.reverseGeocode` ou `NominatimService.reverseGeocode` directement.

**Étendre la couverture géo** (Afrique de l'Ouest, post KVM2) : changer `PBF_URL` dans `/var/www/trackyu-gps/docker-compose.yml` → `docker compose up -d nominatim --force-recreate` → ré-import (3-4 GB DB pour Afrique de l'Ouest).

**Monitoring hit ratio** (2 méthodes) :

- **Endpoint dédié** : `GET /api/v1/geocoding/stats` (auth requis) — JSON avec totalRequests, cacheHitRate, googleRequests, nominatimRequests, byProvider, bySource, topVehiclesToday[10], topZonesToday[10], estimatedCostUSD, projectedMonthlyCostUSD, inserts24hByProvider
- **SQL direct** : `SELECT provider, COUNT(*) FROM geocoded_addresses WHERE created_at > NOW() - INTERVAL '24h' GROUP BY provider;`
- **Prometheus** : metrics `geocoding_requests_total{provider, status}` + `geocoding_cost_google_usd_total` + `geocoding_duration_seconds{provider}` exposées sur `/metrics` (déjà scrappées par Prometheus en place)

**Tester la montée en charge** (3 modes) :

```bash
# Mode random pur (benchmark throughput, hit ratio bas attendu)
docker exec trackyu-gps-backend-1 node /app/dist/scripts/simulate-geocoding.js \
  --positions=10000 --zones=500 --vehicles=50 --spread=100

# Mode RÉALISTE (corridors routiers + véhicules sur trajet fixe)
docker exec trackyu-gps-backend-1 node /app/dist/scripts/simulate-geocoding.js \
  --realistic --positions=10000 --corridors=50 --vehicles=500 --spread=20 --waypoints=10

# Mode REPLAY ⭐ (vraies positions GPS depuis la table positions — chiffre prod réel)
docker exec trackyu-gps-backend-1 node /app/dist/scripts/simulate-geocoding.js \
  --replay=24h --replay-limit=5000
# Sur prod 2026-05-02 : 97.08% hit ratio · 376 req/s · 0 USD Google
```

**Provider Google — 3 statuts** :

- `success` : appel réussi avec adresse
- `failed` : appel exécuté mais échec (timeout, 403, null response)
- `disabled` : clé absente OU setting `GEOCODING_GOOGLE_ENABLED='false'` → SKIP appel réseau

**Toggles runtime** (`SettingsService` clé/valeur, pas de restart container) :

- `GEOCODING_GOOGLE_ENABLED` : `true|false` (default true). Si false → Google jamais appelé, status `disabled`
- `GEOCODING_NOMINATIM_ENABLED` : `true|false` (default true). Si false → Nominatim skip, fallback direct Google
- Si LES 2 disabled : `resolve()` retourne null + `logger.warn('both providers disabled')`
- Toggle via DB direct OU `PATCH /api/v1/geocoding/providers` (permission MANAGE_SETTINGS)
  ```bash
  curl -X PATCH https://live.trackyugps.com/api/v1/geocoding/providers \
    -H "Authorization: Bearer <TOKEN>" \
    -d '{"google": false}'
  ```

**Endpoint stats — champs dashboard admin** (10 items) :

- `requestsToday`, `requestsThisMonth`, `costThisMonthUSD` (DB)
- `cacheHitRate`, `byProvider`, `failedRequests` (Prom)
- `topVehiclesToday[10]`, `topZonesToday[10]`, `zonesUniqueToday` (Redis)
- `providersEnabled: {nominatim, google}` (toggle live)

**Alertes Prometheus** (config dans `/var/www/trackyu-gps/monitoring/prometheus/rules.yml`) :

- `GeocodingLowCacheHitRate` — fire si hit ratio < 75 % pendant 15 min (volume floor 0.5 req/s)
- `GeocodingHighGoogleUsage` — fire si > 10 % des miss tombent en Google fallback pendant 15 min

**Tableau de calibration mode --realistic** (10k positions × 50 corridors × 500 vehicles × spread 20m) :
| `--waypoints=` | waypoints uniques | hit ratio attendu | throughput |
|---|---|---|---|
| 30 | 1500 (6.7 pos/wp) | ~58 % | ~80 req/s |
| 10 | 500 (20 pos/wp) | ~80 % | ~165 req/s |
| 5 | 250 (40 pos/wp) | ~89 % | ~245 req/s |

⚠ Mode random sans `--realistic` donne un hit ratio bas (~20 %) qui NE REFLÈTE PAS le hit ratio prod (~95 %+ avec véhicules sur routes répétitives). Utiliser `--realistic` pour des chiffres représentatifs.

**Filtre "Significant Points"** : positionWorker:698-704 ne géocode pas chaque position. Critères : premier point / delta > 2 km / changement statut. Compteur `geocoding_skipped_total{reason='not_significant'}` mesure combien de positions sont filtrées.

Détails : `project_geocoding_done.md` (memory) + entries CHANGELOG Session 10 + Session 10 G (2026-05-02).

## Import CSV

Import en masse de véhicules, conducteurs, boîtiers via `ImportModal` → `csvImportController`.
Template CSV disponible dans `features/admin/utils/csvTemplates.ts`.

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill : `docs/modules/gps/` (AUDIT_GPS_MODULE, CHANTIER_GPS_PRECISION, CHANTIER_GPS_HAUT_DE_GAMME, AUDIT_GEOCODING, BALISES_NON_ASSIGNEES).

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
