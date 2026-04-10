import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { type Vehicle, VehicleStatus } from '../../../types';
import { StatusBadge } from '../../../components/StatusBadge';
import { MobileFilterSheet, FilterCheckRow } from '../../../components/MobileFilterSheet';
import { Search, LayoutTemplate, Truck, Car, Briefcase, MapPin, Clock, AlertCircle, Database, Filter, X, ExternalLink, Upload, ArrowUp, ArrowDown, ArrowUpDown, SlidersHorizontal, Lock, Wrench, ChevronDown, FileSpreadsheet, LayoutGrid, Table2, ChevronRight, Pencil, Zap, Key, WifiOff, Wifi, Battery, Fuel, FilterX, GripVertical, TrendingUp, Gauge, Droplets, AlertTriangle } from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { Card } from '../../../components/Card';
import { Pagination } from '../../../components/Pagination';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { generateTablePDF } from '../../../services/pdfServiceV2';
import { exportToExcel } from '../../../services/exportService';
import { useTenantBranding } from '../../../hooks/useTenantBranding';
import { useDataContext } from '../../../contexts/DataContext';
import { ImportModal } from '../../../components/ImportModal';
import { api } from '../../../services/api';
import { FixedSizeList as List } from 'react-window';
import { useAppearance } from '../../../contexts/AppearanceContext';
import { FleetTableSkeleton } from '../../../components/Skeleton';



interface FleetTableProps {
  vehicles: Vehicle[];
  onVehicleClick?: (vehicle: Vehicle) => void;
  onLocationClick?: (vehicle: Vehicle) => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
}

// Définition des colonnes disponibles
const ALL_COLUMNS = [
  { id: 'vehicle', label: 'Objet / Véhicule', minWidth: 200, locked: true, filterable: true },
  { id: 'abo', label: 'Code ABO', minWidth: 120 },
  { id: 'client', label: 'Client', minWidth: 120, filterable: true },
  { id: 'group', label: 'Groupe', minWidth: 100, filterable: true },
  { id: 'driver', label: 'Conducteur', minWidth: 120 },
  { id: 'status', label: 'Statut', minWidth: 100 },
  { id: 'speed', label: 'Vitesse', minWidth: 80 },
  { id: 'maxSpeed', label: 'V. Max', minWidth: 80 },
  { id: 'fuel', label: 'Niveau', minWidth: 100 },
  { id: 'fuelQty', label: 'Qté Carburant', minWidth: 100 },
  { id: 'refuel', label: 'Recharge', minWidth: 90 },
  { id: 'fuelLoss', label: 'Perte', minWidth: 80 },
  { id: 'consumption', label: 'Conso.', minWidth: 80 },
  { id: 'suspectLoss', label: 'Perte Suspecte', minWidth: 110 },
  { id: 'departure', label: 'Départ', minWidth: 140 }, 
  { id: 'arrival', label: 'Arrivée', minWidth: 140 }, 
  { id: 'geofence', label: 'Geofence', minWidth: 120, filterable: true },
  { id: 'lastUpdated', label: 'Dernière MàJ', minWidth: 110 },
  { id: 'mileage', label: 'Km Total', minWidth: 90 },
  { id: 'dailyMileage', label: 'Km Jour', minWidth: 80 },
  { id: 'violations', label: 'Violations', minWidth: 80 },
  { id: 'location', label: 'Position', minWidth: 140 },
  { id: 'score', label: 'Score', minWidth: 70, align: 'right' },
];

// Colonnes par défaut pour Desktop (optimisé pour données disponibles)
const DEFAULT_DESKTOP_COLUMNS = ['vehicle', 'client', 'abo', 'group', 'status', 'speed', 'fuel', 'location', 'lastUpdated'];
// Colonnes par défaut pour Mobile (Minimaliste)
const DEFAULT_MOBILE_COLUMNS = ['vehicle', 'status', 'speed'];

// PRESETS DE VUES
const VIEW_PRESETS = {
    STANDARD: DEFAULT_DESKTOP_COLUMNS,
    FUEL: ['vehicle', 'client', 'fuel', 'fuelQty', 'consumption', 'fuelLoss', 'refuel', 'suspectLoss', 'mileage'],
    TECH: ['vehicle', 'client', 'status', 'speed', 'maxSpeed', 'mileage', 'dailyMileage', 'lastUpdated']
};

// Composant Dropdown Filtre Interne
const FilterDropdown = ({ 
  options, 
  selectedValues, 
  onChange, 
  onClose,
  title 
}: { 
  options: string[], 
  selectedValues: string[], 
  onChange: (vals: string[]) => void,
  onClose: () => void,
  title: string
}) => {
  const [search, setSearch] = useState('');
  
  const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  const toggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter(v => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  return (
    <div className="absolute top-full left-0 mt-2 w-64 border border-[var(--border)] rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-surface)' }}>
       <div className="p-3 border-b border-[var(--border)] flex justify-between items-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <span className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Filtrer {title}</span>
          <button onClick={onClose} aria-label="Close filter"><X className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]" /></button>
       </div>
       <div className="p-2 border-b border-[var(--border)]">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
             <input
               type="text"
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="w-full pl-8 pr-2 py-1.5 text-xs border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
               style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
               placeholder="Rechercher..."
             />
          </div>
       </div>
       <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
          {filteredOptions.map(opt => (
             <label key={opt} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] rounded cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt)}
                  onChange={() => toggleOption(opt)}
                  className="rounded border-[var(--border)] text-blue-600 focus:ring-[var(--primary)] w-3.5 h-3.5"
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                />
                <span className="truncate text-[var(--text-primary)]">{opt}</span>
             </label>
          ))}
          {filteredOptions.length === 0 && <div className="text-xs text-center py-4 text-[var(--text-muted)]">Aucun résultat</div>}
       </div>
       <div className="p-2 border-t border-[var(--border)] flex justify-between" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <button
            onClick={() => onChange([])}
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            disabled={selectedValues.length === 0}
          >
            Réinitialiser
          </button>
          <span className="text-xs text-blue-600 font-medium">{selectedValues.length} sélectionné(s)</span>
       </div>
    </div>
  );
};

