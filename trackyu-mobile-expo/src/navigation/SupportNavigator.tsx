/**
 * TrackYu Mobile — Support Tab Navigator
 * SUPPORT_AGENT : Dashboard · Carte · Flotte · Tickets · Paramètres
 * Finance remplacée par Tickets (SUPPORT_AGENT n'a pas VIEW_FINANCE).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Map, Truck, TicketCheck, Settings } from 'lucide-react-native';
import type { SupportTabParamList } from './types';
import DashboardScreen from '../screens/main/DashboardScreen';
import MapScreen from '../screens/main/MapScreen';
import FleetScreen from '../screens/main/FleetScreen';
import SupportTicketsScreen from '../screens/support/SupportTicketsScreen';
import SettingsMenuScreen from '../screens/main/SettingsMenuScreen';
import { useTheme } from '../theme';
import { useQuery } from '@tanstack/react-query';
import alertsApi from '../api/alerts';

const Tab = createBottomTabNavigator<SupportTabParamList>();

export function SupportNavigator() {
  const { theme } = useTheme();

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['alerts-unread-count'],
    queryFn: () => alertsApi.getUnreadCount(),
    refetchInterval: 30000,
  });

  const tabBarStyle = {
    backgroundColor: theme.nav.bg,
    borderTopWidth: 1,
    borderTopColor: theme.nav.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: theme.isDark ? 0.4 : 0.1,
    shadowRadius: 8,
  };

  const makeIcon = (
    Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>,
    focused: boolean,
    color: string
  ) => (
    <View style={[iconStyles.wrap, focused && { backgroundColor: theme.primaryDim }]}>
      <Icon size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} />
    </View>
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.nav.active,
        tabBarInactiveTintColor: theme.nav.inactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', marginBottom: 4 },
        tabBarStyle,
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
            Dashboard: LayoutDashboard,
            Map,
            Fleet: Truck,
            Tickets: TicketCheck,
            Settings,
          };
          const Icon = icons[route.name];
          return Icon ? makeIcon(Icon, focused, color) : null;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Tableau de bord',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.functional.error,
            fontSize: 10,
            minWidth: 16,
            height: 16,
            lineHeight: 16,
          },
        }}
      />
      <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: 'Carte' }} />
      <Tab.Screen name="Fleet" component={FleetScreen} options={{ tabBarLabel: 'Flotte' }} />
      <Tab.Screen name="Tickets" component={SupportTicketsScreen} options={{ tabBarLabel: 'Tickets' }} />
      <Tab.Screen name="Settings" component={SettingsMenuScreen} options={{ tabBarLabel: 'Paramètres' }} />
    </Tab.Navigator>
  );
}

const iconStyles = StyleSheet.create({
  wrap: {
    width: 40,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SupportNavigator;
