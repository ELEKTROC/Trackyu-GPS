import React from 'react';

interface FormGridProps {
  cols?: 1 | 2 | 3 | 4;
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export const FormGrid: React.FC<FormGridProps> = ({
  cols,
  columns,
  children,
  className = ''
}) => {
  const resolvedCols: 1 | 2 | 3 | 4 = cols ?? columns ?? 2;
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[resolvedCols]} gap-4 ${className}`}>
      {children}
    </div>
  );
};
