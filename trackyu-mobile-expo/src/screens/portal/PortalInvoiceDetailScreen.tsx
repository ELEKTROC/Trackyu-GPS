/**
 * TrackYu Mobile — Portal Invoice Detail + PDF download
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, AlertCircle, CreditCard, X, Copy, CheckCircle2, Phone } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { portalApi, type PortalInvoiceItem } from '../../api/portal';
import { API_URL } from '../../api/config';
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '../../utils/portalColors';
import type { PortalStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<PortalStackParamList>;
type Route = RouteProp<PortalStackParamList, 'PortalInvoiceDetail'>;

// ── PaymentModal ──────────────────────────────────────────────────────────────

function PaymentModal({
  visible,
  onClose,
  invoiceNumber,
  amountDue,
}: {
  visible: boolean;
  onClose: () => void;
  invoiceNumber: string;
  amountDue: number;
}) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const { data: paySettings } = useQuery({
    queryKey: ['portal-payment-settings'],
    queryFn: () => portalApi.getPaymentSettings(),
    staleTime: 10 * 60 * 1000,
  });

  const fmt = formatCurrency;
  const ref = `FAC-${invoiceNumber}`;

  const handleWave = async () => {
    if (!paySettings?.wave_link) return;
    const url = paySettings.wave_link;
    // Validation stricte du schéma : seul https:// est accepté
    if (!url.startsWith('https://')) {
      Alert.alert('Erreur', 'Lien de paiement invalide.');
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Erreur', "Impossible d'ouvrir le lien Wave.");
    }
  };

  const handleCopy = (text: string) => {
    Share.share({ message: text });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pm = {
    container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
    sheet: {
      backgroundColor: theme.bg.primary,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 36,
      gap: 16,
    },
    header: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
    title: { fontSize: 17, fontWeight: '700' as const, color: theme.text.primary },
    amountBadge: {
      backgroundColor: theme.primaryDim,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      alignItems: 'center' as const,
    },
    amountLabel: { fontSize: 12, color: theme.text.muted, fontWeight: '500' as const },
    amountValue: { fontSize: 22, fontWeight: '800' as const, color: theme.primary },
    amountRef: { fontSize: 11, color: theme.text.muted, marginTop: 2 },
    divider: { height: 1, backgroundColor: theme.border },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: theme.text.muted,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    waveBtn: {
      backgroundColor: '#1DC8FF',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    waveBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },
    orangeBox: {
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
    },
    orangeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
    orangePhone: { fontSize: 20, fontWeight: '800' as const, color: theme.text.primary, flex: 1, letterSpacing: 0.5 },
    orangeInstr: { fontSize: 12, color: theme.text.secondary, lineHeight: 18 },
    copyBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: theme.bg.elevated,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    copyBtnText: { fontSize: 12, fontWeight: '600' as const, color: theme.text.secondary },
    noConfig: { alignItems: 'center' as const, gap: 8, paddingVertical: 16 },
    noConfigText: { fontSize: 13, color: theme.text.muted, textAlign: 'center' as const, paddingHorizontal: 16 },
  };

  const hasWave = !!paySettings?.wave_link;
  const hasOrange = !!paySettings?.orange_number;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pm.container} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={pm.sheet} activeOpacity={1} onPress={() => {}}>
          {/* Header */}
          <View style={pm.header}>
            <Text style={pm.title}>Payer maintenant</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Montant */}
          <View style={pm.amountBadge}>
            <Text style={pm.amountLabel}>Montant à régler</Text>
            <Text style={pm.amountValue}>{fmt(amountDue)}</Text>
            <Text style={pm.amountRef}>Réf. {ref}</Text>
          </View>

          <View style={pm.divider} />

          {!paySettings ? (
            <ActivityIndicator color={theme.primary} />
          ) : !hasWave && !hasOrange ? (
            <View style={pm.noConfig}>
              <AlertCircle size={32} color={theme.text.muted} />
              <Text style={pm.noConfigText}>
                Aucun moyen de paiement configuré.{'\n'}Contactez le support pour régler cette facture.
              </Text>
            </View>
          ) : (
            <>
              {/* Wave */}
              {hasWave && (
                <View style={{ gap: 8 }}>
                  <Text style={pm.sectionLabel}>Payer via Wave</Text>
                  <TouchableOpacity style={pm.waveBtn} onPress={handleWave} activeOpacity={0.85}>
                    <CreditCard size={18} color="#fff" />
                    <Text style={pm.waveBtnText}>Ouvrir Wave</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: theme.text.muted, textAlign: 'center' }}>
                    Indiquez la référence <Text style={{ fontWeight: '700' }}>{ref}</Text> dans le motif
                  </Text>
                </View>
              )}

              {hasWave && hasOrange && <View style={pm.divider} />}

              {/* Orange Money */}
              {hasOrange && (
                <View style={{ gap: 8 }}>
                  <Text style={pm.sectionLabel}>Payer via Orange Money</Text>
                  <View style={pm.orangeBox}>
                    <View style={pm.orangeRow}>
                      <Phone size={18} color="#FF6600" />
                      <Text style={pm.orangePhone}>{paySettings!.orange_number}</Text>
                      <TouchableOpacity style={pm.copyBtn} onPress={() => handleCopy(paySettings!.orange_number!)}>
                        {copied ? (
                          <CheckCircle2 size={14} color={theme.functional.success} />
                        ) : (
                          <Copy size={14} color={theme.text.secondary} />
                        )}
                        <Text style={pm.copyBtnText}>{copied ? 'Copié' : 'Copier'}</Text>
                      </TouchableOpacity>
                    </View>
                    {paySettings!.orange_name && (
                      <Text style={{ fontSize: 12, color: theme.text.muted }}>
                        Nom :{' '}
                        <Text style={{ fontWeight: '600', color: theme.text.primary }}>{paySettings!.orange_name}</Text>
                      </Text>
                    )}
                    <Text style={pm.orangeInstr}>
                      Envoyez <Text style={{ fontWeight: '700' }}>{fmt(amountDue)}</Text> à ce numéro, puis indiquez la
                      référence <Text style={{ fontWeight: '700' }}>{ref}</Text> dans le motif du transfert.
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 13, color: theme.text.muted }}>{label}</Text>
      <Text style={{ fontSize: 13, color: theme.text.primary, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export default function PortalInvoiceDetailScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { invoiceId } = route.params;
  const [showPayment, setShowPayment] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-invoice', invoiceId],
    queryFn: () => portalApi.getInvoiceById(invoiceId),
  });

  const fmt = formatCurrency;

  const handleDownload = async (url: string) => {
    // Validation stricte : seules les URLs https:// sont acceptées
    if (!url.startsWith('https://')) {
      Alert.alert('Erreur', 'Lien invalide.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erreur', "Impossible d'ouvrir ce lien PDF.");
      }
    } catch {
      Alert.alert('Erreur', "Une erreur est survenue lors de l'ouverture du PDF.");
    }
  };

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
        <Text style={s.title}>Détail Facture</Text>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : isError || !data ? (
        <View style={s.center}>
          <AlertCircle size={40} color={theme.functional.error} />
          <Text style={s.empty}>Impossible de charger la facture</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          {/* Invoice header */}
          <View style={s.card}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 12,
              }}
            >
              <View>
                <Text style={s.invoiceNum}>{data.invoice.invoice_number}</Text>
                <Text style={s.invoiceDate}>
                  {new Date(data.invoice.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: (INVOICE_STATUS_COLORS[data.invoice.status] ?? '#6B7280') + '22',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text
                  style={{
                    color: INVOICE_STATUS_COLORS[data.invoice.status] ?? '#6B7280',
                    fontWeight: '700',
                    fontSize: 12,
                  }}
                >
                  {INVOICE_STATUS_LABELS[data.invoice.status] ?? data.invoice.status}
                </Text>
              </View>
            </View>

            <InfoRow label="Montant HT" value={fmt(data.invoice.amount_ht)} />
            <InfoRow label="Montant TTC" value={fmt(data.invoice.amount_ttc)} />
            <InfoRow label="Payé" value={fmt(data.invoice.paid_amount)} />
            {data.invoice.due_date && (
              <InfoRow
                label="Échéance"
                value={new Date(data.invoice.due_date).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              />
            )}
          </View>

          {/* Line items */}
          {data.items.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Lignes de facturation</Text>
              <View style={s.card}>
                {data.items.map((item: PortalInvoiceItem, idx: number) => (
                  <View
                    key={item.id}
                    style={[
                      s.itemRow,
                      idx < data.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemDesc}>{item.description}</Text>
                      <Text style={s.itemMeta}>
                        {item.quantity} × {fmt(item.unit_price)}
                      </Text>
                    </View>
                    <Text style={s.itemTotal}>{fmt(item.total)}</Text>
                  </View>
                ))}

                {/* Total row */}
                <View style={[s.itemRow, s.totalRow]}>
                  <Text style={s.totalLabel}>Total TTC</Text>
                  <Text style={s.totalValue}>{fmt(data.invoice.amount_ttc)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Payer maintenant — visible si solde restant > 0 */}
          {['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(data.invoice.status) && (
            <TouchableOpacity
              style={[s.pdfBtn, { backgroundColor: theme.functional.error }]}
              onPress={() => setShowPayment(true)}
              activeOpacity={0.8}
            >
              <CreditCard size={18} color="#fff" />
              <Text style={s.pdfBtnText}>Payer maintenant</Text>
            </TouchableOpacity>
          )}

          {/* PDF */}
          <TouchableOpacity
            style={s.pdfBtn}
            onPress={() => handleDownload(`${API_URL}/portal/invoices/${invoiceId}/pdf`)}
            activeOpacity={0.8}
          >
            <Download size={18} color={theme.text.onPrimary} />
            <Text style={s.pdfBtnText}>Télécharger le PDF</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {data && (
        <PaymentModal
          visible={showPayment}
          onClose={() => setShowPayment(false)}
          invoiceNumber={data.invoice.invoice_number}
          amountDue={data.invoice.amount_ttc - data.invoice.paid_amount}
        />
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
    content: { padding: 16, gap: 16 },
    empty: { fontSize: 14, color: theme.text.muted },

    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    invoiceNum: { fontSize: 18, fontWeight: '700', color: theme.text.primary },
    invoiceDate: { fontSize: 13, color: theme.text.muted, marginTop: 2 },

    section: { gap: 8 },
    sectionTitle: {
      fontSize: 13,
      color: theme.text.secondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },

    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
    itemDesc: { fontSize: 13, color: theme.text.primary, fontWeight: '500' },
    itemMeta: { fontSize: 11, color: theme.text.muted, marginTop: 2 },
    itemTotal: { fontSize: 13, fontWeight: '700', color: theme.text.primary },

    totalRow: { borderTopWidth: 1, borderTopColor: theme.borderStrong, marginTop: 4, paddingTop: 10 },
    totalLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.text.primary },
    totalValue: { fontSize: 15, fontWeight: '700', color: theme.primary },

    pdfBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
    },
    pdfBtnText: { color: theme.text.onPrimary, fontWeight: '700', fontSize: 15 },
  });
