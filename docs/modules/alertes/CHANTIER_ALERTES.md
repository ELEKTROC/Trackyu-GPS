# Chantier Alertes — TrackYu GPS

**Date de rédaction :** 2026-04-08
**Dernière mise à jour :** 2026-04-08
**Statut global :** 🟢 Phases 1 et 2 complètes — système d'alertes configurables entièrement opérationnel

---

## 1. État des lieux — vérifié sur VPS (2026-04-08)

### Ce qui fonctionne aujourd'hui

| Composant                              | Statut            | Détail                                                                                 |
| -------------------------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| Table `alerts`                         | ✅ Active         | Données réelles, RLS tenant, index complets                                            |
| Alertes SPEEDING                       | ✅ Actif          | Hardcodé dans `objectRepository.js::insertSpeedAlert` — seuil fixe non configurable    |
| Alertes IMMOBILIZATION                 | ✅ Actif          | Hardcodé dans `objectRepository.js`                                                    |
| `ruleEvaluationService.js`             | ✅ Actif          | Appelé par `positionWorker.js` à chaque position GPS reçue                             |
| Moteur règles (SPEED_LIMIT, GEOFENCE…) | ✅ Actif          | Lit `schedule_rules` — toutes les règles évaluées                                      |
| `case 'FUEL_LOW'` dans moteur          | ✅ **Déployé**    | Évalue `vehicle.fuel_level <= config.minPercent` à chaque position                     |
| `case 'OFFLINE'` via scheduler         | ✅ **Déployé**    | `checkOfflineAlerts()` toutes les 15 min dans `scheduler.js` — anti-doublon 2h         |
| CRUD `/schedule-rules`                 | ✅ Routes actives | Monté dans `v1Router.js`                                                               |
| `GET/PUT /portal/alert-preferences`    | ✅ Déployé        | Endpoint dédié CLIENT — lit/écrit `schedule_rules` pour SPEED_LIMIT, FUEL_LOW, OFFLINE |
| Table `schedule_rules`                 | ✅ Opérationnelle | Alimentée via `/portal/alert-preferences`                                              |
| Table `geofences`                      | ✅ Active         | Lue par `ruleEvaluationService` pour évaluation GEOFENCE_RESTRICTION                   |
| Affichage alertes mobile               | ✅ Actif          | `AlertsScreen` — pagination, groupement, mark-read                                     |
| Affichage alertes web                  | ✅ Actif          | Console monitoring — même endpoint que mobile                                          |
| `AlertConfigModal` (mobile)            | ✅ Déployé        | ProfileScreen — sliders vitesse/carburant/offline, toggle par type                     |
| Push notifications Firebase FCM        | ✅ Actif          | `firebase-service-account.json` déployé + `FIREBASE_SERVICE_ACCOUNT` en env var docker |
| Email notifications (Resend)           | ✅ Actif          | `integration_credentials` DB — déclenché sur violation si `emailAlerts=true`           |
| SMS notifications (Orange CI)          | ✅ Actif          | `ORANGE_SMS_CLIENT_ID/SECRET` configurés — déclenché si `smsAlerts=true`               |
| In-app (Socket.IO)                     | ✅ Actif          | Émis en temps réel à chaque violation, toujours actif                                  |
| Toggle "Notifications" ProfileScreen   | ✅ Câblé          | Sync `PUT /notifications/preferences` + AsyncStorage                                   |
| `GET/PUT /notifications/preferences`   | ✅ Actif          | Préférences par utilisateur : `pushEnabled`, `emailAlerts`, `smsAlerts`, `alertTypes`  |

---

## 2. Canaux de notification — état réel

| Canal           | Provider                               | Configuré    | Déclenché automatiquement             |
| --------------- | -------------------------------------- | ------------ | ------------------------------------- |
| **Push mobile** | Firebase FCM                           | ✅           | ✅ si `pushEnabled !== false`         |
| **Email**       | Resend (via `integration_credentials`) | ✅           | ✅ si `emailAlerts === true` (opt-in) |
| **SMS**         | Orange SMS CI                          | ✅           | ✅ si `smsAlerts === true` (opt-in)   |
| **In-app**      | Socket.IO                              | ✅ permanent | ✅ toujours                           |
| **Telegram**    | —                                      | ❌           | ❌                                    |
| **WhatsApp**    | —                                      | ❌           | ❌                                    |

