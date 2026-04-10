
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ElementType;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = "", title, action, icon: Icon, onClick }) => {
  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-200 bg-[var(--bg-surface)] border-[var(--border)] ${onClick ? 'cursor-pointer hover:border-[var(--border-strong)] hover:shadow-lg hover:shadow-black/20 active:scale-[0.99]' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {(title || action || Icon) && (
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {Icon && (
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--primary-dim)', color: 'var(--primary)' }}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
            {title && (
              typeof title === 'string' ? (
                <h3 className="font-semibold text-sm sm:text-base text-[var(--text-primary)]">{title}</h3>
              ) : (
                <div className="font-semibold text-sm sm:text-base text-[var(--text-primary)] w-full">{title}</div>
              )
            )}
          </div>
          {action && <div className="ml-4 shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-4 sm:p-6 text-[var(--text-primary)]">
        {children}
      </div>
    </div>
  );
};