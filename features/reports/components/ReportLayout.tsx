import React from 'react';
import { LucideIcon } from 'lucide-react';

// Props kept for backward compat with tab components — sidebar is now in ReportsView
interface ReportMenuItem {
    id: string;
    label: string;
    icon?: LucideIcon;
    description?: string;
    color?: string;
}

interface ReportLayoutProps {
    menuItems?: ReportMenuItem[];
    activeItem?: string;
    onItemChange?: (id: string) => void;
    children: React.ReactNode;
}

/**
 * ReportLayout — thin passthrough wrapper.
 * Navigation (catalog sidebar + mobile drawer) is now handled by ReportsView.
 */
export const ReportLayout: React.FC<ReportLayoutProps> = ({ children }) => {
    return (
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
            {children}
        </div>
    );
};
