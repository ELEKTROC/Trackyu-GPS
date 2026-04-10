import React, { useMemo } from 'react';
import { View } from '../types';
import {
  LayoutDashboard,
  Map,
  Truck,
  Wrench,
  Grid2X2,
  FileText,
  Headset,
  Package,
  Settings,
  ShoppingCart,
  X,
  Sun,
  Moon,
  Calculator,
  Activity,
  ShieldCheck,
  LogOut,
  Briefcase,
  Calendar,
  LucideIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  getSortedSidebarMenu,
  MOBILE_DEFAULT_TABS,
  getMobileProfileForRole,
  type SidebarMenuItem
} from '../features/admin/permissions/permissionStructure';

// Mapping des noms d'icônes vers les composants Lucide (identique à Sidebar.tsx)
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Map, Truck, FileText, Settings, Activity,
  Wrench, Package, ShieldCheck, Headset, Calculator, Briefcase,
  ShoppingCart, Calendar
};

interface BottomNavigationProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentView,
  onNavigate
}) => {
  const { hasPermission, user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);

  // Tous les items du menu depuis le registre central, triés
  const allMenuItems = useMemo(() => {
    return getSortedSidebarMenu().flatMap(group =>
      group.items.map(item => ({ ...item, groupTitle: group.title }))
    );
  }, []);

  // Profil mobile du rôle courant
  const mobileProfile = useMemo(() =>
    user?.role ? getMobileProfileForRole(user.role) : undefined,
    [user?.role]
  );

  // Items visibles selon permissions + masquage hiddenTabs du profil
  const visibleItems = useMemo(() => {
    const hidden = new Set(mobileProfile?.hiddenTabs ?? []);
    return allMenuItems.filter(item =>
      !hidden.has(item.id) &&
      (item.alwaysVisible || !item.permission || hasPermission(item.permission as any))
    );
  }, [allMenuItems, hasPermission, mobileProfile]);

  // Détermine les onglets principaux selon la config du rôle (DB) ou profil hardcodé
  const mainTabIds = useMemo(() => {
    const filterAccessible = (tabs: string[]) =>
      tabs.filter(tabId => {
        const item = allMenuItems.find(i => i.id === tabId);
        return item && (item.alwaysVisible || !item.permission || hasPermission(item.permission as any));
      });

    // 1. Priorité : mobile_tabs configurés par SuperAdmin dans Admin UI
    if (user?.mobileTabs && Array.isArray(user.mobileTabs) && user.mobileTabs.length > 0) {
      const accessible = filterAccessible(user.mobileTabs);
      if (accessible.length >= 2) return accessible.slice(0, 5);
    }

    // 2. Profil hardcodé par rôle
    if (mobileProfile) {
      const accessible = filterAccessible(mobileProfile.tabs);
      if (accessible.length >= 1) return accessible.slice(0, 5);
    }

    // 3. Fallback par défaut
    return filterAccessible(MOBILE_DEFAULT_TABS).slice(0, 5);
  }, [allMenuItems, hasPermission, user?.mobileTabs, mobileProfile]);

  // Onglets principaux (bottom bar)
  const mainTabs = useMemo(() => {
    return mainTabIds
      .map(id => allMenuItems.find(item => item.id === id))
      .filter((item): item is SidebarMenuItem & { groupTitle: string } => !!item);
  }, [mainTabIds, allMenuItems]);

  // Items secondaires (menu "Plus") = tous les visibles sauf les main tabs
  const moreItems = useMemo(() => {
    return visibleItems.filter(item => !mainTabIds.includes(item.id));
  }, [visibleItems, mainTabIds]);

  // Grouper les items "Plus" par catégorie
  const groupedMoreItems = useMemo(() => {
    return moreItems.reduce((acc, item) => {
      const category = item.groupTitle;
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, typeof moreItems>);
  }, [moreItems]);

  // Vérifie si la vue actuelle est dans le menu "Plus"
  const isInMoreMenu = moreItems.some(item => View[item.id as keyof typeof View] === currentView);

  const handleNavigate = (view: View) => {
    onNavigate(view);
    setIsMoreOpen(false);
  };

  const getIcon = (iconName: string): LucideIcon => ICON_MAP[iconName] || LayoutDashboard;

  return (
    <>
      {/* More Menu Overlay */}
      {isMoreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsMoreOpen(false)}
        />
      )}

      {/* More Menu Sheet */}
      {isMoreOpen && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-50 bg-[var(--bg-surface)] border-t border-[var(--border)] rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 safe-area-bottom max-h-[70vh] overflow-y-auto">
          <div className="p-4">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-[var(--border-strong)] rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Plus d'options</h3>
              <div className="flex items-center gap-2">
                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  className="p-2.5 text-[var(--text-muted)] rounded-full hover:bg-[var(--bg-elevated)] touch-target haptic-feedback"
                  title={isDarkMode ? 'Mode Clair' : 'Mode Sombre'}
                  aria-label={isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="p-2 text-[var(--text-muted)] rounded-full hover:bg-[var(--bg-elevated)] touch-target haptic-feedback"
                  title="Fermer"
                  aria-label="Fermer le menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grouped Items - from central registry */}
            {Object.entries(groupedMoreItems).map(([category, items]) => (
              <div key={category} className="mb-4">
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">
                  {category}
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  {items.map(item => {
                    const view = View[item.id as keyof typeof View];
                    const isActive = currentView === view;
                    const Icon = getIcon(item.icon);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(view)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all touch-target haptic-feedback min-h-[72px] ${
                          isActive ? '' : 'hover:bg-[var(--bg-elevated)]'
                        }`}
                        style={{
                          backgroundColor: isActive ? 'var(--primary-dim)' : undefined,
                          color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        }}
                      >
                        <Icon className="w-6 h-6 mb-1" />
                        <span className="text-xs font-medium text-center leading-tight">{item.mobileLabel || item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* User Profile & Logout */}
            <div className="mt-2 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name || 'Utilisateur'}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{user?.role || 'Rôle'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsMoreOpen(false); logout(); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border hover:bg-[var(--color-error)]/10 active:bg-[var(--color-error)]/20 transition-colors text-sm font-medium haptic-feedback"
                  style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-surface)] border-t border-[var(--border)] flex justify-around items-center z-50 safe-area-bottom shadow-lg">
        {mainTabs.map(tab => {
          const view = View[tab.id as keyof typeof View];
          const isActive = currentView === view;
          const Icon = getIcon(tab.icon);
          return (
            <button
              key={tab.id}
              onClick={() => handleNavigate(view)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[56px] transition-all no-select haptic-feedback"
              style={{ color: isActive ? 'var(--primary)' : 'var(--nav-inactive)' }}
            >
              <div className={`relative transition-transform ${isActive ? 'scale-110' : 'active:scale-95'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium leading-none truncate max-w-[52px] text-center">
                {tab.mobileLabel || tab.label}
              </span>
            </button>
          );
        })}

        {/* More button — masqué si showMore === false */}
        {(mobileProfile?.showMore ?? true) && (
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[56px] transition-all no-select haptic-feedback"
            style={{ color: (isMoreOpen || isInMoreMenu) ? 'var(--primary)' : 'var(--nav-inactive)' }}
          >
            <div className="relative active:scale-95">
              <Grid2X2 className="w-5 h-5" />
              {isInMoreMenu && !isMoreOpen && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">Modules</span>
          </button>
        )}
      </nav>
    </>
  );
};

export default BottomNavigation;
