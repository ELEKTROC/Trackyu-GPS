import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface MobileFilterTab {
  id: string;
  label: string;
  activeCount: number;
  content: React.ReactNode;
}

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: MobileFilterTab[];
  activeCount: number;
  onReset: () => void;
  title?: string;
}

export const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  isOpen,
  onClose,
  tabs,
  activeCount,
  onReset,
  title = 'Filtres',
}) => {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');

  if (!isOpen) return null;

  const currentContent = tabs.find(t => t.id === activeTab)?.content;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--bg-overlay)]" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-[var(--bg-surface)] rounded-t-2xl shadow-2xl flex flex-col" style={{ height: '70vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <span className="font-bold text-[var(--text-primary)]">{title}</span>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <button onClick={onReset} className="text-xs font-medium" style={{ color: 'var(--color-error)' }}>
                Réinitialiser
              </button>
            )}
            <button onClick={onClose} aria-label="Fermer">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        {/* Two-panel body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: tabs */}
          <div className="w-28 border-r border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col shrink-0 overflow-y-auto">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center justify-between px-3 py-3.5 text-sm text-left border-b border-[var(--border)] transition-colors"
                  style={{
                    backgroundColor: isActive ? 'var(--bg-surface)' : undefined,
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    borderRight: isActive ? '2px solid var(--primary)' : undefined,
                  }}
                >
                  <span className="truncate">{tab.label}</span>
                  {tab.activeCount > 0 && (
                    <span
                      className="ml-1 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold shrink-0"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      {tab.activeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: options */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {currentContent}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border)] shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 text-white font-semibold rounded-xl transition-colors text-sm"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};

/** Ligne radio réutilisable (sélection unique) */
export const FilterRadioRow: React.FC<{
  value: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: () => void;
  count?: number;
}> = ({ label, checked, onChange, count }) => (
  <label className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer">
    <div className="flex items-center gap-2">
      <input type="radio" checked={checked} onChange={onChange} className="accent-[var(--primary)]" />
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
    </div>
    {count !== undefined && <span className="text-xs text-[var(--text-muted)] font-medium">{count}</span>}
  </label>
);

/** Ligne checkbox réutilisable (multi-sélection) */
export const FilterCheckRow: React.FC<{
  value: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: () => void;
  count?: number;
}> = ({ label, checked, onChange, count }) => (
  <label className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer">
    <div className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={onChange} className="rounded accent-[var(--primary)]" />
      <span className="text-sm text-[var(--text-primary)] truncate max-w-[140px]">{label}</span>
    </div>
    {count !== undefined && <span className="text-xs text-[var(--text-muted)] font-medium">{count}</span>}
  </label>
);
