import React, { useState } from 'react';
import {
  Search,
  Book,
  FileText,
  MessageCircle,
  Phone,
  Mail,
  ChevronRight,
  ChevronDown,
  PlayCircle,
  HelpCircle,
  AlertCircle,
  Ticket,
  Wallet,
} from 'lucide-react';
import { CreateTicketModal } from './CreateTicketModal';
import { api } from '../../../services/apiLazy';

interface FaqItem {
  question: string;
  answer: string;
  category: string; // libellé affiché
  backendCategory: string; // id brut (ex: 'vehicles', 'billing') pour filtrage par thématique
}

interface MobileMoneyAccount {
  id: string;
  provider: 'ORANGE' | 'MTN' | 'MOOV' | 'WAVE' | 'OTHER';
  number: string;
  label?: string;
}

const MOBILE_MONEY_LABELS: Record<MobileMoneyAccount['provider'], string> = {
  ORANGE: 'Orange Money',
  MTN: 'MTN MoMo',
  MOOV: 'Moov Money',
  WAVE: 'Wave',
  OTHER: 'Mobile Money',
};

const FAQ_CATEGORY_LABELS: Record<string, string> = {
  'getting-started': 'Démarrage',
  dashboard: 'Tableau de bord',
  vehicles: 'Véhicules',
  map: 'Carte & GPS',
  tracking: 'Suivi GPS',
  alerts: 'Alertes',
  reports: 'Rapports',
  clients: 'Clients & CRM',
  billing: 'Facturation',
  account: 'Compte',
  settings: 'Paramètres',
  technical: 'Technique',
  api: 'API & Intégrations',
};

// Fallback minimal si l'API échoue — volontairement court, les vraies FAQ viennent du backend
const FALLBACK_FAQS: FaqItem[] = [
  {
    category: 'Compte',
    backendCategory: 'account',
    question: 'Comment changer mon mot de passe ?',
    answer: "Dans 'Mon compte' > 'Sécurité', cliquez sur 'Modifier le mot de passe'.",
  },
  {
    category: 'Véhicules',
    backendCategory: 'vehicles',
    question: "Pourquoi mon véhicule n'apparaît pas sur la carte ?",
    answer:
      "Vérifiez l'alimentation du boîtier GPS et la couverture réseau. Contactez le support si le problème persiste plus de 24h.",
  },
];

// Chaque bloc "thématique" filtre les FAQ par un sous-ensemble de catégories backend.
// Le mapping est explicite pour que l'utilisateur retrouve ses FAQ selon la zone fonctionnelle.
interface HelpTheme {
  id: string;
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  backendCategories: string[];
}

const CATEGORIES: HelpTheme[] = [
  {
    id: 'start',
    title: 'Démarrage Rapide',
    icon: PlayCircle,
    color: 'text-[var(--primary)] bg-[var(--primary-dim)]',
    backendCategories: ['getting-started', 'tracking', 'alerts'],
  },
  {
    id: 'account',
    title: 'Compte & Facturation',
    icon: UserIcon,
    color: 'text-[var(--primary)] bg-[var(--primary-dim)]',
    backendCategories: ['account', 'billing'],
  },
  {
    id: 'vehicles',
    title: 'Gestion de Flotte',
    icon: CarIcon,
    color: 'text-[var(--primary)] bg-[var(--primary-dim)]',
    backendCategories: ['vehicles'],
  },
  {
    id: 'reports',
    title: 'Rapports & Analyses',
    icon: FileText,
    color: 'text-[var(--primary)] bg-[var(--primary-dim)]',
    backendCategories: ['reports', 'api'],
  },
];

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function CarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M2 12h12" />
    </svg>
  );
}

const sanitizePhone = (raw?: string | null) => (raw ? raw.replace(/[^\d+]/g, '') : '');

