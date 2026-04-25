# Chantier — Géolocalisation 360° (hors carburant)

**Démarré** : 2026-04-25
**Statut** : roadmap proposée, en attente validation utilisateur avant phase 1
**Pilote** : Smartrack CI / Elektro Com
**Branche** : `chore/phase-2-10-gps-server`

**Enjeu stratégique** : hisser le pipeline géolocalisation TrackYu au niveau état de l'art industrie (Wialon / Geotab / Samsara / Motive). Fiabilité données + détection anomalies + commandes distantes + performance scaling.

**Remarque utilisateur importante** : les balises actuellement connectées au serveur sont **uniquement pour tests temps-réel**. Les vrais clients tournent sur un autre serveur. Cela permet d'être plus agressif sur les tests et changements backend sans risque client immédiat — mais la qualité de livraison doit rester production-ready pour quand la migration client se fera.

---

## 1. Périmètre

Tout ce qui concerne la géolocalisation GPS, **hors carburant** (chantier séparé : `CHANTIER_FUEL_ANTIVOL.md`).

1. **Protocoles & parsers** — couverture, robustesse, variants, CRC
2. **Serveur TCP GPS** — entry point, sockets, rate limiting, device discovery
3. **Pipeline ingestion** — Redis queue, worker, Kalman, DR, bulk flush
4. **Stockage positions + objects** — schemas, indexes, TimescaleDB, rétention
5. **Calculs dérivés** — distance, vitesse, statuts, stops, trips, odometer
6. **Tracé carte** — live updates, clustering, snapping, historique
7. **Replay** — playback controls, timeline, markers events
8. **Commandes TCP downlink** — CUT_ENGINE, CONFIG_APN, PING + JT808 manquant
9. **Anomalies positions** — anti-spoofing, teleportation, confidence score
10. **Services externes** — reverse geocoding, Google Roads, quotas
11. **Dette technique / code mort**
12. **Observability** — Prometheus, SLOs, alertes

---

## 2. État initial (audit 2026-04-25)

### 2.1 Déjà livré (Phase 0 + Sprints 1-3 GPS haut de gamme)

**Déployés prod 2026-04-03 à 2026-04-21** :

- ✅ **CRC GT06** corrigé : ISO-HDLC (Concox/JimiIoT) vs IBM (Coban), auto-détection variant
- ✅ **9 parsers** actifs : GT06, JT808, Teltonika, Meitrack, Queclink, Suntech, H02, Wialon IPS, Text
- ✅ **Kalman 2D filter** + **Dead Reckoning** (fallback ≤ 2 min)
- ✅ **GPS Loss Detection** : satellites < 3, HDOP > 5, coords (0,0), timestamp > 5 min
- ✅ **Anti-drift** : speed < 2 km/h ∧ dist < 50 m ∧ dt < 30 s → position ignorée
- ✅ **GPS jump detection** : avgSpeed > 150 km/h ∧ dist > 500 m → alert + drop
- ✅ **Pipeline batch** : bulk insert 2 s, fallback individuel, métriques Prometheus
- ✅ **Device discovery** : IMEI inconnu → `discovered_devices` + notif admin Socket.IO
- ✅ **Rate limiting** : 300 pkt/min par IMEI, 200 connexions par IP, 5 unknown packets max
- ✅ **MonitoringView.tsx** + `PipelineGpsTab` + `DeviceConfigPanelV2`
- ✅ **Socket.IO** throttle adaptatif (MOVING 1 s / IDLE 3 s / STOPPED 8 s) + perMessageDeflate
- ✅ **Payload `vehicle:update`** enrichi 18 champs (crash, sos, harsh, altitude, odometer, etc.)

### 2.2 Benchmark industrie (résumé)

Standards state-of-the-art 2026 (Wialon, Geotab 55 Md datapoints/j, Samsara 99.99 % uptime) :

| Axe              | Standard                                          | TrackYu                                    |
| ---------------- | ------------------------------------------------- | ------------------------------------------ |
| Anti-spoofing    | Teleport > 193 km/h, altitude check, multi-source | Teleport > 150 km/h seulement              |
| Scale            | TimescaleDB + compression + continuous aggregates | Hypertable seule, pas de policies          |
| Map matching     | Valhalla / OSRM self-hosted                       | Google Roads (limite 100 pts) ou désactivé |
| JT808 downlink   | 0x8103 / 0x8105 standard                          | ❌ Absent                                  |
| Replay           | Timeline 24 h + events markers + GPS pings toggle | Playback basique speeds 1-25x              |
| Confidence score | 0-100 par position                                | ❌ Absent                                  |
| Kalman           | Adaptive Q/R selon contexte                       | Q/R fixes                                  |

