/**
 * TrackYu Mobile — Push Notifications Hook
 * - Demande les permissions
 * - Récupère le token Expo
 * - Enregistre le token côté backend
 * - Gère les notifications reçues en foreground
 * - Deep linking : navigation vers l'écran concerné au tap
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import type { Subscription, NotificationResponse } from 'expo-notifications';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import { navigationRef } from '../navigation/navigationRef';

// Expo Go ne supporte plus expo-notifications depuis SDK 53.
// On détecte via executionEnvironment : 'storeClient' = Expo Go.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient' || (Constants as any).appOwnership === 'expo';

// Comportement des notifs reçues en foreground (ignoré dans Expo Go)
if (!IS_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ── Payload attendu dans notification.request.content.data ────────────────────
//
// Alertes véhicule :  { type: 'alert', vehicleId: 'xxx' }
// Ticket support :    { type: 'ticket', ticketId: 'yyy', subject: 'Titre' }
// Ticket portal :     { type: 'portal_ticket', ticketId: 'yyy', subject: 'Titre' }
// Générique alertes : { type: 'alerts' }
// Flotte :            { type: 'fleet' }

function handleNotificationNavigation(response: NotificationResponse) {
  if (!navigationRef.isReady()) return;

  const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
  const type = data['type'] as string | undefined;

  switch (type) {
    case 'alert':
    case 'alerts': {
      const vehicleId = data['vehicleId'] as string | undefined;
      if (vehicleId) {
        navigationRef.navigate('VehicleDetail', { vehicleId });
      } else {
        navigationRef.navigate('Alerts');
      }
      break;
    }
    case 'ticket': {
      const ticketId = data['ticketId'] as string | undefined;
      const subject = (data['subject'] as string | undefined) ?? 'Ticket';
      if (ticketId) {
        navigationRef.navigate('SupportTicketDetail', { ticketId, subject });
      }
      break;
    }
    case 'portal_ticket': {
      // Ouvre le Portal — le navigate interne est géré à l'intérieur du PortalNavigator
      navigationRef.navigate('Portal');
      break;
    }
    case 'fleet':
      navigationRef.navigate('Main');
      break;
    default:
      // Pas de navigation spécifique — on laisse l'app s'ouvrir normalement
      break;
  }
}

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const notifListener = useRef<Subscription | null>(null);
  const responseListener = useRef<Subscription | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let active = true;

    async function registerToken() {
      // Expo Go ne supporte plus les push notifications depuis SDK 53
      if (IS_EXPO_GO) return;

      // 1. Demande de permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      // 2. Canal Android (obligatoire Android 8+)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'TrackYu Alertes',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E8771A',
          sound: 'default',
        });
        await Notifications.setNotificationChannelAsync('alerts', {
          name: 'Alertes véhicules',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#EF4444',
          sound: 'default',
        });
      }

      // 3. Token Expo Push — projectId requis explicitement depuis SDK 51
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {});
      if (!active) return;

      // 4. Enregistrement du token — POST /api/v1/notifications/register-device
      try {
        await apiClient.post('/notifications/register-device', {
          fcm_token: tokenData.data,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          device_info: {},
        });
      } catch {
        // Silencieux si le backend est indisponible
      }

      // 5. Cold start : si l'app a été ouverte via une notification (app tuée)
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse && active) {
        // Petit délai pour laisser le NavigationContainer s'initialiser
        setTimeout(() => handleNotificationNavigation(lastResponse), 500);
      }
    }

    registerToken();

    if (!IS_EXPO_GO) {
      // 6. Listener — notification reçue en foreground (affichée, pas de navigation)
      notifListener.current = Notifications.addNotificationReceivedListener((_notification) => {
        // Badge géré automatiquement par expo-notifications
      });

      // 7. Listener — tap sur une notification (app en background ou foreground)
      responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationNavigation);
    }

    return () => {
      active = false;
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user?.id]);
}
