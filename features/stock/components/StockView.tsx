import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import {
  Box,
  Plus,
  Cpu,
  PackageOpen,
  PieChart,
  History,
  AlertTriangle,
  Upload,
  Smartphone,
  Activity,
} from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { Card } from '../../../components/Card';

import { Tabs } from '../../../components/Tabs';
import { MobileTabLayout } from '../../../components/MobileTabLayout';
import type { DeviceStock } from '../../../types';
type DeviceStockForm = Partial<DeviceStock> & { customModel?: string };
import { useDataContext } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../components/ConfirmDialog';

import { DeviceStockSchema } from '../../../schemas/stockSchema';
import { z } from 'zod';

// recharts charts moved to StockOverview.tsx
import { generatePDF } from '../../../services/pdfService';
import { useTenantBranding } from '../../../hooks/useTenantBranding';
import { api } from '../../../services/apiLazy';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';

import { StockOverview } from './partials/StockOverview';
import { StockTable } from './partials/StockTable';
import { StockMovementsTable } from './partials/StockMovementsTable';
import {
  AddDeviceModal,
  AssignModal,
  TransferModal,
  BulkImportModal,
  EditDeviceModal,
  IndividualTransferModal,
} from './partials/StockModals';
import { StockDetailModal } from './partials/StockDetailModal';

// NOTE: Partials disponibles dans ./partials/ pour refactorisation future:
// - StockOverview, StockMovements, StockTable, StockModals (AddDeviceModal, AssignModal, TransferModal, BulkImportModal)

// --- CONSTANTS & HELPERS (Keeping existing logic) ---
const DEVICE_COLUMNS = [
  { id: 'id', label: 'ID / Référence' },
  { id: 'model', label: 'Modèle' },
  { id: 'imei', label: 'IMEI' }, // Added explicit IMEI column
  { id: 'status', label: 'Statut' },
  { id: 'location', label: 'Localisation' },
  { id: 'assignment', label: 'Affectation' },
  { id: 'client', label: 'Client' },
  { id: 'sim', label: 'SIM (Numéro)' }, // Renamed for clarity
  { id: 'entryDate', label: "Date d'entrée" },
  { id: 'installationDate', label: "Date d'installation" },
  { id: 'removalDate', label: 'Date de sortie' },
  { id: 'tech_info', label: 'Info Technique' },
  { id: 'actions', label: 'Actions', locked: true },
];

const SIM_COLUMNS = [
  { id: 'id', label: 'ICCID' }, // Renamed for clarity
  { id: 'phoneNumber', label: 'Numéro (MSISDN)' }, // Added Phone Number
  { id: 'operator', label: 'Opérateur' },
  { id: 'status', label: 'Statut' },
  { id: 'location', label: 'Localisation' },
  { id: 'assignment', label: 'Affectation' },
  { id: 'client', label: 'Client' },
  { id: 'entryDate', label: "Date d'entrée" },
  { id: 'installationDate', label: "Date d'installation" },
  { id: 'removalDate', label: 'Date de sortie' },
  { id: 'actions', label: 'Actions', locked: true },
];

const ACCESSORY_COLUMNS = [
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
];

const STOCK_TABS = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    icon: PieChart,
    color: 'bg-[var(--primary-dim)]0',
    description: 'KPIs et synthèse du stock',
  },
  { id: 'devices', label: 'Boîtiers GPS', icon: Box, color: 'bg-indigo-500', description: 'Trackers et boîtiers' },
  { id: 'sims', label: 'Cartes SIM', icon: Cpu, color: 'bg-teal-500', description: 'Gestion des SIM' },
  {
    id: 'accessories',
    label: 'Accessoires',
    icon: PackageOpen,
    color: 'bg-orange-500',
    description: 'Câbles, antennes...',
  },
  {
    id: 'movements',
    label: 'Mouvements',
    icon: History,
    color: 'bg-[var(--text-secondary)]',
    description: 'Historique des mouvements',
  },
  { id: 'rma', label: 'SAV / RMA', icon: AlertTriangle, color: 'bg-red-500', description: 'Retours et réparations' },
];

const STOCK_MOBILE_HIDDEN = new Set(['overview', 'movements', 'rma']);

interface StockViewProps {
  initialTab?: string;
}

