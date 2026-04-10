import React, { useState, useEffect } from 'react';
import { Tier, TierType } from '../../../types';
import { Save, X, Building2, User, Truck, CreditCard, Globe, Shield, MapPin } from 'lucide-react';
import { FormField, FormSection, FormGrid, Input, Select } from '../../../components/form';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useDataContext } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { TierSchema } from '../../../schemas/tierSchema';
import { z } from 'zod';
import { logger } from '../../../utils/logger';

interface TierFormProps {
    isOpen: boolean;
    initialData?: Partial<Tier>;
    initialType?: TierType;
    onSave: (tier: Tier) => void | Promise<void>;
    onClose: () => void;
}

export const TierForm: React.FC<TierFormProps> = ({ isOpen, initialData, initialType = 'CLIENT', onSave, onClose }) => {
    const { showToast } = useToast();
    const { tiers } = useDataContext();
    const { user } = useAuth();
    
    const [formData, setFormData] = useState<Partial<Tier>>({
        type: initialType,
        status: 'ACTIVE',
        country: 'France',
        ...initialData,
        // Charger resellerId depuis le champ direct OU depuis clientData (rétrocompatibilité)
        resellerId: initialData?.resellerId || initialData?.clientData?.resellerId || initialData?.supplierData?.resellerId
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                type: initialType,
                status: 'ACTIVE',
                country: 'France',
                ...initialData,
                // Charger resellerId depuis le champ direct OU depuis clientData (rétrocompatibilité)
                resellerId: initialData?.resellerId || initialData?.clientData?.resellerId || initialData?.supplierData?.resellerId
            });
        }
    }, [isOpen, initialData, initialType]);

    // Determine if we are in a Reseller Context (Impersonation or Reseller Login)
    const isResellerContext = !!user?.resellerId;
    
    // If in Reseller Context, force the resellerId
    useEffect(() => {
        if (isResellerContext && user?.resellerId) {
            setFormData(prev => ({
                ...prev,
                resellerId: user.resellerId,
                clientData: {
                    ...prev.clientData,
                    resellerId: user.resellerId
                }
            }));
        }
    }, [isResellerContext, user?.resellerId]);

    const [isSaving, setIsSaving] = useState(false);
    const handleSubmit = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const dataToValidate = {
                ...formData,
                // Pour les nouveaux tiers, ne pas fournir d'ID — le backend génère
                // CLI-{SLUG}-{N}, REV-{SLUG}-{N} ou SUP-{SLUG}-{N} via get_next_number()
                id: formData.id || undefined,
                tenantId: undefined,
                createdAt: formData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            // Validate with Zod
            const validatedData = TierSchema.parse(dataToValidate);

            // Cast back to Tier type (Zod schema should match Tier interface)
            await onSave(validatedData as unknown as Tier);
            onClose();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.issues;
                if (errors && errors.length > 0) {
                    const firstError = errors[0];
                    showToast(mapError(`${firstError.path.join('.')}: ${firstError.message}`, 'tiers'), 'error');
                } else {
                    showToast(TOAST.VALIDATION.FORM_ERRORS, 'error');
                }
            } else {
                logger.error(error);
                showToast(TOAST.VALIDATION.FORM_ERRORS, 'error');
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                            formData.type === 'CLIENT' ? 'bg-blue-100 text-blue-600' : 
                            formData.type === 'RESELLER' ? 'bg-purple-100 text-purple-600' : 
                            'bg-orange-100 text-orange-600'
                        }`}>
                            {formData.type === 'CLIENT' && <User className="w-6 h-6" />}
                            {formData.type === 'RESELLER' && <Building2 className="w-6 h-6" />}
                            {formData.type === 'SUPPLIER' && <Truck className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {formData.id ? 'Modifier' : 'Nouveau'} {formData.type === 'CLIENT' ? 'Client' : formData.type === 'RESELLER' ? 'Revendeur' : 'Fournisseur'}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {formData.id ? `ID: ${formData.id}` : 'Création d\'un nouveau tiers'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Only Superadmin can change type freely, unless editing existing */}
                        {!formData.id && !isResellerContext && (
                            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                {(['CLIENT', 'RESELLER', 'SUPPLIER'] as TierType[]).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setFormData({...formData, type: t})}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${formData.type === t ? 'bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={onClose} title="Fermer" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="space-y-8">
                        
                        {/* Identity Section */}
                        <FormSection icon={Shield} title="Identité">
                            <FormGrid columns={3}>
                                <FormField label="Nom / Raison Sociale" required>
                                    <Input 
                                        required 
                                        value={formData.name || ''} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        placeholder="Ex: Acme Corp"
                                    />
                                </FormField>
                                
                                {formData.type === 'CLIENT' && (
                                    <FormField label="Type Client">
                                        <Select 
                                            title="Type Client"
                                            value={formData.clientData?.type || 'B2B'} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                clientData: { ...formData.clientData, type: e.target.value as 'B2B' | 'B2C' }
                                            })}
                                        >
                                            <option value="B2B">Entreprise (B2B)</option>
                                            <option value="B2C">Particulier (B2C)</option>
                                        </Select>
                                    </FormField>
                                )}

                                <FormField label="Statut">
                                    <div 
                                        className={`w-full px-3 py-2.5 border rounded-xl text-sm font-medium flex items-center gap-2 ${
                                            formData.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' :
                                            formData.status === 'SUSPENDED' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' :
                                            'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${
                                            formData.status === 'ACTIVE' ? 'bg-emerald-500' :
                                            formData.status === 'SUSPENDED' ? 'bg-amber-500' : 'bg-slate-400'
                                        }`}/>
                                        {formData.status === 'ACTIVE' ? 'Actif' : formData.status === 'INACTIVE' ? 'Inactif' : formData.status === 'SUSPENDED' ? 'Suspendu' : formData.status || 'Actif'}
                                        <span className="ml-auto text-[10px] text-slate-400 italic">Modifier via fiche détail</span>
                                    </div>
                                </FormField>

                                <FormField label="Code Comptable" hint="Généré à la création ou manuellement.">
                                    <div className="flex gap-2">
                                        <Input 
                                            value={formData.accountingCode || ''} 
                                            onChange={e => setFormData({...formData, accountingCode: e.target.value})} 
                                            className="flex-1 font-mono"
                                            placeholder={formData.type === 'CLIENT' ? '411...' : formData.type === 'SUPPLIER' ? '401...' : '...'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const prefix = formData.type === 'CLIENT' ? '411' : formData.type === 'SUPPLIER' ? '401' : '411';
                                                
                                                // Try to extract number from ID if editing
                                                let sequence = '';
                                                if (formData.id) {
                                                    const match = formData.id.match(/\d+/);
                                                    if (match) sequence = match[0];
                                                }
                                                
                                                // Fallback to count + 1 if new or no number in ID
                                                if (!sequence) {
                                                    const count = tiers.filter(t => t.type === formData.type).length + 1;
                                                    sequence = count.toString();
                                                }

                                                // Pad to 3 digits minimum (e.g. 001)
                                                const paddedSequence = sequence.padStart(3, '0');
                                                
                                                setFormData({...formData, accountingCode: `${prefix}${paddedSequence}`});
                                            }}
                                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-bold"
                                            title="Générer un code (411 + N° Séquence)"
                                        >
                                            Générer
                                        </button>
                                    </div>
                                </FormField>
                            </FormGrid>
                        </FormSection>

                        {/* Contact Section */}
                        <FormSection icon={MapPin} title="Contact & Adresse">
                            <FormGrid columns={3}>
                                <FormField label="Email Contact">
                                    <Input 
                                        type="email" 
                                        value={formData.email || ''} 
                                        onChange={e => setFormData({...formData, email: e.target.value})} 
                                        placeholder="contact@example.com"
                                    />
                                </FormField>
                                <FormField label="Téléphone">
                                    <Input 
                                        type="tel" 
                                        value={formData.phone || ''} 
                                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                                        placeholder="+33 6..."
                                    />
                                </FormField>
                                <FormField label="Contact Principal">
                                    <Input 
                                        value={formData.contactName || ''} 
                                        onChange={e => setFormData({...formData, contactName: e.target.value})} 
                                        placeholder="Nom complet"
                                    />
                                </FormField>
                                <FormField label="Contact Secondaire">
                                    <Input 
                                        value={formData.secondContactName || ''} 
                                        onChange={e => setFormData({...formData, secondContactName: e.target.value})} 
                                        placeholder="Nom du contact secondaire"
                                    />
                                </FormField>
                                <div className="md:col-span-3">
                                    <FormField label="Adresse Complète">
                                        <div className="flex gap-2">
                                            <Input 
                                                value={formData.address || ''} 
                                                onChange={e => setFormData({...formData, address: e.target.value})} 
                                                className="flex-1"
                                                placeholder="Rue, Numéro..."
                                            />
                                            <Input 
                                                value={formData.city || ''} 
                                                onChange={e => setFormData({...formData, city: e.target.value})} 
                                                className="w-1/4"
                                                placeholder="Ville"
                                            />
                                            <Input 
                                                value={formData.country || ''} 
                                                onChange={e => setFormData({...formData, country: e.target.value})} 
                                                className="w-1/4"
                                                placeholder="Pays"
                                            />
                                        </div>
                                    </FormField>
                                </div>
                            </FormGrid>
                        </FormSection>

                        {/* SPECIFIC FIELDS BASED ON TYPE */}
                        
                        {/* CLIENT SPECIFIC */}
                        {formData.type === 'CLIENT' && (
                            <FormSection icon={CreditCard} title="Finance & Segmentation" className="animate-in fade-in slide-in-from-bottom-4">
                                <FormGrid columns={3}>
                                    <FormField label="Plan d'abonnement">
                                        <Select 
                                            title="Plan d'abonnement"
                                            value={formData.clientData?.subscriptionPlan || 'Standard'} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                clientData: { ...formData.clientData, subscriptionPlan: e.target.value }
                                            })}
                                        >
                                            <option value="Basic">Basic</option>
                                            <option value="Standard">Standard</option>
                                            <option value="Enterprise">Enterprise</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Devise">
                                        <Select 
                                            title="Devise"
                                            value={formData.clientData?.currency || 'XOF'} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                clientData: { ...formData.clientData, currency: e.target.value }
                                            })}
                                        >
                                            <option value="XOF">XOF (CFA)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="USD">USD ($)</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Conditions de paiement">
                                        <Select 
                                            title="Conditions de paiement"
                                            value={formData.clientData?.paymentTerms || '30 jours'} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                clientData: { ...formData.clientData, paymentTerms: e.target.value }
                                            })}
                                        >
                                            <option value="Comptant">Comptant</option>
                                            <option value="15 jours">15 jours</option>
                                            <option value="30 jours">30 jours</option>
                                            <option value="45 jours">45 jours</option>
                                            <option value="60 jours">60 jours</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Secteur d'activité">
                                        <Input 
                                            value={formData.clientData?.sector || ''} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                clientData: { ...formData.clientData, sector: e.target.value }
                                            })} 
                                            placeholder="Ex: Transport, BTP..."
                                        />
                                    </FormField>
                                    <FormField label="Segment">
                                        <Select 
                                            title="Segment"
                                            value={formData.clientData?.segment || 'Standard'} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                clientData: { ...formData.clientData, segment: e.target.value }
                                            })}
                                        >
                                            <option value="Standard">Standard</option>
                                            <option value="VIP">VIP</option>
                                            <option value="Key Account">Grand Compte</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Langue">
                                        <Select 
                                            title="Langue"
                                            value={formData.clientData?.language || 'Français'} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                clientData: { ...formData.clientData, language: e.target.value }
                                            })}
                                        >
                                            <option value="Français">Français</option>
                                            <option value="Anglais">Anglais</option>
                                        </Select>
                                    </FormField>
                                    
                                    {/* Application GPS */}
                                    <FormField label="Application GPS" hint="Plateforme de suivi GPS actuellement utilisée par ce client.">
                                        <Select
                                            title="Application GPS"
                                            value={formData.application || 'TRACKYU'}
                                            onChange={e => setFormData({ ...formData, application: e.target.value as Tier['application'], applicationDetail: e.target.value !== 'AUTRES' ? undefined : formData.applicationDetail })}
                                        >
                                            <option value="TRACKYU">TrackYu</option>
                                            <option value="GPS51">GPS51</option>
                                            <option value="WHATSGPS">WhatsGPS</option>
                                            <option value="AUTRES">Autres (à préciser)</option>
                                        </Select>
                                    </FormField>

                                    {/* Précision si Autres */}
                                    {formData.application === 'AUTRES' && (
                                        <FormField label="Préciser l'application">
                                            <Input
                                                value={formData.applicationDetail || ''}
                                                onChange={e => setFormData({ ...formData, applicationDetail: e.target.value })}
                                                placeholder="Ex: Frotcom, Webfleet, Trimble..."
                                            />
                                        </FormField>
                                    )}

                                    {/* Reseller Selection - Only visible if NOT in Reseller Context */}
                                    {!isResellerContext && (
                                        <FormField label="Revendeur Associé">
                                            <Select 
                                                title="Revendeur Associé"
                                                value={formData.resellerId || ''} 
                                                onChange={e => setFormData({
                                                    ...formData, 
                                                    resellerId: e.target.value || undefined,
                                                    clientData: { ...formData.clientData, resellerId: e.target.value || undefined }
                                                })}
                                            >
                                                <option value="">-- Aucun (Direct) --</option>
                                                {tiers.filter(t => t.type === 'RESELLER').map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </Select>
                                        </FormField>
                                    )}
                                </FormGrid>
                            </FormSection>
                        )}

                        {/* RESELLER SPECIFIC */}
                        {formData.type === 'RESELLER' && (
                            <FormSection icon={Globe} title="Configuration Revendeur" className="animate-in fade-in slide-in-from-bottom-4">
                                <FormGrid columns={2}>
                                    <FormField label="Domaine (White Label)">
                                        <Input 
                                            value={formData.resellerData?.domain || ''} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                resellerData: { ...formData.resellerData, domain: e.target.value }
                                            })} 
                                            placeholder="ex: tracking.mon-entreprise.com"
                                        />
                                    </FormField>
                                    <FormField label="Logo URL">
                                        <Input 
                                            value={formData.resellerData?.logo || ''} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                resellerData: { ...formData.resellerData, logo: e.target.value }
                                            })} 
                                            placeholder="https://..."
                                        />
                                    </FormField>
                                </FormGrid>
                            </FormSection>
                        )}

                        {/* SUPPLIER SPECIFIC */}
                        {formData.type === 'SUPPLIER' && (
                            <FormSection icon={Truck} title="Configuration Fournisseur" className="animate-in fade-in slide-in-from-bottom-4">
                                <FormGrid columns={2}>
                                    <FormField label="Catégorie">
                                        <Select 
                                            title="Catégorie"
                                            value={formData.supplierData?.category || 'Matériel'} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                supplierData: { ...formData.supplierData, category: e.target.value }
                                            })}
                                        >
                                            <option value="Matériel">Matériel</option>
                                            <option value="Service">Service</option>
                                            <option value="Logiciel">Logiciel</option>
                                            <option value="Autre">Autre</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Site Web">
                                        <Input 
                                            value={formData.supplierData?.website || ''} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                supplierData: { ...formData.supplierData, website: e.target.value }
                                            })} 
                                            placeholder="https://..."
                                        />
                                    </FormField>
                                    <FormField label="Solde Initial">
                                        <Input 
                                            type="number" 
                                            value={formData.supplierData?.balance || 0} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                supplierData: { ...formData.supplierData, balance: parseFloat(e.target.value) }
                                            })} 
                                            placeholder="0"
                                        />
                                    </FormField>
                                    
                                    {/* Revendeur Associé - Fournisseurs */}
                                    {!isResellerContext && (
                                        <FormField label="Revendeur Associé" hint="Associer ce fournisseur à un revendeur spécifique.">
                                            <Select 
                                                title="Revendeur Associé"
                                                value={formData.resellerId || ''} 
                                                onChange={e => setFormData({
                                                    ...formData, 
                                                    resellerId: e.target.value || undefined,
                                                    supplierData: { ...formData.supplierData, resellerId: e.target.value || undefined }
                                                })}
                                            >
                                                <option value="">-- Aucun (Global) --</option>
                                                {tiers.filter(t => t.type === 'RESELLER').map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </Select>
                                        </FormField>
                                    )}
                                </FormGrid>
                            </FormSection>
                        )}

                        {/* Account Creation */}
                        {formData.type === 'CLIENT' && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.createUserAccount !== false}
                                        onChange={e => setFormData({...formData, createUserAccount: e.target.checked})}
                                        className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" 
                                    />
                                    <div>
                                        <span className="block text-sm font-bold text-slate-800 dark:text-white">Créer un compte utilisateur</span>
                                        <span className="block text-xs text-slate-500 dark:text-slate-400">Un compte sera automatiquement créé avec un mot de passe par défaut.</span>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end items-center shrink-0 gap-3">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};
