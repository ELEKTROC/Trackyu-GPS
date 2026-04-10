import React, { useRef, useState, useEffect } from 'react';
import type { LucideIcon} from 'lucide-react';
import { ChevronRight } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, className = '' }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Check if content overflows and needs scroll indicator
  useEffect(() => {
    const checkOverflow = () => {
      if (scrollRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = scrollRef.current;
        const canScrollRight = scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 10;
        setShowScrollIndicator(canScrollRight);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkOverflow);
    }

    return () => {
      window.removeEventListener('resize', checkOverflow);
      if (scrollEl) {
        scrollEl.removeEventListener('scroll', checkOverflow);
      }
    };
  }, [tabs]);

  return (
    <div className={`relative ${className}`}>
      {/* Tabs Container */}
      <div 
        ref={scrollRef}
        className="flex items-center gap-1 mb-3 sm:mb-4 lg:mb-6 overflow-x-auto pb-1 shrink-0 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-hide snap-x snap-mandatory scroll-smooth"
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 lg:px-4 py-2 rounded-lg text-xs sm:text-xs lg:text-sm font-bold transition-all whitespace-nowrap touch-manipulation snap-start min-w-fit min-h-[44px] border"
              style={isActive
                ? { backgroundColor: 'var(--primary)', color: '#ffffff', borderColor: 'var(--primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }
                : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }
              }
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
            >
              {tab.icon && <tab.icon className="w-4 h-4 shrink-0" />}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scroll Indicator (mobile only) */}
      {showScrollIndicator && (
        <div className="sm:hidden absolute right-0 top-0 bottom-1 w-10 pointer-events-none flex items-center justify-end pr-1" style={{ background: 'linear-gradient(to left, var(--bg-primary), transparent)' }}>
          <div className="w-6 h-6 rounded-full shadow-md flex items-center justify-center animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </div>
        </div>
      )}
    </div>
  );
};
