import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton loading placeholder component.
 * Provides visual feedback while content is loading.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-[var(--bg-elevated)]';
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: ''
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

// === PRESET SKELETONS ===

/**
 * Card skeleton for vehicle cards in FleetTable
 */
export const VehicleCardSkeleton: React.FC = () => (
  <div className="rounded-xl border bg-[var(--bg-surface)] border-[var(--border)] p-3 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton variant="rounded" width={44} height={44} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
      <Skeleton variant="text" width={50} height={24} />
    </div>
    <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
      <Skeleton variant="rounded" width={80} height={8} />
      <Skeleton variant="text" width={60} height={12} />
      <Skeleton variant="text" width={50} height={12} />
    </div>
  </div>
);

/**
 * Table row skeleton
 */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 6 }) => (
  <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)]">
    <Skeleton variant="circular" width={20} height={20} />
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton 
        key={i} 
        variant="text" 
        width={i === 0 ? '15%' : `${Math.random() * 10 + 8}%`} 
        height={14} 
      />
    ))}
  </div>
);

/**
 * Stats card skeleton for dashboard
 */
export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
    <div className="flex justify-between items-start mb-3">
      <Skeleton variant="rounded" width={40} height={40} />
      <Skeleton variant="text" width={80} height={10} />
    </div>
    <Skeleton variant="text" width="50%" height={28} className="mb-2" />
    <Skeleton variant="text" width="70%" height={12} />
  </div>
);

/**
 * Chart skeleton
 */
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <div className="rounded-xl border bg-[var(--bg-surface)] border-[var(--border)] p-4">
    <div className="flex justify-between items-center mb-4">
      <Skeleton variant="text" width={120} height={18} />
      <Skeleton variant="rounded" width={80} height={24} />
    </div>
    <div className="relative" style={{ height }}>
      <div className="absolute inset-0 flex items-end justify-around gap-2 px-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton 
            key={i} 
            variant="rounded" 
            width="10%" 
            height={`${30 + Math.random() * 60}%`} 
          />
        ))}
      </div>
    </div>
  </div>
);

/**
 * List item skeleton
 */
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-3 border-b border-[var(--border)]">
    <Skeleton variant="circular" width={40} height={40} />
    <div className="flex-1 space-y-2">
      <Skeleton variant="text" width="70%" height={14} />
      <Skeleton variant="text" width="50%" height={12} />
    </div>
    <Skeleton variant="rounded" width={60} height={24} />
  </div>
);

/**
 * Map sidebar skeleton
 */
export const MapSidebarSkeleton: React.FC = () => (
  <div className="space-y-2 p-3">
    <Skeleton variant="rounded" width="100%" height={40} className="mb-4" />
    {Array.from({ length: 8 }).map((_, i) => (
      <ListItemSkeleton key={i} />
    ))}
  </div>
);

/**
 * Dashboard skeleton - full page
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    {/* Stats row */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
    
    {/* Charts row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton height={250} />
      <ChartSkeleton height={250} />
    </div>
    
    {/* List */}
    <div className="rounded-xl border bg-[var(--bg-surface)] border-[var(--border)]">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <Skeleton variant="text" width={150} height={20} />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  </div>
);

/**
 * Fleet table skeleton
 */
export const FleetTableSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
  <div className="space-y-2">
    {isMobile ? (
      // Mobile cards
      <div className="p-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <VehicleCardSkeleton key={i} />
        ))}
      </div>
    ) : (
      // Desktop table
      <div>
        <div className="flex items-center gap-4 px-4 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="text" width={80} height={12} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <TableRowSkeleton key={i} columns={8} />
        ))}
      </div>
    )}
  </div>
);

export default Skeleton;
