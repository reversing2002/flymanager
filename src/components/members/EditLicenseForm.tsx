import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Upload, Trash2 } from 'lucide-react';
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
  const [formData, setFormData] = useState<FormData>({
    license_type_id: currentLicense?.license_type_id || '',
    number: currentLicense?.number || '',
    authority: currentLicense?.authority || 'DGAC',
    issued_at: currentLicense?.issued_at ? format(new Date(currentLicense.issued_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    expires_at: currentLicense?.expires_at ? format(new Date(currentLicense.expires_at), 'yyyy-MM-dd') : null,
    data: currentLicense?.data || {},
  });

  useEffect(() => {
    loadLicenseTypes();
  }, [currentUser?.club?.id]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `license-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      if (currentLicense) {
        const { error: updateError } = await supabase
          .from('pilot_licenses')
          .update({ scan_id: filePath })
          .eq('id', currentLicense.id);

        if (updateError) throw updateError;
      }

      toast.success('Document téléchargé');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error uploading file:', err);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!currentLicense?.scan_id) return;

    try {
      const { error: deleteError } = await supabase.storage
        .from('licenses')
        .remove([currentLicense.scan_id]);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('pilot_licenses')
        .update({ scan_id: null })
        .eq('id', currentLicense.id);

      if (updateError) throw updateError;

      toast.success('Document supprimé');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error('Erreur lors de la suppression');
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

            {currentLicense && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document
                </label>
                {currentLicense.scan_id ? (
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => window.open(`/api/documents/${currentLicense.scan_id}`, '_blank')}
                      className="text-sm text-sky-600 hover:text-sky-700"
                    >
                      Voir le document
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteDocument}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Supprimer le document
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="application/pdf,image/*"
                    />
                    <button
                      type="button"
                      className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1"
                    >
                      <Upload className="h-4 w-4" />
                      Ajouter un document
                    </button>
                  </div>
                )}
              </div>
            )}

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