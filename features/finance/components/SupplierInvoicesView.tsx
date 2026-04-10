import React, { useState, useCallback } from 'react';
import { useDataContext } from '../../../contexts/DataContext';
import type { SupplierInvoice, Tier } from '../../../types';
import { SUPPLIER_INVOICE_COLUMNS, PLAN_COMPTABLE } from '../constants';
import { Plus, Search, Trash2, Edit2, Upload, Paperclip, UserPlus, X, Calculator } from 'lucide-react';
import { TierForm } from '../../crm/components/TierForm';
import { useCurrency } from '../../../hooks/useCurrency';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileCard, MobileCardList, MobileCardAction } from '../../../components/MobileCard';

// Conditions de paiement fournisseurs
const SUPPLIER_PAYMENT_TERMS = [
    { id: 'IMMEDIATE', label: 'Comptant (à réception)', days: 0 },
    { id: 'NET_15', label: 'Net 15 jours', days: 15 },
    { id: 'NET_30', label: 'Net 30 jours', days: 30 },
    { id: 'NET_45', label: 'Net 45 jours', days: 45 },
    { id: 'NET_60', label: 'Net 60 jours', days: 60 },
    { id: 'NET_90', label: 'Net 90 jours', days: 90 },
    { id: 'END_OF_MONTH', label: 'Fin de mois', days: 0, special: 'EOM' as const },
    { id: 'NET_30_EOM', label: '30 jours fin de mois', days: 30, special: 'EOM' as const },
    { id: 'NET_60_EOM', label: '60 jours fin de mois', days: 60, special: 'EOM' as const },
];

// Catégories de dépenses avec mapping compte comptable
const EXPENSE_CATEGORIES = [
    { id: 'FOURNITURES',   label: 'Fournitures & Matériel',    accountCode: '606000' },
    { id: 'LOYER',         label: 'Loyer & Charges locatives', accountCode: '610000' },
    { id: 'SERVICES',      label: 'Services & Sous-traitance', accountCode: '610000' },
    { id: 'HONORAIRES',    label: 'Honoraires & Conseil',      accountCode: '620000' },
    { id: 'TRANSPORT',     label: 'Transport & Déplacement',   accountCode: '620000' },
    { id: 'PUBLICITE',     label: 'Publicité & Communication', accountCode: '620000' },
    { id: 'PERSONNEL',     label: 'Charges de personnel',      accountCode: '640000' },
    { id: 'TAXES',         label: 'Impôts & Taxes',            accountCode: '630000' },
    { id: 'FINANCIER',     label: 'Charges financières',       accountCode: '660000' },
    { id: 'INFORMATIQUE',  label: 'Informatique & Logiciels',  accountCode: '606000' },
    { id: 'ASSURANCE',     label: 'Assurance',                 accountCode: '610000' },
    { id: 'CARBURANT',     label: 'Carburant',                 accountCode: '606000' },
    { id: 'ACHAT_STOCK',   label: 'Achat de marchandises',     accountCode: '601000' },
    { id: 'AUTRE',         label: 'Autre',                     accountCode: '606000' },
];

interface SupplierInvoicesViewProps {
    supplierInvoices: SupplierInvoice[];
    isSuperAdmin?: boolean;
    resellers?: Tier[];
}

