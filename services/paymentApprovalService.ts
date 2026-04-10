/**
 * Service de double validation des paiements
 * Sprint 2 - Sécurité Finance
 */

import { Payment } from '../types';

// Configuration par défaut
const DEFAULT_APPROVAL_THRESHOLD = 500000; // 500,000 XOF

export interface PaymentApprovalConfig {
  enabled: boolean;
  threshold: number; // Montant au-delà duquel l'approbation est requise
  allowSelfApproval: boolean; // Permet au créateur d'approuver son propre paiement
}

export interface ApprovalResult {
  success: boolean;
  message: string;
  payment?: Payment;
}

// Configuration par tenant (simulé - à connecter au backend)
const tenantConfigs: Map<string, PaymentApprovalConfig> = new Map();

/**
 * Récupère la configuration d'approbation pour un tenant
 */
export const getApprovalConfig = (tenantId: string): PaymentApprovalConfig => {
  return tenantConfigs.get(tenantId) || {
    enabled: true,
    threshold: DEFAULT_APPROVAL_THRESHOLD,
    allowSelfApproval: false,
  };
};

/**
 * Met à jour la configuration d'approbation
 */
export const setApprovalConfig = (tenantId: string, config: Partial<PaymentApprovalConfig>): void => {
  const current = getApprovalConfig(tenantId);
  tenantConfigs.set(tenantId, { ...current, ...config });
};

/**
 * Vérifie si un paiement nécessite une approbation
 */
export const requiresApproval = (payment: Partial<Payment>, tenantId: string): boolean => {
  const config = getApprovalConfig(tenantId);
  
  if (!config.enabled) return false;
  
  const amount = payment.amount || 0;
  return amount >= config.threshold;
};

/**
 * Prépare un paiement pour soumission (définit le statut approprié)
 */
