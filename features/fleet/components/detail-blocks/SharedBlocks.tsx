import React, { useState } from 'react';
import { Eye, EyeOff, ChevronUp, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';

// Composant utilitaire pour rendre une ligne configurable (Masquer/Afficher)
export const ConfigurableRow: React.FC<{
  id: string;
  isConfigMode: boolean;
  isHidden: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ id: _id, isConfigMode, isHidden, onToggle, children, className = '' }) => {
  if (isHidden && !isConfigMode) return null;

  return (
    <div
      className={`relative group ${className} ${isConfigMode ? 'p-1 border border-dashed border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] transition-colors' : ''} ${isHidden ? 'opacity-50 grayscale' : ''}`}
    >
      {children}
      {isConfigMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="absolute -top-2 -right-2 bg-white shadow-md rounded-full p-1 text-[var(--text-secondary)] hover:text-[var(--primary)] border border-[var(--border)] z-10"
          title={isHidden ? 'Afficher' : 'Masquer'}
        >
          {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
};

// Composant utilitaire pour les sections repliables
export const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ElementType;
  onToggleVisibility?: () => void; // Pour le mode config du BLOC entier
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isConfigMode?: boolean;
  isVisible?: boolean;
  badge?: string | number; // Badge optionnel pour afficher un compteur
}> = ({
  title,
  children,
  defaultOpen = true,
  icon: Icon,
  isConfigMode,
  isVisible = true,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  badge: _badge,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (isConfigMode) {
    return (
      <div
        className={`border rounded-lg mb-3 p-3 flex flex-col transition-colors ${isVisible ? 'bg-white border-[var(--border)]' : 'bg-slate-50 border-[var(--border)]'}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleVisibility}
              className={`p-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors ${isVisible ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
            >
              {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-sm uppercase">
              {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
              {title}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onMoveUp?.()}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMoveDown?.()}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        </div>
        {isVisible && (
          <div className="pl-8 pr-2 pt-2 border-t border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] mb-2 uppercase font-bold">
              Contenu du bloc (Cliquez sur les éléments pour masquer)
            </p>
            {children}
          </div>
        )}
      </div>
    );
  }

  if (!isVisible) return null;

  return (
    <div className="border border-[var(--border)] rounded-lg bg-white overflow-hidden shadow-sm mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors"
      >
        <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-sm uppercase tracking-wide">
          {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
          {title}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>

      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
};
