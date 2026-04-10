/**
 * Service Orange SMS API (Côte d'Ivoire)
 * Documentation: https://developer.orange.com/apis/sms-ci
 * 
 * Points clés de l'API Orange CI:
 * - senderAddress est FIXE: tel:+2250000 (fourni par Orange pour tous)
 * - senderName est configurable (max 11 caractères): TRACKYU GPS, ABIDJAN GPS, etc.
 * - Le senderName est le nom qui s'affiche sur le téléphone du destinataire
 */

import { logger } from '../utils/logger';

export interface OrangeSmsConfig {
  clientId: string;           // Client ID OAuth (Orange Developer)
  clientSecret: string;       // Client Secret OAuth
  senderName: string;         // Nom affiché au destinataire (max 11 chars)
}

export interface OrangeSmsResult {
  outboundSMSMessageRequest?: {
    address: string[];
    senderAddress: string;
    senderName: string;
    outboundSMSTextMessage: { message: string };
    resourceURL: string;
  };
  requestError?: {
    serviceException?: {
      messageId: string;
      text: string;
    };
    policyException?: {
      messageId: string;
      text: string;
    };
  };
}

export interface OrangeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Constantes Orange CI - senderAddress fixe pour tout le monde
const ORANGE_SENDER_ADDRESS = 'tel:+2250000';
const ORANGE_SENDER_ADDRESS_ENCODED = 'tel%3A%2B2250000';

// Noms d'expéditeur autorisés par organisation
export const SENDER_NAMES = {
  TRACKYU_GPS: 'TRACKYU GPS',   // SMARTRACK SOLUTIONS + Superadmin (11 chars)
  ABIDJAN_GPS: 'ABIDJAN GPS'    // Tenant ABIDJAN GPS (11 chars)
} as const;

// Messages prédéfinis pour GPS (optimisés pour 160 caractères max)
export const SMS_TEMPLATES = {
  alert_speeding: (vehicleName: string, speed: number, limit: number) => 
    `[VITESSE] ${vehicleName}: ${speed}km/h (limite ${limit}). TrackYu`,
  
  alert_geofence: (vehicleName: string, zone: string, action: 'entree' | 'sortie') => 
    `[ZONE] ${vehicleName}: ${action === 'entree' ? 'Entree' : 'Sortie'} "${zone}". TrackYu`,
  
  alert_sos: (vehicleName: string, driver?: string) => 
    `[SOS URGENT] ${vehicleName}${driver ? ` (${driver})` : ''}: Alerte declenchee! TrackYu`,
  
  alert_maintenance: (vehicleName: string, type: string) => 
    `[MAINT] ${vehicleName}: ${type} requis. TrackYu`,
  
  payment_reminder: (clientName: string, amount: number, dueDate: string) => 
    `${clientName}, abonnement GPS ${amount.toLocaleString()}F expire le ${dueDate}. TrackYu`,
  
  payment_confirmed: (reference: string, validUntil: string) => 
    `Paiement recu! Ref:${reference}. Valide jusqu'au ${validUntil}. Merci! TrackYu`,
  
  vehicle_status: (vehicleName: string, status: string) => 
    `${vehicleName}: ${status}. TrackYu GPS`,
  
  welcome: (clientName: string, login: string, password: string) => 
    `Bienvenue ${clientName}! TrackYu GPS. Login:${login} MDP:${password}`
};

class OrangeSmsService {
  private baseUrl = 'https://api.orange.com';
  private config: OrangeSmsConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Configure le service
   */
  configure(config: OrangeSmsConfig) {
    // Valider et tronquer senderName à 11 caractères max
    if (config.senderName && config.senderName.length > 11) {
      config.senderName = config.senderName.substring(0, 11);
    }
    this.config = config;
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.saveConfig();
  }

  /**
   * Récupère la configuration depuis localStorage
   */
  getConfig(): OrangeSmsConfig | null {
    if (this.config) return this.config;
    
    const stored = localStorage.getItem('orange_sms_config');
    if (stored) {
      try {
        this.config = JSON.parse(stored);
        return this.config;
      } catch {
        return null;
      }
    }
    return null;
  }

