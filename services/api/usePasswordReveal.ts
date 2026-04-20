import { useCallback, useRef, useState } from 'react';
import { api } from '../apiLazy';

const UNLOCK_WINDOW_MS = 5 * 60 * 1000;

type RevealError = { userId: string; message: string };

/**
 * usePasswordReveal — UI state + re-auth flow pour POST /users/:id/reveal-password.
 *
 * Flow :
 * 1. User clique sur "reveal" d'une ligne → requestReveal(userId).
 * 2. Si aucun unlock actif → showModal passe à true, le composant affiche un modal
 *    qui appelle submitAdminPassword(pwd) → unlock + reveal de la ligne pending.
 * 3. Unlock valide 5 min (fenêtre de re-auth en mémoire) — reveals suivants directs.
 * 4. hide(userId) retire la ligne de revealed. clearAll() réinitialise tout.
 */
export function usePasswordReveal() {
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<RevealError | null>(null);

  // Admin password mémorisé en RAM pendant la fenêtre d'unlock (jamais persisté).
  const adminPasswordRef = useRef<string>('');
  const unlockExpiresAtRef = useRef<number>(0);

  const isUnlockValid = () => !!adminPasswordRef.current && Date.now() < unlockExpiresAtRef.current;

  const clearUnlock = useCallback(() => {
    adminPasswordRef.current = '';
    unlockExpiresAtRef.current = 0;
  }, []);

  const clearAll = useCallback(() => {
    setRevealed({});
    setShowModal(false);
    setPendingUserId(null);
    setError(null);
    clearUnlock();
  }, [clearUnlock]);

  const doReveal = useCallback(async (userId: string, adminPassword: string) => {
    setLoadingId(userId);
    setError(null);
    try {
      const { password } = await api.users.revealPassword(userId, adminPassword);
      setRevealed((prev) => ({ ...prev, [userId]: password }));
      adminPasswordRef.current = adminPassword;
      unlockExpiresAtRef.current = Date.now() + UNLOCK_WINDOW_MS;
      return true;
    } catch (e: any) {
      setError({ userId, message: e?.message || 'Erreur lors de la révélation' });
      return false;
    } finally {
      setLoadingId(null);
    }
  }, []);

  const requestReveal = useCallback(
    async (userId: string) => {
      if (revealed[userId]) return;
      if (isUnlockValid()) {
        await doReveal(userId, adminPasswordRef.current);
        return;
      }
      setPendingUserId(userId);
      setShowModal(true);
    },
    [revealed, doReveal]
  );

  const submitAdminPassword = useCallback(
    async (adminPassword: string) => {
      if (!pendingUserId) return false;
      const ok = await doReveal(pendingUserId, adminPassword);
      if (ok) {
        setShowModal(false);
        setPendingUserId(null);
      }
      return ok;
    },
    [pendingUserId, doReveal]
  );

  const cancelModal = useCallback(() => {
    setShowModal(false);
    setPendingUserId(null);
    setError(null);
  }, []);

  const hide = useCallback((userId: string) => {
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  return {
    revealed,
    showModal,
    pendingUserId,
    loadingId,
    error,
    requestReveal,
    submitAdminPassword,
    cancelModal,
    hide,
    clearAll,
  };
}
