import React from 'react';
import { Battery, Signal, Settings } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';

interface GpsBlockProps {
  mockData: any;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
}

export const GpsBlock: React.FC<GpsBlockProps> = ({ mockData, isConfigMode, hiddenFields, toggleFieldVisibility }) => {
  return (
    <div className="space-y-2 text-xs">
      <ConfigurableRow
        id="gpsModel"
        isConfigMode={isConfigMode}
        isHidden={hiddenFields.has('gpsModel')}
        onToggle={() => toggleFieldVisibility('gpsModel')}
        className="flex justify-between py-1 border-b border-[var(--border)]"
      >
        <span className="text-[var(--text-secondary)]">Modèle</span>
        <span className="font-mono font-medium">{mockData.deviceModel}</span>
      </ConfigurableRow>
      <ConfigurableRow
        id="imei"
        isConfigMode={isConfigMode}
        isHidden={hiddenFields.has('imei')}
        onToggle={() => toggleFieldVisibility('imei')}
        className="flex justify-between py-1 border-b border-[var(--border)]"
      >
        <span className="text-[var(--text-secondary)]">IMEI</span>
        <span className="font-mono font-medium">{mockData.imei}</span>
      </ConfigurableRow>
      <ConfigurableRow
        id="sim"
        isConfigMode={isConfigMode}
        isHidden={hiddenFields.has('sim')}
        onToggle={() => toggleFieldVisibility('sim')}
        className="flex justify-between py-1 border-b border-[var(--border)]"
      >
        <span className="text-[var(--text-secondary)]">Carte SIM</span>
        <span className="font-mono font-medium">{mockData.simCard}</span>
      </ConfigurableRow>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
          <Battery className="w-3 h-3 text-green-500" />
          <span className="font-mono font-bold">{mockData.battery}</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
          <Signal className="w-3 h-3 text-[var(--primary)]" />
          <span className="font-mono font-bold">{mockData.signal}</span>
        </div>
      </div>
    </div>
  );
};
