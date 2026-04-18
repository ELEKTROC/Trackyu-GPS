import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Activity,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle,
  User,
  Phone,
  X,
  Send,
  MessageSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { logger } from '../../../utils/logger';
import { useTranslation } from '../../../i18n';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Classe réutilisable pour les inputs du login (fond sombre sur la gauche, fond clair à droite selon thème)
const INPUT_CLASS = `
  w-full pl-10 pr-4 py-3 rounded-xl
  focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm
  border border-[var(--border)]
  bg-[var(--bg-elevated)] text-[var(--text-primary)]
  placeholder:text-[var(--text-muted)]
`
  .trim()
  .replace(/\s+/g, ' ');

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showDemoRequest, setShowDemoRequest] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoMessage, setDemoMessage] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Handle registration
  const handleRegister = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email,
          password,
          phone: contact,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || t('auth.errors.registrationFallback', { status: response.status }));
      }

      setIsRegistering(false);
      setSuccessMessage(t('auth.success.registration'));
      setFullName('');
      setContact('');
      setPassword('');
      showToast(TOAST.AUTH.REGISTRATION_SENT, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.errors.registrationGeneric');
      showToast(message, 'error');
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || t('auth.errors.requestFallback'));
      }

      showToast(TOAST.AUTH.RESET_EMAIL_SENT, 'success');
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (err: unknown) {
      showToast(mapError(err, 'demande'), 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle demo request
  const handleDemoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/demo-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: demoName,
          email: demoEmail,
          message: demoMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || t('auth.errors.requestFallback'));
      }

      showToast(TOAST.AUTH.DEMO_REQUEST_SENT, 'success');
      setShowDemoRequest(false);
      setDemoName('');
      setDemoEmail('');
      setDemoMessage('');
    } catch (err: unknown) {
      showToast(mapError(err, 'demande'), 'error');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      if (isRegistering) {
        await handleRegister();
        setIsLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email.trim());
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      await login(email.trim(), password.trim());
    } catch (err: unknown) {
      logger.error('Login error details:', err);
      const message = err instanceof Error ? err.message : t('auth.errors.generic');
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      {/* Partie Gauche - Visuel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-40">
          <img
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            alt="Logistics"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 p-12 text-white max-w-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl shadow-xl shadow-blue-900/50" style={{ backgroundColor: 'var(--primary)' }}>
              <Activity className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tight">TrackYU GPS</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">{t('auth.hero.title')}</h1>
          <p className="text-lg text-[var(--text-muted)] mb-8 leading-relaxed">{t('auth.hero.subtitle')}</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-lg border border-white/10">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">{t('auth.hero.feature1')}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-lg border border-white/10">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">{t('auth.hero.feature2')}</span>
            </div>
          </div>
        </div>
        <div
          className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: 'var(--primary)' }}
        />
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600 rounded-full blur-3xl opacity-20" />
      </div>

      {/* Partie Droite - Formulaire */}
      <div className="w-full lg:w-1/2 h-screen overflow-y-auto flex flex-col p-8 animate-in slide-in-from-right-10 fade-in duration-500 bg-[var(--bg-primary)]">
        <div className="w-full max-w-md space-y-8 m-auto">
          <div className="text-center lg:text-left">
            <div className="inline-flex lg:hidden items-center gap-2 mb-4 p-2 rounded-lg bg-[var(--primary-dim)]">
              <Activity className="w-6 h-6" style={{ color: 'var(--primary)' }} />
              <span className="font-bold text-[var(--text-primary)]">TrackYU GPS</span>
            </div>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {isRegistering ? t('auth.form.registerTitle') : t('auth.form.welcomeTitle')}
            </h2>
            <p className="text-[var(--text-muted)] mt-2">
              {isRegistering ? t('auth.form.registerSubtitle') : t('auth.form.welcomeSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div className="space-y-4">
              {isRegistering && (
                <>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={INPUT_CLASS}
                      style={{ focusRingColor: 'var(--primary)' } as React.CSSProperties}
                      placeholder={t('auth.form.fullNamePlaceholder')}
                    />
                  </div>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                      type="tel"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder={t('auth.form.phonePlaceholder')}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  {t('auth.form.accountLabel')}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder={t('auth.form.accountPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  {t('auth.form.passwordLabel')}
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${INPUT_CLASS} pr-12`}
                    placeholder={t('auth.form.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div
                className="p-3 rounded-lg border text-sm flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  borderColor: 'rgba(239,68,68,0.3)',
                  color: 'var(--color-error)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
                {error}
              </div>
            )}

            {successMessage && (
              <div
                className="p-3 rounded-lg border text-sm flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(16,185,129,0.08)',
                  borderColor: 'rgba(16,185,129,0.3)',
                  color: 'var(--color-success)',
                }}
              >
                <CheckCircle className="w-4 h-4" />
                {successMessage}
              </div>
            )}

            {!isRegistering && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] accent-[var(--primary)]"
                  />
                  <span className="text-[var(--text-secondary)]">{t('auth.form.rememberMe')}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="font-medium hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  {t('auth.form.forgotPassword')}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white py-3 rounded-xl font-bold text-sm focus:ring-4 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isRegistering ? t('auth.form.submitRegister') : t('auth.form.submitLogin')}{' '}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center mt-4 space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                {isRegistering ? t('auth.form.haveAccount') : t('auth.form.noAccount')}
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="ml-1 font-medium hover:underline focus:outline-none"
                  style={{ color: 'var(--primary)' }}
                >
                  {isRegistering ? t('auth.form.switchToLogin') : t('auth.form.switchToRegister')}
                </button>
              </p>
              {!isRegistering && (
                <p className="text-sm text-[var(--text-muted)]">
                  {t('auth.form.demoQuestion')}
                  <button
                    type="button"
                    onClick={() => setShowDemoRequest(true)}
                    className="ml-1 text-emerald-500 font-medium hover:underline focus:outline-none"
                  >
                    {t('auth.form.demoCta')}
                  </button>
                </p>
              )}
            </div>

            {/* Boutons téléchargement apps mobiles */}
            {!isRegistering && (
              <div className="mt-8 pt-6 border-t border-[var(--border)]">
                <p className="text-center text-sm text-[var(--text-muted)] mb-4">{t('auth.form.downloadMobile')}</p>
                <div className="flex items-center justify-center gap-3">
                  <a href="/download.html" className="transition-transform hover:scale-105 active:scale-95">
                    <img src="/images/google-play-badge.svg" alt={t('auth.form.googlePlayAlt')} className="h-10" />
                  </a>
                  <a href="/download.html" className="transition-transform hover:scale-105 active:scale-95">
                    <img src="/images/app-store-badge.svg" alt={t('auth.form.appStoreAlt')} className="h-10" />
                  </a>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ── Modal Demande de démo ───────────────────────────────────── */}
      {showDemoRequest && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('auth.demo.title')}</h3>
              <button
                onClick={() => setShowDemoRequest(false)}
                className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                title={t('auth.common.close')}
                aria-label={t('auth.common.close')}
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4">{t('auth.demo.intro')}</p>

            <form onSubmit={handleDemoRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  {t('auth.demo.nameLabel')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    required
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder={t('auth.demo.namePlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  {t('auth.demo.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    required
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder={t('auth.demo.emailPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  {t('auth.demo.messageLabel')}
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-[var(--text-muted)]" />
                  <textarea
                    required
                    value={demoMessage}
                    onChange={(e) => setDemoMessage(e.target.value)}
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-[var(--primary)] resize-none transition-all"
                    placeholder={t('auth.demo.messagePlaceholder')}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDemoRequest(false)}
                  className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  {t('auth.common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={demoLoading}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {demoLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t('auth.common.send')}
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="text-xs text-[var(--text-muted)] mt-4 text-center">{t('auth.demo.footer')}</p>
          </div>
        </div>
      )}

      {/* ── Modal Mot de passe oublié ───────────────────────────────── */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('auth.forgot.title')}</h3>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                title={t('auth.common.close')}
                aria-label={t('auth.common.close')}
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4">{t('auth.forgot.intro')}</p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={t('auth.forgot.emailPlaceholder')}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  {t('auth.common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {forgotLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t('auth.common.send')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
