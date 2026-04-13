import React from 'react';
import { Info, Package, Shield, Globe, Mail, Heart } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="p-6 w-full space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Info className="w-10 h-10 text-[var(--primary)] dark:text-[var(--primary)]" />
        </div>
        <h2 className="text-3xl font-bold text-[var(--text-primary)]">À propos de Trackyu GPS</h2>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
          La solution de gestion de flotte la plus avancée pour optimiser vos opérations, réduire vos coûts et sécuriser
          vos actifs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
          <Package className="w-8 h-8 text-purple-500 mb-4" />
          <h3 className="font-bold text-[var(--text-primary)] mb-2">Version 1.0.3</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Dernière mise à jour le 17 Décembre 2025. Mode:{' '}
            {import.meta.env.VITE_USE_MOCK === 'true' ? 'SIMULATION' : 'PRODUCTION'}
          </p>
        </div>
        <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
          <Shield className="w-8 h-8 text-green-500 mb-4" />
          <h3 className="font-bold text-[var(--text-primary)] mb-2">Sécurité</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Certifié ISO 27001. Vos données sont chiffrées de bout en bout et hébergées sur des serveurs sécurisés.
          </p>
        </div>
        <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
          <Globe className="w-8 h-8 text-[var(--primary)] mb-4" />
          <h3 className="font-bold text-[var(--text-primary)] mb-2">Support 24/7</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Une équipe dédiée disponible à tout moment pour vous assister dans vos opérations critiques.
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-elevated)] rounded-xl p-8 border border-[var(--border)]">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Informations Légales</h3>
        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <p>
            <strong>Trackyu GPS Inc.</strong>
            <br />
            123 Avenue de l'Innovation
            <br />
            75001 Paris, France
          </p>
          <p>
            SIRET: 123 456 789 00012
            <br />
            TVA Intracommunautaire: FR 12 345678900
          </p>
          <div className="flex items-center gap-2 pt-4">
            <Mail className="w-4 h-4" />
            <a href="mailto:contact@trackyu.com" className="text-[var(--primary)] hover:underline">
              contact@trackyu.com
            </a>
          </div>
        </div>
      </div>

      <div className="text-center pt-8 border-t border-[var(--border)]">
        <p className="text-sm text-[var(--text-muted)] flex items-center justify-center gap-1">
          Fait avec <Heart className="w-3 h-3 text-red-500 fill-current" /> par l'équipe Trackyu GPS
        </p>
        <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-secondary)] mt-2">
          © 2025 Trackyu GPS. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};
