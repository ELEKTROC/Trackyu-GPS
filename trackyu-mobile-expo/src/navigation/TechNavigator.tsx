/**
 * TrackYu Mobile — Tech Tab Navigator
 * Rôle TECH (techniciens installateurs)
 * 4 onglets : Tableau de bord · Agenda · Tech · Paramètres
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, CalendarDays, Wrench, Settings } from 'lucide-react-native';
import type { TechTabParamList } from './types';
import TechDashboardScreen from '../screens/tech/TechDashboardScreen';
import AgendaScreen from '../screens/tech/AgendaScreen';
import TechScreen from '../screens/tech/TechScreen';
import SettingsMenuScreen from '../screens/main/SettingsMenuScreen';
import { useTheme } from '../theme';

const Tab = createBottomTabNavigator<TechTabParamList>();

export function TechNavigator() {
  const { theme } = useTheme();

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
            TechDashboard: LayoutDashboard,
            Agenda: CalendarDays,
            Tech: Wrench,
            Settings,
          };
          const Icon = icons[route.name];
          return Icon ? makeIcon(Icon, focused, color) : null;
        },
      })}
    >
      <Tab.Screen name="TechDashboard" component={TechDashboardScreen} options={{ tabBarLabel: 'Tableau de bord' }} />
      <Tab.Screen name="Agenda" component={AgendaScreen} options={{ tabBarLabel: 'Agenda' }} />
      <Tab.Screen name="Tech" component={TechScreen} options={{ tabBarLabel: 'Tech' }} />
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

export default TechNavigator;
