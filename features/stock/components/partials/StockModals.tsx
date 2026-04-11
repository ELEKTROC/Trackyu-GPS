import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Modal } from '../../../../components/Modal';
import type { DeviceStock, Vehicle, CatalogItem, Tier, SystemUser } from '../../../../types';

type DeviceStockForm = Partial<DeviceStock> & { customModel?: string };

// ============================================================================
// ADD DEVICE MODAL
// ============================================================================
interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  newItem: DeviceStockForm;
  setNewItem: (item: DeviceStockForm) => void;
  catalogItems: CatalogItem[];
  deviceModels: { id: string; brand: string; model: string }[];
  tiers: Tier[];
  onSave: () => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  newItem,
  setNewItem,
  catalogItems,
  deviceModels,
  tiers,
  onSave,
}) => {
  // Label contextuel selon le type
  const productLabel = newItem.type === 'SIM' ? 'Opérateur' : newItem.type === 'BOX' ? 'Modèle GPS' : 'Produit';

  const selectClass =
    'w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajouter un équipement"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors"
          >
            Ajouter
          </button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Type</label>
          <select
            value={newItem.type}
            onChange={(e) =>
              setNewItem({ ...newItem, type: e.target.value as DeviceStock['type'], model: '', operator: '' })
            }
            className={selectClass}
          >
            <option value="BOX">Boîtier GPS</option>
            <option value="SIM">Carte SIM</option>
            <option value="SENSOR">Capteur</option>
            <option value="ACCESSORY">Accessoire</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Revendeur (Propriétaire)</label>
          <select
            value={newItem.resellerId || ''}
            onChange={(e) => {
              const selected = tiers.find((t) => t.id === e.target.value);
              setNewItem({
                ...newItem,
                resellerId: e.target.value,
                resellerName: selected?.name || '',
              });
            }}
            className={selectClass}
          >
            <option value="">-- Sélectionner --</option>
            {tiers
              .filter((t) => t.type === 'RESELLER')
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">{productLabel}</label>
            {newItem.type === 'SIM' ? (
              /* SIM → Opérateur */
              <select
                value={newItem.operator || ''}
                onChange={(e) => setNewItem({ ...newItem, operator: e.target.value, model: 'Carte SIM' })}
                className={selectClass}
              >
                <option value="">Choisir...</option>
                <option value="Orange">Orange</option>
                <option value="MTN">MTN</option>
                <option value="Maroc Telecom">Maroc Telecom</option>
                <option value="Inwi">Inwi</option>
              </select>
            ) : newItem.type === 'BOX' ? (
              /* BOX → Modèles GPS (TechSettings) */
              <select
                value={newItem.model || ''}
                onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                className={selectClass}
              >
                <option value="">-- Sélectionner un modèle --</option>
                {deviceModels.map((dm) => (
                  <option key={dm.id} value={`${dm.brand} ${dm.model}`}>
                    {dm.brand} {dm.model}
                  </option>
                ))}
                <option value="OTHER">Autre (Saisie manuelle)</option>
              </select>
            ) : (
              /* SENSOR / ACCESSORY → Produits catalogue Matériel */
              <select
                value={newItem.model || ''}
                onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                className={selectClass}
              >
                <option value="">-- Sélectionner un produit --</option>
                {catalogItems
                  .filter((i) => i.category === 'Matériel')
                  .map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                <option value="OTHER">Autre (Saisie manuelle)</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {newItem.type === 'BOX' ? 'IMEI' : newItem.type === 'SIM' ? 'ICCID' : 'Numéro de Série'}
            </label>
            <input
              type="text"
              value={newItem.serialNumber || ''}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  serialNumber: e.target.value,
                  imei: newItem.type === 'BOX' ? e.target.value : undefined,
                  iccid: newItem.type === 'SIM' ? e.target.value : undefined,
                })
              }
              className={selectClass}
              placeholder={
                newItem.type === 'BOX' ? 'Ex: 860012345678901' : newItem.type === 'SIM' ? 'Ex: 8933...' : 'Ex: SN-001'
              }
            />
          </div>
        </div>

        {/* Champ saisie libre quand "Autre" est sélectionné */}
        {newItem.model === 'OTHER' && newItem.type !== 'SIM' && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nom personnalisé</label>
            <input
              type="text"
              value={newItem.customModel || ''}
              onChange={(e) => setNewItem({ ...newItem, customModel: e.target.value })}
              className={selectClass}
              placeholder="Saisir le nom du modèle ou produit..."
            />
          </div>
        )}

        {newItem.type === 'SIM' && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Numéro de Téléphone (MSISDN)
            </label>
            <input
              type="text"
              value={newItem.phoneNumber || ''}
              onChange={(e) => setNewItem({ ...newItem, phoneNumber: e.target.value })}
              className={selectClass}
              placeholder="Ex: 0612345678"
            />
          </div>
        )}

        {newItem.type === 'SIM' && newItem.operator && (
          <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg border border-[var(--primary)] dark:border-[var(--primary)]">
            <h4 className="text-xs font-bold text-[var(--primary)] dark:text-[var(--primary)] mb-1">
              Configuration APN Détectée
            </h4>
            <div className="text-xs text-[var(--text-secondary)] font-mono">
              {newItem.operator === 'Orange'
                ? 'APN: orangecidata (User: data, Pass: data)'
                : newItem.operator === 'MTN'
                  ? 'APN: web.mtn.ci (User: web, Pass: web)'
                  : newItem.operator === 'Maroc Telecom'
                    ? 'APN: internet1 (User: vide, Pass: vide)'
                    : newItem.operator === 'Inwi'
                      ? 'APN: inwi (User: vide, Pass: vide)'
                      : 'APN Standard (internet)'}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Statut</label>
          <select
            value={newItem.status}
            onChange={(e) => setNewItem({ ...newItem, status: e.target.value as DeviceStock['status'] })}
            className={selectClass}
          >
            <option value="IN_STOCK">En Stock</option>
            <option value="INSTALLED">Installé</option>
            <option value="RMA">RMA</option>
            <option value="LOST">Perdu</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Notes</label>
          <textarea
            value={newItem.notes || ''}
            onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
            className={selectClass + ' resize-none'}
            rows={2}
            placeholder="Remarques, numéro de lot, fournisseur..."
          />
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// ASSIGN MODAL
// ============================================================================
interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: DeviceStock | null;
  selectedClientForAssign: string;
  setSelectedClientForAssign: (id: string) => void;
  selectedVehicleForAssign: string;
  setSelectedVehicleForAssign: (id: string) => void;
  vehicles: Vehicle[];
  stock: DeviceStock[];
  clients: { id: string; name: string; tenantId?: string }[];
  onConfirm: () => void;
}

export const AssignModal: React.FC<AssignModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  selectedClientForAssign,
  setSelectedClientForAssign,
  selectedVehicleForAssign,
  setSelectedVehicleForAssign,
  vehicles,
  stock,
  clients,
  onConfirm,
}) => {
  const [clientSearch, setClientSearch] = useState('');

  // Filter vehicles by selected client
  const clientVehicles = React.useMemo(() => {
    if (!selectedClientForAssign) return [];
    const client = clients.find((c) => c.id === selectedClientForAssign);
    if (!client) return [];
    return vehicles.filter((v) => {
      if (v.clientId === selectedClientForAssign) return true;
      if (v.client === selectedClientForAssign) return true;
      if (v.client === client.name) return true;
      return false;
    });
  }, [selectedClientForAssign, vehicles, clients]);

  // Filtered clients for search
  const filteredClients = React.useMemo(() => {
    if (!clientSearch) return clients.slice(0, 50);
    return clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 50);
  }, [clients, clientSearch]);

  const isSim = selectedItem?.type === 'SIM';
  const isValid = isSim ? !!selectedVehicleForAssign : !!selectedClientForAssign;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSim ? 'Lier à un Boîtier GPS' : 'Assigner à un Client'}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={!isValid}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Valider
          </button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        {isSim ? (
          /* SIM → Boîtier */
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Sélectionner le Boîtier</label>
            <select
              value={selectedVehicleForAssign}
              onChange={(e) => setSelectedVehicleForAssign(e.target.value)}
              className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
            >
              <option value="">-- Sélectionner --</option>
              {stock
                .filter((s) => s.type === 'BOX')
                .map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.model} - {box.imei} {box.simCardId ? '(SIM existante)' : ''}
                  </option>
                ))}
            </select>
          </div>
        ) : (
          /* BOX / ACCESSORY / SENSOR → Client + Véhicule */
          <>
            {/* Étape 1: Client */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] mb-1"
              />
              <select
                value={selectedClientForAssign}
                onChange={(e) => {
                  setSelectedClientForAssign(e.target.value);
                  setSelectedVehicleForAssign(''); // Reset vehicle when client changes
                }}
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                size={Math.min(filteredClients.length + 1, 8)}
              >
                <option value="">-- Sélectionner un client --</option>
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Étape 2: Véhicule (optionnel, filtré par client) */}
            {selectedClientForAssign && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Véhicule <span className="text-xs text-[var(--text-muted)]">(optionnel)</span>
                </label>
                <select
                  value={selectedVehicleForAssign}
                  onChange={(e) => setSelectedVehicleForAssign(e.target.value)}
                  className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                >
                  <option value="">
                    {clientVehicles.length === 0 ? 'Aucun véhicule — création auto' : '-- Sélectionner un véhicule --'}
                  </option>
                  {clientVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plate || v.licensePlate || 'N/A'})
                    </option>
                  ))}
                </select>
                {clientVehicles.length === 0 && (
                  <p className="text-xs text-[var(--primary)] mt-1">
                    Un véhicule sera créé automatiquement lors de l'assignation.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

// ============================================================================
// TRANSFER MODAL
// ============================================================================
interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  transferTarget: 'CENTRAL' | 'SIEGE' | 'TECH';
  selectedTechId: string;
  setSelectedTechId: (id: string) => void;
  users: SystemUser[];
  onConfirm: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  transferTarget,
  selectedTechId,
  setSelectedTechId,
  users,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transférer le stock"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors"
          >
            Confirmer le transfert
          </button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Vous allez transférer <strong>{selectedIds.size}</strong> élément(s) vers{' '}
          <strong>
            {transferTarget === 'TECH' ? 'un Technicien' : transferTarget === 'SIEGE' ? 'le Siège' : 'le Dépôt Central'}
          </strong>
          .
        </p>

        {transferTarget === 'TECH' && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Sélectionner le technicien
            </label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
            >
              <option value="">Choisir...</option>
              {users
                .filter((u) => u.role.toLowerCase().includes('technicien') || u.role === 'TECH')
                .map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ============================================================================
// BULK IMPORT MODAL
// ============================================================================
interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulkImportPreview: any[];
  onDownloadTemplate: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  bulkImportPreview,
  onDownloadTemplate,
  onFileUpload,
  onImport,
  fileInputRef,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import en bloc"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onImport}
            disabled={bulkImportPreview.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Importer {bulkImportPreview.length} élément(s)
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-lg p-4">
          <h4 className="font-bold text-[var(--primary)] dark:text-[var(--primary)] mb-2">Instructions</h4>
          <ol className="text-sm text-[var(--primary)] dark:text-[var(--primary)] space-y-1 list-decimal list-inside">
            <li>Téléchargez le template CSV ci-dessous</li>
            <li>Remplissez les données (1 ligne = 1 équipement)</li>
            <li>Importez le fichier complété</li>
          </ol>
          <button
            onClick={onDownloadTemplate}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] text-white text-sm rounded-lg hover:bg-[var(--primary-light)]"
          >
            <Download className="w-4 h-4" /> Télécharger le template
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Fichier CSV</label>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.txt"
            onChange={onFileUpload}
            className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[var(--primary-dim)] file:text-[var(--primary)] hover:file:bg-[var(--primary-dim)]"
          />
        </div>

        {bulkImportPreview.length > 0 && (
          <div>
            <h4 className="font-bold text-[var(--text-primary)] mb-2">Aperçu ({bulkImportPreview.length} lignes)</h4>
            <div className="max-h-48 overflow-auto border border-[var(--border)] rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-[var(--bg-elevated)] sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Ligne</th>
                    <th className="px-2 py-1 text-left">Type</th>
                    <th className="px-2 py-1 text-left">IMEI/ICCID</th>
                    <th className="px-2 py-1 text-left">Modèle</th>
                    <th className="px-2 py-1 text-left">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {bulkImportPreview.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="tr-hover">
                      <td className="px-2 py-1">{item._row}</td>
                      <td className="px-2 py-1">{item.type || 'BOX'}</td>
                      <td className="px-2 py-1 font-mono">{item.imei || item.iccid || '-'}</td>
                      <td className="px-2 py-1">{item.model || '-'}</td>
                      <td className="px-2 py-1">{item.status || 'IN_STOCK'}</td>
                    </tr>
                  ))}
                  {bulkImportPreview.length > 10 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-1 text-center text-[var(--text-secondary)]">
                        ... et {bulkImportPreview.length - 10} autres lignes
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ============================================================================
// EDIT DEVICE MODAL
// ============================================================================
interface EditDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DeviceStock | null;
  catalogItems: CatalogItem[];
  tiers: Tier[];
  deviceModels: { id: string; brand: string; model: string }[];
  vehicles: { id: string; name: string; plate: string }[];
  allDevices: DeviceStock[];
  onSave: (updated: DeviceStock) => void;
}

export const EditDeviceModal: React.FC<EditDeviceModalProps> = ({
  isOpen,
  onClose,
  item,
  catalogItems: _catalogItems,
  tiers,
  deviceModels,
  vehicles,
  allDevices,
  onSave,
}) => {
  const [editData, setEditData] = useState<Partial<DeviceStock>>({});

  useEffect(() => {
    if (item) setEditData({ ...item });
  }, [item]);

  if (!item) return null;

  const handleSave = () => {
    onSave({ ...item, ...editData } as DeviceStock);
  };

  // Resolve names for read-only fields
  const clientName = item.client || tiers.find((t) => t.id === item.assignedClientId)?.name || '-';
  const vehicleLabel = item.vehiclePlate
    ? `${item.vehicleName || ''} (${item.vehiclePlate})`.trim()
    : item.vehicleName || vehicles.find((v) => v.id === item.assignedVehicleId)?.name || '-';
  const resellerName = item.resellerName || tiers.find((t) => t.id === item.resellerId)?.name || '-';
  const statusLabels: Record<string, string> = {
    IN_STOCK: 'En Stock',
    INSTALLED: 'Installé',
    RMA_PENDING: 'SAV: Attente',
    SENT_TO_SUPPLIER: 'Chez Fournisseur',
    REMOVED: 'Retiré',
    LOST: 'Perdu',
    SCRAPPED: 'Rebut',
  };

  // Find linked SIM
  const linkedSim =
    item.type === 'BOX'
      ? allDevices.find(
          (d) => d.type === 'SIM' && d.assignedVehicleId === item.assignedVehicleId && item.assignedVehicleId
        )
      : null;

  const readOnlyClass =
    'w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] cursor-not-allowed';
  const editableClass =
    'w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modifier l'équipement"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors"
          >
            Enregistrer
          </button>
        </>
      }
    >
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Row 1: Type (RO) + Statut (RO) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Type</label>
            <input
              type="text"
              value={
                editData.type === 'BOX' ? 'Boîtier GPS' : editData.type === 'SIM' ? 'Carte SIM' : editData.type || ''
              }
              disabled
              className={readOnlyClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Statut</label>
            <input
              type="text"
              value={statusLabels[editData.status || ''] || editData.status || '-'}
              disabled
              className={readOnlyClass}
            />
          </div>
        </div>

        {/* Row 2: Modèle/Opérateur (editable) + IMEI/ICCID (editable) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {editData.type === 'SIM' ? 'Opérateur' : 'Modèle'}
            </label>
            {editData.type === 'SIM' ? (
              <select
                value={editData.operator || ''}
                onChange={(e) => setEditData({ ...editData, operator: e.target.value })}
                className={editableClass}
              >
                <option value="">Choisir...</option>
                <option value="Maroc Telecom">Maroc Telecom</option>
                <option value="Orange">Orange</option>
                <option value="Inwi">Inwi</option>
                <option value="MTN">MTN</option>
              </select>
            ) : (
              <select
                value={editData.model || ''}
                onChange={(e) => setEditData({ ...editData, model: e.target.value })}
                className={editableClass}
              >
                <option value="">-- Choisir un modèle --</option>
                {deviceModels.map((dm) => (
                  <option key={dm.id} value={`${dm.brand} ${dm.model}`}>
                    {dm.brand} {dm.model}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {editData.type === 'BOX' ? 'IMEI' : editData.type === 'SIM' ? 'ICCID' : 'Numéro de Série'}
            </label>
            <input
              type="text"
              value={
                editData.type === 'BOX'
                  ? editData.imei || ''
                  : editData.type === 'SIM'
                    ? editData.iccid || ''
                    : editData.serialNumber || ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (editData.type === 'BOX') setEditData({ ...editData, imei: val, serialNumber: val });
                else if (editData.type === 'SIM') setEditData({ ...editData, iccid: val, serialNumber: val });
                else setEditData({ ...editData, serialNumber: val });
              }}
              className={editableClass}
            />
          </div>
        </div>

        {/* Row 3: MSISDN (SIM only, editable) */}
        {editData.type === 'SIM' && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Numéro de Téléphone (MSISDN)
            </label>
            <input
              type="text"
              value={editData.phoneNumber || ''}
              onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
              className={editableClass}
              placeholder="Ex: 0612345678"
            />
          </div>
        )}

        {/* Separator */}
        <div className="border-t border-[var(--border)] pt-3">
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3">Informations d'affectation</p>
        </div>

        {/* Row 4: Client (RO) + Affectation/Véhicule (RO) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Client</label>
            <input type="text" value={clientName} disabled className={readOnlyClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Affectation (Véhicule)</label>
            <input type="text" value={vehicleLabel} disabled className={readOnlyClass} />
          </div>
        </div>

        {/* Row 5: Revendeur (RO) + SIM liée (RO, BOX only) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Revendeur</label>
            <input type="text" value={resellerName} disabled className={readOnlyClass} />
          </div>
          {editData.type === 'BOX' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">SIM liée</label>
              <input
                type="text"
                value={linkedSim ? `${linkedSim.phoneNumber || linkedSim.iccid || linkedSim.serialNumber}` : '-'}
                disabled
                className={readOnlyClass}
              />
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-[var(--border)] pt-3">
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3">Dates</p>
        </div>

        {/* Row 6: Dates */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Date d'entrée</label>
            <input
              type="text"
              value={editData.entryDate ? new Date(editData.entryDate).toLocaleDateString('fr-FR') : '-'}
              disabled
              className={readOnlyClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Date d'installation</label>
            <input
              type="date"
              value={editData.installationDate ? editData.installationDate.split('T')[0] : ''}
              onChange={(e) => setEditData({ ...editData, installationDate: e.target.value || undefined })}
              className={editableClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Date de sortie</label>
            <input
              type="date"
              value={editData.removalDate ? editData.removalDate.split('T')[0] : ''}
              onChange={(e) => setEditData({ ...editData, removalDate: e.target.value || undefined })}
              className={editableClass}
            />
          </div>
        </div>

        {/* Notes (editable) */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Notes</label>
          <textarea
            value={editData.notes || ''}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            rows={3}
            className={editableClass}
            placeholder="Notes internes..."
          />
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// INDIVIDUAL TRANSFER MODAL
// ============================================================================
interface IndividualTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DeviceStock | null;
  users: SystemUser[];
  onConfirm: (target: 'CENTRAL' | 'SIEGE' | 'TECH', techId?: string) => void;
}

export const IndividualTransferModal: React.FC<IndividualTransferModalProps> = ({
  isOpen,
  onClose,
  item,
  users,
  onConfirm,
}) => {
  const [target, setTarget] = useState<'CENTRAL' | 'SIEGE' | 'TECH'>('CENTRAL');
  const [selectedTechId, setSelectedTechId] = useState('');

  if (!item) return null;

  const identifier = item.imei || item.iccid || item.serialNumber || item.id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transférer l'équipement"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(target, target === 'TECH' ? selectedTechId : undefined)}
            disabled={target === 'TECH' && !selectedTechId}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirmer le transfert
          </button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Transférer <strong className="text-[var(--text-primary)]">{identifier}</strong> ({item.model})
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          Localisation actuelle :{' '}
          <strong>
            {item.location === 'TECH'
              ? `Technicien (${item.technicianId || '?'})`
              : item.location === 'SIEGE'
                ? 'Siège'
                : 'Dépôt Central'}
          </strong>
        </p>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Destination</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'CENTRAL' as const, label: 'Dépôt Central', color: 'slate' },
              { value: 'SIEGE' as const, label: 'Siège', color: 'orange' },
              { value: 'TECH' as const, label: 'Technicien', color: 'purple' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTarget(opt.value)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                  target === opt.value
                    ? 'border-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)]'
                    : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {target === 'TECH' && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Sélectionner le technicien
            </label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
            >
              <option value="">Choisir...</option>
              {users
                .filter((u) => u.role.toLowerCase().includes('technicien') || u.role === 'TECH')
                .map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
};
