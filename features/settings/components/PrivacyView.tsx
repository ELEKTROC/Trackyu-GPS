import React from 'react';
import { Shield, Lock, Eye, FileText, CheckCircle } from 'lucide-react';

export const PrivacyView: React.FC = () => {
    return (
        <div className="p-6 w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Politique de Confidentialité</h2>
                    <p className="text-slate-500 dark:text-slate-400">Dernière mise à jour : 1er Décembre 2025</p>
                </div>
            </div>

            <div className="space-y-6">
                <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-[var(--primary)]" /> Protection des Données
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
                        Nous prenons la sécurité de vos données très au sérieux. Toutes les informations collectées par nos boîtiers télématiques et notre plateforme sont chiffrées selon les standards industriels les plus stricts (AES-256).
                    </p>
                    <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span>Chiffrement de bout en bout des données de localisation</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span>Stockage sécurisé sur des serveurs certifiés ISO 27001</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span>Audits de sécurité réguliers par des tiers indépendants</span>
                        </li>
                    </ul>
                </section>

                <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-purple-500" /> Utilisation des Données
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
                        Les données collectées sont utilisées exclusivement pour fournir et améliorer nos services de gestion de flotte. Nous ne vendons jamais vos données à des tiers.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-2">Données Collectées</h4>
                            <ul className="list-disc list-inside text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                <li>Position GPS et vitesse</li>
                                <li>Données télémétriques (carburant, moteur)</li>
                                <li>Informations conducteur (si renseignées)</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-2">Finalités</h4>
                            <ul className="list-disc list-inside text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                <li>Suivi en temps réel et historique</li>
                                <li>Rapports d'activité et d'optimisation</li>
                                <li>Alertes de sécurité et maintenance</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-orange-500" /> Vos Droits (RGPD)
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
                        Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants concernant vos données personnelles :
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 p-3 border border-slate-100 dark:border-slate-700 rounded-lg">
                            <span className="w-6 h-6 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">1</span>
                            <span className="text-slate-600 dark:text-slate-300">Droit d'accès</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 border border-slate-100 dark:border-slate-700 rounded-lg">
                            <span className="w-6 h-6 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">2</span>
                            <span className="text-slate-600 dark:text-slate-300">Droit de rectification</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 border border-slate-100 dark:border-slate-700 rounded-lg">
                            <span className="w-6 h-6 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">3</span>
                            <span className="text-slate-600 dark:text-slate-300">Droit à l'effacement</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 border border-slate-100 dark:border-slate-700 rounded-lg">
                            <span className="w-6 h-6 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">4</span>
                            <span className="text-slate-600 dark:text-slate-300">Droit à la portabilité</span>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-500">
                            Pour exercer ces droits ou pour toute question, contactez notre DPO à <a href="mailto:dpo@trackyu.com" className="text-[var(--primary)] hover:underline">dpo@trackyu.com</a>.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};
