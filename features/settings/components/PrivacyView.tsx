import React from 'react';
import { Shield, Lock, Eye, FileText, CheckCircle } from 'lucide-react';

export const PrivacyView: React.FC = () => {
  return (
    <div className="p-6 w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-[var(--clr-success-muted)] rounded-xl">
          <Shield className="w-8 h-8 text-[var(--clr-success)]" />
        </div>
        <div>
          <h2 className="page-title">Politique de Confidentialité</h2>
          <p className="text-[var(--text-secondary)]">Dernière mise à jour : 1er Décembre 2025</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-[var(--primary)]" /> Protection des Données
          </h3>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
            Nous prenons la sécurité de vos données très au sérieux. Toutes les informations collectées par nos boîtiers
            télématiques et notre plateforme sont chiffrées selon les standards industriels les plus stricts (AES-256).
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Chiffrement de bout en bout des données de localisation</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Stockage sécurisé sur des serveurs certifiés ISO 27001</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Audits de sécurité réguliers par des tiers indépendants</span>
            </li>
          </ul>
        </section>

        <section className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-500" /> Utilisation des Données
          </h3>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
            Les données collectées sont utilisées exclusivement pour fournir et améliorer nos services de gestion de
            flotte. Nous ne vendons jamais vos données à des tiers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
              <h4 className="font-bold text-[var(--text-primary)] text-sm mb-2">Données Collectées</h4>
              <ul className="list-disc list-inside text-xs text-[var(--text-secondary)] space-y-1">
                <li>Position GPS et vitesse</li>
                <li>Données télémétriques (carburant, moteur)</li>
                <li>Informations conducteur (si renseignées)</li>
              </ul>
            </div>
            <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
              <h4 className="font-bold text-[var(--text-primary)] text-sm mb-2">Finalités</h4>
              <ul className="list-disc list-inside text-xs text-[var(--text-secondary)] space-y-1">
                <li>Suivi en temps réel et historique</li>
                <li>Rapports d'activité et d'optimisation</li>
                <li>Alertes de sécurité et maintenance</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" /> Vos Droits (RGPD)
          </h3>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants
            concernant vos données personnelles :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 p-3 border border-[var(--border)] border-[var(--border)] rounded-lg">
              <span className="w-6 h-6 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span className="text-[var(--text-secondary)]">Droit d'accès</span>
            </div>
            <div className="flex items-center gap-2 p-3 border border-[var(--border)] border-[var(--border)] rounded-lg">
              <span className="w-6 h-6 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span className="text-[var(--text-secondary)]">Droit de rectification</span>
            </div>
            <div className="flex items-center gap-2 p-3 border border-[var(--border)] border-[var(--border)] rounded-lg">
              <span className="w-6 h-6 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span className="text-[var(--text-secondary)]">Droit à l'effacement</span>
            </div>
            <div className="flex items-center gap-2 p-3 border border-[var(--border)] border-[var(--border)] rounded-lg">
              <span className="w-6 h-6 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span className="text-[var(--text-secondary)]">Droit à la portabilité</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-[var(--border)] border-[var(--border)]">
            <p className="text-xs text-[var(--text-secondary)]">
              Pour exercer ces droits ou pour toute question, contactez notre DPO à{' '}
              <a href="mailto:dpo@trackyu.com" className="text-[var(--primary)] hover:underline">
                dpo@trackyu.com
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
