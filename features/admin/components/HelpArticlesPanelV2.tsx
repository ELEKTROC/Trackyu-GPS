/**
 * HelpArticlesPanelV2 - Centre d'Aide Amélioré
 *
 * Fonctionnalités:
 * - Catégories structurées avec icônes
 * - FAQ avec accordion
 * - Recherche avancée
 * - Éditeur Markdown
 * - Vidéos tutoriels
 * - Stats de consultation
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
  Video,
  FileText,
  HelpCircle,
  Lightbulb,
  Settings,
  Users,
  Car,
  Map,
  CreditCard,
  Wrench,
  BarChart3,
  Play,
  ExternalLink,
  Clock,
  TrendingUp,
  Star,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { api } from '../../../services/apiLazy';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';

// Types
interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  type: 'article' | 'faq' | 'video' | 'tutorial';
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
  videoUrl?: string;
  duration?: string; // Pour les vidéos
}

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

// Map statique des classes Tailwind par couleur
const HELP_COLOR_CLASSES: Record<string, { bg100: string; text600: string; text700: string; darkBg: string }> = {
  amber: {
    bg100: 'bg-amber-100',
    text600: 'text-amber-600',
    text700: 'text-amber-700',
    darkBg: 'dark:bg-amber-900/30',
  },
  blue: {
    bg100: 'bg-[var(--primary-dim)]',
    text600: 'text-[var(--primary)]',
    text700: 'text-[var(--primary)]',
    darkBg: 'dark:bg-[var(--primary-dim)]',
  },
  green: {
    bg100: 'bg-green-100',
    text600: 'text-green-600',
    text700: 'text-green-700',
    darkBg: 'dark:bg-green-900/30',
  },
  purple: {
    bg100: 'bg-purple-100',
    text600: 'text-purple-600',
    text700: 'text-purple-700',
    darkBg: 'dark:bg-purple-900/30',
  },
  cyan: { bg100: 'bg-cyan-100', text600: 'text-cyan-600', text700: 'text-cyan-700', darkBg: 'dark:bg-cyan-900/30' },
  emerald: {
    bg100: 'bg-emerald-100',
    text600: 'text-emerald-600',
    text700: 'text-emerald-700',
    darkBg: 'dark:bg-emerald-900/30',
  },
  orange: {
    bg100: 'bg-orange-100',
    text600: 'text-orange-600',
    text700: 'text-orange-700',
    darkBg: 'dark:bg-orange-900/30',
  },
  slate: {
    bg100: 'bg-slate-100',
    text600: 'text-slate-600',
    text700: 'text-slate-700',
    darkBg: 'dark:bg-slate-900/30',
  },
};

const getHelpColor = (color: string) => HELP_COLOR_CLASSES[color] || HELP_COLOR_CLASSES.slate;

// Catégories
const CATEGORIES: Category[] = [
  { id: 'getting-started', label: 'Premiers Pas', icon: Lightbulb, color: 'amber', description: 'Guide de démarrage' },
  {
    id: 'dashboard',
    label: 'Tableau de Bord',
    icon: BarChart3,
    color: 'blue',
    description: 'Utilisation du dashboard',
  },
  { id: 'vehicles', label: 'Véhicules', icon: Car, color: 'green', description: 'Gestion de la flotte' },
  { id: 'map', label: 'Carte & GPS', icon: Map, color: 'purple', description: 'Suivi en temps réel' },
  { id: 'clients', label: 'Clients & CRM', icon: Users, color: 'cyan', description: 'Gestion commerciale' },
  { id: 'billing', label: 'Facturation', icon: CreditCard, color: 'emerald', description: 'Factures et paiements' },
  { id: 'technical', label: 'Technique', icon: Wrench, color: 'orange', description: 'Interventions et stock' },
  { id: 'settings', label: 'Paramètres', icon: Settings, color: 'slate', description: 'Configuration' },
];

// Données de démonstration
const DEMO_ARTICLES: HelpArticle[] = [
  {
    id: '1',
    title: 'Comment ajouter un véhicule ?',
    content: `# Ajouter un véhicule

Pour ajouter un nouveau véhicule à votre flotte :

1. Allez dans **Flotte > Véhicules**
2. Cliquez sur le bouton **+ Nouveau Véhicule**
3. Remplissez les informations :
   - Immatriculation
   - Marque et modèle
   - Client associé
4. Associez un boîtier GPS
5. Cliquez sur **Enregistrer**

Le véhicule apparaîtra immédiatement sur la carte.`,
    category: 'vehicles',
    type: 'article',
    tags: ['véhicule', 'ajout', 'flotte'],
    isPublished: true,
    isFeatured: true,
    views: 342,
    createdAt: '2024-01-15',
    updatedAt: '2024-12-01',
  },
  {
    id: '2',
    title: 'Créer une géofence',
    content: `# Créer une zone géographique (Géofence)

Les géofences permettent de définir des zones et recevoir des alertes.

## Étapes :
1. Ouvrez la **Carte**
2. Cliquez sur l'outil **Géofence** 
3. Dessinez la zone sur la carte
4. Nommez la zone et configurez les alertes
5. Enregistrez`,
    category: 'map',
    type: 'tutorial',
    tags: ['géofence', 'carte', 'alerte', 'zone'],
    isPublished: true,
    isFeatured: true,
    views: 256,
    createdAt: '2024-02-10',
    updatedAt: '2024-11-15',
  },
  {
    id: '3',
    title: 'Comment créer une facture ?',
    content: `Pour créer une facture, allez dans Finance > Factures et cliquez sur Nouvelle Facture.`,
    category: 'billing',
    type: 'article',
    tags: ['facture', 'finance', 'paiement'],
    isPublished: true,
    isFeatured: false,
    views: 189,
    createdAt: '2024-03-05',
    updatedAt: '2024-10-20',
  },
  {
    id: '4',
    title: "Qu'est-ce que le MRR ?",
    content: `Le **MRR** (Monthly Recurring Revenue) représente le revenu mensuel récurrent. C'est la somme de tous les abonnements actifs.`,
    category: 'billing',
    type: 'faq',
    tags: ['mrr', 'revenus', 'abonnement'],
    isPublished: true,
    isFeatured: false,
    views: 98,
    createdAt: '2024-04-12',
    updatedAt: '2024-09-01',
  },
  {
    id: '5',
    title: 'Présentation du Dashboard',
    content: `Vidéo de présentation du tableau de bord TrackYu`,
    category: 'dashboard',
    type: 'video',
    tags: ['dashboard', 'introduction', 'vidéo'],
    isPublished: true,
    isFeatured: true,
    views: 567,
    videoUrl: 'https://www.youtube.com/watch?v=example',
    duration: '5:32',
    createdAt: '2024-01-01',
    updatedAt: '2024-12-10',
  },
  {
    id: '6',
    title: 'Comment réinitialiser mon mot de passe ?',
    content: `Cliquez sur "Mot de passe oublié" sur la page de connexion et suivez les instructions envoyées par email.`,
    category: 'getting-started',
    type: 'faq',
    tags: ['mot de passe', 'connexion', 'sécurité'],
    isPublished: true,
    isFeatured: false,
    views: 423,
    createdAt: '2024-01-10',
    updatedAt: '2024-08-15',
  },
];

// Types de contenu
const CONTENT_TYPES = [
  { id: 'article', label: 'Article', icon: FileText },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'video', label: 'Vidéo', icon: Video },
  { id: 'tutorial', label: 'Tutoriel', icon: Lightbulb },
];

export const HelpArticlesPanelV2: React.FC = () => {
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // State
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'articles' | 'categories' | 'stats'>('articles');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);
  const [previewArticle, setPreviewArticle] = useState<HelpArticle | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<HelpArticle>>({
    title: '',
    content: '',
    category: 'getting-started',
    type: 'article',
    tags: [],
    isPublished: true,
    isFeatured: false,
  });
  const [tagInput, setTagInput] = useState('');

  // Chargement des articles depuis l'API
  const loadArticles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.adminFeatures.helpArticles.list();
      if (Array.isArray(data) && data.length > 0) {
        // Mapper snake_case → camelCase
        const mapped = data.map(
          (a: {
            id: string;
            title: string;
            content: string;
            category?: string;
            type?: string;
            tags?: string[];
            is_published?: boolean;
            is_featured?: boolean;
            view_count?: number;
            created_at?: string;
            updated_at?: string;
            video_url?: string;
            duration?: string;
          }) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            category: a.category || 'getting-started',
            type: (a.type || 'article') as 'article' | 'video' | 'faq' | 'tutorial',
            tags: Array.isArray(a.tags) ? a.tags : [],
            isPublished: a.is_published ?? true,
            isFeatured: a.is_featured ?? false,
            views: a.view_count || 0,
            createdAt: a.created_at,
            updatedAt: a.updated_at,
            videoUrl: a.video_url,
            duration: a.duration,
          })
        );
        setArticles(mapped);
      } else {
        // Fallback aux données de démo si la table est vide
        setArticles(DEMO_ARTICLES);
      }
    } catch {
      setArticles(DEMO_ARTICLES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Filtrage
  const filteredArticles = useMemo(() => {
    let result = [...articles];

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

    if (selectedType !== 'all') {
      result = result.filter((a) => a.type === selectedType);
    }

    return result;
  }, [articles, searchQuery, selectedCategory, selectedType]);

  const {
    sortedItems: sortedArticles,
    sortConfig: articleSortConfig,
    handleSort: handleArticleSort,
  } = useTableSort(filteredArticles, { key: 'views', direction: 'desc' });

  // Stats
  const stats = useMemo(
    () => ({
      total: articles.length,
      published: articles.filter((a) => a.isPublished).length,
      featured: articles.filter((a) => a.isFeatured).length,
      totalViews: articles.reduce((acc, a) => acc + a.views, 0),
      byCategory: CATEGORIES.map((cat) => ({
        ...cat,
        count: articles.filter((a) => a.category === cat.id).length,
      })),
      byType: CONTENT_TYPES.map((type) => ({
        ...type,
        count: articles.filter((a) => a.type === type.id).length,
      })),
    }),
    [articles]
  );

  // Handlers
  const handleCreate = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      content: '',
      category: 'getting-started',
      type: 'article',
      tags: [],
      isPublished: true,
      isFeatured: false,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (article: HelpArticle) => {
    setEditingArticle(article);
    setFormData({ ...article });
    setIsModalOpen(true);
  };

  const handlePreview = (article: HelpArticle) => {
    setPreviewArticle(article);
    setIsPreviewOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'error');
      return;
    }

    // Mapper camelCase → snake_case pour l'API
    const payload = {
      title: formData.title,
      content: formData.content,
      category: formData.category || 'getting-started',
      type: formData.type || 'article',
      tags: formData.tags || [],
      is_published: formData.isPublished ?? true,
      is_featured: formData.isFeatured ?? false,
      video_url: formData.videoUrl || null,
      duration: formData.duration || null,
    };

    try {
      if (editingArticle) {
        await api.adminFeatures.helpArticles.update(editingArticle.id, payload);
        showToast(TOAST.FAQ.ARTICLE_UPDATED, 'success');
      } else {
        await api.adminFeatures.helpArticles.create(payload);
        showToast(TOAST.FAQ.ARTICLE_CREATED, 'success');
      }
      await loadArticles();
    } catch (error) {
      showToast(mapError(error, 'article'), 'error');
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (
      await confirm({
        message: 'Supprimer cet article ?',
        title: "Supprimer l'article",
        variant: 'danger',
        confirmLabel: 'Supprimer',
      })
    ) {
      try {
        await api.adminFeatures.helpArticles.delete(id);
        await loadArticles();
        showToast(TOAST.FAQ.ARTICLE_DELETED, 'info');
      } catch (error) {
        showToast(mapError(error, 'article'), 'error');
      }
    }
  };

  const handleAddTag = () => {
    if (tagInput && !formData.tags?.includes(tagInput)) {
      setFormData((prev) => ({ ...prev, tags: [...(prev.tags || []), tagInput] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags?.filter((t) => t !== tag) }));
  };

  const toggleFeatured = async (id: string) => {
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    try {
      await api.adminFeatures.helpArticles.update(id, {
        title: article.title,
        content: article.content,
        category: article.category,
        is_featured: !article.isFeatured,
        is_published: article.isPublished,
        type: article.type,
        tags: article.tags,
      });
      setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, isFeatured: !a.isFeatured } : a)));
    } catch (error) {
      showToast(mapError(error), 'error');
    }
  };

  const togglePublished = async (id: string) => {
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    try {
      await api.adminFeatures.helpArticles.update(id, {
        title: article.title,
        content: article.content,
        category: article.category,
        is_published: !article.isPublished,
        is_featured: article.isFeatured,
        type: article.type,
        tags: article.tags,
      });
      setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, isPublished: !a.isPublished } : a)));
    } catch (error) {
      showToast(mapError(error), 'error');
    }
  };

  const getCategoryConfig = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0];
  };

  const getTypeConfig = (typeId: string) => {
    return CONTENT_TYPES.find((t) => t.id === typeId) || CONTENT_TYPES[0];
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[var(--primary)]" />
            Centre d'Aide
          </h2>
          <p className="text-sm text-slate-500">
            {stats.total} articles • {stats.totalViews.toLocaleString()} vues totales
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-bold hover:bg-[var(--primary-light)]"
        >
          <Plus className="w-4 h-4" />
          Nouvel Article
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
        {[
          { id: 'articles', label: 'Articles', icon: FileText },
          { id: 'categories', label: 'Par Catégorie', icon: LayoutGrid },
          { id: 'stats', label: 'Statistiques', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'articles' && (
        <>
          {/* Filters */}
          <Card className="p-4 shrink-0">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                title="Catégorie"
              >
                <option value="all">Toutes les catégories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                title="Type de contenu"
              >
                <option value="all">Tous les types</option>
                {CONTENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>

              <div className="flex border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-[var(--primary-dim)] text-[var(--primary)]' : 'bg-white text-slate-500'}`}
                  title="Vue grille"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-[var(--primary-dim)] text-[var(--primary)]' : 'bg-white text-slate-500'}`}
                  title="Vue liste"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>

          {/* Articles Grid/List */}
          <div className="flex-1 overflow-y-auto">
            {filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
                <p className="font-medium">Aucun article trouvé</p>
                <p className="text-sm">Modifiez vos filtres ou créez un nouvel article</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArticles.map((article) => {
                  const category = getCategoryConfig(article.category);
                  const typeConfig = getTypeConfig(article.type);
                  return (
                    <Card
                      key={article.id}
                      className={`p-4 hover:shadow-lg transition-all cursor-pointer ${
                        !article.isPublished ? 'opacity-60' : ''
                      }`}
                      onClick={() => handlePreview(article)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded ${getHelpColor(category.color).bg100} ${getHelpColor(category.color).darkBg}`}
                          >
                            <category.icon className={`w-4 h-4 ${getHelpColor(category.color).text600}`} />
                          </div>
                          <span className="text-xs font-medium text-slate-500">{category.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {article.isFeatured && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              article.type === 'video'
                                ? 'bg-purple-100 text-purple-700'
                                : article.type === 'faq'
                                  ? 'bg-green-100 text-green-700'
                                  : article.type === 'tutorial'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-[var(--primary-dim)] text-[var(--primary)]'
                            }`}
                          >
                            {typeConfig.label}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-800 dark:text-white mb-2 line-clamp-2">{article.title}</h3>

                      <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                        {article.content.replace(/[#*`]/g, '').substring(0, 100)}...
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {article.views}
                          </span>
                          {article.type === 'video' && article.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {article.duration}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleFeatured(article.id)}
                            className={`p-1 rounded hover:bg-slate-100 ${article.isFeatured ? 'text-amber-500' : ''}`}
                            title="Mettre en avant"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(article)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="p-1 rounded hover:bg-red-50 text-red-500"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <SortableHeader
                        label="Article"
                        sortKey="title"
                        currentSortKey={articleSortConfig.key}
                        currentDirection={articleSortConfig.direction}
                        onSort={handleArticleSort}
                        className="text-xs font-bold text-slate-500 uppercase"
                      />
                      <SortableHeader
                        label="Catégorie"
                        sortKey="category"
                        currentSortKey={articleSortConfig.key}
                        currentDirection={articleSortConfig.direction}
                        onSort={handleArticleSort}
                        className="text-xs font-bold text-slate-500 uppercase"
                      />
                      <SortableHeader
                        label="Type"
                        sortKey="type"
                        currentSortKey={articleSortConfig.key}
                        currentDirection={articleSortConfig.direction}
                        onSort={handleArticleSort}
                        className="text-xs font-bold text-slate-500 uppercase"
                      />
                      <SortableHeader
                        label="Vues"
                        sortKey="views"
                        currentSortKey={articleSortConfig.key}
                        currentDirection={articleSortConfig.direction}
                        onSort={handleArticleSort}
                        className="text-xs font-bold text-slate-500 uppercase"
                      />
                      <SortableHeader
                        label="Statut"
                        sortKey="isPublished"
                        currentSortKey={articleSortConfig.key}
                        currentDirection={articleSortConfig.direction}
                        onSort={handleArticleSort}
                        className="text-xs font-bold text-slate-500 uppercase"
                      />
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {sortedArticles.map((article) => {
                      const category = getCategoryConfig(article.category);
                      return (
                        <tr key={article.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {article.isFeatured && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                              <span className="font-medium text-slate-800 dark:text-white">{article.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getHelpColor(category.color).bg100} ${getHelpColor(category.color).text700}`}
                            >
                              <category.icon className="w-3 h-3" />
                              {category.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">{getTypeConfig(article.type).label}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{article.views}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => togglePublished(article.id)}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                article.isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {article.isPublished ? 'Publié' : 'Brouillon'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handlePreview(article)}
                                className="p-1.5 hover:bg-slate-100 rounded"
                                title="Voir"
                              >
                                <Eye className="w-4 h-4 text-slate-500" />
                              </button>
                              <button
                                onClick={() => handleEdit(article)}
                                className="p-1.5 hover:bg-slate-100 rounded"
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4 text-slate-500" />
                              </button>
                              <button
                                onClick={() => handleDelete(article.id)}
                                className="p-1.5 hover:bg-red-50 rounded"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        </>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.byCategory.map((cat) => (
            <Card
              key={cat.id}
              className={`p-4 cursor-pointer hover:shadow-lg transition-all ${
                selectedCategory === cat.id ? 'ring-2 ring-[var(--primary-dim)]' : ''
              }`}
              onClick={() => {
                setSelectedCategory(cat.id);
                setActiveTab('articles');
              }}
            >
              <div
                className={`p-3 rounded-lg ${getHelpColor(cat.color).bg100} ${getHelpColor(cat.color).darkBg} w-fit mb-3`}
              >
                <cat.icon className={`w-6 h-6 ${getHelpColor(cat.color).text600}`} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white">{cat.label}</h3>
              <p className="text-sm text-slate-500 mb-2">{cat.description}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{cat.count}</p>
              <p className="text-xs text-slate-500">articles</p>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Articles</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500 uppercase font-bold">Publiés</p>
              <p className="text-3xl font-bold text-green-600">{stats.published}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500 uppercase font-bold">Mis en Avant</p>
              <p className="text-3xl font-bold text-amber-600">{stats.featured}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500 uppercase font-bold">Vues Totales</p>
              <p className="text-3xl font-bold text-purple-600">{stats.totalViews.toLocaleString()}</p>
            </Card>
          </div>

          {/* Top articles */}
          <Card className="p-4">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Articles les plus consultés
            </h3>
            <div className="space-y-3">
              {[...articles]
                .sort((a, b) => b.views - a.views)
                .slice(0, 5)
                .map((article, i) => (
                  <div key={article.id} className="flex items-center gap-4">
                    <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-sm font-bold text-slate-600">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 dark:text-white">{article.title}</p>
                      <p className="text-xs text-slate-500">{getCategoryConfig(article.category).label}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-600">{article.views} vues</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingArticle ? "Modifier l'article" : 'Nouvel Article'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg">
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-bold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </>
        }
      >
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titre *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
              placeholder="Titre de l'article"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                title="Catégorie"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as HelpArticle['type'] })}
                className="w-full p-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                title="Type de contenu"
              >
                {CONTENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.type === 'video' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL Vidéo</label>
                <input
                  type="url"
                  value={formData.videoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="w-full p-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Durée</label>
                <input
                  type="text"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full p-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                  placeholder="5:32"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contenu (Markdown)</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full p-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 h-48 font-mono text-sm"
              placeholder="# Titre&#10;&#10;Contenu de l'article..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm"
                >
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
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
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                placeholder="Ajouter un tag"
              />
              <button onClick={handleAddTag} className="px-3 py-2 bg-slate-100 rounded-lg">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Publié</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Mettre en avant</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={previewArticle?.title || ''}
        maxWidth="max-w-2xl"
      >
        {previewArticle && (
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getHelpColor(getCategoryConfig(previewArticle.category).color).bg100} ${getHelpColor(getCategoryConfig(previewArticle.category).color).text700}`}
              >
                {getCategoryConfig(previewArticle.category).label}
              </span>
              <span className="text-sm text-slate-500">{previewArticle.views} vues</span>
            </div>

            {previewArticle.type === 'video' && previewArticle.videoUrl && (
              <div className="mb-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-3">
                <Play className="w-8 h-8 text-[var(--primary)]" />
                <div>
                  <p className="font-medium">Vidéo: {previewArticle.duration}</p>
                  <a
                    href={previewArticle.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--primary)] flex items-center gap-1"
                  >
                    Ouvrir <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            <div className="prose dark:prose-invert max-w-none">
              {previewArticle.content.split('\n').map((line, i) => {
                if (line.startsWith('# '))
                  return (
                    <h1 key={i} className="text-2xl font-bold mt-4 mb-2">
                      {line.substring(2)}
                    </h1>
                  );
                if (line.startsWith('## '))
                  return (
                    <h2 key={i} className="text-xl font-bold mt-3 mb-2">
                      {line.substring(3)}
                    </h2>
                  );
                if (line.startsWith('- '))
                  return (
                    <li key={i} className="ml-4">
                      {line.substring(2)}
                    </li>
                  );
                if (line.match(/^\d+\. /))
                  return (
                    <li key={i} className="ml-4">
                      {line.substring(line.indexOf(' ') + 1)}
                    </li>
                  );
                if (line.trim() === '') return <br key={i} />;
                return (
                  <p key={i} className="my-1">
                    {line}
                  </p>
                );
              })}
            </div>

            {previewArticle.tags.length > 0 && (
              <div className="mt-6 pt-4 border-t dark:border-slate-700">
                <div className="flex flex-wrap gap-2">
                  {previewArticle.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialogComponent />
    </div>
  );
};

export default HelpArticlesPanelV2;
