# Chantier Deploiement Play Store — TrackYu Mobile

> Document de suivi du deploiement de l'app mobile TrackYu (Expo/React Native) sur Google Play Store.
> **Date de debut :** 2026-04-17
> **Objectif :** App publiee en production sur Play Store, robuste face aux scenarios reels.

---

## 1. Contexte

### Stack

- Expo SDK 54, React Native 0.81.5, TypeScript 5.9
- EAS Build (profils : development / preview / production)
- Backend : NestJS (staging et prod) derriere Caddy reverse proxy
- Domaines : `trackyugps.com` (prod app V1), `staging.trackyugps.com` (staging), `live.trackyugps.com` (reserve futur + hebergement pages legales)

### Infrastructure

- **VPS KVM1** : heberge staging + dev (environnement courant)
- **VPS KVM2** : prevu pour production (migration quand app deployee)

### Cibles utilisateurs

- Court terme : 100-500 users actifs
- Fin 2026 : jusqu'a 2000 users

### Strategie de release

- Internal Track Play Console → Production directe (pas de Closed/Open testing)
- Device de test : Android physique disponible

---

## 2. Avancement global

| #   | Chantier                                                    | Statut                              | Bloqueur                              |
| --- | ----------------------------------------------------------- | ----------------------------------- | ------------------------------------- |
| 1   | Audit code mobile (xlsx, deps, config)                      | **Termine**                         | —                                     |
| 2   | Suppression vulnerabilites (xlsx HIGH, axios MODERATE)      | **Termine**                         | —                                     |
| 3   | Multi-env mobile (APP_ENV staging/prod)                     | **Termine**                         | —                                     |
| 4   | Credentials Android (keystore + credentials.json gitignore) | **Termine**                         | —                                     |
| 5   | Tests unitaires locaux (915 passing)                        | **Termine**                         | —                                     |
| 6   | Load tests staging (baseline + authentifie)                 | **En pause**                        | Reseau local instable vers VPS        |
| 7   | Pages legales HTML (privacy + cgu + index) pretes           | **Termine**                         | —                                     |
| 8   | Bloc Caddy `live.trackyugps.com` snippet redige             | **Termine (deploy en attente SSH)** | SSH VPS                               |
| 9   | Assets Play Store (icon 512, feature graphic, screenshots)  | **A faire**                         | —                                     |
| 10  | Guide service account Google Play JSON redige               | **Termine (action user)**           | User clique dans Google Cloud Console |
| 11  | Crash tests device Android (45 scenarios)                   | **A faire**                         | APK preview a builder                 |
| 12  | Build AAB production EAS (signe keystore existant)          | **A faire**                         | Depend chantiers 7-10                 |
| 13  | Submit Play Console internal                                | **A faire**                         | Depend 12                             |
| 14  | Promote internal → production                               | **A faire**                         | Depend validation crash tests         |

---

## 3. Detail des chantiers

### 3.1 Termine

#### Audit code et vulnerabilites

- `xlsx ^0.18.5` supprime du `package.json` (Prototype Pollution + ReDoS HIGH CVE-2023-30533 / CVE-2024-22363)
- Branche Excel retiree de `src/screens/main/ReportsScreen.tsx` (icone + export + bouton)
- Fonction `exportXLSX` retiree de `src/screens/main/reports/export.ts`
- `npm audit fix` : axios 1.14.0 → 1.15.0 (SSRF), follow-redirects → 1.16.0
- Resultat : `npm audit` = 0 vulnerabilites

#### Multi-env mobile

- `app.config.js` : ajout `extra.apiUrl`, `extra.wsUrl`, `extra.appEnv` driven par `process.env.APP_ENV`
- `src/api/config.ts` : refactor pour lire depuis `Constants.expoConfig.extra` avec fallback prod
- Commandes build :
  - Staging : `APP_ENV=preview eas build --platform android --profile preview`
  - Prod : `APP_ENV=production eas build --platform android --profile production`

#### Credentials

