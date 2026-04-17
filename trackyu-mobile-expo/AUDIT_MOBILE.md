# Audit Mobile — TrackYu Expo

**Référence technique complète** → `TRACKYU_MOBILE.md`
**Version auditée** : Expo SDK 54 / React Native 0.81.5 / `develop`

---

## Résumé exécutif

| Indicateur               | Valeur                                             |
| ------------------------ | -------------------------------------------------- |
| Complétude globale       | **~99 %**                                          |
| Screens complets         | 23 / 23                                            |
| Screens partiels         | 0 / 23                                             |
| TypeScript coverage      | 100 %                                              |
| `any` types              | 0                                                  |
| `console.log` production | 0                                                  |
| Vulnérabilités HIGH npm  | 0                                                  |
| État sécurité global     | **4C + 4H corrigés** — 1M restante (App Store URL) |
| Dernier build Android    | 8.6 MB · 0 erreur TS · 2026-04-08                  |

---

## 1. Audit qualité — État des screens

### Authentification

| Screen      | État       | Notes                                                                  |
| ----------- | ---------- | ---------------------------------------------------------------------- |
| LoginScreen | ✅ Complet | Rate limiting 3 essais / 30s · "Mot de passe oublié" → Alert stub (M2) |

---

### Rôle STAFF / ADMIN / MANAGER

| Screen               | État       | Notes                                                                                                |
| -------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| DashboardScreen      | ✅ Complet | Donut flotte unifié CLIENT+STAFF · DistanceChart axe Y + pics · badge alertes                        |
| MapScreen            | ✅ Complet | Google Maps, WebSocket temps réel, sélection véhicule                                                |
| FleetScreen          | ✅ Complet | Filtres statut (chips), recherche, FlatList optimisée                                                |
| FinanceScreen        | ✅ Complet | 4 modules (Factures, Devis, Contrats, Paiements), KPI bar, XOF                                       |
| AlertsScreen         | ✅ Complet | Pagination infinie, toast WS, groupement par date, mark-read                                         |
| VehicleDetailScreen  | ✅ Complet | Mini-carte initialRegion · stats temps réel · refetch 15s · distance Haversine                       |
| VehicleHistoryScreen | ✅ Complet | Donut km/jour · DateTimePicker natif · DistanceChart · geocoding arrêts+alertes                      |
| ReportsScreen        | ✅ Complet | 10 modules, générateurs API réels, exports PDF (expo-print) + CSV (Share.share), rapports programmés |
| ProfileScreen        | ✅ Complet | Édition profil (nom/tél), MDP, langue (fr/en/es) · alertes-config → stubs                            |

---

### Rôle TECH / Technicien installateur

| Screen                   | État       | Notes                                                                                |
| ------------------------ | ---------- | ------------------------------------------------------------------------------------ |
| TechDashboardScreen      | ✅ Complet | KPIs perso auto-filtrés `technicianId`, refetch 60s                                  |
| AgendaScreen             | ✅ Complet | Semaine 7j, fusion interventions + tâches CRM, filtres TECH/BUSINESS                 |
| TechScreen               | ✅ Complet | 3 tabs : Interventions / Appareils / Stock, filtres statut                           |
| InterventionDetailScreen | ✅ Complet | 4 sections accordéon (Demande/Véhicule/Technique/Clôture), validation conditionnelle |

---

### Rôle CLIENT / Espace client

