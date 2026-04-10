import React from 'react';
import { Thermometer, Scale, Gauge, Zap, Wind, AlertCircle, Truck } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';
import { Vehicle } from '../../../../types';

interface SensorsBlockProps {
  vehicle: Vehicle;
  mockData: any;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
}

export const SensorsBlock: React.FC<SensorsBlockProps> = ({
  vehicle,
  mockData,
  isConfigMode,
  hiddenFields,
  toggleFieldVisibility
}) => {
  const can = vehicle.canData || {};
  const tpms = vehicle.tpms || {};

  return (
    <div className="space-y-4">
      {/* Engine Metrics (CANBus) */}
      <div className="grid grid-cols-2 gap-3">
        <ConfigurableRow id="rpm" isConfigMode={isConfigMode} isHidden={hiddenFields.has('rpm')} onToggle={() => toggleFieldVisibility('rpm')}>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex items-center gap-3">
            <Gauge className="w-5 h-5 text-orange-500" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Régime Moteur</div>
              <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{can.rpm || '---'} <span className="text-xs font-normal text-slate-400">RPM</span></div>
            </div>
          </div>
        </ConfigurableRow>

        <ConfigurableRow id="battery" isConfigMode={isConfigMode} isHidden={hiddenFields.has('battery')} onToggle={() => toggleFieldVisibility('battery')}>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex items-center gap-3">
            <Zap className="w-5 h-5 text-yellow-500" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Batterie</div>
              <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{can.batteryVoltage || vehicle.batteryLevel || '---'} <span className="text-xs font-normal text-slate-400">V</span></div>
            </div>
          </div>
        </ConfigurableRow>

        <ConfigurableRow id="airPressure" isConfigMode={isConfigMode} isHidden={hiddenFields.has('airPressure')} onToggle={() => toggleFieldVisibility('airPressure')}>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex items-center gap-3">
            <Wind className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Pression Air</div>
              <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{can.airPressure || '---'} <span className="text-xs font-normal text-slate-400">bar</span></div>
            </div>
          </div>
        </ConfigurableRow>

        <ConfigurableRow id="temp" isConfigMode={isConfigMode} isHidden={hiddenFields.has('temp')} onToggle={() => toggleFieldVisibility('temp')}>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex items-center gap-3">
            <Thermometer className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-[10px] text-blue-400 font-bold uppercase">Temp. Moteur</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{can.engineTemp || vehicle.temperature || '---'}°C</div>
            </div>
          </div>
        </ConfigurableRow>
      </div>

      {/* TPMS Visualization (Tires) */}
      <ConfigurableRow id="tpms" isConfigMode={isConfigMode} isHidden={hiddenFields.has('tpms')} onToggle={() => toggleFieldVisibility('tpms')}>
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative">
          <div className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-orange-400" />
            Monitoring Pression Pneus (TPMS)
          </div>
          
          <div className="flex justify-center items-center gap-12 relative py-4">
            {/* Simple Vehicle Silhouette */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <Truck className="w-32 h-32 text-white" />
            </div>

            {/* Tires column Left */}
            <div className="space-y-8 z-10">
              <Tire value={tpms[1]} label="AV.G" />
              <Tire value={tpms[3]} label="AR.G" />
            </div>

            {/* Tires column Right */}
            <div className="space-y-8 z-10">
              <Tire value={tpms[2]} label="AV.D" />
              <Tire value={tpms[4]} label="AR.D" />
            </div>
          </div>
        </div>
      </ConfigurableRow>
    </div>
  );
};

const Tire = ({ value, label }: { value?: { pressure: number, temperature: number }, label: string }) => {
  const isCritical = value && (value.pressure < 6.0 || value.pressure > 9.5);
  
  return (
    <div className="flex flex-col items-center">
      <div className={`w-8 h-12 rounded-lg border-2 mb-1 flex flex-col items-center justify-center ${isCritical ? 'border-red-500 bg-red-500/20' : value ? 'border-green-500 bg-green-500/10' : 'border-slate-700 bg-slate-800'}`}>
        <span className="text-[10px] font-bold text-white">{value?.pressure.toFixed(1) || '--'}</span>
        <span className="text-[8px] text-slate-400">bar</span>
      </div>
      <div className="text-[9px] font-bold text-slate-500">{label}</div>
      {value && <div className="text-[8px] text-blue-400 mt-0.5">{value.temperature}°C</div>}
    </div>
  );
};

