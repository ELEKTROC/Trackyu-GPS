/**
 * TrackYu Mobile — GeocodedAddress
 * Affichage d'une adresse avec fallback intelligent :
 *  1) fallbackAddress (poussé par le backend sur vehicle.address) si dispo
 *  2) sinon lazy reverse-geocode via vehiclesApi.geocodeCoord (React Query, staleTime: Infinity)
 *  3) pendant le fetch → loadingText ("Géocodage…")
 *  4) si échec / pas de coords valides → coords formatées en monospace, puis emptyText
 *
 * Pattern repris des StopCard / AlertCard de VehicleHistoryScreen.
 * Helpers de formatage et de validation dans utils/geocoding.ts.
 */
import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { vehiclesApi } from '../api/vehicles';
import { formatShortAddress, formatCoords, hasValidCoords } from '../utils/geocoding';
import { useTheme } from '../theme';

interface GeocodedAddressProps {
  /** Latitude du point à géocoder */
  lat: number | null | undefined;
  /** Longitude du point à géocoder */
  lng: number | null | undefined;
  /** Adresse déjà disponible (ex : vehicle.address depuis le socket) — prioritaire */
  fallbackAddress?: string | null;
  /** Texte affiché pendant le fetch (défaut : "Géocodage…") */
  loadingText?: string;
  /** Texte affiché si aucune coord valide n'est disponible (défaut : "Localisation inconnue") */
  emptyText?: string;
  /** Style appliqué au Text */
  style?: StyleProp<TextStyle>;
  /** numberOfLines du Text (défaut : 1) */
  numberOfLines?: number;
}

export function GeocodedAddress({
  lat,
  lng,
  fallbackAddress,
  loadingText = 'Géocodage…',
  emptyText = 'Localisation inconnue',
  style,
  numberOfLines = 1,
}: GeocodedAddressProps) {
  const { theme } = useTheme();

  const short = formatShortAddress(fallbackAddress);
  const validCoords = hasValidCoords(lat, lng);
  const latNum = lat as number;
  const lngNum = lng as number;

  const { data: fetched, isLoading } = useQuery<string | null>({
    queryKey: ['geocode', validCoords ? latNum.toFixed(4) : '', validCoords ? lngNum.toFixed(4) : ''],
    queryFn: () => vehiclesApi.geocodeCoord(latNum, lngNum),
    staleTime: Infinity,
    enabled: validCoords && !short,
  });

  if (short) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {short}
      </Text>
    );
  }

  const fetchedShort = formatShortAddress(fetched);
  if (fetchedShort) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {fetchedShort}
      </Text>
    );
  }

  if (validCoords && isLoading) {
    return (
      <Text style={[style, { color: theme.text.muted, fontStyle: 'italic' }]} numberOfLines={numberOfLines}>
        {loadingText}
      </Text>
    );
  }

  if (validCoords) {
    return (
      <Text style={[style, { fontFamily: 'monospace' }]} numberOfLines={numberOfLines}>
        {formatCoords(latNum, lngNum)}
      </Text>
    );
  }

  return (
    <Text style={[style, { color: theme.text.muted, fontStyle: 'italic' }]} numberOfLines={numberOfLines}>
      {emptyText}
    </Text>
  );
}

export default GeocodedAddress;
