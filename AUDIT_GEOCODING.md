# Audit géocodage — TrackYu Web + Mobile

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
