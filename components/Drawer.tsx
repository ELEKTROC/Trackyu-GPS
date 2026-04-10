
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | string;
}

const sizeClasses: Record<string, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  full: 'sm:max-w-full',
};

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, children, width = 'max-w-md', title, size }) => {
  const sizeClass = size ? (sizeClasses[size] || size) : width;
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-[2px] z-[60] transition-opacity pointer-events-auto"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
          onClick={onClose}
        />
      )}

      {/* Panel - Full width on mobile, constrained on larger screens */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[70] shadow-2xl border-l transform transition-transform duration-300 ease-in-out flex flex-col w-full sm:w-[90vw] md:w-[70vw] pointer-events-auto ${sizeClass} ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            <button onClick={onClose} className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-elevated)]" style={{ color: 'var(--text-secondary)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </>
  );
};
