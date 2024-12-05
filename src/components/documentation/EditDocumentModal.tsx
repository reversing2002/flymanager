import React, { useEffect, useState } from 'react';
import { Document, DocumentCategory } from '../../types/database';
import { updateDocument } from '../../services/documentService';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

interface EditDocumentModalProps {
  document: Document;
  categories: DocumentCategory[];
  onClose: () => void;
  onSuccess: () => void;
}

const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  document,
  categories,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description || '');
  const [categoryId, setCategoryId] = useState(document.category_id);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setTitle(document.title);
    setDescription(document.description || '');
    setCategoryId(document.category_id);
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      await updateDocument({
        id: document.id,
        title,
        description: description || undefined,
        category_id: categoryId,
        club_id: document.club_id,
      });
      onSuccess();
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Erreur lors de la mise à jour du document');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Modifier le document</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Titre
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du document"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du document"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Catégorie
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-sky-500 focus:ring-sky-500"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDocumentModal;
