/**
 * Service Frontend pour le module de Recouvrement (Recovery/Dunning)
 * Se connecte aux endpoints /api/recovery du backend
 */

import { api } from '../../../services/api';

// ============ TYPES ============

export interface RecoveryStats {
  period: {
    start: string;
    end: string;
  };
  overview: {
    totalOverdue: number;
    totalAmount: number;
    averageDaysOverdue: number;
    oldestOverdue: number;
  };
  byAge: {
    '0-7': { count: number; amount: number };
    '8-15': { count: number; amount: number };
    '16-30': { count: number; amount: number };
    '31-60': { count: number; amount: number };
    '60+': { count: number; amount: number };
  };
  actions: {
    emailsSent: number;
    smsSent: number;
    callsScheduled: number;
    responseRate: number;
  };
  recovery: {
    recovered: number;
    recoveryRate: number;
    averageRecoveryDays: number;
  };
}

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  status: string;
  lastReminderAt: string | null;
  reminderCount: number;
  dunningLevel: string;
}

export interface DunningAction {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  actionType: 'EMAIL' | 'SMS' | 'CALL' | 'LETTER';
  level: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  messageId: string | null;
  scheduledAt: string;
  executedAt: string | null;
  response: string | null;
  notes: string | null;
}

export interface InvoiceDunningHistory {
  invoice: {
    id: string;
    invoiceNumber: string;
    clientName: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
    status: string;
  };
  dunningSequence: {
    id: string;
    name: string;
    currentLevel: number;
  } | null;
  actions: Array<{
    id: string;
    actionType: string;
    level: string;
    status: string;
    executedAt: string;
    daysAfterDue: number;
  }>;
  nextAction: {
    level: string;
    actionType: string;
    scheduledAt: string;
    daysAfterDue: number;
  } | null;
}

export interface SendReminderRequest {
  channel: 'EMAIL' | 'SMS' | 'CALL';
  customMessage?: string;
  scheduleCall?: boolean;
}

export interface MarkPaidRequest {
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface PartialPaymentRequest {
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ============ API FUNCTIONS ============

const API_BASE = '/api/recovery';

/**
 * Récupérer les statistiques de recouvrement
 */
export const getRecoveryStats = async (days: number = 30): Promise<RecoveryStats> => {
  const response = await api.get(`${API_BASE}/stats`, {
    params: { days }
  });
  return response.data;
};

/**
 * Récupérer la liste des factures en retard
 */
export const getOverdueInvoices = async (params: {
  limit?: number;
  offset?: number;
  minDays?: number;
  maxDays?: number;
  clientId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<PaginatedResponse<OverdueInvoice> & { summary: { totalAmount: number; totalRemaining: number } }> => {
  const response = await api.get(`${API_BASE}/overdue-invoices`, { params });
  return response.data;
};

/**
 * Récupérer l'historique des actions de relance
 */
export const getDunningActions = async (params: {
  limit?: number;
  offset?: number;
  invoiceId?: string;
  actionType?: 'EMAIL' | 'SMS' | 'CALL' | 'LETTER';
  status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  startDate?: string;
  endDate?: string;
} = {}): Promise<PaginatedResponse<DunningAction>> => {
  const response = await api.get(`${API_BASE}/dunning-actions`, { params });
  return response.data;
};

/**
 * Récupérer l'historique de relance d'une facture
 */
export const getInvoiceDunningHistory = async (invoiceId: string): Promise<InvoiceDunningHistory> => {
  const response = await api.get(`${API_BASE}/invoices/${invoiceId}/history`);
  return response.data;
};

/**
 * Envoyer une relance manuelle
 */
export const sendReminder = async (
  invoiceId: string, 
  data: SendReminderRequest
): Promise<{ success: boolean; action: DunningAction }> => {
  const response = await api.post(`${API_BASE}/invoices/${invoiceId}/remind`, data);
  return response.data;
};

/**
 * Marquer une facture comme payée
 */
export const markInvoicePaid = async (
  invoiceId: string,
  data: MarkPaidRequest = {}
): Promise<{ success: boolean; invoice: any }> => {
  const response = await api.post(`${API_BASE}/invoices/${invoiceId}/mark-paid`, data);
  return response.data;
};

/**
 * Enregistrer un paiement partiel
 */
export const recordPartialPayment = async (
  invoiceId: string,
  data: PartialPaymentRequest
): Promise<{ success: boolean; invoice: any; payment: any }> => {
  const response = await api.post(`${API_BASE}/invoices/${invoiceId}/partial-payment`, data);
  return response.data;
};

/**
 * Lancer manuellement le processus de recouvrement (Admin)
 */
export const runRecoveryProcess = async (): Promise<{
  success: boolean;
  processed: {
    invoicesChecked: number;
    remindersSent: number;
    emailsSent: number;
    smsSent: number;
    callsScheduled: number;
    errors: number;
  };
  duration: string;
}> => {
  const response = await api.post(`${API_BASE}/run`);
  return response.data;
};

// ============ REACT QUERY HOOKS ============

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const RECOVERY_QUERY_KEYS = {
  stats: (days: number) => ['recovery', 'stats', days] as const,
  overdueInvoices: (params: any) => ['recovery', 'overdue', params] as const,
  dunningActions: (params: any) => ['recovery', 'actions', params] as const,
  invoiceHistory: (id: string) => ['recovery', 'invoice', id, 'history'] as const,
};

/**
 * Hook pour les statistiques de recouvrement
 */
export const useRecoveryStats = (days: number = 30) => {
  return useQuery({
    queryKey: RECOVERY_QUERY_KEYS.stats(days),
    queryFn: () => getRecoveryStats(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook pour les factures en retard
 */
export const useOverdueInvoices = (params: Parameters<typeof getOverdueInvoices>[0] = {}) => {
  return useQuery({
    queryKey: RECOVERY_QUERY_KEYS.overdueInvoices(params),
    queryFn: () => getOverdueInvoices(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook pour les actions de relance
 */
export const useDunningActions = (params: Parameters<typeof getDunningActions>[0] = {}) => {
  return useQuery({
    queryKey: RECOVERY_QUERY_KEYS.dunningActions(params),
    queryFn: () => getDunningActions(params),
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook pour l'historique d'une facture
 */
export const useInvoiceDunningHistory = (invoiceId: string) => {
  return useQuery({
    queryKey: RECOVERY_QUERY_KEYS.invoiceHistory(invoiceId),
    queryFn: () => getInvoiceDunningHistory(invoiceId),
    enabled: !!invoiceId,
  });
};

/**
 * Mutation pour envoyer une relance
 */
export const useSendReminder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: SendReminderRequest }) =>
      sendReminder(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery'] });
    },
  });
};

/**
 * Mutation pour marquer une facture comme payée
 */
export const useMarkInvoicePaid = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data?: MarkPaidRequest }) =>
      markInvoicePaid(invoiceId, data || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

/**
 * Mutation pour paiement partiel
 */
export const useRecordPartialPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: PartialPaymentRequest }) =>
      recordPartialPayment(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

/**
 * Mutation pour lancer le processus de recouvrement
 */
export const useRunRecoveryProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: runRecoveryProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery'] });
    },
  });
};
