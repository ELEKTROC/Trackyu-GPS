/**
 * Service centralisé pour la gestion des intégrations
 * Communique avec le backend pour stocker les credentials de manière sécurisée
 * 
 * NOTE: Ce service remplace les appels directs aux APIs externes (localStorage)
 * par des appels au backend qui gère le chiffrement et le stockage sécurisé
 * 
 * @version 2.0 - Orange SMS balance via backend (évite CORS)
 */

import { API_BASE_URL } from '../utils/apiConfig';
import { logger } from '../utils/logger';

// Helper pour les requêtes authentifiées
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('fleet_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
};

// Types
export interface IntegrationCredential {
  id: string;
  provider: string;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_success: boolean | null;
  config_summary: Record<string, string>;
}

export interface IntegrationTestResult {
  success: boolean;
  error?: string;
  info?: any;
}

export interface IntegrationSaveResult {
  success: boolean;
  message?: string;
  integration?: {
    id: string;
    provider: string;
    is_active: boolean;
  };
  error?: string;
}

export interface IntegrationStatusDetail {
  provider: string;
  configured: boolean;
  active: boolean;
  source: 'env' | 'database' | 'none';
  lastTestSuccess: boolean | null;
  lastTestedAt: string | null;
  configSummary: Record<string, string>;
}

/**
 * Providers supportés
 */
export type IntegrationProvider = 
  | 'telegram' 
  | 'resend' 
  | 'wave' 
  | 'whatsapp' 
  | 'orange_sms';

/**
 * Service de gestion des intégrations via backend
 */
class IntegrationService {
  private baseUrl = '/integration-credentials';

  /**
   * Récupère toutes les intégrations configurées
   */
  async getAll(): Promise<IntegrationCredential[]> {
    try {
      return await fetchApi(this.baseUrl);
    } catch (error: any) {
      logger.error('[IntegrationService] Error fetching integrations:', error);
      throw new Error(error.message || 'Erreur lors de la récupération des intégrations');
    }
  }

  /**
   * Récupère une intégration spécifique
   */
  async get(provider: IntegrationProvider): Promise<IntegrationCredential | null> {
    try {
      const all = await this.getAll();
      return all.find(i => i.provider === provider) || null;
    } catch (error) {
      logger.error(`[IntegrationService] Error fetching ${provider}:`, error);
      return null;
    }
  }

