import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const MOBILE_BREAKPOINT = 1024;

/**
 * Détecte si l'utilisateur est sur mobile.
 * Couvre deux cas :
 * - APK natif Capacitor (Capacitor.isNativePlatform() === true)
 * - Navigateur mobile / petit écran (window.innerWidth < 1024px)
 *
 * Réactif au resize de fenêtre.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => Capacitor.isNativePlatform() || window.innerWidth < MOBILE_BREAKPOINT
  );

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setIsMobile(true);
      return;
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
