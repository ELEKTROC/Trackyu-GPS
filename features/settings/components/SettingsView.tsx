import React, { useState, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import {
  User,
  FileText,
  Receipt,
  Ticket,
  Lock,
  Map as MapIcon,
  Users,
  GitBranch,
  Box,
  Car,
  Wrench,
  Terminal,
  Hexagon,
  MapPin,
  Bell,
  Calendar,
  Leaf,
  HelpCircle,
  Info,
  RefreshCw,
  Save,
  Download,
  Clock,
  Smartphone,
  Search,
  Plus,
  LayoutTemplate,
  Settings,
  X,
  Trash2,
  Edit2,
  Phone,
  Eye,
  CheckCircle,
  Shield,
  History,
  FileCheck,
  CreditCard,
  MessageSquare,
  Building2,
  Globe2,
  Send,
  Filter,
  Mail,
  Paperclip,
  Check,
  RotateCcw,
  CheckSquare,
  Square,
  Database,
  ToggleLeft,
  ToggleRight,
  EyeOff,
  Camera,
  Sun,
  Moon,
  Layers,
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Fuel,
  MoreVertical,
  Power,
  Loader2,
} from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { Card } from '../../../components/Card';
import { Pagination } from '../../../components/Pagination';
import { Modal } from '../../../components/Modal';
import type {
  Client,
  Vehicle,
  Tier,
  Branch,
  Driver,
  Tech,
  Group,
  Command,
  POI,
  AlertConfig,
  MaintenanceRule,
  ScheduleRule,
  EcoDrivingProfile,
} from '../../../types';
import { Lead, VehicleStatus, View } from '../../../types';
import type { SystemUser } from '../../../types/auth';
import { useDataContext } from '../../../contexts/DataContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { usePasswordReveal } from '../../../services/api/usePasswordReveal';
import { PasswordRevealModal } from '../../../services/api/PasswordRevealModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VehicleSchema, type VehicleFormData } from '../../../schemas/vehicleSchema';
import { ClientSchema } from '../../../schemas/clientSchema';
import { DriverSchema } from '../../../schemas/driverSchema';
import { BranchSchema } from '../../../schemas/branchSchema';
import { z } from 'zod';
import { Tabs } from '../../../components/Tabs';
import { SortableHeader } from '../../../components/SortableHeader';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/apiLazy';

// Lazy loaded forms - only loaded when needed
const VehicleForm = lazy(() => import('./forms/VehicleForm').then((m) => ({ default: m.VehicleForm })));
const PoiForm = lazy(() => import('./forms/PoiForm').then((m) => ({ default: m.PoiForm })));
const GeofenceForm = lazy(() => import('./forms/GeofenceForm').then((m) => ({ default: m.GeofenceForm })));
const MaintenanceForm = lazy(() => import('./forms/MaintenanceForm').then((m) => ({ default: m.MaintenanceForm })));
const AlertForm = lazy(() => import('./forms/AlertForm').then((m) => ({ default: m.AlertForm })));
const BranchForm = lazy(() => import('./forms/BranchForm').then((m) => ({ default: m.BranchForm })));
const GroupForm = lazy(() => import('./forms/GroupForm').then((m) => ({ default: m.GroupForm })));
const ScheduleForm = lazy(() => import('./forms/ScheduleForm').then((m) => ({ default: m.ScheduleForm })));
const EcoDrivingForm = lazy(() => import('./forms/EcoDrivingForm').then((m) => ({ default: m.EcoDrivingForm })));
const ClientForm = lazy(() => import('./forms/ClientForm').then((m) => ({ default: m.ClientForm })));
const SubUserForm = lazy(() => import('./forms/SubUserForm').then((m) => ({ default: m.SubUserForm })));
const DriverForm = lazy(() => import('./forms/DriverForm').then((m) => ({ default: m.DriverForm })));
const CommandForm = lazy(() => import('./forms/CommandForm').then((m) => ({ default: m.CommandForm })));
const UserForm = lazy(() => import('./forms/UserForm').then((m) => ({ default: m.UserForm })));

// Lazy loaded views - only loaded when tab is active
const MyAccountView = lazy(() => import('./MyAccountView').then((m) => ({ default: m.MyAccountView })));
const MyOperationsView = lazy(() => import('./MyOperationsView').then((m) => ({ default: m.MyOperationsView })));
const MyNotificationsView = lazy(() =>
  import('./MyNotificationsView').then((m) => ({ default: m.MyNotificationsView }))
);
const HelpCenterView = lazy(() => import('./HelpCenterView').then((m) => ({ default: m.HelpCenterView })));
const AboutView = lazy(() => import('./AboutView').then((m) => ({ default: m.AboutView })));
const SyncView = lazy(() => import('./SyncView').then((m) => ({ default: m.SyncView })));
const TierList = lazy(() => import('../../crm/components/TierList').then((m) => ({ default: m.TierList })));
const TierDetailModal = lazy(() =>
  import('../../crm/components/TierDetailModal').then((m) => ({ default: m.TierDetailModal }))
);
const SupportSettingsPanel = lazy(() =>
  import('../../support/components/SupportSettingsPanel').then((m) => ({ default: m.SupportSettingsPanel }))
);

// Loading Fallback Component
const LoadingFallback: React.FC<{ label?: string }> = ({ label = 'Chargement...' }) => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
    </div>
  </div>
);

interface SettingsViewProps {
  initialAction?: string;
  initialTab?: TabId;
  initialId?: string;
  onNavigate?: (view: View, params?: Record<string, string>) => void;
}

type TabId =
  | 'profile'
  | 'operations'
  | 'contracts'
  | 'my_interventions'
  | 'my_notifications'
  | 'support'
  | 'admin'
  | 'users'
  | 'subaccounts'
  | 'groups'
  | 'branches'
  | 'objects'
  | 'drivers'
  | 'commands'
  | 'geofencing'
  | 'poi'
  | 'maintenance'
  | 'alerts'
  | 'expenses'
  | 'schedule'
  | 'ecodriving'
  | 'about'
  | 'sync'
  | 'clients'
  | 'support_settings'
  | 'techs'
  | 'reseller';

interface MenuItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: 'Profil',
    items: [
      { id: 'profile', label: 'Mon compte', icon: User },
      { id: 'operations', label: 'Mes Opérations', icon: Activity },
      { id: 'my_notifications', label: 'Mes notifications', icon: Bell },
      { id: 'support', label: "Centre d'aide", icon: HelpCircle },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { id: 'users', label: 'Utilisateurs', icon: Users },
      { id: 'subaccounts', label: 'Sous-utilisateurs', icon: Users },
      { id: 'branches', label: 'Branche', icon: GitBranch },
      { id: 'groups', label: 'Groupe', icon: Layers },
      { id: 'objects', label: 'Véhicules', icon: Box },
      { id: 'drivers', label: 'Conducteurs', icon: Car },
      { id: 'commands', label: 'Commandes', icon: Terminal },
    ],
  },
  {
    title: 'Règles & Alertes',
    items: [
      { id: 'geofencing', label: 'Zones', icon: Hexagon },
      { id: 'poi', label: 'POI', icon: MapPin },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench },
      { id: 'alerts', label: 'Alertes', icon: Bell },
      { id: 'schedule', label: 'Règles', icon: Calendar },
      { id: 'ecodriving', label: 'Eco-conduite', icon: Leaf },
    ],
  },
  {
    title: 'Système',
    items: [
      { id: 'sync', label: 'Réinitialisation & Sync', icon: RefreshCw },
      { id: 'support_settings', label: 'Configuration Support', icon: Settings },
    ],
  },
  {
    title: 'À propos',
    items: [{ id: 'about', label: 'À propos', icon: Info }],
  },
];

const SETTINGS_TABS = MENU_GROUPS.flatMap((group) => group.items);

// Helper pour formatage sans devise (ex: 10 000)
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('fr-FR').format(amount);
};

