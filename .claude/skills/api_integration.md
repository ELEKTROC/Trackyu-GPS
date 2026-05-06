# Skill — Intégration API TrackYu

## Architecture API

- **Base URL prod** : `https://live.trackyugps.com/api/v1`
- **Base URL staging** : `https://staging.trackyugps.com/api/v1` (même backend port 3001)
- **Auth** : Bearer JWT dans le header `Authorization`
- **Format** : JSON exclusivement

## Endpoints fleet principaux

```
GET  /objects                          — liste véhicules (tenant filtré)
GET  /objects/:id                      — détail véhicule
GET  /objects/:id/history?date=YYYY-MM-DD  — historique positions du jour
GET  /objects/:id/fuel/history?duration=24h|7d|30d  — historique carburant
GET  /objects/:id/fuel/stats           — stats carburant agrégées
GET  /objects/:id/alerts               — alertes du véhicule
POST /objects/:id/fuel                 — ajouter un plein/baisse
PUT  /objects/:id/immobilize           — immobilisation
```

## Endpoints auth

```
POST /auth/login                       — login → JWT + refresh token
POST /auth/refresh                     — renouveler le JWT
POST /auth/logout                      — invalider le token
```

## Endpoints notifications

```
POST /notifications/register-device   — enregistrer token FCM (pas /token)
GET  /notifications                    — liste notifications
```

## Pattern d'appel frontend (React Query)

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['fuelHistory', vehicleId, '24h'],
  queryFn: () => api.fuel.getHistory(vehicleId, '24h'),
  enabled: !!vehicleId,
  staleTime: 30_000,
});
```

## Pattern lazy load (listes admin)

```typescript
// Ne jamais charger sans filtre posé
const { data } = useQuery({
  queryKey: ['vehicles', filters],
  queryFn: () => api.vehicles.list(filters),
  enabled: shouldLoadData, // false tant qu'aucun filtre actif
});
```

## Geocoding

```typescript
import { geocodeCoordCached } from 'utils/geocoding';
// Cache localStorage 24h, appel → /api/fleet/geocode
const address = await geocodeCoordCached(lat, lng);
```

## WebSocket (temps réel)

- Connexion Socket.io sur port 3001
- Events : `vehicle:update`, `alert:new`, `position:batch`
- Throttling côté serveur : `socketThrottle` pour éviter flood

## Gestion des erreurs

```typescript
if (!response.ok) {
  if (response.status === 401) → redirect login
  if (response.status === 403) → afficher "Accès refusé"
  if (response.status === 404) → afficher état vide
  throw new Error(`API ${response.status}`)
}
```

## Intégrations externes

- **Zoho Books** : facturation, sync via webhooks
- **Google Maps** : geocoding (CSP autorisée dans index.html)
- **FCM** : push notifications Android
- **Sentry** : monitoring erreurs mobile
