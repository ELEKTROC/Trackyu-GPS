/**
 * TrackYu Mobile — Intervention Detail
 * Navigation par sections verticales (style accordion)
 * Sections : DEMANDE | VÉHICULE | TECHNIQUE | CLÔTURE
 * Validation progressive : indicateur par section
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Navigation,
  Clock,
  User,
  Save,
  Truck,
  Activity,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Check,
  FileText,
  ChevronDown,
  ChevronRight,
  Download,
  PenLine,
  Ticket,
  X,
  Tag,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import interventionsApi, {
  type Intervention,
  type InterventionStatus,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../api/interventions';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import SignaturePad from '../../components/SignaturePad';
import { downloadBonIntervention, downloadRapportIntervention } from '../../services/interventionPdfService';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'InterventionDetail'>;
type TH = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FLOW: InterventionStatus[] = ['PENDING', 'SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'];

const NEXT_ACTION: Partial<Record<InterventionStatus, { label: string; next: InterventionStatus; color: string }>> = {
  SCHEDULED: { label: 'Partir en route', next: 'EN_ROUTE', color: '#8B5CF6' },
  EN_ROUTE: { label: "Démarrer l'intervention", next: 'IN_PROGRESS', color: '#06B6D4' },
  // IN_PROGRESS : le CTA "Terminer" est géré dans ContentCloture, pas ici
};

const MATERIAL_OPTIONS = [
  'Boîtier GPS',
  'Carte SIM',
  'Câble alimentation',
  'Câble OBD',
  'Sonde carburant',
  'Capteur température',
  'Relais',
  'Antenne GPS',
  'Visserie',
  'Colle double face',
  'Colliers de serrage',
];

const DEVICE_LOCATIONS = [
  'Tableau de bord',
  'Sous siège conducteur',
  'Coffre',
  'Moteur',
  'Cabine',
  'Châssis',
  'Plancher',
];

const PROBE_TYPES = ['CANBUS', 'CAPACITIVE', 'ULTRASONIC'];

const REMOVED_STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'FUNCTIONAL', label: 'Fonctionnel', color: '#22C55E' },
  { value: 'FAULTY', label: 'Défectueux', color: '#EF4444' },
  { value: 'DAMAGED', label: 'Endommagé', color: '#F97316' },
  { value: 'UNKNOWN', label: 'Inconnu', color: '#6B7280' },
];

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  // Identité véhicule (éditables par le technicien)
  licensePlate: string;
  wwPlate: string;
  vehicleType: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleYear: string;
  vin: string;
  // Checklist véhicule
  checkStart: boolean;
  checkLights: boolean;
  checkDashboard: boolean;
  checkAC: boolean;
  checkAudio: boolean;
  checkBattery: boolean;
  observations: string;
  vehicleMileage: string; // odometer — requis selon required_fields
  // Technique
  imei: string;
  sim: string; // champ canonique backend
  iccid: string;
  deviceLocation: string;
  fuelSensorType: string; // champ canonique backend
  sensorSerial: string;
  material: string[];
  // Remplacement / Transfert
  newImei: string;
  newSim: string;
  oldDeviceImei: string;
  oldSimId: string;
  removedMaterialStatus: string;
  // Clôture
  notes: string;
  cost: string;
  updateContract: boolean;
  generateInvoice: boolean;
  confirmedTech: boolean;
  confirmedClient: boolean;
  clientSignatureName: string;
  signatureTech: string; // base64 PNG data URI
  signatureClient: string; // base64 PNG data URI
}

const EMPTY_FORM: FormState = {
  licensePlate: '',
  wwPlate: '',
  vehicleType: '',
  vehicleBrand: '',
  vehicleModel: '',
  vehicleColor: '',
  vehicleYear: '',
  vin: '',
  checkStart: false,
  checkLights: false,
  checkDashboard: false,
  checkAC: false,
  checkAudio: false,
  checkBattery: false,
  observations: '',
  vehicleMileage: '',
  imei: '',
  sim: '',
  iccid: '',
  deviceLocation: '',
  fuelSensorType: '',
  sensorSerial: '',
  material: [],
  newImei: '',
  newSim: '',
  oldDeviceImei: '',
  oldSimId: '',
  removedMaterialStatus: '',
  notes: '',
  cost: '',
  updateContract: false,
  generateInvoice: false,
  confirmedTech: false,
  confirmedClient: false,
  clientSignatureName: '',
  signatureTech: '',
  signatureClient: '',
};

// ── Helpers UI structurels (affichage conditionnel de sections) ───────────────
// Note : la VALIDATION des champs est pilotée par iv.requiredFields (config DB)

/** Statut retiré obligatoire quand un appareil est désinstallé ou remplacé */
const needsRemovedStatus = (iv: { nature?: string; stockImpact?: { action: string } }) =>
  iv.stockImpact?.action === 'IN' ||
  iv.stockImpact?.action === 'SWAP' ||
  ['Retrait', 'Remplacement', 'Désinstallation'].includes(iv.nature ?? '');

/** Affiche les champs "ancien appareil retiré" pour Remplacement / Transfert */
const showOldDeviceFields = (iv: { nature?: string; stockImpact?: { action: string } }) =>
  iv.stockImpact?.action === 'SWAP' ||
  iv.stockImpact?.action === 'TRANSFER' ||
  ['Remplacement', 'Transfert'].includes(iv.nature ?? '');

/** Champs technique obligatoires selon la config DB */
function getTechRequired(rf: string[]) {
  return {
    imei: rf.includes('imei'),
    iccid: rf.includes('iccid'),
    sensorSerial: rf.includes('sensor_serial'),
    odometer: rf.includes('odometer'),
    tankCapacity: rf.includes('tank_capacity'),
  };
}

// ── Shared atoms ──────────────────────────────────────────────────────────────

function Row2({ a, b }: { a: React.ReactNode; b: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1 }}>{a}</View>
      <View style={{ flex: 1 }}>{b}</View>
    </View>
  );
}

function Field({
  label,
  value,
  ph,
  onChange,
  kbd,
  required,
  t,
}: {
  label: string;
  value?: string;
  ph?: string;
  onChange?: (v: string) => void;
  kbd?: import('react-native').KeyboardTypeOptions;
  required?: boolean;
  t: TH;
}) {
  const editable = !!onChange;
  const empty = required && editable && !value?.trim();
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: t.text.muted,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
        {required && <Text style={{ fontSize: 11, color: '#EF4444' }}>*</Text>}
      </View>
      {editable ? (
        <TextInput
          style={{
            backgroundColor: t.bg.elevated,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            borderWidth: 1,
            borderColor: empty ? '#EF444455' : t.border,
            color: t.text.primary,
          }}
          value={value ?? ''}
          placeholder={ph ?? ''}
          placeholderTextColor={t.text.muted}
          onChangeText={onChange}
          keyboardType={kbd}
          autoCapitalize="none"
        />
      ) : (
        <Text style={{ fontSize: 14, color: value ? t.text.primary : t.text.muted }}>{value || '–'}</Text>
      )}
    </View>
  );
}

function CheckRow({
  label,
  value,
  onToggle,
  t,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  t: TH;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ fontSize: 14, color: t.text.primary }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: t.border, true: '#22C55E44' }}
        thumbColor={value ? '#22C55E' : t.text.muted}
      />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  color,
  t,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
  t: TH;
}) {
  return (
    <TouchableOpacity
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 6,
        marginBottom: 6,
        backgroundColor: active ? (color ?? t.primary) : t.bg.elevated,
        borderColor: active ? (color ?? t.primary) : t.border,
      }}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : t.text.secondary }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Divider({ t }: { t: TH }) {
  return <View style={{ height: 1, backgroundColor: t.border }} />;
}

// ── Status progression ────────────────────────────────────────────────────────

