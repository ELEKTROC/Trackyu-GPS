/**
 * TrackYu Mobile - Auth Reset Handler
 *
 * Module sans dépendances circulaires : permet à client.ts de déclencher
 * une déconnexion forcée ou un modal "session expirée" sans importer authStore
 * (qui importe auth.ts → client.ts).
 */

type ResetFn = () => void;
type RefreshFn = () => Promise<string>;

let _resetHandler: ResetFn | null = null;
let _sessionExpiredHandler: ResetFn | null = null;
let _refreshHandler: RefreshFn | null = null;

/** Enregistre la fonction de reset complet (logout forcé) */
export const setAuthResetHandler = (fn: ResetFn): void => {
  _resetHandler = fn;
};

/** Enregistre la fonction de session expirée (modal re-login) */
export const setSessionExpiredHandler = (fn: ResetFn): void => {
  _sessionExpiredHandler = fn;
};

/**
 * Enregistre la fonction de refresh token silencieux.
 * Appelée par authStore au démarrage pour briser la dépendance circulaire
 * client.ts → auth.ts → client.ts.
 */
export const setRefreshHandler = (fn: RefreshFn): void => {
  _refreshHandler = fn;
};

/** Déconnexion forcée (ex : token invalide côté serveur, changement de compte) */
export const triggerAuthReset = (): void => {
  _resetHandler?.();
};

/**
 * Session expirée (JWT expiré, 401) — affiche le modal de reconnexion
 * sans perdre le contexte de navigation ni l'email de l'utilisateur.
 */
export const triggerSessionExpired = (): void => {
  _sessionExpiredHandler?.();
};

/**
 * Tentative de rafraîchissement silencieux du token JWT.
 * Retourne le nouveau token d'accès, ou rejette si le refresh token
 * est absent, expiré, ou si le backend répond avec une erreur.
 */
export const attemptTokenRefresh = (): Promise<string> => {
  if (!_refreshHandler) return Promise.reject(new Error('refresh_not_registered'));
  return _refreshHandler();
};
