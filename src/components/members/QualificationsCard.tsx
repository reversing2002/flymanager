import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '@chakra-ui/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, BadgeCheck, Clock, Edit2, Trash2 } from 'lucide-react';
import EditQualificationsForm from './EditQualificationsForm';
import { PilotQualification } from '../../types/qualifications';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../lib/permissions';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { FileText } from 'lucide-react';

interface QualificationsCardProps {
  userId: string;
  onQualificationsChange?: () => void;
  isEditModalOpen: boolean;
  onOpenEditModal: () => void;
  onCloseEditModal: () => void;
}

const QualificationsCard: React.FC<QualificationsCardProps> = ({
  userId,
  onQualificationsChange,
  isEditModalOpen,
  onOpenEditModal,
  onCloseEditModal,
}) => {
  const { user: currentUser } = useAuth();
  const [qualifications, setQualifications] = useState<PilotQualification[]>([]);
  const [loading, setLoading] = useState(true);

  const canEdit = hasAnyGroup(currentUser, ['ADMIN', 'INSTRUCTOR']);

  const loadQualifications = async () => {
    try {
      const { data, error } = await supabase
        .from('pilot_qualifications')
        .select(`
          *,
          qualification_type:qualification_types(*)
        `)
        .eq('pilot_id', userId);

      if (error) throw error;
      setQualifications(data || []);
    } catch (err) {
      console.error('Error loading qualifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQualifications();
  }, [userId]);

  const handleDelete = async (qualificationId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette qualification ?')) return;

    try {
      const { error } = await supabase
        .from('pilot_qualifications')
        .delete()
        .eq('id', qualificationId);

      if (error) throw error;

      toast.success('Qualification supprimée avec succès');
      loadQualifications();
      if (onQualificationsChange) onQualificationsChange();
    } catch (err) {
      console.error('Error deleting qualification:', err);
      toast.error('Erreur lors de la suppression de la qualification');
    }
  };

  return (
    <div className="space-y-4">
      {qualifications.map((qualification) => (
        <div key={qualification.id} className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <BadgeCheck className="h-5 w-5 text-green-500" />
                <h4 className="text-sm font-medium text-gray-900">
                  {qualification.qualification_type.name}
                </h4>
              </div>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p>
                  Obtenue le {format(new Date(qualification.obtained_at), 'dd MMMM yyyy', { locale: fr })}
                </p>
                {qualification.expires_at && (
                  <p>
                    Expire le {format(new Date(qualification.expires_at), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                )}
                {qualification.remarks && (
                  <p className="italic">{qualification.remarks}</p>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="flex space-x-2">
                <button
                  onClick={() => onOpenEditModal()}
                  className="p-1 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(qualification.id)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {qualification.scan_id && (
                  <button
                    onClick={() => window.open(supabase.storage.from('qualifications').getPublicUrl(qualification.scan_id).data.publicUrl, '_blank')}
                    className="p-1 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      {loading && <div className="text-center">Chargement...</div>}
      {!loading && qualifications.length === 0 && (
        <div className="text-center text-gray-500">Aucune qualification enregistrée</div>
      )}

      {isEditModalOpen && (
        <EditQualificationsForm
          userId={userId}
          onClose={onCloseEditModal}
          onSuccess={() => {
            loadQualifications();
            if (onQualificationsChange) onQualificationsChange();
          }}
        />
      )}
    </div>
  );
};

export default QualificationsCard;