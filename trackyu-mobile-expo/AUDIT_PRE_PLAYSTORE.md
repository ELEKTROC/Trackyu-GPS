# Audit pré-déploiement Play Store — TrackYu Mobile

> Date : 2026-04-17
> Périmètre : app Expo/React Native `trackyu-mobile-expo` avant build AAB production + submit Play Console
> Méthode : lecture directe des fichiers config + 2 agents en parallèle (sécurité + UX/robustesse)

---

## Verdict global

**App globalement prête pour un build AAB production**, sous réserve de corriger 3 points critiques (App Store ID iOS hardcodé, placeholders iOS dans `eas.json`, validation des paramètres de deep links). Les autres items sont importants ou confort.

| Catégorie             | Statut       | Commentaire                                             |
| --------------------- | ------------ | ------------------------------------------------------- |
| Config & Build        | ✅ OK        | AAB production, permissions justifiées, Secrets EAS     |
| Sécurité              | ✅ Solide    | Pas de secrets, HTTPS/WSS, keychain, auth robuste       |
| UX / robustesse       | 🟠 Bon       | Offline excellent, loaders partiels, ErrorBoundary root |
| Conformité Play Store | 🟠 Presque   | Manifeste iOS OK, mais iOS submit à finaliser           |
| Monitoring            | ✅ Sentry OK | DSN EAS Secret, redaction beforeSend                    |
| i18n                  | 🟡 Absent    | Non bloquant V1 (FR seulement)                          |

---

## 🔴 CRITIQUE — à corriger avant le build AAB production

### 1. iOS App Store ID hardcodé placeholder

- Fichier : `src/hooks/useAppVersionCheck.ts:24-27`
- Valeur actuelle : `id0000000000`
- Impact : le hook de version check renvoie vers une URL App Store invalide. Sur Android ce n'est pas bloquant (le fallback Play Store fonctionne), mais le code est faux et sera un piège quand l'app iOS sortira.
- Fix : remplacer par un placeholder explicite `TODO_IOS_APP_STORE_ID` avec guard, OU retirer la branche iOS tant qu'elle n'existe pas.

### 2. `eas.json` — placeholders iOS submit

- Fichier : `eas.json`
- Champs : `REMPLACER_PAR_APPLE_ID`, `REMPLACER_PAR_APP_STORE_CONNECT_APP_ID`, `REMPLACER_PAR_APPLE_TEAM_ID`
- Impact : un `eas submit --platform ios` échouerait silencieusement ou uploaderait à la mauvaise app. Pas bloquant Play Store, mais à nettoyer pour éviter accident.
- Fix : soit retirer le bloc `submit.production.ios`, soit mettre à jour avec les vraies valeurs le jour où iOS sera activé.

### 3. Deep links — absence de validation des paramètres

