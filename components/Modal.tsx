import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  /** Activer le guard de fermeture : affiche un avertissement si des modifications non sauvegardées existent */
  isDirty?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
  isDirty = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleForceClose = () => {
    setShowUnsavedWarning(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen) setShowUnsavedWarning(false);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseAttempt();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isDirty]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        onClick={handleCloseAttempt}
      />
      <div
        ref={modalRef}
        className={`relative w-full h-full sm:h-auto sm:rounded-xl sm:shadow-2xl ${maxWidth} overflow-hidden flex flex-col sm:max-h-[90vh] animate-in slide-in-from-bottom sm:fade-in sm:zoom-in-95 duration-200 border-0 sm:border rounded-t-2xl sm:rounded-xl`}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-strong)' }} />
        </div>
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <h3 className="text-base sm:text-lg font-bold truncate pr-2" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={handleCloseAttempt}
            title="Fermer"
            aria-label="Fermer"
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors touch-manipulation shrink-0 haptic-feedback hover:bg-[var(--bg-primary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto flex-1" style={{ color: 'var(--text-primary)' }}>
          {children}
        </div>

        {showUnsavedWarning && (
          <div
            className="mx-4 sm:mx-6 mb-3 p-3 border rounded-lg flex items-start gap-3 shrink-0 animate-in slide-in-from-bottom-2 duration-200"
            style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>
                Modifications non sauvegardées
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Vos modifications seront perdues si vous fermez.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="text-xs px-2.5 py-1.5 font-medium rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--color-warning)' }}
              >
                Continuer
              </button>
              <button
                type="button"
                onClick={handleForceClose}
                className="text-xs px-2.5 py-1.5 font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-warning)' }}
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {footer && (
          <div
            className="px-4 sm:px-6 py-3 sm:py-4 border-t flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
