import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Invoice, Quote, Client, Vehicle, Tier, Tenant } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { InvoiceSchema, QuoteSchema } from '../../../schemas/financeSchema';
import { z } from 'zod';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, X, Calculator, Check, Lock } from 'lucide-react';
import { useCurrency } from '../../../hooks/useCurrency';
import type { NumberingModule } from '../../../services/numberingService';
import { usePreviewNumber, useGetNextNumber, useOrgTaxRate } from '../../../services/numberingService';
import { PAYMENT_TERMS } from '../constants';
import { FormField, Input, Select, Textarea, FormSection, FormGrid } from '../../../components/form';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  price: number;
}

interface CatalogItem {
  id: string;
  tenantId?: string;
  name: string;
  price: number;
  taxRate?: number;
  description?: string;
}

interface InvoiceFormState
  extends Omit<Partial<Invoice>, 'status' | 'category'>, Omit<Partial<Quote>, 'status' | 'category'> {
  items?: InvoiceLineItem[];
  resellerId?: string;
  resellerName?: string;
  _resellerAuto?: boolean;
  discount?: number;
  dueDate?: any;
  date?: any;
  createdAt?: any;
  installationDate?: any;
  validUntil?: any;
  invoiceType?: string;
  status?: any;
  category?: any;
}

