/**
 * TrackYu Mobile — Couleurs et libellés de statut pour le portail client
 * Source unique de vérité — importé par tous les écrans portal.
 */

// ── Factures ──────────────────────────────────────────────────────────────────

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  PAID: '#22C55E',
  SENT: '#3B82F6',
  PARTIALLY_PAID: '#F59E0B',
  OVERDUE: '#EF4444',
  DRAFT: '#6B7280',
  CANCELLED: '#6B7280',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
  PARTIALLY_PAID: 'Part. payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
};

// ── Contrats ──────────────────────────────────────────────────────────────────

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22C55E',
  EXPIRED: '#6B7280',
  TERMINATED: '#EF4444',
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  EXPIRED: 'Expiré',
  TERMINATED: 'Résilié',
};

// ── Abonnements ───────────────────────────────────────────────────────────────

export const SUBSCRIPTION_STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22C55E',
  INACTIVE: '#6B7280',
  PENDING: '#F59E0B',
  CANCELLED: '#EF4444',
  SUSPENDED: '#F97316',
  EXPIRED: '#6B7280',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  PENDING: 'En attente',
  CANCELLED: 'Annulé',
  SUSPENDED: 'Suspendu',
  EXPIRED: 'Expiré',
};

// ── Tickets ───────────────────────────────────────────────────────────────────

export const TICKET_STATUS_COLORS: Record<string, string> = {
  OPEN: '#3B82F6',
  IN_PROGRESS: '#F59E0B',
  WAITING_CLIENT: '#8B5CF6',
  RESOLVED: '#22C55E',
  CLOSED: '#6B7280',
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  WAITING_CLIENT: 'En attente',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
};

export const TICKET_PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6B7280',
  MEDIUM: '#3B82F6',
  HIGH: '#F59E0B',
  CRITICAL: '#EF4444',
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
  CRITICAL: 'Critique',
};

// ── Priorités (formulaire nouveau ticket) ────────────────────────────────────

export const NEW_TICKET_PRIORITIES: { value: 'LOW' | 'MEDIUM' | 'HIGH'; label: string; color: string }[] = [
  { value: 'LOW', label: 'Faible', color: TICKET_PRIORITY_COLORS.LOW },
  { value: 'MEDIUM', label: 'Moyen', color: TICKET_PRIORITY_COLORS.MEDIUM },
  { value: 'HIGH', label: 'Élevé', color: TICKET_PRIORITY_COLORS.HIGH },
];
