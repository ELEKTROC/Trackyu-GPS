import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import React from 'react';

interface UseSwipeBackOptions {
  onSwipeBack: () => void;
  enabled?: boolean;
  threshold?: number; // Minimum distance to trigger
  edgeWidth?: number; // Width of the edge detection zone
}

/**
 * Hook to enable swipe-back gesture navigation on mobile.
 * Detects swipe from left edge to navigate back.
 */
export const useSwipeBack = ({
  onSwipeBack,
  enabled = true,
  threshold = 100,
  edgeWidth = 30
}: UseSwipeBackOptions) => {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    // Only trigger if starting from left edge
    if (touch.clientX <= edgeWidth) {
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      setIsSwiping(true);
    }
  }, [enabled, edgeWidth]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isSwiping || !enabled) return;
    
    const touch = e.touches[0];
    currentXRef.current = touch.clientX;
    
    const deltaX = currentXRef.current - startXRef.current;
    const deltaY = Math.abs(touch.clientY - startYRef.current);
    
    // Cancel if vertical movement is greater (user is scrolling)
    if (deltaY > 50 && deltaY > deltaX) {
      setIsSwiping(false);
      setSwipeProgress(0);
      return;
    }
    
    if (deltaX > 0) {
      const progress = Math.min(deltaX / threshold, 1);
      setSwipeProgress(progress);
      
      // Prevent default scrolling while swiping
      if (deltaX > 20) {
        e.preventDefault();
      }
    }
  }, [isSwiping, enabled, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;
    
    const deltaX = currentXRef.current - startXRef.current;
    
    if (deltaX >= threshold) {
      // Haptic feedback simulation
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
      onSwipeBack();
    }
    
    setIsSwiping(false);
    setSwipeProgress(0);
    startXRef.current = 0;
    startYRef.current = 0;
    currentXRef.current = 0;
  }, [isSwiping, threshold, onSwipeBack]);

  useEffect(() => {
    if (!enabled) return;
    
    // Only enable on touch devices
    if (!('ontouchstart' in window)) return;
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Create overlay element for visual feedback
  const overlayElement = useMemo(() => {
    if (!isSwiping || swipeProgress < 0.1) return null;
    
    return React.createElement('div', {
      className: 'fixed left-0 top-0 bottom-0 z-[200] pointer-events-none',
      style: {
        width: `${swipeProgress * 100}px`,
        background: `linear-gradient(to right, rgba(59, 130, 246, ${swipeProgress * 0.3}), transparent)`,
        transition: 'none'
      }
    }, React.createElement('div', {
      className: 'absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center border border-slate-200 dark:border-slate-700',
      style: {
        opacity: swipeProgress,
        transform: `translateY(-50%) translateX(${swipeProgress * 30}px) scale(${0.8 + swipeProgress * 0.2})`
      }
    }, React.createElement('svg', {
      className: 'w-5 h-5 text-blue-600',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24',
      style: { transform: `rotate(${swipeProgress * -30}deg)` }
    }, React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: 2,
      d: 'M15 19l-7-7 7-7'
    }))));
  }, [isSwiping, swipeProgress]);

  return {
    swipeProgress,
    isSwiping,
    overlayElement
  };
};

export default useSwipeBack;