// --- MOCK DATA GENERATORS ---
const generateMockData = (type: string, count: number) => {
  return Array.from({ length: count }).map((_, i) => {
    const statusOptions = ['Actif', 'Inactif', 'En attente'];
    const resellerStatusOptions = ['Actif', 'Suspendu', 'Inactif', 'Résilié'];
    const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    const resellerStatus = resellerStatusOptions[Math.floor(Math.random() * resellerStatusOptions.length)];
    const id = (Math.floor(Math.random() * 9000) + 1000).toString();

    switch (type) {
      case 'contract': {
        const unitPrice = [15000, 25000, 10000, 5000][i % 4];
        const vehicleCount = Math.floor(Math.random() * 50) + 5;
        return {
          id: `CTR-2024-${id}`,
          plan: ['Enterprise', 'Pro', 'Basic', 'Starter'][i % 4],
          startDate: '01/01/2024',
          nextRenewal: '01/01/2025',
          unitPrice: unitPrice,
          amount: unitPrice * vehicleCount,
          periodicity: ['Mensuel', 'Trimestriel', 'Annuel'][i % 3],
          status: ['Actif', 'Expiré', 'En attente'][i % 3],
          vehicleCount: vehicleCount,
          vehicles: Array.from({ length: 5 }).map((_, vi) => `Véhicule ${vi + 1} (TRK-${100 + vi})`),
          invoicesCount: Math.floor(Math.random() * 12) + 1,
          history: [
            { date: '01/01/2024', action: 'Création du contrat', user: 'Admin' },
            { date: '15/03/2024', action: 'Ajout de 5 véhicules', user: 'System' },
          ],
        };
      }
      case 'intervention':
        return {
          id: `INT-${id}`,
          date: new Date(Date.now() - Math.random() * 1000000000).toLocaleDateString('fr-FR'),
          type: ['Installation', 'Dépannage', 'Remplacement', 'Retrait', 'Réinstallation', 'Transfert'][i % 6],
          vehicle: `TRK-${Math.floor(Math.random() * 100)}`,
          technician: `Tech ${Math.floor(Math.random() * 10)}`,
          status: ['Terminé', 'Planifié', 'En cours'][i % 3],
        };
      case 'notification':
        return {
          id: `NOT-${id}`,
          date: new Date(Date.now() - Math.random() * 1000000000).toLocaleString(),
          title: ['Alerte Vitesse', 'Maintenance Requise', 'Facture Disponible', 'Sortie de Zone'][i % 4],
          message: 'Le véhicule TRK-104 a dépassé la limite de vitesse autorisée sur la zone A86.',
          read: Math.random() > 0.5,
          priority: Math.random() > 0.8 ? 'HIGH' : 'NORMAL',
          comments: i % 3 === 0 ? [{ author: 'Support', text: 'Pris en charge.', date: 'Il y a 2h' }] : [],
        };
      case 'subaccount':
        return {
          id: `USR-${id}`,
          nom: `Utilisateur ${i + 1}`,
          email: `user${i + 1}@company.com`,
          role: ['Admin', 'Gestionnaire', 'Lecteur seul'][Math.floor(Math.random() * 3)],
          statut: status,
          client: `Client ${Math.floor(Math.random() * 10) + 1}`,
        };
      case 'branch':
        return {
          id: `AGC-${id}`,
          name: `Flotte ${['Nord', 'Sud', 'Est', 'Ouest', 'Paris'][i % 5]}`,
          ville: ['Lille', 'Marseille', 'Strasbourg', 'Nantes', 'Paris'][i % 5],
          responsable: `Directeur ${i + 1}`,
          statut: 'ACTIVE',
          clientId: `CLT-${Math.floor(Math.random() * 10)}`,
          isDefault: i === 0,
        };
      case 'driver':
        return {
          id: `DRV-${id}`,
          nom: `Chauffeur ${i + 1}`,
          permis: `B, C${Math.random() > 0.5 ? ', CE' : ''}`,
          licenseNumber: `PERMIS-${Math.floor(Math.random() * 1000000)}`,
          licenseExpiry: new Date(Date.now() + Math.random() * 100000000000).toLocaleDateString('fr-FR'),
          telephone: `+33 6 ${Math.floor(Math.random() * 99)} ${Math.floor(Math.random() * 99)} 00`,
          rfidTag: `RFID-${Math.floor(Math.random() * 100000)}`,
          statut: status,
        };
      case 'tech':
        return {
          id: `TCH-${id}`,
          nom: `Technicien ${i + 1}`,
          specialite: ['GPS', 'Electricité', 'Mécanique', 'Tachygraphe'][i % 4],
          zone: ['IDF', 'Rhône-Alpes', 'PACA', 'Nord'][i % 4],
          certificationLevel: ['Junior', 'Confirmé', 'Expert'][i % 3],
          company: i % 3 === 0 ? 'Externe' : 'Interne',
          statut: status,
        };
      case 'command':
        return {
          id: `CMD-${id}`,
          vehicule: `TRK-${Math.floor(Math.random() * 100)}`,
          type: ['Coupure Moteur', 'Ouverture Portes', 'Reset Boîtier', 'Demande Position'][i % 4],
          envoye: new Date(Date.now() - Math.random() * 10000000).toLocaleString(),
          reponse: Math.random() > 0.2 ? 'OK' : 'TIMEOUT',
          status: Math.random() > 0.2 ? 'DELIVERED' : 'PENDING',
          transport: Math.random() > 0.8 ? 'SMS' : 'GPRS',
        };
      case 'geofence':
        return {
          id: `ZON-${id}`,
          nom: `Zone ${i + 1}`,
          type: ['Dépôt', 'Client', 'Interdit', 'Parking'][i % 4],
          vehicules: Math.floor(Math.random() * 10),
          statut: 'Active',
        };
      case 'admin':
        return {
          id: `ADM-${id}`,
          nom: `Admin ${i + 1}`,
          email: `admin${i + 1}@tracking.com`,
          role: 'Super Admin',
          statut: 'Actif',
        };
      case 'reseller':
        return {
          id: `RSL-${id}`,
          nom: `Revendeur ${i + 1}`,
          contact: `Contact ${i + 1}`,
          email: `reseller${i + 1}@partner.com`,
          clients: Math.floor(Math.random() * 50) + 1,
          vehicules: Math.floor(Math.random() * 500) + 10,
          createdAt: new Date(Date.now() - Math.random() * 10000000000).toLocaleDateString('fr-FR'),
          lastLogin: new Date(Date.now() - Math.random() * 100000000).toLocaleString('fr-FR'),
          statut: resellerStatus,
        };
      case 'user':
        return {
          id: `USR-${id}`,
          nom: `Utilisateur ${i + 1}`,
          firstName: `Prénom ${i + 1}`,
          lastName: `Nom ${i + 1}`,
          email: `user${i + 1}@client.com`,
          role: ['Admin', 'Manager', 'User'][Math.floor(Math.random() * 3)],
          statut: resellerStatus,
          lastLogin: new Date(Date.now() - Math.random() * 100000000).toLocaleString('fr-FR'),
          companyName: `Société ${i + 1}`,
          createdAt: new Date(Date.now() - Math.random() * 10000000000).toLocaleDateString('fr-FR'),
          vehicules: Math.floor(Math.random() * 50) + 1,
          reseller: `Revendeur ${Math.floor(Math.random() * 5) + 1}`,
        };
      case 'group':
        return {
          id: `GRP-${id}`,
          nom: `Groupe ${i + 1}`,
          description: `Description du groupe ${i + 1}`,
          vehicules: Math.floor(Math.random() * 20),
          statut: 'Actif',
        };
      case 'poi':
        return {
          id: `POI-${id}`,
          nom: `Point ${i + 1}`,
          type: ['Station Service', 'Client', 'Fournisseur', 'Restaurant'][i % 4],
          adresse: `${Math.floor(Math.random() * 100)} Rue de la Paix, Abidjan`,
          rayon: `${[50, 100, 200][i % 3]} m`,
          statut: 'Actif',
        };
      case 'maintenance':
        return {
          id: `MNT-${id}`,
          nom: `Règle ${['Vidange', 'Pneus', 'Contrôle Technique', 'Assurance'][i % 4]}`,
          type: ['Kilométrage', 'Durée', 'Date'][i % 3],
          intervalle: ['10 000 km', '6 mois', '1 an'][i % 3],
          vehicules: Math.floor(Math.random() * 50),
          statut: status,
        };
      case 'alert':
        return {
          id: `ALT-${id}`,
          nom: `Alerte ${['Vitesse', 'Sortie Zone', 'Mouvement', 'Batterie'][i % 4]}`,
          priorite: ['Haute', 'Moyenne', 'Basse'][i % 3],
          destinataires: `${Math.floor(Math.random() * 5) + 1} contacts`,
          notification: ['Email', 'SMS', 'Push', 'Email & SMS'][i % 4],
          statut: status,
        };
      case 'schedule':
        return {
          id: `SCH-${id}`,
          nom: `Politique ${['Standard', 'Commercial', 'Livraison', 'Nuit'][i % 4]}`,
          enableTimeRestriction: Math.random() > 0.5,
          enableDistanceLimit: Math.random() > 0.7,
          maxDistancePerDay: 300,
          enableSpeedLimit: Math.random() > 0.3,
          maxSpeed: 110,
          enableEngineHoursLimit: Math.random() > 0.8,
          maxEngineHoursPerDay: 8,
          enableCustomRestriction: Math.random() > 0.9,
          customRestrictionName: 'Transport Matières Dangereuses',
          vehicules: Math.floor(Math.random() * 30),
          statut: 'Actif',
        };
      case 'ecodriving':
        return {
          id: `ECO-${id}`,
          nom: `Profil ${['Standard', 'Strict', 'Poids Lourd', 'VUL'][i % 4]}`,
          targetScore: [80, 85, 90, 75][i % 4],
          maxSpeedLimit: [90, 110, 130, 80][i % 4],
          maxSpeedPenalty: 20,
          harshAccelerationSensitivity: ['Medium', 'High', 'Low'][i % 3],
          harshBrakingSensitivity: ['Medium', 'High', 'Low'][i % 3],
          maxIdlingDuration: [3, 5, 10][i % 3],
          statut: 'Actif',
        };
      default:
        return { id: i, col1: 'Donnée', col2: 'Test' };
    }
  });
};

// Generic item type for settings tables — dynamic bag of properties, any is appropriate here
type GenericItem = { id: string; [key: string]: any };

interface GenericTableProps {
  title: string;
  type: string;
  icon: React.ElementType;
  columns: string[];
  dataGenerator?: (count: number) => any[];
  useRealVehicles?: boolean;
  useRealClients?: boolean;
  useRealBranches?: boolean;
  useRealDrivers?: boolean;
  useRealTechs?: boolean;
  useRealGroups?: boolean;
  useRealUsers?: boolean;
  useRealCommands?: boolean;
  useRealPOIs?: boolean;
  useRealAlertConfigs?: boolean;
  useRealMaintenanceRules?: boolean;
  useRealScheduleRules?: boolean;
  useRealEcoDrivingProfiles?: boolean;
  vehicles?: Vehicle[];
  clients?: Client[];
  branches?: GenericItem[];
  drivers?: GenericItem[];
  techs?: GenericItem[];
  groups?: GenericItem[];
  users?: GenericItem[];
  commands?: GenericItem[];
  pois?: GenericItem[];
  alertConfigs?: GenericItem[];
  maintenanceRules?: GenericItem[];
  scheduleRules?: GenericItem[];
  ecoDrivingProfiles?: GenericItem[];
  contracts?: GenericItem[];
  tickets?: GenericItem[];
  interventions?: GenericItem[];
  notifications?: GenericItem[];
  onAddClick: () => void;
  onEdit: (item: GenericItem) => void;
  onDelete?: (item: GenericItem) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
  onResetPassword?: (item: GenericItem) => void;
}

// --- COMPOSANTS FORMULAIRES (Refactorisés avec forwardRef) ---
// ClientForm moved to SettingsForms.tsx

// --- HELPER COMPONENTS ---

