import React from 'react';
import { Thermometer, Scale, Gauge, Zap, Wind, AlertCircle, Truck } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';
import type { Vehicle } from '../../../../types';

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
  toggleFieldVisibility,
}) => {
  const can = vehicle.canData || {};
  const tpms = vehicle.tpms || {};

  return (
    <div className="space-y-4">
      {/* Engine Metrics (CANBus) */}
      <div className="grid grid-cols-2 gap-3">
        <ConfigurableRow
          id="rpm"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('rpm')}
          onToggle={() => toggleFieldVisibility('rpm')}
        >
          <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border)] border-[var(--border)]/50 rounded-lg flex items-center gap-3">
            <Gauge className="w-5 h-5 text-orange-500" />
            <div>
              <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Régime Moteur</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {can.rpm || '---'} <span className="text-xs font-normal text-[var(--text-muted)]">RPM</span>
              </div>
            </div>
          </div>
        </ConfigurableRow>

        <ConfigurableRow
          id="battery"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('battery')}
          onToggle={() => toggleFieldVisibility('battery')}
        >
          <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border)] border-[var(--border)]/50 rounded-lg flex items-center gap-3">
            <Zap className="w-5 h-5 text-yellow-500" />
            <div>
              <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Batterie</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {can.batteryVoltage || vehicle.batteryLevel || '---'}{' '}
                <span className="text-xs font-normal text-[var(--text-muted)]">V</span>
              </div>
            </div>
          </div>
        </ConfigurableRow>

        <ConfigurableRow
          id="airPressure"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('airPressure')}
          onToggle={() => toggleFieldVisibility('airPressure')}
        >
          <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border)] border-[var(--border)]/50 rounded-lg flex items-center gap-3">
            <Wind className="w-5 h-5 text-[var(--primary)]" />
            <div>
              <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Pression Air</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {can.airPressure || '---'} <span className="text-xs font-normal text-[var(--text-muted)]">bar</span>
              </div>
            </div>
          </div>
        </ConfigurableRow>

        <ConfigurableRow
          id="temp"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('temp')}
          onToggle={() => toggleFieldVisibility('temp')}
        >
          <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--primary)] dark:border-[var(--primary)] rounded-lg flex items-center gap-3">
            <Thermometer className="w-5 h-5 text-[var(--primary)]" />
            <div>
              <div className="text-[10px] text-[var(--primary)] font-bold uppercase">Temp. Moteur</div>
              <div className="text-lg font-bold text-[var(--primary)] dark:text-[var(--primary)]">
                {can.engineTemp || vehicle.temperature || '---'}°C
              </div>
            </div>
          </div>
        </ConfigurableRow>
      </div>

      {/* TPMS Visualization (Tires) */}
      <ConfigurableRow
        id="tpms"
        isConfigMode={isConfigMode}
        isHidden={hiddenFields.has('tpms')}
        onToggle={() => toggleFieldVisibility('tpms')}
      >
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative">
          <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 flex items-center gap-2">
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

const Tire = ({ value, label }: { value?: { pressure: number; temperature: number }; label: string }) => {
  const isCritical = value && (value.pressure < 6.0 || value.pressure > 9.5);

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-12 rounded-lg border-2 mb-1 flex flex-col items-center justify-center ${isCritical ? 'border-red-500 bg-red-500/20' : value ? 'border-green-500 bg-green-500/10' : 'border-slate-700 bg-slate-800'}`}
      >
        <span className="text-[10px] font-bold text-white">{value?.pressure.toFixed(1) || '--'}</span>
        <span className="text-[8px] text-[var(--text-muted)]">bar</span>
      </div>
      <div className="text-[9px] font-bold text-[var(--text-secondary)]">{label}</div>
      {value && <div className="text-[8px] text-[var(--primary)] mt-0.5">{value.temperature}°C</div>}
    </div>
  );
};