export const SupplierInvoicesView: React.FC<SupplierInvoicesViewProps> = ({
    supplierInvoices,
    isSuperAdmin,
    resellers
}) => {
    const { formatPrice } = useCurrency();
    const isMobile = useIsMobile();
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const { addSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice, suppliers, addSupplier, addTier } = useDataContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTierFormOpen, setIsTierFormOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Partial<SupplierInvoice> & { paymentTerms?: string }>({});
    const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
    const [newCatLabel, setNewCatLabel] = useState('');
    const [newCatCode, setNewCatCode] = useState('');
    const [customCategories, setCustomCategories] = useState<{ id: string; label: string; accountCode: string }[]>([]);

    const allCategories = [...EXPENSE_CATEGORIES, ...customCategories];

    const PAYMENT_REF_LABELS: Record<string, string> = {
        CHECK:        'N° Chèque',
        TRANSFER:     'N° Virement',
        MOBILE_MONEY: 'Numéro Mobile Money',
        CASH:         'Référence espèces',
    };
    const paymentRefLabel = editingInvoice.paymentMethod
        ? (PAYMENT_REF_LABELS[editingInvoice.paymentMethod] ?? 'Référence paiement')
        : 'Référence paiement';

    // Fonction pour calculer l'échéance selon les conditions de paiement
    const calculateDueDate = useCallback((invoiceDate: string, paymentTermId: string): string => {
        const date = new Date(invoiceDate);
        const term = SUPPLIER_PAYMENT_TERMS.find(t => t.id === paymentTermId);
        
        if (!term) {
            // Par défaut: Net 30 jours
            date.setDate(date.getDate() + 30);
            return date.toISOString().split('T')[0];
        }

        // Ajouter les jours
        date.setDate(date.getDate() + term.days);

        // Si fin de mois
        if (term.special === 'EOM') {
            date.setMonth(date.getMonth() + 1);
            date.setDate(0); // Dernier jour du mois
        }

        return date.toISOString().split('T')[0];
    }, []);

    // Gérer le changement de date ou de conditions
    const handleDateOrTermChange = (field: 'date' | 'paymentTerms', value: string) => {
        const newInvoice = { ...editingInvoice, [field]: value };
        
        // Si on a une date et des conditions, calculer l'échéance
        if (newInvoice.date && newInvoice.paymentTerms) {
            newInvoice.dueDate = calculateDueDate(newInvoice.date, newInvoice.paymentTerms);
        }
        
        setEditingInvoice(newInvoice);
    };

    const filteredInvoices = (supplierInvoices || []).filter(inv => 
        inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.reference.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const { sortedItems: sortedInvoices, sortConfig: invoiceSortConfig, handleSort: handleInvoiceSort } = useTableSort(
        filteredInvoices,
        { key: 'date', direction: 'desc' }
    );

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingInvoice.id) {
            // Promote DRAFT → PENDING on explicit save (non-recurring invoices only)
            const promotedStatus = (!editingInvoice.isRecurring && editingInvoice.status === 'DRAFT')
                ? 'PENDING'
                : editingInvoice.status;
            updateSupplierInvoice({ ...editingInvoice, status: promotedStatus } as SupplierInvoice);
        } else {
            addSupplierInvoice({
                ...editingInvoice,
                status: editingInvoice.isRecurring ? 'DRAFT' : 'PENDING',
                items: [],
                createdAt: new Date().toISOString()
            } as SupplierInvoice);
        }
        setIsModalOpen(false);
        setEditingInvoice({});
    };

