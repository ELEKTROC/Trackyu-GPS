# Mémo bootstrap — prochaine session sur le module Map (V2)

> Document à lire en priorité par toute session Claude qui reprend le module Map dans `trackyu-front-V2/`. Mis à jour 2026-05-01 fin de Session 9 ext. 3.

---

## 1. Contexte rapide

**Où on en est** : module Map V2 finalisé en profondeur sur 3 sessions consécutives (Session 9 + ext. + ext. 2 + ext. 3). Le pivot D12 (rewrite frontend depuis mockups Design) est terminé pour Map. La carte est en prod sur **live.trackyugps.com**, port 8082.

**Sous-modules Map traités** :

- ✅ **Carte live** — audit complet 15 gaps L1-L15, 9 traités
- ✅ **Replay** — 8 polish + audit 14 régressions GPS frontend toutes closes
- ✅ **Géofences (POI)** — CRUD complet 3 phases (mutations + carte cliquable + assignation Véhicules/Clients)
- ✅ **Alertes** — cascade smart default au mount

**Backend** : table `pois` alignée en prod le 2026-05-01 (migration jouée + colonnes `vehicle_ids[]` / `all_vehicles` / `is_shared` / `client_ids JSONB` / `all_clients` / `status`).

---

## 2. Mode de travail (règles cardinales)

### Pas-à-pas avec accord explicite

- **Jamais** de batch de plusieurs lots sans validation. Une étape, on demande l'accord, on déploie, on teste, on enchaîne.
- Avant chaque modification non triviale : poser le plan technique en court, attendre `ok` / `oui`.
- Pour les sujets ambigus (couleurs, défauts UX) : poser une question avec 2-3 options puis attendre la décision.

### Audit avant code (éviter les doublons)

- **Toujours** `Grep` ou `Read` avant de créer un nouveau composant — un primitive ou un hook similaire existe peut-être déjà.
- Liste des primitives `src/components/ui/` à vérifier en premier.
- Hooks existants : `useFleetVehicles`, `useVenteClients`, `useReplayData`, `useReverseGeocode`, `useDayTrack`, `usePoi`, `useCreatePoi/Update/Delete`, `useMapVehicles`, `useSocketStatus`, `useAlerts`, `useVehicleActivity/Fuel/Alerts/Maintenance/Detail`.

### Règles de couleurs statut véhicule (CARDINALES)

```
moving  → #22c55e  (vert)
idle    → #f97316  (orange)         ⚠ jamais var(--clr-caution) sur la carte
stopped → #ef4444  (rouge)
offline → #6b7280  (gris)
```

La constante `STATUS_COLOR` dans `GoogleMapView.tsx:767` est la **source de vérité**. Tout `MAP_STATUS` ou similaire ailleurs doit s'y aligner.

### Workflow déploiement

- **Frontend V2** : `cd trackyu-front-V2 && npm run build` puis `powershell -File ./deploy-v2.ps1 -nobuild` (on est dans `TRACKING/`)
- **Backend** : `cd trackyu-backend && npm run build` puis `deploy.ps1 -backend -nobuild -force` ⚠ **TOUJOURS `-force`** (mode delta corrompt les fichiers, incident 2026-04-30)
- **Migration SQL** : backup pg_dump d'abord, puis exécution via `docker exec -i trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db < migration.sql`
- **Aucun staging V2 dédié** — on déploie directement sur `live.trackyugps.com` après validation locale

### Règles git

- `git add <fichiers spécifiques>`, jamais `git add -A` ni `git add .`
- Vérifier `git diff --cached --name-only` avant commit
- Ne **jamais** commit sans accord explicite utilisateur

---

## 3. Fichiers à lire en priorité

### Bootstrap obligatoire

1. `CLAUDE.md` (auto-loaded racine) — règles permanentes
2. `docs/design-system/STATE.md` — état temps réel
3. `docs/design-system/CHANGELOG.md` — entrées Session 9 ext. / ext. 2 / ext. 3 (les 3 plus récentes)
4. **Ce fichier** (`CONTEXTE_SESSION_SUIVANTE_MAP.md`)

### Spécifiques module Map

