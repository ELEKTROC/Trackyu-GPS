/**
 * TrackYu Mobile — Main Navigator (role-based switcher)
 *
 * CLIENT        → ClientNavigator  (Dashboard · Carte · Flotte · Rapports · Paramètres)
 * TECH          → TechNavigator    (Dashboard · Agenda · Tech · Paramètres)
 * SUPPORT_AGENT → SupportNavigator (Dashboard · Carte · Flotte · Tickets · Paramètres)
 * Staff         → StaffNavigator   (Dashboard · Carte · Flotte · Finance · Paramètres)
 */
import React from 'react';
import { useAuthStore } from '../store/authStore';
import { StaffNavigator } from './StaffNavigator';
import { TechNavigator } from './TechNavigator';
import { ClientNavigator } from './ClientNavigator';
import { SupportNavigator } from './SupportNavigator';
import { ROLE, NAV_STAFF_ROLES, NAV_SUPPORT_ROLES } from '../constants/roles';

export function MainNavigator() {
  const role = useAuthStore((s) => s.user?.role?.toUpperCase() ?? '');

  if (role === ROLE.CLIENT) return <ClientNavigator />;
  if (role === ROLE.TECH) return <TechNavigator />;
  if (role === ROLE.OPERATOR) return <ClientNavigator />;
  if ((NAV_SUPPORT_ROLES as string[]).includes(role)) return <SupportNavigator />;
  if ((NAV_STAFF_ROLES as string[]).includes(role)) return <StaffNavigator />;
  // Rôle inconnu → accès minimal (évite escalade de privilèges)
  return <ClientNavigator />;
}

export default MainNavigator;
