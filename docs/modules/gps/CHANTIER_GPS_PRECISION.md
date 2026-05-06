# CHANTIER GPS PRÉCISION — TrackYu

> Rapport d'audit technique · Pilotage chantier · Mis à jour le 2026-04-03 (session 4)

---

## RÉSUMÉ EXÉCUTIF

| Dimension             | Constat                                            | Cible                                     |
| --------------------- | -------------------------------------------------- | ----------------------------------------- |
| Intégrité données GPS | ⛔ Critique — IMEI GT06 hardcodé, 3 parseurs morts | ✅ Pipeline complet, IMEI authentique     |
| Validation données    | ⛔ Aucune — coordonnées/vitesse non vérifiées      | ✅ Bounds check systématique              |
| Sécurité protocoles   | ⛔ CRC jamais validé — paquets corrompus acceptés  | ✅ CRC16 validé sur tous les protocoles   |
| Résilience            | ⚠️ Perte données si DB down                        | ✅ File queue disque WAL                  |
| Monitoring staff      | ⛔ Aucune visibilité pipeline GPS                  | ✅ Métriques temps réel + config boîtiers |
| Config boîtiers       | ⚠️ Partielle — intervalles globaux seulement       | ✅ Config par protocole + santé boîtier   |

---

## 1. ARCHITECTURE DU PIPELINE GPS

### État actuel (avant chantier)

```
Device TCP (:5000)
    │
    ▼
server.ts — Détection protocole
    │
    ├─ TextProtocolParser   ✅ actif
    ├─ TextExtendedParser   ✅ actif
    ├─ JT808Parser          ✅ actif (sans CRC)
    ├─ GT06Parser           ⛔ IMEI hardcodé 'GT06-DEVICE'
    ├─ TeltonikaParser      ⛔ IMPORTÉ MAIS NON BRANCHÉ
    ├─ MeitrackParser       ⛔ IMPORTÉ MAIS NON BRANCHÉ
    └─ WialonIpsParser      ⛔ IMPORTÉ MAIS NON BRANCHÉ
    │
    ▼
Validation       ⛔ ABSENTE
    │
    ▼
CacheService (Redis) — Lookup IMEI → Véhicule
    │
    ▼
positionBuffer — Batch INSERT PostgreSQL
    │
    ▼
socketThrottle (2s) → Socket.IO → Frontend
```

### Cible (après chantier)

```
Device TCP (:5000)
    │
    ▼
server.ts — Détection protocole (7 parseurs actifs)
    │
    ├─ GT06Parser           ✅ Login 0x01 → IMEI réel, CRC16 validé
    ├─ TeltonikaParser      ✅ Codec 8/8E, handshake IMEI, CRC16
    ├─ JT808Parser          ✅ CRC BCC validé
    ├─ MeitrackParser       ✅ Checksum validé
    ├─ WialonIpsParser      ✅ CRC16 validé
    ├─ TextProtocolParser   ✅ bounds check
    └─ TextExtendedParser   ✅ bounds check
    │
    ▼
Rate Limiter IMEI     ✅ max 10 paquets/sec par IMEI
    │
    ▼
validateGpsData()     ✅ lat∈[-90,90], lng∈[-180,180], speed∈[0,400], heading∈[0,360]
    │
    ▼
Anti-drift filter     ✅ speed=0 + dist<50m + ts<30s → ignoré
    │
    ▼
CacheService (Redis)  ✅ IMEI → Véhicule
    │
    ▼
positionBuffer        ✅ Batch + WAL disque si DB down
    │
    ▼
FuelService           ✅ Alpha smoothing configurable par véhicule
    │
    ▼
RuleEvaluationService ✅ Alertes en temps réel
    │
    ▼
socketThrottle (2s) → Socket.IO → Frontend
    │
    ▼
Admin: /api/admin/gps-stats ✅ Métriques parseurs en temps réel
```

---

## 2. BUGS CRITIQUES IDENTIFIÉS

### BUG P0-001 — GT06 IMEI hardcodé ⛔ BLOQUANT