| Screen                    | État       | Notes                                                                      |
| ------------------------- | ---------- | -------------------------------------------------------------------------- |
| DashboardScreen (CLIENT)  | ✅ Complet | Donut flotte · DistanceChart 7j · date du jour · Mes Opérations (en cours) |
| ClientPortalScreen        | ✅ Complet | Stats grid, dernière facture, quick actions                                |
| PortalInvoicesScreen      | ✅ Complet | Pagination infinie, badges statut                                          |
| PortalInvoiceDetailScreen | ✅ Complet | Lignes de facturation, PDF via Linking (validation `https://`)             |
| PortalContractsScreen     | ✅ Complet | PDF download, infos grille, auto-renew                                     |
| PortalSubscriptionsScreen | ✅ Complet | Features list, cycle, auto-renew                                           |
| PortalPaymentsScreen      | ✅ Complet | Icônes méthode (carte/mobile/espèces), lien vers facture                   |
| PortalTicketsScreen       | ✅ Complet | Badges priorité + statut, lien créer ticket                                |
| PortalTicketDetailScreen  | ✅ Complet | Chat-style, messagerie CLIENT/SUPPORT/SYSTEM, état fermé                   |
| PortalNewTicketScreen     | ✅ Complet | Chips priorité + catégorie, validation, `nav.replace` vers détail          |

---

## 2. Problèmes qualité identifiés

### ✅ Corrigés

| #   | Problème                                                    | Fix                                                                                   |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| F1  | DashboardScreen "Alertes" / "Rapports" → navigation cassée  | Ajout `Alerts` + `Reports` dans `RootStackParamList` + `RootNavigator`                |
| F2  | `METHOD_ICONS` inutilisé dans PortalPaymentsScreen          | Variable supprimée                                                                    |
| F3  | VehicleDetailScreen : véhicule invisible sur mini-carte     | `initialRegion` fixe centré véhicule + `animateToRegion` via `useEffect`              |
| F4  | VehicleDetailScreen : pan/zoom bloqué (`region` contrôlé)   | `region` → `initialRegion` sur MapView                                                |
| F5  | VehicleHistoryScreen : pan/zoom bloqué (`region` contrôlé)  | Idem + `useEffect` recentrage à chaque changement de date                             |
| F6  | Sparkline vide sur "Auj." (1 seul point)                    | Masquée si ≤ 1 point, message explicatif affiché                                      |
| F7  | DashboardScreen CLIENT : sélecteur période hors contexte    | Retiré du header, période fixée à 7j, date du jour affichée à la place                |
| F8  | Adresses Plus Code illisibles (`CWGH+HHQ, Abidjan…`)        | Patch `GoogleMapsService.js` : filtrage PREFERRED_TYPES + fallback address_components |
| F9  | Trajets : `start_address` / `end_address` toujours null     | Patch `tripWorker.js` + `fleetRepository.js` : geocoding avant INSERT                 |
| F10 | `getDayStats` : 0 km / 0 trajets pendant le trajet en cours | Patch `objectRepository.js` : 4e requête parallèle positions en cours                 |

### ✅ Résolus (audit antérieur inexact)

| #   | Problème signalé                                    | Réalité                                                                               |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| M1  | ReportsScreen : tous exports → `Alert.alert`        | Exports PDF (expo-print) + CSV (Share) opérationnels                                  |
| M2  | LoginScreen : "Mot de passe oublié" → `Alert.alert` | Appel API réel `/auth/forgot-password`, flow complet                                  |
| M3  | ProfileScreen : alertes-config → stubs              | `AlertConfigModal` : seuils vitesse/carburant/offline + canaux push/email/SMS via API |

### 🟡 Restants — Mineurs

| #   | Problème                                                        | Fichier                 | Blocage                                              |
| --- | --------------------------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| M3b | **TODO** — ProfileScreen : menu "Unités" (km/mi, litres) → stub | `ProfileScreen.tsx`     | Endpoint backend `/user/preferences` requis côté VPS |
| M4  | App Store URL iOS placeholder (`id0000000000`)                  | `useAppVersionCheck.ts` | Nécessite publication App Store                      |

---

## 3. Évolutions en cours — Dashboard CLIENT

### Planifiées / approuvées

| #   | Feature                                             | État                                                       |
| --- | --------------------------------------------------- | ---------------------------------------------------------- |
| 1   | Badge alertes non lues dans le header               | 🔄 À implémenter                                           |
| 2   | Abonnement expirant < 30j sous le donut             | 🔄 À implémenter                                           |
| 3   | Picker véhicule → Historique (multi-véhicules)      | 🔄 À implémenter                                           |
| 4   | 3 alertes récentes par criticité                    | 🔄 À implémenter                                           |
| 5   | Bloc "Mes Opérations" (feed activité chronologique) | 🔄 À implémenter — endpoint `/portal/activity-feed` requis |

