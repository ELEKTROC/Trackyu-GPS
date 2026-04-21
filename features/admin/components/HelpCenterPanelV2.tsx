/**
 * HelpCenterPanelV2 - Centre d'Aide Amélioré
 *
 * Fonctionnalités:
 * - Articles d'aide organisés par catégorie
 * - FAQ avec accordion
 * - Vidéos tutoriels
 * - Recherche intelligente
 * - Statistiques de consultation
 * - Éditeur Markdown pour les articles
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  Save,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  HelpCircle,
  Star,
  TrendingUp,
  Folder,
  BarChart2,
  Users,
  Shield,
  Globe as GlobeIcon,
  Loader2,
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { TOAST } from '../../../constants/toastMessages';
import { api } from '../../../services/apiLazy';
import { logger } from '../../../utils/logger';

// Types
interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  author: string;
  videoUrl?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  isPublished: boolean;
}

// Catégories prédéfinies
const HELP_CATEGORIES = [
  { id: 'getting-started', label: 'Démarrage', icon: BookOpen, color: 'blue' },
  { id: 'vehicles', label: 'Véhicules', icon: FileText, color: 'green' },
  { id: 'tracking', label: 'Suivi GPS', icon: FileText, color: 'purple' },
  { id: 'alerts', label: 'Alertes', icon: FileText, color: 'amber' },
  { id: 'reports', label: 'Rapports', icon: FileText, color: 'cyan' },
  { id: 'billing', label: 'Facturation', icon: FileText, color: 'orange' },
  { id: 'account', label: 'Compte', icon: FileText, color: 'slate' },
  { id: 'api', label: 'API & Intégrations', icon: FileText, color: 'red' },
];

// Articles par défaut
const DEFAULT_ARTICLES: HelpArticle[] = [
  {
    id: '1',
    title: 'Comment ajouter un véhicule',
    slug: 'ajouter-vehicule',
    content: `# Comment ajouter un véhicule

## Étape 1: Accéder au module Flotte
Cliquez sur "Flotte" dans le menu principal.

## Étape 2: Cliquer sur "Nouveau Véhicule"
Le bouton se trouve en haut à droite.

## Étape 3: Remplir les informations
- Immatriculation
- Marque et modèle
- IMEI du boîtier GPS

## Étape 4: Enregistrer
Cliquez sur "Enregistrer" pour finaliser.`,
    category: 'vehicles',
    tags: ['véhicule', 'ajout', 'flotte'],
    isPublished: true,
    isFeatured: true,
    viewCount: 342,
    helpfulCount: 89,
    createdAt: '2024-01-15',
    updatedAt: '2024-12-01',
    author: 'Admin',
  },
  {
    id: '2',
    title: 'Configurer les alertes de vitesse',
    slug: 'alertes-vitesse',
    content: `# Configurer les alertes de vitesse

Apprenez à définir des seuils de vitesse pour vos véhicules.

## Configuration
1. Allez dans les paramètres du véhicule
2. Onglet "Alertes"
3. Définissez la limite de vitesse
4. Activez les notifications`,
    category: 'alerts',
    tags: ['alertes', 'vitesse', 'notifications'],
    isPublished: true,
    isFeatured: false,
    viewCount: 256,
    helpfulCount: 67,
    createdAt: '2024-02-20',
    updatedAt: '2024-11-15',
    author: 'Admin',
  },
  {
    id: '3',
    title: 'Comprendre votre facture',
    slug: 'comprendre-facture',
    content: `# Comprendre votre facture

Ce guide explique les différentes lignes de votre facture mensuelle.`,
    category: 'billing',
    tags: ['facture', 'paiement', 'abonnement'],
    isPublished: true,
    isFeatured: false,
    viewCount: 189,
    helpfulCount: 45,
    createdAt: '2024-03-10',
    updatedAt: '2024-10-20',
    author: 'Admin',
  },
];

// FAQ par défaut
const DEFAULT_FAQS: FAQ[] = [
  {
    id: '1',
    question: 'Comment réinitialiser mon mot de passe ?',
    answer:
      'Cliquez sur "Mot de passe oublié" sur la page de connexion. Vous recevrez un email avec un lien de réinitialisation.',
    category: 'account',
    order: 1,
    isPublished: true,
  },
  {
    id: '2',
    question: "Mon véhicule n'apparaît pas sur la carte, que faire ?",
    answer:
      'Vérifiez que le boîtier GPS est bien alimenté et que la carte SIM est active. Le voyant du boîtier doit clignoter vert.',
    category: 'tracking',
    order: 2,
    isPublished: true,
  },
  {
    id: '3',
    question: 'Comment exporter mes rapports ?',
    answer:
      'Dans le module Rapports, sélectionnez le type de rapport puis cliquez sur le bouton "Exporter" en haut à droite. Vous pouvez choisir entre PDF et Excel.',
    category: 'reports',
    order: 3,
    isPublished: true,
  },
  {
    id: '4',
    question: 'Combien de véhicules puis-je suivre ?',
    answer:
      "Le nombre de véhicules dépend de votre formule d'abonnement. Contactez notre équipe commerciale pour augmenter votre quota.",
    category: 'billing',
    order: 4,
    isPublished: true,
  },
];

export const HelpCenterPanelV2: React.FC = () => {
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // State
  const [activeTab, setActiveTab] = useState<'articles' | 'faq' | 'videos' | 'stats'>('articles');
  const [articles, setArticles] = useState<HelpArticle[]>(DEFAULT_ARTICLES);
  const [faqs, setFaqs] = useState<FAQ[]>(DEFAULT_FAQS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Modal state
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  // Form state
  const [articleForm, setArticleForm] = useState<Partial<HelpArticle>>({
    title: '',
    content: '',
    category: 'getting-started',
    tags: [],
    isPublished: true,
    isFeatured: false,
  });
  const [faqForm, setFaqForm] = useState<Partial<FAQ>>({
    question: '',
    answer: '',
    category: 'account',
    isPublished: true,
  });
  const [tagInput, setTagInput] = useState('');

  // Filtrage
  const filteredArticles = useMemo(() => {
    let result = articles;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.content.toLowerCase().includes(query) ||
          a.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter((a) => a.category === selectedCategory);
    }

    return result;
  }, [articles, searchQuery, selectedCategory]);

  const filteredFaqs = useMemo(() => {
    let result = faqs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.question.toLowerCase().includes(query) || f.answer.toLowerCase().includes(query));
    }

    if (selectedCategory !== 'all') {
      result = result.filter((f) => f.category === selectedCategory);
    }

    return result.sort((a, b) => a.order - b.order);
  }, [faqs, searchQuery, selectedCategory]);

  // Stats
  const stats = useMemo(
    () => ({
      totalArticles: articles.length,
      publishedArticles: articles.filter((a) => a.isPublished).length,
      totalViews: articles.reduce((sum, a) => sum + a.viewCount, 0),
      totalHelpful: articles.reduce((sum, a) => sum + a.helpfulCount, 0),
      totalFaqs: faqs.length,
      topArticles: [...articles].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5),
    }),
    [articles, faqs]
  );

  // Handlers
  const handleCreateArticle = () => {
    setEditingArticle(null);
    setArticleForm({
      title: '',
      content: '',
      category: 'getting-started',
      tags: [],
      isPublished: true,
      isFeatured: false,
    });
    setIsArticleModalOpen(true);
  };

  const handleEditArticle = (article: HelpArticle) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags,
      isPublished: article.isPublished,
      isFeatured: article.isFeatured,
      videoUrl: article.videoUrl,
    });
    setIsArticleModalOpen(true);
  };

  const handleSaveArticle = () => {
    if (!articleForm.title || !articleForm.content) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'error');
      return;
    }

    const slug = articleForm.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (editingArticle) {
      setArticles(
        articles.map((a) =>
          a.id === editingArticle.id
            ? ({
                ...a,
                ...articleForm,
                slug,
                updatedAt: new Date().toISOString(),
              } as HelpArticle)
            : a
        )
      );
      showToast(TOAST.FAQ.ARTICLE_UPDATED, 'success');
    } else {
      const newArticle: HelpArticle = {
        id: `art_${Date.now()}`,
        ...(articleForm as any),
        slug,
        viewCount: 0,
        helpfulCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'Admin',
      };
      setArticles([newArticle, ...articles]);
      showToast(TOAST.FAQ.ARTICLE_CREATED, 'success');
    }

    setIsArticleModalOpen(false);
  };

  const handleDeleteArticle = async (id: string) => {
    if (
      await confirm({
        message: 'Supprimer cet article ?',
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      })
    ) {
      setArticles(articles.filter((a) => a.id !== id));
      showToast(TOAST.CRUD.DELETED('Article'), 'info');
    }
  };

  const handleCreateFaq = () => {
    setEditingFaq(null);
    setFaqForm({ question: '', answer: '', category: 'account', isPublished: true });
    setIsFaqModalOpen(true);
  };

  const handleEditFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      isPublished: faq.isPublished,
    });
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = () => {
    if (!faqForm.question || !faqForm.answer) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'error');
      return;
    }

    if (editingFaq) {
      setFaqs(
        faqs.map((f) =>
          f.id === editingFaq.id
            ? ({
                ...f,
                ...faqForm,
              } as FAQ)
            : f
        )
      );
      showToast(TOAST.FAQ.CATEGORY_UPDATED, 'success');
    } else {
      const newFaq: FAQ = {
        id: `faq_${Date.now()}`,
        ...(faqForm as any),
        order: faqs.length + 1,
      };
      setFaqs([...faqs, newFaq]);
      showToast(TOAST.FAQ.CATEGORY_CREATED, 'success');
    }

    setIsFaqModalOpen(false);
  };

  const handleDeleteFaq = async (id: string) => {
    if (
      await confirm({
        message: 'Supprimer cette FAQ ?',
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      })
    ) {
      setFaqs(faqs.filter((f) => f.id !== id));
      showToast(TOAST.CRUD.DELETED('FAQ'), 'info');
    }
  };

  const addTag = () => {
    if (tagInput && !articleForm.tags?.includes(tagInput)) {
      setArticleForm({ ...articleForm, tags: [...(articleForm.tags || []), tagInput] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setArticleForm({ ...articleForm, tags: articleForm.tags?.filter((t) => t !== tag) });
  };

  const getCategoryConfig = (catId: string) => {
    return HELP_CATEGORIES.find((c) => c.id === catId) || HELP_CATEGORIES[0];
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header avec KPIs */}
      <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Articles</p>
              <p className="page-title">{stats.totalArticles}</p>
              <p className="text-xs text-green-600">{stats.publishedArticles} publiés</p>
            </div>
            <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
              <FileText className="w-6 h-6 text-[var(--primary)]" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Vues Totales</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalViews.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-[var(--clr-info-muted)] rounded-lg">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Utile</p>
              <p className="text-2xl font-bold text-amber-600">{stats.totalHelpful}</p>
            </div>
            <div className="p-3 bg-[var(--clr-caution-muted)] rounded-lg">
              <Star className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">FAQ</p>
              <p className="text-2xl font-bold text-cyan-600">{stats.totalFaqs}</p>
            </div>
            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <HelpCircle className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          {[
            { id: 'articles', label: 'Articles', icon: FileText },
            { id: 'faq', label: 'FAQ', icon: HelpCircle },
            { id: 'videos', label: 'Vidéos', icon: Video },
            { id: 'stats', label: 'Statistiques', icon: BarChart2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-full sm:w-64 bg-[var(--bg-surface)] border-[var(--border)]"
            />
          </div>

          {/* Filtre catégorie */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-[var(--bg-surface)] border-[var(--border)]"
            title="Filtrer par catégorie"
          >
            <option value="all">Toutes catégories</option>
            {HELP_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Bouton création */}
          {activeTab === 'articles' && (
            <button
              onClick={handleCreateArticle}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--primary-light)]"
            >
              <Plus className="w-4 h-4" />
              Nouvel Article
            </button>
          )}
          {activeTab === 'faq' && (
            <button
              onClick={handleCreateFaq}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--primary-light)]"
            >
              <Plus className="w-4 h-4" />
              Nouvelle FAQ
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Articles */}
        {activeTab === 'articles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.length === 0 ? (
              <div className="col-span-3 text-center py-12">
                <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-[var(--text-secondary)] font-medium">Aucun article trouvé</p>
                <button onClick={handleCreateArticle} className="mt-4 text-[var(--primary)] hover:underline">
                  Créer un article
                </button>
              </div>
            ) : (
              filteredArticles.map((article) => {
                const cat = getCategoryConfig(article.category);
                return (
                  <Card key={article.id} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-${cat.color}-100 text-${cat.color}-700`}
                      >
                        {cat.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {article.isFeatured && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                        {!article.isPublished && <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />}
                      </div>
                    </div>

                    <h3 className="font-bold text-[var(--text-primary)] mb-2 line-clamp-2">{article.title}</h3>

                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4">
                      {article.content.replace(/[#*`]/g, '').substring(0, 100)}...
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-[var(--bg-elevated)] rounded text-xs text-[var(--text-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {article.viewCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" /> {article.helpfulCount}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditArticle(article)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* FAQ */}
        {activeTab === 'faq' && (
          <Card className="divide-y">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-[var(--text-secondary)] font-medium">Aucune FAQ trouvée</p>
              </div>
            ) : (
              filteredFaqs.map((faq) => (
                <div key={faq.id} className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedFaq === faq.id ? (
                        <ChevronDown className="w-5 h-5 text-[var(--primary)]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                      <span className="font-medium text-[var(--text-primary)]">{faq.question}</span>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`px-2 py-0.5 rounded text-xs bg-${getCategoryConfig(faq.category).color}-100 text-${getCategoryConfig(faq.category).color}-700`}
                      >
                        {getCategoryConfig(faq.category).label}
                      </span>
                      <button
                        onClick={() => handleEditFaq(faq)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--primary)]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {expandedFaq === faq.id && (
                    <div className="mt-3 pl-8 text-sm text-[var(--text-secondary)]">{faq.answer}</div>
                  )}
                </div>
              ))
            )}
          </Card>
        )}

        {/* Videos placeholder */}
        {activeTab === 'videos' && (
          <Card className="p-12 text-center">
            <Video className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[var(--text-primary)] text-[var(--text-primary)] mb-2">
              Vidéos Tutoriels
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">Ajoutez des vidéos de formation pour vos utilisateurs</p>
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg mx-auto">
              <Plus className="w-4 h-4" />
              Ajouter une vidéo
            </button>
          </Card>
        )}

        {/* Stats */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-6">
              <h4 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Articles les plus consultés
              </h4>
              <div className="space-y-3">
                {stats.topArticles.map((article, i) => (
                  <div key={article.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm text-[var(--text-primary)] truncate max-w-[200px]">{article.title}</span>
                    </div>
                    <span className="text-sm font-bold text-[var(--text-secondary)]">{article.viewCount}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Folder className="w-5 h-5 text-[var(--primary)]" />
                Articles par catégorie
              </h4>
              <div className="space-y-3">
                {HELP_CATEGORIES.map((cat) => {
                  const count = articles.filter((a) => a.category === cat.id).length;
                  return (
                    <div key={cat.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-${cat.color}-500`}></div>
                        <span className="text-sm">{cat.label}</span>
                      </div>
                      <span className="font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Modal Article */}
      <Modal
        isOpen={isArticleModalOpen}
        onClose={() => setIsArticleModalOpen(false)}
        title={editingArticle ? "Modifier l'article" : 'Nouvel article'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button onClick={() => setIsArticleModalOpen(false)} className="px-4 py-2 border rounded-lg">
              Annuler
            </button>
            <button
              onClick={handleSaveArticle}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </>
        }
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Titre</label>
            <input
              type="text"
              value={articleForm.title}
              onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
              className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
              placeholder="Titre de l'article"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Catégorie</label>
              <select
                value={articleForm.category}
                onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                title="Catégorie"
              >
                {HELP_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                URL Vidéo (optionnel)
              </label>
              <input
                type="url"
                value={articleForm.videoUrl || ''}
                onChange={(e) => setArticleForm({ ...articleForm, videoUrl: e.target.value })}
                className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
              Contenu (Markdown)
            </label>
            <textarea
              value={articleForm.content}
              onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
              className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)] h-48 font-mono text-sm"
              placeholder="# Titre&#10;&#10;Contenu de l'article..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {articleForm.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary-dim)] text-[var(--primary)] rounded text-sm"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 p-2 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)] text-sm"
                placeholder="Ajouter un tag..."
              />
              <button onClick={addTag} className="px-3 py-2 border rounded-lg hover:bg-[var(--bg-elevated)]">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={articleForm.isPublished}
                onChange={(e) => setArticleForm({ ...articleForm, isPublished: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Publié</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={articleForm.isFeatured}
                onChange={(e) => setArticleForm({ ...articleForm, isFeatured: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">⭐ Mis en avant</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal FAQ */}
      <Modal
        isOpen={isFaqModalOpen}
        onClose={() => setIsFaqModalOpen(false)}
        title={editingFaq ? 'Modifier la FAQ' : 'Nouvelle FAQ'}
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => setIsFaqModalOpen(false)} className="px-4 py-2 border rounded-lg">
              Annuler
            </button>
            <button
              onClick={handleSaveFaq}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </>
        }
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Question</label>
            <input
              type="text"
              value={faqForm.question}
              onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
              className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Réponse</label>
            <textarea
              value={faqForm.answer}
              onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
              className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)] h-32"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Catégorie</label>
            <select
              value={faqForm.category}
              onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
              className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
              title="Catégorie"
            >
              {HELP_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={faqForm.isPublished}
              onChange={(e) => setFaqForm({ ...faqForm, isPublished: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Publié</span>
          </label>
        </div>
      </Modal>
      <ConfirmDialogComponent />
    </div>
  );
};

export default HelpCenterPanelV2;
