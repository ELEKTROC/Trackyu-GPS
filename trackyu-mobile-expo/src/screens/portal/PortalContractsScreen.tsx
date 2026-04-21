/**
 * TrackYu Mobile — Portal Contracts
 * Génération PDF contrat via expo-print + expo-sharing (identique au web)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, RefreshCw, Download, FileText, Eye } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../theme';
import { portalApi, type PortalContract } from '../../api/portal';
import { SkeletonRow } from '../../components/SkeletonBox';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { CONTRACT_STATUS_COLORS, CONTRACT_STATUS_LABELS } from '../../utils/portalColors';

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMESTRIAL: 'Semestriel',
  ANNUAL: 'Annuel',
};

// ── HTML PDF template ─────────────────────────────────────────────────────────

function buildContractHtml(
  contract: PortalContract,
  user: { name?: string; email?: string; phone?: string } | null
): string {
  const companyName = 'TrackYu';
  const clientName = user?.name ?? '—';
  const clientEmail = user?.email ?? '';
  const clientPhone = user?.phone ?? '';
  const contractRef = contract.reference;
  const today = new Date().toLocaleDateString('fr-FR');
  const startDate = new Date(contract.start_date).toLocaleDateString('fr-FR');
  const endDate = contract.end_date ? new Date(contract.end_date).toLocaleDateString('fr-FR') : 'Indéterminée';
  const cycle = CYCLE_LABELS[contract.billing_cycle] ?? contract.billing_cycle;
  const total = contract.monthly_fee.toLocaleString('fr-FR') + ' FCFA';
  const statusLabel = contract.status === 'ACTIVE' ? 'Actif' : contract.status === 'EXPIRED' ? 'Expiré' : 'Résilié';
  const statusBg = contract.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9';
  const statusColor = contract.status === 'ACTIVE' ? '#15803d' : '#64748b';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
  .header { background: #1e40af; color: #fff; padding: 22px 32px; }
  .header-brand { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; margin-bottom: 6px; }
  .header h1 { font-size: 18px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 4px; }
  .header-sub { font-size: 10px; opacity: 0.65; margin-bottom: 10px; }
  .header-meta { font-size: 10px; opacity: 0.85; }
  .content { padding: 24px 32px; }
  .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; margin-bottom: 12px; }
  .parties { display: flex; gap: 14px; margin-bottom: 22px; }
  .party { flex: 1; padding: 14px 16px; border-radius: 8px; }
  .party-prestataire { background: #eff6ff; border: 1px solid #bfdbfe; }
  .party-client { background: #faf5ff; border: 1px solid #ddd6fe; }
  .party-label { font-size: 9px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; }
  .party-prestataire .party-label { color: #1d4ed8; }
  .party-client .party-label { color: #7c3aed; }
  .party-name { font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 3px; }
  .party-detail { font-size: 10px; color: #64748b; margin-top: 2px; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px; }
  th { background: #1e40af; color: #fff; padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; font-weight: bold; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
  .alt td { background: #f8fafc; }
  tfoot td { background: #eff6ff; color: #1d4ed8; font-weight: bold; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; }
  .article-title { color: #1d4ed8; font-weight: bold; font-size: 11px; margin: 14px 0 5px; }
  .article-body { color: #475569; line-height: 1.65; }
  .sig-row { display: flex; gap: 16px; margin-top: 32px; }
  .sig-box { flex: 1; padding: 16px; border-radius: 8px; }
  .sig-box-client { background: #faf5ff; border: 1px solid #ddd6fe; }
  .sig-box-company { background: #eff6ff; border: 1px solid #bfdbfe; }
  .sig-label { font-size: 9px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; }
  .sig-box-client .sig-label { color: #7c3aed; }
  .sig-box-company .sig-label { color: #1d4ed8; }
  .sig-name { font-weight: bold; font-size: 12px; color: #0f172a; }
  .sig-line { border-bottom: 1px solid #cbd5e1; margin-top: 42px; }
  .sig-hint { font-size: 8px; color: #94a3b8; margin-top: 5px; font-style: italic; }
  .footer { text-align: center; color: #94a3b8; font-size: 9px; margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
</style>
</head>
<body>

<div class="header">
  <div class="header-brand">${companyName}</div>
  <h1>CONTRAT DE PRESTATION DE SERVICES</h1>
  <div class="header-sub">Géolocalisation et Suivi GPS de Véhicules</div>
  <div class="header-meta">
    N° ${contractRef} &nbsp;•&nbsp; Début : ${startDate} &nbsp;•&nbsp; Fin : ${endDate}
    &nbsp;•&nbsp; Généré le ${today}
  </div>
</div>

<div class="content">

  <p class="section-title">Entre les soussignés</p>
  <div class="parties">
    <div class="party party-prestataire">
      <div class="party-label">Le Prestataire</div>
      <div class="party-name">${companyName}</div>
      <div class="party-detail">Service de géolocalisation GPS</div>
    </div>
    <div class="party party-client">
      <div class="party-label">Le Client</div>
      <div class="party-name">${clientName}</div>
      ${clientEmail ? `<div class="party-detail">${clientEmail}</div>` : ''}
      ${clientPhone ? `<div class="party-detail">${clientPhone}</div>` : ''}
    </div>
  </div>

  <hr class="divider"/>

  <p class="section-title">Détail des Abonnements</p>
  <table>
    <thead>
      <tr>
        <th>Référence</th>
        <th>Périodicité</th>
        <th style="text-align:center">Nb véhicules</th>
        <th style="text-align:right">Tarif / Période</th>
        <th style="text-align:center">Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${contractRef}</td>
        <td>${cycle}${contract.auto_renew ? ' · Auto-renouvellement' : ''}</td>
        <td style="text-align:center">${contract.vehicle_count}</td>
        <td style="text-align:right;font-weight:bold">${total}</td>
        <td style="text-align:center">
          <span class="status-badge" style="background:${statusBg};color:${statusColor}">${statusLabel}</span>
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align:right">TOTAL</td>
        <td style="text-align:right">${total}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <hr class="divider"/>

  <p class="section-title">Conditions Générales</p>

  <p class="article-title">Article 1 – Objet du contrat</p>
  <p class="article-body">Le présent contrat a pour objet la fourniture par ${companyName} d'un service de géolocalisation et de suivi GPS de véhicules au profit du CLIENT, selon les modalités définies aux présentes.</p>

  <p class="article-title">Article 2 – Durée</p>
  <p class="article-body">Le contrat prend effet à la date de début indiquée ci-dessus. Sauf résiliation dans les conditions prévues à l'article 5, il est reconduit tacitement pour des périodes identiques sauf mention contraire.</p>

  <p class="article-title">Article 3 – Obligations du Prestataire</p>
  <p class="article-body">${companyName} s'engage à assurer la disponibilité de la plateforme de géolocalisation, à fournir l'assistance technique nécessaire et à notifier le CLIENT en cas d'interruption planifiée de service.</p>

  <p class="article-title">Article 4 – Obligations du Client</p>
  <p class="article-body">Le CLIENT s'engage à utiliser les services conformément aux présentes, à régler les factures dans les délais convenus et à signaler toute anomalie dans les meilleurs délais.</p>

  <p class="article-title">Article 5 – Résiliation</p>
  <p class="article-body">Chaque partie peut résilier le contrat par lettre recommandée avec accusé de réception en respectant un préavis de 30 jours. En cas de manquement grave non corrigé sous 15 jours après mise en demeure, la résiliation peut être immédiate.</p>

  <p class="article-title">Article 6 – Confidentialité</p>
  <p class="article-body">Les parties s'engagent à garder confidentielles toutes informations échangées dans le cadre du présent contrat, pendant toute sa durée et 3 ans après son terme.</p>

  <p class="article-title">Article 7 – Loi applicable et litiges</p>
  <p class="article-body">Le présent contrat est régi par le droit applicable localement. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, les tribunaux compétents du siège social du Prestataire seront seuls compétents.</p>

  <div class="sig-row">
    <div class="sig-box sig-box-client">
      <div class="sig-label">Le Client</div>
      <div class="sig-name">${clientName}</div>
      <div class="sig-line"></div>
      <div class="sig-hint">Signature précédée de la mention « Lu et approuvé »</div>
    </div>
    <div class="sig-box sig-box-company">
      <div class="sig-label">Le Prestataire</div>
      <div class="sig-name">${companyName}</div>
      <div class="sig-line"></div>
      <div class="sig-hint">Cachet et signature autorisée</div>
    </div>
  </div>

  <div class="footer">
    ${companyName} &nbsp;•&nbsp; Contrat ${contractRef} &nbsp;•&nbsp; Fait en deux exemplaires originaux. ${today}
  </div>

</div>
</body>
</html>`;
}

// ── ContractCard ──────────────────────────────────────────────────────────────

interface ContractCardProps {
  contract: PortalContract;
  user: { name?: string; email?: string; phone?: string } | null;
}

function ContractCard({ contract, user }: ContractCardProps) {
  const { theme } = useTheme();
  const s = cardStyles(theme);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const color = CONTRACT_STATUS_COLORS[contract.status] ?? '#6B7280';
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const html = buildContractHtml(contract, user);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Contrat ${contract.reference}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF généré', `Fichier enregistré : ${uri}`);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={s.card}>
      <View style={[s.topBar, { backgroundColor: color }]} />
      <View style={s.body}>
        {/* Header */}
        <View style={s.row}>
          <View style={s.titleRow}>
            <FileText size={16} color={theme.primary} />
            <Text style={s.reference}>{contract.reference}</Text>
          </View>
          <View style={{ backgroundColor: color + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color, fontSize: 11, fontWeight: '600' }}>
              {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
            </Text>
          </View>
        </View>

        {/* Info grid */}
        <View style={s.infoGrid}>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Début</Text>
            <Text style={s.infoValue}>
              {new Date(contract.start_date).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Fin</Text>
            <Text style={s.infoValue}>
              {contract.end_date
                ? new Date(contract.end_date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Mensualité</Text>
            <Text style={s.infoValue}>{formatCurrency(contract.monthly_fee)}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Véhicules</Text>
            <Text style={s.infoValue}>{contract.vehicle_count}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.footerItem}>
            <RefreshCw size={12} color={theme.text.muted} />
            <Text style={s.footerText}>
              {CYCLE_LABELS[contract.billing_cycle] ?? contract.billing_cycle}
              {contract.auto_renew ? ' · Auto-renouvellement' : ''}
            </Text>
          </View>

          <View style={s.actions}>
            {/* Voir document — aligne avec onglet "Document Contrat" du web */}
            <TouchableOpacity
              style={[s.pdfBtn, { backgroundColor: theme.bg.elevated, borderWidth: 1, borderColor: theme.border }]}
              onPress={() => nav.navigate('PortalContractDocument')}
              activeOpacity={0.7}
              accessibilityLabel="Voir le document contrat"
              accessibilityRole="button"
            >
              <Eye size={13} color={theme.text.primary} />
              <Text style={[s.pdfBtnText, { color: theme.text.primary }]}>Voir document</Text>
            </TouchableOpacity>

            {/* Télécharger PDF */}
            <TouchableOpacity
              style={[s.pdfBtn, { backgroundColor: theme.primaryDim }]}
              onPress={handleDownload}
              disabled={generating}
              activeOpacity={0.7}
              accessibilityLabel="Télécharger le contrat en PDF"
              accessibilityRole="button"
            >
              {generating ? (
                <ActivityIndicator size="small" color={theme.primary} style={{ width: 14, height: 14 }} />
              ) : (
                <Download size={13} color={theme.primary} />
              )}
              <Text style={[s.pdfBtnText, { color: theme.primary }]}>{generating ? 'Génération…' : 'Télécharger'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const cardStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    topBar: { height: 4 },
    body: { padding: 14, gap: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reference: { fontSize: 15, fontWeight: '700', color: theme.text.primary },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    infoItem: { minWidth: '40%' },
    infoLabel: { fontSize: 11, color: theme.text.muted, fontWeight: '500' },
    infoValue: { fontSize: 13, color: theme.text.primary, fontWeight: '600', marginTop: 2 },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    footerText: { fontSize: 11, color: theme.text.muted },
    actions: { flexDirection: 'row', gap: 6 },
    pdfBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    pdfBtnText: { fontSize: 12, fontWeight: '600' },
  });

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PortalContractsScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation();
  const { user } = useAuthStore();

  const { data, isLoading, refetch, isRefetching } = useQuery<PortalContract[]>({
    queryKey: ['portal-contracts'],
    queryFn: () => portalApi.getContracts(),
  });

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
        <Text style={s.title}>Mes Contrats</Text>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={s.list}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} style={{ borderRadius: 14, padding: 14 }} />
          ))}
        </ScrollView>
      ) : !data?.length ? (
        <View style={s.center}>
          <ClipboardList size={48} color={theme.text.muted} />
          <Text style={s.empty}>Aucun contrat trouvé</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
        >
          {data.map((c) => (
            <ContractCard key={c.id} contract={c} user={user} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    backBtn: { padding: 6 },
    title: { fontSize: 20, fontWeight: '700', color: theme.text.primary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    list: { padding: 16, gap: 12 },
    empty: { fontSize: 14, color: theme.text.muted },
  });
