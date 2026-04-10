import React from 'react';

export interface FormFieldProps {
  label: React.ReactNode;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  hint,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-sm font-medium text-[var(--text-primary)]">
        {label}
        {required && <span className="ml-0.5" style={{ color: 'var(--color-error)' }}>*</span>}
      </label>

      {children}

      {hint && !error && (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      )}

      {error && (
        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};
