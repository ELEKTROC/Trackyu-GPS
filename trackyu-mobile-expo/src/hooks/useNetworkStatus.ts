/**
 * TrackYu Mobile - Network Status Hook
 *
 * Détecte la connectivité réseau et déclenche un refetch auto à la reconnexion.
 * Affiche une bannière "Hors ligne" via le composant OfflineBanner.
 */
import { useEffect, useRef, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { resetCircuit } from '../utils/circuitBreaker';

// Délai avant de considérer la reconnexion comme stable (évite les invalidations
// en rafale sur un réseau qui oscille : wifi faible, tunnels, changements 4G/5G)
const RECONNECT_STABLE_DELAY_MS = 3_000;

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const wasOffline = useRef(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);

      if (!online) {
        // Annuler un timer de reconnexion en attente si on reperd la connexion
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
        wasOffline.current = true;
      } else if (wasOffline.current) {
        // Reconnexion détectée — attendre que le signal soit stable avant d'invalider
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => {
          wasOffline.current = false;
          reconnectTimer.current = null;
          // Réseau de retour → réinitialiser le circuit breaker avant de refetch
          resetCircuit();
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          queryClient.invalidateQueries({ queryKey: ['portal-dashboard'] });
        }, RECONNECT_STABLE_DELAY_MS);
      }
    });

    return () => {
      unsubscribe();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [queryClient]);

  return { isOnline };
}
