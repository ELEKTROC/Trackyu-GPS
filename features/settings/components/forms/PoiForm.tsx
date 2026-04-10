import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PoiSchema, PoiFormData } from '../../../../schemas/poiSchema';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { 
  Copy, MapPin, Users, CheckSquare, Square, ChevronDown, 
  ChevronUp, Globe 
} from 'lucide-react';
import { FormField, Input, Select, FormGrid } from '../../../../components/form';

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
  initialData?: Partial<PoiFormData>;
  onFormSubmit: (data: PoiFormData) => void | Promise<void>;
  resellers?: ResellerOption[];
  clients?: ClientOption[];
  branches?: BranchOption[];
  groups?: GroupOption[];
}

export const PoiForm = React.forwardRef<HTMLFormElement, BaseFormProps>(
  ({ initialData, onFormSubmit, resellers = [], clients = [] }, ref) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [showClients, setShowClients] = useState(false);
    const [clientSearch, setClientSearch] = useState('');

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PoiFormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(PoiSchema),
      defaultValues: initialData ? {
        ...initialData,
        rayon: (typeof initialData.rayon === 'string' ? (parseInt(initialData.rayon as string, 10) || 50) : initialData.rayon ?? 50),
        clientIds: initialData.clientIds || [],
        allClients: initialData.allClients || false,
      } : {
        statut: 'Actif',
        rayon: 50,
        type: 'Station Service',
        color: '#3b82f6',
        isShared: false,
        clientIds: [],
        allClients: false,
      }
    });

    const allClients = watch('allClients');
    const selectedClientIds: string[] = watch('clientIds') || [];
    const selectedResellerId = watch('resellerId');

    // Filtrer les clients selon le revendeur sélectionné ou l'utilisateur connecté
    const accessibleClients = useMemo(() => {
      if (!user) return clients;
      
      const normalizedRole = user.role?.toUpperCase().replace(/_/g, '');
      if (normalizedRole === 'SUPERADMIN' || normalizedRole === 'ADMIN') {
        if (selectedResellerId) {
          return clients.filter(c => c.resellerId === selectedResellerId);
        }
        return clients;
      }
      
      if (user.role === 'RESELLER') {
        return clients.filter(c => c.resellerId === user.resellerId);
      }
      
      return [];
    }, [clients, user, selectedResellerId]);

    // Filtrer les clients par recherche
    const filteredClients = useMemo(() => {
      if (!clientSearch) return accessibleClients;
      const search = clientSearch.toLowerCase();
      return accessibleClients.filter(c => 
        c.name?.toLowerCase().includes(search)
      );
    }, [accessibleClients, clientSearch]);

    const [isSaving, setIsSaving] = useState(false);
    const onSubmit = async (data: PoiFormData) => {
      if (isSaving) return;
      setIsSaving(true);
      try { await onFormSubmit(data); } finally { setIsSaving(false); }
    };

    const handleClone = () => {
      if (initialData) {
        setValue('id', undefined);
        setValue('clientIds', []);
        setValue('allClients', false);
        showToast("Mode clonage activé : Sélectionnez les clients et enregistrez pour créer une copie.", 'info');
      }
    };

    const toggleClient = (clientId: string) => {
      const current = selectedClientIds || [];
      if (current.includes(clientId)) {
        setValue('clientIds', current.filter(id => id !== clientId));
      } else {
        setValue('clientIds', [...current, clientId]);
      }
    };

    const toggleSelectAll = () => {
      if (selectedClientIds.length === filteredClients.length) {
        setValue('clientIds', []);
      } else {
        setValue('clientIds', filteredClients.map(c => c.id));
      }
    };

    return (
      <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
        {/* Header Actions */}
        <div className="flex justify-end">
          {initialData && (
            <button type="button" onClick={handleClone} className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
              <Copy className="w-3 h-3" /> Dupliquer le POI
            </button>
          )}
        </div>

        {/* Nom et Type */}
        <FormGrid columns={2}>
          <FormField label="Nom du POI" required error={errors.nom?.message as string}>
            <Input {...register('nom')} placeholder="Ex: Station Total Plateau" error={!!errors.nom} />
          </FormField>
          <FormField label="Type">
            <Select {...register('type')}>
              <option value="Station Service">⛽ Station Service</option>
              <option value="Client">🏢 Client</option>
              <option value="Fournisseur">📦 Fournisseur</option>
              <option value="Restaurant">🍽️ Restaurant</option>
              <option value="Garage">🔧 Garage</option>
              <option value="Hôtel">🏨 Hôtel</option>
              <option value="Parking">🅿️ Parking</option>
              <option value="Autre">📍 Autre</option>
            </Select>
          </FormField>
        </FormGrid>

        {/* Adresse */}
        <FormField label="Adresse">
          <Input {...register('adresse')} placeholder="Adresse complète" />
        </FormField>

        {/* Propriétaire (Revendeur) - visible uniquement pour SuperAdmin */}
        {(user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') && (
          <FormField label="Revendeur propriétaire" hint="Laisser vide pour un POI accessible à tous">
            <Select {...register('resellerId')}>
              <option value="">-- POI global (tous) --</option>
              {resellers.map((r) => <option key={r.id} value={r.id}>{r.nom || r.name}</option>)}
            </Select>
          </FormField>
        )}

        {/* Section Partage Clients */}
        <div className="border border-green-200 dark:border-green-800 rounded-xl overflow-hidden bg-green-50/50 dark:bg-green-900/20">
          <div className="p-4 border-b border-green-200 dark:border-green-800">
            <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
              <div className="p-1.5 bg-green-100 dark:bg-green-800 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
              Clients ayant accès à ce POI
            </h4>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Partagez ce point d'intérêt entre plusieurs clients
            </p>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Option: Tous les clients */}
            <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors">
              <input
                type="checkbox"
                {...register('allClients')}
                className="w-5 h-5 text-green-600 rounded-lg border-slate-300 focus:ring-green-500 focus:ring-offset-0"
              />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-green-500" />
                  Tous les clients
                </span>
                <p className="text-xs text-slate-500">Accessible à tous les clients {selectedResellerId ? 'de ce revendeur' : ''}</p>
              </div>
            </label>

            {/* Sélection individuelle */}
            {!allClients && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClients(!showClients)}
                  className="w-full p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    Sélection individuelle
                    {selectedClientIds.length > 0 && (
                      <span className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs px-2 py-0.5 rounded-full font-medium">
                        {selectedClientIds.length} client(s)
                      </span>
                    )}
                  </span>
                  {showClients ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {showClients && (
                  <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    <Input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Rechercher un client..."
                    />
                    
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1 font-medium"
                    >
                      {selectedClientIds.length === filteredClients.length ? (
                        <><CheckSquare className="w-3 h-3" /> Tout désélectionner</>
                      ) : (
                        <><Square className="w-3 h-3" /> Tout sélectionner</>
                      )}
                    </button>
                    
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {filteredClients.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">Aucun client trouvé</p>
                      ) : (
                        filteredClients.map((client) => (
                          <label 
                            key={client.id} 
                            className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => toggleClient(client.id)}
                              className="text-slate-400 hover:text-green-600"
                            >
                              {selectedClientIds.includes(client.id) ? (
                                <CheckSquare className="w-4 h-4 text-green-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {client.name}
                            </span>
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
              <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg flex items-center gap-2 font-medium">
                <CheckSquare className="w-4 h-4" />
                {allClients 
                  ? `POI partagé avec tous les clients${selectedResellerId ? ' du revendeur' : ''}`
                  : `POI partagé avec ${selectedClientIds.length} client(s)`
                }
              </div>
            )}
          </div>
        </div>

        {/* Coordonnées */}
        <FormGrid columns={2}>
          <FormField label="Latitude" error={errors.lat?.message as string}>
            <Input {...register('lat', { valueAsNumber: true })} type="number" step="any" placeholder="Ex: 5.316" error={!!errors.lat} />
          </FormField>
          <FormField label="Longitude" error={errors.lng?.message as string}>
            <Input {...register('lng', { valueAsNumber: true })} type="number" step="any" placeholder="Ex: -4.008" error={!!errors.lng} />
          </FormField>
        </FormGrid>

        {/* Map Placeholder */}
        <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-700">
          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Positionner sur la carte</span>
          </div>
          <div className="h-32 bg-slate-200 dark:bg-slate-900 flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <MapPin className="w-8 h-8 text-red-500 z-10 drop-shadow-lg" />
          </div>
        </div>

        {/* Rayon, Couleur, Statut */}
        <FormGrid columns={3}>
          <FormField label="Rayon (m)" error={errors.rayon?.message as string}>
            <Input {...register('rayon', { valueAsNumber: true })} type="number" error={!!errors.rayon} />
          </FormField>
          <FormField label="Couleur">
            <input {...register('color')} type="color" className="w-full h-[42px] p-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 cursor-pointer" />
          </FormField>
          <FormField label="Statut">
            <Select {...register('statut')}>
              <option value="Actif">Actif</option>
              <option value="Inactif">Inactif</option>
            </Select>
          </FormField>
        </FormGrid>
      </form>
    );
  }
);

PoiForm.displayName = 'PoiForm';
