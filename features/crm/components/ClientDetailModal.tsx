import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  MoreHorizontal,
  Plus,
  Calendar,
  Building2,
  Mail,
  Phone,
  X,
  Truck,
  Search,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Edit2,
  MapPin,
  CreditCard,
  MessageSquare,
  FileSpreadsheet,
  Send,
  Languages,
  Briefcase as BriefcaseIcon,
  Bookmark,
  BarChart3,
  CheckSquare,
  Receipt,
  FileCheck,
  Wrench,
  LifeBuoy,
  Book,
  Download,
  Trash2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Client } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useCurrency } from '../../../hooks/useCurrency';
import { useConfirmDialog } from '../../../components/ConfirmDialog';

// --- MOCK DATA GENERATORS ---
const generateMockPayments = (count: number) =>
  Array.from({ length: count }).map((_, i) => ({
    id: `PMT-${900 + i}`,
    date: new Date(Date.now() - i * 50000000).toLocaleDateString('fr-FR'),
    method: ['Virement', 'Chèque', 'Carte'][i % 3],
    amount: (Math.random() * 5000).toFixed(2),
    ref: `REF-${Math.floor(Math.random() * 10000)}`,
  }));

const generateMockJournals = (count: number) =>
  Array.from({ length: count }).map((_, i) => ({
    id: `JRN-${i}`,
    date: new Date(Date.now() - i * 5000000).toLocaleDateString('fr-FR'),
    code: ['411100', '706000', '445710'][i % 3],
    label: `Ecriture comptable ${i}`,
    debit: i % 2 === 0 ? (Math.random() * 1000).toFixed(2) : 0,
    credit: i % 2 !== 0 ? (Math.random() * 1000).toFixed(2) : 0,
  }));

// --- STATIC DATA ---
const MOCK_MAILS = [
  {
    id: 'MAIL-01',
    date: '2023-10-01',
    subject: 'Bienvenue chez Trackyu GPS',
    type: 'Automatique',
    status: 'Lu',
    content:
      "Bonjour, \n\nNous sommes ravis de vous compter parmi nos nouveaux clients. Votre espace est désormais configuré.\n\nCordialement,\nL'équipe Trackyu GPS.",
  },
  {
    id: 'MAIL-02',
    date: '2023-10-25',
    subject: 'Votre facture #FAC-2023-899',
    type: 'Facturation',
    status: 'Lu',
    content:
      "Cher client,\n\nVeuillez trouver ci-joint votre facture du mois d'octobre. Le montant est à régler avant le 30/11.\n\nService Comptabilité.",
  },
  {
    id: 'MAIL-03',
    date: '2023-11-20',
    subject: 'Rappel de paiement',
    type: 'Relance',
    status: 'Envoyé',
    content:
      "Sauf erreur de notre part, nous n'avons pas reçu le règlement de la facture #FAC-2023-899. Merci de régulariser la situation.",
  },
];

const INITIAL_COMMENTS = [
  {
    id: 'COM-01',
    date: '2023-09-15 10:30',
    author: 'Sophie Vente',
    text: 'Client rencontré au salon Logistique. Très intéressé par le module carburant.',
  },
  { id: 'COM-02', date: '2023-10-02 14:15', author: 'Admin', text: 'Compte activé, 5 véhicules ajoutés.' },
];

const MOCK_STATEMENT_LINES = [
  { date: '01/01/2024', ref: 'REPORT', label: 'Report à Nouveau', debit: 0, credit: 0, balance: 0 },
  { date: '15/01/2024', ref: 'FAC-2024-001', label: 'Facture Janvier', debit: 15000, credit: 0, balance: -15000 },
  { date: '20/01/2024', ref: 'VIR-0992', label: 'Règlement Client', debit: 0, credit: 15000, balance: 0 },
  { date: '15/02/2024', ref: 'FAC-2024-045', label: 'Facture Février', debit: 22500, credit: 0, balance: -22500 },
  { date: '15/03/2024', ref: 'FAC-2024-089', label: 'Facture Mars', debit: 22500, credit: 0, balance: -45000 },
];

