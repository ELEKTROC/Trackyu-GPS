/**
 * Request Tab Partial for InterventionForm
 * Contains: General Information, Client/Ticket Selection, Scheduling
 */

import React from 'react';
import { Navigation, Phone, Clock, MapPin, Plus, Building2 } from 'lucide-react';
import type { Intervention, InterventionNature } from '../../../../types';
import { type Ticket } from '../../../../types';
import { TOAST } from '../../../../constants/toastMessages';
import { INTERVENTION_NATURES } from '../../constants';
import { useInterventionTypes } from '../../../../hooks/useInterventionTypes';
import { useCurrency } from '../../../../hooks/useCurrency';
import { getVehicleUpdates } from '../../hooks/useInterventionForm';
import { FormField, Input, Select } from '../../../../components/form';

interface RequestTabProps {
  formData: Partial<Intervention>;
  setFormData: (data: Partial<Intervention>) => void;
  clients: any[];
  tickets: any[];
  technicians: any[];
  contracts: any[];
  catalogItems: any[];
  availableVehicles: any[];
  allVehicles: any[];
  stock: any[];
  branches: any[];
  user: any;
  hasTracker: () => boolean;
  hasSim: () => boolean;
  onOpenTicketModal: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  initialTicketId?: string | null;
}

export const InterventionRequestTab: React.FC<RequestTabProps> = ({
  formData,
  setFormData,
  clients,
  tickets,
  technicians,
  contracts,
  catalogItems,
  availableVehicles,
  allVehicles,
  stock,
  branches,
  user,
  hasTracker,
  hasSim,
  onOpenTicketModal,
  showToast,
  initialTicketId,
}) => {
  const { formatPrice } = useCurrency();
  const { types: interventionTypes, natures: allNatures } = useInterventionTypes();

  // Find natures for current type
  const currentTypeObj = interventionTypes.find((t) => t.code === (formData.type || 'INSTALLATION'));
  const dynamicNatures = currentTypeObj ? allNatures.filter((n) => n.typeId === currentTypeObj.id) : [];

  // Check if we align strict matching for "Ticket Context"
  // Valid if we are creating (no id) and have an initial ticket ID
  const isTicketLocked = !!initialTicketId && !formData.id;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Row 1: Client & Ticket */}
      <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <h4 className="section-title mb-3 flex items-center gap-2">
          <Navigation className="w-4 h-4" /> Informations Générales
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Client Selection */}
          <FormField label="Client">
            <Select
              title="Client"
              value={formData.clientId || ''}
              onChange={(e) => {
                const cid = e.target.value;
                const client = clients.find((c) => c.id === cid);
                setFormData({
                  ...formData,
                  clientId: cid,
                  ticketId: isTicketLocked ? formData.ticketId : '',
                  resellerId: client?.resellerId || '',
                  resellerName: client?.resellerName || '',
                });
              }}
              disabled={isTicketLocked}
              className="font-bold"
            >
              <option value="">-- Sélectionner --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Ticket Selection */}
          <div className="space-y-1">
            <label className="section-title">Ticket Lié</label>
            {isTicketLocked ? (
              <input
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono text-[var(--text-secondary)] cursor-not-allowed"
                value={(() => {
                  const t = tickets.find((t) => t.id === formData.ticketId);
                  return t ? `#${(t as Ticket & { number?: string }).number || t.id}` : formData.ticketId || 'N/A';
                })()}
                readOnly
              />
            ) : (
              <div className="flex gap-1">
                <select
                  title="Ticket"
                  className="flex-1 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                  value={formData.ticketId || ''}
                  onChange={(e) => {
                    const ticketId = e.target.value;
                    const ticket = tickets.find((t) => t.id === ticketId);
                    let updates: any = {
                      ticketId,
                      location: ticket?.location || formData.location,
                      contactPhone: ticket?.contactPhone || formData.contactPhone,
                    };
                    if (ticket) {
                      if (ticket.interventionType) updates.type = ticket.interventionType;
                      // Récupérer le technicien assigné du ticket
                      if (ticket.assignedTo) updates.technicianId = ticket.assignedTo;
                      // Récupérer le revendeur du ticket
                      if (ticket.resellerId) {
                        updates.resellerId = ticket.resellerId;
                        updates.resellerName = ticket.resellerName || '';
                      }
                      if (ticket.vehicleId) {
                        const vehicleUpdates = getVehicleUpdates(
                          ticket.vehicleId,
                          availableVehicles,
                          stock,
                          formData,
                          contracts
                        );
                        updates = { ...updates, ...vehicleUpdates };
                      }
                      // Mapping description
                      if (ticket.description) {
                        updates.description = ticket.description;
                        updates.notes = ticket.description;
                      }
                    }
                    setFormData({ ...formData, ...updates });
                  }}
                >
                  <option value="">-- Sélectionner un ticket --</option>
                  {tickets
                    .filter((t) => t.clientId === formData.clientId && t.status !== 'CLOSED')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        #{(t as Ticket & { number?: string }).number || t.id} - {t.subject}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.clientId) {
                      showToast(TOAST.VALIDATION.REQUIRED_FIELD('client'), 'error');
                      return;
                    }
                    onOpenTicketModal();
                  }}
                  className="p-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
                  title="Créer ticket"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
            {!isTicketLocked &&
              formData.clientId &&
              tickets.filter((t) => t.clientId === formData.clientId && t.status !== 'CLOSED').length === 0 && (
                <p className="text-[10px] text-orange-500">Aucun ticket ouvert pour ce client.</p>
              )}
          </div>

          {/* Reseller (Read-only) - Enhanced lookup */}
          <div className="space-y-1">
            <label className="section-title">Revendeur</label>
            <input
              className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm text-[var(--text-secondary)]"
              value={(() => {
                // Try formData first, then lookup from client
                if (formData.resellerName) return formData.resellerName;
                const client = clients.find((c) => c.id === formData.clientId);
                return client?.resellerName || 'N/A';
              })()}
              readOnly
            />
          </div>

          {/* Contact Client (Read-only from selected client) */}
          <div className="space-y-1">
            <label className="section-title">Contact Client</label>
            <div className="relative">
              <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                className="w-full pl-8 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm text-[var(--text-secondary)]"
                value={(() => {
                  const client = clients.find((c) => c.id === formData.clientId);
                  return client?.phone || client?.email || 'N/A';
                })()}
                readOnly
                title="Contact principal du client"
              />
            </div>
          </div>

          {/* Type */}
          <FormField label="Type" required>
            <Select
              title="Type"
              value={formData.type || 'INSTALLATION'}
              onChange={(e) => {
                const val = e.target.value as Intervention['type'];
                // Reset nature to first valid for this type
                const firstNature =
                  allNatures.find((n) => n.typeId === interventionTypes.find((t) => t.code === val)?.id)?.label ||
                  'Balise';
                setFormData({ ...formData, type: val, nature: firstNature as InterventionNature });
              }}
              className="font-bold"
            >
              {interventionTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Nature */}
          <FormField label="Nature" required>
            <Select
              title="Nature"
              value={formData.nature || ''}
              onChange={(e) => {
                const val = e.target.value as InterventionNature;
                setFormData({
                  ...formData,
                  nature: val || undefined,
                  removalReason:
                    val === 'Retrait' ||
                    val?.includes('Remplacement') ||
                    ['REMPLACEMENT', 'RETRAIT'].includes(formData.type || '')
                      ? formData.removalReason
                      : undefined,
                });
              }}
              className="font-bold"
            >
              <option value="">-- Sélectionner la nature --</option>
              {dynamicNatures.length > 0
                ? dynamicNatures.map((n) => (
                    <option key={n.id} value={n.label}>
                      {n.label}
                    </option>
                  ))
                : // Fallback to compatible list if dynamic is empty
                  INTERVENTION_NATURES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
            </Select>
          </FormField>

          {/* Technicien */}
          <FormField label="Technicien">
            <Select
              title="Technicien"
              value={formData.technicianId || 'UNASSIGNED'}
              onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
            >
              <option value="UNASSIGNED">-- Non assigné --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Date & Heure */}
          <FormField label="Date & Heure">
            <Input
              title="Date & Heure"
              type="datetime-local"
              value={formData.scheduledDate?.slice(0, 16) || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  scheduledDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                })
              }
            />
          </FormField>

          {/* Adresse / Lieu */}
          <div className="space-y-1">
            <label className="section-title">Adresse / Lieu</label>
            <div className="relative">
              <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                title="Adresse / Lieu"
                className="w-full pl-8 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          {/* Contact Sur Site - Name */}
          <div className="space-y-1">
            <label className="section-title">Nom Contact Sur Site</label>
            <div className="relative">
              <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                title="Nom Contact Sur Site"
                type="text"
                className="w-full pl-8 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                value={formData.siteContactName || ''}
                onChange={(e) => setFormData({ ...formData, siteContactName: e.target.value })}
                placeholder="Nom de la personne"
              />
            </div>
          </div>

          {/* Contact Sur Site - Phone */}
          <div className="space-y-1">
            <label className="section-title">Tél Contact Sur Site</label>
            <div className="relative">
              <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                title="Tél Contact Sur Site"
                type="tel"
                className="w-full pl-8 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                value={formData.siteContactPhone || ''}
                onChange={(e) => setFormData({ ...formData, siteContactPhone: e.target.value })}
                placeholder="Numéro de téléphone"
              />
            </div>
          </div>

          {/* Description */}
          <FormField label="Description" className="lg:col-span-2">
            <Input
              value={formData.description || formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value, notes: e.target.value })}
              placeholder="Description de l'intervention (sera pré-remplie par le ticket)..."
            />
          </FormField>
        </div>

        {/* Motif du Retrait (Conditional) - Full width */}
        {((formData.nature as string) === 'Retrait' || (formData.type as string) === 'RETRAIT') && (
          <div className="mt-4 p-3 bg-[var(--clr-danger-dim)] rounded-lg border border-[var(--clr-danger-border)]">
            <label className="text-xs font-bold text-[var(--clr-danger)] uppercase mb-2 block">
              Motif du Retrait <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full max-w-md p-2 border border-[var(--clr-danger-border)] rounded-lg bg-[var(--bg-surface)] text-sm font-bold"
              value={formData.removalReason || ''}
              onChange={(e) => {
                const reason = e.target.value;
                const shouldRemoveContract = reason === 'FIN_CONTRAT' || reason === 'RETRAIT_SIMPLE';
                // Auto-derive material status and contract removal from reason
                const materialStatus = reason === 'SAV_REMPLACEMENT' ? 'FAULTY' : 'FUNCTIONAL';
                setFormData({
                  ...formData,
                  removalReason: reason,
                  removedMaterialStatus: materialStatus as Intervention['removedMaterialStatus'],
                  removeFromContract: shouldRemoveContract,
                  contractRemovalReason: shouldRemoveContract
                    ? reason === 'FIN_CONTRAT'
                      ? 'Fin de contrat / Désabonnement'
                      : 'Retrait simple'
                    : '',
                });
              }}
              required
            >
              <option value="">-- Pourquoi retirer ? --</option>
              <option value="SAV_REMPLACEMENT">SAV / Défectueux (Matériel en panne)</option>
              <option value="FIN_CONTRAT">Fin de contrat / Désabonnement</option>
              <option value="RETRAIT_SIMPLE">Retrait simple (ex: Vente véhicule)</option>
              <option value="UPGRADE">Mise à jour (Upgrade matériel)</option>
            </select>
            {formData.removalReason && (
              <p className="text-[10px] text-red-500 mt-2">
                {formData.removalReason === 'SAV_REMPLACEMENT' && '→ Matériel marqué Défectueux (SAV)'}
                {formData.removalReason === 'FIN_CONTRAT' && '→ Véhicule retiré du contrat automatiquement'}
                {formData.removalReason === 'RETRAIT_SIMPLE' && '→ Véhicule retiré du contrat automatiquement'}
                {formData.removalReason === 'UPGRADE' && '→ Matériel marqué Fonctionnel (Retour Stock)'}
              </p>
            )}
          </div>
        )}

        {/* Motif du Remplacement (Conditional) */}
        {formData.nature?.includes('Remplacement') && (
          <div className="mt-4 p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg border border-[var(--border)] dark:border-[var(--primary)]">
            <label className="text-xs font-bold text-[var(--primary)] dark:text-[var(--primary)] uppercase mb-2 block">
              Motif du Remplacement <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full max-w-md p-2 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm font-bold"
              value={formData.removalReason || ''}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  removalReason: e.target.value,
                });
              }}
              required
            >
              <option value="">-- Pourquoi remplacer ? --</option>
              <option value="SAV_REMPLACEMENT">SAV / Défectueux</option>
              <option value="UPGRADE">Mise à jour (Upgrade matériel)</option>
            </select>
          </div>
        )}
      </div>

      {/* Row 2: Intervention Details */}
      <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <h4 className="section-title mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Détails Intervention
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vehicle */}
          <FormField label="Sélection Matériel / Véhicule">
            <Select
              title="Sélection Matériel / Véhicule"
              className="font-mono"
              value={formData.vehicleId || ''}
              onChange={(e) => {
                const updates = getVehicleUpdates(e.target.value, availableVehicles, stock, formData, contracts);
                setFormData({ ...formData, ...updates });
                if (updates.imei) showToast(TOAST.FLEET.MATERIAL_DETECTED(updates.imei), 'info');
              }}
            >
              <option value="">-- Sélectionner --</option>
              {formData.type === 'INSTALLATION' ? (
                <>
                  <optgroup label="En Stock">
                    {stock
                      .filter(
                        (s) =>
                          s.status === 'IN_STOCK' && s.location === 'TECH' && s.technicianId === formData.technicianId
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          Boîtier {s.model || 'GPS'} (IMEI: {s.imei || s.serialNumber})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Client">
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate || v.name} (IMEI actuel: {v.imei || 'Aucun'})
                      </option>
                    ))}
                  </optgroup>
                </>
              ) : (
                <optgroup label="Client">
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate || v.name} (IMEI: {v.imei || 'Aucun'})
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </FormField>

          {/* Branche */}
          <FormField label="Branche">
            <Select
              value={formData.branchId || ''}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
            >
              <option value="">-- Sélectionner --</option>
              {branches
                .filter((b) =>
                  formData.clientId ? b.clientId === formData.clientId || b.client_id === formData.clientId : true
                )
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </Select>
          </FormField>

          {/* Vehicle Name */}
          <FormField label="Nom du Véhicule">
            <Input
              title="Nom du Véhicule"
              value={formData.vehicleName || ''}
              onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
              placeholder="Ex: Camion 1"
            />
          </FormField>

          {/* Definitive License Plate */}
          <FormField label="Plaque d'Immatriculation">
            <Input
              title="Plaque d'Immatriculation"
              className="font-mono uppercase font-bold text-[var(--primary)]"
              value={formData.licensePlate || ''}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
              placeholder="Ex: 1234 AB 01"
            />
          </FormField>

          {/* Temp Plate */}
          <FormField label="Plaque WW">
            <Input
              title="Plaque WW"
              className="font-mono uppercase"
              value={formData.tempPlate || ''}
              onChange={(e) => setFormData({ ...formData, tempPlate: e.target.value })}
              placeholder="WW-..."
            />
          </FormField>

          {/* Tracker IMEI (conditional) */}
          {hasTracker() && (
            <div className="space-y-1">
              <label className="section-title">
                {(() => {
                  const nature = (formData.nature as string) || '';
                  if (nature === 'Retrait' || formData.type === 'RETRAIT') return 'Boîtier à Retirer';
                  if (nature === 'Transfert' || formData.type === 'TRANSFERT') return 'Boîtier à Transférer';
                  if (nature === 'Réinstallation' || formData.type === 'REINSTALLATION') return 'Boîtier à Réinstaller';
                  if (nature.includes('Remplacement') || formData.type === 'REMPLACEMENT')
                    return 'Nouveau Boîtier (IMEI)';
                  return 'Boîtier GPS (IMEI)';
                })()}
              </label>
              <div className="relative">
                {formData.type === 'TRANSFERT' ||
                formData.type === 'RETRAIT' ||
                formData.type === 'REINSTALLATION' ||
                (formData.nature as string) === 'Transfert' ||
                (formData.nature as string) === 'Retrait' ||
                (formData.nature as string) === 'Réinstallation' ? (
                  /* Transfert / Retrait / Réinstallation: même balise, lecture seule */
                  <input
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono text-[var(--text-secondary)] cursor-not-allowed"
                    value={formData.imei || 'Sélectionnez un véhicule pour détecter la balise'}
                    readOnly
                  />
                ) : formData.type === 'REMPLACEMENT' || (formData.nature as string)?.includes('Remplacement') ? (
                  <select
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono"
                    value={formData.imei || ''}
                    onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                  >
                    <option value="">-- Conserver l'ancien ou Sélectionner Nouveau --</option>
                    {stock
                      .filter((d) => (d.type || 'BOX') === 'BOX')
                      .filter(
                        (d) =>
                          d.location === 'TECH' && d.technicianId === formData.technicianId && d.status === 'IN_STOCK'
                      )
                      .map((d) => (
                        <option key={d.id} value={d.serialNumber || d.imei || d.iccid}>
                          Boîtier {d.model} (IMEI: {d.imei || d.serialNumber})
                        </option>
                      ))}
                  </select>
                ) : (
                  <>
                    <input
                      list="stock-box"
                      className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono"
                      value={formData.imei || ''}
                      onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                      placeholder="IMEI..."
                    />
                    <datalist id="stock-box">
                      {stock
                        .filter((d) => (d.type || 'BOX') === 'BOX')
                        .filter((d) => {
                          if (formData.technicianId && formData.technicianId !== 'UNASSIGNED') {
                            if (d.location === 'TECH' && d.technicianId !== formData.technicianId) return false;
                          }
                          return (
                            d.status === 'IN_STOCK' ||
                            (d.location === 'TECH' && d.technicianId === formData.technicianId)
                          );
                        })
                        .map((d) => (
                          <option key={d.id} value={d.serialNumber || d.imei || d.iccid}>
                            {d.model} - {d.status} {d.assignedVehicleId ? `(${d.assignedVehicleId})` : ''}
                          </option>
                        ))}
                    </datalist>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Old Device (for Replacement) */}
          {formData.nature?.includes('Remplacement') && hasTracker() && (
            <div className="space-y-1">
              <label className="section-title">Ancien Boîtier</label>
              <input
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono text-[var(--text-secondary)]"
                value={formData.oldDeviceImei || 'Non détecté'}
                readOnly
              />
            </div>
          )}

          {/* Removed Material Status - only for Remplacement */}
          {formData.nature?.includes('Remplacement') && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase text-orange-600">
                État Matériel Retiré
              </label>
              <select
                className="w-full p-2 border border-[var(--clr-warning-border)] rounded-lg bg-[var(--clr-warning-dim)] text-sm font-bold text-orange-800 dark:text-orange-200"
                value={formData.removedMaterialStatus || 'UNKNOWN'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    removedMaterialStatus: e.target.value as Intervention['removedMaterialStatus'],
                  })
                }
              >
                <option value="UNKNOWN">-- Sélectionner --</option>
                <option value="FUNCTIONAL">Fonctionnel (Retour Stock)</option>
                <option value="FAULTY">Défectueux (SAV)</option>
                <option value="DAMAGED">Endommagé / Cassé</option>
              </select>
            </div>
          )}

          {/* Transfer Target Fields */}
          {(formData.type === 'TRANSFERT' || (formData.nature as string) === 'Transfert') && (
            <>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold text-purple-600 uppercase flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> Nouvelle Plaque d'Immatriculation{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-[var(--clr-info-border)] rounded-lg bg-[var(--clr-info-dim)] text-sm font-bold font-mono uppercase text-purple-800 dark:text-purple-200"
                  value={formData.newLicensePlate || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      newLicensePlate: e.target.value.toUpperCase(),
                      targetPlate: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Ex: 1234 AB 01"
                  required
                />
                <p className="text-[10px] text-purple-500">
                  La plaque du véhicule sera mise à jour avec cette nouvelle immatriculation.
                </p>
              </div>
            </>
          )}

          {/* SIM Card Fields */}
          {hasSim() && (
            <>
              <div className="space-y-1">
                <label className="section-title">
                  {formData.nature?.includes('Remplacement') ? 'Nouvelle Carte SIM (ICCID)' : 'Carte SIM (ICCID)'}
                </label>
                <div className="relative">
                  {['Retrait', 'Transfert', 'Réinstallation'].includes(formData.nature || '') ||
                  (formData.nature || '').includes('Remplacement') ? (
                    /* Retrait / Transfert / Réinstallation: même SIM, lecture seule */
                    <input
                      className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono text-[var(--text-secondary)] cursor-not-allowed"
                      value={formData.iccid || 'Auto-détectée depuis le véhicule'}
                      readOnly
                    />
                  ) : formData.nature?.includes('Remplacement') ? (
                    <select
                      className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono"
                      value={formData.iccid || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const sim = stock.find((s) => s.type === 'SIM' && (s.iccid === val || s.serialNumber === val));
                        setFormData({
                          ...formData,
                          iccid: val,
                          simCard: sim ? sim.phoneNumber || '' : formData.simCard,
                        });
                      }}
                    >
                      <option value="">-- Conserver l'ancienne ou Sélectionner Nouvelle --</option>
                      {stock
                        .filter((d) => (d.type || 'BOX') === 'SIM')
                        .filter(
                          (d) =>
                            d.location === 'TECH' && d.technicianId === formData.technicianId && d.status === 'IN_STOCK'
                        )
                        .map((d) => (
                          <option key={d.id} value={d.iccid || d.serialNumber}>
                            SIM {d.model} - {d.phoneNumber} (ICCID: {d.iccid || d.serialNumber})
                          </option>
                        ))}
                    </select>
                  ) : (
                    <>
                      <input
                        list="stock-sim"
                        className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono"
                        value={formData.iccid || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const sim = stock.find(
                            (s) => s.type === 'SIM' && (s.iccid === val || s.serialNumber === val)
                          );
                          setFormData({
                            ...formData,
                            iccid: val,
                            simCard: sim ? sim.phoneNumber || '' : formData.simCard,
                          });
                        }}
                        placeholder="ICCID..."
                      />
                      <datalist id="stock-sim">
                        {stock
                          .filter((d) => (d.type || 'BOX') === 'SIM')
                          .filter((d) => {
                            // Filtrer par technicien assigné à l'intervention
                            if (formData.technicianId && formData.technicianId !== 'UNASSIGNED') {
                              if (d.location === 'TECH' && d.technicianId !== formData.technicianId) return false;
                            }
                            return (
                              d.status === 'IN_STOCK' ||
                              (d.location === 'TECH' && d.technicianId === formData.technicianId)
                            );
                          })
                          .map((d) => (
                            <option key={d.id} value={d.iccid || d.serialNumber}>
                              {d.model} - {d.phoneNumber}
                            </option>
                          ))}
                      </datalist>
                    </>
                  )}
                </div>
              </div>

              {formData.nature?.includes('Remplacement') && (
                <div className="space-y-1">
                  <label className="section-title">Ancienne SIM</label>
                  <input
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono text-[var(--text-secondary)]"
                    value={formData.oldSimId || 'Non détectée'}
                    readOnly
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="section-title">N° Tel SIM</label>
                <div className="relative">
                  <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    title="Numéro de Téléphone"
                    className="w-full pl-8 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono text-[var(--text-secondary)]"
                    value={formData.simCard || ''}
                    readOnly
                    placeholder="06..."
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Scheduling Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 border-t border-[var(--border)] border-[var(--border)] pt-4">
          <FormField label="Durée (min)">
            <Input
              title="Durée (min)"
              type="number"
              value={formData.duration || ''}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            />
          </FormField>
          <FormField label="Montant">
            <Input
              type="text"
              className="font-mono text-[var(--text-secondary)] bg-[var(--bg-elevated)]"
              value={formatPrice(formData.cost || 0)}
              readOnly
              placeholder="0"
            />
          </FormField>
          <FormField label="Contrat (Abonnement)">
            <Select
              value={formData.contractId || ''}
              onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
              disabled={!!formData.contractId}
            >
              <option value="">-- Aucun / Nouveau --</option>
              {contracts
                .filter((c) => c.clientId === formData.clientId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {new Date(c.startDate).toLocaleDateString('fr-FR')} ({c.vehicleCount} v.)
                  </option>
                ))}
            </Select>
          </FormField>
        </div>
      </div>
    </div>
  );
};