interface InvoiceFormProps {
  initialData: Partial<Invoice | Quote>;
  clients: Client[];
  tiers?: Tier[];
  tenants?: Tenant[]; // Liste des revendeurs (tenants)
  vehicles?: Vehicle[];
  catalogItems?: CatalogItem[];
  onSave: (item: z.infer<typeof InvoiceSchema> | z.infer<typeof QuoteSchema>) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  mode: 'INVOICES' | 'QUOTES';
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData,
  clients,
  tiers: rawTiers = [],
  tenants: rawTenants = [],
  vehicles = [],
  catalogItems = [],
  onSave,
  onCancel,
  onDirtyChange,
  mode,
}) => {
  // Ensure tiers and tenants are always arrays (API may return objects)
  const tiers = Array.isArray(rawTiers) ? rawTiers : [];
  const sourceTenants = Array.isArray(rawTenants) ? rawTenants : [];
  const tenants = useMemo(() => {
    const list = [...sourceTenants];
    if (!list.some((t) => t.id === 'tenant_trackyu')) {
      list.push({ id: 'tenant_trackyu', name: 'TrackYu System', slug: 'trackyu' } as unknown as Tenant);
    }
    return list;
  }, [sourceTenants]);
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();
  const orgTaxRate = useOrgTaxRate();

  // Déterminer si c'est une nouvelle facture
  const isNew = !initialData?.id;

  // Si édition d'une facture existante sans items mais avec un montant, créer un item par défaut
  const getInitialItems = (): InvoiceLineItem[] => {
    const rawItems = initialData.items || [];
    // Normaliser les items (snake_case → camelCase depuis certaines réponses API)
    const items: InvoiceLineItem[] = rawItems.map((item: any) => ({
      description: item.description || '',
      quantity: Number(item.quantity) || 1,
      price: Number(item.price ?? item.unit_price ?? 0),
    }));
    if (items.length === 0 && !isNew && (initialData as any).amount > 0) {
      // Facture importée avec montant mais sans lignes détaillées — utiliser amountHT pour éviter TVA en double
      const amountHT = (initialData as any).amountHT || (initialData as any).amount;
      return [{ description: initialData.subject || 'Prestation', quantity: 1, price: amountHT }];
    }
    return items;
  };

  // Ensure items is always an array et statut par défaut "DRAFT" pour nouvelle facture
  const today = new Date().toISOString().split('T')[0];
  const [formState, _setFS] = useState<InvoiceFormState>({
    ...initialData,
    items: getInitialItems(),
    vatRate: (initialData as any).vatRate ?? (isNew ? orgTaxRate : 0),
    status: initialData.status || 'DRAFT',
    category: (initialData as any).category || 'STANDARD',
    // Date par défaut = aujourd'hui pour les nouveaux documents
    date: isNew ? (initialData as any).date || today : (initialData as any).date,
    createdAt: isNew ? (initialData as any).createdAt || today : (initialData as any).createdAt,
  });
  // Wrapper: marks form dirty on every user-triggered state change
  const setFormState = (updater: InvoiceFormState | ((prev: InvoiceFormState) => InvoiceFormState)) => {
    _setFS(updater);
    onDirtyChange?.(true);
  };

  // Multi-select dropdown for plates
  const [isPlateDropdownOpen, setIsPlateDropdownOpen] = useState(false);
  const plateDropdownRef = useRef<HTMLDivElement>(null);
  const [plateSearchTerm, setPlateSearchTerm] = useState('');

  // Catalog dropdown state per item index
  const [openCatalogIndex, setOpenCatalogIndex] = useState<number | null>(null);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const catalogDropdownRef = useRef<HTMLDivElement>(null);

  // Numérotation automatique - prévisualisation du prochain numéro (tenant-aware)
  const numberingModule: NumberingModule = mode === 'QUOTES' ? 'quote' : 'invoice';
  const { data: previewNumber, isLoading: isLoadingNumber } = usePreviewNumber(
    numberingModule,
    isNew,
    formState.resellerId || undefined
  );
  const getNextNumber = useGetNextNumber();

  // Labels pour les types d'opération (pour générer l'objet)
  const CATEGORY_LABELS: Record<string, string> = {
    STANDARD: 'Standard',
    INSTALLATION: 'Installation',
    ABONNEMENT: 'Abonnement',
    AUTRES_VENTES: 'Autres Ventes',
  };

  // Générer l'objet automatiquement basé sur type d'opération et plaque
  const generateSubject = (category: string, licensePlate?: string): string => {
    const categoryLabel = CATEGORY_LABELS[category] || 'Standard';
    const plateStr = licensePlate ? ` - ${licensePlate}` : '';
    const docType = mode === 'QUOTES' ? 'Devis' : 'Facture';
    return `${docType} ${categoryLabel}${plateStr}`;
  };

  // Mettre à jour le numéro quand la prévisualisation change (y compris au changement de revendeur)
  useEffect(() => {
    if (isNew && previewNumber) {
      _setFS((prev) => ({ ...prev, number: previewNumber }));
    }
  }, [isNew, previewNumber]);

  // Auto-générer l'objet quand la catégorie ou la plaque change (seulement pour nouveaux documents)
  useEffect(() => {
    if (isNew) {
      const autoSubject = generateSubject(formState.category || 'STANDARD', formState.licensePlate);
      const subjectPrefix = mode === 'QUOTES' ? 'Devis ' : 'Facture ';
      // Ne pas écraser si l'utilisateur a déjà modifié manuellement
      if (!formState.subject || formState.subject.startsWith(subjectPrefix)) {
        _setFS((prev) => ({ ...prev, subject: autoSubject }));
      }
    }
  }, [formState.category, formState.licensePlate, isNew, mode]);

  // Auto-remplir le revendeur quand le formulaire s'ouvre avec un client pré-sélectionné
  useEffect(() => {
    if (formState.clientId && !formState.resellerId && tiers.length > 0 && tenants.length > 0) {
      const selectedClient = tiers.find((t) => t.id === formState.clientId);
      const clientTenantId = selectedClient?.tenantId || '';
      if (clientTenantId) {
        const resellerTenant = tenants.find((t) => t.id === clientTenantId);
        _setFS((prev) => ({
          ...prev,
          resellerId: clientTenantId,
          resellerName: resellerTenant?.name || clientTenantId,
          _resellerAuto: true,
        }));
      }
    }
  }, [formState.clientId, tiers, tenants]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plateDropdownRef.current && !plateDropdownRef.current.contains(event.target as Node)) {
        setIsPlateDropdownOpen(false);
      }
      if (catalogDropdownRef.current && !catalogDropdownRef.current.contains(event.target as Node)) {
        setOpenCatalogIndex(null);
        setCatalogSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clients filtrés par revendeur sélectionné
  const filteredClients = useMemo(() => {
    const clients = tiers.filter((t) => t.type === 'CLIENT');
    if (!formState.resellerId) return clients;
    return clients.filter((c) => c.tenantId === formState.resellerId);
  }, [tiers, formState.resellerId]);

  // Catalogue filtré par revendeur sélectionné
  const filteredCatalogItems = useMemo(() => {
    if (!formState.resellerId) return catalogItems;
    return catalogItems.filter((ci) => !ci.tenantId || ci.tenantId === formState.resellerId);
  }, [catalogItems, formState.resellerId]);

  // Véhicules du client sélectionné
  const clientVehicles = useMemo(() => {
    if (!formState.clientId) return safeVehicles;
    return safeVehicles.filter(
      (v) => v.clientId === formState.clientId || (v as Vehicle & { tier_id?: string }).tier_id === formState.clientId
    );
  }, [formState.clientId, safeVehicles]);

  // Parse selected plates from licensePlate field (may be comma-separated)
  const selectedPlates = useMemo(() => {
    if (!formState.licensePlate) return [] as string[];
    return formState.licensePlate
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean);
  }, [formState.licensePlate]);

  const togglePlate = (plate: string) => {
    const current = new Set(selectedPlates);
    if (current.has(plate)) {
      current.delete(plate);
    } else {
      current.add(plate);
    }
    const newPlates = Array.from(current);
    const newValue = newPlates.join(', ');
    // Auto-update quantity of first item based on number of selected plates
    const newItems = [...(formState.items || [])];
    if (newPlates.length > 0 && newItems.length > 0) {
      newItems[0] = { ...newItems[0], quantity: newPlates.length };
    }
    setFormState((prev) => ({ ...prev, licensePlate: newValue, items: newItems }));
  };

  // Auto-remplir le revendeur (tenant) quand un client est sélectionné
  // Le revendeur = tenant auquel appartient le client (via tenantId)
  const handleClientChange = (clientId: string) => {
    const selectedClient = tiers.find((t) => t.id === clientId);
    const clientTenantId = selectedClient?.tenantId || '';
    const resellerTenant = clientTenantId ? tenants.find((t) => t.id === clientTenantId) : null;
    const resellerChanged = clientTenantId && clientTenantId !== formState.resellerId;

    setFormState((prev) => ({
      ...prev,
      clientId,
      licensePlate: '', // reset véhicule si le client change
      // Effacer le numéro si le revendeur change (il sera rechargé par le preview)
      ...(resellerChanged ? { number: undefined } : {}),
      ...(clientTenantId
        ? {
            resellerId: clientTenantId,
            resellerName: resellerTenant?.name || clientTenantId,
            _resellerAuto: true,
          }
        : {}),
    }));
  };

  // Fonction pour calculer l'échéance depuis la date d'installation (30 jours)
  const calculateDueDateFromInstallation = (installationDate: string): string => {
    const date = new Date(installationDate);
    date.setDate(date.getDate() + 30); // 30 jours après l'installation
    return date.toISOString().split('T')[0];
  };

  // Gérer le changement de date d'installation
  const handleInstallationDateChange = (newInstallationDate: string) => {
    const newDueDate = calculateDueDateFromInstallation(newInstallationDate);
    setFormState({
      ...formState,
      installationDate: newInstallationDate,
      dueDate: newDueDate,
    });
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;

    // Required field guard
    if (!formState.clientId) {
      showToast('Client requis', 'error');
      return;
    }
    if (mode === 'INVOICES' && !formState.resellerId) {
      showToast('Revendeur requis', 'error');
      return;
    }

    setIsSaving(true);
    try {
      let validatedData;
      // Ensure numeric fields are numbers and dates are strings
      const ensureDateString = (val: unknown): string => {
        if (!val) return '';
        if (typeof val === 'string') return val.split('T')[0];
        if (val instanceof Date) return val.toISOString().split('T')[0];
        return String(val);
      };

      // Recalculer les montants depuis les lignes (source de vérité = les lignes saisies)
      const safeVatRate = isNaN(Number(formState.vatRate)) ? 0 : Number(formState.vatRate || 0);
      const safeDiscount = isNaN(Number(formState.discount)) ? 0 : Number(formState.discount || 0);
      const computedItems = (formState.items || []).map((item: InvoiceLineItem) => ({
        description: item.description,
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
      }));
      const computedSubtotal = computedItems.reduce((s, i) => s + i.quantity * i.price, 0);
      const computedTaxable = Math.max(0, computedSubtotal - safeDiscount);
      const computedAmountHT = computedTaxable;
      const computedAmountTTC = computedAmountHT * (1 + safeVatRate / 100);

      const dataToValidate = {
        ...formState,
        amount: computedAmountTTC,
        amountHT: computedAmountHT,
        vatRate: safeVatRate,
        discount: safeDiscount,
        date: ensureDateString(formState.date),
        dueDate: ensureDateString(formState.dueDate),
        installationDate: ensureDateString(formState.installationDate),
        items: computedItems,
      };

      // Pour une nouvelle entrée, toujours générer le numéro définitif via l'API
      // (le preview est juste visuel — le vrai compteur s'incrémente ici)
      if (isNew) {
        try {
          const finalNumber = await getNextNumber.mutateAsync({
            module: numberingModule,
            tenantId: formState.resellerId || undefined,
          });
          dataToValidate.number = finalNumber;
        } catch (err) {
          showToast(TOAST.CRUD.ERROR_CREATE('numéro'), 'error');
          return;
        }
      }

      if (mode === 'QUOTES') {
        validatedData = QuoteSchema.parse(dataToValidate);
      } else {
        validatedData = InvoiceSchema.parse(dataToValidate);
      }
      onSave(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err) => {
          showToast(mapError(err), 'error');
        });
      } else {
        showToast(TOAST.VALIDATION.FORM_ERRORS, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...(formState.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormState({ ...formState, items: newItems });
  };

  const handleItemSelect = (index: number, selectedName: string) => {
    const selectedItem = catalogItems.find((ci) => ci.name === selectedName);
    const newItems = [...(formState.items || [])];
    if (selectedItem) {
      newItems[index] = {
        ...newItems[index],
        description: selectedItem.description || selectedItem.name,
        price: selectedItem.price,
      };
      // Ne pas écraser le taux de TVA de la facture depuis l'article du catalogue
      // Le taux de TVA est défini au niveau de l'organisation (source unique de vérité)
    } else {
      newItems[index] = { ...newItems[index], description: selectedName, price: 0 };
    }
    setFormState((prev) => ({ ...prev, items: newItems }));
  };

  const addItem = () =>
    setFormState({ ...formState, items: [...(formState.items || []), { description: '', quantity: 1, price: 0 }] });
  const removeItem = (index: number) =>
    setFormState({
      ...formState,
      items: (formState.items || []).filter((_: InvoiceLineItem, i: number) => i !== index),
    });

  const subtotal = useMemo(
    () =>
      formState.items ? formState.items.reduce((sum: number, i: InvoiceLineItem) => sum + i.quantity * i.price, 0) : 0,
    [formState.items]
  );
  const discount = formState.discount || 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const vatAmount = taxableAmount * (formState.vatRate / 100);
  const total = taxableAmount + vatAmount;

  // Note: formState.amount est calculé à la volée via `total` — pas besoin de le stocker dans le state

  // Verrouiller le revendeur pour les factures payées ou annulées
  const isLocked = !isNew && ['PAID', 'CANCELLED', 'REJECTED'].includes((formState.status || '').toUpperCase());

  return (
    <div className="space-y-6 text-sm">
      <FormSection title="Informations Générales">
        <FormGrid cols={3}>
          {/* Revendeur (Tenant) - Premier champ */}
          <FormField
            label={
              <>
                Revendeur (Tenant)
                {formState.resellerId && formState._resellerAuto && (
                  <span className="text-green-500 text-[10px] ml-1">(Auto)</span>
                )}
                {isLocked && <Lock className="inline w-3 h-3 ml-1 text-orange-500" />}
              </>
            }
          >
            <Select
              value={formState.resellerId || ''}
              disabled={isLocked}
              onChange={(e) => {
                const tenantId = e.target.value;
                const tenant = tenants.find((t) => t.id === tenantId);
                setFormState((prev: InvoiceFormState) => ({
                  ...prev,
                  resellerId: tenantId || '',
                  resellerName: tenant?.name || '',
                  _resellerAuto: false,
                  // Effacer le numéro pour forcer le rechargement du preview
                  ...(isNew ? { number: undefined } : {}),
                }));
              }}
              aria-label="Revendeur"
              className={`${isLocked ? 'opacity-60 cursor-not-allowed' : ''} ${formState.resellerId ? 'border-green-300 dark:border-green-600' : ''}`}
            >
              <option value="">-- Aucun revendeur --</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {isLocked && (
              <p className="text-[10px] text-orange-500 mt-0.5">
                Non modifiable (facture {formState.status === 'PAID' ? 'payée' : 'annulée'})
              </p>
            )}
          </FormField>

          {/* Client */}
          <FormField label="Client">
            <Select
              value={formState.clientId || ''}
              onChange={(e) => handleClientChange(e.target.value)}
              aria-label="Client"
            >
              <option value="">-- Sélectionner un client --</option>
              {filteredClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>

          {/* N° Document */}
          <FormField label="Numéro">
            <div className="relative">
              <Input
                type="text"
                value={formState.number || (isLoadingNumber ? 'Chargement...' : 'Nouveau')}
                readOnly
                className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] cursor-not-allowed font-mono"
              />
              {isNew && formState.number && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-500 font-medium">
                  Auto
                </span>
              )}
            </div>
          </FormField>

          {/* Ligne 2 : Objet + Date */}
          <FormField
            label={
              <>
                Objet
                {isNew && <span className="text-[var(--primary)] text-[10px] ml-1">(Auto-généré, modifiable)</span>}
              </>
            }
            className="md:col-span-2"
          >
            <Input
              type="text"
              value={formState.subject || ''}
              onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
              placeholder={
                mode === 'QUOTES' ? 'Ex: Devis Abonnement - AA-123-BB' : 'Ex: Facture Abonnement - AA-123-BB'
              }
            />
          </FormField>
          <FormField label="Date">
            <Input
              type="date"
              value={
                mode === 'INVOICES'
                  ? formState.date
                    ? typeof formState.date === 'string'
                      ? formState.date.split('T')[0]
                      : new Date(formState.date).toISOString().split('T')[0]
                    : ''
                  : formState.createdAt
                    ? typeof formState.createdAt === 'string'
                      ? formState.createdAt.split('T')[0]
                      : new Date(formState.createdAt).toISOString().split('T')[0]
                    : ''
              }
              onChange={(e) =>
                mode === 'INVOICES'
                  ? setFormState({ ...formState, date: e.target.value })
                  : setFormState({ ...formState, createdAt: e.target.value })
              }
              aria-label="Date"
            />
          </FormField>

          {/* Ligne 3 : Type d'opération, Type document, Statut, Échéance — toujours sur la même ligne */}
          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField label="Type d'Opération">
              <Select
                value={formState.category || 'STANDARD'}
                onChange={(e) => {
                  const newCategory = e.target.value;
                  const updates: Record<string, unknown> = { category: newCategory };
                  if (newCategory === 'INSTALLATION' && !formState.installationDate) {
                    const invoiceDate = formState.date
                      ? typeof formState.date === 'string'
                        ? formState.date.split('T')[0]
                        : new Date(formState.date).toISOString().split('T')[0]
                      : new Date().toISOString().split('T')[0];
                    updates.installationDate = invoiceDate;
                    const dueDate = new Date(invoiceDate);
                    dueDate.setDate(dueDate.getDate() + 30);
                    updates.dueDate = dueDate.toISOString().split('T')[0];
                  }
                  setFormState((prev) => ({ ...prev, ...updates }));
                }}
              >
                <option value="STANDARD">Standard</option>
                <option value="INSTALLATION">Installation</option>
                <option value="ABONNEMENT">Abonnement</option>
                <option value="AUTRES_VENTES">Autres Ventes</option>
              </Select>
            </FormField>
            <FormField label="Type de Document">
              <Select
                value={formState.invoiceType || 'FACTURE'}
                onChange={(e) => setFormState((prev) => ({ ...prev, invoiceType: e.target.value }))}
              >
                <option value="FACTURE">Facture</option>
                <option value="AVOIR">Avoir</option>
              </Select>
            </FormField>
            <FormField label="Statut" hint="Géré automatiquement">
              <Input
                type="text"
                value={
                  mode === 'INVOICES'
                    ? (
                        {
                          DRAFT: 'Brouillon',
                          SENT: 'Envoyée',
                          PAID: 'Payée',
                          PARTIAL: 'Partiel',
                          OVERDUE: 'En retard',
                          CANCELLED: 'Annulée',
                        } as Record<string, string>
                      )[formState.status || 'DRAFT'] || formState.status
                    : (
                        { DRAFT: 'Brouillon', SENT: 'Envoyé', ACCEPTED: 'Accepté', REJECTED: 'Refusé' } as Record<
                          string,
                          string
                        >
                      )[formState.status || 'DRAFT'] || formState.status
                }
                readOnly
                className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] cursor-not-allowed"
              />
            </FormField>
            <FormField label="Échéance / Validité">
              <Input
                type="date"
                value={
                  mode === 'INVOICES'
                    ? formState.dueDate
                      ? typeof formState.dueDate === 'string'
                        ? formState.dueDate.split('T')[0]
                        : new Date(formState.dueDate).toISOString().split('T')[0]
                      : ''
                    : formState.validUntil
                      ? typeof formState.validUntil === 'string'
                        ? formState.validUntil.split('T')[0]
                        : new Date(formState.validUntil).toISOString().split('T')[0]
                      : ''
                }
                onChange={(e) =>
                  mode === 'INVOICES'
                    ? setFormState({ ...formState, dueDate: e.target.value })
                    : setFormState({ ...formState, validUntil: e.target.value })
                }
                aria-label="Échéance"
              />
            </FormField>
          </div>

          {/* Conditions de paiement - devis uniquement */}
          {mode === 'QUOTES' && (
            <FormField label="Conditions de paiement">
              <Select
                value={formState.paymentTerms || ''}
                onChange={(e) => setFormState({ ...formState, paymentTerms: e.target.value || undefined })}
                aria-label="Conditions de paiement"
              >
                <option value="">— Non spécifié —</option>
                {PAYMENT_TERMS.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.label}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </FormGrid>
      </FormSection>

      {mode === 'INVOICES' && (
        <FormSection title="Détails Véhicule & Contrat">
          <FormGrid cols={3}>
            <FormField label="Plaque(s) d'immatriculation">
              <div className="relative" ref={plateDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsPlateDropdownOpen(!isPlateDropdownOpen)}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-left flex items-center justify-between min-h-[40px]"
                >
                  <div className="flex-1 flex flex-wrap gap-1">
                    {selectedPlates.length > 0 ? (
                      selectedPlates.map((plate) => (
                        <span
                          key={plate}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] text-xs rounded-full"
                        >
                          {plate}
                          <X
                            className="w-3 h-3 cursor-pointer hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlate(plate);
                            }}
                          />
                        </span>
                      ))
                    ) : (
                      <span className="text-[var(--text-muted)] text-sm">Sélectionner des véhicules...</span>
                    )}
                  </div>
                  {isPlateDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                </button>
                {isPlateDropdownOpen && (
                  <div className="absolute top-full left-0 w-full bg-[var(--bg-elevated)] border border-[var(--border)] shadow-lg z-20 rounded-b-lg max-h-48 overflow-y-auto">
                    <div className="p-2 border-b border-[var(--border)]">
                      <input
                        type="text"
                        value={plateSearchTerm}
                        onChange={(e) => setPlateSearchTerm(e.target.value)}
                        placeholder="Rechercher une plaque..."
                        className="w-full p-1.5 text-xs border rounded bg-[var(--bg-elevated)] border-[var(--border)]"
                        autoFocus
                      />
                    </div>
                    {clientVehicles.length === 0 ? (
                      <div className="p-3 text-xs text-[var(--text-muted)] text-center">
                        {formState.clientId ? 'Aucun véhicule trouvé pour ce client' : "Sélectionnez un client d'abord"}
                      </div>
                    ) : (
                      clientVehicles
                        .filter((v) => {
                          const plate = v.licensePlate || v.plate || '';
                          return (
                            plate.toLowerCase().includes(plateSearchTerm.toLowerCase()) ||
                            (v.name || '').toLowerCase().includes(plateSearchTerm.toLowerCase())
                          );
                        })
                        .map((v) => {
                          const plate = v.licensePlate || v.plate || '';
                          if (!plate) return null;
                          const isSelected = selectedPlates.includes(plate);
                          return (
                            <div
                              key={v.id}
                              onClick={() => togglePlate(plate)}
                              className={`flex items-center gap-2 p-2 text-xs cursor-pointer hover:bg-[var(--bg-elevated)] ${isSelected ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]' : ''}`}
                            >
                              <div
                                className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-[var(--border)]'}`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                              <span className="font-mono font-bold">{plate}</span>
                              {v.name && <span className="text-[var(--text-muted)]">— {v.name}</span>}
                            </div>
                          );
                        })
                    )}
                    {/* Option saisie libre */}
                    {plateSearchTerm &&
                      !clientVehicles.some(
                        (v) => (v.licensePlate || v.plate || '') === plateSearchTerm.toUpperCase()
                      ) && (
                        <div
                          onClick={() => {
                            togglePlate(plateSearchTerm.toUpperCase());
                            setPlateSearchTerm('');
                          }}
                          className="p-2 text-xs cursor-pointer hover:bg-[var(--clr-success-dim)] border-t border-[var(--border)] text-green-600"
                        >
                          <Plus className="w-3 h-3 inline mr-1" /> Ajouter "{plateSearchTerm.toUpperCase()}"
                          manuellement
                        </div>
                      )}
                  </div>
                )}
              </div>
            </FormField>
            {formState.category === 'INSTALLATION' && (
              <FormField
                label={
                  <>
                    <Calculator className="w-3 h-3 inline mr-1" />
                    Date d'installation
                  </>
                }
                hint={
                  formState.installationDate
                    ? "Définie à la clôture de l'intervention"
                    : "Non renseignée — clôturer une intervention d'installation"
                }
              >
                <Input
                  type="date"
                  value={formState.installationDate ? formState.installationDate.split('T')[0] : ''}
                  readOnly
                  disabled
                  className="border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] cursor-not-allowed"
                />
              </FormField>
            )}
            <FormField label="Réf. Contrat">
              <Input
                type="text"
                value={formState.contractNumber || formState.contractId || ''}
                readOnly
                disabled
                className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] cursor-not-allowed"
                placeholder="CTR-..."
              />
            </FormField>
          </FormGrid>
        </FormSection>
      )}

      <FormSection title="Lignes">
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-center">Qté</div>
            <div className="col-span-3 text-right">Prix U.</div>
            <div className="col-span-1"></div>
          </div>
          {(formState.items || []).map((item: InvoiceLineItem, index: number) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 relative" ref={openCatalogIndex === index ? catalogDropdownRef : undefined}>
                <Input
                  type="text"
                  value={item.description}
                  onChange={(e) => {
                    handleItemChange(index, 'description', e.target.value);
                    setCatalogSearchTerm(e.target.value);
                    setOpenCatalogIndex(index);
                  }}
                  onFocus={() => {
                    setOpenCatalogIndex(index);
                    setCatalogSearchTerm(item.description || '');
                  }}
                  placeholder="Rechercher un article..."
                />
                {openCatalogIndex === index && filteredCatalogItems.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-[var(--bg-elevated)] border border-[var(--border)] shadow-lg z-20 max-h-48 overflow-y-auto rounded-b-lg">
                    {filteredCatalogItems
                      .filter(
                        (ci) => !catalogSearchTerm || ci.name.toLowerCase().includes(catalogSearchTerm.toLowerCase())
                      )
                      .map((ci) => (
                        <div
                          key={ci.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleItemSelect(index, ci.name);
                            setOpenCatalogIndex(null);
                            setCatalogSearchTerm('');
                          }}
                          className={`p-2 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/30 cursor-pointer text-xs flex justify-between ${item.description === ci.name ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] font-bold' : ''}`}
                        >
                          <span>{ci.name}</span>
                          <span className="text-[var(--text-muted)] font-mono">{formatPrice(ci.price)}</span>
                        </div>
                      ))}
                    {filteredCatalogItems.filter(
                      (ci) => !catalogSearchTerm || ci.name.toLowerCase().includes(catalogSearchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="p-2 text-xs text-[var(--text-muted)] text-center">Aucun article trouvé</div>
                    )}
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  className="text-center"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                  className="text-right"
                />
              </div>
              <div className="col-span-1 text-center">
                <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button onClick={addItem} className="flex items-center gap-1 text-[var(--primary)] text-xs font-bold mt-2">
            <Plus className="w-3 h-3" /> Ajouter une ligne
          </button>
        </div>
      </FormSection>

      <div className="flex justify-end">
        <div className="w-64 space-y-2 text-sm bg-[var(--bg-elevated)] p-4 rounded-lg">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Sous-total HT:</span>{' '}
            <span className="font-bold font-mono">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-secondary)]">Remise:</span>
            <input
              type="number"
              value={formState.discount || 0}
              onChange={(e) => setFormState({ ...formState, discount: parseFloat(e.target.value) })}
              className="w-20 p-1.5 text-right border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-xs"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-secondary)]">TVA (%):</span>
            <input
              type="number"
              value={formState.vatRate ?? 0}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setFormState({ ...formState, vatRate: isNaN(v) ? 0 : v });
              }}
              className="w-20 p-1.5 text-right border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-xs"
            />
          </div>
          <div className="flex justify-between pt-2 border-t border-[var(--border)]">
            <span className="font-bold">Total TTC:</span>
            <span className="font-bold text-[var(--primary)] font-mono">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      <FormSection title="Notes & Conditions">
        <div className="space-y-4">
          <FormField label="Notes (Visible sur le document)">
            <Textarea
              value={formState.notes || ''}
              onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
              rows={2}
            />
          </FormField>
          <FormField label="Conditions Générales">
            <Textarea
              value={formState.generalConditions || ''}
              onChange={(e) => setFormState({ ...formState, generalConditions: e.target.value })}
              rows={2}
            />
          </FormField>
        </div>
      </FormSection>

      <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-light)] font-bold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
};
