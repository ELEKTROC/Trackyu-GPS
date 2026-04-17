/**
 * TrackYu Mobile - Secure Storage
 *
 * Stockage sécurisé pour données sensibles (token JWT, profil utilisateur).
 * Utilise react-native-keychain qui s'appuie sur :
 *   - Android : EncryptedSharedPreferences (Android Keystore)
 *   - iOS     : Keychain Services (Secure Enclave)
 *
 * ⚠️  Expo Go : react-native-keychain n'est pas disponible dans Expo Go (module natif
 *     non bundlé). On bascule sur AsyncStorage pour le développement uniquement.
 *     En production (EAS build), Keychain est toujours utilisé.
 *
 * NE PAS utiliser pour les préférences non-sensibles (utiliser storage.ts à la place).
 */
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const KEYCHAIN_AUTH = 'trackyu_token';
const KEYCHAIN_REFRESH = 'trackyu_refresh_token';
const KEYCHAIN_USER = 'trackyu_user';
const KEYCHAIN_CREDS = 'trackyu_biometric_creds';

// Détection Expo Go — react-native-keychain non disponible dans Expo Go (module natif)
const IS_EXPO_GO =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as unknown as Record<string, unknown>)['appOwnership'] === 'expo';

// Fallback AsyncStorage pour Expo Go (test uniquement — pas de chiffrement hardware)
const DEV_KEY_TOKEN = '@trackyu_dev_token';
const DEV_KEY_REFRESH = '@trackyu_dev_refresh_token';
const DEV_KEY_USER = '@trackyu_dev_user';

export const secureStorage = {
  /**
   * Sauvegarde le token JWT de façon sécurisée
   */
  setToken: async (token: string): Promise<void> => {
    if (IS_EXPO_GO) {
      await AsyncStorage.setItem(DEV_KEY_TOKEN, token);
      return;
    }
    await Keychain.setGenericPassword('token', token, { service: KEYCHAIN_AUTH });
  },

  /**
   * Récupère le token JWT stocké
   */
  getToken: async (): Promise<string | null> => {
    if (IS_EXPO_GO) {
      return AsyncStorage.getItem(DEV_KEY_TOKEN);
    }
    const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_AUTH });
    return credentials ? credentials.password : null;
  },

  /**
   * Sauvegarde le refresh token de façon sécurisée
   */
  setRefreshToken: async (token: string): Promise<void> => {
    if (IS_EXPO_GO) {
      await AsyncStorage.setItem(DEV_KEY_REFRESH, token);
      return;
    }
    await Keychain.setGenericPassword('refresh', token, { service: KEYCHAIN_REFRESH });
  },

  /**
   * Récupère le refresh token stocké
   */
  getRefreshToken: async (): Promise<string | null> => {
    if (IS_EXPO_GO) {
      return AsyncStorage.getItem(DEV_KEY_REFRESH);
    }
    const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_REFRESH });
    return credentials ? credentials.password : null;
  },

  /**
   * Supprime le refresh token
   */
  deleteRefreshToken: async (): Promise<void> => {
    if (IS_EXPO_GO) {
      await AsyncStorage.removeItem(DEV_KEY_REFRESH);
      return;
    }
    await Keychain.resetGenericPassword({ service: KEYCHAIN_REFRESH });
  },

  /**
   * Supprime le token JWT
   */
  deleteToken: async (): Promise<void> => {
    if (IS_EXPO_GO) {
      await AsyncStorage.removeItem(DEV_KEY_TOKEN);
      return;
    }
    await Keychain.resetGenericPassword({ service: KEYCHAIN_AUTH });
  },

  /**
   * Sauvegarde les données utilisateur (JSON sérialisé)
   */
  setUser: async (user: object): Promise<void> => {
    if (IS_EXPO_GO) {
      await AsyncStorage.setItem(DEV_KEY_USER, JSON.stringify(user));
      return;
    }
    await Keychain.setGenericPassword('user', JSON.stringify(user), { service: KEYCHAIN_USER });
  },

  /**
   * Récupère les données utilisateur et les désérialise
   */
  getUser: async <T>(): Promise<T | null> => {
    try {
      let str: string | null;
      if (IS_EXPO_GO) {
        str = await AsyncStorage.getItem(DEV_KEY_USER);
      } else {
        const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_USER });
        str = credentials ? credentials.password : null;
      }
      if (!str) return null;
      const parsed = JSON.parse(str);
      // Validation minimale : un user doit avoir id et email
      if (!parsed || typeof parsed !== 'object' || !parsed.id || !parsed.email) {
        return null;
      }
      return parsed as T;
    } catch {
      return null;
    }
  },

  /**
   * Supprime les données utilisateur
   */
  deleteUser: async (): Promise<void> => {
    if (IS_EXPO_GO) {
      await AsyncStorage.removeItem(DEV_KEY_USER);
      return;
    }
    await Keychain.resetGenericPassword({ service: KEYCHAIN_USER });
  },

  /**
   * Stocke les credentials pour la reconnexion biométrique.
   * Protégés par biométrie sur Android (BiometricStrong) et iOS (Biometrics).
   * Non disponible en Expo Go.
   */
  setBiometricCredentials: async (email: string, password: string): Promise<void> => {
    if (IS_EXPO_GO) return; // Biométrie non disponible en Expo Go
    await Keychain.setGenericPassword(email, password, {
      service: KEYCHAIN_CREDS,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
  },

  /**
   * Récupère les credentials protégés par biométrie.
   * Déclenche l'invite biométrique du système (empreinte / Face ID).
   */
  getBiometricCredentials: async (): Promise<{ email: string; password: string } | null> => {
    if (IS_EXPO_GO) return null;
    const result = await Keychain.getGenericPassword({
      service: KEYCHAIN_CREDS,
      authenticationPrompt: {
        title: 'Confirmer votre identité',
        subtitle: 'Utilisez votre empreinte ou Face ID pour vous reconnecter',
        cancel: 'Annuler',
      },
    });
    if (!result) return null;
    return { email: result.username, password: result.password };
  },

  /**
   * Supprime les credentials biométriques (déconnexion volontaire)
   */
  deleteBiometricCredentials: async (): Promise<void> => {
    if (IS_EXPO_GO) return;
    await Keychain.resetGenericPassword({ service: KEYCHAIN_CREDS });
  },

  /**
   * Supprime toutes les données sécurisées (déconnexion complète)
   */
  clearAll: async (): Promise<void> => {
    if (IS_EXPO_GO) {
      await Promise.all([
        AsyncStorage.removeItem(DEV_KEY_TOKEN),
        AsyncStorage.removeItem(DEV_KEY_REFRESH),
        AsyncStorage.removeItem(DEV_KEY_USER),
      ]);
      return;
    }
    await Promise.all([
      Keychain.resetGenericPassword({ service: KEYCHAIN_AUTH }),
      Keychain.resetGenericPassword({ service: KEYCHAIN_REFRESH }),
      Keychain.resetGenericPassword({ service: KEYCHAIN_USER }),
      Keychain.resetGenericPassword({ service: KEYCHAIN_CREDS }),
    ]);
  },
};

export default secureStorage;