### Appliquées (2026-04-08)

| Fix             | Description                                                                     |
| --------------- | ------------------------------------------------------------------------------- |
| Donut unifié    | Même DonutChart CLIENT et STAFF — taux activité/disponibilité retirés du CLIENT |
| DistanceChart   | Axe Y (0 / mi / max km) + valeur sur chaque pic + dates en abscisse             |
| Date du jour    | Remplace le sélecteur de période dans le header CLIENT                          |
| Période fixe 7j | Distance toujours calculée sur les 7 derniers jours                             |

---

## 4. Évolutions en cours — VehicleHistoryScreen

### Appliquées (2026-04-08)

| Fix               | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| Sélecteur jours   | Cartes 56×72px avec km/jour affiché, opacity 40% si vide            |
| DateTimePicker    | Sélecteur natif Android/iOS dans le modal période perso             |
| Geocoding arrêts  | `StopCard` avec `useQuery` par arrêt → adresse via `/fleet/geocode` |
| Geocoding alertes | `AlertCard` avec geocoding + tap → zoom carte sur le point          |
| Adresses trajets  | Fallback coords si `start_address`/`end_address` null               |

---

## 5. Roadmap qualité

### ~~Sprint 1 — ReportsScreen~~ ✅ Déjà livré

Exports PDF/CSV fonctionnels via expo-print + expo-sharing. 10 générateurs connectés aux API backend. Rapports programmés via `/api/reports/scheduled`.

### ~~Sprint 2 — Dashboard CLIENT~~ ✅ Déjà livré

Toutes les fonctionnalités présentes dans `DashboardScreen.tsx` :

- Badge alertes non lues dans le header (rouge, lien → AlertsScreen)
- Bannière solde impayé
- Abonnement expirant < 30j (orange, lien → Portal)
- 3 alertes récentes triées par criticité
- Bloc "Mes Opérations" : factures + tickets + interventions, filtres Auj / Sem / Mois / Tout
- Picker véhicule multi-véhicules → VehicleHistory
- Sparkline distance 7j agrégée sur toute la flotte

### Sprint 3 — Production readiness

- [x] Tests unitaires stores (authStore ✅, vehicleStore ✅ — 20 suites / 581 tests)
- [x] Tests E2E flows critiques (Maestro — 3 flows : `01_login`, `02_navigation`, `03_logout`)
  - Framework : **Maestro** (workflow Expo managé, pas de prebuild requis)
  - Flows : `.maestro/01_login.yaml` · `.maestro/02_navigation.yaml` · `.maestro/03_logout.yaml`
  - CI : `.github/workflows/e2e.yml` (Maestro Cloud + EAS build profile `e2e`)
  - Secrets CI requis : `EAS_TOKEN`, `MAESTRO_CLOUD_API_KEY`, `E2E_EMAIL`, `E2E_PASSWORD`
  - testIDs ajoutés sur les inputs LoginScreen : `input-email`, `input-password`
- [x] Sentry plugin EAS source maps (`@sentry/react-native/expo` ajouté dans `app.config.js`)
  - Secrets EAS requis : `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
  - Commande : `eas secret:create --scope project --name SENTRY_DSN --value <dsn>`
- [ ] Renseigner App Store URL iOS réel (`useAppVersionCheck.ts` · M4)

---

## 6. Audit sécurité — 2026-04-08

**Périmètre** : 18 fichiers lus intégralement · `npm audit` exécuté · `git log` vérifié · build Android de validation.

---

### Ce qui était déjà en place (base saine)

| Point                 | Détail                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| Token JWT             | Keychain iOS / Android Keystore via `react-native-keychain v10`            |
| Transport             | HTTPS exclusif (`https://trackyugps.com/api`, `wss://`)                    |
| Logs production       | 0 `console.log` dans le code source applicatif                             |
| Navigation auth-gatée | Stack authentifiée conditionnée par `isAuthenticated` dans `RootNavigator` |
| Erreurs normalisées   | Messages génériques 401/404/5xx côté client                                |
| Forgot password       | Message délibérément ambigu — pas d'énumération email                      |
| Sentry                | Filtre erreurs AUTH et NETWORK — pas de token dans les rapports            |
| Google Maps API key   | Via `process.env.GOOGLE_MAPS_API_KEY` (EAS Secrets) — pas hardcodée        |

