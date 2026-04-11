/**
 * StaffPanelV2 - Gestion de l'Équipe Améliorée
 *
 * Fonctionnalités:
 * - Dashboard KPIs (total, actifs, par rôle)
 * - Tableau avec filtres, recherche, tri, pagination
 * - Formulaire complet (infos, rôle, permissions, sécurité)
 * - Drawer de détail utilisateur
 * - Statut en ligne/hors ligne, dernière connexion
 * - Invitation par email
 * - Gestion 2FA
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Save,
  Eye,
  X,
  Mail,
  Phone,
  Key,
  Lock,
  Unlock,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Settings,
  Activity,
  TrendingUp,
  UserCheck,
  UserX,
  Send,
  PenTool,
  Building2,
} from 'lucide-react';
import { Card } from '../../../../components/Card';
import { Pagination } from '../../../../components/Pagination';
import { Modal } from '../../../../components/Modal';
import { Drawer } from '../../../../components/Drawer';
import { SignaturePad } from '../../../../components/SignaturePad';
import type { SystemUser } from '../../../../types';
import { useDataContext } from '../../../../contexts/DataContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { TOAST } from '../../../../constants/toastMessages';
import { mapError } from '../../../../utils/errorMapper';
import { useTableSort } from '../../../../hooks/useTableSort';
import { SortableHeader } from '../../../../components/SortableHeader';
import { useConfirmDialog } from '../../../../components/ConfirmDialog';
import { RoleManagerV2 } from '../RoleManagerV2';
import { useCurrency } from '../../../../hooks/useCurrency';
import { api } from '../../../../services/apiLazy';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { MobileCard, MobileCardList } from '../../../../components/MobileCard';

// Types
interface StaffFilter {
  search: string;
  role: string;
  status: 'ALL' | 'Actif' | 'Inactif' | 'Suspendu';
  sortBy: 'name' | 'role' | 'lastLogin' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

interface UserFormData {
  name: string;
  email: string;
  phone?: string;
  password?: string; // Mot de passe pour la création
  role: string;
  status: string;
  avatar?: string;
  permissions: string[];
  allowedTenants?: string[]; // IDs des organisations auxquelles l'utilisateur a accès
  sendInvite?: boolean;
  require2FA?: boolean;
  signature?: string; // Signature du technicien (base64)

  // Champs d'identification RH
  matricule?: string; // Numéro matricule / Numéro employé
  cin?: string; // Carte d'identité nationale / CNI / CIN
  dateNaissance?: string; // Date de naissance
  lieuNaissance?: string; // Lieu de naissance
  nationalite?: string; // Nationalité
  sexe?: 'M' | 'F' | 'Autre'; // Sexe
  situationFamiliale?: 'Célibataire' | 'Marié(e)' | 'Divorcé(e)' | 'Veuf(ve)'; // Situation familiale
  adresse?: string; // Adresse complète
  ville?: string; // Ville
  codePostal?: string; // Code postal
  pays?: string; // Pays

  // Contrat de travail
  dateEmbauche?: string; // Date d'embauche
  typeContrat?: 'CDI' | 'CDD' | 'Stage' | 'Freelance' | 'Prestataire'; // Type de contrat
  departement?: string; // Département
  poste?: string; // Intitulé du poste
  manager?: string; // ID du manager
  salaire?: number; // Salaire (optionnel)

  // Contacts d'urgence
  contactUrgenceNom?: string; // Nom contact urgence
  contactUrgenceTel?: string; // Téléphone contact urgence
  contactUrgenceLien?: string; // Lien de parenté

  // Champs spécifiques Technicien
  specialite?: string;
  niveau?: 'Junior' | 'Confirmé' | 'Expert';
  zone?: string;
  societe?: string; // Si technicien externe

  // Champs spécifiques Commercial
  secteur?: string;
  region?: string;
  objectifMensuel?: string | number;
  commission?: string | number;

  // Champs spécifiques Support
  niveauSupport?: string;
  langues?: string;
  canaux?: string[];
  horaires?: string;

  // Champs spécifiques Manager
  equipe?: string;

  // Champs spécifiques Client
  clientId?: string;

  // Tenant propriétaire (obligatoire pour role CLIENT)
  tenantId?: string;
}

// Backend-enriched user fields not in SystemUser base type
type StaffUser = SystemUser & {
  plainPassword?: string;
  specialite?: string;
  niveau?: string;
  zone?: string;
  societe?: string;
};

// Map statique des classes Tailwind par couleur (évite le purge dynamique)
const COLOR_CLASSES: Record<
  string,
  {
    bg50: string;
    bg100: string;
    text600: string;
    text700: string;
    ring400: string;
    hoverBg100: string;
    darkBg: string;
    darkText: string;
  }
> = {
  purple: {
    bg50: 'bg-purple-50',
    bg100: 'bg-purple-100',
    text600: 'text-purple-600',
    text700: 'text-purple-700',
    ring400: 'ring-purple-400',
    hoverBg100: 'hover:bg-purple-100',
    darkBg: 'dark:bg-purple-900/30',
    darkText: 'dark:text-purple-400',
  },
  blue: {
    bg50: 'bg-[var(--primary-dim)]',
    bg100: 'bg-[var(--primary-dim)]',
    text600: 'text-[var(--primary)]',
    text700: 'text-[var(--primary)]',
    ring400: 'ring-[var(--primary-dim)]',
    hoverBg100: 'hover:bg-[var(--primary-dim)]',
    darkBg: 'dark:bg-[var(--primary-dim)]',
    darkText: 'dark:text-[var(--primary)]',
  },
  green: {
    bg50: 'bg-green-50',
    bg100: 'bg-green-100',
    text600: 'text-green-600',
    text700: 'text-green-700',
    ring400: 'ring-green-400',
    hoverBg100: 'hover:bg-green-100',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
  amber: {
    bg50: 'bg-amber-50',
    bg100: 'bg-amber-100',
    text600: 'text-amber-600',
    text700: 'text-amber-700',
    ring400: 'ring-amber-400',
    hoverBg100: 'hover:bg-amber-100',
    darkBg: 'dark:bg-amber-900/30',
    darkText: 'dark:text-amber-400',
  },
  orange: {
    bg50: 'bg-orange-50',
    bg100: 'bg-orange-100',
    text600: 'text-orange-600',
    text700: 'text-orange-700',
    ring400: 'ring-orange-400',
    hoverBg100: 'hover:bg-orange-100',
    darkBg: 'dark:bg-orange-900/30',
    darkText: 'dark:text-orange-400',
  },
  cyan: {
    bg50: 'bg-cyan-50',
    bg100: 'bg-cyan-100',
    text600: 'text-cyan-600',
    text700: 'text-cyan-700',
    ring400: 'ring-cyan-400',
    hoverBg100: 'hover:bg-cyan-100',
    darkBg: 'dark:bg-cyan-900/30',
    darkText: 'dark:text-cyan-400',
  },
  slate: {
    bg50: 'bg-slate-50',
    bg100: 'bg-slate-100',
    text600: 'text-[var(--text-secondary)]',
    text700: 'text-[var(--text-primary)]',
    ring400: 'ring-slate-400',
    hoverBg100: 'hover:bg-[var(--bg-elevated)]',
    darkBg: 'dark:bg-slate-900/30',
    darkText: 'dark:text-[var(--text-muted)]',
  },
  red: {
    bg50: 'bg-red-50',
    bg100: 'bg-red-100',
    text600: 'text-red-600',
    text700: 'text-red-700',
    ring400: 'ring-red-400',
    hoverBg100: 'hover:bg-red-100',
    darkBg: 'dark:bg-red-900/30',
    darkText: 'dark:text-red-400',
  },
};

const getColorClasses = (color: string) => COLOR_CLASSES[color] || COLOR_CLASSES.slate;

// Rôles disponibles — id = valeur système DB, label = affichage français
const AVAILABLE_ROLES = [
  { id: 'SUPERADMIN', label: 'Superadmin', color: 'purple', icon: Shield, system: true },
  { id: 'ADMIN', label: 'Administrateur', color: 'blue', icon: Settings },
  { id: 'MANAGER', label: 'Manager', color: 'green', icon: Users },
  { id: 'COMMERCIAL', label: 'Commercial', color: 'amber', icon: TrendingUp },
  { id: 'TECH', label: 'Technicien', color: 'orange', icon: Settings },
  { id: 'SUPPORT_AGENT', label: 'Support Client', color: 'cyan', icon: Mail },
  { id: 'AGENT_TRACKING', label: 'Agent Tracking', color: 'teal', icon: Users },
  { id: 'COMPTABLE', label: 'Comptable', color: 'emerald', icon: TrendingUp },
  { id: 'CLIENT', label: 'Client', color: 'slate', icon: UserCheck },
];

export const StaffPanelV2: React.FC = () => {
  const { users, tiers, addUser, updateUser, deleteUser } = useDataContext();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const { currency } = useCurrency();
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';

  // Tenants pour le sélecteur CLIENT (tous sauf tenant_default)
  const { data: tenantsList = [] } = useQuery<any[]>({
    queryKey: ['tenants'],
    queryFn: () => api.tenants.list(),
    staleTime: 5 * 60 * 1000,
  });
  const clientTenants = (tenantsList as any[]).filter((t: any) => t.id !== 'tenant_default');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Organisations (Resellers) pour les checkboxes
  const organizations = useMemo(() => (tiers || []).filter((t) => t.type === 'RESELLER'), [tiers]);

  // State
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  const [filters, setFilters] = useState<StaffFilter>({
    search: '',
    role: 'ALL',
    status: 'ALL',
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<SystemUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'CLIENT',
    status: 'Actif',
    permissions: ['VIEW_DASHBOARD'],
    sendInvite: true,
    require2FA: false,
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filtrage et tri
  // Rôles internes uniquement — les clients (CLIENT / CLIENT_ADMIN) ont leur propre panel
  const STAFF_ROLES = new Set([
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'TECH',
    'COMMERCIAL',
    'SUPPORT_AGENT',
    'AGENT_TRACKING',
    'COMPTABLE',
    'RESELLER_ADMIN',
  ]);

  const filteredUsers = useMemo(() => {
    let result = users.filter((u) => STAFF_ROLES.has((u.role || '').toUpperCase()));

    // Recherche
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter((u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));
    }

    // Filtre rôle
    if (filters.role !== 'ALL') {
      result = result.filter((u) => u.role === filters.role);
    }

    // Filtre statut
    if (filters.status !== 'ALL') {
      result = result.filter((u) => u.status === filters.status);
    }

    // Tri
    // (sorting handled by useTableSort below)

    return result;
  }, [users, filters]);

  const {
    sortedItems: sortedUsers,
    sortConfig: staffSortConfig,
    handleSort: handleStaffSort,
  } = useTableSort(filteredUsers, { key: 'name', direction: 'asc' });

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'Actif').length;
    const byRole = AVAILABLE_ROLES.map((r) => ({
      ...r,
      count: users.filter((u) => u.role === r.id).length,
    }));
    const recentLogins = users.filter((u) => {
      if (!u.lastLogin) return false;
      const lastLogin = new Date(u.lastLogin);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return lastLogin > dayAgo;
    }).length;

    return { total, active, byRole, recentLogins };
  }, [users]);

  // Handlers
  const handleCreateClick = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'CLIENT',
      status: 'Actif',
      permissions: ['VIEW_DASHBOARD'],
      allowedTenants: [],
      sendInvite: false, // Par défaut false car on demande le password
      require2FA: false,
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (user: SystemUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '', // Vide pour la modification (optionnel)
      role: user.role,
      status: user.status,
      permissions: user.permissions,
      allowedTenants: user.allowedTenants || [],
      require2FA: user.require2FA || false,
      signature: user.signature || '',

      // Identification RH
      matricule: user.matricule || '',
      cin: user.cin || '',
      dateNaissance: user.dateNaissance || '',
      lieuNaissance: user.lieuNaissance || '',
      nationalite: user.nationalite || '',
      sexe: user.sexe,
      situationFamiliale: user.situationFamiliale,
      adresse: user.adresse || '',
      ville: user.ville || '',
      codePostal: user.codePostal || '',
      pays: user.pays || "Côte d'Ivoire",

      // Contrat
      dateEmbauche: user.dateEmbauche || '',
      typeContrat: user.typeContrat,
      departement: user.departement || '',
      poste: user.poste || '',
      manager: user.manager || '',
      salaire: user.salaire,

      // Contact urgence
      contactUrgenceNom: user.contactUrgenceNom || '',
      contactUrgenceTel: user.contactUrgenceTel || '',
      contactUrgenceLien: user.contactUrgenceLien || '',
    });
    setIsModalOpen(true);
  };

  const handleViewDetails = (user: SystemUser) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!formData.email || !formData.name) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'error');
      return;
    }

    // Validation email basique
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showToast(TOAST.VALIDATION.INVALID_EMAIL, 'error');
      return;
    }

    // Validation du mot de passe à la création (sauf si invitation par email)
    if (!editingUser && !formData.sendInvite && (!formData.password || formData.password.length < 6)) {
      showToast(TOAST.VALIDATION.PASSWORD_TOO_SHORT, 'error');
      return;
    }

    // Validation téléphone (si rempli)
    if (formData.phone && !/^[\d\s+\-()]{6,20}$/.test(formData.phone)) {
      showToast(TOAST.VALIDATION.INVALID_PHONE, 'error');
      return;
    }

    // Validation tenant pour rôle CLIENT
    if (!editingUser && formData.role === 'CLIENT' && (!formData.tenantId || formData.tenantId === 'tenant_default')) {
      showToast('Veuillez sélectionner le tenant client (organisation) pour cet utilisateur.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        // Mise à jour
        const updateData: any = {
          ...editingUser,
          ...formData,
          updatedAt: new Date().toISOString(),
        };
        if (!formData.password) {
          delete updateData.password;
        }
        updateUser(updateData as SystemUser);
        showToast(TOAST.ADMIN.USER_UPDATED, 'success');
      } else {
        // Création — pas de id frontend, le backend le génère
        const newUser: any = {
          ...formData,
          avatar: `https://i.pravatar.cc/150?u=${formData.email}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          const effectiveTenantId =
            formData.role === 'CLIENT' && formData.tenantId
              ? formData.tenantId
              : currentUser?.tenantId || 'tenant_default';
          await api.users.create({ ...newUser, tenantId: effectiveTenantId });
          queryClient.invalidateQueries({ queryKey: ['users'] });
        } catch (err: unknown) {
          showToast(mapError(err, 'utilisateur'), 'error');
          return;
        }

        if (formData.sendInvite) {
          try {
            await api.users.sendInvite({ email: formData.email, name: formData.name, role: formData.role });
            showToast(TOAST.ADMIN.INVITATION_SENT(formData.email), 'success');
          } catch {
            showToast(TOAST.ADMIN.INVITATION_ERROR, 'error');
          }
        } else {
          showToast(TOAST.ADMIN.USER_CREATED, 'success');
        }
      }

      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const user = users.find((u) => u.id === id);

    // Prevent self-deletion
    if (user?.id === currentUser?.id) {
      showToast('Vous ne pouvez pas supprimer votre propre compte.', 'error');
      return;
    }

    // Prevent deleting the last SUPERADMIN
    if (user?.role === 'SUPERADMIN') {
      const superadminCount = users.filter((u) => u.role === 'SUPERADMIN').length;
      if (superadminCount <= 1) {
        showToast('Impossible de supprimer le dernier superadmin.', 'error');
        return;
      }
      showToast(TOAST.ADMIN.USER_NO_DELETE_SUPERADMIN, 'error');
      return;
    }

    if (
      await confirm({
        message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?',
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      })
    ) {
      deleteUser(id);
      showToast(TOAST.ADMIN.USER_DELETED, 'info');
    }
  };

  const handleStatusChange = (user: SystemUser, newStatus: 'Actif' | 'Inactif') => {
    updateUser({ ...user, status: newStatus, updatedAt: new Date().toISOString() });
    showToast(newStatus === 'Actif' ? TOAST.ADMIN.USER_ACTIVATED : TOAST.ADMIN.USER_DEACTIVATED, 'success');
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    try {
      await api.users.sendInvite({ email: inviteEmail });
      showToast(TOAST.ADMIN.INVITATION_SENT(inviteEmail), 'success');
    } catch {
      showToast(TOAST.ADMIN.INVITATION_ERROR, 'error');
    }
    setInviteEmail('');
    setIsInviteModalOpen(false);
  };

  const handleResetPassword = (user: SystemUser) => {
    setIsDrawerOpen(false);
    setResetPasswordUser(user);
    setNewPasswordInput('');
    setShowNewPassword(false);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordUser) return;
    try {
      const result = await api.users.resetPassword(resetPasswordUser.id, newPasswordInput || undefined);
      if (result.generatedPassword) {
        showToast(TOAST.ADMIN.PASSWORD_GENERATED(resetPasswordUser.email), 'success');
      } else {
        showToast(TOAST.AUTH.PASSWORD_RESET(resetPasswordUser.email), 'success');
      }
      // Refresh users to get updated plain_password
      setResetPasswordUser(null);
    } catch {
      showToast(TOAST.ADMIN.PASSWORD_RESET_ERROR, 'error');
    }
  };

  const getRoleConfig = (roleId: string) => {
    return AVAILABLE_ROLES.find((r) => r.id === roleId) || AVAILABLE_ROLES[AVAILABLE_ROLES.length - 1];
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
      Actif: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle },
      Inactif: { bg: 'bg-[var(--bg-elevated)]', text: 'text-[var(--text-secondary)]', icon: XCircle },
      Suspendu: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: AlertTriangle },
    };
    const c = config[status] || config['Inactif'];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
        <c.icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const formatLastLogin = (date?: string) => {
    if (!date) return 'Jamais connecté';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 60 * 1000) return "À l'instant";
    if (diff < 60 * 60 * 1000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 24 * 60 * 60 * 1000) return `Il y a ${Math.floor(diff / 3600000)} h`;
    return d.toLocaleDateString('fr-FR');
  };

  const isMobile = useIsMobile();

  // Protection: Vérifier que le contexte est chargé (après tous les hooks)
  if (!updateUser || !addUser || !deleteUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-[var(--border)] shrink-0">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Users className="w-4 h-4" />
          Utilisateurs
          <span className="px-2 py-0.5 bg-[var(--bg-elevated)] rounded-full text-xs">{users.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Shield className="w-4 h-4" />
          Rôles & Permissions
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* KPI Cards - Hidden on mobile */}
          <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            <Card className="bg-[var(--bg-elevated)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Total Équipe</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                </div>
                <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                  <Users className="w-6 h-6 text-[var(--primary)]" />
                </div>
              </div>
            </Card>

            <Card className="bg-[var(--bg-elevated)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Actifs</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(0) : 0}% du total
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="bg-[var(--bg-elevated)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Connectés (24h)</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.recentLogins}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>

            <Card className="bg-[var(--bg-elevated)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Inactifs</p>
                  <p className="text-2xl font-bold text-[var(--text-secondary)]">{stats.total - stats.active}</p>
                </div>
                <div className="p-3 bg-[var(--bg-elevated)] rounded-lg">
                  <UserX className="w-6 h-6 text-[var(--text-secondary)]" />
                </div>
              </div>
            </Card>
          </div>

          {/* Répartition par rôle */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {stats.byRole
              .filter((r) => r.count > 0)
              .map((role) => (
                <button
                  key={role.id}
                  onClick={() => setFilters({ ...filters, role: filters.role === role.id ? 'ALL' : role.id })}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${(() => {
                    const cc = getColorClasses(role.color);
                    return filters.role === role.id
                      ? `${cc.bg100} ${cc.text700} ring-2 ${cc.ring400}`
                      : `${cc.bg50} ${cc.text600} ${cc.hoverBg100}`;
                  })()}`}
                >
                  <role.icon className="w-3 h-3" />
                  {role.label}: {role.count}
                </button>
              ))}
          </div>

          {/* Filters & Actions */}
          <Card className="shrink-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4">
              <div className="flex flex-wrap gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-[var(--bg-elevated)] border-[var(--border)]"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as StaffFilter['status'] })}
                  className="px-3 py-2 border rounded-lg text-sm bg-[var(--bg-elevated)] border-[var(--border)]"
                  title="Filtrer par statut"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="Actif">Actifs</option>
                  <option value="Inactif">Inactifs</option>
                  <option value="Suspendu">Suspendus</option>
                </select>

                {/* Sort */}
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-') as [
                      typeof filters.sortBy,
                      typeof filters.sortOrder,
                    ];
                    setFilters({ ...filters, sortBy, sortOrder });
                  }}
                  className="px-3 py-2 border rounded-lg text-sm bg-[var(--bg-elevated)] border-[var(--border)]"
                  title="Trier par"
                >
                  <option value="name-asc">Nom A-Z</option>
                  <option value="name-desc">Nom Z-A</option>
                  <option value="role-asc">Rôle A-Z</option>
                  <option value="lastLogin-desc">Dernière connexion</option>
                  <option value="createdAt-desc">Plus récent</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded-lg text-sm font-medium tr-hover"
                >
                  <Send className="w-4 h-4" />
                  Inviter
                </button>
                <button
                  onClick={handleCreateClick}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-sm font-bold rounded-lg hover:bg-[var(--primary-light)]"
                >
                  <Plus className="w-4 h-4" />
                  Nouvel Utilisateur
                </button>
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            {isMobile ? (
              <MobileCardList bordered={false}>
                {paginatedUsers.length === 0 ? (
                  <div className="px-6 py-12 text-center text-[var(--text-secondary)]">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="font-medium">Aucun utilisateur trouvé</p>
                  </div>
                ) : (
                  paginatedUsers.map((user) => {
                    const roleConfig = getRoleConfig(user.role);
                    return (
                      <MobileCard
                        key={user.id}
                        onClick={() => handleViewDetails(user)}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-[var(--border)]"
                            />
                            {user.status === 'Actif' && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white border-[var(--border)] rounded-full" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--text-primary)] text-sm truncate">{user.name}</p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">{user.email}</p>
                            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${getColorClasses(roleConfig.color).bg100} ${getColorClasses(roleConfig.color).text700}`}
                              >
                                <roleConfig.icon className="w-2.5 h-2.5" />
                                {roleConfig.label}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {formatLastLogin(user.lastLogin)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {getStatusBadge(user.status)}
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </MobileCard>
                    );
                  })
                )}
              </MobileCardList>
            ) : (
              <div className="flex-1 overflow-auto pb-16 lg:pb-0">
                <table className="w-full text-left">
                  <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] sticky top-0 z-10">
                    <tr>
                      <SortableHeader
                        label="Utilisateur"
                        sortKey="name"
                        currentSortKey={staffSortConfig.key}
                        currentDirection={staffSortConfig.direction}
                        onSort={handleStaffSort}
                        className="section-title"
                      />
                      <SortableHeader
                        label="Rôle"
                        sortKey="role"
                        currentSortKey={staffSortConfig.key}
                        currentDirection={staffSortConfig.direction}
                        onSort={handleStaffSort}
                        className="section-title"
                      />
                      <SortableHeader
                        label="Dernière Connexion"
                        sortKey="lastLogin"
                        currentSortKey={staffSortConfig.key}
                        currentDirection={staffSortConfig.direction}
                        onSort={handleStaffSort}
                        className="section-title"
                      />
                      <SortableHeader
                        label="Statut"
                        sortKey="status"
                        currentSortKey={staffSortConfig.key}
                        currentDirection={staffSortConfig.direction}
                        onSort={handleStaffSort}
                        className="section-title"
                      />
                      {isSuperAdmin && (
                        <th className="px-6 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase">
                          Mot de passe
                        </th>
                      )}
                      <th className="px-6 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isSuperAdmin ? 7 : 6}
                          className="px-6 py-12 text-center text-[var(--text-secondary)]"
                        >
                          <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                          <p className="font-medium">Aucun utilisateur trouvé</p>
                          <p className="text-sm">Modifiez vos filtres ou créez un nouvel utilisateur</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => {
                        const roleConfig = getRoleConfig(user.role);
                        return (
                          <tr
                            key={user.id}
                            className="tr-hover/50 cursor-pointer"
                            onClick={() => handleViewDetails(user)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-[var(--border)]"
                                  />
                                  {user.status === 'Actif' && (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white border-[var(--border)] rounded-full"></span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-[var(--text-primary)]">{user.name}</p>
                                  <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getColorClasses(roleConfig.color).bg100} ${getColorClasses(roleConfig.color).text700} ${getColorClasses(roleConfig.color).darkBg} ${getColorClasses(roleConfig.color).darkText}`}
                              >
                                <roleConfig.icon className="w-3 h-3" />
                                {roleConfig.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                <Clock className="w-4 h-4" />
                                {formatLastLogin(user.lastLogin)}
                              </div>
                            </td>
                            <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                            {isSuperAdmin && (
                              <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  {(user as StaffUser).plainPassword ? (
                                    <>
                                      <code className="text-xs font-mono bg-[var(--bg-elevated)] px-2 py-1 rounded select-all">
                                        {visiblePasswords[user.id] ? (user as StaffUser).plainPassword : '••••••••'}
                                      </code>
                                      <button
                                        onClick={() =>
                                          setVisiblePasswords((prev) => ({ ...prev, [user.id]: !prev[user.id] }))
                                        }
                                        className="p-1 text-[var(--text-muted)] hover:text-[var(--primary)] rounded"
                                        title={visiblePasswords[user.id] ? 'Masquer' : 'Afficher'}
                                      >
                                        {visiblePasswords[user.id] ? (
                                          <XCircle className="w-3.5 h-3.5" />
                                        ) : (
                                          <Eye className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText((user as StaffUser).plainPassword);
                                          showToast(TOAST.CLIPBOARD.PASSWORD_COPIED, 'success');
                                        }}
                                        className="p-1 text-[var(--text-muted)] hover:text-[var(--primary)] rounded"
                                        title="Copier"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-xs text-[var(--text-muted)] italic">Non disponible</span>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEditClick(user)}
                                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20 rounded"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleResetPassword(user)}
                                  className="p-1.5 text-[var(--text-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded"
                                  title="Réinitialiser mot de passe"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                {user.role !== 'SUPERADMIN' && (
                                  <button
                                    onClick={() =>
                                      handleStatusChange(user, user.status === 'Actif' ? 'Inactif' : 'Actif')
                                    }
                                    className={`p-1.5 rounded ${
                                      user.status === 'Actif'
                                        ? 'text-[var(--text-muted)] hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                        : 'text-[var(--text-muted)] hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                    }`}
                                    title={user.status === 'Actif' ? 'Désactiver' : 'Activer'}
                                  >
                                    {user.status === 'Actif' ? (
                                      <Lock className="w-4 h-4" />
                                    ) : (
                                      <Unlock className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                                {user.role !== 'SUPERADMIN' && (
                                  <button
                                    onClick={() => handleDelete(user.id)}
                                    className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
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
              totalItems={sortedUsers.length}
              itemLabel="utilisateur"
              className="px-6 py-3 border-t border-[var(--border)] shrink-0"
            />
          </Card>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <RoleManagerV2 />
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Modifier ${editingUser.name}` : 'Nouvel Utilisateur'}
        maxWidth="max-w-lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-[var(--text-muted)]">
              <span className="text-red-500">*</span> Champs obligatoires
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--bg-elevated)]"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--primary-light)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Enregistrement...' : editingUser ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          {/* Infos de base */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                Nom Complet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)] ${!formData.name ? 'border-red-300' : ''}`}
                placeholder="Prénom Nom"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)] ${!formData.email ? 'border-red-300' : formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-red-500' : ''}`}
                placeholder="email@entreprise.com"
                required
              />
              {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                <p className="text-xs text-red-500 mt-1">Format email invalide</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)] ${formData.phone && !/^[\d\s+\-()]{6,20}$/.test(formData.phone) ? 'border-red-500' : ''}`}
                placeholder="+225 07 00 00 00 00"
              />
              {formData.phone && !/^[\d\s+\-()]{6,20}$/.test(formData.phone) && (
                <p className="text-xs text-red-500 mt-1">Format invalide (chiffres, +, -, espaces)</p>
              )}
            </div>

            {/* Mot de passe - Toujours visible, obligatoire à la création si pas d'invitation */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                Mot de passe {!editingUser && !formData.sendInvite && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                placeholder={editingUser ? 'Laisser vide pour ne pas modifier' : 'Minimum 6 caractères'}
              />
              {editingUser && (
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Laisser vide pour conserver le mot de passe actuel
                </p>
              )}
            </div>
          </div>

          {/* Identification RH */}
          <div className="pt-4 border-t border-[var(--border)] space-y-4">
            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
              <Users className="w-4 h-4" />
              Identification RH
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Matricule</label>
                <input
                  type="text"
                  value={formData.matricule || ''}
                  onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="EMP-001"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">CIN / CNI</label>
                <input
                  type="text"
                  value={formData.cin || ''}
                  onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="Numéro pièce d'identité"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={formData.dateNaissance || ''}
                  onChange={(e) => setFormData({ ...formData, dateNaissance: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Lieu de naissance
                </label>
                <input
                  type="text"
                  value={formData.lieuNaissance || ''}
                  onChange={(e) => setFormData({ ...formData, lieuNaissance: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="Ville, Pays"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Nationalité
                </label>
                <select
                  value={formData.nationalite || ''}
                  onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Ivoirienne">🇨🇮 Ivoirienne</option>
                  <option value="Sénégalaise">🇸🇳 Sénégalaise</option>
                  <option value="Malienne">🇲🇱 Malienne</option>
                  <option value="Burkinabé">🇧🇫 Burkinabé</option>
                  <option value="Béninoise">🇧🇯 Béninoise</option>
                  <option value="Togolaise">🇹🇬 Togolaise</option>
                  <option value="Ghanéenne">🇬🇭 Ghanéenne</option>
                  <option value="Nigériane">🇳🇬 Nigériana</option>
                  <option value="Française">🇫🇷 Française</option>
                  <option value="Autre">🌍 Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Sexe</label>
                <select
                  value={formData.sexe || ''}
                  onChange={(e) => setFormData({ ...formData, sexe: e.target.value as UserFormData['sexe'] })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                >
                  <option value="">Sélectionner...</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Situation familiale
                </label>
                <select
                  value={formData.situationFamiliale || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      situationFamiliale: e.target.value as UserFormData['situationFamiliale'],
                    })
                  }
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Célibataire">Célibataire</option>
                  <option value="Marié(e)">Marié(e)</option>
                  <option value="Divorcé(e)">Divorcé(e)</option>
                  <option value="Veuf(ve)">Veuf(ve)</option>
                </select>
              </div>
            </div>

            {/* Adresse */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Adresse complète
                </label>
                <input
                  type="text"
                  value={formData.adresse || ''}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="Numéro, rue, quartier"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Ville</label>
                <input
                  type="text"
                  value={formData.ville || ''}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="Abidjan, Dakar..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Code postal
                </label>
                <input
                  type="text"
                  value={formData.codePostal || ''}
                  onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="BP 01"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Pays</label>
                <select
                  value={formData.pays || "Côte d'Ivoire"}
                  onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                >
                  <option value="Côte d'Ivoire">🇨🇮 Côte d'Ivoire</option>
                  <option value="Sénégal">🇸🇳 Sénégal</option>
                  <option value="Mali">🇲🇱 Mali</option>
                  <option value="Burkina Faso">🇧🇫 Burkina Faso</option>
                  <option value="Bénin">🇧🇯 Bénin</option>
                  <option value="Togo">🇹🇬 Togo</option>
                  <option value="Ghana">🇬🇭 Ghana</option>
                  <option value="Nigeria">🇳🇬 Nigeria</option>
                  <option value="France">🇫🇷 France</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contrat de travail */}
          <div className="pt-4 border-t border-[var(--border)] space-y-4">
            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Contrat de Travail
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Date d'embauche
                </label>
                <input
                  type="date"
                  value={formData.dateEmbauche || ''}
                  onChange={(e) => setFormData({ ...formData, dateEmbauche: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Type de contrat
                </label>
                <select
                  value={formData.typeContrat || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, typeContrat: e.target.value as UserFormData['typeContrat'] })
                  }
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                >
                  <option value="">Sélectionner...</option>
                  <option value="CDI">CDI - Contrat à Durée Indéterminée</option>
                  <option value="CDD">CDD - Contrat à Durée Déterminée</option>
                  <option value="Stage">Stage</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Prestataire">Prestataire</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Département
                </label>
                <input
                  type="text"
                  value={formData.departement || ''}
                  onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="Technique, Commercial, Support..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Intitulé du poste
                </label>
                <input
                  type="text"
                  value={formData.poste || ''}
                  onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="Technicien GPS Senior, Chef de projet..."
                />
              </div>
            </div>
          </div>

          {/* Contact d'urgence */}
          <div className="pt-4 border-t border-[var(--border)] space-y-4">
            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact d'Urgence
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Nom & Prénom
                </label>
                <input
                  type="text"
                  value={formData.contactUrgenceNom || ''}
                  onChange={(e) => setFormData({ ...formData, contactUrgenceNom: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="Personne à contacter"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={formData.contactUrgenceTel || ''}
                  onChange={(e) => setFormData({ ...formData, contactUrgenceTel: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="+225 XX XX XX XX"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Lien de parenté
                </label>
                <select
                  value={formData.contactUrgenceLien || ''}
                  onChange={(e) => setFormData({ ...formData, contactUrgenceLien: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Conjoint(e)">Conjoint(e)</option>
                  <option value="Parent">Parent</option>
                  <option value="Enfant">Enfant</option>
                  <option value="Frère/Sœur">Frère/Sœur</option>
                  <option value="Ami(e)">Ami(e)</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rôle & Statut */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Rôle</label>
              {editingUser?.role === 'SUPERADMIN' ? (
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2 text-purple-700 text-sm">
                  <Shield className="w-4 h-4" />
                  Superadmin (protégé)
                </div>
              ) : (
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  title="Rôle de l'utilisateur"
                >
                  {AVAILABLE_ROLES.filter((r) => !r.system).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Statut</label>
              {editingUser ? (
                <div
                  className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                    formData.status === 'Actif'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : formData.status === 'Suspendu'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-slate-100 text-[var(--text-secondary)] border border-[var(--border)]'
                  }`}
                >
                  {formData.status === 'Actif' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {formData.status}
                  <span className="text-xs text-[var(--text-secondary)] ml-auto">(via Actions)</span>
                </div>
              ) : (
                <div className="p-2 bg-green-50 text-green-700 border border-green-200 rounded-lg flex items-center gap-2 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Actif par défaut
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-4 border-t border-[var(--border)]">
            {!editingUser && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sendInvite}
                  onChange={(e) => setFormData({ ...formData, sendInvite: e.target.checked })}
                  className="rounded border-[var(--border)] text-[var(--primary)]"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Envoyer une invitation par email</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    L'utilisateur recevra un lien pour définir son mot de passe
                  </p>
                </div>
              </label>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.require2FA}
                onChange={(e) => setFormData({ ...formData, require2FA: e.target.checked })}
                className="rounded border-[var(--border)] text-[var(--primary)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Exiger l'authentification à deux facteurs
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  L'utilisateur devra configurer 2FA à sa prochaine connexion
                </p>
              </div>
            </label>
          </div>

          {/* Organisations / Accès Multi-Tenant */}
          {organizations.length > 0 && (
            <div className="pt-4 border-t border-[var(--border)] space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organisations Accessibles
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Sélectionnez les organisations auxquelles cet utilisateur aura accès. Si aucune n'est sélectionnée, il
                aura accès à toutes les organisations.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-[var(--bg-elevated)] rounded-lg">
                {organizations.map((org) => (
                  <label
                    key={org.id}
                    className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white dark:hover:bg-slate-700 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowedTenants?.includes(org.tenantId) || false}
                      onChange={(e) => {
                        const tenantId = org.tenantId;
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            allowedTenants: [...(formData.allowedTenants || []), tenantId],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            allowedTenants: (formData.allowedTenants || []).filter((id) => id !== tenantId),
                          });
                        }
                      }}
                      className="rounded border-[var(--border)] text-[var(--primary)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">{org.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sélecteur tenant — obligatoire pour rôle CLIENT */}
          {formData.role === 'CLIENT' && !editingUser && (
            <div className="pt-4 border-t border-[var(--border)] space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organisation Client <span className="text-red-500">*</span>
              </h4>
              <select
                value={formData.tenantId || ''}
                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                className={`w-full px-3 py-2.5 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)] ${!formData.tenantId ? 'border-red-300' : 'border-[var(--border)]'}`}
                title="Organisation à laquelle appartient cet utilisateur client"
              >
                <option value="">Sélectionner l'organisation...</option>
                {clientTenants.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-secondary)]">
                L'utilisateur CLIENT doit être rattaché à une organisation spécifique (pas le tenant par défaut).
              </p>
            </div>
          )}

          {/* Champs spécifiques Technicien */}
          {formData.role === 'TECH' && (
            <>
              <div className="pt-4 border-t border-[var(--border)] space-y-4">
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Informations Technicien
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                      Spécialité *
                    </label>
                    <select
                      value={formData.specialite || ''}
                      onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                      title="Spécialité du technicien"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="Installation GPS">Installation GPS</option>
                      <option value="Électricien Auto">Électricien Auto</option>
                      <option value="Mécanicien">Mécanicien</option>
                      <option value="Électronique">Électronique</option>
                      <option value="Câblage">Câblage</option>
                      <option value="Diagnostic">Diagnostic</option>
                      <option value="Polyvalent">Polyvalent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                      Niveau
                    </label>
                    <select
                      value={formData.niveau || 'Confirmé'}
                      onChange={(e) => setFormData({ ...formData, niveau: e.target.value as UserFormData['niveau'] })}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                      title="Niveau de certification"
                    >
                      <option value="Junior">🟢 Junior</option>
                      <option value="Confirmé">🟡 Confirmé</option>
                      <option value="Expert">🔴 Expert</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                      Zone d'intervention
                    </label>
                    <input
                      type="text"
                      value={formData.zone || ''}
                      onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                      placeholder="Ex: Abidjan, Dakar, National..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                      Société (si externe)
                    </label>
                    <input
                      type="text"
                      value={formData.societe || ''}
                      onChange={(e) => setFormData({ ...formData, societe: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                      placeholder="Nom du prestataire"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">Laisser vide si technicien interne</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Signature — visible pour tous les rôles */}
          <div className="pt-4 border-t border-[var(--border)]">
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2 flex items-center gap-2">
              <PenTool className="w-4 h-4" />
              Signature
            </label>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Cette signature sera automatiquement utilisée sur les documents et rapports.
            </p>
            {formData.signature ? (
              <div className="space-y-2">
                <div className="p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
                  <img src={formData.signature} alt="Signature" className="max-h-24 mx-auto" />
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, signature: '' })}
                  className="w-full px-3 py-2 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50"
                >
                  Effacer la signature
                </button>
              </div>
            ) : (
              <SignaturePad onSave={(sig) => setFormData({ ...formData, signature: sig })} />
            )}
          </div>

          {/* Section Commercial */}
          {formData.role === 'COMMERCIAL' && (
            <div className="pt-4 border-t border-[var(--border)] space-y-4">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Informations Commercial
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Secteur</label>
                  <select
                    value={formData.secteur || ''}
                    onChange={(e) => setFormData({ ...formData, secteur: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Secteur commercial"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Transport & Logistique">Transport & Logistique</option>
                    <option value="BTP & Construction">BTP & Construction</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Distribution">Distribution</option>
                    <option value="Mines & Énergie">Mines & Énergie</option>
                    <option value="Tous secteurs">Tous secteurs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Région</label>
                  <input
                    type="text"
                    value={formData.region || ''}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    placeholder="Ex: Abidjan Nord, Dakar, National..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Objectif mensuel ({currency})
                  </label>
                  <input
                    type="number"
                    value={formData.objectifMensuel || ''}
                    onChange={(e) => setFormData({ ...formData, objectifMensuel: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    placeholder="5000000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Commission (%)
                  </label>
                  <input
                    type="number"
                    value={formData.commission || ''}
                    onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    placeholder="5"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section Support Client */}
          {formData.role === 'SUPPORT_AGENT' && (
            <div className="pt-4 border-t border-[var(--border)] space-y-4">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Informations Support
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Niveau support
                  </label>
                  <select
                    value={formData.niveauSupport || ''}
                    onChange={(e) => setFormData({ ...formData, niveauSupport: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Niveau de support"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="N1">🟢 Niveau 1 - Front-line</option>
                    <option value="N2">🟡 Niveau 2 - Technique</option>
                    <option value="N3">🔴 Niveau 3 - Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Langues</label>
                  <input
                    type="text"
                    value={formData.langues || ''}
                    onChange={(e) => setFormData({ ...formData, langues: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    placeholder="Français, Anglais, Arabe..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Canaux</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['Téléphone', 'Email', 'Chat', 'WhatsApp'].map((canal) => (
                      <label
                        key={canal}
                        className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-elevated)] rounded cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={(formData.canaux || []).includes(canal)}
                          onChange={(e) => {
                            const current = formData.canaux || [];
                            const updated = e.target.checked
                              ? [...current, canal]
                              : current.filter((c: string) => c !== canal);
                            setFormData({ ...formData, canaux: updated });
                          }}
                          className="rounded border-[var(--border)] text-[var(--primary)]"
                        />
                        {canal}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Horaires
                  </label>
                  <select
                    value={formData.horaires || ''}
                    onChange={(e) => setFormData({ ...formData, horaires: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Horaires de travail"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="8h-17h">8h - 17h</option>
                    <option value="9h-18h">9h - 18h</option>
                    <option value="14h-22h">14h - 22h (soir)</option>
                    <option value="22h-6h">22h - 6h (nuit)</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section Manager */}
          {formData.role === 'MANAGER' && (
            <div className="pt-4 border-t border-[var(--border)] space-y-4">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                <Users className="w-4 h-4" />
                Informations Manager
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Département
                  </label>
                  <select
                    value={formData.departement || ''}
                    onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Département géré"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Technique">Technique</option>
                    <option value="Support">Support Client</option>
                    <option value="Operations">Opérations</option>
                    <option value="Finance">Finance</option>
                    <option value="RH">Ressources Humaines</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Équipe</label>
                  <input
                    type="text"
                    value={formData.equipe || ''}
                    onChange={(e) => setFormData({ ...formData, equipe: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    placeholder="Nom de l'équipe gérée"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Inviter un utilisateur"
        maxWidth="max-w-md"
        footer={
          <>
            <button onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 border rounded-lg text-sm">
              Annuler
            </button>
            <button
              onClick={handleSendInvite}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Envoyer l'invitation
            </button>
          </>
        }
      >
        <div className="p-4">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Entrez l'adresse email de la personne à inviter. Elle recevra un lien pour créer son compte.
          </p>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
              placeholder="email@entreprise.com"
            />
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        title="Réinitialiser le mot de passe"
        maxWidth="max-w-md"
        footer={
          <>
            <button onClick={() => setResetPasswordUser(null)} className="px-4 py-2 border rounded-lg text-sm">
              Annuler
            </button>
            <button
              onClick={handleConfirmResetPassword}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              {newPasswordInput ? 'Définir ce mot de passe' : 'Générer un mot de passe'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Réinitialiser le mot de passe de <strong>{resetPasswordUser?.name}</strong> ({resetPasswordUser?.email})
          </p>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full p-2 pr-10 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                placeholder="Laisser vide pour générer automatiquement"
                minLength={4}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                {showNewPassword ? <XCircle className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {newPasswordInput
                ? `Le mot de passe "${newPasswordInput}" sera défini directement.`
                : 'Un mot de passe aléatoire sera généré et affiché.'}
            </p>
          </div>
        </div>
      </Modal>

      {/* User Detail Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} width="max-w-md">
        {selectedUser && (
          <UserDetailContent
            user={selectedUser}
            onClose={() => setIsDrawerOpen(false)}
            onEdit={() => {
              setIsDrawerOpen(false);
              handleEditClick(selectedUser);
            }}
            onResetPassword={() => handleResetPassword(selectedUser)}
            onStatusChange={(status) => handleStatusChange(selectedUser, status)}
            formatLastLogin={formatLastLogin}
            getRoleConfig={getRoleConfig}
            getStatusBadge={getStatusBadge}
          />
        )}
      </Drawer>
      <ConfirmDialogComponent />
    </div>
  );
};

// User Detail Component
interface UserDetailContentProps {
  user: SystemUser;
  onClose: () => void;
  onEdit: () => void;
  onResetPassword: () => void;
  onStatusChange: (status: 'Actif' | 'Inactif') => void;
  formatLastLogin: (date?: string) => string;
  getRoleConfig: (roleId: string) => (typeof AVAILABLE_ROLES)[0];
  getStatusBadge: (status: string) => React.ReactNode;
}

const UserDetailContent: React.FC<UserDetailContentProps> = ({
  user,
  onClose,
  onEdit,
  onResetPassword,
  onStatusChange,
  formatLastLogin,
  getRoleConfig,
  getStatusBadge,
}) => {
  const roleConfig = getRoleConfig(user.role);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <h3 className="font-bold text-lg text-[var(--text-primary)]">Détails Utilisateur</h3>
        <button onClick={onClose} className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Avatar & Name */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-[var(--border)]"
            />
            {user.status === 'Actif' && (
              <span className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
            )}
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-4">{user.name}</h2>
          <p className="text-[var(--text-secondary)]">{user.email}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${getColorClasses(roleConfig.color).bg100} ${getColorClasses(roleConfig.color).text700}`}
            >
              <roleConfig.icon className="w-4 h-4" />
              {roleConfig.label}
            </span>
            {getStatusBadge(user.status)}
          </div>
        </div>

        {/* Infos */}
        <div className="space-y-4">
          <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
            <h4 className="font-bold text-sm text-[var(--text-primary)] mb-3">Informations</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[var(--text-muted)]" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Dernière connexion: {formatLastLogin(user.lastLogin)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Créé le: {new Date(user.createdAt || Date.now()).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
            <h4 className="font-bold text-sm text-[var(--text-primary)] mb-3">Sécurité</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Authentification 2FA</span>
                {user.require2FA ? (
                  <span className="text-green-600 font-medium">Activée</span>
                ) : (
                  <span className="text-[var(--text-muted)]">Non configurée</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Permissions</span>
                <span className="font-medium">{user.permissions?.length || 0} droits</span>
              </div>
            </div>
          </div>

          {/* Section Technicien */}
          {user.role === 'TECH' && (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <h4 className="font-bold text-sm text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Profil Technicien
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Spécialité</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {(user as StaffUser).specialite || 'Non définie'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Niveau</span>
                  <span
                    className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                      (user as StaffUser).niveau === 'Expert'
                        ? 'bg-purple-100 text-purple-700'
                        : (user as StaffUser).niveau === 'Confirmé'
                          ? 'bg-[var(--primary-dim)] text-[var(--primary)]'
                          : 'bg-slate-100 text-[var(--text-primary)]'
                    }`}
                  >
                    {(user as StaffUser).niveau || 'Junior'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Zone d'intervention</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {(user as StaffUser).zone || 'Toutes zones'}
                  </span>
                </div>
                {(user as StaffUser).societe && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Société prestataire</span>
                    <span className="font-medium text-[var(--text-primary)]">{(user as StaffUser).societe}</span>
                  </div>
                )}
                {user.signature && (
                  <div className="pt-2 border-t border-orange-200 dark:border-orange-700">
                    <span className="text-[var(--text-secondary)] block mb-2">Signature</span>
                    <img src={user.signature} alt="Signature" className="max-h-16 bg-white rounded p-1" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[var(--border)] space-y-2">
        <button
          onClick={onEdit}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-light)]"
        >
          <Edit2 className="w-4 h-4" />
          Modifier
        </button>
        <button
          onClick={onResetPassword}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg font-medium tr-hover"
        >
          <Key className="w-4 h-4" />
          Réinitialiser le mot de passe
        </button>
        {user.status === 'Actif' ? (
          <button
            onClick={() => onStatusChange('Inactif')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium"
          >
            <Lock className="w-4 h-4" />
            Suspendre le compte
          </button>
        ) : (
          <button
            onClick={() => onStatusChange('Actif')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg font-medium"
          >
            <Unlock className="w-4 h-4" />
            Réactiver le compte
          </button>
        )}
      </div>
    </div>
  );
};

export default StaffPanelV2;
