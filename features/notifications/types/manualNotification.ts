/**
 * Types pour les notifications manuelles envoyées aux clients
 * Permet l'envoi groupé avec différents types de messages
 */

// Types de notifications manuelles
export type ManualNotificationType = 
  | 'INFO'           // Information générale
  | 'MAINTENANCE'    // Maintenance planifiée
  | 'BILLING'        // Rappel facturation
  | 'PROMOTION'      // Offre promotionnelle
  | 'SERVICE'        // Mise à jour de service
  | 'URGENT'         // Message urgent
  | 'CUSTOM';        // Message personnalisé

// Canaux de diffusion
export type NotificationChannel = 'PUSH' | 'EMAIL' | 'SMS' | 'IN_APP';

// Statut d'envoi
export type NotificationSendStatus = 
  | 'DRAFT'          // Brouillon
  | 'SCHEDULED'      // Programmé
  | 'SENDING'        // En cours d'envoi
  | 'SENT'           // Envoyé
  | 'PARTIAL'        // Partiellement envoyé (erreurs)
  | 'FAILED';        // Échec

// Template de notification pré-défini
export interface NotificationTemplate {
  id: string;
  type: ManualNotificationType;
  name: string;
  subject: string;
  body: string;
  variables: string[]; // {{clientName}}, {{invoiceNumber}}, etc.
  icon: string;
  color: string;
  isDefault?: boolean;
}

// Destinataire individuel
export interface NotificationRecipient {
  id: string;
  type: 'CLIENT' | 'RESELLER' | 'USER';
  name: string;
  email?: string;
  phone?: string;
  tenantId?: string;
  selected?: boolean;
}

// Résultat d'envoi par destinataire
export interface NotificationDeliveryResult {
  recipientId: string;
  recipientName: string;
  channel: NotificationChannel;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  sentAt?: string;
  error?: string;
}

// Notification manuelle complète
export interface ManualNotification {
  id: string;
  tenantId: string;
  createdBy: string;
  createdByName: string;
  
  // Contenu
  type: ManualNotificationType;
  templateId?: string;
  subject: string;
  body: string;
  
  // Destinataires
  recipientType: 'SELECTED' | 'ALL_CLIENTS' | 'FILTER';
  recipientIds: string[];
  recipientFilter?: {
    status?: string;
    tags?: string[];
    region?: string;
    contractType?: string;
  };
  totalRecipients: number;
  
  // Canaux
  channels: NotificationChannel[];
  
  // Planification
  sendImmediately: boolean;
  scheduledAt?: string;
  
  // Statut
  status: NotificationSendStatus;
  sentAt?: string;
  deliveryResults?: NotificationDeliveryResult[];
  successCount?: number;
  failureCount?: number;
  
  // Métadonnées
  createdAt: string;
  updatedAt?: string;
}

// Formulaire de création
export interface ManualNotificationFormData {
  type: ManualNotificationType;
  templateId?: string;
  subject: string;
  body: string;
  recipientType: 'SELECTED' | 'ALL_CLIENTS' | 'FILTER';
  recipientIds: string[];
  recipientFilter?: ManualNotification['recipientFilter'];
  channels: NotificationChannel[];
  sendImmediately: boolean;
  scheduledAt?: string;
}