- **Fichier :** `backend/src/gps-server/parsers/gt06.ts:104`
- **Impact :** Tous les boîtiers GT06 retournent `imei: 'GT06-DEVICE'` → collision de données → impossible de distinguer les véhicules
- **Root cause :** Le login packet GT06 (protocol byte `0x01`) qui transmet l'IMEI en BCD n'est pas géré
- **Fix :** Implémenter handler `0x01`, lire 8 bytes BCD → 15 chiffres IMEI, stocker dans `socketImeiMap: WeakMap<Socket, string>`, récupérer sur les packets GPS suivants
- **Statut :** ✅ CORRIGÉ (2026-04-03)

### BUG P0-002 — Parseurs Teltonika/Meitrack/WialonIPS non branchés ⛔ BLOQUANT

- **Fichier :** `backend/src/gps-server/server.ts:22`
- **Impact :** Boîtiers FMB120, FMB920 (Teltonika), MT-series (Meitrack), Wialon-compatible = 0 données reçues
- **Root cause :** `const parsers = [TextProtocol, TextExtended, JT808, GT06]` — 3 parseurs existants jamais importés
- **Fix :** Importer et ajouter TeltonikaParser, MeitrackParser, WialonIpsParser dans le tableau
- **Statut :** ✅ CORRIGÉ (2026-04-03)

### BUG P0-003 — Aucune validation des données GPS ⛔ CRITIQUE

- **Impact :** Coordonnées lat=999, speed=-50 acceptées et stockées → corruption analytics
- **Fix :** `validateGpsData()` centralisée — rejet et log de tout paquet hors bornes
- **Statut :** ✅ CORRIGÉ (2026-04-03)

### BUG P0-004 — CRC jamais validé (tous protocoles) ⛔ CRITIQUE

- **Impact :** Paquets corrompus (bruit réseau, coupures TCP) stockés comme données valides
- **Fix :** CRC16 IBM pour GT06, CRC BCC pour JT808, CRC16 pour Teltonika, checksum Meitrack
- **Statut :** ✅ CORRIGÉ (2026-04-03)

### BUG P0-005 — GT06 mauvais algorithme CRC ⛔ BLOQUANT (découvert session 2)

- **Symptôme :** 100% des paquets en `CRC mismatch warn` malgré la validation — données correctement parsées mais 0 fiabilité CRC
- **Root cause :** Code utilisait CRC-16/Modbus (poly `0xA001`, init `0xFFFF`) alors que les Concox/JimiIoT utilisent **CRC-16/ISO-HDLC** (poly `0x8408`, init `0xFFFF`, xorout `0xFFFF`)
- **Investigation :** Force brute sur 65535 polynômes → seul `0x8408` match les 3 paquets de test simultanément
- **Fix VPS :** `gt06.js` — `0xA001` → `0x8408` + xorout `0xFFFF`
- **Statut :** ✅ CORRIGÉ EN PROD (2026-04-03 session 2)

### BUG P0-006 — Anti-drift filtre données sans bloquer l'insertion ⛔ BLOQUANT (découvert session 2)

- **Symptôme :** Filtre stationnaire présent mais inefficace — zéro `distanceDelta` sans `return` → position toujours insérée
- **Fix VPS :** `positionWorker.js` — ajout `return` précoce si `speed < 2 AND dist < 50m AND time < 30s`
- **Statut :** ✅ CORRIGÉ EN PROD (2026-04-03 session 2)

### BUG P1-001 — Pas de rate-limiting par IMEI ⚠️ IMPORTANT

- **Impact :** Un boîtier défectueux (ou attaquant) peut inonder la DB
- **Fix :** `imeiRateLimiter` Map — sliding window 1s, max 10 paquets, rejet silencieux au-delà
- **Statut :** ✅ CORRIGÉ (2026-04-03)

### BUG P1-002 — positionBuffer perd les données si DB down ⚠️ IMPORTANT

- **Impact :** Perte de toutes les positions lors d'une coupure PostgreSQL
- **Fix :** Write-ahead log sur disque (`backend/logs/positions.wal`), replay automatique à la reconnexion
- **Statut :** ✅ CORRIGÉ (2026-04-03)

### BUG P1-003 — Alpha smoothing carburant trop conservateur

