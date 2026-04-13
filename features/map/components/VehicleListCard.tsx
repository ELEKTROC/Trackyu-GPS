import React, { useState } from 'react';
import type { Vehicle } from '../../../types';
import { VehicleStatus } from '../../../types';
import {
  CheckSquare,
  Square,
  Signal,
  Key,
  Truck,
  Car,
  Bike,
  Bus,
  Hammer,
  User,
  Battery,
  Pencil,
  Lock,
  Wrench,
} from 'lucide-react';

export interface VehicleCardConfig {
  showSpeed: boolean;
  showFuel: boolean;
  showIgnition: boolean;
  showDriver: boolean;
  showTime: boolean;
  showStatusText: boolean;
  displayNameOptions: ('name' | 'plate' | 'wwPlate' | 'vin')[];
}

interface VehicleListCardProps {
  vehicle: Vehicle;
  isSelected: boolean;
  isFocused: boolean;
  onFocus: (vehicle: Vehicle) => void;
  onToggleSelection: (id: string, e: React.MouseEvent) => void;
  onReplay?: (vehicle: Vehicle) => void;
  onDetails?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  config?: VehicleCardConfig;
}

export const VehicleListCard: React.FC<VehicleListCardProps> = React.memo(
  ({
    vehicle,
    isSelected,
    isFocused,
    onFocus,
    onToggleSelection,
    onReplay,
    onDetails,
    onEdit,
    config = {
      showSpeed: true,
      showFuel: true,
      showIgnition: true,
      showDriver: true,
      showTime: true,
      showStatusText: true,
      displayNameOptions: ['name'],
    },
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    const isOnline = vehicle.status !== VehicleStatus.OFFLINE;
    const isIgnitionOn = vehicle.status === VehicleStatus.MOVING || vehicle.status === VehicleStatus.IDLE;

    let statusText = 'Hors ligne';
    let statusColorClass = 'text-[var(--text-secondary)]';
    if (vehicle.status === VehicleStatus.MOVING) {
      statusText = 'En mouvement';
      statusColorClass = 'text-green-600';
    } else if (vehicle.status === VehicleStatus.IDLE) {
      statusText = 'Ralenti';
      statusColorClass = 'text-orange-600';
    } else if (vehicle.status === VehicleStatus.STOPPED) {
      statusText = 'Arrêté';
      statusColorClass = 'text-red-600';
    }

    // Fuel/Battery Color Logic
    const batteryColor =
      vehicle.fuelLevel > 50 ? 'text-green-500' : vehicle.fuelLevel > 20 ? 'text-orange-500' : 'text-red-500';

    // Vehicle Type Icon Logic
    const getVehicleIcon = () => {
      if (vehicle.type) {
        switch (vehicle.type) {
          case 'TRUCK':
            return Truck;
          case 'CAR':
            return Car;
          case 'MOTORCYCLE':
            return Bike;
          case 'BUS':
            return Bus;
          case 'CONSTRUCTION':
            return Hammer;
          case 'VAN':
            return Truck; // Use Truck for Van for now or find better icon
          default:
            return Car;
        }
      }
      // Fallback to name check
      const name = vehicle.name.toLowerCase();
      if (name.includes('truck') || name.includes('camion')) return Truck;
      if (name.includes('bus')) return Bus;
      if (name.includes('moto')) return Bike;
      return Car;
    };

    const VehicleIcon = getVehicleIcon();

    const formatSyncDate = (date: Date) => {
      if (!date) return '-';
      const d = new Date(date);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
    };

    const getRelativeTime = (date: Date) => {
      if (!date) return '';
      const diff = (new Date().getTime() - new Date(date).getTime()) / 1000;
      if (diff < 60) return "À l'instant";
      if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
      const days = Math.floor(diff / 86400);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    };

    const getDisplayName = () => {
      const options = config.displayNameOptions || ['name'];
      if (options.length === 0) return vehicle.name;

      return (
        options
          .map((opt) => {
            if (opt === 'name') return vehicle.name;
            if (opt === 'plate') return vehicle.plate;
            if (opt === 'wwPlate') return vehicle.wwPlate;
            if (opt === 'vin') return vehicle.vin;
            return null;
          })
          .filter(Boolean)
          .join(' - ') || vehicle.name
      );
    };

    return (
      <div
        onClick={() => onFocus(vehicle)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative px-4 py-3 border-l-4 border-b border-slate-50 border-[var(--border)] transition-all cursor-pointer flex gap-3 hover:bg-[var(--bg-elevated)]/50 ${isFocused ? 'border-l-blue-500 bg-[var(--primary-dim)]/30 dark:bg-[var(--primary-dim)]' : 'border-l-transparent'}`}
      >
        <div className="flex items-start pt-1" onClick={(e) => onToggleSelection(vehicle.id, e)}>
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-[var(--primary)] cursor-pointer" />
          ) : (
            <Square className="w-4 h-4 text-[var(--text-muted)] dark:text-[var(--text-secondary)] hover:text-[var(--text-muted)] cursor-pointer" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              {React.createElement(VehicleIcon, { className: 'w-3.5 h-3.5 text-[var(--text-muted)]' })}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold text-sm truncate leading-tight ${isFocused ? 'text-[var(--primary)] dark:text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}
                  >
                    {getDisplayName()}
                  </span>
                  {isHovered && onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(vehicle);
                      }}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded transition-colors"
                      title="Modifier le véhicule"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {config.showDriver && vehicle.driver && (
                  <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                    <User className="w-2.5 h-2.5" />
                    <span className="truncate">{vehicle.driver}</span>
                  </div>
                )}
              </div>
            </div>
            {config.showStatusText && <span className={`text-[10px] font-bold ${statusColorClass}`}>{statusText}</span>}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="text-xs font-mono text-[var(--text-secondary)] w-16">
              {config.showSpeed
                ? vehicle.status === VehicleStatus.MOVING
                  ? `${Math.round(vehicle.speed)} km/h`
                  : '0 km/h'
                : ''}
            </div>

            <div className="flex items-center gap-3">
              <Signal
                className={`w-3 h-3 ${isOnline ? 'text-green-500' : 'text-[var(--text-muted)] dark:text-[var(--text-secondary)]'}`}
              />

              {config.showFuel && <Battery className={`w-3 h-3 ${batteryColor}`} />}

              {config.showIgnition && (
                <Key className={`w-3 h-3 ${isIgnitionOn ? 'text-orange-400' : 'text-[var(--text-secondary)]'}`} />
              )}

              {/* Immobilization Icon */}
              <Lock className={`w-3 h-3 ${vehicle.isImmobilized ? 'text-red-500' : 'text-green-500'}`} />

              {/* Breakdown Icon */}
              {vehicle.isBrokenDown && <Wrench className="w-3 h-3 text-red-500 animate-pulse" />}
            </div>

            {config.showTime && (
              <div className="flex flex-col items-end ml-auto">
                <span className="text-[9px] text-[var(--text-muted)] font-medium leading-tight">
                  {getRelativeTime(vehicle.lastUpdated)}
                </span>
                <span className="text-[9px] text-[var(--text-secondary)] font-mono leading-tight">
                  {formatSyncDate(vehicle.lastUpdated)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
