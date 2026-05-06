import React, { useState } from 'react';
import { View } from '../types';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Map,
  Truck,
  FileText,
  Settings,
  Activity,
  LogOut,
  Wrench,
  Package,
  ShieldCheck,
  Headset,
  Calculator,
  Briefcase,
  ShoppingCart,
  Database,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSortedSidebarMenu } from '../features/admin/permissions/permissionStructure';
import { useAppearance } from '../contexts/AppearanceContext';
import { useTranslation } from '../i18n';

// Mapping des noms d'icônes vers les composants Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Map,
  Truck,
  FileText,
  Settings,
  Activity,
  Wrench,
  Package,
  ShieldCheck,
  Headset,
  Calculator,
  Briefcase,
  ShoppingCart,
  Database,
  Calendar,
};

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isMobileMenuOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isMobileMenuOpen }) => {
  const { user, logout, hasPermission } = useAuth();
  const { appearance } = useAppearance();
  const { t } = useTranslation();

  // Auto-collapse par défaut (80px), expand au hover desktop ou en mode mobile ouvert.
  const [isHovered, setIsHovered] = useState(false);
  const expanded = isHovered || isMobileMenuOpen;

  // Génère les menus depuis le registre centralisé
  const userRole = user?.role?.toUpperCase() || '';
  const menuGroups = getSortedSidebarMenu()
    .map((group) => ({
      title: group.titleKey ? t(group.titleKey) : group.title,
      items: group.items
        .filter((item) => !item.hiddenForRoles?.some((r) => r.toUpperCase() === userRole))
        .map((item) => ({
          view: View[item.id as keyof typeof View],
          label: item.labelKey ? t(item.labelKey) : item.label,
          icon: ICON_MAP[item.icon] || LayoutDashboard,
          requiredPerm: item.alwaysVisible ? null : item.permission || null,
        })),
    }))
    // Ne garder que les groupes ayant au moins un item visible pour cet utilisateur
    .filter((group) => group.items.some((item) => !item.requiredPerm || hasPermission(item.requiredPerm as any)));

  const APP_VERSION = 'v1.0.4';
  const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
  const isColored = (appearance.sidebarStyle || 'dark') === 'colored';

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300 ease-in-out shadow-2xl
        ${expanded ? 'w-64' : 'w-20'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      style={{ backgroundColor: 'var(--brand-sidebar-bg)', borderRight: '1px solid var(--brand-sidebar-border)' }}
    >
      {/* Logo */}
      <div
        className={`h-20 shrink-0 flex items-center transition-all duration-300 ${expanded ? 'px-6 gap-3 justify-start' : 'justify-center'}`}
        style={{ borderBottom: '1px solid var(--brand-sidebar-border)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_var(--brand-primary)] shrink-0"
          style={{ backgroundColor: 'var(--nav-active)' }}
        >
          <Truck className="w-6 h-6 text-white" />
        </div>
        <div
          className={`overflow-hidden transition-all duration-200 ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}
        >
          <h1 className="text-xl font-bold whitespace-nowrap" style={{ color: 'var(--brand-sidebar-text)' }}>
            Trackyu GPS
          </h1>
          <p
            className="text-xs font-medium tracking-wider opacity-50 whitespace-nowrap"
            style={{ color: 'var(--brand-sidebar-text)' }}
          >
            ENTERPRISE
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-6 overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {menuGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <h3
              className={`px-4 text-xs font-semibold uppercase tracking-wider opacity-50 overflow-hidden transition-all duration-200 ${expanded ? 'h-auto mb-3' : 'h-0 mb-0'}`}
              style={{ color: 'var(--brand-sidebar-text)' }}
            >
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                if (item.requiredPerm && !hasPermission(item.requiredPerm as any)) return null;

                const Icon = item.icon;
                const isActive = currentView === item.view;

                return (
                  <button
                    key={item.view}
                    onClick={() => onNavigate(item.view)}
                    title={!expanded ? item.label : undefined}
                    className={`w-full flex items-center gap-3 py-3 min-h-[44px] rounded-lg transition-all duration-200 group touch-manipulation haptic-feedback ${expanded ? 'px-4' : 'px-0 justify-center'}`}
                    style={
                      isActive
                        ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)' }
                        : {
                            color: isColored ? 'rgba(255,255,255,0.7)' : 'var(--nav-inactive)',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLElement).style.backgroundColor = isColored
                          ? 'rgba(255,255,255,0.15)'
                          : 'var(--bg-elevated)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <Icon className="w-5 h-5 shrink-0 transition-colors" />
                    <span
                      className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div
        className="p-4 shrink-0 transition-colors"
        style={{ borderTop: '1px solid var(--brand-sidebar-border)', backgroundColor: 'rgba(0,0,0,0.15)' }}
      >
        <div
          className={`overflow-hidden transition-all duration-200 ${expanded ? 'opacity-100 max-h-20 mb-4' : 'opacity-0 max-h-0 mb-0'}`}
        >
          <div className="flex items-center gap-3 px-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg shrink-0"
              style={{ backgroundColor: 'var(--nav-active)' }}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--brand-sidebar-text)' }}>
                {user?.name || t('nav.common.user')}
              </p>
              <p className="text-xs truncate opacity-60" style={{ color: 'var(--brand-sidebar-text)' }}>
                {user?.role || t('nav.common.role')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title={!expanded ? t('nav.common.logout') : undefined}
          className={`w-full flex items-center gap-2 py-2 rounded-lg transition-colors text-sm font-medium border ${expanded ? 'px-4 justify-center' : 'px-0 justify-center'}`}
          style={{
            borderColor: isColored ? 'rgba(255,255,255,0.2)' : 'var(--border)',
            color: 'var(--brand-sidebar-text)',
            opacity: 0.8,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = '1';
            (e.currentTarget as HTMLElement).style.backgroundColor = isColored
              ? 'rgba(255,255,255,0.1)'
              : 'var(--bg-elevated)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = '0.8';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}
          >
            {t('nav.common.logout')}
          </span>
        </button>

        <div
          className={`overflow-hidden transition-all duration-200 ${expanded ? 'opacity-100 max-h-20 mt-4' : 'opacity-0 max-h-0 mt-0'}`}
        >
          <div className="text-center">
            <span className="text-xs block mb-1 opacity-40" style={{ color: 'var(--brand-sidebar-text)' }}>
              {APP_VERSION}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                IS_MOCK
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}
            >
              {IS_MOCK ? t('nav.common.modeSimulation') : t('nav.common.modeProduction')}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
