// AccountingView.tsx - Refactored version using extracted partials
// Reduced from 1450 lines to ~650 lines

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs } from '../../../components/Tabs';
import { MobileTabLayout } from '../../../components/MobileTabLayout';
import { useMobileViewTabs } from '../../../hooks/useMobileViewTabs';
import { Calculator, BookOpen, PieChart, DollarSign, BarChart as BarChartIcon, FileText, Receipt, Building2, AlertTriangle } from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { useDataContext } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { generatePaymentReceipt } from '../../../services/pdfService';
import { useTenantBranding } from '../../../hooks/useTenantBranding';
import type { Payment, Invoice, Client, JournalEntry } from '../../../types';
import { PLAN_COMPTABLE, JOURNAL_COLUMNS, PAYMENT_COLUMNS } from '../constants';
import { useCurrency } from '../../../hooks/useCurrency';
import { usePreviewNumber } from '../../../services/numberingService';
import { useIsMobile } from '../../../hooks/useIsMobile';

// External Views
import { SupplierInvoicesView } from './SupplierInvoicesView';
import { BankReconciliationView } from './BankReconciliationView';
import { BudgetView } from './BudgetView';
import { ReportsView } from './ReportsView';
import { CashView } from './CashView';
import { RecoveryView } from './RecoveryView';

// Extracted Partials
import { StatsTab as StatsTabPartial } from './partials/StatsTab';
import { FinanceTab as FinanceTabPartial, type PaymentColumnId } from './partials/FinanceTab';
import { AccountingContent as AccountingContentPartial, type JournalColumnId } from './partials/AccountingContent';
import { PaymentModal } from './partials/PaymentModal';
import { EntryModal } from './partials/EntryModal';

// --- HELPERS ---
// Helper: Safely parse date to Date object or null
const safeToDate = (dateValue: string | Date | null | undefined): Date | null => {
    if (!dateValue) return null;
    try {
        const dateObj = new Date(dateValue);
        if (isNaN(dateObj.getTime())) return null;
        return dateObj;
    } catch {
        return null;
    }
};

const ACCOUNTING_TABS = [
  { id: 'STATS',      label: "Vue d'ensemble", icon: BarChartIcon,  color: 'bg-blue-500',   description: 'KPIs et indicateurs clés' },
  { id: 'FINANCE',    label: 'Finance',         icon: DollarSign,   color: 'bg-green-500',  description: 'Paiements et factures' },
  { id: 'RECOVERY',  label: 'Recouvrement',     icon: AlertTriangle,color: 'bg-red-500',    description: 'Créances et relances' },
  { id: 'BUDGET',    label: 'Budget',            icon: PieChart,     color: 'bg-purple-500', description: 'Prévisions budgétaires' },
  { id: 'ACCOUNTING',label: 'Comptabilité',      icon: BookOpen,     color: 'bg-indigo-500', description: 'Journal et plan comptable' },
  { id: 'BANKING',   label: 'Banque',            icon: Building2,    color: 'bg-slate-600',  description: 'Rapprochement bancaire' },
  { id: 'CASH',      label: 'Caisse',            icon: DollarSign,   color: 'bg-teal-500',   description: 'Gestion de la caisse' },
  { id: 'REPORTS',   label: 'Rapports',          icon: FileText,     color: 'bg-orange-500', description: 'Rapports financiers' },
  { id: 'EXPENSES',  label: 'Dépenses',          icon: Receipt,      color: 'bg-amber-500',  description: 'Factures fournisseurs' },
];

const ACCOUNTING_MOBILE_HIDDEN = new Set(['BUDGET', 'ACCOUNTING', 'BANKING', 'REPORTS']);

type AccountingTab = 'STATS' | 'FINANCE' | 'RECOVERY' | 'ACCOUNTING' | 'BUDGET' | 'REPORTS' | 'EXPENSES' | 'BANKING' | 'CASH';

// Type definitions
interface EntryLine {
    account: string;
    label: string;
    debit: number;
    credit: number;
}

interface EntryFormData {
    date: string;
    journalCode: string;
    ref: string;
    label: string;
    lines: EntryLine[];
}

interface PaymentFormData {
    clientId: string;
    resellerId: string;
    date: string;
    method: string;
    reference: string;
    amount: number;
    allocations: { invoiceId: string; amount: number }[];
    vehicleId: string;
    contractId: string;
    notes: string;
    attachments: string[];
    // Specific fields by method
    bankName?: string;
    checkNumber?: string;
    transactionId?: string;
}

