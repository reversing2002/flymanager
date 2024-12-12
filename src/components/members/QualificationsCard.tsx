import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '@chakra-ui/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, BadgeCheck, Clock, Edit } from 'lucide-react';
import EditQualificationsForm from './EditQualificationsForm';
import { PilotQualification } from '../../types/qualifications';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../lib/permissions';
import { supabase } from '../../lib/supabase';

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

  const handleEditSuccess = () => {
    loadQualifications();
    if (onQualificationsChange) {
      onQualificationsChange();
    }
    onCloseEditModal();
  };

  const isQualificationValid = (qualification: PilotQualification) => {
    if (!qualification.expires_at) return true;
    if (!qualification.qualification_type?.requires_instructor_validation) return true;
    if (!qualification.validated_at) return false;
    return new Date(qualification.expires_at) > new Date();
  };

  const isQualificationExpired = (qualification: PilotQualification) => {
    if (!qualification.expires_at) return false;
    return new Date(qualification.expires_at) < new Date();
  };

  const isQualificationPendingValidation = (qualification: PilotQualification) => {
    return qualification.qualification_type?.requires_instructor_validation && !qualification.validated_at;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Qualifications</h3>
        </CardHeader>
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
          {qualifications.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune qualification</p>
          ) : (
            <div className="space-y-3">
              {qualifications.map((qualification) => (
                <div
                  key={qualification.id}
                  className="flex items-start justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-grow">
                    <div className="font-medium">
                      {qualification.qualification_type?.name}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      Obtenue le{' '}
                      {format(new Date(qualification.obtained_at), 'dd MMMM yyyy', {
                        locale: fr,
                      })}
                      {qualification.expires_at && (
                        <> • Expire le{' '}
                        {format(new Date(qualification.expires_at), 'dd MMMM yyyy', {
                          locale: fr,
                        })}</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center ml-4">
                    {isQualificationValid(qualification) ? (
                      <BadgeCheck className="w-5 h-5 text-emerald-500" />
                    ) : isQualificationExpired(qualification) ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : isQualificationPendingValidation(qualification) ? (
                      <Clock className="w-5 h-5 text-amber-500" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {isEditModalOpen && (
        <EditQualificationsForm
          userId={userId}
          onClose={onCloseEditModal}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
};

export default QualificationsCard;