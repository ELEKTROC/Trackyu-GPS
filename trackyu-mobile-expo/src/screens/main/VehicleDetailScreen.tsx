/**
 * TrackYu Mobile — Vehicle Detail v2
 * Blocs collapsibles, ordre configurable via AsyncStorage
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Share,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline as MapPolyline, PROVIDER_GOOGLE, type MapType } from 'react-native-maps';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  MapPin,
  History,
  Bell,
  Navigation,
  Battery,
  BatteryLow,
  Zap,
  ZapOff,
  Compass,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Phone,
  Fuel,
  Gauge,
  Route,
  Lock,
  LockOpen,
  Settings,
  Wrench,
  TicketCheck,
  Calendar,
} from 'lucide-react-native';
import { Svg, Polyline as SvgPolyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import vehiclesApi, { type Vehicle, type DayStats, type FuelStats, type VehicleAlert } from '../../api/vehicles';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import { storage } from '../../utils/storage';
import { haptics } from '../../utils/haptics';
import { IMMO_SMS_ROLES } from '../../constants/roles';
import { MARKER_IMAGES } from '../../assets/markers';
import { getTypeKey } from '../../utils/mapUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleDetail'>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  moving: 'En route',
  idle: 'Ralenti',
  stopped: 'Arrêté',
  offline: 'Hors ligne',
};

function formatDate(s?: string) {
  if (!s) return '–';
  return new Date(s).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function secsToHHMM(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

const ALERT_SEVERITY_COLOR: Record<string, string> = {
  HIGH: '#EF4444',
  CRITICAL: '#7C3AED',
  MEDIUM: '#F59E0B',
  LOW: '#22C55E',
  INFO: '#3B82F6',
};

// ── Block IDs & default order ─────────────────────────────────────────────────

type BlockId =
  | 'position'
  | 'immobilize'
  | 'depart'
  | 'activity'
  | 'fuel'
  | 'panne'
  | 'alerts'
  | 'vehicle_info'
  | 'driver'
  | 'subscription';

const DEFAULT_ORDER: BlockId[] = [
  'position',
  'immobilize',
  'depart',
  'activity',
  'fuel',
  'panne',
  'alerts',
  'vehicle_info',
  'subscription',
  'driver',
];
const BLOCK_LABELS: Record<BlockId, string> = {
  position: 'Position & GPS',
  immobilize: 'Immobilisation',
  depart: 'Départ & Dernier arrêt',
  activity: 'Activité du jour',
  fuel: 'Carburant',
  panne: 'Panne',
  alerts: 'Alertes récentes',
  vehicle_info: 'Informations véhicule',
  driver: 'Conducteur',
  subscription: 'Abonnement',
};

type AlertPeriod = 'today' | 'yesterday' | 'week';

const ALERT_TYPE_LABELS: Record<string, string> = {
  SPEEDING: 'Excès de vitesse',
  SPEED: 'Excès de vitesse',
  GEOFENCE_EXIT: 'Sortie zone',
  GEOFENCE_ENTER: 'Entrée zone',
  GEOFENCE: 'Géofence',
  FUEL_THEFT: 'Baisse carburant suspecte',
  FUEL_LOW: 'Carburant bas',
  FUEL: 'Carburant',
  MAINTENANCE: 'Maintenance',
  SOS: 'SOS',
  BATTERY_LOW: 'Batterie faible',
  BATTERY: 'Batterie',
  OFFLINE: 'Hors ligne',
  IGNITION_ON: 'Démarrage',
  IGNITION_OFF: 'Arrêt moteur',
  HARSH_BRAKING: 'Freinage brusque',
  HARSH_ACCELERATION: 'Accélération brusque',
};
const STORAGE_ORDER_KEY = 'vehicle_detail_block_order';
const STORAGE_COLLAPSED_KEY = 'vehicle_detail_collapsed';

// ── Sub-components ────────────────────────────────────────────────────────────

function CollapsibleBlock({
  title,
  icon,
  children,
  collapsed,
  onToggle,
  theme,
  accent,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  theme: ThemeType;
  accent?: string;
}) {
  return (
    <View
      style={{
        marginTop: 12,
        marginHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        overflow: 'hidden',
        backgroundColor: theme.bg.surface,
      }}
    >
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityLabel={`${collapsed ? 'Ouvrir' : 'Fermer'} ${title}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            backgroundColor: (accent ?? theme.primary) + '22',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {icon}
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: '700',
            color: theme.text.primary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Text>
        {collapsed ? (
          <ChevronDown size={16} color={theme.text.muted} />
        ) : (
          <ChevronUp size={16} color={theme.text.muted} />
        )}
      </TouchableOpacity>
      {!collapsed && <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>{children}</View>}
    </View>
  );
}

function InfoRow({
  label,
  value,
  theme,
  last,
  accent,
  copyable,
}: {
  label: string;
  value: string;
  theme: ThemeType;
  last?: boolean;
  accent?: string;
  copyable?: boolean;
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.border,
      }}
      onLongPress={
        copyable
          ? () => {
              Share.share({ message: value });
            }
          : undefined
      }
      activeOpacity={copyable ? 0.7 : 1}
    >
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '60%' }}>
        <Text
          style={{ fontSize: 13, fontWeight: '500', color: accent ?? theme.text.primary, textAlign: 'right' }}
          numberOfLines={2}
        >
          {value}
        </Text>
        {copyable && <Copy size={12} color={theme.text.muted} />}
      </View>
    </TouchableOpacity>
  );
}

function StatPill({ label, value, color, theme }: { label: string; value: string; color: string; theme: ThemeType }) {
  return (
    <View
      style={{ flex: 1, alignItems: 'center', gap: 3, padding: 10, backgroundColor: color + '15', borderRadius: 12 }}
    >
      <Text style={{ fontSize: 15, fontWeight: '700', color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: theme.text.muted, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function BatteryBar({ level, theme }: { level: number; theme: ThemeType }) {
  const color = level < 20 ? theme.functional.error : level < 50 ? theme.functional.warning : theme.functional.success;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {level < 20 ? <BatteryLow size={14} color={color} /> : <Battery size={14} color={color} />}
      <View style={{ flex: 1, height: 6, backgroundColor: theme.border, borderRadius: 3 }}>
        <View style={{ width: `${Math.min(level, 100)}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color }}>{level}%</Text>
    </View>
  );
}

function FuelBar({ level, theme }: { level: number; theme: ThemeType }) {
  const color = level < 15 ? theme.functional.error : level < 30 ? theme.functional.warning : '#22C55E';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Fuel size={14} color={color} />
      <View style={{ flex: 1, height: 6, backgroundColor: theme.border, borderRadius: 3 }}>
        <View style={{ width: `${Math.min(level, 100)}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color }}>{level}%</Text>
    </View>
  );
}

// ── Order modal ───────────────────────────────────────────────────────────────

function OrderModal({
  visible,
  order,
  onClose,
  onSave,
  theme,
}: {
  visible: boolean;
  order: BlockId[];
  onClose: () => void;
  onSave: (o: BlockId[]) => void;
  theme: ThemeType;
}) {
  const [local, setLocal] = useState<BlockId[]>(order);
  useEffect(() => {
    setLocal(order);
  }, [order]);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...local];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setLocal(next);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: '#00000055' }} activeOpacity={1} onPress={onClose} />
      <View
        style={{
          backgroundColor: theme.bg.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          paddingBottom: 40,
          maxHeight: '70%',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary, marginBottom: 16 }}>
          Ordre des blocs
        </Text>
        <ScrollView>
          {local.map((id, idx) => (
            <View
              key={id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                gap: 12,
              }}
            >
              <Text style={{ flex: 1, fontSize: 14, color: theme.text.primary }}>{BLOCK_LABELS[id]}</Text>
              <TouchableOpacity
                onPress={() => move(idx, -1)}
                disabled={idx === 0}
                style={{ opacity: idx === 0 ? 0.3 : 1, padding: 4 }}
              >
                <ChevronUp size={18} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => move(idx, 1)}
                disabled={idx === local.length - 1}
                style={{ opacity: idx === local.length - 1 ? 0.3 : 1, padding: 4 }}
              >
                <ChevronDown size={18} color={theme.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 16,
          }}
          onPress={() => {
            onSave(local);
            onClose();
          }}
        >
          <Text style={{ color: theme.text.onPrimary, fontWeight: '700', fontSize: 15 }}>Enregistrer</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Immobilize confirm modal ──────────────────────────────────────────────────

function ImmobilizeModal({
  visible,
  immobilize,
  isStaff,
  vehicleId,
  onConfirm,
  onCancel,
  theme,
}: {
  visible: boolean;
  immobilize: boolean;
  isStaff: boolean;
  vehicleId: string;
  onConfirm: (method: 'tcp' | 'sms') => void;
  onCancel: () => void;
  theme: ThemeType;
}) {
  const [method, setMethod] = useState<'tcp' | 'sms'>('tcp');
  useEffect(() => {
    if (!visible) setMethod('tcp');
  }, [visible]);

  const { data: lastImmoList = [] } = useQuery({
    queryKey: ['immo-last', vehicleId],
    queryFn: () => vehiclesApi.getAlerts(vehicleId, 1, 'IMMOBILIZATION'),
    enabled: visible,
    staleTime: 30_000,
  });
  const lastImmo = lastImmoList[0] ?? null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: '#00000077', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: theme.bg.surface, borderRadius: 16, padding: 20, gap: 14 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: immobilize ? theme.functional.error : theme.functional.success,
            }}
          >
            {immobilize ? '⚠️ Immobilisation du véhicule' : 'Remise en marche du véhicule'}
          </Text>
          <Text style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 20 }}>
            {immobilize
              ? "Cette action va couper le moteur du véhicule à distance. Assurez-vous que le véhicule est à l'arrêt complet. Vous êtes entièrement responsable des conséquences de cette action."
              : 'Cette action va remettre le véhicule en marche. Assurez-vous de la situation du véhicule avant de procéder.'}
          </Text>
          {lastImmo && (
            <View
              style={{
                backgroundColor: theme.bg.primary,
                borderRadius: 10,
                padding: 10,
                borderWidth: 1,
                borderColor: theme.border,
                gap: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: theme.text.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Dernière action
              </Text>
              <Text style={{ fontSize: 13, color: theme.text.primary, fontWeight: '600' }}>
                {lastImmo.message ?? '—'}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={{ fontSize: 12, color: theme.text.muted }}>
                  {new Date(lastImmo.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                  {' à '}
                  {new Date(lastImmo.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {lastImmo.triggered_by || lastImmo.user_name ? (
                  <Text style={{ fontSize: 12, color: theme.text.muted }}>
                    Par : {lastImmo.triggered_by ?? lastImmo.user_name}
                  </Text>
                ) : null}
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: /échec|erreur|fail/i.test(lastImmo.message ?? '')
                    ? theme.functional.error
                    : theme.functional.success,
                }}
              >
                {/échec|erreur|fail/i.test(lastImmo.message ?? '') ? '✗ Échec' : '✓ Succès'}
              </Text>
            </View>
          )}
          {isStaff && (
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: theme.text.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Mode d'envoi
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: method === 'tcp' ? theme.primary : theme.border,
                    paddingVertical: 10,
                    alignItems: 'center',
                    backgroundColor: method === 'tcp' ? theme.primaryDim : 'transparent',
                  }}
                  onPress={() => setMethod('tcp')}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: method === 'tcp' ? theme.primary : theme.text.secondary,
                    }}
                  >
                    TCP
                  </Text>
                  <Text
                    style={{ fontSize: 11, color: method === 'tcp' ? theme.primary : theme.text.muted, marginTop: 2 }}
                  >
                    Réseau data
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: method === 'sms' ? '#8B5CF6' : theme.border,
                    paddingVertical: 10,
                    alignItems: 'center',
                    backgroundColor: method === 'sms' ? '#8B5CF622' : 'transparent',
                  }}
                  onPress={() => setMethod('sms')}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: method === 'sms' ? '#8B5CF6' : theme.text.secondary,
                    }}
                  >
                    SMS
                  </Text>
                  <Text style={{ fontSize: 11, color: method === 'sms' ? '#8B5CF6' : theme.text.muted, marginTop: 2 }}>
                    Réseau GSM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                paddingVertical: 12,
                alignItems: 'center',
              }}
              onPress={onCancel}
              testID="btn-immo-cancel"
              accessibilityLabel="Annuler"
              accessibilityRole="button"
            >
              <Text style={{ color: theme.text.secondary, fontWeight: '600' }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                borderRadius: 10,
                backgroundColor: immobilize ? theme.functional.error : theme.functional.success,
                paddingVertical: 12,
                alignItems: 'center',
              }}
              onPress={() => onConfirm(method)}
              testID={immobilize ? 'btn-immo-confirm' : 'btn-unimmo-confirm'}
              accessibilityLabel={immobilize ? "Confirmer l'immobilisation" : 'Confirmer la remise en marche'}
              accessibilityRole="button"
              accessibilityHint={immobilize ? 'Action irréversible, le moteur sera coupé à distance' : undefined}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {immobilize ? 'Immobiliser' : 'Remettre en marche'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Immobilization history modal ──────────────────────────────────────────────

function ImmoHistoryModal({
  visible,
  vehicleId,
  theme,
  onClose,
}: {
  visible: boolean;
  vehicleId: string;
  theme: ThemeType;
  onClose: () => void;
}) {
  const { data: history = [], isLoading } = useQuery<VehicleAlert[]>({
    queryKey: ['immo-history', vehicleId],
    queryFn: () => vehiclesApi.getAlerts(vehicleId, 50, 'IMMOBILIZATION'),
    enabled: visible,
    staleTime: 30_000,
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#00000077', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.bg.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            maxHeight: '75%',
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}>
              Historique des immobilisations
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 14, color: theme.primary, fontWeight: '600' }}>Fermer</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 24 }} />
          ) : history.length === 0 ? (
            <Text style={{ fontSize: 13, color: theme.text.muted, textAlign: 'center', marginVertical: 24 }}>
              Aucune immobilisation enregistrée
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {history.map((item, idx) => {
                const isImmo =
                  item.message?.toLowerCase().includes('immobilis') && !item.message?.toLowerCase().includes('remise');
                return (
                  <View
                    key={item.id ?? idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 12,
                      paddingVertical: 10,
                      borderBottomWidth: idx < history.length - 1 ? 1 : 0,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: (isImmo ? theme.functional.error : theme.functional.success) + '22',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: 2,
                      }}
                    >
                      {isImmo ? (
                        <Lock size={14} color={theme.functional.error} />
                      ) : (
                        <LockOpen size={14} color={theme.functional.success} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
                        {item.message ?? (isImmo ? 'Immobilisation' : 'Remise en marche')}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.text.muted, marginTop: 2 }}>
                        {formatDate(item.created_at)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── FuelDetailModal ───────────────────────────────────────────────────────────

type FuelPeriod = 'yesterday' | 'week';
const FUEL_PERIOD_LABELS: Record<FuelPeriod, string> = { yesterday: 'Hier', week: 'Cette semaine' };

function FuelDetailModal({
  visible,
  vehicleId,
  fuelStats,
  theme,
  onClose,
}: {
  visible: boolean;
  vehicleId: string;
  fuelStats: FuelStats | undefined;
  theme: ThemeType;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<FuelPeriod>('yesterday');

  function getRange(p: FuelPeriod): { start: string; end: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (p === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: y.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) };
    }
    const w = new Date(today);
    w.setDate(w.getDate() - 7);
    return { start: w.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
  }

  const range = getRange(period);

  const { data: events = [] } = useQuery({
    queryKey: ['fuel-history', vehicleId, period],
    queryFn: () => vehiclesApi.getFuelHistory(vehicleId, range.start, range.end),
    enabled: visible,
    staleTime: 5 * 60_000,
  });

  const CHART_W = 300;
  const CHART_H = 140;
  const PAD = { left: 30, right: 10, top: 10, bottom: 20 };
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;

  const chartPoints = React.useMemo(() => {
    if (events.length < 2) return null;
    const times = events.map((e) => new Date(e.timestamp).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const rangeT = maxT - minT || 1;
    return events.map((e) => ({
      ...e,
      x: PAD.left + ((new Date(e.timestamp).getTime() - minT) / rangeT) * innerW,
      y: PAD.top + (1 - e.level / 100) * innerH,
    }));
  }, [events, innerW, innerH]);

  const polylinePoints = chartPoints ? chartPoints.map((p) => `${p.x},${p.y}`).join(' ') : '';

  const kpis = [
    {
      label: 'Conso. totale',
      value: fuelStats ? `${Number(fuelStats.totalConsumption ?? 0).toFixed(1)} L` : '–',
      color: theme.primary,
    },
    {
      label: 'Rechargements',
      value: fuelStats
        ? `${fuelStats.refillCount ?? 0}× · ${Number(fuelStats.totalRefillVolume ?? 0).toFixed(0)} L`
        : '–',
      color: theme.functional.success,
    },
    {
      label: 'Baisses susp.',
      value: fuelStats
        ? fuelStats.theftCount > 0
          ? `${fuelStats.theftCount}× · ${Number(fuelStats.totalTheftVolume ?? 0).toFixed(0)} L`
          : 'Aucune'
        : '–',
      color: fuelStats && fuelStats.theftCount > 0 ? theme.functional.error : theme.text.muted,
    },
    {
      label: 'Conso. moy.',
      value: fuelStats ? `${Number(fuelStats.avgConsumption ?? 0).toFixed(1)} L/100km` : '–',
      color: '#8B5CF6',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: '#00000055' }} activeOpacity={1} onPress={onClose} />
      <View
        style={{
          backgroundColor: theme.bg.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          paddingBottom: 40,
          maxHeight: '80%',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Fuel size={18} color="#F59E0B" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary, marginLeft: 8, flex: 1 }}>
            Détails carburant
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 22, color: theme.text.muted }}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Filtre période */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['yesterday', 'week'] as FuelPeriod[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: period === p ? '#F59E0B' : theme.bg.primary,
                borderWidth: 1,
                borderColor: period === p ? '#F59E0B' : theme.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: period === p ? '#fff' : theme.text.secondary }}>
                {FUEL_PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPIs */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {kpis.map((k) => (
            <View
              key={k.label}
              style={{
                flex: 1,
                minWidth: '45%',
                backgroundColor: theme.bg.primary,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>{k.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: k.color }}>{k.value}</Text>
            </View>
          ))}
        </View>

        {/* Courbe SVG */}
        {chartPoints && chartPoints.length >= 2 ? (
          <View
            style={{
              backgroundColor: theme.bg.primary,
              borderRadius: 12,
              padding: 10,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: theme.text.muted,
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              Niveau carburant
            </Text>
            <Svg width={CHART_W} height={CHART_H}>
              {/* Grille */}
              {[0, 25, 50, 75, 100].map((pct) => {
                const y = PAD.top + (1 - pct / 100) * innerH;
                return (
                  <React.Fragment key={pct}>
                    <Line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke={theme.border} strokeWidth={0.5} />
                    <SvgText x={PAD.left - 4} y={y + 4} fontSize={8} fill={theme.text.muted} textAnchor="end">
                      {pct}%
                    </SvgText>
                  </React.Fragment>
                );
              })}
              {/* Courbe */}
              <SvgPolyline points={polylinePoints} fill="none" stroke="#F59E0B" strokeWidth={2} />
              {/* Markers */}
              {chartPoints.map(
                (p, i) =>
                  p.type !== 'normal' && (
                    <Circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={5}
                      fill={p.type === 'refill' ? theme.functional.success : theme.functional.error}
                      stroke="#fff"
                      strokeWidth={1.5}
                    />
                  )
              )}
            </Svg>
            {/* Légende */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.functional.success }} />
                <Text style={{ fontSize: 10, color: theme.text.muted }}>Rechargement</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.functional.error }} />
                <Text style={{ fontSize: 10, color: theme.text.muted }}>Baisse suspecte</Text>
              </View>
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: theme.bg.primary,
              borderRadius: 12,
              padding: 20,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 13, color: theme.text.muted }}>Données de courbe non disponibles</Text>
            <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 4 }}>
              Les KPIs ci-dessus reflètent la période sélectionnée
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function VehicleDetailScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const userRole = useAuthStore((s) => s.user?.role?.toUpperCase() ?? '');
  const isStaff = (IMMO_SMS_ROLES as string[]).includes(userRole);
  const qc = useQueryClient();

  // Bloc order + collapsed state
  const [blockOrder, setBlockOrder] = useState<BlockId[]>(DEFAULT_ORDER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    position: true,
    immobilize: false,
    depart: false,
    activity: false,
    fuel: false,
    panne: false,
    alerts: true,
    vehicle_info: true,
    driver: false,
    subscription: true,
  });
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [showTraffic, setShowTraffic] = useState(false);
  const [showImmoModal, setShowImmoModal] = useState(false);
  const [immoTarget, setImmoTarget] = useState(false);
  const [showImmoHistory, setShowImmoHistory] = useState(false);
  const [alertPeriod] = useState<AlertPeriod>('today');
  const [showFuelModal, setShowFuelModal] = useState(false);

  // Panne optimistic
  const [optimisticPanne, setOptimisticPanne] = useState<boolean | null>(null);

  // Load order/collapsed from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const savedOrder = await storage.getString(STORAGE_ORDER_KEY);
        if (savedOrder) {
          const parsed: BlockId[] = JSON.parse(savedOrder);
          // Merge: add any new blocks from DEFAULT_ORDER that are missing from saved order
          const merged = [...parsed, ...DEFAULT_ORDER.filter((id) => !parsed.includes(id))];
          setBlockOrder(merged);
        }
        const savedCollapsed = await storage.getString(STORAGE_COLLAPSED_KEY);
        if (savedCollapsed) setCollapsed((prev) => ({ ...prev, ...JSON.parse(savedCollapsed) }));
      } catch {}
    })();
  }, []);

  const saveOrder = useCallback(async (o: BlockId[]) => {
    setBlockOrder(o);
    await storage.set(STORAGE_ORDER_KEY, JSON.stringify(o));
  }, []);

  const toggleCollapsed = useCallback(async (id: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      storage.set(STORAGE_COLLAPSED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const today = todayISO();

  // Queries
  const { data: vehicle, isLoading } = useQuery<Vehicle>({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => vehiclesApi.getById(vehicleId),
    refetchInterval: 15000,
  });

  const { data: dayStats } = useQuery<DayStats>({
    queryKey: ['vehicle-day-stats', vehicleId, today],
    queryFn: () => vehiclesApi.getDayStats(vehicleId, today),
    enabled: !!vehicle,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: fuelStats } = useQuery<FuelStats>({
    queryKey: ['vehicle-fuel-stats', vehicleId, today],
    queryFn: () => vehiclesApi.getFuelStats(vehicleId),
    enabled: !!vehicle && !!vehicle.fuelSensorType,
    staleTime: 60_000,
  });

  const { data: tripsToday = [] } = useQuery({
    queryKey: ['vehicle-trips-today', vehicleId, today],
    queryFn: () => vehiclesApi.getTrips(vehicleId, today),
    enabled: !!vehicle,
    staleTime: 60_000,
  });

  const { data: allAlerts = [] } = useQuery<VehicleAlert[]>({
    queryKey: ['vehicle-alerts', vehicleId],
    queryFn: () => vehiclesApi.getAlerts(vehicleId, 200),
    enabled: !collapsed['alerts'],
    staleTime: 2 * 60_000,
  });

  const { data: subscriptionInfo } = useQuery({
    queryKey: ['vehicle-subscription', vehicleId],
    queryFn: () => vehiclesApi.getVehicleSubscription(vehicleId),
    enabled: !collapsed['subscription'],
    staleTime: 5 * 60_000,
  });

  // Trajet du jour pour la mini-carte
  const { data: dayRoute = [] } = useQuery({
    queryKey: ['vehicle-detail-day-route', vehicleId, today],
    queryFn: () => vehiclesApi.getHistory(vehicleId, today),
    enabled:
      !!vehicle &&
      vehicle.latitude != null &&
      vehicle.longitude != null &&
      isFinite(vehicle.latitude) &&
      isFinite(vehicle.longitude) &&
      (vehicle.latitude !== 0 || vehicle.longitude !== 0),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  const routeCoords = useMemo(() => {
    const pts = dayRoute
      .filter((p) => p.latitude !== 0 || p.longitude !== 0)
      .map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
    // Étendre la polyline jusqu'à la position actuelle du véhicule (temps réel)
    if (vehicle && (vehicle.latitude !== 0 || vehicle.longitude !== 0) && pts.length > 0) {
      const last = pts[pts.length - 1];
      if (
        Math.abs(last.latitude - vehicle.latitude) > 0.00001 ||
        Math.abs(last.longitude - vehicle.longitude) > 0.00001
      ) {
        pts.push({ latitude: vehicle.latitude, longitude: vehicle.longitude });
      }
    }
    return pts;
  }, [dayRoute, vehicle?.latitude, vehicle?.longitude]);

  // Distance du jour calculée depuis la polyline — mise à jour en temps réel
  const dayDistanceKm = useMemo(() => {
    if (routeCoords.length < 2) return dayStats?.totalDistance ?? 0;
    return routeCoords.reduce((acc, pt, i) => (i === 0 ? 0 : acc + haversineKm(routeCoords[i - 1], pt)), 0);
  }, [routeCoords, dayStats?.totalDistance]);

  // Ref carte + suivi temps réel du véhicule
  const mapRef = useRef<MapView>(null);
  useEffect(() => {
    if (!mapRef.current || !vehicle?.latitude || !vehicle?.longitude) return;
    mapRef.current.animateToRegion(
      { latitude: vehicle.latitude, longitude: vehicle.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600
    );
  }, [vehicle?.latitude, vehicle?.longitude]);

  // Mutations
  const immoMutation = useMutation({
    mutationFn: ({ immobilize, method }: { immobilize: boolean; method: 'tcp' | 'sms' }) =>
      vehiclesApi.toggleImmobilize(vehicleId, immobilize, method),
    onSuccess: (result, { immobilize }) => {
      haptics.success();
      if (immobilize) haptics.heavy();
      qc.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['immo-history', vehicleId] });
      if (!result.deviceConnected) {
        Alert.alert(
          'Véhicule hors ligne',
          "L'état a été mis à jour en base. La commande sera appliquée à la prochaine connexion du boîtier.",
          [{ text: 'OK' }]
        );
      } else if (result.commandError) {
        Alert.alert('Attention', result.commandError);
      }
    },
    onError: () => {
      haptics.error();
      Alert.alert('Erreur', 'Action impossible. Vérifiez votre connexion.');
    },
  });

  const panneMutation = useMutation({
    mutationFn: (next: boolean) => vehiclesApi.togglePanne(vehicleId, next),
    onMutate: (next) => {
      haptics.medium();
      setOptimisticPanne(next);
    },
    onSuccess: () => {
      setOptimisticPanne(null);
      haptics.success();
      qc.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (_, next) => {
      haptics.error();
      setOptimisticPanne(null);
      Alert.alert('Erreur', `Impossible de ${next ? 'signaler' : 'effacer'} la panne.`);
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.bg.primary, justifyContent: 'center', alignItems: 'center' }}
        edges={['top']}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.bg.primary, justifyContent: 'center', alignItems: 'center' }}
        edges={['top']}
      >
        <Text style={{ fontSize: 16, color: theme.text.secondary }}>Véhicule introuvable</Text>
        <TouchableOpacity
          style={{
            marginTop: 16,
            backgroundColor: theme.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: theme.text.onPrimary, fontWeight: '600' }}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusColor = theme.status[vehicle.status] ?? theme.text.muted;
  const fuelLevel = vehicle.fuelLevel ?? vehicle.fuel;
  const driverName = vehicle.driverName ?? vehicle.driver?.name;
  const driverPhone = vehicle.driverPhone ?? vehicle.driver?.phone;
  const isPanne = optimisticPanne !== null ? optimisticPanne : (vehicle.isPanne ?? false);
  const hasValidCoords =
    vehicle.latitude != null &&
    vehicle.longitude != null &&
    isFinite(vehicle.latitude) &&
    isFinite(vehicle.longitude) &&
    (vehicle.latitude !== 0 || vehicle.longitude !== 0);

  // Trips du jour
  const firstTrip = tripsToday.length > 0 ? tripsToday[0] : null;
  const lastTrip = tripsToday.length > 1 ? tripsToday[tripsToday.length - 1] : firstTrip;

  // Render block
  const renderBlock = (id: BlockId) => {
    switch (id) {
      // ── Position & GPS ──────────────────────────────────────────────────────
      case 'position':
        return (
          <CollapsibleBlock
            key={id}
            title="Position & GPS"
            icon={<MapPin size={16} color={theme.primary} />}
            collapsed={collapsed[id]}
            onToggle={() => toggleCollapsed(id)}
            theme={theme}
          >
            <InfoRow label="Adresse" value={vehicle.address || '–'} theme={theme} />
            <InfoRow label="Dernière MAJ" value={formatDate(vehicle.lastUpdate)} theme={theme} />
            {vehicle.simPhoneNumber && <InfoRow label="SIM" value={vehicle.simPhoneNumber} theme={theme} copyable />}
            {hasValidCoords && (
              <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ fontSize: 12, color: theme.text.muted, marginBottom: 6 }}>Coordonnées</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: theme.primaryDim,
                      paddingVertical: 9,
                      borderRadius: 10,
                    }}
                    onPress={() => Share.share({ message: `${vehicle.latitude}, ${vehicle.longitude}` })}
                  >
                    <Copy size={14} color={theme.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>Copier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: theme.primary,
                      paddingVertical: 9,
                      borderRadius: 10,
                    }}
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps/dir/?api=1&destination=${vehicle.latitude},${vehicle.longitude}`
                      )
                    }
                  >
                    <Navigation size={14} color="#fff" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Aller vers</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </CollapsibleBlock>
        );

      // ── Immobilisation ──────────────────────────────────────────────────────
      case 'immobilize':
        return (
          <CollapsibleBlock
            key={id}
            title="Immobilisation"
            icon={<Lock size={16} color={vehicle.isImmobilized ? theme.functional.error : theme.text.muted} />}
            collapsed={collapsed[id]}
            onToggle={() => toggleCollapsed(id)}
            theme={theme}
            accent={vehicle.isImmobilized ? theme.functional.error : undefined}
          >
            <View style={{ padding: 14, gap: 12 }}>
              {vehicle.isImmobilized && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: theme.functional.error + '18',
                    padding: 10,
                    borderRadius: 10,
                  }}
                >
                  <Lock size={14} color={theme.functional.error} />
                  <Text style={{ fontSize: 13, color: theme.functional.error, fontWeight: '600' }}>
                    Véhicule immobilisé
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
                    {vehicle.isImmobilized ? 'Remettre en marche' : 'Immobiliser le véhicule'}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text.muted, marginTop: 2 }}>
                    {vehicle.isImmobilized
                      ? 'Le véhicule reprendra son fonctionnement normal'
                      : 'Coupe le moteur à distance'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: theme.bg.primary,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                    onPress={() => setShowImmoHistory(true)}
                  >
                    <History size={13} color={theme.text.muted} />
                    <Text style={{ fontSize: 12, color: theme.text.secondary, fontWeight: '500' }}>Historique</Text>
                  </TouchableOpacity>
                  {immoMutation.isPending ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Switch
                      value={vehicle.isImmobilized ?? false}
                      onValueChange={(val) => {
                        setImmoTarget(val);
                        setShowImmoModal(true);
                      }}
                      trackColor={{ false: theme.border, true: theme.functional.error }}
                      thumbColor={vehicle.isImmobilized ? theme.functional.error : theme.text.muted}
                      testID="switch-immobilize"
                      accessibilityLabel={
                        vehicle.isImmobilized ? 'Remettre le véhicule en marche' : 'Immobiliser le véhicule'
                      }
                      accessibilityHint={
                        vehicle.isImmobilized
                          ? 'Remet le moteur en fonctionnement normal'
                          : 'Coupe le moteur à distance'
                      }
                    />
                  )}
                </View>
              </View>
            </View>
          </CollapsibleBlock>
        );

      // ── Départ & Dernier arrêt ──────────────────────────────────────────────
      case 'depart':
        return (
          <CollapsibleBlock
            key={id}
            title="Départ & Dernier arrêt"
            icon={<Route size={16} color="#22C55E" />}
            collapsed={collapsed[id]}
            onToggle={() => toggleCollapsed(id)}
            theme={theme}
            accent="#22C55E"
          >
            {firstTrip ? (
              <>
                <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
                    <Text
                      style={{ fontSize: 11, fontWeight: '700', color: theme.text.muted, textTransform: 'uppercase' }}
                    >
                      Premier départ
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
                    {new Date(firstTrip.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>
                    {firstTrip.start_address ||
                      (firstTrip.start_lat
                        ? `${Number(firstTrip.start_lat).toFixed(4)}, ${Number(firstTrip.start_lng).toFixed(4)}`
                        : '–')}
                  </Text>
                </View>
                <View style={{ padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                    <Text
                      style={{ fontSize: 11, fontWeight: '700', color: theme.text.muted, textTransform: 'uppercase' }}
                    >
                      Dernier arrêt
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
                    {lastTrip?.end_time
                      ? new Date(lastTrip.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      : 'En cours'}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>
                    {lastTrip?.end_address ||
                      (lastTrip?.end_lat
                        ? `${Number(lastTrip.end_lat).toFixed(4)}, ${Number(lastTrip.end_lng).toFixed(4)}`
                        : '–')}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: theme.text.muted }}>Aucun trajet aujourd'hui</Text>
              </View>
            )}
          </CollapsibleBlock>
        );

      // ── Activité du jour ────────────────────────────────────────────────────
      case 'activity':
        return (
          <CollapsibleBlock
            key={id}
            title="Activité du jour"
            icon={<Gauge size={16} color={theme.primary} />}
            collapsed={collapsed[id]}
            onToggle={() => toggleCollapsed(id)}
            theme={theme}
          >
            {dayStats ? (
              <View style={{ padding: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <StatPill
                    label="Distance"
                    value={`${Math.round(dayDistanceKm)} km`}
                    color={theme.primary}
                    theme={theme}
                  />
                  <StatPill label="Trajets" value={String(dayStats.tripsCount)} color="#8B5CF6" theme={theme} />
                  <StatPill
                    label="Vit. max"
                    value={`${Math.round(dayStats.maxSpeed)} km/h`}
                    color="#F59E0B"
                    theme={theme}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <StatPill
                    label={`En conduite`}
                    value={secsToHHMM(dayStats.drivingSeconds)}
                    color={theme.status.moving}
                    theme={theme}
                  />
                  <StatPill
                    label="Arrêté"
                    value={secsToHHMM(dayStats.stoppedSeconds)}
                    color={theme.status.stopped}
                    theme={theme}
                  />
                  <StatPill
                    label="Ralenti"
                    value={secsToHHMM(dayStats.idleSeconds)}
                    color={theme.status.idle}
                    theme={theme}
                  />
                  <StatPill
                    label="Hors ligne"
                    value={secsToHHMM(dayStats.offlineSeconds)}
                    color={theme.status.offline}
                    theme={theme}
                  />
                </View>
              </View>
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            )}
          </CollapsibleBlock>
        );

      // ── Carburant ───────────────────────────────────────────────────────────
      case 'fuel':
        return (
          <CollapsibleBlock
            key={id}
            title="Carburant"
            icon={<Fuel size={16} color="#F59E0B" />}
            collapsed={collapsed[id]}
            onToggle={() => toggleCollapsed(id)}
            theme={theme}
            accent="#F59E0B"
          >
            <View style={{ padding: 14, gap: 12 }}>
              {/* Niveau actuel */}
              {fuelLevel != null && (
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: theme.text.muted }}>Niveau actuel</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text.primary }}>
                      {vehicle.tankCapacity ? `${Math.round((fuelLevel * vehicle.tankCapacity) / 100)} L / ` : ''}
                      {fuelLevel}%
                    </Text>
                  </View>
                  <FuelBar level={fuelLevel} theme={theme} />
                  {vehicle.tankCapacity && (
                    <Text style={{ fontSize: 11, color: theme.text.muted }}>
                      Réservoir : {vehicle.tankCapacity} L · {vehicle.fuelType ?? '–'}
                    </Text>
                  )}
                </View>
              )}
              {/* Stats du jour (si capteur) */}
              {fuelStats ? (
                <>
                  {fuelStats.totalConsumption > 0 && (
                    <InfoRow
                      label="Conso. du jour"
                      value={`${fuelStats.totalConsumption.toFixed(1)} L`}
                      theme={theme}
                    />
                  )}
                  <InfoRow
                    label="Rechargements"
                    value={
                      fuelStats.refillCount > 0
                        ? `${fuelStats.refillCount}× · ${fuelStats.totalRefillVolume.toFixed(0)} L`
                        : 'Aucun'
                    }
                    theme={theme}
                  />
                  <InfoRow
                    label="Baisses suspectes"
                    value={
                      fuelStats.theftCount > 0
                        ? `${fuelStats.theftCount}× · ${fuelStats.totalTheftVolume.toFixed(0)} L`
                        : 'Aucune'
                    }
                    theme={theme}
                    accent={fuelStats.theftCount > 0 ? theme.functional.error : undefined}
                    last
                  />
                </>
              ) : (
                !vehicle.fuelSensorType && (
                  <Text style={{ fontSize: 12, color: theme.text.muted, fontStyle: 'italic' }}>
                    Pas de capteur carburant configuré
                  </Text>
                )
              )}
              {(fuelStats || vehicle.fuelSensorType) && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 4,
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: '#F59E0B44',
                    backgroundColor: '#F59E0B11',
                    borderRadius: 0,
                  }}
                  onPress={() => setShowFuelModal(true)}
                >
                  <Fuel size={14} color="#F59E0B" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#F59E0B' }}>Voir détails & courbe</Text>
                </TouchableOpacity>
              )}
            </View>
          </CollapsibleBlock>
        );

      // ── Panne ───────────────────────────────────────────────────────────────
      case 'panne':
        return (
          <CollapsibleBlock
            key={id}
            title="Panne"
            icon={<AlertTriangle size={16} color={isPanne ? theme.functional.error : theme.text.muted} />}
            collapsed={collapsed[id]}
            onToggle={() => toggleCollapsed(id)}
            theme={theme}
            accent={isPanne ? theme.functional.error : undefined}
          >
            <View style={{ padding: 14, gap: 10 }}>
              {isPanne && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: theme.functional.error + '18',
                    padding: 10,
                    borderRadius: 10,
                  }}
                >
                  <AlertTriangle size={14} color={theme.functional.error} />
                  <Text style={{ fontSize: 13, color: theme.functional.error, fontWeight: '600' }}>
                    Véhicule en panne signalé
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={{
                  backgroundColor: isPanne ? theme.functional.success + '22' : theme.functional.error + '22',
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isPanne ? theme.functional.success : theme.functional.error,
                  opacity: panneMutation.isPending ? 0.6 : 1,
                }}
                onPress={() => panneMutation.mutate(!isPanne)}
                disabled={panneMutation.isPending}
              >
                {panneMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text
                    style={{
                      fontWeight: '700',
                      fontSize: 14,
                      color: isPanne ? theme.functional.success : theme.functional.error,
                    }}
                  >
                    {isPanne ? '✓ Effacer la panne' : '⚠ Signaler une panne'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </CollapsibleBlock>
        );

      // ── Alertes ─────────────────────────────────────────────────────────────
      case 'alerts': {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        const periodStart =
          alertPeriod === 'today' ? todayStart : alertPeriod === 'yesterday' ? yesterdayStart : weekStart;
        const periodEnd = alertPeriod === 'yesterday' ? todayStart : now;
        const alerts = allAlerts.filter((a: VehicleAlert) => {
          const d = new Date(a.created_at);
          return d >= periodStart && d < periodEnd;
        });
        return (
          <CollapsibleBlock
            key={id}
            title="Alertes du jour"
            icon={<Bell size={16} color="#F59E0B" />}
            collapsed={collapsed[id]}
            onToggle={() => toggleCollapsed(id)}
            theme={theme}
            accent="#F59E0B"
          >
            {alerts.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: theme.text.muted }}>Aucune alerte sur cette période</Text>
              </View>
            ) : (
              <>
                {alerts.map((a: VehicleAlert, idx: number) => (
                  <View
                    key={a.id}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderBottomWidth: idx < alerts.length - 1 ? 1 : 0,
                      borderBottomColor: theme.border,
                      gap: 3,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: ALERT_SEVERITY_COLOR[(a.severity ?? '').toUpperCase()] ?? theme.text.muted,
                        }}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary, flex: 1 }}>
                        {ALERT_TYPE_LABELS[a.type] ?? a.type}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.text.muted }}>{formatDate(a.created_at)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: theme.primary }}>{vehicle.plate}</Text>
                      <Text style={{ fontSize: 11, color: theme.text.muted }}>·</Text>
                      <Text style={{ fontSize: 12, color: theme.text.secondary, flex: 1 }}>{a.message}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
            <TouchableOpacity
              style={{ padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border }}
              onPress={() => navigation.navigate('Alerts')}
            >
              <Text style={{ fontSize: 13, color: theme.primary, fontWeight: '600' }}>Voir toutes les alertes →</Text>
            </TouchableOpacity>
          </CollapsibleBlock>
        );
      }

      // ── Informations véhicule ───────────────────────────────────────────────
      case 'vehicle_info':
        return (
          <CollapsibleBlock
            key={id}
            title="Informations véhicule"
            icon={<Wrench size={16} color={theme.text.muted} />}
            collapsed={collapsed[id]}
            onToggle={() => toggleCollapsed(id)}
            theme={theme}
          >
            <InfoRow
              label="Type"
              value={vehicle.type && vehicle.type !== 'unknown' ? vehicle.type : '–'}
              theme={theme}
            />
            <InfoRow label="Marque" value={vehicle.brand || '–'} theme={theme} />
            <InfoRow label="Modèle" value={vehicle.model || '–'} theme={theme} />
            <InfoRow label="VIN" value={vehicle.vin || '–'} theme={theme} copyable />
            <InfoRow label="IMEI" value={vehicle.imei || '–'} theme={theme} copyable />
            {vehicle.simPhoneNumber && <InfoRow label="SIM" value={vehicle.simPhoneNumber} theme={theme} copyable />}
            <InfoRow
              label="Installation"
              value={vehicle.installDate ? formatDate(vehicle.installDate) : '–'}
              theme={theme}
              last
            />
          </CollapsibleBlock>
        );

      // ── Abonnement ──────────────────────────────────────────────────────────
      case 'subscription':
        return (
          <CollapsibleBlock
            key={id}
            title="Abonnement"
            icon={<Calendar size={16} color={theme.primary} />}
            collapsed={collapsed[id]}
            onToggle={() => toggleCollapsed(id)}
            theme={theme}
          >
            <InfoRow label="Client" value={vehicle.clientName || subscriptionInfo?.clientName || '–'} theme={theme} />
            <InfoRow label="Branche" value={vehicle.groupName || subscriptionInfo?.branch || '–'} theme={theme} />
            <InfoRow label="N° Contrat" value={subscriptionInfo?.contractNumber || '–'} theme={theme} copyable />
            <InfoRow label="N° Abonnement" value={subscriptionInfo?.subscriptionNumber || '–'} theme={theme} copyable />
            {vehicle.daysUntilExpiration !== undefined ? (
              <InfoRow
                label="Expiration"
                value={vehicle.daysUntilExpiration <= 0 ? 'Expiré !' : `Dans ${vehicle.daysUntilExpiration} j`}
                theme={theme}
                accent={
                  vehicle.daysUntilExpiration <= 7
                    ? theme.functional.error
                    : vehicle.daysUntilExpiration <= 30
                      ? theme.functional.warning
                      : undefined
                }
              />
            ) : (
              <InfoRow
                label="Expiration"
                value={subscriptionInfo?.expirationDate ? formatDate(subscriptionInfo.expirationDate) : '–'}
                theme={theme}
              />
            )}
            <InfoRow
              label="Statut"
              value={subscriptionInfo?.status ?? '–'}
              theme={theme}
              last
              accent={
                subscriptionInfo?.status === 'ACTIVE'
                  ? theme.functional.success
                  : subscriptionInfo?.status
                    ? theme.functional.warning
                    : undefined
              }
            />
          </CollapsibleBlock>
        );

      // ── Conducteur ──────────────────────────────────────────────────────────
      case 'driver':
        return (
          <CollapsibleBlock
            key={id}
            title="Conducteur"
            icon={<Compass size={16} color={theme.text.muted} />}
            collapsed={collapsed[id]}
            onToggle={() => toggleCollapsed(id)}
            theme={theme}
          >
            <InfoRow label="Nom" value={driverName || 'Non assigné'} theme={theme} />
            {driverPhone ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <View>
                  <Text style={{ fontSize: 12, color: theme.text.muted }}>Téléphone</Text>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary, marginTop: 2 }}>
                    {driverPhone}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#22C55E22',
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 10,
                  }}
                  onPress={() => Linking.openURL(`tel:${driverPhone}`)}
                >
                  <Phone size={14} color="#22C55E" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#22C55E' }}>Appeler</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <InfoRow label="Téléphone" value="–" theme={theme} last />
            )}
          </CollapsibleBlock>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <TouchableOpacity
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: theme.bg.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <ArrowLeft size={20} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }} numberOfLines={1}>
            {vehicle.name}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.muted, fontFamily: 'monospace' }}>{vehicle.plate}</Text>
        </View>
        <TouchableOpacity style={{ padding: 6 }} onPress={() => setShowOrderModal(true)}>
          <Settings size={18} color={theme.text.muted} />
        </TouchableOpacity>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: statusColor + '22',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 10,
          }}
        >
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor }} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor }}>
            {STATUS_LABELS[vehicle.status] ?? vehicle.status}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Mini-carte (400px) ── */}
        <View
          style={{ height: 400, margin: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.bg.surface }}
        >
          {hasValidCoords ? (
            <>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                mapType={mapType}
                showsTraffic={showTraffic}
                initialRegion={{
                  latitude: vehicle.latitude,
                  longitude: vehicle.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {/* Trajet du jour */}
                {routeCoords.length >= 2 && (
                  <MapPolyline
                    coordinates={routeCoords}
                    strokeColor="#3B82F6"
                    strokeWidth={3}
                    lineDashPattern={undefined}
                  />
                )}
                {/* Point de départ du trajet */}
                {routeCoords.length >= 2 && (
                  <Marker coordinate={routeCoords[0]} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: '#22C55E',
                        borderWidth: 2,
                        borderColor: '#fff',
                      }}
                    />
                  </Marker>
                )}
                {/* Position actuelle — key force le re-mount natif à chaque changement de coords */}
                <Marker
                  key={`${vehicle.latitude.toFixed(5)},${vehicle.longitude.toFixed(5)}`}
                  coordinate={{ latitude: vehicle.latitude, longitude: vehicle.longitude }}
                  image={MARKER_IMAGES[getTypeKey(vehicle.type ?? '')][vehicle.status ?? 'offline']}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                />
              </MapView>
              {/* Controls carte — haut droite (type + trafic) */}
              <View style={{ position: 'absolute', top: 12, right: 12, gap: 6 }}>
                <TouchableOpacity
                  onPress={() =>
                    setMapType((t) => (t === 'standard' ? 'satellite' : t === 'satellite' ? 'hybrid' : 'standard'))
                  }
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    minWidth: 74,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
                    {mapType === 'standard' ? '🏙️ Plan' : mapType === 'satellite' ? '🛰️ Satellite' : '🌐 Hybride'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowTraffic((v) => !v)}
                  style={{
                    backgroundColor: showTraffic ? '#E8771A' : 'rgba(0,0,0,0.7)',
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    minWidth: 74,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>🚦 Trafic</Text>
                </TouchableOpacity>
              </View>
              {/* Boutons carte — bas droite, verticaux */}
              <View style={{ position: 'absolute', bottom: 12, right: 12, gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                  }}
                  onPress={() => navigation.navigate('Main', { screen: 'Map', params: { vehicleId } } as never)}
                >
                  <MapPin size={13} color="#fff" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Carte</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                  }}
                  onPress={() =>
                    navigation.navigate('VehicleHistory', {
                      vehicleId,
                      plate: vehicle.plate,
                      vehicleType: vehicle.type ?? 'car',
                    })
                  }
                >
                  <History size={13} color="#fff" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Rejouer</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              <MapPin size={28} color={theme.text.muted} />
              <Text style={{ fontSize: 14, color: theme.text.muted }}>Position GPS indisponible</Text>
            </View>
          )}
        </View>

        {/* ── Pill row temps réel ── */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 16,
            backgroundColor: theme.bg.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            overflow: 'hidden',
          }}
        >
          {[
            {
              icon: <Gauge size={18} color={vehicle.status === 'moving' ? theme.primary : theme.text.muted} />,
              value: `${Math.round(vehicle.speed ?? 0)}`,
              label: 'km/h',
              color: vehicle.status === 'moving' ? theme.primary : theme.text.primary,
            },
            {
              icon: vehicle.isImmobilized ? (
                <Lock size={18} color={theme.functional.error} />
              ) : (
                <LockOpen size={18} color={theme.functional.success} />
              ),
              value: 'Immo.',
              label: vehicle.isImmobilized ? 'Actif' : 'Inactif',
              color: vehicle.isImmobilized ? theme.functional.error : theme.functional.success,
            },
            {
              icon: vehicle.ignition ? (
                <Zap size={18} color="#22C55E" />
              ) : (
                <ZapOff size={18} color={theme.text.muted} />
              ),
              value: vehicle.ignition === undefined ? '–' : vehicle.ignition ? 'ON' : 'OFF',
              label: 'Contact',
              color: vehicle.ignition ? '#22C55E' : theme.text.muted,
            },
            {
              icon: <Route size={18} color={theme.text.muted} />,
              value: (() => {
                const m = vehicle.mileage;
                if (!m || m <= 0) return '–';
                if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(1)}M`;
                if (m >= 10_000) return `${Math.round(m / 1000)}k`;
                return Math.round(m).toLocaleString('fr-FR');
              })(),
              label: 'km',
              color: theme.text.primary,
            },
          ].map((pill, idx, arr) => (
            <React.Fragment key={idx}>
              <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 }}>
                {pill.icon}
                <Text style={{ fontSize: 16, fontWeight: '700', color: pill.color }}>{pill.value}</Text>
                <Text style={{ fontSize: 10, color: theme.text.muted }}>{pill.label}</Text>
              </View>
              {idx < arr.length - 1 && <View style={{ width: 1, backgroundColor: theme.border, marginVertical: 12 }} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Batterie GPS ── */}
        {typeof vehicle.battery === 'number' && !isNaN(vehicle.battery) && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: theme.bg.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 14,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: theme.text.muted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Batterie GPS
            </Text>
            <BatteryBar level={vehicle.battery} theme={theme} />
          </View>
        )}

        {/* ── Blocs collapsibles ── */}
        {blockOrder.map((id) => renderBlock(id))}

        {/* ── Actions bas de page ── */}
        <View style={{ marginHorizontal: 16, marginTop: 16, gap: 10 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: theme.text.muted,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Actions
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.bg.surface,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() =>
                navigation.navigate('VehicleHistory', {
                  vehicleId,
                  plate: vehicle.plate,
                  vehicleType: vehicle.type ?? 'car',
                })
              }
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  backgroundColor: theme.primaryDim,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <History size={20} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 11, color: theme.text.secondary, fontWeight: '500', textAlign: 'center' }}>
                Historique
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.bg.surface,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() =>
                navigation.navigate('CreateTicket', {
                  vehicleId,
                  vehicleName: vehicle.name,
                  vehiclePlate: vehicle.plate,
                })
              }
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  backgroundColor: '#F59E0B22',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <TicketCheck size={20} color="#F59E0B" />
              </View>
              <Text style={{ fontSize: 11, color: theme.text.secondary, fontWeight: '500', textAlign: 'center' }}>
                Signaler
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.bg.surface,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => navigation.navigate('Portal')}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  backgroundColor: '#22C55E22',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Calendar size={20} color="#22C55E" />
              </View>
              <Text style={{ fontSize: 11, color: theme.text.secondary, fontWeight: '500', textAlign: 'center' }}>
                Abonnement
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Modals ── */}
      <OrderModal
        visible={showOrderModal}
        order={blockOrder}
        onClose={() => setShowOrderModal(false)}
        onSave={saveOrder}
        theme={theme}
      />
      <ImmobilizeModal
        visible={showImmoModal}
        immobilize={immoTarget}
        isStaff={isStaff}
        vehicleId={vehicleId}
        onCancel={() => setShowImmoModal(false)}
        onConfirm={(method) => {
          setShowImmoModal(false);
          immoMutation.mutate({ immobilize: immoTarget, method });
        }}
        theme={theme}
      />
      <ImmoHistoryModal
        visible={showImmoHistory}
        vehicleId={vehicleId}
        theme={theme}
        onClose={() => setShowImmoHistory(false)}
      />
      <FuelDetailModal
        visible={showFuelModal}
        vehicleId={vehicleId}
        fuelStats={fuelStats}
        theme={theme}
        onClose={() => setShowFuelModal(false)}
      />
    </SafeAreaView>
  );
}

export default VehicleDetailScreen;
