import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface FormSectionProps {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  icon: Icon,
  iconClassName = 'text-[var(--primary)]',
  children,
  className = '',
  description,
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-b border-[var(--border)] pb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          {Icon && (
            <span className="w-7 h-7 rounded-lg bg-[var(--primary-dim)] flex items-center justify-center">
              <Icon className={`w-4 h-4 ${iconClassName}`} />
            </span>
          )}
          {title}
        </h3>
        {description && <p className="text-xs text-[var(--text-muted)] mt-1 ml-9">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
};
