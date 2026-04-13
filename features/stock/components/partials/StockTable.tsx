import React, { useState } from 'react';
import {
  Search,
  ChevronDown,
  Settings,
  LayoutTemplate,
  Box,
  Cpu,
  ArrowUpDown,
  FileSpreadsheet,
  Download,
  X,
  PackageOpen,
  Pencil,
  ArrowRightLeft,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import { Card } from '../../../../components/Card';
import { Pagination } from '../../../../components/Pagination';
import { EmptyState } from '../../../../components/EmptyState';
import type { DeviceStock, Vehicle, Tier } from '../../../../types';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { MobileCard, MobileCardList, MobileCardAction } from '../../../../components/MobileCard';
import { MobileFilterSheet, FilterRadioRow, FilterCheckRow } from '../../../../components/MobileFilterSheet';

interface ColumnDef {
  id: string;
  label: string;
  locked?: boolean;
}

interface StockTableProps {
  activeTab: 'devices' | 'sims' | 'accessories' | 'rma';
  filteredData: DeviceStock[];
  paginatedData: DeviceStock[];
  columns?: ColumnDef[];
  visibleColumns: string[];
  toggleColumn: (colId: string) => void;
  isColumnMenuOpen?: boolean;
  setIsColumnMenuOpen?: (open: boolean) => void;
  columnMenuRef?: React.RefObject<HTMLDivElement>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedClient: string;
  setSelectedClient: (client: string) => void;
  uniqueClients: string[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (column: string) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((p: number) => number)) => void;
  totalPages: number;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  handleSelectAll: (data: DeviceStock[]) => void;
  isAllSelected: boolean;
  onAssignClick: (item: DeviceStock) => void;
  onDetailClick: (item: DeviceStock) => void;
  onAddClick: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onBulkTransfer: (target: 'TECH' | 'SIEGE' | 'CENTRAL') => void;
  onClearSelection: () => void;
  onRmaAction?: (item: DeviceStock, action: 'SEND' | 'RECEIVE_OK' | 'RECEIVE_REPLACE' | 'SCRAP' | 'RESTORE') => void;
  onEditClick?: (item: DeviceStock) => void;
  onTransferClick?: (item: DeviceStock) => void;
  onDeleteClick?: (item: DeviceStock) => void;

  // Nouveaux filtres
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  selectedOperator: string;
  setSelectedOperator: (op: string) => void;
  uniqueOperators: string[];

  // Données de résolution
  vehicles?: Vehicle[];
  tiers?: Tier[];
}

export const StockTable: React.FC<StockTableProps> = ({
  activeTab,
  filteredData,
  paginatedData,
  columns,
  visibleColumns,
  toggleColumn,
  isColumnMenuOpen: isColumnMenuOpenExternal,
  setIsColumnMenuOpen: setIsColumnMenuOpenExternal,
  columnMenuRef: columnMenuRefExternal,
  searchTerm,
  setSearchTerm,
  selectedClient,
  setSelectedClient,
  uniqueClients,
  sortColumn,
  sortDirection,
  handleSort,
  currentPage,
  setCurrentPage,
  totalPages,
  itemsPerPage,
  setItemsPerPage,
  selectedIds,
  toggleSelection,
  handleSelectAll,
  isAllSelected,
  onAssignClick,
  onDetailClick,
  onAddClick,
  onExportCSV,
  onExportPDF,
  onBulkTransfer,
  onClearSelection,
  onRmaAction,
  statusFilter,
  setStatusFilter,
  selectedOperator,
  setSelectedOperator,
  uniqueOperators,
  vehicles = [],
  tiers = [],
  onEditClick,
  onTransferClick,
  onDeleteClick,
}) => {
  // Helpers pour résoudre les noms à partir des IDs
  const resolveVehicleLabel = (vehicleId?: string) => {
    if (!vehicleId) return '-';
    const v = vehicles.find((veh) => veh.id === vehicleId);
    if (!v) return vehicleId;
    return v.licensePlate || v.plate || v.wwPlate || v.name || vehicleId;
  };

  const resolveClientName = (item: DeviceStock) => {
    // Priorité: client (nom du backend JOIN), puis lookup tiers, puis ID
    if (item.client) return item.client;
    if (item.assignedClientId) {
      const t = tiers.find((tier) => tier.id === item.assignedClientId);
      if (t) return t.name;
      return item.assignedClientId;
    }
    return '-';
  };
  const isMobile = useIsMobile();
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [mobileDisplayCount, setMobileDisplayCount] = useState(20);
  const [mobileTypeFilter, setMobileTypeFilter] = useState('all');
  const [mobileModelFilter, setMobileModelFilter] = useState('all');
  const [mobileResellerFilter, setMobileResellerFilter] = useState('all');

  // Valeurs uniques dérivées pour les filtres mobiles
  const uniqueTypes = React.useMemo(
    () =>
      Array.from(new Set(filteredData.map((d) => d.type || 'BOX')))
        .filter(Boolean)
        .sort(),
    [filteredData]
  );
  const uniqueModels = React.useMemo(
    () =>
      Array.from(new Set(filteredData.map((d) => d.model || '')))
        .filter(Boolean)
        .sort(),
    [filteredData]
  );
  const uniqueResellers = React.useMemo(
    () =>
      Array.from(new Set(filteredData.map((d) => d.resellerName || '')))
        .filter(Boolean)
        .sort(),
    [filteredData]
  );

  // Données filtrées mobile (applique les filtres supplémentaires localement)
  const mobileFilteredData = React.useMemo(
    () =>
      filteredData.filter((d) => {
        const matchesType = mobileTypeFilter === 'all' || (d.type || 'BOX') === mobileTypeFilter;
        const matchesModel = mobileModelFilter === 'all' || d.model === mobileModelFilter;
        const matchesReseller = mobileResellerFilter === 'all' || d.resellerName === mobileResellerFilter;
        return matchesType && matchesModel && matchesReseller;
      }),
    [filteredData, mobileTypeFilter, mobileModelFilter, mobileResellerFilter]
  );

  const mobileActiveCount =
    (statusFilter !== 'ALL' ? 1 : 0) +
    (selectedClient !== 'all' ? 1 : 0) +
    (mobileTypeFilter !== 'all' ? 1 : 0) +
    (mobileModelFilter !== 'all' ? 1 : 0) +
    (mobileResellerFilter !== 'all' ? 1 : 0);

  // Internal state for column menu if not provided
  const [isColumnMenuOpenInternal, setIsColumnMenuOpenInternal] = React.useState(false);
  const columnMenuRefInternal = React.useRef<HTMLDivElement>(null);

  const isColumnMenuOpen = isColumnMenuOpenExternal ?? isColumnMenuOpenInternal;
  const setIsColumnMenuOpen = setIsColumnMenuOpenExternal ?? setIsColumnMenuOpenInternal;
  const columnMenuRef = columnMenuRefExternal ?? columnMenuRefInternal;

  const currentColumns =
    columns ||
    (activeTab === 'devices'
      ? [
          { id: 'id', label: 'ID / Référence' },
          { id: 'model', label: 'Modèle' },
          { id: 'imei', label: 'IMEI' },
          { id: 'status', label: 'Statut' },
          { id: 'location', label: 'Localisation' },
          { id: 'assignment', label: 'Affectation' },
          { id: 'client', label: 'Client' },
          { id: 'sim', label: 'SIM (Numéro)' },
          { id: 'entryDate', label: "Date d'entrée" },
          { id: 'installationDate', label: "Date d'installation" },
          { id: 'removalDate', label: 'Date de sortie' },
          { id: 'tech_info', label: 'Info Technique' },
          { id: 'actions', label: 'Actions', locked: true },
        ]
      : activeTab === 'sims'
        ? [
            { id: 'id', label: 'ICCID' },
            { id: 'phoneNumber', label: 'Numéro (MSISDN)' },
            { id: 'operator', label: 'Opérateur' },
            { id: 'status', label: 'Statut' },
            { id: 'location', label: 'Localisation' },
            { id: 'assignment', label: 'Affectation' },
            { id: 'client', label: 'Client' },
            { id: 'entryDate', label: "Date d'entrée" },
            { id: 'installationDate', label: "Date d'installation" },
            { id: 'removalDate', label: 'Date de sortie' },
            { id: 'actions', label: 'Actions', locked: true },
          ]
        : [
            { id: 'id', label: 'ID / Référence' },
            { id: 'model', label: 'Modèle' },
            { id: 'type', label: 'Type' },
            { id: 'status', label: 'Statut' },
            { id: 'location', label: 'Localisation' },
            { id: 'assignment', label: 'Affectation' },
            { id: 'client', label: 'Client' },
            { id: 'entryDate', label: "Date d'entrée" },
            { id: 'installationDate', label: "Date d'installation" },
            { id: 'removalDate', label: 'Date de sortie' },
            { id: 'actions', label: 'Actions', locked: true },
          ]);
  return (
    <Card
      className="flex-1 flex flex-col border-[var(--border)] shadow-sm"
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--text-secondary)] hidden sm:block">{filteredData.length} éléments</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isMobile && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Rechercher (IMEI, ICCID...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-1.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] w-full sm:w-64 bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                />
              </div>
            )}

            {/* Status Filter — desktop only */}
            {!isMobile && (
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-3 pr-8 py-1.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[var(--text-primary)] appearance-none cursor-pointer min-w-[120px]"
                >
                  <option value="ALL">Tous statuts</option>
                  <option value="IN_STOCK">En Stock</option>
                  <option value="INSTALLED">Installé</option>
                  <option value="RMA_PENDING">RMA Attente</option>
                  <option value="SENT_TO_SUPPLIER">Chez Fournisseur</option>
                  <option value="REMOVED">Retiré</option>
                  <option value="LOST">Perdu</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            )}

            {/* Client Filter — desktop only */}
            {!isMobile && uniqueClients.length > 0 && (
              <div className="relative">
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="pl-3 pr-8 py-1.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none cursor-pointer min-w-[130px]"
                >
                  <option value="all">Tous les clients</option>
                  {uniqueClients.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            )}

            {/* Operator Filter — desktop + SIM only */}
            {!isMobile && activeTab === 'sims' && uniqueOperators.length > 0 && (
              <div className="relative">
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="pl-3 pr-8 py-1.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none cursor-pointer min-w-[130px]"
                >
                  <option value="all">Tous opérateurs</option>
                  {uniqueOperators.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            )}

            {/* Column Manager + Exports — desktop only */}
            {!isMobile && (
              <>
                <div className="relative" ref={columnMenuRef}>
                  <button
                    onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                    className={`p-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors ${isColumnMenuOpen ? 'bg-[var(--bg-elevated)] ring-2 ring-[var(--primary)]/20' : ''}`}
                  >
                    <LayoutTemplate className="w-4 h-4" />
                  </button>
                  {isColumnMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 bg-[var(--bg-elevated)] border-b border-[var(--border)] border-[var(--border)] text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                        Colonnes
                      </div>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                        {currentColumns.map((col) => (
                          <label
                            key={col.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns.includes(col.id)}
                              onChange={() => toggleColumn(col.id)}
                              disabled={col.locked}
                              className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                            />
                            <span className="text-[var(--text-primary)]">{col.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={onExportCSV}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-lg border border-[var(--border)] text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)] hover:bg-[var(--primary-dim)] transition-colors"
                    title="Exporter CSV"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> <span className="hidden lg:inline">CSV</span>
                  </button>
                  <button
                    onClick={onExportPDF}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-lg border border-red-200 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 hover:bg-red-100 transition-colors"
                    title="Exporter PDF"
                  >
                    <Download className="w-4 h-4" /> <span className="hidden lg:inline">PDF</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="bg-[var(--bg-surface)] flex flex-col relative">
        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="absolute top-0 left-0 right-0 h-12 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] flex items-center justify-between px-4 z-20 animate-in fade-in slide-in-from-top-1 border-b border-[var(--primary)] dark:border-[var(--primary)]">
            <span className="text-sm font-bold text-[var(--primary)] dark:text-[var(--primary)]">
              {selectedIds.size} sélectionné(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onBulkTransfer('TECH')}
                className="text-xs bg-[var(--bg-elevated)] border border-[var(--border)] dark:border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary)] px-3 py-1.5 rounded shadow-sm hover:bg-[var(--primary-dim)]"
              >
                Transférer au Tech
              </button>
              <button
                onClick={() => onBulkTransfer('SIEGE')}
                className="text-xs bg-[var(--bg-elevated)] border border-[var(--border)] dark:border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary)] px-3 py-1.5 rounded shadow-sm hover:bg-[var(--primary-dim)]"
              >
                Vers Siège
              </button>
              <button
                onClick={() => onBulkTransfer('CENTRAL')}
                className="text-xs bg-[var(--bg-elevated)] border border-[var(--border)] dark:border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary)] px-3 py-1.5 rounded shadow-sm hover:bg-[var(--primary-dim)]"
              >
                Retour Dépôt
              </button>
              <button
                onClick={onClearSelection}
                className="p-1 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded text-[var(--primary)] dark:text-[var(--primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {filteredData.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="Aucun élément trouvé"
            description={
              searchTerm
                ? `Aucun résultat pour "${searchTerm}". Essayez une autre recherche.`
                : 'Votre stock est vide. Commencez par ajouter des équipements.'
            }
            actionLabel="Ajouter un équipement"
            onAction={onAddClick}
          />
        ) : isMobile ? (
          <>
            {/* Mobile toolbar: search + filter button */}
            <div className="flex items-center gap-2 p-3 border-b border-[var(--border)] border-[var(--border)]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[var(--bg-elevated)] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <button
                onClick={() => setShowMobileFilter(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors shrink-0 ${
                  statusFilter !== 'ALL' || selectedClient !== 'all'
                    ? 'bg-[var(--primary-dim)] border-[var(--primary)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)]'
                    : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {(statusFilter !== 'ALL' || selectedClient !== 'all') && (
                  <span className="bg-[var(--primary-dim)]0 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {(statusFilter !== 'ALL' ? 1 : 0) + (selectedClient !== 'all' ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>

            <MobileCardList bordered={false}>
              {mobileFilteredData.slice(0, mobileDisplayCount).map((item: DeviceStock) => {
                const borderColor =
                  item.status === 'IN_STOCK'
                    ? 'border-l-blue-500'
                    : item.status === 'INSTALLED'
                      ? 'border-l-green-500'
                      : item.status === 'RMA_PENDING'
                        ? 'border-l-amber-500'
                        : item.status === 'SENT_TO_SUPPLIER'
                          ? 'border-l-purple-500'
                          : item.status === 'REMOVED' || item.status === 'LOST'
                            ? 'border-l-red-500'
                            : 'border-l-slate-400';
                const statusLabel =
                  item.status === 'INSTALLED'
                    ? 'Installé'
                    : item.status === 'IN_STOCK'
                      ? 'En Stock'
                      : item.status === 'RMA_PENDING'
                        ? 'SAV: Attente'
                        : item.status === 'SENT_TO_SUPPLIER'
                          ? 'Chez Fournisseur'
                          : item.status === 'REMOVED'
                            ? 'Retiré'
                            : item.status;
                const statusColors =
                  item.status === 'INSTALLED'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : item.status === 'IN_STOCK'
                      ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)]'
                      : item.status === 'RMA_PENDING'
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                        : item.status === 'SENT_TO_SUPPLIER'
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
                const locationLabel =
                  item.location === 'CLIENT'
                    ? 'Chez Client'
                    : item.location === 'TECH'
                      ? `Tech: ${item.technicianId || '?'}`
                      : item.location === 'SIEGE'
                        ? 'Siège'
                        : 'Dépôt';
                const clientName = resolveClientName(item);
                const vehicleLabel = resolveVehicleLabel(item.assignedVehicleId);
                return (
                  <MobileCard key={item.id} borderColor={borderColor}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold font-mono text-[var(--text-primary)] truncate">
                          {item.imei || item.id}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">{item.model || item.type || '-'}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
                        {locationLabel}
                      </span>
                      {clientName !== '-' && (
                        <span className="text-[10px] font-medium text-[var(--text-secondary)]">{clientName}</span>
                      )}
                      {item.status === 'INSTALLED' && vehicleLabel !== '-' && (
                        <span className="text-[10px] font-mono text-[var(--primary)] dark:text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] px-1.5 py-0 rounded">
                          {vehicleLabel}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {onEditClick && (
                        <MobileCardAction
                          icon={<Pencil className="w-3 h-3" />}
                          color="blue"
                          onClick={() => onEditClick!(item)}
                        >
                          Modifier
                        </MobileCardAction>
                      )}
                      {onTransferClick && (
                        <MobileCardAction
                          icon={<ArrowRightLeft className="w-3 h-3" />}
                          color="purple"
                          onClick={() => onTransferClick!(item)}
                        >
                          Transférer
                        </MobileCardAction>
                      )}
                      <MobileCardAction
                        icon={<Settings className="w-3 h-3" />}
                        color="slate"
                        onClick={() => onDetailClick(item)}
                      >
                        Détails
                      </MobileCardAction>
                    </div>
                  </MobileCard>
                );
              })}
              {mobileDisplayCount < mobileFilteredData.length && (
                <div className="p-3">
                  <button
                    onClick={() => setMobileDisplayCount((c) => c + 20)}
                    className="w-full py-3 text-sm font-medium text-[var(--primary)] dark:text-[var(--primary)] bg-[var(--bg-elevated)] border border-[var(--border)] dark:border-[var(--primary)] rounded-xl hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] transition-colors"
                  >
                    Afficher plus ({mobileFilteredData.length - mobileDisplayCount} restants)
                  </button>
                </div>
              )}
            </MobileCardList>

            {/* Mobile Filter Sheet */}
            <MobileFilterSheet
              isOpen={showMobileFilter}
              onClose={() => setShowMobileFilter(false)}
              activeCount={mobileActiveCount}
              onReset={() => {
                setStatusFilter('ALL');
                setSelectedClient('all');
                setMobileTypeFilter('all');
                setMobileModelFilter('all');
                setMobileResellerFilter('all');
              }}
              tabs={[
                {
                  id: 'status',
                  label: 'Statut',
                  activeCount: statusFilter !== 'ALL' ? 1 : 0,
                  content: (
                    <>
                      {[
                        { value: 'ALL', label: 'Tous' },
                        { value: 'IN_STOCK', label: 'En Stock' },
                        { value: 'INSTALLED', label: 'Installé' },
                        { value: 'RMA_PENDING', label: 'SAV: Attente' },
                        { value: 'SENT_TO_SUPPLIER', label: 'Chez Fournisseur' },
                        { value: 'REMOVED', label: 'Retiré' },
                        { value: 'LOST', label: 'Perdu' },
                      ].map((opt) => (
                        <FilterRadioRow
                          key={opt.value}
                          value={opt.value}
                          label={opt.label}
                          checked={statusFilter === opt.value}
                          onChange={() => setStatusFilter(opt.value)}
                        />
                      ))}
                    </>
                  ),
                },
                {
                  id: 'client',
                  label: 'Client',
                  activeCount: selectedClient !== 'all' ? 1 : 0,
                  content: (
                    <>
                      <FilterRadioRow
                        value="all"
                        label="Tous les clients"
                        checked={selectedClient === 'all'}
                        onChange={() => setSelectedClient('all')}
                      />
                      {uniqueClients.map((c) => (
                        <FilterRadioRow
                          key={c}
                          value={c}
                          label={c}
                          checked={selectedClient === c}
                          onChange={() => setSelectedClient(c)}
                          count={filteredData.filter((d) => d.client === c).length}
                        />
                      ))}
                    </>
                  ),
                },
                {
                  id: 'type',
                  label: 'Type',
                  activeCount: mobileTypeFilter !== 'all' ? 1 : 0,
                  content: (
                    <>
                      <FilterRadioRow
                        value="all"
                        label="Tous les types"
                        checked={mobileTypeFilter === 'all'}
                        onChange={() => setMobileTypeFilter('all')}
                      />
                      {uniqueTypes.map((t) => (
                        <FilterRadioRow
                          key={t}
                          value={t}
                          label={t}
                          checked={mobileTypeFilter === t}
                          onChange={() => setMobileTypeFilter(t)}
                          count={filteredData.filter((d) => (d.type || 'BOX') === t).length}
                        />
                      ))}
                    </>
                  ),
                },
                {
                  id: 'model',
                  label: 'Modèle GPS',
                  activeCount: mobileModelFilter !== 'all' ? 1 : 0,
                  content: (
                    <>
                      <FilterRadioRow
                        value="all"
                        label="Tous les modèles"
                        checked={mobileModelFilter === 'all'}
                        onChange={() => setMobileModelFilter('all')}
                      />
                      {uniqueModels.map((m) => (
                        <FilterRadioRow
                          key={m}
                          value={m}
                          label={m}
                          checked={mobileModelFilter === m}
                          onChange={() => setMobileModelFilter(m)}
                          count={filteredData.filter((d) => d.model === m).length}
                        />
                      ))}
                    </>
                  ),
                },
                {
                  id: 'reseller',
                  label: 'Revendeur',
                  activeCount: mobileResellerFilter !== 'all' ? 1 : 0,
                  content:
                    uniqueResellers.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)] text-center py-8">Aucun revendeur disponible</p>
                    ) : (
                      <>
                        <FilterRadioRow
                          value="all"
                          label="Tous les revendeurs"
                          checked={mobileResellerFilter === 'all'}
                          onChange={() => setMobileResellerFilter('all')}
                        />
                        {uniqueResellers.map((r) => (
                          <FilterRadioRow
                            key={r}
                            value={r}
                            label={r}
                            checked={mobileResellerFilter === r}
                            onChange={() => setMobileResellerFilter(r)}
                            count={filteredData.filter((d) => d.resellerName === r).length}
                          />
                        ))}
                      </>
                    ),
                },
              ]}
            />
          </>
        ) : (
          <div className="overflow-auto custom-scrollbar max-h-[calc(100vh-380px)]">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 w-10 border-b border-[var(--border)]">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={() => handleSelectAll(paginatedData)}
                      className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                  </th>
                  {currentColumns.map(
                    (col) =>
                      visibleColumns.includes(col.id) && (
                        <th
                          key={col.id}
                          className={`px-6 py-3 text-xs font-bold uppercase border-b border-[var(--border)] ${col.id === 'actions' ? 'text-right' : ''} ${col.id !== 'actions' && col.id !== 'id' ? 'cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors' : ''}`}
                          onClick={() => col.id !== 'actions' && col.id !== 'id' && handleSort(col.id)}
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {col.id !== 'actions' && col.id !== 'id' && (
                              <ArrowUpDown
                                className={`w-3 h-3 ${sortColumn === col.id ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
                              />
                            )}
                            {sortColumn === col.id && (
                              <span className="text-[var(--primary)] text-[10px]">
                                {sortDirection === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>
                      )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-surface)]">
                {paginatedData.map((item: DeviceStock) => (
                  <tr
                    key={item.id}
                    className={`tr-hover/50 transition-colors group ${selectedIds.has(item.id) ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                    </td>

                    {visibleColumns.includes('id') && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border)] text-[var(--text-secondary)]">
                            {activeTab === 'devices' ? (
                              <Cpu className="w-4 h-4" />
                            ) : activeTab === 'sims' ? (
                              <Cpu className="w-4 h-4" />
                            ) : (
                              <Box className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">{item.id}</p>
                            {item.id !== item.imei && item.imei && (
                              <p className="text-xs font-mono text-[var(--text-secondary)]">{item.imei}</p>
                            )}
                          </div>
                        </div>
                      </td>
                    )}

                    {visibleColumns.includes('model') && (
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-medium">
                        {item.model || '-'}
                      </td>
                    )}

                    {visibleColumns.includes('imei') && (
                      <td className="px-6 py-4 text-sm font-mono text-[var(--text-secondary)]">
                        {item.imei || item.serialNumber || '-'}
                      </td>
                    )}

                    {visibleColumns.includes('phoneNumber') && (
                      <td className="px-6 py-4 text-sm font-semibold text-[var(--primary)] dark:text-[var(--primary)]">
                        {item.phoneNumber || '-'}
                      </td>
                    )}

                    {visibleColumns.includes('operator') && (
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-medium">
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-semibold">
                          {item.operator || '-'}
                        </span>
                      </td>
                    )}

                    {visibleColumns.includes('type') && (
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.type}</td>
                    )}

                    {visibleColumns.includes('status') && (
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold border uppercase ${
                            item.status === 'INSTALLED'
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                              : item.status === 'IN_STOCK'
                                ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] border-[var(--border)] dark:border-[var(--primary)]'
                                : item.status === 'RMA_PENDING'
                                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                  : item.status === 'SENT_TO_SUPPLIER'
                                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                                    : item.status === 'REMOVED'
                                      ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]'
                                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                          }`}
                        >
                          {item.status === 'INSTALLED'
                            ? 'Installé'
                            : item.status === 'IN_STOCK'
                              ? 'En Stock'
                              : item.status === 'RMA_PENDING'
                                ? 'SAV: Attente'
                                : item.status === 'SENT_TO_SUPPLIER'
                                  ? 'Chez Fournisseur'
                                  : item.status === 'REMOVED'
                                    ? 'Retiré (Audit)'
                                    : item.status}
                        </span>
                      </td>
                    )}

                    {visibleColumns.includes('location') && (
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold border uppercase ${
                            item.location === 'CLIENT'
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                              : item.location === 'TECH'
                                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                                : item.location === 'SIEGE'
                                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]'
                          }`}
                        >
                          {item.location === 'CLIENT'
                            ? 'Chez Client'
                            : item.location === 'TECH'
                              ? `Tech: ${item.technicianId || '?'}`
                              : item.location === 'SIEGE'
                                ? 'Siège'
                                : 'Dépôt Central'}
                        </span>
                      </td>
                    )}

                    {visibleColumns.includes('assignment') && (
                      <td className="px-6 py-4">
                        {item.status === 'IN_STOCK' ? (
                          <button
                            onClick={() => onAssignClick(item)}
                            className="text-xs text-[var(--primary)] hover:underline font-medium"
                          >
                            Assigner
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {item.vehiclePlate || resolveVehicleLabel(item.assignedVehicleId)}
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.includes('client') && (
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{resolveClientName(item)}</td>
                    )}

                    {visibleColumns.includes('sim') && (
                      <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">
                        {item.simCardId ? (
                          <span className="font-bold text-[var(--text-primary)]">
                            {item.phoneNumber || item.simCardId}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    )}

                    {visibleColumns.includes('entryDate') && (
                      <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">
                        {item.entryDate ? new Date(item.entryDate).toLocaleDateString('fr-FR') : '-'}
                      </td>
                    )}
                    {visibleColumns.includes('installationDate') && (
                      <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">
                        {item.installationDate ? new Date(item.installationDate).toLocaleDateString('fr-FR') : '-'}
                      </td>
                    )}
                    {visibleColumns.includes('removalDate') && (
                      <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">
                        {item.removalDate ? new Date(item.removalDate).toLocaleDateString('fr-FR') : '-'}
                      </td>
                    )}

                    {visibleColumns.includes('tech_info') && (
                      <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">{item.simCardId}</td>
                    )}

                    {visibleColumns.includes('actions') && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {activeTab === 'rma' && onRmaAction && (
                            <>
                              {item.status === 'RMA_PENDING' && (
                                <button
                                  onClick={() => onRmaAction(item, 'SEND')}
                                  className="px-2 py-1 bg-[var(--primary)] text-white text-[10px] font-bold rounded hover:bg-[var(--primary-light)] transition-colors"
                                >
                                  Envoyer
                                </button>
                              )}
                              {item.status === 'SENT_TO_SUPPLIER' && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => onRmaAction(item, 'RECEIVE_OK')}
                                    className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700 transition-colors"
                                  >
                                    Reçu OK
                                  </button>
                                  <button
                                    onClick={() => onRmaAction(item, 'RECEIVE_REPLACE')}
                                    className="px-2 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700 transition-colors"
                                  >
                                    Échange
                                  </button>
                                </div>
                              )}
                              {item.status === 'REMOVED' && (
                                <button
                                  onClick={() => onRmaAction(item, 'RESTORE')}
                                  className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition-colors"
                                >
                                  Réintégrer
                                </button>
                              )}
                              {['RMA_PENDING', 'SENT_TO_SUPPLIER', 'REMOVED'].includes(item.status) && (
                                <button
                                  onClick={() => onRmaAction(item, 'SCRAP')}
                                  className="px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[10px] font-bold rounded hover:bg-[var(--border)] transition-colors"
                                  title="Mettre au rebut"
                                >
                                  Pilon
                                </button>
                              )}
                            </>
                          )}
                          {onEditClick && (
                            <button
                              onClick={() => onEditClick(item)}
                              className="p-1.5 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] dark:hover:text-[var(--primary)] transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {onTransferClick && (
                            <button
                              onClick={() => onTransferClick(item)}
                              className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg text-[var(--text-muted)] hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                              title="Transférer"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteClick && ['IN_STOCK', 'REMOVED', 'SCRAPPED', 'LOST'].includes(item.status) && (
                            <button
                              onClick={() => onDeleteClick(item)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onDetailClick(item)}
                            className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] transition-colors"
                            title="Voir les détails"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {filteredData.length > 0 && (
        <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-surface)] flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)]">Lignes par page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="text-xs border border-[var(--border)] rounded bg-[var(--bg-surface)] text-[var(--text-primary)] p-1"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages || 1} onPageChange={setCurrentPage} />
        </div>
      )}
    </Card>
  );
};