  /**
   * Vérifie si une intégration est configurée et active
   */
  async isConfigured(provider: IntegrationProvider): Promise<boolean> {
    try {
      const integration = await this.get(provider);
      return !!integration && integration.is_active && 
             Object.keys(integration.config_summary).length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Sauvegarde les credentials d'une intégration
   */
  async save(provider: IntegrationProvider, credentials: Record<string, string>): Promise<IntegrationSaveResult> {
    try {
      return await fetchApi(`${this.baseUrl}/${provider}`, {
        method: 'POST',
        body: JSON.stringify({ credentials })
      });
    } catch (error: any) {
      logger.error(`[IntegrationService] Error saving ${provider}:`, error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la sauvegarde'
      };
    }
  }

  /**
   * Active/Désactive une intégration
   */
  async toggle(provider: IntegrationProvider, isActive: boolean): Promise<IntegrationCredential | null> {
    try {
      return await fetchApi(`${this.baseUrl}/${provider}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive })
      });
    } catch (error: any) {
      logger.error(`[IntegrationService] Error toggling ${provider}:`, error);
      throw new Error(error.message || 'Erreur lors du changement de statut');
    }
  }

  /**
   * Supprime les credentials d'une intégration
   */
  async delete(provider: IntegrationProvider): Promise<boolean> {
    try {
      await fetchApi(`${this.baseUrl}/${provider}`, { method: 'DELETE' });
      return true;
    } catch (error: any) {
      logger.error(`[IntegrationService] Error deleting ${provider}:`, error);
      throw new Error(error.message || 'Erreur lors de la suppression');
    }
  }

  /**
   * Teste la connexion d'une intégration
   */
  async test(provider: IntegrationProvider): Promise<IntegrationTestResult> {
    try {
      return await fetchApi(`${this.baseUrl}/${provider}/test`, { method: 'POST' });
    } catch (error: any) {
      logger.error(`[IntegrationService] Error testing ${provider}:`, error);
      return {
        success: false,
        error: error.message || 'Erreur lors du test'
      };
    }
  }

  /**
   * Récupère le statut détaillé de toutes les intégrations (inclut env vars)
   * Appelle le nouvel endpoint /status
   */
  async getDetailedStatus(): Promise<IntegrationStatusDetail[]> {
    try {
      return await fetchApi(`${this.baseUrl}/status`);
    } catch (error: any) {
      logger.error('[IntegrationService] Error getting detailed status:', error);
      return [];
    }
  }

  /**
   * Récupère le statut rapide de toutes les intégrations
   * Retourne un objet avec provider => { configured, active, lastTest }
   */
  async getStatus(): Promise<Record<string, { configured: boolean; active: boolean; lastTestSuccess: boolean | null; source?: string }>> {
    try {
      const statusList = await this.getDetailedStatus();
      const status: Record<string, { configured: boolean; active: boolean; lastTestSuccess: boolean | null; source?: string }> = {};
      
      for (const item of statusList) {
        status[item.provider] = {
          configured: item.configured,
          active: item.active,
          lastTestSuccess: item.lastTestSuccess,
          source: item.source
        };
      }
      
      return status;
    } catch (error) {
      logger.error('[IntegrationService] Error getting status:', error);
      return {};
    }
  }

  // ========== Méthodes spécifiques par provider ==========

  /**
   * Configure Resend
   */
  async configureResend(apiKey: string, defaultFrom?: string): Promise<IntegrationSaveResult> {
    return this.save('resend', { 
      apiKey,
      defaultFrom: defaultFrom || 'TrackYu GPS <noreply@trackyugps.com>'
    });
  }

  /**
   * Vérifie si Resend est configuré
   */
  async isResendConfigured(): Promise<boolean> {
    return this.isConfigured('resend');
  }

  /**
   * Teste Resend
   */
  async testResend(): Promise<IntegrationTestResult> {
    return this.test('resend');
  }

  /**
   * Configure Telegram
   */
  async configureTelegram(botToken: string, defaultChatId?: string): Promise<IntegrationSaveResult> {
    return this.save('telegram', {
      botToken,
      ...(defaultChatId && { defaultChatId })
    });
  }

  /**
   * Configure Orange SMS
   */
  async configureOrangeSms(clientId: string, clientSecret: string): Promise<IntegrationSaveResult> {
    return this.save('orange_sms', { clientId, clientSecret });
  }

  /**
   * Récupère le solde Orange SMS (via backend pour éviter CORS)
   */
  async getOrangeSmsBalance(): Promise<{ balance: number; senderName: string; success: boolean }> {
    try {
      return await fetchApi(`${this.baseUrl}/orange_sms/balance`);
    } catch (error: any) {
      logger.error('[IntegrationService] Error getting Orange SMS balance:', error);
      throw new Error(error.message || 'Erreur lors de la récupération du solde');
    }
  }

  /**
   * Configure Wave
   */
  async configureWave(merchantId: string, paymentLinkBase?: string): Promise<IntegrationSaveResult> {
    return this.save('wave', {
      merchantId,
      paymentLinkBase: paymentLinkBase || 'https://pay.wave.com'
    });
  }

  /**
   * Configure WhatsApp
   */
  async configureWhatsapp(phoneNumberId: string, accessToken: string, businessId?: string): Promise<IntegrationSaveResult> {
    return this.save('whatsapp', {
      phoneNumberId,
      accessToken,
      ...(businessId && { businessId })
    });
  }
}

// Export singleton
export const integrationService = new IntegrationService();
export default integrationService;
