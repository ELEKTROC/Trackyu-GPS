/**
 * TrackYu Mobile - Map Screen
 * Temps réel via WebSocket — plus de polling
 * Sprint A2 : viewport-based marker clustering via supercluster
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, Image } from 'react-native';
import MapView, {
  Marker,
  Circle,
  Polygon,
  Polyline,
  UrlTile,
  PROVIDER_GOOGLE,
  type MapType,
  type Region,
} from 'react-native-maps';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Locate,
  RefreshCw,
  ChevronRight,
  Gauge,
  MapPin,
  Wifi,
  WifiOff,
  Layers,
  Hexagon,
  Search,
  X,
  SlidersHorizontal,
  Route as RouteIcon,
} from 'lucide-react-native';
import Supercluster from 'supercluster';
import vehiclesApi, { normalizeVehicleWS, type MapMarker, type DayStats } from '../../api/vehicles';
import { VEHICLE_STATUS_COLORS, VEHICLE_STATUS_LABELS } from '../../utils/vehicleStatus';
import {
  getTypeKey,
  hasRealPosition as checkRealPos,
  buildFilteredMarkers,
  computeStatusCounts,
} from '../../utils/mapUtils';
import { MARKER_IMAGES } from '../../assets/markers';
import geofencesApi, { isCircle, toLatLng, type Geofence } from '../../api/geofencesApi';
import { useVehicleStore } from '../../store/vehicleStore';
import { withErrorBoundary } from '../../components/ErrorBoundary';
import { wsService } from '../../services/websocket';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QK } from '../../lib/queryKeys';
import { VehicleFilterPanel, type FilterBlockDef, type FilterItem } from '../../components/VehicleFilterPanel';

type StatusFilter = 'all' | 'moving' | 'stopped' | 'idle' | 'offline';
type AnyMapParams = { vehicleId?: string } | undefined;
type AnyMapRoute = { key: string; name: 'Map'; params: AnyMapParams };
type MarkerProps = { cluster: false; marker: MapMarker };

const { width, height } = Dimensions.get('window');

const INITIAL_REGION = {
  latitude: 5.3599,
  longitude: -4.0083,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

type MapModeKey = 'osm' | 'standard' | 'satellite' | 'hybrid' | 'terrain';
const MAP_MODES: { key: MapModeKey; label: string; mapType: MapType; icon: string }[] = [
  { key: 'standard', label: 'Google Maps', mapType: 'standard', icon: '🏙️' },
  { key: 'satellite', label: 'Satellite', mapType: 'satellite', icon: '🛰️' },
  { key: 'hybrid', label: 'Hybride', mapType: 'hybrid', icon: '🌐' },
  { key: 'terrain', label: 'Terrain', mapType: 'terrain', icon: '⛰️' },
  { key: 'osm', label: 'OSM', mapType: 'none', icon: '🗺️' },
];
// Carto Voyager (données OSM, CDN Carto) — pas de 403, fonctionne en Expo Go
const OSM_TILE_URL = 'https://a.basemaps.cartocdn.com/voyager/{z}/{x}/{y}.png';

// ── Cluster Marker ────────────────────────────────────────────────────────────

function ClusterMarker({ count, primaryColor }: { count: number; primaryColor: string }) {
  const size = count >= 100 ? 60 : count >= 20 ? 52 : 44;
  const fontSize = count >= 100 ? 12 : 15;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: primaryColor,
        borderWidth: 3,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
        elevation: 8,
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize, letterSpacing: -0.5 }}>
        {count >= 1000 ? `${Math.floor(count / 1000)}k` : count}
      </Text>
    </View>
  );
}

// ── Vehicle Marker ────────────────────────────────────────────────────────────
// Note : pas de SVG (react-native-svg) à l'intérieur d'un <Marker> react-native-maps
// sur Android — les gradients/defs ne rendent pas. On utilise de simples Views.

/** Sélectionne l'image PNG correcte pour un véhicule donné. */
function getMarkerImage(vehicleType: string, status: MapMarker['status'], hasGps: boolean) {
  const typeKey = getTypeKey(vehicleType);
  const statusKey = !hasGps || status === 'offline' ? 'offline' : status;
  return MARKER_IMAGES[typeKey][statusKey];
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function MapScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [mapTypeIndex, setMapTypeIndex] = useState(0);
  // tracksViewChanges uniquement pour les ClusterMarker (View custom).
  // Les marqueurs PNG individuels utilisent tracksViewChanges={false} statique.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const [showLayerPicker, setShowLayerPicker] = useState(false);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);
  const [resellerFilter, setResellerFilter] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<AnyMapRoute>();
  const targetVehicleId = route.params?.vehicleId;
  const lastFocusedId = useRef<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(INITIAL_REGION);
  const scRef = useRef(new Supercluster<MarkerProps>({ radius: 60, maxZoom: 17, minZoom: 1 }));
  // Souscription réactive au store Zustand — se met à jour à chaque WS vehicle:update
  const vehicleMap = useVehicleStore((state) => state.vehicles);
  const storeVehicles = useMemo(() => Array.from(vehicleMap.values()), [vehicleMap]);
  const s = styles(theme, insets.top);

  // ── Source principale : tous les véhicules (store WS ou API) ────────────
  const { data: allVehicles = [], isFetching: viewportFetching } = useQuery({
    queryKey: QK.vehicles.all(),
    queryFn: () => vehiclesApi.getAll(),
    staleTime: wsConnected ? 60_000 : 10_000,
    refetchInterval: wsConnected ? false : 10_000,
    throwOnError: false,
  });

  // Alias local pour lisibilité
  const hasRealPosition = checkRealPos;

  // Tous les véhicules sur la carte — y compris ceux sans GPS (affichés au Golfe de Guinée 0,0)
  const markers: MapMarker[] = useMemo(() => {
    // Base = API : tous les véhicules avec leur dernière position connue (0,0 si aucune)
    const merged = new Map(allVehicles.map((v) => [v.id, v]));
    // Overlay = WS store : ne remplace les coordonnées QUE si le WS a une vraie position
    for (const sv of storeVehicles) {
      const base = merged.get(sv.id);
      if (!base) {
        merged.set(sv.id, sv);
        continue;
      }
      const wsHasReal = hasRealPosition(sv.latitude ?? 0, sv.longitude ?? 0);
      merged.set(sv.id, {
        ...base,
        ...sv,
        latitude: wsHasReal ? sv.latitude : base.latitude,
        longitude: wsHasReal ? sv.longitude : base.longitude,
      });
    }
    return Array.from(merged.values())
      .filter((v) => v.latitude != null && v.longitude != null && isFinite(v.latitude) && isFinite(v.longitude))
      .map((v) => ({
        id: v.id,
        name: v.name,
        plate: v.plate,
        type: v.type ?? '',
        status: v.status,
        lat: v.latitude as number,
        lng: v.longitude as number,
        speed: v.speed ?? 0,
        lastUpdate: v.lastUpdate,
        imei: v.imei,
        clientName: v.clientName,
        groupName: v.groupName,
        resellerName: v.resellerName,
        simPhoneNumber: v.simPhoneNumber,
        hasGps: hasRealPosition(v.latitude as number, v.longitude as number),
      }));
  }, [storeVehicles, allVehicles]);

  // ── Listes uniques pour les filtres client / branche ────────────────────
  const resellerList = useMemo(() => {
    const set = new Set<string>();
    markers.forEach((m) => {
      if (m.resellerName) set.add(m.resellerName);
    });
    return Array.from(set).sort();
  }, [markers]);

  const clientList = useMemo(() => {
    const set = new Set<string>();
    const base = resellerFilter ? markers.filter((m) => m.resellerName === resellerFilter) : markers;
    base.forEach((m) => {
      if (m.clientName) set.add(m.clientName);
    });
    return Array.from(set).sort();
  }, [markers, resellerFilter]);

  const branchList = useMemo(() => {
    const set = new Set<string>();
    markers.forEach((m) => {
      if (m.groupName) set.add(m.groupName);
    });
    return Array.from(set).sort();
  }, [markers]);

  // ── Markers filtrés (statut + revendeur + client + branche + véhicule) ──
  const filteredMarkers = useMemo(() => {
    let result = buildFilteredMarkers(markers, statusFilter, clientFilter, branchFilter);
    if (resellerFilter) result = result.filter((m) => m.resellerName === resellerFilter);
    if (vehicleFilter) result = result.filter((m) => m.id === vehicleFilter);
    return result;
  }, [markers, statusFilter, clientFilter, branchFilter, resellerFilter, vehicleFilter]);

  // ── Supercluster — GeoJSON points + clusters calculés pour le viewport ──
  const clusters = useMemo(() => {
    const points = filteredMarkers.map((m) => ({
      type: 'Feature' as const,
      properties: { cluster: false as const, marker: m },
      geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
    }));
    scRef.current.load(points);
    const { latitude, longitude, latitudeDelta, longitudeDelta } = mapRegion;
    const bbox: [number, number, number, number] = [
      longitude - longitudeDelta / 2,
      latitude - latitudeDelta / 2,
      longitude + longitudeDelta / 2,
      latitude + latitudeDelta / 2,
    ];
    const zoom = Math.min(17, Math.max(1, Math.round(Math.log2(360 / longitudeDelta))));
    return scRef.current.getClusters(bbox, zoom);
  }, [filteredMarkers, mapRegion]);

  const { data: geofences = [] } = useQuery<Geofence[]>({
    queryKey: ['geofences'],
    queryFn: geofencesApi.getAll,
    staleTime: 5 * 60_000,
  });

  // ── Trajet du jour + stats + adresse + alertes (véhicule sélectionné) ────
  const today = new Date().toISOString().slice(0, 10);
  const { data: dayRoute = [] } = useQuery({
    queryKey: ['map-day-route', selectedMarker?.id, today],
    queryFn: () => vehiclesApi.getHistory(selectedMarker!.id, today),
    enabled: !!selectedMarker,
    staleTime: 60_000,
  });

  const { data: dayStats } = useQuery<DayStats>({
    queryKey: ['map-day-stats', selectedMarker?.id, today],
    queryFn: () => vehiclesApi.getDayStats(selectedMarker!.id, today),
    enabled: !!selectedMarker,
    staleTime: 60_000,
  });

  const { data: geocodedAddress } = useQuery<string | null>({
    queryKey: ['map-geocode', selectedMarker?.lat?.toFixed(4), selectedMarker?.lng?.toFixed(4)],
    queryFn: () => vehiclesApi.geocodeCoord(selectedMarker!.lat, selectedMarker!.lng),
    enabled: !!selectedMarker?.hasGps,
    staleTime: Infinity,
  });

  const { data: dayAlerts = [] } = useQuery({
    queryKey: ['map-day-alerts', selectedMarker?.id, today],
    queryFn: () => vehiclesApi.getAlerts(selectedMarker!.id, 50, undefined, today, today),
    enabled: !!selectedMarker,
    staleTime: 60_000,
  });

  // ── Recentrage carte quand le filtre change ──────────────────────────────
  const isFirstFilter = useRef(true);
  useEffect(() => {
    if (isFirstFilter.current) {
      isFirstFilter.current = false;
      return;
    }
    if (filteredMarkers.length === 0) return;
    setTimeout(fitToMarkers, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, resellerFilter, clientFilter, branchFilter, vehicleFilter]);

  // ── WebSocket — état connexion + mise à jour du marker sélectionné ──────
  // Le cycle de vie WS (connect/disconnect) et la sync vehicleStore + React Query
  // sont gérés par useVehicleSync (appelé depuis AppInner, toujours actif).
  // MapScreen souscrit uniquement pour mettre à jour le marker sélectionné.
  useEffect(() => {
    const unsubConnection = wsService.onConnectionChange(setWsConnected);
    const unsubVehicle = wsService.onVehicleUpdate((raw) => {
      const v = normalizeVehicleWS(raw as unknown as Record<string, unknown>);
      setSelectedMarker((prev) => {
        if (!prev || prev.id !== v.id) return prev;
        return {
          ...prev,
          status: v.status,
          lat: v.latitude ?? prev.lat,
          lng: v.longitude ?? prev.lng,
          speed: v.speed ?? 0,
          lastUpdate: v.lastUpdate,
        };
      });
    });
    return () => {
      unsubConnection();
      unsubVehicle();
    };
  }, []);

  // ── Recentrer sur le trajet quand il se charge ───────────────────────────
  useEffect(() => {
    if (!selectedMarker || dayRoute.length < 2) return;
    const coords = dayRoute.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
    // Inclure la position actuelle du véhicule dans le fit
    coords.push({ latitude: selectedMarker.lat, longitude: selectedMarker.lng });
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 120, right: 24, bottom: 260, left: 24 },
        animated: true,
      });
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayRoute]);

  // ── Désactiver tracksViewChanges après stabilisation ────────────────────
  // Délai 2s pour garantir que le bitmap est capturé avant de freezer.
  // Au-delà de 50 marqueurs → on désactive pour les performances.
  useEffect(() => {
    if (clusters.length > 0 && tracksViewChanges) {
      const delay = clusters.length > 50 ? 2000 : 3500;
      const t = setTimeout(() => setTracksViewChanges(false), delay);
      return () => clearTimeout(t);
    }
  }, [clusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-center : centre la carte sur les marqueurs au premier chargement ─
  const hasAutoFit = useRef(false);
  useEffect(() => {
    if (hasAutoFit.current) return;
    if (markers.length > 0 && mapRef.current) {
      hasAutoFit.current = true;
      setTimeout(() => {
        const realMarkers = markers.filter((m) => m.hasGps);
        // Si des véhicules ont une vraie position → zoomer dessus
        // Sinon → zoomer sur le cluster Gulf of Guinea (0,0)
        const targets = realMarkers.length > 0 ? realMarkers : markers;
        mapRef.current?.fitToCoordinates(
          targets.map((m) => ({ latitude: m.lat, longitude: m.lng })),
          { edgePadding: { top: 80, right: 20, bottom: 220, left: 20 }, animated: true }
        );
      }, 600);
    }
  }, [markers]);

  // ── Focus véhicule spécifique (depuis FleetScreen / VehicleDetailScreen) ─
  useEffect(() => {
    if (!targetVehicleId || markers.length === 0) return;
    if (lastFocusedId.current === targetVehicleId) return;
    const target = markers.find((m) => m.id === targetVehicleId);
    if (!target) return;
    lastFocusedId.current = targetVehicleId;
    setSelectedMarker(target);
    setTimeout(() => {
      mapRef.current?.animateCamera(
        { center: { latitude: target.lat, longitude: target.lng }, zoom: 15 },
        { duration: 600 }
      );
    }, 300);
  }, [targetVehicleId, markers]);

  // ── Fit tous les marqueurs au chargement initial ─────────────────────────
  const fitToMarkers = () => {
    const targets = filteredMarkers.length > 0 ? filteredMarkers : markers;
    // Zoomer sur les véhicules avec vraie position GPS ; sinon fallback sur tous
    const realTargets = targets.filter((m) => m.hasGps);
    const coords = (realTargets.length > 0 ? realTargets : targets).map((m) => ({ latitude: m.lat, longitude: m.lng }));
    if (coords.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 20, bottom: 220, left: 20 },
        animated: true,
      });
    }
  };

  const getStatusColor = (status: MapMarker['status']) => VEHICLE_STATUS_COLORS[status] ?? theme.text.muted;
  const getStatusLabel = (status: MapMarker['status']): string => VEHICLE_STATUS_LABELS[status] ?? status;

  // ── Stats — source unique : allVehicles (toute la flotte, même sans GPS)
  const statsSource = allVehicles.length > 0 ? allVehicles : markers;
  const {
    moving: movingCount,
    stopped: stoppedCount,
    idle: idleCount,
    offline: offlineCount,
    total: totalCount,
  } = computeStatusCounts(statsSource);
  const activeFilters =
    (statusFilter !== 'all' ? 1 : 0) +
    (resellerFilter ? 1 : 0) +
    (clientFilter ? 1 : 0) +
    (branchFilter ? 1 : 0) +
    (vehicleFilter ? 1 : 0);
  const onFilterReset = () => {
    setResellerFilter(null);
    setClientFilter(null);
    setBranchFilter(null);
    setVehicleFilter(null);
  };

  // ── Recherche étendue (plaque, nom, IMEI, client, branche, SIM) ──────────
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return filteredMarkers
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.plate.toLowerCase().includes(q) ||
          (m.imei ?? '').toLowerCase().includes(q) ||
          (m.clientName ?? '').toLowerCase().includes(q) ||
          (m.groupName ?? '').toLowerCase().includes(q) ||
          (m.simPhoneNumber ?? '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [searchQuery, filteredMarkers]);

  const focusVehicle = (marker: MapMarker) => {
    setSelectedMarker(marker);
    setSearchQuery('');
    mapRef.current?.animateCamera(
      { center: { latitude: marker.lat, longitude: marker.lng }, zoom: 15 },
      { duration: 500 }
    );
  };

  // ── Blocs filtre VehicleFilterPanel (Revendeur → Clients → Branche → Véhicules) ─
  const filterBlocks: FilterBlockDef[] = useMemo(() => {
    const vehicleItems: FilterItem[] = markers.slice(0, 200).map((m) => ({
      id: m.id,
      label: m.plate,
      sublabel: m.name,
      statusColor: getStatusColor(m.status),
    }));
    return [
      {
        key: 'reseller',
        label: 'Revendeur',
        items: resellerList.map((r) => ({ id: r, label: r })),
        selected: resellerFilter,
        onSelect: (id) => {
          setResellerFilter(id);
          setClientFilter(null); // cascade reset
        },
      },
      {
        key: 'client',
        label: 'Client',
        items: clientList.map((c) => ({ id: c, label: c })),
        selected: clientFilter,
        onSelect: setClientFilter,
      },
      {
        key: 'branch',
        label: 'Branche',
        items: branchList.map((b) => ({ id: b, label: b })),
        selected: branchFilter,
        onSelect: setBranchFilter,
      },
      {
        key: 'vehicle',
        label: 'Véhicules',
        items: vehicleItems,
        selected: vehicleFilter,
        onSelect: (id) => {
          setVehicleFilter(id);
          if (id) {
            const m = markers.find((mm) => mm.id === id);
            if (m) {
              setShowFilters(false);
              focusVehicle(m);
            }
          }
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resellerList, clientList, branchList, markers, resellerFilter, clientFilter, branchFilter, vehicleFilter]);

  return (
    <View style={s.container}>
      {/* Carte plein écran */}
      <MapView
        ref={mapRef}
        style={s.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        mapType={MAP_MODES[mapTypeIndex].mapType}
        showsTraffic={showTraffic && MAP_MODES[mapTypeIndex].key !== 'osm'}
        showsUserLocation
        showsMyLocationButton={false}
        onMapReady={fitToMarkers}
        customMapStyle={MAP_MODES[mapTypeIndex].key === 'standard' && theme.isDark ? DARK_MAP_STYLE : []}
        onRegionChangeComplete={(r) => setMapRegion(r)}
      >
        {/* ── OSM tiles ── */}
        {MAP_MODES[mapTypeIndex].key === 'osm' && (
          <UrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} flipY={false} tileSize={256} zIndex={-1} />
        )}
        {/* ── Clusters + marqueurs véhicules ── */}
        {clusters.map((item) => {
          const [lng, lat] = item.geometry.coordinates;
          const props = item.properties as {
            cluster: boolean;
            cluster_id?: number;
            point_count?: number;
            marker?: MapMarker;
          };
          if (props.cluster) {
            const clusterId = props.cluster_id!;
            const count = props.point_count!;
            return (
              <Marker
                key={`cluster-${clusterId}`}
                coordinate={{ latitude: lat, longitude: lng }}
                tracksViewChanges={tracksViewChanges}
                onPress={() => {
                  const expansionZoom = Math.min(scRef.current.getClusterExpansionZoom(clusterId), 17);
                  const delta = 360 / Math.pow(2, expansionZoom);
                  mapRef.current?.animateToRegion(
                    { latitude: lat, longitude: lng, latitudeDelta: delta * 0.8, longitudeDelta: delta },
                    400
                  );
                }}
              >
                <ClusterMarker count={count} primaryColor={theme.primary} />
              </Marker>
            );
          }
          const marker = props.marker!;
          return (
            <Marker
              key={`v-${marker.id}`}
              coordinate={{ latitude: lat, longitude: lng }}
              anchor={{ x: 0.5, y: 0.72 }}
              tracksViewChanges={tracksViewChanges}
              onPress={() => setSelectedMarker(marker)}
            >
              <View collapsable={false} style={{ alignItems: 'center' }}>
                <View style={s.markerPlate}>
                  <Text style={s.markerPlateText} numberOfLines={1}>
                    {marker.plate}
                  </Text>
                </View>
                <Image
                  source={getMarkerImage(marker.type ?? '', marker.status, marker.hasGps ?? false)}
                  style={s.markerIcon}
                  fadeDuration={0}
                />
              </View>
            </Marker>
          );
        })}

        {/* ── Geofences overlay ── */}
        {showGeofences &&
          geofences
            .filter((g) => g.is_active)
            .map((g) => {
              const color = g.color ?? '#6366F1';
              if (isCircle(g)) {
                const c = g.coordinates;
                return (
                  <Circle
                    key={g.id}
                    center={{ latitude: c.center.lat, longitude: c.center.lng }}
                    radius={c.radius}
                    strokeColor={color}
                    strokeWidth={2}
                    fillColor={color + '33'}
                  />
                );
              }
              const pts = toLatLng(g.coordinates as { lat: number; lng: number }[]);
              if (pts.length < 3) return null;
              return (
                <Polygon key={g.id} coordinates={pts} strokeColor={color} strokeWidth={2} fillColor={color + '33'} />
              );
            })}

        {/* ── Trajet du jour (véhicule sélectionné) ── */}
        {selectedMarker && dayRoute.length > 1 && (
          <>
            <Polyline
              coordinates={dayRoute.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))}
              strokeColor={getStatusColor(selectedMarker.status)}
              strokeWidth={4}
              lineDashPattern={[0]}
              geodesic
              zIndex={5}
            />
            {/* Point de départ — vert avec étiquette D */}
            <Marker
              coordinate={{ latitude: dayRoute[0].latitude, longitude: dayRoute[0].longitude }}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={10}
            >
              <View
                collapsable={false}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#22C55E',
                  borderWidth: 2,
                  borderColor: '#fff',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 9, color: '#fff', fontWeight: '800' }}>D</Text>
              </View>
            </Marker>
            {/* Point d'arrivée — rouge avec étiquette A */}
            <Marker
              coordinate={{
                latitude: dayRoute[dayRoute.length - 1].latitude,
                longitude: dayRoute[dayRoute.length - 1].longitude,
              }}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={10}
            >
              <View
                collapsable={false}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#EF4444',
                  borderWidth: 2,
                  borderColor: '#fff',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 9, color: '#fff', fontWeight: '800' }}>A</Text>
              </View>
            </Marker>
          </>
        )}
      </MapView>

      {/* ── Top bar : stats + WS + recherche + filtres ── */}
      <View style={s.topBar}>
        {/* Ligne 1 : stats cliquables + badge Live */}
        <View style={s.statsRow}>
          <View style={s.statsPills}>
            <StatPill
              label={`${movingCount}`}
              sublabel={VEHICLE_STATUS_LABELS.moving}
              color={VEHICLE_STATUS_COLORS.moving}
              dim={movingCount === 0}
              isActive={statusFilter === 'moving'}
              onPress={() => setStatusFilter(statusFilter === 'moving' ? 'all' : 'moving')}
              theme={theme}
            />
            <StatPill
              label={`${stoppedCount}`}
              sublabel={VEHICLE_STATUS_LABELS.stopped}
              color={VEHICLE_STATUS_COLORS.stopped}
              dim={stoppedCount === 0}
              isActive={statusFilter === 'stopped'}
              onPress={() => setStatusFilter(statusFilter === 'stopped' ? 'all' : 'stopped')}
              theme={theme}
            />
            <StatPill
              label={`${idleCount}`}
              sublabel={VEHICLE_STATUS_LABELS.idle}
              color={VEHICLE_STATUS_COLORS.idle}
              dim={idleCount === 0}
              isActive={statusFilter === 'idle'}
              onPress={() => setStatusFilter(statusFilter === 'idle' ? 'all' : 'idle')}
              theme={theme}
            />
            <StatPill
              label={`${offlineCount}`}
              sublabel={VEHICLE_STATUS_LABELS.offline}
              color={VEHICLE_STATUS_COLORS.offline}
              dim={offlineCount === 0}
              isActive={statusFilter === 'offline'}
              onPress={() => setStatusFilter(statusFilter === 'offline' ? 'all' : 'offline')}
              theme={theme}
            />
            <StatPill
              label={`${totalCount}`}
              sublabel="Total"
              color={theme.primary}
              dim={false}
              isActive={statusFilter === 'all'}
              onPress={() => {
                setStatusFilter('all');
                setResellerFilter(null);
                setClientFilter(null);
                setBranchFilter(null);
                setVehicleFilter(null);
              }}
              theme={theme}
            />
          </View>
          {/* Séparateur vertical */}
          <View style={s.statsDivider} />
          <View style={[s.wsBadge, { borderColor: wsConnected ? theme.status.moving : theme.border }]}>
            {wsConnected ? (
              <Wifi size={13} color={theme.status.moving} />
            ) : (
              <WifiOff size={13} color={theme.text.muted} />
            )}
            <Text style={[s.wsText, { color: wsConnected ? theme.status.moving : theme.text.muted }]}>
              {wsConnected ? 'Live' : 'Hors ligne'}
            </Text>
          </View>
        </View>

        {/* Ligne 2 : barre de recherche compacte + bouton filtres */}
        <View style={s.searchRow}>
          <View style={[s.searchBar, { flex: 1 }]}>
            <Search size={14} color={theme.text.muted} />
            <TextInput
              style={s.searchInput}
              placeholder="Plaque, IMEI, client, SIM…"
              placeholderTextColor={theme.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="characters"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={13} color={theme.text.muted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              s.filterBtn,
              (showFilters || activeFilters > 0) && {
                borderColor: theme.primary,
                backgroundColor: theme.primary + '18',
              },
            ]}
            onPress={() => setShowFilters((v) => !v)}
            accessibilityLabel="Filtres"
          >
            <SlidersHorizontal size={15} color={activeFilters > 0 ? theme.primary : theme.text.muted} />
            {activeFilters > 0 && (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeText}>{activeFilters}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Ligne 3 : filtre cascade (Revendeur → Client → Branche → Véhicules) */}
        <VehicleFilterPanel
          visible={showFilters}
          blocks={filterBlocks}
          hasActiveFilters={!!(resellerFilter || clientFilter || branchFilter || vehicleFilter)}
          onReset={onFilterReset}
        />

        {/* Dropdown résultats recherche */}
        {searchResults.length > 0 && (
          <View style={s.searchDropdown}>
            {searchResults.map((m) => {
              const sc = getStatusColor(m.status);
              return (
                <TouchableOpacity key={m.id} style={s.searchResult} onPress={() => focusVehicle(m)} activeOpacity={0.7}>
                  <View style={[s.searchResultDot, { backgroundColor: sc }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.searchResultName} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text style={s.searchResultPlate}>
                      {m.plate}
                      {m.clientName ? ` · ${m.clientName}` : ''}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={theme.text.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Contrôles carte ── */}
      <View style={s.controls}>
        <TouchableOpacity style={s.controlBtn} onPress={fitToMarkers}>
          <Locate size={18} color={theme.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.controlBtn}
          onPress={() => queryClient.invalidateQueries({ queryKey: QK.vehicles.all() })}
        >
          <RefreshCw size={18} color={theme.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.controlBtn,
            showLayerPicker && { borderColor: theme.primary, backgroundColor: theme.primary + '20' },
          ]}
          onPress={() => setShowLayerPicker((v) => !v)}
        >
          <Layers size={16} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.controlBtn, showGeofences && { borderColor: theme.primary }]}
          onPress={() => setShowGeofences((v) => !v)}
        >
          <Hexagon size={18} color={showGeofences ? theme.primary : theme.text.muted} />
        </TouchableOpacity>
      </View>

      {/* ── Sélecteur de fond de carte ── */}
      {showLayerPicker && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 56,
            right: 64, // à gauche des boutons contrôle (44px + 8px gap + 12px margin)
            backgroundColor: theme.bg.elevated,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.22,
            shadowRadius: 12,
            elevation: 12,
            padding: 8,
            minWidth: 170,
            zIndex: 300,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              color: theme.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 6,
              paddingHorizontal: 6,
            }}
          >
            Fond de carte
          </Text>
          {MAP_MODES.map((mode, idx) => (
            <TouchableOpacity
              key={mode.key}
              onPress={() => {
                setMapTypeIndex(idx);
                setShowLayerPicker(false);
              }}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 10,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: mapTypeIndex === idx ? theme.primary + '20' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 17 }}>{mode.icon}</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: mapTypeIndex === idx ? '700' : '400',
                  color: mapTypeIndex === idx ? theme.primary : theme.text.primary,
                  flex: 1,
                }}
              >
                {mode.label}
              </Text>
              {mapTypeIndex === idx && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
              )}
            </TouchableOpacity>
          ))}

          {/* ── Toggle Trafic ── */}
          <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 6, marginHorizontal: 6 }} />
          <TouchableOpacity
            onPress={() => setShowTraffic((v) => !v)}
            activeOpacity={0.7}
            disabled={MAP_MODES[mapTypeIndex].key === 'osm'}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 10,
              paddingVertical: 9,
              borderRadius: 10,
              opacity: MAP_MODES[mapTypeIndex].key === 'osm' ? 0.4 : 1,
            }}
          >
            <Text style={{ fontSize: 17 }}>🚦</Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: showTraffic ? '700' : '400',
                color: showTraffic ? theme.primary : theme.text.primary,
                flex: 1,
              }}
            >
              Trafic
            </Text>
            <View
              style={{
                width: 34,
                height: 20,
                borderRadius: 10,
                backgroundColor: showTraffic ? theme.primary : theme.border,
                justifyContent: 'center',
                padding: 2,
              }}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: '#fff',
                  alignSelf: showTraffic ? 'flex-end' : 'flex-start',
                }}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Chargement viewport (overlay non bloquant) ── */}
      {viewportFetching && markers.length === 0 && (
        <View style={s.emptyMapBanner}>
          <RefreshCw size={14} color={theme.primary} />
          <Text style={s.emptyMapText}>Chargement des véhicules…</Text>
        </View>
      )}

      {/* ── Aucun marqueur après filtre ── */}
      {!viewportFetching && filteredMarkers.length === 0 && markers.length > 0 && (
        <View style={s.emptyMapBanner}>
          <MapPin size={14} color={theme.text.muted} />
          <Text style={s.emptyMapText}>Aucun véhicule pour ce filtre</Text>
        </View>
      )}
      {!viewportFetching && markers.length === 0 && (
        <View style={s.emptyMapBanner}>
          <MapPin size={14} color={theme.text.muted} />
          <Text style={s.emptyMapText}>Aucun véhicule</Text>
        </View>
      )}

      {/* ── Card marqueur sélectionné ── */}
      {selectedMarker && (
        <View style={s.vehicleCard}>
          <View style={[s.cardStatusBar, { backgroundColor: getStatusColor(selectedMarker.status) }]} />
          <View style={s.cardBody}>
            {/* Ligne 1 : nom + badge statut + fermer */}
            <View style={s.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardName} numberOfLines={1}>
                  {selectedMarker.name}
                </Text>
                <View style={s.cardPlateRow}>
                  <View style={s.cardPlateBadge}>
                    <Text style={s.cardPlate}>{selectedMarker.plate}</Text>
                  </View>
                  <View style={[s.cardStatusBadge, { backgroundColor: getStatusColor(selectedMarker.status) + '22' }]}>
                    <View style={[s.cardStatusDot, { backgroundColor: getStatusColor(selectedMarker.status) }]} />
                    <Text style={[s.cardStatusText, { color: getStatusColor(selectedMarker.status) }]}>
                      {getStatusLabel(selectedMarker.status)}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={s.cardClose} onPress={() => setSelectedMarker(null)}>
                <X size={13} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Ligne 2 : stats compactes */}
            <View style={s.cardStats}>
              <View style={s.cardStat}>
                <Gauge size={12} color={theme.text.muted} />
                <Text style={s.cardStatValue}>{Math.round(selectedMarker.speed ?? 0)}</Text>
                <Text style={s.cardStatUnit}>km/h</Text>
              </View>
              <View style={s.cardStatSep} />
              <View style={s.cardStat}>
                <RouteIcon size={12} color={theme.text.muted} />
                <Text style={s.cardStatValue}>
                  {dayStats?.totalDistance != null ? `${Math.round(dayStats.totalDistance)} km` : '– km'}
                </Text>
              </View>
              {dayAlerts.length > 0 && (
                <>
                  <View style={s.cardStatSep} />
                  <View style={s.cardStat}>
                    <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '700' }}>⚠ {dayAlerts.length}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Ligne 3 : adresse géocodée */}
            {geocodedAddress ? (
              <View style={s.cardAddress}>
                <MapPin size={11} color={theme.text.muted} />
                <Text style={s.cardAddressText} numberOfLines={1}>
                  {geocodedAddress}
                </Text>
              </View>
            ) : null}

            {/* CTA */}
            <TouchableOpacity
              style={s.cardCta}
              onPress={() => navigation.navigate('VehicleDetail', { vehicleId: selectedMarker.id })}
            >
              <Text style={s.cardCtaText}>Détails</Text>
              <ChevronRight size={14} color={theme.text.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── StatPill ──────────────────────────────────────────────────────────────────
function StatPill({
  label,
  sublabel,
  color,
  dim,
  isActive,
  onPress,
  theme,
}: {
  label: string;
  sublabel: string;
  color: string;
  dim: boolean;
  isActive: boolean;
  onPress: () => void;
  theme: ReturnType<typeof import('../../theme').useTheme>['theme'];
}) {
  const displayColor = dim ? theme.text.muted : color;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flex: 1,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 6,
        alignItems: 'center',
        backgroundColor: isActive ? color + '22' : theme.bg.surface,
        borderWidth: isActive ? 1.5 : 0,
        borderColor: isActive ? color : 'transparent',
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '700', color: isActive ? color : displayColor }}>{label}</Text>
      <Text
        style={{
          fontSize: 9,
          color: isActive ? color : theme.text.muted,
          marginTop: 1,
          fontWeight: isActive ? '600' : '400',
        }}
      >
        {sublabel}
      </Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = (theme: ReturnType<typeof import('../../theme').useTheme>['theme'], safeTop: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    map: { width, height },

    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.bg.primary,
      padding: 24,
    },
    centeredText: { marginTop: 12, fontSize: 15, color: theme.text.secondary, textAlign: 'center' },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.primary, borderRadius: 12 },
    retryBtnText: { color: theme.text.onPrimary, fontWeight: '600' },

    topBar: { position: 'absolute', top: safeTop + 8, left: 12, right: 12, gap: 8 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statsPills: { flex: 1, flexDirection: 'row', gap: 5 },
    statsDivider: { width: 1, height: 32, backgroundColor: theme.border, marginHorizontal: 2 },
    wsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.bg.surface,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    wsText: { fontSize: 11, fontWeight: '600' },

    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: theme.bg.surface,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: { flex: 1, fontSize: 13, color: theme.text.primary, padding: 0 },
    filterBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.bg.surface,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
    filterPanel: { paddingVertical: 6 },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    filterChipText: { fontSize: 11, color: theme.text.secondary, maxWidth: 120 },
    searchDropdown: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    searchResult: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchResultDot: { width: 8, height: 8, borderRadius: 4 },
    searchResultName: { fontSize: 13, fontWeight: '600', color: theme.text.primary },
    searchResultPlate: { fontSize: 11, color: theme.text.muted, fontFamily: 'monospace', marginTop: 1 },

    controls: { position: 'absolute', right: 12, top: safeTop + 122, gap: 8 },
    controlBtn: {
      width: 44,
      height: 44,
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    mapTypeLabel: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, alignItems: 'center' },

    emptyMapBanner: {
      position: 'absolute',
      bottom: 80,
      left: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    emptyMapText: { fontSize: 13, color: '#D1D5DB', fontWeight: '500' },

    vehicleCard: {
      position: 'absolute',
      bottom: 80,
      left: 12,
      right: 12,
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      overflow: 'hidden',
      flexDirection: 'row',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: theme.isDark ? 0.5 : 0.15,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardStatusBar: { width: 4 },
    cardBody: { flex: 1, padding: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
    cardTitleGroup: { flex: 1 },
    cardName: { fontSize: 14, fontWeight: '700', color: theme.text.primary },
    cardPlateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    cardPlateBadge: {
      backgroundColor: '#F3F4F6',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: '#D1D5DB',
    },
    cardPlate: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: '#111827',
      letterSpacing: 0.8,
      fontWeight: '700' as const,
    },
    cardStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    cardStatusDot: { width: 5, height: 5, borderRadius: 3 },
    cardStatusText: { fontSize: 10, fontWeight: '600' },
    cardClose: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: theme.bg.elevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardCloseText: { fontSize: 12, color: theme.text.muted },

    cardStats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    cardStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    cardStatSep: { width: 1, height: 12, backgroundColor: theme.border },
    cardStatValue: { fontSize: 13, fontWeight: '700', color: theme.text.primary },
    cardStatUnit: { fontSize: 10, color: theme.text.muted },
    cardStatEmoji: { fontSize: 11 },
    cardStatAddress: { flex: 1 },
    cardStatAddressText: { fontSize: 11, color: theme.text.secondary, flex: 1 },
    cardAddress: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    cardAddressText: { fontSize: 11, color: theme.text.secondary, flex: 1 },

    cardCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 8,
      gap: 4,
    },
    cardCtaText: { fontSize: 13, fontWeight: '600', color: theme.text.onPrimary },

    // ── Marker plate label ────────────────────────────────────────────────────
    markerPlate: {
      backgroundColor: 'rgba(0,0,0,0.82)',
      borderRadius: 5,
      paddingHorizontal: 7,
      paddingVertical: 3,
      marginBottom: 3,
      maxWidth: 110,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.9)',
    },
    markerPlateText: {
      fontSize: 11,
      color: '#fff',
      fontWeight: '700' as const,
      fontFamily: 'monospace',
      letterSpacing: 0.5,
    },
    markerIcon: {
      width: 42,
      height: 42,
    },
  });

// ── Google Maps dark style ─────────────────────────────────────────────────────
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8baac4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d0f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#252540' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2d2d50' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a1a' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
];

export default withErrorBoundary(MapScreen, 'Map');
