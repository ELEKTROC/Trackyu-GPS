# Chantier GPS Haut de Gamme — TrackYu

> Objectif : Positionner TrackYu dans la catégorie des plateformes GPS industrielles de précision.  
> Pipeline fiable, protocoles 100% couverts, données lissées, infrastructure prête pour 10k véhicules.

---

## État général

| Phase        | Description                                         | Statut                     |
| ------------ | --------------------------------------------------- | -------------------------- |
| **Phase 0**  | Audit pipeline + corrections critiques              | ✅ Complété 2026-04-03     |
| **Sprint 1** | Kalman Filter + Dead Reckoning + GPS Loss Detection | ✅ Déployé prod 2026-04-15 |
| **Sprint 2** | Couverture protocoles (Queclink, Suntech, Seeworld) | ✅ Déployé prod 2026-04-15 |
| **Sprint 3** | Monitoring pipeline GPS + interface staff boîtiers  | ✅ Déployé prod 2026-04-15 |
| **Sprint 4** | Infrastructure (OSRM road snapping, MQTT broker)    | 🔲 KVM2 requis             |
| **Sprint 5** | Données riches (CAN bus J1939, OBD2 PIDs)           | 🔲 À planifier             |

---

## Bugs connus — TODO

| #   | Sévérité  | Description                                                                                                                                                                                                                                    | Fichier                           | Statut                |
| --- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------- |
| B1  | ⚠️ MEDIUM | `[GT06/0x94] IMEI UNKNOWN` sur protocole `0x08/0x94` — singleton GT06Parser : `setSocket()` écrase `this._socket` si deux connexions simultanées. WeakMap miss → UNKNOWN. Fix : `imeiByRemoteAddress` Map + `getImeiFromSocket()` fallback IP. | `dist/gps-server/parsers/gt06.js` | ✅ Corrigé 2026-04-15 |

---

## Phase 0 — Corrections critiques (complétée)

### Bugs P0 corrigés (2026-04-03)

#### GT06 — CRC algorithm

- **Problème :** CRC IBM (0xA001) au lieu de ISO-HDLC/X.25 (0x8408, init=0xFFFF)
- **Impact :** Tous les paquets Concox/JimiIoT rejetés en prod
- **Fix :** `gt06.js` — CRC adaptatif selon le variant détecté au login packet
- **Fichier VPS :** `dist/gps-server/parsers/gt06.js`

#### GT06 — Auto-détection variant fabricant

- `socketVariantMap` WeakMap : variant stocké par socket TCP
- `detectVariantFromCrc()` : teste ISO-HDLC puis IBM → identifie CONCOX / COBAN / SINOTRACK / GENERIC
- Variant persisté en base : `devices.gt06_variant`
- Override manuel : `PATCH /api/devices/:imei/variant`

#### Parseurs non branchés

- **Problème :** Teltonika, Meitrack, WialonIPS existaient mais n'étaient pas importés dans `server.ts`
- **Fix :** 8 parseurs actifs : gt06, h02, jt808, meitrack, teltonika, textExtended, textProtocol, wialonIps

#### Anti-drift renforcé

- Ignore les positions si : speed < 2 km/h **ET** distance < 50m **ET** timeDelta < 30s
- Élimine les oscillations GPS en stationnement

#### Payload `vehicle:update` enrichi (2026-04-15)

- Avant : 7 champs (id, location, speed, heading, status, lastUpdated, fuelLevel)
- Après : 18 champs — ajout altitude, odometer, ignition, batteryVoltage, batteryPercent, satellites, hdop, crash, sos, harshBraking, harshAccel
- **Fichier VPS patché :** `dist/workers/positionWorker.js`

#### Socket.IO — Compression + Throttle adaptatif