function StatusProgressBar({ status, t }: { status: InterventionStatus; t: TH }) {
  const idx = STATUS_FLOW.indexOf(status);
  if (['CANCELLED', 'POSTPONED'].includes(status)) {
    const color = STATUS_COLORS[status] ?? '#6B7280';
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View
          style={{
            backgroundColor: color + '22',
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AlertCircle size={13} color={color} />
          <Text style={{ fontSize: 12, fontWeight: '700', color }}>{STATUS_LABELS[status]}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {STATUS_FLOW.map((s, i) => {
          const done = i <= idx;
          const current = i === idx;
          const color = done ? STATUS_COLORS[s] : t.border;
          return (
            <React.Fragment key={s}>
              {i > 0 && (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: i <= idx ? STATUS_COLORS[STATUS_FLOW[i - 1]] : t.border,
                  }}
                />
              )}
              <View style={{ alignItems: 'center', gap: 2 }}>
                <View
                  style={{
                    width: current ? 26 : 18,
                    height: current ? 26 : 18,
                    borderRadius: current ? 13 : 9,
                    backgroundColor: done ? color : t.bg.elevated,
                    borderWidth: current ? 2 : 1,
                    borderColor: done ? color : t.border,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {done && !current && <Check size={10} color="#fff" />}
                  {current && <Activity size={12} color="#fff" />}
                </View>
                <Text
                  style={{ fontSize: 8, color: done ? color : t.text.muted, fontWeight: current ? '700' : '500' }}
                  numberOfLines={1}
                >
                  {STATUS_LABELS[s].split(' ')[0]}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

// ── Section row (style vertical tab) ─────────────────────────────────────────

function SectionRow({
  icon,
  label,
  sublabel,
  valid,
  open,
  onPress,
  t,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  valid: boolean | null;
  open: boolean;
  onPress: () => void;
  t: TH;
}) {
  const dotColor = valid === true ? '#22C55E' : valid === false ? '#EF4444' : t.border;
  return (
    <TouchableOpacity
      style={[ss.row, { borderColor: t.border, backgroundColor: open ? t.bg.surface : t.bg.primary }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[ss.rowIcon, { backgroundColor: t.bg.elevated }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: t.text.primary }}>{label}</Text>
        {sublabel ? <Text style={{ fontSize: 12, color: t.text.muted, marginTop: 1 }}>{sublabel}</Text> : null}
      </View>
      {valid !== null && (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor, marginRight: 10 }} />
      )}
      {open ? <ChevronDown size={18} color={t.text.muted} /> : <ChevronRight size={18} color={t.text.muted} />}
    </TouchableOpacity>
  );
}

// ── Vehicle Option type ───────────────────────────────────────────────────────

interface VehicleOption {
  id: string;
  plate: string;
  name?: string;
  brand?: string;
  model?: string;
  vehicleType?: string;
  vin?: string;
  imei?: string; // IMEI du boîtier actuellement installé (objects.imei)
  clientId?: string;
}

// ── Vehicle Picker Modal ──────────────────────────────────────────────────────

function VehiclePickerModal({
  visible,
  vehicles,
  onSelect,
  onClose,
  t,
}: {
  visible: boolean;
  vehicles: VehicleOption[];
  onSelect: (v: VehicleOption) => void;
  onClose: () => void;
  t: TH;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    if (!q.trim()) return vehicles;
    const lq = q.toLowerCase();
    return vehicles.filter(
      (v) =>
        (v.plate ?? '').toLowerCase().includes(lq) ||
        (v.name ?? '').toLowerCase().includes(lq) ||
        (v.brand ?? '').toLowerCase().includes(lq) ||
        (v.model ?? '').toLowerCase().includes(lq)
    );
  }, [vehicles, q]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: '#00000055' }} activeOpacity={1} onPress={onClose} />
      <View
        style={{
          backgroundColor: t.bg.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 16,
          maxHeight: '70%',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: t.text.primary }}>Sélectionner un véhicule</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={t.text.muted} />
          </TouchableOpacity>
        </View>
        <TextInput
          style={{
            backgroundColor: t.bg.elevated,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 12,
            paddingVertical: 9,
            fontSize: 14,
            color: t.text.primary,
            marginBottom: 10,
          }}
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher par plaque, nom, marque…"
          placeholderTextColor={t.text.muted}
          autoFocus
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <Text style={{ textAlign: 'center', color: t.text.muted, paddingVertical: 24 }}>Aucun véhicule trouvé</Text>
          ) : (
            filtered.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => {
                  onSelect(v);
                  onClose();
                  setQ('');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 11,
                  borderBottomWidth: 1,
                  borderBottomColor: t.border + '55',
                }}
                activeOpacity={0.75}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    backgroundColor: t.primaryDim,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Truck size={16} color={t.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: t.text.primary }}>{v.plate || '–'}</Text>
                  {(v.brand || v.model || v.name) && (
                    <Text style={{ fontSize: 12, color: t.text.muted }} numberOfLines={1}>
                      {[v.brand, v.model, v.name].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <ChevronRight size={14} color={t.text.muted} />
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const ss = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});

// ── Section contents ──────────────────────────────────────────────────────────

// ── Ticket Preview Modal ──────────────────────────────────────────────────────

const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  PENDING: 'En attente',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
  CANCELLED: 'Annulé',
};
const TICKET_STATUS_COLORS: Record<string, string> = {
  OPEN: '#3B82F6',
  IN_PROGRESS: '#F97316',
  PENDING: '#F59E0B',
  RESOLVED: '#22C55E',
  CLOSED: '#6B7280',
  CANCELLED: '#EF4444',
};
const TICKET_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
  URGENT: 'Urgent',
};

function TicketPreviewModal({
  ticketId,
  visible,
  onClose,
  t,
}: {
  ticketId: string;
  visible: boolean;
  onClose: () => void;
  t: TH;
}) {
  const {
    data: ticket,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['ticket-preview', ticketId],
    queryFn: async () => {
      const res = await apiClient.get(`/tickets/${ticketId}`);
      return res.data;
    },
    enabled: visible && !!ticketId,
    staleTime: 60_000,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: '#00000055' }} activeOpacity={1} onPress={onClose} />
      <View
        style={{
          backgroundColor: t.bg.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          gap: 14,
          maxHeight: '70%',
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ticket size={18} color={t.primary} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.text.primary }}>Ticket lié</Text>
            <View style={{ backgroundColor: t.primaryDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: t.primary }}>{ticketId}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={t.text.muted} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={t.primary} style={{ paddingVertical: 32 }} />
        ) : isError ? (
          <Text style={{ color: '#EF4444', textAlign: 'center', paddingVertical: 20 }}>
            Impossible de charger le ticket
          </Text>
        ) : ticket ? (
          <ScrollView showsVerticalScrollIndicator={false} style={{ gap: 10 }}>
            {/* Sujet */}
            <Text style={{ fontSize: 16, fontWeight: '700', color: t.text.primary, marginBottom: 4 }}>
              {ticket.subject ?? ticket.title ?? '–'}
            </Text>

            {/* Statut + priorité */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {ticket.status && (
                <View
                  style={{
                    backgroundColor: (TICKET_STATUS_COLORS[ticket.status] ?? '#6B7280') + '22',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{ fontSize: 12, fontWeight: '700', color: TICKET_STATUS_COLORS[ticket.status] ?? '#6B7280' }}
                  >
                    {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
                  </Text>
                </View>
              )}
              {ticket.priority && (
                <View
                  style={{
                    backgroundColor: t.bg.elevated,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Tag size={11} color={t.text.muted} />
                  <Text style={{ fontSize: 12, color: t.text.secondary }}>
                    {TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                  </Text>
                </View>
              )}
            </View>

            {/* Description */}
            {ticket.description && (
              <View
                style={{
                  backgroundColor: t.bg.elevated,
                  borderRadius: 10,
                  padding: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: t.primary,
                }}
              >
                <Text style={{ fontSize: 13, color: t.text.primary, lineHeight: 20 }}>{ticket.description}</Text>
              </View>
            )}

            {/* Méta */}
            <View style={{ gap: 6, marginTop: 8 }}>
              {ticket.clientName && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 12, color: t.text.muted, width: 80 }}>Client</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: t.text.primary }}>{ticket.clientName}</Text>
                </View>
              )}
              {ticket.createdAt && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 12, color: t.text.muted, width: 80 }}>Créé le</Text>
                  <Text style={{ fontSize: 12, color: t.text.secondary }}>
                    {new Date(ticket.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              )}
              {ticket.assigneeName && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 12, color: t.text.muted, width: 80 }}>Assigné à</Text>
                  <Text style={{ fontSize: 12, color: t.text.secondary }}>{ticket.assigneeName}</Text>
                </View>
              )}
            </View>
            <View style={{ height: 20 }} />
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

