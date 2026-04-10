import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Search, ThumbsUp, ThumbsDown, Eye, Plus, Edit2, Trash2, 
  ChevronRight, ChevronDown, Save, X, Archive, Send, FileText, Tag
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../contexts/ToastContext';
import { api } from '../../../services/api';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import DOMPurify from 'dompurify';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';

// Types
interface FaqCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  display_order: number;
  is_active: boolean;
  articles_count?: number;
  published_count?: number;
}

interface FaqArticle {
  id: string;
  category_id: string;
  category_name?: string;
  title: string;
  content: string;
  tags?: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  is_published: boolean;
  version: number;
  views_count: number;
  helpful_count: number;
  not_helpful_count: number;
  author_name?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export const FAQView: React.FC = () => {
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  
  // State
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<FaqArticle | null>(null);
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FaqCategory | null>(null);
  const [editingArticle, setEditingArticle] = useState<FaqArticle | null>(null);
  
  // Form State
  const [categoryForm, setCategoryForm] = useState({
    name: '', description: '', icon: '📚', color: '#3b82f6'
  });
  const [articleForm, setArticleForm] = useState({
    category_id: '', title: '', content: '', tags: '', status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  });

  // Load Data
  useEffect(() => {
    loadCategories();
    loadArticles();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await api.faq.categories.list();
      setCategories(data);
    } catch (error) {
      showToast(TOAST.CRUD.ERROR_LOAD('catégories'), 'error');
    }
  };

  const loadArticles = async () => {
    try {
      setIsLoading(true);
      const data = await api.faq.articles.list();
      setArticles(data);
    } catch (error) {
      showToast(TOAST.CRUD.ERROR_LOAD('articles'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Search
  const performSearch = async () => {
    if (!searchTerm.trim()) {
      loadArticles();
      return;
    }
    try {
      const results = await api.faq.articles.search(searchTerm);
      setArticles(results);
      setSelectedCategory(null);
    } catch (error) {
      showToast(TOAST.CRUD.ERROR_LOAD('résultats'), 'error');
    }
  };

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    if (selectedCategory) {
      return articles.filter(a => a.category_id === selectedCategory);
    }
    return articles;
  }, [articles, selectedCategory]);

  // Category Actions
  const openCategoryModal = (category?: FaqCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        icon: category.icon || '📚',
        color: category.color || '#3b82f6'
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', icon: '📚', color: '#3b82f6' });
    }
    setIsCategoryModalOpen(true);
  };

  const saveCategoryHandler = async () => {
    try {
      if (editingCategory) {
        await api.faq.categories.update(editingCategory.id, categoryForm);
        showToast(TOAST.FAQ.CATEGORY_UPDATED, 'success');
      } else {
        await api.faq.categories.create(categoryForm);
        showToast(TOAST.FAQ.CATEGORY_CREATED, 'success');
      }
      setIsCategoryModalOpen(false);
      loadCategories();
    } catch (error) {
      showToast(mapError(error, 'catégorie'), 'error');
    }
  };

  const deleteCategoryHandler = async (id: string) => {
    if (!await confirm({ message: 'Supprimer cette catégorie ?', variant: 'danger', title: 'Confirmer la suppression', confirmLabel: 'Supprimer' })) return;
    try {
      await api.faq.categories.delete(id);
      showToast(TOAST.FAQ.CATEGORY_DELETED, 'success');
      loadCategories();
    } catch (error: unknown) {
      showToast(mapError(error, 'catégorie'), 'error');
    }
  };

  // Article Actions
  const openArticleModal = (article?: FaqArticle) => {
    if (article) {
      setEditingArticle(article);
      setArticleForm({
        category_id: article.category_id,
        title: article.title,
        content: article.content,
        tags: (article.tags || []).join(', '),
        status: article.status
      });
    } else {
      setEditingArticle(null);
      setArticleForm({
        category_id: selectedCategory || categories[0]?.id || '',
        title: '',
        content: '',
        tags: '',
        status: 'DRAFT'
      });
    }
    setIsArticleModalOpen(true);
  };

  const saveArticleHandler = async () => {
    try {
      const payload = {
        ...articleForm,
        tags: articleForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      
      if (editingArticle) {
        await api.faq.articles.update(editingArticle.id, payload);
        showToast(TOAST.FAQ.ARTICLE_UPDATED, 'success');
      } else {
        await api.faq.articles.create(payload);
        showToast(TOAST.FAQ.ARTICLE_CREATED, 'success');
      }
      setIsArticleModalOpen(false);
      loadArticles();
    } catch (error) {
      showToast(mapError(error, 'article'), 'error');
    }
  };

  const deleteArticleHandler = async (id: string) => {
    if (!await confirm({ message: 'Supprimer cet article ?', variant: 'danger', title: 'Confirmer la suppression', confirmLabel: 'Supprimer' })) return;
    try {
      await api.faq.articles.delete(id);
      showToast(TOAST.FAQ.ARTICLE_DELETED, 'success');
      loadArticles();
    } catch (error) {
      showToast(mapError(error, 'article'), 'error');
    }
  };

  const publishArticleHandler = async (id: string) => {
    try {
      await api.faq.articles.publish(id);
      showToast(TOAST.FAQ.ARTICLE_PUBLISHED, 'success');
      loadArticles();
    } catch (error) {
      showToast(mapError(error, 'article'), 'error');
    }
  };

  const archiveArticleHandler = async (id: string) => {
    try {
      await api.faq.articles.archive(id);
      showToast(TOAST.FAQ.ARTICLE_ARCHIVED, 'success');
      loadArticles();
    } catch (error) {
      showToast(mapError(error, 'article'), 'error');
    }
  };

  const toggleArticle = (id: string) => {
    setExpandedArticles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        // Increment view count
        api.faq.articles.view(id).catch(() => {});
      }
      return newSet;
    });
  };

