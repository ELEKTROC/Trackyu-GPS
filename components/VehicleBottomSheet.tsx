import React from 'react';
import type { Vehicle } from '../types';
import type { BottomSheetState } from './BottomSheet';
import { BottomSheet } from './BottomSheet';
import { VehicleDetailPanel } from '../features/fleet/components/VehicleDetailPanel';

interface VehicleBottomSheetProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onReplay?: () => void;
  initialState?: BottomSheetState;
  onStateChange?: (state: BottomSheetState) => void;
}

/**
 * Mobile-optimized bottom sheet for vehicle details.
 * Uses the generic BottomSheet component with VehicleDetailPanel inside.
 * 
 * Usage:
 * - On MapView: Shows as bottom sheet on mobile (lg:hidden)
 * - On FleetView (App.tsx): Can be used instead of Drawer on mobile devices
 */
export const VehicleBottomSheet: React.FC<VehicleBottomSheetProps> = ({
  vehicle,
  onClose,
  onReplay,
  initialState = 'half',
  onStateChange,
}) => {
  if (!vehicle) return null;

  return (
    <div className="lg:hidden">
      <BottomSheet
        isOpen={!!vehicle}
        onClose={onClose}
        initialState={initialState}
        showHandle={true}
        showCloseButton={false}
        collapsedHeight={25}
        halfHeight={50}
        fullHeight={85}
        onStateChange={onStateChange}
      >
        <VehicleDetailPanel
          vehicle={vehicle}
          onClose={onClose}
          variant="sidebar"
          onReplay={onReplay}
        />
      </BottomSheet>
    </div>
  );
};

export default VehicleBottomSheet;
