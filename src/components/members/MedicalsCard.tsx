import React, { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { Medical } from '../../types/medicals';
import EditMedicalForm from './EditMedicalForm';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../utils/permissions';

interface MedicalsCardProps {
  userId: string;
  editable?: boolean;
}

const MedicalsCard: React.FC<MedicalsCardProps> = ({ userId, editable = false }) => {
  const { user: currentUser } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMedical, setSelectedMedical] = useState<Medical | undefined>();

  const { data: medicals, isLoading, refetch } = useQuery({
    queryKey: ['medicals', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicals')
        .select(`
          *,
          medical_type:medical_types(*)
        `)
        .eq('user_id', userId)
        .order('obtained_at', { ascending: false });

      if (error) throw error;
      return data as Medical[];
    }
  });

  const handleAddMedical = () => {
    setSelectedMedical(undefined);
    setShowEditModal(true);
  };

  const handleEditMedical = (medical: Medical) => {
    setSelectedMedical(medical);
    setShowEditModal(true);
  };

  const handleDeleteMedical = async (medical: Medical) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce certificat médical ?')) {
      return;
    }

    try {
      if (medical.scan_id) {
        const { error: storageError } = await supabase.storage
          .from('medicals')
          .remove([medical.scan_id]);

        if (storageError) throw storageError;
      }

      const { error } = await supabase
        .from('medicals')
        .delete()
        .eq('id', medical.id);

      if (error) throw error;

      toast.success('Certificat médical supprimé');
      refetch();
    } catch (error) {
      console.error('Error deleting medical:', error);
      toast.error('Erreur lors de la suppression du certificat médical');
    }
  };

  const handleViewDocument = async (medical: Medical) => {
    if (!medical.scan_id) return;

    const { data: { publicUrl } } = await supabase.storage
      .from('medicals')
      .getPublicUrl(medical.scan_id);

    window.open(publicUrl, '_blank');
  };

  const canEdit = editable && (
    hasAnyGroup(currentUser, ['admin', 'instructor']) ||
    currentUser?.id === userId
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Certificats médicaux</h2>
          {canEdit && (
            <button
              onClick={handleAddMedical}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter</span>
            </button>
          )}
        </div>
      </div>

      <div className="divide-y">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">
            Chargement...
          </div>
        ) : !medicals?.length ? (
          <div className="p-6 text-center text-gray-500">
            Aucun certificat médical
          </div>
        ) : (
          medicals.map((medical) => (
            <div key={medical.id} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">
                    {medical.medical_type?.name}
                  </h3>
                  <div className="mt-1 text-sm text-gray-600">
                    Obtenu le {format(new Date(medical.obtained_at), 'dd MMMM yyyy', { locale: fr })}
                    {medical.medical_type?.requires_end_date ? (
                      medical.expires_at ? (
                        <>
                          {' • '}
                          Expire le {format(new Date(medical.expires_at), 'dd MMMM yyyy', { locale: fr })}
                        </>
                      ) : (
                        <>
                          {' • '}
                          <span className="text-red-600">Date d'expiration manquante</span>
                        </>
                      )
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {medical.scan_id && (
                    <button
                      onClick={() => handleViewDocument(medical)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Voir le document"
                    >
                      <FileText className="h-5 w-5" />
                    </button>
                  )}
                  {canEdit && (
                    <>
                      <button
                        onClick={() => handleEditMedical(medical)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteMedical(medical)}
                        className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showEditModal && (
        <EditMedicalForm
          userId={userId}
          medical={selectedMedical}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default MedicalsCard;
