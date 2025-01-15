import React from 'react';
import { Heart, AlertTriangle, Calendar, FileText, Edit2, Trash2 } from 'lucide-react';
import { format, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Medical } from '../../types/medicals';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useMedicalMutations } from '../../hooks/useMedicalMutations';

interface MedicalCardProps {
  medical: Medical;
  onEdit?: () => void;
  canEdit?: boolean;
}

const MedicalCard: React.FC<MedicalCardProps> = ({ medical, onEdit, canEdit }) => {
  const queryClient = useQueryClient();
  const { deleteMedical } = useMedicalMutations(medical.user_id);

  if (!medical) {
    return (
      <div className="text-center text-gray-500">
        Aucun certificat médical enregistré
      </div>
    );
  }

  const isValid = !medical.expires_at || isFuture(new Date(medical.expires_at));

  const handleViewDocument = async () => {
    if (!medical.scan_id) return;

    const { data: { publicUrl } } = supabase
      .storage
      .from('medicals')
      .getPublicUrl(medical.scan_id);

    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce certificat médical ?')) {
      return;
    }

    try {
      await deleteMedical.mutateAsync(medical.id);
      toast.success('Certificat médical supprimé');
      queryClient.invalidateQueries(['medicals']);
    } catch (error) {
      console.error('Error deleting medical:', error);
      toast.error('Erreur lors de la suppression du certificat médical');
    }
  };

  return (
    <div className={`bg-white border rounded-lg p-4 ${isValid ? 'border-gray-200' : 'border-red-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${isValid ? 'bg-green-50' : 'bg-red-50'}`}>
            <Heart className={`h-5 w-5 ${isValid ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {medical.medical_type?.name}
            </h3>
            <div className="mt-1 text-sm text-gray-500 space-y-1">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Obtenu le {format(new Date(medical.obtained_at), 'dd MMMM yyyy', { locale: fr })}
              </div>
              {medical.expires_at && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Expire le {format(new Date(medical.expires_at), 'dd MMMM yyyy', { locale: fr })}
                </div>
              )}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex space-x-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {medical.scan_id && (
              <button
                onClick={handleViewDocument}
                className="p-1 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
              >
                <FileText className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalCard;