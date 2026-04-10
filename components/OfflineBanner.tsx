import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Bandeau offline/online — affiché uniquement sur mobile (lg:hidden).
 * - Offline : bandeau rouge fixe en haut
 * - Retour en ligne : bandeau vert qui disparaît après 3s
 */
export const OfflineBanner: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
    } else if (wasOffline) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOnline, wasOffline]);

  if (!visible) return null;

  return (
    <div
      className="lg:hidden fixed top-16 left-0 right-0 z-[150] flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 animate-in slide-in-from-top"
      style={{ backgroundColor: isOnline ? 'var(--color-success)' : 'var(--color-error)' }}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 shrink-0" />
          Connexion rétablie
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 shrink-0" />
          Hors ligne — les données peuvent être obsolètes
        </>
      )}
    </div>
  );
};
