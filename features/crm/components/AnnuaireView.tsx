/**
 * AnnuaireView — Annuaire des contacts (tiers)
 * Affichage tabulaire avec multi-sélection et exports CSV / TXT téléphones / TXT emails.
 */
import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../../contexts/DataContext';
import { Search, Download, Copy, Check, Phone, Mail, FileText, Users, X, CheckSquare, Square } from 'lucide-react';
import type { Tier, TierType } from '../../../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const TYPE_LABELS: Record<string, string> = {
  CLIENT: 'Client',
  RESELLER: 'Revendeur',
  SUPPLIER: 'Fournisseur',
  PARTNER: 'Partenaire',
  PROSPECT: 'Prospect',
};

const TYPE_COLORS: Record<string, string> = {
  CLIENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  RESELLER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  SUPPLIER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  PARTNER: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  PROSPECT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

// ── Composant ──────────────────────────────────────────────────────────────────

export const AnnuaireView: React.FC = () => {
  const { tiers, invoices } = useDataContext();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TierType | 'ALL'>('CLIENT');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [filterSector, setFilterSector] = useState('');
  const [filterImpaye, setFilterImpaye] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ── Clients avec au moins une facture impayée ───────────────────────────────
  const impayes = useMemo(() => {
    // Statuts considérés comme "soldés" — le reste est impayé
    const PAID = new Set(['PAID', 'PAYÉ', 'CANCELLED', 'CANCELED', 'DRAFT']);
    const ids = new Set<string>(); // match par tier.id
    const names = new Set<string>(); // fallback match par tier.name (normalised)
    for (const inv of invoices) {
      const st = (inv.status || '').toUpperCase();
      if (PAID.has(st)) continue;
      // clientId est mappé depuis tier_id || client_id dans finance.ts
      const ref = inv.clientId || (inv as any).tier_id || (inv as any).client_id || '';
      if (ref) ids.add(ref);
      // Fallback : nom du client (clientName mappé depuis tier_name)
      const nm = (inv.clientName || (inv as any).tier_name || '').toLowerCase().trim();
      if (nm) names.add(nm);
    }
    return { ids, names };
  }, [invoices]);

  // ── Secteurs disponibles dans les données ───────────────────────────────────
  const sectorOptions = useMemo(() => {
    const set = new Set<string>();
    tiers.forEach((t) => {
      const s = t.clientData?.sector;
      if (s && s.trim()) set.add(s.trim());
    });
    return [...set].sort();
  }, [tiers]);

  // ── Données filtrées ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tiers.filter((t) => {
      if (filterType !== 'ALL' && t.type !== filterType) return false;
      if (filterStatus === 'ACTIVE' && t.status !== 'ACTIVE') return false;
      if (filterStatus === 'INACTIVE' && t.status === 'ACTIVE') return false;
      if (filterImpaye && !impayes.ids.has(t.id) && !impayes.names.has(t.name.toLowerCase().trim())) return false;
      if (filterSector && (t.clientData?.sector || '').trim() !== filterSector) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.phone || '').includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.city || '').toLowerCase().includes(q) ||
        (t.clientData?.sector || '').toLowerCase().includes(q)
      );
    });
  }, [tiers, invoices, search, filterType, filterStatus, filterImpaye, filterSector, impayes]);

  // Contacts sélectionnés (parmi filtered)
  const selected = useMemo(() => filtered.filter((t) => selectedIds.has(t.id)), [filtered, selectedIds]);
  const exportSource = selected.length > 0 ? selected : filtered;
  const allSelected = filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id));

  // ── Sélection ───────────────────────────────────────────────────────────────
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((t) => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((t) => next.add(t.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ── Exports ─────────────────────────────────────────────────────────────────
  const buildCSV = (contacts: Tier[]) => {
    const header = 'Nom;Téléphone;Email;Type;Secteur;Ville;Statut';
    const rows = contacts.map((t) =>
      [
        t.name,
        t.phone || '',
        t.email || '',
        TYPE_LABELS[t.type] || t.type,
        t.clientData?.sector || '',
        t.city || '',
        t.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(';')
    );
    return [header, ...rows].join('\n');
  };

  const buildPhonesTxt = (contacts: Tier[]) =>
    contacts
      .filter((t) => t.phone)
      .map((t) => `${t.name};${t.phone}`)
      .join('\n');

  const buildEmailsTxt = (contacts: Tier[]) =>
    contacts
      .map((t) => t.email || '')
      .filter(Boolean)
      .join(',');

  const handleExportCSV = () =>
    downloadFile(buildCSV(exportSource), `annuaire_${Date.now()}.csv`, 'text/csv;charset=utf-8;');

  const handleExportPhones = () =>
    downloadFile(buildPhonesTxt(exportSource), `telephones_${Date.now()}.txt`, 'text/plain;charset=utf-8;');

  const handleExportEmails = () =>
    downloadFile(buildEmailsTxt(exportSource), `emails_${Date.now()}.txt`, 'text/plain;charset=utf-8;');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  // ── Totaux ──────────────────────────────────────────────────────────────────
  const phonesCount = exportSource.filter((t) => t.phone).length;
  const emailsCount = exportSource.filter((t) => t.email).length;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* ── Barre outils ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, téléphone, email, ville…"
            className="w-full pl-8 pr-8 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          )}
        </div>

        {/* Filtre type */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as TierType | 'ALL')}
          className="text-xs border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--bg-elevated)]"
        >
          <option value="ALL">Tous les types</option>
          <option value="CLIENT">Clients</option>
          <option value="RESELLER">Revendeurs</option>
          <option value="SUPPLIER">Fournisseurs</option>
          <option value="PARTNER">Partenaires</option>
          <option value="PROSPECT">Prospects</option>
        </select>

        {/* Filtre statut */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
          className="text-xs border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--bg-elevated)]"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="ACTIVE">Actifs</option>
          <option value="INACTIVE">Inactifs</option>
        </select>

        {/* Filtre secteur */}
        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="text-xs border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--bg-elevated)] max-w-[160px]"
        >
          <option value="">Tous les secteurs</option>
          {sectorOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Filtre impayés */}
        <button
          onClick={() => setFilterImpaye((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap ${
            filterImpaye
              ? 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
              : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          {filterImpaye ? <Check className="w-3 h-3" /> : null}
          En impayés
        </button>

        {/* Compteur */}
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {filtered.length} contact{filtered.length > 1 ? 's' : ''}
          {selected.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-[var(--primary-dim)] text-[var(--primary)] rounded-full text-[10px] font-bold">
              {selected.length} sélectionné{selected.length > 1 ? 's' : ''}
            </span>
          )}
        </span>

        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
            title="Exporter en CSV"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            CSV
          </button>

          {/* Export TXT téléphones */}
          <button
            onClick={handleExportPhones}
            disabled={phonesCount === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={`Télécharger ${phonesCount} numéros (TXT)`}
          >
            <Phone className="w-3.5 h-3.5 text-blue-500" />
            TXT Tél ({phonesCount})
          </button>

          {/* Copier téléphones */}
          <button
            onClick={() => copyToClipboard(buildPhonesTxt(exportSource), 'phones')}
            disabled={phonesCount === 0}
            className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-40"
            title="Copier les numéros"
          >
            {copiedKey === 'phones' ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Export TXT emails */}
          <button
            onClick={handleExportEmails}
            disabled={emailsCount === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={`Télécharger ${emailsCount} emails séparés par virgule`}
          >
            <Mail className="w-3.5 h-3.5 text-indigo-500" />
            Emails ({emailsCount})
          </button>

          {/* Copier emails */}
          <button
            onClick={() => copyToClipboard(buildEmailsTxt(exportSource), 'emails')}
            disabled={emailsCount === 0}
            className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-40"
            title="Copier les emails"
          >
            {copiedKey === 'emails' ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Indication source export */}
      {selected.length === 0 && filtered.length > 0 && (
        <p className="text-[10px] text-[var(--text-muted)] -mt-1">
          Aucune sélection → export sur les {filtered.length} contacts filtrés. Cochez des lignes pour restreindre.
        </p>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)] gap-2">
            <Users className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">Aucun contact trouvé</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-elevated)] sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <button onClick={toggleAll} className="text-[var(--text-muted)] hover:text-[var(--primary)]">
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                  Nom
                </th>
                <th className="px-3 py-2.5 text-left font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                  Téléphone
                </th>
                <th className="px-3 py-2.5 text-left font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                  Email
                </th>
                <th className="px-3 py-2.5 text-left font-bold text-[var(--text-secondary)] uppercase tracking-wide w-24">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                  Secteur
                </th>
                <th className="px-3 py-2.5 text-left font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                  Ville
                </th>
                <th className="px-3 py-2.5 text-left font-bold text-[var(--text-secondary)] uppercase tracking-wide w-20">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((tier) => {
                const isSelected = selectedIds.has(tier.id);
                return (
                  <tr
                    key={tier.id}
                    onClick={() => toggleOne(tier.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[var(--primary-dim)]/30 dark:bg-[var(--primary-dim)]/20'
                        : 'hover:bg-[var(--bg-elevated)]/60'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div
                        className="text-[var(--text-muted)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOne(tier.id);
                        }}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{tier.name}</td>
                    <td className="px-3 py-2">
                      {tier.phone ? (
                        <a
                          href={`tel:${tier.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[var(--primary)] hover:underline font-mono"
                        >
                          {tier.phone}
                        </a>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {tier.email ? (
                        <a
                          href={`mailto:${tier.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[var(--primary)] hover:underline truncate block max-w-[200px]"
                        >
                          {tier.email}
                        </a>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          TYPE_COLORS[tier.type] || 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {TYPE_LABELS[tier.type] || tier.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] text-[11px]">
                      {tier.clientData?.sector || '—'}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{tier.city || '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          tier.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                        }`}
                      >
                        {tier.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer résumé ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] flex-wrap">
        <span className="flex items-center gap-1">
          <Download className="w-3 h-3" />
          Export sur <strong className="text-[var(--text-primary)]">{exportSource.length}</strong> contact
          {exportSource.length > 1 ? 's' : ''}
          {selected.length > 0 ? ' sélectionnés' : ' filtrés'}
        </span>
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3 text-blue-400" />
          <strong className="text-[var(--text-primary)]">{phonesCount}</strong> numéros
        </span>
        <span className="flex items-center gap-1">
          <Mail className="w-3 h-3 text-indigo-400" />
          <strong className="text-[var(--text-primary)]">{emailsCount}</strong> emails
        </span>
      </div>
    </div>
  );
};
