import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { getCategories, getDocuments } from '../../services/documentService';
import DocumentUploadModal from './DocumentUploadModal';
import CategoryModal from './CategoryModal';
import CategoryTree from './CategoryTree';
import DocumentList from './DocumentList';
import Breadcrumb from './Breadcrumb';
import { Plus, FolderPlus, Search, ChevronLeft, Menu } from 'lucide-react';

interface Props {
  // Add any props that are passed to the component here
}

const DocumentationPage: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (user?.club?.id) {
      loadData();
    }
  }, [user?.club?.id]);

  const loadData = async () => {
    try {
      const [categoriesData, documentsData] = await Promise.all([
        getCategories(user?.club?.id),
        getDocuments(user?.club?.id)
      ]);

      setCategories(categoriesData);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    loadData();
    setShowUploadModal(false);
    toast.success('Document ajouté avec succès');
  };

  const handleCategorySuccess = () => {
    loadData();
    setShowCategoryModal(false);
    toast.success('Catégorie créée avec succès');
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    // Fermer la sidebar sur mobile
    if (window.innerWidth < 1024) {
      setShowSidebar(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user?.club?.id) {
    console.error('No club found for user:', user);
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800">
              Vous devez être membre d'un club pour accéder à la documentation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering with clubId:', user.club.id);

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-[400px] bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              {showSidebar ? <ChevronLeft /> : <Menu />}
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Documentation</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Nouvelle catégorie</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau document</span>
            </button>
          </div>
        </div>

        {/* Fil d'ariane */}
        <div className="mt-2">
          <Breadcrumb
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* Search bar */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-slate-200 rounded-lg focus:border-sky-500 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-40 w-64 lg:w-72 bg-white border-r transform lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out
            ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="h-full overflow-y-auto p-4">
            <CategoryTree
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
            />
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-4">
            <DocumentList
              documents={filteredDocuments}
              selectedCategory={selectedCategory}
              onRefresh={loadData}
              categories={categories}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showUploadModal && user?.club?.id && (
        <DocumentUploadModal
          categories={categories}
          clubId={user.club.id}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {showCategoryModal && user?.club?.id && (
        <CategoryModal
          categories={categories}
          clubId={user.club.id}
          onClose={() => setShowCategoryModal(false)}
          onSuccess={handleCategorySuccess}
        />
      )}
    </div>
  );
};

export default DocumentationPage;