**Note :** Email et SMS sont opt-in — désactivés par défaut, l'utilisateur les active via `PUT /notifications/preferences { emailAlerts: true, smsAlerts: true }`.

---

## 3. Architecture dispatch — flux complet

```
Position GPS reçue
    └── positionWorker.js
            └── ruleEvaluationService.js
                    ├── Évalue schedule_rules (SPEED_LIMIT, GEOFENCE, etc.)
                    ├── INSERT INTO alerts
                    ├── Socket.IO (in-app temps réel)
                    └── Pour chaque user du tenant avec vehicleAlerts=true :
                            ├── PUSH  (si pushEnabled !== false)  → Firebase FCM
                            ├── EMAIL (si emailAlerts === true)   → Resend
                            └── SMS   (si smsAlerts === true)     → Orange SMS CI
```

---

## 4. Problème central résolu — deux systèmes parallèles

Résolu par l'approche **Option B simplifiée** : endpoint dédié CLIENT `/portal/alert-preferences`
qui écrit directement dans `schedule_rules` (le vrai moteur), sans toucher au frontend web ni à `alert_configs`.

| Système                                    | Statut                                                          |
| ------------------------------------------ | --------------------------------------------------------------- |
| `schedule_rules` + `ruleEvaluationService` | ✅ Utilisé — source de vérité                                   |
| `alert_configs`                            | Orphelin — non utilisé, non supprimé (risque de régression web) |

---

## 5. Permissions CLIENT — état réel

| Endpoint                          | Permission requise | CLIENT a ? | Résultat                                   |
| --------------------------------- | ------------------ | ---------- | ------------------------------------------ |
| `GET /monitoring/alerts`          | `VIEW_ALERTS`      | ✅         | Fonctionne                                 |
| `GET /portal/alert-preferences`   | `requireClientId`  | ✅         | **Fonctionne**                             |
| `PUT /portal/alert-preferences`   | `requireClientId`  | ✅         | **Fonctionne**                             |
| `GET /notifications/preferences`  | auth               | ✅         | Fonctionne                                 |
| `PUT /notifications/preferences`  | auth               | ✅         | Fonctionne                                 |
| `POST/PUT/DELETE /schedule-rules` | `MANAGE_FLEET`     | ❌         | Bloqué 403 — contourné via portal endpoint |

---

## 6. Types de règles supportés par ruleEvaluationService

| Type (`rule_type`)         | Config JSONB                        | Évalué                      | Notification          |
| -------------------------- | ----------------------------------- | --------------------------- | --------------------- |
| `SPEED_LIMIT`              | `{ speedLimit: { maxSpeed: 90 } }`  | ✅                          | ✅ PUSH + EMAIL + SMS |
| `GEOFENCE_RESTRICTION`     | `{ geofenceId, direction }`         | ✅                          | ✅ PUSH + EMAIL + SMS |
| `SCHEDULED_IMMOBILIZATION` | `{ startTime, endTime, days[] }`    | ✅                          | ✅ PUSH + EMAIL + SMS |
| `WORKING_HOURS`            | `{ startTime, endTime, days[] }`    | ✅                          | ✅ PUSH + EMAIL + SMS |
| `NIGHT_RESTRICTION`        | `{ startHour, endHour }`            | ✅                          | ✅ PUSH + EMAIL + SMS |
| `WEEKEND_RESTRICTION`      | `{}`                                | ✅                          | ✅ PUSH + EMAIL + SMS |
| `DISTANCE_LIMIT`           | `{ maxKm }`                         | ✅                          | ✅ PUSH + EMAIL + SMS |
| `FUEL_LOW`                 | `{ fuelLevel: { minPercent: 20 } }` | ✅ Évalué à chaque position | ✅ PUSH + EMAIL + SMS |
| `OFFLINE`                  | `{ offline: { delayMinutes: 30 } }` | ✅ Évalué toutes les 15 min | ✅ PUSH + EMAIL + SMS |

---

