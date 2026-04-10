import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trackyugps.app',
  appName: 'Trackyu GPS',
  webDir: 'dist',
  // Mode Standalone : fichiers chargés depuis l'APK
  // Pour revenir en Remote mode, décommenter:
  // server: {
  //   url: 'https://trackyugps.com',
  //   androidScheme: 'https'
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e40af',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#ffffff'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e40af'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false  // Disable in production for security
  }
};

export default config;
