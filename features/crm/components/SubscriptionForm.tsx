/**
 * SubscriptionForm — Formulaire de création / édition d'un abonnement.
 * Règles :
 *  - 1 abonnement = 1 véhicule (lecture seule, pré-chargé depuis le contexte)
 *  - Article catalogue obligatoire (détermine description, TVA, compte comptable)
 *  - Cycle de facturation défini sur l'abonnement
 *  - Date d'effet = date d'installation (pré-remplie si disponible, modifiable)
 *  - Date de fin : "N'expire jamais" coché par défaut → auto_renew = true automatiquement
 *  - next_billing_date calculé côté backend (affiché en lecture seule en édition)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useDataContext } from '../../../contexts/DataContext';
import { api } from '../../../services/apiLazy';
import type { CatalogItem } from '../../../types/finance';
import { CalendarDays, Building2, User, Receipt, Sparkles } from 'lucide-react';

interface SubscriptionFormProps {
  vehicleId: string;
  vehiclePlate: string;
  vehicleName?: string;
  contractId?: string;
  clientId?: string;
  resellerId?: string;
  installationDate?: string;
  initialData?: {
    id: string;
    catalogItemId?: string;
    monthlyFee: number;
    billingCycle: string;
    startDate: string;
    endDate?: string | null;
    notes?: string;
    nextBillingDate?: string | null;
    nextBillingDateEditable?: boolean;
  };
  onSubmit: (data: SubscriptionFormData) => Promise<void>;
  onCancel: () => void;
}

export interface SubscriptionFormData {
  contractId?: string | null;
  clientId?: string | null;
  resellerId?: string | null;
  vehicleId: string;
  catalogItemId: string;
  monthlyFee: number;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMESTRIAL' | 'ANNUAL';
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  nextBillingDate?: string | null;
  notes?: string;
}

const BILLING_CYCLES = [
  { value: 'MONTHLY', label: 'Mensuel' },
  { value: 'QUARTERLY', label: 'Trimestriel' },
  { value: 'SEMESTRIAL', label: 'Semestriel' },
  { value: 'ANNUAL', label: 'Annuel' },
] as const;

const CYCLE_KEYWORDS: Record<string, string> = {
  MONTHLY: 'mensuel',
  QUARTERLY: 'trimestriel',
  SEMESTRIAL: 'semestriel',
  ANNUAL: 'annuel',
};

const today = new Date().toISOString().split('T')[0];

function computeNextBillingDate(startDate: string, cycle: string): string {
  const d = new Date(startDate);
  switch (cycle.toUpperCase()) {
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'SEMESTRIAL':
      d.setMonth(d.getMonth() + 6);
      break;
    case 'ANNUAL':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split('T')[0];
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

export const SubscriptionForm: React.FC<SubscriptionFormProps> = ({
  vehicleId,
  vehiclePlate,
  vehicleName,
  contractId: propContractId,
  clientId: propClientId,
  resellerId: propResellerId,
  installationDate,
  initialData,
  onSubmit,
  onCancel,
}) => {
  const { contracts } = useDataContext();
  const isEdit = !!initialData;
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogItemId, setCatalogItemId] = useState(initialData?.catalogItemId || '');
  const [monthlyFee, setMonthlyFee] = useState(initialData?.monthlyFee ?? 0);
  const [billingCycle, setBillingCycle] = useState<SubscriptionFormData['billingCycle']>(
    (initialData?.billingCycle as SubscriptionFormData['billingCycle']) || 'ANNUAL'
  );
  const [startDate, setStartDate] = useState((initialData?.startDate || installationDate || today).split('T')[0]);
  const [neverExpires, setNeverExpires] = useState(!initialData?.endDate);
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [nextBillingDateManual, setNextBillingDateManual] = useState(
    initialData?.nextBillingDate ? initialData.nextBillingDate.split('T')[0] : ''
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Contrat pré-sélectionné (lecture seule)
  const selectedContract = useMemo(() => contracts.find((c) => c.id === propContractId), [contracts, propContractId]);
  const selectedContractTenantId = selectedContract?.tenantId;

  // Prochaine facturation calculée côté client (indicatif)
  const previewNextBilling = useMemo(
    () => (startDate ? computeNextBillingDate(startDate, billingCycle) : null),
    [startDate, billingCycle]
  );

  // Auto-sélection catalogue selon le cycle
  const autoSelectForCycle = (items: CatalogItem[], cycle: string) => {
    if (isEdit) return;
    const keyword = CYCLE_KEYWORDS[cycle.toUpperCase()];
    if (!keyword) return;
    const match = items.find((i) => i.name.toLowerCase().includes(keyword));
    if (match) {
      setCatalogItemId(match.id);
      setMonthlyFee(match.price);
    }
  };

  // Chargement catalogue
  useEffect(() => {
    api.catalog
      .list()
      .then((items: CatalogItem[]) => {
        let filtered = items.filter((i) => i.category === 'Abonnement' && i.status === 'ACTIVE');
        if (selectedContractTenantId) {
          const byTenant = filtered.filter(
            (i) =>
              i.tenantId === selectedContractTenantId ||
              (i as CatalogItem & { tenant_id?: string }).tenant_id === selectedContractTenantId
          );
          if (byTenant.length > 0) filtered = byTenant;
        }
        setCatalogItems(filtered);
        if (!catalogItemId) autoSelectForCycle(filtered, billingCycle);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContractTenantId]);

  const handleCatalogChange = (id: string) => {
    setCatalogItemId(id);
    const item = catalogItems.find((i) => i.id === id);
    if (item && !isEdit) setMonthlyFee(item.price);
  };

  const handleCycleChange = (cycle: SubscriptionFormData['billingCycle']) => {
    setBillingCycle(cycle);
    autoSelectForCycle(catalogItems, cycle);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!catalogItemId) return setError('Sélectionnez un article catalogue');
    if (!startDate) return setError("La date d'effet est requise");
    if (!propContractId && !propClientId) return setError('Client ou contrat requis');

    setLoading(true);
    try {
      await onSubmit({
        contractId: propContractId || null,
        clientId: propClientId || null,
        resellerId: propResellerId || null,
        vehicleId,
        catalogItemId,
        monthlyFee,
        billingCycle,
        startDate,
        endDate: neverExpires ? null : endDate || null,
        autoRenew: neverExpires,
        nextBillingDate: isEdit && nextBillingDateManual ? nextBillingDateManual : null,
        notes,
      });
    } catch (err) {
      setError((err as Error).message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-6">
      {/* ── Informations clés (read-only) ────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Véhicule */}
        <div className="bg-[var(--bg-elevated)]/60 rounded-lg p-3 border border-[var(--border)]">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">Véhicule</p>
          <p className="font-bold text-[var(--text-primary)] text-sm font-mono">{vehicleId}</p>
          {vehiclePlate && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {vehiclePlate}
              {vehicleName ? ` — ${vehicleName}` : ''}
            </p>
          )}
        </div>

        {/* Contrat — lecture seule si pré-chargé, sinon auto-assigné */}
        {selectedContract ? (
          <div className="bg-[var(--bg-elevated)]/60 rounded-lg p-3 border border-[var(--border)]">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">
              Contrat / Client
            </p>
            <p className="font-bold text-[var(--text-primary)] text-sm font-mono">
              {selectedContract.contractNumber || propContractId}
            </p>
            {selectedContract.clientName && (
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" />
                {selectedContract.clientName}
              </p>
            )}
            {selectedContract.resellerName && (
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {selectedContract.resellerName}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 border border-violet-200 dark:border-violet-800">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Contrat
            </p>
            <p className="text-xs font-medium text-violet-700 dark:text-violet-300">Assigné automatiquement</p>
            <p className="text-[11px] text-violet-500 mt-0.5">Selon le client et le cycle sélectionné</p>
          </div>
        )}
      </div>

      {/* ── Prochaine facturation ── */}
      {!isEdit && previewNextBilling && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
          <p className="text-[10px] font-bold text-green-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            Prochaine fact. estimée
          </p>
          <p className="font-bold text-green-700 dark:text-green-300 text-sm">{formatDate(previewNextBilling)}</p>
        </div>
      )}

      {isEdit && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1 flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5 text-[var(--primary)]" />
            Prochaine facturation
          </label>
          <input
            type="date"
            value={nextBillingDateManual}
            onChange={(e) => setNextBillingDateManual(e.target.value)}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-sm"
          />
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Modifiez cette date pour corriger la prochaine échéance de facturation.
          </p>
        </div>
      )}

      {/* ── Article catalogue ───────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Article catalogue <span className="text-red-500">*</span>
        </label>
        <select
          value={catalogItemId}
          onChange={(e) => handleCatalogChange(e.target.value)}
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-sm"
          required
        >
          <option value="">Sélectionner un article…</option>
          {catalogItems.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Tarif + Cycle ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Tarif <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(Number(e.target.value))}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Cycle de facturation <span className="text-red-500">*</span>
          </label>
          <select
            value={billingCycle}
            onChange={(e) => handleCycleChange(e.target.value as SubscriptionFormData['billingCycle'])}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-sm"
          >
            {BILLING_CYCLES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Date d'effet ────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Date d'effet (installation) <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-sm"
          required
        />
        {installationDate && (
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            Date d'installation réelle : <span className="font-medium">{formatDate(installationDate)}</span>
          </p>
        )}
        {!installationDate && !isEdit && (
          <p className="text-[11px] text-amber-500 mt-1">
            Date d'installation non trouvée — vérifier et ajuster si nécessaire.
          </p>
        )}
      </div>

      {/* ── Date de fin ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <input
            id="neverExpires"
            type="checkbox"
            checked={neverExpires}
            onChange={(e) => setNeverExpires(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="neverExpires" className="text-sm font-medium text-[var(--text-primary)]">
            N'expire jamais
            <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">(renouvellement automatique)</span>
          </label>
        </div>
        {!neverExpires && (
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-sm"
          />
        )}
      </div>

      {/* ── Notes ───────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-sm resize-none"
          placeholder="Informations complémentaires…"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : "Créer l'abonnement"}
        </button>
      </div>
    </form>
  );
};
