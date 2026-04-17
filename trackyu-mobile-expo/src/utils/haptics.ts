/**
 * Haptic feedback — wraps expo-haptics avec try/catch
 * (certains appareils/simulateurs ne supportent pas les vibrations)
 */
import * as Haptics from 'expo-haptics';

export const haptics = {
  /** Retour léger — navigation, sélection d'élément */
  light: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },

  /** Retour moyen — toggle, confirmation mineure */
  medium: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },

  /** Retour fort — action destructive, immobilisation */
  heavy: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },

  /** Succès — login OK, ticket soumis, action confirmée */
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },

  /** Erreur — login échoué, validation rejetée */
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },

  /** Avertissement — action risquée confirmée */
  warning: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
