import React, { useState, useMemo, useEffect } from 'react';
import type { Vehicle } from '../../../types';
import { VehicleStatus } from '../../../types';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import {
  Truck,
  Car,
  X,
  Navigation,
  Lock,
  LockOpen,
  Bike,
  Bus,
  HardHat,
  Clock,
  Bell,
  AlertOctagon,
  TrendingDown,
  Calendar,
  DollarSign,
  Fuel,
  Activity,
  Settings,
  Info,
  SlidersHorizontal,
  Wrench,
  Camera,
  Cpu,
  Loader2,
  MapPin,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { CollapsibleSection, ConfigurableRow } from './detail-blocks/SharedBlocks';
import { ActivityBlock } from './detail-blocks/ActivityBlock';
import { FuelBlock } from './detail-blocks/FuelBlock';
import { MaintenanceBlock } from './detail-blocks/MaintenanceBlock';
import { AlertsBlock } from './detail-blocks/AlertsBlock';
import { ViolationsBlock } from './detail-blocks/ViolationsBlock';
import { BehaviorBlock } from './detail-blocks/BehaviorBlock';
import { ExpensesBlock } from './detail-blocks/ExpensesBlock';
import { SensorsBlock } from './detail-blocks/SensorsBlock';
import { GpsBlock } from './detail-blocks/GpsBlock';
import { DeviceHistoryBlock } from './detail-blocks/DeviceHistoryBlock';
import { PhotoBlock } from './detail-blocks/PhotoBlock';
import { MaintenanceModalContent, FuelModalContent, ViolationsModalContent } from './detail-blocks/modals';
import { useDataContext } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { computeVehicleStats, formatDurationHHMM, formatEngineHours } from '../../../utils/computeVehicleStats';
import { ListItemSkeleton, StatsCardSkeleton } from '../../../components/Skeleton';
import { useTranslation } from '../../../i18n';

interface VehicleDetailPanelProps {
  vehicle: Vehicle;
  onClose: () => void;
  variant?: 'drawer' | 'sidebar';
  onReplay?: () => void;
}

// --- TYPES POUR LA GESTION DES BLOCS ---
type BlockId =
  | 'photo'
  | 'activity'
  | 'alerts'
  | 'behavior'
  | 'violations'
  | 'maintenance'
  | 'expenses'
  | 'fuel'
  | 'sensors'
  | 'gps'
  | 'device-history';

interface BlockConfig {
  id: BlockId;
  label: string;
  visible: boolean;
  icon: React.ElementType;
}

export const VehicleDetailPanel: React.FC<VehicleDetailPanelProps> = ({
  vehicle,
  onClose,
  variant: _variant = 'drawer',
  onReplay,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    getFuelRecords,
    getMaintenanceRecords,
    toggleImmobilization,
    getVehicleHistory,
    getVehicleAlerts,
    updateVehicle,
    getFuelHistory,
    getFuelStats,
  } = useDataContext();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const isStaff = useMemo(() => {
    if (!user) return false;
    const staffRoles = ['SUPERADMIN', 'ADMIN', 'TECH', 'SUPPORT_AGENT', 'AGENT_TRACKING'];
    return staffRoles.includes((user.role || '').toUpperCase());
  }, [user]);
  const [isImmobilizing, setIsImmobilizing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // --- QUERIES ---
  const { data: fuelRecords = [], isLoading: isLoadingFuel } = useQuery({
    queryKey: ['fuel', vehicle.id],
    queryFn: () => getFuelRecords(vehicle.id),
  });

  const { data: fuelHistory = [] } = useQuery({
    queryKey: ['fuelHistory', vehicle.id, '24h'],
    queryFn: () => getFuelHistory(vehicle.id, '24h'),
  });

  const { data: fuelStats } = useQuery({
    queryKey: ['fuelStats', vehicle.id],
    queryFn: () => getFuelStats(vehicle.id),
  });

  const { data: longFuelHistory = [] } = useQuery({
    queryKey: ['fuelHistory', vehicle.id, '30d'],
    queryFn: () => getFuelHistory(vehicle.id, '30d'),
    enabled: activeModal === 'fuel',
  });

  const { data: maintenanceRecords = [], isLoading: isLoadingMaintenance } = useQuery({
    queryKey: ['maintenance', vehicle.id],
    queryFn: () => getMaintenanceRecords(vehicle.id),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['history', vehicle.id, new Date().toDateString()],
    queryFn: () => getVehicleHistory(vehicle.id, new Date()),
  });

  const { data: alerts = [], isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['alerts', vehicle.id],
    queryFn: () => getVehicleAlerts(vehicle.id),
  });

  const todayAlerts = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const inRange = (a: (typeof alerts)[0]) => {
      const d = new Date(a.createdAt);
      return d >= start && d <= end;
    };
    return {
      system: alerts.filter((a) => inRange(a) && !a.ruleId),
      violations: alerts.filter((a) => inRange(a) && !!a.ruleId),
    };
  }, [alerts]);

  // --- STATS CALCULATION ---
  const formattedFuelHistory = useMemo(() => {
    if (fuelHistory.length > 0) {
      return fuelHistory.map((h) => ({
        date: new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
        rawDate: h.date,
        level: h.level,
        conso: h.consumption,
        volume: h.volume,
      }));
    }
    return [];
  }, [fuelHistory]);

  const formattedLongFuelHistory = useMemo(() => {
    if (longFuelHistory.length > 0) {
      return longFuelHistory.map((h) => ({
        date: new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        level: h.level,
        conso: h.consumption,
        volume: h.volume,
      }));
    }
    return [];
  }, [longFuelHistory]);

  const stats = useMemo(() => {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const s = computeVehicleStats(history, vehicle.status, dayStart, now);

    return {
      drivingTime: formatDurationHHMM(s.movingMs),
      idleTime: formatDurationHHMM(s.idleMs),
      stoppedTime: formatDurationHHMM(s.stoppedMs),
      offlineTime: formatDurationHHMM(s.offlineMs),
      statusDuration: formatDurationHHMM(s.statusDurationMs),
      engineHours: formatEngineHours(s.movingMs + s.idleMs),
      totalDistance: s.totalDistance,
      idleMs: s.idleMs,
    };
  }, [history, vehicle.status]);

  // --- ÉTATS ---
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [activeFuelTab, setActiveFuelTab] = useState("Aujourd'hui");

  // Clé localStorage pour la config
  const CONFIG_KEY = 'vehicleDetailPanelConfig';

  // Charger la config depuis localStorage
  const loadSavedConfig = () => {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          hiddenFields: new Set<string>(parsed.hiddenFields || []),
          blocksOrder: parsed.blocksOrder || null,
          blocksVisibility: parsed.blocksVisibility || {},
        };
      }
    } catch (e) {
      console.warn('Erreur chargement config VehicleDetailPanel:', e);
    }
    return { hiddenFields: new Set<string>(), blocksOrder: null, blocksVisibility: {} };
  };

  // État pour masquer des champs spécifiques (Set d'IDs masqués)
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(() => loadSavedConfig().hiddenFields);

  const defaultBlocks: BlockConfig[] = [
    { id: 'photo', label: t('fleet.detailPanel.blocks.photo'), visible: true, icon: Camera },
    { id: 'activity', label: t('fleet.detailPanel.blocks.activity'), visible: true, icon: Clock },
    { id: 'alerts', label: t('fleet.detailPanel.blocks.alerts'), visible: true, icon: Bell },
    { id: 'violations', label: t('fleet.detailPanel.blocks.violations'), visible: true, icon: AlertOctagon },
    { id: 'behavior', label: t('fleet.detailPanel.blocks.behavior'), visible: true, icon: TrendingDown },
    { id: 'maintenance', label: t('fleet.detailPanel.blocks.maintenance'), visible: true, icon: Calendar },
    { id: 'expenses', label: t('fleet.detailPanel.blocks.expenses'), visible: true, icon: DollarSign },
    { id: 'fuel', label: t('fleet.detailPanel.blocks.fuel'), visible: true, icon: Fuel },
    { id: 'sensors', label: t('fleet.detailPanel.blocks.sensors'), visible: true, icon: Activity },
    { id: 'gps', label: t('fleet.detailPanel.blocks.gps'), visible: true, icon: Settings },
    { id: 'device-history', label: t('fleet.detailPanel.blocks.deviceHistory'), visible: true, icon: Cpu },
  ];

  // Appliquer l'ordre et la visibilité sauvegardés
  const getInitialBlocks = (): BlockConfig[] => {
    const cfg = loadSavedConfig();
    let result = [...defaultBlocks];

    // Appliquer l'ordre sauvegardé
    if (cfg.blocksOrder && cfg.blocksOrder.length === defaultBlocks.length) {
      const orderedBlocks: BlockConfig[] = [];
      for (const id of cfg.blocksOrder) {
        const block = result.find((b) => b.id === id);
        if (block) orderedBlocks.push(block);
      }
      if (orderedBlocks.length === result.length) result = orderedBlocks;
    }

    // Appliquer la visibilité sauvegardée
    if (cfg.blocksVisibility) {
      result = result.map((b) => ({
        ...b,
        visible: cfg.blocksVisibility[b.id] !== undefined ? cfg.blocksVisibility[b.id] : b.visible,
      }));
    }

    return result;
  };

  const [blocks, setBlocks] = useState<BlockConfig[]>(() => {
    const initial = getInitialBlocks();
    // Filter out GPS block for non-staff users
    if (!isStaff) {
      return initial.filter((b) => b.id !== 'gps');
    }
    return initial;
  });

  // Sauvegarder la config quand elle change
  useEffect(() => {
    const config = {
      hiddenFields: Array.from(hiddenFields),
      blocksOrder: blocks.map((b) => b.id),
      blocksVisibility: blocks.reduce((acc, b) => ({ ...acc, [b.id]: b.visible }), {} as Record<string, boolean>),
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [hiddenFields, blocks]);

  // --- EXPENSES CALCULATION ---
  const expenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthTotal = 0;
    let yearTotal = 0;

    // Fuel Expenses
    fuelRecords.forEach((r) => {
      const d = new Date(r.date);
      if (d.getFullYear() === currentYear) {
        yearTotal += r.cost || 0;
        if (d.getMonth() === currentMonth) {
          monthTotal += r.cost || 0;
        }
      }
    });

    // Maintenance Expenses
    maintenanceRecords.forEach((r) => {
      const d = new Date(r.date); // Assuming maintenance record has a date field
      if (d.getFullYear() === currentYear) {
        yearTotal += r.cost || 0;
        if (d.getMonth() === currentMonth) {
          monthTotal += r.cost || 0;
        }
      }
    });

    return { month: monthTotal, year: yearTotal };
  }, [fuelRecords, maintenanceRecords]);

  // --- DONNÉES MOCKÉES & CALCULS ---
  const statusLabels = {
    [VehicleStatus.MOVING]: t('fleet.detailPanel.status.moving'),
    [VehicleStatus.IDLE]: t('fleet.detailPanel.status.idle'),
    [VehicleStatus.STOPPED]: t('fleet.detailPanel.status.stopped'),
    [VehicleStatus.OFFLINE]: t('fleet.detailPanel.status.offline'),
  };

  const statusColors = {
    [VehicleStatus.MOVING]: 'text-green-400 border-green-500/30 bg-green-500/10',
    [VehicleStatus.IDLE]: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    [VehicleStatus.STOPPED]: 'text-red-400 border-red-500/30 bg-red-500/10',
    [VehicleStatus.OFFLINE]: 'text-[var(--text-muted)] border-slate-500/30 bg-slate-500/10',
  };

  const mockData = {
    statusDuration: stats.statusDuration !== '00:00' ? stats.statusDuration : '00:00',
    engineHoursTotal: stats.engineHours,
    drivingTime: stats.drivingTime !== '00:00' ? stats.drivingTime : '00:00',
    idleTime: stats.idleTime !== '00:00' ? stats.idleTime : '00:00',
    stoppedTime: stats.stoppedTime !== '00:00' ? stats.stoppedTime : '00:00',
    offlineTime: stats.offlineTime,
    firstStart: { time: vehicle.departureTime || 'N/A', loc: vehicle.departureLocation || 'N/A' },
    lastStop: { time: vehicle.arrivalTime || 'N/A', loc: vehicle.arrivalLocation || 'N/A' },
    geofence: vehicle.geofence || 'N/A',
    weight: vehicle.weight ? `${vehicle.weight} T` : 'N/A',
    temp: vehicle.temperature ? `${vehicle.temperature}°C` : 'N/A',
    battery: vehicle.batteryLevel ? `${vehicle.batteryLevel} %` : 'N/A',
    signal: vehicle.signalStrength || 'N/A',
    deviceModel: vehicle.deviceModel || 'N/A',
    simCard: vehicle.sim || 'N/A',
    imei: vehicle.imei || 'N/A',
    installDate: vehicle.installDate ? new Date(vehicle.installDate).toLocaleDateString('fr-FR') : 'N/A',
    // Comportement
    safetyScore: vehicle.behaviorStats?.safetyScore || vehicle.driverScore || 0,
    harshBraking: vehicle.behaviorStats?.harshBraking || 0,
    harshAccel: vehicle.behaviorStats?.harshAccel || 0,
    sharpTurn: vehicle.behaviorStats?.sharpTurn || 0,
    // Maintenance
    maintenanceList:
      maintenanceRecords.length > 0
        ? maintenanceRecords.map((r) => ({
            task: r.description,
            due: r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString('fr-FR') : 'N/A',
            status: r.status === 'OVERDUE' ? 'warning' : 'ok',
            cost: r.cost,
          }))
        : [],
    expenses: expenses,
    // Fuel Data
    fuelHistory: formattedFuelHistory,
    fuelStats: fuelStats || { avgConsumption: 0, totalCost: 0, idlingWaste: 0 },
    refillsList:
      fuelRecords.length > 0
        ? fuelRecords
            .filter((r) => r.type === 'REFILL')
            .map((r) => ({
              date: new Date(r.date).toLocaleDateString('fr-FR'),
              place: r.location || 'Station Inconnue',
              volume: `+${r.volume} L`,
              cost: r.cost.toString(),
            }))
        : [],
  };

  // --- GESTION DES ETATS ---
  const toggleBlockVisibility = (index: number) => {
    const newBlocks = [...blocks];
    newBlocks[index].visible = !newBlocks[index].visible;
    setBlocks(newBlocks);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= blocks.length) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + direction];
    newBlocks[index + direction] = temp;
    setBlocks(newBlocks);
  };

  const toggleFieldVisibility = (fieldId: string) => {
    const newHidden = new Set(hiddenFields);
    if (newHidden.has(fieldId)) newHidden.delete(fieldId);
    else newHidden.add(fieldId);
    setHiddenFields(newHidden);
  };

  // --- RENDU DU CONTENU DES MODALES ---
  const renderModalContent = () => {
    if (activeModal === 'maintenance') {
      return <MaintenanceModalContent />;
    }
    if (activeModal === 'violations') {
      return <ViolationsModalContent safetyScore={mockData.safetyScore} violations={todayAlerts.violations} />;
    }
    if (activeModal === 'fuel') {
      return (
        <FuelModalContent
          history={formattedLongFuelHistory.length > 0 ? formattedLongFuelHistory : formattedFuelHistory}
          stats={fuelStats}
          refills={fuelRecords}
        />
      );
    }
    return null;
  };

  // --- RENDU DES BLOCS ---
  const renderBlockContent = (id: BlockId) => {
    switch (id) {
      case 'photo':
        return <PhotoBlock vehicle={vehicle} configMode={isConfigMode} />;
      case 'activity':
        return (
          <ActivityBlock
            vehicle={vehicle}
            mockData={mockData}
            totalDistance={stats.totalDistance}
            isConfigMode={isConfigMode}
            hiddenFields={hiddenFields}
            toggleFieldVisibility={toggleFieldVisibility}
            onReplay={onReplay}
          />
        );
      case 'alerts':
        if (isLoadingAlerts)
          return (
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          );
        if (todayAlerts.system.length === 0)
          return (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">
              {t('fleet.detailPanel.emptyStates.noAlerts')}
            </div>
          );
        return (
          <AlertsBlock
            alerts={todayAlerts.system}
            isConfigMode={isConfigMode}
            hiddenFields={hiddenFields}
            toggleFieldVisibility={toggleFieldVisibility}
          />
        );
      case 'behavior':
        return (
          <BehaviorBlock
            mockData={mockData}
            isConfigMode={isConfigMode}
            hiddenFields={hiddenFields}
            toggleFieldVisibility={toggleFieldVisibility}
            setActiveModal={setActiveModal}
          />
        );
      case 'violations':
        return (
          <ViolationsBlock
            vehicle={vehicle}
            violations={todayAlerts.violations}
            isConfigMode={isConfigMode}
            hiddenFields={hiddenFields}
            toggleFieldVisibility={toggleFieldVisibility}
          />
        );
      case 'maintenance':
        if (isLoadingMaintenance)
          return (
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          );
        if (maintenanceRecords.length === 0)
          return (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">
              {t('fleet.detailPanel.emptyStates.noMaintenance')}
            </div>
          );
        return (
          <MaintenanceBlock
            mockData={mockData}
            isConfigMode={isConfigMode}
            hiddenFields={hiddenFields}
            toggleFieldVisibility={toggleFieldVisibility}
            setActiveModal={setActiveModal}
          />
        );
      case 'expenses':
        return (
          <ExpensesBlock
            mockData={mockData}
            isConfigMode={isConfigMode}
            hiddenFields={hiddenFields}
            toggleFieldVisibility={toggleFieldVisibility}
          />
        );
      case 'fuel':
        if (isLoadingFuel)
          return (
            <div className="p-3 space-y-3">
              <StatsCardSkeleton />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ListItemSkeleton key={i} />
                ))}
              </div>
            </div>
          );
        if (fuelRecords.length === 0)
          return (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">
              {t('fleet.detailPanel.emptyStates.noFuel')}
            </div>
          );
        return (
          <FuelBlock
            mockData={mockData}
            isConfigMode={isConfigMode}
            hiddenFields={hiddenFields}
            toggleFieldVisibility={toggleFieldVisibility}
            activeFuelTab={activeFuelTab}
            setActiveFuelTab={setActiveFuelTab}
            setActiveModal={setActiveModal}
            idleMs={stats.idleMs ?? 0}
            totalDistance={stats.totalDistance ?? 0}
          />
        );
      case 'sensors':
        return (
          <SensorsBlock
            vehicle={vehicle}
            mockData={mockData}
            isConfigMode={isConfigMode}
            hiddenFields={hiddenFields}
            toggleFieldVisibility={toggleFieldVisibility}
          />
        );
      case 'gps':
        return (
          <GpsBlock
            mockData={mockData}
            isConfigMode={isConfigMode}
            hiddenFields={hiddenFields}
            toggleFieldVisibility={toggleFieldVisibility}
          />
        );
      case 'device-history':
        return <DeviceHistoryBlock vehicleId={vehicle.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-elevated)]">
      {/* --- HEADER --- */}
      <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] shrink-0 p-4 shadow-md relative">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            {(() => {
              const statusHex =
                vehicle.status === VehicleStatus.MOVING
                  ? '#22c55e'
                  : vehicle.status === VehicleStatus.IDLE
                    ? '#f97316'
                    : vehicle.status === VehicleStatus.STOPPED
                      ? '#ef4444'
                      : '#64748b';
              const IconComp =
                vehicle.type === 'TRUCK' || vehicle.type === 'VAN'
                  ? Truck
                  : vehicle.type === 'MOTORCYCLE'
                    ? Bike
                    : vehicle.type === 'BUS'
                      ? Bus
                      : vehicle.type === 'CONSTRUCTION'
                        ? HardHat
                        : Car;
              return (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: statusHex, boxShadow: `0 2px 8px ${statusHex}88` }}
                >
                  <IconComp className="w-5 h-5" style={{ color: 'white', fill: 'white', strokeWidth: 2 }} />
                </div>
              );
            })()}
            <div>
              <h2 className="text-lg font-bold leading-tight">{vehicle.name}</h2>
              {vehicle.plate && <p className="text-[var(--text-muted)] text-xs mt-0.5">{vehicle.plate}</p>}
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-[var(--primary)] shrink-0" />
                <span
                  className="text-xs text-[var(--text-muted)] truncate max-w-[160px]"
                  title={vehicle.address || vehicle.geofence || ''}
                >
                  {vehicle.address ||
                    vehicle.geofence ||
                    `${vehicle.location?.lat?.toFixed(5)}, ${vehicle.location?.lng?.toFixed(5)}`}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(`${vehicle.location?.lat},${vehicle.location?.lng}`)}
                  title={t('fleet.detailPanel.headerTooltips.copyCoords')}
                  aria-label={t('fleet.detailPanel.headerTooltips.copyCoordsAria')}
                  className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors shrink-0"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <a
                  href={`https://www.google.com/maps?q=${vehicle.location?.lat},${vehicle.location?.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  title={t('fleet.detailPanel.headerTooltips.openInMaps')}
                  aria-label={t('fleet.detailPanel.headerTooltips.openInMapsAria')}
                  className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsConfigMode(!isConfigMode)}
              className={`p-2 rounded-full transition-colors ${isConfigMode ? 'bg-[var(--primary)] text-white' : 'bg-white/10 text-[var(--text-muted)] hover:bg-white/20'}`}
              title={t('fleet.detailPanel.headerTooltips.configure')}
              aria-label={t('fleet.detailPanel.headerTooltips.configure')}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-[var(--text-muted)]"
              title={t('fleet.detailPanel.headerTooltips.close')}
              aria-label={t('fleet.detailPanel.headerTooltips.closeAria')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ligne d'infos : Statut | Durée | Km | Heures Moteur */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-800/50 p-2 rounded-lg border border-white/5 backdrop-blur-sm">
          {/* Statut + Durée */}
          <div
            className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-bold border ${statusColors[vehicle.status]}`}
          >
            <span>{statusLabels[vehicle.status]}</span>
            <span className="w-px h-3 bg-current opacity-30"></span>
            <span className="font-mono">{mockData.statusDuration}</span>
          </div>

          {/* Kilométrage */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)]">
            <Navigation className="w-3 h-3 text-[var(--primary)]" />
            <span>{(vehicle.mileage / 1000).toFixed(1)} km</span>
          </div>

          {/* Heures Moteur */}
          <ConfigurableRow
            id="headerEngineHours"
            isConfigMode={isConfigMode}
            isHidden={hiddenFields.has('headerEngineHours')}
            onToggle={() => toggleFieldVisibility('headerEngineHours')}
          >
            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)]">
              <Activity className="w-3 h-3 text-orange-400" />
              <span>{mockData.engineHoursTotal}</span>
            </div>
          </ConfigurableRow>
        </div>
      </div>

      {/* --- BARRE INFO CONFIG --- */}
      {isConfigMode && (
        <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-b border-[var(--primary)] dark:border-[var(--primary)] px-4 py-2 text-xs text-[var(--primary)] dark:text-[var(--primary)] flex justify-between items-center">
          <span>
            <Info className="w-3 h-3 inline mr-1" /> {t('fleet.detailPanel.configBanner.message')}
          </span>
          <button onClick={() => setIsConfigMode(false)} className="font-bold hover:underline">
            {t('fleet.detailPanel.configBanner.done')}
          </button>
        </div>
      )}

      {/* --- CONTENU DÉFILANT (BLOCS) --- */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        {blocks.map((block, index) => (
          <CollapsibleSection
            key={block.id}
            title={block.label}
            icon={block.icon}
            defaultOpen={block.id !== 'photo'}
            isVisible={block.visible}
            isConfigMode={isConfigMode}
            onToggleVisibility={() => toggleBlockVisibility(index)}
            onMoveUp={() => moveBlock(index, -1)}
            onMoveDown={() => moveBlock(index, 1)}
          >
            {renderBlockContent(block.id)}
          </CollapsibleSection>
        ))}

        {isConfigMode && blocks.every((b) => !b.visible) && (
          <div className="text-center p-8 text-[var(--text-muted)] border-2 border-dashed border-[var(--border)] rounded-lg">
            {t('fleet.detailPanel.emptyStates.allHidden')}
          </div>
        )}
      </div>

      {/* --- FOOTER ACTIONS --- */}
      {!isConfigMode && (
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-surface)] space-y-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            onClick={async () => {
              if (
                await confirm({
                  message: vehicle.isImmobilized
                    ? t('fleet.detailPanel.immobilization.confirmReactivateMsg')
                    : t('fleet.detailPanel.immobilization.confirmImmobilizeMsg'),
                  variant: vehicle.isImmobilized ? 'warning' : 'danger',
                  title: vehicle.isImmobilized
                    ? t('fleet.detailPanel.immobilization.reactivateTitle')
                    : t('fleet.detailPanel.immobilization.immobilizeTitle'),
                  confirmLabel: vehicle.isImmobilized
                    ? t('fleet.detailPanel.immobilization.reactivateConfirm')
                    : t('fleet.detailPanel.immobilization.immobilizeConfirm'),
                })
              ) {
                try {
                  setIsImmobilizing(true);
                  toggleImmobilization(vehicle.id, !vehicle.isImmobilized);
                } catch {
                  // Error handled by DataContext / TanStack Query
                } finally {
                  setIsImmobilizing(false);
                }
              }
            }}
            disabled={isImmobilizing}
            className={`w-full py-3 border rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              vehicle.isImmobilized
                ? 'bg-[var(--clr-success-dim)] text-[var(--clr-success)] border-[var(--clr-success-border)] hover:bg-green-100 dark:hover:bg-green-900/50'
                : 'bg-[var(--clr-danger-dim)] text-[var(--clr-danger)] border-[var(--clr-danger-border)] hover:bg-red-100 dark:hover:bg-red-900/50'
            }`}
          >
            {isImmobilizing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : vehicle.isImmobilized ? (
              <LockOpen className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {isImmobilizing
              ? t('fleet.detailPanel.immobilization.buttonProcessing')
              : vehicle.isImmobilized
                ? t('fleet.detailPanel.immobilization.buttonUnlock')
                : t('fleet.detailPanel.immobilization.buttonLock')}
          </button>

          <button
            onClick={async () => {
              if (
                await confirm({
                  message: vehicle.isBrokenDown
                    ? t('fleet.detailPanel.breakdown.confirmRepairedMsg')
                    : t('fleet.detailPanel.breakdown.confirmBrokenMsg'),
                  variant: 'warning',
                  title: vehicle.isBrokenDown
                    ? t('fleet.detailPanel.breakdown.repairedTitle')
                    : t('fleet.detailPanel.breakdown.brokenTitle'),
                  confirmLabel: vehicle.isBrokenDown
                    ? t('fleet.detailPanel.breakdown.repairedConfirm')
                    : t('fleet.detailPanel.breakdown.brokenConfirm'),
                })
              ) {
                try {
                  setIsUpdatingStatus(true);
                  updateVehicle({ ...vehicle, isBrokenDown: !vehicle.isBrokenDown });
                } catch {
                  // Error handled by DataContext / TanStack Query
                } finally {
                  setIsUpdatingStatus(false);
                }
              }
            }}
            disabled={isUpdatingStatus}
            className={`w-full py-3 border rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              vehicle.isBrokenDown
                ? 'bg-[var(--clr-success-dim)] text-[var(--clr-success)] border-[var(--clr-success-border)] hover:bg-green-100 dark:hover:bg-green-900/50'
                : 'bg-[var(--clr-warning-dim)] text-[var(--clr-warning)] border-[var(--clr-warning-border)] hover:bg-orange-100 dark:hover:bg-orange-900/50'
            }`}
          >
            {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
            {isUpdatingStatus
              ? t('fleet.detailPanel.breakdown.buttonProcessing')
              : vehicle.isBrokenDown
                ? t('fleet.detailPanel.breakdown.buttonMarkRepaired')
                : t('fleet.detailPanel.breakdown.buttonReportBroken')}
          </button>
        </div>
      )}

      {/* --- MODALES DÉTAILLÉES --- */}
      <Modal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        title={
          activeModal === 'fuel'
            ? t('fleet.detailPanel.modals.fuelTitle')
            : activeModal === 'maintenance'
              ? t('fleet.detailPanel.modals.maintenanceTitle')
              : t('fleet.detailPanel.modals.violationsTitle')
        }
        footer={
          <button
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded text-[var(--text-primary)] font-medium text-sm"
          >
            {t('fleet.detailPanel.modals.close')}
          </button>
        }
      >
        {renderModalContent()}
      </Modal>
      <ConfirmDialogComponent />
    </div>
  );
};
