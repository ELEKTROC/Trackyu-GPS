import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getDefaultViewForRole } from './features/admin/permissions/permissionStructure';
import { VehicleStatus, View, type Vehicle, type FleetMetrics } from './types';
import { Sidebar } from './components/Sidebar';
import { BottomNavigation } from './components/BottomNavigation';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { PullToRefresh } from './components/PullToRefresh';
import { DashboardSkeleton } from './components/Skeleton';
import { useSwipeBack } from './hooks/useSwipeBack';

// Lazy-loaded views for code splitting (reduces initial bundle by ~40%)
import {
  LazyMapView,
  LazyReportsView,
  LazyAccountingView,
  LazyTechView,
  LazyMonitoringView,
  LazyStockView,
  LazySupportView,
  LazySuperAdminView,
  LazySettingsView,
  LazyPresalesView,
  LazySalesView,
  LazyAgendaView,
  LazyDashboardView,
  LazyFleetTable,
} from './LazyViews';

import { Menu, Bell, MessageCircle, X, Search, Moon, Sun, Waves, RefreshCw } from 'lucide-react';
import { Drawer } from './components/Drawer';
import { useAuth } from './contexts/AuthContext';
import { LoginView } from './features/auth/components/LoginView';
import { ActivationPage } from './features/auth/components/ActivationPage';
import type { Notification } from './features/notifications/components/NotificationCenter';

// Lazy-loaded panels (not needed at initial render)
const VehicleDetailPanel = React.lazy(() =>
  import('./features/fleet/components/VehicleDetailPanel').then((m) => ({ default: m.VehicleDetailPanel }))
);
const AiAssistant = React.lazy(() =>
  import('./features/ai/components/AiAssistant').then((m) => ({ default: m.AiAssistant }))
);
const NotificationCenter = React.lazy(() =>
  import('./features/notifications/components/NotificationCenter').then((m) => ({ default: m.NotificationCenter }))
);
const CommandPalette = React.lazy(() =>
  import('./components/CommandPalette').then((m) => ({ default: m.CommandPalette }))
);
import { useTheme } from './contexts/ThemeContext';
import { useDataContext } from './contexts/DataContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { InstallPrompt } from './components/InstallPrompt';

