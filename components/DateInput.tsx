import React from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    /** Label shown above the input (also used as aria-label if no aria-label prop) */
    label?: string;
    /** Show a calendar icon inside the input */
    showIcon?: boolean;
    /** Input variant: default form field or inline compact */
    variant?: 'default' | 'compact';
    /** Use datetime-local instead of date */
    datetime?: boolean;
}

/**
 * Reusable date input with consistent styling, dark mode, and accessibility.
 * Replaces raw `<input type="date">` across the codebase.
 */
export const DateInput: React.FC<DateInputProps> = ({
    label,
    showIcon = false,
    variant = 'default',
    datetime = false,
    className = '',
    id,
    ...props
}) => {
    const inputId = id || (label ? `date-input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    
    const baseClasses = variant === 'compact'
        ? 'px-2 py-1.5 text-sm'
        : 'px-3 py-2.5 text-sm';

    const inputClasses = [
        baseClasses,
        'border border-slate-200 dark:border-slate-700 rounded-lg',
        'bg-slate-50 dark:bg-slate-900',
        'text-slate-800 dark:text-white',
        'focus:ring-2 focus:ring-blue-500 focus:outline-none',
        '[color-scheme:light] dark:[color-scheme:dark]',
        'transition-colors',
        showIcon ? 'pl-9' : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <div className="relative">
            {label && (
                <label 
                    htmlFor={inputId}
                    className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {showIcon && (
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
                )}
                <input
                    id={inputId}
                    type={datetime ? 'datetime-local' : 'date'}
                    aria-label={props['aria-label'] || label || undefined}
                    className={inputClasses}
                    {...props}
                />
            </div>
        </div>
    );
};
