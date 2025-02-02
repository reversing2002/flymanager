import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, X, Calendar, Infinity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import type { QualificationType, PilotQualification } from '../../types/qualifications';
import { loadQualificationsWithOrder } from '../../lib/utils/qualificationUtils';

interface EditQualificationsFormProps {
  userId: string;
  onClose: () => void;
  onSuccess?: () => void;
  qualification?: PilotQualification;
}

interface QualificationFormData {
  qualification_type_id: string;
  obtained_at: string;
  expires_at: string | null;
  has_expiration: boolean;
}

const fetchQualificationTypes = async (clubId: string | undefined) => {
  const { data, error } = await supabase
    .from('qualification_types')
    .select('*');

  if (error) throw error;
  return loadQualificationsWithOrder(clubId, data || []);
};

const EditQualificationsForm: React.FC<EditQualificationsFormProps> = ({
  userId,
  onClose,
  onSuccess,
  qualification,
}) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<QualificationFormData>({
    qualification_type_id: qualification?.qualification_type_id || '',
    obtained_at: qualification?.obtained_at ? format(new Date(qualification.obtained_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    expires_at: qualification?.expires_at ? format(new Date(qualification.expires_at), 'yyyy-MM-dd') : null,
    has_expiration: qualification?.expires_at !== null,
  });

  const { data: qualificationTypes = [] } = useQuery({
    queryKey: ['qualificationTypes', currentUser?.club?.id],
    queryFn: () => fetchQualificationTypes(currentUser?.club?.id),
  });

  const addQualificationMutation = useMutation({
    mutationFn: async (data: QualificationFormData) => {
      const qualificationData = {
        pilot_id: userId,
        qualification_type_id: data.qualification_type_id,
        obtained_at: new Date(data.obtained_at).toISOString(),
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
      };

      const { data: newQualification, error } = await supabase
        .from('pilot_qualifications')
        .insert([qualificationData])
        .select()
        .single();

      if (error) throw error;
      return newQualification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualifications', userId] });
      toast.success('Qualification ajoutée avec succès');
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error('Erreur lors de l\'ajout de la qualification:', error);
      toast.error('Erreur lors de l\'ajout de la qualification');
      setError('Une erreur est survenue lors de l\'ajout de la qualification');
    },
  });

  const updateQualificationMutation = useMutation({
    mutationFn: async (data: QualificationFormData) => {
      const qualificationData = {
        qualification_type_id: data.qualification_type_id,
        obtained_at: new Date(data.obtained_at).toISOString(),
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
      };

      const { data: updatedQualification, error } = await supabase
        .from('pilot_qualifications')
        .update([qualificationData])
        .eq('id', qualification?.id)
        .select()
        .single();

      if (error) throw error;
      return updatedQualification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualifications', userId] });
      toast.success('Qualification mise à jour avec succès');
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour de la qualification:', error);
      toast.error('Erreur lors de la mise à jour de la qualification');
      setError('Une erreur est survenue lors de la mise à jour de la qualification');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.qualification_type_id) {
      setError('Veuillez sélectionner un type de qualification');
      return;
    }

    if (qualification) {
      updateQualificationMutation.mutate(formData);
    } else {
      addQualificationMutation.mutate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{qualification ? 'Mettre à jour une qualification' : 'Ajouter une qualification'}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de qualification
              </label>
              <select
                value={formData.qualification_type_id}
                onChange={(e) => setFormData({ ...formData, qualification_type_id: e.target.value })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
              >
                <option value="">Sélectionner un type</option>
                {qualificationTypes.map((type) => (
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
                onChange={(e) => setFormData({ ...formData, obtained_at: e.target.value })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="has_expiration"
                checked={formData.has_expiration}
                onChange={(e) => {
                  const hasExpiration = e.target.checked;
                  setFormData({
                    ...formData,
                    has_expiration: hasExpiration,
                    expires_at: hasExpiration ? formData.expires_at || format(new Date(), 'yyyy-MM-dd') : null
                  });
                }}
                className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
              />
              <label htmlFor="has_expiration" className="ml-2 block text-sm text-gray-700">
                A une date d'expiration
              </label>
            </div>

            {formData.has_expiration && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'expiration
                </label>
                <input
                  type="date"
                  value={formData.expires_at || ''}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
                disabled={addQualificationMutation.isPending || updateQualificationMutation.isPending}
              >
                {addQualificationMutation.isPending || updateQualificationMutation.isPending ? 'Enregistrement en cours...' : qualification ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditQualificationsForm;