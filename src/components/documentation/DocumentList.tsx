import { useState, useEffect, useMemo } from 'react';
import { Document, DocumentCategory } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { deleteDocument, getCategories, downloadDocument } from '../../services/documentService';
import { supabase } from '../../lib/supabase';
import { hasAnyGroup } from "../../lib/permissions";
import { Search, FileText, FileImage, FileVideo, Download, Trash2, Eye, Edit2, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import EditDocumentModal from './EditDocumentModal';
import NewDocumentCard from './NewDocumentCard';
import PDFViewer from './PDFViewer';

interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  selectedCategory: string | null;
  onRefresh: () => void;
  categories: DocumentCategory[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (document: Document) => void;
  onDownload: (document: Document) => Promise<void>;
  onUpload: () => void;
  clubId: string;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading = false,
  selectedCategory,
  onRefresh,
  categories,
  onDelete,
  onEdit,
  onDownload,
  onUpload,
  clubId,
}) => {
  const { user } = useAuth();
  const isAdmin = hasAnyGroup(user, ['ADMIN']);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<Document | null>(null);

  const handleMoveDocument = async (currentIndex: number, direction: 'up' | 'down') => {
    if (!isAdmin) return;

    const sortedDocs = [...documents].sort((a, b) => 
      (a.display_order ?? 0) - (b.display_order ?? 0)
    );

    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sortedDocs.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newSortedDocs = [...sortedDocs];
    [newSortedDocs[currentIndex], newSortedDocs[newIndex]] = [newSortedDocs[newIndex], newSortedDocs[currentIndex]];

    try {
      const { error } = await supabase
        .from('documents')
        .upsert(
          newSortedDocs.map((doc, index) => ({
            id: doc.id,
            title: doc.title,
            description: doc.description,
            category_id: doc.category_id,
            club_id: clubId,
            file_url: doc.file_url,
            file_type: doc.file_type,
            file_size: doc.file_size,
            required_role: doc.required_role,
            created_by: doc.created_by,
            display_order: index * 1000
          })),
          { onConflict: 'id' }
        );

      if (error) throw error;
      
      onRefresh();
      toast.success('Ordre mis à jour');
    } catch (error) {
      console.error('Error updating document order:', error);
      toast.error('Erreur lors de la mise à jour de l\'ordre');
    }
  };

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

  const handlePreview = async (document: Document) => {
    try {
      const { data: { publicUrl }, error } = await supabase.storage
        .from('documents')
        .getPublicUrl(document.file_url);

      if (error) throw error;

      window.open(publicUrl, '_blank');
    } catch (error) {
      console.error('Error getting public URL:', error);
      toast.error('Erreur lors de l\'ouverture du document');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await downloadDocument(doc.file_url);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.title || 'document';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erreur lors du téléchargement du document');
    }
  };

  const handleViewDocument = (document: Document) => {
    if (document.file_type === 'PDF') {
      setSelectedPDF(document);
    } else {
      onDownload(document);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => 
      (a.display_order ?? 0) - (b.display_order ?? 0)
    );
  }, [documents]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        {isAdmin && (
          <NewDocumentCard onUpload={onUpload} />
        )}
      </div>

      {sortedDocuments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {selectedCategory ? "Aucun document dans cette catégorie" : "Aucun document disponible"}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {sortedDocuments.map((document, index) => (
            <div
              key={document.id}
              onClick={() => handleViewDocument(document)}
              className="group relative flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md hover:cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                <div className="flex items-start sm:items-center gap-3">
                  {getFileIcon(document.file_type)}
                  <div>
                    <h3 className="font-medium">{document.title}</h3>
                    {document.description && (
                      <p className="text-sm text-gray-500 mt-1">{document.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-400 mt-1">
                      <span>{formatFileSize(document.file_size)}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(document.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div 
                  className="flex items-center space-x-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isAdmin && (
                    <>
                      <div className="flex flex-row sm:flex-col gap-1">
                        <button
                          onClick={() => handleMoveDocument(index, 'up')}
                          disabled={index === 0}
                          className={`rounded p-1 hover:bg-gray-100 ${index === 0 ? 'text-gray-300' : 'text-gray-500'}`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDocument(index, 'down')}
                          disabled={index === sortedDocuments.length - 1}
                          className={`rounded p-1 hover:bg-gray-100 ${index === sortedDocuments.length - 1 ? 'text-gray-300' : 'text-gray-500'}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => handleViewDocument(document)}
                    className="rounded p-2 text-blue-600 hover:bg-blue-50"
                    title="Voir le document"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => onEdit(document)}
                        className="rounded p-2 text-gray-500 hover:bg-gray-100"
                        title="Modifier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(document.id)}
                        className="rounded p-2 text-red-500 hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPDF && (
        <PDFViewer
          url={selectedPDF.file_url}
          isOpen={!!selectedPDF}
          onClose={() => setSelectedPDF(null)}
        />
      )}

      {editingDocument && (
        <EditDocumentModal
          document={editingDocument}
          categories={categories}
          onClose={() => setEditingDocument(null)}
          onSave={() => {
            setEditingDocument(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

export default DocumentList;