export const FleetTable: React.FC<FleetTableProps> = ({ vehicles: vehiclesProp = [], onVehicleClick, onLocationClick, onEditVehicle }) => {
  // Ensure vehicles is always a valid array — wrapped in useMemo to stabilize reference
  const vehicles = useMemo(() => Array.isArray(vehiclesProp) ? vehiclesProp : [], [vehiclesProp]);
  
  const { addVehicle, isLoading } = useDataContext();
  const { showToast } = useToast();
  const { branding } = useTenantBranding();
  const { appearance } = useAppearance();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Delay List render until component is fully mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleImport = (data: any[]) => {
      data.forEach(item => {
          try {
            const vehicle: Vehicle = {
                id: item.id || `VEH-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                subscriptionCode: item.id || `VEH-${Date.now()}`,
                imei: item.imei || '',
                name: item.name || 'Nouveau Véhicule',
                client: item.client || 'Non assigné',
                driver: item.driver || 'Non assigné',
                status: (item.status as VehicleStatus) || VehicleStatus.STOPPED,
                location: { lat: 48.8566, lng: 2.3522 },
                speed: Number(item.speed) || 0,
                fuelLevel: Number(item.fuelLevel) || 100,
                lastUpdated: new Date(),
                type: 'CAR',
                maxSpeed: 130,
                fuelQuantity: 50,
                refuelAmount: 0,
                fuelLoss: 0,
                consumption: 6.5,
                suspectLoss: 0,
                departureLocation: 'Abidjan',
                departureTime: '08:00',
                arrivalLocation: 'Bouaké',
                arrivalTime: '12:00',
                mileage: Number(item.mileage) || 0,
                dailyMileage: 0,
                destination: '',
                nextMaintenance: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                violationsCount: 0,
                driverScore: 100,
                tenantId: 'default',
                branchId: item.branchId || 'default'
            };
            addVehicle(vehicle);
          } catch {
              console.warn('Élément d\'import invalide ignoré');
          }
      });
      showToast(TOAST.FLEET.VEHICLE_IMPORTED(data.length), 'success');
  };

  // State for filters
  const [globalSearch, setGlobalSearch] = useState('');

  // --- MOBILE VIEW MODE ---
  const [isMobileView, setIsMobileView] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    // Toujours forcer cards sur mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'cards';
    return 'table';
  });

  // Responsive listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      // Forcer cards sur mobile, table sur desktop
      if (mobile) {
        setViewMode('cards');
      } else {
        setViewMode('table');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // --- NOUVEAU: Tri et Filtres Avancés ---
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<VehicleStatus[]>([]);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  
  // --- PAGINATION & GROUPING ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [groupByClient, setGroupByClient] = useState(false);

  // --- MOBILE: load-more count + filter sheet ---
  const [mobileDisplayCount, setMobileDisplayCount] = useState(20);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };
  // ---------------------------------------
  
  // Filtres Spécifiques
  const [activeFilters, setActiveFilters] = useState<{
    client: string[];
    vehicle: string[];
    group?: string[];
    geofence?: string[];
    branch?: string[];
    plate?: string[];
  }>({ client: [], vehicle: [], branch: [], plate: [] });

  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const resetFilters = () => {
    setGlobalSearch('');
    setStatusFilter([]);
    setShowAlertsOnly(false);
    setActiveFilters({ client: [], vehicle: [], branch: [], plate: [] });
  };

  // --- GESTION DES PREFERENCES UTILISATEUR (Persistance + Mobile) ---
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(() => {
    // 1. Essayer de charger depuis localStorage
    const saved = localStorage.getItem('fleet_table_columns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Ignore invalid localStorage data
      }
    }
    // 2. Sinon, logique mobile vs desktop initiale
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? DEFAULT_MOBILE_COLUMNS : DEFAULT_DESKTOP_COLUMNS;
  });
  
  // Sauvegarde automatique lors des changements
  useEffect(() => {
    localStorage.setItem('fleet_table_columns', JSON.stringify(visibleColumnIds));
  }, [visibleColumnIds]);

  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'STANDARD' | 'FUEL' | 'TECH'>('STANDARD');
  const [dragColumnId, setDragColumnId] = useState<string | null>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fermeture des menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setOpenFilterColumn(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- LOGIQUE DE VIRTUALISATION (Windowing) ---
  // ROW_HEIGHT driven by tableDensity setting (compact / standard / comfortable)
  const DENSITY_ROW_HEIGHT: Record<string, number> = { compact: 48, standard: 64, comfortable: 84 };
  const ROW_HEIGHT = DENSITY_ROW_HEIGHT[appearance.tableDensity] ?? 64;
  const HEADER_HEIGHT = 44;
  // const CONTAINER_HEIGHT = 600; 
  // const [scrollTop, setScrollTop] = useState(0);
  // const scrollContainerRef = useRef<HTMLDivElement>(null);
  // const handleScroll = (e: React.UIEvent<HTMLDivElement>) => { setScrollTop(e.currentTarget.scrollTop); };

  const uniqueClients = useMemo(() => Array.from(new Set(vehicles.map(v => v.client))).sort(), [vehicles]);
  const uniqueVehicles = useMemo(() => Array.from(new Set(vehicles.map(v => v.name))).sort(), [vehicles]);
  const uniqueGroups = useMemo(() => Array.from(new Set(vehicles.map(v => v.group || ''))).filter(Boolean).sort(), [vehicles]);
  const uniqueGeofences = useMemo(() => Array.from(new Set(vehicles.map(v => v.geofence || ''))).filter(Boolean).sort(), [vehicles]);
  const uniqueBranches = useMemo(() => Array.from(new Set(vehicles.map(v => v.branchId).filter(Boolean))).sort() as string[], [vehicles]);
  const uniquePlates = useMemo(() => Array.from(new Set(vehicles.map(v => v.plate || '').filter(Boolean))).sort(), [vehicles]);

  const filteredVehicles = useMemo(() => {
    // Safety check: ensure vehicles is a valid array
    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return [];
    }
    
    const result = vehicles.filter(v => {
      // 1. Global Search
      const matchesGlobal = !globalSearch || (
        (v.name || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
        (v.driver || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
        (v.id || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
        (v.plate || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
        (v.client || '').toLowerCase().includes(globalSearch.toLowerCase())
      );

      // 2. Specific Checkbox Filters
      const matchesClient = activeFilters.client.length === 0 || activeFilters.client.includes(v.client);
      const matchesVehicle = activeFilters.vehicle.length === 0 || activeFilters.vehicle.includes(v.name);
      const matchesGroup = !activeFilters.group || activeFilters.group.length === 0 || (v.group && activeFilters.group.includes(v.group));
      const matchesGeofence = !activeFilters.geofence || activeFilters.geofence.length === 0 || (v.geofence && activeFilters.geofence.includes(v.geofence));
      const matchesBranch = !activeFilters.branch || activeFilters.branch.length === 0 || activeFilters.branch.includes(v.branchId);
      const matchesPlate = !activeFilters.plate || activeFilters.plate.length === 0 || activeFilters.plate.includes(v.plate || '');

      // 3. Advanced Filters
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(v.status);
      const matchesAlerts = !showAlertsOnly || (v.violationsCount > 0 || v.suspectLoss > 0);

      return matchesGlobal && matchesClient && matchesVehicle && matchesGroup && matchesGeofence && matchesBranch && matchesPlate && matchesStatus && matchesAlerts;
    });

    // 4. Sorting
    if (groupByClient) {
        // Force sort by Client first if grouping is active
        result.sort((a, b) => {
            const clientCompare = (a.client || '').localeCompare(b.client || '');
            if (clientCompare !== 0) return clientCompare;
            // Secondary sort by name
            return (a.name || '').localeCompare(b.name || '');
        });
    } else if (sortConfig) {
        result.sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof Vehicle];
            let bValue: any = b[sortConfig.key as keyof Vehicle];

            // Mapping specific columns to sortable values
            if (sortConfig.key === 'fuel') { aValue = a.fuelLevel; bValue = b.fuelLevel; }
            if (sortConfig.key === 'vehicle') { aValue = a.name; bValue = b.name; }
            if (sortConfig.key === 'score') { aValue = a.driverScore; bValue = b.driverScore; }
            if (sortConfig.key === 'location') return 0; // No sort on location object

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
  }, [vehicles, globalSearch, activeFilters, sortConfig, statusFilter, showAlertsOnly, groupByClient]);

  // --- FIX: RESET PAGINATION ON FILTER CHANGE ---
  useEffect(() => {
      setCurrentPage(1);
      setMobileDisplayCount(20);
  }, [globalSearch, activeFilters, sortConfig, statusFilter, showAlertsOnly, groupByClient, itemsPerPage]);

  const totalCount = filteredVehicles.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const paginatedVehicles = filteredVehicles.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const activeColumns = ALL_COLUMNS.filter(col => visibleColumnIds.includes(col.id));

  const toggleColumn = (colId: string) => {
    if (colId === 'vehicle') return;
    setVisibleColumnIds(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
      // Select all filtered vehicles, not just visible ones
      if (filteredVehicles.every(v => selectedIds.has(v.id))) {
          const newSet = new Set(selectedIds);
          filteredVehicles.forEach(v => newSet.delete(v.id));
          setSelectedIds(newSet);
      } else {
          const newSet = new Set(selectedIds);
          filteredVehicles.forEach(v => newSet.add(v.id));
          setSelectedIds(newSet);
      }
  };

  const isAllSelected = filteredVehicles.length > 0 && filteredVehicles.every(v => selectedIds.has(v.id));

  const renderCell = (vehicle: Vehicle, colId: string) => {
    switch(colId) {
        case 'vehicle':
            return (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 relative border border-[var(--border)]" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        {vehicle.vehicleType === 'TRUCK' || vehicle.type === 'TRUCK' || vehicle.vehicleType === 'VAN' ? <Truck className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                        {/* Status Indicators */}
                        {(vehicle.isImmobilized || vehicle.isBrokenDown) && (
                            <div className="absolute -top-1 -right-1 flex">
                                {vehicle.isImmobilized && <span className="bg-red-500 text-white p-0.5 rounded-full border border-white"><Lock className="w-2 h-2" /></span>}
                                {vehicle.isBrokenDown && <span className="bg-orange-500 text-white p-0.5 rounded-full border border-white"><Wrench className="w-2 h-2" /></span>}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate" title={vehicle.name}>{vehicle.name}</p>
                        </div>
                        {vehicle.plate && <p className="text-xs text-[var(--text-muted)]">{vehicle.plate}</p>}
                        {vehicle.id?.startsWith('ABO-') && <p className="text-[10px] font-mono text-blue-500">{vehicle.id}</p>}
                    </div>
                    {onEditVehicle && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEditVehicle(vehicle); }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Modifier le véhicule"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            );
        case 'abo':
            return (
                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                    {vehicle.id?.startsWith('ABO-') ? vehicle.id : '-'}
                </span>
            );
        case 'client':
            return (
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <Briefcase className="w-3 h-3 text-slate-400" />
                    <span className="truncate text-sm" title={vehicle.client}>{vehicle.client}</span>
                </div>
            );
        case 'group':
            return <span className="text-sm text-[var(--text-secondary)] truncate">{vehicle.group || '-'}</span>;
        case 'geofence':
            return <span className="text-xs font-mono text-purple-600 dark:text-purple-400 truncate bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-800">{vehicle.geofence || '-'}</span>;
        case 'driver':
            return <span className="text-sm text-[var(--text-primary)] truncate">{vehicle.driver}</span>;
        case 'status':
            return <StatusBadge status={vehicle.status} />;
        case 'speed':
            return <span className="font-mono text-sm text-[var(--text-primary)]">{vehicle.status === VehicleStatus.MOVING ? Math.round(vehicle.speed) : 0} km/h</span>;
        case 'maxSpeed':
            return <span className="font-mono text-sm text-[var(--text-muted)]">{vehicle.maxSpeed} km/h</span>;
        case 'fuel':
            return vehicle.fuelLevel != null ? (
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden max-w-[80px]">
                    <div className={`h-full rounded-full ${vehicle.fuelLevel < 20 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${vehicle.fuelLevel}%` }} />
                    </div>
                    <span className="text-xs text-[var(--text-muted)] w-8">{vehicle.fuelLevel}%</span>
                </div>
            ) : <span className="text-[var(--text-muted)]">-</span>;
        case 'fuelQty':
             return <span className="font-mono text-sm text-[var(--text-primary)]">{vehicle.fuelQuantity} L</span>;
        case 'refuel':
             return vehicle.refuelAmount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-bold border border-green-100 dark:border-green-900/50">
                    +{vehicle.refuelAmount} L
                </span>
             ) : <span className="text-[var(--text-muted)] text-xs">-</span>;
        case 'fuelLoss':
             return vehicle.fuelLoss > 0 ? (
                <span className="text-xs font-mono text-red-600">-{vehicle.fuelLoss} L</span>
             ) : <span className="text-[var(--text-muted)] text-xs">-</span>;
        case 'consumption':
             return <span className="font-mono text-sm text-[var(--text-secondary)]">{vehicle.consumption} L/100</span>;
        case 'suspectLoss':
             return vehicle.suspectLoss > 0 ? (
                <div className="flex items-center gap-1 text-red-600 font-bold text-xs">
                   <AlertCircle className="w-3 h-3" />
                   <span>{vehicle.suspectLoss} L</span>
                </div>
             ) : <span className="text-[var(--text-muted)] text-xs">-</span>;

        case 'departure':
            return (
                <div>
                    <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-primary)]">
                        <MapPin className="w-3 h-3 text-[var(--text-muted)]" /> {vehicle.departureLocation}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] pl-4">
                        <Clock className="w-3 h-3 text-[var(--border-strong)]" /> {vehicle.departureTime}
                    </div>
                </div>
            );
        case 'arrival':
            return (
                 <div>
                    <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-primary)]">
                        <MapPin className="w-3 h-3 text-[var(--text-muted)]" /> {vehicle.arrivalLocation}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] pl-4">
                        <Clock className="w-3 h-3 text-[var(--border-strong)]" /> {vehicle.arrivalTime}
                    </div>
                </div>
            );
        case 'lastUpdated':
            return <span className="text-xs text-[var(--text-muted)]">{vehicle.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
        case 'mileage':
            return <span className="font-mono text-sm text-[var(--text-secondary)]">{(vehicle.mileage / 1000).toFixed(1)}k</span>;
        case 'dailyMileage':
            return <span className="font-mono text-sm text-[var(--text-secondary)]">{vehicle.dailyMileage} km</span>;
        case 'violations':
            return vehicle.violationsCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold">
                    <AlertCircle className="w-3 h-3" /> {vehicle.violationsCount}
                </span>
            ) : <span className="text-[var(--text-muted)]">-</span>;
        case 'location':
            return (
                <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        onLocationClick?.(vehicle);
                    }}
                    className="flex flex-col gap-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer group p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all w-full min-w-0"
                    title="Voir sur la carte en direct"
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium truncate" title={vehicle.address || 'Localisation'}>
                            {vehicle.address || (vehicle.geofence ? vehicle.geofence : 'Voir carte')}
                        </span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <span className="font-mono text-[10px] text-[var(--text-muted)] pl-5">
                        {vehicle.location.lat.toFixed(4)}, {vehicle.location.lng.toFixed(4)}
                    </span>
                </div>

            );
        case 'score':
            return <span className={`font-bold ${vehicle.driverScore > 80 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{vehicle.driverScore}</span>;
        default:
            return null;
    }
  };

  const stats = useMemo(() => {
    const moving = vehicles.filter(v => v.status === VehicleStatus.MOVING).length;
    const idle = vehicles.filter(v => v.status === VehicleStatus.IDLE).length;
    const stopped = vehicles.filter(v => v.status === VehicleStatus.STOPPED).length;
    const offline = vehicles.filter(v => v.status === VehicleStatus.OFFLINE).length;
    
    // KPIs enrichis
    const totalKmToday = vehicles.reduce((sum, v) => sum + (v.dailyMileage || 0), 0);
    const avgConsumption = vehicles.length > 0 
      ? vehicles.reduce((sum, v) => sum + (v.consumption || 0), 0) / vehicles.length 
      : 0;
    const totalFuelCost = vehicles.reduce((sum, v) => sum + ((v.fuelQuantity || 0) * 1.8), 0); // ~1.8€/L
    const utilizationRate = vehicles.length > 0 ? Math.round(((moving + idle) / vehicles.length) * 100) : 0;
    const alertsCount = vehicles.filter(v => (v.violationsCount || 0) > 0 || (v.suspectLoss || 0) > 0).length;
    const maintenanceDue = vehicles.filter(v => {
      if (!v.nextMaintenance) return false;
      const dueDate = new Date(v.nextMaintenance);
      const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    }).length;
    
    return {
      total: vehicles.length,
      moving,
      idle,
      stopped,
      offline,
      totalKmToday,
      avgConsumption: avgConsumption.toFixed(1),
      totalFuelCost: Math.round(totalFuelCost),
      utilizationRate,
      alertsCount,
      maintenanceDue
    };
  }, [vehicles]);



  const handleExport = async () => {
      try {
          const vehiclesToExport = selectedIds.size > 0 
            ? vehicles.filter(v => selectedIds.has(v.id))
            : filteredVehicles;

          const columns = ['Code ABO', 'Nom', 'Plaque', 'Client', 'Conducteur', 'Statut', 'Carburant', 'Kilométrage'];
          const data = vehiclesToExport.map(v => ({
              'Code ABO': v.id,
              'Nom': v.name,
              'Plaque': v.plate || '-',
              'Client': v.client,
              'Conducteur': v.driver,
              'Statut': v.status,
              'Carburant': `${v.fuelLevel}%`,
              'Kilométrage': `${v.mileage} km`
          }));
          
          const rows = vehiclesToExport.map(v => [
              v.id,
              v.name,
              v.plate || '-',
              v.client,
              v.driver,
              v.status,
              `${v.fuelLevel}%`,
              `${v.mileage} km`,
          ]);
          await generateTablePDF({
              title: 'Flotte de Véhicules',
              headers: columns,
              rows,
              filename: `flotte_${new Date().toISOString().split('T')[0]}.pdf`,
              orientation: 'landscape',
              branding,
          });
          showToast(TOAST.IO.EXPORT_SUCCESS('PDF', vehiclesToExport.length), 'success');
      } catch (e) {
          showToast(mapError(e, TOAST.IO.EXPORT_ERROR('PDF')), 'error');
      }
  };

  const handleExportExcel = () => {
    try {
      const vehiclesToExport = selectedIds.size > 0
        ? vehicles.filter(v => selectedIds.has(v.id))
        : filteredVehicles;

      const exportColumns = [
        { key: 'id',       header: 'Code ABO',    format: 'text' as const },
        { key: 'name',     header: 'Nom',          format: 'text' as const },
        { key: 'plate',    header: 'Plaque',       format: 'text' as const },
        { key: 'client',   header: 'Client',       format: 'text' as const },
        { key: 'driver',   header: 'Conducteur',   format: 'text' as const },
        { key: 'status',   header: 'Statut',       format: 'text' as const },
        { key: 'fuelLevel',header: 'Carburant (%)', format: 'number' as const },
        { key: 'mileage',  header: 'Kilométrage',  format: 'number' as const },
      ];

      exportToExcel(vehiclesToExport, {
        filename: `flotte_${new Date().toISOString().split('T')[0]}`,
        title: 'Flotte de Véhicules',
        columns: exportColumns,
        sheetName: 'Flotte',
      });
      showToast(TOAST.IO.EXPORT_SUCCESS('Excel', vehiclesToExport.length), 'success');
    } catch (e) {
      showToast(mapError(e, "Erreur lors de l'export Excel"), 'error');
    }
  };


  // --- VIRTUALIZED ROW RENDERER (for react-window) ---
  const VirtualRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    // Safety check for style object
    if (!style || typeof style !== 'object') return null;
    
    const vehicle = filteredVehicles[index];
    if (!vehicle) return null;

    const showGroupHeader = groupByClient && (index === 0 || vehicle.client !== filteredVehicles[index - 1]?.client);

    return (
      <div style={style}>
        {showGroupHeader && (
          <div className="sticky top-0 z-10 backdrop-blur-sm px-4 py-2 text-xs font-bold border-y border-[var(--border)] flex items-center gap-2" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            <Briefcase className="w-3 h-3" />
            {vehicle.client}
          </div>
        )}
        <div
          onClick={() => onVehicleClick && onVehicleClick(vehicle)}
          className={`group flex items-center border-b border-[var(--border)] hover:bg-blue-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedIds.has(vehicle.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
          style={{ height: ROW_HEIGHT }}
        >
          <div className="w-10 shrink-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={selectedIds.has(vehicle.id)} onChange={() => toggleSelection(vehicle.id)} className="rounded border-slate-300 text-blue-600 focus:ring-[var(--primary)]" />
          </div>
          {activeColumns.map((col) => (
            <div 
              key={col.id}
              className={`px-4 shrink-0 ${col.id === 'score' ? 'text-right ml-auto' : ''}`}
              style={{ width: col.minWidth, flex: col.id === 'vehicle' ? '1 0 auto' : '0 0 auto' }}
            >
              {renderCell(vehicle, col.id)}
            </div>
          ))}
          <div className="w-10 shrink-0"></div>
        </div>
      </div>
    );
  }, [filteredVehicles, groupByClient, selectedIds, activeColumns, onVehicleClick]);

  // Enable virtualization for large datasets (>200 vehicles)
  const useVirtualization = filteredVehicles.length > 200;

  if (isLoading && vehicles.length === 0) {
    return <FleetTableSkeleton isMobile={isMobileView} />;
  }

  // Mini dashboard KPIs selon la vue active
  const miniDashboard = useMemo(() => {
    const fv = filteredVehicles;
    if (activeView === 'FUEL') return [
      { label: 'Conso. moy.', value: fv.length > 0 ? `${(fv.reduce((s, v) => s + (v.consumption || 0), 0) / fv.length).toFixed(1)} L/100` : '--', icon: Gauge, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { label: 'Carburant total', value: `${Math.round(fv.reduce((s, v) => s + (v.fuelQuantity || 0), 0))} L`, icon: Fuel, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
      { label: 'Pertes suspectes', value: `${Math.round(fv.reduce((s, v) => s + (v.suspectLoss || 0), 0))} L`, icon: Droplets, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
      { label: 'Recharges', value: `${fv.filter(v => (v.refuelAmount || 0) > 0).length} véh.`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    ];
    if (activeView === 'TECH') return [
      { label: 'Km aujourd\'hui', value: `${Math.round(fv.reduce((s, v) => s + (v.dailyMileage || 0), 0)).toLocaleString()} km`, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { label: 'Score moyen', value: fv.length > 0 ? `${Math.round(fv.reduce((s, v) => s + (v.driverScore || 0), 0) / fv.length)}/100` : '--', icon: Gauge, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
      { label: 'Violations', value: String(fv.reduce((s, v) => s + (v.violationsCount || 0), 0)), icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
      { label: 'Maintenance < 7j', value: `${stats.maintenanceDue} véh.`, icon: Wrench, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    ];
    // STANDARD
    return [
      { label: 'Total', value: `${stats.total} véh.`, icon: Truck, color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-elevated)]' },
      { label: 'En mouvement', value: `${stats.moving} (${stats.total > 0 ? Math.round(stats.moving / stats.total * 100) : 0}%)`, icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
      { label: 'Alertes actives', value: String(stats.alertsCount), icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
      { label: 'Maintenance < 7j', value: `${stats.maintenanceDue} véh.`, icon: Wrench, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    ];
  }, [activeView, filteredVehicles, stats]);

  return (
    <div className="h-full flex flex-col gap-4">
      <Card className="flex-1 flex flex-col" title={isMobileView ? undefined : 'Liste des Véhicules'}>

      {/* Mini Dashboard */}
      {!isMobileView && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {miniDashboard.map((kpi) => (
            <div key={kpi.label} className={`flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] ${kpi.bg}`}>
              <kpi.icon className={`w-5 h-5 shrink-0 ${kpi.color}`} />
              <div className="min-w-0">
                <p className="text-xs text-[var(--text-muted)] truncate">{kpi.label}</p>
                <p className={`text-sm font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Simplified toolbar for mobile */}
      <div className="mb-4 flex gap-2 justify-between flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
                type="text" 
                placeholder={isMobileView ? "Rechercher..." : "Rechercher globalement (ID, Client, Nom)..."}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
            />
            </div>

            {/* Client Filter Toolbar - Hidden on mobile */}
            <div className="relative w-48 hidden lg:block">
                <select 
                    value={activeFilters.client[0] || ''}
                    onChange={(e) => setActiveFilters(prev => ({ ...prev, client: e.target.value ? [e.target.value] : [] }))}
                    className="w-full pl-3 pr-8 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                >
                    <option value="">Tous les clients</option>
                    {uniqueClients.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Vehicle Filter Toolbar - Hidden on mobile */}
            <div className="relative w-48 hidden lg:block">
                <select 
                    value={activeFilters.vehicle[0] || ''}
                    onChange={(e) => setActiveFilters(prev => ({ ...prev, vehicle: e.target.value ? [e.target.value] : [] }))}
                    className="w-full pl-3 pr-8 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                >
                    <option value="">Tous les véhicules</option>
                    {uniqueVehicles.map(v => (
                        <option key={v} value={v}>{v}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Status Filter - Hidden on mobile */}
            <div className="relative group hidden md:block">
                <button className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${statusFilter.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'border-[var(--border)] hover:bg-[var(--bg-elevated)]'}`} style={statusFilter.length > 0 ? undefined : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden xl:inline">Statut</span>
                    {statusFilter.length > 0 && <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-[10px] px-1.5 rounded-full">{statusFilter.length}</span>}
                </button>
                {/* Simple Dropdown for Status */}
                <div className="absolute top-full left-0 mt-2 w-48 border border-[var(--border)] rounded-lg shadow-xl z-50 hidden group-hover:block p-1" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    {(VehicleStatus ? Object.values(VehicleStatus) : []).map(status => (
                        <label key={status} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] rounded cursor-pointer text-sm">
                            <input 
                                type="checkbox" 
                                checked={statusFilter.includes(status)}
                                onChange={() => {
                                    setStatusFilter(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
                                }}
                                className="rounded border-slate-300 text-blue-600"
                            />
                            <StatusBadge status={status} />
                        </label>
                    ))}
                </div>
            </div>

            {/* Alerts Toggle - Hidden on mobile */}
            <button 
                onClick={() => setShowAlertsOnly(!showAlertsOnly)}
                className={`hidden md:flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showAlertsOnly ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300' : 'border-[var(--border)] hover:bg-[var(--bg-elevated)]'}`}
                style={showAlertsOnly ? undefined : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                title="Afficher uniquement les véhicules avec alertes ou violations"
            >
                <AlertCircle className="w-4 h-4" />
                <span className="hidden xl:inline">Alertes</span>
            </button>
        </div>
        <div className="flex items-center gap-2">
            {/* Import/Export buttons - Hidden on mobile */}
            <button 
                onClick={() => setIsImportModalOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded-lg text-xs font-bold hover:bg-[var(--bg-elevated)] transition-colors"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            >
                <Upload className="w-3 h-3" /> <span className="hidden md:inline">Import CSV</span>
            </button>
            <button 
                onClick={handleExportExcel}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
                <FileSpreadsheet className="w-3 h-3" /> <span className="hidden md:inline">Export Excel</span>
            </button>
            {/* Mobile Filter Button */}
            {isMobileView && (
              <button
                onClick={() => setShowMobileFilter(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  statusFilter.length > 0 || (activeFilters.client.length + (activeFilters.branch?.length ?? 0) + (activeFilters.plate?.length ?? 0)) > 0
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                    : 'border-[var(--border)]'
                }`}
                style={
                  (statusFilter.length > 0 || (activeFilters.client.length + (activeFilters.branch?.length ?? 0) + (activeFilters.plate?.length ?? 0)) > 0)
                    ? undefined
                    : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }
                }
              >
                <SlidersHorizontal className="w-4 h-4" />
                {(statusFilter.length + activeFilters.client.length + (activeFilters.branch?.length ?? 0) + (activeFilters.plate?.length ?? 0)) > 0 && (
                  <span className="bg-[var(--primary)] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {statusFilter.length + activeFilters.client.length + (activeFilters.branch?.length ?? 0) + (activeFilters.plate?.length ?? 0)}
                  </span>
                )}
              </button>
            )}
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-3 py-1 rounded border border-[var(--border)] h-full hidden sm:flex">
            <Database className="w-3 h-3" />
            <span className="hidden sm:inline">Pagination Active</span>
            </div>
        </div>
      </div>

      {/* PRESETS TOOLBAR - Hidden on mobile */}
      <div className="pb-3 flex flex-wrap gap-2 hidden md:flex">
          {([
            { key: 'STANDARD', label: 'Vue Standard', icon: null, activeClass: 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200', inactiveClass: 'border-[var(--border)] hover:bg-[var(--bg-elevated)]' },
            { key: 'FUEL', label: 'Vue Carburant', icon: <Fuel className="w-3 h-3" />, activeClass: 'bg-[var(--primary)] text-white border-[var(--primary)]', inactiveClass: 'border-[var(--border)] hover:bg-[var(--primary-dim)] hover:border-[var(--primary)]' },
            { key: 'TECH', label: 'Vue Technique', icon: <Wrench className="w-3 h-3" />, activeClass: 'bg-orange-500 text-white border-orange-500', inactiveClass: 'border-[var(--border)] hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300' },
          ] as const).map(({ key, label, icon, activeClass, inactiveClass }) => (
            <button
              key={key}
              onClick={() => { setActiveView(key); setVisibleColumnIds(VIEW_PRESETS[key]); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeView === key ? activeClass : inactiveClass}`}
              style={activeView !== key ? { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' } : undefined}
            >
              {icon}{label}
            </button>
          ))}

          <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />

          <button
            onClick={() => setGroupByClient(!groupByClient)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap flex items-center gap-1.5 ${groupByClient ? 'bg-purple-600 text-white border-purple-600' : 'border-[var(--border)] hover:bg-[var(--bg-elevated)]'}`}
            style={groupByClient ? undefined : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
          >
            <Briefcase className="w-3 h-3" /> Grouper par Client{groupByClient ? ' : OUI' : ''}
          </button>
      </div>

      {/* Table Container */}
      <div className="flex-1 border border-[var(--border)] rounded-lg overflow-hidden flex flex-col relative" style={{ backgroundColor: 'var(--bg-surface)' }}>
         
         {/* BULK ACTIONS */}
         {selectedIds.size > 0 && (
             <div className="absolute top-0 left-0 right-0 h-12 bg-blue-50 dark:bg-blue-900/50 flex items-center justify-between px-4 z-20 animate-in fade-in slide-in-from-top-1 border-b border-blue-100 dark:border-blue-800">
                 <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{selectedIds.size} sélectionné(s)</span>
                 <div className="flex gap-2">
                     <button onClick={handleExport} className="text-xs bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded shadow-sm hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors">Exporter</button>
                     <button onClick={() => setSelectedIds(new Set())} aria-label="Clear selection" className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded text-blue-600 dark:text-blue-300"><X className="w-4 h-4" /></button>
                 </div>
             </div>
         )}

         {/* Header Fixe — masqué sur mobile cards */}
         {!(isMobileView && viewMode === 'cards') && <div className="border-b border-[var(--border)] flex items-center" style={{ height: HEADER_HEIGHT, backgroundColor: 'var(--bg-elevated)' }}>
            {/* Checkbox Header */}
            <div className="w-10 flex items-center justify-center shrink-0">
                <input aria-label="Select all" type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="rounded border-slate-300 text-blue-600 focus:ring-[var(--primary)]" />
            </div>

            {activeColumns.map((col) => (
                <div 
                    key={col.id} 
                    className={`px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase shrink-0 flex items-center gap-1 group cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors select-none ${col.id === 'score' ? 'justify-end ml-auto' : ''}`}
                    style={{ width: col.minWidth, flex: col.id === 'vehicle' ? '1 0 auto' : '0 0 auto' }}
                    onClick={() => handleSort(col.id)}
                >
                    {col.label}

                    {sortConfig?.key === col.id ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                    
                    {col.filterable && (
                       <div className="relative ml-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            aria-label="Filter column"
                            onClick={() => setOpenFilterColumn(openFilterColumn === col.id ? null : col.id)}
                            className={`p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors ${
                                (col.id === 'client' && activeFilters.client.length > 0) || 
                                (col.id === 'vehicle' && activeFilters.vehicle.length > 0) ||
                                (col.id === 'group' && activeFilters.group && activeFilters.group.length > 0) ||
                                (col.id === 'geofence' && activeFilters.geofence && activeFilters.geofence.length > 0)
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                                : 'text-slate-400'
                            }`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                          
                          {openFilterColumn === col.id && (
                             <div ref={filterMenuRef}>
                               <FilterDropdown 
                                  title={col.label}
                                  options={
                                      col.id === 'client' ? uniqueClients : 
                                      col.id === 'vehicle' ? uniqueVehicles :
                                      col.id === 'group' ? uniqueGroups :
                                      col.id === 'geofence' ? uniqueGeofences : []
                                  }
                                  selectedValues={
                                      col.id === 'client' ? activeFilters.client : 
                                      col.id === 'vehicle' ? activeFilters.vehicle :
                                      col.id === 'group' ? (activeFilters.group || []) :
                                      col.id === 'geofence' ? (activeFilters.geofence || []) : []
                                  }
                                  onChange={(vals) => {
                                     setActiveFilters(prev => ({ ...prev, [col.id]: vals }));
                                  }}
                                  onClose={() => setOpenFilterColumn(null)}
                               />
                             </div>
                          )}
                       </div>
                    )}
                </div>
            ))}
            
            {/* Column Manager Icon (Toujours visible) */}
            <div className="w-10 h-full border-l border-[var(--border)] flex items-center justify-center shrink-0 relative ml-auto" ref={columnMenuRef}>
                <button 
                    onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                    className={`p-1.5 rounded transition-colors ${isColumnMenuOpen ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}
                    title="Gérer les colonnes"
                >
                    <LayoutTemplate className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {isColumnMenuOpen && (
                    <div className="absolute top-full right-0 mt-1 w-56 border border-[var(--border)] rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                        <div className="p-2 border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase flex justify-between items-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                            <span>Colonnes visibles</span>
                            <button className="text-blue-600 hover:underline" onClick={() => {
                                setVisibleColumnIds(window.innerWidth < 768 ? DEFAULT_MOBILE_COLUMNS : DEFAULT_DESKTOP_COLUMNS);
                            }}>Reset</button>
                        </div>
                        {/* Visible columns — draggable to reorder */}
                        <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {visibleColumnIds.map(colId => {
                                const col = ALL_COLUMNS.find(c => c.id === colId);
                                if (!col) return null;
                                return (
                                    <div
                                        key={col.id}
                                        draggable={!col.locked}
                                        onDragStart={() => setDragColumnId(col.id)}
                                        onDragOver={(e) => { e.preventDefault(); }}
                                        onDrop={() => {
                                            if (dragColumnId && dragColumnId !== col.id) {
                                                const newIds = [...visibleColumnIds];
                                                const fromIdx = newIds.indexOf(dragColumnId);
                                                const toIdx = newIds.indexOf(col.id);
                                                newIds.splice(fromIdx, 1);
                                                newIds.splice(toIdx, 0, dragColumnId);
                                                setVisibleColumnIds(newIds);
                                            }
                                            setDragColumnId(null);
                                        }}
                                        onDragEnd={() => setDragColumnId(null)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm select-none ${col.locked ? 'opacity-50' : 'hover:bg-[var(--bg-elevated)] cursor-grab'} ${dragColumnId === col.id ? 'opacity-40 bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                    >
                                        <GripVertical className="w-3 h-3 text-[var(--border-strong)] shrink-0" />
                                        <input
                                            type="checkbox"
                                            checked
                                            onChange={() => toggleColumn(col.id)}
                                            disabled={col.locked}
                                            onClick={(e) => e.stopPropagation()}
                                            className="rounded border-[var(--border)] text-blue-600 focus:ring-[var(--primary)]"
                                            style={{ backgroundColor: 'var(--bg-surface)' }}
                                        />
                                        <span className="text-[var(--text-primary)] truncate">{col.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Hidden columns — add them */}
                        {ALL_COLUMNS.some(c => !visibleColumnIds.includes(c.id)) && (
                            <>
                                <div className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase border-t border-[var(--border)]" style={{ backgroundColor: 'var(--bg-elevated)' }}>Colonnes masquées</div>
                                <div className="max-h-32 overflow-y-auto custom-scrollbar p-1">
                                    {ALL_COLUMNS.filter(c => !visibleColumnIds.includes(c.id)).map(col => (
                                        <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm hover:bg-[var(--bg-elevated)]">
                                            <GripVertical className="w-3 h-3 text-transparent shrink-0" />
                                            <input type="checkbox" checked={false} onChange={() => toggleColumn(col.id)} className="rounded border-[var(--border)] text-blue-600 focus:ring-[var(--primary)]" style={{ backgroundColor: 'var(--bg-surface)' }} />
                                            <span className="text-[var(--text-muted)] truncate">{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
         </div>}

         {/* Scrollable Body - Conditional: Table or Mobile Cards */}
         {viewMode === 'cards' && isMobileView ? (
           /* MOBILE CARDS VIEW - Redesigned for better UX */
           <div className="flex-1 overflow-y-auto bg-[var(--bg-elevated)] pb-16 lg:pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
             {/* Mobile Stats Mini Bar */}
             <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)] shadow-sm" style={{ backgroundColor: 'var(--bg-surface)' }}>
               <span className="text-sm font-semibold text-[var(--text-primary)]">{filteredVehicles.length} véhicule{filteredVehicles.length !== 1 ? 's' : ''}</span>
               <div className="flex items-center gap-2.5">
                 <button onClick={() => { setStatusFilter([VehicleStatus.MOVING]); }} className="flex items-center gap-1 text-xs font-medium" title="En mouvement">
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                   <span className="text-green-600 dark:text-green-400">{stats.moving}</span>
                 </button>
                 <button onClick={() => { setStatusFilter([VehicleStatus.IDLE]); }} className="flex items-center gap-1 text-xs font-medium" title="Au ralenti">
                   <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                   <span className="text-amber-600 dark:text-amber-400">{stats.idle}</span>
                 </button>
                 <button onClick={() => { setStatusFilter([VehicleStatus.STOPPED]); }} className="flex items-center gap-1 text-xs font-medium" title="Arrêté">
                   <span className="w-2 h-2 rounded-full bg-red-400"></span>
                   <span className="text-red-500 dark:text-red-400">{stats.stopped}</span>
                 </button>
                 <button onClick={() => { setStatusFilter([VehicleStatus.OFFLINE]); }} className="flex items-center gap-1 text-xs font-medium" title="Hors ligne">
                   <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                   <span className="text-slate-500">{stats.offline}</span>
                 </button>
                 {statusFilter.length > 0 && (
                   <button onClick={() => setStatusFilter([])} className="text-[10px] text-blue-500 underline ml-1">Tout</button>
                 )}
               </div>
             </div>
             
             {/* Liste de véhicules - Cards redesign */}
             <div className="p-3 space-y-2">
               {filteredVehicles.slice(0, mobileDisplayCount).map((vehicle) => {
                 const isMoving = vehicle.status === VehicleStatus.MOVING;
                 const isIdle   = vehicle.status === VehicleStatus.IDLE;
                 const isOffline = vehicle.status === VehicleStatus.OFFLINE;

                 // Duration since last update
                 const minutesAgo = vehicle.lastUpdated
                   ? Math.round((Date.now() - new Date(vehicle.lastUpdated).getTime()) / 60000)
                   : null;
                 const formatDuration = (min: number) => {
                   if (min < 60) return `${min} min`;
                   if (min < 1440) return `${Math.floor(min / 60)}h${min % 60 > 0 ? String(min % 60).padStart(2, '0') : ''}`;
                   const days = Math.floor(min / 1440);
                   return `${days} jour${days > 1 ? 's' : ''}`;
                 };
                 const durationStr = minutesAgo !== null ? ` depuis ${formatDuration(minutesAgo)}` : '';
                 const statusLabel = isMoving
                   ? `En mouvement${durationStr}`
                   : isIdle
                   ? `Au ralenti${durationStr}`
                   : vehicle.status === VehicleStatus.STOPPED
                   ? `Arrêté${durationStr}`
                   : `Hors ligne${durationStr}`;
                 const relativeTime = vehicle.lastUpdated ? (() => {
                   const diff = (Date.now() - new Date(vehicle.lastUpdated).getTime()) / 1000;
                   if (diff < 60) return 'À l\'instant';
                   if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
                   if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
                   const days = Math.floor(diff / 86400);
                   return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
                 })() : '--';
                 const syncDate = vehicle.lastUpdated ? (() => {
                   const d = new Date(vehicle.lastUpdated);
                   const p = (n: number) => String(n).padStart(2, '0');
                   return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
                 })() : '--';

                 // Address display: prefer reverse-geocoded address, fallback to geofence
                 const locationText = vehicle.address || vehicle.geofence || 'Position inconnue';

                 const cardBg = isMoving
                   ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                   : isIdle
                   ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                   : isOffline
                   ? 'bg-[var(--bg-elevated)] border-[var(--border)]'
                   : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

                 const speedColor = isMoving
                   ? 'text-green-700 dark:text-green-400'
                   : isIdle
                   ? 'text-amber-600 dark:text-amber-400'
                   : 'text-[var(--text-muted)]';

                 const fuel = vehicle.fuelLevel ?? 0;

                 return (
                 <div
                   key={vehicle.id}
                   onClick={() => onVehicleClick && onVehicleClick(vehicle)}
                   className={`rounded-xl border p-3 active:scale-[0.98] transition-transform cursor-pointer shadow-sm ${cardBg}`}
                 >
                   {/* ── Main row ── */}
                   <div className="flex items-start gap-3">
                     {/* Vehicle icon */}
                     <div className="shrink-0 mt-0.5">
                       {vehicle.vehicleType === 'TRUCK' || vehicle.type === 'TRUCK' || vehicle.vehicleType === 'VAN'
                         ? <Truck className={`w-7 h-7 ${isMoving ? 'text-green-600' : isIdle ? 'text-amber-500' : 'text-slate-400'}`} />
                         : <Car  className={`w-7 h-7 ${isMoving ? 'text-green-600' : isIdle ? 'text-amber-500' : 'text-slate-400'}`} />
                       }
                     </div>

                     {/* Name + status text + address */}
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-1.5 mb-0">
                         <p className="font-bold text-base text-[var(--text-primary)] truncate leading-tight">{vehicle.name}</p>
                         {vehicle.isImmobilized && <Lock  className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                         {vehicle.isBrokenDown  && <Wrench className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                       </div>
                       {vehicle.plate && (
                         <span className="inline-block text-[10px] font-mono font-semibold tracking-widest px-1.5 py-0 rounded mb-1" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}>{vehicle.plate}</span>
                       )}
                       <p className={`text-xs font-medium mb-1 ${isMoving ? 'text-green-700 dark:text-green-400' : isIdle ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-muted)]'}`}>
                         {statusLabel}
                       </p>
                       <div className="flex items-start gap-1 text-xs text-[var(--text-muted)]">
                         <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                         <span className="line-clamp-2 leading-tight">{locationText}</span>
                       </div>
                     </div>

                     {/* Speed */}
                     <div className="text-right shrink-0">
                       <span className={`text-2xl font-bold leading-none ${speedColor}`}>{vehicle.speed ?? 0}</span>
                       <p className="text-[10px] text-[var(--text-muted)] mt-0.5">km/h</p>
                     </div>
                   </div>

                   {/* ── Icons row ── */}
                   <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border)]">
                     {/* GPS signal */}
                     <div className={isOffline ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>
                       {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                     </div>

                     {/* Ignition */}
                     <Key className={`w-4 h-4 ${isMoving || isIdle ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`} />

                     {/* Relay / immobilizer: vert = normal, rouge = coupé */}
                     <Zap className={`w-4 h-4 ${vehicle.isImmobilized ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`} />

                     {/* Fuel % only */}
                     {vehicle.fuelLevel != null ? (
                       <div className="flex items-center gap-1">
                         <Fuel className={`w-4 h-4 ${fuel > 50 ? 'text-green-500' : fuel > 20 ? 'text-amber-500' : 'text-red-500'}`} />
                         <span className="text-[11px] font-medium text-[var(--text-secondary)]">{fuel}%</span>
                       </div>
                     ) : (
                       <Fuel className="w-4 h-4 text-[var(--border-strong)]" />
                     )}

                     {/* Last sync */}
                     <div className="flex flex-col items-end">
                       <span className="text-[10px] text-[var(--text-muted)] font-mono leading-tight">
                         {vehicle.lastUpdated ? (() => {
                           const d = new Date(vehicle.lastUpdated);
                           const p = (n: number) => String(n).padStart(2, '0');
                           return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
                         })() : '--'}
                       </span>
                       <span className="text-[10px] text-[var(--text-muted)] font-mono leading-tight">
                         {vehicle.lastUpdated ? (() => {
                           const d = new Date(vehicle.lastUpdated);
                           const p = (n: number) => String(n).padStart(2, '0');
                           return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
                         })() : '--'}
                       </span>
                     </div>
                   </div>
                 </div>
                 );
               })}
               {filteredVehicles.length === 0 && (
                 <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)' }}>
                   {vehicles.length === 0
                     ? <EmptyState compact icon={Truck} title="Aucun véhicule" description="Aucun véhicule n'est encore enregistré dans la flotte." />
                     : <EmptyState compact icon={FilterX} title="Aucun résultat" description="Aucun véhicule ne correspond aux filtres actifs." actionLabel="Effacer les filtres" onAction={resetFilters} />
                   }
                 </div>
               )}
               {/* Load more button */}
               {mobileDisplayCount < filteredVehicles.length && (
                 <button
                   onClick={() => setMobileDisplayCount(c => c + 20)}
                   className="w-full py-3 text-sm font-medium text-[var(--primary)] border border-[var(--border)] rounded-xl hover:bg-[var(--primary-dim)] transition-colors"
                   style={{ backgroundColor: 'var(--bg-surface)' }}
                 >
                   Afficher plus ({filteredVehicles.length - mobileDisplayCount} restants)
                 </button>
               )}
             </div>
           </div>
         ) : useVirtualization ? (
           /* VIRTUALIZED TABLE VIEW for large datasets */
           <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
             {isMounted && filteredVehicles.length > 0 && (
               <List
                 height={500}
                 itemCount={filteredVehicles.length}
                 itemSize={ROW_HEIGHT}
                 width="100%"
                 className="custom-scrollbar"
               >
                 {VirtualRow}
               </List>
             )}
           </div>
         ) : (
           /* STANDARD TABLE VIEW */
           <div className="flex-1 overflow-y-auto custom-scrollbar relative overflow-x-auto pb-16 lg:pb-0" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div>
                  {paginatedVehicles.map((vehicle, index) => {
                    // Group Header Logic
                    const showGroupHeader = groupByClient && (index === 0 || vehicle.client !== paginatedVehicles[index - 1].client);
                    
                    return (
                    <React.Fragment key={vehicle.id}>
                        {showGroupHeader && (
                            <div className="sticky top-0 z-10 backdrop-blur-sm px-4 py-2 text-xs font-bold border-y border-[var(--border)] flex items-center gap-2" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                                <Briefcase className="w-3 h-3" />
                                {vehicle.client}
                            </div>
                        )}
                        <div 
                        onClick={() => onVehicleClick && onVehicleClick(vehicle)}
                        className={`group flex items-center border-b border-[var(--border)] hover:bg-blue-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedIds.has(vehicle.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        style={{ height: ROW_HEIGHT }}
                        >
                        {/* Checkbox Row */}
                        <div className="w-10 shrink-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedIds.has(vehicle.id)} onChange={() => toggleSelection(vehicle.id)} className="rounded border-slate-300 text-blue-600 focus:ring-[var(--primary)]" />
                        </div>

                        {activeColumns.map((col) => (
                            <div 
                                    key={col.id}
                                    className={`px-4 shrink-0 ${col.id === 'score' ? 'text-right ml-auto' : ''}`}
                                    style={{ width: col.minWidth, flex: col.id === 'vehicle' ? '1 0 auto' : '0 0 auto' }}
                            >
                                {renderCell(vehicle, col.id)}
                            </div>
                        ))}
                        <div className="w-10 shrink-0"></div>
                        </div>
                    </React.Fragment>
                    );
                  })}
                  
                  {paginatedVehicles.length === 0 && (
                      vehicles.length === 0
                        ? <EmptyState icon={Truck} title="Aucun véhicule" description="Aucun véhicule n'est encore enregistré dans la flotte." />
                        : <EmptyState icon={FilterX} title="Aucun résultat" description="Aucun véhicule ne correspond aux filtres actifs." actionLabel="Effacer les filtres" onAction={resetFilters} />
                  )}
            </div>
           </div>
         )}
      </div>
      
      {/* Pagination Controls — desktop uniquement */}
      {!isMobileView && (
        <div className="border-t border-[var(--border)] p-2 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Afficher</span>
              <select
                aria-label="Items per page"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="text-xs border border-[var(--border)] rounded px-1 py-0.5"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
              </select>
              <span className="text-xs text-[var(--text-muted)]">par page</span>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages || 1}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        title="Importer des véhicules"
        requiredColumns={['name', 'client', 'driver']}
        sampleData="name,client,driver,speed,fuelLevel,mileage\nPeugeot 308,Acme Corp,John Doe,0,85,12500\nRenault Clio,Tech Solutions,Jane Smith,0,45,8900"
      />

      {/* ── Mobile Filter Bottom Sheet ── */}
      <MobileFilterSheet
        isOpen={showMobileFilter}
        onClose={() => setShowMobileFilter(false)}
        activeCount={statusFilter.length + activeFilters.client.length + (activeFilters.branch?.length ?? 0) + (activeFilters.plate?.length ?? 0)}
        onReset={() => { setStatusFilter([]); setActiveFilters(prev => ({ ...prev, client: [], branch: [], plate: [] })); }}
        tabs={[
          {
            id: 'status', label: 'Statut', activeCount: statusFilter.length,
            content: Object.values(VehicleStatus).map(s => (
              <FilterCheckRow key={s} value={s} label={<StatusBadge status={s} />} checked={statusFilter.includes(s)} onChange={() => setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} count={vehicles.filter(v => v.status === s).length} />
            ))
          },
          {
            id: 'client', label: 'Client', activeCount: activeFilters.client.length,
            content: uniqueClients.map(c => (
              <FilterCheckRow key={c} value={c} label={c} checked={activeFilters.client.includes(c)} onChange={() => setActiveFilters(prev => ({ ...prev, client: prev.client.includes(c) ? prev.client.filter(x => x !== c) : [...prev.client, c] }))} count={vehicles.filter(v => v.client === c).length} />
            ))
          },
          {
            id: 'branch', label: 'Branche', activeCount: activeFilters.branch?.length ?? 0,
            content: uniqueBranches.length === 0
              ? <p className="text-sm text-slate-400 text-center py-8">Aucune branche disponible</p>
              : uniqueBranches.map(b => (
                  <FilterCheckRow key={b} value={b} label={b} checked={(activeFilters.branch ?? []).includes(b)} onChange={() => setActiveFilters(prev => ({ ...prev, branch: (prev.branch ?? []).includes(b) ? (prev.branch ?? []).filter(x => x !== b) : [...(prev.branch ?? []), b] }))} count={vehicles.filter(v => v.branchId === b).length} />
                ))
          },
          {
            id: 'plate', label: 'Plaque', activeCount: activeFilters.plate?.length ?? 0,
            content: uniquePlates.map(p => (
              <FilterCheckRow key={p} value={p} label={<span className="font-mono">{p}</span>} checked={(activeFilters.plate ?? []).includes(p)} onChange={() => setActiveFilters(prev => ({ ...prev, plate: (prev.plate ?? []).includes(p) ? (prev.plate ?? []).filter(x => x !== p) : [...(prev.plate ?? []), p] }))} count={vehicles.filter(v => v.plate === p).length} />
            ))
          },
        ]}
      />
    </Card>
    </div>
  );
};
