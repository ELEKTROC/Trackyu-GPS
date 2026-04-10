import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg transition-all duration-200 ease-out appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2224%22%20height%3d%2224%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22%239ca3af%22%20stroke-width%3d%222%22%20stroke-linecap%3d%22round%22%20stroke-linejoin%3d%22round%22%3e%3cpolyline%20points%3d%226%209%2012%2015%2018%209%22%3e%3c%2fpolyline%3e%3c%2fsvg%3e')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          borderColor: error ? 'var(--color-error)' : 'var(--border)',
        }}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';
