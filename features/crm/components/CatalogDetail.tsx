import React, { useState } from 'react';
import { CatalogItem } from '../../../types';
import { Edit2, Image, FileText, Clock, Percent } from 'lucide-react';
import { useCurrency } from '../../../hooks/useCurrency';

interface CatalogDetailProps {
    item: CatalogItem;
    onClose: () => void;
    onEdit: (item: CatalogItem) => void;
}

export const CatalogDetail: React.FC<CatalogDetailProps> = ({ item, onClose, onEdit }) => {
    const { formatPrice } = useCurrency();
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRANSACTIONS' | 'HISTORY'>('OVERVIEW');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.type === 'Service' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{item.type}</span>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{item.status === 'ACTIVE' ? 'Actif' : 'Inactif'}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {item.name}
                            <button onClick={() => onEdit(item)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Modifier">
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </h2>
                        <p className="text-slate-500 font-mono text-sm">{item.id}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{formatPrice(item.price)}</p>
                    <p className="text-sm text-slate-500">{item.unit}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setActiveTab('OVERVIEW')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'OVERVIEW' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Vue d'ensemble
                </button>
                <button 
                    onClick={() => setActiveTab('TRANSACTIONS')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'TRANSACTIONS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Transactions
                </button>
                <button 
                    onClick={() => setActiveTab('HISTORY')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Historique
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[300px]">
                {activeTab === 'OVERVIEW' && (
                    <div className="grid grid-cols-12 gap-6 animate-in fade-in">
                        {/* Image Section */}
                        <div className="col-span-4">
                             <div className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden relative">
                                 {item.imageUrl ? (
                                     <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                 ) : (
                                     <div className="text-slate-400 flex flex-col items-center">
                                         <Image className="w-12 h-12 mb-2 opacity-50" />
                                         <span className="text-sm font-medium">Aucune image</span>
                                     </div>
                                 )}
                             </div>
                        </div>

                        {/* Details Section */}
                        <div className="col-span-8 grid grid-cols-2 gap-6">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                                <h3 className="font-bold text-sm text-slate-500 uppercase mb-2">Catégorie</h3>
                                <p className="font-medium">{item.category}</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                                <h3 className="font-bold text-sm text-slate-500 uppercase mb-2">Revendeur</h3>
                                <p className="font-medium">{item.resellerName || 'Global'}</p>
                            </div>
                            
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                                <h3 className="font-bold text-sm text-slate-500 uppercase mb-2">Comptabilité</h3>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Vente:</span>
                                        <span className="font-mono font-medium">{item.accountingAccountSale || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Achat:</span>
                                        <span className="font-mono font-medium">{item.accountingAccountPurchase || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                                <h3 className="font-bold text-sm text-slate-500 uppercase mb-2">Fiscalité</h3>
                                <div className="flex items-center gap-2">
                                    <Percent className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium">TVA: {item.taxRate ?? 0}%</span>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                                <h3 className="font-bold text-sm text-slate-500 uppercase mb-2">Paramètres</h3>
                                <div className="flex flex-wrap gap-2">
                                    {item.isSellable && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Vendable</span>}
                                    {item.isPurchasable && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">Achetable</span>}
                                    {item.trackStock && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">Stock Suivi</span>}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 col-span-2">
                                <h3 className="font-bold text-sm text-slate-500 uppercase mb-2">Description</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{item.description || 'Aucune description disponible.'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'TRANSACTIONS' && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 animate-in fade-in">
                        <FileText className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-lg font-bold">Transactions</p>
                        <p className="text-sm">Les devis et factures liés à cet article apparaîtront ici.</p>
                        <p className="text-xs mt-2 text-slate-300">Fonctionnalité à venir</p>
                    </div>
                )}

                {activeTab === 'HISTORY' && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 animate-in fade-in">
                        <Clock className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-lg font-bold">Historique des modifications</p>
                        <p className="text-sm">L'historique des changements sur cet article apparaîtra ici.</p>
                        <p className="text-xs mt-2 text-slate-300">Fonctionnalité à venir</p>
                    </div>
                )}
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded">Fermer</button>
            </div>
        </div>
    );
};