  private saveConfig() {
    if (this.config) {
      localStorage.setItem('orange_sms_config', JSON.stringify(this.config));
    }
  }

  /**
   * Vérifie si le service est configuré
   */
  isConfigured(): boolean {
    const config = this.getConfig();
    return !!config?.clientId && !!config?.clientSecret && !!config?.senderName;
  }

  /**
   * Obtient un token d'accès OAuth (avec cache)
   */
  private async getAccessToken(): Promise<string> {
    // Vérifier si le token est encore valide (avec 1 min de marge)
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    const config = this.getConfig();
    if (!config?.clientId || !config?.clientSecret) {
      throw new Error('Orange SMS non configuré');
    }

    // Encode credentials en Base64
    const credentials = btoa(`${config.clientId}:${config.clientSecret}`);

    const response = await fetch(`${this.baseUrl}/oauth/v3/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        throw new Error('Identifiants Orange invalides (Client ID/Secret)');
      }
      throw new Error(`Erreur authentification Orange: ${errorText}`);
    }

    const data: OrangeTokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);

    return this.accessToken;
  }

  /**
   * Test la connexion (obtient un token valide)
   */
  async testConnection(): Promise<{ success: boolean; error?: string; senderName?: string }> {
    try {
      await this.getAccessToken();
      
      const config = this.getConfig();
      return { 
        success: true,
        senderName: config?.senderName
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erreur de connexion' };
    }
  }

  /**
   * Formate un numéro de téléphone au format Orange API: tel:+225XXXXXXXXXX
   */
  private formatPhoneNumber(phone: string): string {
    // Enlever tout sauf les chiffres et le +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Si commence par 0, remplacer par +225
    if (cleaned.startsWith('0')) {
      cleaned = '+225' + cleaned.substring(1);
    }
    
    // Si pas de +, supposer CI et ajouter +225
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        // Format 07XXXXXXXX -> +22507XXXXXXXX
        cleaned = '+225' + cleaned;
      } else if (cleaned.startsWith('225')) {
        // Format 22507XXXXXXXX -> +22507XXXXXXXX
        cleaned = '+' + cleaned;
      }
    }
    
    return `tel:${cleaned}`;
  }

  /**
   * Envoie un SMS
   */
  async sendSms(to: string, message: string): Promise<OrangeSmsResult> {
    const token = await this.getAccessToken();
    const config = this.getConfig();
    
    if (!config?.senderName) {
      throw new Error('Orange SMS non configuré: senderName manquant');
    }

    // Construire le payload selon la doc Orange
    const payload = {
      outboundSMSMessageRequest: {
        address: this.formatPhoneNumber(to),
        senderAddress: ORANGE_SENDER_ADDRESS,
        senderName: config.senderName,
        outboundSMSTextMessage: {
          message: message.substring(0, 160) // Limite 160 chars par segment
        }
      }
    };

    const response = await fetch(
      `${this.baseUrl}/smsmessaging/v1/outbound/${ORANGE_SENDER_ADDRESS_ENCODED}/requests`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    // Gérer les erreurs Orange
    if (result.requestError) {
      const errorMessage = 
        result.requestError.serviceException?.text || 
        result.requestError.policyException?.text || 
        'Erreur envoi SMS Orange';
      throw new Error(errorMessage);
    }

    return result;
  }

  /**
   * Envoie un SMS à plusieurs destinataires (appels séquentiels)
   */
  async sendBulkSms(recipients: string[], message: string): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    
    for (const recipient of recipients) {
      try {
        await this.sendSms(recipient, message);
        success++;
      } catch (error) {
        logger.error(`SMS échoué pour ${recipient}:`, error);
        failed++;
      }
    }
    
    return { success, failed };
  }

  /**
   * Envoie une alerte véhicule par SMS
   */
  async sendVehicleAlert(
    to: string,
    alert: {
      type: 'SPEEDING' | 'GEOFENCE' | 'MAINTENANCE' | 'SOS' | 'IDLE';
      vehicleName: string;
      message: string;
      driver?: string;
    }
  ): Promise<OrangeSmsResult> {
    let smsText: string;

    switch (alert.type) {
      case 'SPEEDING':
        smsText = `[VITESSE] ${alert.vehicleName}: ${alert.message}. TrackYu`;
        break;
      case 'GEOFENCE':
        smsText = `[ZONE] ${alert.vehicleName}: ${alert.message}. TrackYu`;
        break;
      case 'SOS':
        smsText = SMS_TEMPLATES.alert_sos(alert.vehicleName, alert.driver);
        break;
      case 'MAINTENANCE':
        smsText = `[MAINT] ${alert.vehicleName}: ${alert.message}. TrackYu`;
        break;
      case 'IDLE':
        smsText = `[RALENTI] ${alert.vehicleName}: ${alert.message}. TrackYu`;
        break;
      default:
        smsText = `[ALERTE] ${alert.vehicleName}: ${alert.message}. TrackYu`;
    }

    return this.sendSms(to, smsText);
  }

  /**
   * Envoie un rappel de paiement
   */
  async sendPaymentReminder(
    to: string,
    payment: {
      clientName: string;
      amount: number;
      dueDate: Date;
    }
  ): Promise<OrangeSmsResult> {
    const dueDateStr = payment.dueDate.toLocaleDateString('fr-FR');
    const message = SMS_TEMPLATES.payment_reminder(
      payment.clientName, 
      payment.amount, 
      dueDateStr
    );
    return this.sendSms(to, message);
  }

  /**
   * Envoie une confirmation de paiement
   */
  async sendPaymentConfirmation(
    to: string,
    payment: {
      reference: string;
      validUntil: Date;
    }
  ): Promise<OrangeSmsResult> {
    const validUntilStr = payment.validUntil.toLocaleDateString('fr-FR');
    const message = SMS_TEMPLATES.payment_confirmed(payment.reference, validUntilStr);
    return this.sendSms(to, message);
  }

  /**
   * Envoie les identifiants de connexion
   */
  async sendWelcomeSms(
    to: string,
    user: {
      name: string;
      login: string;
      password: string;
    }
  ): Promise<OrangeSmsResult> {
    const message = SMS_TEMPLATES.welcome(user.name, user.login, user.password);
    return this.sendSms(to, message);
  }

  /**
   * Récupère le nom d'expéditeur configuré
   */
  getSenderName(): string | null {
    const config = this.getConfig();
    return config?.senderName || null;
  }

  /**
   * Change le nom d'expéditeur (utile pour multi-tenant)
   */
  setSenderName(senderName: string) {
    const config = this.getConfig();
    if (config) {
      config.senderName = senderName.substring(0, 11);
      this.config = config;
      this.saveConfig();
    }
  }

  /**
   * Liste les noms d'expéditeur disponibles
   */
  getAvailableSenderNames(): typeof SENDER_NAMES {
    return SENDER_NAMES;
  }

  // ============================================
  // API Admin Orange - Solde et Statistiques
  // ============================================

  /**
   * Interface pour les contrats Orange SMS
   */
  private async fetchContracts(): Promise<OrangeContractsResponse> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `${this.baseUrl}/sms/admin/v1/contracts?country=CIV`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur récupération contrats: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Récupère le solde SMS disponible (somme de tous les contrats actifs)
   */
  async getBalance(): Promise<number> {
    try {
      const contracts = await this.fetchContracts();
      
      let totalBalance = 0;
      
      if (contracts.purchaseOrders) {
        for (const order of contracts.purchaseOrders) {
          for (const contract of order.contracts || []) {
            for (const sc of contract.serviceContracts || []) {
              // Vérifier si le contrat n'est pas expiré
              if (sc.expires) {
                const expiryDate = new Date(sc.expires);
                if (expiryDate > new Date()) {
                  totalBalance += sc.availableUnits || 0;
                }
              } else {
                totalBalance += sc.availableUnits || 0;
              }
            }
          }
        }
      }
      
      return totalBalance;
    } catch (error: any) {
      logger.error('Erreur récupération solde Orange:', error);
      throw new Error(`Impossible de récupérer le solde: ${error.message}`);
    }
  }

  /**
   * Récupère les détails de tous les contrats (pour affichage détaillé)
   */
  async getContractsDetails(): Promise<OrangeContractDetail[]> {
    try {
      const contracts = await this.fetchContracts();
      const details: OrangeContractDetail[] = [];
      
      if (contracts.purchaseOrders) {
        for (const order of contracts.purchaseOrders) {
          for (const contract of order.contracts || []) {
            for (const sc of contract.serviceContracts || []) {
              details.push({
                contractId: sc.contractId,
                country: sc.country,
                service: sc.service,
                description: sc.scDescription || contract.contractDescription,
                availableUnits: sc.availableUnits || 0,
                expires: sc.expires ? new Date(sc.expires) : null,
                isExpired: sc.expires ? new Date(sc.expires) < new Date() : false
              });
            }
          }
        }
      }
      
      return details;
    } catch (error: any) {
      logger.error('Erreur récupération contrats Orange:', error);
      throw new Error(`Impossible de récupérer les contrats: ${error.message}`);
    }
  }

  /**
   * Récupère les statistiques d'utilisation SMS
   */
  async getStatistics(): Promise<OrangeStatistics> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `${this.baseUrl}/sms/admin/v1/statistics?country=CIV`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur récupération statistiques: ${errorText}`);
    }

