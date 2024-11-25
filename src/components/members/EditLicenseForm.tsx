import React, { useState } from 'react';
import { AlertTriangle, X, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { License } from './LicenseCard';

interface EditLicenseFormProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  currentLicense?: License;
}

const LICENSE_TYPES = [
  { value: 'STUDENT', label: 'Élève Pilote', requiresExpiry: false, requiresNumber: false },
  { value: 'PPL', label: 'PPL', requiresExpiry: true, requiresNumber: true },
  { value: 'CPL', label: 'CPL', requiresExpiry: true, requiresNumber: true },
  { value: 'ATPL', label: 'ATPL', requiresExpiry: true, requiresNumber: true },
  { value: 'ULM', label: 'ULM', requiresExpiry: false, requiresNumber: true },
  { value: 'LAPL', label: 'LAPL', requiresExpiry: true, requiresNumber: true },
];

const EditLicenseForm: React.FC<EditLicenseFormProps> = ({
  userId,
  onClose,
  onSuccess,
  currentLicense,
}) => {
  const [formData, setFormData] = useState({
    type: currentLicense?.type || '',
    number: currentLicense?.number || '',
    valid_until: currentLicense?.valid_until ? 
      new Date(currentLicense.valid_until).toISOString().split('T')[0] : '',
    document_url: currentLicense?.document_url || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectedLicenseType = LICENSE_TYPES.find(lt => lt.value === formData.type);
  const requiresExpiry = selectedLicenseType?.requiresExpiry ?? false;
  const requiresNumber = selectedLicenseType?.requiresNumber ?? false;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
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

      const { data: { publicUrl } } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, document_url: publicUrl }));
      toast.success('Document téléchargé');
    } catch (err) {
      console.error('Error uploading file:', err);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!formData.document_url) return;

    try {
      const filePath = formData.document_url.split('/').pop();
      if (!filePath) return;

      const { error } = await supabase.storage
        .from('licenses')
        .remove([`license-documents/${filePath}`]);

      if (error) throw error;

      setFormData(prev => ({ ...prev, document_url: '' }));
      toast.success('Document supprimé');
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
      // If adding a non-student license, remove student license if it exists
      if (formData.type !== 'STUDENT') {
        const { data: studentLicense } = await supabase
          .from('pilot_licenses')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'STUDENT')
          .single();

        if (studentLicense) {
          const { error: deleteError } = await supabase
            .from('pilot_licenses')
            .delete()
            .eq('id', studentLicense.id);

          if (deleteError) throw deleteError;
        }
      }

      const licenseData = {
        user_id: userId,
        type: formData.type,
        number: requiresNumber ? formData.number : null,
        valid_until: requiresExpiry && formData.valid_until ? 
          new Date(formData.valid_until).toISOString() : null,
        document_url: formData.document_url || null,
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

      toast.success('Licence mise à jour');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating license:', err);
      setError('Erreur lors de la mise à jour de la licence');
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type de licence
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            >
              <option value="">Sélectionner un type</option>
              {LICENSE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {requiresNumber && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Numéro de licence
              </label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>
          )}

          {requiresExpiry && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date de validité
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Document
            </label>
            {formData.document_url ? (
              <div className="relative">
                <img
                  src={formData.document_url}
                  alt="License document"
                  className="max-h-48 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleDeleteDocument}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="sr-only"
                  id="license-document"
                  disabled={isUploading}
                />
                <label
                  htmlFor="license-document"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-sky-500 transition-colors"
                >
                  <Upload className="h-8 w-8 text-slate-400" />
                  <span className="mt-2 text-sm text-slate-600">
                    {isUploading ? 'Téléchargement...' : 'Cliquez pour ajouter un document'}
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading || isUploading}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLicenseForm;