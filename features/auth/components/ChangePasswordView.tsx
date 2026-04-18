import React, { useState } from 'react';
import { Lock, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useTranslation } from '../../../i18n';

const INPUT_CLASS = `
  w-full pl-10 pr-10 py-3 rounded-xl
  focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm
  border border-[var(--border)]
  bg-[var(--bg-elevated)] text-[var(--text-primary)]
  placeholder:text-[var(--text-muted)]
`
  .trim()
  .replace(/\s+/g, ' ');

const ChangePasswordView: React.FC = () => {
  const { changePassword, logout, user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast(t('auth.changePassword.tooShort'), 'error');
      return;
    }
    if (newPassword !== confirm) {
      showToast(t('auth.changePassword.mismatch'), 'error');
      return;
    }
    setLoading(true);
    try {
      await changePassword(null, newPassword);
      showToast(t('auth.changePassword.success'), 'success');
    } catch (err: any) {
      showToast(err.message || t('auth.changePassword.genericError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl p-8 border border-[var(--border)]">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--clr-caution-muted)] flex items-center justify-center mb-4">
              <KeyRound className="w-7 h-7 text-[var(--clr-caution)]" />
            </div>
            <h1 className="page-title">{t('auth.changePassword.title')}</h1>
            <p className="text-sm text-[var(--text-muted)] mt-2 text-center">{t('auth.changePassword.intro')}</p>
            {user?.email && (
              <span className="mt-3 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-3 py-1 rounded-full border border-[var(--border)]">
                {user.email}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nouveau mot de passe */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('auth.changePassword.newPlaceholder')}
                className={INPUT_CLASS}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Confirmation */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t('auth.changePassword.confirmPlaceholder')}
                className={INPUT_CLASS}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Indicateur de correspondance */}
            {confirm.length > 0 && (
              <p className={`text-xs ${newPassword === confirm ? 'text-green-500' : 'text-red-500'}`}>
                {newPassword === confirm ? t('auth.changePassword.match') : t('auth.changePassword.mismatchIndicator')}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || newPassword.length < 8 || newPassword !== confirm}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? t('auth.changePassword.saving') : t('auth.changePassword.submit')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={logout}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {t('auth.changePassword.logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordView;
