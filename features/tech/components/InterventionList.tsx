import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Edit2,
  Trash2,
  LayoutTemplate,
  X,
  Download,
  Upload,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  FileDown,
  Clock,
  MapPin,
  User,
  ChevronRight,
  Wrench,
  SearchX,
} from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileFilterSheet, FilterRadioRow } from '../../../components/MobileFilterSheet';
import { StatusBadge } from '../../../components/StatusBadge';
import { Card } from '../../../components/Card';
import { Pagination } from '../../../components/Pagination';
import { Modal } from '../../../components/Modal';
import type { Intervention, Ticket, Invoice, InterventionType, InterventionNature } from '../../../types';
import { getStatusBgClass } from '../../../constants';
import { generatePDF } from '../../../services/pdfService';
import { useTenantBranding } from '../../../hooks/useTenantBranding';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { useDataContext } from '../../../contexts/DataContext';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { useCurrency } from '../../../hooks/useCurrency';
import { api } from '../../../services/apiLazy';
import { useQueryClient } from '@tanstack/react-query';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';
import { calculateResolutionTime, formatDuration, getResolutionTimeColor } from '../utils/resolutionTime';
import { useInterventionTypes } from '../../../hooks/useInterventionTypes';
import { INTERVENTION_NATURES } from '../constants';
import { useAuth } from '../../../contexts/AuthContext';

// Helper pour formater les dates de manière sûre
const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return 'Non planifié';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Non planifié';
  return date.toLocaleDateString('fr-FR');
};

const formatTime = (dateStr: string | undefined | null) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

interface InterventionListProps {
  interventions: Intervention[];
  technicians: { id: string; name: string; role?: string; tenantId?: string }[];
  onEdit: (intervention: Intervention) => void;
  onDelete: (ids: string[]) => void;
  onDepart?: (intervention: Intervention) => void;
}

const INTERVENTION_COLUMNS = [
  { id: 'id', label: 'Réf', minWidth: 90 },
  { id: 'status', label: 'Statut', minWidth: 110 },
  { id: 'scheduledDate', label: 'Planification', minWidth: 150 },
  { id: 'client', label: 'Client', minWidth: 150 },
  { id: 'ticket', label: 'Ticket', minWidth: 100 },
  { id: 'tech', label: 'Technicien', minWidth: 130 },
  { id: 'type', label: 'Type', minWidth: 110 },
  { id: 'nature', label: 'Nature', minWidth: 120 },
  { id: 'location', label: 'Lieu', minWidth: 150 },
  { id: 'vehicle', label: 'Véhicule', minWidth: 120 },
  { id: 'resolutionTime', label: 'Durée Réelle', minWidth: 100 },
  { id: 'cost', label: 'Montant', minWidth: 100 },
  { id: 'actions', label: 'Actions', locked: true, minWidth: 100 },
];

const cleanPlate = (plate?: string) => (plate ? plate.replace(/-/g, '').toUpperCase() : '');

