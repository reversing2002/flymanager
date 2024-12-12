import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, Upload, Trash2, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Medical, MedicalType } from '../../types/medicals';
import { useAuth } from '../../contexts/AuthContext';
import { format, addMonths } from 'date-fns';

interface EditMedicalFormProps {
  userId: string;
  onClose: () => void;
  onSuccess?: () => void;
  medical?: Medical;
}

interface FormData {
  medical_type_id: string;
  obtained_at: string;
  expires_at: string | null;
}

const EditMedicalForm: React.FC<EditMedicalFormProps> = ({
  userId,
  onClose,
  onSuccess,
  medical,
}) => {
  const { user: currentUser } = useAuth();
  const [medicalTypes, setMedicalTypes] = useState<MedicalType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>(() => ({
    medical_type_id: '',
    obtained_at: format(new Date(), 'yyyy-MM-dd'),
    expires_at: null,
  }));
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);

  useEffect(() => {
    loadMedicalTypes().then(() => {
      if (medical) {
        setFormData({
          medical_type_id: medical.medical_type_id,
          obtained_at: format(new Date(medical.obtained_at), 'yyyy-MM-dd'),
          expires_at: medical.expires_at
            ? format(new Date(medical.expires_at), 'yyyy-MM-dd')
            : null,
        });

        // Chargement initial du document
        if (medical.scan_id) {
          loadDocument();
        }
      }
    });
  }, [medical]);

  useEffect(() => {
    loadMedicalTypes();
  }, [currentUser?.club?.id]);

  const loadMedicalTypes = async () => {
    if (!currentUser?.club?.id) return;

    try {
      const { data, error } = await supabase
        .from('medical_types')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setMedicalTypes(data || []);
    } catch (err) {
      console.error('Error loading medical types:', err);
      setError('Erreur lors du chargement des types de certificats médicaux');
    }
  };

  const loadDocument = async () => {
    if (!medical?.scan_id) return;
    
    try {
      const { data: { publicUrl } } = supabase.storage
        .from('medicals')
        .getPublicUrl(medical.scan_id);
      
      setDocumentUrl(publicUrl);
      
      // Si c'est une image, on crée une prévisualisation
      if (medical.scan_id.match(/\.(jpg|jpeg|png|gif)$/i)) {
        setDocumentPreview(publicUrl);
      }
    } catch (error) {
      console.error('Error loading document:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith('application/pdf') && !file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un PDF ou une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La taille du fichier ne doit pas dépasser 5MB');
      return;
    }

    setIsUploading(true);
    try {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        setDocumentPreview(preview);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('medicals')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('medicals')
        .getPublicUrl(filePath);

      setDocumentUrl(publicUrl);

      if (medical) {
        const { error: updateError } = await supabase
          .from('medicals')
          .update({ scan_id: filePath })
          .eq('id', medical.id);

        if (updateError) throw updateError;
      }

      toast.success('Document téléchargé avec succès');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erreur lors du téléchargement du document');
    } finally {
      setIsUploading(false);
    }
  }, [userId, medical]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const handleDeleteDocument = async () => {
    if (!medical?.scan_id) return;

    try {
      const { error: deleteStorageError } = await supabase.storage
        .from('medicals')
        .remove([medical.scan_id]);

      if (deleteStorageError) throw deleteStorageError;

      const { error: updateError } = await supabase
        .from('medicals')
        .update({ scan_id: null })
        .eq('id', medical.id);

      if (updateError) throw updateError;

      setDocumentUrl(null);
      setDocumentPreview(null);
      toast.success('Document supprimé avec succès');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression du document');
    }
  };

  const handleViewDocument = async () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const selectedType = medicalTypes.find(mt => mt.id === formData.medical_type_id);
      if (!selectedType) throw new Error('Type de certificat médical invalide');

      const medicalData = {
        user_id: userId,
        medical_type_id: formData.medical_type_id,
        obtained_at: new Date(formData.obtained_at).toISOString(),
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      };

      if (medical) {
        const { error: updateError } = await supabase
          .from('medicals')
          .update(medicalData)
          .eq('id', medical.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('medicals')
          .insert([medicalData]);

        if (insertError) throw insertError;
      }

      toast.success(medical ? 'Certificat médical mis à jour' : 'Certificat médical ajouté');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving medical:', err);
      setError('Erreur lors de l\'enregistrement du certificat médical');
    } finally {
      setLoading(false);
    }
  };

  const handleMedicalTypeChange = (typeId: string) => {
    const selectedType = medicalTypes.find(mt => mt.id === typeId);
    setFormData(prev => {
      const obtainedAt = new Date(prev.obtained_at || new Date());
      const expiresAt = selectedType?.validity_period && selectedType.requires_end_date
        ? addMonths(obtainedAt, selectedType.validity_period)
        : null;

      return {
        ...prev,
        medical_type_id: typeId,
        expires_at: expiresAt ? format(expiresAt, 'yyyy-MM-dd') : null,
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {medical ? 'Modifier le certificat médical' : 'Ajouter un certificat médical'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de certificat médical
              </label>
              <select
                value={formData.medical_type_id}
                onChange={(e) => handleMedicalTypeChange(e.target.value)}
                className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                required
              >
                <option value="">Sélectionner un type</option>
                {medicalTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'obtention
              </label>
              <input
                type="date"
                value={formData.obtained_at}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setFormData(prev => {
                    const selectedType = medicalTypes.find(mt => mt.id === prev.medical_type_id);
                    const expiresAt = selectedType?.validity_period && newDate
                      ? addMonths(new Date(newDate), selectedType.validity_period)
                      : null;

                    return {
                      ...prev,
                      obtained_at: newDate,
                      expires_at: expiresAt ? format(expiresAt, 'yyyy-MM-dd') : null,
                    };
                  });
                }}
                className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'expiration
              </label>
              {medicalTypes.find(mt => mt.id === formData.medical_type_id)?.requires_end_date ? (
                <input
                  type="date"
                  value={formData.expires_at || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    expires_at: e.target.value
                  }))}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  required={medicalTypes.find(mt => mt.id === formData.medical_type_id)?.requires_end_date}
                />
              ) : (
                <p className="text-sm text-gray-500">Ce type de certificat médical n'a pas de date d'expiration</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Document
              </label>
              
              {documentUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleViewDocument}
                    className="text-sky-600 hover:text-sky-700 flex items-center gap-1"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Voir le document</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteDocument}
                    className="text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Supprimer</span>
                  </button>
                </div>
              )}
              
              {!documentUrl && (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    {isDragActive
                      ? 'Déposez le fichier ici...'
                      : 'Cliquez ou glissez un fichier PDF ou image ici'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF ou image (max. 5MB)
                  </p>
                  {isUploading && (
                    <div className="mt-2">
                      <div className="animate-pulse text-sm text-blue-600">
                        Téléchargement en cours...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
                disabled={loading}
              >
                {loading ? 'Enregistrement...' : medical ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditMedicalForm;