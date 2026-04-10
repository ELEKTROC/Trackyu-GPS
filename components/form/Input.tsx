import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          borderColor: error ? 'var(--color-error)' : 'var(--border)',
        }}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
