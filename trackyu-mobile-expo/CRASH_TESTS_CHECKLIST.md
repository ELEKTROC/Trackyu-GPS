# Crash Tests Pre-Play-Store — TrackYu Mobile

> Checklist des tests a executer sur **device Android physique** avec l'APK preview EAS.
> Objectif : valider qu'aucun scenario realiste ne produit un crash ou un etat bloque.

## Installation prealable

1. `eas build --platform android --profile preview` (APK qui tape staging)
2. Scanner le QR code depuis expo.dev et installer l'APK
3. Se connecter avec un compte de test

---

## 1. Connectivite reseau

| #   | Scenario                                         | Attendu                                                                                          |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| N1  | Login en **mode avion**                          | Message d'erreur clair, pas de crash, retry possible                                             |
| N2  | Login normal puis couper wifi/4G sur MapScreen   | OfflineBanner visible, cache vehicules affiche, WebSocket se reconnecte auto quand on remet wifi |
| N3  | Reseau lent (3G emule via dev tools Android)     | Skeleton loaders pendant >3s, pas de freeze UI                                                   |
| N4  | Wifi puis 4G (switch) en plein trajet navigation | Pas de deconnexion, WebSocket resume silencieusement                                             |
| N5  | Basculer app en arriere-plan 30 min puis revenir | Session toujours valide (ou SessionExpiredModal si > 1h)                                         |

## 2. Authentification

| #   | Scenario                                                 | Attendu                                                       |
| --- | -------------------------------------------------------- | ------------------------------------------------------------- |
| A1  | 3 mauvais mots de passe                                  | Rate limiting mobile : bouton bloque 30s, timer visible       |
| A2  | Token JWT expire manuellement (adb clear keychain)       | SessionExpiredModal apparait, re-login sans perte de contexte |
| A3  | Refresh token invalide                                   | Hard logout vers LoginScreen, pas de boucle                   |
| A4  | Login puis Logout immediat                               | Navigation vers LoginScreen, aucun crash, cache vide          |
| A5  | Biometrie : enregistrer puis supprimer empreinte Android | Fallback automatique vers email/password                      |

## 3. Donnees & UI

| #   | Scenario                                                  | Attendu                                                         |
| --- | --------------------------------------------------------- | --------------------------------------------------------------- |
| D1  | Compte CLIENT avec **0 vehicule**                         | FleetScreen vide : EmptyState avec message, pas d'ecran blanc   |
| D2  | Compte CLIENT avec **500+ vehicules**                     | FlatList fluide, scroll 60fps, pas de memory spike              |
| D3  | Recherche avec chaine vide, emoji, accents, SQL `'; DROP` | Recherche locale ok, rien n'est envoye brut au backend          |
| D4  | Tap tres rapide sur navigation (spam)                     | Pas de double-nav, pas de stack empile 50 fois                  |
| D5  | Rotation device (si supportee)                            | Layout ne casse pas (portrait verrouille d'apres app.config.js) |
| D6  | VehicleDetailScreen sur vehicule sans position GPS        | Message "Position indisponible", pas de crash Map               |
| D7  | ReportsScreen : export CSV sur 10 000 lignes              | Pas d'OOM, progress indicator, Share sheet ouvre                |
| D8  | AlertsScreen : pagination infinie jusqu'a 500 alertes     | Pas de ralentissement, memoire stable                           |

## 4. Deep linking

| #   | Scenario                                                      | Attendu                                            |
| --- | ------------------------------------------------------------- | -------------------------------------------------- |
| L1  | `trackyu://vehicle/valid-id` depuis notif push                | Ouvre VehicleDetail directement                    |
| L2  | `trackyu://vehicle/INVALID_ID`                                | Message erreur "Vehicule introuvable", retour safe |
| L3  | `trackyu://alerts` quand user pas logge                       | Redirige vers Login, puis ouvre apres login        |
| L4  | `trackyu://portal/invoice/xxx` en tant que STAFF (pas CLIENT) | Refuse ou redirige, pas de leak donnees            |
| L5  | URL malformee `trackyu://vehicle/../../admin`                 | Pas de crash, pas de traversal                     |

## 5. Permissions Android

| #   | Scenario                                                     | Attendu                                                                           |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| P1  | Refuser ACCESS_FINE_LOCATION                                 | App fonctionne sans localisation (carte afficht vehicules mais pas l'utilisateur) |
| P2  | Refuser POST_NOTIFICATIONS                                   | Pas de notifs push, pas de crash                                                  |
| P3  | Refuser permission Camera sur CreateTicket                   | Message clair, possibilite de selectionner image galerie                          |
| P4  | Retirer permission en cours d'utilisation (Settings Android) | App ne plante pas au retour                                                       |

## 6. Ressources & performance

| #   | Scenario                                          | Attendu                                                     |
| --- | ------------------------------------------------- | ----------------------------------------------------------- |
| R1  | App en arriere-plan + navigation GPS active 30min | Pas de battery drain anormal, WebSocket garde ou reconnecte |
| R2  | Ouvrir 15 ecrans puis back                        | Pas de memory leak visible (Profiler Android Studio)        |
| R3  | Device low-end (< 2 Go RAM)                       | UI acceptable, pas de crash OOM                             |
| R4  | Remplir stockage device a 99%                     | Logs Sentry OK, cache AsyncStorage ne crashe pas            |

## 7. Edge cases specifiques TrackYu

| #   | Scenario                                                 | Attendu                                    |
| --- | -------------------------------------------------------- | ------------------------------------------ |
| T1  | Replay VehicleHistoryScreen sur 24h avec 5000 points GPS | Polyline rendue, pas de freeze > 2s        |
| T2  | Immobilisation vehicule + coupure reseau au milieu       | Mutation optimistic rollback si echec      |
| T3  | Creer ticket avec 3 photos 10 Mo chacune                 | Upload multipart, progress, retry si echec |
| T4  | Switcher langue fr -> en -> es en plein ecran            | Remount propre, texte re-traduit           |
| T5  | Theme dark -> light en plein ecran                       | Transition fluide, aucun flicker           |

## 8. Sentry validation

| #   | Scenario                                                        | Attendu                                                              |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| S1  | Provoquer un crash volontaire (ex: VehicleDetailScreen?id=null) | Event Sentry recu, stack trace sans PII (pas de lat/lng/email/token) |
| S2  | Erreur reseau 500                                               | Pas de spam Sentry (filtre beforeSend code=NETWORK)                  |
| S3  | Erreur auth 401                                                 | Pas d'event Sentry (filtre code=AUTH)                                |

---

## Comment reporter

Pour chaque test : OK / KO / NON TESTE. En cas de KO : capture ecran + logcat si possible.

```
adb logcat -s ReactNativeJS:V *:E -t 1000 > crash.log
```