const MOCK_REVENUE_DATA = [
  { month: 'Jan', amount: 45000 },
  { month: 'Fév', amount: 48000 },
  { month: 'Mar', amount: 42000 },
  { month: 'Avr', amount: 52000 },
  { month: 'Mai', amount: 55000 },
  { month: 'Juin', amount: 60000 },
];

const TRANSACTION_SUBTABS = [
  { id: 'INVOICES', label: 'Factures', icon: Receipt },
  { id: 'PAYMENTS', label: 'Paiements', icon: CreditCard },
  { id: 'QUOTES', label: 'Devis', icon: FileText },
  { id: 'CONTRACTS', label: 'Contrats', icon: FileCheck },
  { id: 'INTERVENTIONS', label: 'Interventions', icon: Wrench },
  { id: 'TICKETS', label: 'Tickets', icon: LifeBuoy },
  { id: 'JOURNALS', label: 'Journaux', icon: Book },
];

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (client: Client) => void;
  invoices: any[];
  quotes: any[];
  contracts: any[];
  interventions: any[];
  tickets: any[];
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  isOpen,
  onClose,
  onEdit,
  invoices,
  quotes,
  contracts,
  interventions,
  tickets,
}) => {
  const { showToast } = useToast();
  const { formatPrice, currency } = useCurrency();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [activeDetailTab, setActiveDetailTab] = useState('OVERVIEW');
  const [trxData, setTrxData] = useState<any>({});
  const [activeTrxSubTab, setActiveTrxSubTab] = useState('INVOICES');
  const [trxPage, setTrxPage] = useState(1);
  const [trxSearchTerm, setTrxSearchTerm] = useState('');
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [statementPeriod, setStatementPeriod] = useState('THIS_YEAR');
  const [chartPeriod, setChartPeriod] = useState('THIS_YEAR');

  // Reset state when client changes or modal opens
  // NOTE: This effect was intentionally left as a placeholder for future client-change handling.

  // Initialize data when client ID changes
  useEffect(() => {
    if (isOpen && client) {
      setActiveDetailTab('OVERVIEW');
      setTrxData({
        INVOICES: invoices.filter((i) => i.clientId === client.id || i.clientId === client.name),
        PAYMENTS: generateMockPayments(10),
        QUOTES: quotes.filter((q) => q.clientId === client.id || q.clientId === client.name),
        CONTRACTS: contracts.filter((c) => c.clientId === client.id),
        INTERVENTIONS: interventions.filter((i) => i.clientId === client.id),
        TICKETS: tickets.filter((t) => t.clientId === client.id),
        JOURNALS: generateMockJournals(25),
      });
      setComments(INITIAL_COMMENTS);
    }
  }, [client?.id, isOpen]); // Depend on ID to avoid re-running on every render if parent passes new object ref

  // Reset pagination on subtab change
  useEffect(() => {
    setTrxPage(1);
    setTrxSearchTerm('');
  }, [activeTrxSubTab]);

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: `COM-${Date.now()}`,
      date: new Date().toLocaleString(),
      author: 'Vous',
      text: newComment,
    };
    setComments([comment, ...comments]);
    setNewComment('');
    showToast('Commentaire ajouté', 'success');
  };

  const handleAddContact = () => {
    const name = prompt('Nom du contact :');
    if (name) {
      // In a real app, this would call an API
      // For now, we can't easily update the client prop since it comes from parent
      // But we can show a success message
      showToast(`Contact ${name} ajouté (simulation)`, 'success');
    }
  };

  const handleAddDocument = () => {
    // Simulate file picker
    showToast('Ouverture du sélecteur de fichiers...', 'info');
    setTimeout(() => {
      showToast('Document ajouté (simulation)', 'success');
    }, 1000);
  };

  const handleCreateInvoice = () => {
    setActiveDetailTab('TRANSACTIONS');
    setActiveTrxSubTab('INVOICES');
    // Optionally scroll to top or focus
  };

  const renderTransactionsTab = () => {
    const currentData = trxData[activeTrxSubTab] || [];
    const filteredData = currentData.filter(
      (item: Record<string, unknown>) =>
        item && Object.values(item).some((val) => String(val).toLowerCase().includes(trxSearchTerm.toLowerCase()))
    );

    const ITEMS_PER_PAGE_TRX = 8;
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE_TRX);
    const paginatedData = filteredData.slice((trxPage - 1) * ITEMS_PER_PAGE_TRX, trxPage * ITEMS_PER_PAGE_TRX);

    const renderTableContent = () => {
      switch (activeTrxSubTab) {
        case 'INVOICES':
          return (
            <>
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-xs text-[var(--text-secondary)] uppercase">
                <tr>
                  <th>Numéro</th>
                  <th>Date</th>
                  <th>Échéance</th>
                  <th className="text-right">Montant</th>
                  <th className="text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[var(--border)]">
                {paginatedData.map((i: Record<string, unknown>) => (
                  <tr key={i.id as string} className="tr-hover/50">
                    <td className="py-3 px-4 font-mono text-[var(--primary)]">{i.id as string}</td>
                    <td className="py-3 px-4">{i.date as string}</td>
                    <td className="py-3 px-4">{i.dueDate as string}</td>
                    <td className="py-3 px-4 text-right font-bold">{formatPrice(Number(i.amount))}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold border ${i.status === 'PAYÉ' ? 'bg-green-100 text-green-700 border-green-200' : i.status === 'RETARD' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}
                      >
                        {i.status as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          );
        case 'PAYMENTS':
          return (
            <>
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-xs text-[var(--text-secondary)] uppercase">
                <tr>
                  <th>Réf</th>
                  <th>Date</th>
                  <th>Méthode</th>
                  <th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[var(--border)]">
                {paginatedData.map((p: Record<string, unknown>) => (
                  <tr key={p.id as string} className="tr-hover/50">
                    <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">{p.ref as string}</td>
                    <td className="py-3 px-4">{p.date as string}</td>
                    <td className="py-3 px-4">{p.method as string}</td>
                    <td className="py-3 px-4 text-right font-bold text-green-600">+{formatPrice(Number(p.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </>
          );
        case 'INTERVENTIONS':
          return (
            <>
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-xs text-[var(--text-secondary)] uppercase">
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Technicien</th>
                  <th className="text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[var(--border)]">
                {paginatedData.map((int: Record<string, unknown>) => (
                  <tr key={int.id as string} className="tr-hover/50">
                    <td className="py-3 px-4 font-mono text-purple-600">{int.id as string}</td>
                    <td className="py-3 px-4">{int.date as string}</td>
                    <td className="py-3 px-4">{int.type as string}</td>
                    <td className="py-3 px-4">{int.tech as string}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-1 bg-[var(--bg-elevated)] rounded text-xs font-bold">
                        {int.status as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          );
        case 'JOURNALS':
          return (
            <>
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-xs text-[var(--text-secondary)] uppercase">
                <tr>
                  <th>Date</th>
                  <th>Compte</th>
                  <th>Libellé</th>
                  <th className="text-right">Débit</th>
                  <th className="text-right">Crédit</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[var(--border)]">
                {paginatedData.map((j: Record<string, unknown>) => (
                  <tr key={j.id as string} className="tr-hover/50">
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{j.date as string}</td>
                    <td className="py-3 px-4 font-mono text-[var(--text-primary)]">{j.code as string}</td>
                    <td className="py-3 px-4">{j.label as string}</td>
                    <td className="py-3 px-4 text-right font-mono text-[var(--text-secondary)]">
                      {(j.debit as number) > 0 ? (j.debit as number) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[var(--text-secondary)]">
                      {(j.credit as number) > 0 ? (j.credit as number) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          );
        // Generic fallback for others (Quotes, Contracts, Tickets)
        default:
          return (
            <>
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-xs text-[var(--text-secondary)] uppercase">
                <tr>
                  {Object.keys(paginatedData[0] || {})
                    .slice(0, 5)
                    .map((k) => (
                      <th key={k} className="capitalize">
                        {k}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[var(--border)]">
                {paginatedData.map((item: any, i: number) => (
                  <tr key={i} className="tr-hover/50">
                    {(item ? Object.values(item).slice(0, 5) : []).map((val: any, idx) => (
                      <td key={idx} className="py-3 px-4 text-[var(--text-secondary)]">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </>
          );
      }
    };

    return (
      <div className="h-full flex flex-col animate-in fade-in duration-300">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg overflow-x-auto max-w-full custom-scrollbar">
            {TRANSACTION_SUBTABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTrxSubTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTrxSubTab === tab.id ? 'bg-[var(--bg-elevated)] text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-muted)]'}`}
              >
                <tab.icon className="w-3 h-3" /> {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder={`Rechercher dans ${TRANSACTION_SUBTABS.find((t) => t.id === activeTrxSubTab)?.label}...`}
              className="w-full pl-9 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              value={trxSearchTerm}
              onChange={(e) => setTrxSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left">{renderTableContent()}</table>
            {paginatedData.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)]">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Aucun résultat trouvé</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-[var(--border)] border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)]">
              <button
                onClick={() => setTrxPage((p) => Math.max(1, p - 1))}
                disabled={trxPage === 1}
                className="p-1 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded disabled:opacity-30"
                title="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                Page {trxPage} / {totalPages}
              </span>
              <button
                onClick={() => setTrxPage((p) => Math.min(totalPages, p + 1))}
                disabled={trxPage === totalPages}
                className="p-1 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded disabled:opacity-30"
                title="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen || !client) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
        <div className="relative w-full max-w-6xl h-[90vh] bg-[var(--bg-elevated)] rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[var(--border)]">
          {/* SIDEBAR NAVIGATION */}
          <div className="w-64 bg-[var(--bg-elevated)] border-r border-[var(--border)] flex flex-col z-10">
            <div className="p-6 border-b border-[var(--border)] border-[var(--border)]">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4">
                {client.name.charAt(0)}
              </div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight mb-1">{client.name}</h2>
              <p className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">{client.type}</p>
              <div className="mt-4 flex gap-2">
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${client.status === 'ACTIVE' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]'}`}
                >
                  {client.status}
                </span>
                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-[var(--primary-dim)] text-[var(--primary)] border border-[var(--border)]">
                  VIP
                </span>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
              {[
                { id: 'OVERVIEW', label: "Vue d'ensemble", icon: LayoutGrid },
                { id: 'TRANSACTIONS', label: 'Transactions', icon: Receipt },
                { id: 'MAILS', label: 'Courriers', icon: Mail },
                { id: 'COMMENTS', label: 'Commentaires', icon: MessageSquare },
                { id: 'STATEMENT', label: 'Relevé de Compte', icon: FileSpreadsheet },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveDetailTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeDetailTab === item.id ? 'bg-[var(--primary-dim)] text-[var(--primary)] shadow-sm ring-1 ring-[var(--border)]' : 'text-[var(--text-secondary)] tr-hover hover:text-[var(--text-primary)] dark:hover:text-[var(--text-muted)]'}`}
                >
                  <item.icon
                    className={`w-4 h-4 ${activeDetailTab === item.id ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
                  />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-[var(--border)] border-[var(--border)]">
              <button
                onClick={async () => {
                  if (
                    await confirm({
                      message: 'Êtes-vous sûr de vouloir supprimer ce client ?',
                      title: 'Supprimer le client',
                      variant: 'danger',
                      confirmLabel: 'Supprimer',
                    })
                  ) {
                    showToast('Client supprimé (simulation)', 'error');
                    onClose();
                  }
                }}
                className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:bg-[var(--clr-danger-dim)] rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Supprimer le client
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-elevated)]/50 bg-[var(--bg-surface)]/50">
            {/* Header */}
            <div className="h-16 bg-[var(--bg-elevated)] border-b border-[var(--border)] flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Users className="w-4 h-4" />
                <ChevronRight className="w-4 h-4" />
                <span>Détails Client</span>
                <ChevronRight className="w-4 h-4" />
                <span className="font-bold text-[var(--text-primary)]">
                  {activeDetailTab === 'OVERVIEW' ? "Vue d'ensemble" : activeDetailTab}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => showToast("Plus d'options...", 'info')}
                  className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  title="Plus d'options"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[var(--clr-danger-dim)] rounded-lg text-[var(--text-muted)] hover:text-red-500 transition-colors"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {/* 1. VUE D'ENSEMBLE */}
              {activeDetailTab === 'OVERVIEW' && (
                <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* COLONNE GAUCHE : INFOS PRINCIPALES */}
                  <div className="col-span-12 lg:col-span-8 space-y-6">
                    {/* Carte Identité */}
                    <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Building2 className="w-32 h-32 text-[var(--text-primary)]" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <h3 className="page-title mb-1">Informations Générales</h3>
                            <p className="text-sm text-[var(--text-secondary)]">Données administratives et légales</p>
                          </div>
                          <button
                            onClick={() => (onEdit ? onEdit(client) : showToast('Modification du client...', 'info'))}
                            className="p-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] transition-colors"
                            title="Modifier les informations"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          {/* Contact Principal */}
                          <div className="p-3 bg-[var(--primary-dim)] rounded-lg border border-[var(--border)]">
                            <p className="text-[10px] font-bold text-[var(--primary)] uppercase mb-2">
                              Contact Principal
                            </p>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center font-bold text-xs text-[var(--primary)] shadow-sm">
                                {client.contactName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-[var(--text-primary)] text-sm">{client.contactName}</p>
                                <p className="text-xs text-[var(--text-secondary)] mb-1">Responsable Flotte</p>
                                <div className="flex gap-2">
                                  <a
                                    href={`mailto:${client.email}`}
                                    className="p-1 bg-[var(--bg-elevated)] rounded hover:text-[var(--primary)] transition-colors"
                                    title={`Envoyer un email à ${client.email}`}
                                  >
                                    <Mail className="w-3 h-3" />
                                  </a>
                                  <a
                                    href={`tel:${client.phone}`}
                                    className="p-1 bg-[var(--bg-elevated)] rounded hover:text-green-600 transition-colors"
                                    title={`Appeler ${client.phone}`}
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Contact Secondaire */}
                          <div className="p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] border-[var(--border)]">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">
                              Contact Secondaire
                            </p>
                            {client.secondContactName ? (
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                                  {client.secondContactName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-[var(--text-primary)] text-sm">
                                    {client.secondContactName}
                                  </p>
                                  <p className="text-xs text-[var(--text-muted)] italic mt-0.5">
                                    Données contact non renseignées
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-[var(--text-muted)] italic">Aucun contact secondaire</p>
                            )}
                          </div>
                        </div>

                        {/* Bloc Détails Société */}
                        <div className="grid grid-cols-2 gap-4 text-sm mt-6">
                          <div className="col-span-2">
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Adresse Siège</label>
                            <div className="font-medium text-[var(--text-primary)] flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                              <span>
                                {client.address}
                                <br />
                                {client.city && <span className="text-[var(--text-secondary)]">{client.city}, </span>}
                                {client.country && <span className="font-bold">{client.country}</span>}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Date Création</label>
                            <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-[var(--text-muted)]" />{' '}
                              {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Langue</label>
                            <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                              <Languages className="w-3 h-3 text-[var(--text-muted)]" /> {client.language || 'Français'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Secteur</label>
                            <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                              <BriefcaseIcon className="w-3 h-3 text-[var(--text-muted)]" />{' '}
                              {client.sector || 'Non défini'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Segment</label>
                            <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                              <Bookmark className="w-3 h-3 text-[var(--text-muted)]" /> {client.segment || 'Standard'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Revendeur</label>
                            <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                              <Users className="w-3 h-3 text-[var(--text-muted)]" /> {client.resellerName || 'Global'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Infos Financières */}
                      <div className="mt-6 pt-4 border-t border-[var(--border)] border-[var(--border)] grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-[var(--text-secondary)] mb-1">Conditions Paiement</label>
                          <div className="font-bold text-[var(--text-primary)] text-sm">
                            {client.paymentTerms || '30 jours'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--text-secondary)] mb-1">Devise</label>
                          <div className="font-bold text-[var(--text-primary)] text-sm">{client.currency || 'XOF'}</div>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--text-secondary)] mb-1">Encours Autorisé</label>
                          <div className="font-bold text-[var(--text-primary)] text-sm">
                            1 000 000 {client.currency}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* HISTOGRAMME CHIFFRE D'AFFAIRES */}
                    <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="section-title flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" /> Chiffre d'Affaires
                        </h4>
                        <select
                          className="text-xs border border-[var(--border)] rounded bg-[var(--bg-elevated)] px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                          value={chartPeriod}
                          onChange={(e) => setChartPeriod(e.target.value)}
                        >
                          <option value="THIS_YEAR">Cette Année</option>
                          <option value="LAST_YEAR">Année N-1</option>
                        </select>
                      </div>
                      <div className="h-[250px] w-full" style={{ minHeight: 240, minWidth: 200 }}>
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          minHeight={240}
                          minWidth={200}
                          initialDimension={{ width: 200, height: 240 }}
                        >
                          <BarChart data={MOCK_REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                              dataKey="month"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              dy={10}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              }}
                              formatter={(value: number) => [formatPrice(value), 'CA HT']}
                            />
                            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* COLONNE DROITE : CONTACTS & ACTIONS */}
                  <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* BLOC CONTACTS */}
                    <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="section-title">Personnes à contacter</h4>
                        <button
                          onClick={handleAddContact}
                          className="p-1 bg-[var(--primary-dim)] hover:bg-[var(--primary-dim)] rounded text-[var(--primary)] transition-colors"
                          title="Ajouter un contact"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {client.contacts && client.contacts.length > 0 ? (
                          client.contacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="flex items-center gap-3 p-2 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors border border-transparent hover:border-[var(--border)]"
                            >
                              <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] font-bold text-xs">
                                {contact.name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{contact.name}</p>
                                <p className="text-xs text-[var(--text-secondary)] truncate">{contact.role}</p>
                                <div className="flex gap-2 mt-1">
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                                  >
                                    <Mail className="w-3 h-3" /> Email
                                  </a>
                                  <a
                                    href={`tel:${contact.phone}`}
                                    className="text-xs text-green-600 hover:underline flex items-center gap-1"
                                  >
                                    <Phone className="w-3 h-3" /> Tél
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[var(--text-muted)] italic text-center py-4">
                            Aucun contact additionnel.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* BLOC FLOTTE */}
                    <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                      <h4 className="section-title mb-3 flex items-center gap-2">
                        <Truck className="w-4 h-4" /> Flotte
                      </h4>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="p-3 bg-[var(--bg-elevated)] rounded text-center">
                          <p className="page-title">12</p>
                          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Véhicules</p>
                        </div>
                        <div className="p-3 bg-[var(--clr-success-dim)] rounded text-center">
                          <p className="text-xl font-bold text-[var(--clr-success-strong)]">10</p>
                          <p className="text-[10px] text-green-600 dark:text-green-500 uppercase">Actifs</p>
                        </div>
                      </div>
                      <button
                        onClick={() => showToast('Navigation vers la flotte...', 'info')}
                        className="w-full py-2 text-xs font-bold text-[var(--primary)] border border-[var(--border)] bg-[var(--primary-dim)] hover:bg-[var(--primary-dim)] rounded transition-colors"
                      >
                        Voir la liste des véhicules
                      </button>
                    </div>

                    {/* BLOC ACTIONS RAPIDES */}
                    <div className="bg-[var(--primary-dim)] p-4 rounded-xl border border-[var(--border)]">
                      <h4 className="text-sm font-bold text-[var(--primary)] dark:text-[var(--primary)] mb-2">
                        Actions Rapides
                      </h4>
                      <div className="space-y-2">
                        <button
                          onClick={handleCreateInvoice}
                          className="w-full py-2 bg-[var(--bg-elevated)] text-[var(--primary)] text-xs font-bold rounded border border-[var(--border)] hover:shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3 h-3" /> Créer une Facture
                        </button>
                        <button
                          onClick={() => setActiveDetailTab('MAILS')}
                          className="w-full py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-bold rounded border border-[var(--border)] hover:shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                          <Mail className="w-3 h-3" /> Envoyer Email
                        </button>
                        <button
                          onClick={() => showToast('Création de tâche...', 'info')}
                          className="w-full py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-bold rounded border border-[var(--border)] hover:shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                          <CheckSquare className="w-3 h-3" /> Créer Tâche
                        </button>
                      </div>
                    </div>

                    {/* DOCUMENTS IMPORTANTS */}
                    <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="section-title flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Documents Importants
                        </h4>
                        <button
                          onClick={handleAddDocument}
                          className="text-xs font-bold text-[var(--primary)] flex items-center gap-1 hover:underline"
                        >
                          <Plus className="w-3 h-3" /> Ajouter
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] border-[var(--border)]">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[var(--primary)]" />
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">Contrat d'Abonnement - Acme Corp</p>
                              <p className="text-xs text-[var(--text-secondary)]">PDF, 250 Ko</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => showToast('Téléchargement...', 'info')}
                              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] rounded"
                              title="Télécharger"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => showToast('Suppression...', 'error')}
                              className="p-1.5 text-[var(--text-muted)] hover:text-red-600 rounded"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] border-[var(--border)]">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[var(--primary)]" />
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">Facture - Janvier 2024</p>
                              <p className="text-xs text-[var(--text-secondary)]">PDF, 150 Ko</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => showToast('Téléchargement...', 'info')}
                              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] rounded"
                              title="Télécharger"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => showToast('Suppression...', 'error')}
                              className="p-1.5 text-[var(--text-muted)] hover:text-red-600 rounded"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. TRANSACTIONS (NOUVELLE VUE DETAILLEE) */}
              {activeDetailTab === 'TRANSACTIONS' && renderTransactionsTab()}

              {/* 3. COURRIERS */}
              {activeDetailTab === 'MAILS' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-end">
                    <button
                      onClick={() => showToast('Envoi de message...', 'info')}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--primary-light)] shadow-sm"
                    >
                      <Send className="w-4 h-4" /> Envoyer un message
                    </button>
                  </div>
                  <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
                    {MOCK_MAILS.map((mail, i) => (
                      <div
                        key={mail.id}
                        className={`p-4 flex items-center justify-between tr-hover/50 group relative cursor-pointer ${i !== MOCK_MAILS.length - 1 ? 'border-b border-[var(--border)] border-[var(--border)]' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-[var(--primary-dim)] rounded-full text-[var(--primary)]">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-[var(--text-primary)] text-sm">{mail.subject}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {mail.date} • {mail.type}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-bold rounded uppercase">
                          {mail.status}
                        </span>

                        {/* Tooltip Aperçu du Mail au survol */}
                        <div className="hidden group-hover:block absolute top-full left-12 right-12 z-20 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl rounded-lg p-3 mt-1 animate-in fade-in slide-in-from-top-1">
                          <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                            {mail.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. COMMENTAIRES */}
              {activeDetailTab === 'COMMENTS' && (
                <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {comments.length === 0 ? (
                      <div className="text-center text-[var(--text-muted)] italic py-10">
                        Aucun commentaire. Soyez le premier à en ajouter un.
                      </div>
                    ) : (
                      comments.map((com) => (
                        <div key={com.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] flex items-center justify-center font-bold text-xs text-[var(--text-secondary)] shrink-0">
                            {com.author.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="bg-[var(--bg-elevated)] p-3 rounded-lg rounded-tl-none border border-[var(--border)] shadow-sm">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-xs text-[var(--text-primary)]">{com.author}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">{com.date}</span>
                              </div>
                              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{com.text}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="relative mt-auto bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--border)] shadow-sm">
                    <textarea
                      className="w-full p-2 bg-transparent text-sm resize-none focus:outline-none text-[var(--text-primary)] placeholder-slate-400"
                      placeholder="Ajouter une note interne ou un commentaire..."
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendComment();
                        }
                      }}
                    ></textarea>
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={handleSendComment}
                        disabled={!newComment.trim()}
                        className="p-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. RELEVE */}
              {activeDetailTab === 'STATEMENT' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm gap-4">
                    <div>
                      <p className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                        Solde au {new Date().toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                        - 45 000 <span className="text-sm font-normal text-[var(--text-secondary)]">{currency}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <select
                        className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        value={statementPeriod}
                        onChange={(e) => setStatementPeriod(e.target.value)}
                      >
                        <option value="THIS_YEAR">Année en cours</option>
                        <option value="LAST_MONTH">Mois Dernier</option>
                        <option value="LAST_YEAR">Année N-1</option>
                        <option value="CUSTOM">Personnalisé...</option>
                      </select>
                      <button
                        onClick={() => showToast('Envoi par email...', 'info')}
                        className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors"
                        title="Envoyer par Email"
                      >
                        <Mail className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => showToast('Téléchargement PDF...', 'info')}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--primary-light)] shadow-sm transition-colors"
                      >
                        <Download className="w-4 h-4" /> Télécharger PDF
                      </button>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden flex-1 flex flex-col">
                    <div className="p-4 border-b border-[var(--border)] border-[var(--border)] bg-[var(--bg-elevated)] flex justify-between items-center">
                      <h4 className="font-bold text-[var(--text-primary)] text-sm">
                        Détail des écritures ({statementPeriod === 'THIS_YEAR' ? '2024' : 'Période'})
                      </h4>
                      <span className="text-xs text-[var(--text-secondary)]">{MOCK_STATEMENT_LINES.length} lignes</span>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] uppercase font-bold sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 border-b border-[var(--border)]">Date</th>
                            <th className="px-4 py-3 border-b border-[var(--border)]">Réf</th>
                            <th className="px-4 py-3 border-b border-[var(--border)]">Libellé</th>
                            <th className="px-4 py-3 border-b border-[var(--border)] text-right">Débit</th>
                            <th className="px-4 py-3 border-b border-[var(--border)] text-right">Crédit</th>
                            <th className="px-4 py-3 border-b border-[var(--border)] text-right">Solde</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {MOCK_STATEMENT_LINES.map((line, i) => (
                            <tr key={i} className="tr-hover/50">
                              <td className="px-4 py-3 text-[var(--text-secondary)]">{line.date}</td>
                              <td className="px-4 py-3 font-mono text-[var(--primary)]">{line.ref}</td>
                              <td className="px-4 py-3 text-[var(--text-primary)] font-medium">{line.label}</td>
                              <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                {line.debit ? (line.debit ?? 0).toLocaleString('fr-FR') : '-'}
                              </td>
                              <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                {line.credit ? (line.credit ?? 0).toLocaleString('fr-FR') : '-'}
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-bold ${(line.balance ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}
                              >
                                {(line.balance ?? 0).toLocaleString('fr-FR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialogComponent />
    </>
  );
};