export const StockView: React.FC<StockViewProps> = ({ initialTab }) => {
  const isMobile = useIsMobile();
  const visibleStockTabs = isMobile ? STOCK_TABS.filter((t) => !STOCK_MOBILE_HIDDEN.has(t.id)) : STOCK_TABS;
  const { vehicles, stock, updateDevice, addDevice, deleteDevice, users, catalogItems, tiers, stockMovements } =
    useDataContext();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { branding } = useTenantBranding();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'sims' | 'accessories' | 'movements' | 'rma'>(
    'overview'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedOperator, setSelectedOperator] = useState('all');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const uniqueClients = useMemo(() => {
    return Array.from(new Set(stock.map((item) => item.client || '')))
      .filter(Boolean)
      .sort();
  }, [stock]);

  const uniqueOperators = useMemo(() => {
    return Array.from(new Set(stock.filter((d) => d.type === 'SIM').map((item) => item.operator || '')))
      .filter(Boolean)
      .sort();
  }, [stock]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<DeviceStock | null>(null);
  const [selectedVehicleForAssign, setSelectedVehicleForAssign] = useState('');
  const [selectedClientForAssign, setSelectedClientForAssign] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<'CENTRAL' | 'SIEGE' | 'TECH'>('TECH');
  const [selectedTechId, setSelectedTechId] = useState('');
  const [newItem, setNewItem] = useState<DeviceStockForm>({ type: 'BOX', status: 'IN_STOCK' });

  // Import en bloc
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [bulkImportPreview, setBulkImportPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit & Individual Transfer
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<DeviceStock | null>(null);
  const [isIndividualTransferOpen, setIsIndividualTransferOpen] = useState(false);
  const [transferItem, setTransferItem] = useState<DeviceStock | null>(null);

  // Device models (tracker models from Administration > Paramètres)
  const [deviceModels, setDeviceModels] = useState<{ id: string; brand: string; model: string }[]>([]);

  useEffect(() => {
    api.techSettings
      .getDeviceModels()
      .then((models: { id: string; brand: string; model: string; is_active?: boolean }[]) => {
        setDeviceModels(models.filter((m) => m.is_active !== false));
      })
      .catch(() => {
        /* device models optional */
      });
  }, []);

  // Historique overview
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');
  const [historyPage, setHistoryPage] = useState(1);

  // Columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEVICE_COLUMNS.map((c) => c.id));
  const [_isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ... (Effects for Tab, Search, Click Outside remain same) ...
  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'DEVICES') setActiveTab('devices');
      else if (initialTab === 'SIMS') setActiveTab('sims');
      else if (initialTab === 'ACCESSORIES') setActiveTab('accessories');
    }
  }, [initialTab]);

  // On mobile, 'overview' tab is hidden — default to 'devices'
  useEffect(() => {
    if (isMobile && activeTab === 'overview') setActiveTab('devices');
  }, [isMobile]);

  useEffect(() => {
    if (activeTab === 'devices') {
      setVisibleColumns(DEVICE_COLUMNS.map((c) => c.id));
    } else if (activeTab === 'sims') {
      setVisibleColumns(SIM_COLUMNS.map((c) => c.id));
    } else {
      setVisibleColumns(ACCESSORY_COLUMNS.map((c) => c.id));
    }
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage, selectedOperator]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (colId: string) => {
    setVisibleColumns((prev) => (prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]));
  };

  // Techniciens (users with role TECH)
  const technicians = useMemo(() => users.filter((u) => u.role === 'TECH'), [users]);

  const stats = useMemo(() => {
    const boxes = stock.filter((d) => (d.type || 'BOX') === 'BOX');
    const sims = stock.filter((d) => (d.type || 'BOX') === 'SIM');
    const accessories = stock.filter((d) => (d.type || 'BOX') === 'SENSOR' || (d.type || 'BOX') === 'ACCESSORY');

    // SIM par opérateur
    const simsByOperator: Record<string, number> = {};
    sims.forEach((s) => {
      const op = s.operator || s.model || 'Inconnu';
      simsByOperator[op] = (simsByOperator[op] || 0) + 1;
    });

    // Stock par technicien
    const stockByTech: Record<string, { name: string; boxes: number; sims: number; accessories: number }> = {};
    technicians.forEach((t) => {
      stockByTech[t.id] = { name: t.name, boxes: 0, sims: 0, accessories: 0 };
    });
    stock.forEach((item) => {
      if (item.location === 'TECH' && item.technicianId && stockByTech[item.technicianId]) {
        const type = item.type || 'BOX';
        if (type === 'BOX') stockByTech[item.technicianId].boxes++;
        else if (type === 'SIM') stockByTech[item.technicianId].sims++;
        else stockByTech[item.technicianId].accessories++;
      }
    });

    return {
      totalDevices: boxes.length,
      inStockDevices: boxes.filter((d) => d.status === 'IN_STOCK').length,
      installedDevices: boxes.filter((d) => d.status === 'INSTALLED').length,
      rmaDevices: boxes.filter((d) => ['RMA_PENDING', 'SENT_TO_SUPPLIER'].includes(d.status)).length,
      lostDevices: boxes.filter((d) => d.status === 'LOST').length,
      removedDevices: boxes.filter((d) => d.status === 'REMOVED').length,

      totalSims: sims.length,
      activeSims: sims.filter((d) => d.status === 'INSTALLED').length,
      inStockSims: sims.filter((d) => d.status === 'IN_STOCK').length,
      simsByOperator,

      totalAccessories: accessories.length,
      inStockAccessories: accessories.filter((d) => d.status === 'IN_STOCK').length,
      installedAccessories: accessories.filter((d) => d.status === 'INSTALLED').length,

      stockByTech,

      // Stock par localisation
      centralStock: stock.filter((d) => d.location === 'CENTRAL').length,
      siegeStock: stock.filter((d) => d.location === 'SIEGE').length,
      techStock: stock.filter((d) => d.location === 'TECH').length,
      clientStock: stock.filter((d) => d.location === 'CLIENT').length,

      // Alertes
      lowStockBoxes: boxes.filter((d) => d.status === 'IN_STOCK').length < 5,
      pendingRma: boxes.filter((d) => d.status === 'RMA_PENDING').length,
      simsLowStock: sims.filter((d) => d.status === 'IN_STOCK').length < 10,
    };
  }, [stock, technicians]);

  // Fonctions import en bloc
  const handleDownloadTemplate = () => {
    const template = `type;imei;iccid;phoneNumber;operator;model;serialNumber;status;location;client;notes
BOX;123456789012345;;;;"Teltonika FMB920";;IN_STOCK;CENTRAL;Client ABC;Notes
SIM;;8933100000000000;0612345678;Orange;;"Carte SIM";IN_STOCK;CENTRAL;Client ABC;
ACCESSORY;;;;;"Capteur Température";SN-001;IN_STOCK;CENTRAL;Client ABC;Capteur`;
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_import_stock.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast(TOAST.IO.TEMPLATE_DOWNLOADED, 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';', // Force semicolon as used in template
      complete: (results) => {
        const previewItems = results.data.map((row: any, idx) => ({
          ...row,
          _row: idx + 2,
        }));
        setBulkImportPreview(previewItems);
        showToast(TOAST.IO.IMPORT_SUCCESS(previewItems.length), 'success');
      },
      error: (error) => {
        showToast(mapError(error, 'fichier'), 'error');
      },
    });
  };

  const handleBulkImport = () => {
    let successCount = 0;
    // Fix 13: collect per-row errors so the user knows exactly which rows failed
    const rowErrors: string[] = [];

    bulkImportPreview.forEach((item) => {
      try {
        const rawDevice: any = {
          id: `STOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tenantId: user?.tenantId || '',
          type: item.type?.toUpperCase() || 'BOX',
          imei: item.imei || undefined,
          iccid: item.iccid || undefined,
          phoneNumber: item.phoneNumber || undefined,
          operator: item.operator || undefined,
          model: item.model || (item.type?.toUpperCase() === 'SIM' ? 'Carte SIM' : 'Inconnu'),
          serialNumber: item.serialNumber || undefined,
          status: item.status?.toUpperCase() || 'IN_STOCK',
          location: item.location?.toUpperCase() || 'CENTRAL',
          client: item.client || undefined,
          notes: item.notes || undefined,
          entryDate: new Date().toISOString(),
        };

        const validated = DeviceStockSchema.parse(rawDevice);
        addDevice(validated as DeviceStock);
        successCount++;
      } catch (err: unknown) {
        const rowId = item.imei || item.iccid || item.serialNumber || `ligne ${item._row}`;
        const msg = err instanceof Error ? err.message : 'Données invalides';
        rowErrors.push(`${rowId}: ${msg}`);
      }
    });

    if (rowErrors.length > 0) {
      // Show first 3 errors inline, rest summarised
      const preview = rowErrors.slice(0, 3).join(' | ');
      const suffix = rowErrors.length > 3 ? ` (+ ${rowErrors.length - 3} autres)` : '';
      showToast(
        `${successCount} importé(s), ${rowErrors.length} erreur(s) — ${preview}${suffix}`,
        successCount > 0 ? 'warning' : 'error'
      );
    } else {
      showToast(TOAST.IO.IMPORT_PARTIAL(successCount, 0), 'success');
    }
    setIsBulkImportModalOpen(false);
    setBulkImportPreview([]);
  };

  const filteredData = useMemo(() => {
    if (activeTab === 'devices') {
      return stock.filter((d) => {
        const isBox = (d.type || 'BOX') === 'BOX';
        if (!isBox) return false;

        const matchesSearch =
          (d.imei || '').includes(searchTerm) ||
          (d.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (d.assignedVehicleId?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
        const matchesClient = selectedClient === 'all' || d.client === selectedClient;
        return matchesSearch && matchesStatus && matchesClient;
      });
    } else if (activeTab === 'sims') {
      return stock.filter((d) => {
        const isSim = (d.type || 'BOX') === 'SIM';
        if (!isSim) return false;

        const matchesSearch =
          (d.iccid || '').includes(searchTerm) ||
          (d.phoneNumber || '').includes(searchTerm) ||
          (d.imei || '').includes(searchTerm) ||
          (d.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (d.operator || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
        const matchesClient = selectedClient === 'all' || d.client === selectedClient;
        const matchesOperator = selectedOperator === 'all' || d.operator === selectedOperator;
        return matchesSearch && matchesStatus && matchesClient && matchesOperator;
      });
    } else if (activeTab === 'rma') {
      return stock.filter((d) => {
        const isRmaRelated = ['RMA_PENDING', 'SENT_TO_SUPPLIER', 'REMOVED', 'SCRAPPED'].includes(d.status);
        if (!isRmaRelated) return false;

        const matchesSearch =
          (d.imei || d.serialNumber || '').includes(searchTerm) ||
          (d.model || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      });
    } else {
      return stock.filter((d) => {
        const isAccessory = (d.type || 'BOX') === 'SENSOR' || (d.type || 'BOX') === 'ACCESSORY';
        if (!isAccessory) return false;

        const matchesSearch =
          (d.serialNumber || '').includes(searchTerm) ||
          (d.model || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
        const matchesClient = selectedClient === 'all' || d.client === selectedClient;
        return matchesSearch && matchesStatus && matchesClient;
      });
    }
  }, [stock, activeTab, searchTerm, statusFilter, selectedClient, selectedOperator]);
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const matchesSearch =
        searchTerm === '' ||
        (m.deviceId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = historyFilter === 'ALL' || m.type === historyFilter;
      return matchesSearch && matchesType;
    });
  }, [stockMovements, searchTerm, historyFilter]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      let valA: any, valB: any;

      switch (sortColumn) {
        case 'imei':
          valA = a.imei || '';
          valB = b.imei || '';
          break;
        case 'model':
          valA = a.model || '';
          valB = b.model || '';
          break;
        case 'serialNumber':
          valA = a.serialNumber || '';
          valB = b.serialNumber || '';
          break;
        case 'iccid':
          valA = a.iccid || '';
          valB = b.iccid || '';
          break;
        case 'phoneNumber':
          valA = a.phoneNumber || '';
          valB = b.phoneNumber || '';
          break;
        case 'status':
          valA = a.status || '';
          valB = b.status || '';
          break;
        case 'location':
          valA = a.location || '';
          valB = b.location || '';
          break;
        case 'client':
          valA = a.client || '';
          valB = b.client || '';
          break;
        case 'entryDate':
          valA = a.entryDate ? new Date(a.entryDate).getTime() : 0;
          valB = b.entryDate ? new Date(b.entryDate).getTime() : 0;
          break;
        case 'installationDate':
          valA = a.installationDate ? new Date(a.installationDate).getTime() : 0;
          valB = b.installationDate ? new Date(b.installationDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Export functions
  const handleExportCSV = () => {
    const headers =
      activeTab === 'devices'
        ? ['IMEI', 'Modèle', 'Statut', 'Localisation', 'Client', 'Date entrée', 'Date installation']
        : activeTab === 'sims'
          ? ['ICCID', 'Numéro', 'Opérateur', 'Statut', 'Client', 'Date entrée']
          : activeTab === 'rma'
            ? ['ID/IMEI', 'Modèle', 'Type', 'Statut', 'Client', 'Date retrait']
            : ['Numéro série', 'Modèle', 'Type', 'Statut', 'Client', 'Date entrée'];

    const rows = sortedData.map((item) => {
      if (activeTab === 'devices') {
        return [
          item.imei || '',
          item.model,
          item.status,
          item.location || '',
          item.client || '',
          item.entryDate || '',
          item.installationDate || '',
        ];
      } else if (activeTab === 'sims') {
        return [
          item.iccid || '',
          item.phoneNumber || '',
          item.operator || item.model,
          item.status,
          item.client || '',
          item.entryDate || '',
        ];
      } else if (activeTab === 'rma') {
        return [
          item.imei || item.serialNumber || item.iccid || '',
          item.model,
          item.type,
          item.status,
          item.client || '',
          item.removalDate || '',
        ];
      } else {
        return [
          item.serialNumber || '',
          item.model,
          item.type || 'ACCESSORY',
          item.status,
          item.client || '',
          item.entryDate || '',
        ];
      }
    });

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(TOAST.IO.EXPORT_SUCCESS('CSV'), 'success');
  };

  const handleExportPDF = () => {
    const title =
      activeTab === 'devices'
        ? 'Inventaire Boîtiers GPS'
        : activeTab === 'sims'
          ? 'Inventaire Cartes SIM'
          : activeTab === 'rma'
            ? 'Équipements SAV / RMA'
            : 'Inventaire Accessoires';

    const headers =
      activeTab === 'devices'
        ? ['IMEI', 'Modèle', 'Statut', 'Client']
        : activeTab === 'sims'
          ? ['ICCID', 'Opérateur', 'Statut', 'Client']
          : ['ID / SN', 'Modèle', 'Statut', 'Client'];

    const rows = sortedData.map((item) => {
      if (activeTab === 'devices') {
        return [item.imei || '', item.model, item.status, item.client || ''];
      } else if (activeTab === 'sims') {
        return [item.iccid || '', item.operator || item.model, item.status, item.client || ''];
      } else {
        return [item.serialNumber || item.imei || item.iccid || '', item.model, item.status, item.client || ''];
      }
    });

    generatePDF(title, headers, rows, `stock_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`, { branding });
    showToast(TOAST.IO.PDF_GENERATED, 'success');
  };

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAssignClick = (item: DeviceStock) => {
    setSelectedItem(item);
    setSelectedClientForAssign('');
    setSelectedVehicleForAssign('');
    setIsAssignModalOpen(true);
  };

  const confirmAssignment = async () => {
    if (!selectedItem) return;

    try {
      if (selectedItem.type === 'SIM') {
        // Assign SIM to Box
        if (!selectedVehicleForAssign) return; // Here selectedVehicleForAssign holds the Box ID

        // 1. Find the box
        const box = stock.find((s) => s.id === selectedVehicleForAssign);
        if (!box) return;

        // Check if box already has a SIM
        if (box.simCardId) {
          const confirmSwap = await confirm({
            message: `Ce boîtier a déjà une SIM (${box.simCardId}). Voulez-vous la remplacer ? L'ancienne SIM sera remise en stock.`,
            variant: 'warning',
            title: 'Remplacement de SIM',
            confirmLabel: 'Remplacer',
          });
          if (!confirmSwap) return;

          // Find the old SIM
          const oldSim = stock.find((s) => s.id === box.simCardId || s.iccid === box.simCardId);

          // If we found the old SIM, update it to IN_STOCK
          if (oldSim) {
            await updateDevice({
              ...oldSim,
              status: 'IN_STOCK',
              assignedVehicleId: undefined,
            });
          }
        }

        // 2. Update Box with NEW SIM info
        await updateDevice({
          ...box,
          simCardId: selectedItem.id,
          phoneNumber: selectedItem.phoneNumber,
        });

        // 3. Update NEW SIM status
        await updateDevice({
          ...selectedItem,
          status: 'INSTALLED',
          assignedVehicleId: box.assignedVehicleId, // Link SIM to vehicle if box is installed
        });

        showToast(TOAST.STOCK.SIM_LINKED, 'success');
      } else {
        // Assign BOX/ACCESSORY to Client (+ optional Vehicle)
        // Backend auto-creates a vehicle if none specified
        if (!selectedClientForAssign) return;

        const client = tiers.find((t) => t.id === selectedClientForAssign);
        const vehicle = selectedVehicleForAssign ? vehicles.find((v) => v.id === selectedVehicleForAssign) : null;

        if (selectedVehicleForAssign && vehicle) {
          // Avec véhicule → INSTALLED (installation effective)
          await updateDevice({
            ...selectedItem,
            assignedClientId: selectedClientForAssign,
            client: client?.name || '',
            assignedVehicleId: selectedVehicleForAssign,
            vehicleName: vehicle.name || undefined,
            vehiclePlate: vehicle.plate || vehicle.licensePlate || undefined,
            status: 'INSTALLED',
            location: 'CLIENT',
            installationDate: new Date().toISOString(),
          });
          showToast(TOAST.STOCK.DEVICE_INSTALLED, 'success');
        } else {
          // Sans véhicule → INSTALLED quand même (assigné au client)
          await updateDevice({
            ...selectedItem,
            assignedClientId: selectedClientForAssign,
            client: client?.name || '',
            status: 'INSTALLED',
            location: 'CLIENT',
            installationDate: new Date().toISOString(),
          });
          showToast(TOAST.STOCK.DEVICE_ASSIGNED, 'success');
        }
        // Refresh vehicles list to show the auto-created vehicle
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }

      setIsAssignModalOpen(false);
      setSelectedItem(null);
      setSelectedClientForAssign('');
      setSelectedVehicleForAssign('');
    } catch {
      showToast(TOAST.STOCK.ASSIGNMENT_ERROR, 'error');
    }
  };

  const handleBulkTransfer = async () => {
    if (selectedIds.size === 0) return;

    const updates = Array.from(selectedIds)
      .map((id) => {
        const item = stock.find((s) => s.id === id);
        if (!item) return null;

        return {
          ...item,
          location: transferTarget,
          technicianId: transferTarget === 'TECH' ? selectedTechId : undefined,
          transferStatus: transferTarget === 'TECH' ? 'PENDING_RECEIPT' : 'NONE',
        } as DeviceStock;
      })
      .filter(Boolean) as DeviceStock[];

    updates.forEach(updateDevice);
    showToast(
      TOAST.STOCK.BATCH_TRANSFERRED(
        updates.length,
        transferTarget === 'TECH' ? 'Technicien' : transferTarget === 'SIEGE' ? 'Siège' : 'Dépôt Central'
      ),
      'success'
    );
    setIsTransferModalOpen(false);
    setSelectedIds(new Set());
  };

  const handleRmaAction = async (
    item: DeviceStock,
    action: 'SEND' | 'RECEIVE_OK' | 'RECEIVE_REPLACE' | 'SCRAP' | 'RESTORE'
  ) => {
    let newStatus: DeviceStock['status'] = item.status;
    let notes = '';

    switch (action) {
      case 'SEND':
        newStatus = 'SENT_TO_SUPPLIER';
        notes = 'Envoyé au fournisseur pour SAV';
        break;
      case 'RECEIVE_OK':
        newStatus = 'IN_STOCK';
        notes = 'Retour SAV : Réparé / OK';
        break;
      case 'RECEIVE_REPLACE':
        newStatus = 'REPLACED_BY_SUPPLIER';
        notes = 'Retour SAV : Échange standard';
        break;
      case 'SCRAP':
        newStatus = 'SCRAPPED';
        notes = 'Mis au rebut (Irréparable)';
        break;
      case 'RESTORE':
        newStatus = 'IN_STOCK';
        notes = 'Réintégré en stock après audit';
        break;
    }

    try {
      await updateDevice({
        ...item,
        status: newStatus,
        notes: item.notes ? `${item.notes}\n---\n${new Date().toLocaleDateString('fr-FR')} : ${notes}` : notes,
      });
      showToast(TOAST.STOCK.STATUS_UPDATED(newStatus), 'success');
    } catch (error) {
      showToast(mapError(error, 'statut'), 'error');
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // --- EDIT ---
  const handleEditClick = (item: DeviceStock) => {
    setEditItem(item);
    setIsEditModalOpen(true);
  };

  const handleEditSave = async (updated: DeviceStock) => {
    try {
      await updateDevice(updated);
      showToast(TOAST.CRUD.UPDATED('Équipement'), 'success');
      setIsEditModalOpen(false);
      setEditItem(null);
    } catch (error) {
      showToast(mapError(error, 'équipement'), 'error');
    }
  };

  // --- INDIVIDUAL TRANSFER ---
  const handleTransferClick = (item: DeviceStock) => {
    setTransferItem(item);
    setIsIndividualTransferOpen(true);
  };

  const handleIndividualTransfer = async (target: 'CENTRAL' | 'SIEGE' | 'TECH', techId?: string) => {
    if (!transferItem) return;
    try {
      await updateDevice({
        ...transferItem,
        location: target,
        technicianId: target === 'TECH' ? techId : undefined,
        transferStatus: target === 'TECH' ? 'PENDING_RECEIPT' : 'NONE',
      } as DeviceStock);
      showToast(
        TOAST.STOCK.TRANSFERRED(target === 'TECH' ? 'Technicien' : target === 'SIEGE' ? 'Siège' : 'Dépôt Central'),
        'success'
      );
      setIsIndividualTransferOpen(false);
      setTransferItem(null);
    } catch (error) {
      showToast(mapError(error, 'transfert'), 'error');
    }
  };

  // --- DELETE ---
  const handleDeleteClick = async (item: DeviceStock) => {
    const identifier = item.imei || item.iccid || item.serialNumber || item.id;
    const confirmed = await confirm({
      title: "Supprimer l'équipement",
      message: `Êtes-vous sûr de vouloir supprimer "${identifier}" (${item.model}) ? Cette action est irréversible.`,
      variant: 'danger',
      confirmLabel: 'Supprimer',
    });
    if (!confirmed) return;
    try {
      deleteDevice(item.id);
      showToast(TOAST.CRUD.DELETED('Équipement'), 'success');
    } catch (error) {
      showToast(mapError(error, 'équipement'), 'error');
    }
  };

  const handleSelectAll = (data: any[]) => {
    if (data.every((item) => selectedIds.has(item.id))) {
      const newSet = new Set(selectedIds);
      data.forEach((item) => newSet.delete(item.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      data.forEach((item) => newSet.add(item.id));
      setSelectedIds(newSet);
    }
  };

  const isAllSelected = paginatedData.length > 0 && paginatedData.every((item) => selectedIds.has(item.id));

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 sm:h-[calc(100vh-140px)] sm:flex sm:flex-col">
      {/* ACTION BUTTONS - Outside tabs */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="hidden sm:block text-xl sm:page-title">Gestion du Stock</h1>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => setIsBulkImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Upload className="w-4 h-4" /> Import en bloc
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-sm font-bold rounded-lg hover:bg-[var(--primary-light)] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* FAB mobile */}
      {isMobile && (
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="fixed bottom-32 right-4 z-30 w-14 h-14 bg-[var(--primary)] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[var(--primary-light)] active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* KPI CARDS - Hidden on mobile */}
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 shrink-0">
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)] p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] rounded-lg">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Boîtiers Stock</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{stats.inStockDevices}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)] p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[var(--clr-success-muted)] text-green-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Installés</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{stats.installedDevices}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)] p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[var(--clr-danger-muted)] text-red-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">RMA</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{stats.rmaDevices}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)] p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[var(--clr-info-muted)] text-purple-600 rounded-lg">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">SIMs Dispo</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{stats.inStockSims}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)] p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 rounded-lg">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">SIMs Actives</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{stats.activeSims}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)] p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[var(--clr-warning-muted)] text-orange-600 rounded-lg">
              <PackageOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Accessoires</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{stats.inStockAccessories}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Desktop tabs */}
      {!isMobile && (
        <Tabs
          tabs={visibleStockTabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as typeof activeTab)}
        />
      )}

      <MobileTabLayout
        tabs={visibleStockTabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as typeof activeTab)}
        backLabel="Stock"
      >
        {activeTab === 'overview' ? (
          <StockOverview
            stats={stats}
            stock={stock}
            stockMovements={stockMovements}
            historyFilter={historyFilter}
            setHistoryFilter={setHistoryFilter}
            historyPage={historyPage}
            setHistoryPage={setHistoryPage}
            historyPerPage={5}
          />
        ) : activeTab === 'movements' ? (
          <StockMovementsTable
            stockMovements={filteredMovements}
            stock={stock}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            historyFilter={historyFilter}
            setHistoryFilter={setHistoryFilter}
          />
        ) : (
          <StockTable
            activeTab={activeTab}
            filteredData={filteredData}
            visibleColumns={visibleColumns}
            toggleColumn={toggleColumn}
            handleSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            uniqueClients={uniqueClients}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            selectedOperator={selectedOperator}
            setSelectedOperator={setSelectedOperator}
            uniqueOperators={uniqueOperators}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
            handleSelectAll={handleSelectAll}
            isAllSelected={isAllSelected}
            paginatedData={paginatedData}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            onRmaAction={handleRmaAction}
            onAssignClick={handleAssignClick}
            onDetailClick={(item) => {
              setDetailItem(item);
              setIsDetailModalOpen(true);
            }}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            onAddClick={() => setIsAddModalOpen(true)}
            onBulkTransfer={(target) => {
              setTransferTarget(target);
              if (target === 'TECH') setIsTransferModalOpen(true);
              else handleBulkTransfer();
            }}
            onClearSelection={() => setSelectedIds(new Set())}
            vehicles={vehicles}
            tiers={tiers}
            onEditClick={handleEditClick}
            onTransferClick={handleTransferClick}
            onDeleteClick={handleDeleteClick}
          />
        )}
      </MobileTabLayout>

      {/* Modals Refactorisés */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        newItem={newItem}
        setNewItem={setNewItem}
        catalogItems={catalogItems}
        deviceModels={deviceModels}
        tiers={tiers}
        onSave={() => {
          try {
            // Resolve custom model name when "Autre" is selected
            const resolvedModel = newItem.model === 'OTHER' ? newItem.customModel || 'Autre' : newItem.model;

            // For BOX/GPS_TRACKER: ID = IMEI (backend handles tenant via JWT)
            const deviceId =
              newItem.type === 'BOX' || !newItem.type ? newItem.imei || `DEV-${Date.now()}` : `DEV-${Date.now()}`;

            const validated = DeviceStockSchema.parse({
              ...newItem,
              model: resolvedModel,
              id: deviceId,
              tenantId: user?.tenantId || '',
              location: 'CENTRAL',
              entryDate: new Date().toISOString(),
            });
            addDevice(validated as DeviceStock);
            showToast('Équipement ajouté avec succès', 'success');
            setIsAddModalOpen(false);
            setNewItem({ type: 'BOX', status: 'IN_STOCK' });
          } catch (error) {
            if (error instanceof z.ZodError) {
              error.issues.forEach((err) => {
                showToast(err.message, 'error');
              });
            }
          }
        }}
      />

      <AssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedItem={selectedItem}
        selectedClientForAssign={selectedClientForAssign}
        setSelectedClientForAssign={setSelectedClientForAssign}
        selectedVehicleForAssign={selectedVehicleForAssign}
        setSelectedVehicleForAssign={setSelectedVehicleForAssign}
        vehicles={vehicles}
        stock={stock}
        clients={tiers
          .filter((t) => t.type === 'CLIENT')
          .map((t) => ({ id: t.id, name: t.name, tenantId: t.tenantId }))}
        onConfirm={confirmAssignment}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        selectedIds={selectedIds}
        transferTarget={transferTarget}
        selectedTechId={selectedTechId}
        setSelectedTechId={setSelectedTechId}
        users={users}
        onConfirm={handleBulkTransfer}
      />

      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => {
          setIsBulkImportModalOpen(false);
          setBulkImportPreview([]);
        }}
        bulkImportPreview={bulkImportPreview}
        onDownloadTemplate={handleDownloadTemplate}
        onFileUpload={handleFileUpload}
        onImport={handleBulkImport}
        fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
      />

      <StockDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} item={detailItem} />

      <EditDeviceModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditItem(null);
        }}
        item={editItem}
        catalogItems={catalogItems}
        tiers={tiers}
        deviceModels={deviceModels}
        vehicles={vehicles as { id: string; name: string; plate: string }[]}
        allDevices={stock}
        onSave={handleEditSave}
      />

      <IndividualTransferModal
        isOpen={isIndividualTransferOpen}
        onClose={() => {
          setIsIndividualTransferOpen(false);
          setTransferItem(null);
        }}
        item={transferItem}
        users={users}
        onConfirm={handleIndividualTransfer}
      />

      <ConfirmDialogComponent />
    </div>
  );
};
