/**
 * Constantes et configurations pour les modèles de messages
 */

import { Mail, MessageSquare, Send, Bell, CreditCard, TrendingUp, Receipt, Wrench, AlertTriangle, Settings } from 'lucide-react';
import type { CategoryConfig, ChannelConfig, TemplateVariable, MessageCategory } from './types';

// Configuration des catégories
export const MESSAGE_CATEGORIES: CategoryConfig[] = [
  {
    id: 'PAYMENT',
    label: 'Paiements',
    icon: 'CreditCard',
    color: 'red',
    description: 'Relances et rappels de paiement'
  },
  {
    id: 'COMMERCIAL',
    label: 'Commercial',
    icon: 'TrendingUp',
    color: 'green',
    description: 'Suivi leads et devis'
  },
  {
    id: 'INVOICE',
    label: 'Facturation',
    icon: 'Receipt',
    color: 'blue',
    description: 'Notifications de factures'
  },
  {
    id: 'INTERVENTION',
    label: 'Interventions',
    icon: 'Wrench',
    color: 'orange',
    description: 'RDV et rapports techniques'
  },
  {
    id: 'ALERT',
    label: 'Alertes GPS',
    icon: 'AlertTriangle',
    color: 'yellow',
    description: 'Notifications véhicules'
  },
  {
    id: 'SYSTEM',
    label: 'Système',
    icon: 'Settings',
    color: 'slate',
    description: 'Notifications système'
  }
];

// Configuration des canaux
export const MESSAGE_CHANNELS: ChannelConfig[] = [
  {
    id: 'EMAIL',
    label: 'Email',
    icon: 'Mail',
    color: 'blue',
    supportsHtml: true,
    supportsSubject: true
  },
  {
    id: 'SMS',
    label: 'SMS',
    icon: 'MessageSquare',
    color: 'green',
    maxLength: 160,
    supportsHtml: false,
    supportsSubject: false
  },
  {
    id: 'WHATSAPP',
    label: 'WhatsApp',
    icon: 'MessageSquare',
    color: 'emerald',
    maxLength: 4096,
    supportsHtml: false,
    supportsSubject: false
  },
  {
    id: 'TELEGRAM',
    label: 'Telegram',
    icon: 'Send',
    color: 'sky',
    maxLength: 4096,
    supportsHtml: true,
    supportsSubject: false
  }
];