- **Alpha = 0.2 :** 5 lectures nécessaires pour atteindre 90% de la valeur réelle → masque les vols rapides
- **Fix :** Alpha configurable par véhicule (`vehicle.fuelSmoothingAlpha`, défaut 0.3)
- **Statut :** ✅ CORRIGÉ (2026-04-03)

### BUG P2-001 — Onglet monitoring GPS absent pour le staff

- **Impact :** Impossible pour le staff de voir si un parseur fonctionne, taux d'erreurs, IMEI inconnus
- **Fix :** Section "Pipeline GPS" dans MonitoringView + onglet DEVICE_HEALTH dans DeviceConfigPanel
- **Statut :** ✅ CORRIGÉ (2026-04-03)

---

## 3. PROGRESSION DU CHANTIER

### Phase 1 — Corrections critiques backend (P0/P1)

| Tâche                                     | Fichier                                       | Statut  |
| ----------------------------------------- | --------------------------------------------- | ------- |
| GT06 login packet + IMEI extraction       | `backend/src/gps-server/parsers/gt06.ts`      | ✅ Fait |
| GT06 CRC16 validation                     | `backend/src/gps-server/parsers/gt06.ts`      | ✅ Fait |
| Teltonika parser (Codec 8/8E + handshake) | `backend/src/gps-server/parsers/teltonika.ts` | ✅ Fait |
| Meitrack parser (checksum)                | `backend/src/gps-server/parsers/meitrack.ts`  | ✅ Fait |
| WialonIPS parser (CRC16)                  | `backend/src/gps-server/parsers/wialonIps.ts` | ✅ Fait |
| Brancher les 3 parseurs dans server.ts    | `backend/src/gps-server/server.ts`            | ✅ Fait |
| validateGpsData() centralisée             | `backend/src/gps-server/server.ts`            | ✅ Fait |
| Rate limiter par IMEI                     | `backend/src/gps-server/server.ts`            | ✅ Fait |
| Types GpsData + GpsParser                 | `backend/src/gps-server/types.ts`             | ✅ Fait |
| Utils (Haversine, BCD, CRC16)             | `backend/src/gps-server/utils.ts`             | ✅ Fait |

### Phase 2 — Qualité et résilience

| Tâche                          | Fichier                                         | Statut            |
| ------------------------------ | ----------------------------------------------- | ----------------- |
| positionBuffer + WAL disque    | `backend/src/services/positionBuffer.ts`        | ✅ Fait           |
| fuelService alpha configurable | `backend/src/services/fuelService.ts`           | ✅ Fait           |
| Anti-drift amélioré            | `backend/src/gps-server/server.ts`              | ✅ Inclus Phase 1 |
| cacheService Redis             | `backend/src/services/cacheService.ts`          | ✅ Fait           |
| socketThrottle                 | `backend/src/services/socketThrottle.ts`        | ✅ Fait           |
| metricsService (parseur stats) | `backend/src/services/metricsService.ts`        | ✅ Fait           |
| ruleEvaluationService          | `backend/src/services/ruleEvaluationService.ts` | ✅ Fait           |

### Phase 3 — Interface staff monitoring + config boîtiers

| Tâche                                      | Fichier                                                    | Statut  |
| ------------------------------------------ | ---------------------------------------------------------- | ------- |
| Routes /api/admin/gps-stats                | `backend/src/routes/deviceRoutes.ts`                       | ✅ Fait |
| Route /api/admin/devices/:imei/diagnostics | `backend/src/routes/deviceRoutes.ts`                       | ✅ Fait |
| DeviceConfigPanel — onglet DEVICE_HEALTH   | `features/admin/components/panels/DeviceConfigPanelV2.tsx` | ✅ Fait |
| MonitoringView — section Pipeline GPS      | `features/tech/components/monitoring/MonitoringView.tsx`   | ✅ Fait |

### Phase 3b — Identification variantes GT06 (session 2)