- `credentials.json` : present, gitignore verifie
- `credentials/android/keystore.jks` : present, signe deja l'app
- Conserver ce keystore sans le perdre (sinon impossible de mettre a jour l'app sur Play Store)

### 3.2 En pause

#### Load tests

- **Smoke test** (00-smoke.yml) : `/api/health` 5 req/s sur 10s
- **Baseline** (01-baseline-health.yml) : paliers 5 → 2500 req/s sur `/api/health`
- **Auth-fleet** (02-auth-fleet.yml) : login + fetch vehicles, paliers 50 → 1000 req/s
- **Credentials test staging** : stockes dans GitHub Secrets (`TEST_EMAIL`, `TEST_PASSWORD`), pas en clair dans le repo
- **Probleme constate 2026-04-17** : `curl` direct alterne HTTP 200 (0.9s) et timeout 10s. SSH port 22 timeout egalement. Reseau local instable vers 148.230.126.62.
- **Reprise** : relancer depuis un autre reseau, ou via SSH user direct sur le VPS, ou depuis GitHub Actions runner.

### 3.3 A faire

#### Pages legales HTML — TERMINE (pret a deployer)

- Fichiers generes dans `trackyu-mobile-expo/legal/dist/` :
  - `index.html` : landing simple avec 2 cartes (privacy + cgu)
  - `privacy.html` : politique complete (12 sections, RGPD + loi ivoirienne)
  - `cgu.html` : CGU complete (10 sections)
  - `Caddyfile.snippet` : bloc Caddy pret a coller
- Design : mobile-first, CSS inline, palette orange/noir/blanc, dark mode auto (prefers-color-scheme)
- CSP stricte dans Caddy (no JS, inline CSS autorise)
- URLs finales :
  - `https://live.trackyugps.com/` → index
  - `https://live.trackyugps.com/privacy` → politique confidentialite
  - `https://live.trackyugps.com/cgu` → CGU
- **Deploy en attente** : SSH VPS KVM1 (reseau local instable), cf snippet pour procedure complete

#### Assets Play Store

- **Icon** : 512×512 PNG (a generer depuis `assets/icon.png` existant)
- **Feature graphic** : 1024×500 (branding TrackYu)
- **Screenshots** :
  - Min 2 (ideal 6) par taille d'ecran
  - Tailles : phone portrait 1080×1920 minimum
  - Capturer : LoginScreen, FleetScreen, MapScreen, VehicleDetailScreen, AlertsScreen, SettingsScreen
- **Short description** : 80 caracteres
- **Full description** : 4000 caracteres max (FR)

#### Google Play service account JSON — Guide TERMINE

- Guide detaille redige : `GOOGLE_PLAY_SERVICE_ACCOUNT.md` (7 sections, checklist finale)
- Parcours : Google Cloud Console → Service Account `eas-submit` → cle JSON → activer API Android Developer → inviter dans Play Console avec permissions app-level
- **Action requise user** : suivre le guide et placer le JSON a `trackyu-mobile-expo/secrets/google-play-service-account.json`
- Validation : `eas submit --platform android --latest --dry-run` doit renvoyer "no build found" (et non une erreur d'auth)

#### Crash tests device Android

- Checklist : `CRASH_TESTS_CHECKLIST.md` (45 scenarios, 8 categories)
- Prerequis : APK preview EAS installe sur device
- Commande build : `eas build --platform android --profile preview`
- Categories :
  1. Connectivite reseau (5)
  2. Authentification (5)
  3. Donnees et UI (8)
  4. Deep linking (5)
  5. Permissions Android (4)
  6. Ressources et performance (4)
  7. Edge cases TrackYu (5)
  8. Sentry validation (3)
- Reporting : OK / KO / NON TESTE par scenario, capture + logcat si KO

#### Build AAB production et submit

- Commande : `eas build --platform android --profile production`
- Attendre completion (15-20 min)
- Submit : `eas submit --platform android --latest` (utilise service account)
- Premier upload : track `internal`
- Tests internes (comptes listes dans Play Console)
- Promote vers `production` quand validation OK

---

## 4. Blocs Play Console a remplir

### Data Safety

- **Collect data** : Oui
- **Data types** :
  - Location : Approximate + Precise (GPS vehicule, pas user)
  - Personal info : Email, Name
  - App activity : App interactions, In-app search
- **Purpose** : App functionality
- **Encrypted in transit** : Oui (HTTPS/WSS)
- **User can request deletion** : Oui (via support@trackyugps.com)

### Content rating

- Questionnaire IARC : Business category, no ads, no UGC

### Target audience

- Age : 18+
- Countries : Cote d'Ivoire en V1, extension Afrique de l'Ouest ensuite

### Privacy Policy URL

- `https://live.trackyugps.com/privacy` (une fois deploye)

---

## 5. Prochaines etapes (ordre recommande)

1. ~~Rediger pages HTML legales~~ **Fait**
2. ~~Rediger guide service account Google Play~~ **Fait** (user doit executer le guide)
3. **User : recuperer `google-play-service-account.json`** suivant `GOOGLE_PLAY_SERVICE_ACCOUNT.md`
4. **Preparer assets Play Store** (icon 512, feature graphic, screenshots) — chantier B
5. **Build APK preview EAS** + crash tests device Android — chantier C
6. **Resoudre reseau ou reprendre load tests** depuis autre point
7. **Deployer pages legales** sur live.trackyugps.com (necessite SSH VPS)
8. **Build AAB production** + submit Play Console internal
9. **Promote internal → production** apres validation crash tests

---

## 6. Historique des decisions

| Date       | Decision                                                         | Raison                                                                              |
| ---------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 2026-04-17 | Suppression complete export Excel mobile                         | xlsx HIGH vuln, pas de fix amont                                                    |
| 2026-04-17 | Multi-env APP_ENV (staging vs prod)                              | API_URL etait hardcode, risque pointer staging en prod                              |
| 2026-04-17 | Privacy policy hebergee sur live.trackyugps.com (pages separees) | Play Store exige URL publique HTTPS                                                 |
| 2026-04-17 | Strategie release : Internal → Production direct                 | User a decide skip Closed/Open testing                                              |
| 2026-04-17 | Load tests en pause                                              | Reseau local instable vers VPS, tests non exploitables                              |
| 2026-04-17 | Pages legales generees en local (HTML mobile-first)              | User veut pages separees sur live.trackyugps.com, pret a deployer quand SSH revient |
| 2026-04-17 | Priorite A/C/D (legales, crash tests, service account)           | User a prioritise ces chantiers, assets Play Store (B) apres                        |
| 2026-04-17 | Build APK preview EAS reporte                                    | User a declare ne pas vouloir lancer le build maintenant (credits EAS)              |

---

## 7. Contacts et resources

- **Play Console** : account deja configure
- **Sentry** : DSN configure via EAS secret `SENTRY_DSN`
- **Google Maps** : API key via EAS secret `GOOGLE_MAPS_API_KEY`
- **Support email** : support@trackyugps.com (a declarer Play Console)
- **Privacy Policy** : `https://live.trackyugps.com/privacy` (a deployer)
- **CGU** : `https://live.trackyugps.com/cgu` (a deployer)

---

_Document mis a jour au fur et a mesure de l'avancement. Prochaine revue : apres chaque chantier termine._
