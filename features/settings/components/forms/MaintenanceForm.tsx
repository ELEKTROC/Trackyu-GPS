import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaintenanceSchema } from '../../../../schemas/maintenanceSchema';
import type { z } from 'zod';
import type { Tier, Vehicle } from '../../../../types';
import type { User } from '../../../../types/auth';

type MaintenanceFormData = z.infer<typeof MaintenanceSchema>;
import { Copy, Settings, Bell, Car } from 'lucide-react';
import { FormField, FormSection, FormGrid, Input, Select, Textarea } from '../../../../components/form';
import { useToast } from '../../../../contexts/ToastContext';

interface BaseFormProps {
  initialData?: Partial<MaintenanceFormData>;
  onFormSubmit: (data: MaintenanceFormData) => void | Promise<void>;
}

export const MaintenanceForm = React.forwardRef<
  HTMLFormElement,
  BaseFormProps & {
    resellers?: Tier[];
    clients?: Tier[];
    branches?: unknown[];
    groups?: unknown[];
    vehicles?: Vehicle[];
    users?: User[];
  }
>(({ initialData, onFormSubmit, resellers = [], clients = [], vehicles = [], users = [] }, ref) => {
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(MaintenanceSchema),
    defaultValues: initialData || {
      nom: '',
      category: 'Visite technique',
      type: 'Kilométrage',
      intervalle: '',
      unit: 'km',
      statut: 'Actif',
      description: '',
      isRecurring: false,
      notifyEmail: false,
      notifySms: false,
      notifyPush: false,
      reminderValue: '',
      reminderUnit: 'km',
      vehicleIds: [],
      notificationUserIds: [],
    },
  });

  const type = watch('type');
  const category = watch('category');
  const selectedClient = watch('client');
  const selectedVehicleIds = watch('vehicleIds') || [];
  const selectedUserIds = watch('notificationUserIds') || [];

  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Filter vehicles based on selected client
  const filteredVehicles = React.useMemo(() => {
    if (!selectedClient) return vehicles;
    return vehicles.filter((v: Vehicle) => v.client === selectedClient);
  }, [vehicles, selectedClient]);

  // Filter users based on selected client (assuming users have a client field or similar)
  // If user structure doesn't have client, we might need to adjust.
  // Based on mock data: user has 'client' field (string name) or 'clientId'.
  const filteredUsers = React.useMemo(() => {
    if (!selectedClient) return users;
    return users.filter(
      (u: User) =>
        (u as unknown as Record<string, unknown>)['client'] === selectedClient || u.clientId === selectedClient
    );
  }, [users, selectedClient]);

  const toggleVehicle = (id: string) => {
    const current = selectedVehicleIds;
    const updated = current.includes(id) ? current.filter((i: string) => i !== id) : [...current, id];
    setValue('vehicleIds', updated);
  };

  const toggleUser = (id: string) => {
    const current = selectedUserIds;
    const updated = current.includes(id) ? current.filter((i: string) => i !== id) : [...current, id];
    setValue('notificationUserIds', updated);
  };

  const [isSaving, setIsSaving] = useState(false);
  const onSubmit = async (data: MaintenanceFormData) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onFormSubmit(data);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClone = () => {
    const currentData = initialData;
    if (currentData) {
      setValue('id', undefined);
      setValue('client', '');
      showToast('Mode clonage activé : Sélectionnez un nouveau client et enregistrez pour créer une copie.', 'info');
    }
  };

  return (
    <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-4 h-[600px] flex flex-col">
      <div className="flex justify-end mb-2 shrink-0">
        {initialData && (
          <button
            type="button"
            onClick={handleClone}
            className="text-xs flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary)] bg-[var(--primary-dim)] hover:bg-[var(--primary-dim)] px-2.5 py-1.5 rounded-lg transition-colors font-medium"
          >
            <Copy className="w-3.5 h-3.5" /> Cloner vers un autre client
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
        <FormGrid columns={2}>
          <FormField label="Revendeur">
            <Select {...register('resellerId')}>
              <option value="">Sélectionner...</option>
              {resellers.map((r: Tier) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Client">
            <Select {...register('client')}>
              <option value="">Sélectionner...</option>
              {clients.map((c: Tier) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
        </FormGrid>

        <FormGrid columns={2}>
          <FormField label="Nom de la règle" error={errors.nom?.message as string}>
            <Input {...register('nom')} placeholder="Ex: Vidange tous les 10 000 km" />
          </FormField>
          <FormField label="Catégorie" error={errors.category?.message as string}>
            <Select {...register('category')}>
              <option value="Visite technique">Visite technique</option>
              <option value="Assurance">Assurance</option>
              <option value="Patente">Patente</option>
              <option value="Permis de conduire">Permis de conduire</option>
              <option value="Carte de transporteur">Carte de transporteur</option>
              <option value="Maintenance Mécanique">Maintenance Mécanique</option>
              <option value="Autre">Autre</option>
            </Select>
          </FormField>
        </FormGrid>

        <FormGrid columns={2}>
          <FormField label="Type de déclencheur" error={errors.type?.message as string}>
            <Select {...register('type')}>
              <option value="Kilométrage">Kilométrage</option>
              <option value="Durée">Durée (Temps)</option>
              <option value="Date">Date Fixe</option>
              <option value="Heures Moteur">Heures Moteur</option>
            </Select>
          </FormField>

          <div className="flex gap-3">
            <FormField label="Intervalle / Valeur" error={errors.intervalle?.message as string} className="flex-1">
              <Input {...register('intervalle')} type={type === 'Date' ? 'date' : 'number'} />
            </FormField>
            {type !== 'Date' && (
              <FormField label="Unité" className="w-24">
                <Select {...register('unit')}>
                  {type === 'Kilométrage' && <option value="km">km</option>}
                  {type === 'Durée' && (
                    <>
                      <option value="mois">Mois</option>
                      <option value="jours">Jours</option>
                      <option value="ans">Ans</option>
                    </>
                  )}
                  {type === 'Heures Moteur' && <option value="h">Heures</option>}
                </Select>
              </FormField>
            )}
          </div>
        </FormGrid>

        {/* Rappel & Périodicité */}
        <FormSection icon={Settings} title="Configuration Avancée">
          <FormGrid columns={2}>
            <div className="flex gap-3">
              <FormField label="Rappel avant" className="flex-1">
                <Input {...register('reminderValue')} type="number" placeholder="Ex: 500" />
              </FormField>
              <FormField label="Unité" className="w-24">
                <Select {...register('reminderUnit')}>
                  <option value="km">km</option>
                  <option value="jours">Jours</option>
                  <option value="h">Heures</option>
                </Select>
              </FormField>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isRecurring')}
                  className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">Règle récurrente (Périodique)</span>
              </label>
            </div>
          </FormGrid>

          <div className="border-t border-[var(--border)] pt-4 mt-4">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
              Canaux de Notification
            </label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('notifyEmail')}
                  className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('notifySms')}
                  className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">SMS</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('notifyPush')}
                  className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Application (Push)</span>
              </label>
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                Destinataires (Utilisateurs)
              </label>
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm text-left flex justify-between items-center hover:border-[var(--border-strong)] transition-colors"
              >
                <span
                  className={selectedUserIds.length === 0 ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}
                >
                  {selectedUserIds.length === 0
                    ? 'Sélectionner les utilisateurs...'
                    : `${selectedUserIds.length} utilisateur(s) sélectionné(s)`}
                </span>
                <span className="text-xs text-[var(--text-muted)]">▼</span>
              </button>

              {isUserDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-sm text-[var(--text-secondary)]">
                      Aucun utilisateur trouvé pour ce client.
                    </div>
                  ) : (
                    filteredUsers.map((u: User) => (
                      <label
                        key={u.id}
                        className="flex items-start gap-2 p-3 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] cursor-pointer border-b border-[var(--border)] border-[var(--border)] last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => toggleUser(u.id)}
                          className="mt-0.5 w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[var(--text-primary)]">{u.name}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{u.email}</span>
                          {u.phone && <span className="text-xs text-[var(--text-muted)]">{u.phone}</span>}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </FormSection>

        <div className="relative">
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
            Véhicules concernés
          </label>
          <button
            type="button"
            onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm text-left flex justify-between items-center hover:border-[var(--border-strong)] transition-colors"
          >
            <span
              className={selectedVehicleIds.length === 0 ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}
            >
              {selectedVehicleIds.length === 0
                ? 'Sélectionner les véhicules...'
                : `${selectedVehicleIds.length} véhicule(s) sélectionné(s)`}
            </span>
            <span className="text-xs text-[var(--text-muted)]">▼</span>
          </button>

          {isVehicleDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {filteredVehicles.length === 0 ? (
                <div className="p-3 text-sm text-[var(--text-secondary)]">Aucun véhicule trouvé pour ce client.</div>
              ) : (
                filteredVehicles.map((v: Vehicle) => (
                  <label
                    key={v.id}
                    className="flex items-center gap-2 p-2.5 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedVehicleIds.includes(v.id)}
                      onChange={() => toggleVehicle(v.id)}
                      className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">
                      {v.name} ({v.id})
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <FormField label="Description / Notes">
          <Textarea {...register('description')} rows={3} placeholder="Détails sur l'entretien à effectuer..." />
        </FormField>

        <FormField label="Statut">
          <Select {...register('statut')}>
            <option value="Actif">Actif</option>
            <option value="Inactif">Inactif</option>
          </Select>
        </FormField>
      </div>
    </form>
  );
});

MaintenanceForm.displayName = 'MaintenanceForm';