---

### Vulnérabilités corrigées (2026-04-08)

| #   | Sévérité    | Fichier(s) modifié(s)                | Correction                                                                                                               |
| --- | ----------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| C1  | 🔴 Critique | `src/lib/queryClient.ts` + `App.tsx` | Cache React Query non persisté (`shouldDehydrateQuery: () => false`)                                                     |
| C2  | 🔴 Critique | `google-services.json`               | Firebase API Key restreinte : `com.trackyugps.app` + SHA-1 `95:E4:E7:25:33:B4:E6:C9:4B:E0:9E:DA:1E:FA:F0:2F:52:5C:E5:3E` |
| C3  | 🔴 Critique | `src/api/auth.ts`                    | `POST /auth/logout` serveur avant `clearAll()` — JWT invalidé côté backend                                               |
| C4  | 🔴 Critique | `package.json` + `ReportsScreen.tsx` | `xlsx` supprimé (Prototype Pollution + ReDoS)                                                                            |
| H1  | 🟠 Élevée   | `src/utils/errorTypes.ts`            | `serverMessage` visible uniquement en `__DEV__`                                                                          |
| H2  | 🟠 Élevée   | `PortalInterventionDetailScreen.tsx` | IMEI et SIM masqués côté CLIENT                                                                                          |
| H3  | 🟠 Élevée   | `PortalInvoiceDetailScreen.tsx`      | Validation `url.startsWith('https://')` sur Wave link et PDF                                                             |
| H4  | 🟠 Élevée   | `LoginScreen.tsx`                    | Rate limiting : 3 échecs → blocage 30s                                                                                   |
| M1  | 🟡 Moyenne  | `authStore.ts`                       | `queryClient.clear()` au logout                                                                                          |
| M2  | 🟡 Moyenne  | `app.config.js`                      | `RECEIVE_BOOT_COMPLETED` supprimé                                                                                        |

### État de sécurité après corrections

| Catégorie | Avant | Après                                          |
| --------- | ----- | ---------------------------------------------- |
| Critiques | 4     | 0                                              |
| Élevées   | 4     | 0                                              |
| Moyennes  | 3     | 1 _(URL App Store iOS — non bloquant Android)_ |

---

## 7. Phase 3 — Composants partagés & centralisation statuts (2026-04-09/10)

### Objectif

Éliminer la duplication de code UI : chaque écran réimplémentait sa propre barre de recherche, ses propres cards, et ses propres couleurs de statut véhicule.

### Composants créés

| Composant   | Fichier                        | Description                                                                        |
| ----------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| `Button`    | `src/components/Button.tsx`    | 4 variants (primary/secondary/ghost/danger), 3 tailles, loading spinner, fullWidth |
| `Card`      | `src/components/Card.tsx`      | Surface conteneur, prop `accent` pour couleur latérale                             |
| `SearchBar` | `src/components/SearchBar.tsx` | Search icon + TextInput + clear (X) intégré                                        |

### Source canonique statuts véhicule

| Fichier                      | Rôle                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/utils/vehicleStatus.ts` | `VEHICLE_STATUS_COLORS`, `VEHICLE_STATUS_LABELS`, `vehicleStatusColor()`, `vehicleStatusLabel()` |

Couleurs fixes : moving `#22C55E` · idle `#F97316` · stopped `#EF4444` · offline `#6B7280`

Corrections apportées : `tokens.ts` (moving, idle), `colors.ts` (moving, idle, stopped — était `#6B7280` par erreur).

### Écrans migrés — SearchBar

