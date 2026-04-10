/**
 * Mappe les erreurs HTTP et serveur vers des messages utilisateur lisibles.
 * 
 * Usage :
 *   import { mapError } from '../utils/errorMapper';
 *   showToast(mapError(error), 'error');
 *   showToast(mapError(error, 'devis'), 'error');
 */

interface ApiErrorBody {
  error?: string;
  message?: string;
  errors?: Record<string, string[]>;
  code?: string;
}

/**
 * Extraire le message d'erreur depuis différentes formes d'erreur.
 * Gère : Error, string, Response fetch, objet API backend, etc.
 */
export function mapError(error: unknown, entityLabel?: string): string {
  // 1. Null/undefined
  if (!error) {
    return entityLabel 
      ? `Erreur lors de l'opération sur ${entityLabel}`
      : 'Une erreur inattendue est survenue';
  }

  // 2. String brute
  if (typeof error === 'string') {
    return cleanErrorMessage(error, entityLabel);
  }

  // 3. Error standard JS
  if (error instanceof Error) {
    const msg = error.message;
    
    // Network errors
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('ERR_NETWORK')) {
      return 'Erreur de connexion au serveur. Vérifiez votre réseau.';
    }
    if (msg.includes('timeout') || msg.includes('TIMEOUT')) {
      return 'La requête a expiré. Veuillez réessayer.';
    }
    if (msg.includes('AbortError')) {
      return 'La requête a été annulée.';
    }

    return cleanErrorMessage(msg, entityLabel);
  }

  // 4. Objet avec propriétés d'erreur (réponse API parsée)
  if (typeof error === 'object' && error !== null) {
    const errObj = error as ApiErrorBody;
    
    // Backend renvoie { error: "..." }
    if (errObj.error) {
      return cleanErrorMessage(errObj.error, entityLabel);
    }
    // Backend renvoie { message: "..." }
    if (errObj.message) {
      return cleanErrorMessage(errObj.message, entityLabel);
    }
    // Backend renvoie { errors: { field: ["..."] } } (Zod)
    if (errObj.errors) {
      const firstField = Object.keys(errObj.errors)[0];
      const firstMsg = errObj.errors[firstField]?.[0];
      if (firstMsg) {
        return `${firstField} : ${firstMsg}`;
      }
    }
  }

  // 5. Fallback
  return entityLabel 
    ? `Erreur lors de l'opération sur ${entityLabel}`
    : 'Une erreur inattendue est survenue';
}

/**
 * Mappe un code de statut HTTP vers un message français.
 */
export function mapHttpStatus(status: number, entityLabel?: string): string {
  const entity = entityLabel ? ` (${entityLabel})` : '';
  
  switch (status) {
    case 400: return `Données invalides${entity}. Vérifiez votre saisie.`;
    case 401: return 'Session expirée. Veuillez vous reconnecter.';
    case 403: return 'Vous n\'avez pas les permissions nécessaires.';
    case 404: return `Élément introuvable${entity}.`;
    case 409: return `Cet élément existe déjà${entity}.`;
    case 413: return 'Le fichier est trop volumineux.';
    case 422: return `Données non traitables${entity}. Vérifiez les champs.`;
    case 429: return 'Trop de requêtes. Veuillez patienter un instant.';
    case 500: return 'Erreur interne du serveur. Contactez le support si le problème persiste.';
    case 502: return 'Le serveur ne répond pas. Réessayez dans un instant.';
    case 503: return 'Service temporairement indisponible. Réessayez plus tard.';
    default:
      if (status >= 400 && status < 500) return `Erreur client${entity} (${status}).`;
      if (status >= 500) return `Erreur serveur${entity} (${status}).`;
      return `Erreur inattendue${entity} (${status}).`;
  }
}

/**
 * Nettoie un message d'erreur pour l'affichage utilisateur.
 * - Remplace les messages anglais courants par du français
 * - Tronque les messages trop longs
 * - Supprime les détails techniques
 */
function cleanErrorMessage(msg: string, entityLabel?: string): string {
  // Messages anglais courants du backend/fetch
  const translations: Record<string, string> = {
    'Failed to fetch': 'Erreur de connexion au serveur',
    'Network request failed': 'Erreur de connexion réseau',
    'Internal Server Error': 'Erreur interne du serveur',
    'Unauthorized': 'Session expirée, veuillez vous reconnecter',
    'Forbidden': 'Accès non autorisé',
    'Not Found': 'Élément introuvable',
    'Bad Request': 'Données invalides',
    'Conflict': 'Cet élément existe déjà',
    'Too Many Requests': 'Trop de requêtes, veuillez patienter',
    'Service Unavailable': 'Service temporairement indisponible',
  };

  // Correspondance exacte
  if (translations[msg]) {
    return translations[msg];
  }

  // Correspondance partielle
  for (const [en, fr] of Object.entries(translations)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) {
      return fr;
    }
  }

  // Si le message commence par "Failed to" ou "Error:", le rendre plus lisible  
  if (msg.startsWith('Failed to create') || msg.startsWith('Failed to update') || msg.startsWith('Failed to delete')) {
    return entityLabel 
      ? `Erreur lors de l'opération sur ${entityLabel}`
      : 'L\'opération a échoué. Veuillez réessayer.';
  }

  // Tronquer les messages trop longs (> 120 caractères)
  if (msg.length > 120) {
    return msg.substring(0, 117) + '...';
  }

  return msg;
}

/**
 * Extraire un message d'erreur depuis une réponse fetch.
 * Tente de parser le body JSON, sinon utilise le status.
 */
export async function mapFetchError(response: Response, entityLabel?: string): Promise<string> {
  try {
    const body = await response.json();
    if (body.error || body.message) {
      return mapError(body, entityLabel);
    }
  } catch {
    // Body non parsable, on utilise le status
  }
  return mapHttpStatus(response.status, entityLabel);
}
