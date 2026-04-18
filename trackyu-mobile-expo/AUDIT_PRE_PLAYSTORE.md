# Audit pré-déploiement Play Store — TrackYu Mobile

> Date initiale : 2026-04-17
> Dernière MAJ : 2026-04-18
> Périmètre : app Expo/React Native `trackyu-mobile-expo` avant build AAB production + submit Play Console
> Méthode : lecture directe des fichiers config + 2 agents en parallèle (sécurité + UX/robustesse)

---

## État courant (2026-04-18)

- ✅ **3 CRITIQUES corrigés** (commit `e3db906` du 2026-04-17)
- ✅ **4 IMPORTANTS #4-#7 corrigés** (commit `f507a42` du 2026-04-18)
- ✅ **AlertsScreen finalisé** (commit `7dbf035` du 2026-04-18) — ErrorBoundary + AlertsListSkeleton + VehicleFilterPanel
- 🟡 Nice-to-have (#8-#10) : non traités, post-V1
- ⏳ **Reste avant AAB prod** : assets utilisateur (feature graphic, screenshots, Play Console account, service account JSON)

**Verdict actuel** : code app **prêt** pour `eas build --platform android --profile production`. Blocage restant = assets/comptes externes.

---

## Verdict global (initial)

**App globalement prête pour un build AAB production**, sous réserve de corriger 3 points critiques (App Store ID iOS hardcodé, placeholders iOS dans `eas.json`, validation des paramètres de deep links). Les autres items sont importants ou confort.

| Catégorie             | Statut       | Commentaire                                                     |
| --------------------- | ------------ | --------------------------------------------------------------- |
| Config & Build        | ✅ OK        | AAB production, permissions justifiées, Secrets EAS             |
| Sécurité              | ✅ Solide    | Pas de secrets, HTTPS/WSS, keychain, auth robuste, WebView dur  |
| UX / robustesse       | ✅ Bon       | Offline excellent, skeletons, ErrorBoundary par écran, retry UX |
| Conformité Play Store | ✅ OK        | iOS submit retiré, deep links validés                           |
| Monitoring            | ✅ Sentry OK | DSN EAS Secret, redaction beforeSend, captureException écrans   |
| i18n                  | 🟡 Absent    | Non bloquant V1 (FR seulement)                                  |

---

## 🔴 CRITIQUE — ✅ CORRIGÉ (commit e3db906, 2026-04-17)

### 1. iOS App Store ID hardcodé placeholder — ✅ DONE

- Fichier : `src/hooks/useAppVersionCheck.ts`
- Fix appliqué : branche iOS neutralisée (`APP_STORE_URL: string | null = null`) tant que iOS V1 non publié, guard `if (!url) return;` dans openStore. À réactiver quand compte Apple Developer ouvert.

### 2. `eas.json` — placeholders iOS submit — ✅ DONE

- Fichier : `eas.json`
- Fix appliqué : bloc `submit.production.ios` entièrement retiré. À remettre proprement le jour où iOS sera activé.

### 3. Deep links — absence de validation des paramètres — ✅ DONE

- Fichier : `src/navigation/linking.ts`
- Fix appliqué : hook `getStateFromPath` custom avec regex `SAFE_ID` (`/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/`) sur les routes `vehicle`, `intervention`, `ticket`. Deep link invalide → redirection silencieuse vers `dashboard` + `Sentry.captureMessage` (niveau `warning`) pour tracer les tentatives.

---

## 🟠 IMPORTANT — ✅ CORRIGÉ (commit f507a42, 2026-04-18)

### 4. ErrorBoundary uniquement au niveau root — ✅ DONE

- HOC `withErrorBoundary(Component, name)` ajouté dans `src/components/ErrorBoundary.tsx`
- `componentDidCatch` envoie désormais à `Sentry.captureException` avec contexte écran (name)
- Appliqué sur : **MapScreen**, **FleetScreen**, **VehicleDetailScreen**, **AlertsScreen** (commit `7dbf035` du 2026-04-18)

### 5. Skeleton loaders manquants — ✅ DONE (partiel)

- Nouveaux composants dans `src/components/SkeletonLoader.tsx` :
  - `AlertCardSkeleton` + `AlertsListSkeleton` (6 cards)
  - `DashboardSkeleton` (donut + slices + KPI grid)
- **DashboardScreen** : `ActivityIndicator` → `<DashboardSkeleton />` ✅
- **AlertsScreen** : `ActivityIndicator` → `<AlertsListSkeleton />` ✅ (commit `7dbf035`)
- **MapScreen** : skeleton jugé non nécessaire — l'`emptyMapBanner` existant (spinner + "Chargement des véhicules…") sert déjà l'UX

### 6. WebView signature — config explicite manquante — ✅ DONE

- Fichier : `src/components/SignaturePad.tsx`
- `webviewProps` ajouté au `SignatureCanvas` :
  ```tsx
  webviewProps={{
    originWhitelist: ['about:blank'],
    allowUniversalAccessFromFileURLs: false,
    mixedContentMode: 'never',
    cacheEnabled: false,
    incognito: true,
  }}
  ```

### 7. Retry UX — VehicleDetail — ✅ DONE

- Fichier : `src/screens/main/VehicleDetailScreen.tsx`
- `useQuery` expose `isError: vehicleError` + `refetch: refetchVehicle`
- Fallback UI différencié :
  - Erreur réseau → "Impossible de charger le véhicule" + "Vérifiez votre connexion et réessayez." + bouton **Réessayer** (primary) → `refetchVehicle()`
  - 404 → "Véhicule introuvable" + bouton **Retour** uniquement
- Style du bouton Retour commute (elevated quand erreur, primary quand 404)

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

- [x] ~~**Fixer `useAppVersionCheck.ts`**~~ ✅ e3db906
- [x] ~~**Nettoyer `eas.json` iOS submit**~~ ✅ e3db906
- [x] ~~**Ajouter validation deep links**~~ ✅ e3db906
- [x] ~~**Durcir WebView SignaturePad**~~ ✅ f507a42
- [x] ~~Ajouter ErrorBoundary sur écrans lourds~~ ✅ f507a42 + 7dbf035 (MapScreen, VehicleDetailScreen, FleetScreen, AlertsScreen)
- [x] ~~Ajouter skeletons manquants~~ ✅ f507a42 + 7dbf035 (DashboardScreen, AlertsScreen) — MapScreen jugé inutile
- [x] ~~Ajouter retry UX sur VehicleDetailScreen~~ ✅ f507a42
- [ ] Vérifier `targetSdkVersion` ≥ 34 (exigence Play Store 2025) dans le build EAS
- [ ] Vérifier version name / version code incrémentés (`app.config.js` + `android.versionCode`)
- [ ] Compte démo peuplé pour screenshots Play Store
- [ ] **Play Console — compte Personnel créé + vérification identité** (chantier utilisateur)
- [ ] **Feature graphic 1024×500** (chantier utilisateur — Canva/Figma)
- [ ] **Service account JSON Google Play** (après validation Play Console)
- [ ] Build APK preview EAS + crash tests device (45 scénarios CRASH_TESTS_CHECKLIST.md)
- [ ] Screenshots capture avec APK preview (chantier utilisateur)
- [ ] Build AAB production + submit Play Console internal track

---

## Estimation temps correctifs critiques + importants

| Item                       | Temps     | Statut               |
| -------------------------- | --------- | -------------------- |
| App Store ID (1)           | 5 min     | ✅ e3db906           |
| eas.json iOS (2)           | 5 min     | ✅ e3db906           |
| Deep links validation (3)  | 45-60 min | ✅ e3db906           |
| WebView durcie (6)         | 10 min    | ✅ f507a42           |
| ErrorBoundary écrans (4)   | 30-45 min | ✅ f507a42 + 7dbf035 |
| Skeletons manquants (5)    | 60-90 min | ✅ f507a42 + 7dbf035 |
| Retry UX VehicleDetail (7) | 30 min    | ✅ f507a42           |
| **Total**                  | **3-4 h** | **100% fait code**   |

Les 3 critiques et les 4 importants sont tous livrés. **Reste avant submit AAB** = chantiers externes (compte Play Console, feature graphic, screenshots, service account JSON).

---

## Commits référencés

- `e3db906` — fix(mobile): audit pre-playstore — 3 correctifs critiques (2026-04-17)
- `c3d365f` — feat(mobile): toggle trafic Google Maps + cycle mapType sur ecrans detail (2026-04-17)
- `f507a42` — feat(mobile): audit pre-playstore — correctifs importants (#4-#7) (2026-04-18)
- `7dbf035` — feat(mobile): VehicleFilterPanel + SearchBar sur 6 ecrans metier (2026-04-18) — finalise ErrorBoundary + skeleton AlertsScreen
- `990224a` — feat(mobile): DashboardScreen periode semaine courante (Lun-Dim) (2026-04-18)
