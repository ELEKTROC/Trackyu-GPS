/**
 * TrackYu Mobile — App Version Check
 *
 * Au démarrage, interroge le backend pour savoir si la version actuelle
 * est acceptable. Si une mise à jour forcée est requise, un modal bloquant
 * s'affiche et redirige vers le store.
 *
 * Endpoint attendu : GET /api/v1/app/version
 * Réponse :
 * {
 *   minVersion: "1.2.0",      // version minimale acceptée
 *   latestVersion: "1.3.0",   // dernière version disponible
 *   forceUpgrade: false,       // true → modal bloquant
 *   message?: "Nouvelle version disponible avec des correctifs importants."
 * }
 *
 * Si l'endpoint est absent (404/réseau), on ignore silencieusement.
 */
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import apiClient from '../api/client';

// TODO SÉCURITÉ : remplacer par l'identifiant Apple réel une fois l'app publiée sur l'App Store.
// Sans cela, le forceUpgrade sur iOS redirige vers une URL invalide et bloque l'utilisateur.
const APP_STORE_URL = 'https://apps.apple.com/app/trackyu/id0000000000';
const PLAY_STORE_URL = 'market://details?id=com.trackyugps.app';

export interface VersionStatus {
  forceUpgrade: boolean;
  softUpgrade: boolean;
  message: string;
  latestVersion: string;
  openStore: () => void;
  dismiss: () => void; // uniquement pour les soft upgrades
}

/** Compare deux versions sémantiques "X.Y.Z" → -1 / 0 / 1 */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

export function useAppVersionCheck(): VersionStatus | null {
  const [status, setStatus] = useState<VersionStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await apiClient.get<{
          minVersion: string;
          latestVersion: string;
          forceUpgrade?: boolean;
          message?: string;
        }>('/app/version');

        if (cancelled) return;

        const currentVersion = Constants.expoConfig?.version ?? '1.0.0';
        const { minVersion, latestVersion, forceUpgrade = false, message = '' } = res.data;

        const isBelowMin = compareSemver(currentVersion, minVersion) < 0;
        const isBelowLatest = compareSemver(currentVersion, latestVersion) < 0;

        if (!isBelowMin && !isBelowLatest) return; // tout va bien

        const openStore = () => {
          const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
          Linking.openURL(url).catch(() => {});
        };

        if (isBelowMin || forceUpgrade) {
          setStatus({
            forceUpgrade: true,
            softUpgrade: false,
            message: message || 'Une mise à jour obligatoire est disponible.',
            latestVersion,
            openStore,
            dismiss: () => {}, // non applicable pour force
          });
        } else {
          setStatus({
            forceUpgrade: false,
            softUpgrade: true,
            message: message || `Une nouvelle version (${latestVersion}) est disponible.`,
            latestVersion,
            openStore,
            dismiss: () => setStatus(null),
          });
        }
      } catch {
        // Endpoint absent ou réseau indisponible → on ignore
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
