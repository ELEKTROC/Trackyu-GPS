import React from 'react';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: [number, number, number][]; // [lat, lng, intensity]
  options?: {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    max?: number;
    gradient?: { [key: number]: string };
  };
}

// Extend Leaflet's L namespace to include heatLayer
declare module 'leaflet' {
  function heatLayer(
    latlngs: [number, number, number][],
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      gradient?: { [key: number]: string };
    }
  ): any;
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ points, options = {} }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Default options
    const heatOptions = {
      radius: options.radius || 25,
      blur: options.blur || 15,
      maxZoom: options.maxZoom || 17,
      max: options.max || 1.0,
      gradient: options.gradient || {
        0.0: 'blue',
        0.3: 'cyan',
        0.5: 'lime',
        0.7: 'yellow',
        1.0: 'red'
      }
    };

    // Create heatmap layer
    const heat = L.heatLayer(points, heatOptions);
    heat.addTo(map);

    // Cleanup on unmount
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points, options]);

  return null;
};