export const InterventionList: React.FC<InterventionListProps> = ({
  interventions,
  technicians,
  onEdit,
  onDelete,
  onDepart,
}) => {
  const isMobile = useIsMobile();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const { types: interventionTypes, natures: allNatures } = useInterventionTypes();
  const { addInvoice, invoices, addIntervention, updateIntervention, clients, tickets, updateTicket } =
    useDataContext();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { formatPrice } = useCurrency();
  const { branding } = useTenantBranding();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(INTERVENTION_COLUMNS.map((c) => c.id));
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [globalSearch, setGlobalSearch] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Mobile states
  const [mobileDisplayCount, setMobileDisplayCount] = useState(20);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Inline filters (complementary to TechView's filters)
  const [filterNature, setFilterNature] = useState('ALL');
  const [filterClient, setFilterClient] = useState('ALL');
  const [filterReseller, setFilterReseller] = useState('ALL');
  const [filterInvoiced, setFilterInvoiced] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [filterStatusMobile, setFilterStatusMobile] = useState('ALL');
  const [filterTechMobile, setFilterTechMobile] = useState('ALL');
  const [filterResellerMobile, setFilterResellerMobile] = useState('ALL');

  const hasActiveFilters =
    filterNature !== 'ALL' || filterClient !== 'ALL' || filterReseller !== 'ALL' || filterInvoiced !== 'ALL';
  const activeFilterCount = [filterNature, filterClient, filterReseller, filterInvoiced].filter(
    (f) => f !== 'ALL'
  ).length;

  // Helper pour résoudre le nom du client
  const getClientName = (clientId: string | undefined) => {
    if (!clientId) return '-';
    const client = clients.find((c) => c.id === clientId || c.name === clientId);
    return client?.name || clientId;
  };

  // Helper pour résoudre le numéro du ticket
  const getTicketNumber = (ticketId: string | undefined) => {
    if (!ticketId) return '-';
    const ticket = tickets.find((t: Ticket) => t.id === ticketId);
    return ticket ? `#${ticketId.slice(-6)}` : ticketId;
  };

  // Bulk Invoice Action
  const handleBulkInvoice = async () => {
    // Fix 13: permission check before bulk invoice
    if (!hasPermission('CREATE_INVOICES')) {
      showToast("Permission refusée : vous n'avez pas le droit de créer des factures", 'error');
      return;
    }
    const selectedInterventions = interventions.filter((i) => selectedIds.has(i.id));
    if (selectedInterventions.length === 0) return;

    // Check: only COMPLETED interventions can be invoiced
    const nonCompleted = selectedInterventions.filter((i) => i.status !== 'COMPLETED');
    if (nonCompleted.length > 0) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'error');
      return;
    }

    // Check if all belong to same client
    const firstClient = selectedInterventions[0].clientId;
    const sameClient = selectedInterventions.every((i) => i.clientId === firstClient);

    if (!sameClient) {
      showToast('Veuillez sélectionner des interventions du même client pour la facturation groupée', 'error');
      return;
    }

    // Check if any is already invoiced
    const alreadyInvoiced = selectedInterventions.filter(
      (i) => i.invoiceId || invoices.some((inv) => inv.interventionId === i.id)
    );
    if (alreadyInvoiced.length > 0) {
      if (
        !(await confirm({
          message: `${alreadyInvoiced.length} intervention(s) semblent déjà facturée(s). Voulez-vous continuer quand même ?`,
          variant: 'warning',
          title: 'Interventions déjà facturées',
          confirmLabel: 'Continuer',
        }))
      ) {
        return;
      }
    }

    // Aggregate Items
    const allItems = selectedInterventions.flatMap((i: Intervention) => {
      if (i.invoiceItems && i.invoiceItems.length > 0) {
        return i.invoiceItems.map((item) => ({
          description: `${item.description} (${i.licensePlate || i.vehicleName || 'Véhicule'})`,
          quantity: item.quantity,
          price: item.price ?? 0,
          unitPrice: (item as { unitPrice?: number; price: number }).unitPrice || item.price,
          total:
            (item as { total?: number; quantity: number; price: number }).total || item.quantity * (item.price ?? 0),
        }));
      } else {
        return [
          {
            description: `Intervention ${i.type}${i.nature ? ' - ' + i.nature : ''} - ${i.licensePlate || i.vehicleName || 'Véhicule'} - ${formatDate(i.scheduledDate)}`,
            quantity: 1,
            price: i.cost || 0,
            unitPrice: i.cost || 0,
            total: i.cost || 0,
          },
        ];
      }
    });

    const totalAmount = allItems.reduce(
      (sum, item) =>
        sum +
        ((item as { total?: number; quantity: number; price: number }).total || item.quantity * (item.price ?? 0)),
      0
    );

    // Check: total amount should not be zero
    if (totalAmount === 0) {
      if (
        !(await confirm({
          message: 'Le montant total est de 0. Voulez-vous quand même créer la facture ?',
          variant: 'warning',
          title: 'Montant nul',
          confirmLabel: 'Continuer',
        }))
      ) {
        return;
      }
    }

    // Create Invoice via API (backend generates ID + invoice_number)
    const invoiceData: Partial<Invoice> = {
      tenantId: selectedInterventions[0].tenantId || 'tenant_default',
      clientId: firstClient,
      subject: `Facturation Groupée Interventions (${selectedInterventions.length})`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: totalAmount,
      status: 'DRAFT',
      items: allItems.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        price: (i as { unitPrice?: number; price: number }).unitPrice || i.price,
      })),
      vatRate: 0,
      invoiceType: 'FACTURE',
    };

    try {
      const created = await api.invoices.create(invoiceData as Invoice);
      const invoiceId = created?.id || `INV-${Date.now()}`;

      // Link invoiceId back to each intervention
      for (const intv of selectedInterventions) {
        updateIntervention({ ...intv, invoiceId });
      }

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      showToast(TOAST.CRUD.CREATED('Facture brouillon'), 'success');
      setSelectedIds(new Set());
    } catch (err) {
      showToast(TOAST.CRUD.ERROR_CREATE('facture'), 'error');
    }
  };

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic filter options (built from current data)
  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    interventions.forEach((i) => {
      if (i.clientId) {
        const name = getClientName(i.clientId);
        if (name !== '-') map.set(i.clientId, name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [interventions, clients]);

  const resellerOptions = useMemo(() => {
    const set = new Set<string>();
    interventions.forEach((i) => {
      const rName = i.resellerName || clients.find((c) => c.id === i.clientId)?.resellerName;
      if (rName) set.add(rName);
    });
    return Array.from(set).sort();
  }, [interventions, clients]);

  // Resolve reseller for an intervention (direct or via client)
  const getResellerName = (i: Intervention) =>
    i.resellerName || clients.find((c) => c.id === i.clientId)?.resellerName || '';

  // Filter Logic
  const filteredInterventions = useMemo(
    () =>
      interventions.filter((i) => {
        // Dropdown filters
        if (filterNature !== 'ALL' && i.nature !== filterNature) return false;
        if (filterClient !== 'ALL' && i.clientId !== filterClient) return false;
        if (filterReseller !== 'ALL' && getResellerName(i) !== filterReseller) return false;
        if (filterInvoiced === 'YES' && !invoices.some((inv) => inv.interventionId === i.id)) return false;
        if (filterInvoiced === 'NO' && invoices.some((inv) => inv.interventionId === i.id)) return false;

        // Text search
        if (!globalSearch) return true;
        const lowerSearch = globalSearch.toLowerCase();
        const techName = technicians.find((t) => t.id === i.technicianId)?.name?.toLowerCase() || '';
        const clientName = getClientName(i.clientId).toLowerCase();
        const ticketNumber = getTicketNumber(i.ticketId).toLowerCase();
        return (
          i.id.toLowerCase().includes(lowerSearch) ||
          clientName.includes(lowerSearch) ||
          techName.includes(lowerSearch) ||
          (i.licensePlate && i.licensePlate.toLowerCase().includes(lowerSearch)) ||
          (i.wwPlate && i.wwPlate.toLowerCase().includes(lowerSearch)) ||
          (i.location && i.location.toLowerCase().includes(lowerSearch)) ||
          (i.nature && i.nature.toLowerCase().includes(lowerSearch)) ||
          (i.type && i.type.toLowerCase().includes(lowerSearch)) ||
          (i.status && i.status.toLowerCase().includes(lowerSearch)) ||
          ticketNumber.includes(lowerSearch) ||
          (i.imei && i.imei.toLowerCase().includes(lowerSearch)) ||
          (i.notes && i.notes.toLowerCase().includes(lowerSearch))
        );
      }),
    [
      interventions,
      globalSearch,
      technicians,
      clients,
      tickets,
      invoices,
      filterNature,
      filterClient,
      filterReseller,
      filterInvoiced,
    ]
  );

  const {
    sortedItems: sortedInterventions,
    sortConfig: intSortConfig,
    handleSort: handleIntSort,
  } = useTableSort(filteredInterventions);

  const paginatedInterventions = sortedInterventions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(sortedInterventions.length / itemsPerPage);

  // Mobile: additional status + tech + reseller filter
  const mobileFilteredInterventions = useMemo(
    () =>
      sortedInterventions
        .filter((i) => filterStatusMobile === 'ALL' || i.status === filterStatusMobile)
        .filter((i) => filterTechMobile === 'ALL' || i.technicianId === filterTechMobile)
        .filter((i) => filterResellerMobile === 'ALL' || getResellerName(i) === filterResellerMobile),
    [sortedInterventions, filterStatusMobile, filterTechMobile, filterResellerMobile]
  );

  useEffect(() => {
    setMobileDisplayCount(20);
  }, [globalSearch, filterNature, filterClient, filterStatusMobile, filterTechMobile, filterResellerMobile]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (paginatedInterventions.every((i) => selectedIds.has(i.id))) {
      const newSet = new Set(selectedIds);
      paginatedInterventions.forEach((i) => newSet.delete(i.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      paginatedInterventions.forEach((i) => newSet.add(i.id));
      setSelectedIds(newSet);
    }
  };

  const handleDelete = async () => {
    const selectedInterventions = interventions.filter((i) => selectedIds.has(i.id));

    // Guard: warn about COMPLETED or invoiced interventions
    const completed = selectedInterventions.filter((i) => i.status === 'COMPLETED');
    const invoiced = selectedInterventions.filter(
      (i) => i.invoiceId || invoices.some((inv) => inv.interventionId === i.id)
    );

    const warningParts: string[] = [];
    if (completed.length > 0) warningParts.push(`${completed.length} terminée(s)`);
    if (invoiced.length > 0) warningParts.push(`${invoiced.length} facturée(s)`);
    const warningMsg =
      warningParts.length > 0 ? `\n\n⚠️ Attention : ${warningParts.join(', ')} parmi la sélection.` : '';

    if (
      await confirm({
        message: `Êtes-vous sûr de vouloir supprimer ${selectedIds.size} intervention(s) ?${warningMsg}`,
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      })
    ) {
      // Sync linked tickets: revert to OPEN if intervention is deleted
      for (const intv of selectedInterventions) {
        if (intv.ticketId) {
          const ticket = tickets.find((t: Ticket) => t.id === intv.ticketId);
          if (ticket && (ticket.status === 'IN_PROGRESS' || ticket.status === 'RESOLVED')) {
            updateTicket({ ...ticket, status: 'OPEN', updatedAt: new Date() });
          }
        }
      }
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleExport = () => {
    try {
      const columns = ['id', 'status', 'scheduledDate', 'client', 'type', 'nature', 'location', 'vehicle'];
      const data = filteredInterventions.map((i) => ({
        id: i.id,
        status: i.status,
        scheduledDate: formatDate(i.scheduledDate),
        client: i.clientId,
        type: i.type,
        nature: i.nature,
        location: i.location,
        vehicle: i.licensePlate || '-',
      }));

      generatePDF(
        'Liste des Interventions',
        columns,
        data,
        `interventions_${new Date().toISOString().split('T')[0]}.pdf`,
        { orientation: 'landscape', branding }
      );
      showToast(TOAST.IO.EXPORT_SUCCESS('PDF'), 'success');
    } catch (e) {
      showToast(TOAST.IO.EXPORT_ERROR('PDF'), 'error');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        'Référence',
        'Statut',
        'Date',
        'Client',
        'Technicien',
        'Type',
        'Nature',
        'Lieu',
        'Véhicule',
        'Montant',
      ];
      const rows = filteredInterventions.map((i) => [
        i.id,
        i.status,
        formatDate(i.scheduledDate),
        i.clientId,
        technicians.find((t) => t.id === i.technicianId)?.name || 'Non assigné',
        i.type,
        i.nature || '',
        i.location || '',
        i.licensePlate || '',
        i.cost?.toString() || '0',
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interventions_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(TOAST.IO.EXPORT_SUCCESS('CSV'), 'success');
      setIsExportMenuOpen(false);
    } catch (e) {
      showToast(TOAST.IO.EXPORT_ERROR('CSV'), 'error');
    }
  };

  const handleExportExcel = () => {
    try {
      const headers = [
        'Référence',
        'Statut',
        'Date',
        'Client',
        'Technicien',
        'Type',
        'Nature',
        'Lieu',
        'Véhicule',
        'Montant',
      ];
      const rows = filteredInterventions.map((i) => [
        i.id,
        i.status,
        formatDate(i.scheduledDate),
        i.clientId,
        technicians.find((t) => t.id === i.technicianId)?.name || 'Non assigné',
        i.type,
        i.nature || '',
        i.location || '',
        i.licensePlate || '',
        i.cost?.toString() || '0',
      ]);

      // TSV format for Excel compatibility
      const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
      const blob = new Blob(['\ufeff' + tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interventions_${new Date().toISOString().split('T')[0]}.xls`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(TOAST.IO.EXPORT_SUCCESS('Excel'), 'success');
      setIsExportMenuOpen(false);
    } catch (e) {
      showToast(TOAST.IO.EXPORT_ERROR('Excel'), 'error');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'clientId',
      'technicianId',
      'type',
      'nature',
      'scheduledDate',
      'location',
      'licensePlate',
      'notes',
      'cost',
    ];
    const example = [
      'CLIENT-001',
      'TECH-001',
      'INSTALLATION',
      'Installation',
      '2025-01-15',
      'Abidjan, Cocody',
      'AB-1234-CI',
      'Installation GPS tracker',
      '50000',
    ];
    const csvContent = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_interventions.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast(TOAST.IO.TEMPLATE_DOWNLOADED, 'success');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

        let importCount = 0;
        let errorCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
          });

          if (row.clientId && row.type) {
            const newIntervention: Partial<Intervention> = {
              clientId: row.clientId,
              technicianId: row.technicianId || 'UNASSIGNED',
              type: (row.type as InterventionType) || 'INSTALLATION',
              nature: (row.nature || 'Installation') as InterventionNature,
              status: 'PENDING',
              scheduledDate: row.scheduledDate ? new Date(row.scheduledDate).toISOString() : new Date().toISOString(),
              location: row.location || '',
              licensePlate: row.licensePlate || '',
              notes: row.notes || '',
              cost: parseFloat(row.cost) || 0,
              duration: 60,
            };
            try {
              await api.interventions.create(newIntervention as Intervention);
              importCount++;
            } catch {
              errorCount++;
            }
          }
        }

        queryClient.invalidateQueries({ queryKey: ['interventions'] });
        showToast(
          errorCount > 0 ? TOAST.IO.IMPORT_PARTIAL(importCount, errorCount) : TOAST.IO.IMPORT_SUCCESS(importCount),
          importCount > 0 ? 'success' : 'error'
        );
        setIsImportModalOpen(false);
      } catch (err) {
        showToast(TOAST.IO.IMPORT_ERROR, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isAllSelected = paginatedInterventions.length > 0 && paginatedInterventions.every((i) => selectedIds.has(i.id));

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'À planifier',
      SCHEDULED: 'Planifié',
      EN_ROUTE: 'En route',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Terminé',
      CANCELLED: 'Annulé',
      POSTPONED: 'Reporté',
    };
    const bgClass = getStatusBgClass(status);
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border whitespace-nowrap ${bgClass}`}>
        {labels[status] || status}
      </span>
    );
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-[var(--clr-caution-dim)] border-[var(--clr-caution-border)]',
    SCHEDULED:
      'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-[var(--border)] dark:border-[var(--primary)]',
    EN_ROUTE: 'bg-[var(--clr-info-dim)] border-[var(--clr-info-border)]',
    IN_PROGRESS:
      'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-[var(--primary)] dark:border-[var(--primary)]',
    COMPLETED: 'bg-[var(--clr-success-dim)] border-[var(--clr-success-border)]',
    CANCELLED: 'bg-[var(--bg-elevated)] border-[var(--border)]',
    POSTPONED: 'bg-[var(--clr-warning-dim)] border-[var(--clr-warning-border)]',
  };

  const MOBILE_STATUS_LABELS: Record<string, string> = {
    ALL: 'Tous',
    PENDING: 'À planifier',
    SCHEDULED: 'Planifié',
    EN_ROUTE: 'En route',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé',
    POSTPONED: 'Reporté',
  };

  // ── MOBILE RENDER ──────────────────────────────────────────────────────────
  if (isMobile) {
    const mobileFilterCount =
      (filterStatusMobile !== 'ALL' ? 1 : 0) +
      (filterNature !== 'ALL' ? 1 : 0) +
      (filterClient !== 'ALL' ? 1 : 0) +
      (filterTechMobile !== 'ALL' ? 1 : 0) +
      (filterResellerMobile !== 'ALL' ? 1 : 0);

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-elevated)]/50">
        {/* Mobile toolbar */}
        <div className="flex flex-col gap-1.5 px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowMobileFilter(true)}
              className={`relative p-2 rounded-lg border transition-colors ${mobileFilterCount > 0 ? 'bg-[var(--primary-dim)] border-[var(--primary)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)]' : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)]'}`}
            >
              <Filter className="w-4 h-4" />
              {mobileFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--primary)] text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {mobileFilterCount}
                </span>
              )}
            </button>
            <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
              {mobileFilteredInterventions.length} rés.
            </span>
          </div>
          {/* Export buttons row */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Exporter :</span>
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded border border-red-200 text-red-600 bg-[var(--clr-danger-dim)] dark:border-red-800 dark:text-red-400 hover:bg-red-100 transition-colors"
            >
              <FileText className="w-3 h-3" /> PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded border border-green-200 text-green-600 bg-[var(--clr-success-dim)] dark:border-green-800 dark:text-green-400 hover:bg-green-100 transition-colors"
            >
              <FileSpreadsheet className="w-3 h-3" /> XLS
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded border border-[var(--border)] text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)] hover:bg-[var(--primary-dim)] transition-colors"
            >
              <FileDown className="w-3 h-3" /> CSV
            </button>
          </div>
        </div>

        {/* Cards list */}
        <div className="flex-1 overflow-y-auto p-3 pb-40 space-y-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          {mobileFilteredInterventions.slice(0, mobileDisplayCount).map((int) => {
            const techName = technicians.find((t) => t.id === int.technicianId)?.name;
            const clientName = getClientName(int.clientId);
            const canDepart =
              (int.status === 'SCHEDULED' || (int.status === 'PENDING' && int.scheduledDate && int.technicianId)) &&
              !!onDepart;
            const cardBg = STATUS_COLORS[int.status] || STATUS_COLORS.PENDING;
            return (
              <div
                key={int.id}
                onClick={() => onEdit(int)}
                className={`rounded-xl border p-3 cursor-pointer active:scale-[0.98] transition-transform shadow-sm ${cardBg}`}
              >
                {/* Top row: status + date + ID */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(int.status)}
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      #{int.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)]">{formatDate(int.scheduledDate)}</span>
                </div>
                {/* Client */}
                <p className="font-bold text-sm text-[var(--text-primary)] truncate mb-1">
                  {clientName !== '-' ? clientName : 'Client non défini'}
                </p>
                {/* Type + Nature */}
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="bg-white/70 bg-[var(--bg-elevated)]/70 border border-[var(--border)] px-1.5 py-0.5 rounded text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                    {int.type}
                  </span>
                  {int.nature && (
                    <span className="bg-[var(--primary-dim)]/70 dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] px-1.5 py-0.5 rounded text-[10px] font-medium text-[var(--primary)] dark:text-[var(--primary)]">
                      {int.nature}
                    </span>
                  )}
                </div>
                {/* Location + Tech */}
                <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)]">
                  {int.location && (
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {int.location}
                    </span>
                  )}
                  {techName && (
                    <span className="flex items-center gap-0.5 shrink-0 ml-auto">
                      <User className="w-3 h-3" />
                      {techName}
                    </span>
                  )}
                </div>
                {/* Actions */}
                {canDepart && (
                  <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDepart!(int);
                      }}
                      className="w-full py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 active:scale-95 transition-all"
                    >
                      🚗 Partir en intervention
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {mobileFilteredInterventions.length === 0 &&
            (interventions.length === 0 ? (
              <EmptyState
                compact
                icon={Wrench}
                title="Aucune intervention"
                description="Aucune intervention n'est encore planifiée."
              />
            ) : (
              <EmptyState
                compact
                icon={SearchX}
                title="Aucun résultat"
                description="Aucune intervention ne correspond aux filtres actifs."
              />
            ))}
          {mobileDisplayCount < mobileFilteredInterventions.length && (
            <button
              onClick={() => setMobileDisplayCount((c) => c + 20)}
              className="w-full py-3 text-sm font-medium text-[var(--primary)] dark:text-[var(--primary)] bg-[var(--bg-elevated)] border border-[var(--border)] dark:border-[var(--primary)] rounded-xl hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] transition-colors"
            >
              Afficher plus ({mobileFilteredInterventions.length - mobileDisplayCount} restants)
            </button>
          )}
        </div>

        <MobileFilterSheet
          isOpen={showMobileFilter}
          onClose={() => setShowMobileFilter(false)}
          activeCount={mobileFilterCount}
          onReset={() => {
            setFilterStatusMobile('ALL');
            setFilterNature('ALL');
            setFilterClient('ALL');
            setFilterTechMobile('ALL');
            setFilterResellerMobile('ALL');
          }}
          tabs={[
            {
              id: 'status',
              label: 'Statut',
              activeCount: filterStatusMobile !== 'ALL' ? 1 : 0,
              content: Object.entries(MOBILE_STATUS_LABELS).map(([val, label]) => (
                <FilterRadioRow
                  key={val}
                  value={val}
                  label={label}
                  checked={filterStatusMobile === val}
                  onChange={() => setFilterStatusMobile(val)}
                  count={
                    val === 'ALL'
                      ? sortedInterventions.length
                      : sortedInterventions.filter((i) => i.status === val).length
                  }
                />
              )),
            },
            {
              id: 'nature',
              label: 'Nature',
              activeCount: filterNature !== 'ALL' ? 1 : 0,
              content: (
                <>
                  <FilterRadioRow
                    value="ALL"
                    label="Toutes"
                    checked={filterNature === 'ALL'}
                    onChange={() => setFilterNature('ALL')}
                    count={sortedInterventions.length}
                  />
                  {[...new Set(sortedInterventions.map((i) => i.nature).filter(Boolean))].sort().map((n) => (
                    <FilterRadioRow
                      key={n}
                      value={n!}
                      label={n!}
                      checked={filterNature === n}
                      onChange={() => setFilterNature(n!)}
                      count={sortedInterventions.filter((i) => i.nature === n).length}
                    />
                  ))}
                </>
              ),
            },
            {
              id: 'client',
              label: 'Client',
              activeCount: filterClient !== 'ALL' ? 1 : 0,
              content: (
                <>
                  <FilterRadioRow
                    value="ALL"
                    label="Tous"
                    checked={filterClient === 'ALL'}
                    onChange={() => setFilterClient('ALL')}
                    count={sortedInterventions.length}
                  />
                  {clientOptions.map(([id, name]) => (
                    <FilterRadioRow
                      key={id}
                      value={id}
                      label={name}
                      checked={filterClient === id}
                      onChange={() => setFilterClient(id)}
                      count={sortedInterventions.filter((i) => i.clientId === id).length}
                    />
                  ))}
                </>
              ),
            },
            {
              id: 'technicien',
              label: 'Tech',
              activeCount: filterTechMobile !== 'ALL' ? 1 : 0,
              content: (
                <>
                  <FilterRadioRow
                    value="ALL"
                    label="Tous"
                    checked={filterTechMobile === 'ALL'}
                    onChange={() => setFilterTechMobile('ALL')}
                    count={sortedInterventions.length}
                  />
                  {technicians.map((t) => (
                    <FilterRadioRow
                      key={t.id}
                      value={t.id}
                      label={t.name}
                      checked={filterTechMobile === t.id}
                      onChange={() => setFilterTechMobile(t.id)}
                      count={sortedInterventions.filter((i) => i.technicianId === t.id).length}
                    />
                  ))}
                </>
              ),
            },
            {
              id: 'revendeur',
              label: 'Revendeur',
              activeCount: filterResellerMobile !== 'ALL' ? 1 : 0,
              content: (
                <>
                  <FilterRadioRow
                    value="ALL"
                    label="Tous"
                    checked={filterResellerMobile === 'ALL'}
                    onChange={() => setFilterResellerMobile('ALL')}
                    count={sortedInterventions.length}
                  />
                  {resellerOptions.map((r) => (
                    <FilterRadioRow
                      key={r}
                      value={r}
                      label={r}
                      checked={filterResellerMobile === r}
                      onChange={() => setFilterResellerMobile(r)}
                      count={sortedInterventions.filter((i) => getResellerName(i) === r).length}
                    />
                  ))}
                </>
              ),
            },
          ]}
        />
        <ConfirmDialogComponent />
      </div>
    );
  }

  return (
    <Card className="flex-1 overflow-hidden p-0 border-[var(--border)] flex flex-col relative">
      {/* Toolbar */}
      <div className="p-2 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)]">
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
            <span className="text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] px-2 py-1 rounded">
              {selectedIds.size} sélectionné(s)
            </span>
            <div className="h-4 w-px bg-[var(--border)] bg-[var(--bg-elevated)] mx-2"></div>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors border border-red-100"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
            <button
              onClick={handleBulkInvoice}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors border border-purple-100"
            >
              <FileText className="w-3.5 h-3.5" /> Créer Facture
            </button>
            <div className="flex-1"></div>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 hover:bg-[var(--bg-elevated)] rounded-full"
              aria-label="Effacer la sélection"
              title="Effacer la sélection"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
        ) : (
          <>
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Rechercher (client, tech, plaque, nature, IMEI, ticket...)"
                className="pl-9 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] w-full md:w-64"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Filter button */}
              <div className="relative" ref={filterMenuRef}>
                <button
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`p-2 border rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${
                    hasActiveFilters
                      ? 'border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)] dark:border-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]'
                      : 'border-[var(--border)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                  }`}
                  title="Filtres"
                >
                  <Filter className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 bg-[var(--primary)] text-white rounded-full text-[10px] flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {isFilterMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3">Filtres avancés</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--text-secondary)]">Nature</label>
                        <select
                          className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm"
                          value={filterNature}
                          onChange={(e) => setFilterNature(e.target.value)}
                        >
                          <option value="ALL">Toutes les natures</option>
                          {allNatures.length > 0
                            ? [...new Set(allNatures.map((n) => n.label))].sort().map((label) => (
                                <option key={label} value={label}>
                                  {label}
                                </option>
                              ))
                            : INTERVENTION_NATURES.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--text-secondary)]">Client</label>
                        <select
                          className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm"
                          value={filterClient}
                          onChange={(e) => setFilterClient(e.target.value)}
                        >
                          <option value="ALL">Tous les clients</option>
                          {clientOptions.map(([id, name]) => (
                            <option key={id} value={id}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--text-secondary)]">Revendeur</label>
                        <select
                          className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm"
                          value={filterReseller}
                          onChange={(e) => setFilterReseller(e.target.value)}
                        >
                          <option value="ALL">Tous les revendeurs</option>
                          {resellerOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--text-secondary)]">Facturation</label>
                        <select
                          className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm"
                          value={filterInvoiced}
                          onChange={(e) => setFilterInvoiced(e.target.value as 'ALL' | 'YES' | 'NO')}
                        >
                          <option value="ALL">Toutes</option>
                          <option value="YES">Facturées</option>
                          <option value="NO">Non facturées</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--border)] border-[var(--border)] flex justify-end">
                      <button
                        onClick={() => {
                          setFilterNature('ALL');
                          setFilterClient('ALL');
                          setFilterReseller('ALL');
                          setFilterInvoiced('ALL');
                        }}
                        className="text-xs text-[var(--primary)] hover:text-[var(--primary)] font-medium"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                title="Importer"
              >
                <Upload className="w-4 h-4" />
              </button>
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                  title="Exporter"
                >
                  <Download className="w-4 h-4" />
                </button>
                {isExportMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                    <button
                      onClick={handleExport}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-elevated)] rounded text-sm text-left"
                    >
                      <FileDown className="w-4 h-4 text-red-500" /> Export PDF
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-elevated)] rounded text-sm text-left"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-500" /> Export CSV
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-elevated)] rounded text-sm text-left"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-[var(--primary)]" /> Export Excel
                    </button>
                  </div>
                )}
              </div>
              <div className="relative" ref={columnMenuRef}>
                <button
                  onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                  className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                  title="Colonnes"
                >
                  <LayoutTemplate className="w-4 h-4" />
                </button>
                {isColumnMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 max-h-80 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase px-2 py-1 mb-1">
                      Colonnes visibles
                    </p>
                    {INTERVENTION_COLUMNS.map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] rounded cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(col.id)}
                          onChange={() =>
                            setVisibleColumns((prev) =>
                              prev.includes(col.id) ? prev.filter((id) => id !== col.id) : [...prev, col.id]
                            )
                          }
                          disabled={col.locked}
                          className="rounded border-[var(--border)] text-[var(--primary)]"
                        />
                        <span className="text-[var(--text-primary)]">{col.label}</span>
                        {col.locked && <span className="text-[9px] text-[var(--text-muted)] ml-auto">(fixé)</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="absolute top-[53px] left-0 right-0 h-12 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] flex items-center justify-between px-4 z-20 animate-in fade-in slide-in-from-top-1 border-b border-[var(--primary)] dark:border-[var(--primary)]">
          <span className="text-sm font-bold text-[var(--primary)] dark:text-[var(--primary)]">
            {selectedIds.size} sélectionné(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="text-xs text-red-600 flex items-center gap-1.5 bg-[var(--bg-elevated)] px-3 py-1.5 rounded border border-red-200 dark:border-red-900 hover:bg-[var(--clr-danger-dim)]"
            >
              <Trash2 className="w-3 h-3" /> Supprimer
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded text-[var(--primary)] dark:text-[var(--primary)]"
              aria-label="Effacer la sélection"
              title="Effacer la sélection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto custom-scrollbar pb-16 lg:pb-0">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 w-10 border-b border-[var(--border)]">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
              </th>
              {INTERVENTION_COLUMNS.map(
                (col) =>
                  visibleColumns.includes(col.id) &&
                  (col.id === 'actions' ? (
                    <th
                      key={col.id}
                      className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase whitespace-nowrap border-b border-[var(--border)] text-right"
                      style={{ minWidth: col.minWidth }}
                    >
                      {col.label}
                    </th>
                  ) : (
                    <SortableHeader
                      key={col.id}
                      label={col.label}
                      sortKey={col.id}
                      currentSortKey={intSortConfig.key}
                      currentDirection={intSortConfig.direction}
                      onSort={handleIntSort}
                      className="whitespace-nowrap"
                    />
                  ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-sm bg-[var(--bg-surface)]">
            {paginatedInterventions.map((int) => (
              <tr
                key={int.id}
                className={`density-row hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] transition-colors cursor-pointer ${selectedIds.has(int.id) ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]' : ''}`}
                onClick={() => onEdit(int)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(int.id)}
                    onChange={() => toggleSelection(int.id)}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                </td>
                {visibleColumns.includes('id') && (
                  <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{int.id}</td>
                )}
                {visibleColumns.includes('status') && <td className="px-4 py-3">{getStatusBadge(int.status)}</td>}
                {visibleColumns.includes('scheduledDate') && (
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-primary)]">{formatDate(int.scheduledDate)}</div>
                    <div className="text-[var(--text-secondary)] text-xs">
                      {formatTime(int.scheduledDate)} ({int.duration}m)
                    </div>
                  </td>
                )}
                {visibleColumns.includes('client') && (
                  <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{getClientName(int.clientId)}</td>
                )}
                {visibleColumns.includes('ticket') && (
                  <td className="px-4 py-3 font-mono text-violet-600 dark:text-violet-400">
                    {getTicketNumber(int.ticketId)}
                  </td>
                )}
                {visibleColumns.includes('tech') && (
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {technicians.find((t) => t.id === int.technicianId)?.name || (
                      <span className="text-[var(--text-muted)] italic">Non assigné</span>
                    )}
                  </td>
                )}
                {visibleColumns.includes('type') && (
                  <td className="px-4 py-3">
                    <span className="bg-[var(--bg-elevated)] border border-[var(--border)] px-2 py-0.5 rounded text-xs font-bold text-[var(--text-secondary)] uppercase">
                      {int.type}
                    </span>
                  </td>
                )}
                {visibleColumns.includes('nature') && (
                  <td className="px-4 py-3">
                    <span className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--primary)] dark:border-[var(--primary)] px-2 py-0.5 rounded text-xs font-medium text-[var(--primary)] dark:text-[var(--primary)]">
                      {int.nature}
                    </span>
                  </td>
                )}
                {visibleColumns.includes('location') && (
                  <td className="px-4 py-3 text-[var(--text-secondary)] truncate max-w-[150px]">{int.location}</td>
                )}
                {visibleColumns.includes('vehicle') && (
                  <td className="px-4 py-3 font-mono text-[var(--text-primary)]">
                    {cleanPlate(int.licensePlate) || '-'}
                  </td>
                )}
                {visibleColumns.includes('resolutionTime') && (
                  <td className="px-4 py-3">
                    {int.status === 'COMPLETED' ? (
                      <span
                        className={`font-medium flex items-center gap-1 ${getResolutionTimeColor(calculateResolutionTime(int), int.type)}`}
                      >
                        <Clock className="w-3 h-3" />
                        {formatDuration(calculateResolutionTime(int))}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                )}
                {visibleColumns.includes('cost') && (
                  <td className="px-4 py-3 text-[var(--text-primary)]">{int.cost ? formatPrice(int.cost) : '-'}</td>
                )}

                {visibleColumns.includes('actions') && (
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* Bouton "Partir" visible si SCHEDULED, ou si PENDING avec date et technicien */}
                      {(int.status === 'SCHEDULED' ||
                        (int.status === 'PENDING' && int.scheduledDate && int.technicianId)) &&
                        onDepart && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDepart(int);
                            }}
                            className="px-2 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs font-bold mr-2 flex items-center gap-1 transition-colors"
                            title="Partir en intervention"
                          >
                            🚗 En route
                          </button>
                        )}
                      <button
                        onClick={() => onEdit(int)}
                        className="p-1.5 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)] transition-colors"
                        aria-label="Modifier"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {paginatedInterventions.length === 0 && (
              <tr>
                <td colSpan={20}>
                  {interventions.length === 0 ? (
                    <EmptyState
                      icon={Wrench}
                      title="Aucune intervention"
                      description="Aucune intervention n'est encore planifiée."
                    />
                  ) : (
                    <EmptyState
                      icon={SearchX}
                      title="Aucun résultat"
                      description="Aucune intervention ne correspond aux filtres actifs."
                    />
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-surface)] flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">Lignes par page:</span>
          <select
            className="p-1 border border-[var(--border)] rounded text-xs bg-[var(--bg-surface)]"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-[var(--text-secondary)] ml-2">
            Affichage {paginatedInterventions.length} sur {filteredInterventions.length}
          </span>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages || 1} onPageChange={setCurrentPage} />
      </div>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importer des Interventions"
        maxWidth="max-w-md"
      >
        <div className="p-4 space-y-4">
          <div className="p-4 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg border border-[var(--border)] dark:border-[var(--primary)]">
            <h4 className="font-bold text-[var(--primary)] dark:text-[var(--primary)] text-sm mb-2">Format attendu</h4>
            <p className="text-xs text-[var(--primary)] dark:text-[var(--primary)] mb-2">
              Le fichier CSV doit contenir les colonnes suivantes :
            </p>
            <code className="text-xs bg-[var(--bg-elevated)] p-2 rounded block overflow-x-auto">
              clientId, technicianId, type, nature, scheduledDate, location, licensePlate, notes, cost
            </code>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-secondary)] tr-hover transition-colors"
          >
            <Download className="w-4 h-4" />
            Télécharger le template CSV
          </button>

          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--primary-light)] transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Sélectionner un fichier CSV
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmDialogComponent />
    </Card>
  );
};