## 7. Roadmap restante

### Phase 3 — Améliorations UX notifications (optionnel)

- Exposer toggles `emailAlerts` / `smsAlerts` dans `AlertConfigModal` (ProfileScreen) — aujourd'hui ces préférences existent en DB mais ne sont pas accessibles depuis l'app
- Filtrage `alertTypes` dans `ruleEvaluationService` (ex : PUSH pour SPEEDING, SMS pour GEOFENCE uniquement)
- Badging iOS (géré automatiquement par expo-notifications pour l'instant)

---

## 8. Ce qu'on ne touche PAS

- Le frontend web `AlertForm.tsx` / `GeofenceForm.tsx` → risque de régression signalé
- La table `geofences` → fonctionne déjà, ne pas modifier le schéma
- `positionWorker.js` — modifier avec extrême précaution (critique production)
- Les alertes hardcodées SPEEDING dans `objectRepository.js` → à remplacer par le moteur en Phase 2

---

## 9. Fichiers clés VPS

| Fichier                                                      | Rôle                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `/dist/workers/positionWorker.js`                            | Point d'entrée — appelle ruleEvaluationService à chaque position |
| `/dist/services/ruleEvaluationService.js`                    | Moteur d'évaluation — dispatch PUSH+EMAIL+SMS sur violation      |
| `/dist/services/notificationDispatcher.js`                   | Dispatch multi-canal : EMAIL, SMS, PUSH, TELEGRAM, IN_APP        |
| `/dist/controllers/pushNotificationController.js`            | Firebase Admin SDK — envoi push                                  |
| `/dist/routes/pushNotificationRoutes.js`                     | `POST /register-device`, `GET/PUT /preferences`                  |
| `/dist/routes/portalRoutes.js`                               | `GET/PUT /portal/alert-preferences` — accès CLIENT               |
| `/var/www/trackyu-gps/backend/firebase-service-account.json` | Clé service Firebase (déployée 2026-04-08)                       |
| `/var/www/trackyu-gps/docker-compose.yml`                    | `FIREBASE_SERVICE_ACCOUNT` injecté en env var                    |

---

## 10. Risques résiduels

| Risque                                                | Impact | Mitigation                                                                                             |
| ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| Flood SMS si beaucoup de violations en rafale         | Moyen  | Anti-doublon par `(rule_id, vehicle_id)` — min 5 min dans ruleEvaluationService                        |
| Double alerte SPEEDING (hardcode + moteur)            | Moyen  | Supprimer le hardcode dans `objectRepository.js` seulement après validation moteur en prod             |
| `fuel_level` toujours à 100% en dev                   | Faible | Normal — aucun tracker connecté, sera réel en production                                               |
| Flood alertes OFFLINE en dev (1841 véhicules offline) | Moyen  | Aucune règle OFFLINE en `schedule_rules` → aucune alerte générée tant que le CLIENT n'en configure pas |

---

## 11. Résumé exécutif

| Sprint                                       | Durée    | Statut         | Livrable                                                     |
| -------------------------------------------- | -------- | -------------- | ------------------------------------------------------------ |
| Phase 1 — Endpoint CLIENT + AlertConfigModal | ~1 jour  | ✅ **Terminé** | CLIENT configure ses seuils depuis l'app                     |
| Notifications PUSH Firebase                  | ~1 heure | ✅ **Terminé** | Push actifs, Firebase Admin initialisé                       |
| Notifications EMAIL + SMS câblées            | ~1 heure | ✅ **Terminé** | Dispatch multi-canal sur violation règle                     |
| Phase 2 — Évaluation FUEL_LOW                | ~1 heure | ✅ **Terminé** | `case 'FUEL_LOW'` dans moteur + `fuel_level` passé au worker |
| Phase 2 — Évaluation OFFLINE                 | ~1 heure | ✅ **Terminé** | `checkOfflineAlerts()` dans scheduler — anti-doublon 2h      |
| Phase 3 — UX notifications                   | ~1 jour  | 🔲 Optionnel   | Toggles email/SMS dans l'app, filtrage par type d'alerte     |

---

_Rapport mis à jour le 2026-04-08 — vérifié sur VPS prod_
