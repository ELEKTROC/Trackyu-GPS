import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, style, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`
          w-full px-3 py-2.5
          text-sm
          border rounded-lg
          transition-all duration-200 ease-out
          resize-y min-h-[80px]
          focus:outline-none focus:ring-4
          ${error
            ? 'focus:ring-[var(--color-error)]/20'
            : 'focus:ring-[var(--primary)]/20'
          }
          disabled:cursor-not-allowed disabled:opacity-60
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          borderColor: error ? 'var(--color-error)' : 'var(--border)',
          ...style,
        }}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