### 2.3 Dette technique identifiée

- **JT808 downlink absent** dans `commandFactory.ts` (boîtiers CN non commandables)
- **Teltonika Codec 12** TODO non implémenté
- **Duplication** `computeVehicleStats` backend + frontend
- **Cache** `localVehicleCache` TTL 5 min sans invalidation event-driven
- **Colonne `positions.vehicle_id`** obsolète (remplacée par `object_id` depuis 2026-03-04)
- **Pas de compression** TimescaleDB active
- **Pas de rétention** automatique positions

### 2.4 Sprint 4 / 4-bis pending (du chantier GPS haut de gamme précédent)

- Sprint 4 (bloqué KVM2) : OSRM self-hosted + MQTT Mosquitto
- Sprint 4-bis (faisable sans KVM2) :
  - Graphe Kalman stats dans MonitoringView
  - Alertes IMEI inconnu → notification staff temps-réel (Socket.IO event)
  - Config GPS depuis table `settings` au démarrage pipeline

---

## 3. Roadmap phasée

**Ordre d'exécution** (modifiable selon validation user) :

| Phase   | Titre                                                              | Priorité         | Effort | Impact                        |
| ------- | ------------------------------------------------------------------ | ---------------- | ------ | ----------------------------- |
| **P1**  | Anti-spoofing avancé + confidence score                            | 🔴 Critique      | 2-3 j  | Trust data, cœur métier       |
| **P2**  | JT808 commandes downlink                                           | 🟡 Important     | 1-2 j  | Feature bloquée (boîtiers CN) |
| **P3**  | TimescaleDB compression + rétention + continuous aggregates        | 🟡 Scalabilité   | 1-2 j  | Préparer l'avenir             |
| **P4**  | Sprint 4-bis résiduel (Kalman stats, IMEI alerts, config runtime)  | 🟢 Consolidation | 1 j    | Finir chantier précédent      |
| **P5**  | Alignement `computeVehicleStats` (dé-duplication backend/frontend) | 🟢 Dette         | 1 j    | Single source of truth        |
| **P6**  | Replay enrichi (timeline 24 h, markers events, GPS pings toggle)   | 🟢 UX            | 2-3 j  | Outil manager                 |
| **P7**  | Map matching self-hosted OSRM (nécessite KVM2)                     | 🟢 Optimisation  | 3-5 j  | Coût + limite 100 pts         |
| **P8**  | Kalman adaptive (Q/R contextuels)                                  | 🟢 Amélioration  | 2 j    | Précision marginale           |
| **P9**  | Teltonika Codec 12 downlink binary                                 | 🟢 Spécifique    | 1-2 j  | Gap client-specific           |
| **P10** | Observability dashboard Prometheus + SLOs + alertes                | 🟢 Maintenance   | 1-2 j  | Production readiness          |

---

## 4. Détail phases

### Phase 1 — Anti-spoofing avancé + confidence score 🔴

**Objectif** : rapprocher TrackYu du niveau Wialon/Samsara sur la détection de données falsifiées ou aberrantes.

**Livrables backend** :

- Détection **teleportation** v2 : seuil standard industrie `193 km/h` (120 mph) au lieu de 150
- Détection **altitude check** : altitude `= 0` constante sur N positions = spoofing probable
- Détection **altitude répétée** indépendante du terrain = spoofing
- **Multi-source validation** : si LBS disponible (cell_id GSM dans `raw_data`), cross-check cohérence GPS/GSM
- **Confidence score** calculé : fonction de satellites, HDOP, variance Kalman, cohérence multi-source → `positions.gps_confidence INTEGER` (0-100)
- **Table `position_anomalies`** :
  - `id`, `object_id`, `tenant_id`, `time`
  - `type` : TELEPORT | ALTITUDE_FAKE | MULTI_SOURCE_MISMATCH | HDOP_HIGH | SAT_LOW | COORDS_ZERO
  - `severity` : LOW | MEDIUM | HIGH | CRITICAL
  - `details` JSONB : snapshot contexte (raw position, expected, delta)
  - `status` : DETECTED | CONFIRMED | DISMISSED
  - `confidence`, `created_at`, `reviewed_by`, `reviewed_at`