export const HelpCenterView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [faqs, setFaqs] = useState<FaqItem[]>(FALLBACK_FAQS);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [tenantContact, setTenantContact] = useState<{
    supportPhone: string;
    supportEmail: string;
    supportWhatsapp: string;
    mobileMoneyAccounts: MobileMoneyAccount[];
  } | null>(null);

  React.useEffect(() => {
    const loadTenantContact = async () => {
      try {
        const data = await api.tenants.getCurrent();
        const s = data.settings || {};
        setTenantContact({
          supportPhone: s.supportPhone || s.phone || data.phone || '',
          supportEmail: s.supportEmail || s.email || data.email || '',
          supportWhatsapp: s.supportWhatsapp || '',
          mobileMoneyAccounts: Array.isArray(s.mobileMoneyAccounts) ? s.mobileMoneyAccounts : [],
        });
      } catch (err) {
        console.error('Failed to load tenant contact', err);
      }
    };
    loadTenantContact();
  }, []);

  React.useEffect(() => {
    // Charge les FAQ depuis le backend.
    // Le serveur filtre automatiquement par audience selon le rôle:
    //  - CLIENT / SOUS_COMPTE → FAQ audience = CLIENT ou ALL
    //  - Staff (MANAGER, SUPPORT_AGENT, TECH, ADMIN) → audience = STAFF ou ALL
    // Les FAQ globales sont stockées sous tenant_default + propres au tenant.
    const loadFaqs = async () => {
      try {
        const rows = await api.adminFeatures.helpArticles.list();
        if (!Array.isArray(rows) || rows.length === 0) return;
        const mapped: FaqItem[] = rows
          .filter((r: { type?: string; is_published?: boolean }) => r.type === 'faq' && r.is_published !== false)
          .map((r: { title: string; content: string; category?: string }) => {
            const cat = r.category || 'getting-started';
            return {
              category: FAQ_CATEGORY_LABELS[cat] || 'Général',
              backendCategory: cat,
              question: r.title,
              answer: r.content,
            };
          });
        if (mapped.length > 0) setFaqs(mapped);
      } catch (err) {
        console.error('Failed to load FAQs', err);
      }
    };
    loadFaqs();
  }, []);

  const activeTheme = selectedTheme ? CATEGORIES.find((c) => c.id === selectedTheme) : null;

  const filteredFaqs = faqs.filter((faq) => {
    if (activeTheme && !activeTheme.backendCategories.includes(faq.backendCategory)) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q);
    }
    return true;
  });

  const themeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const theme of CATEGORIES) {
      counts[theme.id] = faqs.filter((f) => theme.backendCategories.includes(f.backendCategory)).length;
    }
    return counts;
  }, [faqs]);

  // Regroupe les FAQ par catégorie backend pour l'affichage en blocs collapsables.
  const groupedFaqs = React.useMemo(() => {
    const groups = new Map<string, { label: string; items: FaqItem[] }>();
    for (const faq of filteredFaqs) {
      const existing = groups.get(faq.backendCategory);
      if (existing) existing.items.push(faq);
      else groups.set(faq.backendCategory, { label: faq.category, items: [faq] });
    }
    return Array.from(groups.entries());
  }, [filteredFaqs]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Si recherche ou thème actif → tous les groupes sont déroulés automatiquement.
  const isGroupExpanded = (key: string) => {
    if (searchTerm || activeTheme) return true;
    return expandedGroups.has(key);
  };
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
      {/* Hero Search Section */}
      <div className="bg-slate-900 text-white p-8 md:p-12 rounded-xl mb-6 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-dim)] rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--primary-dim)] rounded-full blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold">Comment pouvons-nous vous aider ?</h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher une réponse, un article..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
            />
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-8">
        {/* Quick Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Thématiques fréquentes</h2>
            {selectedTheme && (
              <button
                onClick={() => setSelectedTheme(null)}
                className="text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                Réinitialiser le filtre
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => {
              const isActive = selectedTheme === cat.id;
              const count = themeCounts[cat.id] ?? 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedTheme(isActive ? null : cat.id)}
                  className={`p-4 border rounded-xl transition-all text-left group ${
                    isActive
                      ? 'bg-[var(--primary-dim)] border-[var(--primary)] shadow-md'
                      : 'bg-[var(--bg-elevated)] border-[var(--border)] hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cat.color}`}>
                      <cat.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-secondary)]">{count}</span>
                  </div>
                  <h3
                    className={`font-bold transition-colors ${
                      isActive
                        ? 'text-[var(--primary)]'
                        : 'text-[var(--text-primary)] group-hover:text-[var(--primary)]'
                    }`}
                  >
                    {cat.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {isActive
                      ? 'Filtre actif'
                      : count > 0
                        ? `${count} question${count > 1 ? 's' : ''}`
                        : 'Aucune question'}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FAQ Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Book className="w-5 h-5 text-[var(--primary)]" />
                Questions Fréquentes
                {activeTheme && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--primary-dim)] text-[var(--primary)]">
                    {activeTheme.title}
                  </span>
                )}
              </h2>
              <span className="text-xs text-[var(--text-secondary)]">
                {filteredFaqs.length} résultat{filteredFaqs.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {groupedFaqs.length > 0 ? (
                groupedFaqs.map(([groupKey, group]) => {
                  const groupOpen = isGroupExpanded(groupKey);
                  return (
                    <div
                      key={groupKey}
                      className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleGroup(groupKey)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[var(--bg-elevated)]/50 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-bold text-[var(--text-primary)]">{group.label}</span>
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--primary-dim)] text-[var(--primary)]">
                            {group.items.length}
                          </span>
                        </div>
                        {groupOpen ? (
                          <ChevronDown className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
                        )}
                      </button>
                      {groupOpen && (
                        <div className="px-4 pb-4 pt-0 space-y-2 animate-in slide-in-from-top-2 duration-200">
                          <div className="h-px w-full bg-[var(--bg-surface)] mb-3"></div>
                          {group.items.map((faq) => {
                            const key = `${groupKey}:${faq.question}`;
                            const isOpen = expandedFaq === key;
                            return (
                              <div
                                key={key}
                                className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden"
                              >
                                <button
                                  onClick={() => setExpandedFaq(isOpen ? null : key)}
                                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--bg-elevated)]/40 transition-colors gap-3"
                                >
                                  <span className="font-medium text-sm text-[var(--text-primary)] flex-1">
                                    {faq.question}
                                  </span>
                                  {isOpen ? (
                                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                                  )}
                                </button>
                                {isOpen && (
                                  <div className="px-4 pb-3 pt-0 text-[var(--text-secondary)] text-sm animate-in slide-in-from-top-1 duration-150">
                                    <div className="h-px w-full bg-[var(--border)] mb-3"></div>
                                    <div className="whitespace-pre-line leading-relaxed">{faq.answer}</div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 bg-[var(--bg-elevated)] rounded-xl border border-dashed border-[var(--border)]">
                  <HelpCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">
                    {searchTerm
                      ? `Aucun résultat trouvé pour "${searchTerm}"`
                      : activeTheme
                        ? `Aucune question dans "${activeTheme.title}"`
                        : 'Aucune question disponible'}
                  </p>
                  {(searchTerm || activeTheme) && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedTheme(null);
                      }}
                      className="mt-3 text-sm font-semibold text-[var(--primary)] hover:underline"
                    >
                      Voir toutes les questions
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact & Resources Sidebar */}
          <div className="space-y-6">
            <div className="bg-[var(--primary-dim)] border border-[var(--primary)]/30 rounded-xl p-6">
              <h3 className="font-bold text-[var(--primary)] mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Besoin d'aide supplémentaire ?
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="w-full flex items-center gap-3 p-3 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] shadow-sm transition-all text-sm font-medium justify-center"
                >
                  <Ticket className="w-4 h-4" />
                  Ouvrir un ticket
                </button>

                {tenantContact?.supportWhatsapp && (
                  <a
                    href={`https://wa.me/${sanitizePhone(tenantContact.supportWhatsapp).replace(/^\+/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:shadow-sm transition-all text-sm font-medium"
                  >
                    <MessageCircle className="w-4 h-4 text-[var(--primary)]" />
                    WhatsApp
                  </a>
                )}

                {tenantContact?.supportEmail && (
                  <a
                    href={`mailto:${tenantContact.supportEmail}`}
                    className="w-full flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:shadow-sm transition-all text-sm font-medium"
                  >
                    <Mail className="w-4 h-4 text-[var(--primary)]" />
                    {tenantContact.supportEmail}
                  </a>
                )}

                {tenantContact?.supportPhone && (
                  <a
                    href={`tel:${sanitizePhone(tenantContact.supportPhone)}`}
                    className="w-full flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:shadow-sm transition-all text-sm font-medium"
                  >
                    <Phone className="w-4 h-4 text-[var(--primary)]" />
                    {tenantContact.supportPhone}
                  </a>
                )}
              </div>
            </div>

            {tenantContact && tenantContact.mobileMoneyAccounts.length > 0 && (
              <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[var(--primary)]" />
                  Moyens de paiement
                </h3>
                <ul className="space-y-3">
                  {tenantContact.mobileMoneyAccounts.map((mm) => (
                    <li key={mm.id} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{MOBILE_MONEY_LABELS[mm.provider]}</div>
                        {mm.label && <div className="text-xs text-[var(--text-secondary)]">{mm.label}</div>}
                      </div>
                      <span className="font-mono text-[var(--text-secondary)]">{mm.number}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateTicketModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} />
    </div>
  );
};
