/**
 * TrackYu Mobile - Error Types & Normalization
 */

export interface ApiError {
  code: 'NETWORK' | 'TIMEOUT' | 'AUTH' | 'SERVER' | 'NOT_FOUND' | 'UNKNOWN';
  message: string;
  status?: number;
}

/**
 * Normalise n'importe quelle erreur en ApiError typé.
 * Permet de distinguer timeout, réseau, auth et erreurs serveur.
 */
export function normalizeError(error: unknown): ApiError {
  if (!error || typeof error !== 'object') {
    return { code: 'UNKNOWN', message: 'Une erreur inconnue est survenue.' };
  }

  const e = error as Record<string, unknown>;

  // Timeout axios
  if (e.code === 'ECONNABORTED') {
    return { code: 'TIMEOUT', message: 'La requête a expiré. Vérifiez votre connexion.' };
  }

  // Pas de réponse (réseau absent)
  if (!e.response && e.request) {
    return { code: 'NETWORK', message: 'Impossible de joindre le serveur. Vérifiez votre connexion internet.' };
  }

  const response = e.response as Record<string, unknown> | undefined;
  const status = typeof response?.status === 'number' ? response.status : undefined;
  const serverMessage =
    response?.data && typeof response.data === 'object' && 'message' in (response.data as object)
      ? String((response.data as Record<string, unknown>).message)
      : undefined;

  if (status === 401) return { code: 'AUTH', message: 'Session expirée. Veuillez vous reconnecter.', status };
  if (status === 403) return { code: 'AUTH', message: "Accès refusé. Vous n'avez pas les droits nécessaires.", status };
  if (status === 404) return { code: 'NOT_FOUND', message: 'Ressource introuvable.', status };
  if (status && status >= 500)
    // En production : message générique — le détail serveur ne doit pas remonter au client
    return {
      code: 'SERVER',
      message: __DEV__ ? (serverMessage ?? 'Erreur serveur.') : 'Erreur serveur. Réessayez dans quelques instants.',
      status,
    };

  return {
    code: 'UNKNOWN',
    message: __DEV__ ? (serverMessage ?? 'Une erreur est survenue.') : 'Une erreur est survenue.',
    status,
  };
}
