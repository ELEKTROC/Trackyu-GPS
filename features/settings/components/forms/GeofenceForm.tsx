import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { GeofenceFormData } from '../../../../schemas/geofenceSchema';
import { GeofenceSchema } from '../../../../schemas/geofenceSchema';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import {
  Copy,
  Hexagon,
  Map,
  Circle,
  Trash2,
  Users,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Globe,
} from 'lucide-react';
import { FormField, Input, Select, Textarea, FormGrid } from '../../../../components/form';

interface ResellerOption {
  id: string;
  nom?: string;
  name?: string;
}

interface ClientOption {
  id: string;
  name: string;
  resellerId?: string;
}

interface BranchOption {
  id: string;
  name?: string;
  nom?: string;
}

interface GroupOption {
  id: string;
  nom?: string;
  name?: string;
}

interface BaseFormProps {
  initialData?: Partial<GeofenceFormData>;
  onFormSubmit: (data: GeofenceFormData) => void | Promise<void>;
  resellers?: ResellerOption[];
  clients?: ClientOption[];
  branches?: BranchOption[];
  groups?: GroupOption[];
}

export const GeofenceForm = React.forwardRef<HTMLFormElement, BaseFormProps>(
  ({ initialData, onFormSubmit, resellers = [], clients = [] }, ref) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [showClients, setShowClients] = useState(false);
    const [clientSearch, setClientSearch] = useState('');

    const {
      register,
      handleSubmit,
      formState: { errors },
      setValue,
      watch,
    } = useForm<GeofenceFormData>({
      resolver: zodResolver(GeofenceSchema),
      defaultValues: initialData || {
        statut: 'Active',
        type: 'Polygone',
        color: '#ef4444',
        coordinates: [],
        centerLat: undefined,
        centerLng: undefined,
        radius: 100,
        isShared: false,
        clientIds: [],
        allClients: false,
      },
    });

    const selectedType = watch('type');
    const isShared = watch('isShared');
    const allClients = watch('allClients');
    const selectedClientIds: string[] = watch('clientIds') || [];
    const selectedResellerId = watch('resellerId');

    // État local pour gérer les points du polygone
    const [polygonPoints, setPolygonPoints] = useState<[number, number][]>(
      (initialData?.coordinates as [number, number][] | undefined) || []
    );

    // Filtrer les clients selon le revendeur sélectionné ou l'utilisateur connecté
    const accessibleClients = useMemo(() => {
      if (!user) return clients;

      // SuperAdmin/Admin : filtrer par revendeur sélectionné si présent
      const normalizedRole = user.role?.toUpperCase().replace(/_/g, '');
      if (normalizedRole === 'SUPERADMIN' || normalizedRole === 'ADMIN') {
        if (selectedResellerId) {
          return clients.filter((c) => c.resellerId === selectedResellerId);
        }
        return clients;
      }

      // Revendeur : ses propres clients
      if (user.role === 'RESELLER') {
        return clients.filter((c) => c.resellerId === user.resellerId);
      }

      return [];
    }, [clients, user, selectedResellerId]);

    // Filtrer les clients par recherche
    const filteredClients = useMemo(() => {
      if (!clientSearch) return accessibleClients;
      const search = clientSearch.toLowerCase();
      return accessibleClients.filter((c) => c.name?.toLowerCase().includes(search));
    }, [accessibleClients, clientSearch]);

    const [isSaving, setIsSaving] = useState(false);
    const onSubmit = async (data: GeofenceFormData) => {
      if (isSaving) return;
      if (selectedType === 'Polygone' || selectedType === 'Route') {
        (data as GeofenceFormData & { coordinates: [number, number][] }).coordinates = polygonPoints;
      }
      setIsSaving(true);
      try {
        await onFormSubmit(data);
      } finally {
        setIsSaving(false);
      }
    };

    const handleClone = () => {
      if (initialData) {
        setValue('id', undefined);
        setValue('clientIds', []);
        setValue('allClients', false);
        showToast('Mode clonage activé : Sélectionnez les clients et enregistrez pour créer une copie.', 'info');
      }
    };

    // Toggle client selection
    const toggleClient = (clientId: string) => {
      const current = selectedClientIds || [];
      if (current.includes(clientId)) {
        setValue(
          'clientIds',
          current.filter((id) => id !== clientId)
        );
      } else {
        setValue('clientIds', [...current, clientId]);
      }
    };

    // Select/Deselect all clients
    const toggleSelectAll = () => {
      if (selectedClientIds.length === filteredClients.length) {
        setValue('clientIds', []);
      } else {
        setValue(
          'clientIds',
          filteredClients.map((c) => c.id)
        );
      }
    };

    // Gestion des points polygone
    const addSamplePoint = () => {
      const newPoint: [number, number] = [
        5.316 + (Math.random() - 0.5) * 0.1, // Abidjan lat
        -4.008 + (Math.random() - 0.5) * 0.1, // Abidjan lng
      ];
      const updated = [...polygonPoints, newPoint];
      setPolygonPoints(updated);
      setValue('coordinates', updated);
    };

    const removePoint = (index: number) => {
      const updated = polygonPoints.filter((_, i) => i !== index);
      setPolygonPoints(updated);
      setValue('coordinates', updated);
    };

    const clearPoints = () => {
      setPolygonPoints([]);
      setValue('coordinates', []);
    };

    return (
      <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
        {/* Header Actions */}
        <div className="flex justify-end">
          {initialData && (
            <button
              type="button"
              onClick={handleClone}
              className="text-xs flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary)] bg-[var(--primary-dim)] hover:bg-[var(--primary-dim)] px-3 py-1.5 rounded-lg transition-colors"
            >
              <Copy className="w-3 h-3" /> Dupliquer la zone
            </button>
          )}
        </div>

        {/* Nom et Type */}
        <FormGrid columns={2}>
          <FormField label="Nom de la Zone" required error={errors.nom?.message as string}>
            <Input {...register('nom')} placeholder="Ex: Ville d'Abidjan" error={!!errors.nom} />
          </FormField>
          <FormField label="Type">
            <Select {...register('type')}>
              <option value="Polygone">Polygone</option>
              <option value="Cercle">Cercle</option>
              <option value="Route">Route</option>
              <option value="Dépôt">Dépôt</option>
              <option value="Client">Client</option>
              <option value="Interdit">Zone Interdite</option>
              <option value="Parking">Parking</option>
              <option value="Autre">Autre</option>
            </Select>
          </FormField>
        </FormGrid>

        {/* Description */}
        <FormField label="Description">
          <Textarea {...register('description')} rows={2} placeholder="Description de la zone..." />
        </FormField>

        {/* Propriétaire (Revendeur) - visible uniquement pour SuperAdmin */}
        {(user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') && (
          <FormField label="Revendeur propriétaire" hint="Laisser vide pour une zone accessible à tous les revendeurs">
            <Select {...register('resellerId')}>
              <option value="">-- Zone globale (tous) --</option>
              {resellers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom || r.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {/* Section Partage Clients */}
        <div className="border border-[var(--border)] dark:border-[var(--primary)] rounded-xl overflow-hidden bg-[var(--primary-dim)]/50 dark:bg-[var(--primary-dim)]">
          <div className="p-4 border-b border-[var(--border)] dark:border-[var(--primary)]">
            <h4 className="text-sm font-semibold text-[var(--primary)] dark:text-[var(--primary)] flex items-center gap-2">
              <div className="p-1.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                <Users className="w-4 h-4" />
              </div>
              Clients ayant accès à cette zone
            </h4>
            <p className="text-xs text-[var(--primary)] dark:text-[var(--primary)] mt-1">
              Partagez cette zone entre plusieurs clients au lieu de la dupliquer
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Option: Tous les clients */}
            <label className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-xl cursor-pointer hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] transition-colors">
              <input
                type="checkbox"
                {...register('allClients')}
                className="w-5 h-5 text-[var(--primary)] rounded-lg border-[var(--border)] focus:ring-[var(--primary)]"
              />
              <div>
                <span className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-green-500" />
                  Tous les clients
                </span>
                <p className="text-xs text-[var(--text-secondary)]">
                  Accessible à tous les clients {selectedResellerId ? 'de ce revendeur' : ''}
                </p>
              </div>
            </label>

            {/* Sélection individuelle */}
            {!allClients && (
              <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]">
                <button
                  type="button"
                  onClick={() => setShowClients(!showClients)}
                  className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <span className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                    Sélection individuelle
                    {selectedClientIds.length > 0 && (
                      <span className="bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)] text-xs px-2 py-0.5 rounded-full font-medium">
                        {selectedClientIds.length} client(s)
                      </span>
                    )}
                  </span>
                  {showClients ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showClients && (
                  <div className="p-3 border-t border-[var(--border)] space-y-3">
                    {/* Recherche */}
                    <Input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Rechercher un client..."
                    />

                    {/* Sélectionner tout */}
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs text-[var(--primary)] hover:text-[var(--primary)] flex items-center gap-1 font-medium"
                    >
                      {selectedClientIds.length === filteredClients.length ? (
                        <>
                          <CheckSquare className="w-3 h-3" /> Tout désélectionner
                        </>
                      ) : (
                        <>
                          <Square className="w-3 h-3" /> Tout sélectionner
                        </>
                      )}
                    </button>

                    {/* Liste des clients */}
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredClients.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)] text-center py-2">
                          {selectedResellerId ? 'Aucun client pour ce revendeur' : 'Aucun client trouvé'}
                        </p>
                      ) : (
                        filteredClients.map((client) => (
                          <label
                            key={client.id}
                            className="flex items-center gap-2 p-2 hover:bg-[var(--bg-elevated)] rounded-lg cursor-pointer transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => toggleClient(client.id)}
                              className="text-[var(--text-muted)] hover:text-[var(--primary)]"
                            >
                              {selectedClientIds.includes(client.id) ? (
                                <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-sm text-[var(--text-primary)]">{client.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Résumé */}
            {(allClients || selectedClientIds.length > 0) && (
              <div className="text-xs text-[var(--clr-success)] bg-[var(--clr-success-dim)] p-3 rounded-lg flex items-center gap-2 font-medium">
                <CheckSquare className="w-4 h-4" />
                {allClients
                  ? `Zone partagée avec tous les clients${selectedResellerId ? ' du revendeur' : ''}`
                  : `Zone partagée avec ${selectedClientIds.length} client(s)`}
              </div>
            )}
          </div>
        </div>

        {/* Carte / Coordonnées */}
        <div className="border rounded-xl overflow-hidden border-[var(--border)]">
          <div className="bg-[var(--bg-elevated)] px-4 py-2.5 border-b border-[var(--border)] flex justify-between items-center">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              {selectedType === 'Cercle' ? 'Définir le cercle' : 'Dessiner la zone'}
            </span>
            <div className="flex gap-2">
              {(selectedType === 'Polygone' || selectedType === 'Route') && (
                <>
                  <button
                    type="button"
                    onClick={addSamplePoint}
                    className="px-2 py-1 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg text-xs text-[var(--primary)] font-medium"
                    title="Ajouter un point"
                  >
                    + Point
                  </button>
                  <button
                    type="button"
                    onClick={clearPoints}
                    className="p-1.5 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg"
                    title="Effacer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Cercle */}
          {selectedType === 'Cercle' ? (
            <div className="p-4 space-y-4">
              <FormGrid columns={2}>
                <FormField label="Centre - Latitude">
                  <Input
                    {...register('centerLat', { valueAsNumber: true })}
                    type="number"
                    step="any"
                    placeholder="Ex: 5.316"
                  />
                </FormField>
                <FormField label="Centre - Longitude">
                  <Input
                    {...register('centerLng', { valueAsNumber: true })}
                    type="number"
                    step="any"
                    placeholder="Ex: -4.008"
                  />
                </FormField>
              </FormGrid>
              <FormField label="Rayon (mètres)">
                <Input {...register('radius', { valueAsNumber: true })} type="number" placeholder="1000" />
              </FormField>
              <div className="h-24 bg-[var(--bg-elevated)] bg-[var(--bg-surface)] rounded-lg flex items-center justify-center">
                <Circle className="w-12 h-12 text-[var(--text-muted)]" />
              </div>
            </div>
          ) : (
            <>
              <div className="h-40 bg-[var(--bg-elevated)] bg-[var(--bg-surface)] flex items-center justify-center relative">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                ></div>
                <p className="text-[var(--text-secondary)] text-sm z-10 flex flex-col items-center gap-2">
                  <Map className="w-8 h-8 opacity-50" />
                  <span>Carte interactive</span>
                </p>
              </div>

              {polygonPoints.length > 0 && (
                <div className="p-3 bg-[var(--bg-elevated)] border-t border-[var(--border)] max-h-28 overflow-y-auto">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                    Points ({polygonPoints.length})
                  </p>
                  <div className="space-y-1">
                    {polygonPoints.map((point, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs bg-[var(--bg-elevated)] p-2 rounded-lg"
                      >
                        <span className="text-[var(--text-secondary)] font-mono">
                          P{index + 1}: [{point[0].toFixed(4)}, {point[1].toFixed(4)}]
                        </span>
                        <button
                          type="button"
                          onClick={() => removePoint(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Couleur et Statut */}
        <FormGrid columns={2}>
          <FormField label="Couleur">
            <input
              {...register('color')}
              type="color"
              className="w-full h-[42px] p-1.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] cursor-pointer"
            />
          </FormField>
          <FormField label="Statut">
            <Select {...register('statut')}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </FormField>
        </FormGrid>
      </form>
    );
  }
);

GeofenceForm.displayName = 'GeofenceForm';
