import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
    /** Current value (controlled) */
    value: string;
    /** Called on value change */
    onChange: (value: string) => void;
    /** Placeholder text */
    placeholder?: string;
    /** Debounce delay in ms (0 = no debounce) */
    debounceMs?: number;
    /** Visual size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Fixed or responsive width */
    width?: 'full' | 'auto' | 'w-48' | 'w-64';
    /** Show clear button when input has text */
    showClear?: boolean;
    /** Additional CSS classes on the wrapper */
    className?: string;
    /** aria-label for accessibility */
    ariaLabel?: string;
    /** Auto focus on mount */
    autoFocus?: boolean;
    /** Callback on Enter key */
    onEnter?: () => void;
}

const SIZE_CONFIG = {
    sm: {
        input: 'pl-8 pr-8 py-1.5 text-xs',
        icon: 'w-3.5 h-3.5',
        iconLeft: 'left-2.5',
        clearBtn: 'right-1.5 p-0.5',
        clearIcon: 'w-3 h-3',
    },
    md: {
        input: 'pl-10 pr-10 py-2 text-sm',
        icon: 'w-4 h-4',
        iconLeft: 'left-3',
        clearBtn: 'right-2 p-1',
        clearIcon: 'w-3.5 h-3.5',
    },
    lg: {
        input: 'pl-12 pr-12 py-3 text-base',
        icon: 'w-5 h-5',
        iconLeft: 'left-4',
        clearBtn: 'right-3 p-1',
        clearIcon: 'w-4 h-4',
    },
} as const;

const WIDTH_MAP: Record<string, string> = {
    full: 'w-full',
    auto: '',
    'w-48': 'w-48',
    'w-64': 'w-full sm:w-64',
};

/**
 * Composant SearchInput standardisé.
 * 
 * Caractéristiques :
 * - Icône Search à gauche
 * - Bouton X pour vider (affiché quand du texte est saisi)
 * - Debounce optionnel (300ms par défaut)
 * - 3 tailles : sm, md (défaut), lg
 * - Dark mode complet
 * - Focus ring bleu
 * 
 * @example
 * <SearchInput
 *     value={searchTerm}
 *     onChange={setSearchTerm}
 *     placeholder="Rechercher..."
 * />
 */
export const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    placeholder = 'Rechercher...',
    debounceMs = 300,
    size = 'md',
    width = 'full',
    showClear = true,
    className = '',
    ariaLabel,
    autoFocus = false,
    onEnter,
}) => {
    const [internalValue, setInternalValue] = useState(value);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const cfg = SIZE_CONFIG[size];

    // Sync external value → internal (for controlled updates from parent)
    useEffect(() => {
        setInternalValue(value);
    }, [value]);

    const emitChange = useCallback((val: string) => {
        if (debounceMs > 0) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => onChange(val), debounceMs);
        } else {
            onChange(val);
        }
    }, [debounceMs, onChange]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInternalValue(val);
        emitChange(val);
    };

    const handleClear = () => {
        setInternalValue('');
        onChange(''); // Immediate clear, no debounce
        if (debounceRef.current) clearTimeout(debounceRef.current);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && onEnter) {
            onEnter();
        }
        if (e.key === 'Escape') {
            handleClear();
        }
    };

    return (
        <div className={`relative ${WIDTH_MAP[width] || ''} ${className}`}>
            <Search
                className={`absolute ${cfg.iconLeft} top-1/2 -translate-y-1/2 ${cfg.icon} pointer-events-none`}
                style={{ color: 'var(--text-muted)' }}
            />
            <input
                ref={inputRef}
                type="text"
                value={internalValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                aria-label={ariaLabel || placeholder}
                className={`${WIDTH_MAP[width] || 'w-full'} ${cfg.input} border rounded-lg transition-colors focus:outline-none`}
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            {showClear && internalValue && (
                <button
                    type="button"
                    onClick={handleClear}
                    className={`absolute ${cfg.clearBtn} top-1/2 -translate-y-1/2 rounded-full transition-colors hover:bg-[var(--bg-primary)]`}
                    style={{ color: 'var(--text-muted)' }}
                    title="Effacer la recherche"
                    aria-label="Effacer la recherche"
                >
                    <X className={cfg.clearIcon} />
                </button>
            )}
        </div>
    );
};
