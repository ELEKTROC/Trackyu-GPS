/**
 * TrackYu Mobile — Détail Intervention + PDF Bon + PDF Rapport (Portal CLIENT)
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft,
  Wrench,
  Car,
  CalendarClock,
  MapPin,
  Clock,
  User,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { portalApi, type PortalIntervention } from '../../api/portal';
import { SkeletonDetail } from '../../components/SkeletonBox';
import type { PortalStackParamList } from '../../navigation/types';

type Route = RouteProp<PortalStackParamList, 'PortalInterventionDetail'>;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'À planifier', color: '#F59E0B' },
  SCHEDULED: { label: 'Planifié', color: '#3B82F6' },
  EN_ROUTE: { label: 'En route', color: '#8B5CF6' },
  IN_PROGRESS: { label: 'En cours', color: '#06B6D4' },
  COMPLETED: { label: 'Terminé', color: '#22C55E' },
  CANCELLED: { label: 'Annulé', color: '#EF4444' },
  POSTPONED: { label: 'Reportée', color: '#F97316' },
};

function fmtDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', opts ?? { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtTime(d: string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(min: number | null): string {
  if (!min) return '—';
  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`;
}

// ── PDF templates ─────────────────────────────────────────────────────────────

function buildBonHtml(inv: PortalIntervention, clientName: string): string {
  const cfg = STATUS_CONFIG[inv.status] ?? { label: inv.status, color: '#64748b' };
  const plate = inv.license_plate ?? inv.vehicle_name ?? '—';
  const vehicle = [inv.vehicle_brand, inv.vehicle_model].filter(Boolean).join(' ') || '—';
  const today = new Date().toLocaleDateString('fr-FR');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Helvetica,Arial,sans-serif; font-size:11px; color:#1e293b; background:#fff; }
  .hdr { background:#1e40af; color:#fff; padding:20px 28px; }
  .hdr-brand { font-size:9px; font-weight:bold; text-transform:uppercase; letter-spacing:2px; opacity:.8; margin-bottom:4px; }
  .hdr h1 { font-size:16px; font-weight:bold; }
  .hdr-sub { font-size:9px; opacity:.7; margin-top:4px; }
  .content { padding:20px 28px; }
  .section-title { font-size:9px; font-weight:bold; text-transform:uppercase; color:#64748b; letter-spacing:1.5px; margin-bottom:10px; margin-top:18px; border-bottom:1px solid #e2e8f0; padding-bottom:4px; }
  .grid2 { display:flex; gap:12px; }
  .box { flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; }
  .box-label { font-size:9px; font-weight:bold; text-transform:uppercase; color:#64748b; margin-bottom:6px; }
  .box-value { font-size:13px; font-weight:bold; color:#0f172a; }
  .box-sub { font-size:10px; color:#64748b; margin-top:2px; }
  .badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:10px; font-weight:bold; }
  table { width:100%; border-collapse:collapse; font-size:10px; margin-top:8px; }
  th { background:#1e40af; color:#fff; padding:7px 10px; text-align:left; font-size:9px; text-transform:uppercase; }
  td { padding:7px 10px; border-bottom:1px solid #f1f5f9; }
  .sig-row { display:flex; gap:16px; margin-top:32px; }
  .sig-box { flex:1; border:1px solid #e2e8f0; border-radius:8px; padding:14px; }
  .sig-label { font-size:9px; font-weight:bold; text-transform:uppercase; color:#64748b; margin-bottom:4px; }
  .sig-name { font-size:12px; font-weight:bold; color:#0f172a; }
  .sig-line { border-bottom:1px dashed #cbd5e1; margin-top:40px; }
  .sig-hint { font-size:8px; color:#94a3b8; margin-top:4px; font-style:italic; }
  .sig-img { max-width:120px; max-height:40px; margin-top:8px; }
  .footer { text-align:center; color:#94a3b8; font-size:9px; margin-top:28px; border-top:1px solid #e2e8f0; padding-top:10px; }
</style>
</head>
<body>
<div class="hdr">
  <div class="hdr-brand">TrackYu GPS</div>
  <h1>BON D'INTERVENTION</h1>
  <div class="hdr-sub">N° ${inv.id} &nbsp;•&nbsp; Généré le ${today}</div>
</div>
<div class="content">

  <div class="grid2" style="margin-bottom:4px">
    <div class="box">
      <div class="box-label">Type</div>
      <div class="box-value">${inv.nature}</div>
      <div class="box-sub">${inv.type}</div>
    </div>
    <div class="box">
      <div class="box-label">Statut</div>
      <div class="box-value">
        <span class="badge" style="background:${cfg.color}22;color:${cfg.color}">${cfg.label}</span>
      </div>
    </div>
    <div class="box">
      <div class="box-label">Date planifiée</div>
      <div class="box-value">${fmtDate(inv.scheduled_date, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      ${inv.duration ? `<div class="box-sub">Durée : ${fmtDuration(inv.duration)}</div>` : ''}
    </div>
  </div>

  <p class="section-title">Informations client & lieu</p>
  <table>
    <tr><th>Client</th><th>Lieu</th><th>Contact</th></tr>
    <tr>
      <td>${clientName}</td>
      <td>${inv.location}</td>
      <td>${inv.contact_phone ?? '—'}</td>
    </tr>
  </table>

  <p class="section-title">Véhicule</p>
  <table>
    <tr><th>Plaque</th><th>Marque / Modèle</th><th>Kilométrage</th></tr>
    <tr>
      <td>${plate}</td>
      <td>${vehicle}</td>
      <td>${inv.vehicle_mileage ? inv.vehicle_mileage.toLocaleString('fr-FR') + ' km' : '—'}</td>
    </tr>
  </table>

  <p class="section-title">Équipement installé</p>
  <table>
    <tr><th>IMEI</th><th>SIM</th><th>Emplacement</th></tr>
    <tr>
      <td>${inv.imei ?? '—'}</td>
      <td>${inv.sim_card ?? '—'}</td>
      <td>${inv.device_location ?? '—'}</td>
    </tr>
  </table>

  <p class="section-title">Technicien</p>
  <table>
    <tr><th>Nom</th><th>Début</th><th>Fin</th></tr>
    <tr>
      <td>${inv.technician_name ?? '—'}</td>
      <td>${inv.start_time ? fmtDate(inv.start_time, { day: '2-digit', month: 'short' }) + ' ' + fmtTime(inv.start_time) : '—'}</td>
      <td>${inv.end_time ? fmtTime(inv.end_time) : '—'}</td>
    </tr>
  </table>

  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-label">Signature du technicien</div>
      <div class="sig-name">${inv.technician_name ?? '—'}</div>
      ${inv.signature_tech ? `<img src="${inv.signature_tech}" class="sig-img"/>` : '<div class="sig-line"></div><div class="sig-hint">Signature électronique</div>'}
    </div>
    <div class="sig-box">
      <div class="sig-label">Signature du client</div>
      <div class="sig-name">${clientName}</div>
      ${inv.signature_client ? `<img src="${inv.signature_client}" class="sig-img"/>` : '<div class="sig-line"></div><div class="sig-hint">Signature électronique</div>'}
    </div>
  </div>

  <div class="footer">TrackYu GPS &nbsp;•&nbsp; Bon d'intervention ${inv.id} &nbsp;•&nbsp; ${today}</div>
</div>
</body>
</html>`;
}

function buildRapportHtml(inv: PortalIntervention, clientName: string): string {
  const cfg = STATUS_CONFIG[inv.status] ?? { label: inv.status, color: '#64748b' };
  const plate = inv.license_plate ?? inv.vehicle_name ?? '—';
  const vehicle = [inv.vehicle_brand, inv.vehicle_model].filter(Boolean).join(' ') || '—';
  const today = new Date().toLocaleDateString('fr-FR');

  const checklistRows = inv.checklist
    ? Object.entries(inv.checklist)
        .map(
          ([k, v]) =>
            `<tr><td>${k}</td><td style="color:${v ? '#22C55E' : '#EF4444'};font-weight:bold">${v ? '✓ OK' : '✗ NON'}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="2" style="color:#94a3b8">Aucun élément renseigné</td></tr>';

  const testRows = inv.test_results
    ? Object.entries(inv.test_results)
        .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
        .join('')
    : '<tr><td colspan="2" style="color:#94a3b8">Aucun résultat renseigné</td></tr>';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Helvetica,Arial,sans-serif; font-size:11px; color:#1e293b; background:#fff; }
  .hdr { background:#0f172a; color:#fff; padding:20px 28px; }
  .hdr-brand { font-size:9px; font-weight:bold; text-transform:uppercase; letter-spacing:2px; opacity:.7; margin-bottom:4px; }
  .hdr h1 { font-size:16px; font-weight:bold; }
  .hdr-sub { font-size:9px; opacity:.6; margin-top:4px; }
  .content { padding:20px 28px; }
  .section-title { font-size:9px; font-weight:bold; text-transform:uppercase; color:#64748b; letter-spacing:1.5px; margin-bottom:8px; margin-top:16px; border-bottom:1px solid #e2e8f0; padding-bottom:4px; }
  .badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:10px; font-weight:bold; }
  table { width:100%; border-collapse:collapse; font-size:10px; margin-top:6px; }
  th { background:#0f172a; color:#fff; padding:7px 10px; text-align:left; font-size:9px; text-transform:uppercase; }
  td { padding:7px 10px; border-bottom:1px solid #f1f5f9; }
  .notes-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px; margin-top:6px; font-size:11px; color:#92400e; line-height:1.6; }
  .sig-row { display:flex; gap:16px; margin-top:28px; }
  .sig-box { flex:1; border:1px solid #e2e8f0; border-radius:8px; padding:14px; }
  .sig-label { font-size:9px; font-weight:bold; text-transform:uppercase; color:#64748b; margin-bottom:4px; }
  .sig-name { font-size:12px; font-weight:bold; color:#0f172a; }
  .sig-line { border-bottom:1px dashed #cbd5e1; margin-top:40px; }
  .sig-img { max-width:120px; max-height:40px; margin-top:8px; }
  .footer { text-align:center; color:#94a3b8; font-size:9px; margin-top:28px; border-top:1px solid #e2e8f0; padding-top:10px; }
</style>
</head>
<body>
<div class="hdr">
  <div class="hdr-brand">TrackYu GPS</div>
  <h1>RAPPORT D'INTERVENTION</h1>
  <div class="hdr-sub">N° ${inv.id} &nbsp;•&nbsp; Généré le ${today}</div>
</div>
<div class="content">

  <p class="section-title">Résumé</p>
  <table>
    <tr><th>Référence</th><th>Type</th><th>Nature</th><th>Statut</th><th>Date</th><th>Durée</th></tr>
    <tr>
      <td>${inv.id}</td>
      <td>${inv.type}</td>
      <td>${inv.nature}</td>
      <td><span class="badge" style="background:${cfg.color}22;color:${cfg.color}">${cfg.label}</span></td>
      <td>${fmtDate(inv.scheduled_date, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
      <td>${fmtDuration(inv.duration)}</td>
    </tr>
  </table>

  <p class="section-title">Client & Technicien</p>
  <table>
    <tr><th>Client</th><th>Lieu</th><th>Technicien</th><th>Début</th><th>Fin</th></tr>
    <tr>
      <td>${clientName}</td>
      <td>${inv.location}</td>
      <td>${inv.technician_name ?? '—'}</td>
      <td>${inv.start_time ? fmtDate(inv.start_time, { day: '2-digit', month: 'short' }) + ' ' + fmtTime(inv.start_time) : '—'}</td>
      <td>${inv.end_time ? fmtTime(inv.end_time) : '—'}</td>
    </tr>
  </table>

  <p class="section-title">Véhicule</p>
  <table>
    <tr><th>Plaque</th><th>Marque / Modèle</th><th>Kilométrage</th></tr>
    <tr>
      <td>${plate}</td>
      <td>${vehicle}</td>
      <td>${inv.vehicle_mileage ? inv.vehicle_mileage.toLocaleString('fr-FR') + ' km' : '—'}</td>
    </tr>
  </table>

  <p class="section-title">Équipement GPS installé</p>
  <table>
    <tr><th>IMEI</th><th>Carte SIM</th><th>Emplacement boîtier</th></tr>
    <tr>
      <td>${inv.imei ?? '—'}</td>
      <td>${inv.sim_card ?? '—'}</td>
      <td>${inv.device_location ?? '—'}</td>
    </tr>
  </table>

  <p class="section-title">Checklist véhicule</p>
  <table>
    <tr><th>Élément</th><th>Résultat</th></tr>
    ${checklistRows}
  </table>

  <p class="section-title">Résultats de tests</p>
  <table>
    <tr><th>Test</th><th>Résultat</th></tr>
    ${testRows}
  </table>

  ${
    inv.notes
      ? `
  <p class="section-title">Observations</p>
  <div class="notes-box">${inv.notes}</div>
  `
      : ''
  }

  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-label">Signature du technicien</div>
      <div class="sig-name">${inv.technician_name ?? '—'}</div>
      ${inv.signature_tech ? `<img src="${inv.signature_tech}" class="sig-img"/>` : '<div class="sig-line"></div>'}
    </div>
    <div class="sig-box">
      <div class="sig-label">Bon pour accord — Client</div>
      <div class="sig-name">${clientName}</div>
      ${inv.signature_client ? `<img src="${inv.signature_client}" class="sig-img"/>` : '<div class="sig-line"></div>'}
    </div>
  </div>

  <div class="footer">TrackYu GPS &nbsp;•&nbsp; Rapport d'intervention ${inv.id} &nbsp;•&nbsp; Confidentiel &nbsp;•&nbsp; ${today}</div>
</div>
</body>
</html>`;
}

// ── InfoRow ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        gap: 8,
      }}
    >
      {icon}
      <Text style={{ fontSize: 13, color: theme.text.muted, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: theme.text.primary, fontWeight: '600', maxWidth: '55%', textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

// ── PdfButton ─────────────────────────────────────────────────────────────────

function PdfButton({
  label,
  html,
  filename,
  theme,
}: {
  label: string;
  html: string;
  filename: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const [loading, setLoading] = useState(false);
  const handlePress = async () => {
    setLoading(true);
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: filename, UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF généré', `Fichier : ${uri}`);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.bg.surface,
        borderRadius: 12,
        paddingVertical: 13,
        borderWidth: 1,
        borderColor: theme.border,
      }}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <Download size={16} color={theme.primary} />
      )}
      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>{loading ? 'Génération…' : label}</Text>
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PortalInterventionDetailScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation();
  const route = useRoute<Route>();
  const { interventionId } = route.params;
  const { user } = useAuthStore();
  const clientName = user?.name ?? user?.email ?? 'Client';

  const { data, isLoading, isError, refetch } = useQuery<PortalIntervention>({
    queryKey: ['portal-intervention', interventionId],
    queryFn: () => portalApi.getInterventionById(interventionId),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={s.backBtn}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView>
          <SkeletonDetail />
        </ScrollView>
      </SafeAreaView>
    );
  }
  if (isError || !data) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={s.backBtn}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={s.center}>
          <XCircle size={40} color={theme.functional.error} />
          <Text style={s.errorText}>Impossible de charger l'intervention</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cfg = STATUS_CONFIG[data.status] ?? { label: data.status, color: '#6B7280' };
  const plate = data.license_plate ?? data.vehicle_name ?? '—';
  const vehicle = [data.vehicle_brand, data.vehicle_model].filter(Boolean).join(' ') || '—';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {data.nature}
          </Text>
          <Text style={s.subtitle}>{data.id}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: cfg.color + '22' }]}>
          <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* PDF download buttons */}
        <View style={s.pdfRow}>
          <PdfButton
            label="Bon d'intervention"
            html={buildBonHtml(data, clientName)}
            filename={`Bon_${data.id}`}
            theme={theme}
          />
          <PdfButton
            label="Rapport"
            html={buildRapportHtml(data, clientName)}
            filename={`Rapport_${data.id}`}
            theme={theme}
          />
        </View>

        {/* Infos générales */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Intervention</Text>
          <View style={s.card}>
            <InfoRow label="Type" value={data.type} icon={<Wrench size={14} color={theme.text.muted} />} />
            <InfoRow label="Nature" value={data.nature} />
            <InfoRow
              label="Date planifiée"
              value={fmtDate(data.scheduled_date)}
              icon={<CalendarClock size={14} color={theme.text.muted} />}
            />
            {data.start_time && (
              <InfoRow
                label="Début effectif"
                value={`${fmtDate(data.start_time, { day: '2-digit', month: 'short' })} ${fmtTime(data.start_time)}`}
              />
            )}
            {data.end_time && <InfoRow label="Fin" value={fmtTime(data.end_time)} />}
            {data.duration && (
              <InfoRow
                label="Durée"
                value={fmtDuration(data.duration)}
                icon={<Clock size={14} color={theme.text.muted} />}
              />
            )}
            <InfoRow label="Lieu" value={data.location} icon={<MapPin size={14} color={theme.text.muted} />} />
          </View>
        </View>

        {/* Véhicule */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Véhicule</Text>
          <View style={s.card}>
            <InfoRow label="Plaque" value={plate} icon={<Car size={14} color={theme.text.muted} />} />
            {vehicle !== '—' && <InfoRow label="Marque / Modèle" value={vehicle} />}
            {data.vehicle_mileage != null && (
              <InfoRow label="Kilométrage" value={`${data.vehicle_mileage.toLocaleString('fr-FR')} km`} />
            )}
          </View>
        </View>

        {/* Technicien */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Technicien</Text>
          <View style={s.card}>
            <InfoRow
              label="Nom"
              value={data.technician_name ?? '—'}
              icon={<User size={14} color={theme.text.muted} />}
            />
            {data.contact_phone && <InfoRow label="Contact" value={data.contact_phone} />}
          </View>
        </View>

        {/* Équipement GPS — emplacement visible, IMEI et SIM masqués (données sensibles traceur) */}
        {data.device_location && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Équipement GPS</Text>
            <View style={s.card}>
              <InfoRow label="Emplacement" value={data.device_location} />
            </View>
          </View>
        )}

        {/* Checklist */}
        {data.checklist && Object.keys(data.checklist).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Checklist véhicule</Text>
            <View style={s.card}>
              {Object.entries(data.checklist).map(([k, v]) => (
                <View
                  key={k}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 7,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    gap: 10,
                  }}
                >
                  {v ? <CheckCircle2 size={15} color="#22C55E" /> : <XCircle size={15} color="#EF4444" />}
                  <Text style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>{k}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: v ? '#22C55E' : '#EF4444' }}>
                    {v ? 'OK' : 'NON'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Résultats de tests */}
        {data.test_results && Object.keys(data.test_results).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Résultats de tests</Text>
            <View style={s.card}>
              {Object.entries(data.test_results).map(([k, v]) => (
                <InfoRow key={k} label={k} value={String(v)} />
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {data.notes ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Observations</Text>
            <View style={[s.card, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <FileText size={14} color="#92400E" style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 20 }}>{data.notes}</Text>
            </View>
          </View>
        ) : null}

        {/* Signatures */}
        {(data.signature_tech || data.signature_client) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Signatures</Text>
            <View style={s.sigRow}>
              <View style={[s.sigBox, { backgroundColor: theme.bg.surface, borderColor: theme.border }]}>
                <Text style={[s.sigLabel, { color: theme.text.muted }]}>Technicien</Text>
                <Text style={[s.sigName, { color: theme.text.primary }]}>{data.technician_name ?? '—'}</Text>
                {data.signature_tech ? (
                  <Text style={{ fontSize: 11, color: '#22C55E', marginTop: 6 }}>✓ Signé</Text>
                ) : (
                  <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 6 }}>Non signé</Text>
                )}
              </View>
              <View style={[s.sigBox, { backgroundColor: theme.bg.surface, borderColor: theme.border }]}>
                <Text style={[s.sigLabel, { color: theme.text.muted }]}>Client</Text>
                <Text style={[s.sigName, { color: theme.text.primary }]}>{clientName}</Text>
                {data.signature_client ? (
                  <Text style={{ fontSize: 11, color: '#22C55E', marginTop: 6 }}>✓ Signé</Text>
                ) : (
                  <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 6 }}>Non signé</Text>
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    center: { flex: 1, backgroundColor: theme.bg.primary, justifyContent: 'center', alignItems: 'center', gap: 12 },
    errorText: { fontSize: 14, color: theme.text.muted },
    retryBtn: {
      marginTop: 12,
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    retryText: { color: theme.text.onPrimary, fontWeight: '600', fontSize: 14 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    backBtn: { padding: 6 },
    title: { fontSize: 18, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 11, color: theme.text.muted, fontFamily: 'monospace', marginTop: 2 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    statusText: { fontSize: 11, fontWeight: '700' },
    content: { padding: 16, gap: 4, paddingBottom: 40 },
    pdfRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    section: { marginBottom: 16 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sigRow: { flexDirection: 'row', gap: 10 },
    sigBox: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12 },
    sigLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    sigName: { fontSize: 13, fontWeight: '700' },
  });
