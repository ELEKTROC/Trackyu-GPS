# Audit Module 4 — Map (Carte)

> Date : 2026-02-28
> Fichiers audités : 7 fichiers frontend
> Lignes analysées : ~4 155

---

## Résumé

| Sévérité | Nombre | Corrigées |
|----------|--------|-----------|
| 🔴 Critique | 6 | 1 |
| 🟠 Moyen | 21 | 13 |
| 🟡 Mineur | 14 | 0 |
| 🔵 Amélioration | 15 | 0 |
| **Total** | **56** | **14** |

### Erreurs lint réduites :
- MapView.tsx : 87 → ~50 (37 corrigées)
- GoogleMapComponent.tsx : 8 → 0
- HeatmapLayer.tsx : 1 → 0
- AnimatedVehicleMarker.tsx : 3 → 0
- ReplayControlPanel.tsx : 16 → 8

---

## Fichiers audités

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `MapView.tsx` | 2115 | Vue principale carte (Leaflet/Google, sidebar, replay, zones, alertes) |
| `ReplayControlPanel.tsx` | 1411 | Panneau replay GPS (lecture, stats, arrêts, export GPX/KML) |
| `GoogleMapComponent.tsx` | 247 | Wrapper Google Maps |
| `VehicleListCard.tsx` | 175 | Carte véhicule dans la sidebar |
| `VirtualVehicleList.tsx` | 88 | Scroll virtuel personnalisé |
| `HeatmapLayer.tsx` | 59 | Couche heatmap Leaflet |
| `AnimatedVehicleMarker.tsx` | 60 | Marqueur avec animation de position |

---

## Anomalies détectées

### 🔴 Critiques

#### C1 — MapView: 4 appels `fetch()` directs contournant `api.ts`
- **Fichiers** : `MapView.tsx` L371-404, L410-434, L709-753, L766-808
- **Impact** : `/api/fleet/stats`, `/api/settings/map-config`, `/api/fleet/vehicles/:id/history/snapped` (x2) font des `fetch()` bruts. Casse le mode mock, contourne l'intercepteur d'erreurs, ne gère pas le refresh token.
- **Pattern** : Lecture directe de `localStorage.getItem('fleet_token')` (4 occurrences) au lieu d'utiliser le service API centralisé.
- **Statut** : ⬜ Non corrigé (nécessite ajout des méthodes dans les modules `services/api/`)

#### C2 — HeatmapLayer: Import `React` manquant ✅
- **Fichier** : `HeatmapLayer.tsx` L1
- **Impact** : `React.FC` utilisé sans import React — `ReferenceError` possible en runtime.
- **Correction** : Ajouté `import React from 'react'`
- **Statut** : ✅ Corrigé

#### C3 — MapView: `(v as any)` pour accéder aux propriétés Vehicle (6+ occurrences)
- **Fichier** : `MapView.tsx` L496-525
- **Impact** : `maxSpeed`, `battery`, `fuelLevel` accédés via `(v as any)`. Contourne le typage. Si ces propriétés n'existent pas sur `Vehicle`, le code échoue silencieusement.
- **Statut** : ⬜ Non corrigé (nécessite vérification du type Vehicle)

#### C4 — MapView: `client?.company` — propriété inexistante sur Client
- **Fichier** : `MapView.tsx` L1064, L1129
- **Impact** : Erreur TypeScript — `company` n'existe pas sur le type `Client`. Le filtrage/groupement par société est cassé.
- **Statut** : ⬜ Non corrigé (nécessite vérification du type Client)

---

### 🟠 Moyens

#### Corrigés (13)

| # | Fichier | Description |
|---|---------|-------------|
| M1 | MapView L5 | Vehicle, Zone, Coordinate → type imports ✅ |
| M2 | MapView L7-11 | **17 imports Lucide supprimés** : ZoomIn, ZoomOut, Signal, Key, UserPlus, IdCard, Bell, Ticket, User, Play, Pause, FastForward, Rewind, Calendar, Clock ✅ |
| M3 | MapView L16 | `useQueryClient` inutilisé supprimé ✅ |
| M4 | MapView L21 | `VehicleListCard` import direct inutilisé + VehicleCardConfig → type ✅ |
| M5 | MapView L24 | StopEvent, SpeedEvent → type imports ✅ |
| M6 | MapView L291-315 | `generatePath` dead code (mock) supprimé ✅ |
| M7 | MapView L376 | `getVehicleHistorySnapped` inutilisé supprimé ✅ |
| M8 | MapView L395 | Catch `err` → bare catch ✅ |
| M9 | AnimatedVehicleMarker L3 | `useMap` inutilisé supprimé + variable `map` ✅ |
| M10 | AnimatedVehicleMarker L5 | Vehicle → type import ✅ |
| M11 | GoogleMapComponent L1-5 | `useMemo`, `Marker`, `renderToStaticMarkup` inutilisés supprimés + type imports ✅ |
| M12 | GoogleMapComponent L86 | Param `map` → `_map` ✅ |
| M13 | ReplayControlPanel L2-12 | Type imports + 5 Lucide inutilisés supprimés (Clock, Flag, Droplets, Check, Square) + catch `error` ✅ |

#### Non corrigés (8)

