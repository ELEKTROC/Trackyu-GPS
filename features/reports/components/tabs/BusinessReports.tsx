import React, { useState, useMemo, useEffect } from 'react';
import { ReportLayout } from '../ReportLayout';
import { ReportTable } from '../ReportTable';
import { ReportFilterBar } from '../ReportFilterBar';
import { ShoppingCart, DollarSign, PieChart, FileText, CreditCard } from 'lucide-react';
import { Card } from '../../../../components/Card';
import { generateTablePDF } from '../../../../services/pdfServiceV2';
import { useTenantBranding } from '../../../../hooks/useTenantBranding';
import { exportReportData } from '../../../../services/exportService';
import { useDataContext } from '../../../../contexts/DataContext';
import { useCurrency } from '../../../../hooks/useCurrency';

interface BusinessReportsProps {
  onAiAnalysis: (title: string, columns: string[], data: string[][]) => void;
  initialItem?: string;
}

const SUB_REPORTS: Record<string, { id: string; label: string }[]> = {
  quotes: [
    { id: 'all', label: 'Tous les devis' },
    { id: 'pending', label: 'En attente' },
    { id: 'accepted', label: 'Acceptés' },
  ],
  invoices: [
    { id: 'all', label: 'Toutes les factures' },
    { id: 'unpaid', label: 'Non payées' },
    { id: 'overdue', label: 'En retard' },
  ],
  payments: [
    { id: 'received', label: 'Encaissements' },
    { id: 'by_method', label: 'Par méthode' },
  ],
  accounting: [
    { id: 'journal', label: 'Journal' },
    { id: 'balance', label: 'Bilan' },
  ],
};