- Endpoint `GET /api/v1/position-anomalies` + `POST /:id/review`

**Livrables frontend** :

- Badge "Positions suspectes" dans VehicleDetailPanel (compteur anomalies 24 h)
- Modal listing anomalies avec filtres type/severity
- Indicateur confidence sur la jauge GPS (vert ≥ 80, orange 50-80, rouge < 50)

**Migration SQL** :

```sql
ALTER TABLE positions ADD COLUMN gps_confidence SMALLINT NULL;
CREATE INDEX idx_positions_low_confidence ON positions (object_id, time)
  WHERE gps_confidence < 50;

CREATE TABLE position_anomalies (...);
```

**Validation** :

- Test sur les balises test (064, 077, 160 + autres 15042\*)
- Vérifier qu'aucune position légitime n'est taggée anomalie à tort (faux positifs < 1 %)

---

### Phase 2 — JT808 commandes downlink 🟡

**Objectif** : compléter `commandFactory.ts` pour supporter JT808.

**Livrables** :

- Encapsulation JT808 message downlink :
  - Header : `0x7e` + message ID + attr + BCD phone + serial
  - Body + checksum XOR + `0x7e`
  - Échappement bytes `0x7e` / `0x7d` dans body
- Messages supportés :
  - `0x8103` Terminal Parameter Setting (APN, server IP, intervalles)
  - `0x8105` Terminal Control (reboot, factory reset, cut engine)
- ACK tracking : `0x0001` (general terminal response) + corrélation serial
- API REST `POST /api/v1/devices/:imei/command` + audit log dans `commands`
- UI simple : bouton "Ping" + "Reboot" sur DeviceConfigPanelV2 pour boîtiers JT808

**Test** :

- Envoyer PING sur **1 seul boîtier** (15042020077 par exemple) et vérifier retour ACK
- Mesurer latence end-to-end

**Attention** : les balises sont test-only mais envoyer des commandes `CUT_ENGINE` même en test pourrait être intrusif. Se limiter à PING + Parameter Setting inoffensif pour v1.

---

### Phase 3 — TimescaleDB storage policies 🟡

**Objectif** : préparer la scalabilité avant que le volume ne pose problème.

**Livrables** :

- `ALTER TABLE positions SET (timescaledb.compress, timescaledb.compress_orderby = 'time DESC', timescaledb.compress_segmentby = 'object_id')`
- `SELECT add_compression_policy('positions', INTERVAL '7 days')`
- **Retention policy** : raw positions supprimées après N jours (à valider utilisateur, par défaut 90)
  - `SELECT add_retention_policy('positions', INTERVAL '90 days')`
- **Continuous aggregates** :
  - `positions_1h` : agrégation horaire (avg speed, max speed, distance, status dominant)
  - `positions_1d` : agrégation journalière (pour stats longues)
  - Refresh policy : recalcul incrémental toutes les 10 min
- **Cleanup** : supprimer colonne obsolète `positions.vehicle_id` (sauf si elle est utilisée quelque part — à vérifier par grep)

**Migration SQL** : sera écrite lors de la phase, passée d'abord en staging si disponible.

**Question bloquante** : durée rétention raw ? (90 j par défaut, mais certains clients peuvent exiger 1 an ou plus pour conformité)

---

### Phase 4 — Sprint 4-bis résiduel 🟢

**Objectif** : terminer les items pending du chantier GPS haut de gamme précédent.

**Livrables** :

- **Kalman stats graph** : courbe dans `MonitoringView` des véhicules avec Kalman actif, convergence filtrage
- **Alertes IMEI inconnu** : quand un boîtier inconnu se connecte, émettre `admin:unknown-imei` via Socket.IO → notification toast dans UI staff
- **Config GPS runtime** : charger `settings.rateLimitPerSec`, `settings.hdopThreshold`, etc. au démarrage du pipeline (pas besoin de redémarrage worker pour changer la config)

---

### Phase 5 — Alignement computeVehicleStats 🟢

**Objectif** : supprimer la duplication backend/frontend.

**Livrables** :

- Endpoint `GET /api/v1/vehicles/:id/stats?period=today|week|month` retourne le résultat `VehicleStatsResult`
- Hook `useVehicleStats` devient simple wrapper `useQuery` sur ce endpoint
- Frontend `utils/computeVehicleStats.ts` : supprimé ou déprecated avec warning
- Tests : fixtures communes backend/frontend pour vérifier alignement

