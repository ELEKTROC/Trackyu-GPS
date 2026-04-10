// LazyViews.tsx - Lazy loaded views for code splitting
// This reduces the initial bundle size by loading views on-demand

import React, { Suspense, lazy, ComponentType } from 'react';

// Loading fallback component
export const ViewLoader: React.FC<{ name?: string }> = ({ name }) => (
    <div className="flex items-center justify-center h-full min-h-[400px] animate-in fade-in duration-300">
        <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
                {name ? `Chargement de ${name}...` : 'Chargement...'}
            </p>
        </div>
    </div>
);

// Error fallback component
export const ViewError: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ error, resetErrorBoundary }) => (
    <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 max-w-md">
            <p className="text-red-600 dark:text-red-400 font-bold mb-2">Erreur de chargement</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error.message}</p>
            <button
                onClick={resetErrorBoundary}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold"
            >
                Réessayer
            </button>
        </div>
    </div>
);

// Wrapper for lazy components with Suspense
export function withLazyLoad<P extends object>(
    loader: () => Promise<{ default: ComponentType<P> }>,
    displayName: string
): React.FC<P> {
    const LazyComponent = lazy(loader);

    const WrappedComponent: React.FC<P> = (props) => (
        <Suspense fallback={<ViewLoader name={displayName} />}>
            <LazyComponent {...props} />
        </Suspense>
    );

    WrappedComponent.displayName = `Lazy(${displayName})`;
    return WrappedComponent;
}

// === LAZY LOADED VIEWS ===

// Heavy views - Load on demand
export const LazyMapView = withLazyLoad(
    () => import('./features/map/components/MapView').then(m => ({ default: m.MapView })),
    'Carte'
);

export const LazyReportsView = withLazyLoad(
    () => import('./features/reports/components/ReportsView').then(m => ({ default: m.ReportsView })),
    'Rapports'
);

export const LazyAccountingView = withLazyLoad(
    () => import('./features/finance/components/AccountingView').then(m => ({ default: m.AccountingView })),
    'Comptabilité'
);

export const LazyTechView = withLazyLoad(
    () => import('./features/tech/components/TechView').then(m => ({ default: m.TechView })),
    'Technique'
);

export const LazyMonitoringView = withLazyLoad(
    () => import('./features/tech/components/monitoring/MonitoringView').then(m => ({ default: m.MonitoringView })),
    'Monitoring'
);

export const LazyStockView = withLazyLoad(
    () => import('./features/stock/components/StockView').then(m => ({ default: m.StockView })),
    'Stock'
);

export const LazyAgendaView = withLazyLoad(
    () => import('./features/agenda/components/AgendaView').then(m => ({ default: m.AgendaView })),
    'Agenda'
);

export const LazySupportView = withLazyLoad(
    () => import('./features/support/components/SupportViewV2').then(m => ({ default: m.SupportViewV2 })),
    'Support'
);

export const LazySuperAdminView = withLazyLoad(
    () => import('./features/admin/components/SuperAdminView').then(m => ({ default: m.SuperAdminView })),
    'Administration'
);

export const LazySettingsView = withLazyLoad(
    () => import('./features/settings/components/SettingsView').then(m => ({ default: m.SettingsView })),
    'Paramètres'
);

export const LazyPresalesView = withLazyLoad(
    () => import('./features/crm/components/PresalesView').then(m => ({ default: m.PresalesView })),
    'Prévente'
);

export const LazySalesView = withLazyLoad(
    () => import('./features/crm/components/SalesView').then(m => ({ default: m.SalesView })),
    'Vente'
);

export const LazyDashboardView = withLazyLoad(
    () => import('./features/dashboard/components/DashboardView').then(m => ({ default: m.DashboardView })),
    'Tableau de bord'
);

export const LazyFleetTable = withLazyLoad(
    () => import('./features/fleet/components/FleetTable').then(m => ({ default: m.FleetTable })),
    'Flotte'
);
