/**
 * Client Reconciliation Component
 * Gère la correspondance entre les clients des différentes sources
 * (TRAKZEE, Zoho Books, Zoho Invoice)
 *
 * Fonctionnalités:
 * - Détection automatique des correspondances (fuzzy matching)
 * - Fusion manuelle des clients
 * - Création de nouveaux clients
 * - Résolution des conflits de noms
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  Link2,
  Link2Off,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Download,
  Upload,
  Merge,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Filter,
  ArrowRight,
  Building2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  ArrowLeftRight,
  Save,
  FileSpreadsheet,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface SourceClient {
  id: string;
  source: 'TRAKZEE' | 'ZOHO_BOOKS' | 'ZOHO_INVOICE';
  name: string;
  normalizedName: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  vehicleCount?: number;
  balance?: number;
  status: 'active' | 'inactive';
  createdAt: string;
  raw: any; // Original data
}

interface ClientMatch {
  id: string;
  targetClient?: TargetClient;
  sources: {
    trakzee?: SourceClient;
    zohoBooks?: SourceClient;
    zohoInvoice?: SourceClient;
  };
  matchScore: number; // 0-100
  matchType: 'exact' | 'partial' | 'manual' | 'none';
  status: 'matched' | 'review' | 'new' | 'conflict';
  notes?: string;
}

interface TargetClient {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  resellerId?: string;
  status: 'active' | 'inactive';
}

interface ReconciliationStats {
  total: number;
  matched: number;
  review: number;
  new: number;
  conflicts: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Normalize name for comparison
const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\b(sarl|sa|sas|eurl|srl|ltd|llc|inc|gmbh|s\.a\.)\b/gi, '') // Remove company suffixes
    .trim();
};

// Calculate similarity score between two strings (Levenshtein-based)
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);

  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 85;

  // Levenshtein distance
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  const maxLen = Math.max(len1, len2);
  return Math.round((1 - matrix[len1][len2] / maxLen) * 100);
};

// Find best match for a client in a list
const findBestMatch = (
  client: SourceClient,
  candidates: SourceClient[],
  threshold = 70
): { match: SourceClient | null; score: number } => {
  let bestMatch: SourceClient | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    if (candidate.id === client.id && candidate.source === client.source) continue;

    // Check exact email match first
    if (client.email && candidate.email && client.email.toLowerCase() === candidate.email.toLowerCase()) {
      return { match: candidate, score: 100 };
    }

    // Check exact phone match
    if (client.phone && candidate.phone) {
      const p1 = client.phone.replace(/\D/g, '');
      const p2 = candidate.phone.replace(/\D/g, '');
      if (p1.length > 6 && p1 === p2) {
        return { match: candidate, score: 95 };
      }
    }

    // Name similarity
    const nameScore = calculateSimilarity(client.name, candidate.name);
    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestMatch = candidate;
    }
  }

  return bestScore >= threshold ? { match: bestMatch, score: bestScore } : { match: null, score: bestScore };
};

// ============================================================================
// COMPONENT
// ============================================================================

interface ClientReconciliationProps {
  trakzeeClients: SourceClient[];
  zohoBooksClients: SourceClient[];
  zohoInvoiceClients: SourceClient[];
  existingClients: TargetClient[];
  onSave: (matches: ClientMatch[]) => void;
  onCancel: () => void;
}

export const ClientReconciliation: React.FC<ClientReconciliationProps> = ({
  trakzeeClients,
  zohoBooksClients,
  zohoInvoiceClients,
  existingClients,
  onSave,
  onCancel,
}) => {
  const [matches, setMatches] = useState<ClientMatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'matched' | 'review' | 'new' | 'conflict'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Run reconciliation
  const runReconciliation = useCallback(async () => {
    setIsProcessing(true);

    // Simulate async processing
    await new Promise((resolve) => setTimeout(resolve, 500));

    const allSources: SourceClient[] = [...trakzeeClients, ...zohoBooksClients, ...zohoInvoiceClients];

    const matchResults: ClientMatch[] = [];
    const processed = new Set<string>();

    // Group by normalized name first
    const nameGroups = new Map<string, SourceClient[]>();
    allSources.forEach((client) => {
      const key = client.normalizedName || normalizeName(client.name);
      if (!nameGroups.has(key)) nameGroups.set(key, []);
      nameGroups.get(key)!.push(client);
    });

    // Process each group
    nameGroups.forEach((clients, normalizedName) => {
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const sources: ClientMatch['sources'] = {};
      clients.forEach((c) => {
        const key = c.source === 'TRAKZEE' ? 'trakzee' : c.source === 'ZOHO_BOOKS' ? 'zohoBooks' : 'zohoInvoice';
        if (!sources[key]) sources[key] = c;
        processed.add(`${c.source}_${c.id}`);
      });

      // Check existing clients
      let targetClient: TargetClient | undefined;
      let matchScore = 0;

      for (const existing of existingClients) {
        const score = calculateSimilarity(normalizedName, normalizeName(existing.name));
        if (score > matchScore && score >= 70) {
          matchScore = score;
          targetClient = existing;
        }
      }

      const sourceCount = Object.keys(sources).length;
      const hasConflict =
        sourceCount > 1 &&
        clients.some((c, i) => clients.some((c2, j) => i !== j && calculateSimilarity(c.name, c2.name) < 95));

      matchResults.push({
        id: matchId,
        targetClient,
        sources,
        matchScore,
        matchType: matchScore >= 95 ? 'exact' : matchScore >= 70 ? 'partial' : 'none',
        status: hasConflict ? 'conflict' : targetClient ? 'matched' : sourceCount === 1 ? 'new' : 'review',
      });
    });

    // Sort by status priority
    matchResults.sort((a, b) => {
      const priority = { conflict: 0, review: 1, new: 2, matched: 3 };
      return priority[a.status] - priority[b.status];
    });

    setMatches(matchResults);
    setIsProcessing(false);
  }, [trakzeeClients, zohoBooksClients, zohoInvoiceClients, existingClients]);

  // Calculate stats
  const stats = useMemo<ReconciliationStats>(() => {
    return {
      total: matches.length,
      matched: matches.filter((m) => m.status === 'matched').length,
      review: matches.filter((m) => m.status === 'review').length,
      new: matches.filter((m) => m.status === 'new').length,
      conflicts: matches.filter((m) => m.status === 'conflict').length,
    };
  }, [matches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filter !== 'all' && m.status !== filter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const names = [
          m.sources.trakzee?.name,
          m.sources.zohoBooks?.name,
          m.sources.zohoInvoice?.name,
          m.targetClient?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!names.includes(query)) return false;
      }
      return true;
    });
  }, [matches, filter, searchQuery]);

  // Toggle row expansion
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Approve match (mark as matched)
  const approveMatch = (id: string) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'matched' as const, matchType: 'manual' as const } : m))
    );
  };

  // Mark as new client
  const markAsNew = (id: string) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'new' as const, targetClient: undefined } : m))
    );
  };

  // Get source badge color
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'TRAKZEE':
        return 'bg-[var(--primary-dim)] text-[var(--primary)]';
      case 'ZOHO_BOOKS':
        return 'bg-green-100 text-green-700';
      case 'ZOHO_INVOICE':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-[var(--bg-elevated)] text-[var(--text-primary)]';
    }
  };

  // Get status badge
  const getStatusBadge = (status: ClientMatch['status']) => {
    const config = {
      matched: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Correspondance' },
      review: { color: 'bg-yellow-100 text-yellow-700', icon: Eye, label: 'À vérifier' },
      new: { color: 'bg-[var(--primary-dim)] text-[var(--primary)]', icon: Plus, label: 'Nouveau' },
      conflict: { color: 'bg-red-100 text-red-700', icon: AlertTriangle, label: 'Conflit' },
    };
    const c = config[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
        <c.icon className="w-3 h-3" />
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[var(--primary)]" />
            Réconciliation des Clients
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Faites correspondre les clients entre TRAKZEE et Zoho
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runReconciliation}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {matches.length === 0 ? 'Analyser' : 'Réanalyser'}
          </button>
        </div>
      </div>

      {/* Source Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--primary)] dark:text-[var(--primary)] font-medium mb-1">
            <Building2 className="w-4 h-4" />
            TRAKZEE
          </div>
          <p className="text-2xl font-bold text-[var(--primary)] dark:text-[var(--primary)]">{trakzeeClients.length}</p>
          <p className="text-xs text-[var(--primary)]">clients</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium mb-1">
            <Building2 className="w-4 h-4" />
            Zoho Books (ABIDJAN GPS)
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">{zohoBooksClients.length}</p>
          <p className="text-xs text-green-600">contacts</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium mb-1">
            <Building2 className="w-4 h-4" />
            Zoho Invoice (SMARTRACK)
          </div>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{zohoInvoiceClients.length}</p>
          <p className="text-xs text-purple-600">contacts</p>
        </div>
      </div>

      {/* Stats & Filters */}
      {matches.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-elevated)] p-4 rounded-lg border border-[var(--border)]">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              Tous ({stats.total})
            </button>
            <button
              onClick={() => setFilter('matched')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'matched'
                  ? 'bg-green-100 text-green-700'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Correspondances ({stats.matched})
              </span>
            </button>
            <button
              onClick={() => setFilter('review')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'review'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />À vérifier ({stats.review})
              </span>
            </button>
            <button
              onClick={() => setFilter('new')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'new'
                  ? 'bg-[var(--primary-dim)] text-[var(--primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <span className="flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                Nouveaux ({stats.new})
              </span>
            </button>
            <button
              onClick={() => setFilter('conflict')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'conflict'
                  ? 'bg-red-100 text-red-700'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Conflits ({stats.conflicts})
              </span>
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
        </div>
      )}

      {/* Matches Table */}
      {matches.length > 0 && (
        <div className="bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-elevated)]">
                <tr className="text-[var(--text-secondary)] text-xs uppercase">
                  <th className="px-4 py-3 text-left w-8"></th>
                  <th className="px-4 py-3 text-left">TRAKZEE</th>
                  <th className="px-4 py-3 text-left">Zoho Books</th>
                  <th className="px-4 py-3 text-left">Zoho Invoice</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredMatches.map((match) => {
                  const isExpanded = expandedIds.has(match.id);
                  return (
                    <React.Fragment key={match.id}>
                      <tr className="hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)]/50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpand(match.id)}
                            className="p-1 hover:bg-[var(--bg-elevated)] rounded"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {match.sources.trakzee ? (
                            <div>
                              <span className="font-medium text-[var(--text-primary)]">
                                {match.sources.trakzee.name}
                              </span>
                              {match.sources.trakzee.vehicleCount && (
                                <span className="ml-2 text-xs text-[var(--text-muted)]">
                                  ({match.sources.trakzee.vehicleCount} véh.)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)] italic">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {match.sources.zohoBooks ? (
                            <span className="font-medium text-[var(--text-primary)]">
                              {match.sources.zohoBooks.name}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] italic">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {match.sources.zohoInvoice ? (
                            <span className="font-medium text-[var(--text-primary)]">
                              {match.sources.zohoInvoice.name}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] italic">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold ${
                              match.matchScore >= 90
                                ? 'bg-green-100 text-green-700'
                                : match.matchScore >= 70
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {match.matchScore}%
                          </span>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(match.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {match.status !== 'matched' && (
                              <button
                                onClick={() => approveMatch(match.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Approuver la correspondance"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {match.status !== 'new' && (
                              <button
                                onClick={() => markAsNew(match.id)}
                                className="p-1.5 text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded"
                                title="Créer comme nouveau"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr className="bg-[var(--bg-elevated)]/50">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                              {/* TRAKZEE Details */}
                              <div
                                className={`p-3 rounded-lg border ${match.sources.trakzee ? 'bg-[var(--primary-dim)] border-[var(--border)]' : 'bg-[var(--bg-elevated)] border-[var(--border)]'}`}
                              >
                                <div className="font-semibold text-[var(--primary)] mb-2">TRAKZEE</div>
                                {match.sources.trakzee ? (
                                  <div className="space-y-1 text-[var(--text-secondary)]">
                                    <p>
                                      <strong>Nom:</strong> {match.sources.trakzee.name}
                                    </p>
                                    <p>
                                      <strong>Email:</strong> {match.sources.trakzee.email || '-'}
                                    </p>
                                    <p>
                                      <strong>Tél:</strong> {match.sources.trakzee.phone || '-'}
                                    </p>
                                    <p>
                                      <strong>Ville:</strong> {match.sources.trakzee.city || '-'}
                                    </p>
                                    <p>
                                      <strong>Véhicules:</strong> {match.sources.trakzee.vehicleCount || 0}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-[var(--text-muted)] italic">Pas de correspondance</p>
                                )}
                              </div>

                              {/* Zoho Books Details */}
                              <div
                                className={`p-3 rounded-lg border ${match.sources.zohoBooks ? 'bg-green-50 border-green-200' : 'bg-[var(--bg-elevated)] border-[var(--border)]'}`}
                              >
                                <div className="font-semibold text-green-700 mb-2">Zoho Books (ABIDJAN GPS)</div>
                                {match.sources.zohoBooks ? (
                                  <div className="space-y-1 text-[var(--text-secondary)]">
                                    <p>
                                      <strong>Nom:</strong> {match.sources.zohoBooks.name}
                                    </p>
                                    <p>
                                      <strong>Société:</strong> {match.sources.zohoBooks.company || '-'}
                                    </p>
                                    <p>
                                      <strong>Email:</strong> {match.sources.zohoBooks.email || '-'}
                                    </p>
                                    <p>
                                      <strong>Tél:</strong> {match.sources.zohoBooks.phone || '-'}
                                    </p>
                                    <p>
                                      <strong>Solde:</strong> {match.sources.zohoBooks.balance?.toLocaleString() || 0}{' '}
                                      FCFA
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-[var(--text-muted)] italic">Pas de correspondance</p>
                                )}
                              </div>

                              {/* Zoho Invoice Details */}
                              <div
                                className={`p-3 rounded-lg border ${match.sources.zohoInvoice ? 'bg-purple-50 border-purple-200' : 'bg-[var(--bg-elevated)] border-[var(--border)]'}`}
                              >
                                <div className="font-semibold text-purple-700 mb-2">Zoho Invoice (SMARTRACK)</div>
                                {match.sources.zohoInvoice ? (
                                  <div className="space-y-1 text-[var(--text-secondary)]">
                                    <p>
                                      <strong>Nom:</strong> {match.sources.zohoInvoice.name}
                                    </p>
                                    <p>
                                      <strong>Société:</strong> {match.sources.zohoInvoice.company || '-'}
                                    </p>
                                    <p>
                                      <strong>Email:</strong> {match.sources.zohoInvoice.email || '-'}
                                    </p>
                                    <p>
                                      <strong>Tél:</strong> {match.sources.zohoInvoice.phone || '-'}
                                    </p>
                                    <p>
                                      <strong>Solde:</strong> {match.sources.zohoInvoice.balance?.toLocaleString() || 0}{' '}
                                      FCFA
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-[var(--text-muted)] italic">Pas de correspondance</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {matches.length === 0 && !isProcessing && (
        <div className="text-center py-12 bg-[var(--bg-elevated)] rounded-lg border border-dashed border-[var(--border)]">
          <Users className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <h4 className="text-lg font-medium text-[var(--text-secondary)] mb-2">Prêt pour la réconciliation</h4>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Cliquez sur "Analyser" pour détecter les correspondances entre les sources
          </p>
          <button
            onClick={runReconciliation}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
          >
            <RefreshCw className="w-4 h-4" />
            Lancer l'analyse
          </button>
        </div>
      )}

      {/* Actions */}
      {matches.length > 0 && (
        <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]">
          <div className="text-sm text-[var(--text-secondary)]">
            {selectedIds.size > 0
              ? `${selectedIds.size} client(s) sélectionné(s)`
              : `${stats.matched} correspondances validées`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            >
              Annuler
            </button>
            <button
              onClick={() => onSave(matches)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save className="w-4 h-4" />
              Sauvegarder les correspondances
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientReconciliation;