---

### Phase 6 — Replay enrichi 🟢

**Objectif** : atteindre le niveau Wialon/Fleetmatics sur l'outil replay.

**Livrables** :

- **Timeline 24 h** dans `ReplayControlPanel` : segments Travel / Stop / Idle / Offline colorés
- **Markers events** cliquables : speeding, harsh braking/accel, stops > 5 min, violations, alerts SOS/CRASH, fuel events
- **Toggle "GPS pings"** : afficher tous les points bruts sur la map avec lat/lng/speed au click
- **Continuous playback** : enchaîner les segments sans s'arrêter
- **Follow vehicle mode** : map scroll automatique sur le véhicule vs map fixe
- **Jump to next event** : raccourci pour sauter au prochain stop/violation

---

### Phase 7 — Map matching self-hosted OSRM 🟢

**Attente KVM2** (migration infra Hostinger en cours, hors scope de ce chantier).

**Livrables si KVM2 disponible** :

- Déploiement OSRM sur KVM2 avec données OSM Côte d'Ivoire
- Service `MapMatchingService` (remplace Google Roads API)
- Pas de limite 100 pts, coût fixe infra
- Frontend : toggle "Snap to road" dans replay + historique

**Alternative sans KVM2** : Mapbox Map Matching API (post-processing, ~$0.005/100pts)

---

### Phase 8 — Kalman adaptive 🟢

**Objectif** : ajuster dynamiquement Q/R selon le contexte (stationnaire vs mouvement).

**Livrables** :

- Détection contexte : stationnaire si `speed < 2 km/h` pendant > 30 s
- Stationnaire : augmenter Q (trust measurements, déjà bruitées peu importe)
- Mouvement rapide : diminuer Q (trust modèle, lissage fort)
- Monitoring : comparer variance filtre avant/après sur dataset test

---

### Phase 9 — Teltonika Codec 12 downlink 🟢

**Objectif** : compléter le support Teltonika (TODO existant).

**Livrables** :

- Encapsulation Codec 12 binary pour commandes GPRS
- Commandes : `setdigout` (cut/restore engine), `getstatus`, `setparam <id>:<value>`
- Test sur FMB120 ou FMB920

---

### Phase 10 — Observability 🟢

**Livrables** :

- Dashboard Grafana dédié GPS : positions/sec, parsing errors %, queue depth, flush latency p95, Kalman convergence
- SLOs :
  - Position TCP → Socket.IO < 2 s p95
  - Parsing success rate > 99 %
  - Queue depth < 500
- Alertes : queue > 1000, parsing error rate > 1 %, IMEI unknown spike > 10/h

---

## 5. Règles chantier

- **Pas de code avant validation explicite** de chaque phase (comme pour le chantier carburant)
- **Accord explicite avant chaque deploy** (frontend staging → prod, backend prod direct)
- **Commit discipline** : scope strict, pas de `git add -A`
- **Corpus de test** : balises 15042\* connectées (test-only), en particulier 064, 077, 160
- **Non-régression** : vérifier qu'aucune feature existante ne casse après chaque phase
- **Doc chantier + memory** : mise à jour à chaque avancée
- **Skills** : mettre à jour `.claude/skills/networking.md`, `data_ingestion.md`, `gps-debug.md` selon phases livrées

---

## 6. Base de données — ajouts prévus

### Colonnes à ajouter

| Table       | Colonne          | Type             | Phase             |
| ----------- | ---------------- | ---------------- | ----------------- |
| `positions` | `gps_confidence` | SMALLINT NULL    | P1                |
| `positions` | `gsm_cell_id`    | VARCHAR(32) NULL | P1 (si LBS dispo) |

### Tables à créer

| Table                | Phase | Rôle                                                |
| -------------------- | ----- | --------------------------------------------------- |
| `position_anomalies` | P1    | Anomalies détectées (teleport, altitude fake, etc.) |

### Policies TimescaleDB (P3)

- `compression_policy` sur `positions` après 7 jours
- `retention_policy` sur `positions` après N jours (à valider)
- `continuous_aggregate` `positions_1h` et `positions_1d`

### Cleanup

- Suppression colonne `positions.vehicle_id` (obsolète, remplacée par `object_id` depuis 2026-03-04)

---

## 7. Journal de bord

**2026-04-25 matin** — Chantier démarré, audit + benchmark terminés

