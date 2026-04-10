import React from 'react';
import { LucideIcon } from 'lucide-react';

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
  iconClassName = 'text-blue-600 dark:text-blue-400',
  children,
  className = '',
  description
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          {Icon && (
            <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Icon className={`w-4 h-4 ${iconClassName}`} />
            </span>
          )}
          {title}
        </h3>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-9">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};
