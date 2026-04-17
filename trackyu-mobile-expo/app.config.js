// app.config.js — config dynamique Expo (remplace app.json pour les valeurs sensibles)
// La clé Google Maps est injectée depuis les EAS Secrets au build (jamais en clair dans le repo)

const { withGradleProperties, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs   = require('fs');

// Plugin iOS Privacy Manifest (requis depuis iOS 17.2 / App Store mai 2024)
const withPrivacyManifest = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const privacyPath = path.join(cfg.modRequest.platformProjectRoot, 'TrackYu', 'PrivacyInfo.xcprivacy');
      const dir = path.dirname(privacyPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        privacyPath,
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- L'app ne fait pas de tracking publicitaire -->
  <key>NSPrivacyTracking</key>
  <false/>
  <!-- Aucun tracking domain utilisé -->
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <!-- APIs sensibles utilisées et raisons légitimes -->
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <!-- File timestamp APIs — expo-file-system, PDF generation -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>C617.1</string></array>
    </dict>
    <!-- UserDefaults — expo-secure-store fallback, React Native internals -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>CA92.1</string></array>
    </dict>
    <!-- System boot time — expo-modules-core perf monitoring -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>35F9.1</string></array>
    </dict>
    <!-- Disk space — expo-file-system -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>E174.1</string></array>
    </dict>
  </array>
  <!-- Données collectées par l'app -->
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <!-- Position GPS (fonctionnalité principale) -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypePreciseLocation</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
    <!-- Email — authentification compte -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
  </array>
</dict>
</plist>
`
      );
      return cfg;
    },
  ]);
};

// Plugin : force une version Gradle stable pour éviter le timeout de téléchargement
// sur les serveurs EAS. La version générée par le prebuild (8.14.x) peut ne pas être
// disponible dans le cache réseau EAS → IOException timeout systématique.
const GRADLE_VERSION = '8.13'; // minimum requis par AGP Expo SDK 54 / RN 0.81
const withGradleWrapper = (config) => {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const wrapperPath = path.join(
        cfg.modRequest.projectRoot,
        'android/gradle/wrapper/gradle-wrapper.properties'
      );
      if (!fs.existsSync(wrapperPath)) return cfg; // prebuild pas encore effectué
      let content = fs.readFileSync(wrapperPath, 'utf8');
      content = content.replace(
        /distributionUrl=.*/,
        `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`
      );
      fs.writeFileSync(wrapperPath, content);
      return cfg;
    },
  ]);
};

// Plugin inline : augmente org.gradle.jvmargs pour éviter l'OOM lors du build
// expo-build-properties 1.0.10 ne supporte pas gradleProperties directement
const withOptimizedBuild = (config) => {
  return withGradleProperties(config, (c) => {
    const REMOVE_KEYS = ['org.gradle.jvmargs', 'reactNativeArchitectures'];
    const props = c.modResults.filter(
      (p) => !(p.type === 'property' && REMOVE_KEYS.includes(p.key))
    );
    // Augmente la mémoire JVM — évite l'OOM avec New Architecture + biométrie
    props.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx3584m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError',
    });
    // Preview/debug : arm64-v8a uniquement (99% des appareils récents)
    // Réduit le temps de build et la consommation mémoire de ~75%
    props.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: 'arm64-v8a',
    });
    c.modResults = props;
    return c;
  });
};

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'TrackYu',
  slug: 'trackyu',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0D0D0F',
  },
  scheme: 'trackyu',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.trackyugps.app',
    googleServicesFile: './GoogleService-Info.plist',
    infoPlist: {
      NSCameraUsageDescription: 'TrackYu utilise l\'appareil photo pour joindre des photos aux tickets d\'assistance.',
      NSPhotoLibraryUsageDescription: 'TrackYu accède à votre galerie pour joindre des photos aux tickets d\'assistance.',
      NSLocationWhenInUseUsageDescription: 'TrackYu utilise votre localisation pour afficher la carte et les véhicules à proximité.',
      NSFaceIDUsageDescription: 'TrackYu utilise Face ID pour vous connecter de manière sécurisée.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#E8771A',
    },
    package: 'com.trackyugps.app',
    googleServicesFile: './google-services.json',
    config: {
      googleMaps: {
        // Injecté depuis EAS Secret GOOGLE_MAPS_API_KEY au moment du build
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'ACCESS_FINE_LOCATION',   // Carte GPS temps réel
      'ACCESS_COARSE_LOCATION', // Localisation approximative fallback
      'POST_NOTIFICATIONS',     // Alertes et notifications push
      'USE_BIOMETRIC',          // Authentification biométrique (Touch ID / Face ID)
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    withOptimizedBuild,
    withGradleWrapper,
    withPrivacyManifest,
    [
      'expo-build-properties',
      {
        android: {},
      },
    ],
    // Sentry plugin inclus UNIQUEMENT si les secrets sont disponibles.
    // Sans ça, sentry.gradle est injecté dans build.gradle et sentry-cli
    // échoue avec "An organization ID or slug is required" → BUILD FAILED.
    // En preview (sans secrets), Sentry SDK capture quand même les erreurs
    // à l'exécution via sentryDsn — seul l'upload des source maps est absent.
    ...(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG
      ? [[
          '@sentry/react-native/expo',
          {
            url: 'https://sentry.io/',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
          },
        ]]
      : []
    ),
    [
      'expo-notifications',
      {
        icon: './assets/adaptive-icon.png',
        color: '#E8771A',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'TrackYu accède à votre galerie pour joindre des photos aux tickets d\'assistance.',
        cameraPermission: 'TrackYu utilise l\'appareil photo pour joindre des photos aux tickets d\'assistance.',
        microphonePermission: false,
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '2c6b9999-f36c-4b33-af68-fa01eee4c352',
    },
    // EAS Secret requis : eas secret:create --name SENTRY_DSN --value <dsn>
    sentryDsn: process.env.SENTRY_DSN ?? '',
    // APP_ENV est injecte par eas.json (development/preview -> staging, production -> prod).
    // Si non defini (dev local Expo Go), on tape la prod par defaut pour rester
    // iso au comportement historique.
    apiUrl: process.env.APP_ENV === 'production'
      ? 'https://trackyugps.com/api'
      : process.env.APP_ENV === 'preview' || process.env.APP_ENV === 'development'
        ? 'https://staging.trackyugps.com/api'
        : 'https://trackyugps.com/api',
    wsUrl: process.env.APP_ENV === 'production'
      ? 'wss://trackyugps.com'
      : process.env.APP_ENV === 'preview' || process.env.APP_ENV === 'development'
        ? 'wss://staging.trackyugps.com'
        : 'wss://trackyugps.com',
    appEnv: process.env.APP_ENV ?? 'production',
  },
};