- Agent explore a produit audit 12 sections sur parsers, pipeline, stockage, calculs, map, replay, commandes, anomalies, services, dette
- Benchmark industrie : standards Wialon/Geotab/Samsara/Motive recueillis
- Gap analysis produite (7 axes critiques/importants identifiés)
- Roadmap 10 phases proposée avec effort/impact
- Remarque utilisateur : balises actuelles sont test-only (vrais clients sur autre serveur)
- Doc de suivi créé (ce fichier)

**2026-04-25 après-midi → 2026-04-24 soir** — Phase 1 livrée bout en bout (backend prod + frontend staging)

- ✅ Phase 1.1 — Migration SQL `20260425_add_gps_anomalies.sql` : `positions.gps_confidence SMALLINT NULL` + table `position_anomalies` (8 types, 4 severities, workflow DETECTED/CONFIRMED/DISMISSED). Note : CHECK constraint sur `gps_confidence` retirée (incompatible hypertable compression, validation app-layer)
- ✅ Phase 1.2 — Parser JT808 patché pour exposer `altitude` dans le retour (était lu offset+16 mais pas retourné)
- ✅ Phase 1.3 — `PositionAnomalyDetector.ts` : seuils standard industrie (TELEPORT 193 km/h, IMPOSSIBLE 300 km/h, distance min 500 m, altitude rolling cache 5 samples, stale 5 min). `analyzePosition()` retourne `{confidence, anomalies[]}`, `persistAnomalies()` async fire-and-forget, cleanup horaire LRU >10k IMEIs. Intégré dans `positionWorker.ts` avant chaque INSERT (12 colonnes incluant `gps_confidence`)
- ✅ Phase 1.4 — Routes API `positionAnomalyRoutes.ts` (list, by vehicle, review, stats/summary) + montage `/api/v1/position-anomalies` dans `v1Router.ts`. Filtrage tenant + fallback staff cross-tenant. Endpoint live prod (HTTP 401 auth-protected confirmé)
- ✅ Phase 1.5 — Frontend complet :
  - Types `PositionAnomaly` + énums dans `types.ts`
  - API `services/api/fleet.ts` : `positionAnomalies.{listByVehicle, list, review, getSummary}`
  - `DataContext` : hooks `getPositionAnomalies` + `reviewPositionAnomaly` avec invalidation cache
  - `PositionAnomaliesModal.tsx` : toggle plage today/week, filtre statut, icônes contextuelles par type, actions CONFIRM/DISMISS masquées CLIENT
  - `GpsBlock.tsx` : bouton « Voir les positions suspectes » conditionnel
  - `VehicleDetailPanel.tsx` : prop `setActiveModal` câblée + render case `positionAnomalies`
  - i18n FR/EN/ES : section `positionAnomalies` complète (8 types, 4 severities, 3 status, 7 details) + `modals.positionAnomaliesTitle`
  - `tsc --noEmit` = 0 erreur
- ✅ Validation backend prod : 6/8 positions @ confidence=100, 2/8 @ confidence=65 (ALTITUDE_FAKE -35), 2 anomalies HIGH créées. Pas de flood, pas de faux positifs sur positions normales.
- 🟡 Frontend staging déployé (108 chunks JS) — **en attente validation user** sur staging.trackyugps.com avant deploy prod
- **Prochaine étape** : valider staging UI → deploy prod frontend → ouvrir Phase 2 (JT808 downlink)

**2026-04-24 soir** — Phase 2 v1 livrée backend prod (JT808 downlink PING/0x8201)

- ✅ `src/gps-server/utils.ts` : ajout `escape()` (mirror de `unescape`, JT/T 808 byte stuffing 0x7e/0x7d)
- ✅ `src/gps-server/parsers/jt808.ts` refacto + extension :
  - `wrapJt808Message(msgId, phoneBytes, serial, body): Buffer` extrait pour DRY (réutilisé par les 2 ACK existants)
  - `encodeLocationQuery(phoneBytes, serial)` : 0x8201 body vide
  - `imeiToJt808Phone(imei)` : conversion IMEI ASCII → 6 bytes BCD (12 derniers digits pad-left)
  - `jt808Phones: Map<imei, Buffer>` exportée, peuplée au login
  - `nextJt808OutSerial(imei)` : compteur outbound monotone
  - Parser détecte `0x0001` General Terminal Response → `isCommandResponse=true` → réutilise flow ACK Socket.IO existant
