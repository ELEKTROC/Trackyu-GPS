import React, { useState, useEffect } from 'react';
import { Activity, Lock, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface TokenData {
  email: string;
  name: string;
  companyName: string;
  tenantName: string;
}

type PageState = 'loading' | 'form' | 'success' | 'error';

export const ActivationPage: React.FC = () => {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Extract token from URL
  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    if (!token) {
      setErrorMessage("Aucun token d'activation trouvé dans l'URL.");
      setPageState('error');
      return;
    }
    validateToken(token);
  }, [token]);

  const validateToken = async (tkn: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/validate-activation-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tkn }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Token invalide ou expiré');
      }

      const data: TokenData = await response.json();
      setTokenData(data);
      setPageState('form');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Impossible de valider le token');
      setPageState('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/auth/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Erreur lors de l'activation");
      }

      setPageState('success');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'activation du compte");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = () => {
    // Remove token from URL and reload to show login
    window.history.replaceState({}, '', window.location.pathname);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative p-12 text-white flex-col justify-between overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #E8771A 0%, #C85F0E 50%, #8B3A00 100%)' }}
      >
        <div className="relative z-10 flex flex-col h-full justify-center">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/15 backdrop-blur rounded-xl">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tight">TrackYU GPS</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">Activation de votre compte</h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Votre demande d'inscription a été approuvée. Définissez votre mot de passe pour accéder à la plateforme.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-lg border border-white/10">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">Compte vérifié</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-lg border border-white/10">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">Prêt à utiliser</span>
            </div>
          </div>
        </div>
        {/* Decorative shapes */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white rounded-full blur-3xl opacity-10"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-white rounded-full blur-3xl opacity-10"></div>
      </div>

      {/* Right panel — form */}
      <div
        className="w-full lg:w-1/2 h-screen overflow-y-auto flex flex-col p-8 animate-in slide-in-from-right-10 fade-in duration-500"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="w-full max-w-md space-y-8 m-auto">
          {/* Mobile header */}
          <div className="text-center lg:text-left">
            <div
              className="inline-flex lg:hidden items-center gap-2 mb-4 p-2 rounded-lg"
              style={{ backgroundColor: 'var(--primary-dim)' }}
            >
              <Activity className="w-6 h-6" style={{ color: 'var(--primary)' }} />
              <span className="font-bold text-[var(--text-primary)]">TrackYU GPS</span>
            </div>

            {/* Loading state */}
            {pageState === 'loading' && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--primary)' }} />
                <p className="text-[var(--text-secondary)] text-lg">Vérification du lien d'activation...</p>
              </div>
            )}

            {/* Error state */}
            {pageState === 'error' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center py-8 space-y-4">
                  <div className="p-4 bg-red-100 rounded-full">
                    <AlertCircle className="w-12 h-12 text-red-600" />
                  </div>
                  <h2 className="page-title">Lien invalide</h2>
                  <p className="text-[var(--text-secondary)] text-center max-w-sm">{errorMessage}</p>
                </div>
                <button
                  onClick={goToLogin}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-white rounded-xl font-medium transition-colors"
                  style={{ backgroundColor: 'var(--primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
                >
                  Retour à la connexion
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Success state */}
            {pageState === 'success' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center py-8 space-y-4">
                  <div className="p-4 bg-green-100 rounded-full">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="page-title">Compte activé !</h2>
                  <p className="text-[var(--text-secondary)] text-center max-w-sm">
                    Votre compte a été activé avec succès. Vous pouvez maintenant vous connecter avec votre email et le
                    mot de passe que vous venez de définir.
                  </p>
                </div>
                <button
                  onClick={goToLogin}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-white rounded-xl font-medium transition-colors"
                  style={{ backgroundColor: 'var(--primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
                >
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Form state */}
            {pageState === 'form' && tokenData && (
              <>
                <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Activez votre compte</h2>
                <p className="text-[var(--text-secondary)] mt-2">
                  Bienvenue <span className="font-medium text-[var(--text-primary)]">{tokenData.name}</span> !
                  Définissez votre mot de passe pour accéder à{' '}
                  <span className="font-medium" style={{ color: 'var(--primary)' }}>
                    {tokenData.tenantName}
                  </span>
                  .
                </p>

                {/* Account info card */}
                <div
                  className="mt-6 p-4 rounded-xl space-y-2"
                  style={{ backgroundColor: 'var(--primary-dim)', border: '1px solid var(--primary)' }}
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Email</span>
                    <span className="font-medium text-[var(--text-primary)]">{tokenData.email}</span>
                  </div>
                  {tokenData.companyName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Entreprise</span>
                      <span className="font-medium text-[var(--text-primary)]">{tokenData.companyName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Plateforme</span>
                    <span className="font-medium text-[var(--text-primary)]">{tokenData.tenantName}</span>
                  </div>
                </div>

                {/* Password form */}
                <form onSubmit={handleSubmit} className="space-y-5 mt-6">
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-red-700">{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Mot de passe</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all shadow-sm text-[var(--text-primary)] placeholder-slate-400 dark:placeholder-slate-500"
                        placeholder="Minimum 8 caractères"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all shadow-sm text-[var(--text-primary)] placeholder-slate-400 dark:placeholder-slate-500"
                        placeholder="Retapez votre mot de passe"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Password strength hints */}
                  <div className="space-y-1">
                    <div
                      className={`flex items-center gap-2 text-xs ${password.length >= 8 ? 'text-green-600' : 'text-[var(--text-muted)]'}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Au moins 8 caractères</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 text-xs ${password && password === confirmPassword ? 'text-green-600' : 'text-[var(--text-muted)]'}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Les mots de passe correspondent</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || password.length < 8 || password !== confirmPassword}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 text-white rounded-xl font-semibold focus:ring-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--shadow-md)]"
                    style={
                      {
                        backgroundColor: 'var(--primary)',
                        '--tw-ring-color': 'var(--primary-dim)',
                      } as React.CSSProperties
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Activation en cours...
                      </>
                    ) : (
                      <>
                        Activer mon compte
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
