/**
 * Service pour la gestion sécurisée des credentials d'intégration
 * Communique avec le backend qui stocke les secrets de manière chiffrée
 */

import { api } from './api';

export type IntegrationProvider = 
  | 'telegram'
  | 'resend'
  | 'wave'
  | 'whatsapp'
  | 'orange_sms';

export interface IntegrationCredential {
  id: string;
  provider: IntegrationProvider;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_success: boolean | null;
  config_summary: Record<string, string>; // Valeurs masquées
}

export interface IntegrationSaveResult {
  success: boolean;
  message: string;
  integration: {
    id: string;
    provider: string;
    is_active: boolean;
  };
}

export interface IntegrationTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Récupère toutes les intégrations avec leurs statuts
 * Les secrets sont masqués côté serveur
 */
export const getIntegrations = async (): Promise<IntegrationCredential[]> => {
  const response = await api.get('/integration-credentials');
  return response.data;
};

/**
 * Sauvegarde les credentials d'une intégration
 * Les secrets sont chiffrés côté serveur
 */
export const saveCredentials = async (
  provider: IntegrationProvider,
  credentials: Record<string, string>
): Promise<IntegrationSaveResult> => {
  const response = await api.post(`/integration-credentials/${provider}`, { credentials });
  return response.data;
};

/**
 * Active ou désactive une intégration
 */
export const toggleIntegration = async (
  provider: IntegrationProvider,
  isActive: boolean
): Promise<{ id: string; provider: string; is_active: boolean }> => {
  const response = await api.patch(`/integration-credentials/${provider}/toggle`, { is_active: isActive });
  return response.data;
};

/**
 * Supprime les credentials d'une intégration
 */
export const deleteCredentials = async (provider: IntegrationProvider): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/integration-credentials/${provider}`);
  return response.data;
};

/**
 * Teste la connexion d'une intégration
 * Le test utilise les credentials stockés côté serveur
 */
export const testIntegration = async (
  provider: IntegrationProvider,
  testData?: Record<string, unknown>
): Promise<IntegrationTestResult> => {
  const response = await api.post(`/integration-credentials/${provider}/test`, { testData });
  return response.data;
};

// React Query keys
export const integrationCredentialsKeys = {
  all: ['integration-credentials'] as const,
  byProvider: (provider: IntegrationProvider) => ['integration-credentials', provider] as const,
};

export default {
  getIntegrations,
  saveCredentials,
  toggleIntegration,
  deleteCredentials,
  testIntegration,
};
