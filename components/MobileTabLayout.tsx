import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, LucideIcon } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

export interface MobileTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
  color?: string; // Tailwind bg class e.g. 'bg-blue-500'
}

interface MobileTabLayoutProps {
  /** Tabs shown in the mobile list */
  tabs: MobileTabItem[];
  /** Currently active tab id */
  activeTab: string;
  /** Called when a tab is selected (both list click and already in content) */
  onTabChange: (id: string) => void;
  /** Label shown on the back button, e.g. "Interventions" */
  backLabel: string;
  /** The full view content — rendered when a tab is selected on mobile */
  children: React.ReactNode;
}

/**
 * MobileTabLayout — wraps any tabbed view to show a native-style list on mobile.
 *
 * Mobile flow:
 *   1. List of tabs (icon + label + chevron)
 *   2. Tap → set active tab + show children with a "← backLabel" header
 *   3. Tap back → return to list
 *
 * Desktop: renders children as-is (parent handles its own tab header).
 */
export const MobileTabLayout: React.FC<MobileTabLayoutProps> = ({
  tabs,
  activeTab,
  onTabChange,
  backLabel,
  children,
}) => {
  const isMobile = useIsMobile();
  const [mobileShowList, setMobileShowList] = useState(true);

  // Desktop — passthrough
  if (!isMobile) {
    return <>{children}</>;
  }

  const handleSelect = (id: string) => {
    onTabChange(id);
    setMobileShowList(false);
  };

  // ── Mobile: tab list ──────────────────────────────────────────────────────
  if (mobileShowList) {
    return (
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors active:scale-[0.98] ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {Icon && (
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tab.color || 'bg-blue-500'
                    }`}
                  >
                    <Icon style={{ width: 18, height: 18 }} className="text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      isActive
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-slate-800 dark:text-white'
                    }`}
                  >
                    {tab.label}
                  </p>
                  {tab.description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {tab.description}
                    </p>
                  )}
                </div>
                <ChevronRight
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-400' : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Mobile: content ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <button
        onClick={() => setMobileShowList(true)}
        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-3 shrink-0 self-start active:opacity-70"
      >
        <ChevronLeft className="w-4 h-4" />
        {backLabel}
      </button>
      {children}
    </div>
  );
};
