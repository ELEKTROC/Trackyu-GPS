import React, { useState, useRef, useMemo } from 'react';
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
  onEdit
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  const ITEM_SIZE = 110;
  const MAX_HEIGHT = 600;
  const OVERSCAN = 3; // Render 3 extra items above and below for smooth scrolling

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = vehicles.length * ITEM_SIZE;
  const containerHeight = Math.min(totalHeight, MAX_HEIGHT);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_SIZE) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ITEM_SIZE) + (OVERSCAN * 2);
  const endIndex = Math.min(vehicles.length - 1, startIndex + visibleCount);

  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const vehicle = vehicles[i];
      if (!vehicle) continue;
      
      items.push(
        <div
          key={vehicle.id}
          style={{
            position: 'absolute',
            top: i * ITEM_SIZE,
            left: 0,
            width: '100%',
            height: ITEM_SIZE,
            paddingRight: '8px' // Avoid scrollbar overlap
          }}
        >
          <VehicleListCard
            vehicle={vehicle}
            isSelected={selectedVehicleIds.has(vehicle.id)}
            isFocused={focusedVehicleId === vehicle.id}
            onFocus={onFocus}
            onToggleSelection={onToggleSelection}
            config={config}
            onEdit={onEdit}
          />
        </div>
      );
    }
    return items;
  }, [startIndex, endIndex, vehicles, selectedVehicleIds, focusedVehicleId, config, onFocus, onToggleSelection, onEdit]);

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      style={{ 
        height: containerHeight, 
        width: '100%', 
        overflowY: 'auto', 
        position: 'relative',
        minHeight: '100px'
      }}
      className="custom-scrollbar"
    >
      <div style={{ height: totalHeight, position: 'relative', width: '100%' }}>
        {visibleItems}
      </div>
    </div>
  );
};
