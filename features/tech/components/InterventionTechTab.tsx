import React, { useState } from 'react';
import { Activity, Smartphone, Server, Ruler, Plus, AlertCircle } from 'lucide-react';
import { Intervention } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';

interface InterventionTechTabProps {
    formData: Partial<Intervention>;
    setFormData: (data: Partial<Intervention>) => void;
}

// Simulated device service for testing
const deviceService = {
    pingPosition: async (imei: string) => {
        await new Promise(r => setTimeout(r, 1500));
        return { success: true, message: `Position reçue pour ${imei}`, timestamp: new Date().toISOString() };
    },
    cutEngine: async (imei: string) => {
        await new Promise(r => setTimeout(r, 2000));
        return { success: true, message: `Commande envoyée à ${imei}`, timestamp: new Date().toISOString() };
    },
    configureAPN: async (imei: string) => {
        await new Promise(r => setTimeout(r, 1000));
        return { success: true, message: `APN configuré pour ${imei}` };
    },
    configureIP: async (imei: string) => {
        await new Promise(r => setTimeout(r, 1000));
        return { success: true, message: `IP/Port configuré pour ${imei}` };
    }
};

export const InterventionTechTab: React.FC<InterventionTechTabProps> = ({
    formData,
    setFormData
}) => {
    const { showToast } = useToast();
    const [isTestLoading, setIsTestLoading] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<string | null>(null);

    const hasMaterial = (keyword: string) => formData.material?.some(m => m.toLowerCase().includes(keyword.toLowerCase()));

    const handleSimulateTest = async (type: string) => {
        if (!formData.imei) {
            showToast("Veuillez d'abord sélectionner un boîtier (IMEI)", "error");
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
                        showToast(result.message, "info");
                        setTestResult(`Position OK à ${new Date(result.timestamp).toLocaleTimeString()}`);
                    }
                    break;
                case 'IMMOB':
                    result = await deviceService.cutEngine(formData.imei);
                    if (result.success) {
                        showToast(result.message, "success");
                        setTestResult(`Moteur coupé à ${new Date(result.timestamp).toLocaleTimeString()}`);
                    }
                    break;
                case 'APN':
                    result = await deviceService.configureAPN(formData.imei);
                    if (result.success) showToast(result.message, "success");
                    break;
                case 'IP':
                    result = await deviceService.configureIP(formData.imei);
                    if (result.success) showToast(result.message, "success");
                    break;
            }
        } catch (error) {
            showToast("Erreur lors du test", "error");
        } finally {
            setIsTestLoading(null);
        }
    };

    const handleGenerateCalibrationTable = () => {
        if (!formData.tankHeight || !formData.tankCapacity) {
            showToast("Hauteur et Capacité requises pour générer", "error");
            return;
        }
        const steps = 20;
        let table = "";
        for (let i = 0; i <= steps; i++) {
            const h = Math.round((formData.tankHeight / steps) * i);
            const v = Math.round((formData.tankCapacity / steps) * i);
            table += `${h},${v}\n`;
        }
        setFormData({...formData, calibrationTable: table});
        showToast("Table générée (Linéaire)", "success");
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Tests & Configuration */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4"/> Tests & Configuration
                </h4>
                <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Test de Localisation</span>
                        <button 
                            onClick={() => handleSimulateTest('LOC')} 
                            className="text-sm text-blue-600 hover:underline font-medium" 
                            disabled={isTestLoading === 'LOC'}
                        >
                            {isTestLoading === 'LOC' ? 'Ping...' : 'Ping Position'}
                        </button>
                    </div>
                    {testResult && testResult.includes("Position") && (
                        <p className="text-xs text-green-600 font-medium bg-green-50 p-2 rounded">{testResult}</p>
                    )}
                    
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Test Immobilisation</span>
                        <button 
                            onClick={() => handleSimulateTest('IMMOB')} 
                            className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-bold hover:bg-red-100" 
                            disabled={isTestLoading === 'IMMOB'}
                        >
                            {isTestLoading === 'IMMOB' ? 'Envoi...' : 'Couper Moteur'}
                        </button>
                    </div>
                    {testResult && testResult.includes("Moteur") && (
                        <p className="text-xs text-green-600 font-medium bg-green-50 p-2 rounded">{testResult}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={() => handleSimulateTest('APN')} 
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                        >
                            <Smartphone className="w-4 h-4" /> Config APN
                        </button>
                        <button 
                            onClick={() => handleSimulateTest('IP')} 
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                        >
                            <Server className="w-4 h-4" /> Config IP/Port
                        </button>
                    </div>
                </div>
            </div>

            {/* Configuration Jauge */}
            {hasMaterial('sonde') && (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm animate-in fade-in">
                    <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-4 flex items-center gap-2">
                        <Ruler className="w-4 h-4"/> Configuration Jauge
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-blue-600/70 uppercase">Type de Capteur</label>
                            <select 
                                className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-slate-900 text-sm"
                                value={formData.fuelSensorType || 'CANBUS'}
                                onChange={e => setFormData({...formData, fuelSensorType: e.target.value as any})}
                            >
                                <option value="CANBUS">CANBUS (Origine)</option>
                                <option value="CAPACITIVE">Sonde Capacitive</option>
                                <option value="ULTRASONIC">Sonde Ultrason</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-blue-600/70 uppercase">Capacité Réservoir (L)</label>
                            <input 
                                type="number" 
                                className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-slate-900 text-sm" 
                                value={formData.tankCapacity || ''} 
                                onChange={e => setFormData({...formData, tankCapacity: parseFloat(e.target.value)})} 
                            />
                        </div>
                    </div>

                    {formData.fuelSensorType !== 'CANBUS' && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-blue-600/70 uppercase">Forme du Réservoir</label>
                                <select 
                                    className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-slate-900 text-sm"
                                    value={formData.tankShape || 'RECTANGULAR'}
                                    onChange={e => setFormData({...formData, tankShape: e.target.value as any})}
                                >
                                    <option value="RECTANGULAR">Rectangulaire (Parallélépipède)</option>
                                    <option value="CYLINDRICAL_H">Cylindrique Horizontal</option>
                                    <option value="CYLINDRICAL_V">Cylindrique Vertical</option>
                                    <option value="L_SHAPE">Forme en L</option>
                                    <option value="D_SHAPE">Forme en D</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-blue-600/70 uppercase">Hauteur (mm)</label>
                                    <input type="number" className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-slate-900 text-sm" value={formData.tankHeight || ''} onChange={e => setFormData({...formData, tankHeight: parseFloat(e.target.value)})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-blue-600/70 uppercase">Longueur (mm)</label>
                                    <input type="number" className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-slate-900 text-sm" value={formData.tankLength || ''} onChange={e => setFormData({...formData, tankLength: parseFloat(e.target.value)})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-blue-600/70 uppercase">Largeur (mm)</label>
                                    <input type="number" className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-slate-900 text-sm" value={formData.tankWidth || ''} onChange={e => setFormData({...formData, tankWidth: parseFloat(e.target.value)})} />
                                </div>
                            </div>
                            
                            {/* Table de Calibration */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-blue-600/70 uppercase">Table de Calibration</label>
                                    <button 
                                        type="button"
                                        onClick={handleGenerateCalibrationTable}
                                        className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                    >
                                        Générer (Linéaire)
                                    </button>
                                </div>
                                <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
                                    <div className="grid grid-cols-2 bg-blue-50 dark:bg-blue-900/20 text-[10px] font-bold text-blue-700 dark:text-blue-300 p-2 border-b border-blue-100 dark:border-blue-800">
                                        <div>Hauteur (mm)</div>
                                        <div>Volume (L)</div>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto bg-white dark:bg-slate-900">
                                        {(formData.calibrationTable || '').split('\n').map((line, idx) => {
                                            const [h, v] = line.split(',');
                                            return (
                                                <div key={idx} className="grid grid-cols-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                    <input 
                                                        type="number" 
                                                        className="w-full p-2 text-sm border-r border-slate-100 dark:border-slate-800 bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20"
                                                        value={h || ''}
                                                        placeholder="mm"
                                                        onChange={(e) => {
                                                            const lines = (formData.calibrationTable || '').split('\n');
                                                            lines[idx] = `${e.target.value},${v || ''}`;
                                                            setFormData({...formData, calibrationTable: lines.join('\n')});
                                                        }}
                                                    />
                                                    <input 
                                                        type="number" 
                                                        className="w-full p-2 text-sm bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20"
                                                        value={v || ''}
                                                        placeholder="L"
                                                        onChange={(e) => {
                                                            const lines = (formData.calibrationTable || '').split('\n');
                                                            lines[idx] = `${h || ''},${e.target.value}`;
                                                            setFormData({...formData, calibrationTable: lines.join('\n')});
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, calibrationTable: (formData.calibrationTable || '') + '\n,'})}
                                            className="w-full p-2 text-xs text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center gap-1"
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
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Rapport Technique Final</h4>
                <textarea 
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm min-h-[120px] resize-none" 
                    placeholder="Détaillez les opérations..." 
                    value={formData.notes || ''} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                />
            </div>

            {/* Mise à jour Contrat (pour Retrait) */}
            {formData.nature === 'Retrait' && (
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800 shadow-sm">
                    <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4"/> Mise à jour Contrat
                    </h4>
                    <div className="space-y-4">
                        <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/50 rounded-lg cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={formData.removeFromContract || false} 
                                onChange={e => setFormData({...formData, removeFromContract: e.target.checked})} 
                                className="w-5 h-5 text-red-600 rounded border-slate-300 focus:ring-red-500" 
                            />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Retirer le véhicule du contrat d'abonnement ?</span>
                        </label>
                        
                        {formData.removeFromContract && (
                            <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-red-600 uppercase">Motif du retrait (Obligatoire)</label>
                                <input 
                                    className="w-full p-2.5 border border-red-200 dark:border-red-800 rounded-lg bg-white dark:bg-slate-900 text-sm" 
                                    value={formData.contractRemovalReason || ''} 
                                    onChange={e => setFormData({...formData, contractRemovalReason: e.target.value})} 
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