const GenericTableContent: React.FC<GenericTableProps & { readOnly?: boolean }> = ({
  title,
  type,
  icon: Icon,
  columns,
  dataGenerator,
  useRealVehicles,
  useRealClients,
  useRealBranches,
  useRealDrivers,
  useRealTechs,
  useRealGroups,
  useRealUsers,
  useRealCommands,
  useRealPOIs,
  useRealAlertConfigs,
  useRealMaintenanceRules,
  useRealScheduleRules,
  useRealEcoDrivingProfiles,
  vehicles,
  clients,
  branches,
  drivers,
  techs,
  groups,
  users,
  commands,
  pois,
  alertConfigs,
  maintenanceRules,
  scheduleRules,
  ecoDrivingProfiles,
  onAddClick,
  onEdit,
  onDelete,
  onStatusChange,
  onResetPassword,
  readOnly,
}) => {
  // --- 1. Gestion des données sources ---
  const rawData = useMemo(() => {
    if (useRealVehicles && vehicles) return vehicles;
    if (useRealClients && clients) return clients;
    if (useRealBranches && branches) return branches;
    if (useRealDrivers && drivers) return drivers;
    if (useRealTechs && techs) return techs;
    if (useRealGroups && groups) return groups;
    if (useRealUsers && users) return users;
    if (useRealCommands && commands) return commands;
    if (useRealPOIs && pois) return pois;
    if (useRealAlertConfigs && alertConfigs) return alertConfigs;
    if (useRealMaintenanceRules && maintenanceRules) return maintenanceRules;
    if (useRealScheduleRules && scheduleRules) return scheduleRules;
    if (useRealEcoDrivingProfiles && ecoDrivingProfiles) return ecoDrivingProfiles;
    // Sinon, générer des données mockées
    return dataGenerator ? dataGenerator(50) : generateMockData(type, 50);
  }, [
    type,
    dataGenerator,
    useRealVehicles,
    vehicles,
    useRealClients,
    clients,
    useRealBranches,
    branches,
    useRealDrivers,
    drivers,
    useRealTechs,
    techs,
    useRealGroups,
    groups,
    useRealUsers,
    users,
    useRealCommands,
    commands,
    useRealPOIs,
    pois,
    useRealAlertConfigs,
    alertConfigs,
    useRealMaintenanceRules,
    maintenanceRules,
    useRealScheduleRules,
    scheduleRules,
    useRealEcoDrivingProfiles,
    ecoDrivingProfiles,
  ]);

  // --- 2. États Table (Recherche, Pagination, Colonnes, Sélection) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState<string | null>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // --- État révélation mot de passe (hook partagé, call endpoint chiffré) ---
  const { user: currentUser } = useAuth();
  const passwordReveal = usePasswordReveal();

  // Réinitialisation lors du changement d'onglet
  useEffect(() => {
    setSearchTerm('');
    setCurrentPage(1);
    setSelectedIds(new Set());
    setVisibleColumns(columns);
    setStatusMenuOpen(null);
  }, [type, columns]);

  // Fermeture menu colonnes au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusChange = (id: string, newStatus: string) => {
    setStatusMenuOpen(null);
    if (onStatusChange) {
      onStatusChange(id, newStatus);
    }
  };

  // --- 3. Filtrage ---
  const filteredData = useMemo(() => {
    if (!searchTerm) return rawData;
    const lowerTerm = searchTerm.toLowerCase();
    return rawData.filter((item: GenericItem) => {
      return Object.values(item).some((val) => String(val).toLowerCase().includes(lowerTerm));
    });
  }, [rawData, searchTerm]);

  // --- 3b. Tri ---
  const [settingsSortConfig, setSettingsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSettingsSort = (key: string) => {
    setSettingsSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  // Reset sort on tab change
  useEffect(() => {
    setSettingsSortConfig(null);
  }, [type]);

  const getItemValue = (item: GenericItem, col: string): string | number => {
    const cl = col.toLowerCase();
    if (cl.includes('nom') || cl.includes('société')) return item.name || item.nom || '';
    if (cl.includes('plaque') || cl.includes('immatriculation')) return item.id || '';
    if (cl.includes('email')) return item.email || '';
    if (cl.includes('contact')) return item.contactName || '';
    if (cl.includes('ville')) return item.city || '';
    if (cl.includes('statut')) return item.status || item.statut || '';
    if (cl.includes('clients')) return item.clients || 0;
    if (cl.includes('véhicules'))
      return item.vehicules || item.vehicleCount || (item.vehicleIds ? item.vehicleIds.length : 0);
    if (cl.includes('créé le')) return item.createdAt || '';
    if (cl.includes('dernière connexion')) return item.lastLogin || '';
    if (cl.includes('id')) return item.id || '';
    if (cl.includes('revendeur')) return item.reseller || '';
    if (cl.includes('client')) return item.client || item.clientId || '';
    return String(Object.values(item).find((v) => String(v).toLowerCase().includes(cl.substring(0, 3))) || '');
  };

  const sortedFilteredData = useMemo(() => {
    if (!settingsSortConfig) return filteredData;
    return [...filteredData].sort((a: GenericItem, b: GenericItem) => {
      const valA = getItemValue(a, settingsSortConfig.key);
      const valB = getItemValue(b, settingsSortConfig.key);
      const numA =
        typeof valA === 'number'
          ? valA
          : parseFloat(
              String(valA)
                .replace(/[^\d.,-]/g, '')
                .replace(',', '.')
            );
      const numB =
        typeof valB === 'number'
          ? valB
          : parseFloat(
              String(valB)
                .replace(/[^\d.,-]/g, '')
                .replace(',', '.')
            );
      if (!isNaN(numA) && !isNaN(numB)) {
        return settingsSortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }
      const strA = String(valA);
      const strB = String(valB);
      return settingsSortConfig.direction === 'asc' ? strA.localeCompare(strB, 'fr') : strB.localeCompare(strA, 'fr');
    });
  }, [filteredData, settingsSortConfig]);

  // --- 4. Pagination ---
  const totalPages = Math.ceil(sortedFilteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedFilteredData.slice(start, start + itemsPerPage);
  }, [sortedFilteredData, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  // --- 5. Gestion Sélection ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (paginatedData.every((item: GenericItem) => selectedIds.has(item.id))) {
      const newSet = new Set(selectedIds);
      paginatedData.forEach((item: GenericItem) => newSet.delete(item.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      paginatedData.forEach((item: GenericItem) => newSet.add(item.id));
      setSelectedIds(newSet);
    }
  };

  const isAllSelected =
    paginatedData.length > 0 && paginatedData.every((item: GenericItem) => selectedIds.has(item.id));

  // --- 6. Gestion Colonnes ---
  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  };

  // --- 7. Helper Rendu Cellule ---
  const renderCell = (item: GenericItem, column: string) => {
    const colLower = column.toLowerCase();

    if (type === 'vehicle') {
      if (colLower.includes('nom')) return <div className="font-bold text-[var(--text-primary)]">{item.name}</div>;
      if (colLower.includes('plaque'))
        return (
          <span className="font-mono bg-[var(--bg-elevated)] px-2 py-0.5 rounded text-xs text-[var(--text-secondary)]">
            {item.id}
          </span>
        );
      if (colLower.includes('statut')) {
        const STATUS_FR: Record<string, { label: string; cls: string }> = {
          MOVING: { label: 'En route', cls: 'bg-green-100 text-green-700' },
          IDLE: { label: 'Ralenti', cls: 'bg-yellow-100 text-yellow-700' },
          STOPPED: { label: 'Arrêté', cls: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' },
          OFFLINE: { label: 'Hors ligne', cls: 'bg-red-100 text-red-600' },
        };
        const statusKey = String(item.status ?? '');
        const s = STATUS_FR[statusKey] ?? {
          label: statusKey,
          cls: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
        };
        return <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${s.cls}`}>{s.label}</span>;
      }
    }

    if (type === 'client') {
      if (colLower.includes('nom') || colLower.includes('société'))
        return <div className="font-bold text-[var(--text-primary)]">{item.name}</div>;
      if (colLower.includes('contact')) return <span className="text-[var(--text-secondary)]">{item.contactName}</span>;
      if (colLower.includes('email')) return <span className="text-[var(--primary)] text-xs">{item.email}</span>;
      if (colLower.includes('ville')) return <span className="text-[var(--text-secondary)]">{item.city || 'N/A'}</span>;
    }

    // Generic
    if (colLower.includes('id'))
      return <span className="font-mono text-xs text-[var(--text-secondary)]">{item.id}</span>;
    if (colLower.includes('nom') || colLower.includes('véhicule'))
      return (
        <span className="font-bold text-[var(--text-primary)]">
          {item.nom || item.name || item.vehicule || item.vehicleId}
        </span>
      );
    if (colLower.includes('email')) return <span className="text-[var(--text-secondary)] text-sm">{item.email}</span>;
    if (colLower.includes('clients'))
      return <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-muted)]">{item.clients}</span>;
    if (colLower.includes('véhicules')) {
      if (item.allVehicles) {
        return (
          <span className="text-xs bg-[var(--primary-dim)] text-[var(--primary)] px-2 py-0.5 rounded-full font-medium">
            Tous
          </span>
        );
      }
      return (
        <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-muted)]">
          {item.vehicules || item.vehicleCount || (item.vehicleIds ? item.vehicleIds.length : 0)}
        </span>
      );
    }
    if (colLower.includes('créé le'))
      return <span className="text-xs text-[var(--text-secondary)]">{item.createdAt}</span>;
    if (colLower.includes('dernière connexion')) {
      if (!item.lastLogin) {
        return <span className="text-xs text-[var(--text-muted)] italic">Jamais connecté</span>;
      }
      const d = new Date(item.lastLogin);
      if (isNaN(d.getTime())) {
        return <span className="text-xs text-[var(--text-secondary)]">{item.lastLogin}</span>;
      }
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatted = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      return <span className="text-xs text-[var(--text-secondary)]">{formatted}</span>;
    }
    if (colLower.includes('revendeur'))
      return <span className="text-[var(--text-secondary)] text-sm">{item.reseller || '--'}</span>;
    if (colLower.includes('client'))
      return <span className="font-medium text-[var(--text-primary)]">{item.client || item.clientId || '--'}</span>;
    if (colLower.includes('canal'))
      return (
        <span className="text-xs font-mono bg-[var(--bg-elevated)] px-2 py-1 rounded">
          {item.channel || item.transport || 'GPRS'}
        </span>
      );
    if (colLower.includes('réponse'))
      return (
        <span
          className={`text-xs font-bold ${item.reponse === 'OK' || item.response === 'OK' ? 'text-green-600' : 'text-red-600'}`}
        >
          {item.reponse || item.response || '--'}
        </span>
      );
    if (colLower.includes('envoyé'))
      return <span className="text-xs text-[var(--text-secondary)]">{item.envoye || item.sentAt}</span>;
    if (colLower.includes('mot de passe')) {
      const revealedPwd = passwordReveal.revealed[item.id];
      const isLoading = passwordReveal.loadingId === item.id;
      const hasPwd = item.hasPassword !== false;
      if (!hasPwd) {
        return <span className="text-xs text-[var(--text-muted)] italic">Non disponible</span>;
      }
      if (!revealedPwd) {
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm text-[var(--text-muted)] tracking-widest">••••••••</span>
            <button
              onClick={() => passwordReveal.requestReveal(item.id)}
              disabled={isLoading}
              className="p-1 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
              title="Révéler le mot de passe de cet utilisateur"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-[var(--text-primary)] select-all bg-[var(--bg-elevated)] px-2 py-0.5 rounded">
            {revealedPwd}
          </span>
          <button
            onClick={() => passwordReveal.hide(item.id)}
            className="p-1 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)] hover:text-red-500 transition-colors"
            title="Masquer"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    if (colLower.includes('rôle') || colLower.includes('role')) {
      // Sous-compte : afficher uniquement le sub_role (User/Viewer). Sinon : role (CLIENT, etc.)
      const displayRole = type === 'subaccount' ? item.subRole || '—' : item.subRole || item.role || '--';
      return <span className="text-sm font-medium text-[var(--text-primary)]">{displayRole}</span>;
    }
    if (colLower.includes('erreurs'))
      return <span className="text-xs font-mono text-red-500">{item.passwordErrors || 0}</span>;
    if (colLower.includes('actions'))
      return (
        <div className="flex gap-2">
          <button className="p-1 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)]" title="Voir logs">
            <FileText className="w-3 h-3" />
          </button>
          <button
            className="p-1 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)]"
            title="Reset Password"
          >
            <Lock className="w-3 h-3" />
          </button>
        </div>
      );

    // Maintenance specific columns
    if (type === 'maintenance') {
      if (colLower.includes('intervalle'))
        return (
          <span className="text-xs font-mono">{item.intervalle || `${item.intervalValue} ${item.intervalUnit}`}</span>
        );
    }

    // Schedule specific columns
    if (type === 'schedule') {
      if (colLower.includes('horaires'))
        return item.enableTimeRestriction ? (
          <span className="text-xs bg-[var(--primary-dim)] text-[var(--primary)] px-2 py-1 rounded">Oui</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">Non</span>
        );
      if (colLower.includes('distance'))
        return item.enableDistanceLimit ? (
          <span className="text-xs font-mono">{item.maxDistancePerDay} km</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">--</span>
        );
      if (colLower.includes('vitesse'))
        return item.enableSpeedLimit ? (
          <span className="text-xs font-mono">{item.maxSpeed} km/h</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">--</span>
        );
      if (colLower.includes('moteur'))
        return item.enableEngineHoursLimit ? (
          <span className="text-xs font-mono">{item.maxEngineHoursPerDay} h</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">--</span>
        );
      if (colLower.includes('custom'))
        return item.enableCustomRestriction ? (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded" title={item.customRestrictionName}>
            Oui
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">Non</span>
        );
    }

    // Eco-Driving specific columns
    if (type === 'ecodriving') {
      if (colLower.includes('score')) return <span className="font-bold text-green-600">{item.targetScore}/100</span>;
      if (colLower.includes('vitesse')) return <span className="text-xs font-mono">{item.maxSpeedLimit} km/h</span>;
      if (colLower.includes('accélération'))
        return <span className="text-xs">{item.harshAccelerationSensitivity}</span>;
      if (colLower.includes('freinage')) return <span className="text-xs">{item.harshBrakingSensitivity}</span>;
      if (colLower.includes('ralenti')) return <span className="text-xs font-mono">{item.maxIdlingDuration} min</span>;
    }

    if (type === 'driver') {
      if (colLower.includes('permis'))
        return (
          <span className="text-xs font-mono bg-[var(--bg-elevated)] px-2 py-1 rounded">{item.permis || '--'}</span>
        );
      if (colLower.includes('rfid'))
        return <span className="text-xs font-mono text-[var(--text-secondary)]">{item.rfidTag || '--'}</span>;
      if (colLower.includes('téléphone'))
        return <span className="text-sm text-[var(--text-secondary)]">{item.telephone || '--'}</span>;
    }

    if (type === 'tech') {
      if (colLower.includes('spécialité'))
        return <span className="text-sm font-medium text-[var(--text-primary)]">{item.specialite}</span>;
      if (colLower.includes('zone'))
        return (
          <span className="text-xs bg-[var(--primary-dim)] text-[var(--primary)] px-2 py-1 rounded">{item.zone}</span>
        );
      if (colLower.includes('niveau'))
        return (
          <span
            className={`text-xs px-2 py-1 rounded-full ${item.niveau === 'Expert' ? 'bg-purple-100 text-purple-700' : item.niveau === 'Confirmé' ? 'bg-[var(--primary-dim)] text-[var(--primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}
          >
            {item.niveau}
          </span>
        );
      if (colLower.includes('société'))
        return <span className="text-sm text-[var(--text-secondary)]">{item.societe || 'Interne'}</span>;
    }

    const val = item[Object.keys(item).find((k) => k.toLowerCase().includes(colLower.substring(0, 3))) || ''];
    return <span className="text-[var(--text-secondary)]">{val || '--'}</span>;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header & Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] shadow-sm border border-[var(--border)]">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Gestion des {title}s</h3>
            <p className="text-xs text-[var(--text-secondary)]">{filteredData.length} éléments enregistrés</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full sm:w-64 pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
              className={`p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors ${isColumnMenuOpen ? 'bg-[var(--bg-elevated)] ring-2 ring-[var(--primary)]/20' : ''} shadow-sm`}
              title="Gérer les colonnes"
            >
              <LayoutTemplate className="w-4 h-4" />
            </button>
            {isColumnMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 bg-[var(--bg-elevated)] border-b border-[var(--border)] border-[var(--border)] text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                  Colonnes
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {columns.map((col) => (
                    <label
                      key={col}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] rounded cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col)}
                        onChange={() => toggleColumn(col)}
                        className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] bg-[var(--bg-surface)]"
                      />
                      <span className="text-[var(--text-primary)]">{col}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!readOnly && (
            <button
              onClick={onAddClick}
              className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--primary-light)] shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nouveau</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col shadow-sm relative">
        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="absolute top-0 left-0 right-0 h-12 bg-[var(--primary-dim)] flex items-center justify-between px-4 z-20 animate-in fade-in slide-in-from-top-1 border-b border-[var(--border)]">
            <span className="text-sm font-bold text-[var(--text-primary)]">{selectedIds.size} sélectionné(s)</span>
            <div className="flex gap-2">
              <button className="text-xs bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--primary)] px-3 py-1.5 rounded shadow-sm hover:bg-[var(--primary-dim)] transition-colors">
                Exporter
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1 hover:bg-[var(--primary-dim)] rounded text-[var(--primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--bg-elevated)] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 w-10 border-b border-[var(--border)]">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                </th>
                {columns.map(
                  (col, idx) =>
                    visibleColumns.includes(col) && (
                      <SortableHeader
                        key={idx}
                        label={col}
                        sortKey={col}
                        currentSortKey={settingsSortConfig?.key || null}
                        currentDirection={settingsSortConfig?.direction || null}
                        onSort={handleSettingsSort}
                        className="px-6 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)] whitespace-nowrap"
                      />
                    )
                )}
                <th className="px-6 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)] text-right w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedData.map((item: GenericItem, idx: number) => (
                <tr
                  key={idx}
                  className={`tr-hover/50 transition-colors group cursor-pointer ${selectedIds.has(item.id) ? 'bg-[var(--primary-dim)]' : ''}`}
                  onClick={() => toggleSelection(item.id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                  </td>
                  {columns.map(
                    (col, cIdx) =>
                      visibleColumns.includes(col) && (
                        <td key={cIdx} className="px-6 py-3 text-sm whitespace-nowrap">
                          {renderCell(item, col)}
                        </td>
                      )
                  )}
                  <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity relative">
                      {(type === 'reseller' || type === 'user' || type === 'users' || type === 'subaccount') && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusMenuOpen(statusMenuOpen === item.id ? null : item.id);
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              (item.status || item.statut) === 'Suspendu'
                                ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                : 'text-[var(--text-muted)] hover:text-purple-600 hover:bg-[var(--clr-info-dim)]'
                            }`}
                            title="Changer le statut"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          {statusMenuOpen === item.id && (
                            <div
                              ref={statusMenuRef}
                              className="absolute right-0 mt-2 w-36 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                            >
                              {(type === 'users' || type === 'subaccount'
                                ? ['Actif', 'Suspendu']
                                : ['Actif', 'Suspendu', 'Inactif', 'Résilié']
                              ).map((status) => {
                                const current = item.status || item.statut;
                                const isActive = current === status;
                                const color =
                                  status === 'Actif'
                                    ? 'text-green-600'
                                    : status === 'Suspendu'
                                      ? 'text-orange-500'
                                      : status === 'Inactif'
                                        ? 'text-[var(--text-muted)]'
                                        : 'text-red-500';
                                return (
                                  <button
                                    key={status}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(item.id, status);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-xs hover:bg-[var(--bg-surface)] ${isActive ? 'font-bold' : ''} ${color}`}
                                  >
                                    {isActive ? `✓ ${status}` : status}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {(type === 'users' || type === 'subaccount') && onResetPassword && (
                        <button
                          onClick={() => onResetPassword(item)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors"
                          title="Réinitialiser le mot de passe"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded transition-colors"
                        title="Éditer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-[var(--clr-danger-dim)] rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    Aucune donnée ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-elevated)] flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)] hidden sm:inline">Lignes par page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="text-xs border border-[var(--border)] rounded bg-[var(--bg-surface)] text-[var(--text-primary)] p-1 focus:ring-2 focus:ring-[var(--primary)] outline-none"
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
      </div>

      <PasswordRevealModal
        open={passwordReveal.showModal}
        onCancel={passwordReveal.cancelModal}
        onSubmit={passwordReveal.submitAdminPassword}
        errorMessage={passwordReveal.error?.message}
        description="Entrez votre mot de passe pour révéler les accès clients"
      />
    </div>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ initialAction, initialTab, initialId, onNavigate }) => {
  // const [activeTab, setActiveTab] = useState<TabId>(initialTab || 'profile'); // REPLACED BY 2-LEVEL STATE BELOW
  const {
    vehicles,
    clients,
    users,
    branches,
    contracts,
    tickets,
    interventions,
    zones,
    addClient,
    updateClient,
    addUser,
    updateUser,
    deleteUser,
    addVehicle,
    updateVehicle,
    addBranch,
    updateBranch,
    deleteBranch,
    tiers,
    drivers,
    addDriver,
    updateDriver,
    deleteDriver,
    techs,
    addTech,
    updateTech,
    deleteTech,
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    commands,
    addCommand,
    updateCommand,
    deleteCommand,
    pois,
    addPOI,
    updatePOI,
    deletePOI,
    alertConfigs,
    addAlertConfig,
    updateAlertConfig,
    deleteAlertConfig,
    maintenanceRules,
    addMaintenanceRule,
    updateMaintenanceRule,
    deleteMaintenanceRule,
    scheduleRules,
    addScheduleRule,
    updateScheduleRule,
    deleteScheduleRule,
    ecoDrivingProfiles,
    addEcoDrivingProfile,
    updateEcoDrivingProfile,
    deleteEcoDrivingProfile,
  } = useDataContext();
  const { hasPermission, user } = useAuth();

  const filteredMenuGroups = useMemo(() => {
    const isClient = ['CLIENT', 'SOUS_COMPTE', 'SUB_ACCOUNT'].includes((user?.role || '').toUpperCase());
    return MENU_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(() => true),
    }))
      .filter((group) => group.items.length > 0)
      .filter((group) => !(isClient && group.title === 'Système'));
  }, [hasPermission, user?.role]);

  const { isDarkMode, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(ClientSchema),
    defaultValues: {
      type: 'B2C',
      status: 'ACTIVE',
      paymentTerms: '30',
      currency: 'EUR',
      language: 'FR',
      segment: 'Standard',
      sector: 'Services',
      subscriptionPlan: 'Standard',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      resellerId: '',
      contactName: '',
      secondContactName: '',
      createdAt: new Date(),
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<Tier | null>(null);
  const [isResellerDetailOpen, setIsResellerDetailOpen] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const initialActionHandled = useRef(false);

  // Generate mock resellers for the dropdown
  const resellers = tiers.filter((t) => t.type === 'RESELLER');
  // Branches are now from context
  // Groups are now from context
  // Drivers are now from context

  useEffect(() => {
    if (!initialAction || initialActionHandled.current) return;

    if (initialAction === 'create_vehicle') {
      setActiveTab('objects');
      setEditingItem(null);
      setIsModalOpen(true);
      initialActionHandled.current = true;
    } else if (initialAction === 'edit_vehicle' && initialId) {
      const vehicleToEdit = vehicles.find((v) => v.id === initialId);
      if (!vehicleToEdit) return; // attendre que vehicles soit chargé
      // Enrich vehicle data with resellerId from client lookup + align field names with VehicleForm
      const clientObj = clients.find((c) => c.id === (vehicleToEdit.clientId || vehicleToEdit.client));
      const enrichedVehicle = {
        ...vehicleToEdit,
        licensePlate: vehicleToEdit.licensePlate || vehicleToEdit.plate || vehicleToEdit.name || '',
        client: vehicleToEdit.clientId || vehicleToEdit.client || '',
        resellerId: clientObj?.resellerId || '',
        branchId: vehicleToEdit.branchId || '',
        vehicleType: vehicleToEdit.vehicleType || vehicleToEdit.type || '',
        deviceType: vehicleToEdit.deviceType || vehicleToEdit.deviceModel || '',
        odometer: vehicleToEdit.odometer || vehicleToEdit.mileage || 0,
        driver: vehicleToEdit.driver || '',
        status: (['MOVING', 'IDLE', 'STOPPED', 'OFFLINE', 'ONLINE'].includes(vehicleToEdit.status)
          ? vehicleToEdit.status
          : 'STOPPED') as 'MOVING' | 'IDLE' | 'STOPPED' | 'OFFLINE' | 'ONLINE',
        odometerSource: (vehicleToEdit.odometerSource === 'CAN' ? 'CANBUS' : vehicleToEdit.odometerSource || 'GPS') as
          | 'GPS'
          | 'CANBUS',
      };
      setActiveTab('objects');
      setEditingItem(enrichedVehicle);
      setIsModalOpen(true);
      initialActionHandled.current = true;
    } else if (initialAction === 'create_client') {
      setActiveTab('clients');
      setEditingItem(null);
      setIsModalOpen(true);
      initialActionHandled.current = true;
    }
  }, [initialAction, initialId, vehicles]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: GenericItem) => {
    // Enrich vehicle data for VehicleForm when editing from objects tab
    if (activeTab === 'objects' && item?.id) {
      const clientObj = clients.find((c) => c.id === (item.clientId || item.client));
      const sc = (item as any).sensorConfig || null;
      // Calibration : backend renvoie un array [{voltage, liters}, ...] ou JSON string
      // → conversion en string "voltage,liters" par ligne pour la Textarea
      const rawCalib: any = (item as any).calibrationTable;
      let calibrationString = '';
      if (Array.isArray(rawCalib)) {
        calibrationString = rawCalib.map((e: any) => `${e.voltage ?? ''},${e.liters ?? ''}`).join('\n');
      } else if (typeof rawCalib === 'string') {
        // Peut être un JSON string OU déjà en format "v,l" par ligne
        try {
          const parsed = JSON.parse(rawCalib);
          if (Array.isArray(parsed)) {
            calibrationString = parsed.map((e: any) => `${e.voltage ?? ''},${e.liters ?? ''}`).join('\n');
          } else {
            calibrationString = rawCalib;
          }
        } catch {
          calibrationString = rawCalib;
        }
      }
      const enrichedItem = {
        ...item,
        licensePlate: item.licensePlate || item.plate || item.name || '',
        client: item.clientId || item.client || '',
        resellerId: clientObj?.resellerId || '',
        branchId: item.branchId || '',
        vehicleType: item.vehicleType || item.type || '',
        deviceType: item.deviceType || item.deviceModel || '',
        odometer: item.odometer || item.mileage || 0,
        driver: item.driver || '',
        status: (['MOVING', 'IDLE', 'STOPPED', 'OFFLINE', 'ONLINE'].includes(item.status) ? item.status : 'STOPPED') as
          | 'MOVING'
          | 'IDLE'
          | 'STOPPED'
          | 'OFFLINE'
          | 'ONLINE',
        odometerSource: (item.odometerSource === 'CAN' ? 'CANBUS' : item.odometerSource || 'GPS') as 'GPS' | 'CANBUS',
        calibrationTable: calibrationString,
        // Valeurs par défaut pour les champs non-essentiels bloquants côté backend (contraintes .positive())
        tankCapacity: (item as any).tankCapacity || 350,
        consumption: (item as any).theoreticalConsumption || (item as any).consumption || undefined,
        refillThreshold: (item as any).refillThreshold || 5.0,
        theftThreshold: (item as any).theftThreshold || 3.0,
        // Sensor config → champs plats pour VehicleForm (defaults si sensorConfig absent)
        sensorUnit: sc?.sensor_unit || 'tension',
        fuelConversionFactor: sc?.factor && sc.factor > 0 ? sc.factor : 1,
        voltageEmptyMv: sc?.v_empty_mv ?? 0,
        voltageHalfMv: sc?.v_half_mv ?? 2500,
        voltageFullMv: sc?.v_full_mv ?? 5000,
        ...(sc
          ? {
              sensorBrand: sc.sensor_brand,
              sensorModel: sc.sensor_model,
              sensorInstallDate: sc.sensor_install_date,
            }
          : {}),
      };
      setEditingItem(enrichedItem);
    } else {
      setEditingItem(item);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (item: GenericItem) => {
    const labelMap: Record<string, { title: string; message: string }> = {
      drivers: {
        title: 'Supprimer le conducteur',
        message: `Supprimer le conducteur « ${item.nom || item.name || ''} » ? Cette action est irréversible.`,
      },
      techs: {
        title: 'Supprimer le technicien',
        message: `Supprimer le technicien « ${item.nom || item.name || ''} » ? Cette action est irréversible.`,
      },
      users: {
        title: "Supprimer l'utilisateur",
        message: `Supprimer l'utilisateur « ${item.name || item.email || ''} » ? Cette action est irréversible.`,
      },
      subaccounts: {
        title: 'Supprimer le sous-compte',
        message: `Supprimer le sous-compte « ${item.name || item.email || ''} » ? Cette action est irréversible.`,
      },
      branches: {
        title: 'Supprimer la branche',
        message: `Supprimer la branche « ${item.name || ''} » ? Cette action est irréversible.`,
      },
      groups: {
        title: 'Supprimer le groupe',
        message: `Supprimer le groupe « ${item.nom || item.name || ''} » ? Cette action est irréversible.`,
      },
      objects: {
        title: 'Supprimer le véhicule',
        message: `Supprimer le véhicule « ${item.licensePlate || item.plate || item.name || ''} » ? Cette action est irréversible.`,
      },
      commands: {
        title: 'Supprimer la commande',
        message: `Supprimer cette commande ? Cette action est irréversible.`,
      },
      poi: {
        title: 'Supprimer le POI',
        message: `Supprimer le POI « ${item.name || ''} » ? Cette action est irréversible.`,
      },
      alerts: { title: "Supprimer l'alerte", message: `Supprimer cette alerte ? Cette action est irréversible.` },
      maintenance: {
        title: 'Supprimer la règle de maintenance',
        message: `Supprimer cette règle de maintenance ? Cette action est irréversible.`,
      },
      schedule: {
        title: 'Supprimer la règle horaire',
        message: `Supprimer cette règle horaire ? Cette action est irréversible.`,
      },
      ecodriving: {
        title: 'Supprimer le profil éco-conduite',
        message: `Supprimer ce profil éco-conduite ? Cette action est irréversible.`,
      },
    };
    const labels = labelMap[activeTab] || {
      title: 'Supprimer',
      message: 'Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.',
    };
    const confirmed = await confirm({
      title: labels.title,
      message: labels.message,
      variant: 'danger',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
    });
    if (!confirmed) return;
    try {
      switch (activeTab) {
        case 'drivers':
          deleteDriver(item.id);
          break;
        case 'techs':
          deleteTech(item.id);
          break;
        case 'users':
        case 'subaccounts':
          deleteUser(item.id);
          break;
        case 'branches':
          deleteBranch(item.id);
          break;
        case 'groups':
          deleteGroup(item.id);
          break;
        case 'objects':
          await api.objects.delete(item.id);
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          break;
        case 'commands':
          deleteCommand(item.id);
          break;
        case 'poi':
          deletePOI(item.id);
          break;
        case 'alerts':
          deleteAlertConfig(item.id);
          break;
        case 'maintenance':
          deleteMaintenanceRule(item.id);
          break;
        case 'schedule':
          deleteScheduleRule(item.id);
          break;
        case 'ecodriving':
          deleteEcoDrivingProfile(item.id);
          break;
        default:
          showToast('Suppression non disponible pour cet onglet', 'error');
          return;
      }
      showToast('Élément supprimé', 'success');
    } catch (err) {
      showToast(`Erreur lors de la suppression : ${(err as Error).message}`, 'error');
    }
  };

  const handleSaveClick = () => {
    formRef.current?.requestSubmit();
  };

  const handleFormSubmit = async (data: Record<string, any>) => {
    if (activeTab === 'clients') {
      const clientData = {
        name: data.name,
        type: data.type as 'B2B' | 'B2C',
        contactName: data.contactName || '',
        email: data.email,
        phone: data.phone || '',
        secondContactName: data.secondContactName || undefined,
        address: data.address || '',
        city: data.city || undefined,
        country: data.country || undefined,
        subscriptionPlan: data.subscriptionPlan || 'Standard',
        sector: data.sector || undefined,
        segment: data.segment || undefined,
        language: data.language || undefined,
        paymentTerms: data.paymentTerms || undefined,
        currency: data.currency || undefined,
      };

      if (editingItem?.id) {
        const updatedClient: Client = {
          ...editingItem,
          ...clientData,
          createdAt: new Date(editingItem.createdAt),
        };
        updateClient(updatedClient);

        // SYNC: Update associated user if exists
        const associatedUser = users.find((u) => u.email === updatedClient.email);
        if (associatedUser) {
          updateUser({
            ...associatedUser,
            name: updatedClient.contactName || updatedClient.name,
            phone: updatedClient.phone,
          });
          showToast(`Client et compte utilisateur mis à jour`, 'success');
        } else {
          showToast(`Client ${updatedClient.name} mis à jour`, 'success');
        }
      } else {
        const newClient: Client = {
          id: `CLT-${Math.floor(Math.random() * 10000)}`,
          tenantId: 'tenant_default',
          createdAt: new Date(),
          paymentStatus: 'UP_TO_DATE',
          status: 'ACTIVE',
          ...clientData,
        };
        addClient(newClient);

        // Check if user account creation is requested
        if (data.createUserAccount === 'on' && newClient.email) {
          try {
            await addUser({
              id: `USR-${Date.now()}`,
              tenantId: newClient.tenantId,
              name: newClient.contactName || newClient.name,
              email: newClient.email,
              role: 'CLIENT',
              clientId: newClient.id,
              status: 'Actif',
              sendInvite: true,
              mustChangePassword: true,
              createdAt: new Date(),
            } as unknown as SystemUser);
            showToast(`Client ${newClient.name} créé avec compte utilisateur (invitation envoyée)`, 'success');
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur création compte utilisateur';
            showToast(`Client créé mais compte utilisateur échoué : ${msg}`, 'error');
          }
        } else {
          showToast(`Client ${newClient.name} créé`, 'success');
        }
      }
    } else if (activeTab === 'users' || activeTab === 'subaccounts') {
      if (editingItem?.id) {
        const dataAny = data as Record<string, any>;
        // En édition de sous-compte, SubUserForm soumet `role` = User/Viewer
        // → on doit forcer role=SOUS_COMPTE et transposer en subRole (comme à la création)
        const userData = {
          ...editingItem,
          ...data,
          name: dataAny.name || dataAny.nom || editingItem.name,
          role: activeTab === 'subaccounts' ? 'SOUS_COMPTE' : dataAny.role || editingItem.role,
          subRole: activeTab === 'subaccounts' ? dataAny.role : editingItem.subRole,
          subUsers: data.subUsers || [],
        };
        updateUser(userData);
        showToast(`Utilisateur ${userData.name} mis à jour`, 'success');
      } else {
        // Create new user
        // Dériver tenantId depuis le revendeur ou le tier client sélectionné.
        // Obligatoire pour CLIENT/SOUS_COMPTE : la contrainte DB chk_default_tenant_staff_only
        // interdit ces rôles dans tenant_default (réservé au staff uniquement).
        const dataAny = data as Record<string, any>;
        const selectedReseller = resellers.find((r) => r.id === dataAny.resellerId);
        const selectedClientTier = tiers.find((t) => t.id === dataAny.clientId);
        const resolvedTenantId = selectedReseller?.tenantId || selectedClientTier?.tenantId;

        const newUser = {
          ...data,
          name: (data as any).name || (data as any).nom,
          role: activeTab === 'subaccounts' ? 'SOUS_COMPTE' : data.role || 'CLIENT',
          subRole: activeTab === 'subaccounts' ? data.role : undefined,
          createdAt: new Date(),
          status: (data as any).statut || 'Actif',
          // tenantId résolu depuis le revendeur/client — si absent, le DataContext utilise
          // le tenant du contexte courant (valide pour les rôles staff)
          ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}),
        };

        try {
          await addUser(newUser as unknown as SystemUser);

          // Automatically create a default branch for this user ONLY if it is a main user creation
          if (activeTab === 'users') {
            const defaultBranch = {
              id: `BR-${Date.now()}`,
              name: `Branche Principale - ${newUser.name}`,
              ville: ((data as Record<string, unknown>).city as string) || 'Abidjan',
              responsable: newUser.name,
              statut: 'ACTIVE',
              clientId: ((data as Record<string, unknown>).clientId as string) || '',
              resellerId: (data as Record<string, unknown>).resellerId as string,
              isDefault: true,
              createdAt: new Date().toISOString(),
              description: 'Branche par défaut créée automatiquement.',
            };
            addBranch(defaultBranch as unknown as Branch);
            showToast(`Utilisateur ${newUser.name} créé avec sa branche par défaut`, 'success');
          } else {
            showToast(`Sous-utilisateur ${newUser.name} créé`, 'success');
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
          showToast(msg, 'error');
        }
      }
    } else if (activeTab === 'objects') {
      if (isSavingVehicle) return;
      setIsSavingVehicle(true);
      const vData = data as VehicleFormData;

      // Parse calibrationTable string → array for backend
      let parsedCalibration: Array<{ voltage: number; liters: number }> | undefined;
      if (vData.calibrationTable) {
        parsedCalibration = vData.calibrationTable
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [h, v] = line.split(',').map(Number);
            return { voltage: h, liters: v };
          })
          .filter((e) => !isNaN(e.voltage) && !isNaN(e.liters));
      }

      const vehicleLabel = vData.name || vData.licensePlate || '';
      const vehiclePayload = {
        ...(editingItem?.id ? { id: editingItem.id } : {}),
        tenantId: user?.tenantId || '',
        // Identité véhicule
        name: vData.name || vData.licensePlate || '',
        plate: vData.licensePlate || '',
        wwPlate: vData.wwPlate || undefined,
        vin: vData.vin || undefined,
        brand: vData.brand || undefined,
        model: vData.model || undefined,
        year: vData.year || undefined,
        color: vData.color || undefined,
        type: vData.vehicleType || undefined,
        vehicleType: vData.vehicleType || undefined,
        status: vData.status || VehicleStatus.STOPPED,
        // Hiérarchie
        clientId: vData.client || editingItem?.clientId || '',
        client: vData.client || editingItem?.client || '',
        resellerId: vData.resellerId || editingItem?.resellerId || undefined,
        branchId: vData.branchId || editingItem?.branchId || undefined,
        groupId: vData.group || editingItem?.groupId || undefined,
        driverId: vData.driver || undefined,
        driverName: editingItem?.driverName || undefined,
        // Boîtier & connectivité
        imei: vData.imei || '',
        deviceType: vData.deviceType || undefined,
        sim: vData.sim || undefined,
        iccid: vData.iccid || undefined,
        simOperator: vData.simOperator || undefined,
        serverAddress: vData.serverAddress || undefined,
        deviceLocation: vData.deviceLocation || undefined,
        deviceStatus: vData.deviceStatus || undefined,
        installDate: vData.installDate || undefined,
        sensors: vData.sensors?.length ? vData.sensors : undefined,
        // odometerSource : CANBUS (formulaire) → CAN (backend)
        odometerSource: vData.odometerSource === 'CANBUS' ? 'CAN' : vData.odometerSource || 'GPS',
        // Carburant — backend exige .positive() (>0). Filtrer 0/null pour éviter validation error.
        tankCapacity: vData.tankCapacity && vData.tankCapacity > 0 ? vData.tankCapacity : undefined,
        tankHeight: vData.tankHeight ?? undefined,
        tankWidth: vData.tankWidth ?? undefined,
        tankLength: vData.tankLength ?? undefined,
        fuelType: vData.fuelType || undefined,
        fuelSensorType: vData.fuelSensorType || undefined,
        calibrationTable: parsedCalibration && parsedCalibration.length > 0 ? parsedCalibration : undefined,
        theoreticalConsumption: vData.consumption && vData.consumption > 0 ? vData.consumption : undefined,
        refillThreshold: vData.refillThreshold && vData.refillThreshold > 0 ? vData.refillThreshold : undefined,
        theftThreshold: vData.theftThreshold && vData.theftThreshold > 0 ? vData.theftThreshold : undefined,
        // Sensor config — factor backend .positive(), voltages .min(0)
        sensorConfig:
          vData.sensorUnit ||
          (vData.fuelConversionFactor && vData.fuelConversionFactor > 0) ||
          vData.voltageEmptyMv != null
            ? {
                sensor_unit: vData.sensorUnit || 'tension',
                factor: vData.fuelConversionFactor && vData.fuelConversionFactor > 0 ? vData.fuelConversionFactor : 1,
                v_empty_mv: vData.voltageEmptyMv ?? 0,
                v_half_mv: vData.voltageHalfMv ?? 2500,
                v_full_mv: vData.voltageFullMv ?? 5000,
                sensor_brand: vData.sensorBrand || undefined,
                sensor_model: vData.sensorModel || undefined,
                sensor_install_date: vData.sensorInstallDate || undefined,
              }
            : undefined,
        // Maintenance & alertes
        maxSpeed: vData.maxSpeed ?? editingItem?.maxSpeed ?? undefined,
        maxIdleTime: vData.maxIdleTime ?? undefined,
        nextMaintenanceKm: vData.nextMaintenanceKm ?? undefined,
        nextMaintenanceDate: vData.nextMaintenanceDate || undefined,
        insuranceExpiry: vData.insuranceExpiry || undefined,
        techVisitExpiry: vData.techVisitExpiry || undefined,
        contractExpiry: vData.contractExpiry || undefined,
        // Données runtime (conserver depuis l'existant)
        location: editingItem?.location || undefined,
        speed: editingItem?.speed || 0,
        fuelLevel: editingItem?.fuelLevel ?? 100,
        lastUpdated: new Date(),
        mileage: vData.odometer ?? vData.mileage ?? editingItem?.mileage ?? 0,
        dailyMileage: editingItem?.dailyMileage || 0,
      };

      const onSuccess = () => {
        showToast(`Véhicule ${vehicleLabel} ${editingItem?.id ? 'mis à jour' : 'ajouté'}`, 'success');
        setIsModalOpen(false);
        setIsSavingVehicle(false);
        // Si l'édition vient de la map (initialAction=edit_vehicle), retour à la map avec le véhicule sélectionné
        if (initialAction === 'edit_vehicle' && editingItem?.id && onNavigate) {
          onNavigate(View.MAP, { vehicleId: editingItem.id });
        }
      };
      const onError = (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
        showToast(msg, 'error');
        setIsSavingVehicle(false);
      };

      if (editingItem?.id) {
        updateVehicle(vehiclePayload as unknown as Parameters<typeof updateVehicle>[0], { onSuccess, onError });
      } else {
        addVehicle(vehiclePayload as unknown as Parameters<typeof addVehicle>[0], { onSuccess, onError });
      }
    } else if (activeTab === 'branches') {
      if (editingItem?.id) {
        updateBranch({ ...editingItem, ...data });
        showToast(`Branche ${data.name} mise à jour`, 'success');
      } else {
        addBranch({ id: `BR-${Math.floor(Math.random() * 10000)}`, ...data } as unknown as Branch);
        showToast(`Branche ${data.name} créée`, 'success');
      }
    } else if (activeTab === 'drivers') {
      if (editingItem?.id) {
        updateDriver({ ...editingItem, ...data } as unknown as Driver);
        showToast(`Conducteur ${data.nom} mis à jour`, 'success');
      } else {
        addDriver({
          id: `DRV-${Math.floor(Math.random() * 10000)}`,
          tenantId: 'tenant_default',
          statut: 'Actif',
          ...data,
        } as unknown as Driver);
        showToast(`Conducteur ${data.nom} créé`, 'success');
      }
    } else if (activeTab === 'techs') {
      if (editingItem?.id) {
        updateTech({ ...editingItem, ...data } as unknown as Tech);
        showToast(`Technicien ${data.nom} mis à jour`, 'success');
      } else {
        addTech({
          id: `TCH-${Math.floor(Math.random() * 10000)}`,
          tenantId: 'tenant_default',
          statut: 'Actif',
          ...data,
        } as unknown as Tech);
        showToast(`Technicien ${data.nom} créé`, 'success');
      }
    } else if (activeTab === 'groups') {
      if (editingItem?.id) {
        updateGroup({ ...editingItem, ...data } as unknown as Group);
        showToast(`Groupe ${data.nom} mis à jour`, 'success');
      } else {
        addGroup({ id: `GRP-${Math.floor(Math.random() * 10000)}`, ...data } as unknown as Group);
        showToast(`Groupe ${data.nom} créé`, 'success');
      }
    } else if (activeTab === 'commands') {
      if (editingItem?.id) {
        updateCommand({ ...editingItem, ...data } as unknown as Command);
        showToast(`Commande mise à jour`, 'success');
      } else {
        addCommand({ id: `CMD-${Date.now()}`, ...data } as unknown as Command);
        showToast(`Commande créée`, 'success');
      }
    } else if (activeTab === 'poi') {
      if (editingItem?.id) {
        updatePOI({ ...editingItem, ...data } as unknown as POI);
        showToast(`POI mis à jour`, 'success');
      } else {
        addPOI({ id: `POI-${Date.now()}`, ...data } as unknown as POI);
        showToast(`POI créé`, 'success');
      }
    } else if (activeTab === 'alerts') {
      if (editingItem?.id) {
        updateAlertConfig({ ...editingItem, ...data } as unknown as AlertConfig);
        showToast(`Alerte mise à jour`, 'success');
      } else {
        addAlertConfig({ id: `ALT-${Date.now()}`, ...data } as unknown as AlertConfig);
        showToast(`Alerte créée`, 'success');
      }
    } else if (activeTab === 'maintenance') {
      if (editingItem?.id) {
        updateMaintenanceRule({ ...editingItem, ...data } as unknown as MaintenanceRule);
        showToast(`Règle de maintenance mise à jour`, 'success');
      } else {
        addMaintenanceRule({ id: `MNT-${Date.now()}`, ...data } as unknown as MaintenanceRule);
        showToast(`Règle de maintenance créée`, 'success');
      }
    } else if (activeTab === 'schedule') {
      if (editingItem?.id) {
        updateScheduleRule({ ...editingItem, ...data } as unknown as ScheduleRule);
        showToast(`Règle horaire mise à jour`, 'success');
      } else {
        addScheduleRule({ id: `SCH-${Date.now()}`, ...data } as unknown as ScheduleRule);
        showToast(`Règle horaire créée`, 'success');
      }
    } else if (activeTab === 'ecodriving') {
      if (editingItem?.id) {
        updateEcoDrivingProfile({ ...editingItem, ...data } as unknown as EcoDrivingProfile);
        showToast(`Profil éco-conduite mis à jour`, 'success');
      } else {
        addEcoDrivingProfile({ id: `ECO-${Date.now()}`, ...data } as unknown as EcoDrivingProfile);
        showToast(`Profil éco-conduite créé`, 'success');
      }
    } else {
      // Generic success for other forms
      showToast('Enregistrement effectué avec succès', 'success');
    }
    setIsModalOpen(false);
  };

  const isMobile = useIsMobile();
  const [mobileShowList, setMobileShowList] = useState(true);

  const ICON_COLORS: Record<string, string> = {
    profile: 'bg-[var(--primary-dim)]0',
    operations: 'bg-indigo-500',
    my_notifications: 'bg-purple-500',
    support: 'bg-green-500',
    users: 'bg-[var(--primary)]',
    subaccounts: 'bg-cyan-600',
    branches: 'bg-teal-500',
    groups: 'bg-violet-500',
    objects: 'bg-orange-500',
    drivers: 'bg-amber-500',
    commands: 'bg-[var(--bg-elevated)]',
    geofencing: 'bg-orange-600',
    poi: 'bg-cyan-500',
    maintenance: 'bg-green-600',
    alerts: 'bg-red-500',
    schedule: 'bg-yellow-500',
    ecodriving: 'bg-emerald-500',
    clients: 'bg-pink-500',
    techs: 'bg-teal-600',
    reseller: 'bg-indigo-600',
    sync: 'bg-[var(--text-secondary)]',
    support_settings: 'bg-[var(--bg-surface)]0',
    about: 'bg-cyan-500',
  };

  // --- STATE MANAGEMENT FOR 2-LEVEL TABS ---
  const findGroupByTabId = (tabId: string) => filteredMenuGroups.find((g) => g.items.some((i) => i.id === tabId));

  const [activeCategory, setActiveCategory] = useState<string>(() => {
    if (initialTab) {
      const group = findGroupByTabId(initialTab);
      return group ? group.title : filteredMenuGroups[0]?.title || '';
    }
    return filteredMenuGroups[0]?.title || '';
  });

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    return initialTab || (filteredMenuGroups[0]?.items[0]?.id as TabId);
  });

  // Update active tab when category changes
  const handleCategoryChange = (categoryTitle: string) => {
    setActiveCategory(categoryTitle);
    const group = filteredMenuGroups.find((g) => g.title === categoryTitle);
    if (group && group.items.length > 0) {
      setActiveTab(group.items[0].id as TabId);
    }
  };

  const currentGroupItems = useMemo(() => {
    return filteredMenuGroups.find((g) => g.title === activeCategory)?.items || [];
  }, [activeCategory, filteredMenuGroups]);

  const getModalTitle = () => {
    if (activeTab === 'objects') return editingItem ? 'Éditer Véhicule' : 'Nouveau Véhicule';
    if (activeTab === 'groups') return editingItem ? 'Éditer Groupe' : 'Nouveau Groupe';
    if (activeTab === 'reseller') return editingItem ? 'Éditer Revendeur' : 'Nouveau Revendeur';
    if (activeTab === 'users') return editingItem ? 'Éditer Utilisateur' : 'Nouvel Utilisateur';
    if (activeTab === 'poi') return editingItem ? "Éditer Point d'intérêt" : "Nouveau Point d'intérêt";
    if (activeTab === 'maintenance') return editingItem ? 'Éditer Règle Maintenance' : 'Nouvelle Règle Maintenance';
    if (activeTab === 'alerts') return editingItem ? 'Éditer Alerte' : 'Nouvelle Alerte';
    if (activeTab === 'schedule') return editingItem ? 'Éditer Horaire' : 'Nouveau Horaire';
    if (activeTab === 'ecodriving') return editingItem ? 'Éditer Profil Eco-conduite' : 'Nouveau Profil Eco-conduite';
    if (activeTab === 'admin') return editingItem ? 'Éditer Utilisateur' : 'Nouvel Utilisateur';
    if (activeTab === 'subaccounts') return editingItem ? 'Éditer Sous-utilisateur' : 'Nouveau Sous-utilisateur';
    if (activeTab === 'branches') return editingItem ? 'Éditer Branche' : 'Nouvelle Branche';
    if (activeTab === 'drivers') return editingItem ? 'Éditer Conducteur' : 'Nouveau Conducteur';
    if (activeTab === 'techs') return editingItem ? 'Éditer Technicien' : 'Nouveau Technicien';
    return 'Formulaire';
  };

  const handleUserStatusChange = (id: string, newStatus: string) => {
    const target = users.find((u: any) => u.id === id);
    if (!target) return;
    updateUser({ ...target, status: newStatus } as any);
  };

  const handleResetPassword = async (item: GenericItem) => {
    const confirmed = await confirm({
      title: 'Réinitialiser le mot de passe',
      message: `Générer un nouveau mot de passe pour « ${(item as any).name || (item as any).nom} » ?\nLe mot de passe actuel sera invalidé immédiatement.`,
      confirmLabel: 'Réinitialiser',
    });
    if (!confirmed) return;
    try {
      const result = await api.users.resetPassword(item.id);
      if (result.generatedPassword) {
        showToast(`Nouveau mot de passe : ${result.generatedPassword} (à communiquer à l'utilisateur)`, 'success');
      } else {
        showToast(result.message || 'Mot de passe réinitialisé', 'success');
      }
    } catch (e: any) {
      showToast(`Erreur : ${e.message || 'Impossible de réinitialiser'}`, 'error');
    }
  };

  const renderContent = () => {
    const commonProps = { onAddClick: handleCreate, onEdit: handleEdit, onDelete: handleDelete };

    // Wrap lazy-loaded components with Suspense
    const withSuspense = (Component: React.ReactNode, label?: string) => (
      <Suspense fallback={<LoadingFallback label={label} />}>{Component}</Suspense>
    );

    switch (activeTab) {
      case 'profile':
        return withSuspense(<MyAccountView />, 'Chargement du profil...');
      case 'operations':
        return withSuspense(<MyOperationsView />, 'Chargement des opérations...');
      case 'my_notifications':
        return withSuspense(<MyNotificationsView />, 'Chargement des notifications...');
      case 'support':
        return withSuspense(<HelpCenterView />, "Chargement de l'aide...");
      case 'support_settings':
        return withSuspense(<SupportSettingsPanel />, 'Chargement de la configuration...');
      case 'sync':
        return withSuspense(<SyncView />, 'Chargement...');
      case 'about':
        return withSuspense(<AboutView />, 'Chargement...');
      case 'drivers':
        return (
          <GenericTableContent
            title="Conducteur"
            type="driver"
            icon={Car}
            columns={['ID', 'Nom', 'Permis', 'Téléphone', 'RFID Tag', 'Statut']}
            useRealDrivers
            drivers={drivers}
            {...commonProps}
          />
        );
      case 'techs':
        return (
          <GenericTableContent
            title="Technicien"
            type="tech"
            icon={Wrench}
            columns={['ID', 'Nom', 'Spécialité', 'Zone', 'Niveau', 'Société', 'Statut']}
            useRealTechs
            techs={techs}
            {...commonProps}
          />
        );
      case 'users': {
        const clientUsers = users
          .filter((u: any) => (u.role || '').toUpperCase() === 'CLIENT')
          .map((u: any) => ({
            ...u,
            vehicleCount: vehicles.filter((v: any) => v.clientId === u.clientId || v.client === u.clientId).length,
          }));
        return (
          <GenericTableContent
            title="Utilisateur Client"
            type="users"
            icon={Users}
            columns={['Nom', 'Email', 'Véhicules', 'Dernière Connexion', 'Statut']}
            useRealUsers
            users={clientUsers}
            onStatusChange={handleUserStatusChange}
            onResetPassword={handleResetPassword}
            {...commonProps}
          />
        );
      }
      case 'admin':
        return (
          <GenericTableContent
            title="Administrateur"
            type="admin"
            icon={Shield}
            columns={['ID', 'Nom', 'Email', 'Rôle', 'Statut']}
            {...commonProps}
          />
        );
      case 'reseller':
        return withSuspense(
          <TierList
            type="RESELLER"
            onEdit={handleEdit}
            onViewDetail={(tier) => {
              setSelectedReseller(tier);
              setIsResellerDetailOpen(true);
            }}
            readOnly={true}
          />,
          'Chargement des revendeurs...'
        );
      case 'commands':
        return (
          <GenericTableContent
            title="Commande Technique"
            type="command"
            icon={Terminal}
            columns={['ID', 'Véhicule', 'Type', 'Canal', 'Envoyé', 'Statut', 'Réponse']}
            useRealCommands
            commands={commands}
            {...commonProps}
          />
        );
      case 'subaccounts': {
        const subUsers = users
          .filter((u: any) => (u.role || '').toUpperCase() === 'SOUS_COMPTE')
          .map((u: any) => ({
            ...u,
            vehicleCount: u.allVehicles
              ? vehicles.filter((v: any) => v.clientId === u.clientId || v.client === u.clientId).length
              : (u.vehicleIds || []).length,
          }));
        return (
          <GenericTableContent
            title="Sous-utilisateur"
            type="subaccount"
            icon={Users}
            columns={['Client', 'Nom', 'Email', 'Rôle', 'Véhicules', 'Dernière Connexion', 'Statut']}
            useRealUsers
            users={subUsers}
            onStatusChange={handleUserStatusChange}
            onResetPassword={handleResetPassword}
            {...commonProps}
          />
        );
      }
      case 'objects':
        return (
          <GenericTableContent
            title="Véhicule"
            type="vehicle"
            icon={Box}
            columns={['Nom', 'Plaque', 'Modèle', 'Groupe', 'Statut']}
            useRealVehicles
            vehicles={vehicles}
            {...commonProps}
          />
        );
      case 'groups':
        return (
          <GenericTableContent
            title="Groupe"
            type="group"
            icon={Layers}
            columns={['ID', 'Nom', 'Description', 'Véhicules', 'Statut']}
            useRealGroups
            groups={groups}
            {...commonProps}
          />
        );
      case 'branches':
        return (
          <GenericTableContent
            title="Branche"
            type="branch"
            icon={GitBranch}
            columns={['Nom', 'Ville', 'Responsable', 'Statut']}
            useRealBranches
            branches={branches}
            {...commonProps}
          />
        );
      case 'geofencing':
        return (
          <GenericTableContent
            title="Zone"
            type="geofence"
            icon={Hexagon}
            columns={['ID', 'Revendeur', 'Client', 'Nom', 'Type', 'Véhicules', 'Statut']}
            {...commonProps}
          />
        );
      case 'poi':
        return (
          <GenericTableContent
            title="Point d'intérêt"
            type="poi"
            icon={MapPin}
            columns={['ID', 'Revendeur', 'Client', 'Nom', 'Type', 'Adresse', 'Rayon', 'Statut']}
            useRealPOIs
            pois={pois}
            {...commonProps}
          />
        );
      case 'maintenance':
        return (
          <GenericTableContent
            title="Règle Maintenance"
            type="maintenance"
            icon={Wrench}
            columns={['ID', 'Revendeur', 'Client', 'Nom', 'Type', 'Intervalle', 'Véhicules', 'Statut']}
            useRealMaintenanceRules
            maintenanceRules={maintenanceRules}
            {...commonProps}
          />
        );
      case 'alerts':
        return (
          <GenericTableContent
            title="Configuration Alerte"
            type="alert"
            icon={Bell}
            columns={['ID', 'Revendeur', 'Client', 'Nom', 'Type', 'Priorité', 'Destinataires', 'Statut']}
            useRealAlertConfigs
            alertConfigs={alertConfigs}
            {...commonProps}
          />
        );
      case 'schedule':
        return (
          <GenericTableContent
            title="Règle de travail"
            type="schedule"
            icon={Calendar}
            columns={['ID', 'Nom', 'Horaires', 'Distance', 'Vitesse', 'Moteur', 'Custom', 'Véhicules', 'Statut']}
            useRealScheduleRules
            scheduleRules={scheduleRules}
            {...commonProps}
          />
        );
      case 'ecodriving':
        return (
          <GenericTableContent
            title="Seuil Eco-conduite"
            type="ecodriving"
            icon={Leaf}
            columns={['ID', 'Nom', 'Score Cible', 'Vitesse Max', 'Accélération', 'Freinage', 'Ralenti', 'Statut']}
            useRealEcoDrivingProfiles
            ecoDrivingProfiles={ecoDrivingProfiles}
            {...commonProps}
          />
        );

      default:
        return (
          <div className="p-4 text-center text-[var(--text-secondary)]">Section en construction ({activeTab})</div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full gap-2 sm:gap-6 animate-in fade-in duration-500">
      {/* ── MOBILE: liste native ── */}
      {isMobile && mobileShowList && (
        <div className="flex-1 overflow-y-auto pb-24 space-y-4">
          {/* Profile card */}
          <button
            onClick={() => {
              setActiveTab('profile');
              setMobileShowList(false);
            }}
            className="w-full flex items-center gap-3 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm text-left"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--primary-dim)] flex items-center justify-center text-[var(--primary)] font-bold text-lg shrink-0">
              {(user?.name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-[var(--text-primary)] truncate">{user?.name || 'Profil'}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--text-muted)] dark:text-[var(--text-secondary)] shrink-0" />
          </button>

          {/* Grouped settings list */}
          {filteredMenuGroups
            .filter((g) => g.title !== 'Profil')
            .map((group) => (
              <div key={group.title}>
                <p className="section-title px-1 mb-1.5">{group.title}</p>
                <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const bgColor = ICON_COLORS[item.id] || 'bg-[var(--text-secondary)]';
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as TabId);
                          setMobileShowList(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-elevated)]/50 active:bg-[var(--bg-elevated)] text-left"
                      >
                        <div className={`w-9 h-9 rounded-full ${bgColor} flex items-center justify-center shrink-0`}>
                          <Icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
                        </div>
                        <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] dark:text-[var(--text-secondary)] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── MOBILE: contenu d'une section ── */}
      {isMobile && !mobileShowList && (
        <div className="flex flex-col h-full">
          <button
            onClick={() => setMobileShowList(true)}
            className="flex items-center gap-1 text-[var(--primary)] text-sm font-medium mb-3 self-start"
          >
            <ChevronLeft className="w-4 h-4" /> Paramètres
          </button>
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm">
            <div className="flex-1 overflow-auto p-4 relative">{renderContent()}</div>
          </div>
        </div>
      )}

      {/* ── DESKTOP: 2-level tabs ── */}
      {!isMobile && (
        <>
          <div className="flex flex-col gap-4">
            {/* Level 1: Categories */}
            <div className="flex items-center justify-between gap-4">
              <Tabs
                tabs={filteredMenuGroups.map((g) => ({ id: g.title, label: g.title }))}
                activeTab={activeCategory}
                onTabChange={handleCategoryChange}
              />
            </div>

            {/* Level 2: Items */}
            <div className="mt-[-1.5rem]">
              <Tabs
                tabs={currentGroupItems as import('../../../components/Tabs').TabItem[]}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as TabId)}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm">
            <div className="flex-1 overflow-hidden p-6 relative">{renderContent()}</div>
          </div>
        </>
      )}

      {/* Generic Modal with Refactored Footer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={getModalTitle()}
        maxWidth="max-w-5xl"
        isDirty={isDirty}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-[var(--border)] rounded text-[var(--text-secondary)] text-sm font-bold hover:bg-white hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={activeTab === 'objects' && isSavingVehicle}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded text-sm font-bold hover:bg-[var(--primary-light)] shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {activeTab === 'objects' && isSavingVehicle ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Enregistrer
                </>
              )}
            </button>
          </div>
        }
      >
        <Suspense fallback={<LoadingFallback label="Chargement du formulaire..." />}>
          {activeTab === 'objects' ? (
            <VehicleForm
              key={editingItem?.id || 'create'}
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              clients={clients}
              resellers={resellers}
              branches={branches}
              groups={groups}
              drivers={drivers}
            />
          ) : activeTab === 'poi' ? (
            <PoiForm
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              resellers={resellers}
              clients={clients}
            />
          ) : activeTab === 'geofencing' ? (
            <GeofenceForm
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              resellers={resellers}
              clients={clients}
              branches={branches}
              groups={groups}
            />
          ) : activeTab === 'maintenance' ? (
            <MaintenanceForm
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              resellers={resellers}
              clients={clients as unknown as Tier[]}
              vehicles={vehicles}
              users={users}
            />
          ) : activeTab === 'alerts' ? (
            <AlertForm
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              resellers={resellers}
              clients={clients as unknown as Tier[]}
              vehicles={vehicles}
              users={users}
              zones={zones}
            />
          ) : activeTab === 'schedule' ? (
            <ScheduleForm
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              resellers={resellers}
              clients={clients as unknown as Tier[]}
            />
          ) : activeTab === 'ecodriving' ? (
            <EcoDrivingForm
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              resellers={resellers}
              clients={clients}
            />
          ) : activeTab === 'subaccounts' ? (
            <SubUserForm
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              resellers={resellers}
              clients={clients}
              branches={branches}
              vehicles={vehicles}
            />
          ) : activeTab === 'admin' || activeTab === 'users' ? (
            <UserForm
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              resellers={resellers}
              branches={branches as unknown as { id: string; nom: string; ville?: string }[]}
              vehicles={vehicles as unknown as { id: string; name: string; plate?: string }[]}
              clients={clients as unknown as { id: string; name: string }[]}
            />
          ) : activeTab === 'branches' ? (
            <BranchForm
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              clients={clients}
              resellers={resellers}
            />
          ) : activeTab === 'drivers' ? (
            <DriverForm
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              vehicles={vehicles}
              clients={clients}
              resellers={resellers}
            />
          ) : activeTab === 'commands' ? (
            <CommandForm
              ref={formRef}
              initialData={editingItem}
              onFormSubmit={handleFormSubmit}
              vehicles={vehicles}
              clients={clients}
              resellers={resellers}
            />
          ) : activeTab === 'groups' ? (
            <GroupForm ref={formRef} initialData={editingItem} onFormSubmit={handleFormSubmit} resellers={resellers} />
          ) : (
            <div className="p-4 text-center text-[var(--text-secondary)]">Formulaire non disponible</div>
          )}
        </Suspense>
      </Modal>

      <Suspense fallback={<LoadingFallback />}>
        <TierDetailModal
          tier={selectedReseller}
          isOpen={isResellerDetailOpen}
          onClose={() => {
            setIsResellerDetailOpen(false);
            setSelectedReseller(null);
          }}
          onEdit={(tier) => {
            setEditingItem(tier);
            setIsModalOpen(true);
          }}
        />
      </Suspense>

      <ConfirmDialogComponent />
    </div>
  );
};
