/**
 * TrackYu Mobile — Portal Stack Navigator (Mon Espace / CLIENT)
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PortalStackParamList } from './types';
import ClientPortalScreen from '../screens/portal/ClientPortalScreen';
import PortalInvoicesScreen from '../screens/portal/PortalInvoicesScreen';
import PortalInvoiceDetailScreen from '../screens/portal/PortalInvoiceDetailScreen';
import PortalContractsScreen from '../screens/portal/PortalContractsScreen';
import PortalSubscriptionsScreen from '../screens/portal/PortalSubscriptionsScreen';
import PortalPaymentsScreen from '../screens/portal/PortalPaymentsScreen';
import PortalTicketsScreen from '../screens/portal/PortalTicketsScreen';
import PortalTicketDetailScreen from '../screens/portal/PortalTicketDetailScreen';
import PortalNewTicketScreen from '../screens/portal/PortalNewTicketScreen';
import PortalInterventionsScreen from '../screens/portal/PortalInterventionsScreen';
import PortalInterventionDetailScreen from '../screens/portal/PortalInterventionDetailScreen';

const Stack = createNativeStackNavigator<PortalStackParamList>();

export function PortalNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientPortal" component={ClientPortalScreen} />
      <Stack.Screen name="PortalInvoices" component={PortalInvoicesScreen} />
      <Stack.Screen name="PortalInvoiceDetail" component={PortalInvoiceDetailScreen} />
      <Stack.Screen name="PortalContracts" component={PortalContractsScreen} />
      <Stack.Screen name="PortalSubscriptions" component={PortalSubscriptionsScreen} />
      <Stack.Screen name="PortalPayments" component={PortalPaymentsScreen} />
      <Stack.Screen name="PortalTickets" component={PortalTicketsScreen} />
      <Stack.Screen name="PortalTicketDetail" component={PortalTicketDetailScreen} />
      <Stack.Screen name="PortalNewTicket" component={PortalNewTicketScreen} />
      <Stack.Screen name="PortalInterventions" component={PortalInterventionsScreen} />
      <Stack.Screen name="PortalInterventionDetail" component={PortalInterventionDetailScreen} />
    </Stack.Navigator>
  );
}

export default PortalNavigator;