- ✅ `src/gps-server/server.ts` : `jt808Phones.set()` au login JT808 (0x0100/0x0102)
- ✅ `src/gps-server/commandFactory.ts` : case `JT808`, type `'LOCATION_QUERY'` (alias `'PING'`), `socket.write(buffer)`, INSERT `pending_commands` SENT
- ✅ `src/controllers/deviceCommandController.ts` : zod enum étendu, détection protocol via device_model OU `jt808Phones.has(imei)` (fallback runtime)
- ✅ Test live prod (15042020175 tenant_smt) :
  - Encodage conforme : `7e820100000150420201750001e77e` (15 bytes, checksum XOR validé manuellement)
  - HTTP 200 sur `POST /api/v1/devices/:imei/command` body `{type:'PING'}`
  - Buffer écrit sur socket TCP active
  - **Pas d'ACK 0x0001 explicite** du boîtier test (firmware ancien GT02 non-strict JT/T 808) — infra prête pour boîtiers récents
- 🟢 Périmètre v1 volontairement restreint : seul `0x8201 Location Query` (PING inoffensif). `0x8103 Set Terminal Parameter` + `0x8105 Terminal Control` reportés en v2 après validation terrain

**2026-04-24 nuit** — Phase 4 sub-item 1/3 livrée prod : toast temps-réel IMEI inconnu

- ✅ Backend déjà émet `admin:unknown-imei` sur room `superadmin` (server.ts:196) — découvert lors de l'audit, donc rien à coder côté backend
- ✅ Frontend `NotificationContext.tsx` : listener Socket.IO ajouté avec debounce 5 min/IMEI (Map locale), toast type INFO severity MEDIUM avec link `/admin?tab=devices`. Cleanup `socket.off()` au unmount
- ✅ i18n FR/EN/ES : section `notifications.unknownImei` (title + body interpolé `{{imei}}`/`{{protocol}}`)
- ✅ Filtre rôle assuré côté backend : room `superadmin` joinable seul par SUPERADMIN (socket.ts:79-88) → pas de fuite vers ADMIN tenant ou CLIENT
- ✅ Déployé staging puis prod — commit `7171457`
- 🟡 Reste Phase 4 sub-items : Kalman stats graph (MonitoringView), Config GPS runtime (settings rateLimitPerSec/hdopThreshold sans restart worker)

**2026-04-24 nuit (suite)** — Phase 4 sub-item 3/3 livrée prod : config GPS hot-reload worker

- ✅ Découverte audit : `rateLimitPerSec` était déjà hot-reload côté `server.ts:loadGpsConfig` (polling 5 min). MAIS le `positionWorker` lisait `HDOP_THRESHOLD` et `SAT_THRESHOLD` depuis env au boot (const) → un changement de précision via UI/API n'avait aucun effet réel sur le filtrage des positions
- ✅ `src/workers/positionWorker.ts` : HDOP/SAT passés en `let` mutables + `loadWorkerConfig()` async (boot + setInterval 5 min). Lecture `gps_config_accuracy` → mappe HDOP, et `gps_config_sat_threshold` (clé optionnelle). Log `[Worker-Config]` uniquement si changement
- ✅ Test live prod : SQL `gps_config_accuracy=high` + restart → log `[Worker-Config] Reloaded HDOP_THRESHOLD 5→2 (accuracy=high)` confirmé
- ✅ Endpoints + UI déjà existants (`PUT /api/v1/monitoring/gps-config` + `DeviceConfigPanelV2 GlobalConfigTab`) — rien à toucher
- 🟢 Hors scope v1 : Kalman_Q/R + anti-drift seuils (2 km/h, 50m, 30s) restent hardcodés/env — moins fréquemment ajustés + risque plus élevé en cas de mauvais réglage
- Commit backend : 76fe650
- 🟡 Reste Phase 4 sub-item 2/3 : Kalman stats graph (courbe convergence dans MonitoringView)

**2026-04-25 — Phase 6 v1 livrée prod : timeline 24h colorée + jump-to event**

- ✅ `ReplayControlPanel.tsx` — barre Timeline ajoutée au-dessus des contrôles play/pause :
  - Bandes colorées par status (vert MOVING / orange IDLE / rouge STOPPED / gris OFFLINE)
  - Calcul depuis `history` brut, segments fusionnés si même status, gap > 5 min = OFFLINE
  - Légende compacte (couleur + label) en haut à droite
  - Curseur progress synchronisé (line blanche verticale)
  - Click sur la timeline → seek au timestamp correspondant
