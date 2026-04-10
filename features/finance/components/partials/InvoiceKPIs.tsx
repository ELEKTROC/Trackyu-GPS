import React from 'react';
import { Capacitor } from '@capacitor/core';
import { FileText, CheckCircle, AlertCircle, PieChart, TrendingUp } from 'lucide-react';
import { Card } from '../../../../components/Card';

interface InvoiceKPIsProps {
    mode: 'INVOICES' | 'QUOTES';
    invoicesCount: number;
    paidCount: number;
    overdueCount: number;
    collectionRate: number;
    // Quote-specific
    quotesCount?: number;
    acceptedCount?: number;
    conversionRate?: number;
}

export const InvoiceKPIs: React.FC<InvoiceKPIsProps> = ({
    mode,
    invoicesCount,
    paidCount,
    overdueCount,
    collectionRate,
    quotesCount = 0,
    acceptedCount = 0,
    conversionRate = 0
}) => {
    // Don't render on native platforms (mobile)
    if (Capacitor.isNativePlatform()) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {mode === 'INVOICES' ? (
                <>
                    <Card className="p-4 border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Factures Émises</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{invoicesCount}</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-600">
                                <FileText className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Factures Payées</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{paidCount}</p>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full text-green-600">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-red-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">En Retard</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{overdueCount}</p>
                            </div>
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-full text-red-600">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Taux Recouvrement</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{collectionRate.toFixed(1)} %</p>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-full text-purple-600">
                                <PieChart className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                </>
            ) : (
                <>
                    <Card className="p-4 border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Total Devis</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{quotesCount}</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-600">
                                <FileText className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Devis Acceptés</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{acceptedCount}</p>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full text-green-600">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Taux Transformation</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{conversionRate.toFixed(1)} %</p>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-full text-purple-600">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};
