/**
 * TrackYu Web — SearchBar
 * Miroir exact du composant mobile SearchBar.tsx
 *
 * Barre de recherche standardisée : icône Search à gauche, input,
 * bouton X pour effacer quand la valeur est non-vide.
 *
 * Usage :
 *   <SearchBar value={search} onChange={setSearch} placeholder="Nom, plaque..." />
 *   <SearchBar value={search} onChange={setSearch} height={38} />
 */
import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Rechercher...',
  height = 44,
  className = '',
  autoFocus = false,
  disabled = false,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`flex items-center gap-2 border border-[var(--border)] rounded-[10px] px-3 bg-[var(--bg-surface)] transition-colors focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_3px_var(--primary-dim)] ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      style={{ height }}
      onClick={() => inputRef.current?.focus()}
    >
      <Search
        size={16}
        className="text-[var(--text-muted)] shrink-0"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="flex-1 bg-transparent text-[var(--text-primary)] text-sm outline-none placeholder:text-[var(--text-muted)] min-w-0 disabled:cursor-not-allowed"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="shrink-0 p-1 -mr-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          aria-label="Effacer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default SearchBar;
