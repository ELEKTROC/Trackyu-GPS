import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useDataContext } from '../../../contexts/DataContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { API_URL, getHeaders } from '../../../services/api/client';
import { api } from '../../../services/apiLazy';
import { useTenantBranding } from '../../../hooks/useTenantBranding';
import { useCurrency } from '../../../hooks/useCurrency';
import {
  User,
  Mail,
  Phone,
  Lock,
  Globe,
  Save,
  Shield,
  CheckCircle,
  AlertCircle,
  Building2,
  FileText,
  CreditCard,
  Users,
  LogOut,
  MapPin,
  Award,
  Calendar,
  Receipt,
  ChevronDown,
  UserPlus,
  Hash,
  Download,
  Briefcase,
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { useTranslation, SUPPORTED_LANGS, type Lang } from '../../../i18n';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

const BILLING_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMI_ANNUAL: 'Semestriel',
  YEARLY: 'Annuel',
  ANNUAL: 'Annuel',
};

const CONTRACT_ARTICLES: Array<{ title: string; body: (brand: string) => string }> = [
  {
    title: 'Article 1 – Objet du contrat',
    body: (b) =>
      `Le présent contrat a pour objet la fourniture par ${b} d'un service de géolocalisation et de suivi GPS de véhicules au profit du CLIENT, selon les modalités définies aux présentes.`,
  },
  {
    title: 'Article 2 – Durée',
    body: () =>
      "Le contrat prend effet à la date de début indiquée ci-dessus. Sauf résiliation dans les conditions prévues à l'article 5, il est reconduit tacitement pour des périodes identiques sauf mention contraire.",
  },
  {
    title: 'Article 3 – Obligations du Prestataire',
    body: (b) =>
      `${b} s'engage à assurer la disponibilité de la plateforme de géolocalisation, à fournir l'assistance technique nécessaire et à notifier le CLIENT en cas d'interruption planifiée de service.`,
  },
  {
    title: 'Article 4 – Obligations du Client',
    body: () =>
      "Le CLIENT s'engage à utiliser les services conformément aux présentes, à régler les factures dans les délais convenus et à signaler toute anomalie dans les meilleurs délais.",
  },
  {
    title: 'Article 5 – Résiliation',
    body: () =>
      'Chaque partie peut résilier le contrat par lettre recommandée avec accusé de réception en respectant un préavis de 30 jours. En cas de manquement grave non corrigé sous 15 jours après mise en demeure, la résiliation peut être immédiate.',
  },
  {
    title: 'Article 6 – Confidentialité',
    body: () =>
      "Les parties s'engagent à garder confidentielles toutes informations échangées dans le cadre du présent contrat, pendant toute sa durée et 3 ans après son terme.",
  },
  {
    title: 'Article 7 – Loi applicable et litiges',
    body: () =>
      "Le présent contrat est régi par le droit applicable localement. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, les tribunaux compétents du siège social du Prestataire seront seuls compétents.",
  },
];

