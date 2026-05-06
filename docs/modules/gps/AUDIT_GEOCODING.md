# Audit géocodage — TrackYu Web + Mobile + Backend

> ⚡ **Dernière mise à jour : 2026-05-02 — Module refondu intégralement en 6 phases (1, 2, 3, G, S, H).**
> Ce qui suit jusqu'à la section **"Historique 2026-04-18"** est l'état actuel consolidé.
> Le contenu historique du 2026-04-18 (Sprint 1/2 frontend) est conservé en bas pour traçabilité.

---

## 📍 État final du module Geocoding (2026-05-02)

### Architecture en place

```
┌─────────────────────────────────────────────────────────────────┐
│  ReverseGeocodingService.resolve(lat, lng, ctx?)                │
│                                                                 │
│  1. CACHE LOOKUP spatial (geocoded_addresses table)             │
│     └─ Index buckets (lat_bucket × lng_bucket ≈ 11m)            │
│        Lookup ±1 bucket = 9 cellules max → 0.17 ms              │
│     ├─ HIT positive → retourne adresse + bump LRU par id        │
│     ├─ HIT negative (last_null_at < 7j) → retourne null direct  │
│     └─ MISS → step 2                                            │
│                                                                 │
│  2. PROVIDER CHAIN                                              │
│     ┌─ Nominatim PRIMARY (self-hosted CI dump ~50 MB PBF)       │
│     │  http://nominatim:8080 (réseau Docker interne)            │
│     │  Toggle runtime : SettingsService GEOCODING_NOMINATIM_*   │
│     │  3 statuts : success / failed / disabled                  │
│     │                                                           │
│     └─ Google FALLBACK (uniquement si Nominatim null)           │
│        Toggle runtime : GEOCODING_GOOGLE_ENABLED                │
│        3 statuts : success / failed / disabled                  │
│        Coût : 5 USD / 1000 requêtes success                     │
│                                                                 │
│  3. INSERT cache + tag provider ('nominatim'|'google'|'none')   │
│     Si null total → INSERT row avec last_null_at NOW            │
│                                                                 │
│  4. OBSERVABILITÉ                                               │
│     ├─ Prometheus : 4 metrics (requests, duration, cost, skip)  │
│     ├─ Redis HASH/ZSET (TTL 30j) : vehicle / zone / source      │
│     └─ Winston JSON logs : metric:'geocoding'                   │
└─────────────────────────────────────────────────────────────────┘
```

### Composants déployés

| Composant           | Fichier                                                                            | Rôle                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Service principal   | `trackyu-backend/src/services/ReverseGeocodingService.ts`                          | Cache spatial + provider chain + Redis tracking + logs                                              |
| Provider Nominatim  | `trackyu-backend/src/services/NominatimService.ts`                                 | Client HTTP Nominatim self-hosted, timeout 2s, parsing FR + filtre Plus Codes, `isEnabled()` toggle |
| Provider Google     | `trackyu-backend/src/services/GoogleMapsService.ts`                                | Client Google Geocoding API, `isConfigured()` (clé + toggle), parsing FR + filtre Plus Codes        |
| Metrics Prometheus  | `trackyu-backend/src/services/metricsService.ts`                                   | 4 metrics geocoding + helpers `recordGeocodingRequest/Skipped`                                      |
| Endpoint stats      | `trackyu-backend/src/routes/geocodingStatsRoutes.ts`                               | `GET /api/v1/geocoding/stats` (15+ champs) + `PATCH /providers` (toggle)                            |
| Endpoint reverse    | `trackyu-backend/src/routes/fleetRoutes.ts:122`                                    | `GET /api/v1/fleet/geocode?lat=&lng=` (rate limit 60/min/IP)                                        |
| Worker geocoding    | `trackyu-backend/src/workers/positionWorker.ts:702`                                | Filtre "Significant Points" (premier point / delta > 2 km / change statut) puis call resolve        |
| Worker trip         | `trackyu-backend/src/jobs/workers/tripWorker.ts:111`                               | Resolve start/end de chaque trip détecté                                                            |
| Script simulation   | `trackyu-backend/src/scripts/simulate-geocoding.ts`                                | 3 modes : random / `--realistic` corridors / `--replay=24h\|7d\|30d`                                |
| Migration SQL       | `trackyu-backend/migrations/20260502_geocoded_addresses_optimization.sql`          | Buckets `lat_bucket`/`lng_bucket` STORED + `last_null_at` + 2 index                                 |
| Container Nominatim | `/var/www/trackyu-gps/docker-compose.yml`                                          | `mediagis/nominatim:4.4`, dump CI, mem 1 GB, network interne                                        |
| Alertes Prometheus  | `/var/www/trackyu-gps/monitoring/prometheus/rules.yml` (groupe `geocoding_health`) | `GeocodingLowCacheHitRate` (< 75 %) + `GeocodingHighGoogleUsage` (> 10 % miss)                      |
| Storage cache       | Table `geocoded_addresses` (Postgres + TimescaleDB)                                | 16 314+ rows initial, ~85 000 ce mois (60k Nominatim + 24k null + 123 Google)                       |

