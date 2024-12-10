import React, { useEffect, useState } from 'react';
import { Heart, AlertTriangle, Calendar, Plus, ExternalLink } from 'lucide-react';
import { format, isFuture, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from "../../lib/permissions";

interface MedicalCardProps {
  userId: string;
  onAddMedical?: () => void;
  onEditMedical?: (medical: Medical) => void;
}

export interface Medical {
  id: string;
  class: 'CLASS_1' | 'CLASS_2';
  valid_from: string;
  valid_until: string;
  document_url?: string;
}

const MEDICAL_CLASSES = {
  CLASS_1: 'Classe 1',
  CLASS_2: 'Classe 2',
};

const MedicalCard: React.FC<MedicalCardProps> = ({ 
  userId, 
  onAddMedical,
  onEditMedical,
}) => {
  const { user: currentUser } = useAuth();
  const [medicals, setMedicals] = useState<Medical[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const channel = supabase
      .channel('medical_certifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medical_certifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadMedicals();
        }
      )
      .subscribe();

    loadMedicals();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadMedicals = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_certifications')
        .select('*')
        .eq('user_id', userId)
        .order('valid_until', { ascending: false });

      if (error) throw error;
      setMedicals(data || []);
    } catch (error) {
      console.error('Error loading medical certifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-white rounded-xl h-48"></div>;
  }

  const canManageMedicals = hasAnyGroup(currentUser, ['ADMIN', 'INSTRUCTOR']);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-slate-600" />
          Certificats médicaux
        </h2>
        {canManageMedicals && onAddMedical && (
          <button
            onClick={onAddMedical}
            className="flex items-center justify-center w-8 h-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-full transition-colors"
            title="Ajouter un certificat médical"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      {medicals.length > 0 ? (
        <div className="space-y-4">
          {medicals.map((medical) => {
            const isValid = isFuture(new Date(medical.valid_until));
            const isExpiringSoon = 
              isFuture(new Date(medical.valid_until)) && 
              !isFuture(addMonths(new Date(), 3));

            return (
              <div 
                key={medical.id}
                className="p-4 border rounded-lg hover:bg-slate-50 transition-colors relative group"
              >
                {canManageMedicals && onEditMedical && (
                  <button
                    onClick={() => onEditMedical(medical)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-sky-600 hover:text-sky-700"
                  >
                    Modifier
                  </button>
                )}

                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-slate-600">Classe</div>
                    <div className="font-medium text-slate-900">
                      {MEDICAL_CLASSES[medical.class]}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-600">Validité</div>
                    <div className="font-medium text-slate-900">
                      Du {format(new Date(medical.valid_from), 'dd MMMM yyyy', { locale: fr })}
                      <br />
                      Au {format(new Date(medical.valid_until), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                  </div>

                  {medical.document_url && (
                    <div>
                      <a
                        href={medical.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Voir le document
                      </a>
                    </div>
                  )}

                  {isExpiringSoon && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-800 rounded text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Expire bientôt</span>
                    </div>
                  )}

                  {!isValid && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 text-red-800 rounded text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Expiré</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Aucun certificat médical enregistré</span>
        </div>
      )}
    </div>
  );
};

export default MedicalCard;