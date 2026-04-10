import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { logger } from '../utils/logger';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  threshold?: number; // Distance to trigger refresh
}

/**
 * Pull-to-refresh wrapper component for mobile.
 * Wraps content and adds a pull gesture to trigger refresh.
 * Only activates on touch devices when at scroll position 0.
 */
export const PullToRefresh: React.FC<PullToRefreshProps> = ({ 
  onRefresh, 
  children,
  className = '',
  disabled = false,
  threshold = 80
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only start if scrolled to top
    const container = containerRef.current;
    if (container && container.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    currentYRef.current = e.touches[0].clientY;
    const delta = currentYRef.current - startYRef.current;
    
    if (delta > 0) {
      // Apply resistance - the further you pull, the harder it gets
      const resistance = 0.5;
      const distance = Math.min(delta * resistance, threshold * 1.5);
      setPullDistance(distance);
      
      // Prevent scroll while pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold / 2); // Keep spinner visible
      
      try {
        await onRefresh();
      } catch (error) {
        logger.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    
    startYRef.current = 0;
    currentYRef.current = 0;
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh, disabled]);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-10 transition-opacity duration-200"
        style={{ 
          top: -60,
          transform: `translateY(${pullDistance}px)`,
          opacity: pullDistance > 10 ? 1 : 0
        }}
      >
        <div 
          className={`flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 transition-all duration-200 ${
            shouldTrigger || isRefreshing ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : ''
          }`}
        >
          <RefreshCw 
            className={`w-5 h-5 transition-all duration-200 ${
              isRefreshing 
                ? 'animate-spin text-blue-600 dark:text-blue-400' 
                : shouldTrigger 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-slate-400 dark:text-slate-500'
            }`}
            style={{ 
              transform: isRefreshing ? 'none' : `rotate(${progress * 360}deg)` 
            }}
          />
        </div>
      </div>

      {/* Content with pull transform */}
      <div
        className="h-full"
        style={{
          transform: `translateY(${isRefreshing ? threshold / 2 : pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {children}
      </div>

      {/* Release text indicator */}
      {isPulling && pullDistance > 20 && (
        <div 
          className="absolute left-0 right-0 flex justify-center pointer-events-none z-10"
          style={{ 
            top: pullDistance - 20,
            opacity: progress
          }}
        >
          <span className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
            shouldTrigger 
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}>
            {shouldTrigger ? 'Relâchez pour rafraîchir' : 'Tirez pour rafraîchir'}
          </span>
        </div>
      )}
    </div>
  );
};

export default PullToRefresh;
