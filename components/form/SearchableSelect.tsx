import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

export interface SearchableSelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    error?: boolean;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    sortAlphabetically?: boolean;
    emptyMessage?: string;
    id?: string;
    'aria-label'?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Sélectionner...',
    searchPlaceholder = 'Rechercher...',
    error = false,
    disabled = false,
    required = false,
    className = '',
    sortAlphabetically = true,
    emptyMessage = 'Aucun résultat',
    id,
    'aria-label': ariaLabel,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const sortedOptions = useMemo(() => {
        if (!sortAlphabetically) return options;
        return [...options].sort((a, b) =>
            a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })
        );
    }, [options, sortAlphabetically]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return sortedOptions;
        const term = searchTerm.toLowerCase();
        return sortedOptions.filter(opt =>
            opt.label.toLowerCase().includes(term)
        );
    }, [sortedOptions, searchTerm]);

    const selectedLabel = useMemo(() => {
        const selected = options.find(opt => opt.value === value);
        return selected?.label || '';
    }, [options, value]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
        switch (e.key) {
            case 'Enter':
            case ' ':
                if (!isOpen) { e.preventDefault(); setIsOpen(true); }
                break;
            case 'Escape':
                setIsOpen(false);
                setSearchTerm('');
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else if (listRef.current) {
                    const firstItem = listRef.current.querySelector('li:not([data-disabled])') as HTMLElement;
                    firstItem?.focus();
                }
                break;
        }
    };

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                id={id}
                disabled={disabled}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2.5 text-left text-sm border rounded-lg transition-all duration-200 ease-out flex items-center justify-between gap-2 focus:outline-none focus:ring-4"
                style={{
                    backgroundColor: disabled ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
                    color: value ? 'var(--text-primary)' : 'var(--text-muted)',
                    borderColor: error ? 'var(--color-error)' : 'var(--border)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                }}
            >
                <span>{selectedLabel || placeholder}</span>
                <div className="flex items-center gap-1">
                    {value && !disabled && !required && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-0.5 rounded hover:bg-[var(--border)]"
                            aria-label="Effacer"
                        >
                            <X className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 transition-transform text-[var(--text-muted)] ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 border border-[var(--border)] bg-[var(--bg-surface)]">
                    {/* Search Input */}
                    <div className="p-2 border-b border-[var(--border)]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:border-[var(--primary)]"
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                }}
                                aria-label="Rechercher dans la liste"
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <ul
                        ref={listRef}
                        role="listbox"
                        className="max-h-60 overflow-y-auto custom-scrollbar"
                    >
                        {filteredOptions.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-center text-[var(--text-muted)]">
                                {emptyMessage}
                            </li>
                        ) : (
                            filteredOptions.map(option => {
                                const isSelected = option.value === value;
                                return (
                                    <li
                                        key={option.value}
                                        role="option"
                                        aria-selected={isSelected}
                                        data-disabled={option.disabled || undefined}
                                        tabIndex={option.disabled ? -1 : 0}
                                        onClick={() => !option.disabled && handleSelect(option.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !option.disabled) {
                                                handleSelect(option.value);
                                            }
                                        }}
                                        className="px-3 py-2 text-sm cursor-pointer flex items-center justify-between focus:outline-none"
                                        style={{
                                            backgroundColor: isSelected ? 'var(--primary-dim)' : undefined,
                                            color: option.disabled
                                                ? 'var(--text-muted)'
                                                : isSelected
                                                    ? 'var(--primary)'
                                                    : 'var(--text-primary)',
                                            cursor: option.disabled ? 'not-allowed' : 'pointer',
                                        }}
                                        onMouseEnter={e => {
                                            if (!option.disabled && !isSelected) {
                                                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isSelected) {
                                                (e.currentTarget as HTMLElement).style.backgroundColor = '';
                                            }
                                        }}
                                    >
                                        <span>{option.label}</span>
                                        {isSelected && (
                                            <Check className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                                        )}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

SearchableSelect.displayName = 'SearchableSelect';