### Phases livrées (chronologie 2026-05-02)

| Phase | Contenu                                                                                              | Effet mesuré                                           |
| ----- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **1** | Cache buckets `lat_bucket`/`lng_bucket` + LRU fix par id + `last_null_at` 7j                         | Lookup ×32 plus rapide (5.32 ms → 0.17 ms)             |
| **2** | Container Nominatim self-hosted CI (~20 min import OSM)                                              | Couverture 100 % Côte d'Ivoire, latence 29-99 ms       |
| **3** | Refactor `resolveFromProviders` Nominatim primary + Google fallback                                  | Coût Google ~0 € pour 95+ % du trafic CI               |
| **G** | Observabilité : 4 Prom metrics + Redis counters + endpoint `/stats` + script simulation paramétrable | Hit ratio mesurable en temps réel                      |
| **S** | Google 3-statuts (success/failed/disabled) + mode `--replay=24h\|7d\|30d` + 2 alertes Prom           | Mode replay = 97.08 % hit ratio mesuré sur prod réelle |
| **H** | Toggles runtime (PATCH `/providers`) + agrégats jour/mois (TTL Redis 30j) + `costThisMonthUSD` réel  | 9/10 items dashboard admin couverts                    |

### Métriques prod réelles (mois en cours, snapshot 2026-05-02)

```
Inserts Nominatim     :  60 168  ($0)
Inserts None (null)   :  24 173  ($0 — économisés via cache négatif)
Inserts Google        :     123  ($0.615)
─────────────────────────────────────
Total inserts mois    :  84 464

Hit ratio prod réel (replay 24h, 5000 positions) : 97.08 %
Hit ratio prod réel (replay 24h, 500 positions)  : 99.80 % (cache enrichi)
Throughput              : 376 req/s (cache 97 % hit)
Latence p50 / p95 / p99 : 2 / 6 / 20 ms
Coût Google ce mois     : $0.615 (0.14 % du trafic)
Couverture Nominatim CI : 100 % (Google jamais sollicité en pratique)
```

### Endpoints API

```
GET  /api/v1/fleet/geocode?lat=X&lng=Y       (auth + VIEW_FLEET, rate limit 60/min)
     → {address: string|null}

GET  /api/v1/geocoding/stats                  (auth)
     → {totalRequests, cacheHits, cacheMisses, cacheHitRate,
        googleSuccess/Failed/Disabled, nominatimSuccess/Failed,
        requestsToday, requestsThisMonth, costThisMonthUSD,
        zonesUniqueToday, providersEnabled, byProvider, bySource,
        topVehiclesToday[10], topZonesToday[10], inserts24hByProvider,
        insertsMonthByProvider, cacheTableSize, ...}

PATCH /api/v1/geocoding/providers              (auth + MANAGE_SETTINGS)
     Body : {nominatim?: bool, google?: bool}
     → {ok: true, updates, providersEnabled}
```

### Mode d'emploi opérationnel

```bash
# Voir les stats live (depuis browser après login)
curl -H "Authorization: Bearer <TOKEN>" \
  https://live.trackyugps.com/api/v1/geocoding/stats | jq

# Couper Google fallback (cas budget zéro absolu)
curl -X PATCH https://live.trackyugps.com/api/v1/geocoding/providers \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"google": false}'

# Tester montée en charge avec corridors réalistes
docker exec trackyu-gps-backend-1 node /app/dist/scripts/simulate-geocoding.js \
  --realistic --positions=10000 --corridors=50 --vehicles=500 --spread=20 --waypoints=10

# Mesurer hit ratio prod réel sur trafic des 24h
docker exec trackyu-gps-backend-1 node /app/dist/scripts/simulate-geocoding.js \
  --replay=24h --replay-limit=5000

# Vérifier metrics Prometheus brut (interne VPS)
curl http://localhost:3001/metrics | grep -E "^(geocoding|cache_operations_total\{operation=.geocoding)"

# Vérifier alertes Prometheus chargées
curl http://localhost:9090/api/v1/rules?type=alert | grep -o "Geocoding\w*" | sort -u
# → GeocodingHighGoogleUsage GeocodingLowCacheHitRate

# Étendre couverture géo (post KVM2)
# 1. Modifier /var/www/trackyu-gps/docker-compose.yml :
#    PBF_URL: https://download.geofabrik.de/africa-latest.osm.pbf  (3-4 GB)
# 2. docker compose up -d nominatim --force-recreate
# 3. Attendre import (1-3h selon dump size)
```

