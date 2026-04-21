import React from 'react';
import { Info, Package, Mail, Globe } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="p-6 w-full space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-[var(--primary-dim)] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Info className="w-10 h-10 text-[var(--primary)]" />
        </div>
        <h2 className="text-3xl font-bold text-[var(--text-primary)]">À propos de Trackyu GPS</h2>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
          Solution de gestion de flotte conçue en Côte d'Ivoire pour optimiser vos opérations, réduire vos coûts et
          sécuriser vos actifs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm">
          <Package className="w-8 h-8 text-[var(--primary)] mb-4" />
          <h3 className="font-bold text-[var(--text-primary)] mb-2">Version 1.0.0</h3>
          <p className="text-sm text-[var(--text-secondary)]">Mise à jour avril 2026.</p>
        </div>
        <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm">
          <Globe className="w-8 h-8 text-[var(--primary)] mb-4" />
          <h3 className="font-bold text-[var(--text-primary)] mb-2">Site web</h3>
          <a
            href="https://www.trackyugps.com"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--primary)] hover:underline break-all"
          >
            www.trackyugps.com
          </a>
        </div>
        <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm">
          <Mail className="w-8 h-8 text-[var(--primary)] mb-4" />
          <h3 className="font-bold text-[var(--text-primary)] mb-2">Contact</h3>
          <a
            href="mailto:info@trackyugps.com"
            className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
          >
            <Mail className="w-4 h-4" />
            info@trackyugps.com
          </a>
        </div>
      </div>

      <div className="text-center pt-8 border-t border-[var(--border)]">
        <p className="text-sm text-[var(--text-muted)]">Fait par l'équipe Trackyu GPS</p>
        <p className="text-xs text-[var(--text-muted)] mt-2">© 2025 Trackyu GPS. Tous droits réservés.</p>
      </div>
    </div>
  );
};