| Écran               | Avant                                                  | Après                                              |
| ------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| SubUsersScreen      | `TextInput` + `Search` + `X` inline                    | `<SearchBar>`                                      |
| DriversScreen       | `TextInput` + `Search` + `X` inline                    | `<SearchBar>`                                      |
| VehiclesListScreen  | `TextInput` + `Search` + `X` inline                    | `<SearchBar>`                                      |
| UsersScreen (admin) | `TextInput` + `Search` inline                          | `<SearchBar>`                                      |
| LeadsScreen (crm)   | `TextInput` + `Search` inline                          | `<SearchBar>`                                      |
| TemperatureScreen   | `TextInput` + `Search` + `X` inline                    | `<SearchBar>`                                      |
| FinanceScreen       | `TextInput` + `Search` + `X` inline                    | `<SearchBar>`                                      |
| TechScreen          | `TextInput` + `Search` + `X` inline                    | `<SearchBar>` (placeholder dynamique selon onglet) |
| HelpScreen          | `Search` inline (TextInput + X conservés pour chat IA) | `<SearchBar>`                                      |

### Écrans migrés — Card

| Écran             | Changement                        |
| ----------------- | --------------------------------- |
| SubUsersScreen    | `View` → `<Card>` pour UserCard   |
| DriversScreen     | `View` → `<Card>` pour DriverCard |
| TemperatureScreen | `View` → `<Card>` pour SensorCard |

### Écrans migrés — VEHICLE_STATUS_COLORS centralisé

| Écran                            | Ancienne source                           | Nouvelle source                                   |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| DriversScreen                    | Map locale `STATUS_C`                     | `VEHICLE_STATUS_COLORS`                           |
| VehiclesListScreen               | Map locale `STATUS_C` + `STATUS_FR`       | `VEHICLE_STATUS_COLORS` + `VEHICLE_STATUS_LABELS` |
| TemperatureScreen                | Map locale `STATUS_C`                     | `VEHICLE_STATUS_COLORS`                           |
| DashboardScreen                  | Ternaires inline + tableaux donut         | `VEHICLE_STATUS_COLORS` + `vehicleStatusColor()`  |
| ReportsScreen                    | Map locale `STATUS_C` + `STATUS_FR`       | `VEHICLE_STATUS_COLORS` + `VEHICLE_STATUS_LABELS` |
| `reports/generators/activity.ts` | Maps locales `STATUS_FR` + `STATUS_COLOR` | `VEHICLE_STATUS_COLORS` + `VEHICLE_STATUS_LABELS` |

### Écrans migrés — SearchBar (suite)

| Écran       | Note                                                                                |
| ----------- | ----------------------------------------------------------------------------------- |
| FleetScreen | SearchBar en flex:1 aux côtés du ClientSelector (wrapper inline, pas de StyleSheet) |

### Tests ajoutés

