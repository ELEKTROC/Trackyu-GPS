import React, { useMemo, useState } from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileCard, MobileCardList, MobileCardAction } from '../../../components/MobileCard';
import { useDataContext } from '../../../contexts/DataContext';
import { Card } from '../../../components/Card';
import type { Invoice, Task, Client, Tier, JournalEntry } from '../../../types';
import { useSendReminder } from '../services/recoveryService';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import {
  AlertTriangle,
  Phone,
  Mail,
  FileWarning,
  CheckCircle,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  Columns,
  X,
  Calendar,
  Download,
  Settings,
  MoreVertical,
  Eye,
} from 'lucide-react';
import { Pagination } from '../../../components/Pagination';
import { useCurrency } from '../../../hooks/useCurrency';
import { Modal } from '../../../components/Modal';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';
import { DocumentPreview } from './partials/DocumentPreview';
import { TierDetailModal } from '../../crm/components/TierDetailModal';

interface RecoveryViewProps {
  invoices: (Invoice & { daysOverdue: number; recoveryLevel: string })[];
  clients: Client[];
  tasks: Task[];
  isSuperAdmin?: boolean;
  resellers?: Tier[];
}

export const RecoveryView: React.FC<RecoveryViewProps> = ({
  invoices: allInvoices,
  clients,
  tasks,
  isSuperAdmin,
  resellers,
}) => {
  const isMobile = useIsMobile();
  const { formatPrice } = useCurrency();
  const { addTask, updateInvoice, createGroupedJournalEntry, tiers } = useDataContext();
  const { mutateAsync: sendReminderApi } = useSendReminder();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, _setItemsPerPage] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'client',
    'reseller',
    'invoice',
    'amount',
    'overdue',
    'level',
    'reminders',
    'lastReminder',
    'type',
    'notes',
    'actions',
  ]);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<(Invoice & { daysOverdue: number }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [selectedTierForModal, setSelectedTierForModal] = useState<Tier | null>(null);

  // Extend Date Modal State
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendDate, setExtendDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);

  // PTP Modal State
  const [isPTPModalOpen, setIsPTPModalOpen] = useState(false);
  const [ptpDate, setPtpDate] = useState('');
  const [ptpAmount, setPtpAmount] = useState(0);

  // Call Report State
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callNote, setCallNote] = useState('');

  // Inline Note Editing State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteValue, setTempNoteValue] = useState('');

  // Automation Settings State
  const [automationSettings, setAutomationSettings] = useState({
    level1Enabled: true,
    level1Days: 7,
    level1Action: 'EMAIL',
    level2Enabled: true,
    level2Days: 30,
    level2Action: 'EMAIL_CALL',
    level3Enabled: true,
    level3Days: 60,
    level3Action: 'LETTER',
  });

  // Bulk Reminder State
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Selection State for checkboxes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSendMode, setBulkSendMode] = useState<'EMAIL' | 'SMS' | 'WHATSAPP' | 'CALL'>('EMAIL');

  // Fonction de relance automatique en masse
  const handleBulkReminder = async () => {
    if (selectedIds.size === 0) {
      showToast('Veuillez sélectionner au moins une facture', 'warning');
      return;
    }
    setIsBulkModalOpen(true);
  };

  // Exécuter la relance en masse avec le mode choisi - CONNECTÉ À L'API BACKEND
  const executeBulkReminder = async () => {
    setIsProcessingBulk(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    const selectedInvoices = overdueInvoices.filter((inv) => selectedIds.has(inv.id));

    for (const inv of selectedInvoices) {
      try {
        // Mapper le canal: WhatsApp n'est pas supporté par le backend, fallback sur EMAIL
        const channel: 'EMAIL' | 'SMS' | 'CALL' = bulkSendMode === 'WHATSAPP' ? 'EMAIL' : bulkSendMode;

        // Appel API réel au backend
        await sendReminderApi({
          invoiceId: inv.id,
          data: {
            channel,
            customMessage: undefined,
            scheduleCall: channel === 'CALL',
          },
        });

        // Mettre à jour le compteur de relances localement pour feedback immédiat
        updateInvoice({
          ...inv,
          lastReminderDate: new Date().toISOString(),
          reminderCount: (inv.reminderCount || 0) + 1,
        });

        successCount++;
      } catch (error: unknown) {
        errorCount++;
        const client = clients.find((c) => c.id === inv.clientId);
        const errorMessage = error instanceof Error ? error.message : 'Erreur';
        errors.push(`${inv.number} (${client?.name || 'Inconnu'}): ${errorMessage}`);
      }
    }

    setIsProcessingBulk(false);
    setIsBulkModalOpen(false);
    setSelectedIds(new Set());

    // Afficher le résultat avec toast
    if (errorCount === 0) {
      showToast(TOAST.FINANCE.RECOVERY_SENT(successCount, bulkSendMode), 'success');
    } else if (successCount > 0) {
      showToast(TOAST.FINANCE.RECOVERY_PARTIAL(successCount, errorCount), 'warning');
    } else {
      showToast(mapError(errors[0] || 'Erreur inconnue', 'relance'), 'error');
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all / Deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === overdueInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(overdueInvoices.map((inv) => inv.id)));
    }
  };

  // Fonction de relance automatique selon les paramètres
  const runAutomaticReminders = () => {
    let createdCount = 0;
    const today = new Date();

    overdueInvoices.forEach((inv) => {
      // Vérifier si une relance a déjà été envoyée récemment (dernières 48h)
      if (inv.lastReminderDate) {
        const lastReminder = new Date(inv.lastReminderDate);
        const hoursSinceLastReminder = (today.getTime() - lastReminder.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastReminder < 48) return; // Éviter les doublons
      }

      // Exclure les factures en litige des relances automatiques
      if (inv.isDisputed) return;

      // Appliquer les règles selon le niveau
      if (inv.daysOverdue >= automationSettings.level3Days && automationSettings.level3Enabled) {
        handleCreateRecoveryTask(inv, 'LETTER');
        createdCount++;
      } else if (inv.daysOverdue >= automationSettings.level2Days && automationSettings.level2Enabled) {
        const action = automationSettings.level2Action === 'EMAIL_CALL' ? 'CALL' : 'EMAIL';
        handleCreateRecoveryTask(inv, action);
        createdCount++;
      } else if (inv.daysOverdue >= automationSettings.level1Days && automationSettings.level1Enabled) {
        handleCreateRecoveryTask(inv, 'EMAIL');
        createdCount++;
      }
    });

    if (createdCount > 0) {
      showToast(`Relance automatique terminée: ${createdCount} tâche(s) créée(s)`, 'success');
    } else {
      showToast('Aucune nouvelle relance nécessaire (toutes les factures ont été relancées récemment)', 'info');
    }
    setIsAutomationModalOpen(false);
  };

  // Export Function
  const handleExport = (format: 'CSV' | 'EXCEL' | 'PDF') => {
    if (format === 'CSV') {
      const headers = [
        'Client',
        'Facture',
        'Montant',
        'Retard (Jours)',
        'Niveau',
        'Relances',
        'Dernière Relance',
        'Notes',
      ];
      const rows = overdueInvoices.map((inv) => {
        const client = clients.find((c) => c.id === inv.clientId);
        return [
          client?.name || 'Inconnu',
          inv.number,
          inv.amount,
          inv.daysOverdue,
          inv.recoveryLevel,
          inv.reminderCount || 0,
          inv.lastReminderDate ? new Date(inv.lastReminderDate).toLocaleDateString('fr-FR') : '-',
          (inv.notes || '').replace(/\n/g, ' '),
        ].join(';');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `recouvrement_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      showToast(`L'export ${format} sera bientôt disponible.`, 'info');
    }
  };

  // Filter overdue invoices
  const overdueInvoices = useMemo(() => {
    const today = new Date();
    let filtered = allInvoices
      .filter((inv) => {
        if (inv.status === 'PAID' || inv.status === 'CANCELLED' || inv.status === 'DRAFT') return false;
        const dueDate = new Date(inv.dueDate);
        return dueDate < today;
      })
      .map((inv) => {
        const dueDate = new Date(inv.dueDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - dueDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Auto-assign level if not set (Simulation logic)
        let level = inv.recoveryLevel || 'NONE';
        if (level === 'NONE') {
          if (diffDays > 60) level = 'LEVEL_3';
          else if (diffDays > 30) level = 'LEVEL_2';
          else if (diffDays > 7) level = 'LEVEL_1';
        }

        return { ...inv, daysOverdue: diffDays, recoveryLevel: level };
      });

    // Apply Dispute/PTP sorting: PTP passed due first
    filtered.sort((a, b) => {
      const aIsPTPExpired = a.promiseToPayDate && new Date(a.promiseToPayDate) < today;
      const bIsPTPExpired = b.promiseToPayDate && new Date(b.promiseToPayDate) < today;
      if (aIsPTPExpired && !bIsPTPExpired) return -1;
      if (!aIsPTPExpired && bIsPTPExpired) return 1;
      return 0;
    });

    // Apply Search
    if (searchTerm) {
      filtered = filtered.filter(
        (inv) =>
          inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clients
            .find((c) => c.id === inv.clientId)
            ?.name.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Apply Client Filter
    if (clientFilter !== 'ALL') {
      filtered = filtered.filter((inv) => inv.clientId === clientFilter);
    }

    // Apply Level Filter
    if (filterLevel !== 'ALL') {
      filtered = filtered.filter((inv) => inv.recoveryLevel === filterLevel);
    }

    return filtered;
  }, [allInvoices, searchTerm, filterLevel, clientFilter, clients]);

  const {
    sortedItems: sortedOverdue,
    sortConfig: recoverySortConfig,
    handleSort: handleRecoverySort,
  } = useTableSort(overdueInvoices, { key: 'daysOverdue', direction: 'desc' });

  // Pagination
  const totalPages = Math.ceil(sortedOverdue.length / itemsPerPage);
  const paginatedInvoices = sortedOverdue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const kpis = useMemo(() => {
    const totalOverdue = overdueInvoices.reduce((acc, curr) => acc + curr.amount, 0);
    const count = overdueInvoices.length;
    const criticalCount = overdueInvoices.filter((i) => i.daysOverdue > 60).length;

    return { totalOverdue, count, criticalCount };
  }, [overdueInvoices]);

  const handleCreateRecoveryTask = (
    invoice: Invoice & { daysOverdue: number },
    action: 'CALL' | 'EMAIL' | 'LETTER',
    sendMode?: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'CALL'
  ) => {
    const client = clients.find((c) => c.id === invoice.clientId);
    let title = '';
    let desc = '';
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

    const modeLabel =
      sendMode === 'SMS'
        ? 'SMS'
        : sendMode === 'WHATSAPP'
          ? 'WhatsApp'
          : sendMode === 'CALL'
            ? 'Téléphonique'
            : 'Email';

    switch (action) {
      case 'CALL':
        title = `Relance ${modeLabel} - Facture ${invoice.number}`;
        desc = `Appeler ${client?.name} pour la facture de ${formatPrice(invoice.amount)} en retard de ${invoice.daysOverdue} jours.`;
        priority = 'MEDIUM';
        break;
      case 'EMAIL':
        title = `Relance ${modeLabel} - Facture ${invoice.number}`;
        desc = `Envoyer ${modeLabel.toLowerCase()} de relance niveau ${invoice.recoveryLevel} à ${client?.name}`;
        priority = 'LOW';
        break;
      case 'LETTER':
        title = `Mise en demeure - Facture ${invoice.number}`;
        desc = `Préparer courrier recommandé pour ${client?.name}.`;
        priority = 'HIGH';
        break;
    }

    addTask({
      id: Math.random().toString(36).substr(2, 9),
      title,
      description: desc,
      status: 'TODO',
      priority,
      dueDate: new Date().toISOString(),
      relatedTo: { type: 'INVOICE', id: invoice.id, name: invoice.number },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Task);

    // Update invoice last reminder date & count
    updateInvoice({
      ...invoice,
      lastReminderDate: new Date().toISOString(),
      reminderCount: (invoice.reminderCount || 0) + 1,
    });

    showToast('Tâche de recouvrement créée', 'success');
  };

  const handleDeclareLost = async (invoice: Invoice) => {
    if (
      await confirm({
        message:
          'Êtes-vous sûr de vouloir déclarer cette facture comme irrécouvrable ? Une écriture comptable de type Pertes et Profits sera générée automatiquement.',
        variant: 'danger',
        title: 'Déclarer irrécouvrable',
        confirmLabel: 'Confirmer la perte',
      })
    ) {
      // 1. Update Invoice Status
      updateInvoice({
        ...invoice,
        status: 'CANCELLED',
        accountingStatus: 'LOST',
        notes: (invoice.notes || '') + '\n[RECOUVREMENT] Déclaré perdu le ' + new Date().toLocaleDateString('fr-FR'),
      });

      // 2. Generate Accounting Entry (Pertes sur créances irrécouvrables)
      // Débit 654000 (Pertes sur créances) / Crédit 411000 (Clients)
      await createGroupedJournalEntry({
        date: new Date().toISOString().split('T')[0],
        description: `Perte sur créance - Facture ${invoice.number}`,
        reference: invoice.number,
        journalCode: 'OD',
        lines: [
          {
            account_code: '654000',
            debit: invoice.amount,
            credit: 0,
            description: `Perte sur créance - Facture ${invoice.number}`,
          },
          {
            account_code: '411000',
            debit: 0,
            credit: invoice.amount,
            description: `Solde client - Facture ${invoice.number}`,
          },
        ],
      });

      setIsModalOpen(false);
      showToast('Facture passée en pertes et profits. Écritures comptables générées.', 'success');
    }
  };

  const handleToggleDispute = (invoice: Invoice) => {
    updateInvoice({
      ...invoice,
      isDisputed: !invoice.isDisputed,
      notes:
        (invoice.notes || '') +
        `\n[RECOUVREMENT] ${!invoice.isDisputed ? 'Mise en litige' : 'Fin de litige'} le ${new Date().toLocaleDateString('fr-FR')}`,
    });
    showToast(invoice.isDisputed ? 'Litige levé' : 'Facture marquée en litige', 'info');
  };

  const handleAddPTP = (invoice: Invoice, date: string) => {
    updateInvoice({
      ...invoice,
      promiseToPayDate: new Date(date).toISOString(),
      notes:
        (invoice.notes || '') +
        `\n[RECOUVREMENT] Promesse de paiement au ${new Date(date).toLocaleDateString('fr-FR')}`,
    });
    setIsPTPModalOpen(false);
    showToast('Promesse de paiement enregistrée', 'success');
  };

  const handleNoteSave = (invoice: Invoice, newNote: string) => {
    updateInvoice({
      ...invoice,
      notes: newNote,
    });
    setEditingNoteId(null);
    showToast('Note mise à jour', 'success');
  };

  const handleCallReportSave = () => {
    if (!selectedInvoice || !callNote) return;

    const updatedNotes =
      (selectedInvoice.notes || '') + `\n[APPEL] ${new Date().toLocaleDateString('fr-FR')} : ${callNote}`;

    updateInvoice({
      ...selectedInvoice,
      notes: updatedNotes,
      lastReminderDate: new Date().toISOString(),
      reminderCount: (selectedInvoice.reminderCount || 0) + 1,
    });

    // Also create a completed task for logging
    addTask({
      id: `CALL-${Date.now()}`,
      title: `Appel effectué - Facture ${selectedInvoice.number}`,
      description: callNote,
      status: 'DONE',
      priority: 'MEDIUM',
      dueDate: new Date().toISOString(),
      relatedTo: { type: 'INVOICE', id: selectedInvoice.id, name: selectedInvoice.number },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Task);

    setIsCallModalOpen(false);
    setCallNote('');
    showToast("Compte-rendu d'appel enregistré", 'success');
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'LEVEL_1':
        return (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-xs font-bold">
            Relance 1
          </span>
        );
      case 'LEVEL_2':
        return (
          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded text-xs font-bold">
            Relance 2
          </span>
        );
      case 'LEVEL_3':
        return (
          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-xs font-bold">
            Contentieux
          </span>
        );
      case 'LITIGATION':
        return <span className="px-2 py-1 bg-slate-800 text-white rounded text-xs font-bold">Juridique</span>;
      default:
        return (
          <span className="px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded text-xs">
            À traiter
          </span>
        );
    }
  };

  const toggleColumn = (column: string) => {
    setVisibleColumns((prev) => (prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]));
  };

  const getInvoiceHistory = (invoiceId: string) => {
    return tasks
      .filter((t) => t.relatedTo?.type === 'INVOICE' && t.relatedTo?.id === invoiceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  return (
    <div
      className="h-full flex flex-col p-6 space-y-6 overflow-hidden"
      onClick={() => openMenuId && setOpenMenuId(null)}
    >
      {/* Header & KPIs - Hidden on mobile */}
      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-4 border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Total En Souffrance</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{formatPrice(kpis.totalOverdue)}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-orange-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Factures en Retard</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{kpis.count}</p>
              </div>
              <FileWarning className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-slate-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Dossiers Critiques (&gt;60j)</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{kpis.criticalCount}</p>
              </div>
              <ShieldAlert className="w-8 h-8 text-[var(--text-secondary)] opacity-50" />
            </div>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-[var(--bg-elevated)] p-4 rounded-xl shadow-sm border border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher client, n° facture..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
            <select
              className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              title="Filtrer par niveau de relance"
            >
              <option value="ALL">Tous les niveaux</option>
              <option value="LEVEL_1">Relance 1</option>
              <option value="LEVEL_2">Relance 2</option>
              <option value="LEVEL_3">Contentieux</option>
              <option value="LITIGATION">Juridique</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
            <select
              className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              title="Filtrer par client"
            >
              <option value="ALL">Tous les clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkReminder}
            disabled={isProcessingBulk}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-slate-300 disabled:text-[var(--text-secondary)] rounded-lg text-sm font-medium transition-colors"
            title="Relancer les factures sélectionnées"
          >
            <Mail className="w-4 h-4" />
            {isProcessingBulk
              ? 'Traitement...'
              : selectedIds.size > 0
                ? `Relancer (${selectedIds.size})`
                : 'Relancer Sélection'}
          </button>
          <button
            onClick={() => setIsAutomationModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--primary-dim)] text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded-lg text-sm font-medium transition-colors"
          >
            <Settings className="w-4 h-4" /> Automatisation
          </button>
          <button
            onClick={() => handleExport('CSV')}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
          >
            <Columns className="w-4 h-4" /> Colonnes
          </button>
          {isColumnMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-elevated)] rounded-lg shadow-xl border border-[var(--border)] z-20 p-2">
              {[
                'client',
                'invoice',
                'amount',
                'overdue',
                'level',
                'reminders',
                'lastReminder',
                'type',
                'notes',
                'actions',
              ].map((col) => (
                <label
                  key={col}
                  className="flex items-center gap-2 p-2 hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col)}
                    onChange={() => toggleColumn(col)}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="text-sm capitalize">{col}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 bg-[var(--bg-elevated)] rounded-2xl shadow-sm border border-[var(--border)] flex flex-col overflow-hidden">
        {isMobile ? (
          <MobileCardList>
            {paginatedInvoices.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary)]">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
                Aucune facture trouvée.
              </div>
            ) : (
              paginatedInvoices.map((inv) => {
                const client = clients.find((c) => c.id === inv.clientId);
                const borderColor =
                  inv.daysOverdue > 60
                    ? 'border-l-red-600'
                    : inv.daysOverdue > 30
                      ? 'border-l-red-400'
                      : 'border-l-orange-500';
                return (
                  <MobileCard key={inv.id} borderColor={borderColor}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {client?.name || 'Client Inconnu'}
                        </p>
                        <p className="text-xs font-mono text-[var(--text-secondary)]">
                          {inv.number} · Éch. {new Date(inv.dueDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <p className="shrink-0 font-bold text-[var(--text-primary)] text-sm">{formatPrice(inv.amount)}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.daysOverdue > 30 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'}`}
                      >
                        {inv.daysOverdue} jours
                      </span>
                      {getLevelBadge(inv.recoveryLevel as string)}
                      {inv.isDisputed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          EN LITIGE
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <MobileCardAction
                        icon={<Mail className="w-3 h-3" />}
                        color="blue"
                        onClick={() => handleCreateRecoveryTask(inv, 'EMAIL')}
                      >
                        Relancer
                      </MobileCardAction>
                      <MobileCardAction
                        color="slate"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setIsModalOpen(true);
                        }}
                      >
                        Voir détails
                      </MobileCardAction>
                    </div>
                  </MobileCard>
                );
              })
            )}
          </MobileCardList>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar pb-16 lg:pb-0">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-[var(--bg-elevated)]/50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === overdueInvoices.length && overdueInvoices.length > 0}
                      onChange={toggleSelectAll}
                      title="Tout sélectionner"
                      className="w-4 h-4 rounded border-[var(--border)] text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  {visibleColumns.includes('client') && (
                    <SortableHeader
                      label="Client"
                      sortKey="clientId"
                      currentSortKey={recoverySortConfig.key}
                      currentDirection={recoverySortConfig.direction}
                      onSort={handleRecoverySort}
                    />
                  )}
                  {visibleColumns.includes('reseller') && (
                    <SortableHeader
                      label="Revendeur"
                      sortKey="tenantId"
                      currentSortKey={recoverySortConfig.key}
                      currentDirection={recoverySortConfig.direction}
                      onSort={handleRecoverySort}
                    />
                  )}
                  {visibleColumns.includes('invoice') && (
                    <SortableHeader
                      label="Facture"
                      sortKey="number"
                      currentSortKey={recoverySortConfig.key}
                      currentDirection={recoverySortConfig.direction}
                      onSort={handleRecoverySort}
                    />
                  )}
                  {visibleColumns.includes('type') && (
                    <SortableHeader
                      label="Type"
                      sortKey="invoiceType"
                      currentSortKey={recoverySortConfig.key}
                      currentDirection={recoverySortConfig.direction}
                      onSort={handleRecoverySort}
                    />
                  )}
                  {visibleColumns.includes('amount') && (
                    <SortableHeader
                      label="Montant"
                      sortKey="amount"
                      currentSortKey={recoverySortConfig.key}
                      currentDirection={recoverySortConfig.direction}
                      onSort={handleRecoverySort}
                    />
                  )}
                  {visibleColumns.includes('overdue') && (
                    <SortableHeader
                      label="Retard"
                      sortKey="daysOverdue"
                      currentSortKey={recoverySortConfig.key}
                      currentDirection={recoverySortConfig.direction}
                      onSort={handleRecoverySort}
                    />
                  )}
                  {visibleColumns.includes('level') && (
                    <SortableHeader
                      label="Niveau"
                      sortKey="recoveryLevel"
                      currentSortKey={recoverySortConfig.key}
                      currentDirection={recoverySortConfig.direction}
                      onSort={handleRecoverySort}
                    />
                  )}
                  {visibleColumns.includes('reminders') && (
                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase text-center">
                      Relances
                    </th>
                  )}
                  {visibleColumns.includes('lastReminder') && (
                    <SortableHeader
                      label="Dernière Relance"
                      sortKey="lastReminderDate"
                      currentSortKey={recoverySortConfig.key}
                      currentDirection={recoverySortConfig.direction}
                      onSort={handleRecoverySort}
                    />
                  )}
                  {visibleColumns.includes('notes') && (
                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase">Notes</th>
                  )}
                  {visibleColumns.includes('actions') && (
                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-8 text-center text-[var(--text-secondary)]">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
                      Aucune facture trouvée.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv) => {
                    const client = clients.find((c) => c.id === inv.clientId);
                    return (
                      <tr
                        key={inv.id}
                        className={`tr-hover/50 transition-colors ${selectedIds.has(inv.id) ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(inv.id)}
                            onChange={() => toggleSelect(inv.id)}
                            title={`Sélectionner ${inv.number}`}
                            className="w-4 h-4 rounded border-[var(--border)] text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        {visibleColumns.includes('client') && (
                          <td className="p-4">
                            <div
                              className="font-medium text-[var(--text-primary)] cursor-pointer hover:text-[var(--primary)] hover:underline"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsModalOpen(true);
                              }}
                            >
                              {client?.name || 'Client Inconnu'}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">{client?.email}</div>
                          </td>
                        )}
                        {visibleColumns.includes('reseller') && (
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] flex items-center justify-center text-[10px] font-bold text-[var(--primary)]">
                                {(resellers?.find((r) => r.tenantId === inv.tenantId)?.slug || '??').substring(0, 2)}
                              </div>
                              <span className="text-xs text-[var(--text-secondary)]">
                                {resellers?.find((r) => r.tenantId === inv.tenantId)?.name || inv.tenantId || '-'}
                              </span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.includes('invoice') && (
                          <td className="p-4 text-sm text-[var(--text-secondary)]">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInvoice(inv);
                                  setIsInvoicePreviewOpen(true);
                                }}
                                className="text-[var(--primary)] hover:underline font-medium flex items-center gap-1"
                                title="Aperçu de la facture"
                              >
                                <Eye className="w-3 h-3" />
                                {inv.number}
                              </button>
                              {inv.promiseToPayDate && (
                                <span
                                  className={`p-1 rounded-full ${new Date(inv.promiseToPayDate) < new Date() ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-[var(--primary-dim)] text-[var(--primary)]'}`}
                                  title={`Promesse de paiement au ${new Date(inv.promiseToPayDate).toLocaleDateString('fr-FR')}`}
                                >
                                  <Clock className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              Échéance: {new Date(inv.dueDate).toLocaleDateString('fr-FR')}
                            </div>
                          </td>
                        )}
                        {visibleColumns.includes('type') && (
                          <td className="p-4 text-sm text-[var(--text-secondary)]">
                            <span className="px-2 py-1 bg-[var(--bg-elevated)] rounded text-xs">
                              {inv.category || 'STANDARD'}
                            </span>
                          </td>
                        )}
                        {visibleColumns.includes('amount') && (
                          <td className="p-4 font-bold text-[var(--text-primary)]">{formatPrice(inv.amount)}</td>
                        )}
                        {visibleColumns.includes('overdue') && (
                          <td className="p-4">
                            <span className={`font-bold ${inv.daysOverdue > 30 ? 'text-red-600' : 'text-orange-600'}`}>
                              {inv.daysOverdue} jours
                            </span>
                          </td>
                        )}
                        {visibleColumns.includes('level') && (
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              {getLevelBadge(inv.recoveryLevel as string)}
                              {inv.isDisputed && (
                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                  <ShieldAlert className="w-3 h-3" /> EN LITIGE
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {visibleColumns.includes('reminders') && (
                          <td className="p-4 text-center font-mono font-bold text-[var(--text-secondary)]">
                            {inv.reminderCount || 0}
                          </td>
                        )}
                        {visibleColumns.includes('lastReminder') && (
                          <td className="p-4 text-sm text-[var(--text-secondary)]">
                            {inv.lastReminderDate ? new Date(inv.lastReminderDate).toLocaleDateString('fr-FR') : '-'}
                          </td>
                        )}
                        {visibleColumns.includes('notes') && (
                          <td className="p-4 text-sm text-[var(--text-secondary)] max-w-xs">
                            {editingNoteId === inv.id ? (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  className="w-full p-2 text-xs border border-[var(--border)] rounded bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                  value={tempNoteValue}
                                  onChange={(e) => setTempNoteValue(e.target.value)}
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => setEditingNoteId(null)}
                                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                                    title="Annuler"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleNoteSave(inv, tempNoteValue)}
                                    className="p-1 text-green-600 hover:text-green-700"
                                    title="Sauvegarder"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="group flex items-start gap-2 cursor-pointer tr-hover p-1 rounded"
                                onClick={() => {
                                  setEditingNoteId(inv.id);
                                  setTempNoteValue(inv.notes || '');
                                }}
                                title="Cliquer pour modifier"
                              >
                                <span className="truncate flex-1">{inv.notes || '-'}</span>
                                <Settings className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </td>
                        )}
                        {visibleColumns.includes('actions') && (
                          <td className="p-4 text-right">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === inv.id ? null : inv.id);
                                }}
                                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg"
                                title="Actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {openMenuId === inv.id && (
                                <div className="absolute right-0 z-50 mt-1 w-52 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-lg py-1">
                                  <button
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      setIsModalOpen(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4 text-[var(--text-muted)]" /> Détail recouvrement
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      setIsInvoicePreviewOpen(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4 text-[var(--primary)]" /> Aperçu facture
                                  </button>
                                  <div className="border-t border-[var(--border)] border-[var(--border)] my-1" />
                                  <button
                                    onClick={() => {
                                      handleCreateRecoveryTask(inv, 'EMAIL');
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Mail className="w-4 h-4 text-[var(--primary)]" /> Relance email
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      setCallNote('');
                                      setIsCallModalOpen(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Phone className="w-4 h-4 text-green-500" /> Compte-rendu d'appel
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      setPtpDate('');
                                      setIsPTPModalOpen(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Clock className="w-4 h-4 text-[var(--primary)]" /> Promesse de paiement
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      setIsExtendModalOpen(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Calendar className="w-4 h-4 text-purple-500" /> Proroger échéance
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleToggleDispute(inv);
                                      setOpenMenuId(null);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 flex items-center gap-2 ${inv.isDisputed ? 'text-red-600' : 'text-[var(--text-primary)]'}`}
                                  >
                                    <ShieldAlert
                                      className={`w-4 h-4 ${inv.isDisputed ? 'text-red-500' : 'text-[var(--text-muted)]'}`}
                                    />{' '}
                                    {inv.isDisputed ? 'Lever le litige' : 'Marquer en litige'}
                                  </button>
                                  {inv.daysOverdue > 30 && (
                                    <button
                                      onClick={() => {
                                        handleCreateRecoveryTask(inv, 'LETTER');
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                    >
                                      <FileWarning className="w-4 h-4" /> Mise en demeure
                                    </button>
                                  )}
                                  <div className="border-t border-[var(--border)] border-[var(--border)] my-1" />
                                  <button
                                    onClick={() => {
                                      handleDeclareLost(inv);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                    <X className="w-4 h-4" /> Déclarer perdu
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={overdueInvoices.length}
          itemLabel="facture"
          className="p-4 border-t border-[var(--border)]"
        />
      </div>

      {/* Unpaid Modal */}
      {isModalOpen && selectedInvoice && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Détail Recouvrement - ${selectedInvoice.number}`}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg col-span-2 md:col-span-1">
                <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Client</p>
                {(() => {
                  const client = clients.find((c) => c.id === selectedInvoice.clientId);
                  const tier = tiers.find((t) => t.id === selectedInvoice.clientId);
                  return tier || client ? (
                    <button
                      onClick={() => {
                        const t = tiers.find((tt) => tt.id === selectedInvoice.clientId);
                        if (t) {
                          setSelectedTierForModal(t);
                          setIsTierModalOpen(true);
                        }
                      }}
                      className="font-bold text-[var(--primary)] hover:underline text-left"
                      title="Voir la fiche client"
                    >
                      {client?.name || tier?.name || 'Inconnu'}
                    </button>
                  ) : (
                    <p className="font-bold text-[var(--text-primary)]">Inconnu</p>
                  );
                })()}
              </div>
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Montant Dû</p>
                <p className="text-xl font-bold text-red-600">{formatPrice(selectedInvoice.amount)}</p>
              </div>
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Retard</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{selectedInvoice.daysOverdue} jours</p>
              </div>
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Niveau</p>
                <div className="mt-1">{getLevelBadge(selectedInvoice.recoveryLevel as string)}</div>
              </div>
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Relances</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{selectedInvoice.reminderCount || 0}</p>
              </div>
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Dernière Relance</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {selectedInvoice.lastReminderDate
                    ? new Date(selectedInvoice.lastReminderDate).toLocaleDateString('fr-FR')
                    : '-'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Historique des Actions
              </h4>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--bg-elevated)] font-bold text-xs uppercase text-[var(--text-secondary)]">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {getInvoiceHistory(selectedInvoice.id).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-[var(--text-secondary)]">
                          Aucune action enregistrée
                        </td>
                      </tr>
                    ) : (
                      getInvoiceHistory(selectedInvoice.id).map((task) => (
                        <tr key={task.id}>
                          <td className="p-3">{new Date(task.createdAt).toLocaleDateString('fr-FR')}</td>
                          <td className="p-3">{task.title}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${task.status === 'DONE' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'}`}
                            >
                              {task.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCreateRecoveryTask(selectedInvoice, 'EMAIL')}
                  className="px-3 py-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" /> Relance email
                </button>
                <button
                  onClick={() => {
                    setCallNote('');
                    setIsCallModalOpen(true);
                  }}
                  className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" /> Compte-rendu appel
                </button>
                <button
                  onClick={() => {
                    setPtpDate('');
                    setIsPTPModalOpen(true);
                  }}
                  className="px-3 py-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" /> Promesse paiement
                </button>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsExtendModalOpen(true);
                  }}
                  className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Proroger
                </button>
                <button
                  onClick={() => {
                    handleToggleDispute(selectedInvoice);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${selectedInvoice.isDisputed ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
                >
                  <ShieldAlert className="w-4 h-4" /> {selectedInvoice.isDisputed ? 'Lever litige' : 'Litige'}
                </button>
                {selectedInvoice.daysOverdue > 30 && (
                  <button
                    onClick={() => handleCreateRecoveryTask(selectedInvoice, 'LETTER')}
                    className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 rounded-lg text-sm font-bold flex items-center gap-2"
                  >
                    <FileWarning className="w-4 h-4" /> Mise en demeure
                  </button>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handleDeclareLost(selectedInvoice)}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg font-bold text-sm flex items-center gap-2"
                  title="Passe la facture en perte irrécouvrable (écriture OD : 654000 / 411000)"
                >
                  <X className="w-4 h-4" /> Déclarer Perdu
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 rounded-lg font-bold text-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Automation Modal (Placeholder) */}
      {isAutomationModalOpen && (
        <Modal
          isOpen={isAutomationModalOpen}
          onClose={() => setIsAutomationModalOpen(false)}
          title="⚙️ Automatisation du Recouvrement"
        >
          <div className="space-y-4">
            <div className="p-4 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-lg text-sm">
              <p className="font-bold mb-1">🤖 Relance Automatique</p>
              <p>Définissez les règles d'envoi automatique de relances selon le niveau de retard des factures.</p>
            </div>

            {/* Niveau 1 */}
            <div
              className={`flex items-center justify-between p-3 border rounded-lg transition-all ${automationSettings.level1Enabled ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : 'border-[var(--border)]'}`}
            >
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)]">Relance Niveau 1</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[var(--text-secondary)]">Après</span>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={automationSettings.level1Days}
                    onChange={(e) =>
                      setAutomationSettings({ ...automationSettings, level1Days: parseInt(e.target.value) })
                    }
                    title="Jours avant relance niveau 1"
                    className="w-14 px-2 py-1 border rounded text-sm text-center"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">jours → Email de courtoisie</span>
                </div>
              </div>
              <button
                onClick={() =>
                  setAutomationSettings({ ...automationSettings, level1Enabled: !automationSettings.level1Enabled })
                }
                title="Activer/désactiver relance niveau 1"
                className={`w-12 h-6 rounded-full relative transition-colors ${automationSettings.level1Enabled ? 'bg-green-500' : 'bg-slate-300 bg-[var(--bg-elevated)]'}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${automationSettings.level1Enabled ? 'right-1' : 'left-1'}`}
                ></div>
              </button>
            </div>

            {/* Niveau 2 */}
            <div
              className={`flex items-center justify-between p-3 border rounded-lg transition-all ${automationSettings.level2Enabled ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/10' : 'border-[var(--border)]'}`}
            >
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)]">Relance Niveau 2</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[var(--text-secondary)]">Après</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={automationSettings.level2Days}
                    onChange={(e) =>
                      setAutomationSettings({ ...automationSettings, level2Days: parseInt(e.target.value) })
                    }
                    title="Jours avant relance niveau 2"
                    className="w-14 px-2 py-1 border rounded text-sm text-center"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">jours → Email + Tâche d'appel</span>
                </div>
              </div>
              <button
                onClick={() =>
                  setAutomationSettings({ ...automationSettings, level2Enabled: !automationSettings.level2Enabled })
                }
                title="Activer/désactiver relance niveau 2"
                className={`w-12 h-6 rounded-full relative transition-colors ${automationSettings.level2Enabled ? 'bg-orange-500' : 'bg-slate-300 bg-[var(--bg-elevated)]'}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${automationSettings.level2Enabled ? 'right-1' : 'left-1'}`}
                ></div>
              </button>
            </div>

            {/* Niveau 3 */}
            <div
              className={`flex items-center justify-between p-3 border rounded-lg transition-all ${automationSettings.level3Enabled ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-[var(--border)]'}`}
            >
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)]">Contentieux Niveau 3</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[var(--text-secondary)]">Après</span>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={automationSettings.level3Days}
                    onChange={(e) =>
                      setAutomationSettings({ ...automationSettings, level3Days: parseInt(e.target.value) })
                    }
                    title="Jours avant contentieux niveau 3"
                    className="w-14 px-2 py-1 border rounded text-sm text-center"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">jours → Mise en demeure</span>
                </div>
              </div>
              <button
                onClick={() =>
                  setAutomationSettings({ ...automationSettings, level3Enabled: !automationSettings.level3Enabled })
                }
                title="Activer/désactiver contentieux niveau 3"
                className={`w-12 h-6 rounded-full relative transition-colors ${automationSettings.level3Enabled ? 'bg-red-500' : 'bg-slate-300 bg-[var(--bg-elevated)]'}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${automationSettings.level3Enabled ? 'right-1' : 'left-1'}`}
                ></div>
              </button>
            </div>

            {/* Stats */}
            <div className="p-3 bg-[var(--bg-elevated)] rounded-lg">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">📊 Factures concernées :</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                <div className="bg-[var(--bg-elevated)] rounded p-2">
                  <p className="text-lg font-bold text-yellow-600">
                    {
                      overdueInvoices.filter(
                        (i) =>
                          i.daysOverdue >= automationSettings.level1Days &&
                          i.daysOverdue < automationSettings.level2Days
                      ).length
                    }
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">Niveau 1</p>
                </div>
                <div className="bg-[var(--bg-elevated)] rounded p-2">
                  <p className="text-lg font-bold text-orange-600">
                    {
                      overdueInvoices.filter(
                        (i) =>
                          i.daysOverdue >= automationSettings.level2Days &&
                          i.daysOverdue < automationSettings.level3Days
                      ).length
                    }
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">Niveau 2</p>
                </div>
                <div className="bg-[var(--bg-elevated)] rounded p-2">
                  <p className="text-lg font-bold text-red-600">
                    {overdueInvoices.filter((i) => i.daysOverdue >= automationSettings.level3Days).length}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">Contentieux</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setIsAutomationModalOpen(false)}
                className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 rounded-lg font-bold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={runAutomaticReminders}
                className="px-4 py-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] rounded-lg font-bold text-sm flex items-center gap-2"
              >
                <Mail className="w-4 h-4" /> Lancer les Relances Automatiques
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Extend Date Modal */}
      {isExtendModalOpen && selectedInvoice && (
        <Modal
          isOpen={isExtendModalOpen}
          onClose={() => setIsExtendModalOpen(false)}
          title={`Proroger Échéance - ${selectedInvoice.number}`}
        >
          <div className="space-y-4">
            <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] p-4 rounded-lg text-sm flex items-start gap-2">
              <Clock className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Attention</p>
                <p>
                  Vous êtes sur le point de modifier la date d'échéance de cette facture. Cette action impactera le
                  calcul des retards.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Nouvelle Date d'Échéance
              </label>
              <input
                type="date"
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)]"
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                title="Nouvelle date d'échéance"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Motif de la prorogation
              </label>
              <textarea
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] h-24"
                placeholder="Ex: Accord exceptionnel avec le client..."
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setIsExtendModalOpen(false)}
                className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 rounded-lg font-bold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!extendDate || !extendReason) return showToast('Veuillez remplir tous les champs', 'warning');
                  updateInvoice({
                    ...selectedInvoice,
                    dueDate: new Date(extendDate).toISOString(),
                    notes:
                      (selectedInvoice.notes || '') +
                      `\n[PROROGATION] Échéance reportée au ${new Date(extendDate).toLocaleDateString('fr-FR')} par l'utilisateur. Motif: ${extendReason}`,
                  });
                  setIsExtendModalOpen(false);
                  setExtendDate('');
                  setExtendReason('');
                  showToast('Échéance mise à jour avec succès', 'success');
                }}
                className="px-4 py-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] rounded-lg font-bold text-sm"
              >
                Confirmer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Send Mode Modal */}
      {isBulkModalOpen && (
        <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title="📤 Choisir le mode d'envoi">
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 rounded-lg text-sm">
              <p className="font-bold mb-1">📋 {selectedIds.size} facture(s) sélectionnée(s)</p>
              <p>Choisissez le canal de relance pour ces factures.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setBulkSendMode('EMAIL')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${bulkSendMode === 'EMAIL' ? 'border-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]' : 'border-[var(--border)] hover:border-[var(--primary)]'}`}
              >
                <Mail
                  className={`w-6 h-6 mb-2 ${bulkSendMode === 'EMAIL' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
                />
                <p className="font-bold text-[var(--text-primary)]">Email</p>
                <p className="text-xs text-[var(--text-secondary)]">Envoi par email classique</p>
              </button>

              <button
                onClick={() => setBulkSendMode('SMS')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${bulkSendMode === 'SMS' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-[var(--border)] hover:border-green-300'}`}
              >
                <Phone
                  className={`w-6 h-6 mb-2 ${bulkSendMode === 'SMS' ? 'text-green-600' : 'text-[var(--text-muted)]'}`}
                />
                <p className="font-bold text-[var(--text-primary)]">SMS</p>
                <p className="text-xs text-[var(--text-secondary)]">Message texte court</p>
              </button>

              <button
                onClick={() => setBulkSendMode('WHATSAPP')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${bulkSendMode === 'WHATSAPP' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-[var(--border)] hover:border-emerald-300'}`}
              >
                <svg
                  className={`w-6 h-6 mb-2 ${bulkSendMode === 'WHATSAPP' ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <p className="font-bold text-[var(--text-primary)]">WhatsApp</p>
                <p className="text-xs text-[var(--text-secondary)]">Message WhatsApp Business</p>
              </button>

              <button
                onClick={() => setBulkSendMode('CALL')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${bulkSendMode === 'CALL' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-[var(--border)] hover:border-orange-300'}`}
              >
                <Phone
                  className={`w-6 h-6 mb-2 ${bulkSendMode === 'CALL' ? 'text-orange-600' : 'text-[var(--text-muted)]'}`}
                />
                <p className="font-bold text-[var(--text-primary)]">Appel</p>
                <p className="text-xs text-[var(--text-secondary)]">Créer tâche d'appel</p>
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 rounded-lg font-bold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={executeBulkReminder}
                disabled={isProcessingBulk}
                className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-slate-300 rounded-lg font-bold text-sm flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {isProcessingBulk ? 'Traitement...' : `Relancer ${selectedIds.size} facture(s)`}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* PTP Modal */}
      {isPTPModalOpen && selectedInvoice && (
        <Modal isOpen={isPTPModalOpen} onClose={() => setIsPTPModalOpen(false)} title="🤝 Promesse de Paiement">
          <div className="space-y-4">
            <div className="p-4 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-lg text-sm">
              <p className="font-bold mb-1">Facture {selectedInvoice.number}</p>
              <p>Saisissez la date à laquelle le client s'est engagé à payer.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Date de promesse</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  value={ptpDate}
                  onChange={(e) => setPtpDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Montant promis (Optionnel)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full pl-3 pr-12 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    value={ptpAmount || ''}
                    onChange={(e) => setPtpAmount(parseFloat(e.target.value) || 0)}
                    placeholder={selectedInvoice.amount.toString()}
                  />
                  <span className="absolute right-3 top-2 text-[var(--text-muted)] text-sm font-bold"></span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setIsPTPModalOpen(false)}
                className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 rounded-lg font-bold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!ptpDate) return showToast('Veuillez saisir une date', 'warning');
                  handleAddPTP(selectedInvoice, ptpDate);
                }}
                className="px-4 py-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] rounded-lg font-bold text-sm"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Call Report Modal */}
      {isCallModalOpen && selectedInvoice && (
        <Modal isOpen={isCallModalOpen} onClose={() => setIsCallModalOpen(false)} title="📞 Compte-rendu d'Appel">
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg text-sm">
              <p className="font-bold mb-1">Facture {selectedInvoice.number}</p>
              <p>Notez ici le résultat de votre échange avec le client.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Résumé de l'appel</label>
                <textarea
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={callNote}
                  onChange={(e) => setCallNote(e.target.value)}
                  placeholder="Ex: Le client promet un virement d'ici la fin de semaine..."
                  rows={4}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setIsCallModalOpen(false)}
                className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 rounded-lg font-bold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleCallReportSave}
                disabled={!callNote}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-300 rounded-lg font-bold text-sm"
              >
                Enregistrer l'appel
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialogComponent />

      {/* Invoice Preview Modal */}
      {isInvoicePreviewOpen && selectedInvoice && (
        <Modal
          isOpen={isInvoicePreviewOpen}
          onClose={() => setIsInvoicePreviewOpen(false)}
          title={`Aperçu — ${selectedInvoice.number}`}
        >
          <DocumentPreview
            item={selectedInvoice}
            onEdit={() => setIsInvoicePreviewOpen(false)}
            onAction={() => setIsInvoicePreviewOpen(false)}
          />
        </Modal>
      )}

      {/* Tier Detail Modal */}
      <TierDetailModal
        tier={selectedTierForModal}
        isOpen={isTierModalOpen}
        onClose={() => {
          setIsTierModalOpen(false);
          setSelectedTierForModal(null);
        }}
      />
    </div>
  );
};
