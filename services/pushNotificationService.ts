/**
 * Service de gestion des notifications push
 * Intègre Firebase Cloud Messaging (FCM) pour Android
 * 
 * Use cases TrackYu GPS:
 * - Alertes véhicules critiques (vitesse, géofencing, pannes)
 * - Interventions assignées aux techniciens
 * - Messages urgents du dispatch
 * - Mises à jour statut (validation, pièces disponibles)
 */

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { API_BASE_URL } from '../utils/apiConfig';
import { logger } from '../utils/logger';

// Helper pour faire des requêtes API avec authentification
const apiClient = {
  async post(endpoint: string, data: any) {
    const token = localStorage.getItem('fleet_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  async get(endpoint: string) {
    const token = localStorage.getItem('fleet_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { data: await response.json() };
  },
  async put(endpoint: string, data: any) {
    const token = localStorage.getItem('fleet_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  async delete(endpoint: string, options?: any) {
    const token = localStorage.getItem('fleet_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: options?.data ? JSON.stringify(options.data) : undefined
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
};

export interface NotificationPreferences {
  vehicleAlerts: boolean;
  interventionAssignments: boolean;
  urgentMessages: boolean;
  statusUpdates: boolean;
}

class PushNotificationService {
  private fcmToken: string | null = null;
  private isInitialized = false;

  /**
   * Initialise le service de notifications push
   * À appeler au login de l'utilisateur
   */
  async initialize(): Promise<void> {
    // Push notifications uniquement sur mobile
    if (!Capacitor.isNativePlatform()) {
      logger.debug('Push notifications disponibles uniquement sur mobile');
      return;
    }

    if (this.isInitialized) {
      logger.debug('Push notifications déjà initialisées');
      return;
    }

    try {
      // 1. Demander permission
      const permissionStatus = await PushNotifications.requestPermissions();

      if (permissionStatus.receive !== 'granted') {
        logger.warn('Permission notifications refusée par l\'utilisateur');
        return;
      }

      // 2. S'enregistrer pour recevoir les notifications
      await PushNotifications.register();

      // 3. Écouter les événements
      this.setupListeners();

      this.isInitialized = true;
      logger.debug('✅ Push notifications initialisées');
    } catch (error) {
      logger.error('Erreur initialisation push notifications:', error);
      throw error;
    }
  }

  /**
   * Configure les écouteurs d'événements
   */
  private setupListeners(): void {
    // Token FCM reçu
    PushNotifications.addListener('registration', async (token: Token) => {
      // Ne pas afficher le token complet pour des raisons de sécurité
      logger.debug('FCM Token reçu:', token.value ? `${token.value.substring(0, 10)}...` : 'null');
      this.fcmToken = token.value;

      // Envoyer token au backend
      await this.registerTokenWithBackend(token.value);
    });

    // Erreur d'enregistrement
    PushNotifications.addListener('registrationError', (error: any) => {
      logger.error('Erreur enregistrement push:', error);
    });

    // Notification reçue (app en foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      logger.debug('📬 Notification reçue (foreground):', notification);

      // Afficher notification locale pour visibilité
      this.showLocalNotification(notification);
    });

    // Notification cliquée (app en background ou fermée)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      logger.debug('🔔 Notification cliquée:', action);

      const data = action.notification.data;

      // Navigation selon le type de notification
      this.handleNotificationAction(data);
    });
  }

  /**
   * Enregistre le token FCM auprès du backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      await apiClient.post('/notifications/register-device', {
        fcm_token: token,
        platform: 'android',
        device_info: {
          model: await this.getDeviceModel(),
          os_version: await this.getOSVersion()
        }
      });

      logger.debug('✅ Token FCM enregistré sur le serveur');
    } catch (error) {
      logger.error('Erreur enregistrement token:', error);
    }
  }

  /**
   * Affiche une notification locale (quand app en foreground)
   */
  private async showLocalNotification(notification: PushNotificationSchema): Promise<void> {
    // Utiliser l'API de notifications locales de Capacitor
    // Pour l'instant, on log (peut être étendu avec LocalNotifications plugin)
    logger.debug('Notification à afficher:', {
      title: notification.title,
      body: notification.body,
      data: notification.data
    });
  }

  /**
   * Gère les actions suite au clic sur notification
   */
  private handleNotificationAction(data: any): void {
    const { type, id } = data;

    switch (type) {
      case 'vehicle_alert':
        // Naviguer vers détail véhicule
        window.location.href = `/#/fleet/${id}`;
        break;

      case 'intervention_assigned':
        // Naviguer vers détail intervention
        window.location.href = `/#/interventions/${id}`;
        break;

      case 'urgent_message':
        // Ouvrir messages
        window.location.href = `/#/messages`;
        break;

      case 'status_update':
        // Rafraîchir dashboard
        window.location.href = `/#/dashboard`;
        break;

      default:
        logger.debug('Type de notification inconnu:', type);
    }
  }

  /**
   * Met à jour les préférences de notifications
   */
  async updatePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await apiClient.put('/notifications/preferences', preferences);
      logger.debug('✅ Préférences notifications mises à jour');
    } catch (error) {
      logger.error('Erreur mise à jour préférences:', error);
      throw error;
    }
  }

  /**
   * Récupère les préférences de notifications
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await apiClient.get('/notifications/preferences');
      return response.data;
    } catch (error) {
      logger.error('Erreur récupération préférences:', error);
      // Valeurs par défaut
      return {
        vehicleAlerts: true,
        interventionAssignments: true,
        urgentMessages: true,
        statusUpdates: true
      };
    }
  }

  /**
   * Désactive les notifications (déconnexion)
   */
  async unregister(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Supprimer token du backend
      if (this.fcmToken) {
        await apiClient.delete('/notifications/unregister-device', {
          data: { fcm_token: this.fcmToken }
        });
      }

      // Nettoyer les listeners
      await PushNotifications.removeAllListeners();

      this.fcmToken = null;
      this.isInitialized = false;

      logger.debug('✅ Notifications désactivées');
    } catch (error) {
      logger.error('Erreur désactivation notifications:', error);
    }
  }

  /**
   * Vérifie l'état des permissions
   */
  async checkPermissions(): Promise<'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'> {
    if (!Capacitor.isNativePlatform()) return 'denied';

    try {
      const result = await PushNotifications.checkPermissions();
      return result.receive;
    } catch (error) {
      logger.error('Erreur vérification permissions:', error);
      return 'denied';
    }
  }

  /**
   * Récupère le token FCM actuel
   */
  getToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Helpers pour info device
   */
  private async getDeviceModel(): Promise<string> {
    // Peut être étendu avec @capacitor/device
    return 'Android Device';
  }

  private async getOSVersion(): Promise<string> {
    return 'Unknown';
  }
}

// Export instance singleton
export const pushNotificationService = new PushNotificationService();