- `perMessageDeflate` activé (threshold 512 bytes, level 6) → ~60% réduction trafic WebSocket
- Throttle adaptatif par statut : MOVING=1s, IDLE=3s, STOPPED=8s (au lieu d'un throttle fixe)
- **Fichier VPS patché :** `dist/socket.js`, `dist/services/socketThrottle.js`

---

## Sprint 1 — Précision trajectoire (déployé prod 2026-04-15)

### Kalman Filter 2D

**Principe :** Filtre statistique qui fusionne le modèle cinématique (prédiction) et la mesure GPS (update) pour éliminer le bruit GPS (~2-5m RMS → ~1-2m).

**Implémentation :**

- Fichier local : `backend/src/gps-server/precision.ts` — classe `KalmanFilter2D`
- Fichier VPS patché : `dist/workers/positionWorker.js` (classe `KalmanFilter2D` injectée)
- État par IMEI : `Map<imei, { lat, lng, vLat, vLng, P }>`
- Gain de Kalman K = P / (P + R) — auto-calibré à chaque fix

**Paramètres configurables (variables d'env) :**
| Variable | Défaut | Effet |
|----------|--------|-------|
| `KALMAN_Q` | `0.0001` | Bruit processus — augmenter pour mieux suivre les virages brusques |
| `KALMAN_R` | `0.0008` | Bruit mesure — augmenter pour plus de lissage |

### Dead Reckoning

**Principe :** Si signal GPS perdu (tunnel, parking souterrain), extrapole la position à partir du dernier fix connu (vitesse + cap + Δt).

**Implémentation :**

- Fichier local : `backend/src/gps-server/precision.ts` — classe `DeadReckoning`
- Modèle : mouvement uniforme (vitesse constante, cap constant)
- Fiable ~30s, dégradé 30-60s, abandonné après 2min

**Paramètres configurables :**
| Variable | Défaut | Effet |
|----------|--------|-------|
| `DR_MAX_AGE_MS` | `120000` | Durée max dead reckoning (2min) |
| `DR_MIN_SPEED` | `3` | Vitesse min pour activer l'extrapolation (km/h) |

### GPS Loss Detection

**Principe :** Détecte la perte de signal avant de décider Kalman vs Dead Reckoning.

**Critères de perte :**

- Satellites < 3 (configurable `GPS_SAT_THRESHOLD`)
- HDOP > 5.0 (configurable `GPS_HDOP_THRESHOLD`)
- Coordonnées (0,0) ou absentes
- Timestamp > 5min (paquet retransmis ancien)

### Pipeline de filtrage complet

```
Paquet GPS reçu
    ↓
assessGpsQuality(data)
    ├── Signal OK → KalmanFilter2D.filter() → deadReckoning.update()
    └── Signal perdu → DeadReckoning.extrapolate()
                           ├── Fix récent + vitesse > 3km/h → position extrapolée
                           └── Pas de DR disponible → position brute
    ↓
Coordonnées filtrées → positionBuffer (DB) + emitVehicleUpdate (Socket.IO)
```

**Script de déploiement :** `patch_kalman_deadreckoning.py`

---

## Sprint 2 — Couverture protocoles ✅ (2026-04-15)

### Boîtiers en production (inventaire)

| Modèle                     | Protocole                      | Statut                    |
| -------------------------- | ------------------------------ | ------------------------- |
| Concox/JimiIoT (J16)       | GT06 variant CONCOX            | ✅ Opérationnel           |
| Sinotrack                  | H02                            | ✅ Opérationnel           |
| Coban                      | GT06 variant COBAN             | ✅ Opérationnel           |
| GT02                       | GT06                           | ✅ Opérationnel           |
| Teltonika FMB120/FMB920    | Codec 8/8E                     | ✅ Parseur branché        |
| JT808 (génériques CN)      | JT808                          | ✅ Opérationnel           |
| Seeworld/Seaworld (S102)   | GT06 natif (confirmé logs VPS) | ✅ Couvert par GT06Parser |
| Queclink GV300/GV500/GL300 | Queclink ASCII `+RESP:GT...`   | ✅ Parseur déployé        |
| Suntech ST310/ST340/ST900  | Suntech ASCII `SA200STT;...`   | ✅ Parseur déployé        |

### Fichiers créés

- `backend/src/gps-server/parsers/queclink.ts` — Parser local TS
- `backend/src/gps-server/parsers/suntech.ts` — Parser local TS
- `dist/gps-server/parsers/queclink.js` — Déployé VPS
- `dist/gps-server/parsers/suntech.js` — Déployé VPS
- `patch_parsers_queclink_suntech.py` — Script de déploiement

---

## Sprint 3 — Monitoring pipeline GPS + interface staff ✅ (2026-04-15)

### Ce qui a été fait

#### 3.1 — Bug B1 corrigé ✅ (GT06/0x08 IMEI UNKNOWN)

**Cause racine :** `GT06Parser` est un singleton dans le tableau `parsers[]`. Deux connexions
simultanées appellent `setSocket()` sur la même instance → `this._socket` est écrasé par la
dernière connexion → WeakMap miss sur la première → IMEI UNKNOWN.

**Fix déployé :**

- `imeiByRemoteAddress = new Map()` au niveau module (survit aux reconnexions)
- `getImeiFromSocket(sock)` : lit d'abord WeakMap, fallback sur `remoteAddress`
- Au login (0x01) : stockage dans les deux maps
- 6 points de lecture remplacés par `getImeiFromSocket()`

**Script :** `patch_gt06_imei_fallback.py`

#### 3.2 — Route API métriques pipeline ✅

`GET /api/admin/gps-stats` déployée dans `dist/routes/monitoringRoutes.js` :

```json
{
  "timestamp": "2026-04-15T...",
  "pipeline": { "activeConnections": 3, "activeParsers": ["GT06", "QUECLINK"] },
  "parsers": [{ "name": "GT06", "totalPackets": 1420, "validPackets": 1418, "successRate": 99, "lastSeen": "..." }],
  "unknownImeis": [{ "imei": "123456789012345", "packetCount": 12, "lastSeen": "..." }],
  "totals": { "packets": 1420, "valid": 1418, "rejected": 2, "crcErrors": 0 }
}
```

**Données exportées depuis `server.js` :**

- `exports.pipelineStats` — compteurs par protocole (total, valid, rejected, crcErrors, lastSeen)
- `exports.unknownImeiLog` — Map imei → { count, lastSeen }
- `exports.getParsers()` — liste des parseurs actifs

**Script :** `patch_gps_stats_route.py`

#### 3.3 — Interface Monitoring > Pipeline GPS ✅ (déjà présent)

`features/tech/components/monitoring/MonitoringView.tsx` — `PipelineGpsTab` :

- Polling `/api/admin/gps-stats` toutes les 10s
- KPIs : connexions actives, taux succès global, paquets reçus, IMEI inconnus
- Tableau parseurs avec code couleur successRate (vert/orange/rouge)
- Panel orange IMEI inconnus (boîtiers non enregistrés)

#### 3.4 — Interface Admin > Boîtiers ✅ (déjà présent)

`features/admin/components/panels/DeviceConfigPanelV2.tsx` — 3 onglets :

- **DASHBOARD** : état global, liste véhicules, recherche IMEI
- **DEVICE_HEALTH** : IMEI input → `/api/devices/:imei/diagnostics` — variant GT06, signal, satellites, HDOP, battery, position, dernière comm
- **GLOBAL_CONFIG** : envoi commandes TCP, override variant, intervalles reporting

---

## Sprint 4 — Infrastructure (KVM2 requis) 🔲

> À ne lancer qu'après migration Hostinger KVM1 → KVM2 (8GB RAM, 4 vCPU)

### Road snapping (OSRM self-hosted)

**Décision :** OSRM self-hosted sur KVM2 (trop juste en RAM sur KVM1 avec 4GB)  
**Stratégie KVM1 (maintenant) :** Road snapping uniquement en post-processing pour les rapports (Mapbox Map Matching API, $0.005/100pts)

**Plan KVM2 :**

- Docker container OSRM + profil routing Algeria/Côte d'Ivoire
- Queue Redis séparée pour le snapping asynchrone (non bloquant sur le pipeline temps réel)
- Appel dans positionWorker.js : `await osrmSnap(lat, lng)` avec cache Redis 24h

### MQTT Broker (Mosquitto)

- Port 1883 (actuellement fermé sur VPS)
- Utile pour Teltonika FOTA (firmware over-the-air) et boîtiers LTE-M/NB-IoT
- `docker-compose.yml` : ajouter service `mosquitto`

---

## Sprint 5 — Données riches 🔲

- [ ] CAN bus J1939 — Décodage complet (rpm, charge moteur, niveaux AdBlue, codes DTC)
- [ ] OBD2 PIDs structurés — MAP par PID dans les parseurs Teltonika/Meitrack
- [ ] Video telematics — Intégration API caméras embarquées (MDVR, dashcam)

---

## Architecture VPS (état réel)

```
Internet
    ↓ TCP :5001 (host) → :5000 (container)
Docker container backend
    ├── server.js (TCP Proxy GPS)
    │       → identifie IMEI
    │       → push dans Redis queue "gps:positions"
    │
    ├── positionWorker.js ← patché Sprint 1
    │       → consomme Redis queue
    │       → KalmanFilter2D + DeadReckoning + assessGpsQuality  ← NOUVEAU
    │       → antiDrift
    │       → fuelSmoothing
    │       → INSERT PostgreSQL (batch UNNEST)
    │       → socketThrottle.emitVehicleUpdate() → Socket.IO
    │
    └── socket.js ← patché (perMessageDeflate + throttle adaptatif)
            → rooms tenant:XXXX
            → events: vehicle:update (18 champs)
```

**Infrastructure :**

- VPS : Hostinger KVM1 (dev/prod actuel) → KVM2 prévu pour prod définitive
- Docker Compose v2, PostgreSQL (TimescaleDB), Redis 7
- GPS TCP Port : 5001 (host) → 5000 (container)

---

## Fichiers sources locaux

| Fichier                                  | Description                                     |
| ---------------------------------------- | ----------------------------------------------- |
| `backend/src/gps-server/precision.ts`    | Kalman + Dead Reckoning + GPS Loss Detection    |
| `backend/src/gps-server/server.ts`       | Pipeline principal — intègre `filterPosition()` |
| `backend/src/gps-server/parsers/gt06.ts` | Parser GT06 avec CRC adaptatif + variant        |
| `backend/src/services/socketThrottle.ts` | Throttle 4 tiers (REALTIME/MOVING/IDLE/PARKED)  |
| `backend/src/services/metricsService.ts` | Métriques Prometheus (15 counters/gauges)       |

## Scripts de déploiement VPS

| Script                              | Action                                        |
| ----------------------------------- | --------------------------------------------- |
| `patch_kalman_deadreckoning.py`     | Sprint 1 — Kalman + DR dans positionWorker.js |
| `patch_socketio_compression.py`     | perMessageDeflate + throttle adaptatif        |
| `patch_vehicle_update_payload.py`   | Payload vehicle:update 18 champs              |
| `patch_parsers_queclink_suntech.py` | Sprint 2 — Parseurs Queclink + Suntech VPS    |
| `patch_gt06_imei_fallback.py`       | Sprint 3 — Bug B1 IMEI UNKNOWN GT06           |
| `patch_gps_stats_route.py`          | Sprint 3 — Route /api/admin/gps-stats         |
| `deploy.ps1`                        | Déploiement frontend + backend complet        |

---

## Métriques de qualité cibles

| Indicateur                      | Avant             | Cible                 |
| ------------------------------- | ----------------- | --------------------- |
| Bruit GPS (RMS)                 | ~5-8m             | ~1-2m (Kalman)        |
| Positions fantômes en tunnel    | fréquent          | 0 (Dead Reckoning)    |
| Drift stationnement             | oscillations ~30m | < 5m                  |
| Protocoles couverts             | 6/9               | ✅ 9/9 (Sprint 2)     |
| Trafic WebSocket                | baseline          | -60% (compression)    |
| Latence UI véhicule sélectionné | 2s                | 500ms (REALTIME tier) |

---

## Tableau de bord des protocoles actifs (VPS prod)

```
parsers = [
  GT06Parser      ← GT06, Concox, JimiIoT, Coban, Seeworld, GT02
  QueclinkParser  ← GV300, GV500, GV600, GL300, GL500         [NOUVEAU Sprint 2]
  SuntechParser   ← ST310, ST340, ST600, ST900                [NOUVEAU Sprint 2]
  TeltonikaParser ← FMB120, FMB920, FMB640, Codec 8/8E/16
  JT808Parser     ← Génériques CN, Concox JT808
  H02Parser       ← Sinotrack, TK103, GT02H
  MeitrackParser  ← MVT600, T399, T1
  WialonIpsParser ← Wialon IPS v2
  TextProtocol    ← Fallback texte générique
]
```

---

## Prochaines étapes

### Sprint 4 — Infrastructure (nécessite KVM2)

- OSRM self-hosted road snapping (4GB RAM insuffisant sur KVM1)
- MQTT Mosquitto pour FOTA Teltonika + LTE-M/NB-IoT
- En attendant KVM2 : Mapbox Map Matching API en post-processing ($0.005/100pts)

### Sprint 3-bis — Corrections post-déploiement ✅ (2026-04-15)

| Correctif                                 | Détail                                                                       | Statut     |
| ----------------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| Regex IMEI `^d{10,16}$` → `^\d{10,16}$`   | Bug backslash absent → 400 pour tout IMEI valide                             | ✅ Corrigé |
| `getDeviceDiagnostics` : champs manquants | `batteryMv`, `protocol`, `vehicleName`, `vehiclePlate` absents de la réponse | ✅ Enrichi |
| `GET/PUT /api/admin/gps-config`           | Route manquante → erreur 404 sur onglet Configuration                        | ✅ Créé    |

**Scripts :** `patch_device_diagnostics.py`, `patch_gps_config_route.py`

### Sprint 4-bis — À faire sans KVM2

- [ ] Graphe temps réel Kalman stats dans MonitoringView (nb véhicules filtrés, gain moyen)
- [ ] Alertes IMEI inconnu → notification staff temps réel (Socket.IO event)
- [ ] Charger la config GPS au démarrage du pipeline depuis `settings` (appliquer `rateLimitPerSec` au runtime)

_Dernière mise à jour : 2026-04-15_