// Générateur de notifications fictives (Removed)
// const generateNotifications = (vehicles: Vehicle[]): Notification[] => { ... };

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, hasPermission, logout, user, stopImpersonation, requirePasswordChange } =
    useAuth();
  const { theme, setTheme } = useTheme();
  const { vehicles, zones, alerts, markAlertAsRead, refreshData } = useDataContext(); // DATA FROM CONTEXT

  const prevUserIdRef = useRef<string | null>(null);

  const [currentView, setCurrentView] = useState<View>(() => {
    try {
      const stored = localStorage.getItem('fleet_user');
      if (stored) {
        const u = JSON.parse(stored);
        const v = getDefaultViewForRole(u.role);
        return View[v as keyof typeof View] ?? View.DASHBOARD;
      }
    } catch {
      /* ignore */
    }
    return View.DASHBOARD;
  });
  const [viewHistory, setViewHistory] = useState<View[]>([currentView]);

  // Rediriger vers l'écran de démarrage du rôle à chaque login
  useEffect(() => {
    if (user?.id && user.id !== prevUserIdRef.current) {
      const v = getDefaultViewForRole(user.role);
      const target = View[v as keyof typeof View] ?? View.DASHBOARD;
      setCurrentView(target);
      setViewHistory([target]);
    }
    prevUserIdRef.current = user?.id ?? null;
  }, [user?.id, user?.role]);

  // View Parameters Context for Deep Linking
  const [viewParams, setViewParams] = useState<Record<string, string>>({});

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Swipe back navigation for mobile
  const handleSwipeBack = useCallback(() => {
    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop();
      setViewHistory(newHistory);
      setCurrentView(newHistory[newHistory.length - 1]);
    }
  }, [viewHistory]);

  const { overlayElement } = useSwipeBack({
    onSwipeBack: handleSwipeBack,
    enabled: Capacitor.isNativePlatform() || window.innerWidth < 1024,
    threshold: 100,
  });

  // Replay State
  const [replayVehicle, setReplayVehicle] = useState<Vehicle | null>(null);

  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Global Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Map Backend Alerts to Frontend Notifications
  const notifications: Notification[] = useMemo(() => {
    return alerts.map((alert) => ({
      id: alert.id.toString(),
      type:
        alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
          ? 'ALERT'
          : alert.severity === 'MEDIUM'
            ? 'WARNING'
            : 'INFO',
      category: 'FLEET',
      title: alert.vehicleName ? `${alert.vehicleName} - ${alert.type}` : alert.type,
      message: alert.message,
      timestamp: new Date(alert.createdAt),
      read: alert.isRead,
      link: { view: 'MAP', id: alert.vehicleId },
    }));
  }, [alerts]);

  // Command Palette State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // GLOBAL KEYBOARD SHORTCUTS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ANDROID BACK BUTTON HANDLER
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backHandler = CapApp.addListener('backButton', (_) => {
      // Close open overlays first
      if (isNotificationOpen) {
        setIsNotificationOpen(false);
        return;
      }
      if (isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
        return;
      }
      if (isChatOpen) {
        setIsChatOpen(false);
        return;
      }
      if (selectedVehicle) {
        setSelectedVehicle(null);
        return;
      }
      // Navigate back through view history
      if (viewHistory.length > 1) {
        const newHistory = [...viewHistory];
        newHistory.pop();
        setViewHistory(newHistory);
        setCurrentView(newHistory[newHistory.length - 1]);
        return;
      }
      // At root view — minimize app instead of closing
      CapApp.minimizeApp();
    });

    return () => {
      backHandler.then((h) => h.remove());
    };
  }, [isNotificationOpen, isCommandPaletteOpen, isChatOpen, selectedVehicle, viewHistory]);

  // Memoize metrics to prevent recalc on every render unless vehicles change
  const metrics: FleetMetrics = useMemo(
    () => ({
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter((v) => v.status === VehicleStatus.MOVING).length,
      totalDistance: Math.round(vehicles.reduce((acc, v) => acc + v.mileage, 0)),
      avgFuelEfficiency: Math.round(vehicles.reduce((acc, v) => acc + v.fuelLevel, 0) / (vehicles.length || 1)),
      avgDriverScore: Math.round(vehicles.reduce((acc, v) => acc + v.driverScore, 0) / (vehicles.length || 1)),
      alerts: vehicles.filter((v) => v.violationsCount > 0).length,
    }),
    [vehicles]
  );

  // --- NOTIFICATION HANDLERS ---
  const handleNotificationAction = (n: Notification) => {
    if (n.link) {
      const viewMap: Record<string, View> = {
        MAP: View.DASHBOARD, // Redirect MAP to DASHBOARD for No-Geo
        FLEET: View.FLEET,
        TECH: View.TECH,
        FINANCE: View.SALES,
        SUPPORT: View.SUPPORT,
        REPORTS: View.REPORTS,
      };

      // Special Handling for Finance/Sales Routing
      if (n.link.view === 'FINANCE') {
        setCurrentView(View.SALES);
        setViewParams({ tab: 'INVOICES' });
      } else if (n.link.view === 'SUPPORT') {
        setCurrentView(View.SUPPORT);
        setViewParams({});
      } else if (viewMap[n.link.view]) {
        setCurrentView(viewMap[n.link.view]);
        setViewParams({});

        if (n.link.view === 'MAP' && n.link.id) {
          const targetVehicle = vehicles.find((v) => v.id === n.link!.id);
          if (targetVehicle) setSelectedVehicle(targetVehicle);
        }
      }
    }
    markAlertAsRead(n.id);
    setIsNotificationOpen(false);
  };

  const markAsRead = (id: string) => {
    markAlertAsRead(id);
  };
  const markAllRead = () => {
    alerts.filter((a) => !a.isRead).forEach((a) => markAlertAsRead(String(a.id)));
  };
  const clearNotifications = () => {
    alerts.forEach((a) => markAlertAsRead(String(a.id)));
  };

  const handleGlobalAction = (actionId: string) => {
    setIsCommandPaletteOpen(false);
    if (actionId === 'LOGOUT') logout();
    else if (actionId === 'CREATE_TICKET') {
      setCurrentView(View.SUPPORT);
      setViewParams({});
    } else if (actionId === 'CREATE_LEAD') {
      setCurrentView(View.PRESALES);
      setViewParams({ tab: 'LEADS' });
    } else if (actionId === 'CREATE_INVOICE') {
      setCurrentView(View.SALES);
      setViewParams({ tab: 'INVOICES', action: 'NEW_INVOICE' });
    }
  };

  const handleNavigate = (view: View, params?: Record<string, string>) => {
    // Track view history for swipe-back navigation
    if (view !== currentView) {
      setViewHistory((prev) => [...prev.slice(-9), view]); // Keep last 10 views
    }
    setCurrentView(view);
    if (params) setViewParams(params);
    else setViewParams({});
    setIsMobileMenuOpen(false);
    // Clear specific states
    setReplayVehicle(null);
  };

  // Pull-to-refresh handler
  const handlePullToRefresh = async () => {
    if (refreshData) {
      await refreshData();
    }
  };

  const handleLocationClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setCurrentView(View.MAP);
  };

  // --- REPLAY LOGIC ---
  const handleReplay = (vehicle: Vehicle) => {
    // 1. Close Drawer if open
    setSelectedVehicle(null);
    // 2. Switch to Map View
    setCurrentView(View.MAP);
    // 3. Set Replay Vehicle to trigger Map logic
    setReplayVehicle(vehicle);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <DashboardSkeleton />
      </div>
    );
  }

  // Check if URL contains activation token
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('token')) {
    return <ActivationPage />;
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  if (requirePasswordChange) {
    const ChangePasswordView = React.lazy(() => import('./features/auth/components/ChangePasswordView'));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center h-screen">Chargement...</div>}>
        <ChangePasswordView />
      </React.Suspense>
    );
  }

  const renderContent = () => {
    const AccessDenied = (
      <div className="p-8 text-center text-red-600 dark:text-red-400">
        Accès refusé. Vous n'avez pas les permissions nécessaires.
      </div>
    );

    switch (currentView) {
      case View.DASHBOARD:
        return hasPermission('VIEW_DASHBOARD') ? (
          <LazyDashboardView vehicles={vehicles} metrics={metrics} onNavigate={handleNavigate} />
        ) : (
          AccessDenied
        );
      case View.MAP:
        return hasPermission('VIEW_MAP') ? (
          <LazyMapView
            vehicles={vehicles}
            zones={zones}
            focusedVehicle={selectedVehicle}
            replayVehicle={replayVehicle}
            onNavigate={handleNavigate}
            onReplay={handleReplay}
          />
        ) : (
          AccessDenied
        );
      case View.FLEET:
        return hasPermission('VIEW_FLEET') ? (
          <LazyFleetTable
            vehicles={vehicles}
            onVehicleClick={(vehicle) => {
              // On mobile: navigate to Map + open bottom sheet (via focusedVehicle)
              if (window.innerWidth < 1024) {
                handleLocationClick(vehicle);
              } else {
                setSelectedVehicle(vehicle);
              }
            }}
            onLocationClick={handleLocationClick}
            onEditVehicle={(vehicle) =>
              handleNavigate(View.SETTINGS, { action: 'edit_vehicle', id: vehicle.id, tab: 'objects' })
            }
          />
        ) : (
          AccessDenied
        );
      case View.REPORTS:
        return hasPermission('VIEW_REPORTS') ? <LazyReportsView vehicles={vehicles} /> : AccessDenied;

      case View.PRESALES:
        return hasPermission('VIEW_CRM') ? <LazyPresalesView initialTab={viewParams.tab} /> : AccessDenied;
      case View.SALES:
        return hasPermission('MANAGE_CLIENTS') ? (
          <LazySalesView initialTab={viewParams.tab} onNavigate={handleNavigate} />
        ) : (
          AccessDenied
        );

      case View.LEADS:
        return hasPermission('VIEW_CRM') ? <LazyPresalesView initialTab="LEADS" /> : AccessDenied;
      case View.CLIENTS:
        return hasPermission('MANAGE_CLIENTS') ? (
          <LazySalesView initialTab="CLIENTS" onNavigate={handleNavigate} />
        ) : (
          AccessDenied
        );
      case View.INVOICES:
        return hasPermission('VIEW_FINANCE') ? (
          <LazySalesView initialTab="INVOICES" onNavigate={handleNavigate} />
        ) : (
          AccessDenied
        );

      case View.ACCOUNTING:
        return hasPermission('VIEW_FINANCE') ? <LazyAccountingView /> : AccessDenied;

      case View.TECH:
        return hasPermission('VIEW_TECH') ? <LazyTechView initialViewMode="LIST" /> : AccessDenied;
      case View.MONITORING:
        return hasPermission('VIEW_TECH') ? <LazyMonitoringView /> : AccessDenied;
      case View.STOCK:
        return hasPermission('MANAGE_STOCK') ? <LazyStockView initialTab={viewParams.tab} /> : AccessDenied;
      case View.SUPPORT:
        return hasPermission('VIEW_SUPPORT') ? <LazySupportView /> : AccessDenied;
      case View.ADMIN:
        return hasPermission('VIEW_ADMIN') ? <LazySuperAdminView /> : AccessDenied;
      case View.AGENDA:
        return hasPermission('VIEW_TECH') ? <LazyAgendaView /> : AccessDenied;
      case View.SETTINGS:
        return (
          <LazySettingsView
            initialAction={viewParams.action}
            initialId={viewParams.id}
            initialTab={viewParams.tab as Parameters<typeof LazySettingsView>[0]['initialTab']}
          />
        );
      default:
        return null;
    }
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case View.PRESALES:
        return 'Module Prévente';
      case View.SALES:
        return 'Module Vente';
      case View.LEADS:
        return 'CRM - Pistes & Leads';
      case View.CLIENTS:
        return 'Base Clients';
      case View.ACCOUNTING:
        return 'Comptabilité Générale';
      case View.TECH:
        return 'Opérations Techniques';
      case View.MONITORING:
        return 'Monitoring Technique';
      case View.STOCK:
        return 'Logistique & Stock';
      case View.SUPPORT:
        return 'Support Client';
      case View.ADMIN:
        return 'Administration Système';
      case View.DASHBOARD:
        return "Vue d'ensemble";
      case View.MAP:
        return 'Suivi Temps Réel';
      case View.FLEET:
        return 'Gestion de Flotte';
      case View.REPORTS:
        return 'Rapports & Analyses';
      case View.AGENDA:
        return 'Agenda';
      default:
        return 'Paramètres';
    }
  };

  const getViewGroup = () => {
    switch (currentView) {
      case View.DASHBOARD:
      case View.MAP:
      case View.FLEET:
        return 'Suivi GPS';
      case View.TECH:
      case View.MONITORING:
      case View.STOCK:
      case View.AGENDA:
        return 'Technique';
      case View.PRESALES:
      case View.LEADS:
      case View.CLIENTS:
      case View.SALES:
        return 'Commercial';
      case View.ACCOUNTING:
        return 'Finance';
      case View.SUPPORT:
        return 'Support';
      case View.REPORTS:
        return 'Rapports';
      case View.ADMIN:
        return 'Administration';
      default:
        return 'Paramètres';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="flex h-screen overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <OfflineBanner />
      <Sidebar currentView={currentView} onNavigate={handleNavigate} isMobileMenuOpen={isMobileMenuOpen} />

      <div className="flex-1 flex flex-col overflow-hidden relative lg:ml-64 transition-all duration-300">
        {/* Top Header - with safe-area support on mobile */}
        <header
          className="h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm z-10 shrink-0 transition-colors mobile-header"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
          }}
        >
          <div className="flex items-center gap-4">
            {/* Hamburger menu - hidden on mobile since we have BottomNavigation */}
            <button
              aria-label="Toggle menu"
              className="hidden p-2.5 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg haptic-feedback transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="hidden lg:block text-xs font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>
                {getViewGroup()}
              </span>
              <span className="hidden lg:block text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                /
              </span>
              <h1 className="text-lg sm:text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {getHeaderTitle()}
              </h1>
            </div>
            {/* IMPERSONATION BANNER */}
            {user?.role?.startsWith('Impersonating') && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold animate-pulse">
                <span>Mode Impersonation</span>
                <button onClick={stopImpersonation} className="hover:underline ml-1">
                  Quitter
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* MOBILE SEARCH TRIGGER */}
            <button
              aria-label="Search"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="md:hidden p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full haptic-feedback transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* DESKTOP SEARCH TRIGGER */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-3 px-4 py-2 rounded-lg transition-all group"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              }}
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Rechercher...</span>
              <div className="flex items-center gap-1 ml-2">
                <span
                  className="text-[10px] font-bold px-1.5 rounded shadow-sm"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Ctrl
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 rounded shadow-sm"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  K
                </span>
              </div>
            </button>

            <div className="h-8 w-px mx-1 hidden sm:block" style={{ backgroundColor: 'var(--border)' }}></div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Theme switcher — dark / ocean / light */}
              <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-full p-0.5 gap-0.5">
                {(
                  [
                    { id: 'dark', Icon: Moon, label: 'Sombre' },
                    { id: 'ocean', Icon: Waves, label: 'Océan' },
                    { id: 'light', Icon: Sun, label: 'Clair' },
                  ] as const
                ).map(({ id, Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    title={label}
                    className={`p-2 rounded-full transition-colors haptic-feedback ${
                      theme === id
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
              <button
                onClick={handleGlobalRefresh}
                disabled={isRefreshing}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors haptic-feedback"
                style={{ color: isRefreshing ? 'var(--primary)' : 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  if (!isRefreshing) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
                title="Rafraîchir toutes les données"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsNotificationOpen(true)}
                  className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full relative transition-colors haptic-feedback"
                  style={{
                    backgroundColor: isNotificationOpen ? 'var(--primary-dim)' : 'transparent',
                    color: isNotificationOpen ? 'var(--primary)' : 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isNotificationOpen)
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isNotificationOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 animate-pulse"
                      style={{ borderColor: 'var(--bg-surface)' }}
                    ></span>
                  )}
                </button>
              </div>
            </div>
            <div className="h-8 w-px mx-2 hidden sm:block" style={{ backgroundColor: 'var(--border)' }}></div>
            <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString('fr-FR')}
            </span>
          </div>
        </header>

        {/* Main Content Area with Pull-to-Refresh */}
        <PullToRefresh
          onRefresh={handlePullToRefresh}
          disabled={currentView === View.MAP}
          className={`flex-1 overflow-y-auto scroll-smooth-ios ${currentView === View.MAP ? '' : ''}`}
        >
          <main className={`h-full ${currentView === View.MAP ? 'p-0' : 'p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6'}`}>
            <div className={currentView === View.MAP ? 'h-full' : ''}>
              <ErrorBoundary variant="module">{renderContent()}</ErrorBoundary>
            </div>
          </main>
        </PullToRefresh>

        {/* Swipe Back Gesture Overlay */}
        {overlayElement}

        {/* Global Components */}
        <Drawer isOpen={!!selectedVehicle && currentView !== View.MAP} onClose={() => setSelectedVehicle(null)}>
          {selectedVehicle && (
            <React.Suspense fallback={null}>
              <VehicleDetailPanel
                vehicle={selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
                variant="drawer"
                onReplay={() => handleReplay(selectedVehicle)}
              />
            </React.Suspense>
          )}
        </Drawer>

        <React.Suspense fallback={null}>
          <NotificationCenter
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            notifications={notifications}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllRead}
            onClearAll={clearNotifications}
            onAction={handleNotificationAction}
          />
        </React.Suspense>

        <React.Suspense fallback={null}>
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            vehicles={vehicles}
            onNavigate={handleNavigate}
            onSelectVehicle={(v) => {
              setSelectedVehicle(v);
              setCurrentView(View.MAP);
            }}
            onAction={handleGlobalAction}
          />
        </React.Suspense>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Bottom Navigation */}
      <BottomNavigation currentView={currentView} onNavigate={handleNavigate} />

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* AI Chat Button - hidden on MAP (has its own floating buttons) */}
      {currentView !== View.MAP && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-40 flex flex-col items-end gap-4">
          {isChatOpen && (
            <div className="w-80 sm:w-96 h-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200 origin-bottom-right">
              <React.Suspense fallback={null}>
                <AiAssistant vehicles={vehicles} />
              </React.Suspense>
            </div>
          )}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-3 lg:p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center ${
              isChatOpen
                ? 'bg-slate-800 dark:bg-slate-700 text-white rotate-90'
                : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]'
            }`}
            title="Ouvrir l'assistant"
          >
            {isChatOpen ? <X className="w-5 h-5 lg:w-6 lg:h-6" /> : <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6" />}
          </button>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