export const preparePaymentForSubmission = (
  payment: Partial<Payment>,
  tenantId: string,
  userId: string,
  userName: string
): Partial<Payment> => {
  const needsApproval = requiresApproval(payment, tenantId);
  const config = getApprovalConfig(tenantId);
  
  return {
    ...payment,
    status: needsApproval ? 'PENDING_APPROVAL' : 'APPROVED',
    requiresApproval: needsApproval,
    approvalThreshold: config.threshold,
    createdBy: userId,
    createdByName: userName,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Approuve un paiement
 */
export const approvePayment = (
  payment: Payment,
  approverId: string,
  approverName: string
): ApprovalResult => {
  const config = getApprovalConfig(payment.tenantId);
  
  // Vérifier si l'approbation propre est autorisée
  if (!config.allowSelfApproval && payment.createdBy === approverId) {
    return {
      success: false,
      message: 'Vous ne pouvez pas approuver votre propre paiement',
    };
  }
  
  // Vérifier le statut
  if (payment.status !== 'PENDING_APPROVAL') {
    return {
      success: false,
      message: `Le paiement n'est pas en attente d'approbation (statut: ${payment.status})`,
    };
  }
  
  return {
    success: true,
    message: 'Paiement approuvé avec succès',
    payment: {
      ...payment,
      status: 'APPROVED',
      approvedBy: approverId,
      approvedByName: approverName,
      approvedAt: new Date().toISOString(),
    },
  };
};

/**
 * Rejette un paiement
 */
export const rejectPayment = (
  payment: Payment,
  rejecterId: string,
  rejecterName: string,
  reason: string
): ApprovalResult => {
  if (payment.status !== 'PENDING_APPROVAL') {
    return {
      success: false,
      message: `Le paiement n'est pas en attente d'approbation (statut: ${payment.status})`,
    };
  }
  
  if (!reason || reason.trim().length < 10) {
    return {
      success: false,
      message: 'La raison du rejet doit contenir au moins 10 caractères',
    };
  }
  
  return {
    success: true,
    message: 'Paiement rejeté',
    payment: {
      ...payment,
      status: 'REJECTED',
      rejectedBy: rejecterId,
      rejectedByName: rejecterName,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
    },
  };
};

/**
 * Obtient les paiements en attente d'approbation
 */
export const getPendingApprovals = (payments: Payment[], tenantId: string): Payment[] => {
  return payments.filter(p => 
    p.tenantId === tenantId && 
    p.status === 'PENDING_APPROVAL'
  );
};

/**
 * Vérifie si un utilisateur peut approuver un paiement
 */
export const canApprove = (
  payment: Payment,
  userId: string,
  userPermissions: string[]
): { allowed: boolean; reason?: string } => {
  // Vérifier la permission
  if (!userPermissions.includes('APPROVE_PAYMENTS')) {
    return { allowed: false, reason: 'Permission APPROVE_PAYMENTS requise' };
  }
  
  // Vérifier le statut
  if (payment.status !== 'PENDING_APPROVAL') {
    return { allowed: false, reason: 'Paiement non en attente d\'approbation' };
  }
  
  // Vérifier l'auto-approbation
  const config = getApprovalConfig(payment.tenantId);
  if (!config.allowSelfApproval && payment.createdBy === userId) {
    return { allowed: false, reason: 'Auto-approbation non autorisée' };
  }
  
  return { allowed: true };
};

/**
 * Formate le statut pour affichage
 */
export const formatPaymentStatus = (status: Payment['status']): { label: string; color: string; icon: string } => {
  switch (status) {
    case 'DRAFT':
      return { label: 'Brouillon', color: 'text-slate-500 bg-slate-100', icon: '📝' };
    case 'PENDING_APPROVAL':
      return { label: 'En attente', color: 'text-orange-600 bg-orange-100', icon: '⏳' };
    case 'APPROVED':
      return { label: 'Approuvé', color: 'text-green-600 bg-green-100', icon: '✅' };
    case 'REJECTED':
      return { label: 'Rejeté', color: 'text-red-600 bg-red-100', icon: '❌' };
    case 'COMPLETED':
      return { label: 'Terminé', color: 'text-blue-600 bg-blue-100', icon: '✔️' };
    case 'FAILED':
      return { label: 'Échoué', color: 'text-red-600 bg-red-100', icon: '⚠️' };
    default:
      return { label: status, color: 'text-slate-500 bg-slate-100', icon: '❓' };
  }
};

/**
 * Historique d'approbation pour audit trail
 */
export interface ApprovalHistoryEntry {
  timestamp: string;
  action: 'CREATED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  userId: string;
  userName: string;
  details?: string;
}

export const buildApprovalHistory = (payment: Payment): ApprovalHistoryEntry[] => {
  const history: ApprovalHistoryEntry[] = [];
  
  // Création
  if (payment.createdAt) {
    history.push({
      timestamp: payment.createdAt,
      action: 'CREATED',
      userId: payment.createdBy || 'unknown',
      userName: payment.createdByName || 'Utilisateur inconnu',
    });
  }
  
  // Soumission pour approbation
  if (payment.requiresApproval && payment.status !== 'DRAFT') {
    history.push({
      timestamp: payment.createdAt,
      action: 'SUBMITTED',
      userId: payment.createdBy || 'unknown',
      userName: payment.createdByName || 'Utilisateur inconnu',
      details: `Montant: ${payment.amount} XOF (seuil: ${payment.approvalThreshold} XOF)`,
    });
  }
  
  // Approbation
  if (payment.approvedAt) {
    history.push({
      timestamp: payment.approvedAt,
      action: 'APPROVED',
      userId: payment.approvedBy || 'unknown',
      userName: payment.approvedByName || 'Utilisateur inconnu',
    });
  }
  
  // Rejet
  if (payment.rejectedAt) {
    history.push({
      timestamp: payment.rejectedAt,
      action: 'REJECTED',
      userId: payment.rejectedBy || 'unknown',
      userName: payment.rejectedByName || 'Utilisateur inconnu',
      details: payment.rejectionReason,
    });
  }
  
  return history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};