// Templates par défaut
export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tpl-info-general',
    type: 'INFO',
    name: 'Information générale',
    subject: 'Information importante',
    body: 'Bonjour {{clientName}},\n\nNous souhaitons vous informer que...\n\nCordialement,\nL\'équipe TrackYu',
    variables: ['clientName'],
    icon: 'Info',
    color: 'blue',
    isDefault: true,
  },
  {
    id: 'tpl-maintenance',
    type: 'MAINTENANCE',
    name: 'Maintenance planifiée',
    subject: 'Maintenance programmée - {{date}}',
    body: 'Bonjour {{clientName}},\n\nNous vous informons qu\'une maintenance est programmée le {{date}} de {{startTime}} à {{endTime}}.\n\nVos services pourraient être temporairement indisponibles.\n\nMerci de votre compréhension.',
    variables: ['clientName', 'date', 'startTime', 'endTime'],
    icon: 'Wrench',
    color: 'orange',
  },
  {
    id: 'tpl-billing-reminder',
    type: 'BILLING',
    name: 'Rappel de facturation',
    subject: 'Rappel - Facture {{invoiceNumber}} en attente',
    body: 'Bonjour {{clientName}},\n\nNous vous rappelons que la facture n°{{invoiceNumber}} d\'un montant de {{amount}} est en attente de règlement.\n\nMerci de procéder au paiement dans les meilleurs délais.\n\nCordialement,\nService Comptabilité',
    variables: ['clientName', 'invoiceNumber', 'amount'],
    icon: 'Receipt',
    color: 'yellow',
  },
  {
    id: 'tpl-promotion',
    type: 'PROMOTION',
    name: 'Offre promotionnelle',
    subject: '🎉 Offre exclusive pour vous !',
    body: 'Bonjour {{clientName}},\n\nEn tant que client fidèle, nous vous proposons une offre exclusive :\n\n{{offerDetails}}\n\nCette offre est valable jusqu\'au {{expiryDate}}.\n\nPour en profiter, contactez votre conseiller.',
    variables: ['clientName', 'offerDetails', 'expiryDate'],
    icon: 'Gift',
    color: 'purple',
  },
  {
    id: 'tpl-service-update',
    type: 'SERVICE',
    name: 'Mise à jour de service',
    subject: 'Nouveauté - Mise à jour de nos services',
    body: 'Bonjour {{clientName}},\n\nNous avons le plaisir de vous annoncer une amélioration de nos services :\n\n{{updateDetails}}\n\nCette mise à jour sera effective à partir du {{effectiveDate}}.\n\nN\'hésitez pas à nous contacter pour plus d\'informations.',
    variables: ['clientName', 'updateDetails', 'effectiveDate'],
    icon: 'Sparkles',
    color: 'green',
  },
  {
    id: 'tpl-urgent',
    type: 'URGENT',
    name: 'Message urgent',
    subject: '⚠️ URGENT - Action requise',
    body: 'Bonjour {{clientName}},\n\n⚠️ Ce message nécessite votre attention immédiate.\n\n{{urgentMessage}}\n\nMerci de prendre les mesures nécessaires rapidement.\n\nContact urgence: {{emergencyContact}}',
    variables: ['clientName', 'urgentMessage', 'emergencyContact'],
    icon: 'AlertTriangle',
    color: 'red',
  },
  {
    id: 'tpl-custom',
    type: 'CUSTOM',
    name: 'Message personnalisé',
    subject: '',
    body: '',
    variables: ['clientName'],
    icon: 'MessageSquare',
    color: 'slate',
  },
];

// Icônes par type
export const NOTIFICATION_TYPE_CONFIG: Record<ManualNotificationType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  INFO: { label: 'Information', icon: 'Info', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  MAINTENANCE: { label: 'Maintenance', icon: 'Wrench', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  BILLING: { label: 'Facturation', icon: 'Receipt', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  PROMOTION: { label: 'Promotion', icon: 'Gift', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  SERVICE: { label: 'Service', icon: 'Sparkles', color: 'text-green-600', bgColor: 'bg-green-100' },
  URGENT: { label: 'Urgent', icon: 'AlertTriangle', color: 'text-red-600', bgColor: 'bg-red-100' },
  CUSTOM: { label: 'Personnalisé', icon: 'MessageSquare', color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

// Canaux disponibles
export const NOTIFICATION_CHANNELS: { id: NotificationChannel; label: string; icon: string }[] = [
  { id: 'IN_APP', label: 'Application', icon: 'Bell' },
  { id: 'PUSH', label: 'Push', icon: 'Smartphone' },
  { id: 'EMAIL', label: 'Email', icon: 'Mail' },
  { id: 'SMS', label: 'SMS', icon: 'MessageCircle' },
];
