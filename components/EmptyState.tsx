
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  /** Mode compact : pas de hauteur minimale, espacement réduit. Pour les charts, tables, sections secondaires. */
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 text-center ${className}`}>
        <div className="p-2.5 rounded-full mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <Icon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </div>
        <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-xs max-w-[220px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-3 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px] ${className}`}>
      <div className="p-4 rounded-full mb-4 shadow-sm" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <Icon className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
      </div>
      <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-sm max-w-xs mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