| Tâche                                         | Fichier/Cible                                              | Statut               |
| --------------------------------------------- | ---------------------------------------------------------- | -------------------- |
| Migration `gt06_variant` sur table `devices`  | DB VPS                                                     | ✅ Fait              |
| `socketVariantMap` WeakMap par socket         | `dist/gps-server/parsers/gt06.js` VPS                      | ✅ Fait              |
| `crc16Ibm()` + `detectVariantFromCrc()`       | `dist/gps-server/parsers/gt06.js` VPS                      | ✅ Fait              |
| `verifyShortCrc` adaptatif (ISO-HDLC vs IBM)  | `dist/gps-server/parsers/gt06.js` VPS                      | ✅ Fait              |
| Persistance variant en DB au login            | `dist/gps-server/parsers/gt06.js` VPS                      | ✅ Fait              |
| `GET /api/devices/:imei/diagnostics`          | `dist/controllers/deviceController.js` VPS                 | ✅ Fait              |
| `PATCH /api/devices/:imei/variant` (override) | `dist/controllers/deviceController.js` VPS                 | ✅ Fait              |
| UI badge variant + dropdown + save            | `features/admin/components/panels/DeviceConfigPanelV2.tsx` | ✅ Fait (local)      |
| Balise test 864943045469604 → CONCOX          | DB VPS `devices.gt06_variant`                              | ✅ Confirmé 14:01:23 |

### Phase 4 — Frontend précision

| Tâche                                                     | Fichier                                                                        | Statut        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------- |
| **A** Fix timestamps alertes (`created_at` → `createdAt`) | `dist/repositories/alertRepository.js` VPS                                     | ✅ Fait       |
| **B** Unifier endpoints history snapped                   | Backend déjà unifié (même handler `/objectController.getObjectHistorySnapped`) | ✅ Backend OK |
| **C1** Emit per-vehicle Socket.IO room                    | `dist/services/socketThrottle.js` VPS                                          | ✅ Fait       |
| **C2** Handler `join:vehicle` + `leave:vehicle`           | `dist/socket.js` VPS                                                           | ✅ Fait       |

---

## 4. PROTOCOLES GPS SUPPORTÉS

| Protocole                | Parser     | IMEI                | CRC                                      | Commandes                              | Boîtiers types                           |
| ------------------------ | ---------- | ------------------- | ---------------------------------------- | -------------------------------------- | ---------------------------------------- |
| **GT06/Concox**          | ✅ Complet | ✅ Login 0x01 BCD   | ✅ CRC16 ISO-HDLC (Concox) / IBM (Coban) | CUT_ENGINE, RESTORE, APN, SERVER, PING | JimiIoT, X3, GT800 (variant à confirmer) |
| **Teltonika Codec 8/8E** | ✅ Complet | ✅ Handshake ASCII  | ✅ CRC16                                 | CUT_ENGINE, RESTORE, APN, getstatus    | FMB120, FMB920, FMB002                   |
| **JT808**                | ✅ Actif   | ✅ BCD              | ✅ XOR BCC                               | —                                      | Boîtiers standards CN                    |
| **Meitrack**             | ✅ Actif   | ✅ Texte CSV        | ✅ Checksum hex                          | —                                      | MT-series                                |
| **Wialon IPS**           | ✅ Actif   | ✅ Login #L#        | ✅ CRC16                                 | —                                      | Compatible Wialon                        |
| **Text Simple**          | ✅ Actif   | ✅ IMEI,LAT,LNG...  | —                                        | —                                      | Firmware custom                          |
| **Text Extended**        | ✅ Actif   | ✅ Key-value :::### | —                                        | —                                      | Firmware custom étendu                   |

---

## 5. MÉTRIQUES DE QUALITÉ CIBLES

| Métrique                              | Avant              | Cible                                      |
| ------------------------------------- | ------------------ | ------------------------------------------ |
| Taux de paquets valides acceptés      | inconnu            | > 98%                                      |
| Taux de paquets corrompus rejetés     | 0% (tous acceptés) | 100% des CRC invalides                     |
| Latence position → frontend           | < 3s               | < 2s                                       |
| Perte données lors DB down            | 100%               | 0% (WAL)                                   |
| Boîtiers GT06 distincts identifiables | 0 (collision IMEI) | 100%                                       |
| Boîtiers Teltonika opérationnels      | 0                  | 100%                                       |
| Visibilité pipeline staff             | 0                  | Temps réel (parseur, erreurs, paquets/min) |

---

## 6. TESTS DE VALIDATION

