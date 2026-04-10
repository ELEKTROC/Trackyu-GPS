import React from 'react';
import { View } from '../types';
import type {
  LucideIcon
} from 'lucide-react';
import {
  LayoutDashboard, Map, Truck, FileText, Settings, Activity, LogOut,
  Wrench, Package, ShieldCheck, Headset,
  Calculator, Briefcase, ShoppingCart, Database, Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSortedSidebarMenu } from '../features/admin/permissions/permissionStructure';
import { useAppearance } from '../contexts/AppearanceContext';

// Mapping des noms d'icônes vers les composants Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Map, Truck, FileText, Settings, Activity,
  Wrench, Package, ShieldCheck, Headset, Calculator, Briefcase,
  ShoppingCart, Database, Calendar
};

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isMobileMenuOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isMobileMenuOpen }) => {
  const { user, logout, hasPermission } = useAuth();
  const { appearance } = useAppearance();

  // Génère les menus depuis le registre centralisé
  const menuGroups = getSortedSidebarMenu().map(group => ({
    title: group.title,
    items: group.items.map(item => ({
      view: View[item.id as keyof typeof View],
      label: item.label,
      icon: ICON_MAP[item.icon] || LayoutDashboard,
      requiredPerm: item.alwaysVisible ? null : (item.permission || null)
    }))
  }));

  const APP_VERSION = "v1.0.4";
  const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

  const isColored = (appearance.sidebarStyle || 'dark') === 'colored';

  return (
    <>
      {/* Sidebar Content */}
      <div
        className={`flex flex-col h-full w-64 fixed left-0 top-0 z-30 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ backgroundColor: 'var(--brand-sidebar-bg)', borderRight: '1px solid var(--brand-sidebar-border)' }}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-center" style={{ borderBottom: '1px solid var(--brand-sidebar-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--nav-active)' }}>
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--brand-sidebar-text)' }}>
                Trackyu GPS
              </h1>
              <p className="text-xs font-medium tracking-wider opacity-50" style={{ color: 'var(--brand-sidebar-text)' }}>ENTERPRISE</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h3 className="px-4 text-xs font-semibold uppercase tracking-wider mb-3 opacity-50" style={{ color: 'var(--brand-sidebar-text)' }}>
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
                      className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg transition-all duration-200 group touch-manipulation haptic-feedback"
                      style={isActive
                        ? { backgroundColor: 'var(--nav-active)', color: '#ffffff' }
                        : {
                            color: isColored ? 'rgba(255,255,255,0.7)' : 'var(--nav-inactive)',
                          }
                      }
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = isColored ? 'rgba(255,255,255,0.15)' : 'var(--bg-elevated)'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    >
                      <Icon className="w-5 h-5 transition-colors" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 transition-colors" style={{ borderTop: '1px solid var(--brand-sidebar-border)', backgroundColor: 'rgba(0,0,0,0.15)' }}>
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg" style={{ backgroundColor: 'var(--nav-active)' }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--brand-sidebar-text)' }}>{user?.name || 'Utilisateur'}</p>
              <p className="text-xs truncate opacity-60" style={{ color: 'var(--brand-sidebar-text)' }}>{user?.role || 'Rôle'}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium border"
            style={{ borderColor: isColored ? 'rgba(255,255,255,0.2)' : 'var(--border)', color: 'var(--brand-sidebar-text)', opacity: 0.8 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.backgroundColor = isColored ? 'rgba(255,255,255,0.1)' : 'var(--bg-elevated)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>

          <div className="mt-4 text-center">
            <span className="text-xs block mb-1 opacity-40" style={{ color: 'var(--brand-sidebar-text)' }}>{APP_VERSION}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              IS_MOCK
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            }`}>
              {IS_MOCK ? 'MODE SIMULATION' : 'MODE PRODUCTION'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