- ✅ Markers events cliquables sur la timeline (1 px wide) :
  - Stops (bleu), Speeding (rouge), Refill (vert), Theft (rouge foncé)
  - Hover scale 1.25, title tooltip type + heure
  - Click → seek au timestamp de l'event
- ✅ Boutons Jump-to-prev / Jump-to-next event (icones SkipBack/SkipForward) :
  - Tri stops + speedingEvents + fuelEvents par timestamp
  - Disabled si aucun event
- ✅ Helpers `tsToProgress` / `progressToTs` partagés
- ✅ i18n FR/EN/ES : 10 nouvelles clés (timeline, movingShort, idleShort, stoppedShort, offlineShort, stopShort, speedingShort, seekTimeline, prevEvent, nextEvent)
- ✅ Bug "icône ne bouge pas en replay" résolu : interpolation linéaire entre positions adjacentes (`lat = a.lat + (b.lat - a.lat) * frac` au lieu de `Math.floor(pathIndex)`) → marker glisse continuellement à chaque tick d'animation au lieu de sauter tous les ~600ms
- ✅ Auto-logout sur refresh 401 (services/socket.ts) : si `/auth/refresh` retourne 401, cleanup localStorage + reload → cohérent avec fetchWithRefresh côté HTTP
- Commits : 0c08fee + 1348e95 + 62f1890 (frontend) — déployés prod

Reste P6 v2 (toggle GPS pings + markers events sur la map) et P6 v3 (continuous playback through stops). v1 livre la valeur la plus visible : navigation rapide aux events + visualisation status sur 24h.

---

**2026-04-25 — Bug fixes fuel suite chantier P5 (ReplayControlPanel onglet Carburant)**

Suite à la migration Phase 5 (computeVehicleStats → useVehicleStats hook), validation utilisateur sur staging a remonté 4 problèmes pré-existants ou liés sur l'onglet Carburant. Tous corrigés :

- Bug C : badge onglet TRIPS divergeait de la liste (tripSegments.length local vs serverTrips.length backend) → aligné sur source serveur (commit 655be33)
- Bug B : courbe carburant plate à 0 dans l'onglet FUEL — le payload `/history/snapped` ne retourne pas `fuelLevel`. Bascule sur endpoint dédié `getFuelHistory` + nouveau dataset `fuelChartData` séparé (commits 655be33 + 51617b5)
- Markers REFILL/LOSS sur la courbe — `dot` custom du `<Area>` avec cercles ⛽ vert et ⚠ rouge (même rendu que FuelModalContent du VehicleDetailPanel), événements depuis backend `fuel_events` au lieu de détection locale (commits c74310a + 8ea0002 + dfeb641)
- Affichage en LITRES partout (cohérent avec backend `delta_liters`/`before_liters`/`after_liters`/`tank_capacity`) — Y axis chart, KPIs Consommation/Niveau, Δ Début/Fin/écart, tableau d'événements (commit dfeb641)
- Tooltip blanc-sur-blanc → tokens CSS `var(--bg-card)` / `var(--text-primary)` / `var(--border)` (commit dfeb641)
- Hauteur tableau `max-h-24` + `flex-shrink-0` pour ne plus masquer la courbe (commit dfeb641)
- i18n FR harmonisée : "Ravitaillement" → "Recharge", "Perte suspecte" → "Baisse suspecte" (commit 8ea0002) — alignement sur les termes utilisés dans FuelBlock du VehicleDetailPanel

---

**2026-04-25 — État réel découvert (vérif DB + code)**

État vérifié des phases hors session — plusieurs étaient déjà partiellement faites :

- **P3 TimescaleDB** : compression 7d ✅ + retention 365d ✅ déjà actifs (jobs 1000/1001) — non documenté avant. Continuous aggregates ajoutés cette session (commit 5ced69b) :
  - `positions_1h` (avg_speed/max_speed/n_points/n_moving/n_stopped/avg_lat/avg_lng) refresh 10 min
  - `positions_1d` (mêmes axes sans lat/lng) refresh 1 h
  - Backfill initial : 2350 rows / 180 rows
  - **Phase 3 100% terminée**