```bash
# Test 1 — GT06 IMEI extraction
# Connecter boîtier GT06 → vérifier log:
[GT06] Login packet 0x01 received, IMEI: 123456789012345
[GT06] GPS fix received for IMEI: 123456789012345, lat: 5.34, lng: -4.01

# Test 2 — Validation coordonnées
# Envoyer paquet text: "123456789012345,999,0,0,0,0"
[GPS] Invalid GPS data rejected for IMEI 123456789012345: lat 999 out of range [-90, 90]

# Test 3 — Rate limiting
# Script: for i in {1..20}; do echo "IMEI,LAT,LNG,0,0,0" | nc localhost 5000; done
[GPS] Rate limit exceeded for IMEI 123456789012345: 15 packets/sec > max 10

# Test 4 — Teltonika handshake
# Envoyer "000F313233343536373839303132333435" (IMEI ASCII)
[TELTONIKA] IMEI received: 123456789012345, sending ACK 01

# Test 5 — Admin monitoring
# GET /api/admin/gps-stats → {parsers: {gt06: 45, teltonika: 12, ...}, errors: 2, rate: 8.3}

# Test 6 — Device health
# GET /api/admin/devices/123456789012345/diagnostics
# → {lastFix: "2026-04-03T14:23:00Z", battery: 4150, packets_today: 1440, protocol: "GT06"}
```

---

## 7. DÉCISIONS TECHNIQUES

| Décision                                                         | Raison                                                                                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| WeakMap pour socketImeiMap + socketVariantMap (GT06 + Teltonika) | Libération automatique mémoire à la déconnexion du socket                                                                               |
| Sliding window 1s pour rate limiter                              | Pas de spike sur reconnexion (vs token bucket)                                                                                          |
| Alpha fuel smoothing configurable par véhicule                   | Comportement différent réservoirs plats vs profonds                                                                                     |
| WAL disque (JSONL) vs queue Redis                                | Redis peut être down en même temps que PG; disque toujours disponible                                                                   |
| **CRC-16/ISO-HDLC (0x8408) pour GT06 Concox**                    | Découvert par force brute sur paquets réels — Concox/JimiIoT n'utilisent PAS CRC-16/IBM contrairement à la documentation générique GT06 |
| CRC-16/IBM (0xA001) conservé pour Coban/Sinotrack                | Algorithme secondaire, sélectionné dynamiquement via `socketVariantMap`                                                                 |
| Flush WAL au démarrage + toutes les 30s                          | Récupération automatique sans intervention manuelle                                                                                     |
| Variant auto-détecté au login puis persisté                      | Zéro config manuelle pour les boîtiers connus; override UI disponible pour cas limites                                                  |
| UPDATE variant WHERE gt06_variant='GENERIC' seulement            | Ne pas écraser un override manuel du staff                                                                                              |
| Variants 86494304 + 86934304 mis à jour en masse (2 140 balises) | TAC confirmé CONCOX sur trajet réel → pas besoin d'attendre la reconnexion de chaque balise                                             |
| Filtre dedup protocole : gap < 2s ET dist < 10m → rejeté         | JimiIoT/Concox GT06 envoie parfois le même paquet deux fois en <1s — firmware connu                                                     |

---

## 8. FICHIERS CRÉÉS / MODIFIÉS

### Session 1 (2026-04-03 matin)

### Backend — Pipeline GPS

