/**
 * TrackYu Mobile — Mon Contrat (Document Contrat)
 * Mirror of the web ContractDetailModal → "Document Contrat" tab
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, FileText, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../theme';
import { portalApi, type PortalContract, type PortalSubscription } from '../../api/portal';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/formatCurrency';

// ── Constants ─────────────────────────────────────────────────────────────────

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMESTRIAL: 'Semestriel',
  ANNUAL: 'Annuel',
  YEARLY: 'Annuel',
};

const LEGAL_ARTICLES = [
  {
    title: 'Article 1 – Objet du contrat',
    body: (company: string) =>
      `Le présent contrat a pour objet la fourniture par ${company} d'un service de géolocalisation et de suivi GPS de véhicules au profit du CLIENT, selon les modalités définies aux présentes.`,
  },
  {
    title: 'Article 2 – Durée',
    body: () =>
      "Le contrat prend effet à la date de début indiquée ci-dessus. Sauf résiliation dans les conditions prévues à l'article 5, il est reconduit tacitement pour des périodes identiques sauf mention contraire.",
  },
  {
    title: 'Article 3 – Obligations du Prestataire',
    body: (company: string) =>
      `${company} s'engage à assurer la disponibilité de la plateforme de géolocalisation, à fournir l'assistance technique nécessaire et à notifier le CLIENT en cas d'interruption planifiée de service.`,
  },
  {
    title: 'Article 4 – Obligations du Client',
    body: () =>
      "Le CLIENT s'engage à utiliser les services conformément aux présentes, à régler les factures dans les délais convenus et à signaler toute anomalie dans les meilleurs délais.",
  },
  {
    title: 'Article 5 – Résiliation',
    body: () =>
      'Chaque partie peut résilier le contrat par lettre recommandée avec accusé de réception en respectant un préavis de 30 jours. En cas de manquement grave non corrigé sous 15 jours après mise en demeure, la résiliation peut être immédiate.',
  },
  {
    title: 'Article 6 – Confidentialité',
    body: () =>
      "Les parties s'engagent à garder confidentielles toutes informations échangées dans le cadre du présent contrat, pendant toute sa durée et 3 ans après son terme.",
  },
  {
    title: 'Article 7 – Loi applicable et litiges',
    body: () =>
      "Le présent contrat est régi par le droit applicable localement. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, les tribunaux compétents du siège social du Prestataire seront seuls compétents.",
  },
];

// ── PDF Builder ───────────────────────────────────────────────────────────────

function buildPdfHtml(
  contract: PortalContract,
  subs: PortalSubscription[],
  clientName: string,
  clientEmail: string,
  clientPhone: string
): string {
  const company = 'TrackYu';
  const ref = contract.reference;
  const startDate = new Date(contract.start_date).toLocaleDateString('fr-FR');
  const endDate = contract.end_date ? new Date(contract.end_date).toLocaleDateString('fr-FR') : 'Indéterminée';
  const today = new Date().toLocaleDateString('fr-FR');
  const subsTotal = subs.reduce((acc, s) => acc + (parseFloat(String(s.monthly_fee)) || 0), 0);

  const subsRows = subs.length
    ? subs
        .map(
          (s, i) => `
        <tr class="${i % 2 === 1 ? 'alt' : ''}">
          <td style="font-family:monospace;font-weight:bold">${s.vehicle_plate ?? '—'}</td>
          <td>${[s.vehicle_brand, s.vehicle_model].filter(Boolean).join(' ') || '—'}</td>
          <td>${CYCLE_LABELS[s.billing_cycle] ?? s.billing_cycle}</td>
          <td style="text-align:right;font-weight:bold">${parseFloat(String(s.monthly_fee || 0)).toLocaleString('fr-FR')} FCFA</td>
          <td style="text-align:center">
            <span class="badge" style="background:${s.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9'};color:${s.status === 'ACTIVE' ? '#15803d' : '#64748b'}">
              ${s.status === 'ACTIVE' ? 'Actif' : s.status}
            </span>
          </td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="5" style="text-align:center;color:#94a3b8;font-style:italic;padding:12px">Aucun abonnement.</td></tr>`;

  const articles = LEGAL_ARTICLES.map(
    (a) => `
    <p class="article-title">${a.title}</p>
    <p class="article-body">${a.body(company)}</p>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Helvetica,Arial,sans-serif; font-size:11px; color:#1e293b; background:#fff; }
  .header { background:#1e40af; color:#fff; padding:22px 32px; }
  .header-brand { font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:2px; opacity:.8; margin-bottom:6px; }
  .header h1 { font-size:18px; font-weight:bold; margin-bottom:4px; }
  .header-sub { font-size:10px; opacity:.65; margin-bottom:10px; }
  .header-meta { font-size:10px; opacity:.85; }
  .content { padding:24px 32px; }
  .section-title { font-size:9px; font-weight:bold; text-transform:uppercase; color:#64748b; letter-spacing:1.5px; margin-bottom:12px; }
  .parties { display:flex; gap:14px; margin-bottom:22px; }
  .party { flex:1; padding:14px 16px; border-radius:8px; }
  .party-p { background:#eff6ff; border:1px solid #bfdbfe; }
  .party-c { background:#faf5ff; border:1px solid #ddd6fe; }
  .party-label { font-size:9px; font-weight:bold; text-transform:uppercase; margin-bottom:6px; }
  .party-p .party-label { color:#1d4ed8; }
  .party-c .party-label { color:#7c3aed; }
  .party-name { font-size:13px; font-weight:bold; color:#0f172a; margin-bottom:3px; }
  .party-detail { font-size:10px; color:#64748b; margin-top:2px; }
  .divider { border:none; border-top:1px solid #e2e8f0; margin:20px 0; }
  table { width:100%; border-collapse:collapse; font-size:10px; margin-bottom:20px; }
  th { background:#1e40af; color:#fff; padding:8px 10px; text-align:left; font-size:9px; text-transform:uppercase; font-weight:bold; }
  td { padding:8px 10px; border-bottom:1px solid #f1f5f9; }
  .alt td { background:#f8fafc; }
  tfoot td { background:#eff6ff; color:#1d4ed8; font-weight:bold; }
  .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:9px; font-weight:bold; }
  .article-title { color:#1d4ed8; font-weight:bold; font-size:11px; margin:14px 0 5px; }
  .article-body { color:#475569; line-height:1.65; }
  .sig-row { display:flex; gap:16px; margin-top:32px; }
  .sig-box { flex:1; padding:16px; border-radius:8px; }
  .sig-c { background:#faf5ff; border:1px solid #ddd6fe; }
  .sig-p { background:#eff6ff; border:1px solid #bfdbfe; }
  .sig-label { font-size:9px; font-weight:bold; text-transform:uppercase; margin-bottom:6px; }
  .sig-c .sig-label { color:#7c3aed; }
  .sig-p .sig-label { color:#1d4ed8; }
  .sig-name { font-weight:bold; font-size:12px; color:#0f172a; }
  .sig-line { border-bottom:1px solid #cbd5e1; margin-top:42px; }
  .sig-hint { font-size:8px; color:#94a3b8; margin-top:5px; font-style:italic; }
  .footer { text-align:center; color:#94a3b8; font-size:9px; margin-top:36px; border-top:1px solid #e2e8f0; padding-top:12px; }
</style>
</head>
<body>
<div class="header">
  <div class="header-brand">${company}</div>
  <h1>CONTRAT DE PRESTATION DE SERVICES</h1>
  <div class="header-sub">Géolocalisation et Suivi GPS de Véhicules</div>
  <div class="header-meta">N° ${ref} &nbsp;•&nbsp; Début : ${startDate} &nbsp;•&nbsp; Fin : ${endDate} &nbsp;•&nbsp; Généré le ${today}</div>
</div>
<div class="content">
  <p class="section-title">Entre les soussignés</p>
  <div class="parties">
    <div class="party party-p">
      <div class="party-label">Le Prestataire</div>
      <div class="party-name">${company}</div>
      <div class="party-detail">Service de géolocalisation GPS</div>
    </div>
    <div class="party party-c">
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
        <th>Plaque</th><th>Véhicule</th><th>Périodicité</th>
        <th style="text-align:right">Tarif / Période</th><th style="text-align:center">Statut</th>
      </tr>
    </thead>
    <tbody>${subsRows}</tbody>
    ${
      subs.length
        ? `<tfoot><tr>
        <td colspan="3" style="text-align:right">TOTAL</td>
        <td style="text-align:right">${subsTotal.toLocaleString('fr-FR')} FCFA</td>
        <td></td>
      </tr></tfoot>`
        : ''
    }
  </table>
  <hr class="divider"/>
  <p class="section-title">Conditions Générales</p>
  ${articles}
  <div class="sig-row">
    <div class="sig-box sig-c">
      <div class="sig-label">Le Client</div>
      <div class="sig-name">${clientName}</div>
      <div class="sig-line"></div>
      <div class="sig-hint">Signature précédée de la mention « Lu et approuvé »</div>
    </div>
    <div class="sig-box sig-p">
      <div class="sig-label">Le Prestataire</div>
      <div class="sig-name">${company}</div>
      <div class="sig-line"></div>
      <div class="sig-hint">Cachet et signature autorisée</div>
    </div>
  </div>
  <div class="footer">${company} &nbsp;•&nbsp; Contrat ${ref} &nbsp;•&nbsp; Fait en deux exemplaires originaux. ${today}</div>
</div>
</body>
</html>`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={sc.sectionLabel}>{label}</Text>;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PortalContractDocumentScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation();
  const { user } = useAuthStore();
  const [generating, setGenerating] = useState(false);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<PortalContract[]>({
    queryKey: ['portal-contracts'],
    queryFn: () => portalApi.getContracts(),
  });

  const { data: subscriptions = [], isLoading: subsLoading } = useQuery<PortalSubscription[]>({
    queryKey: ['portal-subscriptions'],
    queryFn: () => portalApi.getSubscriptions(),
  });

  const isLoading = contractsLoading || subsLoading;

  // Pick active contract first, fallback to first available
  const contract = contracts.find((c) => c.status === 'ACTIVE') ?? contracts[0] ?? null;

  // Filter subs linked to this contract (if contract_id available)
  const contractSubs = contract
    ? subscriptions.filter((s) => !s.contract_id || s.contract_id === contract.id)
    : subscriptions;

  const subsTotal = contractSubs.reduce((acc, s) => acc + (parseFloat(String(s.monthly_fee)) || 0), 0);

  const company = 'TrackYu';
  const clientName = user?.name ?? '—';
  const clientEmail = user?.email ?? '';
  const clientPhone = user?.phone ?? '';

  const handleDownload = async () => {
    if (!contract) return;
    setGenerating(true);
    try {
      const html = buildPdfHtml(contract, contractSubs, clientName, clientEmail, clientPhone);
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
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!contract) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={s.title}>Mon Contrat</Text>
        </View>
        <View style={s.center}>
          <AlertCircle size={48} color={theme.text.muted} />
          <Text style={s.empty}>Aucun contrat trouvé</Text>
        </View>
      </SafeAreaView>
    );
  }

  const startDate = new Date(contract.start_date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const endDate = contract.end_date
    ? new Date(contract.end_date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Indéterminée';

  const statusColor = contract.status === 'ACTIVE' ? '#22C55E' : contract.status === 'EXPIRED' ? '#F59E0B' : '#EF4444';
  const statusLabel = contract.status === 'ACTIVE' ? 'Actif' : contract.status === 'EXPIRED' ? 'Expiré' : 'Résilié';

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header bar */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Mon Contrat</Text>
        <TouchableOpacity
          style={[s.pdfBtn, { opacity: generating ? 0.6 : 1 }]}
          onPress={handleDownload}
          disabled={generating}
          activeOpacity={0.7}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#fff" style={{ width: 16, height: 16 }} />
          ) : (
            <Download size={15} color="#fff" />
          )}
          <Text style={s.pdfBtnText}>{generating ? 'PDF…' : 'Télécharger'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* ── Document header (blue band) ─────────────────────────────── */}
        <View style={s.docHeader}>
          <Text style={s.docBrand}>{company.toUpperCase()}</Text>
          <Text style={s.docTitle}>CONTRAT DE PRESTATION DE SERVICES</Text>
          <Text style={s.docSub}>Géolocalisation et Suivi GPS de Véhicules</Text>
          <View style={s.docMeta}>
            <Text style={s.docMetaText}>N° {contract.reference}</Text>
            <Text style={s.docMetaDot}>·</Text>
            <Text style={s.docMetaText}>Début : {startDate}</Text>
            <Text style={s.docMetaDot}>·</Text>
            <Text style={s.docMetaText}>Fin : {endDate}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusColor + '33' }]}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={s.doc}>
          {/* ── Parties ─────────────────────────────────────────────────── */}
          <SectionLabel label="Entre les soussignés" />
          <View style={s.partiesRow}>
            {/* Prestataire */}
            <View style={[s.partyBox, s.partyBlue]}>
              <Text style={[s.partyRole, { color: '#1d4ed8' }]}>Le Prestataire</Text>
              <Text style={s.partyName}>{company}</Text>
              <Text style={s.partyDetail}>Service de géolocalisation GPS</Text>
            </View>
            {/* Client */}
            <View style={[s.partyBox, s.partyPurple]}>
              <Text style={[s.partyRole, { color: '#7c3aed' }]}>Le Client</Text>
              <Text style={s.partyName}>{clientName}</Text>
              {clientEmail ? <Text style={s.partyDetail}>{clientEmail}</Text> : null}
              {clientPhone ? <Text style={s.partyDetail}>{clientPhone}</Text> : null}
            </View>
          </View>

          <View style={s.divider} />

          {/* ── Abonnements table ────────────────────────────────────────── */}
          <SectionLabel label="Détail des Abonnements" />

          {/* Table header */}
          <View style={[s.tableRow, s.tableHead]}>
            <Text style={[s.thCell, { flex: 1.2 }]}>Plaque</Text>
            <Text style={[s.thCell, { flex: 2 }]}>Véhicule</Text>
            <Text style={[s.thCell, { flex: 1.2 }]}>Période</Text>
            <Text style={[s.thCell, { flex: 1.5, textAlign: 'right' }]}>Tarif</Text>
            <Text style={[s.thCell, { flex: 1, textAlign: 'center' }]}>Statut</Text>
          </View>

          {contractSubs.length === 0 ? (
            <View style={s.tableEmpty}>
              <Text style={s.tableEmptyText}>Aucun abonnement.</Text>
            </View>
          ) : (
            contractSubs.map((sub, i) => {
              const plate = sub.vehicle_plate ?? '—';
              const vehicle = [sub.vehicle_brand, sub.vehicle_model].filter(Boolean).join(' ') || '—';
              const cycle = CYCLE_LABELS[sub.billing_cycle] ?? sub.billing_cycle;
              const fee = formatCurrency(parseFloat(String(sub.monthly_fee || 0)));
              const active = sub.status === 'ACTIVE';
              return (
                <View key={sub.id} style={[s.tableRow, i % 2 === 1 && { backgroundColor: theme.bg.elevated }]}>
                  <Text style={[s.tdCell, { flex: 1.2, fontWeight: '700', fontFamily: 'monospace' }]}>{plate}</Text>
                  <Text style={[s.tdCell, { flex: 2 }]} numberOfLines={1}>
                    {vehicle}
                  </Text>
                  <Text style={[s.tdCell, { flex: 1.2 }]}>{cycle}</Text>
                  <Text style={[s.tdCell, { flex: 1.5, textAlign: 'right', fontWeight: '700' }]}>{fee}</Text>
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={[s.miniTag, { backgroundColor: active ? '#dcfce7' : '#f1f5f9' }]}>
                      <Text style={[s.miniTagText, { color: active ? '#15803d' : '#64748b' }]}>
                        {active ? 'Actif' : sub.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Total row */}
          {contractSubs.length > 0 && (
            <View style={[s.tableRow, s.tableTotal]}>
              <Text style={[s.tdCell, { flex: 1.2 + 2 + 1.2, color: '#1d4ed8', fontWeight: '700' }]}>TOTAL</Text>
              <Text style={[s.tdCell, { flex: 1.5, textAlign: 'right', color: '#1d4ed8', fontWeight: '700' }]}>
                {formatCurrency(subsTotal)}
              </Text>
              <View style={{ flex: 1 }} />
            </View>
          )}

          <View style={s.divider} />

          {/* ── Conditions Générales ─────────────────────────────────────── */}
          <SectionLabel label="Conditions Générales" />
          <View style={s.articlesBlock}>
            {LEGAL_ARTICLES.map((art, i) => (
              <View key={i} style={s.article}>
                <View style={s.articleDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.articleTitle}>{art.title}</Text>
                  <Text style={s.articleBody}>{art.body(company)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={s.divider} />

          {/* ── Signatures ───────────────────────────────────────────────── */}
          <SectionLabel label="Signatures" />
          <View style={s.sigRow}>
            {/* Client */}
            <View style={[s.sigBox, s.sigPurple]}>
              <Text style={[s.sigRole, { color: '#7c3aed' }]}>Le Client</Text>
              <Text style={s.sigName}>{clientName}</Text>
              <Text style={s.sigFieldLabel}>Nom et qualité du signataire :</Text>
              <View style={s.sigLine} />
              <Text style={s.sigFieldLabel}>Date : ____________________</Text>
              <View style={[s.sigLine, { marginTop: 32 }]} />
              <Text style={s.sigHint}>Signature précédée de la mention « Lu et approuvé »</Text>
            </View>
            {/* Prestataire */}
            <View style={[s.sigBox, s.sigBlue]}>
              <Text style={[s.sigRole, { color: '#1d4ed8' }]}>Le Prestataire</Text>
              <Text style={s.sigName}>{company}</Text>
              <Text style={s.sigFieldLabel}>Cachet et signature autorisée :</Text>
              <View style={s.sigLine} />
              <Text style={s.sigFieldLabel}>Date : ____________________</Text>
              <View style={[s.sigLine, { marginTop: 32 }]} />
              <Text style={s.sigHint}>Signature précédée de la mention « Lu et approuvé »</Text>
            </View>
          </View>

          <Text style={s.docFooter}>Fait en deux exemplaires originaux.</Text>

          <View style={s.fileRow}>
            <FileText size={14} color={theme.text.muted} />
            <Text style={s.fileRef}>Contrat réf. {contract.reference}</Text>
            <CheckCircle2 size={14} color={statusColor} />
            <Text style={[s.fileStatus, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
});

const styles = (theme: ReturnType<typeof import('../../theme').useTheme>['theme']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    empty: { fontSize: 14, color: theme.text.muted },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      gap: 12,
      backgroundColor: theme.bg.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: { padding: 6 },
    title: { fontSize: 18, fontWeight: '700', color: theme.text.primary, flex: 1 },
    pdfBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    pdfBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

    content: { paddingBottom: 32 },

    // Document header (blue band)
    docHeader: {
      backgroundColor: '#1e40af',
      padding: 20,
      paddingTop: 24,
      gap: 4,
    },
    docBrand: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 2 },
    docTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 2 },
    docSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
    docMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
    docMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
    docMetaDot: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginTop: 8,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },

    // Document body
    doc: { padding: 16, gap: 0 },
    divider: { height: 1, backgroundColor: theme.border, marginVertical: 20 },

    // Parties
    partiesRow: { flexDirection: 'row', gap: 10, marginBottom: 0 },
    partyBox: { flex: 1, padding: 12, borderRadius: 10, gap: 3 },
    partyBlue: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
    partyPurple: { backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#ddd6fe' },
    partyRole: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    partyName: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 2 },
    partyDetail: { fontSize: 10, color: '#64748b', marginTop: 1 },

    // Table
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
    tableHead: { backgroundColor: '#1e40af', borderRadius: 8, marginBottom: 2 },
    thCell: { fontSize: 9, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
    tdCell: { fontSize: 11, color: theme.text.primary },
    tableEmpty: { paddingVertical: 16, alignItems: 'center' },
    tableEmptyText: { fontSize: 12, color: theme.text.muted, fontStyle: 'italic' },
    tableTotal: {
      backgroundColor: '#eff6ff',
      borderRadius: 8,
      marginTop: 2,
    },
    miniTag: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
    miniTagText: { fontSize: 9, fontWeight: '700' },

    // Articles
    articlesBlock: { gap: 14 },
    article: { flexDirection: 'row', gap: 10 },
    articleDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#1d4ed8',
      marginTop: 5,
      flexShrink: 0,
    },
    articleTitle: { fontSize: 12, fontWeight: '700', color: '#1d4ed8', marginBottom: 3 },
    articleBody: { fontSize: 11, color: theme.text.secondary, lineHeight: 17 },

    // Signatures
    sigRow: { flexDirection: 'row', gap: 10 },
    sigBox: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 2, gap: 6 },
    sigBlue: { backgroundColor: 'rgba(239,246,255,0.6)', borderColor: '#bfdbfe', borderStyle: 'dashed' },
    sigPurple: { backgroundColor: 'rgba(250,245,255,0.6)', borderColor: '#ddd6fe', borderStyle: 'dashed' },
    sigRole: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
    sigName: { fontSize: 13, fontWeight: '700', color: theme.text.primary },
    sigFieldLabel: { fontSize: 10, color: theme.text.muted, marginTop: 6 },
    sigLine: { borderBottomWidth: 1, borderBottomColor: theme.border, marginTop: 4 },
    sigHint: { fontSize: 9, color: theme.text.muted, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },

    docFooter: {
      textAlign: 'center',
      fontSize: 11,
      color: theme.text.muted,
      fontStyle: 'italic',
      marginTop: 20,
    },
    fileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      justifyContent: 'center',
      marginTop: 8,
    },
    fileRef: { fontSize: 12, color: theme.text.muted },
    fileStatus: { fontSize: 12, fontWeight: '600' },
  });
