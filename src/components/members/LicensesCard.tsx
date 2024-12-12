import React, { useState, useEffect } from 'react';
import { Card, CardBody } from '@chakra-ui/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, BadgeCheck, FileText } from 'lucide-react';
import { PilotLicense } from '../../types/licenses';
import { supabase } from '../../lib/supabase';
import EditLicenseForm from './EditLicenseForm';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../lib/permissions';

interface LicensesCardProps {
  userId: string;
  onLicensesChange?: () => void;
  isEditModalOpen: boolean;
  onOpenEditModal: () => void;
  onCloseEditModal: () => void;
}

const LicensesCard: React.FC<LicensesCardProps> = ({
  userId,
  onLicensesChange,
  isEditModalOpen,
  onOpenEditModal,
  onCloseEditModal,
}) => {
  const { user: currentUser } = useAuth();
  const [licenses, setLicenses] = useState<PilotLicense[]>([]);
  const [loading, setLoading] = useState(true);

  const canEdit = hasAnyGroup(currentUser, ['ADMIN', 'INSTRUCTOR']);

  const loadLicenses = async () => {
    try {
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
          license_type:license_types(
            id,
            name,
            description,
            category,
            validity_period,
            required_medical_class,
            required_fields
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      setLicenses(data || []);
    } catch (err) {
      console.error('Error loading licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, [userId]);

  const handleEditSuccess = () => {
    loadLicenses();
    if (onLicensesChange) {
      onLicensesChange();
    }
    onCloseEditModal();
  };

  const isLicenseValid = (license: PilotLicense) => {
    if (!license.expires_at) return true;
    return new Date(license.expires_at) > new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardBody>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-slate-100 rounded-lg"></div>
            <div className="h-12 bg-slate-100 rounded-lg"></div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardBody>
          {licenses.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune licence</p>
          ) : (
            <div className="space-y-3">
              {licenses.map((license) => (
                <div
                  key={license.id}
                  className="flex items-start justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-grow">
                    <div className="font-medium">
                      {license.license_type?.name}
                      <span className="ml-2 text-sm text-slate-600">
                        {license.number}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      Délivrée le {format(new Date(license.issued_at), 'dd MMMM yyyy', { locale: fr })}
                      {license.expires_at && (
                        <> • Expire le {format(new Date(license.expires_at), 'dd MMMM yyyy', { locale: fr })}</>
                      )}
                    </div>
                    {(license.authority || license.data.ratings) && (
                      <div className="text-sm text-slate-600 mt-1">
                        {license.authority && <span>Autorité : {license.authority}</span>}
                        {license.data.ratings && (
                          <span className="ml-2">• Qualifications : {license.data.ratings}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {license.scan_id && (
                      <button
                        onClick={() => window.open(`/api/documents/${license.scan_id}`, '_blank')}
                        className="p-1.5 text-sky-600 hover:text-sky-700 rounded-full transition-colors"
                        title="Voir le document"
                      >
                        <FileText className="h-5 w-5" />
                      </button>
                    )}
                    {isLicenseValid(license) ? (
                      <BadgeCheck className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {isEditModalOpen && (
        <EditLicenseForm
          userId={userId}
          onClose={onCloseEditModal}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
};

export default LicensesCard;
