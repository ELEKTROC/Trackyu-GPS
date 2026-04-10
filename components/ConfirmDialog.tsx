import React, { useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBgColor: 'rgba(239,68,68,0.15)',
    iconColor: 'var(--color-error)',
    confirmBtnColor: '#dc2626',
    confirmBtnHover: '#b91c1c',
  },
  warning: {
    icon: AlertTriangle,
    iconBgColor: 'rgba(245,158,11,0.15)',
    iconColor: 'var(--color-warning)',
    confirmBtnColor: '#d97706',
    confirmBtnHover: '#b45309',
  },
  info: {
    icon: Info,
    iconBgColor: 'rgba(59,130,246,0.15)',
    iconColor: 'var(--color-info)',
    confirmBtnColor: '#2563eb',
    confirmBtnHover: '#1d4ed8',
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Confirmer',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus the cancel button for safety (avoid accidental confirm)
      setTimeout(() => confirmRef.current?.focus(), 100);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-overlay)' }} onClick={onCancel} />
      <div className="relative w-full sm:max-w-md sm:rounded-xl sm:shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-xl border-0 sm:border animate-in slide-in-from-bottom sm:fade-in sm:zoom-in-95 duration-200" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-strong)' }} />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: config.iconBgColor }}>
              <IconComponent className="w-5 h-5" style={{ color: config.iconColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="confirm-title" className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p id="confirm-message" className="mt-2 text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{message}</p>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-lg border transition-colors touch-manipulation hover:bg-[var(--bg-elevated)]"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-lg text-white transition-colors touch-manipulation"
            style={{ backgroundColor: config.confirmBtnColor }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = config.confirmBtnHover; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = config.confirmBtnColor; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ Hook for imperative usage ============

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface UseConfirmDialogReturn {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  ConfirmDialogComponent: React.FC;
}

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: { message: '' },
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setState({ isOpen: true, options: opts, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(prev => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState(prev => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const ConfirmDialogComponent: React.FC = useCallback(() => (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.options.title}
      message={state.options.message}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      variant={state.options.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ), [state.isOpen, state.options, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialogComponent };
}
