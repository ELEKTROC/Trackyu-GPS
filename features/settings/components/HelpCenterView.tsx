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
  ExternalLink,
  PlayCircle,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  Ticket,
  X,
  Send,
  Shield,
  Scale,
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { CreateTicketModal } from './CreateTicketModal';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/apiLazy';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    category: 'Général',
    question: 'Comment changer mon mot de passe ?',
    answer:
      "Vous pouvez changer votre mot de passe dans la section 'Mon compte' de vos paramètres. Cliquez sur 'Sécurité' puis 'Modifier le mot de passe'.",
  },
  {
    category: 'Général',
    question: 'Comment ajouter un nouvel utilisateur ?',
    answer:
      "Seuls les administrateurs peuvent ajouter des utilisateurs. Allez dans 'Gestion' > 'Utilisateurs' et cliquez sur le bouton 'Nouveau'.",
  },
  {
    category: 'Véhicules',
    question: "Pourquoi mon véhicule n'apparaît pas sur la carte ?",
    answer:
      "Vérifiez d'abord si le boîtier GPS est bien alimenté. Si le véhicule est en sous-sol, il peut avoir perdu le signal GPS. Contactez le support si le problème persiste plus de 24h.",
  },
  {
    category: 'Rapports',
    question: "Comment exporter un rapport d'activité ?",
    answer:
      "Dans le module 'Rapports', sélectionnez le type de rapport souhaité, définissez la période et cliquez sur le bouton 'Exporter' en haut à droite.",
  },
  {
    category: 'Facturation',
    question: 'Où trouver mes factures ?',
    answer:
      "Vos factures sont disponibles dans la section 'Finance' > 'Factures'. Vous pouvez les télécharger au format PDF.",
  },
];

const CATEGORIES = [
  {
    id: 'start',
    title: 'Démarrage Rapide',
    icon: PlayCircle,
    color: 'text-green-600 bg-[var(--clr-success-dim)]',
  },
  {
    id: 'account',
    title: 'Compte & Facturation',
    icon: UserIcon,
    color: 'text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]',
  },
  {
    id: 'vehicles',
    title: 'Gestion de Flotte',
    icon: CarIcon,
    color: 'text-purple-600 bg-[var(--clr-info-dim)]',
  },
  {
    id: 'reports',
    title: 'Rapports & Analyses',
    icon: FileText,
    color: 'text-orange-600 bg-[var(--clr-warning-dim)]',
  },
];

// Helper icons for categories
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

