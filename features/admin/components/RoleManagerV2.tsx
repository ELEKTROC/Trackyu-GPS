/**
 * RoleManagerV2 - Gestionnaire de Rôles avec Permissions Granulaires
 *
 * Interface arborescente: Module → Onglet → Champ
 * Avec actions CRUD par niveau
 *
 * CORRIGÉ: Intégration avec l'API backend pour persistance réelle
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  Download,
  Upload,
  Lock,
  Copy,
  Search,
  LayoutDashboard,
  Map,
  Car,
  Users,
  Target,
  FileSignature,
  Receipt,
  CreditCard,
  Wrench,
  Package,
  LifeBuoy,
  BarChart3,
  Settings,
  Bell,
  UserCircle,
  Building,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { api } from '../../../services/apiLazy';
import type { PermissionAction, RolePermission, RoleWithPermissions } from '../permissions/types';
import {
  PERMISSION_MODULES,
  PERMISSION_CATEGORIES,
  PERMISSION_ACTIONS,
  getSortedSidebarMenu,
} from '../permissions/permissionStructure';

// Mapping des icônes
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Map,
  Car,
  Users,
  Target,
  FileSignature,
  Receipt,
  CreditCard,
  Wrench,
  Package,
  LifeBuoy,
  BarChart3,
  Settings,
  Bell,
  UserCircle,
  Building,
  Eye,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
};

// Icônes pour la config mobile tabs
import {
  Truck,
  Activity,
  Headset,
  Calculator,
  ShoppingCart,
  Briefcase,
  Calendar,
  FileText,
  Smartphone,
} from 'lucide-react';
const MOBILE_ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Map,
  Truck,
  Wrench,
  FileText,
  ShoppingCart,
  Briefcase,
  Calculator,
  Activity,
  Package,
  Headset,
  Settings,
  Calendar,
  ShieldCheck: Shield,
};

// ❌ DEFAULT_ROLES supprimé - Charger uniquement depuis la base de données
// Tous les rôles doivent provenir de l'API pour garantir la synchronisation DB ↔ Frontend

// Mapping des couleurs pour Tailwind (classes complètes)
const COLOR_CLASSES: Record<string, { dot: string; bg: string; text: string; badge: string }> = {
  purple: {
    dot: 'bg-purple-500',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
  },
  blue: {
    dot: 'bg-[var(--primary-dim)]0',
    bg: 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]',
    text: 'text-[var(--primary)]',
    badge: 'bg-[var(--primary-dim)] text-[var(--primary)]',
  },
  green: {
    dot: 'bg-green-500',
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600',
    badge: 'bg-green-100 text-green-700',
  },
  orange: {
    dot: 'bg-orange-500',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
  },
  cyan: {
    dot: 'bg-cyan-500',
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-600',
    badge: 'bg-cyan-100 text-cyan-700',
  },
  red: {
    dot: 'bg-red-500',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  },
  amber: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
  },
  slate: {
    dot: 'bg-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-900/30',
    text: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700',
  },
  indigo: {
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  teal: {
    dot: 'bg-teal-500',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    text: 'text-teal-600',
    badge: 'bg-teal-100 text-teal-700',
  },
  rose: {
    dot: 'bg-rose-500',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-600',
    badge: 'bg-rose-100 text-rose-700',
  },
};

const getColorClass = (color: string | undefined, type: 'dot' | 'bg' | 'text' | 'badge') => {
  return COLOR_CLASSES[color || 'slate']?.[type] || COLOR_CLASSES.slate[type];
};

// API Role interface for mapping
interface RoleApiRow {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  color?: string;
  is_system?: boolean;
  isSystem?: boolean;
  permissions?: unknown;
  mobile_tabs?: string[];
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

// Props
interface RoleManagerV2Props {
  onRoleSelect?: (role: RoleWithPermissions) => void;
}

export const RoleManagerV2: React.FC<RoleManagerV2Props> = ({ onRoleSelect }) => {
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // State
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingPermissions, setIsEditingPermissions] = useState(false); // Mode édition des permissions
  const [searchQuery, setSearchQuery] = useState('');

  // Permissions en cours d'édition
  const [editingPermissions, setEditingPermissions] = useState<RolePermission[]>([]);

  // Expansion state pour l'arbre
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // ========== CHARGER LES RÔLES DEPUIS L'API ==========
  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.adminFeatures.roles.list();

      if (!data || !Array.isArray(data)) {
        showToast(TOAST.CRUD.ERROR_LOAD('rôles'), 'error');
        setRoles([]);
        return;
      }

      // Transformer les données de l'API vers notre format
      const mappedRoles: RoleWithPermissions[] = data.map((r: RoleApiRow) => {
        const transformed = {
          id: r.id,
          name: r.display_name || r.name, // Utiliser display_name si disponible
          description: r.description || '',
          color: r.color || getColorFromName(r.name), // Utiliser la couleur de la DB si disponible
          isSystem: r.is_system || r.isSystem || false,
          permissions: transformPermissionsFromApi(r.permissions),
          mobileTabs: r.mobile_tabs || undefined,
          createdAt: r.created_at || r.createdAt || new Date().toISOString(),
          updatedAt: r.updated_at || r.updatedAt || new Date().toISOString(),
        };
        return transformed;
      });

      setRoles(mappedRoles);

      if (mappedRoles.length === 0) {
        showToast('Aucun rôle trouvé. Créez-en un pour commencer.', 'info');
      }
    } catch (error) {
      showToast(TOAST.NETWORK.ERROR, 'error');
      // ✅ Afficher liste vide au lieu de DEFAULT_ROLES (supprimé)
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Charger au montage
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Helpers pour transformer les permissions
  const getColorFromName = (name: string): string => {
    const colorMap: Record<string, string> = {
      SUPERADMIN: 'purple',
      ADMIN: 'blue',
      MANAGER: 'indigo',
      COMMERCIAL: 'green',
      COMPTABLE: 'amber',
      TECH: 'orange',
      AGENT_TRACKING: 'cyan',
      SUPPORT_AGENT: 'teal',
      PILOTE: 'rose',
      PILOTE_CRM: 'pink',
      PILOTE_FINANCE: 'fuchsia',
      CLIENT: 'slate',
    };
    return colorMap[name.toUpperCase()] || 'slate';
  };

  const transformPermissionsFromApi = (perms: unknown): RolePermission[] => {
    // Si c'est null ou undefined
    if (!perms) {
      return [];
    }

    // Si c'est un array simple de strings (format actuel en DB)
    if (Array.isArray(perms) && perms.length > 0 && typeof perms[0] === 'string') {
      // Convertir les permissions string en RolePermission[]
      const moduleMap: Record<string, RolePermission> = {};
      perms.forEach((perm: string) => {
        const [action, ...rest] = perm.split('_');
        const moduleId = rest.join('_').toLowerCase();

        if (!moduleId) {
          return;
        }

        if (!moduleMap[moduleId]) {
          moduleMap[moduleId] = { moduleId, actions: [] };
        }

        if (action === 'VIEW' && !moduleMap[moduleId].actions.includes('VIEW')) {
          moduleMap[moduleId].actions.push('VIEW');
        }
        if (action === 'MANAGE') {
          // MANAGE accorde tous les droits
          (['VIEW', 'CREATE', 'EDIT', 'DELETE'] as PermissionAction[]).forEach((a) => {
            if (!moduleMap[moduleId].actions.includes(a)) {
              moduleMap[moduleId].actions.push(a);
            }
          });
        }
        if (action === 'CREATE' && !moduleMap[moduleId].actions.includes('CREATE')) {
          moduleMap[moduleId].actions.push('CREATE');
        }
        if (action === 'EDIT' && !moduleMap[moduleId].actions.includes('EDIT')) {
          moduleMap[moduleId].actions.push('EDIT');
        }
        if (action === 'DELETE' && !moduleMap[moduleId].actions.includes('DELETE')) {
          moduleMap[moduleId].actions.push('DELETE');
        }
      });

      const result = Object.values(moduleMap);
      return result;
    }

    // Si c'est déjà un array de RolePermission (format granulaire)
    if (Array.isArray(perms) && perms.length > 0 && typeof perms[0] === 'object') {
      return perms;
    }

    // Array vide
    if (Array.isArray(perms) && perms.length === 0) {
      return [];
    }

    return [];
  };

  const transformPermissionsToApi = (perms: RolePermission[]): string[] => {
    // Convertir RolePermission[] en array de strings pour l'API
    const result: string[] = [];
    perms.forEach((p) => {
      if (p.actions.includes('VIEW')) {
        result.push(`VIEW_${p.moduleId.toUpperCase()}`);
      }
      if (p.actions.includes('CREATE') || p.actions.includes('EDIT') || p.actions.includes('DELETE')) {
        result.push(`MANAGE_${p.moduleId.toUpperCase()}`);
      }
    });
    return [...new Set(result)]; // Remove duplicates
  };

  // Filtrer les modules
  const filteredModules = useMemo(() => {
    let modules = PERMISSION_MODULES;

    if (filterCategory !== 'all') {
      modules = modules.filter((m) => m.category === filterCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      modules = modules.filter(
        (m) =>
          m.label.toLowerCase().includes(query) ||
          m.tabs.some((t) => t.label.toLowerCase().includes(query)) ||
          m.tabs.some((t) => t.fields.some((f) => f.label.toLowerCase().includes(query)))
      );
    }

    return modules;
  }, [filterCategory, searchQuery]);

  // Handlers
  const handleSelectRole = (role: RoleWithPermissions) => {
    setSelectedRole(role);
    setEditingPermissions(role.permissions);
    onRoleSelect?.(role);
  };

  const handleCreateRole = () => {
    setEditingRole({
      id: `role_${Date.now()}`,
      name: '',
      description: '',
      color: 'slate',
      isSystem: false,
      permissions: [],
      mobileTabs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setEditingPermissions([]);
    setIsModalOpen(true);
  };

  const handleEditRole = (role: RoleWithPermissions) => {
    if (role.isSystem && role.name.toUpperCase() === 'SUPERADMIN') {
      showToast(TOAST.ADMIN.ROLE_SYSTEM_NO_EDIT, 'error');
      return;
    }
    setEditingRole({ ...role });
    setEditingPermissions([...role.permissions]);
    setIsModalOpen(true);
  };

  const handleDuplicateRole = async (role: RoleWithPermissions) => {
    setIsSaving(true);
    try {
      const newRoleData = {
        name: `${role.name}_COPY`,
        description: `Copie de ${role.name}`,
        permissions: transformPermissionsToApi(role.permissions),
      };
      await api.adminFeatures.roles.create(newRoleData);
      showToast(TOAST.ADMIN.ROLE_DUPLICATED, 'success');
      loadRoles(); // Recharger la liste
    } catch (error) {
      showToast(mapError(error, 'rôle'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.isSystem) {
      showToast(TOAST.ADMIN.ROLE_SYSTEM_NO_DELETE, 'error');
      return;
    }
    if (
      !(await confirm({
        message: 'Supprimer ce rôle ?',
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      }))
    )
      return;

    setIsSaving(true);
    try {
      await api.adminFeatures.roles.delete(roleId);
      setRoles(roles.filter((r) => r.id !== roleId));
      if (selectedRole?.id === roleId) setSelectedRole(null);
      showToast(TOAST.ADMIN.ROLE_DELETED, 'info');
    } catch (error) {
      showToast(mapError(error, 'rôle'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRole = async () => {
    if (!editingRole?.name) {
      showToast(TOAST.ADMIN.ROLE_NAME_REQUIRED, 'error');
      return;
    }

    setIsSaving(true);
    try {
      const roleData = {
        name: editingRole.name.toUpperCase().replace(/\s+/g, '_'),
        description: editingRole.description,
        permissions: transformPermissionsToApi(editingPermissions),
        mobile_tabs: editingRole.mobileTabs || null,
      };

      const existingIndex = roles.findIndex((r) => r.id === editingRole.id);

      if (existingIndex >= 0) {
        // Update existant
        await api.adminFeatures.roles.update(editingRole.id, roleData);
        showToast(TOAST.ADMIN.ROLE_UPDATED, 'success');
      } else {
        // Création nouveau
        await api.adminFeatures.roles.create(roleData);
        showToast(TOAST.ADMIN.ROLE_CREATED, 'success');
      }

      setIsModalOpen(false);
      setEditingRole(null);
      loadRoles(); // Recharger la liste
    } catch (error: unknown) {
      showToast(mapError(error, 'rôle'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle permission
  const togglePermission = (moduleId: string, action: PermissionAction, tabId?: string, fieldId?: string) => {
    setEditingPermissions((prev) => {
      const existing = prev.find((p) => p.moduleId === moduleId && p.tabId === tabId && p.fieldId === fieldId);

      if (existing) {
        const hasAction = existing.actions.includes(action);
        if (hasAction) {
          // Retirer l'action
          const newActions = existing.actions.filter((a) => a !== action);
          if (newActions.length === 0) {
            // Supprimer la permission si plus d'actions
            return prev.filter((p) => p !== existing);
          }
          return prev.map((p) => (p === existing ? { ...p, actions: newActions } : p));
        } else {
          // Ajouter l'action
          return prev.map((p) => (p === existing ? { ...p, actions: [...p.actions, action] } : p));
        }
      } else {
        // Créer nouvelle permission
        return [...prev, { moduleId, tabId, fieldId, actions: [action] }];
      }
    });
  };

  // Vérifier si une action est accordée
  const hasPermission = (moduleId: string, action: PermissionAction, tabId?: string, fieldId?: string): boolean => {
    const perms =
      isEditingPermissions || selectedRole?.id === editingRole?.id
        ? editingPermissions
        : selectedRole?.permissions || [];

    // Superadmin a tout
    if (selectedRole?.id === 'superadmin') return true;

    // Chercher permission exacte
    const exact = perms.find((p) => p.moduleId === moduleId && p.tabId === tabId && p.fieldId === fieldId);
    if (exact?.actions.includes(action)) return true;

    // Si on cherche au niveau champ, vérifier l'onglet parent
    if (fieldId) {
      const tabPerm = perms.find((p) => p.moduleId === moduleId && p.tabId === tabId && !p.fieldId);
      if (tabPerm?.actions.includes(action)) return true;
    }

    // Vérifier le module parent
    const modPerm = perms.find((p) => p.moduleId === moduleId && !p.tabId && !p.fieldId);
    return modPerm?.actions.includes(action) || false;
  };

  // Toggle expand
  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const toggleTab = (tabId: string) => {
    setExpandedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  };

  // Tout étendre/réduire
  const expandAll = () => {
    setExpandedModules(new Set(PERMISSION_MODULES.map((m) => m.id)));
    setExpandedTabs(new Set(PERMISSION_MODULES.flatMap((m) => m.tabs.map((t) => t.id))));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedTabs(new Set());
  };

  // Compter les permissions d'un rôle
  const countPermissions = (role: RoleWithPermissions): number => {
    if (role.id === 'superadmin')
      return PERMISSION_MODULES.reduce(
        (acc, m) =>
          acc +
          m.globalActions.length +
          m.tabs.reduce(
            (tacc, t) => tacc + t.actions.length + t.fields.reduce((facc, f) => facc + f.actions.length, 0),
            0
          ),
        0
      );
    return role.permissions.reduce((acc, p) => acc + p.actions.length, 0);
  };

  // Mapping des couleurs pour les actions (classes Tailwind complètes)
  const ACTION_COLOR_CLASSES: Record<PermissionAction, { checked: string; unchecked: string }> = {
    VIEW: {
      checked: 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)]',
      unchecked: 'bg-slate-100 text-slate-400 dark:bg-slate-700',
    },
    CREATE: {
      checked: 'bg-green-100 text-green-600 dark:bg-green-900/30',
      unchecked: 'bg-slate-100 text-slate-400 dark:bg-slate-700',
    },
    EDIT: {
      checked: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30',
      unchecked: 'bg-slate-100 text-slate-400 dark:bg-slate-700',
    },
    DELETE: {
      checked: 'bg-red-100 text-red-600 dark:bg-red-900/30',
      unchecked: 'bg-slate-100 text-slate-400 dark:bg-slate-700',
    },
    EXPORT: {
      checked: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
      unchecked: 'bg-slate-100 text-slate-400 dark:bg-slate-700',
    },
    IMPORT: {
      checked: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30',
      unchecked: 'bg-slate-100 text-slate-400 dark:bg-slate-700',
    },
  };

  // Render action checkbox
  const renderActionCheckbox = (
    action: PermissionAction,
    moduleId: string,
    availableActions: readonly PermissionAction[],
    tabId?: string,
    fieldId?: string
  ) => {
    const isAvailable = availableActions.includes(action);
    const isChecked = hasPermission(moduleId, action, tabId, fieldId);
    // Permettre l'édition si mode édition OU modal ouvert
    const isEditing = isEditingPermissions || (isModalOpen && editingRole);
    const actionConfig = PERMISSION_ACTIONS[action];
    const colorClasses = ACTION_COLOR_CLASSES[action];
    const canEdit = isEditing && selectedRole?.id !== 'superadmin';

    if (!isAvailable) {
      return (
        <div key={action} className="w-8 h-8 flex items-center justify-center">
          <span className="text-slate-300 dark:text-slate-600">—</span>
        </div>
      );
    }

    const handleClick = () => {
      if (canEdit) {
        togglePermission(moduleId, action, tabId, fieldId);
      }
    };

    return (
      <button
        key={action}
        type="button"
        onClick={handleClick}
        className={`w-8 h-8 rounded flex items-center justify-center transition-all ${
          isChecked ? colorClasses.checked : colorClasses.unchecked
        } ${canEdit ? 'hover:ring-2 ring-[var(--primary-dim)] cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
        title={`${actionConfig.label}${isChecked ? ' (accordé)' : ''}${!canEdit ? ' - Cliquez sur "Modifier les droits" pour éditer' : ''}`}
      >
        {isChecked ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      </button>
    );
  };

  // Affichage chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
          <p className="text-slate-500">Chargement des rôles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 flex-1 min-h-0">
      {/* Overlay de sauvegarde */}
      {isSaving && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl flex items-center gap-4">
            <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
            <span>Sauvegarde en cours...</span>
          </div>
        </div>
      )}

      {/* Liste des rôles */}
      <div className="w-80 shrink-0 flex flex-col bg-white dark:bg-slate-800/50 dark:backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className="p-4 border-b dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Rôles
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => loadRoles()}
                className="p-2 text-slate-500 hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded-lg"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleCreateRole}
                className="p-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
                title="Nouveau rôle"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">{roles.length} rôles configurés</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => handleSelectRole(role)}
              className={`p-3 rounded-lg cursor-pointer mb-2 transition-all ${
                selectedRole?.id === role.id
                  ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] ring-2 ring-[var(--primary-dim)]'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getColorClass(role.color, 'dot')}`}></div>
                  <span className="font-bold text-sm text-slate-800 dark:text-white">{role.name}</span>
                  {role.isSystem && <Lock className="w-3 h-3 text-slate-400" />}
                </div>
                <span className="text-xs text-slate-500">{countPermissions(role)} droits</span>
              </div>
              {role.description && <p className="text-xs text-slate-500 mt-1 truncate">{role.description}</p>}

              {/* Actions */}
              <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleEditRole(role)}
                  className="p-1 text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded"
                  title="Modifier"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDuplicateRole(role)}
                  className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                  title="Dupliquer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {!role.isSystem && (
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matrice des permissions */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-800/50 dark:backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
        {selectedRole ? (
          <>
            {/* Header */}
            <div className="p-4 border-b dark:border-slate-700 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${getColorClass(selectedRole.color, 'dot')}`}></div>
                    {selectedRole.name}
                    {selectedRole.isSystem && (
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">Système</span>
                    )}
                    {isEditingPermissions && (
                      <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded animate-pulse">
                        Mode édition
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-500">{selectedRole.description}</p>
                </div>
                <div className="flex gap-2">
                  {isEditingPermissions ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditingPermissions(false);
                          setEditingPermissions(selectedRole.permissions);
                        }}
                        className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            setIsSaving(true);
                            const roleData = {
                              name: selectedRole.name,
                              description: selectedRole.description,
                              permissions: transformPermissionsToApi(editingPermissions),
                            };
                            await api.adminFeatures.roles.update(selectedRole.id, roleData);
                            const updatedRole = {
                              ...selectedRole,
                              permissions: editingPermissions,
                              updatedAt: new Date().toISOString(),
                            };
                            const newRoles = roles.map((r) => (r.id === selectedRole.id ? updatedRole : r));
                            setRoles(newRoles);
                            setSelectedRole(updatedRole);
                            setIsEditingPermissions(false);
                            showToast(TOAST.ADMIN.PERMISSIONS_SAVED, 'success');
                          } catch (error) {
                            showToast(mapError(error, 'permissions'), 'error');
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Sauvegarder
                      </button>
                    </>
                  ) : (
                    selectedRole.id !== 'superadmin' && (
                      <button
                        onClick={() => {
                          setEditingPermissions([...selectedRole.permissions]);
                          setIsEditingPermissions(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
                      >
                        <Edit2 className="w-4 h-4" />
                        Modifier les droits
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Filtres et recherche */}
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un module, onglet ou champ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                  title="Filtrer par catégorie"
                >
                  <option value="all">Toutes les catégories</option>
                  {PERMISSION_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>

                <div className="flex gap-1">
                  <button
                    onClick={expandAll}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    title="Tout développer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    title="Tout réduire"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Légende */}
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] flex items-center justify-center">
                    <Check className="w-3 h-3 text-[var(--primary)]" />
                  </div>
                  Voir
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  Créer
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Check className="w-3 h-3 text-amber-600" />
                  </div>
                  Modifier
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Check className="w-3 h-3 text-red-600" />
                  </div>
                  Supprimer
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Check className="w-3 h-3 text-purple-600" />
                  </div>
                  Exporter
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                    <Check className="w-3 h-3 text-cyan-600" />
                  </div>
                  Importer
                </div>
              </div>
            </div>

            {/* Arbre des permissions */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedRole.id === 'superadmin' ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Shield className="w-16 h-16 text-purple-500 mb-4" />
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Superadmin</h4>
                  <p className="text-slate-500 max-w-md">
                    Ce rôle système dispose automatiquement de toutes les permissions sur tous les modules, onglets et
                    champs. Il ne peut pas être modifié.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredModules.map((module) => {
                    const ModuleIcon = ICON_MAP[module.icon] || Settings;
                    const isExpanded = expandedModules.has(module.id);
                    const category = PERMISSION_CATEGORIES.find((c) => c.id === module.category);

                    return (
                      <div key={module.id} className="border rounded-lg dark:border-slate-700 overflow-hidden">
                        {/* Module Header */}
                        <div
                          className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700`}
                          onClick={() => toggleModule(module.id)}
                        >
                          <button className="p-1">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            )}
                          </button>

                          <div className={`p-2 rounded-lg ${getColorClass(category?.color, 'bg')}`}>
                            <ModuleIcon className={`w-5 h-5 ${getColorClass(category?.color, 'text')}`} />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-white">{module.label}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${getColorClass(category?.color, 'badge')}`}
                              >
                                {category?.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{module.description}</p>
                          </div>

                          {/* Actions niveau module */}
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {(['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT'] as PermissionAction[]).map(
                              (action) =>
                                renderActionCheckbox(action, module.id, module.globalActions as PermissionAction[])
                            )}
                          </div>
                        </div>

                        {/* Tabs */}
                        {isExpanded && (
                          <div className="border-t dark:border-slate-700">
                            {module.tabs.map((tab) => {
                              const isTabExpanded = expandedTabs.has(tab.id);

                              return (
                                <div key={tab.id}>
                                  {/* Tab Header */}
                                  <div
                                    className="flex items-center gap-3 p-2 pl-10 bg-white dark:bg-slate-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b dark:border-slate-700"
                                    onClick={() => toggleTab(tab.id)}
                                  >
                                    <button className="p-1">
                                      {isTabExpanded ? (
                                        <ChevronDown className="w-3 h-3 text-slate-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-slate-400" />
                                      )}
                                    </button>

                                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                                      📑 {tab.label}
                                    </span>

                                    {/* Actions niveau onglet */}
                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                      {(
                                        ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT'] as PermissionAction[]
                                      ).map((action) =>
                                        renderActionCheckbox(
                                          action,
                                          module.id,
                                          tab.actions as PermissionAction[],
                                          tab.id
                                        )
                                      )}
                                    </div>
                                  </div>

                                  {/* Fields */}
                                  {isTabExpanded && (
                                    <div className="bg-slate-50/50 dark:bg-slate-900/30">
                                      {tab.fields.map((field) => (
                                        <div
                                          key={field.id}
                                          className="flex items-center gap-3 p-2 pl-16 border-b dark:border-slate-700/50 last:border-b-0"
                                        >
                                          <span
                                            className={`flex-1 text-xs ${field.sensitive ? 'text-amber-600 font-medium' : 'text-slate-600 dark:text-slate-400'}`}
                                          >
                                            {field.sensitive && '🔒 '}
                                            {field.label}
                                            <span className="text-slate-400 ml-2">({field.type})</span>
                                          </span>

                                          {/* Actions niveau champ */}
                                          <div className="flex gap-1">
                                            {(
                                              [
                                                'VIEW',
                                                'CREATE',
                                                'EDIT',
                                                'DELETE',
                                                'EXPORT',
                                                'IMPORT',
                                              ] as PermissionAction[]
                                            ).map((action) =>
                                              renderActionCheckbox(
                                                action,
                                                module.id,
                                                field.actions as PermissionAction[],
                                                tab.id,
                                                field.id
                                              )
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Shield className="w-16 h-16 text-slate-300 mb-4" />
            <p className="font-medium">Sélectionnez un rôle</p>
            <p className="text-sm">pour voir et modifier ses permissions</p>
          </div>
        )}
      </div>

      {/* Modal d'édition */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRole(null);
        }}
        title={
          editingRole?.id && roles.find((r) => r.id === editingRole.id)
            ? `Modifier ${editingRole.name}`
            : 'Nouveau Rôle'
        }
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              onClick={() => {
                setIsModalOpen(false);
                setEditingRole(null);
              }}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveRole}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </>
        }
      >
        {editingRole && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Nom du rôle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editingRole.name}
                onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-700"
                placeholder="Ex: Manager Commercial"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
              <textarea
                value={editingRole.description}
                onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-700"
                rows={2}
                placeholder="Description du rôle et ses responsabilités"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {['slate', 'red', 'orange', 'amber', 'green', 'cyan', 'blue', 'purple', 'rose'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={`Couleur ${color}`}
                    onClick={() => setEditingRole({ ...editingRole, color })}
                    className={`w-8 h-8 rounded-full ${getColorClass(color, 'dot')} ${
                      editingRole.color === color ? 'ring-2 ring-offset-2 ring-[var(--primary)]' : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="pt-4 border-t dark:border-slate-700">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <Smartphone className="w-4 h-4" />
                Onglets mobile (bottom nav)
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Choisissez jusqu'à 4 onglets affichés dans la barre de navigation mobile. Les autres menus seront
                accessibles via "Plus".
              </p>
              {(() => {
                const allItems = getSortedSidebarMenu().flatMap((g) => g.items);
                const selected = editingRole.mobileTabs || [];
                const toggleTab = (tabId: string) => {
                  const current = editingRole.mobileTabs || [];
                  if (current.includes(tabId)) {
                    setEditingRole({ ...editingRole, mobileTabs: current.filter((t) => t !== tabId) });
                  } else if (current.length < 4) {
                    setEditingRole({ ...editingRole, mobileTabs: [...current, tabId] });
                  }
                };
                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {allItems.map((item) => {
                        const Icon = MOBILE_ICON_MAP[item.icon] || LayoutDashboard;
                        const isSelected = selected.includes(item.id);
                        const order = selected.indexOf(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleTab(item.id)}
                            disabled={!isSelected && selected.length >= 4}
                            className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                              isSelected
                                ? 'border-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] ring-1 ring-[var(--primary)]'
                                : selected.length >= 4
                                  ? 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[var(--primary)] hover:bg-[var(--primary-dim)]/50 dark:hover:bg-[var(--primary-dim)]/10'
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center">
                                {order + 1}
                              </span>
                            )}
                            <Icon className="w-5 h-5" />
                            <span className="font-medium leading-tight text-center">
                              {item.mobileLabel || item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selected.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span>{selected.length}/4 sélectionnés :</span>
                        <span className="font-medium text-[var(--primary)] dark:text-[var(--primary)]">
                          {selected
                            .map(
                              (id) =>
                                allItems.find((i) => i.id === id)?.mobileLabel ||
                                allItems.find((i) => i.id === id)?.label ||
                                id
                            )
                            .join(' → ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingRole({ ...editingRole, mobileTabs: [] })}
                          className="ml-auto text-red-500 hover:text-red-700 font-medium"
                        >
                          Réinitialiser
                        </button>
                      </div>
                    )}
                    {selected.length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Aucun onglet sélectionné — la configuration par défaut sera utilisée.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="pt-4 border-t dark:border-slate-700">
              <div className="flex items-start gap-3 p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                <Info className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
                <div className="text-sm text-[var(--primary)] dark:text-[var(--primary)]">
                  <p className="font-medium mb-1">Configuration des permissions</p>
                  <p className="text-xs opacity-80">
                    Après avoir enregistré le rôle, utilisez la matrice de permissions à droite pour configurer les
                    accès aux modules, onglets et champs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialogComponent />
    </div>
  );
};

export default RoleManagerV2;
