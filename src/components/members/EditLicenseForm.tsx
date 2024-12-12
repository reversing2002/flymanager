import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, Upload, Trash2, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { PilotLicense, LicenseType } from '../../types/licenses';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface EditLicenseFormProps {
  userId: string;
  onClose: () => void;
  onSuccess?: () => void;
  currentLicense?: PilotLicense;
}

interface FormData {
  license_type_id: string;
  number: string;
  authority: string;
  issued_at: string;
  expires_at: string | null;
  data: Record<string, any>;
}

const EditLicenseForm: React.FC<EditLicenseFormProps> = ({
  userId,
  onClose,
  onSuccess,
  currentLicense,
}) => {
  const { user: currentUser } = useAuth();
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>(() => ({
    license_type_id: currentLicense?.license_type_id || '',
    number: currentLicense?.number || '',
    authority: currentLicense?.authority || 'DGAC',
    issued_at: currentLicense?.issued_at 
      ? format(new Date(currentLicense.issued_at), 'yyyy-MM-dd') 
      : format(new Date(), 'yyyy-MM-dd'),
    expires_at: currentLicense?.expires_at 
      ? format(new Date(currentLicense.expires_at), 'yyyy-MM-dd') 
      : null,
    data: currentLicense?.data || {},
  }));
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);

  useEffect(() => {
    if (currentLicense) {
      setFormData({
        license_type_id: currentLicense.license_type_id,
        number: currentLicense.number,
        authority: currentLicense.authority,
        issued_at: format(new Date(currentLicense.issued_at), 'yyyy-MM-dd'),
        expires_at: currentLicense.expires_at 
          ? format(new Date(currentLicense.expires_at), 'yyyy-MM-dd') 
          : null,
        data: currentLicense.data || {},
      });

      if (currentLicense.scan_id) {
        const { data: { publicUrl } } = supabase
          .storage
          .from('licenses')
          .getPublicUrl(currentLicense.scan_id);
        
        setDocumentUrl(publicUrl);
      }
    }
  }, [currentLicense]);

  useEffect(() => {
    loadLicenseTypes();
  }, [currentUser?.club?.id]);

  useEffect(() => {
    if (currentLicense?.scan_id) {
      const { data: { publicUrl } } = supabase
        .storage
        .from('licenses')
        .getPublicUrl(currentLicense.scan_id);
      
      setDocumentUrl(publicUrl);
    }
  }, [currentLicense]);

  const loadLicenseTypes = async () => {
    if (!currentUser?.club?.id) return;

    try {
      const { data, error } = await supabase
        .from('license_types')
        .select('*')
        .eq('club_id', currentUser.club.id)
        .order('display_order');

      if (error) throw error;
      setLicenseTypes(data || []);
    } catch (err) {
      console.error('Error loading license types:', err);
      setError('Erreur lors du chargement des types de licences');
    }
  };

  const loadDocument = async () => {
    if (!currentLicense?.scan_id) return;
    
    try {
      const { data: { publicUrl } } = supabase.storage
        .from('licenses')
        .getPublicUrl(currentLicense.scan_id);
      
      setDocumentUrl(publicUrl);
      
      // Si c'est une image, on crée une prévisualisation
      if (currentLicense.scan_id.match(/\.(jpg|jpeg|png|gif)$/i)) {
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
      // Créer une prévisualisation si c'est une image
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        setDocumentPreview(preview);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `license-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath);

      setDocumentUrl(publicUrl);

      if (currentLicense) {
        const { error: updateError } = await supabase
          .from('pilot_licenses')
          .update({ scan_id: filePath })
          .eq('id', currentLicense.id);

        if (updateError) throw updateError;
      }

      toast.success('Document téléchargé avec succès');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erreur lors du téléchargement du document');
    } finally {
      setIsUploading(false);
    }
  }, [userId, currentLicense]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const handleDeleteDocument = async () => {
    if (!currentLicense?.scan_id) return;

    try {
      const { error: deleteStorageError } = await supabase.storage
        .from('licenses')
        .remove([currentLicense.scan_id]);

      if (deleteStorageError) throw deleteStorageError;

      const { error: updateError } = await supabase
        .from('pilot_licenses')
        .update({ scan_id: null })
        .eq('id', currentLicense.id);

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
      const selectedType = licenseTypes.find(lt => lt.id === formData.license_type_id);
      if (!selectedType) throw new Error('Type de licence invalide');

      const licenseData = {
        user_id: userId,
        license_type_id: formData.license_type_id,
        number: formData.number,
        authority: formData.authority,
        issued_at: new Date(formData.issued_at).toISOString(),
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        data: formData.data,
      };

      if (currentLicense) {
        const { error: updateError } = await supabase
          .from('pilot_licenses')
          .update(licenseData)
          .eq('id', currentLicense.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('pilot_licenses')
          .insert([licenseData]);

        if (insertError) throw insertError;
      }

      toast.success(currentLicense ? 'Licence mise à jour' : 'Licence ajoutée');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving license:', err);
      setError('Erreur lors de l\'enregistrement de la licence');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: any, value: any, onChange: (value: any) => void) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
            required={field.required}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
            required={field.required}
          />
        );
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
            required={field.required}
          >
            <option value="">Sélectionner...</option>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {currentLicense ? 'Modifier la licence' : 'Ajouter une licence'}
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
                Type de licence
              </label>
              <select
                value={formData.license_type_id}
                onChange={(e) => {
                  const selectedType = licenseTypes.find(lt => lt.id === e.target.value);
                  setFormData(prev => ({
                    ...prev,
                    license_type_id: e.target.value,
                    data: selectedType?.required_fields.reduce((acc, field) => ({
                      ...acc,
                      [field.name]: ''
                    }), {}) || {}
                  }));
                }}
                className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                required
                disabled={!!currentLicense}
              >
                <option value="">Sélectionner un type</option>
                {licenseTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de licence
              </label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Autorité de délivrance
              </label>
              <input
                type="text"
                value={formData.authority}
                onChange={(e) => setFormData(prev => ({ ...prev, authority: e.target.value }))}
                className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de délivrance
              </label>
              <input
                type="date"
                value={formData.issued_at}
                onChange={(e) => setFormData(prev => ({ ...prev, issued_at: e.target.value }))}
                className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'expiration
              </label>
              <input
                type="date"
                value={formData.expires_at || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value || null }))}
                className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            {formData.license_type_id && licenseTypes
              .find(lt => lt.id === formData.license_type_id)
              ?.required_fields
              .filter(field => !['number', 'authority', 'issued_at', 'expires_at'].includes(field.name))
              .map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  {renderField(field, formData.data[field.name], (value) => {
                    setFormData(prev => ({
                      ...prev,
                      data: { ...prev.data, [field.name]: value }
                    }));
                  })}
                </div>
              ))}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Document de licence
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
                {loading ? 'Enregistrement...' : currentLicense ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditLicenseForm;