# Skill — Mobile Frontend (Expo + React Native)

## Stack

- **Expo SDK** + EAS Build (pas bare React Native)
- **Expo Router** — navigation fichier-based
- **NativeWind v4** — Tailwind CSS natif
- **Reanimated 3** — animations 60fps natif
- **@gorhom/bottom-sheet** — bottom sheets
- **react-native-maps** — carte GPS

## Localisation

```
c:/Users/ADMIN/Desktop/TRACKING/trackyu-mobile-expo/
```

**Session dédiée** — ne pas toucher depuis la session frontend web.

## Thèmes (design system)

```typescript
// 3 thèmes white label
dark   → orange #E8771A / noir / blanc  (thème User principal)
ocean  → bleu #3B82F6
light  → clair

// Hook obligatoire dans tous les composants
const { colors, theme } = useTheme();
```

Couleurs additionnelles : très légères et fonctionnelles uniquement.

## Couleurs statut véhicule (identiques au web)

```
moving  → #22c55e
idle    → #f97316
stopped → #ef4444
offline → #6b7280
```

## Données du jour

Plage : `00:00:00 → 23:59:59` (jour calendaire strict, pas glissant 24h).

## Architecture composants

```
src/
├── app/           — écrans (Expo Router)
├── components/    — composants réutilisables
├── api/           — appels API (vehicles.ts, etc.)
├── theme/         — tokens.ts, themes.ts, ThemeContext.tsx
├── hooks/         — useTheme, useAuth, etc.
└── utils/         — helpers
```

## Endpoints API utilisés

- `GET /api/v1/fleet/vehicles` — liste véhicules
- `GET /api/v1/fleet/vehicles/:id` — détail véhicule
- `GET /api/v1/fleet/vehicles/:id/subscription` — abonnement (prod)
- `POST /api/v1/notifications/register-device` — token push FCM
- WebSocket sur port 3001 — mises à jour temps réel

## Push notifications

- FCM Android via Expo Notifications
- Endpoint : `/api/v1/notifications/register-device` (pas `/token`)
- Table `push_notification_tokens` (multi-device par user)

## Refresh token

Code prêt dans `src/api/` — token JWT + refresh automatique sur 401.

## Matrice des rôles (navigation)

| Rôle                      | Accès                       |
| ------------------------- | --------------------------- |
| SUPERADMIN / ADMIN / TECH | Tout                        |
| MANAGER                   | Fleet + Alertes + Rapports  |
| USER                      | Ses véhicules + Map         |
| CLIENT                    | Lecture seule ses véhicules |

Filtrage des onglets Settings selon le rôle actif.

## Concurrent à battre

**TRAKZEE** (Smartrack Solutions) — vieux design. Benchmark : Samsara / Motive.