| Fichier                                          | Type        | Description                                                                 |
| ------------------------------------------------ | ----------- | --------------------------------------------------------------------------- |
| `backend/src/gps-server/types.ts`                | Nouveau     | Interfaces GpsData, GpsParser, DeviceDiagnostic, ParserMetrics              |
| `backend/src/gps-server/utils.ts`                | Nouveau     | CRC16 IBM/CCITT, Haversine, BCD, validateGpsData(), parseTime()             |
| `backend/src/gps-server/server.ts`               | Nouveau     | Pipeline complet : 7 parseurs, validation, rate-limit, WAL, Socket.IO       |
| `backend/src/gps-server/commandFactory.ts`       | Nouveau     | Génération commandes GT06/Teltonika/Meitrack/Wialon                         |
| `backend/src/gps-server/parsers/gt06.ts`         | **CORRIGÉ** | Login 0x01 + IMEI BCD + CRC16 IBM + ACK                                     |
| `backend/src/gps-server/parsers/teltonika.ts`    | Nouveau     | Codec 8/8E + handshake IMEI + CRC16/CCITT + IO elements                     |
| `backend/src/gps-server/parsers/meitrack.ts`     | Nouveau     | Format $$...\* + checksum XOR + coordonnées NMEA                            |
| `backend/src/gps-server/parsers/wialonIps.ts`    | Nouveau     | #L#/#D#/#B# + CRC16 + batch replay                                          |
| `backend/src/gps-server/parsers/textProtocol.ts` | Nouveau     | Format simple IMEI,LAT,LNG,...                                              |
| `backend/src/gps-server/parsers/textExtended.ts` | Nouveau     | Format :::key=val...###                                                     |
| `backend/src/services/positionBuffer.ts`         | **CORRIGÉ** | Batch UNNEST + WAL disque JSONL + replay automatique                        |
| `backend/src/services/fuelService.ts`            | **CORRIGÉ** | Alpha smoothing configurable + calibration + détection anomalies            |
| `backend/src/services/cacheService.ts`           | Nouveau     | Redis + fallback mémoire + TTL IMEI/vehicle/position                        |
| `backend/src/services/socketThrottle.ts`         | Nouveau     | Throttle Socket.IO 2s/véhicule configurable                                 |
| `backend/src/services/metricsService.ts`         | Nouveau     | Métriques pipeline + Prometheus optionnel                                   |
| `backend/src/routes/deviceRoutes.ts`             | Nouveau     | /gps-stats, /gps-connections, /:imei/diagnostics, /:imei/command            |
| `backend/migrations/20260403_gps_precision.sql`  | Nouveau     | Tables positions, device_commands, discovered_devices, fuel_smoothing_alpha |

### Frontend — Monitoring & Administration

| Fichier                                                    | Type    | Description                                                               |
| ---------------------------------------------------------- | ------- | ------------------------------------------------------------------------- |
| `features/admin/components/panels/DeviceConfigPanelV2.tsx` | Nouveau | Admin boîtiers : Dashboard GPS + Santé boîtier + Config globale           |
| `features/tech/components/monitoring/MonitoringView.tsx`   | Nouveau | Monitoring : Vue flotte + **Pipeline GPS** (parseurs, CRC, IMEI inconnus) |

### Documentation

| Fichier                     | Type    | Description                                  |
| --------------------------- | ------- | -------------------------------------------- |
| `CHANTIER_GPS_PRECISION.md` | Nouveau | Ce rapport — pilotage chantier GPS précision |

### Session 4 (2026-04-03 fin d'après-midi) — Récupération sources frontend

| Action                                      | Résultat                                                                                                                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extraction source maps VPS (96 `.map` Vite) | **288 fichiers TSX/TS** récupérés avec code source original                                                                                                                                  |
| Modules récupérés                           | features/crm · features/finance · features/fleet · features/map · features/settings · features/admin · features/tech · features/support · components · contexts · services · hooks · schemas |
| Dossier de destination                      | `TRACKING/recovered_vps_2026-04-03/`                                                                                                                                                         |
| Comparaison avec `sources_recovery`         | 178 fichiers présents dans VPS mais absents en local (dont `DataContext`, `AuthContext`, `App.tsx`, `Sidebar`, `Modal`, etc.)                                                                |

**État actuel du dépôt local :**

- `recovered_vps_2026-04-03/` — sources prod récupérées (à utiliser comme référence / base de fusion)
- `sources_recovery/` — snapshot antérieur partiel (295 fichiers, certains plus anciens)
- `features/admin/` + `features/tech/` — 2 fichiers modifiés ce chantier (DeviceConfigPanelV2, MonitoringView)
- Backend complet dans `backend/src/`

**Prochaine étape :** fusion `recovered_vps_2026-04-03` → racine du projet, en intégrant les modifications locales du chantier GPS, puis `deploy.ps1`.

### Session 2 (2026-04-03 après-midi) — Déployé directement sur VPS

