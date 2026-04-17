/**
 * TrackYu Mobile - Root Navigator
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import VehicleDetailScreen from '../screens/main/VehicleDetailScreen';
import VehicleHistoryScreen from '../screens/main/VehicleHistoryScreen';
import InterventionDetailScreen from '../screens/tech/InterventionDetailScreen';
import AlertsScreen from '../screens/main/AlertsScreen';
import ReportsScreen from '../screens/main/ReportsScreen';
import { PortalNavigator } from './PortalNavigator';
import SupportTicketDetailScreen from '../screens/support/SupportTicketDetailScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import ResellersScreen from '../screens/admin/ResellersScreen';
import AdminTrashScreen from '../screens/admin/AdminTrashScreen';
import AdminAuditLogsScreen from '../screens/admin/AdminAuditLogsScreen';
import AdminDevicesScreen from '../screens/admin/AdminDevicesScreen';
import AdminTicketsScreen from '../screens/admin/AdminTicketsScreen';
import AdminInterventionsScreen from '../screens/admin/AdminInterventionsScreen';
import AdminMonitoringScreen from '../screens/admin/AdminMonitoringScreen';
import AdminComptabiliteScreen from '../screens/admin/AdminComptabiliteScreen';
import AgendaScreen from '../screens/tech/AgendaScreen';
import LeadsScreen from '../screens/crm/LeadsScreen';
import FleetAnalyticsScreen from '../screens/main/FleetAnalyticsScreen';
import GeofencesScreen from '../screens/main/GeofencesScreen';
import CreateTicketScreen from '../screens/main/CreateTicketScreen';
import HelpScreen from '../screens/main/HelpScreen';
import PortalContractDocumentScreen from '../screens/portal/PortalContractDocumentScreen';
import SettingsMenuScreen from '../screens/main/SettingsMenuScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SubUsersScreen from '../screens/main/SubUsersScreen';
import VehiclesListScreen from '../screens/main/VehiclesListScreen';
import DriversScreen from '../screens/main/DriversScreen';
import BranchesScreen from '../screens/main/BranchesScreen';
import GroupesScreen from '../screens/main/GroupesScreen';
import AlertRulesScreen from '../screens/main/AlertRulesScreen';
import RulesScreen from '../screens/main/RulesScreen';
import MaintenanceScreen from '../screens/main/MaintenanceScreen';
import EcoConduiteScreen from '../screens/main/EcoConduiteScreen';
import DepensesScreen from '../screens/main/DepensesScreen';
import PneusScreen from '../screens/main/PneusScreen';
import TemperatureScreen from '../screens/main/TemperatureScreen';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme';
import { ADMIN_SCREEN_ROLES, CRM_SCREEN_ROLES } from '../constants/roles';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { theme } = useTheme();
  const { isAuthenticated, checkAuth, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const userRole = user?.role?.toUpperCase() ?? '';

  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false));
  }, [checkAuth]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg.primary }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen
            name="VehicleDetail"
            component={VehicleDetailScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="VehicleHistory"
            component={VehicleHistoryScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="InterventionDetail"
            component={InterventionDetailScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Alerts"
            component={AlertsScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Reports"
            component={ReportsScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Portal"
            component={PortalNavigator}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="SupportTicketDetail"
            component={SupportTicketDetailScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          {(ADMIN_SCREEN_ROLES as string[]).includes(userRole) && (
            <>
              <Stack.Screen
                name="Admin"
                component={AdminScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="AdminUsers"
                component={UsersScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="AdminResellers"
                component={ResellersScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="AdminTrash"
                component={AdminTrashScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="AdminAuditLogs"
                component={AdminAuditLogsScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="AdminDevices"
                component={AdminDevicesScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="AdminAgenda"
                component={AgendaScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="AdminMonitoring"
                component={AdminMonitoringScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="AdminComptabilite"
                component={AdminComptabiliteScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="AdminTickets"
                component={AdminTicketsScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="AdminInterventions"
                component={AdminInterventionsScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
            </>
          )}
          {(CRM_SCREEN_ROLES as string[]).includes(userRole) && (
            <Stack.Screen
              name="CRMLeads"
              component={LeadsScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
          )}
          <Stack.Screen
            name="FleetAnalytics"
            component={FleetAnalyticsScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Geofences"
            component={GeofencesScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="CreateTicket"
            component={CreateTicketScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Help"
            component={HelpScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="PortalContractDocument"
            component={PortalContractDocumentScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          {/* ── Paramètres ── */}
          <Stack.Screen
            name="SettingsMenu"
            component={SettingsMenuScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="SubUsers"
            component={SubUsersScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Branches"
            component={BranchesScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Groupes"
            component={GroupesScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="AlertRules"
            component={AlertRulesScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="VehiclesList"
            component={VehiclesListScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Drivers"
            component={DriversScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Rules"
            component={RulesScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Maintenance"
            component={MaintenanceScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="EcoConduite"
            component={EcoConduiteScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Depenses"
            component={DepensesScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Pneus"
            component={PneusScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Temperature"
            component={TemperatureScreen}
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default RootNavigator;
