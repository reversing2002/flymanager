import { useState } from 'react';
import { DocumentCategory, DocumentType } from '../../types/documentation';
import { uploadDocument, createDocument } from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';
import { X, Upload, Loader2 } from 'lucide-react';

interface DocumentUploadModalProps {
  categories: DocumentCategory[];
  clubId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  categories,
  clubId,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    required_role: '',
  });

  const getFileType = (file: File): DocumentType => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (['doc', 'docx'].includes(ext || '')) return 'WORD';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'IMAGE';
    if (['mp4', 'mov', 'avi'].includes(ext || '')) return 'VIDEO';
    throw new Error('Type de fichier non supporté');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille du fichier (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 50MB');
      return;
    }

    try {
      getFileType(file);
      setSelectedFile(file);
      setError(null);
      setFormData(prev => ({
        ...prev,
        title: file.name.split('.')[0], // Utiliser le nom du fichier comme titre par défaut
      }));
    } catch (error) {
      setError('Type de fichier non supporté');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user) return;

    try {
      setLoading(true);
      setError(null);

      // Upload du fichier
      const filePath = await uploadDocument(selectedFile, clubId);

      // Création du document
      await createDocument({
        title: formData.title,
        description: formData.description || undefined,
        category_id: formData.category_id,
        file_url: filePath,
        file_type: getFileType(selectedFile),
        file_size: selectedFile.size,
        required_role: formData.required_role || undefined,
        club_id: clubId,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Ajouter un document</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fichier
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600">
                  <label className="relative cursor-pointer rounded-md font-medium text-sky-600 hover:text-sky-500">
                    <span>Choisir un fichier</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi"
                    />
                  </label>
                  <p className="pl-1">ou glisser-déposer</p>
                </div>
                <p className="text-xs text-slate-500">
                  PDF, Word, images ou vidéos jusqu'à 50MB
                </p>
              </div>
            </div>
            {selectedFile && (
              <p className="mt-2 text-sm text-slate-500">
                Fichier sélectionné : {selectedFile.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Titre
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Catégorie
            </label>
            <select
              value={formData.category_id}
              onChange={e =>
                setFormData({ ...formData, category_id: e.target.value })
              }
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Accès restreint
            </label>
            <select
              value={formData.required_role}
              onChange={e =>
                setFormData({ ...formData, required_role: e.target.value })
              }
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            >
              <option value="">Tout le monde</option>
              <option value="ADMIN">Administrateurs</option>
              <option value="INSTRUCTOR">Instructeurs</option>
              <option value="PILOT">Pilotes</option>
              <option value="MECHANIC">Mécaniciens</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !selectedFile}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                'Ajouter'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
