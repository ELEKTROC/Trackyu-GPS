import { useState, useEffect, useRef } from 'react';
import { Coordinate } from '../types';

interface AnimatedPosition {
  lat: number;
  lng: number;
}

/**
 * Hook to smoothly animate vehicle position changes
 * Uses linear interpolation (lerp) to create smooth transitions
 */
export const useAnimatedPosition = (
  targetPosition: Coordinate | null,
  duration: number = 1000 // Animation duration in ms
): AnimatedPosition | null => {
  const [currentPosition, setCurrentPosition] = useState<AnimatedPosition | null>(
    targetPosition ? { lat: targetPosition.lat, lng: targetPosition.lng } : null
  );
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const startPositionRef = useRef<AnimatedPosition | null>(null);

  useEffect(() => {
    if (!targetPosition) {
      setCurrentPosition(null);
      return;
    }

    // If no current position, jump directly
    if (!currentPosition) {
      setCurrentPosition({ lat: targetPosition.lat, lng: targetPosition.lng });
      return;
    }

    // Calculate distance to determine if animation is needed
    const distance = Math.sqrt(
      Math.pow(targetPosition.lat - currentPosition.lat, 2) +
      Math.pow(targetPosition.lng - currentPosition.lng, 2)
    );

    // If distance is very small, just snap
    if (distance < 0.0001) {
      setCurrentPosition({ lat: targetPosition.lat, lng: targetPosition.lng });
      return;
    }

    // Set up animation
    startPositionRef.current = { ...currentPosition };
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!startTimeRef.current || !startPositionRef.current) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      const newLat = startPositionRef.current.lat + (targetPosition.lat - startPositionRef.current.lat) * eased;
      const newLng = startPositionRef.current.lng + (targetPosition.lng - startPositionRef.current.lng) * eased;

      setCurrentPosition({ lat: newLat, lng: newLng });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetPosition, duration]);

  return currentPosition;
};

/**
 * Linear interpolation between two values
 */
export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

/**
 * Calculate bearing/heading between two coordinates
 */
export const calculateBearing = (from: Coordinate, to: Coordinate): number => {
  const dLon = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
};
