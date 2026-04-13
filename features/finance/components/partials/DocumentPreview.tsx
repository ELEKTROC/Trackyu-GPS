// DocumentPreview.tsx - Extracted from FinanceView.tsx
import React, { useState, useEffect } from 'react';
import { Edit2, Download, Mail, FileCheck, CheckCircle, Clock, Send, AlertTriangle, XCircle, Ban } from 'lucide-react';
import type { Invoice, Quote } from '../../../../types';
import { useDataContext } from '../../../../contexts/DataContext';
import { useCurrency } from '../../../../hooks/useCurrency';
import { getHeaders } from '../../../../services/api/client';

interface TenantInfo {
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  country?: string;
  taxId?: string;
  bankDetails?: string;
}

interface DocumentPreviewProps {
  item: Invoice | Quote;
  onEdit: () => void;
  onAction: (action: 'download' | 'send' | 'mark_sent' | 'convert_to_invoice') => void;
}

// Helper: format date safely in French locale
const fmtDate = (d: string | Date | null | undefined): string => {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR');
  } catch {
    return '-';
  }
};

// Helper: category labels
const categoryLabels: Record<string, string> = {
  STANDARD: 'Standard',
  INSTALLATION: 'Installation',
  ABONNEMENT: 'Abonnement',
  AUTRES_VENTES: 'Autres ventes',
};

