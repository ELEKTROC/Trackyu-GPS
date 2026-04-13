import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { GroupFormData } from '../../../../schemas/groupSchema';
import { GroupSchema } from '../../../../schemas/groupSchema';
import { useDataContext } from '../../../../contexts/DataContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { Car, CheckSquare, Square, ChevronDown, ChevronUp, Filter, Layers } from 'lucide-react';
import { Vehicle, VehicleStatus } from '../../../../types';
import { FormField, Input, Select, Textarea, FormSection } from '../../../../components/form';

interface BaseFormProps {
  initialData?: Partial<GroupFormData>;
  onFormSubmit: (data: GroupFormData) => void | Promise<void>;
}

// Types de critères avec leurs options
const CRITERIA_OPTIONS: Record<string, { label: string; values: { id: string; label: string }[] }> = {
  VEHICLE_TYPE: {
    label: "Type d'engin",
    values: [
      { id: 'TRUCK', label: 'Camion' },
      { id: 'CAR', label: 'Voiture' },
      { id: 'VAN', label: 'Utilitaire' },
      { id: 'MOTORCYCLE', label: 'Moto' },
      { id: 'BUS', label: 'Bus' },
      { id: 'CONSTRUCTION', label: 'Engin chantier' },
    ],
  },
  SIM_OPERATOR: {
    label: 'Opérateur SIM',
    values: [
      { id: 'ORANGE', label: 'Orange' },
      { id: 'MTN', label: 'MTN' },
      { id: 'MOOV', label: 'Moov' },
      { id: 'CAMTEL', label: 'Camtel' },
      { id: 'NEXTTEL', label: 'Nexttel' },
      { id: 'OTHER', label: 'Autre' },
    ],
  },
  CLIENT_TYPE: {
    label: 'Type de client',
    values: [
      { id: 'ENTERPRISE', label: 'Entreprise' },
      { id: 'PME', label: 'PME' },
      { id: 'INDIVIDUAL', label: 'Particulier' },
      { id: 'GOVERNMENT', label: 'Administration' },
      { id: 'NGO', label: 'ONG' },
    ],
  },
  FUEL_TYPE: {
    label: 'Type carburant',
    values: [
      { id: 'DIESEL', label: 'Diesel' },
      { id: 'GASOLINE', label: 'Essence' },
      { id: 'ELECTRIC', label: 'Électrique' },
      { id: 'HYBRID', label: 'Hybride' },
    ],
  },
  BRANCH: {
    label: 'Branche',
    values: [], // Sera rempli dynamiquement
  },
  GEOFENCE: {
    label: 'Zone géographique',
    values: [], // Sera rempli dynamiquement
  },
  DRIVER: {
    label: 'Conducteur',
    values: [], // Sera rempli dynamiquement
  },
  CUSTOM: {
    label: 'Personnalisé',
    values: [],
  },
};

