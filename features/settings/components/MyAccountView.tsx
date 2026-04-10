import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useDataContext } from '../../../contexts/DataContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { API_URL, getHeaders } from '../../../services/api/client';
import { 
  User, Mail, Phone, Lock, Globe, Moon, Sun, Camera, Save, Shield, 
  Bell, Smartphone, LogOut, CheckCircle, AlertCircle, Building2, FileText, CreditCard, Users, Briefcase 
} from 'lucide-react';
import { Card } from '../../../components/Card';

interface NotificationPreferences {
    email: boolean;
    push: boolean;
    sms: boolean;
}

export const MyAccountView: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const { updateUser, users, tiers } = useDataContext();
  
  // Determine if user is B2B or B2C based on linked client
  const linkedClient = user?.clientId ? tiers.find(t => t.id === user.clientId && t.type === 'CLIENT') : null;
  const clientType = linkedClient?.clientData?.type || 'B2C'; // Default to B2C if not found
  const isB2B = clientType === 'B2B';
  const { isDarkMode, toggleTheme } = useTheme();
  const { showToast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    language: 'fr',
    // B2C field
    cin: user?.cin || '',
    // B2B fields (stored in linked client/tier data)
    ncc: linkedClient?.resellerData?.ccNumber || '',
    rccm: linkedClient?.resellerData?.rccm || '',
    // Contacts professionnels
    contacts: {
      comptabilite: {
        name: user?.contacts?.comptabilite?.name || '',
        fonction: user?.contacts?.comptabilite?.fonction || '',
        phone: user?.contacts?.comptabilite?.phone || '',
        email: user?.contacts?.comptabilite?.email || ''
      },
      interventions: {
        name: user?.contacts?.interventions?.name || '',
        fonction: user?.contacts?.interventions?.fonction || '',
        phone: user?.contacts?.interventions?.phone || '',
        email: user?.contacts?.interventions?.email || ''
      },
      autre: {
        name: user?.contacts?.autre?.name || '',
        fonction: user?.contacts?.autre?.fonction || '',
        phone: user?.contacts?.autre?.phone || '',
        email: user?.contacts?.autre?.email || ''
      }
    },
    notifications: {
      email: true,
      push: true,
      sms: false
    } as NotificationPreferences,
    // Professional Info (Mirrored - Read only)
    matricule: user?.matricule || '-',
    departement: user?.departement || '-',
    poste: user?.poste || '-',
    typeContrat: user?.typeContrat || '-',
    dateEmbauche: user?.dateEmbauche || '-'
  });

  // Load saved preferences from backend on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch(`${API_URL}/settings/preferences`, {
          headers: getHeaders(),
        });
        if (response.ok) {
          const prefs = await response.json();
          setFormData(prev => ({
            ...prev,
            language: prefs.language || 'fr',
            notifications: {
              email: prefs.notifications?.email ?? true,
              push: prefs.notifications?.push ?? true,
              sms: prefs.notifications?.sms ?? false,
            }
          }));
        }
      } catch {
        // Silently fallback to defaults
      }
    };
    loadPreferences();
  }, []);

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const savePreferences = useCallback(async (prefs: { language?: string; notifications?: NotificationPreferences }) => {
    try {
      await fetch(`${API_URL}/settings/preferences`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(prefs),
      });
    } catch {
      // Non-blocking — preferences are secondary
    }
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Build the full payload with all editable fields
      const profilePayload: Record<string, unknown> = {
        name: formData.name,
        phone: formData.phone,
        cin: formData.cin,
        contacts: formData.contacts,
      };
      // B2B-specific fields
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

      // Save preferences (language + notifications) separately
      await savePreferences({
        language: formData.language,
        notifications: formData.notifications,
      });

      // Update local session & store on success
      // Update local session & store on success
      updateProfile({ 
        name: formData.name, 
        phone: formData.phone,
        cin: formData.cin,
        ncc: formData.ncc,
        rccm: formData.rccm,
        contacts: formData.contacts
      });
      
      if (user?.email) {
        const systemUser = users.find(u => u.email === user.email);
        if (systemUser) {
          updateUser({ 
            ...systemUser, 
            name: formData.name, 
            phone: formData.phone, 
            cin: formData.cin, 
            ncc: formData.ncc,
            rccm: formData.rccm,
            contacts: formData.contacts 
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

  return (
    <div className="space-y-6 p-6 w-full animate-in fade-in duration-500">
      
      {/* Header Profile */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.name}</h1>
            <p className="text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start gap-2">
              <Mail className="w-4 h-4" /> {user?.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <span className="px-3 py-1 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] text-xs font-bold uppercase">
              {user?.role}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
              (user?.status as string) === 'Inactif' || (user?.status as string) === 'inactive'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}>
              <CheckCircle className="w-3 h-3" /> {(user?.status as string) === 'Inactif' || (user?.status as string) === 'inactive' ? 'Inactif' : 'Actif'}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
            <button 
                onClick={logout}
                className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-2 font-medium text-sm"
            >
                <LogOut className="w-4 h-4" /> Déconnexion
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Personal Info & Preferences */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Personal Info Form */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="p-2 bg-[var(--primary-dim)] rounded-lg text-[var(--primary)]">
                        <User className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Informations Personnelles</h3>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Nom Complet</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    title="Nom complet"
                                    placeholder="Votre nom"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="email" 
                                    title="Adresse email"
                                    placeholder="votre@email.com"
                                    value={formData.email}
                                    disabled
                                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="tel" 
                                    title="Numéro de téléphone"
                                    placeholder="+33 6 00 00 00 00"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Langue</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select 
                                    title="Langue de l'interface"
                                    value={formData.language}
                                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all appearance-none"
                                >
                                    <option value="fr">Français</option>
                                    <option value="en">English</option>
                                    <option value="ar">العربية (Arabe)</option>
                                    <option value="es">Español</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* B2C: CNI field */}
                        {!isB2B && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">N° CNI</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        title="Numéro de Carte Nationale d'Identité"
                                        placeholder="CI00000000"
                                        value={formData.cin}
                                        onChange={(e) => setFormData({...formData, cin: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {/* B2B: NCC field */}
                        {isB2B && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">N° Compte Contribuable (NCC)</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        title="Numéro de Compte Contribuable"
                                        placeholder="NCC-000000000"
                                        value={formData.ncc}
                                        onChange={(e) => setFormData({...formData, ncc: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {/* B2B: RCCM field */}
                        {isB2B && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">RCCM</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        title="Registre du Commerce et du Crédit Mobilier"
                                        placeholder="RCCM-CI-ABJ-2024-B-00000"
                                        value={formData.rccm}
                                        onChange={(e) => setFormData({...formData, rccm: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors font-medium flex items-center gap-2 shadow-sm disabled:opacity-70"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                            Enregistrer mon profil
                        </button>
                    </div>
                </form>
            </Card>

            {/* Informations Professionnelles (Mirrored) */}
            <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 opacity-80">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Informations Professionnelles</h3>
                        <p className="text-xs text-slate-500 italic">Lectures seules - Gérées par l'administration</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matricule</label>
                        <p className="font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700/50">{formData.matricule}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Département</label>
                        <p className="font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700/50">{formData.departement}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Poste</label>
                        <p className="font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700/50">{formData.poste}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type de contrat</label>
                        <p className="font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700/50">{formData.typeContrat}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date d'embauche</label>
                        <p className="font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700/50">
                            {formData.dateEmbauche !== '-' ? new Date(formData.dateEmbauche).toLocaleDateString('fr-FR') : '-'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Personnes à contacter */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                        <Users className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Personnes à contacter</h3>
                </div>

                <div className="space-y-6">
                    {/* Contact Comptabilité */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="w-4 h-4 text-[var(--primary)]" />
                            <h4 className="font-semibold text-slate-700 dark:text-slate-200">Pour la Comptabilité</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nom complet</label>
                                <input 
                                    type="text" 
                                    placeholder="Nom complet"
                                    value={formData.contacts.comptabilite.name}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, comptabilite: {...formData.contacts.comptabilite, name: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Fonction</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Comptable"
                                    value={formData.contacts.comptabilite.fonction}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, comptabilite: {...formData.contacts.comptabilite, fonction: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
                                <input 
                                    type="tel" 
                                    placeholder="+225 00 00 00 00"
                                    value={formData.contacts.comptabilite.phone}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, comptabilite: {...formData.contacts.comptabilite, phone: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                                <input 
                                    type="email" 
                                    placeholder="comptabilite@email.com"
                                    value={formData.contacts.comptabilite.email}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, comptabilite: {...formData.contacts.comptabilite, email: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Interventions */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-4">
                            <Briefcase className="w-4 h-4 text-purple-600" />
                            <h4 className="font-semibold text-slate-700 dark:text-slate-200">Pour les Interventions</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nom complet</label>
                                <input 
                                    type="text" 
                                    placeholder="Nom complet"
                                    value={formData.contacts.interventions.name}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, interventions: {...formData.contacts.interventions, name: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Fonction</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Responsable technique"
                                    value={formData.contacts.interventions.fonction}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, interventions: {...formData.contacts.interventions, fonction: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
                                <input 
                                    type="tel" 
                                    placeholder="+225 00 00 00 00"
                                    value={formData.contacts.interventions.phone}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, interventions: {...formData.contacts.interventions, phone: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                                <input 
                                    type="email" 
                                    placeholder="technique@email.com"
                                    value={formData.contacts.interventions.email}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, interventions: {...formData.contacts.interventions, email: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Autre */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-4 h-4 text-slate-600" />
                            <h4 className="font-semibold text-slate-700 dark:text-slate-200">Autre contact</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nom complet</label>
                                <input 
                                    type="text" 
                                    placeholder="Nom complet"
                                    value={formData.contacts.autre.name}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, autre: {...formData.contacts.autre, name: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Fonction</label>
                                <input 
                                    type="text" 
                                    placeholder="Fonction"
                                    value={formData.contacts.autre.fonction}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, autre: {...formData.contacts.autre, fonction: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
                                <input 
                                    type="tel" 
                                    placeholder="+225 00 00 00 00"
                                    value={formData.contacts.autre.phone}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, autre: {...formData.contacts.autre, phone: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                                <input 
                                    type="email" 
                                    placeholder="contact@email.com"
                                    value={formData.contacts.autre.email}
                                    onChange={(e) => setFormData({...formData, contacts: {...formData.contacts, autre: {...formData.contacts.autre, email: e.target.value}}})}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>

        {/* Right Column: Security */}
        <div className="space-y-6">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                        <Shield className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Sécurité</h3>
                </div>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Mot de passe actuel</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="password" 
                                title="Mot de passe actuel"
                                value={passwordData.current}
                                onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nouveau mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="password" 
                                title="Nouveau mot de passe"
                                value={passwordData.new}
                                onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Confirmer le mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="password" 
                                title="Confirmer le mot de passe"
                                value={passwordData.confirm}
                                onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-900/30 mb-4">
                            <div className="flex gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                    Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.
                                </p>
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading || !passwordData.current || !passwordData.new}
                            className="w-full px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors font-medium shadow-sm disabled:opacity-70"
                        >
                            Mettre à jour le mot de passe
                        </button>
                    </div>
                </form>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                        <Shield className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Double Authentification</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Sécurisez votre compte avec la validation en deux étapes (2FA).
                </p>
                <div className="group relative">
                    <button 
                        disabled
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-lg cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2"
                    >
                        Activer la 2FA
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">Bientôt</span>
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Fonctionnalité en cours de développement
                    </div>
                </div>
            </Card>


        </div>
      </div>
    </div>
  );
};
