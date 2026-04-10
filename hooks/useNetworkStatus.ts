import { useState, useEffect } from 'react';

/**
 * Détecte l'état de la connexion réseau.
 * Se base sur navigator.onLine + événements online/offline.
 * Réactif : se met à jour en temps réel quand la connexion change.
 */
export function useNetworkStatus(): { isOnline: boolean; wasOffline: boolean } {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  // Reste true après un retour en ligne pour permettre un message "connexion rétablie"
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Réinitialise le flag après 4s
      setTimeout(() => setWasOffline(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