| Fichier                                                                     | Rôle                                                                                                                    |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/features/map/MapPage.tsx`                                              | Page principale (1900+ lignes) — 4 onglets : ViewLive / ViewReplay / ViewGeofences / ViewAlerts + VehicleDetailPanel    |
| `src/components/map/GoogleMapView.tsx`                                      | Composant carte live (700+ lignes) — markers + clusterer + InfoWindows + polylines + heatmap + géofences + LabelOverlay |
| `src/components/map/ReplayMapView.tsx`                                      | Composant carte replay                                                                                                  |
| `src/components/map/speedSegments.ts`                                       | Helper partagé `buildSpeedSegments` + couleurs vitesse                                                                  |
| `src/features/map/useDayTrack.ts`                                           | Hook factorisé snapshot serveur + buffer extension live                                                                 |
| `src/features/map/useMapData.ts`                                            | WebSocket socket.io → patch livePos → merge Vehicle                                                                     |
| `src/features/map/useReplayData.ts`                                         | Lecture `/history/snapped?date=` ou `?startTime=&endTime=`                                                              |
| `src/features/map/replayStops.ts` / `replayEvents.ts` / `replayTimeline.ts` | Algos client-side replay                                                                                                |
| `src/features/map/replayExport.ts`                                          | GPX/KML/CSV                                                                                                             |
| `src/features/map/PoiFormModal.tsx`                                         | Modale CRUD géofence avec MiniMapPicker + MultiSelectChips                                                              |
| `src/features/map/VehicleCombobox.tsx`                                      | Combobox replay avec favoris localStorage                                                                               |
| `src/features/map/LiveSidebar.tsx`                                          | Sidebar gauche carte live                                                                                               |
| `src/features/settings/useSettingsData.ts`                                  | `usePoi` + mutations CRUD POI (`useCreatePoi/Update/Delete`)                                                            |

### Backend

- `trackyu-backend/src/routes/poiRoutes.ts` — CRUD POI
- `trackyu-backend/src/schemas/index.ts:483` — `PoiSchema` Zod (status FR `'Actif'|'Inactif'`)
- `trackyu-backend/migrations/20260501_pois_alignment_and_assignment.sql` — migration récente

---

## 4. Chantiers restants

### Carte live (gaps audit non traités)

- **L6** Heatmap historique 7j — aujourd'hui basée sur positions courantes. Nécessite endpoint backend `/positions/heatmap?days=7` à créer.
- **L7** `showAll = false` par défaut → 0 markers à l'arrivée sur la carte. Choix produit à arbitrer (Wialon affiche tout par défaut).
- **L10** Trail mode multi-véhicules — buffer derniers N min pour TOUS les véhicules visibles. Effort moyen, attention perfs >100 véhicules.
- **L11** Dead-reckoning client — interpolation entre 2 events socket via heading/speed pour donner l'impression de mouvement continu. Risqué : faux positifs possibles.
- **L14** Perf clusterer — `clearMarkers + addMarkers` à chaque update. À mesurer avant d'optimiser.
- **L15** Keyboard nav sidebar — Tab/Enter A11Y.

### Replay

- **R2** Multi-jours — date range picker + extension `useReplayData` startTime/endTime + adaptation slider/charts.
- **Stop/Idle distinction** — nécessite que le backend expose `ignition` (`raw_data.acc`) dans `/history/snapped` (aujourd'hui pas exposé, on utilise une heuristique durée).

### Backend (hors scope frontend)

- **Moteur d'évaluation géofence** — `GEOFENCE_RESTRICTION` n'est qu'un commentaire dans `ruleEvaluationService.ts:14`. Aucune logique point-in-polygon / radius. Les entrées/sorties POI ne sont pas calculées aujourd'hui.
- **Permissions** — `/monitoring/gps-*` et `/devices/:imei/variant` nécessitent `VIEW_GPS_METRICS` / `EDIT_DEVICE_VARIANT` (R13 audit initial, hors-scope frontend).

### Modules autres que Map

- **Fleet, Stock, CRM/Prévente, Vente, Compta, Tech, Support, Settings, Admin, Reports, Agenda, Monitoring** : aucun audit en profondeur n'a été fait après leur livraison initiale Phase 4.2. Possibles trous fonctionnels.

---

## 5. Erreurs à NE PAS commettre (retour d'expérience)

### 🔴 Décalage code ↔ prod

**Vécu** : audit `pois` a révélé que `poiRoutes.ts` insérait `is_shared`, `client_ids`, `all_clients`, `status` qui **n'existaient pas** dans la table prod (table vide → planterait dès la 1ʳᵉ création).
**Règle** : avant de coder un CRUD frontend, **vérifier en prod** la structure réelle de la table cible :

```bash
ssh root@148.230.126.62 "docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -c '\d <table>'"
```

### 🔴 CSS vars dans SVG path Google Maps

**Vécu** : `MAP_STATUS.idle.color = 'var(--clr-caution)'` passé à `buildMarkerIcon().fillColor` → Google Maps **ne résout pas** les CSS vars dans les attributs SVG passés via JS. Comportement indéfini.
**Règle** : ne jamais passer `var(--xxx)` directement à un attribut Google Maps (`fillColor`, `strokeColor`, etc.). Utiliser une string hex `#XXXXXX`.

