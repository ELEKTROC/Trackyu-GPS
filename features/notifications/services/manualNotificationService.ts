/**
 * Service pour les notifications manuelles aux clients
 * Gère l'envoi groupé et les différents canaux de diffusion
 */

import { api } from '../../../services/api';
import type {
  ManualNotification,
  ManualNotificationFormData,
  NotificationTemplate,
  NotificationRecipient,
  NotificationDeliveryResult,
  NotificationChannel} from '../types/manualNotification';
import {
  DEFAULT_NOTIFICATION_TEMPLATES
} from '../types/manualNotification';

// Types de retour API
interface SendNotificationResponse {
  success: boolean;
  notificationId: string;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  deliveryResults: NotificationDeliveryResult[];
}

interface NotificationListResponse {
  notifications: ManualNotification[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Récupérer tous les templates de notification
 */
export const getNotificationTemplates = async (): Promise<NotificationTemplate[]> => {
  try {
    const response = await api.get('/notifications/templates');
    return response.data || DEFAULT_NOTIFICATION_TEMPLATES;
  } catch {
    // Fallback sur les templates par défaut
    return DEFAULT_NOTIFICATION_TEMPLATES;
  }
};

/**
 * Récupérer les destinataires disponibles (clients, revendeurs)
 */
export const getNotificationRecipients = async (
  tenantId: string,
  type?: 'CLIENT' | 'RESELLER' | 'USER'
): Promise<NotificationRecipient[]> => {
  try {
    const response = await api.get('/notifications/recipients', {
      params: { tenantId, type }
    });
    return response.data || [];
  } catch {
    // Fallback: utiliser les données mockées du DataContext
    return [];
  }
};

/**
 * Récupérer les clients comme destinataires depuis le DataContext
 */
export const getClientsAsRecipients = (clients: any[]): NotificationRecipient[] => {
  return clients.map(client => ({
    id: client.id,
    type: 'CLIENT' as const,
    name: client.name || client.nom || 'Client',
    email: client.email,
    phone: client.phone,
    tenantId: client.tenantId,
    selected: false,
  }));
};

/**
 * Créer une notification (brouillon ou envoi immédiat)
 */
export const createNotification = async (
  data: ManualNotificationFormData,
  tenantId: string,
  userId: string,
  userName: string
): Promise<ManualNotification> => {
  const notification: ManualNotification = {
    id: `notif-${Date.now()}`,
    tenantId,
    createdBy: userId,
    createdByName: userName,
    type: data.type,
    templateId: data.templateId,
    subject: data.subject,
    body: data.body,
    recipientType: data.recipientType,
    recipientIds: data.recipientIds,
    recipientFilter: data.recipientFilter,
    totalRecipients: data.recipientIds.length,
    channels: data.channels,
    sendImmediately: data.sendImmediately,
    scheduledAt: data.scheduledAt,
    status: data.sendImmediately ? 'SENDING' : (data.scheduledAt ? 'SCHEDULED' : 'DRAFT'),
    createdAt: new Date().toISOString(),
  };

  try {
    const response = await api.post('/notifications/manual', notification);
    return response.data || notification;
  } catch {
    // Mode mock - retourner la notification créée localement
    return notification;
  }
};

/**
 * Envoyer une notification à tous les destinataires sélectionnés
 */
export const sendNotification = async (
  notificationId: string,
  recipients: NotificationRecipient[],
  channels: NotificationChannel[]
): Promise<SendNotificationResponse> => {
  try {
    const response = await api.post(`/notifications/manual/${notificationId}/send`, {
      recipientIds: recipients.map(r => r.id),
      channels,
    });
    return response.data;
  } catch {
    // Mode mock - simuler l'envoi
    const deliveryResults: NotificationDeliveryResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const recipient of recipients) {
      for (const channel of channels) {
        // Simuler un taux de succès de 95%
        const success = Math.random() > 0.05;
        
        deliveryResults.push({
          recipientId: recipient.id,
          recipientName: recipient.name,
          channel,
          status: success ? 'SUCCESS' : 'FAILED',
          sentAt: success ? new Date().toISOString() : undefined,
          error: success ? undefined : 'Échec de livraison',
        });

        if (success) successCount++;
        else failureCount++;
      }
    }

    return {
      success: failureCount === 0,
      notificationId,
      totalRecipients: recipients.length,
      successCount,
      failureCount,
      deliveryResults,
    };
  }
};

/**
 * Récupérer l'historique des notifications envoyées
 */
export const getNotificationHistory = async (
  tenantId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<NotificationListResponse> => {
  try {
    const response = await api.get('/notifications/manual/history', {
      params: { tenantId, page, pageSize }
    });
    return response.data;
  } catch {
    return {
      notifications: [],
      total: 0,
      page,
      pageSize,
    };
  }
};

/**
 * Supprimer un brouillon de notification
 */
export const deleteNotificationDraft = async (notificationId: string): Promise<boolean> => {
  try {
    await api.delete(`/notifications/manual/${notificationId}`);
    return true;
  } catch {
    return false;
  }
};

/**
 * Remplacer les variables dans un template
 */
export const replaceTemplateVariables = (
  template: string,
  variables: Record<string, string>
): string => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
};

/**
 * Valider le formulaire de notification
 */
export const validateNotificationForm = (data: ManualNotificationFormData): {
  valid: boolean;
  errors: Record<string, string>;
} => {
  const errors: Record<string, string> = {};

  if (!data.subject.trim()) {
    errors.subject = 'Le sujet est requis';
  }

  if (!data.body.trim()) {
    errors.body = 'Le contenu est requis';
  }

  if (data.recipientType === 'SELECTED' && data.recipientIds.length === 0) {
    errors.recipients = 'Sélectionnez au moins un destinataire';
  }

  if (data.channels.length === 0) {
    errors.channels = 'Sélectionnez au moins un canal de diffusion';
  }

  if (!data.sendImmediately && data.scheduledAt) {
    const scheduledDate = new Date(data.scheduledAt);
    if (scheduledDate <= new Date()) {
      errors.scheduledAt = 'La date de programmation doit être dans le futur';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