### Toggles runtime — table `system_settings`

| Clé                           | Default | Effet si `false`                                                                |
| ----------------------------- | ------- | ------------------------------------------------------------------------------- |
| `GEOCODING_NOMINATIM_ENABLED` | `true`  | Skip Nominatim → fallback direct Google                                         |
| `GEOCODING_GOOGLE_ENABLED`    | `true`  | Skip Google → si Nominatim aussi disabled, `resolve()` retourne null + log warn |

### Alertes Prometheus

| Alerte                     | Seuil                     | Floor volume     | Délai déclenchement |
| -------------------------- | ------------------------- | ---------------- | ------------------- |
| `GeocodingLowCacheHitRate` | hit ratio < 75 %          | > 0.5 req/s      | 15 min              |
| `GeocodingHighGoogleUsage` | > 10 % des miss en Google | > 0.5 req/s miss | 15 min              |

Inactive en prod nominale (hit ratio prod = 97 %, Google = 0.14 %).

### Backups conservés sur VPS (pour rollback safe)

- `/tmp/geocoded_addresses_backup_20260502.sql` (16314 rows table cache, 4.6 MB)
- `/var/www/trackyu-gps/backend/dist.bak-20260502` (code Phase 0 = avant Phase 1)
- `/var/www/trackyu-gps/backend/dist.bak-20260502-phase3` (code Phase 1 = avant Phase 3)
- `/var/www/trackyu-gps/backend/dist.bak-S` (code avant Session S)
- `/var/www/trackyu-gps/backend/dist.bak-H` (code avant Session H)
- `/var/www/trackyu-gps/docker-compose.yml.bak-20260502` + `.bak-20260502-phase3`
- `/var/www/trackyu-gps/.env.bak-20260502` (avant ajout `NOMINATIM_PASSWORD`)
- `/var/www/trackyu-gps/monitoring/prometheus/rules.yml.bak-20260502`

### Limites restantes (non bloquantes)

