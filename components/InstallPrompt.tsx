import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { logger } from '../utils/logger';
import { useToast } from '../contexts/ToastContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Prompt Component
 * Shows a banner prompting users to install the app on their device.
 * Only appears on mobile devices when the app is not already installed.
 */
export const InstallPrompt: React.FC = () => {
  const { showToast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Debug log
    logger.debug('[PWA] InstallPrompt mounted');

    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    logger.debug('[PWA] isStandalone:', isStandalone);

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (don't show for 7 days)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    logger.debug('[PWA] dismissed:', dismissed);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      logger.debug('[PWA] daysSinceDismissed:', daysSinceDismissed);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
    logger.debug('[PWA] iOS:', iOS);

    // Detect mobile (Android or iOS)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    logger.debug('[PWA] isMobile:', isMobile);

    // For iOS, show our custom prompt after delay
    if (iOS && !isStandalone) {
      const timer = setTimeout(() => {
        logger.debug('[PWA] Showing iOS prompt');
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Chrome, listen for the beforeinstallprompt event
    let hasReceivedPrompt = false;
    const handleBeforeInstall = (e: Event) => {
      logger.debug('[PWA] beforeinstallprompt received!');
      e.preventDefault();
      hasReceivedPrompt = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      logger.debug('[PWA] App installed!');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    // Fallback: Show banner on mobile after 3 seconds even without beforeinstallprompt
    const fallbackTimer = setTimeout(() => {
      logger.debug('[PWA] Fallback timer - hasReceivedPrompt:', hasReceivedPrompt);
      if (!hasReceivedPrompt && isMobile) {
        logger.debug('[PWA] Showing fallback prompt');
        setShowPrompt(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    // If we have the deferred prompt, use it
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
          setIsInstalled(true);
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
      } catch (error) {
        logger.error('Install prompt error:', error);
      }
    } else {
      // Fallback: Show instructions for Android
      showToast('Pour installer : Menu \u22ee (3 points) \u2192 "Installer l\'application"', 'info');
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // Don't render if already installed or no prompt available
  if (isInstalled || !showPrompt) return null;

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-t-2xl shadow-2xl p-6 animate-in slide-in-from-bottom duration-300 safe-area-bottom">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Installer Trackyu GPS</h3>
            <button
              onClick={handleDismiss}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-elevated)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-[var(--text-secondary)]">
            <p className="text-sm">Pour installer l'application sur votre iPhone/iPad :</p>

            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  Appuyez sur le bouton <strong>Partager</strong> (icône carré avec flèche vers le haut)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>
                  Faites défiler et appuyez sur <strong>"Sur l'écran d'accueil"</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>
                  Appuyez sur <strong>"Ajouter"</strong> en haut à droite
                </span>
              </li>
            </ol>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full mt-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-medium rounded-xl transition-colors"
          >
            J'ai compris
          </button>
        </div>
      </div>
    );
  }

  // Install Banner
  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 z-[100] animate-in slide-in-from-bottom fade-in duration-300">
      <div className="max-w-md mx-auto bg-[var(--bg-elevated)] rounded-2xl shadow-2xl border border-[var(--border)] p-4 flex items-center gap-4">
        {/* App Icon */}
        <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
          <Smartphone className="w-7 h-7 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[var(--text-primary)] text-sm">Installer Trackyu GPS</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Accès rapide depuis votre écran d'accueil</p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDismiss}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-elevated)] transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={handleInstall}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Installer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
