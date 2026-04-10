# 📱 Développement Mobile

## Options Disponibles

| Option | Technologie | Dossier | Usage |
|--------|-------------|---------|-------|
| **Capacitor** | WebView | `/android` | Production actuelle |
| **React Native** | Native | `/trackyu-mobile` | Optionnel |

## 📦 Capacitor (WebView)

### Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/         # Code natif Android
│   │   ├── res/          # Resources (icônes, splash)
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── capacitor.settings.gradle
└── build.gradle
```

### Commandes

```powershell
# Synchroniser les changements web vers Android
npx cap sync android

# Ouvrir dans Android Studio
npx cap open android

# Build APK debug
cd android
./gradlew assembleDebug

# APK généré dans :
# android/app/build/outputs/apk/debug/app-debug.apk

# Build APK release (signé)
./gradlew assembleRelease
```

### Configuration (`capacitor.config.ts`)

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trackyu.gps',
  appName: 'TrackYu GPS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Pour dev local (décommenter)
    // url: 'http://192.168.1.X:5173',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e40af'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
```

### Détection Plateforme

```typescript
// utils/apiConfig.ts
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'

// URL API automatique
export const API_BASE_URL = isNative
  ? 'https://api.trackyugps.com'  // Production
  : import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

## 📱 React Native (Optionnel)

### Structure

```
trackyu-mobile/
├── src/
│   ├── screens/          # Écrans
│   │   ├── auth/
│   │   ├── main/
│   │   └── settings/
│   ├── components/       # Composants
│   ├── services/         # API, storage
│   ├── hooks/           # Hooks personnalisés
│   └── navigation/      # React Navigation
├── android/
├── ios/
├── App.tsx
└── package.json
```

### Commandes

```powershell
cd trackyu-mobile

# Démarrer Metro bundler
npm start

# Run sur Android
npm run android

# Run sur iOS (Mac uniquement)
npm run ios

# Build release Android
cd android && ./gradlew assembleRelease
```

## 🎨 Adaptations UI Mobile

### Safe Areas

```css
/* index.css */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
.safe-area-left {
  padding-left: env(safe-area-inset-left);
}
.safe-area-right {
  padding-right: env(safe-area-inset-right);
}
```

```tsx
// Utilisation
<div className="safe-area-top safe-area-bottom">
  <Content />
</div>
```

### Responsive Design

```tsx
// Cacher sur mobile
<div className="hidden md:block">
  Desktop only
</div>

// Afficher sur mobile uniquement
<div className="block md:hidden">
  Mobile only
</div>

// Navigation mobile
<BottomNavigation className="fixed bottom-0 left-0 right-0 md:hidden" />
```

### Touch Interactions

```tsx
// Hook pour swipe back
import { useSwipeBack } from '../hooks/useSwipeBack';

function DetailScreen() {
  useSwipeBack(() => navigate(-1));
  
  return <div>...</div>;
}
```

## 🔔 Push Notifications

### Configuration Firebase

```typescript
// services/pushNotificationService.ts
import { PushNotifications } from '@capacitor/push-notifications';

export const initPushNotifications = async () => {
  // Demander permission
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;
  
  // S'enregistrer
  await PushNotifications.register();
  
  // Écouter le token
  PushNotifications.addListener('registration', (token) => {
    console.log('Push token:', token.value);
    // Envoyer au backend
    api.users.updatePushToken(token.value);
  });
  
  // Écouter les notifications
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });
};
```

### Backend - Envoi Push

```typescript
// services/pushService.ts
import admin from 'firebase-admin';

export const sendPushNotification = async (token: string, payload: any) => {
  await admin.messaging().send({
    token,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: payload.data
  });
};
```

## 📍 Géolocalisation

### Capacitor Geolocation

```typescript
import { Geolocation } from '@capacitor/geolocation';

// Position actuelle
const position = await Geolocation.getCurrentPosition();
console.log(position.coords.latitude, position.coords.longitude);

// Tracking continu
const watchId = Geolocation.watchPosition({
  enableHighAccuracy: true
}, (position) => {
  console.log('New position:', position);
});

// Arrêter le tracking
Geolocation.clearWatch({ id: watchId });
```

## 💾 Stockage Local

### Capacitor Storage

```typescript
import { Preferences } from '@capacitor/preferences';

// Sauvegarder
await Preferences.set({ key: 'token', value: 'xxx' });

// Récupérer
const { value } = await Preferences.get({ key: 'token' });

// Supprimer
await Preferences.remove({ key: 'token' });
```

## 🔧 Debugging

### Android Studio

```bash
# Logs Android
adb logcat | grep -i trackyu

# Installer APK debug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Chrome DevTools

```
1. Ouvrir Chrome
2. chrome://inspect
3. Sélectionner le WebView de l'app
4. Inspecter comme une page web
```

## ⚠️ Points d'Attention

1. **URL API** : Utiliser `apiConfig.ts` pour la détection automatique
2. **WebSocket** : Utiliser `WS_BASE_URL` distinct si nécessaire
3. **Safe Areas** : Toujours appliquer sur les écrans principaux
4. **Permissions** : Demander à l'utilisateur (localisation, notifications)
5. **Offline** : Gérer les cas de perte de connexion

---

*Dernière mise à jour : 2026-02-10*
