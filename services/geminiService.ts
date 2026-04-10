import type { Vehicle } from "../types";
import { API_BASE_URL } from "../utils/apiConfig";
import { logger } from '../utils/logger';

/**
 * Service IA — Appelle désormais le backend (clé API protégée côté serveur)
 * Les appels passent par POST /api/ai/ask et POST /api/ai/analyze-report
 */

const getHeaders = () => {
  const token = localStorage.getItem('fleet_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const generateFleetReport = async (vehicles: Vehicle[]): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        query: `Analysez les données de la flotte et fournissez un résumé exécutif concis. Concentrez-vous sur l'efficacité énergétique, les avertissements de sécurité (vitesse élevée ou carburant bas) et l'efficacité opérationnelle. Utilisez le formatage markdown avec des en-têtes.`
      })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return err.error || "Échec de la génération du rapport.";
    }
    
    const data = await response.json();
    return data.response || "Aucun rapport généré.";
  } catch (error) {
    logger.error("Erreur lors de la génération du rapport:", error);
    return "Échec de la génération du rapport en raison d'une erreur de connexion.";
  }
};

export const askFleetAssistant = async (query: string, _vehicles?: Vehicle[]): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return err.error || "Désolé, une erreur est survenue.";
    }

    const data = await response.json();
    return data.response || "Je n'ai pas compris cela.";
  } catch (error) {
    logger.error("Erreur dans l'assistant de flotte:", error);
    return "Désolé, j'ai du mal à me connecter au système central pour le moment.";
  }
};

/**
 * Streaming SSE : appelle /api/ai/ask?stream=true et retourne un ReadableStream
 * Le callback onChunk est appelé à chaque morceau de texte reçu
 */
export const askFleetAssistantStream = async (
  query: string,
  onChunk: (text: string) => void,
  conversationId?: string
): Promise<{ fullText: string; conversationId?: string }> => {
  const response = await fetch(`${API_BASE_URL}/ai/ask?stream=true`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ query, conversationId })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Erreur lors de la requête IA");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Streaming non supporté par le navigateur");

  const decoder = new TextDecoder();
  let fullText = '';
  let convId = conversationId;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split('\n');

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        if (parsed.done) {
          convId = parsed.conversationId || convId;
        } else if (parsed.chunk) {
          fullText += parsed.chunk;
          onChunk(fullText);
        }
      } catch {
        // Ignore malformed SSE lines
      }
    }
  }

  return { fullText, conversationId: convId };
};

/**
 * Récupérer l'historique des conversations IA
 */
export const getAIConversations = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/conversations`, { headers: getHeaders() });
    if (!response.ok) return [];
    return await response.json();
  } catch { return []; }
};

/**
 * Récupérer les messages d'une conversation
 */
export const getAIConversationMessages = async (conversationId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/conversations/${conversationId}/messages`, { headers: getHeaders() });
    if (!response.ok) return [];
    return await response.json();
  } catch { return []; }
};

/**
 * Supprimer une conversation IA
 */
export const deleteAIConversation = async (conversationId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/conversations/${conversationId}`, {
      method: 'DELETE', headers: getHeaders()
    });
    return response.ok;
  } catch { return false; }
};

export const analyzeReport = async (reportType: string, columns: string[], data: string[][]): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/analyze-report`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reportType, columns, data })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return err.error || "L'analyse n'a rien donné.";
    }

    const result = await response.json();
    return result.analysis || "L'analyse n'a rien donné.";
  } catch (error) {
    logger.error("Erreur analyse rapport:", error);
    return "Une erreur est survenue lors de l'analyse intelligente des données.";
  }
};