const handleAmountChange = (field: 'amountHT' | 'vatRate', value: number) => {
        const newInvoice = { ...editingInvoice, [field]: value };
        const ht = newInvoice.amountHT || 0;
        const rate = newInvoice.vatRate || 0;
        const tva = Math.round(ht * rate / 100 * 100) / 100;
        newInvoice.amountTVA = tva;
        newInvoice.amount = ht + tva;
        setEditingInvoice(newInvoice);
    };

    const handleCategoryChange = (categoryId: string) => {
        const cat = EXPENSE_CATEGORIES.find(c => c.id === categoryId);
        setEditingInvoice(prev => ({
            ...prev,
            category: categoryId,
            accountCode: cat?.accountCode || prev.accountCode
        }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setEditingInvoice(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), file.name]
            }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Rechercher une facture fournisseur..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => { setEditingInvoice({}); setIsModalOpen(true); }}
                    className="bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shrink-0"
                >
                    <Plus className="w-4 h-4" /> Nouvelle Dépense
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {isMobile ? (
                    <MobileCardList bordered={false}>
                        {sortedInvoices.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">Aucune dépense trouvée.</div>
                        ) : sortedInvoices.map(invoice => {
                            const borderColor = invoice.status === 'PAID' ? 'border-l-green-500'
                                : invoice.status === 'OVERDUE' ? 'border-l-red-500'
                                : 'border-l-yellow-500';
                            const statusLabel = invoice.status === 'PAID' ? 'Payée' : invoice.status === 'OVERDUE' ? 'En retard' : 'En attente';
                            const statusColors = invoice.status === 'PAID' ? 'bg-green-100 text-green-700'
                                : invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700';
                            return (
                                <MobileCard key={invoice.id} borderColor={borderColor}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{invoice.supplierName}</p>
                                            <p className="text-xs font-mono text-slate-500">{invoice.reference} · {new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                        <p className="shrink-0 font-bold font-mono text-slate-800 dark:text-white text-sm">{formatPrice(invoice.amount)}</p>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors}`}>{statusLabel}</span>
                                        <span className="text-[10px] text-slate-400">Éch. {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <MobileCardAction icon={<Edit2 className="w-3 h-3" />} color="blue" onClick={() => { setEditingInvoice(invoice); setIsModalOpen(true); }}>Modifier</MobileCardAction>
                                        <MobileCardAction icon={<Trash2 className="w-3 h-3" />} color="red" onClick={async () => { if (await confirm({ message: 'Supprimer cette facture fournisseur ?', variant: 'danger', title: 'Confirmation', confirmLabel: 'Supprimer' })) deleteSupplierInvoice(invoice.id); }}>Supprimer</MobileCardAction>
                                    </div>
                                </MobileCard>
                            );
                        })}
                    </MobileCardList>
                ) : (
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 font-bold">
                        <tr>
                            {SUPPLIER_INVOICE_COLUMNS.map(col => {
                                if (col.id === 'reseller' && !isSuperAdmin) return null;
                                return col.id === 'actions' ? (
                                    <th key={col.id} className="px-4 py-3">{col.label}</th>
                                ) : (
                                    <SortableHeader
                                        key={col.id}
                                        label={col.label}
                                        sortKey={col.id}
                                        currentSortKey={invoiceSortConfig.key}
                                        currentDirection={invoiceSortConfig.direction}
                                        onSort={handleInvoiceSort}
                                    />
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {sortedInvoices.map(invoice => (
                            <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-4 py-3 font-mono">{new Date(invoice.date).toLocaleDateString('fr-FR')}</td>
                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{invoice.reference}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{invoice.label || '-'}</td>
                                <td className="px-4 py-3">{invoice.supplierName}</td>
                                {isSuperAdmin && (
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] flex items-center justify-center text-[10px] font-bold text-[var(--primary)]">
                                                {(resellers?.find(r => r.tenantId === invoice.tenantId)?.slug || '??').substring(0, 2)}
                                            </div>
                                            <span className="text-xs text-slate-600 dark:text-slate-300">
                                                {resellers?.find(r => r.tenantId === invoice.tenantId)?.name || invoice.tenantId || '-'}
                                            </span>
                                        </div>
                                    </td>
                                )}
                                <td className="px-4 py-3 text-slate-500">{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</td>
                                <td className="px-4 py-3 font-mono font-bold">{formatPrice(invoice.amount)}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                        invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {invoice.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setEditingInvoice(invoice); setIsModalOpen(true); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-[var(--primary)]">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={async () => { if (await confirm({ message: 'Supprimer cette facture fournisseur ?', variant: 'danger', title: 'Confirmation', confirmLabel: 'Supprimer' })) deleteSupplierInvoice(invoice.id); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sortedInvoices.length === 0 && (
                            <tr>
                                <td colSpan={SUPPLIER_INVOICE_COLUMNS.length} className="px-4 py-8 text-center text-slate-500">
                                    Aucune facture fournisseur trouvée
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                )}
            </div>

            {/* Supplier Tier Form */}
            <TierForm
                isOpen={isTierFormOpen}
                initialType="SUPPLIER"
                onClose={() => setIsTierFormOpen(false)}
                onSave={(tier: Tier) => {
                    addTier(tier);
                    addSupplier({
                        id: tier.id,
                        name: tier.name,
                        email: tier.email,
                        phone: tier.phone,
                        address: tier.address,
                        taxId: tier.taxId,
                        defaultAccountCode: '401100',
                        createdAt: tier.createdAt ?? new Date().toISOString(),
                    });
                    setEditingInvoice(prev => ({
                        ...prev,
                        supplierName: tier.name,
                        supplierId: tier.id,
                    }));
                    setIsTierFormOpen(false);
                }}
            />

            {/* New Category Modal */}
            {isNewCategoryOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-800 dark:text-white">Nouvelle Catégorie</h3>
                            <button onClick={() => setIsNewCategoryOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1 text-slate-600 dark:text-slate-400">Libellé catégorie</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                                    value={newCatLabel}
                                    onChange={e => setNewCatLabel(e.target.value)}
                                    placeholder="Ex: Frais bancaires"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1 text-slate-600 dark:text-slate-400">Compte comptable</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                                    value={newCatCode}
                                    onChange={e => setNewCatCode(e.target.value)}
                                >
                                    <option value="">Sélectionner...</option>
                                    {PLAN_COMPTABLE.filter(p => p.code.startsWith('6')).map(acc => (
                                        <option key={acc.code} value={acc.code}>{acc.code} — {acc.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsNewCategoryOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-bold">Annuler</button>
                                <button
                                    type="button"
                                    disabled={!newCatLabel.trim() || !newCatCode}
                                    className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-white rounded-lg text-sm font-bold"
                                    onClick={() => {
                                        const id = newCatLabel.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
                                        const newCat = { id, label: newCatLabel.trim(), accountCode: newCatCode };
                                        setCustomCategories(prev => [...prev, newCat]);
                                        setEditingInvoice(prev => ({ ...prev, category: id, accountCode: newCatCode }));
                                        setIsNewCategoryOpen(false);
                                    }}
                                >
                                    Créer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                        
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Nouvelle Dépense Fournisseur</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <form id="invoice-form" onSubmit={handleSave} className="space-y-5 max-w-4xl mx-auto">

                                {/* Section 0 — Revendeur (lecture seule) */}
                                {isSuperAdmin && resellers && resellers.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Revendeur</label>
                                        <input
                                            type="text"
                                            readOnly
                                            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default"
                                            value={
                                                resellers.find(r => r.id === editingInvoice.resellerId || r.tenantId === editingInvoice.tenantId)?.name
                                                ?? (editingInvoice.resellerId ? `Revendeur #${editingInvoice.resellerId}` : '—')
                                            }
                                        />
                                    </div>
                                )}

                                {/* Section 1 — Qui + Quand */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fournisseur <span className="text-red-500">*</span></label>
                                        <div className="flex gap-2">
                                            <select
                                                aria-label="Fournisseur"
                                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                                value={editingInvoice.supplierName || ''}
                                                onChange={e => {
                                                    const supplier = suppliers.find(s => s.name === e.target.value);
                                                    setEditingInvoice({
                                                        ...editingInvoice,
                                                        supplierName: e.target.value,
                                                        supplierId: supplier?.id,
                                                        accountCode: supplier?.defaultAccountCode || editingInvoice.accountCode
                                                    });
                                                }}
                                                required
                                            >
                                                <option value="">Sélectionner...</option>
                                                <option value="Fournisseurs divers">── Fournisseurs divers ──</option>
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={s.name}>{s.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setIsTierFormOpen(true)}
                                                className="p-2.5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors shrink-0"
                                                title="Nouveau Fournisseur"
                                            >
                                                <UserPlus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date Facture <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                            value={editingInvoice.date || ''}
                                            onChange={e => handleDateOrTermChange('date', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Section 2 — N° facture + Référence interne */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">N° Facture Fournisseur</label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                            value={editingInvoice.invoiceNumber || ''}
                                            onChange={e => setEditingInvoice({...editingInvoice, invoiceNumber: e.target.value})}
                                            placeholder="Ex: FF-2026-0042"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Référence Interne <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                            value={editingInvoice.reference || ''}
                                            onChange={e => setEditingInvoice({...editingInvoice, reference: e.target.value})}
                                            placeholder="Ex: DEP-2026-001"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Section 3 — Libellé + Catégorie + Compte de charge */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Libellé</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                        value={editingInvoice.label || ''}
                                        onChange={e => setEditingInvoice({...editingInvoice, label: e.target.value})}
                                        placeholder="Description de la dépense..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catégorie</label>
                                        <div className="flex gap-2">
                                            <select
                                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                                value={editingInvoice.category || ''}
                                                onChange={e => handleCategoryChange(e.target.value)}
                                            >
                                                <option value="">Sélectionner...</option>
                                                {allCategories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => { setNewCatLabel(''); setNewCatCode(''); setIsNewCategoryOpen(true); }}
                                                className="p-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shrink-0"
                                                title="Nouvelle catégorie"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Compte de Charge
                                            {editingInvoice.category && (
                                                <span className="ml-2 text-xs text-[var(--primary)] font-normal">(auto)</span>
                                            )}
                                        </label>
                                        <select
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                            value={editingInvoice.accountCode || ''}
                                            onChange={e => setEditingInvoice({...editingInvoice, accountCode: e.target.value})}
                                        >
                                            <option value="">Sélectionner...</option>
                                            {PLAN_COMPTABLE.filter(p => p.code.startsWith('6')).map(acc => (
                                                <option key={acc.code} value={acc.code}>{acc.code} — {acc.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Montant HT</label>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                            value={editingInvoice.amountHT || ''}
                                            onChange={e => handleAmountChange('amountHT', parseFloat(e.target.value) || 0)}
                                            placeholder="0.00"
                                            min={0}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">TVA (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full p-2.5 pr-8 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                                value={editingInvoice.vatRate ?? ''}
                                                onChange={e => handleAmountChange('vatRate', parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                                min={0}
                                                max={100}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                                        </div>
                                        {(editingInvoice.amountTVA ?? 0) > 0 && (
                                            <p className="text-xs text-slate-400 mt-1">= {editingInvoice.amountTVA?.toFixed(2)} {editingInvoice.amountTVA !== undefined ? '' : ''}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total TTC</label>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 rounded-lg border border-[var(--primary)] dark:border-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] font-bold text-[var(--primary)] dark:text-[var(--primary)]"
                                            value={editingInvoice.amount || ''}
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                                    <textarea 
                                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 h-20 resize-none"
                                        value={editingInvoice.notes || ''}
                                        onChange={e => setEditingInvoice({...editingInvoice, notes: e.target.value})}
                                        placeholder="Notes internes, détails supplémentaires..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Justificatif (PDF/Image)</label>
                                    <div className="flex items-center gap-3">
                                        <label className="cursor-pointer bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm">
                                            <Upload className="w-4 h-4" />
                                            Choisir un fichier
                                            <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
                                        </label>
                                        {editingInvoice.attachments && editingInvoice.attachments.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {editingInvoice.attachments.map((file, idx) => (
                                                    <span key={idx} className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-[var(--primary)] dark:border-[var(--primary)]">
                                                        <Paperclip className="w-3 h-3" /> {file}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Section 5 — Conditions paiement + Échéance + Mode */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            <Calculator className="w-4 h-4 inline mr-1" />
                                            Conditions de Paiement
                                        </label>
                                        <select
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                            value={editingInvoice.paymentTerms || 'NET_30'}
                                            onChange={e => handleDateOrTermChange('paymentTerms', e.target.value)}
                                        >
                                            {SUPPLIER_PAYMENT_TERMS.map(term => (
                                                <option key={term.id} value={term.id}>{term.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Échéance <span className="text-xs text-[var(--primary)]">(calculée auto)</span>
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 rounded-lg border border-[var(--primary)] dark:border-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] font-medium"
                                            value={editingInvoice.dueDate || ''}
                                            onChange={e => setEditingInvoice({...editingInvoice, dueDate: e.target.value})}
                                            required
                                        />
                                        {editingInvoice.date && editingInvoice.dueDate && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                {Math.ceil((new Date(editingInvoice.dueDate).getTime() - new Date(editingInvoice.date).getTime()) / (1000 * 60 * 60 * 24))} jours après facturation
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mode de Paiement</label>
                                        <select
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                            value={editingInvoice.paymentMethod || ''}
                                            onChange={e => setEditingInvoice({...editingInvoice, paymentMethod: e.target.value as SupplierInvoice['paymentMethod'], paymentReference: ''})}
                                        >
                                            <option value="">Sélectionner...</option>
                                            <option value="CASH">Espèces</option>
                                            <option value="CHECK">Chèque</option>
                                            <option value="TRANSFER">Virement</option>
                                            <option value="MOBILE_MONEY">Mobile Money</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Référence paiement — affichée si un mode est sélectionné */}
                                {editingInvoice.paymentMethod && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{paymentRefLabel}</label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                            value={editingInvoice.paymentReference || ''}
                                            onChange={e => setEditingInvoice({...editingInvoice, paymentReference: e.target.value})}
                                            placeholder={
                                                editingInvoice.paymentMethod === 'CHECK'        ? 'Ex: 0012345' :
                                                editingInvoice.paymentMethod === 'TRANSFER'     ? 'Ex: VIR-2026-0042' :
                                                editingInvoice.paymentMethod === 'MOBILE_MONEY' ? 'Ex: +225 07 00 00 00' :
                                                'Ex: REF-001'
                                            }
                                        />
                                    </div>
                                )}

                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-3 mb-3">
                                        <input 
                                            type="checkbox" 
                                            id="isRecurring"
                                            className="w-4 h-4 text-[var(--primary)] rounded border-slate-300 focus:ring-[var(--primary)]"
                                            checked={editingInvoice.isRecurring || false}
                                            onChange={e => setEditingInvoice({...editingInvoice, isRecurring: e.target.checked})}
                                        />
                                        <label htmlFor="isRecurring" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            Dépense Récurrente (Abonnement)
                                        </label>
                                    </div>
                                    
                                    {editingInvoice.isRecurring && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200 pl-7">
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Périodicité</label>
                                            <select 
                                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-sm"
                                                value={editingInvoice.recurrencePeriod || 'MONTHLY'}
                                                onChange={e => setEditingInvoice({...editingInvoice, recurrencePeriod: e.target.value as SupplierInvoice['recurrencePeriod']})}
                                            >
                                                <option value="MONTHLY">Mensuel</option>
                                                <option value="QUARTERLY">Trimestriel</option>
                                                <option value="YEARLY">Annuel</option>
                                            </select>
                                            <p className="text-xs text-slate-500 mt-2">
                                                Cette dépense sera enregistrée comme un brouillon (modèle) pour générer les futures échéances.
                                            </p>
                                        </div>
                                    )}
                                </div>

                            </form>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end items-center shrink-0 gap-3">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)} 
                                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Annuler
                            </button>
                            <button 
                                type="submit" 
                                form="invoice-form"
                                className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialogComponent />
        </div>
    );
};