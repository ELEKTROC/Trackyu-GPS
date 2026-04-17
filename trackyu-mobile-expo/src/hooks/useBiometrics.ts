/**
 * TrackYu Mobile — useBiometrics
 * Détecte la disponibilité biométrique et expose la fonction de reconnexion silencieuse.
 */
import { useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import secureStorage from '../utils/secureStorage';

export type BiometricType = 'fingerprint' | 'faceid' | 'none';

interface UseBiometricsResult {
  available: boolean;
  biometricType: BiometricType;
  /** Tente la reconnexion via biométrie. Retourne les credentials si succès, null sinon. */
  authenticate: () => Promise<{ email: string; password: string } | null>;
}

export function useBiometrics(): UseBiometricsResult {
  const [available, setAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        setAvailable(false);
        return;
      }

      // Vérifie qu'on a des credentials stockés pour la biométrie
      const hasCreds = await secureStorage.getToken(); // token présent = session précédente
      if (!hasCreds) {
        setAvailable(false);
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      setBiometricType(hasFace ? 'faceid' : 'fingerprint');
      setAvailable(true);
    })();
  }, []);

  const authenticate = async (): Promise<{ email: string; password: string } | null> => {
    try {
      const creds = await secureStorage.getBiometricCredentials();
      return creds;
    } catch {
      return null;
    }
  };

  return { available, biometricType, authenticate };
}