1. **Limite par véhicule** non implémentée (#8 dashboard demandé). Observable via `topVehiclesToday[10]` mais pas de plafond enforce. À arbitrer après 24 h de mesure réelle.
2. **Couverture géographique** = Côte d'Ivoire seule. Hors-CI (Lomé, Lagos, Accra, etc.) → null. Plan : étendre à Afrique de l'Ouest une fois KVM2 actif (~mai 2026).
3. **Counters Prometheus du script de simulation** isolés du backend principal (process séparé). Pour mesurer un effet sur les compteurs réels, utiliser le mode `--replay` qui passe par le service partagé.
4. **Pas de runbook pour les 2 nouvelles alertes** Prometheus. À ajouter dans `monitoring/runbooks/Geocoding*.md`.
5. **Clé Google REST 0 success en pratique** (probable quota limité ou service non activé sur la clé). À investiguer si on veut vraiment du fallback opérationnel — pour l'instant le filet est inutile car Nominatim couvre 100 %.
6. **`projectedMonthlyCostUSD` cumul Counter Prometheus** n'est pas une projection mensuelle robuste (reset à chaque restart backend). Pour la vraie projection, utiliser `costThisMonthUSD` qui lit la DB.

### Documents liés

- [`CHANGELOG.md`](../../design-system/CHANGELOG.md) — entries Session 10 / 10 G / 10 S / 10 H (2026-05-02)
- [`memory/project_geocoding_done.md`](../../../../.claude/projects/c--Users-ADMIN-Desktop-TRACKING/memory/project_geocoding_done.md) — référence permanente
- [`memory/project_kvm2_migration.md`](../../../../.claude/projects/c--Users-ADMIN-Desktop-TRACKING/memory/project_kvm2_migration.md) — contexte de la croissance attendue mai 2026
- [`.claude/skills/data_ingestion.md`](../../../.claude/skills/data_ingestion.md) — section "Reverse geocoding" + `Tester la montée en charge`

---

## 📜 Historique 2026-04-18 — Audit initial Sprint 1/2 frontend

> Cette section précède la refonte 2026-05-02. Conservée pour traçabilité.
> Le Sprint 3 backend qu'elle mentionnait comme "non livré" est désormais largement dépassé par les Phases 1-H ci-dessus.

> Date : 2026-04-18
> Périmètre : affichage des adresses dans l'app Web (`features/`) et Mobile (`trackyu-mobile-expo/src/`)
> Objectif : permettre à l'utilisateur d'avoir une idée précise de la localisation d'un véhicule **avant** d'ouvrir la carte.

---

## Chaîne actuelle

```
┌──────────────────────────────────────────────────────────────┐
│  Backend (VPS — dist canonique, non modifiable en local)     │
│  ├─ ReverseGeocodingService.resolve(lat, lng) → Nominatim    │
│  ├─ Alimente vehicle.address sur snapshot position           │
│  └─ Endpoint GET /fleet/geocode?lat=&lng= → { address }      │
└──────────────────────────────────────────────────────────────┘
        ▲                               ▲
        │                               │
┌────────────────────┐        ┌─────────────────────────┐
│   Web              │        │   Mobile                │
│   ─────            │        │   ──────                │
│ • fetch /fleet/    │        │ • vehiclesApi.geocode   │
│   geocode (lazy)   │        │   Coord() (lazy)        │
│ • Nominatim direct │        │ • address poussé dans   │
│   (MapView geocode │        │   Vehicle depuis socket │
│   Address L1020)   │        │                         │
└────────────────────┘        └─────────────────────────┘
```

---

## État des lieux par écran

### Web

| Écran                    | Fichier                                            | Ligne      | Comportement                                                | Verdict                                            |
| ------------------------ | -------------------------------------------------- | ---------- | ----------------------------------------------------------- | -------------------------------------------------- |
| Map — popup sidebar      | `features/map/components/MapView.tsx`              | L2471-2472 | `{v.address \|\| v.geofence}`                               | ✅ OK                                              |
| Map — popup STOP/IDLE    | `features/map/components/MapView.tsx`              | L240-287   | Lazy `/fleet/geocode` + placeholder "📍 Géocodage…"         | ✅ OK (référence)                                  |
| Map — recherche adresse  | `features/map/components/MapView.tsx`              | L1042-1073 | Nominatim direct (pas backend)                              | 🟠 bypass cache backend                            |
| Map — `geocodeAddress()` | `features/map/components/MapView.tsx`              | L1020-1040 | Nominatim direct + cache mémoire 200 entrées                | 🟠 défini mais jamais appelé (M17 audit précédent) |
| Fleet — table            | `features/fleet/components/FleetTable.tsx`         | L1549      | `vehicle.address \|\| vehicle.geofence \|\| 'Lieu inconnu'` | ✅ OK                                              |
| Fleet — detail panel     | `features/fleet/components/VehicleDetailPanel.tsx` | L619-622   | `address \|\| geofence \|\| ...`                            | ✅ OK                                              |
| Replay — tableau STOPS   | `features/map/components/ReplayControlPanel.tsx`   | L184       | `GeocodedCell` lazy `/fleet/geocode`                        | ✅ OK                                              |

### Mobile

| Écran                             | Fichier                    | Ligne                 | Comportement                                              | Verdict                               |
| --------------------------------- | -------------------------- | --------------------- | --------------------------------------------------------- | ------------------------------------- |
| Map — carte sélection véhicule    | `MapScreen.tsx`            | L281-286 + L1044-1050 | Lazy `geocodeCoord`, affiché dans bottom card             | ✅ OK                                 |
| Map — liste véhicules filtrée     | `MapScreen.tsx`            | (N/A)                 | **Pas d'adresse affichée**                                | 🟠 acceptable (liste compacte)        |
| Fleet — card véhicule             | `FleetScreen.tsx`          | L448-455              | `v.address ?? "lat.toFixed(4), lng.toFixed(4)"`           | 🔴 **coords brutes si pas d'address** |
| Fleet — sheet "Voir sur la carte" | `FleetScreen.tsx`          | L242-244              | `vehicle.address ?? undefined`                            | 🟠 rien si absent                     |
| Vehicle Detail                    | `VehicleDetailScreen.tsx`  | L1300                 | `vehicle.address \|\| '–'`                                | 🔴 **"–" si pas d'address**           |
| Dashboard Client — liste          | `DashboardScreen.tsx`      | L2740-2745            | `{v.address && <adresse>}` (affiche seulement si présent) | 🟠 silencieux si absent               |
| History — StopCard                | `VehicleHistoryScreen.tsx` | L862-890              | Lazy `geocodeCoord` + fallback coords monospace           | ✅ OK (référence)                     |
| History — AlertCard               | `VehicleHistoryScreen.tsx` | L934-982              | Lazy `geocodeCoord` + fallback coords monospace           | ✅ OK (référence)                     |
| History — TripCard                | `VehicleHistoryScreen.tsx` | L1005+                | Lazy geocode start/end                                    | ✅ OK                                 |

---

## Problèmes identifiés

### 🔴 Bloquants UX (demande utilisateur)

**P1. FleetScreen mobile affiche des coordonnées brutes**

```tsx
// FleetScreen.tsx L452-453
{
  v.address ?? (v.latitude !== 0 || v.longitude !== 0 ? `${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}` : '–');
}
```

Quand `v.address` n'a pas encore été peuplé par le backend (nouveau véhicule, geocode backend en échec, etc.), l'utilisateur voit `5.3467, -4.0123` dans la liste. Illisible.

**P2. VehicleDetailScreen mobile affiche un dash**

```tsx
// VehicleDetailScreen.tsx L1300
<InfoRow label="Adresse" value={vehicle.address || '–'} />
```

Même scénario : pas d'adresse → tiret, alors qu'un geocode à la demande côté backend serait possible (endpoint existe et marche pour `VehicleHistoryScreen`).

**P3. Pas de fallback `geofence` sur mobile**

Le web fait `address || geofence || 'Lieu inconnu'`, donc si l'utilisateur est dans une zone nommée (Agence Cocody, Domicile Yopougon), il voit le nom du geofence. Le mobile ne teste pas ce fallback.

### 🟠 Qualité d'affichage

**P4. Format `display_name` trop long**

Nominatim renvoie : `"Rue du Commerce 12, Quartier Cocody Riviera, Abidjan, Côte d'Ivoire"`.
Avec `numberOfLines={1}` partout, on perd le quartier utile.

- Web `MapView.tsx` L1030 fait déjà : `data.display_name?.split(',').slice(0, 3).join(', ')` — à uniformiser ailleurs.
- Mobile n'a **aucun** helper de formatage.

**P5. Nominatim direct en front web**

`MapView.tsx` L1026 et L1053 appellent `https://nominatim.openstreetmap.org/...` directement :

- Bypass le cache backend Redis (si configuré)
- Rate limit Nominatim = 1 req/s par IP — si plusieurs utilisateurs sur la même IP corporate, risque de blocage
- Empêche d'ajouter un rate limiter / stats centralisées

**P6. Cache client web purement en mémoire**

`MapView.tsx` L857 `addressCache` — 200 entrées max, perdu au reload.

### 🟡 Nice-to-have

**P7. Pas d'indicateur "Géocodage en cours" sur mobile**

Le web affiche "📍 Géocodage…" pendant le fetch. Le mobile affiche soit rien, soit coords directement.

**P8. Pas de pré-fetch batch**

Ouvrir VehicleHistoryScreen déclenche N queries séquentielles (1 par stop + 1 par alert + 1 par trip). Chaque query = 1 round-trip. Un endpoint `/fleet/geocode/batch` serait utile mais requiert modification backend.

**P9. Pas de distance relative**

Plus utile pour l'utilisateur : `"500m de Agence Cocody"` plutôt que `"Rue 12, Cocody"`. Nécessite croisement avec POI/geofence, logique backend.

---

## Plan de correction

### Sprint 1 — Mobile P1/P2 — ✅ DONE (commit 255f81a, 2026-04-18)

**Livré** :

- Composant réutilisable `<GeocodedAddress lat lng fallbackAddress style numberOfLines />` dans `src/components/GeocodedAddress.tsx`
- Helpers partagés dans `src/utils/geocoding.ts` :
  - `formatShortAddress(displayName)` : 3 premiers segments Nominatim
  - `formatCoords(lat, lng)` : affichage coords 4 décimales
  - `hasValidCoords(lat, lng)` : type guard (exclut 0,0 et hors bornes)
- Intégration `FleetScreen.tsx` L448-458 : plus de coords brutes dans la liste
- Intégration `VehicleDetailScreen.tsx` L1300-1312 : prop `valueNode` ajoutée à `InfoRow`, plus de "–"
- Intégration `DashboardScreen.tsx` L2740-2750 : adresse toujours affichée (ou coords/géocodage)

**Comportement livré** :

1. Si `fallbackAddress` (backend `vehicle.address`) présent → `formatShortAddress` → affiche
2. Sinon si coords valides → lazy `vehiclesApi.geocodeCoord` via React Query (`staleTime: Infinity`, `queryKey` par lat/lng arrondis 4 décimales ≈ 10 m)
3. Pendant le fetch → "Géocodage…" italique muted
4. Si échec → coords monospace ; si pas de coords → "Localisation inconnue"

**Non livré (reporté — pas de champ `geofence` sur Vehicle mobile)** :

- Fallback sur nom de geofence (P3) — nécessite d'abord d'ajouter `geofence?: string` sur `Vehicle` mobile et de le pousser côté backend socket

### Sprint 2 — Qualité & uniformisation — ✅ DONE (commit f855018, 2026-04-18)

**Livré** :

- Cache persistant mobile : `shouldDehydrateQuery` du `PersistQueryClientProvider` ([App.tsx:170-171](trackyu-mobile-expo/src/App.tsx#L170-L171)) whitelist désormais les queries `['geocode', ...]`. Adresses survivent au redémarrage pendant 24 h (`maxAge`). Sécurité préservée : GPS/factures/tickets restent en mémoire.
- Cache persistant web : `utils/geocoding.ts` expose `geocodeCoordCached(lat, lng, headers)` — cache localStorage 24 h keyé par `lat.toFixed(4),lng.toFixed(4)`. Survit aux reloads.
- Helpers partagés web : nouveau module [utils/geocoding.ts](utils/geocoding.ts) (miroir du mobile) avec `formatShortAddress`, `formatCoords`, `hasValidCoords`, `geocodeCoordCached`.
- `GeocodedStopPopup` ([MapView.tsx:241-248](features/map/components/MapView.tsx#L241-L248)) refactoré pour utiliser `geocodeCoordCached` + `formatShortAddress`.
- Dead code supprimé : `geocodeAddress()` L1020 + state `addressCache` L857 (fonction jamais appelée, notée M17 audits antérieurs).

**Non livré (chantier Sprint 3 backend)** :

- `searchAddressLocation` ([MapView.tsx:1042](features/map/components/MapView.tsx#L1042)) laissé en direct Nominatim — forward search (adresse → coord), nécessite un endpoint backend `/fleet/geocode/search?q=...` qui n'existe pas encore. TODO ajouté dans le code.

### Sprint 3 — Backend (via script Python, hors Sprint 1/2)

**Livrables** :

- Enrichir `/fleet/geocode` pour retourner `{address, short, neighborhood, city, nearest_poi, distance_poi}`
- Endpoint batch `/fleet/geocode?coords=lat1,lng1;lat2,lng2;...`
- Cache Redis backend avec TTL 30 jours
- Endpoint `/fleet/geocode/search?q=...` pour remplacer appels Nominatim front

---

## Commits

- ✅ `0a03d91` — docs(audit): AUDIT_GEOCODING — état initial + plan (2026-04-18)
- ✅ `255f81a` — feat(mobile): GeocodedAddress component + lazy geocode fallback (Sprint 1) (2026-04-18)
- ✅ `f855018` — feat(geocoding): cache persistant web + whitelist mobile (Sprint 2) (2026-04-18)

---

## Références existantes dans le codebase à réutiliser

| Pattern                                    | Fichier / ligne                                | À extraire vers             |
| ------------------------------------------ | ---------------------------------------------- | --------------------------- |
| Lazy geocode React Query + coords fallback | `VehicleHistoryScreen.tsx` L862-890 (StopCard) | composant `GeocodedAddress` |
| Format court Nominatim                     | `MapView.tsx` L1030                            | helper `formatShortAddress` |
| Placeholder "📍 Géocodage…"                | `MapView.tsx` L277                             | composant `GeocodedAddress` |
| Fallback `address \|\| geofence`           | `MapView.tsx` L2471, `FleetTable.tsx` L1549    | composant `GeocodedAddress` |
