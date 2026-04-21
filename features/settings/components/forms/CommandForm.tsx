import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CommandSchema } from '../../../../schemas/commandSchema';
import { Terminal, AlertTriangle } from 'lucide-react';
import { FormField, Input, Select, Textarea } from '../../../../components/form';
import type { z } from 'zod';

export type CommandFormData = z.infer<typeof CommandSchema>;

interface VehicleOption {
  id: string;
  name: string;
  clientId?: string;
  client?: string;
}

interface ClientOption {
  id: string;
  name: string;
  resellerId?: string;
}

interface ResellerOption {
  id: string;
  name?: string;
  nom?: string;
}

interface BaseFormProps {
  initialData?: Partial<CommandFormData>;
  onFormSubmit: (data: CommandFormData) => void | Promise<void>;
  vehicles?: VehicleOption[];
  clients?: ClientOption[];
  resellers?: ResellerOption[];
}

export const CommandForm = React.forwardRef<HTMLFormElement, BaseFormProps>(
  ({ initialData, onFormSubmit, vehicles = [], clients = [], resellers = [] }, ref) => {
    const {
      register,
      handleSubmit,
      watch,
      formState: { errors },
    } = useForm<CommandFormData>({
      resolver: zodResolver(CommandSchema),
      defaultValues: initialData || {
        vehicleId: '',
        commandType: 'POSITION',
        transport: 'GPRS',
        parameter: '',
        reason: '',
      },
    });

    const commandType = watch('commandType');
    const isSensitive = ['ENGINE_STOP', 'FACTORY_RESET'].includes(commandType);

    const selectedVehicleId = watch('vehicleId');
    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    const derivedClientId = selectedVehicle?.clientId;
    const derivedClient = derivedClientId
      ? clients.find((c) => c.id === derivedClientId)
      : clients.find((c) => c.name === selectedVehicle?.client);
    const derivedClientLabel = derivedClient?.name || selectedVehicle?.client || '—';
    const derivedReseller = derivedClient?.resellerId
      ? resellers.find((r) => r.id === derivedClient.resellerId)
      : undefined;
    const derivedResellerLabel = derivedReseller?.name || derivedReseller?.nom || derivedClient?.resellerId || '—';

    const [isSaving, setIsSaving] = React.useState(false);
    const onSubmit = async (data: CommandFormData) => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        await onFormSubmit(data);
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-5 h-[500px] flex flex-col">
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5">
          {/* Header Info */}
          <div className="p-4 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-xl border border-[var(--primary)] dark:border-[var(--primary)]">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-xl text-[var(--primary)] dark:text-[var(--primary)]">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--primary)] dark:text-[var(--primary)]">
                  Console de Commande Technique
                </h4>
                <p className="text-xs text-[var(--primary)] dark:text-[var(--primary)] mt-1">
                  Envoyez des instructions directement aux boîtiers GPS. Les commandes critiques nécessitent une
                  justification.
                </p>
              </div>
            </div>
          </div>

          <FormField label="Véhicule Cible" required error={errors.vehicleId?.message as string}>
            <Select {...register('vehicleId')} error={!!errors.vehicleId}>
              <option value="">Sélectionner un véhicule...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.id})
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Client" hint="Hérité du véhicule">
              <Input
                value={derivedClientLabel}
                disabled
                readOnly
                className="bg-[var(--bg-elevated)] cursor-not-allowed"
              />
            </FormField>
            <FormField label="Revendeur" hint="Hérité du client">
              <Input
                value={derivedResellerLabel}
                disabled
                readOnly
                className="bg-[var(--bg-elevated)] cursor-not-allowed"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Type de Commande">
              <Select {...register('commandType')}>
                <optgroup label="Actions Rapides">
                  <option value="POSITION">Demande de Position (Locate)</option>
                  <option value="STATUS">État du Boîtier (Status)</option>
                  <option value="REBOOT">Redémarrage (Reboot)</option>
                </optgroup>
                <optgroup label="Contrôle Véhicule">
                  <option value="ENGINE_STOP">Coupure Moteur (Immobilize)</option>
                  <option value="ENGINE_RESUME">Autorisation Démarrage (Mobilize)</option>
                  <option value="DOOR_OPEN">Ouverture Portes</option>
                  <option value="DOOR_CLOSE">Fermeture Portes</option>
                </optgroup>
                <optgroup label="Configuration">
                  <option value="SET_ODOMETER">Définir Odomètre</option>
                  <option value="FACTORY_RESET">Réinitialisation Usine (Factory Reset)</option>
                  <option value="CUSTOM">Commande GPRS Personnalisée</option>
                </optgroup>
              </Select>
            </FormField>

            <FormField label="Canal de transmission">
              <div className="flex gap-5 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    {...register('transport')}
                    type="radio"
                    value="GPRS"
                    className="w-4 h-4 text-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)] focus:ring-offset-0"
                  />
                  <span className="text-sm text-[var(--text-primary)] group-hover:text-[var(--text-primary)] transition-colors">
                    GPRS (Data)
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    {...register('transport')}
                    type="radio"
                    value="SMS"
                    className="w-4 h-4 text-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)] focus:ring-offset-0"
                  />
                  <span className="text-sm text-[var(--text-primary)] group-hover:text-[var(--text-primary)] transition-colors">
                    SMS (Backup)
                  </span>
                </label>
              </div>
            </FormField>
          </div>

          {(commandType === 'CUSTOM' || commandType === 'SET_ODOMETER') && (
            <FormField
              label={commandType === 'SET_ODOMETER' ? 'Valeur (mètres)' : 'Commande brute'}
              error={errors.parameter?.message as string}
            >
              <Input
                {...register('parameter')}
                type={commandType === 'SET_ODOMETER' ? 'number' : 'text'}
                className="font-mono"
                placeholder={commandType === 'CUSTOM' ? 'ex: setparam 1001:10' : 'ex: 150000'}
                error={!!errors.parameter}
              />
            </FormField>
          )}

          {isSensitive && (
            <div className="p-4 bg-[var(--clr-danger-dim)] border border-[var(--clr-danger-border)] rounded-xl">
              <div className="flex items-center gap-2 mb-3 text-[var(--clr-danger)] font-semibold text-xs uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4" /> Zone de Danger
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Cette commande peut affecter la sécurité du véhicule. Veuillez justifier cette action.
              </p>
              <FormField label="Motif de l'action" required error={errors.reason?.message as string}>
                <Textarea
                  {...register('reason')}
                  rows={2}
                  placeholder="Ex: Demande de la police, Vol confirmé..."
                  error={!!errors.reason}
                />
              </FormField>
            </div>
          )}
        </div>
      </form>
    );
  }
);