// Variables disponibles par catégorie
export const TEMPLATE_VARIABLES: Record<MessageCategory, TemplateVariable[]> = {
  PAYMENT: [
    // Client
    { key: '{{client.name}}', label: 'Nom du client', example: 'Entreprise ABC', category: 'Client' },
    { key: '{{client.contact}}', label: 'Nom du contact', example: 'M. Konan', category: 'Client' },
    { key: '{{client.email}}', label: 'Email', example: 'contact@abc.ci', category: 'Client' },
    { key: '{{client.phone}}', label: 'Téléphone', example: '+225 07 00 00 00', category: 'Client' },
    // Facture
    { key: '{{invoice.number}}', label: 'N° Facture', example: 'FAC-2025-0042', category: 'Facture' },
    { key: '{{invoice.amount}}', label: 'Montant', example: '150 000 FCFA', category: 'Facture' },
    { key: '{{invoice.due_date}}', label: 'Date d\'échéance', example: '15/01/2026', category: 'Facture' },
    { key: '{{invoice.days_overdue}}', label: 'Jours de retard', example: '15', category: 'Facture' },
    // Paiement
    { key: '{{payment.link}}', label: 'Lien de paiement', example: 'https://pay.wave.com/...', category: 'Paiement' },
    { key: '{{payment.methods}}', label: 'Modes de paiement', example: 'Wave, Orange Money, Virement', category: 'Paiement' },
    // Entreprise
    { key: '{{company.name}}', label: 'Nom entreprise', example: 'TrackYu GPS', category: 'Entreprise' },
    { key: '{{company.phone}}', label: 'Téléphone', example: '+225 07 XX XX XX', category: 'Entreprise' }
  ],
  COMMERCIAL: [
    // Client/Lead
    { key: '{{lead.name}}', label: 'Nom du prospect', example: 'M. Diallo', category: 'Lead' },
    { key: '{{lead.company}}', label: 'Entreprise', example: 'Transport Express', category: 'Lead' },
    { key: '{{lead.phone}}', label: 'Téléphone', example: '+225 05 00 00 00', category: 'Lead' },
    { key: '{{lead.email}}', label: 'Email', example: 'diallo@transport.ci', category: 'Lead' },
    // Devis
    { key: '{{quote.number}}', label: 'N° Devis', example: 'DEV-2025-0123', category: 'Devis' },
    { key: '{{quote.amount}}', label: 'Montant', example: '250 000 FCFA', category: 'Devis' },
    { key: '{{quote.validity}}', label: 'Validité', example: '30 jours', category: 'Devis' },
    { key: '{{quote.expiry_date}}', label: 'Date expiration', example: '20/01/2026', category: 'Devis' },
    { key: '{{quote.items}}', label: 'Articles', example: '5x GPS Tracker + Abonnement 1 an', category: 'Devis' },
    // Commercial
    { key: '{{sales.name}}', label: 'Nom commercial', example: 'Jean Dupont', category: 'Commercial' },
    { key: '{{sales.phone}}', label: 'Téléphone', example: '+225 07 XX XX XX', category: 'Commercial' },
    { key: '{{sales.email}}', label: 'Email', example: 'jean@trackyu.com', category: 'Commercial' }
  ],
  INVOICE: [
    // Client
    { key: '{{client.name}}', label: 'Nom du client', example: 'Entreprise ABC', category: 'Client' },
    { key: '{{client.email}}', label: 'Email', example: 'contact@abc.ci', category: 'Client' },
    // Facture
    { key: '{{invoice.number}}', label: 'N° Facture', example: 'FAC-2025-0042', category: 'Facture' },
    { key: '{{invoice.amount}}', label: 'Montant TTC', example: '150 000 FCFA', category: 'Facture' },
    { key: '{{invoice.date}}', label: 'Date facture', example: '20/12/2025', category: 'Facture' },
    { key: '{{invoice.due_date}}', label: 'Date d\'échéance', example: '20/01/2026', category: 'Facture' },
    { key: '{{invoice.download_link}}', label: 'Lien téléchargement', example: 'https://app.trackyu.com/invoices/...', category: 'Facture' },
    // Paiement reçu
    { key: '{{payment.amount}}', label: 'Montant payé', example: '150 000 FCFA', category: 'Paiement' },
    { key: '{{payment.date}}', label: 'Date paiement', example: '18/12/2025', category: 'Paiement' },
    { key: '{{payment.method}}', label: 'Mode paiement', example: 'Wave', category: 'Paiement' },
    { key: '{{payment.reference}}', label: 'Référence', example: 'PAY-2025-0789', category: 'Paiement' }
  ],
  INTERVENTION: [
    // Client
    { key: '{{client.name}}', label: 'Nom du client', example: 'Entreprise ABC', category: 'Client' },
    { key: '{{client.phone}}', label: 'Téléphone', example: '+225 07 00 00 00', category: 'Client' },
    { key: '{{client.address}}', label: 'Adresse', example: 'Zone Industrielle, Abidjan', category: 'Client' },
    // Intervention
    { key: '{{intervention.id}}', label: 'Référence', example: 'INT-2025-0456', category: 'Intervention' },
    { key: '{{intervention.type}}', label: 'Type', example: 'Installation GPS', category: 'Intervention' },
    { key: '{{intervention.date}}', label: 'Date', example: '22/12/2025', category: 'Intervention' },
    { key: '{{intervention.time}}', label: 'Heure', example: '10:00', category: 'Intervention' },
    { key: '{{intervention.status}}', label: 'Statut', example: 'Confirmé', category: 'Intervention' },
    // Véhicule
    { key: '{{vehicle.immat}}', label: 'Immatriculation', example: 'AB-123-CD', category: 'Véhicule' },
    { key: '{{vehicle.brand}}', label: 'Marque', example: 'Toyota Hilux', category: 'Véhicule' },
    // Technicien
    { key: '{{technician.name}}', label: 'Nom technicien', example: 'Moussa Traoré', category: 'Technicien' },
    { key: '{{technician.phone}}', label: 'Téléphone', example: '+225 05 XX XX XX', category: 'Technicien' },
    { key: '{{technician.eta}}', label: 'Heure d\'arrivée', example: '10:30', category: 'Technicien' }
  ],
  ALERT: [
    // Véhicule
    { key: '{{vehicle.immat}}', label: 'Immatriculation', example: 'AB-123-CD', category: 'Véhicule' },
    { key: '{{vehicle.name}}', label: 'Nom véhicule', example: 'Camion Livraison 1', category: 'Véhicule' },
    { key: '{{vehicle.driver}}', label: 'Conducteur', example: 'Amadou Sy', category: 'Véhicule' },
    // Alerte
    { key: '{{alert.type}}', label: 'Type d\'alerte', example: 'Excès de vitesse', category: 'Alerte' },
    { key: '{{alert.value}}', label: 'Valeur', example: '125 km/h', category: 'Alerte' },
    { key: '{{alert.threshold}}', label: 'Seuil', example: '90 km/h', category: 'Alerte' },
    { key: '{{alert.time}}', label: 'Heure', example: '14:32', category: 'Alerte' },
    { key: '{{alert.date}}', label: 'Date', example: '20/12/2025', category: 'Alerte' },
    // Localisation
    { key: '{{location.address}}', label: 'Adresse', example: 'Autoroute du Nord, km 45', category: 'Localisation' },
    { key: '{{location.city}}', label: 'Ville', example: 'Yamoussoukro', category: 'Localisation' },
    { key: '{{location.maps_link}}', label: 'Lien Google Maps', example: 'https://maps.google.com/...', category: 'Localisation' },
    // Geofence
    { key: '{{geofence.name}}', label: 'Nom de la zone', example: 'Dépôt Principal', category: 'Géofence' },
    { key: '{{geofence.action}}', label: 'Action', example: 'Sortie', category: 'Géofence' }
  ],
  SYSTEM: [
    // Utilisateur
    { key: '{{user.name}}', label: 'Nom utilisateur', example: 'Jean Dupont', category: 'Utilisateur' },
    { key: '{{user.email}}', label: 'Email', example: 'jean@entreprise.ci', category: 'Utilisateur' },
    // Compte
    { key: '{{account.name}}', label: 'Nom du compte', example: 'Entreprise ABC', category: 'Compte' },
    { key: '{{account.subscription}}', label: 'Abonnement', example: 'Premium - 10 véhicules', category: 'Compte' },
    { key: '{{account.expiry_date}}', label: 'Date expiration', example: '31/12/2025', category: 'Compte' },
    // Système
    { key: '{{app.name}}', label: 'Nom application', example: 'TrackYu GPS', category: 'Système' },
    { key: '{{app.url}}', label: 'URL application', example: 'https://app.trackyu.com', category: 'Système' },
    { key: '{{support.email}}', label: 'Email support', example: 'support@trackyu.com', category: 'Système' },
    { key: '{{support.phone}}', label: 'Téléphone support', example: '+225 07 XX XX XX', category: 'Système' }
  ]
};

// Helper pour obtenir la config d'une catégorie
export const getCategoryConfig = (id: MessageCategory): CategoryConfig | undefined => {
  return MESSAGE_CATEGORIES.find(c => c.id === id);
};

// Helper pour obtenir l'icône d'une catégorie
export const getCategoryIcon = (id: MessageCategory) => {
  switch (id) {
    case 'PAYMENT': return CreditCard;
    case 'COMMERCIAL': return TrendingUp;
    case 'INVOICE': return Receipt;
    case 'INTERVENTION': return Wrench;
    case 'ALERT': return AlertTriangle;
    case 'SYSTEM': return Settings;
    default: return Bell;
  }
};

// Helper pour obtenir l'icône d'un canal
export const getChannelIcon = (id: string) => {
  switch (id) {
    case 'EMAIL': return Mail;
    case 'SMS': return MessageSquare;
    case 'WHATSAPP': return MessageSquare;
    case 'TELEGRAM': return Send;
    default: return Mail;
  }
};
