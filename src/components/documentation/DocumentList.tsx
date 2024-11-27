import { useState, useEffect } from 'react';
import { Document, DocumentCategory } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { deleteDocument, getCategories } from '../../services/documentService';
import { supabase } from '../../lib/supabase';
import { Search, FileText, FileImage, FileVideo, Download, Trash2, Eye, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EditDocumentModal } from './EditDocumentModal';

interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  selectedCategory: string | null;
  onRefresh: () => void;
  categories: DocumentCategory[];
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading = false,
  selectedCategory,
  onRefresh,
  categories,
}) => {
  const { user, clubId } = useAuth();
  const [search, setSearch] = useState('');
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  const canDelete = (document: Document) =>
    user?.role === 'ADMIN' || document.created_by === user?.id;

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'WORD':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'IMAGE':
        return <FileImage className="h-5 w-5 text-green-500" />;
      case 'VIDEO':
        return <FileVideo className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5 text-slate-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_url);

      if (error) throw error;

      // Créer un URL pour le fichier
      const url = window.URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title + '.' + document.file_type.toLowerCase();
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      toast.success('Téléchargement réussi');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handlePreview = async (document: Document) => {
    try {
      const { data: { publicUrl }, error } = await supabase.storage
        .from('documents')
        .getPublicUrl(document.file_url);

      if (error) throw error;

      window.open(publicUrl, '_blank');
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  const handleDelete = async (document: Document) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      await deleteDocument(document.id);
      await supabase.storage
        .from('documents')
        .remove([document.file_url]);
      
      onRefresh();
      toast.success('Document supprimé avec succès');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(search.toLowerCase()) ||
    doc.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      </div>
    );
  }

  if (filteredDocuments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">
          {selectedCategory
            ? "Aucun document dans cette catégorie"
            : "Aucun document disponible"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un document..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-200">
        {filteredDocuments.map(document => (
          <div
            key={document.id}
            className="p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {getFileIcon(document.file_type)}
                <div>
                  <h3 className="font-medium text-slate-900">
                    {document.title}
                  </h3>
                  {document.description && (
                    <p className="mt-1 text-sm text-slate-500">
                      {document.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                    <span>
                      {formatFileSize(document.file_size)}
                    </span>
                    <span>•</span>
                    <span>
                      Ajouté {formatDistanceToNow(new Date(document.created_at), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {document.file_type === 'PDF' && (
                  <button
                    onClick={() => handlePreview(document)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    title="Prévisualiser"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                )}
                {canDelete(document) && (
                  <button
                    onClick={() => setEditingDocument(document)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    title="Modifier"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => handleDownload(document)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  title="Télécharger"
                >
                  <Download className="h-5 w-5" />
                </button>
                {canDelete(document) && (
                  <button
                    onClick={() => handleDelete(document)}
                    className="p-1 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Supprimer"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingDocument && (
        <EditDocumentModal
          isOpen={!!editingDocument}
          onClose={() => setEditingDocument(null)}
          document={editingDocument}
          categories={categories}
          clubId={clubId}
          onSuccess={() => {
            onRefresh();
            setEditingDocument(null);
          }}
        />
      )}
    </div>
  );
};

export default DocumentList;
