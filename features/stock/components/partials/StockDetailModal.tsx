import React, { useMemo } from 'react';
import { Box, MapPin, User, Truck, Activity, Smartphone, Cpu } from 'lucide-react';
import { Modal } from '../../../../components/Modal';
import type { DeviceStock } from '../../../../types';
import { useDataContext } from '../../../../contexts/DataContext';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DeviceStock | null;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ isOpen, onClose, item }) => {
  const { stockMovements } = useDataContext();

  // Hook before early return
  const history = useMemo(() => {
    if (!item) return [];
    return stockMovements
      .filter((m) => m.deviceId === item.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [item, stockMovements]);

  if (!item) return null;

  const getIcon = () => {
    switch (item.type) {
      case 'BOX':
        return <Box className="w-6 h-6 text-[var(--primary)]" />;
      case 'SIM':
        return <Smartphone className="w-6 h-6 text-purple-600" />;
      case 'SENSOR':
        return <Activity className="w-6 h-6 text-green-600" />;
      default:
        return <Cpu className="w-6 h-6 text-[var(--text-secondary)]" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Détail Équipement : ${item.id}`}
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[var(--bg-elevated)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 transition-colors"
        >
          Fermer
        </button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Header Info */}
        <div className="flex items-start gap-4 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
          <div className="p-3 bg-[var(--bg-surface)] rounded-lg shadow-sm border border-[var(--border)] border-[var(--border)]">
            {getIcon()}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">{item.model}</h3>
                <p className="text-sm font-mono text-[var(--text-secondary)]">
                  {item.serialNumber || item.imei || item.iccid}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase ${
                  item.status === 'INSTALLED'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : item.status === 'IN_STOCK'
                      ? 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]'
                      : item.status === 'RMA_PENDING'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : item.status === 'SENT_TO_SUPPLIER'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : item.status === 'REMOVED'
                            ? 'bg-slate-100 text-[var(--text-secondary)] border-[var(--border)]'
                            : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {item.status === 'RMA_PENDING'
                  ? 'SAV: Attente'
                  : item.status === 'SENT_TO_SUPPLIER'
                    ? 'Chez Fournisseur'
                    : item.status === 'REMOVED'
                      ? 'Retiré (Audit)'
                      : item.status}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                <span>
                  {item.location === 'TECH'
                    ? `Tech: ${item.technicianId}`
                    : item.location === 'SIEGE'
                      ? 'Siège'
                      : 'Dépôt Central'}
                </span>
              </div>
              {item.assignedVehicleId && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Truck className="w-4 h-4 text-[var(--text-muted)]" />
                  <span>{item.assignedVehicleId}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SIM Specific Info */}
        {item.type === 'SIM' && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
            <h4 className="font-bold text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4" /> Infos SIM
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-purple-600/70 dark:text-purple-400/70 block text-xs">Numéro (MSISDN)</span>
                <span className="font-mono font-bold text-purple-900 dark:text-purple-100">
                  {item.phoneNumber || '-'}
                </span>
              </div>
              <div>
                <span className="text-purple-600/70 dark:text-purple-400/70 block text-xs">Opérateur</span>
                <span className="font-bold text-purple-900 dark:text-purple-100">{item.operator || item.model}</span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <h4 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Historique des mouvements
          </h4>
          <div className="relative pl-4 border-l-2 border-[var(--border)] space-y-6">
            {history.map((event, idx) => (
              <div key={idx} className="relative">
                <div
                  className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-[var(--bg-surface)] ${
                    event.type === 'INSTALLATION'
                      ? 'bg-green-500'
                      : event.type === 'RMA'
                        ? 'bg-red-500'
                        : 'bg-[var(--primary-dim)]0'
                  }`}
                ></div>
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--text-secondary)] font-mono">
                    {new Date(event.date).toLocaleString('fr-FR')}
                  </span>
                  <span className="font-bold text-[var(--text-primary)] text-sm">{event.details}</span>
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" /> {event.userId}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