    const data = await response.json();
    
    // Calculer le total d'utilisation
    let totalUsage = 0;
    if (data.partnerStatistics) {
      for (const partner of data.partnerStatistics) {
        for (const stat of partner.statistics || []) {
          for (const serviceStat of stat.serviceStatistics || []) {
            for (const countryStat of serviceStat.countryStatistics || []) {
              totalUsage += countryStat.usage || 0;
            }
          }
        }
      }
    }
    
    return {
      totalUsage,
      raw: data
    };
  }

  /**
   * Récupère l'historique des achats de forfaits SMS
   */
  async getPurchaseHistory(): Promise<OrangePurchaseOrder[]> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `${this.baseUrl}/sms/admin/v1/purchaseorders?country=CIV`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur récupération historique: ${errorText}`);
    }

    const data = await response.json();
    
    const orders: OrangePurchaseOrder[] = [];
    if (data.partnerContracts) {
      for (const contract of data.partnerContracts) {
        orders.push({
          purchaseOrderId: contract.purchaseOrderId,
          bundleId: contract.bundleId,
          bundleDescription: contract.bundleDescription,
          date: contract.orderExecutionInformation?.date 
            ? new Date(contract.orderExecutionInformation.date) 
            : null,
          amount: contract.orderExecutionInformation?.amount || 0,
          currency: contract.orderExecutionInformation?.currency || 'XOF',
          country: contract.orderExecutionInformation?.country || 'CIV'
        });
      }
    }
    
    return orders;
  }

  /**
   * Supprime la configuration
   */
  disconnect() {
    this.config = null;
    this.accessToken = null;
    this.tokenExpiry = 0;
    localStorage.removeItem('orange_sms_config');
  }
}

// ============================================
// Types pour les réponses API Admin Orange
// ============================================

export interface OrangeContractsResponse {
  purchaseOrders?: {
    partnerId: string;
    contracts?: {
      service: string;
      contractDescription: string;
      serviceContracts?: {
        country: string;
        service: string;
        contractId: string;
        availableUnits: number;
        expires?: string;
        scDescription?: string;
      }[];
    }[];
  }[];
}

export interface OrangeContractDetail {
  contractId: string;
  country: string;
  service: string;
  description?: string;
  availableUnits: number;
  expires: Date | null;
  isExpired: boolean;
}

export interface OrangeStatistics {
  totalUsage: number;
  raw: any;
}

export interface OrangePurchaseOrder {
  purchaseOrderId: string;
  bundleId: string;
  bundleDescription: string;
  date: Date | null;
  amount: number;
  currency: string;
  country: string;
}

export const orangeSmsService = new OrangeSmsService();
export default orangeSmsService;
