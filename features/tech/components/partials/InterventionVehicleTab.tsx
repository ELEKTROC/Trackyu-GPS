/**
 * Vehicle Tab Partial for InterventionForm
 * Contains: Vehicle Details, Pre-Intervention Checklist
 */

import React, { useState, useEffect } from 'react';
import { Truck, ClipboardCheck, AlertTriangle, Activity, Loader2, ChevronDown, MapPin } from 'lucide-react';
import type { Intervention } from '../../../../types';
import { api } from '../../../../services/apiLazy';
import { logger } from '../../../../utils/logger';

interface DeviceModel {
  id: string;
  type: 'BOX' | 'SIM' | 'SENSOR' | 'ACCESSORY';
  brand: string;
  model: string;
  protocol?: string;
}

interface VehicleTabProps {
  formData: Partial<Intervention>;
  setFormData: (data: Partial<Intervention>) => void;
  availableVehicles: any[];
  stock: any[];
  catalogItems: any[];
  user: any;
  hasSensor: () => boolean;
  isTransfer: () => boolean;
  deviceModels?: DeviceModel[];
  currentNatureConfig?: any;
}

export const InterventionVehicleTab: React.FC<VehicleTabProps> = ({
  formData,
  setFormData,
  availableVehicles,
  stock,
  catalogItems,
  user,
  hasSensor,
  isTransfer,
  deviceModels: externalDeviceModels,
  currentNatureConfig,
}) => {
  // Load device models if not provided externally
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>(externalDeviceModels || []);
  const [loadingModels, setLoadingModels] = useState(!externalDeviceModels);

  useEffect(() => {
    if (!externalDeviceModels) {
      const loadDeviceModels = async () => {
        try {
          const models = await api.techSettings.getDeviceModels('BOX');
          setDeviceModels(models || []);
        } catch (err) {
          logger.warn('Impossible de charger les modèles de trackers:', err);
          // Fallback: modèles par défaut
          setDeviceModels([
            { id: '1', type: 'BOX', brand: 'Teltonika', model: 'FMB920', protocol: 'Teltonika' },
            { id: '2', type: 'BOX', brand: 'Teltonika', model: 'FMB120', protocol: 'Teltonika' },
            { id: '3', type: 'BOX', brand: 'Teltonika', model: 'FMC130', protocol: 'Teltonika' },
            { id: '4', type: 'BOX', brand: 'Concox', model: 'GT06N', protocol: 'GT06' },
            { id: '5', type: 'BOX', brand: 'Concox', model: 'S102A', protocol: 'GT06' },
            { id: '6', type: 'BOX', brand: 'Sinotrack', model: 'ST-901', protocol: 'GT06' },
            { id: '7', type: 'BOX', brand: 'Coban', model: 'GPS103', protocol: 'GT06' },
            { id: '8', type: 'BOX', brand: 'Queclink', model: 'GV300', protocol: 'Queclink' },
          ]);
        } finally {
          setLoadingModels(false);
        }
      };
      loadDeviceModels();
    }
  }, [externalDeviceModels]);

  // Extraire le type de balise actuel du véhicule sélectionné
  const selectedVehicle = availableVehicles.find((v) => v.id === formData.vehicleId);

  // Material menu state
  const [isMaterialMenuOpen, setIsMaterialMenuOpen] = useState(false);
  const materialMenuRef = React.useRef<HTMLDivElement>(null);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Vehicle Details Section */}
      <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
        <h4 className="section-title mb-4 flex items-center gap-2">
          <Truck className="w-4 h-4" /> Véhicule Cible
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Plate */}
          <div className="space-y-1">
            <label className="section-title">{isTransfer() ? 'Nouvelle Plaque *' : 'Plaque'}</label>
            <input
              title="Plaque"
              className={`w-full px-3 py-2.5 border rounded-lg bg-[var(--bg-surface)] text-sm font-bold ${isTransfer() ? 'border-orange-300 ring-2 ring-orange-100' : 'border-[var(--border)]'}`}
              value={formData.licensePlate || ''}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
              placeholder="Ex: 1234-AB-01"
            />
          </div>

          {/* Brand */}
          <div className="space-y-1">
            <label className="section-title">{isTransfer() ? 'Nouvelle Marque *' : 'Marque'}</label>
            <input
              list="vehicle-brands"
              title="Marque"
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              value={formData.vehicleBrand || ''}
              onChange={(e) => setFormData({ ...formData, vehicleBrand: e.target.value })}
            />
            <datalist id="vehicle-brands">
              {[
                'Toyota',
                'Mitsubishi',
                'Isuzu',
                'Hino',
                'Mercedes-Benz',
                'Volvo',
                'Scania',
                'MAN',
                'Renault',
                'Peugeot',
                'Volkswagen',
                'Ford',
                'Hyundai',
                'Kia',
                'Nissan',
                'Mazda',
                'Suzuki',
                'Dacia',
                'Iveco',
                'DAF',
              ].map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          {/* Model */}
          <div className="space-y-1">
            <label className="section-title">{isTransfer() ? 'Nouveau Modèle *' : 'Modèle'}</label>
            <input
              list="vehicle-models"
              title="Modèle"
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              value={formData.vehicleModel || ''}
              onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
            />
            <datalist id="vehicle-models">
              {/* Suggestions dynamiques basées sur la marque si possible */}
              {formData.vehicleBrand === 'Toyota' &&
                ['Hilux', 'Land Cruiser', 'Corolla', 'Fortuner', 'Hiace', 'Prado'].map((m) => (
                  <option key={m} value={m} />
                ))}
              {formData.vehicleBrand === 'Mitsubishi' &&
                ['L200', 'Pajero', 'Canter', 'Fuso'].map((m) => <option key={m} value={m} />)}
              {formData.vehicleBrand === 'Isuzu' &&
                ['D-Max', 'D-Max Single Cab', 'N-Series', 'F-Series'].map((m) => <option key={m} value={m} />)}
              {['Berline', 'SUV', 'Pick-up', 'Camionnette', 'Poids Lourd', 'Remorque'].map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          {/* Vehicle Type */}
          <div className="space-y-1">
            <label className="section-title">Type d'engin</label>
            <select
              title="Type d'engin"
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              value={formData.vehicleType || ''}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
            >
              <option value="">-- Sélectionner --</option>
              <option value="Camion">Camion</option>
              <option value="VUL">VUL (Véhicule Utilitaire Léger)</option>
              <option value="Voiture">Voiture</option>
              <option value="Moto">Moto</option>
              <option value="Engin TP">Engin TP</option>
              <option value="Remorque">Remorque</option>
              <option value="Bus">Bus</option>
              <option value="Agricole">Engin Agricole</option>
              <option value="Citerne">Citerne</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          {/* Mileage */}
          <div className="space-y-1">
            <label className="section-title">Kilométrage</label>
            <input
              title="Kilométrage"
              type="number"
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              value={formData.vehicleMileage || ''}
              onChange={(e) => setFormData({ ...formData, vehicleMileage: parseInt(e.target.value) })}
            />
          </div>

          {/* VIN */}
          <div className="space-y-1">
            <label className="section-title">VIN</label>
            <input
              title="VIN"
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm font-mono uppercase"
              value={formData.vin || ''}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              maxLength={17}
            />
          </div>

          {/* GPS Status (Read-only) */}
          <div className="space-y-1">
            <label className="section-title">Statut GPS</label>
            <div className="relative">
              <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                title="Statut GPS"
                className="w-full pl-10 p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-bold"
                value={(() => {
                  const status = availableVehicles.find((v) => v.id === formData.vehicleId)?.status;
                  switch (status) {
                    case 'MOVING':
                      return 'EN MOUVEMENT';
                    case 'STOPPED':
                      return 'ARRÊTÉ';
                    case 'IDLE':
                      return 'RALENTI';
                    case 'OFFLINE':
                      return 'HORS LIGNE';
                    case 'ALERT':
                      return 'ALERTE';
                    default:
                      return status || 'N/A';
                  }
                })()}
                readOnly
              />
            </div>
          </div>

          {/* Mutation Info for Transfer */}
          {isTransfer() && (
            <div className="md:col-span-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800 flex items-start gap-3">
              <Truck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-orange-700 uppercase">Mutation d'identité</h5>
                <p className="text-xs text-orange-600">
                  L'abonnement et le matériel seront conservés.
                  <strong> Veuillez saisir ci-dessous les informations du NOUVEL engin physique</strong> (Plaque,
                  Marque, Modèle). L'ancien véhicule sera automatiquement mis à jour à la clôture.
                </p>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label className="section-title">Type de Balise</label>
            <div className="relative">
              {loadingModels && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] animate-spin" />
              )}
              <input
                list="available-beacon-types"
                title="Type de Balise"
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                value={formData.beaconType || ''}
                onChange={(e) => setFormData({ ...formData, beaconType: e.target.value })}
                placeholder="Sélectionner ou saisir..."
              />
              <datalist id="available-beacon-types">
                {deviceModels.map((dm) => (
                  <option key={dm.id} value={`${dm.brand} ${dm.model}`}>
                    {dm.brand} {dm.model} {dm.protocol ? `(${dm.protocol})` : ''}
                  </option>
                ))}
              </datalist>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Modèles depuis Admin &gt; Paramètres Boîtiers</p>
          </div>

          {/* Emplacement Physique du boîtier */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Emplacement Physique
            </label>
            <select
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
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
              <option value="Autre">Autre</option>
              <option value="Tableau de bord">Tableau de bord</option>
              <option value="Boîte à gants">Boîte à gants</option>
              <option value="Sous le volant">Sous le volant</option>
              <option value="Coffre">Coffre</option>
              <option value="Moteur">Moteur</option>
            </select>
          </div>

          {/* Matériel à utiliser (MASQUÉ à la demande du client le 17/03/2026 car redondant avec les nouveaux flux stock) */}
          {/* 
                    <div className="space-y-1 relative" ref={materialMenuRef}>
                        <label className="section-title">Matériel à utiliser</label>
                        <div className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm cursor-pointer flex justify-between items-center" onClick={() => setIsMaterialMenuOpen(!isMaterialMenuOpen)}>
                            <span className="truncate">{formData.material && formData.material.length > 0 ? `${formData.material.length} éléments` : 'Sélectionner...'}</span>
                            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                        </div>
                        {isMaterialMenuOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto p-2 custom-scrollbar">
                                {catalogItems.filter(i => i.category === 'Matériel').map(item => (
                                    <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded cursor-pointer text-sm">
                                        <input title={item.name} type="checkbox" checked={formData.material?.includes(item.name) || false} onChange={() => handleMaterialToggle(item.name)} className="rounded border-[var(--border)] text-[var(--primary)]" />
                                        <span className="text-[var(--text-primary)]">{item.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    */}

          {/* Sensor Fields (conditional) */}
          {hasSensor() && (
            <>
              <div className="space-y-1">
                <label className="section-title">
                  {(formData.nature as string) === 'Remplacement'
                    ? 'Nouvelle Sonde (S/N)'
                    : 'Accessoire / Capteur (S/N)'}
                </label>
                <div className="relative">
                  <input
                    list="stock-sensor"
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm font-mono"
                    placeholder="Numéro de Série..."
                    value={formData.sensorSerial || ''}
                    onChange={(e) => setFormData({ ...formData, sensorSerial: e.target.value })}
                  />
                  <datalist id="stock-sensor">
                    {stock
                      .filter((d) => (d.type || 'BOX') === 'SENSOR' || (d.type || 'BOX') === 'ACCESSORY')
                      .filter((d) => {
                        if (user?.role === 'Technicien') {
                          if (d.location !== 'TECH' || d.technicianId !== user.id) return false;
                        }
                        return d.status === 'IN_STOCK';
                      })
                      .map((d) => (
                        <option key={d.id} value={d.serialNumber || d.imei || d.iccid}>
                          {d.model} - {d.status}
                        </option>
                      ))}
                  </datalist>
                </div>
              </div>

              {(formData.nature as string) === 'Remplacement' && (
                <div className="space-y-1">
                  <label className="section-title">Ancienne Sonde</label>
                  <input
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-mono text-[var(--text-secondary)] cursor-not-allowed"
                    value={(() => {
                      const v = availableVehicles.find((veh) => veh.id === formData.vehicleId);
                      if (!v) return 'N/A';
                      const sensor = stock.find(
                        (d) => d.assignedVehicleId === v.id && (d.type === 'SENSOR' || d.type === 'ACCESSORY')
                      );
                      return sensor ? sensor.serialNumber || sensor.imei : 'Non trouvé';
                    })()}
                    readOnly
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="section-title">MAC</label>
                <input
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm font-mono"
                  value={formData.macAddress || ''}
                  onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                  placeholder="AA:BB:CC:DD:EE:FF"
                />
              </div>

              <div className="space-y-1">
                <label className="section-title">Type de Sonde</label>
                <select
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                  value={formData.probeType || ''}
                  onChange={(e) => setFormData({ ...formData, probeType: e.target.value })}
                >
                  <option value="">-- Sélectionner --</option>
                  <option value="Capacitif">Capacitif</option>
                  <option value="Ultrason">Ultrason</option>
                  <option value="BLE Capacitif">BLE Capacitif</option>
                </select>
              </div>
            </>
          )}

          {/* Removed Material Status (Dynamic based on config) */}
          {(currentNatureConfig?.stock_impact?.action === 'SWAP' ||
            currentNatureConfig?.stock_impact?.action === 'IN') && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-1 text-orange-600">
                <AlertTriangle className="w-3 h-3" /> État matériel retiré *
              </label>
              <select
                className="w-full px-3 py-2.5 border-2 border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-900/10 text-sm font-bold"
                value={formData.removedMaterialStatus || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    removedMaterialStatus: e.target.value as Intervention['removedMaterialStatus'],
                  })
                }
              >
                <option value="">-- Sélectionner l'état --</option>
                <option value="FUNCTIONAL">FONCTIONNEL (Retour stock)</option>
                <option value="FAULTY">EN PANNE (SAV / Rebut)</option>
                <option value="DAMAGED">CASSÉ (Rebut)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Pre-Intervention Checklist Section */}
      <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h4 className="section-title flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" /> Checklist Pré-Intervention
          </h4>
          <div className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded border border-orange-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> OBLIGATOIRE
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {['checkStart', 'checkLights', 'checkDashboard', 'checkAC', 'checkAudio', 'checkBattery'].map((field) => (
            <label
              key={field}
              className="flex items-center p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] transition-colors select-none"
            >
              <input
                type="checkbox"
                checked={!!(formData as Record<string, unknown>)[field]}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.checked })}
                className="w-5 h-5 text-[var(--primary)] rounded border-[var(--border)] focus:ring-[var(--primary)] bg-[var(--bg-surface)]"
              />
              <span className="ml-3 text-sm font-medium text-[var(--text-primary)]">
                {field === 'checkStart' && 'Démarrage Moteur OK'}
                {field === 'checkLights' && 'Feux & Signalisations OK'}
                {field === 'checkDashboard' && 'Aucun voyant TDB allumé'}
                {field === 'checkAC' && 'Climatisation / Chauffage OK'}
                {field === 'checkAudio' && 'Audio OK'}
                {field === 'checkBattery' && 'Batterie OK'}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-1 block">Observations</label>
          <textarea
            className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm min-h-[80px] resize-none"
            placeholder="Défauts constatés..."
            value={formData.observations || ''}
            onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};
