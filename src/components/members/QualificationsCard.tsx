import React, { useState } from 'react';
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
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

interface QualificationsCardProps {
  userId: string;
  isEditModalOpen: boolean;
  onOpenEditModal: () => void;
  onCloseEditModal: () => void;
  canEdit?: boolean;
}

const fetchQualifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('pilot_qualifications')
    .select(`
      *,
      qualification_type:qualification_types(*)
    `)
    .eq('pilot_id', userId);

  if (error) throw error;
  return data || [];
};

const isFuture = (date: Date) => {
  return date > new Date();
};

const QualificationsCard: React.FC<QualificationsCardProps> = ({
  userId,
  isEditModalOpen,
  onOpenEditModal,
  onCloseEditModal,
  canEdit: canEditProp,
}) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = canEditProp ?? hasAnyGroup(currentUser, ['ADMIN', 'INSTRUCTOR']);
  const [selectedQualification, setSelectedQualification] = useState<PilotQualification | null>(null);

  const { data: qualifications = [], isLoading } = useQuery({
    queryKey: ['qualifications', userId],
    queryFn: () => fetchQualifications(userId),
  });

  const deleteMutation = useMutation({
    mutationFn: async (qualificationId: string) => {
      const { error } = await supabase
        .from('pilot_qualifications')
        .delete()
        .eq('id', qualificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualifications', userId] });
      toast.success('Qualification supprimée avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors de la suppression de la qualification:', error);
      toast.error('Erreur lors de la suppression de la qualification');
    },
  });

  const handleDelete = async (qualificationId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette qualification ?')) {
      deleteMutation.mutate(qualificationId);
    }
  };

  const isQualificationValid = (qualification: PilotQualification) => {
    return !qualification.expires_at || isFuture(new Date(qualification.expires_at));
  };

  if (isLoading) {
    return <div className="text-center">Chargement...</div>;
  }

  return (
    <>
      <Card>
        <CardBody>
          {qualifications.map((qualification) => (
            <div
              key={qualification.id}
              className="mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${isQualificationValid(qualification) ? 'bg-green-50' : 'bg-red-50'}`}>
                    <BadgeCheck className={`h-5 w-5 ${isQualificationValid(qualification) ? 'text-green-500' : 'text-red-500'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {qualification.qualification_type?.name}
                    </h4>
                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      <p className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Obtenue le {format(new Date(qualification.obtained_at), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                      {qualification.expires_at && (
                        <p className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Expire le {format(new Date(qualification.expires_at), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedQualification(qualification);
                        onOpenEditModal();
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 rounded-full hover:bg-gray-100"
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
          {!isLoading && qualifications.length === 0 && (
            <div className="text-center text-gray-500">Aucune qualification enregistrée</div>
          )}
        </CardBody>
      </Card>
      {isEditModalOpen && (
        <EditQualificationsForm
          userId={userId}
          onClose={() => {
            onCloseEditModal();
            setSelectedQualification(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['qualifications', userId] });
          }}
          qualification={selectedQualification || undefined}
        />
      )}
    </>
  );
};

export default QualificationsCard;