function ContentDemande({ iv, t }: { iv: Intervention; t: TH }) {
  const [ticketVisible, setTicketVisible] = useState(false);

  const scheduledFmt = iv.scheduledDate
    ? new Date(iv.scheduledDate).toLocaleString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '–';

  return (
    <View style={{ padding: 16, gap: 14, backgroundColor: 'transparent' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Clock size={14} color={t.text.muted} />
        <Text style={{ fontSize: 14, color: t.text.primary, flex: 1 }}>{scheduledFmt}</Text>
        {iv.duration > 0 && <Text style={{ fontSize: 12, color: t.text.muted }}>{iv.duration} min</Text>}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <View
          style={{
            backgroundColor: (STATUS_COLORS[iv.status] ?? '#6B7280') + '22',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 10,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: STATUS_COLORS[iv.status] ?? '#6B7280' }}>
            {STATUS_LABELS[iv.status]}
          </Text>
        </View>
        <View style={{ backgroundColor: t.bg.elevated, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
          <Text style={{ fontSize: 12, color: t.text.secondary }}>{iv.nature}</Text>
        </View>
      </View>

      {/* Ticket lié */}
      {iv.ticketId && (
        <TouchableOpacity
          onPress={() => setTicketVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: t.bg.elevated,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: t.border,
          }}
          activeOpacity={0.75}
        >
          <Ticket size={14} color={t.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.primary }}>{iv.ticketId}</Text>
            {(iv as any).ticketTitle && (
              <Text style={{ fontSize: 12, color: t.text.secondary }} numberOfLines={1}>
                {(iv as any).ticketTitle}
              </Text>
            )}
          </View>
          <ChevronRight size={14} color={t.text.muted} />
        </TouchableOpacity>
      )}

      {iv.ticketId && (
        <TicketPreviewModal
          ticketId={iv.ticketId}
          visible={ticketVisible}
          onClose={() => setTicketVisible(false)}
          t={t}
        />
      )}

      {iv.contactPhone && (
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: t.primaryDim,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
          onPress={() => Linking.openURL(`tel:${iv.contactPhone}`)}
        >
          <Phone size={14} color={t.primary} />
          <Text style={{ fontSize: 14, color: t.primary, fontWeight: '500' }}>{iv.contactPhone}</Text>
        </TouchableOpacity>
      )}
      {(iv.address || iv.location) && (
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: t.primaryDim,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
          onPress={() => {
            const a = iv.address ?? iv.location;
            if (a) Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(a)}`);
          }}
        >
          <Navigation size={14} color={t.primary} />
          <Text style={{ fontSize: 14, color: t.primary, fontWeight: '500', flex: 1 }} numberOfLines={2}>
            {iv.address ?? iv.location}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SectionTitle({ label, t }: { label: string; t: TH }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: t.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 2,
      }}
    >
      {label}
    </Text>
  );
}

function ContentVehicule({
  iv,
  form,
  patch,
  clientVehicles,
  onVehicleSelect,
  t,
}: {
  iv: Intervention;
  form: FormState;
  patch: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  clientVehicles: VehicleOption[];
  onVehicleSelect: (v: VehicleOption) => void;
  t: TH;
}) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const rf = (iv.requiredFields ?? []) as string[];
  const odometerRequired = rf.includes('odometer');

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {/* ── 1. Identité véhicule ───────────────────────────────────────────── */}
      <SectionTitle label="Identité véhicule" t={t} />

      {iv.vehicleName ? <Field label="Désignation client" value={iv.vehicleName} t={t} /> : null}

      {/* Sélecteur véhicule client */}
      {clientVehicles.length > 0 && (
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: form.licensePlate ? t.primaryDim : t.bg.elevated,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: form.licensePlate ? t.primary : t.border,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
          activeOpacity={0.8}
        >
          <Truck size={15} color={form.licensePlate ? t.primary : t.text.muted} />
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              color: form.licensePlate ? t.primary : t.text.muted,
              fontWeight: form.licensePlate ? '600' : '400',
            }}
          >
            {form.licensePlate || 'Sélectionner un véhicule client…'}
          </Text>
          <ChevronDown size={14} color={t.text.muted} />
        </TouchableOpacity>
      )}

      <VehiclePickerModal
        visible={pickerVisible}
        vehicles={clientVehicles}
        onSelect={onVehicleSelect}
        onClose={() => setPickerVisible(false)}
        t={t}
      />

      <Row2
        a={
          <Field
            label="Plaque immat."
            value={form.licensePlate}
            ph="Ex : AA 000 AA"
            onChange={(v) => patch('licensePlate', v)}
            t={t}
          />
        }
        b={<Field label="Plaque WW" value={form.wwPlate} ph="WW-000-AA" onChange={(v) => patch('wwPlate', v)} t={t} />}
      />

      <Field
        label="Type d'engin"
        value={form.vehicleType}
        ph="Ex : Voiture, Camion, Moto…"
        onChange={(v) => patch('vehicleType', v)}
        t={t}
      />

      <Row2
        a={
          <Field
            label="Marque"
            value={form.vehicleBrand}
            ph="Ex : Toyota"
            onChange={(v) => patch('vehicleBrand', v)}
            t={t}
          />
        }
        b={
          <Field
            label="Modèle"
            value={form.vehicleModel}
            ph="Ex : Hilux"
            onChange={(v) => patch('vehicleModel', v)}
            t={t}
          />
        }
      />

      <Row2
        a={
          <Field
            label="Couleur"
            value={form.vehicleColor}
            ph="Ex : Blanc"
            onChange={(v) => patch('vehicleColor', v)}
            t={t}
          />
        }
        b={
          <Field
            label="Année"
            value={form.vehicleYear}
            ph="Ex : 2022"
            onChange={(v) => patch('vehicleYear', v)}
            kbd="numeric"
            t={t}
          />
        }
      />

      <Field label="VIN / Châssis" value={form.vin} ph="Ex : VF1AA0…" onChange={(v) => patch('vin', v)} t={t} />

      <Divider t={t} />

      {/* ── 2. Compteurs ──────────────────────────────────────────────────── */}
      <SectionTitle label="Compteurs" t={t} />

      <Row2
        a={
          <Field
            label="Kilométrage (km)"
            value={form.vehicleMileage}
            ph={iv.vehicleMileage !== undefined ? String(iv.vehicleMileage) : '0'}
            onChange={(v) => patch('vehicleMileage', v)}
            kbd="numeric"
            required={odometerRequired}
            t={t}
          />
        }
        b={
          <Field
            label="Heures moteur"
            value={iv.engineHours !== undefined ? String(iv.engineHours) : undefined}
            t={t}
          />
        }
      />

      <Divider t={t} />

      {/* ── 3. Check-up avant intervention ────────────────────────────────── */}
      <SectionTitle label="Check-up avant intervention" t={t} />

      <CheckRow label="Démarrage moteur" value={form.checkStart} onToggle={(v) => patch('checkStart', v)} t={t} />
      <Divider t={t} />
      <CheckRow label="Feux / Éclairage" value={form.checkLights} onToggle={(v) => patch('checkLights', v)} t={t} />
      <Divider t={t} />
      <CheckRow
        label="Tableau de bord"
        value={form.checkDashboard}
        onToggle={(v) => patch('checkDashboard', v)}
        t={t}
      />
      <Divider t={t} />
      <CheckRow label="Climatisation" value={form.checkAC} onToggle={(v) => patch('checkAC', v)} t={t} />
      <Divider t={t} />
      <CheckRow label="Système audio" value={form.checkAudio} onToggle={(v) => patch('checkAudio', v)} t={t} />
      <Divider t={t} />
      <CheckRow label="Batterie" value={form.checkBattery} onToggle={(v) => patch('checkBattery', v)} t={t} />

      <Divider t={t} />

      {/* ── 4. Observations ───────────────────────────────────────────────── */}
      <SectionTitle label="Observations pré-intervention" t={t} />
      <TextInput
        style={{
          backgroundColor: t.bg.elevated,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: t.border,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: t.text.primary,
          minHeight: 80,
          textAlignVertical: 'top',
        }}
        value={form.observations}
        placeholder="État du véhicule, anomalies constatées avant intervention…"
        placeholderTextColor={t.text.muted}
        onChangeText={(v) => patch('observations', v)}
        multiline
        numberOfLines={3}
      />
    </View>
  );
}

interface TechDevice {
  id: string;
  imei?: string;
  serialNumber?: string;
  serial_number?: string;
  iccid?: string;
  phoneNumber?: string;
  phone_number?: string;
  model?: string;
}

function ContentTechnique({
  iv,
  form,
  patch,
  toggleMaterial,
  sondesSerials,
  techBoxes,
  techSims,
  t,
}: {
  iv: Intervention;
  form: FormState;
  patch: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  toggleMaterial: (item: string) => void;
  sondesSerials: string[];
  techBoxes: TechDevice[];
  techSims: TechDevice[];
  t: TH;
}) {
  const rf = (iv.requiredFields ?? []) as string[];
  const req = getTechRequired(rf);
  const reqRmvd = needsRemovedStatus(iv);
  const showRplTrf = showOldDeviceFields(iv);
  const hasSonde = form.material.includes('Sonde carburant') || req.sensorSerial;

  // Appareil déjà renseigné sur l'intervention (contexte lecture)
  const hasExistingDevice = !!(iv.imei || iv.simCard || iv.iccid);

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {/* ── 1. Appareil à installer / configurer ──────────────────────────── */}
      <SectionTitle label="Appareil installé" t={t} />

      {hasExistingDevice && (
        <View
          style={{
            backgroundColor: t.bg.elevated,
            borderRadius: 10,
            padding: 10,
            gap: 4,
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          {iv.imei ? (
            <Text style={{ fontSize: 12, color: t.text.secondary }}>
              IMEI actuel : <Text style={{ fontWeight: '700', color: t.text.primary }}>{iv.imei}</Text>
            </Text>
          ) : null}
          {iv.simCard || iv.iccid ? (
            <Text style={{ fontSize: 12, color: t.text.secondary }}>
              SIM / ICCID : <Text style={{ fontWeight: '700', color: t.text.primary }}>{iv.simCard ?? iv.iccid}</Text>
            </Text>
          ) : null}
        </View>
      )}

      {/* Boîtiers GPS en stock du technicien */}
      {techBoxes.length > 0 ? (
        <>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: t.text.muted,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Boîtiers en stock{req.imei ? ' *' : ''}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
          >
            {techBoxes.map((d) => {
              const label = d.imei ?? d.serialNumber ?? d.serial_number ?? d.id;
              const isActive = form.imei === label;
              return (
                <Chip
                  key={d.id}
                  label={label}
                  active={isActive}
                  onPress={() => {
                    if (isActive) {
                      patch('imei', '');
                      // Vider aussi la SIM si elle avait été auto-remplie depuis ce boîtier
                      patch('iccid', '');
                      patch('sim', '');
                    } else {
                      patch('imei', label);
                      // Auto-remplir SIM/ICCID si le boîtier a une SIM associée
                      if (d.iccid) patch('iccid', d.iccid);
                      if (d.phoneNumber ?? d.phone_number) patch('sim', (d.phoneNumber ?? d.phone_number)!);
                    }
                  }}
                  t={t}
                />
              );
            })}
          </ScrollView>
          {/* Affichage IMEI sélectionné */}
          {form.imei ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: t.primaryDim,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Cpu size={13} color={t.primary} />
              <Text style={{ fontSize: 13, color: t.primary, fontWeight: '600', flex: 1 }}>IMEI : {form.imei}</Text>
              <TouchableOpacity onPress={() => patch('imei', '')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={14} color={t.text.muted} />
              </TouchableOpacity>
            </View>
          ) : req.imei ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#EF444418',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <AlertCircle size={13} color="#EF4444" />
              <Text style={{ fontSize: 12, color: '#EF4444' }}>Sélectionnez un boîtier depuis votre stock</Text>
            </View>
          ) : null}
        </>
      ) : /* Pas de stock : afficher l'IMEI associé au véhicule (lecture seule) ou vide */
      form.imei ? (
        <View
          style={{
            backgroundColor: t.bg.elevated,
            borderRadius: 10,
            padding: 10,
            gap: 4,
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: t.text.muted,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Boîtier associé au véhicule
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: t.text.primary }}>{form.imei}</Text>
        </View>
      ) : req.imei ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#F9731618',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 7,
          }}
        >
          <AlertCircle size={13} color="#F97316" />
          <Text style={{ fontSize: 12, color: '#F97316', flex: 1 }}>
            Aucun boîtier en stock — sélectionnez un véhicule avec un boîtier associé
          </Text>
        </View>
      ) : null}

      {/* SIM en stock du technicien */}
      {techSims.length > 0 && (
        <>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: t.text.muted,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            SIM en stock
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
          >
            {techSims.map((d) => {
              const simLabel = d.iccid ?? d.serialNumber ?? d.serial_number ?? d.id;
              const phoneLabel = d.phoneNumber ?? d.phone_number;
              return (
                <Chip
                  key={d.id}
                  label={phoneLabel ? `${phoneLabel}` : simLabel}
                  active={form.iccid === simLabel || form.sim === (phoneLabel ?? simLabel)}
                  onPress={() => {
                    const active = form.iccid === simLabel || form.sim === (phoneLabel ?? simLabel);
                    patch('iccid', active ? '' : (simLabel ?? ''));
                    patch('sim', active ? '' : (phoneLabel ?? simLabel ?? ''));
                  }}
                  t={t}
                />
              );
            })}
          </ScrollView>
        </>
      )}
      <Row2
        a={
          <Field
            label={techSims.length > 0 ? 'N° SIM (manuel)' : 'N° SIM'}
            value={form.sim}
            ph="Ex : 07XXXXXXXX"
            onChange={(v) => patch('sim', v)}
            kbd="phone-pad"
            t={t}
          />
        }
        b={
          <Field
            label="ICCID"
            value={form.iccid}
            ph="8933…"
            onChange={(v) => patch('iccid', v)}
            kbd="numeric"
            required={
              req.iccid && !techSims.some((d) => (d.iccid ?? d.serialNumber ?? d.serial_number ?? d.id) === form.iccid)
            }
            t={t}
          />
        }
      />

      <Divider t={t} />

      {/* ── 2. Emplacement du boîtier ─────────────────────────────────────── */}
      <SectionTitle label="Emplacement boîtier" t={t} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
      >
        {DEVICE_LOCATIONS.map((loc) => (
          <Chip
            key={loc}
            label={loc}
            active={form.deviceLocation === loc}
            onPress={() => patch('deviceLocation', form.deviceLocation === loc ? '' : loc)}
            t={t}
          />
        ))}
      </ScrollView>

      <Divider t={t} />

      {/* ── 3. Matériel & accessoires utilisés ───────────────────────────── */}
      <SectionTitle label="Matériel utilisé" t={t} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {MATERIAL_OPTIONS.map((item) => (
          <Chip
            key={item}
            label={item}
            active={form.material.includes(item)}
            onPress={() => toggleMaterial(item)}
            t={t}
          />
        ))}
      </View>

      {/* ── 3b. Sonde carburant (visible si sélectionnée ou requise) ─────── */}
      {hasSonde && (
        <>
          <Divider t={t} />
          <SectionTitle label="Sonde carburant" t={t} />

          {/* Dropdown stock technicien */}
          {sondesSerials.length > 0 && (
            <>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: t.text.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Stock technicien{req.sensorSerial ? ' *' : ''}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
              >
                {sondesSerials.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    active={form.sensorSerial === s}
                    onPress={() => patch('sensorSerial', form.sensorSerial === s ? '' : s)}
                    t={t}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* Saisie manuelle si non en stock ou si stock vide */}
          <Field
            label={sondesSerials.length > 0 ? 'Ou saisie manuelle' : 'N° série sonde'}
            value={sondesSerials.includes(form.sensorSerial) ? '' : form.sensorSerial}
            ph="Ex : SN-0123456789"
            onChange={(v) => patch('sensorSerial', v)}
            required={req.sensorSerial && !sondesSerials.includes(form.sensorSerial)}
            t={t}
          />

          <View style={{ flexDirection: 'row', gap: 6 }}>
            {PROBE_TYPES.map((pt) => (
              <Chip
                key={pt}
                label={pt}
                active={form.fuelSensorType === pt}
                onPress={() => patch('fuelSensorType', form.fuelSensorType === pt ? '' : pt)}
                t={t}
              />
            ))}
          </View>
        </>
      )}

      {/* ── 4. Appareil retiré (Remplacement / Transfert) ────────────────── */}
      {showRplTrf && (
        <>
          <Divider t={t} />
          <SectionTitle label="Appareil retiré" t={t} />
          <Row2
            a={
              <Field
                label="IMEI retiré"
                value={form.oldDeviceImei}
                ph="Ancien IMEI"
                onChange={(v) => patch('oldDeviceImei', v)}
                kbd="numeric"
                t={t}
              />
            }
            b={
              <Field
                label="SIM retirée"
                value={form.oldSimId}
                ph="Ancien ICCID"
                onChange={(v) => patch('oldSimId', v)}
                kbd="phone-pad"
                t={t}
              />
            }
          />
          {showOldDeviceFields(iv) && iv.stockImpact?.action === 'SWAP' && (
            <Row2
              a={
                <Field
                  label="Nouvel IMEI"
                  value={form.newImei}
                  ph="IMEI installé"
                  onChange={(v) => patch('newImei', v)}
                  kbd="numeric"
                  t={t}
                />
              }
              b={
                <Field
                  label="Nouvelle SIM"
                  value={form.newSim}
                  ph="SIM installée"
                  onChange={(v) => patch('newSim', v)}
                  kbd="phone-pad"
                  t={t}
                />
              }
            />
          )}
        </>
      )}

      {/* ── 5. État du matériel retiré ────────────────────────────────────── */}
      {reqRmvd && (
        <>
          <Divider t={t} />
          <SectionTitle label="État du matériel retiré" t={t} />
          {!form.removedMaterialStatus && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#EF444418',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <AlertCircle size={13} color="#EF4444" />
              <Text style={{ fontSize: 12, color: '#EF4444' }}>Obligatoire pour clôturer</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {REMOVED_STATUS_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                active={form.removedMaterialStatus === opt.value}
                color={opt.color}
                onPress={() =>
                  patch('removedMaterialStatus', form.removedMaterialStatus === opt.value ? '' : opt.value)
                }
                t={t}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function ContentCloture({
  iv,
  form,
  patch,
  onComplete,
  isCompleting,
  techValid,
  onDownloadBon,
  onDownloadRapport,
  pdfLoading,
  t,
}: {
  iv: Intervention;
  form: FormState;
  patch: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onComplete: () => void;
  isCompleting: boolean;
  techValid: boolean | null;
  onDownloadBon: () => void;
  onDownloadRapport: () => void;
  pdfLoading: 'bon' | 'rapport' | null;
  t: TH;
}) {
  if (iv.status === 'COMPLETED') {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
          <CheckCircle2 size={40} color="#22C55E" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#22C55E' }}>Intervention terminée</Text>
          {iv.endTime && (
            <Text style={{ fontSize: 13, color: t.text.muted }}>
              {new Date(iv.endTime).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>
        {iv.notes ? (
          <>
            <SectionTitle label="Rapport" t={t} />
            <Text style={{ fontSize: 14, color: t.text.primary, lineHeight: 21 }}>{iv.notes}</Text>
          </>
        ) : null}
        {iv.cost ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }}>
            <Text style={{ fontSize: 13, color: t.text.muted }}>Montant facturé</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: t.text.primary }}>
              {iv.cost.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        ) : null}

        {/* Téléchargement documents */}
        <Divider t={t} />
        <SectionTitle label="Documents" t={t} />
        <View style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={onDownloadBon}
            disabled={!!pdfLoading}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: t.primaryDim,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            {pdfLoading === 'bon' ? (
              <ActivityIndicator size="small" color={t.primary} />
            ) : (
              <Download size={16} color={t.primary} />
            )}
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.primary }}>Bon d'intervention</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDownloadRapport}
            disabled={!!pdfLoading}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#8B5CF622',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            {pdfLoading === 'rapport' ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <FileText size={16} color="#8B5CF6" />
            )}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#8B5CF6' }}>Rapport d'intervention</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const reqRmvd = needsRemovedStatus(iv);
  const canClose =
    form.confirmedTech &&
    form.confirmedClient &&
    !!form.signatureTech &&
    !!form.signatureClient &&
    (!reqRmvd || !!form.removedMaterialStatus) &&
    techValid !== false;

  const ToggleCheckBox = ({ value, onToggle, label }: { value: boolean; onToggle: () => void; label: string }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: value ? '#22C55E12' : t.bg.elevated,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: value ? '#22C55E' : t.border,
        padding: 12,
      }}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          marginTop: 1,
          flexShrink: 0,
          borderColor: value ? '#22C55E' : t.border,
          backgroundColor: value ? '#22C55E' : 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {value && <Check size={13} color="#fff" />}
      </View>
      <Text style={{ flex: 1, fontSize: 13, color: t.text.primary, lineHeight: 19 }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {/* ── 1. Rapport d'intervention ─────────────────────────────────────── */}
      <SectionTitle label="Rapport d'intervention" t={t} />
      <TextInput
        style={{
          backgroundColor: t.bg.elevated,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: t.border,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: t.text.primary,
          minHeight: 110,
          textAlignVertical: 'top',
        }}
        value={form.notes}
        placeholder="Travaux effectués, matériel installé, tests réalisés, anomalies résolues…"
        placeholderTextColor={t.text.muted}
        onChangeText={(v) => patch('notes', v)}
        multiline
        numberOfLines={5}
      />

      <Divider t={t} />

      {/* ── 2. Facturation ────────────────────────────────────────────────── */}
      <SectionTitle label="Facturation" t={t} />
      <Field label="Montant (FCFA)" value={form.cost} ph="0" onChange={(v) => patch('cost', v)} kbd="numeric" t={t} />
      <Row2
        a={
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: form.updateContract ? '#3B82F622' : t.bg.elevated,
              borderRadius: 10,
              padding: 10,
              borderWidth: 1,
              borderColor: form.updateContract ? '#3B82F6' : t.border,
            }}
            onPress={() => patch('updateContract', !form.updateContract)}
            activeOpacity={0.8}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: form.updateContract ? '#3B82F6' : t.border,
                backgroundColor: form.updateContract ? '#3B82F6' : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              {form.updateContract && <Check size={11} color="#fff" />}
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: form.updateContract ? '#3B82F6' : t.text.secondary,
                flex: 1,
              }}
            >
              Màj contrat
            </Text>
          </TouchableOpacity>
        }
        b={
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: form.generateInvoice ? '#22C55E22' : t.bg.elevated,
              borderRadius: 10,
              padding: 10,
              borderWidth: 1,
              borderColor: form.generateInvoice ? '#22C55E' : t.border,
            }}
            onPress={() => patch('generateInvoice', !form.generateInvoice)}
            activeOpacity={0.8}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: form.generateInvoice ? '#22C55E' : t.border,
                backgroundColor: form.generateInvoice ? '#22C55E' : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              {form.generateInvoice && <Check size={11} color="#fff" />}
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: form.generateInvoice ? '#22C55E' : t.text.secondary,
                flex: 1,
              }}
            >
              Générer facture
            </Text>
          </TouchableOpacity>
        }
      />

      <Divider t={t} />

      {/* ── 3. Signatures numériques ─────────────────────────────────────── */}
      <SectionTitle label="Signatures" t={t} />
      <SignaturePad
        label="Signature technicien"
        value={form.signatureTech || undefined}
        onChange={(sig) => patch('signatureTech', sig)}
        onClear={() => patch('signatureTech', '')}
        t={t}
      />
      <SignaturePad
        label="Signature client"
        value={form.signatureClient || undefined}
        onChange={(sig) => patch('signatureClient', sig)}
        onClear={() => patch('signatureClient', '')}
        t={t}
      />
      <Field
        label="Nom du signataire client"
        value={form.clientSignatureName}
        ph="Nom complet"
        onChange={(v) => patch('clientSignatureName', v)}
        t={t}
      />

      <Divider t={t} />

      {/* ── 4. Confirmations ──────────────────────────────────────────────── */}
      <SectionTitle label="Confirmations" t={t} />
      <ToggleCheckBox
        value={form.confirmedTech}
        onToggle={() => patch('confirmedTech', !form.confirmedTech)}
        label="Je certifie avoir effectué les travaux décrits conformément à la demande."
      />
      <ToggleCheckBox
        value={form.confirmedClient}
        onToggle={() => patch('confirmedClient', !form.confirmedClient)}
        label="Le client a été informé et a accepté le résultat de l'intervention."
      />

      <Divider t={t} />

      {/* ── 5. Bouton clôture + messages de blocage ───────────────────────── */}
      {!canClose && (
        <View style={{ gap: 6 }}>
          {techValid === false && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#F9731618',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <AlertCircle size={13} color="#F97316" />
              <Text style={{ fontSize: 12, color: '#F97316', flex: 1 }}>
                Complétez les champs obligatoires dans l'onglet Technique
              </Text>
            </View>
          )}
          {techValid !== false && (!form.signatureTech || !form.signatureClient) && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: t.bg.elevated,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <AlertCircle size={13} color={t.text.muted} />
              <Text style={{ fontSize: 12, color: t.text.muted, flex: 1 }}>
                Les deux signatures sont requises pour clôturer
              </Text>
            </View>
          )}
          {techValid !== false &&
            form.signatureTech &&
            form.signatureClient &&
            (!form.confirmedTech || !form.confirmedClient) && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: t.bg.elevated,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                }}
              >
                <AlertCircle size={13} color={t.text.muted} />
                <Text style={{ fontSize: 12, color: t.text.muted, flex: 1 }}>
                  Cochez les deux confirmations pour clôturer
                </Text>
              </View>
            )}
          {techValid !== false &&
            form.confirmedTech &&
            form.confirmedClient &&
            reqRmvd &&
            !form.removedMaterialStatus && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#EF444418',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                }}
              >
                <AlertCircle size={13} color="#EF4444" />
                <Text style={{ fontSize: 12, color: '#EF4444', flex: 1 }}>
                  Sélectionnez l'état du matériel retiré (onglet Technique)
                </Text>
              </View>
            )}
        </View>
      )}

      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          height: 52,
          borderRadius: 14,
          backgroundColor: canClose ? '#22C55E' : t.bg.elevated,
          borderWidth: canClose ? 0 : 1,
          borderColor: t.border,
        }}
        onPress={canClose ? onComplete : undefined}
        disabled={!canClose || isCompleting}
        activeOpacity={0.85}
      >
        {isCompleting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <CheckCircle2 size={19} color={canClose ? '#fff' : t.text.muted} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: canClose ? '#fff' : t.text.muted }}>
              Clôturer l'intervention
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function InterventionDetailScreen() {
  const { theme: t } = useTheme();
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { interventionId } = route.params;
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // Ouvrir la section Clôture automatiquement quand l'intervention est EN_ROUTE ou IN_PROGRESS
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);

  const {
    data: ivQuery,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['intervention', interventionId],
    queryFn: () => interventionsApi.getById(interventionId),
    retry: 1,
    staleTime: 60_000,
    // Utilise le cache de la liste pour affichage immédiat sans spinner
    placeholderData: () => {
      const allCached = queryClient.getQueriesData<Intervention[]>({ queryKey: ['tech-interventions'] });
      for (const [, list] of allCached) {
        const found = list?.find((i) => i.id === interventionId);
        if (found) return found;
      }
      return undefined;
    },
  });

  // Appareils en stock du technicien (BOX, SIM, SENSOR)
  const { data: techStock = [] } = useQuery<TechDevice[]>({
    queryKey: ['tech-stock-all', user?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/devices?location=TECH&technicianId=${user!.id}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!user?.id,
    staleTime: 120_000,
  });
  const techBoxes = techStock.filter((d) => (d as any).type === 'BOX');
  const techSims = techStock.filter((d) => (d as any).type === 'SIM');
  const sondesStock = techStock.filter((d) => (d as any).type === 'SENSOR');
  const sondesSerials = sondesStock.map((d) => d.serialNumber ?? d.serial_number).filter((s): s is string => !!s);

  // React Query v5 efface `data` quand isError=true — on conserve la dernière valeur connue
  const ivRef = useRef<Intervention | undefined>(undefined);
  if (ivQuery) ivRef.current = ivQuery;
  // iv = donnée live OU dernière valeur mise en cache (évite l'écran d'erreur si on a déjà les données)
  const iv = ivQuery ?? ivRef.current;

  // Véhicules du client (pour le picker plaque) — dépend de iv.clientId
  const { data: allVehicles = [] } = useQuery<VehicleOption[]>({
    queryKey: ['client-vehicles', iv?.clientId],
    queryFn: async () => {
      const res = await apiClient.get('/objects?limit=500');
      const list: any[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      const clientId = iv!.clientId;
      return list
        .filter((v) => v.client_id === clientId || v.clientId === clientId)
        .map((v) => ({
          id: v.id,
          plate: v.plate ?? '',
          name: v.name,
          brand: v.brand ?? v.vehicle_brand,
          model: v.model ?? v.vehicle_model,
          vehicleType: v.vehicle_type ?? v.vehicleType,
          vin: v.vin,
          imei: v.imei ?? undefined, // IMEI du boîtier actuellement installé
          clientId: v.client_id ?? v.clientId,
        }));
    },
    enabled: !!iv?.clientId,
    staleTime: 300_000,
  });

  const handleVehicleSelect = useCallback((v: VehicleOption) => {
    setForm((f) => ({
      ...f,
      licensePlate: v.plate || f.licensePlate,
      vehicleBrand: v.brand || f.vehicleBrand,
      vehicleModel: v.model || f.vehicleModel,
      vehicleType: v.vehicleType || f.vehicleType,
      vin: v.vin || f.vin,
      // Pré-remplir l'IMEI depuis l'association véhicule (objects.imei = boîtier installé)
      // Ne remplace PAS si le tech a déjà choisi un boîtier depuis son stock
      imei: f.imei || v.imei || f.imei,
    }));
    setDirty(true);
  }, []);

  // Ouvrir automatiquement la section Clôture quand le statut est IN_PROGRESS
  useEffect(() => {
    if (!iv) return;
    if (iv.status === 'IN_PROGRESS') setOpenSection(3);
  }, [iv?.status]);

  useEffect(() => {
    if (!iv) return;
    setForm({
      licensePlate: iv.licensePlate ?? '',
      wwPlate: iv.wwPlate ?? iv.tempPlate ?? '',
      vehicleType: iv.vehicleType ?? '',
      vehicleBrand: iv.vehicleBrand ?? '',
      vehicleModel: iv.vehicleModel ?? '',
      vehicleColor: iv.vehicleColor ?? '',
      vehicleYear: iv.vehicleYear ?? '',
      vin: iv.vin ?? '',
      checkStart: iv.checkStart ?? false,
      checkLights: iv.checkLights ?? false,
      checkDashboard: iv.checkDashboard ?? false,
      checkAC: iv.checkAC ?? false,
      checkAudio: iv.checkAudio ?? false,
      checkBattery: iv.checkBattery ?? false,
      observations: iv.observations ?? '',
      vehicleMileage: iv.vehicleMileage !== undefined ? String(iv.vehicleMileage) : '',
      imei: iv.imei ?? '',
      sim: iv.sim ?? iv.simCard ?? '', // sim canonique, fallback simCard legacy
      iccid: iv.iccid ?? '',
      deviceLocation: iv.deviceLocation ?? '',
      fuelSensorType: iv.fuelSensorType ?? iv.probeType ?? '', // fuelSensorType canonique, fallback probeType legacy
      sensorSerial: iv.sensorSerial ?? '',
      material: iv.material ?? [],
      newImei: iv.newImei ?? '',
      newSim: iv.newSim ?? '',
      oldDeviceImei: iv.oldDeviceImei ?? '',
      oldSimId: iv.oldSimId ?? '',
      removedMaterialStatus: iv.removedMaterialStatus ?? '',
      notes: iv.notes ?? iv.description ?? '',
      cost: iv.cost !== undefined ? String(iv.cost) : '',
      signatureTech: iv.signatureTech ?? '',
      signatureClient: iv.signatureClient ?? '',
      updateContract: iv.updateContract ?? false,
      generateInvoice: iv.generateInvoice ?? false,
      confirmedTech: false,
      confirmedClient: false,
      clientSignatureName: '',
    });
  }, [iv]);

  const patch = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }, []);

  const toggleMaterial = useCallback((item: string) => {
    setForm((f) => ({
      ...f,
      material: f.material.includes(item) ? f.material.filter((m) => m !== item) : [...f.material, item],
    }));
    setDirty(true);
  }, []);

  const tabValid = useMemo((): (boolean | null)[] => {
    if (!iv) return [null, null, null, null];
    const rf = (iv.requiredFields ?? []) as string[];
    const req = getTechRequired(rf);

    // S0 — Demande : informationnel, pas d'indicateur
    const s0 = null;

    // S1 — Véhicule : véhicule connu + kilométrage si odometer requis
    const vehicleOk = !!(iv.vehicleName || iv.licensePlate);
    const s1: boolean = vehicleOk && (!req.odometer || form.vehicleMileage.trim().length > 0);

    // S2 — Technique : champs requis selon config DB
    const anyTechReq = req.imei || req.iccid || req.sensorSerial;
    const s2: boolean | null = anyTechReq
      ? (!req.imei || form.imei.trim().length > 0) &&
        (!req.iccid || form.iccid.trim().length > 0) &&
        (!req.sensorSerial || form.sensorSerial.trim().length > 0)
      : null; // pas de champs requis → onglet non bloquant

    // S3 — Clôture : confirmations + signatures + matériel retiré si applicable
    const rmvdNeeded = needsRemovedStatus(iv);
    const s3: boolean =
      form.confirmedTech &&
      form.confirmedClient &&
      !!form.signatureTech &&
      !!form.signatureClient &&
      (!rmvdNeeded || !!form.removedMaterialStatus);

    return [s0, s1, s2, s3];
  }, [iv, form]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Intervention>) => interventionsApi.update(interventionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervention', interventionId] });
      queryClient.invalidateQueries({ queryKey: ['tech-interventions'] });
      setDirty(false);
    },
    onError: () => Alert.alert('Erreur', 'Impossible de sauvegarder. Vérifiez votre connexion.'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: InterventionStatus) => interventionsApi.updateStatus(interventionId, status),
    onSuccess: () => {
      // Invalidate pour forcer un refetch complet normalisé — évite la corruption du cache
      // si la réponse du PUT ne retourne pas tous les champs.
      queryClient.invalidateQueries({ queryKey: ['intervention', interventionId] });
      queryClient.invalidateQueries({ queryKey: ['tech-interventions'] });
    },
    onError: () => Alert.alert('Erreur', 'Impossible de mettre à jour le statut.'),
  });

  const toPayload = (f: FormState): Partial<Intervention> => ({
    // Identité véhicule
    licensePlate: f.licensePlate || undefined,
    wwPlate: f.wwPlate || undefined,
    vehicleType: f.vehicleType || undefined,
    vehicleBrand: f.vehicleBrand || undefined,
    vehicleModel: f.vehicleModel || undefined,
    vehicleColor: f.vehicleColor || undefined,
    vehicleYear: f.vehicleYear || undefined,
    vin: f.vin || undefined,
    // Checklist véhicule
    checkStart: f.checkStart,
    checkLights: f.checkLights,
    checkDashboard: f.checkDashboard,
    checkAC: f.checkAC,
    checkAudio: f.checkAudio,
    checkBattery: f.checkBattery,
    observations: f.observations || undefined,
    vehicleMileage: f.vehicleMileage ? parseFloat(f.vehicleMileage) : undefined,
    // Technique — noms canoniques backend (sim, fuelSensorType)
    imei: f.imei || undefined,
    sim: f.sim || undefined,
    iccid: f.iccid || undefined,
    deviceLocation: f.deviceLocation || undefined,
    fuelSensorType: (f.fuelSensorType || undefined) as Intervention['fuelSensorType'],
    sensorSerial: f.sensorSerial || undefined,
    material: f.material.length > 0 ? f.material : undefined,
    // Remplacement / Transfert
    newImei: f.newImei || undefined,
    newSim: f.newSim || undefined,
    oldDeviceImei: f.oldDeviceImei || undefined,
    oldSimId: f.oldSimId || undefined,
    removedMaterialStatus: (f.removedMaterialStatus || undefined) as Intervention['removedMaterialStatus'],
    // Clôture
    notes: f.notes || undefined,
    cost: f.cost ? parseFloat(f.cost) : undefined,
    updateContract: f.updateContract || undefined,
    generateInvoice: f.generateInvoice || undefined,
    clientSignatureName: f.clientSignatureName || undefined,
    signatureTech: f.signatureTech || undefined,
    signatureClient: f.signatureClient || undefined,
  });

  const handleStatusAction = () => {
    if (!iv) return;
    const action = NEXT_ACTION[iv.status];
    if (!action) return;
    Alert.alert(action.label, `Confirmer : "${action.label}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          try {
            if (dirty) {
              await interventionsApi.update(interventionId, toPayload(form));
              setDirty(false);
            }
            statusMutation.mutate(action.next);
          } catch {
            Alert.alert('Erreur', 'Impossible de sauvegarder les modifications. Veuillez réessayer.');
          }
        },
      },
    ]);
  };

  const handleComplete = () => {
    Alert.alert("Clôturer l'intervention", 'Cette action est définitive. Confirmer ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Clôturer',
        style: 'destructive',
        onPress: async () => {
          try {
            await interventionsApi.update(interventionId, toPayload(form));
            statusMutation.mutate('COMPLETED');
          } catch {
            Alert.alert('Erreur', 'Impossible de sauvegarder les modifications. La clôture a été annulée.');
          }
        },
      },
    ]);
  };

  const toggleSection = (i: number) => setOpenSection((o) => (o === i ? null : i));
  const [editMode, setEditMode] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<'bon' | 'rapport' | null>(null);

  const handleDownloadBon = async () => {
    if (!iv) return;
    setPdfLoading('bon');
    try {
      await downloadBonIntervention(iv, user?.name);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    } finally {
      setPdfLoading(null);
    }
  };
  const handleDownloadRapport = async () => {
    if (!iv) return;
    setPdfLoading('rapport');
    try {
      await downloadRapportIntervention(iv, user?.name);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    } finally {
      setPdfLoading(null);
    }
  };

  // Erreur uniquement si aucune donnée disponible (ni live, ni cache ref)
  if (isError && !iv) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg.primary }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 }}>
          <AlertCircle size={40} color="#EF4444" />
          <Text style={{ fontSize: 15, fontWeight: '600', color: t.text.primary, textAlign: 'center' }}>
            Impossible de charger l'intervention
          </Text>
          <Text style={{ fontSize: 13, color: t.text.muted, textAlign: 'center' }}>
            Vérifiez votre connexion puis réessayez.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ backgroundColor: t.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <Text style={{ fontSize: 13, color: t.text.muted }}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !iv) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg.primary }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLORS[iv.status] ?? '#6B7280';
  const nextAction = NEXT_ACTION[iv.status];
  const isTerminal = ['COMPLETED', 'CANCELLED', 'POSTPONED'].includes(iv.status);
  const typeLabel =
    iv.type === 'INSTALLATION' ? 'Installation' : iv.type === 'DEPANNAGE' ? 'Dépannage' : (iv.type ?? '');

  // ── Header commun aux deux modes ───────────────────────────────────────────
  const Header = (
    <View style={[ms.header, { borderBottomColor: t.border }]}>
      <TouchableOpacity
        onPress={editMode ? () => setEditMode(false) : () => nav.goBack()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ArrowLeft size={22} color={t.text.primary} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 10 }}>
        {typeLabel ? <Text style={{ fontSize: 12, fontWeight: '700', color: t.primary }}>{typeLabel}</Text> : null}
        <Text style={{ fontSize: 15, fontWeight: '700', color: t.text.primary }} numberOfLines={1}>
          {iv.nature}
        </Text>
        {iv.clientName ? (
          <Text style={{ fontSize: 11, color: t.text.muted, marginTop: 1 }} numberOfLines={1}>
            {iv.clientName}
          </Text>
        ) : null}
      </View>
      <View style={[ms.badge, { backgroundColor: statusColor + '22' }]}>
        <View style={[ms.dot, { backgroundColor: statusColor }]} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>{STATUS_LABELS[iv.status]}</Text>
      </View>
    </View>
  );

  // ── MODE FORMULAIRE (édition / clôture) ────────────────────────────────────
  if (editMode) {
    const sublabels = [
      iv.clientName ?? '',
      [iv.vehicleName, iv.licensePlate].filter(Boolean).join(' · '),
      [iv.imei ? `IMEI: ${iv.imei}` : '', form.material.length ? `${form.material.length} matériel(s)` : '']
        .filter(Boolean)
        .join(' · '),
      iv.status === 'COMPLETED' ? 'Terminée' : 'En attente de clôture',
    ];
    const sectionIcons = [
      <User size={17} color="#3B82F6" />,
      <Truck size={17} color="#8B5CF6" />,
      <Cpu size={17} color="#06B6D4" />,
      <FileText size={17} color="#F59E0B" />,
    ];
    const sectionLabels = ['Demande', 'Véhicule', 'Technique', 'Clôture'];
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg.primary }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          {Header}
          <StatusProgressBar status={iv.status} t={t} />
          {nextAction && !isTerminal && (
            <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
              <TouchableOpacity
                style={[ms.actionBtn, { backgroundColor: nextAction.color }]}
                onPress={handleStatusAction}
                disabled={statusMutation.isPending}
                activeOpacity={0.85}
              >
                {statusMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Navigation size={17} color="#fff" />
                    <Text style={ms.actionBtnText}>{nextAction.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
          <ScrollView showsVerticalScrollIndicator={false}>
            {sectionLabels.map((label, i) => (
              <View key={label}>
                <SectionRow
                  icon={sectionIcons[i]}
                  label={label}
                  sublabel={sublabels[i]}
                  valid={tabValid[i]}
                  open={openSection === i}
                  onPress={() => toggleSection(i)}
                  t={t}
                />
                {openSection === i && (
                  <View style={{ borderBottomWidth: 1, borderBottomColor: t.border }}>
                    {i === 0 && <ContentDemande iv={iv} t={t} />}
                    {i === 1 && (
                      <ContentVehicule
                        iv={iv}
                        form={form}
                        patch={patch}
                        clientVehicles={allVehicles}
                        onVehicleSelect={handleVehicleSelect}
                        t={t}
                      />
                    )}
                    {i === 2 && (
                      <ContentTechnique
                        iv={iv}
                        form={form}
                        patch={patch}
                        toggleMaterial={toggleMaterial}
                        sondesSerials={sondesSerials}
                        techBoxes={techBoxes}
                        techSims={techSims}
                        t={t}
                      />
                    )}
                    {i === 3 && (
                      <ContentCloture
                        iv={iv}
                        form={form}
                        patch={patch}
                        onComplete={handleComplete}
                        isCompleting={statusMutation.isPending}
                        techValid={tabValid[2]}
                        onDownloadBon={handleDownloadBon}
                        onDownloadRapport={handleDownloadRapport}
                        pdfLoading={pdfLoading}
                        t={t}
                      />
                    )}
                  </View>
                )}
              </View>
            ))}
            <View style={{ height: 100 }} />
          </ScrollView>
          {!isTerminal && dirty && (
            <View style={[ms.footer, { borderTopColor: t.border, backgroundColor: t.bg.surface }]}>
              <TouchableOpacity
                style={[ms.saveBtn, { backgroundColor: t.primary }]}
                onPress={() => saveMutation.mutate(toPayload(form))}
                disabled={saveMutation.isPending}
                activeOpacity={0.85}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Save size={17} color="#fff" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── MODE LECTURE (vue par défaut) ──────────────────────────────────────────
  function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          paddingVertical: 5,
          borderBottomWidth: 1,
          borderBottomColor: t.border + '55',
        }}
      >
        <Text style={{ fontSize: 12, color: t.text.muted, width: 100, flexShrink: 0 }}>{label}</Text>
        <Text style={{ fontSize: 13, color: t.text.primary, flex: 1, fontWeight: '500' }}>{value}</Text>
      </View>
    );
  }

  function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View
        style={{
          backgroundColor: t.bg.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: t.border,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: t.text.muted,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 8,
          }}
        >
          {title}
        </Text>
        {children}
      </View>
    );
  }

  const fmtDate = (iso?: string) => {
    if (!iso) return undefined;
    const d = new Date(iso);
    return (
      d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) +
      ' à ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg.primary }} edges={['top']}>
      {Header}
      <StatusProgressBar status={iv.status} t={t} />

      {/* Action statut principale */}
      {nextAction && !isTerminal && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <TouchableOpacity
            style={[ms.actionBtn, { backgroundColor: nextAction.color }]}
            onPress={handleStatusAction}
            disabled={statusMutation.isPending}
            activeOpacity={0.85}
          >
            {statusMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Navigation size={17} color="#fff" />
                <Text style={ms.actionBtnText}>{nextAction.label}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Planification */}
        <InfoBlock title="Planification">
          <InfoRow label="Date prévue" value={fmtDate(iv.scheduledDate)} />
          <InfoRow label="Lieu" value={iv.address ?? iv.location} />
          <InfoRow label="Durée estimée" value={iv.duration ? `${iv.duration} min` : undefined} />
          <InfoRow label="Créée le" value={fmtDate(iv.createdAt)} />
        </InfoBlock>

        {/* Client */}
        {(iv.clientName || iv.contactPhone) && (
          <InfoBlock title="Client">
            <InfoRow label="Nom" value={iv.clientName} />
            <InfoRow label="Téléphone" value={iv.contactPhone} />
            {iv.contactPhone && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${iv.contactPhone}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 10,
                  backgroundColor: '#22C55E22',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  alignSelf: 'flex-start',
                }}
              >
                <Phone size={14} color="#22C55E" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#22C55E' }}>Appeler le client</Text>
              </TouchableOpacity>
            )}
          </InfoBlock>
        )}

        {/* Véhicule */}
        {(iv.vehicleName || iv.licensePlate) && (
          <InfoBlock title="Véhicule">
            <InfoRow label="Nom" value={iv.vehicleName} />
            <InfoRow label="Plaque" value={iv.licensePlate ?? iv.wwPlate} />
            <InfoRow label="Immatriculation" value={iv.vehicleId} />
          </InfoBlock>
        )}

        {/* Technique */}
        {(iv.imei || iv.sim || iv.iccid || iv.deviceLocation) && (
          <InfoBlock title="Technique">
            <InfoRow label="IMEI" value={iv.imei} />
            <InfoRow label="SIM / ICCID" value={iv.sim ?? iv.iccid} />
            <InfoRow label="Emplacement" value={iv.deviceLocation} />
          </InfoBlock>
        )}

        {/* Notes / Description */}
        {(iv.notes ?? iv.description) && (
          <InfoBlock title="Notes">
            <Text style={{ fontSize: 13, color: t.text.primary, lineHeight: 20 }}>{iv.notes ?? iv.description}</Text>
          </InfoBlock>
        )}

        {/* Navigation vers le lieu */}
        {(iv.address ?? iv.location) && (
          <TouchableOpacity
            onPress={() => {
              const addr = encodeURIComponent(iv.address ?? iv.location ?? '');
              Linking.openURL(`https://maps.google.com/?q=${addr}`);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: t.bg.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: t.border,
              paddingVertical: 13,
              marginBottom: 12,
            }}
          >
            <Activity size={17} color={t.primary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.primary }}>Ouvrir dans Maps</Text>
          </TouchableOpacity>
        )}

        {/* Téléchargement PDF */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={handleDownloadBon}
            disabled={!!pdfLoading}
            activeOpacity={0.85}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: t.primaryDim,
              borderRadius: 12,
              paddingVertical: 11,
            }}
          >
            {pdfLoading === 'bon' ? (
              <ActivityIndicator size="small" color={t.primary} />
            ) : (
              <Download size={15} color={t.primary} />
            )}
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.primary }}>Bon d'interv.</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDownloadRapport}
            disabled={!!pdfLoading}
            activeOpacity={0.85}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#8B5CF622',
              borderRadius: 12,
              paddingVertical: 11,
            }}
          >
            {pdfLoading === 'rapport' ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <FileText size={15} color="#8B5CF6" />
            )}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#8B5CF6' }}>Rapport</Text>
          </TouchableOpacity>
        </View>

        {/* Bouton ouvrir formulaire */}
        {!isTerminal && (
          <TouchableOpacity
            onPress={() => {
              setEditMode(true);
              setOpenSection(iv.status === 'IN_PROGRESS' ? 3 : 0);
            }}
            style={[ms.actionBtn, { backgroundColor: t.primary, marginBottom: 12 }]}
            activeOpacity={0.85}
          >
            <FileText size={17} color="#fff" />
            <Text style={ms.actionBtnText}>
              {iv.status === 'IN_PROGRESS' ? 'Remplir le formulaire de clôture' : 'Ouvrir le formulaire'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ms = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  footer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
  },
});