export const GroupForm = React.forwardRef<HTMLFormElement, BaseFormProps>(({ initialData, onFormSubmit }, ref) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control,
  } = useForm<GroupFormData>({
    resolver: zodResolver(GroupSchema),
    defaultValues: initialData || { statut: 'ACTIVE', vehicleIds: [] },
  });

  const { vehicles, clients, branches, drivers, zones } = useDataContext();
  const geofences = zones; // Alias pour compatibilité
  const { user } = useAuth();

  const [isVehicleListOpen, setIsVehicleListOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');

  const selectedCriteriaType = watch('criteriaType');
  const selectedVehicleIds: string[] = watch('vehicleIds') || [];

  // Filtrer les véhicules selon le niveau d'habilitation
  const accessibleVehicles = useMemo(() => {
    if (!user) return [];

    const role = user.role;

    // SuperAdmin et Admin voient tous les véhicules
    const normalizedRole = role?.toUpperCase().replace(/_/g, '');
    if (normalizedRole === 'SUPERADMIN' || normalizedRole === 'ADMIN') {
      return vehicles;
    }

    // Revendeur voit les véhicules de ses clients
    if (role === 'RESELLER') {
      // Filter vehicles by reseller's clients
      const resellerClients = clients.filter((c) => c.resellerId === user.resellerId);
      const clientNames = resellerClients.map((c) => c.name);
      return vehicles.filter((v) => clientNames.includes(v.client));
    }

    // Client voit uniquement ses véhicules
    if (role === 'CLIENT') {
      const clientName = clients.find((c) => c.id === user.clientId)?.name;
      return vehicles.filter((v) => v.client === clientName);
    }

    // Staff voit selon leur branche
    if (user.branchId) {
      return vehicles.filter((v) => v.branchId === user.branchId);
    }

    return vehicles;
  }, [vehicles, clients, user]);

  // Filtrer les véhicules par recherche
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch) return accessibleVehicles;
    const search = vehicleSearch.toLowerCase();
    return accessibleVehicles.filter(
      (v) =>
        v.name?.toLowerCase().includes(search) ||
        v.plate?.toLowerCase().includes(search) ||
        v.client?.toLowerCase().includes(search)
    );
  }, [accessibleVehicles, vehicleSearch]);

  // Options dynamiques pour branches, drivers, geofences
  const dynamicCriteriaOptions = useMemo(() => {
    return {
      ...CRITERIA_OPTIONS,
      BRANCH: {
        ...CRITERIA_OPTIONS.BRANCH,
        values: branches.map((b) => ({ id: b.id, label: b.name })),
      },
      DRIVER: {
        ...CRITERIA_OPTIONS.DRIVER,
        values: drivers.map((d) => ({ id: d.id, label: d.nom })),
      },
      GEOFENCE: {
        ...CRITERIA_OPTIONS.GEOFENCE,
        values: geofences?.map((g) => ({ id: g.id, label: g.name })) || [],
      },
    };
  }, [branches, drivers, geofences]);

  const toggleVehicle = (vehicleId: string) => {
    const current = selectedVehicleIds || [];
    if (current.includes(vehicleId)) {
      setValue(
        'vehicleIds',
        current.filter((id) => id !== vehicleId)
      );
    } else {
      setValue('vehicleIds', [...current, vehicleId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedVehicleIds.length === filteredVehicles.length) {
      setValue('vehicleIds', []);
    } else {
      setValue(
        'vehicleIds',
        filteredVehicles.map((v) => v.id)
      );
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const onSubmit = async (data: GroupFormData) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onFormSubmit(data);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informations de base */}
      <FormSection title="Informations" icon={Layers}>
        <FormField label="Nom du Groupe" required error={errors.nom?.message as string}>
          <Input {...register('nom')} placeholder="Ex: Camions Livraison" error={!!errors.nom} />
        </FormField>

        <FormField label="Description">
          <Textarea {...register('description')} rows={2} placeholder="Description du groupe..." />
        </FormField>
      </FormSection>

      {/* Critère de groupement */}
      <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] rounded-lg">
            <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Critère de groupement</h4>
            <p className="text-xs text-[var(--text-secondary)]">Optionnel - Filtrer automatiquement les véhicules</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Type de critère">
            <Select {...register('criteriaType')}>
              <option value="">-- Sélectionner un critère --</option>
              {Object.entries(dynamicCriteriaOptions).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </Select>
          </FormField>

          {selectedCriteriaType &&
            selectedCriteriaType !== 'CUSTOM' &&
            dynamicCriteriaOptions[selectedCriteriaType]?.values.length > 0 && (
              <FormField label="Valeur">
                <Select {...register('criteriaValue')}>
                  <option value="">-- Sélectionner une valeur --</option>
                  {dynamicCriteriaOptions[selectedCriteriaType].values.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

          {selectedCriteriaType === 'CUSTOM' && (
            <FormField label="Critère personnalisé">
              <Input {...register('customCriteria')} placeholder="Entrez votre critère personnalisé..." />
            </FormField>
          )}
        </div>
      </div>

      {/* Sélection des véhicules */}
      <div className="border border-[var(--border)] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsVehicleListOpen(!isVehicleListOpen)}
          className="w-full p-4 bg-[var(--bg-elevated)] flex items-center justify-between text-left hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <div className="p-1.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
              <Car className="w-4 h-4 text-[var(--primary)] dark:text-[var(--primary)]" />
            </div>
            Véhicules concernés
            {selectedVehicleIds.length > 0 && (
              <span className="bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)] text-xs px-2 py-1 rounded-full font-medium">
                {selectedVehicleIds.length} sélectionné(s)
              </span>
            )}
          </span>
          {isVehicleListOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {isVehicleListOpen && (
          <div className="p-4 bg-[var(--bg-surface)] space-y-4">
            {/* Recherche */}
            <Input
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              placeholder="Rechercher par nom, plaque, client..."
            />

            {/* Sélectionner tout */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-[var(--primary)] hover:text-[var(--primary)] flex items-center gap-1 font-medium"
              >
                {selectedVehicleIds.length === filteredVehicles.length ? (
                  <>
                    <CheckSquare className="w-3 h-3" /> Tout désélectionner
                  </>
                ) : (
                  <>
                    <Square className="w-3 h-3" /> Tout sélectionner ({filteredVehicles.length})
                  </>
                )}
              </button>
              <span className="text-xs text-[var(--text-secondary)]">
                {accessibleVehicles.length} véhicule(s) accessible(s)
              </span>
            </div>

            {/* Liste des véhicules */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((vehicle) => (
                  <label
                    key={vehicle.id}
                    className="flex items-center gap-3 p-2.5 tr-hover rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedVehicleIds.includes(vehicle.id)}
                      onChange={() => toggleVehicle(vehicle.id)}
                      className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{vehicle.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {vehicle.plate} • {vehicle.client}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                        vehicle.status === VehicleStatus.MOVING
                          ? 'bg-green-100 text-green-700'
                          : vehicle.status === VehicleStatus.STOPPED
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {vehicle.type || 'N/A'}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-center text-sm text-[var(--text-secondary)] py-4">Aucun véhicule trouvé</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statut */}
      <FormField label="Statut">
        <Select {...register('statut')}>
          <option value="ACTIVE">Actif</option>
          <option value="INACTIVE">Inactif</option>
        </Select>
      </FormField>
    </form>
  );
});
