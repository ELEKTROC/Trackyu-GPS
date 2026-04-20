import React, { useEffect, useState } from 'react';
import { AlertTriangle, Eye, Loader2, Lock } from 'lucide-react';

type Props = {
  open: boolean;
  onCancel: () => void;
  onSubmit: (adminPassword: string) => Promise<boolean>;
  /** Error message from the last attempt (e.g. "Mot de passe incorrect"). */
  errorMessage?: string | null;
  title?: string;
  description?: string;
};

/**
 * Modal de re-authentification pour révéler un mot de passe utilisateur.
 * Utilisé par SettingsView, StaffPanelV2, MyAccountView.
 */
export function PasswordRevealModal({
  open,
  onCancel,
  onSubmit,
  errorMessage,
  title = 'Confirmer votre identité',
  description = 'Entrez votre mot de passe pour révéler les accès.',
}: Props) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setInput('');
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!input || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(input);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl border border-[var(--border)] w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[var(--primary-dim)] flex items-center justify-center">
            <Lock className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
            <p className="text-xs text-[var(--text-secondary)]">{description}</p>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Votre mot de passe</label>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="••••••••••"
            autoFocus
            className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          {errorMessage && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {errorMessage}
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!input || submitting}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            {submitting ? 'Vérification...' : 'Révéler'}
          </button>
        </div>
      </div>
    </div>
  );
}
