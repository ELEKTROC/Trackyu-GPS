import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  /** Durée d'affichage en ms */
  duration: number;
  /** Timestamp de création (pour la progress bar) */
  createdAt: number;
  /** État d'animation : 'entering' → 'visible' → 'exiting' */
  animState: 'entering' | 'visible' | 'exiting';
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
}

/** Nombre max de toasts visibles simultanément */
const MAX_TOASTS = 5;

/** Durées par défaut selon le type */
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

/** Config visuelle par type (couleurs Tailwind cohérentes avec le design system) */
const TOAST_STYLES: Record<ToastType, {
  borderColor: string;
  iconColor: string;
  progressColor: string;
  Icon: typeof CheckCircle;
}> = {
  success: {
    borderColor: '#10B981',
    iconColor: '#10B981',
    progressColor: '#10B981',
    Icon: CheckCircle,
  },
  error: {
    borderColor: '#EF4444',
    iconColor: '#EF4444',
    progressColor: '#EF4444',
    Icon: AlertCircle,
  },
  warning: {
    borderColor: '#F59E0B',
    iconColor: '#F59E0B',
    progressColor: '#F59E0B',
    Icon: AlertTriangle,
  },
  info: {
    borderColor: '#3B82F6',
    iconColor: '#3B82F6',
    progressColor: '#3B82F6',
    Icon: Info,
  },
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Composant Toast individuel ─────────────────────────────────────
const ToastItem: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const style = TOAST_STYLES[toast.type];
  const IconComponent = style.Icon;
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const remainingRef = useRef(toast.duration);
  const startTimeRef = useRef(Date.now());

  // Gestion pause/reprise sur hover
  useEffect(() => {
    if (toast.animState === 'exiting') return;

    if (isPaused) return;

    startTimeRef.current = Date.now();
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingRef.current);

    return () => {
      clearTimeout(timer);
      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(remainingRef.current - elapsed, 0);
    };
  }, [isPaused, toast.id, toast.animState, onDismiss]);

  // Animation de la progress bar via CSS
  const progressDuration = `${toast.duration}ms`;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`
        pointer-events-auto relative flex items-start gap-3 pl-4 pr-3 py-3
        rounded-xl shadow-lg min-w-[320px] max-w-[420px] overflow-hidden
        ${toast.animState === 'entering' ? 'toast-enter' : ''}
        ${toast.animState === 'exiting' ? 'toast-exit' : ''}
      `}
      style={{
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        borderLeft: `3px solid ${style.borderColor}`,
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Icône */}
      <div className="shrink-0 mt-0.5" style={{ color: style.iconColor }}>
        <IconComponent className="w-[18px] h-[18px]" strokeWidth={2.5} />
      </div>

      {/* Message */}
      <p className="text-[13px] leading-5 font-medium flex-1 pr-1">{toast.message}</p>

      {/* Bouton fermer */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 mt-0.5 p-0.5 rounded-md hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-muted)]"
        aria-label="Fermer"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress bar en bas */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--border)]">
        <div
          ref={progressRef}
          className="h-full opacity-60"
          style={{
            backgroundColor: style.progressColor,
            width: '100%',
            animation: `toast-progress ${progressDuration} linear forwards`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
};

// ─── Provider ───────────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Cleanup all pending timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    // Lancer l'animation de sortie
    setToasts((prev) =>
      prev.map((t) => (t.id === id && t.animState !== 'exiting' ? { ...t, animState: 'exiting' as const } : t))
    );
    // Supprimer après l'animation (280ms)
    const t = setTimeout(() => {
      timersRef.current.delete(t);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 280);
    timersRef.current.add(t);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success', durationMs?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const duration = durationMs ?? DEFAULT_DURATIONS[type];

    setToasts((prev) => {
      // Éviter les doublons si même message + même type dans les 1500ms
      const isDuplicate = prev.some(
        (t) => t.message === message && t.type === type && Date.now() - t.createdAt < 1500
      );
      if (isDuplicate) return prev;

      const newToasts = [
        ...prev,
        { id, message, type, duration, createdAt: Date.now(), animState: 'entering' as const },
      ];

      // Limiter le nombre de toasts visibles (retirer les plus anciens)
      if (newToasts.length > MAX_TOASTS) {
        return newToasts.slice(-MAX_TOASTS);
      }
      return newToasts;
    });

    // Passage à 'visible' après l'animation d'entrée
    const t = setTimeout(() => {
      timersRef.current.delete(t);
      setToasts((prev) =>
        prev.map((t) => (t.id === id && t.animState === 'entering' ? { ...t, animState: 'visible' as const } : t))
      );
    }, 300);
    timersRef.current.add(t);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container — coin bas-droite, au-dessus de tout */}
      <div className="fixed bottom-20 lg:bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>

      {/* Styles d'animation inline (évite de dépendre de classes Tailwind custom) */}
      <style>{`
        @keyframes toast-slide-in {
          0% {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes toast-slide-out {
          0% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
        }
        @keyframes toast-progress {
          0% { width: 100%; }
          100% { width: 0%; }
        }
        .toast-enter {
          animation: toast-slide-in 0.3s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
        }
        .toast-exit {
          animation: toast-slide-out 0.25s cubic-bezier(0.06, 0.71, 0.55, 1) forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
