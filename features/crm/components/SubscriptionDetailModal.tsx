import React, { useState, useMemo } from 'react';
import {
  X,
  Truck,
  FileText,
  Calendar,
  RefreshCw,
  CreditCard,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Edit2,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { useDataContext } from '../../../contexts/DataContext';
import { useCurrency } from '../../../hooks/useCurrency';
import { View } from '../../../types';

const BILLING_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'mensuel',
  QUARTERLY: 'trimestriel',
  SEMESTRIAL: 'semestriel',
  ANNUAL: 'annuel',
};

interface SubscriptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionNumber: string; // ABO-XXXXXX (vehicle.id)
  vehicleId: string;
  contractId: string;
  /** Subscription-specific data (from the real subscriptions table) */
  subscriptionId: string;
  monthlyFee: number;
  billingCycle: string;
  subscriptionStatus: string;
  autoRenew: boolean;
  startDate: string;
  endDate?: string | null;
  nextBillingDate?: string | null;
  onNavigate?: (view: View, params?: Record<string, unknown>) => void;
  onEdit?: () => void;
  onSuspend?: (id: string) => Promise<void>;
  onRésilier?: (id: string, reason?: string) => Promise<void>;
}

// Billing cycle translations
// Status labels
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  PENDING: { label: 'En attente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  EXPIRED: { label: 'Expiré', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  CANCELLED: {
    label: 'Résilié',
    color: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] bg-[var(--bg-surface)]/30 dark:text-[var(--text-muted)]',
  },
  CANCELED: {
    label: 'Résilié',
    color: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] bg-[var(--bg-surface)]/30 dark:text-[var(--text-muted)]',
  },
  SUSPENDED: { label: 'Suspendu', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  TERMINATED: {
    label: 'Terminé',
    color: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] bg-[var(--bg-surface)]/30 dark:text-[var(--text-muted)]',
  },
  DRAFT: {
    label: 'Brouillon',
    color: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] bg-[var(--bg-surface)]/30 dark:text-[var(--text-muted)]',
  },
};