| # | Fichier | Description |
|---|---------|-------------|
| M14 | MapView L359 | `fleetStats` typé `any` |
| M15 | MapView L458 | `replayHistory` typé `any[]` |
| M16 | MapView L507 | `alertSoundRef` inutilisé |
| M17 | MapView L639 | `geocodeAddress` défini mais jamais appelé |
| M18 | MapView L649 | Geocoding Nominatim sans rate limiting |
| M19 | ReplayControlPanel L80 | `history` typé `any[]` |
| M20 | ReplayControlPanel L803 | Bouton Share sans handler |
| M21 | VirtualVehicleList L33 | `ITEM_SIZE=110` fixe — items de hauteur variable causent chevauchement |

---

### 🟡 Mineurs

| # | Fichier | Description |
|---|---------|-------------|
| m1 | MapView L1906 | "km today" → "km aujourd'hui" |
| m2 | MapView L1584 | "Offline" → "Hors ligne" |
| m3 | MapView L1153 | CENTER_LAT/LNG (5.36, -4.008) hardcodés |
| m4 | MapView L113 | `createClusterCustomIcon` param `any` |
| m5 | MapView L273 | `onNavigate` param `any` |
| m6 | AnimatedVehicleMarker L48 | Status enum affiché brut (MOVING au lieu de "En mouvement") |
| m7 | GoogleMapComponent L31 | Coordonnées Abidjan hardcodées |
| m8 | GoogleMapComponent L85 | `setTimeout(100ms)` fragile pour resize |
| m9 | ReplayControlPanel L93 | Nombres magiques (rayon terre 6371, seuils 2 min, 2 km/h) |
| m10 | ReplayControlPanel L100 | `formatDuration` dupliqué |
| m11 | ReplayControlPanel L603 | `alert()` au lieu de `useToast` |
| m12 | ReplayControlPanel L190,196 | `const` dans case sans braces (lexical declaration) |
| m13 | VehicleListCard L63 | `fuelLevel` sans null guard |
| m14 | VirtualVehicleList L34 | Nombres magiques (MAX_HEIGHT, OVERSCAN, ITEM_SIZE) |

---

### 🔵 Améliorations

| # | Description |
|---|-------------|
| a1 | MapView (2115 lignes) — candidat au splitting majeur |
| a2 | ReplayControlPanel (1411 lignes) — candidat au splitting |
| a3 | Pas de dark mode sur tuile Leaflet |
| a4 | Pas de dark mode dans le data panel ReplayControlPanel |
| a5 | Heatmap utilise seulement positions courantes (commentaire dit "7 jours") |
| a6 | Pas de `aria-label` sur boutons stats, heatmap toggle, etc. |
| a7 | Pas de navigation clavier dans la liste véhicules |
| a8 | Pas de dark mode pour Google Maps styles |
| a9 | Pas de click handler sur les zones Google Maps |
| a10 | `toLocaleTimeString` sans locale explicite dans ReplayControlPanel |
| a11 | VehicleListCard: fonctions helper recréées dans React.memo |
| a12 | Utiliser react-window au lieu du scroll virtuel custom |
| a13 | MapView: `liveAlerts.filter(...)` dans deps useEffect — computation dans deps array |
| a14 | MapView: `isDarkMode` inutilisé — devrait être utilisé pour switcher les tuiles |
| a15 | HeatmapLayer: `options` objet dans deps useEffect — nouvelle ref à chaque rendu |

---

## Corrections appliquées (14 fixes)

1. **HeatmapLayer** — Ajouté `import React from 'react'`
2. **AnimatedVehicleMarker** — Supprimé import inutilisé `useMap`, variable `map`, Vehicle → type import
3. **GoogleMapComponent** — Supprimé `useMemo`, `Marker`, `renderToStaticMarkup` + type imports + `_map` param
4. **MapView** — 17 imports Lucide inutilisés supprimés
5. **MapView** — `useQueryClient` supprimé
6. **MapView** — Vehicle/Zone/Coordinate → type imports
7. **MapView** — VehicleListCard direct import supprimé, VehicleCardConfig → type
8. **MapView** — StopEvent/SpeedEvent → type imports
9. **MapView** — `generatePath` dead code supprimé (20+ lignes de mock)
10. **MapView** — `getVehicleHistorySnapped` inutilisé supprimé
11. **MapView** — Catch `err` → bare catch
12. **MapView** — `_isDarkMode` préfixé (temporaire — devrait être réactivé)
13. **ReplayControlPanel** — 5 imports Lucide supprimés + type imports + PeriodPreset type
14. **ReplayControlPanel** — catch `error` → bare catch

---

## Prochaines étapes recommandées

1. **URGENCE** : Migrer les 4 `fetch()` directs vers `services/api/` — violation critique du pattern projet
2. **HAUTE** : Corriger `client?.company` → utiliser le bon champ du type Client
3. **HAUTE** : Supprimer les `(v as any)` en typant correctement Vehicle
4. **MOYEN** : Traduire les strings anglaises restantes ("km today", "Offline")
5. **MOYEN** : Splitter MapView.tsx (2115→ ~5 fichiers de ~400 lignes)
6. **FAIBLE** : Ajouter rate limiting au geocoding Nominatim
