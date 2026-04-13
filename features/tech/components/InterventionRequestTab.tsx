import React, { useRef, useState, useEffect } from 'react';
import { Navigation, Clock, Phone, MapPin, ChevronDown, Plus } from 'lucide-react';
import type { Intervention, Client, Ticket, CatalogItem, Contract, Vehicle, Device } from '../../../types';
import { Tier } from '../../../types';
import { INTERVENTION_NATURES } from '../constants';
import { useInterventionTypes } from '../../../hooks/useInterventionTypes';
import { useCurrency } from '../../../hooks/useCurrency';

interface InterventionRequestTabProps {
  formData: Partial<Intervention>;
  setFormData: (data: Partial<Intervention>) => void;
  clients: Client[];
  tickets: Ticket[];
  technicians: { id: string; name: string; phone?: string }[];
  catalogItems: CatalogItem[];
  contracts: Contract[];
  availableVehicles: Vehicle[];
  stock: Device[];
  onOpenCreateTicket: () => void;
  getVehicleUpdates: (vehicleId: string) => Partial<Intervention>;
}

export const InterventionRequestTab: React.FC<InterventionRequestTabProps> = ({
  formData,
  setFormData,
  clients,
  tickets,
  technicians,
  catalogItems,
  contracts,
  availableVehicles,
  stock,
  onOpenCreateTicket,
  getVehicleUpdates,
}) => {
  const { formatPrice } = useCurrency();
  const { types: interventionTypes } = useInterventionTypes();
  const [isMaterialMenuOpen, setIsMaterialMenuOpen] = useState(false);
  const materialMenuRef = useRef<HTMLDivElement>(null);

  // Click Outside for Material Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (materialMenuRef.current && !materialMenuRef.current.contains(event.target as Node)) {
        setIsMaterialMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMaterialToggle = (item: string) => {
    const currentMaterials = formData.material || [];
    if (currentMaterials.includes(item)) {
      setFormData({ ...formData, material: currentMaterials.filter((m) => m !== item) });
    } else {
      setFormData({ ...formData, material: [...currentMaterials, item] });
    }
  };

  const hasTracker = () =>
    formData.material?.some(
      (m) => m.includes('FMB') || m.includes('Ruptela') || m.includes('Trace5') || m.includes('Boîtier')
    );
  const hasSim = () => formData.material?.some((m) => m.includes('Carte SIM')) || hasTracker();

  const clientPhone = clients.find((c) => c.name === formData.clientId || c.id === formData.clientId)?.phone || 'N/A';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Informations Générales */}
      <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
        <h4 className="section-title mb-4 flex items-center gap-2">
          <Navigation className="w-4 h-4" /> Informations Générales
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Client */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Client</label>
            <select
              title="Client"
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm font-bold"
              value={formData.clientId || ''}
              onChange={(e) => {
                const cid = e.target.value;
                const client = clients.find((c) => c.id === cid);
                setFormData({
                  ...formData,
                  clientId: cid,
                  ticketId: '',
                  resellerId: client?.resellerId || '',
                  resellerName: client?.resellerName || '',
                });
              }}
            >
              <option value="">-- Sélectionner --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ticket Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
              Ticket Lié <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                title="Ticket"
                className="flex-1 p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
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
                    if (ticket.vehicleId) {
                      const vehicleUpdates = getVehicleUpdates(ticket.vehicleId);
                      updates = { ...updates, ...vehicleUpdates };
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
                      #{(t as any).number || t.id.slice(0, 8)} - {(t as any).title || t.subject} ({t.status})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={onOpenCreateTicket}
                className="p-2.5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors"
                title="Créer un nouveau ticket"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {tickets.filter((t) => t.clientId === formData.clientId && t.status !== 'CLOSED').length === 0 && (
              <p className="text-[10px] text-orange-500">Aucun ticket ouvert pour ce client.</p>
            )}
          </div>

          {/* Téléphone Client */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Téléphone Client</label>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  title="Téléphone Client"
                  type="tel"
                  className="w-full pl-10 p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm text-[var(--text-secondary)]"
                  value={clientPhone}
                  readOnly
                />
              </div>
              {clientPhone !== 'N/A' && (
                <a
                  href={`tel:${clientPhone}`}
                  className="p-2.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Revendeur */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Revendeur</label>
            <input
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm text-[var(--text-secondary)] cursor-not-allowed"
              value={formData.resellerName || 'N/A'}
              readOnly
            />
          </div>

          {/* Contact Sur Site */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Contact Sur Site</label>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  title="Contact Sur Site"
                  type="tel"
                  className="w-full pl-10 p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                  value={formData.contactPhone || ''}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="Nom et N°"
                />
              </div>
              {formData.contactPhone && (
                <a
                  href={`tel:${formData.contactPhone}`}
                  className="p-2.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Technicien */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Technicien</label>
            <select
              title="Technicien"
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              value={formData.technicianId || 'UNASSIGNED'}
              onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
            >
              <option value="UNASSIGNED">-- Non assigné --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Type</label>
            <select
              title="Type"
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              value={formData.type || 'INSTALLATION'}
              onChange={(e) => {
                const val = e.target.value as Intervention['type'];
                setFormData({
                  ...formData,
                  type: val,
                  nature: val === 'INSTALLATION' ? 'Installation' : formData.nature,
                });
              }}
            >
              {interventionTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nature */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Nature</label>
            <select
              title="Nature"
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm disabled:opacity-50 disabled:bg-[var(--bg-elevated)]"
              value={formData.nature || ''}
              onChange={(e) => setFormData({ ...formData, nature: e.target.value as any })}
              disabled={formData.type === 'INSTALLATION'}
            >
              {formData.type === 'INSTALLATION' && <option value="Installation">Installation</option>}
              {INTERVENTION_NATURES.filter((n) => n !== 'Installation').map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Notes</label>
            <textarea
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm min-h-[42px] h-[42px] resize-none"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Notes..."
            />
          </div>
        </div>
      </div>

      {/* Détails Intervention */}
      <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
        <h4 className="section-title mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Détails Intervention
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Plaque / Véhicule */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Plaque / Véhicule</label>
            <select
              title="Plaque / Véhicule"
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm font-mono"
              value={formData.vehicleId || ''}
              onChange={(e) => {
                const updates = getVehicleUpdates(e.target.value);
                setFormData({ ...formData, ...updates });
              }}
            >
              <option value="">-- Sélectionner --</option>
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.id}) {v.client === 'Interne' ? '[STOCK]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Adresse */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Adresse / Lieu</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                title="Adresse / Lieu"
                className="w-full pl-10 p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          {/* Emplacement Physique */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Emplacement Physique</label>
            <div className="flex gap-2">
              <select
                className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                value={
                  ['Tableau de bord', 'Boîte à gants', 'Sous le volant', 'Coffre', 'Moteur'].includes(
                    formData.deviceLocation || ''
                  )
                    ? formData.deviceLocation
                    : 'Autre'
                }
                onChange={(e) => {
                  if (e.target.value === 'Autre') {
                    setFormData({ ...formData, deviceLocation: '' });
                  } else {
                    setFormData({ ...formData, deviceLocation: e.target.value });
                  }
                }}
              >
                <option value="">-- Sélectionner --</option>
                <option value="Tableau de bord">Tableau de bord</option>
                <option value="Boîte à gants">Boîte à gants</option>
                <option value="Sous le volant">Sous le volant</option>
                <option value="Coffre">Coffre</option>
                <option value="Moteur">Moteur</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          {/* Matériel */}
          <div className="space-y-1 relative" ref={materialMenuRef}>
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Matériel à utiliser</label>
            <div
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm cursor-pointer flex justify-between items-center"
              onClick={() => setIsMaterialMenuOpen(!isMaterialMenuOpen)}
            >
              <span className="truncate">
                {formData.material && formData.material.length > 0
                  ? `${formData.material.length} éléments`
                  : 'Sélectionner...'}
              </span>
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            {isMaterialMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto p-2 custom-scrollbar">
                {catalogItems
                  .filter((i) => i.category === 'Matériel')
                  .map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 p-2 hover:bg-[var(--bg-elevated)] rounded cursor-pointer text-sm"
                    >
                      <input
                        title={item.name}
                        type="checkbox"
                        checked={formData.material?.includes(item.name) || false}
                        onChange={() => handleMaterialToggle(item.name)}
                        className="rounded border-[var(--border)] text-[var(--primary)]"
                      />
                      <span className="text-[var(--text-primary)]">{item.name}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>

          {/* Nom du Véhicule */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Nom du Véhicule</label>
            <input
              title="Nom du Véhicule"
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              value={formData.vehicleName || ''}
              onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
              placeholder="Ex: Camion 1"
            />
          </div>

          {/* Plaque WW */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Plaque WW</label>
            <input
              title="Plaque WW"
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm font-mono uppercase"
              value={formData.tempPlate || ''}
              onChange={(e) => setFormData({ ...formData, tempPlate: e.target.value })}
              placeholder="WW-..."
            />
          </div>

          {/* Boîtier GPS */}
          {hasTracker() && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Boîtier GPS (IMEI)</label>
              <input
                list="stock-box"
                className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono"
                value={formData.imei || ''}
                onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                placeholder="IMEI..."
              />
              <datalist id="stock-box">
                {stock
                  .filter((d) => (d.type || 'BOX') === 'BOX' && d.status === 'IN_STOCK')
                  .map((d) => (
                    <option key={d.id} value={d.serialNumber || d.imei || d.iccid}>
                      {d.model} - {d.status}
                    </option>
                  ))}
              </datalist>
            </div>
          )}

          {/* Carte SIM */}
          {hasSim() && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Carte SIM (ICCID)</label>
              <input
                list="stock-sim"
                className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono"
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
                placeholder="ICCID..."
              />
              <datalist id="stock-sim">
                {stock
                  .filter((d) => (d.type || 'BOX') === 'SIM' && d.status === 'IN_STOCK')
                  .map((d) => (
                    <option key={d.id} value={d.iccid || d.serialNumber}>
                      {d.model} - {d.phoneNumber}
                    </option>
                  ))}
              </datalist>
            </div>
          )}
        </div>

        {/* Date/Heure & Durée */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4 border-t border-[var(--border)] border-[var(--border)] pt-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Date & Heure</label>
            <input
              title="Date & Heure"
              type="datetime-local"
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              value={formData.scheduledDate?.slice(0, 16) || ''}
              onChange={(e) => setFormData({ ...formData, scheduledDate: new Date(e.target.value).toISOString() })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Durée (min)</label>
            <input
              title="Durée (min)"
              type="number"
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              value={formData.duration || ''}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Montant</label>
            <input
              type="text"
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono text-[var(--text-secondary)] cursor-not-allowed"
              value={formatPrice(formData.cost || 0)}
              readOnly
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Contrat (Abonnement)</label>
            <select
              className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              value={formData.contractId || ''}
              onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
            >
              <option value="">-- Aucun / Nouveau --</option>
              {contracts
                .filter((c) => c.clientId === formData.clientId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {new Date(c.startDate).toLocaleDateString()} ({c.vehicleCount} v.)
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
