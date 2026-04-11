import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Truck,
  CheckCircle,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  StopCircle,
  Download,
  Receipt,
  User,
  MapPin,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  Edit2,
  Calendar,
  RefreshCw,
  FileSignature,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Contract, Invoice, Vehicle, Tier } from '../../../types';
import { api } from '../../../services/apiLazy';
import { Modal } from '../../../components/Modal';
import { Pagination } from '../../../components/Pagination';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { generateInvoicePDF, type InvoiceData } from '../../../services/pdfServiceV2';
import { useTenantBranding } from '../../../hooks/useTenantBranding';
import { useCurrency } from '../../../hooks/useCurrency';
import { useToast } from '../../../contexts/ToastContext';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  EXPIRED: 'Expiré',
  TERMINATED: 'Résilié',
};
const BILLING_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMESTRIAL: 'Semestriel',
  ANNUAL: 'Annuel',
  YEARLY: 'Annuel',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  semi_annual: 'Semestriel',
  yearly: 'Annuel',
};

interface ContractDetailModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  client?: Tier;
  invoices: Invoice[];
  vehicles: Vehicle[];
  onStatusChange: (contract: Contract, newStatus: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED') => void;
  onEdit: () => void;
}

export const ContractDetailModal: React.FC<ContractDetailModalProps> = ({
  contract,
  isOpen,
  onClose,
  client,
  invoices,
  vehicles,
  onStatusChange,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const { branding } = useTenantBranding();
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();

  // Load real subscriptions for this contract
  const [contractSubs, setContractSubs] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  useEffect(() => {
    if (!contract?.id || !isOpen) return;
    setSubsLoading(true);
    api.subscriptions
      .list()
      .then((subs: any[]) =>
        setContractSubs(subs.filter((s: any) => s.contract_id === contract.id || s.contractId === contract.id))
      )
      .catch(() => {})
      .finally(() => setSubsLoading(false));
  }, [contract?.id, isOpen]);

  // Hooks before early return
  const contractInvoices = useMemo(() => {
    if (!contract) return [];
    return invoices.filter((i) => i.contractId === contract.id);
  }, [invoices, contract]);

  const INVOICE_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Brouillon',
    SENT: 'Envoyée',
    PAID: 'Payée',
    PARTIALLY_PAID: 'Partiel',
    PARTIAL: 'Partiel',
    OVERDUE: 'En retard',
    CANCELLED: 'Annulée',
    paid: 'Payée',
    pending: 'En attente',
    cancelled: 'Annulée',
  };

  const totalInvoiced = contractInvoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);
  const paidInvoices = contractInvoices.filter((i) => i.status === 'PAID');
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);
  const paymentRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

  const paidInvoicesWithDate = contractInvoices.filter((i) => i.status === 'PAID' && i.paymentDate);
  const averagePaymentDelay =
    paidInvoicesWithDate.length > 0
      ? Math.round(
          paidInvoicesWithDate.reduce((sum, inv) => {
            const delay = new Date(inv.paymentDate!).getTime() - new Date(inv.dueDate).getTime();
            return sum + delay / (1000 * 3600 * 24);
          }, 0) / paidInvoicesWithDate.length
        )
      : 0;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const historyItems = useMemo(() => {
    if (!contract) return [];
    if (contract.history && contract.history.length > 0) {
      return contract.history
        .map((h) => ({
          date: new Date(h.date).toLocaleDateString('fr-FR'),
          text: h.description,
          type: h.type,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const items = [
      { date: new Date(contract.startDate).toLocaleDateString('fr-FR'), text: 'Création du contrat', type: 'CREATION' },
    ];
    if (contract.notes) {
      contract.notes
        .split('\n')
        .filter((n) => n.startsWith('['))
        .forEach((note) => {
          const dateStr = note.substring(1, note.indexOf(']'));
          const text = note.substring(note.indexOf(']') + 1).trim();
          items.push({ date: dateStr, text, type: 'NOTE' });
        });
    }
    return items;
  }, [contract]);

  if (!contract) return null;

  const subsTotal = contractSubs.reduce((sum, s) => sum + parseFloat(s.monthly_fee ?? s.monthlyFee ?? 0), 0);

  const paginate = <T,>(items: T[]): T[] => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const PaginationControls = ({
    total,
    current,
    onPageChange,
  }: {
    total: number;
    current: number;
    onPageChange: (page: number) => void;
  }) => (
    <Pagination
      currentPage={current}
      totalPages={Math.ceil(total / itemsPerPage)}
      onPageChange={onPageChange}
      className="mt-4 pt-4 border-t border-[var(--border)] border-[var(--border)]"
    />
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'SUSPENDED':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'TERMINATED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'EXPIRED':
        return 'bg-slate-100 text-[var(--text-primary)] border-[var(--border)]';
      default:
        return 'bg-slate-100 text-[var(--text-primary)]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4" />;
      case 'SUSPENDED':
        return <PauseCircle className="w-4 h-4" />;
      case 'TERMINATED':
        return <StopCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getContractAlerts = (c: Contract) => {
    const alerts: { type: string; message: string }[] = [];
    if (c.status !== 'ACTIVE' || !c.endDate) return alerts;
    const diffDays = Math.ceil((new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) alerts.push({ type: 'CRITICAL', message: `Contrat expiré depuis ${Math.abs(diffDays)} jours` });
    else if (diffDays === 0) alerts.push({ type: 'CRITICAL', message: "Le contrat expire aujourd'hui" });
    else if (diffDays <= 5) alerts.push({ type: 'CRITICAL', message: `Expiration imminente : ${diffDays} jours` });
    else if (diffDays <= 30) alerts.push({ type: 'WARNING', message: `Expiration dans ${diffDays} jours` });
    else if (diffDays <= 45) alerts.push({ type: 'INFO', message: `Expiration dans ${diffDays} jours` });
    return alerts;
  };

  const alerts = getContractAlerts(contract);

  const chartData = [
    { name: 'Facturé', amount: totalInvoiced },
    { name: 'Payé', amount: totalPaid },
    { name: 'Reste', amount: Math.max(0, totalInvoiced - totalPaid) },
  ];

  // ─── PDF: full contract document ────────────────────────────────────────────
  const handleDownloadContract = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const companyName = branding?.name || 'TrackYu';
      const companyAddress = branding?.address || '';
      const companyPhone = branding?.phone || '';
      const companyEmail = branding?.email || '';
      const clientName = client?.name || contract.clientId || '';
      const clientAddress = client?.address || '';
      const clientPhone = client?.phone || '';
      const clientEmail = client?.email || '';
      const contractRef = contract.contractNumber || contract.id.slice(0, 8).toUpperCase();
      const today = new Date().toLocaleDateString('fr-FR');
      const startDate = new Date(contract.startDate).toLocaleDateString('fr-FR');
      const endDate = contract.endDate ? new Date(contract.endDate).toLocaleDateString('fr-FR') : 'Indéterminée';

      const pageW = doc.internal.pageSize.getWidth();
      let y = 18;

      // ── Header bar ──────────────────────────────────────────────────────
      doc.setFillColor(30, 64, 175); // blue-800
      doc.rect(0, 0, pageW, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName.toUpperCase(), 14, 9);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Réf : ${contractRef}  |  Généré le ${today}`, pageW - 14, 9, { align: 'right' });

      y = 24;
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRAT DE PRESTATION DE SERVICES', pageW / 2, y, { align: 'center' });
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Géolocalisation et Suivi GPS de Véhicules', pageW / 2, y + 6, { align: 'center' });

      // ── Divider ─────────────────────────────────────────────────────────
      y += 12;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, y, pageW - 14, y);

      // ── Parties ─────────────────────────────────────────────────────────
      y += 6;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('ENTRE LES SOUSSIGNÉS', 14, y);

      y += 6;
      const partyBoxH = 22;

      // Company box
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(14, y, (pageW - 30) / 2, partyBoxH, 2, 2, 'FD');
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('LE PRESTATAIRE', 18, y + 5);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(companyName, 18, y + 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      if (companyAddress) doc.text(companyAddress, 18, y + 16);
      if (companyPhone || companyEmail)
        doc.text([companyPhone, companyEmail].filter(Boolean).join('  |  '), 18, y + 20);

      // Client box
      const clientX = 14 + (pageW - 30) / 2 + 4;
      doc.setFillColor(245, 243, 255);
      doc.setDrawColor(221, 214, 254);
      doc.roundedRect(clientX, y, (pageW - 30) / 2, partyBoxH, 2, 2, 'FD');
      doc.setTextColor(109, 40, 217);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('LE CLIENT', clientX + 4, y + 5);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(clientName, clientX + 4, y + 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      if (clientAddress) doc.text(clientAddress, clientX + 4, y + 16);
      if (clientPhone || clientEmail)
        doc.text([clientPhone, clientEmail].filter(Boolean).join('  |  '), clientX + 4, y + 20);

      y += partyBoxH + 6;

      // ── Contract meta ────────────────────────────────────────────────────
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, pageW - 14, y);
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      const metaItems = [
        `Contrat N° : ${contractRef}`,
        `Date de début : ${startDate}`,
        `Date de fin : ${endDate}`,
        `Renouvellement auto : ${contract.autoRenew ? 'Oui' : 'Non'}`,
      ];
      if (contract.resellerName) metaItems.push(`Revendeur : ${contract.resellerName}`);
      doc.text(metaItems.join('   •   '), 14, y);

      y += 8;

      // ── Subscriptions table ──────────────────────────────────────────────
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('DÉTAIL DES ABONNEMENTS', 14, y);
      y += 3;

      const subRows = contractSubs.map((s) => {
        const plate = s.vehicle_plate || s.vehiclePlate || '—';
        const brand = s.vehicle_brand || s.vehicleBrand || '';
        const model = s.vehicle_model || s.vehicleModel || '';
        const vehicle = [brand, model].filter(Boolean).join(' ') || '—';
        const cycle = BILLING_CYCLE_LABELS[(s.billing_cycle || s.billingCycle || '').toUpperCase()] || '—';
        const fee = parseFloat(s.monthly_fee ?? s.monthlyFee ?? 0);
        const status = (s.status || '').toUpperCase();
        const statusLabel =
          status === 'ACTIVE'
            ? 'Actif'
            : status === 'SUSPENDED'
              ? 'Suspendu'
              : status === 'CANCELLED' || status === 'CANCELED'
                ? 'Résilié'
                : status;
        return [
          plate,
          vehicle,
          cycle,
          `${fee.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} FCFA`,
          statusLabel,
        ];
      });

      if (subRows.length === 0) subRows.push(['—', 'Aucun abonnement', '', '', '']);

      autoTable(doc, {
        startY: y,
        head: [['Plaque', 'Véhicule', 'Périodicité', 'Tarif / Période', 'Statut']],
        body: subRows,
        foot: [
          [
            '',
            '',
            'TOTAL',
            `${subsTotal.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} FCFA`,
            `${contractSubs.filter((s) => (s.status || '').toUpperCase() === 'ACTIVE').length} actif(s)`,
          ],
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        footStyles: { fillColor: [239, 246, 255], textColor: [30, 64, 175], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        styles: { cellPadding: 2.5 },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'center' } },
      });

      y = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

      // ── Legal articles ───────────────────────────────────────────────────
      const articles = [
        {
          title: 'Article 1 – Objet du contrat',
          body: `Le présent contrat a pour objet la fourniture par ${companyName} d'un service de géolocalisation et de suivi GPS de véhicules au profit du CLIENT, selon les modalités définies aux présentes.`,
        },
        {
          title: 'Article 2 – Durée',
          body: `Le contrat prend effet à la date de début indiquée ci-dessus. Sauf résiliation dans les conditions prévues à l'article 5, il est reconduit tacitement pour des périodes identiques sauf mention contraire.`,
        },
        {
          title: 'Article 3 – Obligations du Prestataire',
          body: `${companyName} s'engage à assurer la disponibilité de la plateforme, à fournir l'assistance technique et à notifier le CLIENT en cas d'interruption planifiée.`,
        },
        {
          title: 'Article 4 – Obligations du Client',
          body: `Le CLIENT s'engage à utiliser les services conformément aux présentes, à régler les factures dans les délais convenus et à signaler toute anomalie dans les meilleurs délais.`,
        },
        {
          title: 'Article 5 – Résiliation',
          body: `Chaque partie peut résilier le contrat par lettre recommandée avec accusé de réception en respectant un préavis de 30 jours. En cas de manquement grave non corrigé sous 15 jours après mise en demeure, la résiliation peut être immédiate.`,
        },
        {
          title: 'Article 6 – Confidentialité',
          body: `Les parties s'engagent à garder confidentielles toutes informations échangées dans le cadre du présent contrat, pendant toute sa durée et 3 ans après son terme.`,
        },
        {
          title: 'Article 7 – Loi applicable et litiges',
          body: `Le présent contrat est régi par le droit applicable localement. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, les tribunaux compétents du siège social du PRESTATAIRE seront seuls compétents.`,
        },
      ];

      const addNewPageIfNeeded = (neededHeight: number) => {
        if (y + neededHeight > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 18;
        }
      };

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      addNewPageIfNeeded(12);
      doc.text('CONDITIONS GÉNÉRALES', 14, y);
      y += 5;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, pageW - 14, y);
      y += 4;

      for (const art of articles) {
        addNewPageIfNeeded(20);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text(art.title, 14, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const lines = doc.splitTextToSize(art.body, pageW - 28) as string[];
        addNewPageIfNeeded(lines.length * 4 + 4);
        doc.text(lines, 14, y);
        y += lines.length * 4 + 4;
      }

      // ── Signature blocks ─────────────────────────────────────────────────
      addNewPageIfNeeded(50);
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, pageW - 14, y);
      y += 8;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('SIGNATURES', 14, y);
      y += 6;

      const sigW = (pageW - 32) / 2;
      const sigH = 32;

      // Client sig box
      doc.setDrawColor(221, 214, 254);
      doc.setFillColor(250, 245, 255);
      doc.roundedRect(14, y, sigW, sigH, 2, 2, 'FD');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(109, 40, 217);
      doc.text('LE CLIENT', 18, y + 6);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.text(clientName, 18, y + 12);
      doc.text('Nom et qualité du signataire :', 18, y + 18);
      doc.setDrawColor(200, 200, 200);
      doc.line(18, y + 28, 14 + sigW - 4, y + 28);
      doc.setFontSize(7);
      doc.text('Signature précédée de la mention « Lu et approuvé »', 18, y + 31);

      // Company sig box
      const sigX2 = 14 + sigW + 4;
      doc.setDrawColor(191, 219, 254);
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(sigX2, y, sigW, sigH, 2, 2, 'FD');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('LE PRESTATAIRE', sigX2 + 4, y + 6);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.text(companyName, sigX2 + 4, y + 12);
      doc.text('Cachet et signature autorisée :', sigX2 + 4, y + 18);
      doc.setDrawColor(200, 200, 200);
      doc.line(sigX2 + 4, y + 28, sigX2 + sigW - 4, y + 28);
      doc.setFontSize(7);
      doc.text('Signature précédée de la mention « Lu et approuvé »', sigX2 + 4, y + 31);

      y += sigH + 6;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.text(`Fait en deux exemplaires originaux. ${companyName} — ${today}`, pageW / 2, y, { align: 'center' });

      // ── Footer on each page ──────────────────────────────────────────────
      const pageCount =
        doc.getNumberOfPages?.() ??
        (doc.internal as typeof doc.internal & { getNumberOfPages?: () => number }).getNumberOfPages?.() ??
        1;
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `${companyName}  •  Contrat ${contractRef}  •  Page ${p}/${pageCount}`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 6,
          { align: 'center' }
        );
      }

      doc.save(`Contrat_${contractRef}_${clientName.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de la génération du PDF contrat', 'error');
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const items = (invoice.items || []).map((line) => ({
        description: line.description,
        quantity: line.quantity,
        price: line.price,
        total: line.quantity * line.price,
      }));
      const subtotal = items.reduce((sum, i) => sum + i.total, 0);
      const taxRate = invoice.vatRate ?? 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = invoice.amount || subtotal + taxAmount;
      const data: InvoiceData = {
        number: invoice.number,
        date: typeof invoice.date === 'string' ? invoice.date : new Date(invoice.date).toISOString(),
        dueDate: invoice.dueDate || new Date().toISOString(),
        client: {
          name: client?.name || invoice.clientId || '',
          address: client?.address || '',
          city: client?.city || '',
          email: client?.email || '',
          phone: client?.phone || '',
        },
        items,
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: invoice.status,
        notes: invoice.subject || invoice.notes,
        meta: { contractId: contract.id },
      };
      await generateInvoicePDF(data, { branding: branding || undefined });
    } catch {
      showToast('Erreur lors de la génération du PDF', 'error');
    }
  };

  const TABS = [
    { id: 'OVERVIEW', label: "Vue d'ensemble" },
    { id: 'ABONNEMENTS', label: 'Abonnements' },
    { id: 'INVOICES', label: 'Factures' },
    { id: 'CONTRAT', label: 'Document Contrat' },
    { id: 'HISTORY', label: 'Historique' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Contrat : ${contract.contractNumber || contract.id.slice(0, 8).toUpperCase()}`}
      maxWidth="max-w-6xl"
    >
      <div className="flex flex-col md:flex-row h-[80vh] overflow-hidden bg-[var(--bg-elevated)]">
        {/* SIDEBAR */}
        <div className="w-full md:w-72 bg-[var(--bg-elevated)] border-r border-[var(--border)] p-5 flex flex-col gap-5 overflow-y-auto shrink-0">
          <div className="text-center relative">
            <button
              onClick={onEdit}
              className="absolute top-0 right-0 p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-full transition-colors"
              title="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <div className="w-16 h-16 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-full flex items-center justify-center mx-auto mb-3 text-[var(--primary)] dark:text-[var(--primary)]">
              <FileCheck className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base text-[var(--text-primary)] mb-1 line-clamp-2">
              {contract.subject || 'Contrat'}
            </h3>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(contract.status)}`}
            >
              {getStatusIcon(contract.status)}
              {STATUS_LABELS[contract.status] || contract.status}
            </div>
          </div>

          {/* KEY METRICS */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] border-[var(--border)] text-center">
              <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">Abonnements</p>
              <p className="font-mono font-bold text-[var(--text-primary)]">{contractSubs.length}</p>
            </div>
            <div className="p-2.5 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] border-[var(--border)] text-center">
              <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">Actifs</p>
              <p className="font-mono font-bold text-green-700 dark:text-green-400">
                {contractSubs.filter((s) => (s.status || '').toUpperCase() === 'ACTIVE').length}
              </p>
            </div>
            <div className="col-span-2 p-2.5 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] border-[var(--border)] text-center">
              <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">Total facturation</p>
              <p className="font-mono font-bold text-green-700 dark:text-green-400">{formatPrice(subsTotal)}</p>
            </div>
          </div>

          {/* CLIENT */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase border-b pb-1.5">Client</h4>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                {(client?.name || '?').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{client?.name || contract.clientId}</p>
                <p className="text-xs text-[var(--text-secondary)]">{client?.contactName || ''}</p>
              </div>
            </div>
            {client?.phone && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <User className="w-3 h-3" /> {client.phone}
              </div>
            )}
            {client?.address && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <MapPin className="w-3 h-3" /> {client.address}
              </div>
            )}
          </div>

          {/* RESELLER */}
          {contract.resellerName && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase border-b pb-1.5">
                Revendeur
              </h4>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  {contract.resellerName.substring(0, 2).toUpperCase()}
                </div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{contract.resellerName}</p>
              </div>
            </div>
          )}

          {/* DATES */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase border-b pb-1.5">Période</h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)] text-xs">Début</span>
                <span className="font-medium text-xs">{new Date(contract.startDate).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)] text-xs">Fin</span>
                <span className="font-medium text-xs">
                  {contract.endDate ? new Date(contract.endDate).toLocaleDateString('fr-FR') : 'Indéterminée'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)] text-xs">Renouv. Auto</span>
                <span className="font-medium text-xs">{contract.autoRenew ? 'Oui' : 'Non'}</span>
              </div>
            </div>
          </div>

          {/* PAYMENT STATS */}
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 text-center">
            <p className="text-[10px] uppercase font-bold text-indigo-500 mb-1">Délai Moyen Paiement</p>
            <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
              {averagePaymentDelay} <span className="text-xs font-normal">jours</span>
            </p>
          </div>

          {/* ACTIONS */}
          <div className="mt-auto space-y-2 pt-3 border-t border-[var(--border)]">
            {contract.status === 'ACTIVE' && (
              <button
                onClick={() => onStatusChange(contract, 'SUSPENDED')}
                className="w-full py-2 px-3 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <PauseCircle className="w-3.5 h-3.5" /> Suspendre
              </button>
            )}
            {contract.status === 'SUSPENDED' && (
              <button
                onClick={() => onStatusChange(contract, 'ACTIVE')}
                className="w-full py-2 px-3 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Reprendre
              </button>
            )}
            {(contract.status === 'ACTIVE' || contract.status === 'SUSPENDED') && (
              <button
                onClick={() => onStatusChange(contract, 'TERMINATED')}
                className="w-full py-2 px-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" /> Résilier
              </button>
            )}
            <button
              onClick={handleDownloadContract}
              className="w-full py-2 px-3 border border-[var(--border)] dark:border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Télécharger PDF Contrat
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TABS */}
          <div className="flex border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* ── OVERVIEW ─────────────────────────────────────────── */}
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-5">
                {/* Subscriptions summary */}
                <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[var(--primary)]" /> Récapitulatif Abonnements
                  </h4>
                  {subsLoading ? (
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-4 justify-center">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Chargement…
                    </div>
                  ) : contractSubs.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)] italic text-center py-4">
                      Aucun abonnement associé.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase text-xs">
                          <tr>
                            <th className="px-3 py-2 text-left">Plaque</th>
                            <th className="px-3 py-2 text-left">Véhicule</th>
                            <th className="px-3 py-2 text-left">Cycle</th>
                            <th className="px-3 py-2 text-right">Tarif</th>
                            <th className="px-3 py-2 text-center">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {contractSubs.slice(0, 5).map((s: any) => {
                            const plate = s.vehicle_plate || s.vehiclePlate || '—';
                            const brand = s.vehicle_brand || s.vehicleBrand || '';
                            const model = s.vehicle_model || s.vehicleModel || '';
                            const status = (s.status || '').toUpperCase();
                            return (
                              <tr key={s.id} className="tr-hover/50">
                                <td className="px-3 py-2 font-mono font-bold text-[var(--text-primary)] text-xs">
                                  {plate}
                                </td>
                                <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                                  {[brand, model].filter(Boolean).join(' ') || '—'}
                                </td>
                                <td className="px-3 py-2 text-xs">
                                  {BILLING_CYCLE_LABELS[(s.billing_cycle || s.billingCycle || '').toUpperCase()] || '—'}
                                </td>
                                <td className="px-3 py-2 text-right text-xs font-bold">
                                  {formatPrice(parseFloat(s.monthly_fee ?? s.monthlyFee ?? 0))}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${status === 'ACTIVE' ? 'bg-green-100 text-green-700' : status === 'SUSPENDED' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-[var(--text-secondary)]'}`}
                                  >
                                    {status === 'ACTIVE' ? 'Actif' : status === 'SUSPENDED' ? 'Suspendu' : status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {contractSubs.length > 5 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-3 py-2 text-xs text-[var(--text-secondary)] italic text-center"
                              >
                                +{contractSubs.length - 5} autre(s) — voir onglet Abonnements
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] font-bold">
                            <td colSpan={3} className="px-3 py-2 text-xs text-right text-[var(--primary)]">
                              Total
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-[var(--primary)]">
                              {formatPrice(subsTotal)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Financial chart + Alerts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" /> Performance Financière
                    </h4>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={18}>
                            {chartData.map((_, index) => (
                              <Cell key={index} fill={index === 0 ? '#3b82f6' : index === 1 ? '#22c55e' : '#f59e0b'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" /> Alertes & Notes
                    </h4>
                    <div className="space-y-2">
                      {alerts.map((alert, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 p-2.5 border rounded text-sm ${alert.type === 'CRITICAL' ? 'bg-red-50 border-red-100 text-red-800' : alert.type === 'WARNING' ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-[var(--primary-dim)] border-[var(--primary)] text-[var(--primary)]'}`}
                        >
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <p className="font-bold text-xs">{alert.message}</p>
                        </div>
                      ))}
                      {paymentRate < 50 && totalInvoiced > 0 && (
                        <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded text-xs text-red-800">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <p>Taux de recouvrement faible ({paymentRate.toFixed(0)}%).</p>
                        </div>
                      )}
                      {contract.notes && (
                        <div className="p-2.5 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-800 whitespace-pre-wrap">
                          {contract.notes}
                        </div>
                      )}
                      {alerts.length === 0 && !contract.notes && paymentRate >= 50 && (
                        <p className="text-xs text-[var(--text-secondary)] italic">Aucune alerte.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ABONNEMENTS ──────────────────────────────────────── */}
            {activeTab === 'ABONNEMENTS' && (
              <div className="flex flex-col h-full">
                {subsLoading ? (
                  <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Chargement…
                  </div>
                ) : (
                  <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3">Plaque</th>
                            <th className="px-4 py-3">Véhicule</th>
                            <th className="px-4 py-3">Cycle</th>
                            <th className="px-4 py-3 text-right">Tarif</th>
                            <th className="px-4 py-3">Proch. Fact.</th>
                            <th className="px-4 py-3 text-center">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {contractSubs.length > 0 ? (
                            paginate(contractSubs).map((s: any) => {
                              const plate = s.vehicle_plate || s.vehiclePlate || '—';
                              const brand = s.vehicle_brand || s.vehicleBrand || '';
                              const model = s.vehicle_model || s.vehicleModel || '';
                              const nextBilling = s.next_billing_date || s.nextBillingDate;
                              const status = (s.status || '').toUpperCase();
                              return (
                                <tr key={s.id} className="tr-hover/50">
                                  <td className="px-4 py-3 font-mono font-bold text-[var(--text-primary)]">{plate}</td>
                                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                                    {[brand, model].filter(Boolean).join(' ') || '—'}
                                  </td>
                                  <td className="px-4 py-3 text-xs">
                                    {BILLING_CYCLE_LABELS[(s.billing_cycle || s.billingCycle || '').toUpperCase()] ||
                                      '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold">
                                    {formatPrice(parseFloat(s.monthly_fee ?? s.monthlyFee ?? 0))}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-[var(--primary)]">
                                    {nextBilling ? new Date(nextBilling).toLocaleDateString('fr-FR') : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${status === 'ACTIVE' ? 'bg-green-100 text-green-700' : status === 'SUSPENDED' ? 'bg-orange-100 text-orange-700' : status === 'CANCELLED' || status === 'CANCELED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-[var(--text-secondary)]'}`}
                                    >
                                      {status === 'ACTIVE'
                                        ? 'Actif'
                                        : status === 'SUSPENDED'
                                          ? 'Suspendu'
                                          : status === 'CANCELLED' || status === 'CANCELED'
                                            ? 'Résilié'
                                            : status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)] text-sm">
                                Aucun abonnement associé à ce contrat.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {contractSubs.length > 0 && (
                          <tfoot>
                            <tr className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] font-bold text-xs">
                              <td
                                colSpan={3}
                                className="px-4 py-2 text-right text-[var(--primary)] dark:text-[var(--primary)]"
                              >
                                Total
                              </td>
                              <td className="px-4 py-2 text-right text-[var(--primary)] dark:text-[var(--primary)]">
                                {formatPrice(subsTotal)}
                              </td>
                              <td colSpan={2} className="px-4 py-2 text-center text-[var(--text-secondary)]">
                                {contractSubs.filter((s) => (s.status || '').toUpperCase() === 'ACTIVE').length}{' '}
                                actif(s) / {contractSubs.length}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    <div className="p-3 border-t border-[var(--border)] border-[var(--border)]">
                      <PaginationControls
                        total={contractSubs.length}
                        current={currentPage}
                        onPageChange={setCurrentPage}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── INVOICES ─────────────────────────────────────────── */}
            {activeTab === 'INVOICES' && (
              <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase text-xs sticky top-0">
                      <tr>
                        <th className="px-5 py-3">Numéro</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Échéance</th>
                        <th className="px-5 py-3 text-right">Montant</th>
                        <th className="px-5 py-3 text-center">Statut</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {contractInvoices.length > 0 ? (
                        paginate(contractInvoices).map((inv) => (
                          <tr key={inv.id} className="tr-hover/50">
                            <td className="px-5 py-3 font-mono text-[var(--primary)] text-xs">{inv.number}</td>
                            <td className="px-5 py-3 text-xs">{new Date(inv.date).toLocaleDateString('fr-FR')}</td>
                            <td className="px-5 py-3 text-xs">{new Date(inv.dueDate).toLocaleDateString('fr-FR')}</td>
                            <td className="px-5 py-3 text-right font-bold">{formatPrice(inv.amount ?? 0)}</td>
                            <td className="px-5 py-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${inv.status === 'PAID' || inv.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}
                              >
                                {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={() => handleDownloadInvoice(inv)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-full transition-colors"
                                title="Télécharger"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-[var(--text-secondary)] text-sm">
                            Aucune facture générée pour ce contrat.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-[var(--border)] border-[var(--border)]">
                  <PaginationControls
                    total={contractInvoices.length}
                    current={currentPage}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            )}

            {/* ── CONTRAT (legal document) ──────────────────────────── */}
            {activeTab === 'CONTRAT' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={handleDownloadContract}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--primary-light)] transition-colors"
                  >
                    <Download className="w-4 h-4" /> Télécharger PDF
                  </button>
                </div>

                {/* Document preview */}
                <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
                  {/* Document header */}
                  <div className="bg-[var(--primary-dim)] px-8 py-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">
                      {branding?.name || 'TrackYu'}
                    </p>
                    <h2 className="text-xl font-bold tracking-tight">CONTRAT DE PRESTATION DE SERVICES</h2>
                    <p className="text-xs opacity-70 mt-1">Géolocalisation et Suivi GPS de Véhicules</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs opacity-80">
                      <span>N° {contract.contractNumber || contract.id.slice(0, 8).toUpperCase()}</span>
                      <span>Début : {new Date(contract.startDate).toLocaleDateString('fr-FR')}</span>
                      <span>
                        Fin :{' '}
                        {contract.endDate ? new Date(contract.endDate).toLocaleDateString('fr-FR') : 'Indéterminée'}
                      </span>
                    </div>
                  </div>

                  <div className="p-8 space-y-6 text-sm text-[var(--text-primary)]">
                    {/* Parties */}
                    <div>
                      <p className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3">
                        Entre les soussignés
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-xl">
                          <p className="text-[10px] font-bold text-[var(--primary)] uppercase mb-2">Le Prestataire</p>
                          <p className="font-bold text-[var(--text-primary)]">{branding?.name || 'TrackYu'}</p>
                          {branding?.address && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1">{branding.address}</p>
                          )}
                          {branding?.phone && <p className="text-xs text-[var(--text-secondary)]">{branding.phone}</p>}
                          {branding?.email && <p className="text-xs text-[var(--text-secondary)]">{branding.email}</p>}
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                          <p className="text-[10px] font-bold text-purple-600 uppercase mb-2">Le Client</p>
                          <p className="font-bold text-[var(--text-primary)]">{client?.name || contract.clientId}</p>
                          {client?.address && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1">{client.address}</p>
                          )}
                          {client?.phone && <p className="text-xs text-[var(--text-secondary)]">{client.phone}</p>}
                          {client?.email && <p className="text-xs text-[var(--text-secondary)]">{client.email}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Subscriptions table */}
                    <div>
                      <p className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                        <Receipt className="w-3.5 h-3.5" /> Détail des Abonnements
                      </p>
                      {subsLoading ? (
                        <div className="text-center py-4 text-[var(--text-muted)] text-xs">
                          <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                          Chargement…
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                          <table className="w-full text-xs">
                            <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase">
                              <tr>
                                <th className="px-3 py-2.5 text-left font-bold">Plaque</th>
                                <th className="px-3 py-2.5 text-left font-bold">Véhicule</th>
                                <th className="px-3 py-2.5 text-left font-bold">Périodicité</th>
                                <th className="px-3 py-2.5 text-right font-bold">Tarif / Période</th>
                                <th className="px-3 py-2.5 text-center font-bold">Statut</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                              {contractSubs.length > 0 ? (
                                contractSubs.map((s: any) => {
                                  const plate = s.vehicle_plate || s.vehiclePlate || '—';
                                  const brand = s.vehicle_brand || s.vehicleBrand || '';
                                  const model = s.vehicle_model || s.vehicleModel || '';
                                  const status = (s.status || '').toUpperCase();
                                  return (
                                    <tr key={s.id} className="tr-hover/40">
                                      <td className="px-3 py-2 font-mono font-bold">{plate}</td>
                                      <td className="px-3 py-2 text-[var(--text-secondary)]">
                                        {[brand, model].filter(Boolean).join(' ') || '—'}
                                      </td>
                                      <td className="px-3 py-2">
                                        {BILLING_CYCLE_LABELS[
                                          (s.billing_cycle || s.billingCycle || '').toUpperCase()
                                        ] || '—'}
                                      </td>
                                      <td className="px-3 py-2 text-right font-bold">
                                        {formatPrice(parseFloat(s.monthly_fee ?? s.monthlyFee ?? 0))}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-[var(--text-secondary)]'}`}
                                        >
                                          {status === 'ACTIVE' ? 'Actif' : status}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={5} className="px-3 py-4 text-center text-[var(--text-secondary)] italic">
                                    Aucun abonnement.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            {contractSubs.length > 0 && (
                              <tfoot>
                                <tr className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] font-bold">
                                  <td
                                    colSpan={3}
                                    className="px-3 py-2 text-right text-[var(--primary)] dark:text-[var(--primary)]"
                                  >
                                    TOTAL
                                  </td>
                                  <td className="px-3 py-2 text-right text-[var(--primary)] dark:text-[var(--primary)]">
                                    {formatPrice(subsTotal)}
                                  </td>
                                  <td />
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Legal articles */}
                    <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                      <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">Conditions Générales</p>
                      {[
                        {
                          title: 'Article 1 – Objet du contrat',
                          body: `Le présent contrat a pour objet la fourniture par ${branding?.name || 'le Prestataire'} d'un service de géolocalisation et de suivi GPS de véhicules au profit du CLIENT, selon les modalités définies aux présentes.`,
                        },
                        {
                          title: 'Article 2 – Durée',
                          body: "Le contrat prend effet à la date de début indiquée ci-dessus. Sauf résiliation dans les conditions prévues à l'article 5, il est reconduit tacitement pour des périodes identiques sauf mention contraire.",
                        },
                        {
                          title: 'Article 3 – Obligations du Prestataire',
                          body: `${branding?.name || 'Le Prestataire'} s'engage à assurer la disponibilité de la plateforme de géolocalisation, à fournir l'assistance technique nécessaire et à notifier le CLIENT en cas d'interruption planifiée de service.`,
                        },
                        {
                          title: 'Article 4 – Obligations du Client',
                          body: "Le CLIENT s'engage à utiliser les services conformément aux présentes, à régler les factures dans les délais convenus et à signaler toute anomalie dans les meilleurs délais.",
                        },
                        {
                          title: 'Article 5 – Résiliation',
                          body: 'Chaque partie peut résilier le contrat par lettre recommandée avec accusé de réception en respectant un préavis de 30 jours. En cas de manquement grave non corrigé sous 15 jours après mise en demeure, la résiliation peut être immédiate.',
                        },
                        {
                          title: 'Article 6 – Confidentialité',
                          body: "Les parties s'engagent à garder confidentielles toutes informations échangées dans le cadre du présent contrat, pendant toute sa durée et 3 ans après son terme.",
                        },
                        {
                          title: 'Article 7 – Loi applicable et litiges',
                          body: "Le présent contrat est régi par le droit applicable localement. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, les tribunaux compétents du siège social du Prestataire seront seuls compétents.",
                        },
                      ].map((art, i) => (
                        <div key={i}>
                          <p className="font-bold text-[var(--primary)] dark:text-[var(--primary)] text-xs mb-1">
                            {art.title}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{art.body}</p>
                        </div>
                      ))}
                    </div>

                    {/* Signature blocks */}
                    <div className="pt-4 border-t border-[var(--border)]">
                      <p className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                        <FileSignature className="w-3.5 h-3.5" /> Signatures
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Client signature */}
                        <div className="p-5 border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-xl bg-purple-50/40 dark:bg-purple-900/10">
                          <p className="text-[10px] font-bold text-purple-600 uppercase mb-1">Le Client</p>
                          <p className="font-bold text-sm text-[var(--text-primary)] mb-3">
                            {client?.name || contract.clientId}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mb-1">Nom et qualité du signataire :</p>
                          <div className="border-b border-[var(--border)] mb-4 py-3" />
                          <p className="text-xs text-[var(--text-secondary)] mb-1">Date : ____________________</p>
                          <div className="border-b border-[var(--border)] mt-8" />
                          <p className="text-[10px] text-[var(--text-muted)] mt-1 text-center italic">
                            Signature précédée de la mention « Lu et approuvé »
                          </p>
                        </div>
                        {/* Company signature */}
                        <div className="p-5 border-2 border-dashed border-[var(--border)] dark:border-[var(--primary)] rounded-xl bg-[var(--primary-dim)]/40 dark:bg-[var(--primary-dim)]">
                          <p className="text-[10px] font-bold text-[var(--primary)] uppercase mb-1">Le Prestataire</p>
                          <p className="font-bold text-sm text-[var(--text-primary)] mb-3">
                            {branding?.name || 'TrackYu'}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mb-1">Cachet et signature autorisée :</p>
                          <div className="border-b border-[var(--border)] mb-4 py-3" />
                          <p className="text-xs text-[var(--text-secondary)] mb-1">Date : ____________________</p>
                          <div className="border-b border-[var(--border)] mt-8" />
                          <p className="text-[10px] text-[var(--text-muted)] mt-1 text-center italic">
                            Signature précédée de la mention « Lu et approuvé »
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] text-center mt-4 italic">
                        Fait en deux exemplaires originaux.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── HISTORY ──────────────────────────────────────────── */}
            {activeTab === 'HISTORY' && (
              <div className="flex flex-col h-full">
                <div className="space-y-4 flex-1 overflow-auto">
                  {paginate(historyItems).map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${item.type === 'CREATION' ? 'bg-[var(--primary)]' : 'bg-slate-400'}`}
                        />
                        <div className="w-0.5 flex-1 bg-slate-200 bg-[var(--bg-elevated)] my-1" />
                      </div>
                      <div className="pb-5">
                        <p
                          className={`text-sm ${item.type === 'CREATION' ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}
                        >
                          {item.text}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls total={historyItems.length} current={currentPage} onPageChange={setCurrentPage} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
