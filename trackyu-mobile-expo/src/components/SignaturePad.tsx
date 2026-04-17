/**
 * TrackYu Mobile — SignaturePad
 * Capture de signature numérique via react-native-signature-canvas (WebView)
 * Retourne une image base64 PNG.
 */
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SignatureCanvas, { type SignatureViewRef } from 'react-native-signature-canvas';
import { RotateCcw, Check } from 'lucide-react-native';

type TH = ReturnType<typeof import('../theme').useTheme>['theme'];

interface Props {
  label: string;
  value?: string; // base64 existant (déjà signé)
  onChange: (base64: string) => void;
  onClear?: () => void;
  t: TH;
}

export default function SignaturePad({ label, value, onChange, onClear, t }: Props) {
  const ref = useRef<SignatureViewRef>(null);

  // Style injecté dans le webview de la signature
  const webStyle = `
    .m-signature-pad { box-shadow: none; border: none; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--footer { display: none; }
    body { background: transparent; }
    canvas { border-radius: 8px; }
  `;

  const handleOK = (sig: string) => {
    // La lib retourne "data:image/png;base64,..." — on garde le tout pour addImage
    onChange(sig);
  };

  const handleClear = () => {
    ref.current?.clearSignature();
    onClear?.();
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: t.text.muted,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleClear}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}
          >
            <RotateCcw size={13} color={t.text.muted} />
            <Text style={{ fontSize: 11, color: t.text.muted }}>Effacer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => ref.current?.readSignature()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: t.primary,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Check size={13} color="#fff" />
            <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>Valider</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.box, { borderColor: value ? '#22C55E' : t.border, backgroundColor: t.bg.elevated }]}>
        {value ? (
          // Aperçu de la signature déjà capturée
          <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '600' }}>✓ Signature enregistrée</Text>
            <TouchableOpacity onPress={handleClear} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 11, color: t.text.muted }}>Modifier</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SignatureCanvas
            ref={ref}
            onOK={handleOK}
            onEmpty={() => {}}
            descriptionText=""
            clearText=""
            confirmText=""
            webStyle={webStyle}
            autoClear={false}
            style={{ height: 120 }}
            backgroundColor="transparent"
          />
        )}
      </View>
      {!value && (
        <Text style={{ fontSize: 10, color: t.text.muted, textAlign: 'center' }}>
          Dessinez votre signature ci-dessus, puis appuyez sur Valider
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 120,
  },
});