| Fichier VPS                                                | Action                 | Description                                                                                                                                                         |
| ---------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dist/gps-server/parsers/gt06.js`                          | **Correctif critique** | CRC ISO-HDLC (0x8408 + xorout 0xFFFF) · `socketVariantMap` · `crc16Ibm()` · `detectVariantFromCrc()` · `verifyShortCrc` adaptatif · persistance variant DB au login |
| `dist/workers/positionWorker.js`                           | **Correctif critique** | Anti-drift `return` précoce (speed<2 AND dist<50m AND time<30s)                                                                                                     |
| `dist/controllers/deviceController.js`                     | Nouveau                | `getDeviceDiagnostics` · `patchDeviceVariant`                                                                                                                       |
| `dist/routes/deviceRoutes.js`                              | Nouveau                | `GET /:imei/diagnostics` · `PATCH /:imei/variant`                                                                                                                   |
| `DB devices`                                               | Migration              | Colonne `gt06_variant VARCHAR(20)` avec contrainte CHECK                                                                                                            |
| `features/admin/components/panels/DeviceConfigPanelV2.tsx` | UI (local)             | Badge variant coloré · dropdown override · API `/api/devices/:imei/diagnostics`                                                                                     |
| `dist/repositories/alertRepository.js`                     | **Correctif Ph4-A**    | Alias `created_at AS "createdAt"` — timestamps alertes camelCase                                                                                                    |
| `dist/services/socketThrottle.js`                          | **Correctif Ph4-C**    | `doEmit()` émet aussi vers room `vehicle:{vehicleId}`                                                                                                               |
| `dist/socket.js`                                           | **Correctif Ph4-C**    | Handlers `join:vehicle` (auth DB) + `leave:vehicle`                                                                                                                 |

### Session 3 (2026-04-03 après-midi) — Audit trajet + variants flotte

| Action                             | Détail                                                                              | Résultat                       |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------ |
| Audit trajet balise test           | 1 071 positions · 8h41 · Abidjan axe Est                                            | ✅ Analysé                     |
| Anti-drift efficacité              | 19.1% → 9.1% doublons (résidus = heartbeats légitimes)                              | ✅ Confirmé                    |
| Fix duplicates protocole JimiIoT   | `positionWorker.js` : filtre `gap<2s AND dist<10m`                                  | ✅ Déployé                     |
| Variants flotte — préfixe 86494304 | 1 940 balises → CONCOX                                                              | ✅ Mis à jour en DB            |
| Variants flotte — préfixe 86934304 | 200 balises → CONCOX                                                                | ✅ Mis à jour en DB            |
| Audit inventaire modèles inconnus  | X3 (86513·118 bal.) · GT800 (3515100·192 bal.) · SeeWorld S102 (35477·824 bal.)     | 🔶 Validation physique à faire |
| **Récupération sources frontend**  | 288 fichiers TSX/TS extraits des source maps prod VPS → `recovered_vps_2026-04-03/` | ✅ Fait                        |

### Balise test 864943045469604 — Commandes envoyées

| Commande        | Status                | Effet                                 |
| --------------- | --------------------- | ------------------------------------- |
| `TIMER,10,60#`  | ✅ SENT (12:51 UTC)   | Stop interval 10s (au lieu de ~60s)   |
| Variant détecté | ✅ CONCOX (14:01 UTC) | CRC ISO-HDLC confirmé, persisté en DB |

---

## 9. INSTRUCTIONS DE DÉPLOIEMENT (VPS)

```bash
# 1. Appliquer la migration SQL
psql -U trackyu -d trackyu_db -f backend/migrations/20260403_gps_precision.sql

# 2. Recompiler le backend TypeScript
cd backend && npm run build

# 3. Redémarrer le serveur GPS
pm2 restart trackyu-gps --update-env

# 4. Vérifier les logs
pm2 logs trackyu-gps | grep "\[GPS\]"

# 5. Test ping boîtier GT06
# → Vérifier dans les logs : "[GT06] Login reçu — IMEI: XXXXXXXXXXXXXXX"

# 6. Vérifier métriques pipeline
curl -H "Authorization: Bearer $TOKEN" https://trackyugps.com/api/admin/gps-stats | jq .
```

---

_Rapport généré par audit automatique TrackYu GPS Precision — 2026-04-03_
_Expert géolocalisation : Claude Sonnet 4.6_
