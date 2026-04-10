/**
 * Service Frontend pour la gestion des numéros de documents
 * Se connecte aux endpoints /api/numbering du backend
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// ============ TYPES ============

export type NumberingModule = 
  | 'invoice' 
  | 'quote' 
  | 'receipt'
  | 'credit_note'
  | 'purchase_order'
  | 'contract' 
  | 'intervention' 
  | 'ticket'
  | 'device'
  | 'sim'
  | 'client'
  | 'lead'
  | 'prospect'
  | 'supplier'
  | 'reseller'
  | 'technician'
  | 'product'
  | 'service'
  | 'task'
  | 'journal_entry'
  | 'transfer'
  | 'payment'
  | 'expense'
  | 'vehicle'
  | 'driver'
  | 'alert';

export interface NumberingCounter {
  id: string;
  tenantId: string;
  module: string;
  prefix: string;
  separator: string;
  currentNumber: number;
  padding: number;
  includeYear: boolean;
  includeMonth: boolean;
  includeSlug: boolean;
  resetFrequency: 'never' | 'yearly' | 'monthly';
  lastResetDate: string | null;
  lastNumberDate: string | null;
}

// ============ API FUNCTIONS ============

const getAuthHeaders = () => {
  const token = localStorage.getItem('fleet_token');
  const impersonateTenantId = localStorage.getItem('impersonate_tenant_id');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  
  // Add impersonation header if in impersonation mode
  if (impersonateTenantId) {
    headers['X-Impersonate-Tenant'] = impersonateTenantId;
  }
  
  return headers;
};

/**
 * Récupère le prochain numéro pour un module (sans incrémenter)
 */
export const previewNextNumber = async (module: NumberingModule, tenantId?: string): Promise<string> => {
  const headers = getAuthHeaders();
  if (tenantId) {
    headers['X-Impersonate-Tenant'] = tenantId;
  }
  const response = await fetch(`${API_URL}/numbering/preview/${module}`, { headers });

  if (!response.ok) {
    throw new Error('Failed to preview number');
  }

  const data = await response.json();
  return data.number;
};

/**
 * Génère le prochain numéro pour un module (l'incrémente)
 * @param module - le module de numérotation
 * @param tenantId - (optionnel) tenant à impersonifier pour la numérotation (revendeurs)
 */
export const getNextNumber = async (module: NumberingModule, tenantId?: string): Promise<string> => {
  const headers = getAuthHeaders();
  if (tenantId) {
    headers['X-Impersonate-Tenant'] = tenantId;
  }
  const response = await fetch(`${API_URL}/numbering/next/${module}`, { headers });

  if (!response.ok) {
    throw new Error('Failed to get next number');
  }

  const data = await response.json();
  return data.number;
};

/**
 * Récupère tous les compteurs de numérotation
 */
export const getNumberingCounters = async (): Promise<NumberingCounter[]> => {
  const response = await fetch(`${API_URL}/numbering/counters`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch counters');
  }
  
  return response.json();
};

/**
 * Met à jour un compteur
 */
export const updateCounter = async (
  module: string,
  updates: Partial<Omit<NumberingCounter, 'id' | 'tenantId' | 'module' | 'lastResetDate' | 'lastNumberDate'>>
): Promise<NumberingCounter> => {
  const response = await fetch(`${API_URL}/numbering/counters/${module}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update counter');
  }
  
  return response.json();
};

/**
 * Réinitialise un compteur
 */
export const resetCounter = async (module: string): Promise<void> => {
  const response = await fetch(`${API_URL}/numbering/counters/${module}/reset`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to reset counter');
  }
};

/**
 * Génère un lot de numéros
 */
export const getBatchNumbers = async (module: NumberingModule, count: number): Promise<string[]> => {
  const response = await fetch(`${API_URL}/numbering/batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ module, count }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate batch numbers');
  }
  
  const data = await response.json();
  return data.numbers;
};

// ============ REACT QUERY HOOKS ============

export const NUMBERING_QUERY_KEYS = {
  counters: ['numbering', 'counters'] as const,
  preview: (module: string, tenantId?: string) => ['numbering', 'preview', module, tenantId ?? ''] as const,
};