| Fichier                               | Couverture                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/__tests__/vehicleStatus.test.ts` | 31 cas : couleurs fixes, libellés FR, fallback inconnu, cohérence croisée COLORS/LABELS/fonctions |

### Résultat final

| Indicateur                                     | Avant           | Après              |
| ---------------------------------------------- | --------------- | ------------------ |
| Occurrences couleurs hex véhicule dupliquées   | ~339            | 0 (centralisées)   |
| Barres de recherche inline                     | 10              | 0                  |
| Imports `TextInput` + `Search` + `X` dupliqués | 10 screens      | 0                  |
| Tests                                          | 533 / 18 suites | 564 / 19 suites ✅ |

---

---

## 8. Accessibilité — Actions critiques (2026-04-10)

**Baseline** : 0 `accessibilityLabel` / `testID` dans toute l'app avant cette session.

### Composant Button

- Nouvelles props : `testID`, `accessibilityLabel`
- Props auto : `accessibilityRole="button"`, `accessibilityState={{ disabled, busy }}`

### LoginScreen

| Élément                                   | Ajout                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Bouton œil (show/hide password)           | `accessibilityLabel` contextuel + `accessibilityRole="button"`                                      |
| Bouton connexion                          | `testID="btn-login"` + `accessibilityLabel` contextuel (verrouillé / normal) + `accessibilityState` |
| Bouton "Envoyer le lien" (forgot)         | `testID="btn-forgot-submit"` + `accessibilityLabel` + `accessibilityState`                          |
| Bouton "Envoyer ma demande" (inscription) | `testID="btn-request-submit"` + `accessibilityLabel` + `accessibilityState`                         |
| Boutons X fermeture modals                | `accessibilityLabel="Fermer"` + `accessibilityRole="button"`                                        |

### VehicleDetailScreen

| Élément                             | Ajout                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| CollapsibleBlock header (×10 blocs) | `accessibilityLabel` dynamique (Ouvrir/Fermer + titre) + `accessibilityRole="button"` + `accessibilityState={{ expanded }}` |
| Switch immobilisation               | `testID="switch-immobilize"` + `accessibilityLabel` contextuel + `accessibilityHint`                                        |
| Bouton "Annuler" modal immo         | `testID="btn-immo-cancel"` + `accessibilityLabel` + `accessibilityRole="button"`                                            |
| Bouton confirmer immobilisation     | `testID="btn-immo-confirm"` + `accessibilityLabel` + `accessibilityHint`                                                    |
| Bouton confirmer remise en marche   | `testID="btn-unimmo-confirm"` + `accessibilityLabel`                                                                        |

### AlertsScreen

| Élément            | Ajout                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Bouton "Tout lire" | `testID="btn-mark-all-read"` + `accessibilityLabel="Marquer toutes les alertes comme lues"` + `accessibilityState={{ busy }}` |

### Boutons Retour — 20 écrans couverts

Tous les boutons Retour (ArrowLeft icon-only) ont reçu `accessibilityLabel="Retour"` + `accessibilityRole="button"` :

`DriversScreen` · `DepensesScreen` · `EcoConduiteScreen` · `MaintenanceScreen` · `PneusScreen` · `RulesScreen` · `SubUsersScreen` · `TemperatureScreen` · `UsersScreen` · `LeadsScreen` · `CreateTicketScreen` · `FleetAnalyticsScreen` · `GeofencesScreen` · `HelpScreen` · `VehicleDetailScreen` · `VehicleHistoryScreen` · `PortalContractsScreen` · `PortalInterventionDetailScreen` · `PortalInterventionsScreen` · `PortalInvoiceDetailScreen` · `PortalInvoicesScreen`

### ProfileScreen

| Élément            | Ajout                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Bouton Déconnexion | `testID="btn-logout"` + `accessibilityLabel="Se déconnecter"` + `accessibilityRole="button"` |

### Résultat final

| Indicateur                         | Avant           | Après                                  |
| ---------------------------------- | --------------- | -------------------------------------- |
| Attributs accessibilité dans l'app | 0               | 46                                     |
| `testID` sur actions critiques     | 0               | 11 (+ `input-email`, `input-password`) |
| Tests unitaires                    | 564 / 19 suites | 581 / 20 suites ✅                     |
| Tests E2E (Maestro)                | 0               | 3 flows ✅                             |
| Sentry plugin EAS source maps      | ❌              | ✅ `@sentry/react-native/expo`         |

---

---

## 9. Phase 5 — Store Readiness (2026-04-14)

### Scoring avant/après

| Catégorie               | Score initial | Score final |
| ----------------------- | ------------- | ----------- |
| Architecture & patterns | 7.5/10        | 8.5/10      |
| Gestion d'erreur        | 4/10          | 8/10        |
| Typage TypeScript       | 5/10          | 8/10        |
| UI/UX & layout          | 6.5/10        | 8.5/10      |
| Performance             | 6/10          | 8/10        |
| Accessibilité           | 3/10          | 5/10        |
| Sécurité                | 6/10          | 9/10        |
| Conformité Store        | 4/10          | 8/10        |
| Tests                   | 2/10          | 8/10        |
| **GLOBAL**              | **5.5/10**    | **8.5/10**  |

---

### Sprint 1 — `4551fa1` — Bloquants store + crashes critiques

| Ref | Description                                                                                                                                   | Fichier(s)                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| B1  | Privacy Manifest iOS via `withDangerousMod` plugin                                                                                            | `app.config.js`                              |
| B2  | Suppression permissions Android : `RECEIVE_BOOT_COMPLETED`, `VIBRATE`, `USE_FINGERPRINT`                                                      | `app.config.js`                              |
| C1  | `try/catch` global dans `generators/index.ts` — retourne un `ReportResult` d'erreur au lieu de crasher                                        | `generators/index.ts`                        |
| C2  | Interface `Vehicle` étendue avec champs télémétrie typés (`temperature`, `batteryLevel`, `rpm`...) + suppression `as any` dans `technique.ts` | `vehicles.ts`, `technique.ts`                |
| C3  | `safeNum()` — guard contre NaN et concaténation string dans tous les calculs financiers                                                       | `generators/finance.ts`                      |
| C4  | Création `src/utils/dateUtils.ts` — `safeFmtDate`, `safeFmtDateTime`, `daysFromNow`, `fmtDuration`                                            | `dateUtils.ts` _(nouveau)_                   |
| C6  | Fix `userRole` null dans `SettingsMenuScreen`                                                                                                 | `SettingsMenuScreen.tsx`                     |
| M2  | `queryClient.clear()` dans `setSessionExpiredHandler` — données confidentielles vidées du cache à l'expiration                                | `authStore.ts`                               |
| M5  | `SafeAreaView edges={['top','bottom']}` — plus de débordement sous la home indicator iPhone                                                   | 4 écrans                                     |
| M10 | `editable={!saving}` sur tous les `TextInput` des formulaires CRUD                                                                            | DriversScreen, BranchesScreen, GroupesScreen |
| M12 | `src/api/index.ts` — 25 modules exportés (était 4)                                                                                            | `api/index.ts`                               |
| N14 | `ErrorBoundary console.error` conditionné à `__DEV__`                                                                                         | `ErrorBoundary.tsx`                          |

### Sprint 2 — `991f2b7` — UX & qualité

| Ref | Description                                                                                     | Fichier(s)                          |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------- |
| M1  | Debounce 5s sur `triggerSessionExpired()` — plus de modaux en cascade sur requêtes parallèles   | `client.ts`                         |
| M3  | Création `src/lib/queryKeys.ts` — 100+ clés React Query centralisées (fin du split cache)       | `queryKeys.ts` _(nouveau)_          |
| M8  | `linking.ts` complet — 30+ routes deep linking (settings, admin, portal, interventions...)      | `linking.ts`                        |
| M9  | `nav.navigate(tile.id as never)` — suppression du `as any` non typé                             | `SettingsMenuScreen.tsx`            |
| M13 | `FlatList` perf — `initialNumToRender=15`, `maxToRenderPerBatch=10`, `windowSize=10`            | DashboardScreen, VehiclesListScreen |
| M14 | Sentry `beforeSend` renforcé — redaction GPS/contacts/tokens dans breadcrumbs, headers et extra | `App.tsx`                           |

### Sprint 3 — `a4a1f05` — Accessibilité & composants

| Ref | Description                                                                                                        | Fichier(s)                               |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| N1  | `accessibilityRole` + `accessibilityLabel` sur boutons critiques (Retour, Ajouter, Annuler, Enregistrer, Modifier) | VehiclesList, Drivers, Branches, Groupes |
| N12 | Création `src/components/EmptyState.tsx` — composant centralisé (icon, title, subtitle, actionLabel)               | `EmptyState.tsx` _(nouveau)_             |

### Sprint 4a — `ae72130` — UX robustesse

| Ref | Description                                                                                      | Fichier(s)             |
| --- | ------------------------------------------------------------------------------------------------ | ---------------------- |
| M4  | `ImmobilizeModal` — `KeyboardAvoidingView` autour du `TextInput` mot de passe                    | `DashboardScreen.tsx`  |
| M6  | `AlertRulesScreen` toggle — `onMutate` optimistic update + `onError` rollback via `setQueryData` | `AlertRulesScreen.tsx` |
| N7  | `useNetworkStatus` — debounce 3s avant invalidation à la reconnexion (réseau instable)           | `useNetworkStatus.ts`  |
| N9  | `vehicles.ts` — `STATUS_MAP` extrait comme constante module-level (DRY, fin du doublon)          | `vehicles.ts`          |
| N11 | `PneusScreen` — `width: \`${pct}%\` as any` → `as \`${number}%\``                                | `PneusScreen.tsx`      |

