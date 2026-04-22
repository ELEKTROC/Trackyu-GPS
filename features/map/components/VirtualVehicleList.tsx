import React from 'react';
import type { Vehicle } from '../../../types';
import type { VehicleCardConfig } from './VehicleListCard';
import { VehicleListCard } from './VehicleListCard';

interface VirtualVehicleListProps {
  vehicles: Vehicle[];
  selectedVehicleIds: Set<string>;
  focusedVehicleId: string | undefined;
  onFocus: (vehicle: Vehicle) => void;
  onToggleSelection: (id: string, e: React.MouseEvent) => void;
  config: VehicleCardConfig;
  onEdit?: (vehicle: Vehicle) => void;
}

export const VirtualVehicleList: React.FC<VirtualVehicleListProps> = ({
  vehicles,
  selectedVehicleIds,
  focusedVehicleId,
  onFocus,
  onToggleSelection,
  config,
  onEdit,
}) => {
  return (
    <div>
      {vehicles.map((vehicle) => (
        <VehicleListCard
          key={vehicle.id}
          vehicle={vehicle}
          isSelected={selectedVehicleIds.has(vehicle.id)}
          isFocused={focusedVehicleId === vehicle.id}
          onFocus={onFocus}
          onToggleSelection={onToggleSelection}
          config={config}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};