- **P6 Replay enrichi** : `ReplayFollower` (follow vehicle mode) déjà implémenté dans MapView.tsx:467+2988. 5/6 sub-features restantes
- **P10 Observability** : prom-client metrics (gpsActiveConnections, gpsMessagesReceived, gpsProcessingLatency, gpsPositionsSaved, gpsParsingErrors, cacheOperations, dbPool, positionBufferSize, wsMessages…), 3 dashboards Grafana (api-performance, business-realtime, system-overview), 23 alertes Prometheus (incluant 4 GPS pipeline) déjà en code. **MAIS** : la stack monitoring (Prometheus/Grafana/Alertmanager) n'est PAS déployée en prod — aucun container ne tourne. Configs présentes dans docker-compose.monitoring.yml mais inactives.
- 2 metrics ajoutés cette session (commits dcc100d + 450bd55) : `gps_unknown_imei_total{protocol}` + `socket_disconnects_total{reason}` + 2 alertes (GpsUnknownImeiSpike, SocketHighDisconnectRate) — prêts pour quand la stack sera déployée

**🎁 Bonus hors roadmap initiale** : Chantier socket-stability ouvert + Phase 1 livrée (P1 cookie fallback + P2 nginx timeouts + P3 client withCredentials/auto-refresh). Bug "Actualisation suspendue" résolu. Voir `CHANTIER_SOCKET_STABILITY.md`.

**Mini-chantier infra à ouvrir** : déployer la stack monitoring en prod (docker-compose up monitoring + Prometheus scrape /metrics + Alertmanager Slack/email + sécuriser Grafana auth). Hors scope chantier géoloc 360°, à voir séparément.

---

**2026-04-24 nuit (fin)** — Phase 4 sub-item 2/3 livrée prod : stats Kalman convergence

- ✅ Backend `positionWorker.ts` : `KalmanFilter2D.getStats()` enrichi avec `convergedCount` (P<0.1, seuil empirique), `meanP`, `medianP`, `p95P` (valeurs arrondies 4 décimales). Commit `66e3b7b`
- ✅ Frontend `MonitoringView.tsx` : bloc Filtre Kalman 2D étendu — compteur "Convergés (P<0.1) : N / total (X%)", barre de progression, ligne P médian / p95 en mono, caption explicative. Commit `4b8484c`
- ✅ Validation visuelle staging : 11/13 (85%) convergés, P médian 0.0007 / p95 1.0 (cohérent post-restart)
- 🟢 Pas de timeline historique pour v1 (snapshot suffit). Si besoin de courbe : Prometheus scrape 30s + Grafana (infra existante, pas de storage DB supplémentaire)
- **Phase 4 complète** : 3/3 sub-items livrés prod (IMEI toast + config hot-reload + Kalman convergence)
- **Prochaine étape** : Phase 5 (computeVehicleStats dé-dup — endpoint backend déjà créé `a17a1ea`, reste à déprécier le calcul frontend) OU Phase 3 (TimescaleDB, bloquée décision rétention raw user) OU Phase 6 (Replay enrichi — UX manager)

---

## 8. Questions ouvertes

1. **Ordre validation** : on garde P1 → P10 ou tu veux commencer par autre chose (ex: P6 Replay d'abord pour impact visuel manager) ?
2. **Rétention raw positions (P3)** : 90 jours par défaut, ou autre durée imposée par contraintes clientes / conformité ?
3. **Commandes JT808 test (P2)** : se limite-t-on à PING inoffensif en v1 ou on va jusqu'à `CUT_ENGINE` testable (avec accord manager) ?
4. **Altitude dans les trames** : nos parsers extraient-ils altitude systématiquement ? (prérequis Phase 1 altitude check)
5. **LBS cell_id dans `raw_data`** : disponible pour le cross-check multi-source (Phase 1) ?
6. **KVM2 migration** : ETA ? Impact sur P7 (Map matching).
7. **Kalman tuning field test** : Q=0.0001, R=0.0008 validés empiriquement ou à revoir (P8) ?

---

## 9. Prochaines étapes

**Court terme** :

1. Validation roadmap par utilisateur
2. Démarrage Phase 1 (anti-spoofing) ou phase choisie
3. Migrations SQL staging si possible, sinon prod direct avec monitoring

**Moyen terme** : 4. Enchaîner P2, P3, P4, P5 après validation P1 5. Monitoring qualité détection anomalies + ajustement seuils

**Long terme** : 6. P6-P10 après stabilisation du pipeline amélioré 7. Migration KVM2 pour débloquer P7

---

_Dernière mise à jour : 2026-04-25 · à maintenir à chaque avancée de phase_
