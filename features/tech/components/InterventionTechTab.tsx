import React, { useState } from 'react';
import { Activity, Smartphone, Server, Ruler, Plus, AlertCircle } from 'lucide-react';
import type { Intervention } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';

interface InterventionTechTabProps {
  formData: Partial<Intervention>;
  setFormData: (data: Partial<Intervention>) => void;
}

// Simulated device service for testing
const deviceService = {
  pingPosition: async (imei: string) => {
    await new Promise((r) => setTimeout(r, 1500));
    return { success: true, message: `Position reçue pour ${imei}`, timestamp: new Date().toISOString() };
  },
  cutEngine: async (imei: string) => {
    await new Promise((r) => setTimeout(r, 2000));
    return { success: true, message: `Commande envoyée à ${imei}`, timestamp: new Date().toISOString() };
  },
  configureAPN: async (imei: string) => {
    await new Promise((r) => setTimeout(r, 1000));
    return { success: true, message: `APN configuré pour ${imei}` };
  },
  configureIP: async (imei: string) => {
    await new Promise((r) => setTimeout(r, 1000));
    return { success: true, message: `IP/Port configuré pour ${imei}` };
  },
};

export const InterventionTechTab: React.FC<InterventionTechTabProps> = ({ formData, setFormData }) => {
  const { showToast } = useToast();
  const [isTestLoading, setIsTestLoading] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const hasMaterial = (keyword: string) =>
    formData.material?.some((m) => m.toLowerCase().includes(keyword.toLowerCase()));

  const handleSimulateTest = async (type: string) => {
    if (!formData.imei) {
      showToast("Veuillez d'abord sélectionner un boîtier (IMEI)", 'error');
      return;
    }

    setIsTestLoading(type);
    setTestResult(null);

    try {
      let result;
      switch (type) {
        case 'LOC':
          result = await deviceService.pingPosition(formData.imei);
          if (result.success) {
            showToast(result.message, 'info');
            setTestResult(`Position OK à ${new Date(result.timestamp).toLocaleTimeString()}`);
          }
          break;
        case 'IMMOB':
          result = await deviceService.cutEngine(formData.imei);
          if (result.success) {
            showToast(result.message, 'success');
            setTestResult(`Moteur coupé à ${new Date(result.timestamp).toLocaleTimeString()}`);
          }
          break;
        case 'APN':
          result = await deviceService.configureAPN(formData.imei);
          if (result.success) showToast(result.message, 'success');
          break;
        case 'IP':
          result = await deviceService.configureIP(formData.imei);
          if (result.success) showToast(result.message, 'success');
          break;
      }
    } catch (error) {
      showToast('Erreur lors du test', 'error');
    } finally {
      setIsTestLoading(null);
    }
  };

  const handleGenerateCalibrationTable = () => {
    if (!formData.tankHeight || !formData.tankCapacity) {
      showToast('Hauteur et Capacité requises pour générer', 'error');
      return;
    }
    const steps = 20;
    let table = '';
    for (let i = 0; i <= steps; i++) {
      const h = Math.round((formData.tankHeight / steps) * i);
      const v = Math.round((formData.tankCapacity / steps) * i);
      table += `${h},${v}\n`;
    }
    setFormData({ ...formData, calibrationTable: table });
    showToast('Table générée (Linéaire)', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Tests & Configuration */}
      <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
        <h4 className="section-title mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Tests & Configuration
        </h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-[var(--border)] border-[var(--border)]">
            <span className="text-sm font-bold text-[var(--text-primary)]">Test de Localisation</span>
            <button
              onClick={() => handleSimulateTest('LOC')}
              className="text-sm text-[var(--primary)] hover:underline font-medium"
              disabled={isTestLoading === 'LOC'}
            >
              {isTestLoading === 'LOC' ? 'Ping...' : 'Ping Position'}
            </button>
          </div>
          {testResult && testResult.includes('Position') && (
            <p className="text-xs text-green-600 font-medium bg-green-50 p-2 rounded">{testResult}</p>
          )}

          <div className="flex items-center justify-between py-2 border-b border-[var(--border)] border-[var(--border)]">
            <span className="text-sm font-bold text-[var(--text-primary)]">Test Immobilisation</span>
            <button
              onClick={() => handleSimulateTest('IMMOB')}
              className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-bold hover:bg-red-100"
              disabled={isTestLoading === 'IMMOB'}
            >
              {isTestLoading === 'IMMOB' ? 'Envoi...' : 'Couper Moteur'}
            </button>
          </div>
          {testResult && testResult.includes('Moteur') && (
            <p className="text-xs text-green-600 font-medium bg-green-50 p-2 rounded">{testResult}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleSimulateTest('APN')}
              className="flex-1 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--bg-elevated)] flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> Config APN
            </button>
            <button
              onClick={() => handleSimulateTest('IP')}
              className="flex-1 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--bg-elevated)] flex items-center justify-center gap-2"
            >
              <Server className="w-4 h-4" /> Config IP/Port
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Jauge */}
      {hasMaterial('sonde') && (
        <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] p-6 rounded-xl border border-[var(--border)] dark:border-[var(--primary)] shadow-sm animate-in fade-in">
          <h4 className="text-xs font-bold text-[var(--primary)] dark:text-[var(--primary)] uppercase mb-4 flex items-center gap-2">
            <Ruler className="w-4 h-4" /> Configuration Jauge
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Type de Capteur</label>
              <select
                className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                value={formData.fuelSensorType || 'CANBUS'}
                onChange={(e) => setFormData({ ...formData, fuelSensorType: e.target.value as any })}
              >
                <option value="CANBUS">CANBUS (Origine)</option>
                <option value="CAPACITIVE">Sonde Capacitive</option>
                <option value="ULTRASONIC">Sonde Ultrason</option>
                <option value="ANALOG">Sonde Analogique</option>
                <option value="RS232">Sonde RS232</option>
                <option value="BLUETOOTH">Sonde Bluetooth</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Capacité Réservoir (L)</label>
              <input
                type="number"
                className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                value={formData.tankCapacity || ''}
                onChange={(e) => setFormData({ ...formData, tankCapacity: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          {formData.fuelSensorType !== 'CANBUS' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Sensor config fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Unité Mesure Capteur</label>
                  <select
                    className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                    value={formData.sensorUnit || ''}
                    onChange={(e) => setFormData({ ...formData, sensorUnit: e.target.value as any })}
                  >
                    <option value="">— Sélectionner —</option>
                    <option value="tension">Tension (mV)</option>
                    <option value="litres">Litres</option>
                    <option value="gallons">Gallons</option>
                    <option value="pourcentage">Pourcentage (%)</option>
                    <option value="hauteur">Hauteur (mm)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Facteur de Conversion</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                    value={formData.fuelConversionFactor || ''}
                    placeholder="1"
                    onChange={(e) => setFormData({ ...formData, fuelConversionFactor: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              {formData.sensorUnit === 'tension' && (
                <div className="grid grid-cols-3 gap-4 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Tension Vide (mV)</label>
                    <input
                      type="number"
                      className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                      value={formData.voltageEmptyMv ?? ''}
                      placeholder="0"
                      onChange={(e) => setFormData({ ...formData, voltageEmptyMv: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">
                      Tension Mi-Plein (mV)
                    </label>
                    <input
                      type="number"
                      className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                      value={formData.voltageHalfMv ?? ''}
                      placeholder="2500"
                      onChange={(e) => setFormData({ ...formData, voltageHalfMv: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Tension Plein (mV)</label>
                    <input
                      type="number"
                      className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                      value={formData.voltageFullMv ?? ''}
                      placeholder="5000"
                      onChange={(e) => setFormData({ ...formData, voltageFullMv: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Marque Capteur</label>
                  <select
                    className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                    value={formData.sensorBrand || ''}
                    onChange={(e) => setFormData({ ...formData, sensorBrand: e.target.value })}
                  >
                    <option value="">— Sélectionner —</option>
                    <option value="Concox">Concox</option>
                    <option value="Ligo">Ligo</option>
                    <option value="Ruptela">Ruptela</option>
                    <option value="Mielta">Mielta</option>
                    <option value="Mechatronics">Mechatronics</option>
                    <option value="Omnicomm">Omnicomm</option>
                    <option value="Technoton">Technoton</option>
                    <option value="Escort">Escort</option>
                    <option value="Noname">Noname</option>
                    <option value="Autres">Autres</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Modèle Capteur</label>
                  <input
                    type="text"
                    className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                    value={formData.sensorModel || ''}
                    placeholder="Optionnel"
                    onChange={(e) => setFormData({ ...formData, sensorModel: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">
                  Date Installation Capteur
                </label>
                <input
                  type="date"
                  className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                  value={formData.sensorInstallDate || ''}
                  onChange={(e) => setFormData({ ...formData, sensorInstallDate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Hauteur (mm)</label>
                  <input
                    type="number"
                    className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                    value={formData.tankHeight || ''}
                    onChange={(e) => setFormData({ ...formData, tankHeight: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Longueur (mm)</label>
                  <input
                    type="number"
                    className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                    value={formData.tankLength || ''}
                    onChange={(e) => setFormData({ ...formData, tankLength: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Largeur (mm)</label>
                  <input
                    type="number"
                    className="w-full p-2.5 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-sm"
                    value={formData.tankWidth || ''}
                    onChange={(e) => setFormData({ ...formData, tankWidth: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              {/* Table de Calibration */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[var(--primary)]/70 uppercase">Table de Calibration</label>
                  <button
                    type="button"
                    onClick={handleGenerateCalibrationTable}
                    className="text-[10px] bg-[var(--primary-dim)] text-[var(--primary)] px-2 py-1 rounded hover:bg-[var(--primary-dim)]"
                  >
                    Générer (Linéaire)
                  </button>
                </div>
                <div className="border border-[var(--border)] dark:border-[var(--primary)] rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[10px] font-bold text-[var(--primary)] dark:text-[var(--primary)] p-2 border-b border-[var(--primary)] dark:border-[var(--primary)]">
                    <div>Hauteur (mm)</div>
                    <div>Volume (L)</div>
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-[var(--bg-surface)]">
                    {(formData.calibrationTable || '').split('\n').map((line, idx) => {
                      const [h, v] = line.split(',');
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-2 border-b border-[var(--border)] border-[var(--border)] last:border-0"
                        >
                          <input
                            type="number"
                            className="w-full p-2 text-sm border-r border-[var(--border)] border-[var(--border)] bg-transparent outline-none focus:bg-[var(--primary-dim)] dark:focus:bg-[var(--primary-dim)]"
                            value={h || ''}
                            placeholder="mm"
                            onChange={(e) => {
                              const lines = (formData.calibrationTable || '').split('\n');
                              lines[idx] = `${e.target.value},${v || ''}`;
                              setFormData({ ...formData, calibrationTable: lines.join('\n') });
                            }}
                          />
                          <input
                            type="number"
                            className="w-full p-2 text-sm bg-transparent outline-none focus:bg-[var(--primary-dim)] dark:focus:bg-[var(--primary-dim)]"
                            value={v || ''}
                            placeholder="L"
                            onChange={(e) => {
                              const lines = (formData.calibrationTable || '').split('\n');
                              lines[idx] = `${h || ''},${e.target.value}`;
                              setFormData({ ...formData, calibrationTable: lines.join('\n') });
                            }}
                          />
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, calibrationTable: (formData.calibrationTable || '') + '\n,' })
                      }
                      className="w-full p-2 text-xs text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20 flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Ajouter une ligne
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rapport Technique Final */}
      <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
        <h4 className="section-title mb-2">Rapport Technique Final</h4>
        <textarea
          className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm min-h-[120px] resize-none"
          placeholder="Détaillez les opérations..."
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      {/* Mise à jour Contrat (pour Retrait) */}
      {formData.nature === 'Retrait' && (
        <div className="bg-[var(--clr-danger-dim)] p-6 rounded-xl border border-[var(--clr-danger-border)] shadow-sm">
          <h4 className="text-xs font-bold text-[var(--clr-danger-strong)] uppercase mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Mise à jour Contrat
          </h4>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 bg-[var(--bg-surface)] border border-red-100 dark:border-red-900/50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.removeFromContract || false}
                onChange={(e) => setFormData({ ...formData, removeFromContract: e.target.checked })}
                className="w-5 h-5 text-red-600 rounded border-[var(--border)] focus:ring-red-500"
              />
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Retirer le véhicule du contrat d'abonnement ?
              </span>
            </label>

            {formData.removeFromContract && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-red-600 uppercase">Motif du retrait (Obligatoire)</label>
                <input
                  className="w-full p-2.5 border border-[var(--clr-danger-border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                  value={formData.contractRemovalReason || ''}
                  onChange={(e) => setFormData({ ...formData, contractRemovalReason: e.target.value })}
                  placeholder="Ex: Vente du véhicule, Fin de contrat..."
                  required
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