### Sprint 4b — `d853f1d` — Dette technique

| Ref | Description                                                                                                                                                         | Fichier(s)         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| I9  | `FIELD_MAP` interventions — ajout champs check-up véhicule manquants (`check_start`, `check_lights`, `check_dashboard`, `check_ac`, `check_audio`, `check_battery`) | `interventions.ts` |
| I10 | Header `x-api-version: '1'` sur toutes les requêtes API                                                                                                             | `client.ts`        |

### Sprint 5 — `182a4e7` — Qualité code finale

| Ref | Description                                                                                 | Fichier(s)                                                                                                       |
| --- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| N2  | `onError: (e: any)` → `(e: Error)` sur 10 écrans                                            | AlertRules, Branches, Depenses, Drivers, EcoConduite, Groupes, Maintenance, Pneus, Rules, SubUsers, VehiclesList |
| N3  | Badge opacity `'18'` (9%) → `'26'` (15%) — contraste WCAG amélioré                          | VehiclesListScreen, AlertRulesScreen                                                                             |
| N8  | `portal.ts` — suppression header `Content-Type: multipart/form-data` manuel (doublon Axios) | `portal.ts`                                                                                                      |
| I3  | Gestion 429 Rate Limit avec `Retry-After` — 1 retry automatique si délai ≤ 60s              | `client.ts`                                                                                                      |
| I8  | `.gitignore` — `credentials.json` ajouté (Apple Team ID + clés de signature EAS)            | `.gitignore`                                                                                                     |

