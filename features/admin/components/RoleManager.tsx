import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Check, X, Plus, Edit2, Trash2, Save, Lock } from 'lucide-react';
import type { Role, Permission } from '../../../types';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../contexts/ToastContext';
import { api } from '../../../services/apiLazy';
import { useConfirmDialog } from '../../../components/ConfirmDialog';

// --- PERMISSION STRUCTURE ---
const PERMISSION_STRUCTURE = [
  {
    id: 'general',
    label: 'Accès Général',
    isBoolean: true, // Just a checkbox, not CRUD
    permissions: [
      { id: 'VIEW_DASHBOARD', label: 'Voir le Tableau de Bord' },
      { id: 'VIEW_MAP', label: 'Voir la Carte' },
      { id: 'VIEW_REPORTS', label: 'Voir les Rapports' },
      { id: 'VIEW_LOGS', label: 'Voir les Logs Système' },
    ],
  },
  {
    id: 'fleet',
    label: 'Flotte',
    resources: [
      { id: 'VEHICLES', label: 'Véhicules' },
      { id: 'DRIVERS', label: 'Chauffeurs' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM & Ventes',
    resources: [
      { id: 'LEADS', label: 'Pistes (Leads)' },
      { id: 'CLIENTS', label: 'Clients' },
      { id: 'CONTRACTS', label: 'Contrats' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    resources: [
      { id: 'INVOICES', label: 'Factures' },
      { id: 'PAYMENTS', label: 'Paiements' },
    ],
  },
  {
    id: 'tech',
    label: 'Technique & Stock',
    resources: [
      { id: 'INTERVENTIONS', label: 'Interventions' },
      { id: 'STOCK', label: 'Stock' },
      { id: 'DEVICES', label: 'Boitiers' },
    ],
  },
  {
    id: 'support',
    label: 'Support Client',
    resources: [{ id: 'TICKETS', label: 'Tickets' }],
  },
  {
    id: 'admin',
    label: 'Administration',
    resources: [
      { id: 'USERS', label: 'Utilisateurs' },
      { id: 'ROLES', label: 'Rôles' },
    ],
  },
];

export const RoleManager: React.FC = () => {
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const queryClient = useQueryClient();

  const { data: rawRoles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: api.adminFeatures.roles.list,
  });

  // Convertir les permissions granulaires en format simple pour l'UI
  const roles = React.useMemo(() => {
    return rawRoles.map((role: any) => ({
      ...role,
      permissions: convertFromGranularFormat(role.permissions),
    }));
  }, [rawRoles]);

  // Convertir [{moduleId: 'fleet', actions: ['VIEW']}] en ['VIEW_VEHICLES']
  const convertFromGranularFormat = (granularPerms: any[]): Permission[] => {
    if (!Array.isArray(granularPerms)) return [];

    const simplePerms: Permission[] = [];

    granularPerms.forEach((perm) => {
      const { moduleId, tabId, actions = [] } = perm;

      // Mapper les modules aux ressources
      const resourceMap: Record<string, string[]> = {
        dashboard: ['DASHBOARD'],
        map: ['MAP'],
        reports: ['REPORTS'],
        admin: ['LOGS', 'USERS', 'ROLES'],
        fleet: ['VEHICLES', 'DRIVERS'],
        crm: ['LEADS', 'CLIENTS', 'CONTRACTS'],
        finance: ['INVOICES', 'PAYMENTS'],
        tech: ['INTERVENTIONS', 'STOCK', 'DEVICES'],
        support: ['TICKETS'],
      };

      const resources = resourceMap[moduleId] || [moduleId.toUpperCase()];

      resources.forEach((resource) => {
        actions.forEach((action: string) => {
          simplePerms.push(`${action}_${resource}` as Permission);
        });
      });
    });

    return simplePerms;
  };

  const createMutation = useMutation({
    mutationFn: api.adminFeatures.roles.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast('Rôle créé avec succès', 'success');
      setIsEditing(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.adminFeatures.roles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast('Rôle mis à jour', 'success');
      setIsEditing(false);
    },
    onError: (error: unknown) => {
      showToast(`Erreur: ${error instanceof Error ? error.message : 'Échec de la mise à jour'}`, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.adminFeatures.roles.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast('Rôle supprimé', 'info');
      if (selectedRole && roles.find((r: any) => r.id === selectedRole.id)) {
        setSelectedRole(null);
      }
    },
  });

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRole, setEditedRole] = useState<Role | null>(null);

  const handleCreateRole = () => {
    const newRole: Role = {
      id: `role_${Date.now()}`,
      name: 'Nouveau Rôle',
      permissions: [],
      isSystem: false,
    };
    setEditedRole(newRole);
    setSelectedRole(newRole);
    setIsEditing(true);
  };

  const handleEditRole = (role: Role) => {
    if (role.isSystem) {
      showToast('Le rôle système ne peut pas être modifié', 'info');
      return;
    }
    setEditedRole({ ...role });
    setSelectedRole(role);
    setIsEditing(true);
  };

  const handleSaveRole = () => {
    if (!editedRole) return;

    const dataToSend = {
      name: editedRole.name,
      description: editedRole.description || '',
      permissions: editedRole.permissions, // ← AUCUNE CONVERSION, on envoie tel quel
    };

    if (roles.some((r: any) => r.id === editedRole.id)) {
      updateMutation.mutate({ id: editedRole.id, data: dataToSend });
    } else {
      createMutation.mutate(dataToSend);
    }
    setIsEditing(false);
    setSelectedRole(editedRole);
  };

  // Convertir ['VIEW_VEHICLES', 'CREATE_LEADS'] en format granulaire
  const convertToGranularFormat = (permissions: Permission[]) => {
    if (!permissions || !Array.isArray(permissions)) {
      return [];
    }

    const grouped: Record<string, { moduleId: string; actions: Set<string> }> = {};

    permissions.forEach((perm, index) => {
      // Format: ACTION_RESOURCE (ex: VIEW_VEHICLES, CREATE_LEADS)
      const parts = perm.split('_');
      if (parts.length < 2) {
        return;
      }

      const action = parts[0]; // VIEW, CREATE, EDIT, DELETE
      const resource = parts.slice(1).join('_'); // VEHICLES, LEADS, etc.

      // Mapper les ressources aux modules
      const moduleMap: Record<string, string> = {
        DASHBOARD: 'dashboard',
        MAP: 'map',
        REPORTS: 'reports',
        LOGS: 'admin',
        VEHICLES: 'fleet',
        DRIVERS: 'fleet',
        LEADS: 'crm',
        CLIENTS: 'crm',
        CONTRACTS: 'crm',
        INVOICES: 'finance',
        PAYMENTS: 'finance',
        INTERVENTIONS: 'tech',
        STOCK: 'tech',
        DEVICES: 'tech',
        TICKETS: 'support',
        USERS: 'admin',
        ROLES: 'admin',
      };

      const moduleId = moduleMap[resource] || 'general';
      const key = `${moduleId}_${resource}`;

      if (!grouped[key]) {
        grouped[key] = { moduleId, actions: new Set() };
      }
      grouped[key].actions.add(action);
    });

    const result = Object.values(grouped).map(({ moduleId, actions }) => ({
      moduleId,
      actions: Array.from(actions),
    }));

    return result;
  };

  const handleDeleteRole = async (roleId: string) => {
    if (
      await confirm({
        message: 'Êtes-vous sûr de vouloir supprimer ce rôle ?',
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      })
    ) {
      deleteMutation.mutate(roleId);
    }
  };

  const togglePermission = (permId: string) => {
    if (!editedRole) return;
    const currentPerms = new Set(editedRole.permissions);
    if (currentPerms.has(permId as Permission)) {
      currentPerms.delete(permId as Permission);
    } else {
      currentPerms.add(permId as Permission);
    }
    setEditedRole({ ...editedRole, permissions: Array.from(currentPerms) });
  };

  const hasPerm = (role: Role | null, perm: string) => role?.permissions.includes(perm as Permission);

  return (
    <div className="flex h-[calc(100vh-200px)] gap-6">
      {/* LEFT: Role List */}
      <div className="w-1/3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)]">
          <h3 className="font-bold text-[var(--text-primary)] text-[var(--text-primary)]">Rôles & Profils</h3>
          <button
            onClick={handleCreateRole}
            className="p-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {roles.map((role: any) => (
            <div
              key={role.id}
              onClick={() => {
                setSelectedRole(role);
                setIsEditing(false);
              }}
              className={`p-3 rounded-lg cursor-pointer border transition-all ${
                selectedRole?.id === role.id
                  ? 'bg-[var(--primary-dim)] border-[var(--border)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] shadow-sm'
                  : 'bg-[var(--bg-elevated)] border-transparent hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${role.isSystem ? 'bg-purple-100 text-purple-600' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}
                  >
                    {role.isSystem ? <Lock className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>
                  <div>
                    <p
                      className={`font-bold text-sm ${selectedRole?.id === role.id ? 'text-[var(--primary)] dark:text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}
                    >
                      {role.name}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">{role.permissions.length} permissions</p>
                  </div>
                </div>
                {!role.isSystem && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRole(role);
                      }}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role.id);
                      }}
                      className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Permissions Matrix */}
      <div className="flex-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] flex flex-col overflow-hidden">
        {selectedRole ? (
          <>
            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <div className="flex flex-col gap-1">
                    <input
                      type="text"
                      value={editedRole?.name || ''}
                      onChange={(e) => setEditedRole((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                      placeholder="Nom du rôle"
                      className="text-lg font-bold bg-[var(--bg-surface)] border border-[var(--border)] rounded px-3 py-1.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                    <input
                      type="text"
                      value={editedRole?.description || ''}
                      onChange={(e) =>
                        setEditedRole((prev) => (prev ? { ...prev, description: e.target.value } : null))
                      }
                      placeholder="Description (optionnel)"
                      className="text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded px-3 py-1 text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{selectedRole.name}</h3>
                    {selectedRole.description && (
                      <p className="text-sm text-[var(--text-secondary)]">{selectedRole.description}</p>
                    )}
                  </div>
                )}
                {selectedRole.isSystem && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                    Système
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveRole}
                    className="px-3 py-1.5 bg-[var(--primary)] text-white rounded text-sm font-bold hover:bg-[var(--primary-light)] flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Enregistrer
                  </button>
                </div>
              ) : (
                !selectedRole.isSystem && (
                  <button
                    onClick={() => handleEditRole(selectedRole)}
                    className="px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] text-sm font-medium flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Modifier
                  </button>
                )
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="space-y-8">
                {PERMISSION_STRUCTURE.map((group) => (
                  <div key={group.id} className="border border-[var(--border)] rounded-lg overflow-hidden">
                    <div className="bg-[var(--bg-elevated)] p-3 border-b border-[var(--border)]">
                      <h4 className="font-bold text-[var(--text-primary)] text-sm">{group.label}</h4>
                    </div>

                    {group.isBoolean ? (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {group.permissions?.map((perm) => {
                          const isChecked = hasPerm(isEditing ? editedRole : selectedRole, perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-center gap-3 p-2 rounded transition-colors ${isEditing ? 'cursor-pointer tr-hover' : ''}`}
                            >
                              <div
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                  isChecked
                                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                                    : 'bg-[var(--bg-surface)] border-[var(--border)]'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3" />}
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={isChecked}
                                onChange={() => isEditing && togglePermission(perm.id)}
                                disabled={!isEditing}
                              />
                              <span className="text-sm text-[var(--text-secondary)] font-medium">{perm.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-[var(--bg-elevated)] text-xs uppercase text-[var(--text-secondary)] font-semibold border-b border-[var(--border)]">
                            <tr>
                              <th className="px-4 py-3 w-1/3">Ressource</th>
                              <th className="px-4 py-3 text-center w-1/6">Voir</th>
                              <th className="px-4 py-3 text-center w-1/6">Ajouter</th>
                              <th className="px-4 py-3 text-center w-1/6">Modifier</th>
                              <th className="px-4 py-3 text-center w-1/6">Supprimer</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {group.resources?.map((res) => (
                              <tr key={res.id} className="tr-hover/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{res.label}</td>
                                {['VIEW', 'CREATE', 'EDIT', 'DELETE'].map((action) => {
                                  const permId = `${action}_${res.id}`;
                                  const isChecked = hasPerm(isEditing ? editedRole : selectedRole, permId);
                                  return (
                                    <td key={action} className="px-4 py-3 text-center">
                                      <div
                                        onClick={() => isEditing && togglePermission(permId)}
                                        className={`w-5 h-5 mx-auto rounded border flex items-center justify-center transition-colors ${
                                          isChecked
                                            ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                                            : 'bg-[var(--bg-surface)] border-[var(--border)]'
                                        } ${isEditing ? 'cursor-pointer hover:ring-2 ring-[var(--primary-dim)]' : 'cursor-default opacity-60'}`}
                                      >
                                        {isChecked && <Check className="w-3 h-3" />}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
            <Shield className="w-16 h-16 mb-4 opacity-20" />
            <p>Sélectionnez un rôle pour voir ses permissions</p>
          </div>
        )}
      </div>
      <ConfirmDialogComponent />
    </div>
  );
};