- Scheme : `trackyu://` (30+ routes)
- Impact : un lien malicieux `trackyu://vehicle/999999` ou `trackyu://alert/abc-def` peut faire ouvrir un écran avec un ID qui n'appartient pas au user connecté. Le backend refusera la requête (isolation serveur OK), mais l'UX montre brièvement un écran cassé ou un état incohérent.
- Fix minimum :
  1. Valider que chaque paramètre ID est un UUID ou un entier avant navigation
  2. Sur l'écran cible, afficher un "Ressource introuvable" si l'API renvoie 403/404
  3. Logger dans Sentry les deep links avec paramètres invalides (possible tentative d'exploitation)

---

## 🟠 IMPORTANT — à planifier avant promote production

### 4. ErrorBoundary uniquement au niveau root

- Actuel : `App.tsx` encapsule toute l'app dans un seul ErrorBoundary
- Risque : une erreur sur un écran précis crashe tout l'arbre React, pas juste l'écran fautif
- Fix : ajouter ErrorBoundary au moins autour des écrans complexes (MapScreen, VehicleDetailScreen, FleetScreen, AlertsScreen) avec fallback "Recharger cette section"

### 5. Skeleton loaders manquants

- Couverts : FleetScreen, VehicleDetailScreen
- À ajouter : MapScreen (clignote sur premier fetch), AlertsScreen, DashboardScreen
- Impact Play Store : les screenshots capturés pendant le loading montrent une UI vide → mauvaise impression

### 6. WebView signature — config explicite manquante

- Fichier : `src/components/SignaturePad.tsx:93-104`
- Actuel : WebView sans `originWhitelist`, `javaScriptEnabled`, `allowFileAccess` explicites
- Fix : ajouter
  ```tsx
  originWhitelist={['about:blank']}
  javaScriptEnabled={true}
  allowFileAccess={false}
  allowFileAccessFromFileURLs={false}
  allowUniversalAccessFromFileURLs={false}
  ```
- Raison : défaut React Native WebView est permissif. Même si le HTML est inline, autant durcir.

### 7. Retry UX — VehicleDetail et autres écrans de détail

- Actuel : si une sous-requête (trajet, alertes, stats) échoue, l'écran affiche un état partiel sans bouton "Réessayer"
- Fix : ajouter un état d'erreur par bloc avec bouton de retry ciblé

---

## 🟡 NICE-TO-HAVE — post-V1

### 8. i18n mobile absent

- Actuel : toutes les strings en FR dur dans le JSX
- Cible V1 : Côte d'Ivoire FR, donc non bloquant
- À prévoir phase 2 : extension Afrique de l'Ouest (FR uniquement dans les pays francophones) ou anglais si extension anglophone

### 9. Certificate pinning

- Actuel : HTTPS standard, pas de pinning
- Gain : protection contre MITM par certificat corporate ou AC compromise
- Coût : rotation certificats = update app obligatoire (risque si cert renouvelé sans prévenir)
- Recommandation : pas maintenant. À étudier si on vise un tier Gov/Finance plus tard.

### 10. Tests mobiles

- Actuel : `jest --passWithNoTests` — pas de suite de tests mobile dédiée
- Impact : régressions possibles entre releases
- Fix phase 2 : ajouter tests unitaires sur hooks critiques (useAuth, useAppVersionCheck, offline persister) + tests d'intégration sur flows login/fleet

---

## ✅ Ce qui est déjà bon

### Config & Build

- `app.config.js` : version 1.0.0, `bundleIdentifier` / `package` = `com.trackyugps.app`
- Permissions Android justifiées : ACCESS_FINE/COARSE_LOCATION (GPS flotte), POST_NOTIFICATIONS (alertes), USE_BIOMETRIC (login)
- `eas.json` production : `buildType: app-bundle` = AAB (obligatoire Play Store 2025)
- `withOptimizedBuild` plugin : `jvmargs -Xmx3584m`, `arm64-v8a` seulement en preview (AAB production multi-arch OK)
- iOS `PrivacyManifest` présent (NSPrivacyCollectedDataTypes : PreciseLocation, EmailAddress — App Functionality, pas de tracking)
- Multi-env `APP_ENV` : staging → staging.trackyugps.com, prod → trackyugps.com

### Sécurité

- Pas de secret hardcodé (Sentry DSN + Google Maps API Key via EAS Secrets)
- HTTPS/WSS forcés, pas de fallback HTTP
- Token stocké dans `react-native-keychain` (Keystore Android + Keychain iOS)
- Auth robuste : refresh token, logout sur 401, session expirée gérée
- Biométrie optionnelle via `expo-local-authentication`
- Logs `console.*` uniquement en `__DEV__` (release = pas de fuite)
- Sentry `beforeSend` redige GPS, email, téléphone, tokens

### UX / robustesse

- Offline first excellent : React Query + AsyncStorage persister + circuit breaker 5 échecs → OPEN 30s
- `OfflineBanner` affiche clairement l'état
- Deep linking complet : 30+ routes scheme `trackyu://`
- Session expirée = redirect login propre + toast clair
- Monitoring Sentry opérationnel (crash reporting + breadcrumbs)

---

## Checklist avant `eas build --platform android --profile production`

- [ ] **Fixer `useAppVersionCheck.ts:24-27`** (App Store ID)
- [ ] **Nettoyer `eas.json` iOS submit** (retirer ou remplir)
- [ ] **Ajouter validation deep links** (UUID + guard 403/404)
- [ ] **Durcir WebView SignaturePad** (originWhitelist + flags)
- [ ] Ajouter ErrorBoundary sur écrans lourds (MapScreen, VehicleDetailScreen, FleetScreen, AlertsScreen)
- [ ] Ajouter skeletons manquants (MapScreen, AlertsScreen, DashboardScreen)
- [ ] Ajouter retry UX sur blocs de VehicleDetailScreen
- [ ] Vérifier `targetSdkVersion` ≥ 34 (exigence Play Store 2025) dans le build EAS
- [ ] Vérifier version name / version code incrémentés (`app.config.js` + `android.versionCode`)
- [ ] Compte démo peuplé pour screenshots Play Store
- [ ] Feature graphic 1024×500 créé (chantier utilisateur)
- [ ] Service account JSON récupéré et placé (chantier utilisateur)

---

## Estimation temps correctifs critiques + importants

| Item                       | Temps     |
| -------------------------- | --------- |
| App Store ID (1)           | 5 min     |
| eas.json iOS (2)           | 5 min     |
| Deep links validation (3)  | 45-60 min |
| WebView durcie (6)         | 10 min    |
| ErrorBoundary écrans (4)   | 30-45 min |
| Skeletons manquants (5)    | 60-90 min |
| Retry UX VehicleDetail (7) | 30 min    |
| **Total**                  | **3-4 h** |

Les 3 critiques peuvent être faits en **1 h** et débloquent le build production. Les importants peuvent être livrés dans la même release ou en patch post-internal.