export const SubscriptionDetailModal: React.FC<SubscriptionDetailModalProps> = ({
  isOpen,
  onClose,
  subscriptionNumber,
  vehicleId,
  contractId,
  subscriptionId,
  monthlyFee,
  billingCycle,
  subscriptionStatus,
  autoRenew,
  startDate: subStartDate,
  endDate: subEndDate,
  nextBillingDate: subNextBillingDate,
  onNavigate,
  onEdit,
  onSuspend,
  onRésilier,
}) => {
  const { vehicles, contracts, invoices, tiers, stock } = useDataContext();
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'invoices'>('details');
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const [confirmRésilier, setConfirmRésilier] = useState(false);
  const [résilierReason, setRésilierReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Get the vehicle, contract, and related data
  const vehicle = useMemo(() => vehicles.find((v) => v.id === vehicleId), [vehicles, vehicleId]);
  const contract = useMemo(() => contracts.find((c) => c.id === contractId), [contracts, contractId]);
  const client = useMemo(() => (contract ? tiers.find((t) => t.id === contract.clientId) : null), [tiers, contract]);
  const device = useMemo(() => (vehicle?.imei ? stock.find((d) => d.imei === vehicle.imei) : null), [stock, vehicle]);

  // Factures liées à cet abonnement : filtre par plaque OU par numéro d'abonnement.
  // Sans les deux → aucune facture (pas de fallback contractId qui ramènerait
  // toutes les factures du client).
  const vehicleInvoices = useMemo(() => {
    const plate = vehicle?.licensePlate;
    return invoices
      .filter(
        (inv) =>
          (plate && inv.licensePlate === plate) || (subscriptionNumber && inv.subscriptionNumber === subscriptionNumber)
      )
      .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
  }, [invoices, vehicle, subscriptionNumber]);

  // Calculate renewal count from subscription's own start date + billing cycle
  const renewalCount = useMemo(() => {
    if (!subStartDate || !billingCycle) return 0;
    const start = new Date(subStartDate);
    const today = new Date();
    const diffYears = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    switch (billingCycle.toUpperCase()) {
      case 'ANNUAL':
        return Math.max(0, Math.floor(diffYears));
      case 'SEMESTRIAL':
        return Math.max(0, Math.floor(diffYears * 2));
      case 'QUARTERLY':
        return Math.max(0, Math.floor(diffYears * 4));
      case 'MONTHLY':
        return Math.max(0, Math.floor(diffYears * 12));
      default:
        return 0;
    }
  }, [subStartDate, billingCycle]);

  // Last billing = last paid invoice date, next = subscription's next_billing_date
  const billingDates = useMemo(() => {
    const lastPaidInvoice = vehicleInvoices.find((inv) => inv.status === 'PAID');
    const lastBilling = lastPaidInvoice?.date || subStartDate;
    const nextBilling = subNextBillingDate || subEndDate || null;
    return { lastBilling, nextBilling };
  }, [vehicleInvoices, subStartDate, subNextBillingDate, subEndDate]);

  // Installation date: device > vehicle > invoice fallback
  const installationDate = useMemo(() => {
    if (device?.installationDate) return device.installationDate;
    if (vehicle?.installDate) return vehicle.installDate;
    const installInvoice = vehicleInvoices.find((inv) => inv.category === 'INSTALLATION');
    if (installInvoice?.date) return installInvoice.date;
    return subStartDate;
  }, [device, vehicle, vehicleInvoices, subStartDate]);

  const statusStyle = STATUS_LABELS[subscriptionStatus] || STATUS_LABELS.ACTIVE;
  const cycleLabel = BILLING_CYCLE_LABELS[billingCycle?.toUpperCase()] || billingCycle?.toLowerCase() || '-';

  // Action handlers
  const handleSuspend = async () => {
    if (!onSuspend) return;
    setActionLoading(true);
    try {
      await onSuspend(subscriptionId);
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRésilier = async () => {
    if (!onRésilier) return;
    setActionLoading(true);
    try {
      await onRésilier(subscriptionId, résilierReason || undefined);
      onClose();
    } finally {
      setActionLoading(false);
      setConfirmRésilier(false);
    }
  };

  // History events (combine contract history and invoice events)
  const historyEvents = useMemo(() => {
    const events: Array<{ date: string; type: string; description: string }> = [];

    // Contract start
    if (contract?.startDate) {
      events.push({
        date: contract.startDate,
        type: 'CREATION',
        description: "Création de l'abonnement",
      });
    }

    // Contract history events
    if (contract?.history) {
      contract.history.forEach((event) => {
        events.push({
          date: event.date,
          type: event.type,
          description: event.description,
        });
      });
    }

    // Invoice events
    vehicleInvoices.forEach((inv) => {
      events.push({
        date: inv.date || '',
        type: 'INVOICE',
        description: `Facture ${inv.number || inv.id.slice(0, 8).toUpperCase()} - ${formatPrice(inv.amount)} (${inv.status === 'PAID' ? 'Payée' : inv.status === 'pending' ? 'En attente' : inv.status})`,
      });
    });

    // Sort by date descending
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [contract, vehicleInvoices, formatPrice]);

  if (!isOpen) return null;

  const formatDate = (date: string | undefined | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const displayedInvoices = showAllInvoices ? vehicleInvoices : vehicleInvoices.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative bg-[var(--bg-elevated)] rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--primary-dim)]0 text-white rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[var(--text-primary)] font-mono">{subscriptionNumber}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {vehicle?.name || vehicle?.brand} {vehicle?.model} - {vehicle?.licensePlate || '-'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--bg-elevated)] p-1 rounded-xl mx-6">
          {[
            { id: 'details', label: 'Détails', icon: Truck },
            { id: 'invoices', label: 'Factures', icon: FileText },
            { id: 'history', label: 'Historique', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--bg-elevated)] text-[var(--primary)] dark:text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'invoices' && vehicleInvoices.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] text-xs rounded-full">
                  {vehicleInvoices.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subscription Info */}
              <div className="space-y-4">
                <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[var(--primary)]" />
                  Abonnement
                </h3>
                <div className="bg-[var(--bg-elevated)]/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">N° Abonnement</span>
                    <span className="font-mono font-bold text-[var(--primary)]">{subscriptionNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Client</span>
                    <span className="font-medium">{client?.name || contract?.clientName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Contrat</span>
                    <button
                      onClick={() => {
                        if (onNavigate) onNavigate(View.SALES, { tab: 'contracts', contractId });
                        onClose();
                      }}
                      className="font-mono text-sm text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      {contract?.contractNumber || contractId.slice(0, 8).toUpperCase()}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Revendeur</span>
                    <span className="font-medium">{contract?.resellerName || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Billing Info */}
              <div className="space-y-4">
                <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  Facturation
                </h3>
                <div className="bg-[var(--bg-elevated)]/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Tarif</span>
                    <span className="font-bold text-green-600">
                      {formatPrice(monthlyFee)}{' '}
                      <span className="text-[var(--text-muted)] font-normal text-xs">/ {cycleLabel}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Date d'installation</span>
                    <span className="font-medium">{formatDate(installationDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Dernière facturation</span>
                    <span className="font-medium">{formatDate(billingDates.lastBilling)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Prochaine facturation</span>
                    <span className="font-medium text-[var(--primary)]">{formatDate(billingDates.nextBilling)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Renouvellements</span>
                    <span className="font-bold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 text-green-500" />
                      {renewalCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Renouvellement auto</span>
                    <span className={`text-sm font-medium ${autoRenew ? 'text-green-600' : 'text-orange-600'}`}>
                      {autoRenew ? 'Oui' : 'Non'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="space-y-4">
                <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-500" />
                  Véhicule
                </h3>
                <div className="bg-[var(--bg-elevated)]/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Nom</span>
                    <span className="font-medium">{vehicle?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Marque / Modèle</span>
                    <span className="font-medium">
                      {vehicle?.brand} {vehicle?.model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Plaque</span>
                    <span className="font-mono bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded text-sm">
                      {vehicle?.licensePlate || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">IMEI Balise</span>
                    <span className="font-mono text-xs">{device?.imei || vehicle?.imei || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Dates Info */}
              <div className="space-y-4">
                <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Échéances
                </h3>
                <div className="bg-[var(--bg-elevated)]/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Date d'effet</span>
                    <span className="font-medium">{formatDate(subStartDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Date de fin</span>
                    <span
                      className={`font-medium ${subEndDate && new Date(subEndDate) < new Date() ? 'text-red-600' : ''}`}
                    >
                      {subEndDate ? (
                        formatDate(subEndDate)
                      ) : (
                        <span className="text-green-600 text-xs">N'expire jamais</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)] text-sm">Contrat parent</span>
                    <span className="font-medium text-[var(--text-secondary)]">
                      {formatDate(contract?.startDate)} → {contract?.endDate ? formatDate(contract.endDate) : '∞'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {vehicleInvoices.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Aucune facture disponible</p>
                  <p className="text-sm">
                    {vehicle?.licensePlate
                      ? 'Les factures liées à cet abonnement apparaîtront ici'
                      : 'Aucune plaque enregistrée pour ce véhicule'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--bg-elevated)]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold text-[var(--text-secondary)] uppercase">
                            N° Facture
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-[var(--text-secondary)] uppercase">
                            Date
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-bold text-[var(--text-secondary)] uppercase">
                            Montant
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-bold text-[var(--text-secondary)] uppercase">
                            Statut
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-bold text-[var(--text-secondary)] uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {displayedInvoices.map((inv) => (
                          <tr key={inv.id} className="tr-hover/50">
                            <td className="px-4 py-3 font-mono text-xs text-[var(--primary)]">
                              {inv.number || inv.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(inv.date)}</td>
                            <td className="px-4 py-3 text-right font-bold text-green-600">{formatPrice(inv.amount)}</td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                  inv.status === 'PAID'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : inv.status === 'pending'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {inv.status === 'PAID' ? 'Payée' : inv.status === 'pending' ? 'En attente' : inv.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => {
                                  if (onNavigate) onNavigate(View.INVOICES, { tab: 'invoices', invoiceId: inv.id });
                                  onClose();
                                }}
                                className="p-1 hover:bg-[var(--bg-elevated)] rounded"
                                title="Voir la facture"
                              >
                                <ExternalLink className="w-4 h-4 text-[var(--primary)]" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {vehicleInvoices.length > 5 && (
                    <button
                      onClick={() => setShowAllInvoices(!showAllInvoices)}
                      className="w-full py-2 text-sm text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20 rounded-lg flex items-center justify-center gap-1"
                    >
                      {showAllInvoices ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Voir moins
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Voir toutes ({vehicleInvoices.length})
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {historyEvents.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Aucun historique</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-[var(--bg-elevated)] bg-[var(--bg-elevated)]" />
                  {historyEvents.map((event, index) => (
                    <div key={index} className="relative pl-10 pb-4">
                      <div
                        className={`absolute left-2 w-4 h-4 rounded-full border-2 ${
                          event.type === 'CREATION'
                            ? 'bg-green-500 border-green-500'
                            : event.type === 'INVOICE'
                              ? 'bg-[var(--primary-dim)]0 border-[var(--primary)]'
                              : event.type === 'RENEWAL'
                                ? 'bg-purple-500 border-purple-500'
                                : event.type === 'STATUS_CHANGE'
                                  ? 'bg-amber-500 border-amber-500'
                                  : 'bg-[var(--border)] border-[var(--border)]'
                        }`}
                      />
                      <div className="bg-[var(--bg-elevated)]/50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{event.description}</p>
                          <span className="text-xs text-[var(--text-muted)]">{formatDate(event.date)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Résiliation confirmation overlay */}
        {confirmRésilier && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl">
            <div className="bg-[var(--bg-elevated)] rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Confirmer la résiliation
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Cette action est irréversible. L'abonnement sera résilié immédiatement.
              </p>
              <textarea
                value={résilierReason}
                onChange={(e) => setRésilierReason(e.target.value)}
                placeholder="Motif de résiliation (optionnel)"
                rows={3}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-sm resize-none mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmRésilier(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--bg-elevated)]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRésilier}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'En cours…' : 'Résilier'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-elevated)]/50">
          <div className="text-sm text-[var(--text-secondary)]">
            <span className="font-medium">{renewalCount}</span> renouvellement{renewalCount > 1 ? 's' : ''} •{' '}
            <span className="font-medium">{vehicleInvoices.length}</span> facture{vehicleInvoices.length > 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            {onSuspend && subscriptionStatus === 'ACTIVE' && (
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                className="px-3 py-2 text-sm border border-orange-300 text-orange-600 hover:bg-[var(--clr-warning-dim)] rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <PauseCircle className="w-4 h-4" />
                Suspendre
              </button>
            )}
            {onRésilier && subscriptionStatus !== 'CANCELLED' && subscriptionStatus !== 'CANCELED' && (
              <button
                onClick={() => setConfirmRésilier(true)}
                disabled={actionLoading}
                className="px-3 py-2 text-sm border border-red-300 text-red-600 hover:bg-[var(--clr-danger-dim)] rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Résilier
              </button>
            )}
            <button
              onClick={() => {
                onEdit?.();
                onClose();
              }}
              className="px-3 py-2 text-sm bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg flex items-center gap-1.5"
            >
              <Edit2 className="w-4 h-4" />
              Modifier
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)]"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetailModal;
