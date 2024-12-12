import React from 'react';
import { Heart, AlertTriangle, Calendar, FileText } from 'lucide-react';
import { format, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Medical } from '../../types/medicals';
import { supabase } from '../../lib/supabase';

interface MedicalCardProps {
  medical: Medical;
  onEdit?: () => void;
}

const MedicalCard: React.FC<MedicalCardProps> = ({ medical, onEdit }) => {
  const isValid = medical.expires_at ? isFuture(new Date(medical.expires_at)) : true;

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
                  {isValid ? 'Valide' : 'Expiré'} le {format(new Date(medical.expires_at), 'dd MMMM yyyy', { locale: fr })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {medical.scan_id && (
            <button
              onClick={handleViewDocument}
              className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-50"
              title="Voir le document"
            >
              <FileText className="h-5 w-5" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:text-blue-700 rounded-full hover:bg-blue-50"
            >
              Modifier
            </button>
          )}
        </div>
      </div>

      {!isValid && (
        <div className="mt-3 flex items-center text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 mr-1" />
          Ce certificat médical a expiré
        </div>
      )}
    </div>
  );
};

export default MedicalCard;