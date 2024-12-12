import React from 'react';
import { Card, CardBody } from '@chakra-ui/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, BadgeCheck, FileText, Edit2, Trash2 } from 'lucide-react';
import { PilotLicense } from '../../types/licenses';
import { supabase } from '../../lib/supabase';
import EditLicenseForm from './EditLicenseForm';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../lib/permissions';
import { toast } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface LicensesCardProps {
  userId: string;
  onLicensesChange?: () => void;
  isEditModalOpen: boolean;
  onOpenEditModal: () => void;
  onCloseEditModal: () => void;
  selectedLicense: PilotLicense | null;
  onSelectLicense: (license: PilotLicense) => void;
}

const fetchLicenses = async (userId: string) => {
  const { data, error } = await supabase
    .from('pilot_licenses')
    .select(`
      id,
      user_id,
      license_type_id,
      number,
      authority,
      issued_at,
      expires_at,
      scan_id,
      data,
      license_types (
        id,
        name,
        description
      )
    `)
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  if (error) throw error;
  return data;
};

const LicensesCard: React.FC<LicensesCardProps> = ({
  userId,
  onLicensesChange,
  isEditModalOpen,
  onOpenEditModal,
  onCloseEditModal,
  selectedLicense,
  onSelectLicense,
}) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = hasAnyGroup(currentUser, ['ADMIN', 'INSTRUCTOR']);

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['licenses', userId],
    queryFn: () => fetchLicenses(userId),
  });

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['licenses', userId] });
    if (onLicensesChange) {
      onLicensesChange();
    }
    onCloseEditModal();
  };

  const handleDeleteLicense = async (licenseId: number) => {
    try {
      const { error } = await supabase
        .from('pilot_licenses')
        .delete()
        .eq('id', licenseId);

      if (error) throw error;

      // Invalider le cache pour forcer un rafraîchissement
      queryClient.invalidateQueries({ queryKey: ['licenses', userId] });
      toast.success('Licence supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression de la licence:', error);
      toast.error('Erreur lors de la suppression de la licence');
    }
  };

  const getDocumentUrl = async (scanId: string) => {
    try {
      const { data: { publicUrl } } = supabase
        .storage
        .from('licenses')
        .getPublicUrl(scanId);
      
      return publicUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      return null;
    }
  };

  const handleViewDocument = async (scanId: string) => {
    const url = await getDocumentUrl(scanId);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Erreur lors de l\'ouverture du document');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center">Chargement...</div>
    );
  }

  return (
    <div className="space-y-4">
      {licenses.map((license) => (
        <div key={license.id} className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <BadgeCheck className="h-5 w-5 text-green-500" />
                <h4 className="text-sm font-medium text-gray-900">
                  {license.license_types?.name}
                </h4>
              </div>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p>N° {license.number}</p>
                <p>Délivré par {license.authority}</p>
                <p>
                  Délivré le {format(new Date(license.issued_at), 'dd MMMM yyyy', { locale: fr })}
                </p>
                {license.expires_at && (
                  <p>
                    Expire le {format(new Date(license.expires_at), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    onSelectLicense(license);
                    onOpenEditModal();
                  }}
                  className="p-1 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteLicense(license.id)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {license.scan_id && (
                  <button
                    onClick={() => handleViewDocument(license.scan_id!)}
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
      {!isLoading && licenses.length === 0 && (
        <div className="text-center text-gray-500">Aucune licence enregistrée</div>
      )}
      {isEditModalOpen && (
        <EditLicenseForm
          userId={userId}
          onClose={onCloseEditModal}
          onSuccess={handleEditSuccess}
          currentLicense={selectedLicense}
        />
      )}
    </div>
  );
};

export default LicensesCard;
