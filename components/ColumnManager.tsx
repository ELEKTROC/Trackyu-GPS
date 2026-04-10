import React, { useState, useRef, useEffect } from 'react';
import { LayoutTemplate, X, Check, RotateCcw } from 'lucide-react';

export interface ColumnDef {
  id: string;
  label: string;
  locked?: boolean;
  defaultVisible?: boolean;
}

export interface ColumnPreset {
  id: string;
  label: string;
  columns: string[];
}

interface ColumnManagerProps {
  /** All available columns */
  columns: ColumnDef[];
  /** Currently visible column IDs */
  visible: string[];
  /** Callback when visibility changes */
  onChange: (visible: string[]) => void;
  /** Optional presets for quick column selection */
  presets?: ColumnPreset[];
  /** Button variant: 'icon' (default) or 'button' */
  variant?: 'icon' | 'button';
  /** Custom button className */
  buttonClassName?: string;
  /** Position of dropdown: 'left' or 'right' */
  position?: 'left' | 'right';
  /** Title shown in dropdown header */
  title?: string;
}

export const ColumnManager: React.FC<ColumnManagerProps> = ({
  columns,
  visible,
  onChange,
  presets = [],
  variant = 'icon',
  buttonClassName,
  position = 'right',
  title = 'Colonnes',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const toggleColumn = (colId: string) => {
    const col = columns.find(c => c.id === colId);
    if (col?.locked) return;

    if (visible.includes(colId)) {
      onChange(visible.filter(id => id !== colId));
    } else {
      onChange([...visible, colId]);
    }
  };

  const handleReset = () => {
    const defaultVisible = columns
      .filter(col => col.defaultVisible !== false)
      .map(col => col.id);
    onChange(defaultVisible);
  };

  const handlePreset = (preset: ColumnPreset) => {
    onChange(preset.columns);
  };

  const hiddenCount = columns.filter(c => !visible.includes(c.id) && !c.locked).length;
  const hasChanges = hiddenCount > 0;
  const isActive = isOpen || hasChanges;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClassName || (
          variant === 'icon'
            ? `p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors ${isOpen ? 'ring-2' : ''}`
            : `px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors`
        )}
        style={{
          color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
          backgroundColor: isOpen ? 'var(--bg-elevated)' : undefined,
        }}
        title="Gérer les colonnes"
      >
        <LayoutTemplate className="w-4 h-4" />
        {variant === 'button' && <span>Colonnes</span>}
        {hasChanges && variant === 'icon' && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {hiddenCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-2 w-56 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)] ${position === 'left' ? 'left-0' : 'right-0'}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{title}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] rounded transition-colors"
                title="Réinitialiser"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] rounded transition-colors"
                title="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Presets */}
          {presets.length > 0 && (
            <div className="p-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]/50">
              <div className="flex flex-wrap gap-1">
                {presets.map(preset => {
                  const isPresetActive = preset.columns.every(c => visible.includes(c)) &&
                    visible.filter(v => !columns.find(col => col.id === v)?.locked).length === preset.columns.filter(c => !columns.find(col => col.id === c)?.locked).length;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handlePreset(preset)}
                      className="px-2 py-1 text-xs rounded-md transition-colors"
                      style={{
                        backgroundColor: isPresetActive ? 'var(--primary-dim)' : 'var(--bg-elevated)',
                        color: isPresetActive ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: isPresetActive ? 600 : 400,
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Columns List */}
          <div className="max-h-72 overflow-y-auto p-1 custom-scrollbar">
            {columns.map(col => {
              const isVisible = visible.includes(col.id);
              const isLocked = col.locked;

              return (
                <label
                  key={col.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg-elevated)] cursor-pointer'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0"
                    style={{
                      backgroundColor: isVisible ? 'var(--primary)' : 'var(--bg-elevated)',
                      borderColor: isVisible ? 'var(--primary)' : 'var(--border-strong)',
                      color: '#ffffff',
                    }}
                  >
                    {isVisible && <Check className="w-3 h-3" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleColumn(col.id)}
                    disabled={isLocked}
                    className="sr-only"
                  />
                  <span
                    className="text-sm flex-1"
                    style={{ color: isVisible ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    {col.label}
                  </span>
                  {isLocked && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                      Requis
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
            <span className="text-xs text-[var(--text-muted)]">
              {visible.length} / {columns.length} colonnes affichées
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnManager;
