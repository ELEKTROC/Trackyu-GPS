import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';

export type BottomSheetState = 'collapsed' | 'half' | 'full' | 'closed';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  initialState?: BottomSheetState;
  showHandle?: boolean;
  showCloseButton?: boolean;
  collapsedHeight?: number; // vh
  halfHeight?: number; // vh
  fullHeight?: number; // vh
  onStateChange?: (state: BottomSheetState) => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  initialState = 'half',
  showHandle = true,
  showCloseButton = true,
  collapsedHeight = 20,
  halfHeight = 50,
  fullHeight = 90,
  onStateChange,
}) => {
  const [sheetState, setSheetState] = useState<BottomSheetState>(initialState);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentHeightRef = useRef(0);

  // Get height based on state
  const getHeightForState = useCallback((state: BottomSheetState): number => {
    switch (state) {
      case 'collapsed': return collapsedHeight;
      case 'half': return halfHeight;
      case 'full': return fullHeight;
      case 'closed': return 0;
      default: return halfHeight;
    }
  }, [collapsedHeight, halfHeight, fullHeight]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSheetState(initialState);
      setDragOffset(0);
    }
  }, [isOpen, initialState]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(sheetState);
  }, [sheetState, onStateChange]);

  // Handle touch/mouse start
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
    currentHeightRef.current = getHeightForState(sheetState);
  }, [sheetState, getHeightForState]);

  // Handle touch/mouse move
  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    
    const deltaY = startYRef.current - clientY;
    const deltaVh = (deltaY / window.innerHeight) * 100;
    setDragOffset(deltaVh);
  }, [isDragging]);

  // Handle touch/mouse end
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const currentHeight = currentHeightRef.current + dragOffset;
    
    // Determine new state based on final position
    if (currentHeight < 10) {
      // Close if dragged very low
      setSheetState('closed');
      onClose();
    } else if (currentHeight < (collapsedHeight + halfHeight) / 2) {
      setSheetState('collapsed');
    } else if (currentHeight < (halfHeight + fullHeight) / 2) {
      setSheetState('half');
    } else {
      setSheetState('full');
    }
    
    setDragOffset(0);
  }, [isDragging, dragOffset, collapsedHeight, halfHeight, fullHeight, onClose]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen && sheetState === 'closed') return null;

  const baseHeight = getHeightForState(sheetState);
  const currentHeight = Math.max(0, Math.min(95, baseHeight + dragOffset));

  return (
    <>
      {/* Backdrop - only visible when expanded */}
      {sheetState === 'full' && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`fixed inset-x-0 bottom-0 z-50 bg-[var(--bg-surface)] rounded-t-2xl shadow-2xl border-t border-[var(--border)] ${
          isDragging ? '' : 'transition-all duration-300 ease-out'
        }`}
        style={{
          height: `${currentHeight}vh`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag Handle Area */}
        {showHandle && (
          <div
            className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
          >
            <div className="w-10 h-1.5 bg-[var(--border-strong)] rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
            {title && (
              <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] rounded-full transition-colors touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ height: `calc(100% - ${showHandle ? '24px' : '0px'} - ${title || showCloseButton ? '56px' : '0px'})` }}>
          {children}
        </div>

        {/* State indicator dots (optional visual feedback) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 pb-safe">
          {['collapsed', 'half', 'full'].map((state) => (
            <button
              key={state}
              onClick={() => setSheetState(state as BottomSheetState)}
              className="w-2 h-2 rounded-full transition-colors"
              style={{ backgroundColor: sheetState === state ? 'var(--primary)' : 'var(--border-strong)' }}
              aria-label={`Set sheet to ${state}`}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default BottomSheet;