const computeSeniority = (createdAt?: string | Date | null): string => {
  if (!createdAt) return '—';
  const start = new Date(createdAt);
  if (isNaN(start.getTime())) return '—';
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (months < 1) return "Moins d'un mois";
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} an${years > 1 ? 's' : ''}`;
  return `${years} an${years > 1 ? 's' : ''} et ${remainingMonths} mois`;
};

export const MyAccountView: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const { updateUser, users } = useDataContext();
  const { branding } = useTenantBranding();
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();
  const { lang, setLang, t } = useTranslation();

  const LANG_LABELS: Record<Lang, string> = {
    fr: t('settings.language.fr'),
    en: t('settings.language.en'),
    es: t('settings.language.es'),
  };

  const [linkedClient, setLinkedClient] = useState<any>(null);
  const [userContract, setUserContract] = useState<any>(null);
  const clientType = linkedClient?.clientData?.type || 'B2C';
  const isB2B = clientType === 'B2B';

  useEffect(() => {
    if (!user?.clientId) {
      setLinkedClient(null);
      setUserContract(null);
      return;
    }
    fetch(`${API_URL}/me/account`, { headers: getHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setLinkedClient(data))
      .catch(() => setLinkedClient(null));
    fetch(`${API_URL}/me/contract`, { headers: getHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUserContract(data))
      .catch(() => setUserContract(null));
  }, [user?.clientId]);

  const [contractSubs, setContractSubs] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  useEffect(() => {
    if (!userContract?.id) {
      setContractSubs([]);
      return;
    }
    setSubsLoading(true);
    api.subscriptions
      .list()
      .then((data: any[]) => {
        setContractSubs(
          (data || []).filter((s) => s.contract_id === userContract.id || s.contractId === userContract.id)
        );
      })
      .catch(() => setContractSubs([]))
      .finally(() => setSubsLoading(false));
  }, [userContract?.id]);

  const subsTotal = useMemo(
    () => contractSubs.reduce((sum, s) => sum + parseFloat(s.monthly_fee ?? s.monthlyFee ?? 0), 0),
    [contractSubs]
  );

  const [isLoading, setIsLoading] = useState(false);
  const [openArticles, setOpenArticles] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    language: lang,
    cin: user?.cin || '',
    ncc: linkedClient?.resellerData?.ccNumber || '',
    rccm: linkedClient?.resellerData?.rccm || '',
    adresse: user?.adresse || linkedClient?.address || '',
    ville: user?.ville || linkedClient?.city || '',
    pays: user?.pays || linkedClient?.country || '',
    emailSecondaire: user?.emailSecondaire || '',
    telephoneSecondaire: user?.telephoneSecondaire || '',
    contactUrgenceNom: user?.contactUrgenceNom || '',
    contactUrgenceTel: user?.contactUrgenceTel || '',
    contactUrgenceLien: user?.contactUrgenceLien || '',
    contacts: {
      comptabilite: {
        name: user?.contacts?.comptabilite?.name || '',
        fonction: user?.contacts?.comptabilite?.fonction || '',
        phone: user?.contacts?.comptabilite?.phone || '',
        email: user?.contacts?.comptabilite?.email || '',
      },
      interventions: {
        name: user?.contacts?.interventions?.name || '',
        fonction: user?.contacts?.interventions?.fonction || '',
        phone: user?.contacts?.interventions?.phone || '',
        email: user?.contacts?.interventions?.email || '',
      },
      autre: {
        name: user?.contacts?.autre?.name || '',
        fonction: user?.contacts?.autre?.fonction || '',
        phone: user?.contacts?.autre?.phone || '',
        email: user?.contacts?.autre?.email || '',
      },
    },
    notifications: {
      email: true,
      push: true,
      sms: false,
    } as NotificationPreferences,
  });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch(`${API_URL}/settings/preferences`, { headers: getHeaders() });
        if (response.ok) {
          const prefs = await response.json();
          const persistedLang = (
            prefs.language && SUPPORTED_LANGS.includes(prefs.language) ? prefs.language : lang
          ) as Lang;
          if (persistedLang !== lang) setLang(persistedLang);
          setFormData((prev) => ({
            ...prev,
            language: persistedLang,
            notifications: {
              email: prefs.notifications?.email ?? true,
              push: prefs.notifications?.push ?? true,
              sms: prefs.notifications?.sms ?? false,
            },
          }));
        }
      } catch {
        /* fallback */
      }
    };
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/settings/profile`, { headers: getHeaders() });
        if (!response.ok) return;
        const p = await response.json();
        setFormData((prev) => ({
          ...prev,
          adresse: p.adresse || prev.adresse,
          ville: p.ville || prev.ville,
          pays: p.pays || prev.pays,
          emailSecondaire: p.email_secondaire || prev.emailSecondaire,
          telephoneSecondaire: p.telephone_secondaire || prev.telephoneSecondaire,
          contactUrgenceNom: p.contact_urgence_nom || prev.contactUrgenceNom,
          contactUrgenceTel: p.contact_urgence_tel || prev.contactUrgenceTel,
          contactUrgenceLien: p.contact_urgence_lien || prev.contactUrgenceLien,
        }));
      } catch {
        /* fallback */
      }
    };
    loadPreferences();
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const savePreferences = useCallback(async (prefs: { language?: string; notifications?: NotificationPreferences }) => {
    try {
      await fetch(`${API_URL}/settings/preferences`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(prefs),
      });
    } catch {
      /* non-blocking */
    }
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const profilePayload: Record<string, unknown> = {
        name: formData.name,
        phone: formData.phone,
        cin: formData.cin,
        adresse: formData.adresse,
        ville: formData.ville,
        pays: formData.pays,
        emailSecondaire: formData.emailSecondaire,
        telephoneSecondaire: formData.telephoneSecondaire,
        contactUrgenceNom: formData.contactUrgenceNom,
        contactUrgenceTel: formData.contactUrgenceTel,
        contactUrgenceLien: formData.contactUrgenceLien,
        contacts: formData.contacts,
      };
      if (isB2B) {
        profilePayload.ncc = formData.ncc;
        profilePayload.rccm = formData.rccm;
      }

      const response = await fetch(`${API_URL}/settings/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(profilePayload),
      });
      if (!response.ok) throw new Error(await response.text());

      await savePreferences({ language: formData.language, notifications: formData.notifications });

      updateProfile({
        name: formData.name,
        phone: formData.phone,
        cin: formData.cin,
        ncc: formData.ncc,
        rccm: formData.rccm,
        adresse: formData.adresse,
        ville: formData.ville,
        pays: formData.pays,
        emailSecondaire: formData.emailSecondaire,
        telephoneSecondaire: formData.telephoneSecondaire,
        contactUrgenceNom: formData.contactUrgenceNom,
        contactUrgenceTel: formData.contactUrgenceTel,
        contactUrgenceLien: formData.contactUrgenceLien,
        contacts: formData.contacts,
      });

      if (user?.email) {
        const systemUser = users.find((u) => u.email === user.email);
        if (systemUser) {
          updateUser({
            ...systemUser,
            name: formData.name,
            phone: formData.phone,
            cin: formData.cin,
            ncc: formData.ncc,
            rccm: formData.rccm,
            adresse: formData.adresse,
            ville: formData.ville,
            pays: formData.pays,
            emailSecondaire: formData.emailSecondaire,
            telephoneSecondaire: formData.telephoneSecondaire,
            contactUrgenceNom: formData.contactUrgenceNom,
            contactUrgenceTel: formData.contactUrgenceTel,
            contactUrgenceLien: formData.contactUrgenceLien,
            contacts: formData.contacts,
          });
        }
      }
      showToast(TOAST.AUTH.PROFILE_UPDATED, 'success');
    } catch (err) {
      showToast(mapError(err) || 'Erreur lors de la mise à jour du profil', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      showToast(TOAST.VALIDATION.PASSWORDS_MISMATCH, 'error');
      return;
    }
    if (!PASSWORD_REGEX.test(passwordData.new)) {
      showToast('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.', 'error');
      return;
    }
    if (!passwordData.current) {
      showToast('Le mot de passe actuel est requis.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/settings/password`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ currentPassword: passwordData.current, newPassword: passwordData.new }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors du changement de mot de passe');
      }
      setPasswordData({ current: '', new: '', confirm: '' });
      showToast(TOAST.AUTH.PASSWORD_CHANGED, 'success');
    } catch (err) {
      showToast(mapError(err) || 'Erreur lors du changement de mot de passe', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = !((user?.status as string) === 'Inactif' || (user?.status as string) === 'inactive');

  return (
    <div className="space-y-6 p-6 w-full animate-in fade-in duration-500">
      {/* Hero Header */}
      <div className="bg-[var(--bg-elevated)] rounded-2xl p-6 shadow-sm border border-[var(--border)] flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-2xl font-bold shadow-sm">
          {user?.name?.charAt(0) || 'U'}
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="page-title">{user?.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center md:justify-start text-sm text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </span>
            {user?.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> {user.phone}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] text-[10px] font-bold uppercase tracking-wider">
              {clientType}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                isActive
                  ? 'bg-[var(--clr-success-muted)] text-[var(--clr-success-strong)]'
                  : 'bg-[var(--clr-danger-muted)] text-[var(--clr-danger-strong)]'
              }`}
            >
              <CheckCircle className="w-3 h-3" /> {isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 bg-[var(--clr-danger-dim)] text-[var(--clr-danger)] rounded-lg hover:bg-[var(--clr-danger-muted)] transition-colors flex items-center gap-2 font-medium text-sm"
        >
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Informations personnelles ────────────────────── */}
          <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
              <div className="p-2 bg-[var(--primary-dim)] rounded-lg text-[var(--primary)]">
                <User className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[var(--text-primary)]">Informations personnelles</h3>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* Identité */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="section-title">Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      title="Nom complet"
                      placeholder="Votre nom"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="section-title">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      title="Adresse email"
                      value={formData.email}
                      disabled
                      className="w-full pl-10 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="section-title">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="tel"
                      title="Numéro de téléphone"
                      placeholder="+225 00 00 00 00"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="section-title">{t('common.language')}</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <select
                      title={t('settings.language.title')}
                      value={formData.language}
                      onChange={(e) => {
                        const next = e.target.value as Lang;
                        setFormData({ ...formData, language: next });
                        setLang(next);
                        savePreferences({ language: next });
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all appearance-none"
                    >
                      {SUPPORTED_LANGS.map((code) => (
                        <option key={code} value={code}>
                          {LANG_LABELS[code]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!isB2B && (
                  <div className="space-y-2">
                    <label className="section-title">N° CNI</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        title="Numéro de Carte Nationale d'Identité"
                        placeholder="CI00000000"
                        value={formData.cin}
                        onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {isB2B && (
                  <>
                    <div className="space-y-2">
                      <label className="section-title">N° Compte Contribuable (NCC)</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          title="Numéro de Compte Contribuable"
                          placeholder="NCC-000000000"
                          value={formData.ncc}
                          onChange={(e) => setFormData({ ...formData, ncc: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="section-title">RCCM</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          title="Registre du Commerce"
                          placeholder="RCCM-CI-ABJ-2024-B-00000"
                          value={formData.rccm}
                          onChange={(e) => setFormData({ ...formData, rccm: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Adresse */}
              <div className="pt-4 border-t border-[var(--border)]">
                <p className="section-title flex items-center gap-1.5 mb-3">
                  <MapPin className="w-3.5 h-3.5" /> Adresse
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <label className="section-title">Adresse complète</label>
                    <input
                      type="text"
                      placeholder="Rue, quartier, bâtiment…"
                      value={formData.adresse}
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="section-title">Ville</label>
                    <input
                      type="text"
                      placeholder="Abidjan"
                      value={formData.ville}
                      onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="section-title">Pays</label>
                    <input
                      type="text"
                      placeholder="Côte d'Ivoire"
                      value={formData.pays}
                      onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Contact secondaire (joignabilité alternative du client lui-même) */}
              <div className="pt-4 border-t border-[var(--border)]">
                <p className="section-title flex items-center gap-1.5 mb-3">
                  <Mail className="w-3.5 h-3.5" /> Contact secondaire
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="section-title">Email secondaire</label>
                    <input
                      type="email"
                      placeholder="email.alternatif@exemple.com"
                      value={formData.emailSecondaire}
                      onChange={(e) => setFormData({ ...formData, emailSecondaire: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="section-title">Téléphone secondaire</label>
                    <input
                      type="tel"
                      placeholder="+225 00 00 00 00"
                      value={formData.telephoneSecondaire}
                      onChange={(e) => setFormData({ ...formData, telephoneSecondaire: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Personne à contacter (tierce personne en cas d'urgence) */}
              <div className="pt-4 border-t border-[var(--border)]">
                <p className="section-title flex items-center gap-1.5 mb-3">
                  <UserPlus className="w-3.5 h-3.5" /> Personne à contacter
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="section-title">Nom complet</label>
                    <input
                      type="text"
                      placeholder="Nom du contact"
                      value={formData.contactUrgenceNom}
                      onChange={(e) => setFormData({ ...formData, contactUrgenceNom: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="section-title">Téléphone</label>
                    <input
                      type="tel"
                      placeholder="+225 00 00 00 00"
                      value={formData.contactUrgenceTel}
                      onChange={(e) => setFormData({ ...formData, contactUrgenceTel: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="section-title">Lien / Relation</label>
                    <input
                      type="text"
                      placeholder="Ex: Conjoint, Collègue"
                      value={formData.contactUrgenceLien}
                      onChange={(e) => setFormData({ ...formData, contactUrgenceLien: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors font-medium flex items-center gap-2 shadow-sm disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </div>
            </form>
          </Card>

          {/* ── Mon compte client (CRM read-only) ────────────── */}
          {linkedClient && (
            <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
                <div className="p-2 bg-[var(--primary-dim)] rounded-lg text-[var(--primary)]">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[var(--text-primary)]">Mon compte client</h3>
                  <p className="text-xs text-[var(--text-secondary)] italic">
                    Informations gérées par le service client
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  {
                    icon: Hash,
                    label: 'ID client',
                    value: linkedClient.accountingCode || linkedClient.id?.slice(0, 8).toUpperCase() || '—',
                  },
                  {
                    icon: Award,
                    label: "Plan d'abonnement",
                    value: linkedClient.clientData?.subscriptionPlan || '—',
                  },
                  {
                    icon: Users,
                    label: 'Segment',
                    value: linkedClient.clientData?.segment || '—',
                  },
                  {
                    icon: Receipt,
                    label: 'Conditions de paiement',
                    value: linkedClient.clientData?.paymentTerms || '—',
                  },
                  {
                    icon: Calendar,
                    label: 'Ancienneté',
                    value: computeSeniority(linkedClient.createdAt),
                  },
                  {
                    icon: Building2,
                    label: 'Type de compte',
                    value: clientType,
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border)] flex items-start gap-3"
                  >
                    <div className="p-1.5 bg-[var(--primary-dim)] rounded-md text-[var(--primary)] flex-shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">{label}</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Mon contrat (mirror Document Contrat) ────────── */}
          {userContract && (
            <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--primary-dim)] rounded-lg text-[var(--primary)]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-[var(--text-primary)]">Mon contrat</h3>
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    window.print();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Imprimer / PDF
                </a>
              </div>

              <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                {/* Document header */}
                <div className="bg-[var(--primary)] px-6 py-4 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80 mb-1">
                    {branding?.name || 'TrackYu'}
                  </p>
                  <h4 className="text-base font-bold tracking-tight">CONTRAT DE PRESTATION DE SERVICES</h4>
                  <p className="text-xs opacity-80 mt-0.5">Géolocalisation et Suivi GPS de Véhicules</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] opacity-90">
                    <span>N° {userContract.contractNumber || userContract.id.slice(0, 8).toUpperCase()}</span>
                    <span>Début : {new Date(userContract.startDate).toLocaleDateString('fr-FR')}</span>
                    <span>
                      Fin :{' '}
                      {userContract.endDate
                        ? new Date(userContract.endDate).toLocaleDateString('fr-FR')
                        : 'Indéterminée'}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-5 text-sm text-[var(--text-primary)]">
                  {/* Parties */}
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider mb-2">
                      Entre les soussignés
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-[var(--primary-dim)] rounded-lg border border-[var(--border)]">
                        <p className="text-[10px] font-bold text-[var(--primary)] uppercase mb-1">Le Prestataire</p>
                        <p className="font-bold text-[var(--text-primary)] text-sm">{branding?.name || 'TrackYu'}</p>
                        {branding?.address && (
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{branding.address}</p>
                        )}
                        {branding?.phone && (
                          <p className="text-[11px] text-[var(--text-secondary)]">{branding.phone}</p>
                        )}
                        {branding?.email && (
                          <p className="text-[11px] text-[var(--text-secondary)]">{branding.email}</p>
                        )}
                      </div>
                      <div className="p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Le Client</p>
                        <p className="font-bold text-[var(--text-primary)] text-sm">
                          {linkedClient?.name || user?.name}
                        </p>
                        {linkedClient?.address && (
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{linkedClient.address}</p>
                        )}
                        {linkedClient?.phone && (
                          <p className="text-[11px] text-[var(--text-secondary)]">{linkedClient.phone}</p>
                        )}
                        {linkedClient?.email && (
                          <p className="text-[11px] text-[var(--text-secondary)]">{linkedClient.email}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Abonnements */}
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider mb-2 flex items-center gap-1.5">
                      <Receipt className="w-3 h-3" /> Détail des abonnements
                    </p>
                    {subsLoading ? (
                      <div className="text-center py-4 text-[var(--text-muted)] text-xs">Chargement…</div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                        <table className="w-full text-xs">
                          <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-bold uppercase text-[10px]">Plaque</th>
                              <th className="px-3 py-2 text-left font-bold uppercase text-[10px]">Véhicule</th>
                              <th className="px-3 py-2 text-left font-bold uppercase text-[10px]">Périodicité</th>
                              <th className="px-3 py-2 text-right font-bold uppercase text-[10px]">Tarif</th>
                              <th className="px-3 py-2 text-center font-bold uppercase text-[10px]">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {contractSubs.length > 0 ? (
                              contractSubs.map((s: any) => {
                                const plate = s.vehicle_plate || s.vehiclePlate || '—';
                                const brand = s.vehicle_brand || s.vehicleBrand || '';
                                const model = s.vehicle_model || s.vehicleModel || '';
                                const status = (s.status || '').toUpperCase();
                                return (
                                  <tr key={s.id}>
                                    <td className="px-3 py-2 font-mono font-bold">{plate}</td>
                                    <td className="px-3 py-2 text-[var(--text-secondary)]">
                                      {[brand, model].filter(Boolean).join(' ') || '—'}
                                    </td>
                                    <td className="px-3 py-2">
                                      {BILLING_CYCLE_LABELS[(s.billing_cycle || s.billingCycle || '').toUpperCase()] ||
                                        '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold">
                                      {formatPrice(parseFloat(s.monthly_fee ?? s.monthlyFee ?? 0))}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}
                                      >
                                        {status === 'ACTIVE' ? 'Actif' : status || '—'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-3 py-4 text-center text-[var(--text-secondary)] italic">
                                  Aucun abonnement.
                                </td>
                              </tr>
                            )}
                          </tbody>
                          {contractSubs.length > 0 && (
                            <tfoot>
                              <tr className="bg-[var(--primary-dim)] font-bold">
                                <td colSpan={3} className="px-3 py-2 text-right text-[var(--primary)]">
                                  TOTAL
                                </td>
                                <td className="px-3 py-2 text-right text-[var(--primary)]">{formatPrice(subsTotal)}</td>
                                <td />
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Articles accordion */}
                  <div className="pt-2 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setOpenArticles((v) => !v)}
                      className="w-full flex items-center justify-between py-2 text-left hover:bg-[var(--bg-elevated)] px-2 rounded-lg transition-colors"
                    >
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                        Conditions générales
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${openArticles ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {openArticles && (
                      <div className="space-y-3 mt-2">
                        {CONTRACT_ARTICLES.map((art) => (
                          <div key={art.title}>
                            <p className="font-semibold text-[var(--text-primary)] text-xs mb-1">{art.title}</p>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              {art.body(branding?.name || 'Le Prestataire')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ── Personnes à contacter (B2B only) ─────────────── */}
          {isB2B && (
            <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
                <div className="p-2 bg-[var(--primary-dim)] rounded-lg text-[var(--primary)]">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Personnes à contacter</h3>
              </div>

              <div className="space-y-4">
                {(
                  [
                    { key: 'comptabilite', label: 'Pour la comptabilité', icon: Receipt },
                    { key: 'interventions', label: 'Pour les interventions', icon: Briefcase },
                    { key: 'autre', label: 'Autre contact', icon: User },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <div key={key} className="p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4 text-[var(--primary)]" />
                      <h4 className="font-semibold text-[var(--text-primary)] text-sm">{label}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(['name', 'fonction', 'phone', 'email'] as const).map((field) => {
                        const labels: Record<typeof field, string> = {
                          name: 'Nom complet',
                          fonction: 'Fonction',
                          phone: 'Téléphone',
                          email: 'Email',
                        };
                        const placeholders: Record<typeof field, string> = {
                          name: 'Nom complet',
                          fonction: 'Fonction',
                          phone: '+225 00 00 00 00',
                          email: 'contact@email.com',
                        };
                        const types: Record<typeof field, string> = {
                          name: 'text',
                          fonction: 'text',
                          phone: 'tel',
                          email: 'email',
                        };
                        return (
                          <div key={field} className="space-y-1">
                            <label className="section-title">{labels[field]}</label>
                            <input
                              type={types[field]}
                              placeholder={placeholders[field]}
                              value={formData.contacts[key][field] || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  contacts: {
                                    ...formData.contacts,
                                    [key]: { ...formData.contacts[key], [field]: e.target.value },
                                  },
                                })
                              }
                              className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          {/* ── Sécurité (password + 2FA) ───────────────────── */}
          <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
              <div className="p-2 bg-[var(--primary-dim)] rounded-lg text-[var(--primary)]">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[var(--text-primary)]">Sécurité</h3>
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <label className="section-title">Mot de passe actuel</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    title="Mot de passe actuel"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="section-title">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    title="Nouveau mot de passe"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="section-title">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    title="Confirmer le mot de passe"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="p-3 bg-[var(--primary-dim)] rounded-lg border border-[var(--border)]">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--text-secondary)]">
                    Au moins 8 caractères, une majuscule et un chiffre.
                  </p>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !passwordData.current || !passwordData.new}
                className="w-full px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors font-medium text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Changer le mot de passe
              </button>
            </form>

            {/* 2FA toggle inline */}
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Double authentification
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Validation en deux étapes (2FA)</p>
                </div>
                <span className="text-[10px] font-semibold bg-[var(--bg-surface)] text-[var(--text-muted)] px-2 py-0.5 rounded-full uppercase">
                  Bientôt
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
