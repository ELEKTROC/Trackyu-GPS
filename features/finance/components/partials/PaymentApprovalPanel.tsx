/**
 * Composant de gestion des approbations de paiements
 * Sprint 2 - Sécurité Finance - Double validation
 */

import React, { useState, useMemo } from 'react';
import type { Payment } from '../../../../types';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { TOAST } from '../../../../constants/toastMessages';
import { mapError } from '../../../../utils/errorMapper';
import { useCurrency } from '../../../../hooks/useCurrency';
import {
  getPendingApprovals,
  approvePayment,
  rejectPayment,
  canApprove,
  formatPaymentStatus,
  buildApprovalHistory,
  getApprovalConfig,
} from '../../../../services/paymentApprovalService';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';

interface PaymentApprovalPanelProps {
  payments: Payment[];
  onPaymentUpdated: (payment: Payment) => void;
}

export const PaymentApprovalPanel: React.FC<PaymentApprovalPanelProps> = ({ payments, onPaymentUpdated }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();

  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const tenantId = user?.tenantId || 'default';
  const config = getApprovalConfig(tenantId);

  // Paiements en attente d'approbation
  const pendingPayments = useMemo(() => getPendingApprovals(payments, tenantId), [payments, tenantId]);

  const handleApprove = (payment: Payment) => {
    if (!user) return;

    const check = canApprove(payment, user.id, user.permissions || []);
    if (!check.allowed) {
      showToast(mapError(check.reason || 'Approbation non autorisée'), 'error');
      return;
    }

    const result = approvePayment(payment, user.id, user.name);
    if (result.success && result.payment) {
      onPaymentUpdated(result.payment);
      showToast(TOAST.CRUD.SAVED('Approbation'), 'success');
    } else {
      showToast(mapError(result.message, 'paiement'), 'error');
    }
  };

  const handleReject = (paymentId: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment || !user) return;

    const result = rejectPayment(payment, user.id, user.name, rejectReason);
    if (result.success && result.payment) {
      onPaymentUpdated(result.payment);
      showToast(TOAST.FINANCE.STATUS_CHANGED('rejeté'), 'warning');
      setShowRejectModal(null);
      setRejectReason('');
    } else {
      showToast(mapError(result.message, 'paiement'), 'error');
    }
  };

  const toggleExpand = (paymentId: string) => {
    setExpandedPayment(expandedPayment === paymentId ? null : paymentId);
  };

  if (pendingPayments.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="font-bold text-green-700 dark:text-green-400">Aucun paiement en attente</h3>
        <p className="text-sm text-green-600 dark:text-green-500 mt-1">Tous les paiements ont été traités</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">Paiements en attente d'approbation</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {pendingPayments.length} paiement(s) • Seuil: {formatPrice(config.threshold)}
            </p>
          </div>
        </div>
        <span className="bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full">
          {pendingPayments.length}
        </span>
      </div>

      {/* Liste des paiements */}
      <div className="space-y-3">
        {pendingPayments.map((payment) => {
          const status = formatPaymentStatus(payment.status);
          const history = buildApprovalHistory(payment);
          const isExpanded = expandedPayment === payment.id;
          const userCanApprove = user ? canApprove(payment, user.id, user.permissions || []).allowed : false;

          return (
            <div
              key={payment.id}
              className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm"
            >
              {/* En-tête du paiement */}
              <div
                className="p-4 cursor-pointer hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/50 transition-colors"
                onClick={() => toggleExpand(payment.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.color}`}>
                      <span className="text-lg">{status.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)]">{formatPrice(payment.amount)}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {payment.createdByName || 'Inconnu'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(payment.date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {payment.reference || 'Sans ref.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {userCanApprove && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(payment);
                          }}
                          className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"
                          title="Approuver"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRejectModal(payment.id);
                          }}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                          title="Rejeter"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {!userCanApprove && payment.createdBy === user?.id && (
                      <span className="text-xs text-orange-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Auto-approbation interdite
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Détails expandables */}
              {isExpanded && (
                <div className="border-t border-[var(--border)] p-4 bg-[var(--bg-elevated)]/50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="section-title">Méthode</label>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{payment.method}</p>
                    </div>
                    <div>
                      <label className="section-title">Type</label>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {payment.type === 'INCOMING' ? '↓ Entrant' : '↑ Sortant'}
                      </p>
                    </div>
                  </div>

                  {/* Historique d'approbation */}
                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2 block">
                      <Shield className="w-3 h-3 inline mr-1" />
                      Historique d'approbation
                    </label>
                    <div className="space-y-2">
                      {history.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              entry.action === 'APPROVED'
                                ? 'bg-green-500'
                                : entry.action === 'REJECTED'
                                  ? 'bg-red-500'
                                  : 'bg-[var(--primary-dim)]0'
                            }`}
                          />
                          <span className="text-[var(--text-secondary)]">
                            {new Date(entry.timestamp).toLocaleString('fr-FR')}
                          </span>
                          <span className="font-medium text-[var(--text-primary)]">{entry.userName}</span>
                          <span className="text-[var(--text-secondary)]">
                            {entry.action === 'CREATED' && 'a créé le paiement'}
                            {entry.action === 'SUBMITTED' && 'a soumis pour approbation'}
                            {entry.action === 'APPROVED' && 'a approuvé'}
                            {entry.action === 'REJECTED' && 'a rejeté'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {payment.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <label className="text-xs font-bold text-yellow-600 uppercase">Notes</label>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">{payment.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de rejet */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-elevated)] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Rejeter le paiement
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                Raison du rejet (obligatoire)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez pourquoi ce paiement est rejeté..."
                className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm min-h-[100px]"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Minimum 10 caractères ({rejectReason.length}/10)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
              >
                Annuler
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={rejectReason.length < 10}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-bold"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentApprovalPanel;