### 🔴 Backend `deploy.ps1` sans `-force`

**Vécu** : incident prod 502 ~5 min le 2026-04-30 — mode delta corrompt les fichiers (`tar: missed writing 8329 bytes`), `.js` à 0 byte.
**Règle** : `deploy.ps1 -backend -nobuild -force` **toujours**. Mémoire `feedback_deploy_backend_force.md`.

### 🔴 Status frontend ↔ backend convention

**Vécu** : Zod backend `PoiSchema` accepte `'Actif'|'Inactif'` (FR), mais frontend V2 envoyait `'active'|'inactive'`. Mismatch silencieux.
**Règle** : convention projet est **FR pour les statuts métier** (cohérent avec `alert_configs`, `schedule_rules`). Mapping aux frontières dans le hook (`useSettingsData.ts:poiInputToPayload`).

### 🟠 Default au mount qui surprend l'utilisateur

**Vécu** : tentative auto-default `Critiques` sur ViewAlerts → 0 critiques sur compte normal → page vide.
**Règle** : jamais de hardcode défaut. Cascade conditionnelle (Critiques > Hautes > Total) avec fallback page non-vide. Ref `cascadeAppliedRef` pour ne pas re-déclencher après que l'utilisateur a touché.

### 🟠 Marker `title` redondant avec étiquettes custom

**Vécu** : tooltip OS blanc rectangle apparaît au hover prolongé en doublon avec mini-card.
**Règle** : si on a une mini-card hover (étiquette 2) ou une étiquette permanente (étiquette 1), **ne pas** mettre `title:` au constructeur Marker.

### 🟠 Cleanup au démontage (Google Maps)

**Vécu** : overlays HTML restaient au DOM si non `setMap(null)`, listeners `position_changed` accumulés.
**Règle** : à chaque marker créé, lister tout ce qui doit être cleané. À chaque marker supprimé du `Map`, exécuter `setMap(null)` + `listener.remove()` pour TOUS les éléments associés.

### 🟠 Sandbox SSH

**Vécu** : agent backend lancé en background a été refusé par la sandbox sur `ssh root@...`.
**Règle** : agent backend = scission. Lui fait les fichiers (migration SQL + patches), moi (utilisateur) exécute le déploiement. Ne pas tenter de faire faire le SSH à l'agent.

### 🟠 Migration : convention SQL plat

**Vécu** : pas de runner TS auto au boot. Convention TrackYu = SQL plat dans `trackyu-backend/migrations/YYYYMMDD_description.sql`, exécuté manuellement via `psql`.
**Règle** : suivre la convention. Idempotent (`IF NOT EXISTS`), `BEGIN/COMMIT`, jamais de `DROP COLUMN` sans accord explicite.

### 🟢 Étiquette 1 vs 2

**Important** : ne pas confondre. Sur la carte live :

- **Étiquette 1** = overlay HTML permanent SOUS le marker (plaque + fond statut)
- **Étiquette 2** = mini-card hover AU-DESSUS du marker (riche : plaque/alias/vitesse/adresse/lastUpdate)
- Le toggle 👁 toolbar pilote l'étiquette **1** uniquement.

### 🟢 WeakMap pour markers ↔ status

Utiliser `WeakMap<Marker, status>` (pas `Map`) pour libération automatique quand un marker est garbage-collected. Pattern dans `markerStatus` (clusterer L9).

### 🟢 i18n

Langue source = français. Toutes alertes UI dans la langue de l'utilisateur (settings) avec fallback langue tenant. Mémoire `feedback_alert_i18n.md`.

---

## 6. Compte test + accès

- **Compte superadmin** : `superadmin@trackyugps.com`
- **VPS prod** : `ssh root@148.230.126.62`
- **DB** : `docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db`
- **Backend container** : `trackyu-gps-backend-1`
- **Backend dist** : `/var/www/trackyu-gps/backend/dist/` ⚠ NE JAMAIS PATCHER directement
- **Live URL** : `live.trackyugps.com` (V2 cible définitive · port 8082)
- **Staging URL** : `staging.trackyugps.com` (legacy seulement, pas V2)

---

## 7. Métriques Map V2 actuelles (référence baseline)

- `MapPage.tsx` bundle : **180.63 kB** gzip 48.24 kB
- `GoogleMapView.tsx` : ~770 lignes
- `MapPage.tsx` : ~1990 lignes
- `PoiFormModal.tsx` : ~410 lignes
- Bundle main V2 : 467 kB gzip 150 kB
- 0 régression remontée par utilisateur Session 9 ext. 1-3

---

_Document à mettre à jour au fur et à mesure que la session avance. Si une règle est ajoutée par l'utilisateur, l'ajouter ici en priorité avant tout dans une mémoire._