export const HelpCenterView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ from: string; text: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [tenantContact, setTenantContact] = useState<{
    phone: string;
    email: string;
    legalDocuments?: {
      cgv?: string;
      contract?: string;
      policy?: string;
      guide?: string;
    };
  } | null>(null);
  const { showToast } = useToast();
  const { user } = useAuth();

  React.useEffect(() => {
    const loadTenantContact = async () => {
      try {
        const data = await api.tenants.getCurrent();
        const phone = data.settings?.phone || data.contact_phone || data.phone || '+225 00000000';
        const email = data.settings?.email || data.contact_email || data.email || 'support@trackyu.com';
        const legalDocuments = data.settings?.legalDocuments;
        setTenantContact({ phone, email, legalDocuments });
      } catch (err) {
        console.error('Failed to load tenant contact', err);
      }
    };
    loadTenantContact();
  }, []);

  const filteredFaqs = FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openChat = () => {
    setIsChatOpen(true);
    if (chatMessages.length === 0) {
      // Message de bienvenue automatique
      setChatMessages([
        {
          from: 'support',
          text: `Bonjour ${user?.name || 'cher client'} ! 👋 Comment puis-je vous aider aujourd'hui ?`,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;

    const newMessage = {
      from: 'user',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput('');

    // Réponse automatique après 1s
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          from: 'support',
          text: "Merci pour votre message ! Un conseiller vous répondra très bientôt. En attendant, n'hésitez pas à consulter notre FAQ ou à créer un ticket pour un suivi détaillé.",
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1000);
  };

  const handleDocClick = (e: React.MouseEvent<HTMLAnchorElement>, url?: string) => {
    if (!url || url === '#') {
      e.preventDefault();
      showToast("Ce document n'est pas encore disponible.", 'info');
    }
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
      {/* Hero Search Section */}
      <div className="bg-slate-900 text-white p-8 md:p-12 rounded-xl mb-6 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-dim)]0 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>

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
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Thématiques fréquentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className="p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl hover:shadow-md transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${cat.color}`}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] dark:group-hover:text-[var(--primary)] transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Voir les articles</p>
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FAQ Section */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Book className="w-5 h-5 text-[var(--primary)]" />
              Questions Fréquentes
            </h2>

            <div className="space-y-3">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === idx.toString() ? null : idx.toString())}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/50 transition-colors"
                    >
                      <span className="font-medium text-[var(--text-primary)]">{faq.question}</span>
                      {expandedFaq === idx.toString() ? (
                        <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                    </button>
                    {expandedFaq === idx.toString() && (
                      <div className="px-6 pb-4 pt-0 text-[var(--text-secondary)] text-sm animate-in slide-in-from-top-2 duration-200">
                        <div className="h-px w-full bg-[var(--bg-elevated)] mb-4"></div>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-[var(--bg-elevated)] rounded-xl border border-dashed border-[var(--border)]">
                  <HelpCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">Aucun résultat trouvé pour "{searchTerm}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Resources Sidebar */}
          <div className="space-y-6">
            <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--primary)] dark:border-[var(--primary)]/30 rounded-xl p-6">
              <h3 className="font-bold text-[var(--primary)] dark:text-[var(--primary)] mb-4 flex items-center gap-2">
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
                <button
                  onClick={openChat}
                  className="w-full flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] dark:border-[var(--primary)]/50 text-[var(--text-primary)] hover:shadow-sm transition-all text-sm font-medium"
                >
                  <MessageCircle className="w-4 h-4 text-[var(--primary)]" />
                  Chatter avec le support
                </button>
                <a
                  href={`mailto:${tenantContact?.email || 'support@trackyu.com'}`}
                  className="w-full flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] dark:border-[var(--primary)]/50 text-[var(--text-primary)] hover:shadow-sm transition-all text-sm font-medium"
                >
                  <Mail className="w-4 h-4 text-[var(--primary)]" />
                  Envoyer un email
                </a>
                <a
                  href={`tel:${tenantContact?.phone?.replace(/\s+/g, '') || '+33123456789'}`}
                  className="w-full flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] dark:border-[var(--primary)]/50 text-[var(--text-primary)] hover:shadow-sm transition-all text-sm font-medium"
                >
                  <Phone className="w-4 h-4 text-[var(--primary)]" />
                  {tenantContact?.phone || '+33 1 23 45 67 89'}
                </a>
              </div>
            </div>

            <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="font-bold text-[var(--text-primary)] mb-4">Documentation</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href={tenantContact?.legalDocuments?.guide || '#'}
                    onClick={(e) => handleDocClick(e, tenantContact?.legalDocuments?.guide)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] dark:hover:text-[var(--primary)] transition-colors w-full text-left"
                  >
                    <FileText className="w-4 h-4" />
                    Guide de l'utilisateur (PDF)
                  </a>
                </li>
                <li>
                  <a
                    href="/api/docs"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] dark:hover:text-[var(--primary)] transition-colors w-full text-left"
                  >
                    <FileText className="w-4 h-4" />
                    Documentation API
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] dark:hover:text-[var(--primary)] transition-colors"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Tutoriels Vidéo
                  </a>
                </li>
              </ul>
            </div>

            {/* Documents Juridiques */}
            <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-600" />
                Documents Juridiques
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href={tenantContact?.legalDocuments?.contract || '#'}
                    onClick={(e) => handleDocClick(e, tenantContact?.legalDocuments?.contract)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] dark:hover:text-[var(--primary)] transition-colors w-full text-left"
                  >
                    <Shield className="w-4 h-4 text-green-500" />
                    Contrat de service (PDF)
                  </a>
                </li>
                <li>
                  <a
                    href={tenantContact?.legalDocuments?.cgv || '#'}
                    onClick={(e) => handleDocClick(e, tenantContact?.legalDocuments?.cgv)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] dark:hover:text-[var(--primary)] transition-colors w-full text-left"
                  >
                    <Scale className="w-4 h-4 text-purple-500" />
                    Conditions Générales de Vente
                  </a>
                </li>
                <li>
                  <a
                    href={tenantContact?.legalDocuments?.policy || '#'}
                    onClick={(e) => handleDocClick(e, tenantContact?.legalDocuments?.policy)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] dark:hover:text-[var(--primary)] transition-colors w-full text-left"
                  >
                    <Shield className="w-4 h-4 text-[var(--primary)]" />
                    Politique de confidentialité
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <CreateTicketModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} />

      {/* Chat Support Modal */}
      {isChatOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-[var(--primary)] p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Support TrackYu</h3>
                <p className="text-[var(--primary)] text-xs flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  En ligne
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              title="Fermer le chat"
              aria-label="Fermer le chat"
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[var(--bg-elevated)]">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                    msg.from === 'user'
                      ? 'bg-[var(--primary)] text-white rounded-br-sm'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p
                    className={`text-xs mt-1 ${msg.from === 'user' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Tapez votre message..."
                className="flex-1 px-4 py-2.5 bg-[var(--bg-elevated)] border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim()}
                title="Envoyer le message"
                aria-label="Envoyer le message"
                className="w-10 h-10 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:bg-[var(--border)] disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