/**
 * Hook pour prévisualiser le prochain numéro (tenant-aware)
 */
export const usePreviewNumber = (module: NumberingModule, enabled = true, tenantId?: string) => {
  return useQuery({
    queryKey: NUMBERING_QUERY_KEYS.preview(module, tenantId),
    queryFn: () => previewNextNumber(module, tenantId),
    enabled,
    staleTime: 30 * 1000, // 30 secondes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook pour récupérer tous les compteurs
 */
export const useNumberingCounters = () => {
  return useQuery({
    queryKey: NUMBERING_QUERY_KEYS.counters,
    queryFn: getNumberingCounters,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export interface GetNextNumberVars {
  module: NumberingModule;
  tenantId?: string;
}

/**
 * Mutation pour générer le prochain numéro
 */
export const useGetNextNumber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ module, tenantId }: GetNextNumberVars) => getNextNumber(module, tenantId),
    onSuccess: (_, { module }) => {
      // Invalider la preview et les counters
      queryClient.invalidateQueries({ queryKey: NUMBERING_QUERY_KEYS.preview(module) });
      queryClient.invalidateQueries({ queryKey: NUMBERING_QUERY_KEYS.counters });
    },
  });
};

/**
 * Mutation pour mettre à jour un compteur
 */
export const useUpdateCounter = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ module, updates }: { module: string; updates: Parameters<typeof updateCounter>[1] }) =>
      updateCounter(module, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NUMBERING_QUERY_KEYS.counters });
    },
  });
};

/**
 * Mutation pour réinitialiser un compteur
 */
export const useResetCounter = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: resetCounter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NUMBERING_QUERY_KEYS.counters });
    },
  });
};

// ============ HELPER FUNCTIONS ============

/**
 * Mapping module → label français
 */
export const MODULE_LABELS: Record<NumberingModule, string> = {
  invoice: 'Factures',
  quote: 'Devis',
  receipt: 'Reçus',
  credit_note: 'Avoirs',
  purchase_order: 'Bons de commande',
  contract: 'Contrats',
  intervention: 'Interventions',
  ticket: 'Tickets',
  device: 'Boîtiers',
  sim: 'Cartes SIM',
  client: 'Clients',
  lead: 'Leads',
  prospect: 'Prospects',
  supplier: 'Fournisseurs',
  reseller: 'Revendeurs',
  technician: 'Techniciens',
  product: 'Produits',
  service: 'Services',
  task: 'Tâches',
  journal_entry: 'Écritures Journal',
  transfer: 'Virements',
  payment: 'Paiements',
  expense: 'Dépenses',
  vehicle: 'Véhicules',
  driver: 'Chauffeurs',
  alert: 'Alertes',
};

/**
 * Génère un aperçu de numéro côté client (pour affichage instantané)
 */
export const generatePreview = (counter: NumberingCounter, tenantSlug = 'XXX'): string => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const num = String(counter.currentNumber).padStart(counter.padding, '0');
  
  let preview = counter.prefix + counter.separator;
  
  // Slug takes priority over year
  if (counter.includeSlug) {
    preview += tenantSlug.toUpperCase() + counter.separator;
  } else if (counter.includeYear) {
    preview += year + counter.separator;
  }
  
  if (counter.includeMonth) preview += month + counter.separator;
  preview += num;

  return preview;
};

// ============ ORG TAX RATE ============

/**
 * Hook pour récupérer le taux de TVA par défaut du tenant courant.
 * Source unique de vérité : settings.taxRate dans la table tenants.
 */
export const useOrgTaxRate = (): number => {
  const { data } = useQuery({
    queryKey: ['tenant-current-settings'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tenants/current`, { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Priorité : default_tax_rate exposé par l'API, puis fallback settings camelCase/snake_case
  const raw = data?.default_tax_rate ?? data?.settings?.taxRate ?? data?.settings?.tax_rate ?? data?.tax_rate ?? 0;
  return typeof raw === 'number' ? raw : parseFloat(raw) || 0;
};
