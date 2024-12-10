import { useState } from 'react';
import { DocumentCategory, DocumentType } from '../../types/documentation';
import { uploadDocument, createDocument } from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';
import { X, Upload, Loader2 } from 'lucide-react';
import { hasAnyGroup } from "../../lib/permissions";

interface DocumentUploadModalProps {
  categories: DocumentCategory[];
  clubId: string;
  onClose: () => void;
  onSuccess: () => void;
  selectedCategory?: string;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  categories,
  clubId,
  onClose,
  onSuccess,
  selectedCategory,
}) => {
  const { user } = useAuth();
  
  // Vérification de sécurité
  if (!user || !hasAnyGroup(user, ['ADMIN'])) {
    onClose();
    return null;
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: selectedCategory || '',
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Vérifier la taille des fichiers (50MB max)
    const invalidFiles = files.filter(file => file.size > 50 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      setError('Certains fichiers dépassent 50MB');
      return;
    }

    try {
      // Vérifier les types de fichiers
      files.forEach(file => getFileType(file));
      setSelectedFiles(files);
      setError(null);
      
      // Si un seul fichier, utiliser son nom comme titre
      if (files.length === 1) {
        setFormData(prev => ({
          ...prev,
          title: files[0].name.split('.')[0],
        }));
      }
    } catch (error) {
      setError('Type de fichier non supporté');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !user) return;

    try {
      setLoading(true);
      setError(null);

      // Upload des fichiers et création des documents
      for (const file of selectedFiles) {
        // Upload du fichier et obtention de l'URL publique
        const fileUrl = await uploadDocument(file, clubId);

        // Création du document
        await createDocument({
          title: selectedFiles.length === 1 ? formData.title : file.name.split('.')[0],
          description: formData.description || undefined,
          category_id: formData.category_id,
          file_url: fileUrl,
          file_type: getFileType(file),
          file_size: file.size,
          required_role: formData.required_role || undefined,
          club_id: clubId,
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {selectedFiles.length > 1 
              ? `Ajouter ${selectedFiles.length} documents` 
              : 'Ajouter un document'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fichiers
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-sky-600 hover:text-sky-500"
                  >
                    <span>Sélectionner des fichiers</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi"
                    />
                  </label>
                  <p className="pl-1">ou glisser-déposer</p>
                </div>
                <p className="text-xs text-slate-500">
                  PDF, Word, Images ou Vidéos jusqu'à 50MB
                </p>
                {selectedFiles.length > 0 && (
                  <div className="mt-2 text-sm text-slate-500">
                    {selectedFiles.map(file => (
                      <div key={file.name} className="flex items-center gap-2">
                        <span>{file.name}</span>
                        <span className="text-xs">
                          ({Math.round(file.size / 1024)}KB)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedFiles.length === 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Titre
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description (optionnelle)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Catégorie
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rôle requis (optionnel)
            </label>
            <select
              value={formData.required_role}
              onChange={(e) => setFormData({ ...formData, required_role: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Aucun</option>
              <option value="ADMIN">Administrateur</option>
              <option value="INSTRUCTOR">Instructeur</option>
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={selectedFiles.length === 0 || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi en cours...
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