export const AccountingView: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();
  const { branding } = useTenantBranding();
  const [activeTab, setActiveTab] = useState<AccountingTab>('STATS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResellerId, setSelectedResellerId] = useState<string>('ALL');
  const [lockDate, setLockDate] = useState<string | null>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null);
  const { 
    journalEntries: rawJournalEntries, 
    payments: rawPayments, 
    addPayment, 
    invoices: rawInvoices, 
    clients, 
    tiers, 
    vehicles, 
    contracts, 
    budgets: rawBudgets,
    tasks,
    bankTransactions: rawBankTransactions,
    supplierInvoices: rawSupplierInvoices,
    createGroupedJournalEntry
  } = useDataContext();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'SUPER_ADMIN';
  const isMobile = useIsMobile();
  const { filterTabsForView } = useMobileViewTabs();

  const visibleAccountingTabs = useMemo(() => {
    const base = isMobile ? ACCOUNTING_TABS.filter(t => !ACCOUNTING_MOBILE_HIDDEN.has(t.id)) : ACCOUNTING_TABS;
    return isMobile ? filterTabsForView('accountingView' as any, base) : base;
  }, [isMobile, filterTabsForView]);

  // Resellers list from tiers
  const resellers = useMemo(() => tiers.filter(t => t.type === 'RESELLER'), [tiers]);

  // Data filtering by reseller
  const journalEntries = useMemo(() => {
    if (selectedResellerId === 'ALL') return rawJournalEntries || [];
    // Filter by tenantId — journal entries don't carry a separate resellerId
    return (rawJournalEntries || []).filter(e => e.tenantId === selectedResellerId);
  }, [rawJournalEntries, selectedResellerId]);

  const payments = useMemo(() => {
    if (selectedResellerId === 'ALL') return rawPayments || [];
    // Payments may carry either tenantId (standard) or resellerId (reseller-created payments)
    return (rawPayments || []).filter(p => p.tenantId === selectedResellerId || p.resellerId === selectedResellerId);
  }, [rawPayments, selectedResellerId]);

  const invoices = useMemo(() => {
    if (selectedResellerId === 'ALL') return rawInvoices || [];
    return (rawInvoices || []).filter(i => i.tenantId === selectedResellerId || i.resellerId === selectedResellerId);
  }, [rawInvoices, selectedResellerId]);

  const budgets = useMemo(() => {
    if (selectedResellerId === 'ALL') return rawBudgets || [];
    return (rawBudgets || []).filter(b => b.tenantId === selectedResellerId);
  }, [rawBudgets, selectedResellerId]);

  const bankTransactions = useMemo(() => {
    if (selectedResellerId === 'ALL') return rawBankTransactions || [];
    return (rawBankTransactions || []).filter(tx => tx.tenantId === selectedResellerId);
  }, [rawBankTransactions, selectedResellerId]);

  const supplierInvoices = useMemo(() => {
    if (selectedResellerId === 'ALL') return rawSupplierInvoices || [];
    return (rawSupplierInvoices || []).filter(inv => inv.tenantId === selectedResellerId);
  }, [rawSupplierInvoices, selectedResellerId]);

  // Numbering service for payment reference
  const { data: paymentPreviewNumber } = usePreviewNumber('payment');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Column visibility states — persisted in localStorage
  const [visibleColumns, setVisibleColumns] = useState<JournalColumnId[]>(() => {
    try {
      const saved = localStorage.getItem('accounting_visible_columns');
      if (saved) return JSON.parse(saved) as JournalColumnId[];
    } catch { /* ignore */ }
    return JOURNAL_COLUMNS.map(c => c.id) as JournalColumnId[];
  });
  const [visiblePaymentColumns, setVisiblePaymentColumns] = useState<PaymentColumnId[]>(() => {
    try {
      const saved = localStorage.getItem('accounting_visible_payment_columns');
      if (saved) return JSON.parse(saved) as PaymentColumnId[];
    } catch { /* ignore */ }
    return PAYMENT_COLUMNS.map(c => c.id) as PaymentColumnId[];
  });

  // Modal states
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Entry form state
  const [entryForm, setEntryForm] = useState<EntryFormData>({
      date: new Date().toISOString().split('T')[0],
      journalCode: 'OD',
      ref: `OD-${Date.now()}`,
      label: '',
      lines: [
          { account: '', label: '', debit: 0, credit: 0 },
          { account: '', label: '', debit: 0, credit: 0 }
      ]
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
      clientId: '',
      resellerId: '',
      date: new Date().toISOString().split('T')[0],
      method: 'VIREMENT',
      reference: '', // Will be filled by handleOpenPaymentModal with numbering service
      amount: 0,
      allocations: [],
      vehicleId: '',
      contractId: '',
      notes: '',
      attachments: []
  });

  const [selectedInvoiceToAdd, setSelectedInvoiceToAdd] = useState('');

  // Handler to open payment modal with auto-generated reference from numbering service
  const handleOpenPaymentModal = useCallback(() => {
      const autoReference = paymentPreviewNumber || `PAY-${Date.now()}`;
      setPaymentForm(prev => ({
          ...prev,
          reference: autoReference
      }));
      setIsPaymentModalOpen(true);
  }, [paymentPreviewNumber]);

  // === COMPUTED VALUES ===
  
  const accountStats = useMemo(() => {
      const stats = [
          { id: '1', label: 'CLASSE 1 : Ressources Durables', balance: 0 },
          { id: '2', label: 'CLASSE 2 : Actif Immobilisé', balance: 0 },
          { id: '3', label: 'CLASSE 3 : Stocks', balance: 0 },
          { id: '4', label: 'CLASSE 4 : Tiers', balance: 0 },
          { id: '5', label: 'CLASSE 5 : Trésorerie', balance: 0 },
          { id: '6', label: 'CLASSE 6 : Charges', balance: 0 },
          { id: '7', label: 'CLASSE 7 : Produits', balance: 0 },
          { id: '8', label: 'CLASSE 8 : Autres Charges/Produits', balance: 0 },
      ];

      (journalEntries || []).forEach(entry => {
          const classId = entry.account.charAt(0);
          const statIndex = stats.findIndex(s => s.id === classId);
          if (statIndex !== -1) {
              let amount = 0;
              if (['2', '3', '5', '6'].includes(classId)) {
                  amount = entry.debit - entry.credit;
              } else {
                  amount = entry.credit - entry.debit;
              }
              stats[statIndex].balance += amount;
          }
      });
      return stats;
  }, [journalEntries]);

  const balanceStructure = useMemo(() => {
      const assets = accountStats.find(s => s.id === '2')?.balance || 0;
      const circulating = (accountStats.find(s => s.id === '3')?.balance || 0) + (accountStats.find(s => s.id === '4')?.balance || 0);
      const treasury = accountStats.find(s => s.id === '5')?.balance || 0;
      
      return [
          { name: 'Actif Immob.', value: Math.max(0, assets), color: '#3b82f6' },
          { name: 'Actif Circ.', value: Math.max(0, circulating), color: '#10b981' },
          { name: 'Trésorerie', value: Math.max(0, treasury), color: '#f59e0b' },
      ];
  }, [accountStats]);

  const financeKPIs = useMemo(() => {
    // CA Émis = Factures émises (exclut DRAFT et CANCELLED)
    const totalCAEmis = (invoices || [])
      .filter(inv => inv.status !== 'DRAFT' && inv.status !== 'CANCELLED')
      .reduce((sum, inv) => sum + inv.amount, 0);
    
    // Encaissements = Factures payées uniquement
    const totalEncaissements = (invoices || [])
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.amount, 0);
    
    // Taux de recouvrement = Encaissements / CA Émis
    const tauxRecouvrement = totalCAEmis > 0 ? Math.round((totalEncaissements / totalCAEmis) * 100) : 0;
    
    const totalCharges = Math.abs(accountStats.find(s => s.id === '6')?.balance || 0);
    const resultatNet = totalEncaissements - totalCharges;
    const margePercent = totalEncaissements > 0 ? Math.round((resultatNet / totalEncaissements) * 100) : 0;
    
    return { totalCAEmis, totalEncaissements, tauxRecouvrement, totalCharges, resultatNet, margePercent };
  }, [invoices, accountStats]);

  const top5ClientsImpayes = useMemo(() => {
    const unpaidByClient: Record<string, { clientId: string; clientName: string; totalUnpaid: number; invoiceCount: number }> = {};
    
    (invoices || [])
      .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
      .forEach(inv => {
        const clientId = inv.clientId || 'unknown';
        const client = (clients || []).find(c => c.id === clientId);
        const clientName = client?.name || 'Client inconnu';
        
        if (!unpaidByClient[clientId]) {
          unpaidByClient[clientId] = { clientId, clientName, totalUnpaid: 0, invoiceCount: 0 };
        }
        unpaidByClient[clientId].totalUnpaid += inv.amount;
        unpaidByClient[clientId].invoiceCount += 1;
      });
    
    return Object.values(unpaidByClient)
      .sort((a, b) => b.totalUnpaid - a.totalUnpaid)
      .slice(0, 5);
  }, [invoices, clients]);

  // Calcul des données mensuelles (encaissements, dépenses, solde) - 6 derniers mois
  const monthlyRevenueData = useMemo(() => {
    const now = new Date();
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const data = [];
    
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      
      // Encaissements du mois (paiements entrants)
      const monthPaymentsIn = (payments || []).filter(p => {
        if (p.type !== 'INCOMING') return false;
        const pDate = safeToDate(p.date);
        if (!pDate) return false;
        return pDate >= monthStart && pDate <= monthEnd;
      });
      const encaissements = monthPaymentsIn.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Dépenses du mois (écritures classe 6 du journal)
      const monthExpenses = (journalEntries || []).filter(e => {
        const eDate = safeToDate(e.date);
        if (!eDate) return false;
        return e.account.startsWith('6') && eDate >= monthStart && eDate <= monthEnd;
      });
      const depenses = monthExpenses.reduce((sum, e) => sum + (e.debit || 0), 0);
      
      // Solde net du mois
      const solde = encaissements - depenses;
      
      data.push({
        month: monthNames[targetDate.getMonth()],
        encaissements,
        depenses,
        solde
      });
    }
    
    return data;
  }, [payments, journalEntries]);

  // Évolution du solde bancaire (6 derniers mois) - basé sur la classe 5 du journal
  const bankBalanceData = useMemo(() => {
    const now = new Date();
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const data = [];
    let cumulativeSolde = 0;
    
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      
      // Mouvements bancaires du mois (classe 5)
      const monthBankEntries = (journalEntries || []).filter(e => {
        const eDate = safeToDate(e.date);
        if (!eDate) return false;
        return e.account.startsWith('5') && eDate >= monthStart && eDate <= monthEnd;
      });
      
      const monthDebit = monthBankEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const monthCredit = monthBankEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
      cumulativeSolde += (monthDebit - monthCredit);
      
      data.push({
        month: monthNames[targetDate.getMonth()],
        solde: Math.max(0, cumulativeSolde)
      });
    }
    
    return data;
  }, [journalEntries]);

  // Données budgétaires (segmentées par tenant)
  const budgetData = useMemo(() => {
    // Catégories principales de charges (classe 6)
    const categories = [
      { code: '60', name: 'Achats' },
      { code: '61', name: 'Services ext.' },
      { code: '62', name: 'Autres serv.' },
      { code: '63', name: 'Impôts' },
      { code: '64', name: 'Personnel' },
      { code: '65', name: 'Autres chg.' }
    ];
    
    return categories.map(cat => {
      const reel = (journalEntries || [])
        .filter(e => e.account.startsWith(cat.code))
        .reduce((sum, e) => sum + (e.debit || 0), 0);
      
      // Budget réel pour le tenant sélectionné
      const matchingBudget = (budgets || []).find(b => b.category.includes(cat.name) || b.accountPrefix === cat.code);
      const budgetAmount = matchingBudget ? matchingBudget.allocatedAmount : (reel > 0 ? reel * 1.2 : 0);
      
      return {
        category: cat.name,
        budget: Math.round(budgetAmount),
        reel: Math.round(reel),
        ecart: Math.round(budgetAmount - reel)
      };
    }).filter(b => b.reel > 0 || b.budget > 0);
  }, [journalEntries, budgets]);

  // Historique des activités récentes
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'payment' | 'invoice' | 'expense' | 'entry';
      description: string;
      amount: number;
      date: string;
    }> = [];
    
    // Paiements récents
    (payments || []).slice(0, 5).forEach(p => {
      const client = clients?.find(c => c.id === p.clientId) || tiers?.find(t => t.id === p.clientId);
      activities.push({
        id: `pay-${p.id}`,
        type: 'payment',
        description: `Paiement ${client?.name || 'Client'}`,
        amount: p.amount,
        date: p.date
      });
    });
    
    // Factures émises récentes
    (invoices || []).filter(i => i.status !== 'DRAFT').slice(0, 5).forEach(inv => {
      activities.push({
        id: `inv-${inv.id}`,
        type: 'invoice',
        description: `Facture ${inv.number}`,
        amount: inv.amount,
        date: inv.date
      });
    });
    
    // Écritures de charges récentes (classe 6)
    (journalEntries || []).filter(e => e.account.startsWith('6')).slice(0, 5).forEach(e => {
      activities.push({
        id: `exp-${e.id}`,
        type: 'expense',
        description: e.label,
        amount: e.debit,
        date: e.date
      });
    });
    
    // Trier par date décroissante
    return activities
      .sort((a, b) => {
        const dateA = safeToDate(a.date);
        const dateB = safeToDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);
  }, [payments, invoices, journalEntries, clients, tiers]);

  // Balance Âgée (0-30, 31-60, 61-90, +90)
  const agingBalance = useMemo(() => {
    const today = new Date();
    const categories = [
      { name: '0-30 jours', value: 0, color: '#10b981' }, // Vert
      { name: '31-60 jours', value: 0, color: '#f59e0b' }, // Orange
      { name: '61-90 jours', value: 0, color: '#ef4444' }, // Rouge
      { name: '+90 jours', value: 0, color: '#7f1d1d' }, // Marron/Sombre
    ];

    (invoices || [])
      .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT')
      .forEach(inv => {
        const dueDate = new Date(inv.dueDate);
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return; // Pas encore en retard

        if (diffDays <= 30) categories[0].value += inv.amount;
        else if (diffDays <= 60) categories[1].value += inv.amount;
        else if (diffDays <= 90) categories[2].value += inv.amount;
        else categories[3].value += inv.amount;
      });

    return categories;
  }, [invoices]);

  // DSO (Days Sales Outstanding) = (Encours Client / CA 12 derniers mois) * 365
  // Uses rolling 12-month revenue as denominator to avoid distortion by old invoices
  const dso = useMemo(() => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    const recentCA = (invoices || [])
      .filter(inv => {
        if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false;
        const d = safeToDate(inv.date);
        return d !== null && d >= cutoff;
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    const totalUnpaid = (invoices || [])
      .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT')
      .reduce((sum, inv) => sum + (inv.amount - ((inv as Invoice).paidAmount || 0)), 0);

    if (recentCA === 0) return 0;
    return Math.round((totalUnpaid / recentCA) * 365);
  }, [invoices]);

  const totalAllocatedAmount = paymentForm.allocations.reduce((sum, a) => sum + a.amount, 0);

  // Filtered & Paginated Data
  const filteredJournal = useMemo(() => (journalEntries || []).filter(e => {
    // Filtre par recherche texte
    const matchesSearch = e.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.account.includes(searchTerm) || 
      e.ref.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtre par classe comptable (premier chiffre du compte)
    const matchesClass = !selectedClassFilter || e.account.startsWith(selectedClassFilter);
    
    return matchesSearch && matchesClass;
  }), [journalEntries, searchTerm, selectedClassFilter]);

  const filteredPayments = useMemo(() => (payments || []).filter(p => 
    (p.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.invoiceId && p.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [payments, searchTerm]);

  const totalPages = activeTab === 'FINANCE' 
    ? Math.ceil(filteredPayments.length / ITEMS_PER_PAGE)
    : Math.ceil(filteredJournal.length / ITEMS_PER_PAGE);

  const paginatedData = activeTab === 'FINANCE'
    ? filteredPayments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : filteredJournal.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // === HANDLERS ===

  const toggleColumn = useCallback((id: JournalColumnId) => {
      setVisibleColumns(prev => {
          const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
          try { localStorage.setItem('accounting_visible_columns', JSON.stringify(next)); } catch { /* ignore */ }
          return next;
      });
  }, []);

  const togglePaymentColumn = useCallback((id: PaymentColumnId) => {
      setVisiblePaymentColumns(prev => {
          const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
          try { localStorage.setItem('accounting_visible_payment_columns', JSON.stringify(next)); } catch { /* ignore */ }
          return next;
      });
  }, []);

  // Entry Modal Handlers
  const handleAddEntryLine = useCallback(() => {
      setEntryForm(prev => ({
          ...prev,
          lines: [...prev.lines, { account: '', label: prev.label, debit: 0, credit: 0 }]
      }));
  }, []);

  const handleRemoveEntryLine = useCallback((index: number) => {
      if (entryForm.lines.length <= 2) return;
      setEntryForm(prev => ({
          ...prev,
          lines: prev.lines.filter((_, i) => i !== index)
      }));
  }, [entryForm.lines.length]);

  const handleUpdateEntryLine = useCallback((index: number, field: string, value: string | number) => {
      setEntryForm(prev => ({
          ...prev,
          lines: prev.lines.map((line, i) => {
              if (i !== index) return line;
              if (field === 'account') {
                  const accountInfo = PLAN_COMPTABLE.find(a => String(a.code) === String(value));
                  const newLabel = (!line.label || line.label === prev.label) && accountInfo?.suggestions?.[0] 
                      ? accountInfo.suggestions[0] 
                      : line.label;
                  return { ...line, [field]: String(value), label: newLabel };
              }
              return { ...line, [field]: value };
          })
      }));
  }, []);

  const handleSaveEntry = useCallback(async (e: React.FormEvent) => {
      e.preventDefault();

      // Accounting period lock check
      if (lockDate && entryForm.date <= lockDate) {
          showToast(`Période clôturée. Aucune écriture antérieure au ${lockDate} n'est autorisée.`, 'error');
          return;
      }

      const totalDebit = entryForm.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = entryForm.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 1) {
          showToast(`L'écriture n'est pas équilibrée. Écart: ${formatPrice(totalDebit - totalCredit)}`, 'error');
          return;
      }

      const lines = entryForm.lines
          .filter(l => l.debit > 0 || l.credit > 0)
          .map(l => ({
              account_code: l.account,
              debit: l.debit || 0,
              credit: l.credit || 0,
              description: l.label || entryForm.label,
          }));

      if (lines.length < 2) {
          showToast('Une écriture comptable doit avoir au moins 2 lignes', 'error');
          return;
      }

      try {
          await createGroupedJournalEntry({
              date: entryForm.date,
              description: entryForm.label,
              reference: entryForm.ref,
              journalCode: entryForm.journalCode,
              lines,
          });
      } catch {
          showToast("Erreur lors de la création de l'écriture", 'error');
          return;
      }

      setIsEntryModalOpen(false);
      setEntryForm({
          date: new Date().toISOString().split('T')[0],
          journalCode: 'OD',
          ref: `OD-${Date.now()}`,
          label: '',
          lines: [
              { account: '', label: '', debit: 0, credit: 0 },
              { account: '', label: '', debit: 0, credit: 0 }
          ]
      });
  }, [entryForm, formatPrice, showToast, createGroupedJournalEntry]);

  // Payment Modal Handlers
  const handleAddAllocation = useCallback(() => {
      if (!selectedInvoiceToAdd) return;
      const inv = invoices.find(i => i.id === selectedInvoiceToAdd);
      if (!inv || paymentForm.allocations.find(a => a.invoiceId === selectedInvoiceToAdd)) return;

      const remainingPayment = Math.max(0, paymentForm.amount - totalAllocatedAmount);
      const amountToAllocate = remainingPayment > 0 ? Math.min(remainingPayment, inv.amount) : 0;

      // Auto-fill vehicleId from invoice licensePlate if not already set
      let autoVehicleId = paymentForm.vehicleId;
      if (!autoVehicleId && inv.licensePlate) {
          const matchedVehicle = vehicles.find(v => v.name === inv.licensePlate || v.plate === inv.licensePlate);
          if (matchedVehicle) {
              autoVehicleId = matchedVehicle.id;
          }
      }

      // Auto-fill contractId from invoice if not already set
      const autoContractId = paymentForm.contractId || inv.contractId || '';

      setPaymentForm(prev => ({
          ...prev,
          allocations: [...prev.allocations, { invoiceId: selectedInvoiceToAdd, amount: amountToAllocate }],
          vehicleId: autoVehicleId,
          contractId: autoContractId
      }));
      setSelectedInvoiceToAdd('');
  }, [selectedInvoiceToAdd, invoices, vehicles, paymentForm.allocations, paymentForm.amount, paymentForm.vehicleId, paymentForm.contractId, totalAllocatedAmount]);

  const handleRemoveAllocation = useCallback((invoiceId: string) => {
      setPaymentForm(prev => ({
          ...prev,
          allocations: prev.allocations.filter(a => a.invoiceId !== invoiceId)
      }));
  }, []);

  const handleUpdateAllocationAmount = useCallback((invoiceId: string, amount: number) => {
      setPaymentForm(prev => ({
          ...prev,
          allocations: prev.allocations.map(a => a.invoiceId === invoiceId ? { ...a, amount } : a)
      }));
  }, []);

  const handleAddPayment = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const methodDetails = [];
        if (paymentForm.method === 'CHEQUE') {
            methodDetails.push(`Chèque n°: ${paymentForm.checkNumber || '-'}`);
            methodDetails.push(`Banque: ${paymentForm.bankName || '-'}`);
        } else if (paymentForm.method === 'VIREMENT') {
            methodDetails.push(`Réf. Virement: ${paymentForm.transactionId || '-'}`);
            methodDetails.push(`Banque: ${paymentForm.bankName || '-'}`);
        } else if (paymentForm.method === 'MOBILE_MONEY') {
            methodDetails.push(`ID Trans.: ${paymentForm.transactionId || '-'}`);
            methodDetails.push(`Opérateur: ${paymentForm.bankName || '-'}`);
        }

        const fullNotes = [paymentForm.notes, ...methodDetails].filter(Boolean).join(' | ');

        const newPaymentData: Payment = {
            id: `PAY-${Date.now()}`, // Added ID generation
            tenantId: '', // Will be set by service/backend
            date: paymentForm.date,
            amount: paymentForm.amount,
            method: paymentForm.method as Payment['method'],
            type: 'INCOMING',
            reference: paymentForm.reference,
            status: 'COMPLETED',
            clientId: paymentForm.clientId,
            resellerId: paymentForm.resellerId,
            allocations: paymentForm.allocations,
            vehicleId: paymentForm.vehicleId,
            contractId: paymentForm.contractId,
            notes: fullNotes,
            createdAt: new Date().toISOString()
        };

      addPayment(newPaymentData);
      
      const tier = tiers.find(t => t.id === paymentForm.clientId);
      const clientMatch = clients.find(c => c.id === paymentForm.clientId);
      if (clientMatch) {
          generatePaymentReceipt(newPaymentData, clientMatch, invoices, branding);
      } else if (tier) {
          // Create a compatible client object from tier for receipt generation
          const clientFromTier = {
              id: tier.id,
              name: tier.name,
              email: tier.email,
              phone: tier.phone,
              address: tier.address,
          } as unknown as Client;
          generatePaymentReceipt(newPaymentData, clientFromTier, invoices, branding);
      }

      setIsPaymentModalOpen(false);
      setPaymentForm({
          clientId: '',
          resellerId: '',
          date: new Date().toISOString().split('T')[0],
          method: 'VIREMENT',
          reference: '', // Will be filled by handleOpenPaymentModal with numbering service
          amount: 0,
          allocations: [],
          vehicleId: '',
          contractId: '',
          notes: '',
          attachments: []
      });
  }, [paymentForm, addPayment, tiers, clients, invoices, branding]);

  // Save payment as draft (no receipt generation, status = DRAFT)
  const handleSaveDraft = useCallback(() => {
      const draftPaymentData: Payment = {
          id: '',
          tenantId: '',
          date: paymentForm.date,
          amount: paymentForm.amount,
          method: paymentForm.method as Payment['method'],
          type: 'INCOMING',
          reference: paymentForm.reference,
          status: 'DRAFT',
          clientId: paymentForm.clientId,
          resellerId: paymentForm.resellerId,
          allocations: paymentForm.allocations,
          vehicleId: paymentForm.vehicleId,
          contractId: paymentForm.contractId,
          notes: paymentForm.notes ? `[BROUILLON] ${paymentForm.notes}` : '[BROUILLON]',
          createdAt: new Date().toISOString()
      };

      addPayment(draftPaymentData);
      
      setIsPaymentModalOpen(false);
      setPaymentForm({
          clientId: '',
          resellerId: '',
          date: new Date().toISOString().split('T')[0],
          method: 'VIREMENT',
          reference: '', // Will be filled by handleOpenPaymentModal with numbering service
          amount: 0,
          allocations: [],
          vehicleId: '',
          contractId: '',
          notes: '',
          attachments: []
      });
  }, [paymentForm, addPayment]);

  // Reset page on tab change
  useEffect(() => {
      setCurrentPage(1);
  }, [activeTab, searchTerm]);

  return (
    <div className="sm:h-[calc(100vh-140px)] sm:flex sm:flex-col animate-in fade-in duration-500 gap-3 sm:gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg shadow-md shrink-0">
                    <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white truncate">Gestion Financière & Comptable</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Pilotage, Trésorerie et Comptabilité</p>
                </div>
            </div>
            {isSuperAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                    <Building2 className="w-3 h-3 text-blue-500" />
                    <select
                        className="text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-800 border-none rounded py-0.5 pl-1 pr-6 focus:ring-0 text-slate-600 dark:text-slate-300"
                        value={selectedResellerId}
                        onChange={(e) => setSelectedResellerId(e.target.value)}
                    >
                        <option value="ALL">Tous les revendeurs</option>
                        {resellers.map(r => (
                            <option key={r.id} value={r.tenantId}>{r.name}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>

        {/* Desktop tabs */}
        {!isMobile && (
          <div className="shrink-0">
            <Tabs tabs={visibleAccountingTabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as AccountingTab)} />
          </div>
        )}

        <MobileTabLayout
          tabs={visibleAccountingTabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as AccountingTab)}
          backLabel="Comptabilité"
        >
        {/* Content */}
        <div className="flex-1 min-h-0">
            {activeTab === 'STATS' && (
                journalEntries.length === 0 && invoices.length === 0 && payments.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                        <EmptyState
                            icon={BarChartIcon}
                            title="Aucune donnée financière"
                            description="Créez des factures ou des paiements pour voir les statistiques."
                        />
                    </div>
                ) : (
                    <StatsTabPartial
                        financeKPIs={{...financeKPIs, dso} as typeof financeKPIs & { dso: number }}
                        top5ClientsImpayes={top5ClientsImpayes}
                        balanceStructure={balanceStructure}
                        agingBalance={agingBalance}
                        monthlyRevenueData={monthlyRevenueData}
                        bankBalanceData={bankBalanceData}
                        budgetData={budgetData}
                        recentActivity={recentActivity}
                        isSuperAdmin={isSuperAdmin}
                    />
                )
            )}
            {activeTab === 'FINANCE' && (
                payments.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                        <DollarSign className="w-16 h-16 text-slate-200 dark:text-slate-700 mb-4" />
                        <p className="text-lg font-semibold text-slate-500">Aucun paiement enregistré</p>
                        <p className="text-sm text-slate-400 mt-1">Les paiements reçus apparaîtront ici</p>
                    </div>
                ) : (
                    <FinanceTabPartial
                        payments={payments || []}
                        clients={clients || []}
                        tiers={tiers || []}
                        contracts={contracts || []}
                        invoices={invoices || []}
                        paginatedData={paginatedData as Payment[]}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        setCurrentPage={setCurrentPage}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        visiblePaymentColumns={visiblePaymentColumns}
                        togglePaymentColumn={togglePaymentColumn}
                        onOpenPaymentModal={handleOpenPaymentModal}
                        setPaymentForm={setPaymentForm}
                        formatPrice={formatPrice}
                        isSuperAdmin={isSuperAdmin}
                    />
                )
            )}
            {activeTab === 'RECOVERY' && (
                <RecoveryView 
                    invoices={invoices as unknown as (Invoice & { daysOverdue: number; recoveryLevel: string })[]}
                    clients={clients || []} 
                    tasks={tasks || []} 
                    isSuperAdmin={isSuperAdmin}
                    resellers={resellers}
                />
            )}
            {activeTab === 'BUDGET' && (
                <BudgetView 
                    budgets={budgets || []} 
                    journalEntries={journalEntries || []} 
                    isSuperAdmin={isSuperAdmin}
                    resellers={resellers}
                />
            )}
            {activeTab === 'ACCOUNTING' && (
                <AccountingContentPartial
                    accountStats={accountStats}
                    journalEntries={journalEntries || []}
                    paginatedData={paginatedData as JournalEntry[]}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    setCurrentPage={setCurrentPage}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    visibleColumns={visibleColumns}
                    toggleColumn={toggleColumn}
                    lockDate={lockDate}
                    setLockDate={setLockDate}
                    selectedClassFilter={selectedClassFilter}
                    setSelectedClassFilter={setSelectedClassFilter}
                    onOpenEntryModal={() => setIsEntryModalOpen(true)}
                    formatPrice={formatPrice}
                />
            )}
            {activeTab === 'EXPENSES' && (
                <SupplierInvoicesView 
                    supplierInvoices={supplierInvoices || []}
                    isSuperAdmin={isSuperAdmin}
                    resellers={resellers}
                />
            )}
            {activeTab === 'BANKING' && (
                <BankReconciliationView 
                    bankTransactions={bankTransactions || []}
                    invoices={invoices || []}
                    supplierInvoices={supplierInvoices || []}
                    isSuperAdmin={isSuperAdmin}
                    resellers={resellers}
                />
            )}
            {activeTab === 'CASH' && (
                <CashView 
                    journalEntries={journalEntries || []}
                    isSuperAdmin={isSuperAdmin}
                    resellers={resellers}
                />
            )}
            {activeTab === 'REPORTS' && (
                <ReportsView 
                    journalEntries={journalEntries || []}
                    isSuperAdmin={isSuperAdmin}
                    resellers={resellers}
                />
            )}
        </div>

        {/* Modals */}
        <EntryModal 
            isOpen={isEntryModalOpen}
            onClose={() => setIsEntryModalOpen(false)}
            entryForm={entryForm}
            setEntryForm={setEntryForm}
            onSubmit={handleSaveEntry}
            onAddLine={handleAddEntryLine}
            onRemoveLine={handleRemoveEntryLine}
            onUpdateLine={handleUpdateEntryLine}
            formatPrice={formatPrice}
        />

        <PaymentModal 
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            paymentForm={paymentForm}
            setPaymentForm={setPaymentForm}
            onSubmit={handleAddPayment}
            onSaveDraft={handleSaveDraft}
            tiers={tiers || []}
            clients={clients || []}
            invoices={invoices || []}
            vehicles={vehicles || []}
            contracts={contracts || []}
            selectedInvoiceToAdd={selectedInvoiceToAdd}
            setSelectedInvoiceToAdd={setSelectedInvoiceToAdd}
            totalAllocatedAmount={totalAllocatedAmount}
            onAddAllocation={handleAddAllocation}
            onRemoveAllocation={handleRemoveAllocation}
            onUpdateAllocationAmount={handleUpdateAllocationAmount}
            formatPrice={formatPrice}
        />
        </MobileTabLayout>
    </div>
  );
};