export const BusinessReports: React.FC<BusinessReportsProps> = ({ onAiAnalysis, initialItem }) => {
  const { branding } = useTenantBranding();
  const { invoices, payments, quotes, clients } = useDataContext();
  const { formatPrice } = useCurrency();
  const [activeItem, setActiveItem] = useState(initialItem || 'summary');
  const [selectedPeriod, setSelectedPeriod] = useState('THIS_MONTH');
  const [isGenerated, setIsGenerated] = useState(false);
  const [selectedSubReport, setSelectedSubReport] = useState(SUB_REPORTS[initialItem || 'summary']?.[0]?.id || '');

  const menuItems = [
    { id: 'summary', label: 'Synthèse Business', icon: PieChart },
    { id: 'quotes', label: 'Devis', icon: FileText },
    { id: 'invoices', label: 'Factures', icon: ShoppingCart },
    { id: 'payments', label: 'Paiements', icon: CreditCard },
    { id: 'accounting', label: 'Comptabilité', icon: DollarSign },
  ];

  useEffect(() => {
    setSelectedSubReport(SUB_REPORTS[activeItem]?.[0]?.id || '');
    setIsGenerated(false);
  }, [activeItem]);

  const handleSubReportChange = (id: string) => {
    setSelectedSubReport(id);
    setIsGenerated(false);
  };

  const summaryStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = payments
      .filter((p) => new Date(p.date) >= startOfMonth && p.status === 'COMPLETED')
      .reduce((s, p) => s + (p.amount || 0), 0);
    const pendingAmount = invoices.filter((inv) => inv.status !== 'PAID').reduce((s, inv) => s + (inv.amount || 0), 0);
    const overdueCount = invoices.filter((inv) => inv.status === 'OVERDUE').length;
    const pendingQuotes = quotes.filter((q) => q.status === 'SENT' || q.status === 'DRAFT').length;
    const acceptedQuotes = quotes.filter((q) => q.status === 'ACCEPTED').length;
    const conversionRate = quotes.length > 0 ? (acceptedQuotes / quotes.length) * 100 : 0;
    const activeClientIds = new Set(
      invoices.filter((inv) => new Date(inv.date) >= startOfMonth).map((inv) => inv.clientId)
    );
    return {
      monthlyRevenue,
      pendingAmount,
      overdueCount,
      pendingQuotes,
      conversionRate,
      activeClients: activeClientIds.size,
      totalInvoices: invoices.length,
      totalPayments: payments.length,
    };
  }, [invoices, payments, quotes]);

  // --- DATA FUNCTIONS ---
  const getQuotesData = (filter?: 'pending' | 'accepted') => {
    const src =
      filter === 'pending'
        ? quotes.filter((q) => q.status === 'SENT' || q.status === 'DRAFT')
        : filter === 'accepted'
          ? quotes.filter((q) => q.status === 'ACCEPTED')
          : quotes;
    return {
      columns: ['N° Devis', 'Date', 'Client', 'Montant HT', 'Montant TTC', 'Statut', 'Validité'],
      data: src.map((q) => [
        q.number || `DEV-${q.id}`,
        new Date(q.date).toLocaleDateString('fr-FR'),
        clients.find((c) => c.id === q.clientId)?.name || q.clientId,
        q.amountHT?.toLocaleString('fr-FR') || '0',
        q.amount?.toLocaleString('fr-FR') || '0',
        q.status === 'ACCEPTED'
          ? 'Accepté'
          : q.status === 'REJECTED'
            ? 'Refusé'
            : q.status === 'SENT'
              ? 'Envoyé'
              : 'Brouillon',
        q.validUntil ? new Date(q.validUntil).toLocaleDateString('fr-FR') : '--',
      ]),
    };
  };

  const getInvoicesData = (filter?: 'unpaid' | 'overdue') => {
    const src =
      filter === 'unpaid'
        ? invoices.filter((inv) => inv.status !== 'PAID')
        : filter === 'overdue'
          ? invoices.filter((inv) => inv.status === 'OVERDUE')
          : invoices;
    return {
      columns: ['N° Facture', 'Date', 'Client', 'Montant HT', 'TVA', 'Montant TTC', 'Échéance', 'Statut'],
      data: src.map((inv) => [
        inv.number || `FAC-${inv.id}`,
        new Date(inv.date).toLocaleDateString('fr-FR'),
        clients.find((c) => c.id === inv.clientId)?.name || inv.clientId,
        inv.amountHT?.toLocaleString('fr-FR') || '0',
        inv.amountTVA?.toLocaleString('fr-FR') || '0',
        inv.amount?.toLocaleString('fr-FR') || '0',
        inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : '--',
        inv.status === 'PAID'
          ? 'Payée'
          : inv.status === 'OVERDUE'
            ? 'En retard'
            : inv.status === 'SENT'
              ? 'Envoyée'
              : 'Brouillon',
      ]),
    };
  };

  const getPaymentsData = () => ({
    columns: ['Référence', 'Date', 'Client', 'Facture', 'Méthode', 'Montant', 'Statut'],
    data: payments.map((p) => {
      const invoice = invoices.find((i) => i.id === p.invoiceId);
      const client = clients.find((c) => c.id === p.clientId);
      return [
        p.reference || `PAY-${p.id}`,
        new Date(p.date).toLocaleDateString('fr-FR'),
        client?.name || p.clientId || '--',
        invoice?.number || p.invoiceId || '--',
        p.method === 'BANK_TRANSFER'
          ? 'Virement'
          : p.method === 'CASH'
            ? 'Espèces'
            : p.method === 'MOBILE_MONEY'
              ? 'Mobile Money'
              : p.method,
        p.amount?.toLocaleString('fr-FR') || '0',
        p.status === 'COMPLETED' ? 'Complété' : p.status === 'PENDING' ? 'En attente' : p.status,
      ];
    }),
  });

  const getPaymentsByMethodData = () => {
    const byMethod = new Map<string, { count: number; total: number }>();
    payments.forEach((p) => {
      const method =
        p.method === 'BANK_TRANSFER'
          ? 'Virement'
          : p.method === 'CASH'
            ? 'Espèces'
            : p.method === 'MOBILE_MONEY'
              ? 'Mobile Money'
              : p.method;
      const current = byMethod.get(method) || { count: 0, total: 0 };
      byMethod.set(method, { count: current.count + 1, total: current.total + (p.amount || 0) });
    });
    return {
      columns: ['Méthode', 'Nb Paiements', 'Montant Total', '% du Total'],
      data: Array.from(byMethod.entries()).map(([method, { count, total }]) => [
        method,
        String(count),
        total.toLocaleString('fr-FR'),
        payments.length > 0 ? `${((count / payments.length) * 100).toFixed(1)}%` : '0%',
      ]),
    };
  };

  const getCurrentReportData = (): { columns: string[]; data: string[][]; title: string } => {
    switch (activeItem) {
      case 'quotes':
        if (selectedSubReport === 'pending') return { ...getQuotesData('pending'), title: 'Devis en attente' };
        if (selectedSubReport === 'accepted') return { ...getQuotesData('accepted'), title: 'Devis acceptés' };
        return { ...getQuotesData(), title: 'Liste des devis' };
      case 'invoices':
        if (selectedSubReport === 'unpaid') return { ...getInvoicesData('unpaid'), title: 'Factures non payées' };
        if (selectedSubReport === 'overdue') return { ...getInvoicesData('overdue'), title: 'Factures en retard' };
        return { ...getInvoicesData(), title: 'Liste des factures' };
      case 'payments':
        if (selectedSubReport === 'by_method') return { ...getPaymentsByMethodData(), title: 'Paiements par méthode' };
        return { ...getPaymentsData(), title: 'Encaissements' };
      case 'accounting':
        return {
          ...getInvoicesData(),
          title: selectedSubReport === 'balance' ? 'Bilan financier' : 'Journal comptable',
        };
      default:
        return { columns: [], data: [], title: '' };
    }
  };

  const handleExport = (title: string, columns: string[], data: string[][]) => {
    generateTablePDF({
      title: `Rapport : ${title}`,
      headers: columns,
      rows: data,
      filename: `rapport_business_${activeItem}_${new Date().toISOString().slice(0, 10)}.pdf`,
      branding,
    });
  };

  const handleGenerate = (mode: 'view' | 'csv' | 'excel' | 'pdf') => {
    if (mode === 'view') {
      setIsGenerated(true);
      return;
    }
    const { columns, data, title } = getCurrentReportData();
    if (!columns.length) {
      setIsGenerated(true);
      return;
    }
    if (mode === 'pdf') handleExport(title, columns, data);
    else
      exportReportData(
        columns,
        data,
        `rapport_business_${activeItem}_${selectedSubReport}_${new Date().toISOString().slice(0, 10)}`,
        mode
      );
  };

  const currentSubReports = SUB_REPORTS[activeItem] || [];

  const renderContent = () => {
    const { columns, data, title } = getCurrentReportData();
    return (
      <div className="space-y-6">
        <ReportFilterBar
          period={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          onGenerate={handleGenerate}
          reports={currentSubReports}
          selectedReport={selectedSubReport}
          onReportChange={handleSubReportChange}
        />
        {!isGenerated ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] border-dashed">
            <PieChart className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Sélectionnez les filtres et cliquez sur "Générer"</p>
          </div>
        ) : activeItem === 'summary' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card title="Chiffre d'affaires (Mois)">
              <div className="text-3xl font-bold text-green-600">{formatPrice(summaryStats.monthlyRevenue)}</div>
              <p className="text-sm text-[var(--text-secondary)]">{summaryStats.totalPayments} paiements reçus</p>
            </Card>
            <Card title="Factures en attente">
              <div className="text-3xl font-bold text-orange-600">{formatPrice(summaryStats.pendingAmount)}</div>
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="text-red-500">{summaryStats.overdueCount} en retard</span>
              </p>
            </Card>
            <Card title="Devis en cours">
              <div className="text-3xl font-bold text-[var(--primary)]">{summaryStats.pendingQuotes}</div>
              <p className="text-sm text-[var(--text-secondary)]">
                Taux conversion: {summaryStats.conversionRate.toFixed(1)}%
              </p>
            </Card>
            <Card title="Clients actifs">
              <div className="text-3xl font-bold text-purple-600">{summaryStats.activeClients}</div>
              <p className="text-sm text-[var(--text-secondary)]">Ce mois-ci</p>
            </Card>
            <Card title="Total Factures">
              <div className="text-3xl font-bold text-[var(--text-primary)]">{summaryStats.totalInvoices}</div>
              <p className="text-sm text-[var(--text-secondary)]">Toutes périodes</p>
            </Card>
          </div>
        ) : columns.length > 0 ? (
          <ReportTable
            title={title}
            columns={columns}
            data={data}
            onExport={(cols, d) => handleExport(title, cols, d)}
            onAiAnalysis={(cols, d) => onAiAnalysis(title, cols, d)}
          />
        ) : null}
      </div>
    );
  };

  return (
    <ReportLayout menuItems={menuItems} activeItem={activeItem} onItemChange={setActiveItem}>
      {renderContent()}
    </ReportLayout>
  );
};
