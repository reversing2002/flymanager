import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { getCategories, getDocuments, deleteDocument, downloadDocument, deleteCategory } from '../../services/documentService';
import { Document, DocumentCategory, CategoryNode } from '../../types/database';
import DocumentUploadModal from './DocumentUploadModal';
import CategoryModal from './CategoryModal';
import CategoryTree from './CategoryTree';
import DocumentList from './DocumentList';
import Breadcrumb from './Breadcrumb';
import EditDocumentModal from './EditDocumentModal';
import { Plus, FolderPlus, Search, ChevronLeft, Menu } from 'lucide-react';
import { hasAnyGroup } from "../../lib/permissions";

interface Props {
  // Add any props that are passed to the component here
}

const DocumentationPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = hasAnyGroup(user, ['ADMIN']);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [categoryModalData, setCategoryModalData] = useState<{
    mode: 'create' | 'edit';
    initialValues?: { name?: string; parent_id?: string };
    categoryId?: string;
  } | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  useEffect(() => {
    if (user?.club?.id) {
      loadData();
    }
  }, [user?.club?.id]);

  const loadData = async () => {
    if (!user?.club?.id) return;
    
    try {
      const [categoriesData, documentsData] = await Promise.all([
        getCategories(user.club.id),
        getDocuments(user.club.id)
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

  const handleCreateCategory = (parentId?: string) => {
    setCategoryModalData({
      mode: 'create',
      initialValues: parentId ? { parent_id: parentId } : undefined
    });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category: CategoryNode) => {
    setCategoryModalData({
      mode: 'edit',
      initialValues: {
        name: category.name,
        parent_id: categories.find(c => c.children?.includes(category.id))?.id
      },
      categoryId: category.id
    });
    setShowCategoryModal(true);
  };

  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
    setCategoryModalData(null);
  };

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    try {
      await deleteDocument(id);
      loadData();
      toast.success('Document supprimé avec succès');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression du document');
    }
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      const blob = await downloadDocument(document.file_url);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erreur lors du téléchargement du document');
    }
  };

  // Filtrer les documents en fonction de la recherche et de la catégorie sélectionnée
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (!selectedCategory || doc.category_id === selectedCategory)
    );
  }, [documents, searchQuery, selectedCategory]);

  if (!user?.club?.id) {
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

  console.log('Rendering with clubId:', user?.club?.id);

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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
              aria-label={showSidebar ? "Masquer les catégories" : "Afficher les catégories"}
            >
              {showSidebar ? <ChevronLeft /> : <Menu />}
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Documentation</h1>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-slate-200 rounded-lg focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </button>
            )}
          </div>
        </div>

        {/* Fil d'ariane */}
        <div className="mt-4">
          <Breadcrumb
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar overlay */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`
            fixed lg:static inset-y-0 left-0 w-80 bg-white z-30 transform transition-transform duration-200 ease-in-out
            ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            flex flex-col
          `}
        >
          <div className="h-14 border-b flex items-center justify-between px-4">
            <h2 className="font-medium">Catégories</h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
              aria-label="Fermer le menu"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <CategoryTree
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
              onCreateCategory={isAdmin ? (parentId) => {
                setCategoryModalData({
                  mode: 'create',
                  initialValues: { parent_id: parentId },
                });
                setShowCategoryModal(true);
              } : undefined}
              onEditCategory={isAdmin ? (category) => {
                setCategoryModalData({
                  mode: 'edit',
                  initialValues: {
                    name: category.name,
                    parent_id: categories.find(c => c.id === category.id)?.parent_id,
                  },
                  categoryId: category.id,
                });
                setShowCategoryModal(true);
              } : undefined}
              onDeleteCategory={isAdmin ? async (category) => {
                try {
                  await deleteCategory(category.id);
                  loadData();
                  if (selectedCategory === category.id) {
                    setSelectedCategory(null);
                  }
                  toast.success('Catégorie supprimée avec succès');
                } catch (error) {
                  console.error('Error deleting category:', error);
                  toast.error('Erreur lors de la suppression de la catégorie');
                }
              } : undefined}
            />
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <DocumentList
              documents={filteredDocuments}
              isLoading={loading}
              selectedCategory={selectedCategory}
              onRefresh={loadData}
              categories={categories}
              onDelete={isAdmin ? handleDeleteDocument : undefined}
              onEdit={isAdmin ? handleEditDocument : undefined}
              onDownload={handleDownloadDocument}
              onUpload={isAdmin ? () => setShowUploadModal(true) : undefined}
              clubId={user.club.id}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showUploadModal && user.club.id && (
        <DocumentUploadModal
          clubId={user.club.id}
          categories={categories}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            loadData();
            toast.success('Document ajouté avec succès');
          }}
          selectedCategory={selectedCategory}
        />
      )}

      {showCategoryModal && categoryModalData && user.club.id && (
        <CategoryModal
          categories={categories}
          clubId={user.club.id}
          onClose={() => {
            setShowCategoryModal(false);
            setCategoryModalData(null);
          }}
          onSuccess={() => {
            setShowCategoryModal(false);
            setCategoryModalData(null);
            loadData();
            toast.success(
              categoryModalData.mode === 'create'
                ? 'Catégorie créée avec succès'
                : 'Catégorie modifiée avec succès'
            );
          }}
          mode={categoryModalData.mode}
          initialValues={categoryModalData.initialValues}
          categoryId={categoryModalData.categoryId}
        />
      )}

      {editingDocument && (
        <EditDocumentModal
          document={editingDocument}
          categories={categories}
          onClose={() => setEditingDocument(null)}
          onSuccess={() => {
            setEditingDocument(null);
            loadData();
            toast.success('Document modifié avec succès');
          }}
        />
      )}
    </div>
  );
};

export default DocumentationPage;