---

### Items en attente (décisions externes)

| Ref    | Description                                                         | Action requise                                               |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| **B3** | Apple Store URL factice `id0000000000` dans `useAppVersionCheck.ts` | Remplacer après soumission App Store Connect                 |
| **B4** | Expo SDK 54 → SDK 55                                                | `npx expo install --fix` sur branche dédiée + test build EAS |
| **I1** | Pas de refresh token                                                | Endpoint `/auth/refresh` à créer côté backend                |
| **I2** | Pas de circuit breaker                                              | Dépend du SLA prod cible                                     |
| **I4** | `User.permissions[]` non exploité                                   | Décision archi V1 vs V2                                      |
| **I6** | 3 formats pagination non standardisés                               | Refactor API majeur                                          |
| **N1** | accessibilityLabels sur tous les écrans                             | Travail continu à la livraison                               |

### Checklist finale avant soumission store

**iOS (App Store)**

- [x] Privacy Manifest `PrivacyInfo.xcprivacy` via plugin EAS
- [x] Permissions justifiées
- [x] Sentry source maps configuré
- [ ] Apple Store ID réel dans `useAppVersionCheck.ts`
- [ ] Build EAS production sans warning Privacy Manifest
- [ ] Expo SDK 55 (recommandé)

**Android (Google Play)**

- [x] Permissions manifest nettoyées
- [x] `USE_BIOMETRIC` uniquement (pas `USE_FINGERPRINT`)
- [x] `credentials.json` hors du dépôt git
- [ ] Build EAS production — vérifier permissions dans Play Console

**Qualité & Sécurité**

- [x] Sentry `beforeSend` — GPS/contacts/tokens redactés
- [x] `queryClient.clear()` sur session expirée ET logout
- [x] Rate limit 429 géré avec `Retry-After`
- [x] 71 tests unitaires générateurs rapports (+ 581 tests total)

---

_Rapport mis à jour le 2026-04-14_