// Helper: status badge config
const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: {
    label: 'Brouillon',
    color: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]',
    icon: Clock,
  },
  SENT: {
    label: 'Envoyée',
    color: 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--primary)]',
    icon: Send,
  },
  PAID: { label: 'Payée', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
  PARTIAL: { label: 'Partielle', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: AlertTriangle },
  OVERDUE: { label: 'En retard', color: 'bg-red-100 text-red-700 border-red-300', icon: AlertTriangle },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-600 border-red-300', icon: XCircle },
  ACCEPTED: { label: 'Accepté', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
  REJECTED: { label: 'Refusé', color: 'bg-red-100 text-red-600 border-red-300', icon: Ban },
};

// Champs backend enrichis non présents dans les types TS de base
type DocItem = Invoice &
  Quote & { companyLogo?: string; companyDetails?: string; paymentMethod?: string; contractNumber?: string };

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ item, onEdit, onAction }) => {
  const doc = item as DocItem;
  const { clients, tiers } = useDataContext();
  const { formatPrice } = useCurrency();
  // Détecter si c'est une facture par la présence de invoiceType ou dueDate (propriétés spécifiques aux factures)
  const isInvoice = 'invoiceType' in item || ('dueDate' in item && !('validUntil' in item));

  // State for tenant info
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);

  // Fetch tenant info on mount or when item changes
  useEffect(() => {
    const abortController = new AbortController();
    const fetchBrandingInfo = async () => {
      // 1. Priorité au revendeur associé au document
      const resellerId = doc.resellerId;
      if (resellerId) {
        // 1a. Chercher dans les tiers (type RESELLER)
        const reseller = tiers.find((t) => t.id === resellerId && t.type === 'RESELLER');
        if (reseller && reseller.resellerData) {
          setTenantInfo({
            name: reseller.resellerData.brandName || reseller.name,
            logo: reseller.resellerData.logo,
            address: reseller.address,
            phone: reseller.resellerData.adminPhone || reseller.phone,
            email: reseller.resellerData.adminEmail || reseller.email,
            city: reseller.city,
            country: reseller.country,
            taxId: reseller.resellerData.siret || reseller.resellerData.rccm,
            bankDetails: reseller.resellerData.fiscalYear,
          });
          return;
        }

        // 1b. Chercher le tenant par ID via API (resellerId = tenant_id)
        try {
          const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/tenants/${resellerId}`, {
            credentials: 'include',
            headers: getHeaders(),
            signal: abortController.signal,
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data && (data.name || data.company_name)) {
              setTenantInfo({
                name: data.name || data.company_name || '',
                logo: data.logo || data.logo_url,
                address: data.address,
                phone: data.phone,
                email: data.email,
                city: data.city,
                country: data.country,
                taxId: data.tax_id,
                bankDetails: data.bank_details,
              });
              return;
            }
          }
        } catch (e: unknown) {
          if (e instanceof Error && e.name === 'AbortError') return;
        }
      }

      // 2. Fallback sur le tenant courant (pour le SuperAdmin ou documents directs)
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/tenants/current`, {
          credentials: 'include',
          headers: getHeaders(),
          signal: abortController.signal,
        });

        if (response.ok) {
          const data = await response.json();
          setTenantInfo({
            name: data.name || data.company_name || '',
            logo: data.logo || data.logo_url,
            address: data.address,
            phone: data.phone,
            email: data.email,
            city: data.city,
            country: data.country,
            taxId: data.tax_id,
            bankDetails: data.bank_details,
          });
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return;
      }
    };
    fetchBrandingInfo();
    return () => abortController.abort();
  }, [item, tiers]);

  // Get client name - prioritize clientName from API, then lookup
  const clientName =
    doc.clientName ||
    tiers.find((t) => t.id === item.clientId)?.name ||
    clients.find((c) => c.id === item.clientId)?.name ||
    item.clientId;

  // Find client details for address etc
  const client =
    tiers.find((t) => t.id === item.clientId || t.name === item.clientId) ||
    clients.find((c) => c.name === item.clientId);

  // Check if reseller is from Côte d'Ivoire (no VAT)
  const resellerName = doc.resellerName || '';
  const isNoVatReseller =
    resellerName.toUpperCase().includes('ABIDJAN') ||
    resellerName.toUpperCase().includes('IVOIRE') ||
    client?.country?.toUpperCase().includes('IVOIRE') ||
    client?.country?.toUpperCase() === 'CI';

  // Calculate totals — amountHT/amount from API are authoritative when available
  const storedHT = doc.amountHT || 0;
  const storedTTC = doc.amount || 0;
  const hasItems = item.items && item.items.length > 0;
  const itemsTotal = hasItems ? item.items.reduce((sum, line) => sum + (line.quantity || 1) * (line.price || 0), 0) : 0;
  // Use stored amountHT as subtotal when it's consistent (within 1% of items total or no items)
  const subtotal = storedHT > 0 ? storedHT : hasItems ? itemsTotal : storedTTC;

  const discount = (item as Quote).discount || 0;
  const taxableAmount = Math.max(0, subtotal - discount);

  // No VAT for CI resellers
  const effectiveVatRate = isNoVatReseller ? 0 : item.vatRate || 0;
  const vatAmount = taxableAmount * (effectiveVatRate / 100);

  // Total calculation — always prefer stored TTC
  const total = storedTTC > 0 ? storedTTC : taxableAmount + vatAmount;

  return (
    <div className="bg-[var(--bg-elevated)]/50 p-4 md:p-8 rounded-lg text-[var(--text-primary)] shadow-sm">
      {/* Header with Logo and Company Details */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 md:mb-8 border-b border-[var(--border)] pb-4 md:pb-6">
        <div className="w-full md:w-1/2">
          {tenantInfo?.logo || doc.companyLogo ? (
            <img src={tenantInfo?.logo || doc.companyLogo} alt="Logo" className="h-12 md:h-16 object-contain mb-2" />
          ) : (
            <div className="h-12 md:h-16 w-28 md:w-32 bg-gradient-to-r from-blue-600 to-blue-500 rounded flex items-center justify-center text-white font-bold text-sm md:text-lg mb-2">
              {(tenantInfo?.name || 'Logo').substring(0, 10)}
            </div>
          )}
          <div className="text-xs md:text-sm text-[var(--text-secondary)] whitespace-pre-line">
            {tenantInfo ? (
              <>
                <p className="font-bold text-[var(--text-primary)]">{tenantInfo.name}</p>
                {tenantInfo.address && <p>{tenantInfo.address}</p>}
                {(tenantInfo.city || tenantInfo.country) && (
                  <p>{[tenantInfo.city, tenantInfo.country].filter(Boolean).join(', ')}</p>
                )}
                {tenantInfo.phone && <p>Tél: {tenantInfo.phone}</p>}
                {tenantInfo.email && <p>{tenantInfo.email}</p>}
                {tenantInfo.taxId && <p>N° RCCM: {tenantInfo.taxId}</p>}
              </>
            ) : (
              doc.companyDetails || ''
            )}
          </div>
        </div>
        <div className="text-left md:text-right w-full md:w-auto">
          <h1 className="text-xl md:page-title mb-1">
            {isInvoice ? (item as Invoice).invoiceType || 'FACTURE' : 'DEVIS'}
          </h1>
          <p className="text-base md:text-lg font-mono text-[var(--primary)]">
            N° {isInvoice ? (item as Invoice).number : (item as Quote).number || item.id}
          </p>
          {/* Status Badge */}
          {item.status &&
            (() => {
              const cfg = statusConfig[item.status] || {
                label: item.status,
                color: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]',
                icon: Clock,
              };
              const Icon = cfg.icon;
              return (
                <span
                  className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 text-xs font-bold rounded-full border ${cfg.color}`}
                >
                  <Icon className="w-3 h-3" /> {cfg.label}
                </span>
              );
            })()}
          {/* Type d'Opération */}
          {doc.category && (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Type Op. :{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {categoryLabels[doc.category] || doc.category}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Client & Dates Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8">
        <div>
          <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-2">
            {isInvoice ? 'Facturé à' : 'Destinataire'}
          </h3>
          <div className="bg-[var(--bg-elevated)] p-4 rounded border border-[var(--border)]">
            <p className="font-bold text-base md:text-lg mb-1">{clientName}</p>
            {client && (
              <div className="text-sm text-[var(--text-secondary)] mt-2 space-y-0.5">
                <p>{client.address}</p>
                <p>{[client.city, client.country].filter(Boolean).join(', ')}</p>
                <p>{client.email}</p>
                <p>{client.phone}</p>
              </div>
            )}
            {/* Revendeur masqué dans l'aperçu - les infos du revendeur sont dans l'en-tête */}
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2 md:gap-4 text-sm text-left md:text-right bg-[var(--bg-elevated)] p-3 md:p-0 md:bg-transparent rounded md:rounded-none border md:border-0 border-[var(--border)]">
          <div>
            <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">
              {isInvoice ? 'Date de la facture' : 'Date du devis'}
            </p>
            <p className="font-medium">{fmtDate(isInvoice ? (item as Invoice).date : (item as Quote).createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">
              {isInvoice ? 'Échéance' : 'Validité'}
            </p>
            <p className="font-medium">
              {isInvoice
                ? fmtDate((item as Invoice).dueDate)
                : (item as Quote).validUntil
                  ? fmtDate((item as Quote).validUntil)
                  : (() => {
                      try {
                        const d = new Date((item as Quote).createdAt);
                        d.setDate(d.getDate() + 30);
                        return fmtDate(d);
                      } catch {
                        return '-';
                      }
                    })()}
            </p>
          </div>
          {/* Installation date — only for INSTALLATION category */}
          {doc.category === 'INSTALLATION' && doc.installationDate && (
            <div>
              <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">Date d'installation</p>
              <p className="font-medium">{fmtDate(doc.installationDate)}</p>
            </div>
          )}
          {/* Plaque — only show if non-empty */}
          {(item as Quote).licensePlate && (
            <div>
              <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">Plaque</p>
              <p className="font-medium font-mono">{(item as Quote).licensePlate}</p>
            </div>
          )}
          {doc.contractId && (
            <div>
              <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">N° Contrat</p>
              <p className="font-medium">{doc.contractNumber || doc.contractId}</p>
            </div>
          )}
          {/* N° Commande — only show if different from licensePlate */}
          {doc.orderNumber && doc.orderNumber !== (item as Quote).licensePlate && (
            <div>
              <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">N° Commande</p>
              <p className="font-medium">{doc.orderNumber}</p>
            </div>
          )}
          {doc.paymentMethod && (
            <div>
              <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">Mode de paiement</p>
              <p className="font-medium">{doc.paymentMethod}</p>
            </div>
          )}
        </div>
      </div>

      {/* Subject */}
      {((item as Quote).subject || (item as Invoice).subject) && (
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Objet</h3>
          <p className="font-medium text-[var(--text-primary)]">
            {(item as Quote).subject || (item as Invoice).subject}
          </p>
        </div>
      )}

      {/* Items Table - Responsive */}
      <div className="overflow-x-auto -mx-4 md:mx-0">
        <table className="w-full text-xs md:text-sm mb-4 min-w-[400px]">
          <thead className="bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase text-xs">
            <tr>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 w-12 md:w-20 text-center">Qté</th>
              <th className="p-2 w-20 md:w-32 text-right">P.U. HT</th>
              <th className="p-2 w-20 md:w-32 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--bg-elevated)] divide-y divide-[var(--border)]">
            {hasItems ? (
              item.items.map((line, i) => (
                <tr key={i}>
                  <td className="p-2 font-medium">{line.description || 'Article'}</td>
                  <td className="p-2 text-center">{line.quantity || 1}</td>
                  <td className="p-2 text-right font-mono">{formatPrice(line.price || 0)}</td>
                  <td className="p-2 text-right font-mono font-bold">
                    {formatPrice((line.quantity || 1) * (line.price || 0))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-2 font-medium text-[var(--text-secondary)] italic" colSpan={4}>
                  Aucun détail d'articles disponible - Montant total: {formatPrice(subtotal)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-full md:w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Total HT:</span>
            <span className="font-bold font-mono">{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <span className="text-green-600">Remise</span>
              <span className="font-bold font-mono text-green-600">-{formatPrice(discount)}</span>
            </div>
          )}
          {effectiveVatRate > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">TVA ({effectiveVatRate}%)</span>
              <span className="font-bold font-mono">{formatPrice(vatAmount)}</span>
            </div>
          )}
          {isNoVatReseller && (
            <div className="flex justify-between text-xs">
              <span className="text-amber-600">Exonéré de TVA (Export)</span>
              <span className="font-mono text-amber-600">0</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t mt-2 text-base">
            <span className="font-bold">{effectiveVatRate > 0 ? 'Total TTC:' : 'Total:'}</span>
            <span className="font-bold text-[var(--primary)] font-mono">{formatPrice(total)}</span>
          </div>
          {/* Paid amount & Balance — for invoices only */}
          {isInvoice &&
            (() => {
              const paidAmount = doc.paidAmount || 0;
              const balance = total - paidAmount;
              return paidAmount > 0 ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Payé :</span>
                    <span className="font-bold font-mono text-green-600">{formatPrice(paidAmount)}</span>
                  </div>
                  {balance > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600 font-bold">Solde dû :</span>
                      <span className="font-bold font-mono text-red-600">{formatPrice(balance)}</span>
                    </div>
                  )}
                </>
              ) : null;
            })()}
        </div>
      </div>

      {/* Bank Details & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-xs mt-6 md:mt-8 pt-6 md:pt-8 border-t border-[var(--border)]">
        <div>
          <h5 className="font-bold mb-1 uppercase text-[var(--text-secondary)]">Coordonnées Bancaires</h5>
          <p className="whitespace-pre-line text-[var(--text-secondary)] bg-[var(--bg-elevated)] p-3 rounded border border-[var(--border)]">
            {tenantInfo?.bankDetails || (item as Quote).bankDetails || 'Non renseigné'}
          </p>
        </div>
        <div>
          <h5 className="font-bold mb-1 uppercase text-[var(--text-secondary)]">Notes / Conditions</h5>
          <div className="bg-[var(--bg-elevated)] p-3 rounded border border-[var(--border)] space-y-2">
            <p className="whitespace-pre-line text-[var(--text-secondary)]">{item.notes || 'Aucune note.'}</p>
            {item.generalConditions && (
              <p className="whitespace-pre-line text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-[10px] border-t pt-2">
                {item.generalConditions}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions Bottom - Responsive */}
      <div className="flex flex-wrap justify-center md:justify-end gap-2 pt-6 border-t border-[var(--border)] mt-6 no-print">
        <button
          onClick={onEdit}
          className="p-2 px-3 flex items-center gap-1 text-xs font-bold bg-[var(--bg-elevated)] border rounded hover:bg-[var(--bg-elevated)]"
        >
          <Edit2 className="w-3 h-3" /> Modifier
        </button>
        <button
          onClick={() => onAction('download')}
          className="p-2 px-3 flex items-center gap-1 text-xs font-bold bg-[var(--bg-elevated)] border rounded hover:bg-[var(--bg-elevated)]"
        >
          <Download className="w-3 h-3" /> PDF
        </button>
        <button
          onClick={() => onAction('send')}
          className="p-2 px-3 flex items-center gap-1 text-xs font-bold bg-[var(--bg-elevated)] border rounded hover:bg-[var(--bg-elevated)]"
        >
          <Mail className="w-3 h-3" /> Envoyer
        </button>
        {item.status === 'DRAFT' && (
          <button
            onClick={() => onAction('mark_sent')}
            className="p-2 px-3 flex items-center gap-1 text-xs font-bold bg-amber-100 dark:bg-amber-700 text-amber-800 dark:text-amber-100 border border-amber-300 dark:border-amber-600 rounded hover:bg-amber-200 dark:hover:bg-amber-600"
          >
            <Send className="w-3 h-3" /> Marquer envoyé
          </button>
        )}
        {!isInvoice && item.status === 'ACCEPTED' && (
          <button
            onClick={() => onAction('convert_to_invoice')}
            className="p-2 px-3 flex items-center gap-1 text-xs font-bold bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-100 border border-green-300 dark:border-green-600 rounded hover:bg-green-200 dark:hover:bg-green-600"
          >
            <FileCheck className="w-3 h-3" /> Facturer
          </button>
        )}
      </div>
    </div>
  );
};