  const submitFeedback = async (articleId: string, isHelpful: boolean) => {
    try {
      await api.faq.articles.feedback(articleId, { is_helpful: isHelpful });
      showToast(TOAST.FAQ.FEEDBACK_THANKS, 'success');
      loadArticles();
    } catch (error) {
      showToast(mapError(error), 'error');
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Base de Connaissances (FAQ)</h1>
            <p className="text-sm text-slate-500">{articles.filter(a => a.is_published).length} articles publiés</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openCategoryModal()} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Catégorie
          </button>
          <button onClick={() => openArticleModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Article
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher dans la base de connaissances..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && performSearch()}
            />
          </div>
          <button onClick={performSearch} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Rechercher
          </button>
        </div>
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar - Categories */}
        <div className="w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Catégories</h3>
          <div className="space-y-1">
            <button
              onClick={() => { setSelectedCategory(null); loadArticles(); }}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                !selectedCategory ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <BookOpen className="w-4 h-4" /> Tous les articles
              </span>
              <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{articles.length}</span>
            </button>
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-1 flex items-center justify-between p-3 rounded-lg transition-colors ${
                    selectedCategory === cat.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  style={selectedCategory === cat.id ? { borderLeft: `4px solid ${cat.color}` } : {}}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="text-lg">{cat.icon}</span>
                    {cat.name}
                  </span>
                  <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                    {cat.published_count || 0}
                  </span>
                </button>
                <button onClick={() => openCategoryModal(cat)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Modifier">
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button onClick={() => deleteCategoryHandler(cat.id)} className="p-2 hover:bg-red-50 rounded" title="Supprimer">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Articles List */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400">Chargement...</div>
          ) : filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p>Aucun article trouvé</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {filteredArticles.map(article => {
                const isExpanded = expandedArticles.has(article.id);
                return (
                  <Card key={article.id} className="overflow-hidden">
                    <div className="p-4">
                      {/* Article Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => toggleArticle(article.id)}
                              className="flex items-center gap-2 text-left group"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-blue-600" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                              )}
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-blue-600">
                                {article.title}
                              </h3>
                            </button>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              article.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                              article.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {article.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {article.views_count} vues
                            </span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" /> {article.helpful_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <ThumbsDown className="w-3 h-3" /> {article.not_helpful_count}
                            </span>
                            <span>v{article.version}</span>
                            {article.category_name && (
                              <span className="px-2 py-0.5 bg-slate-100 rounded-full">{article.category_name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {article.status === 'DRAFT' && (
                            <button onClick={() => publishArticleHandler(article.id)} className="p-2 hover:bg-green-50 rounded" title="Publier">
                              <Send className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          {article.status === 'PUBLISHED' && (
                            <button onClick={() => archiveArticleHandler(article.id)} className="p-2 hover:bg-orange-50 rounded" title="Archiver">
                              <Archive className="w-4 h-4 text-orange-600" />
                            </button>
                          )}
                          <button onClick={() => openArticleModal(article)} className="p-2 hover:bg-slate-100 rounded" title="Modifier">
                            <Edit2 className="w-4 h-4 text-slate-600" />
                          </button>
                          <button onClick={() => deleteArticleHandler(article.id)} className="p-2 hover:bg-red-50 rounded" title="Supprimer">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>

                      {/* Article Content (Expanded) */}
                      {isExpanded && (
                        <>
                          <div className="prose dark:prose-invert max-w-none mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content.replace(/\n/g, '<br/>')) }} />
                          </div>
                          
                          {/* Tags */}
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex items-center gap-2 mt-4">
                              <Tag className="w-4 h-4 text-slate-400" />
                              {article.tags.map((tag, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Feedback Buttons */}
                          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                            <span className="text-sm text-slate-600">Cet article vous a-t-il été utile ?</span>
                            <button
                              onClick={() => submitFeedback(article.id, true)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm"
                            >
                              <ThumbsUp className="w-4 h-4" /> Oui
                            </button>
                            <button
                              onClick={() => submitFeedback(article.id, false)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm"
                            >
                              <ThumbsDown className="w-4 h-4" /> Non
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        footer={
          <>
            <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Annuler
            </button>
            <button onClick={saveCategoryHandler} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Save className="w-4 h-4" /> Enregistrer
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nom</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              value={categoryForm.name}
              onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={3}
              value={categoryForm.description}
              onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Icône (emoji)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-2xl text-center"
                value={categoryForm.icon}
                onChange={e => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Couleur</label>
              <input
                type="color"
                className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                value={categoryForm.color}
                onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Article Modal */}
      <Modal
        isOpen={isArticleModalOpen}
        onClose={() => setIsArticleModalOpen(false)}
        title={editingArticle ? 'Modifier l\'article' : 'Nouvel article'}
        footer={
          <>
            <button onClick={() => setIsArticleModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Annuler
            </button>
            <button onClick={saveArticleHandler} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Save className="w-4 h-4" /> Enregistrer
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Catégorie</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              value={articleForm.category_id}
              onChange={e => setArticleForm({ ...articleForm, category_id: e.target.value })}
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Titre</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              value={articleForm.title}
              onChange={e => setArticleForm({ ...articleForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Contenu</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
              rows={12}
              value={articleForm.content}
              onChange={e => setArticleForm({ ...articleForm, content: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tags (séparés par des virgules)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="gps, installation, dépannage"
              value={articleForm.tags}
              onChange={e => setArticleForm({ ...articleForm, tags: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Statut</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              value={articleForm.status}
              onChange={e => setArticleForm({ ...articleForm, status: e.target.value as any })}
            >
              <option value="DRAFT">Brouillon</option>
              <option value="PUBLISHED">Publié</option>
              <option value="ARCHIVED">Archivé</option>
            </select>
          </div>
        </div>
      </Modal>
      <ConfirmDialogComponent />
    </div>
  );
};
