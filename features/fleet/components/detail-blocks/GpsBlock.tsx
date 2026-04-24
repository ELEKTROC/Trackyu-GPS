import React from 'react';
import { Battery, Signal, Cpu, AlertOctagon } from 'lucide-react';
import { useTranslation } from '../../../../i18n';
import { ConfigurableRow } from './SharedBlocks';

interface GpsBlockProps {
  mockData: any;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
  setActiveModal?: (modal: string) => void;
}

interface TechRowProps {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ReactNode;
  isMono?: boolean;
}

const TechRow: React.FC<TechRowProps> = ({ label, value, icon, isMono }) => (
  <div className="flex justify-between items-center py-2 border-b border-[var(--border)]/50 last:border-0">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{label}</span>
    </div>
    <span
      className={`text-[11px] font-bold ${isMono ? 'font-mono text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}
    >
      {value ?? '—'}
    </span>
  </div>
);

export const GpsBlock: React.FC<GpsBlockProps> = ({
  mockData,
  isConfigMode,
  hiddenFields,
  toggleFieldVisibility,
  setActiveModal,
}) => {
  const { t } = useTranslation();
  // Seuil batterie — on considère "faible" en dessous de 20%
  const batteryRaw = String(mockData.battery ?? '').replace(/[^\d.]/g, '');
  const batteryPct = parseFloat(batteryRaw) || 0;
  const batteryLow = batteryPct > 0 && batteryPct < 20;

  return (
    <div className="space-y-3">
      {/* INFOS DEVICE */}
      <div className="bg-[var(--bg-card)] px-3 rounded-[var(--brand-radius)]">
        <ConfigurableRow
          id="gpsModel"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('gpsModel')}
          onToggle={() => toggleFieldVisibility('gpsModel')}
        >
          <TechRow
            label="Modèle"
            value={mockData.deviceModel}
            icon={<Cpu className="w-3 h-3 text-[var(--text-muted)]" />}
          />
        </ConfigurableRow>
        <ConfigurableRow
          id="imei"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('imei')}
          onToggle={() => toggleFieldVisibility('imei')}
        >
          <TechRow label="IMEI" value={mockData.imei} isMono />
        </ConfigurableRow>
        <ConfigurableRow
          id="sim"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('sim')}
          onToggle={() => toggleFieldVisibility('sim')}
        >
          <TechRow label="Carte SIM" value={mockData.simCard} isMono />
        </ConfigurableRow>
      </div>

      {/* STATUTS MATÉRIEL — batterie + signal */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-[var(--brand-radius)]">
          <div className="flex items-center gap-2">
            <Battery
              className="w-3.5 h-3.5"
              style={{ color: batteryLow ? 'var(--status-stopped)' : 'var(--status-moving)' }}
            />
            <span className="text-[10px] font-black font-mono text-[var(--text-primary)]">
              {mockData.battery ?? '—'}
            </span>
          </div>
          <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Batterie</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-[var(--brand-radius)]">
          <div className="flex items-center gap-2">
            <Signal className="w-3.5 h-3.5 text-[var(--color-info)]" />
            <span className="text-[10px] font-black font-mono text-[var(--text-primary)]">
              {mockData.signal ?? mockData.signalStrength ?? '—'}
            </span>
          </div>
          <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Signal</span>
        </div>
      </div>

      {/* BOUTON POSITIONS SUSPECTES — ouvre PositionAnomaliesModal */}
      {setActiveModal && (
        <button
          onClick={() => setActiveModal('positionAnomalies')}
          className="w-full py-2 text-xs text-[var(--primary)] font-bold hover:bg-[var(--primary-dim)] rounded transition-colors flex items-center justify-center gap-1 border-t border-[var(--border)] pt-3"
        >
          <AlertOctagon className="w-3 h-3" />
          {t('fleet.detailPanel.positionAnomalies.openButton')}
        </button>
      )}
    </div>
  );
};
