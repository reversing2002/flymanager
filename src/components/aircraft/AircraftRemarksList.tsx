import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AircraftRemark, AircraftRemarkResponse } from '../../types/database';

interface AircraftRemarksListProps {
  aircraftId: string;
  onClose: () => void;
}

const AircraftRemarksList: React.FC<AircraftRemarksListProps> = ({ aircraftId, onClose }) => {
  const [remarks, setRemarks] = useState<AircraftRemark[]>([]);
  const [responses, setResponses] = useState<Record<string, AircraftRemarkResponse[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRemarks();
  }, [aircraftId]);

  const loadRemarks = async () => {
    try {
      setLoading(true);
      const { data: remarksData, error: remarksError } = await supabase
        .from('aircraft_remarks')
        .select(`
          *,
          user:user_id (
            firstName:first_name,
            lastName:last_name
          )
        `)
        .eq('aircraft_id', aircraftId)
        .order('created_at', { ascending: false });

      if (remarksError) throw remarksError;
      setRemarks(remarksData || []);

      // Charger les réponses pour chaque remarque
      const remarkResponses: Record<string, AircraftRemarkResponse[]> = {};
      for (const remark of remarksData || []) {
        const { data: responseData, error: responseError } = await supabase
          .from('aircraft_remark_responses')
          .select(`
            *,
            user:user_id (
              firstName:first_name,
              lastName:last_name
            )
          `)
          .eq('remark_id', remark.id)
          .order('created_at', { ascending: true });

        if (responseError) throw responseError;
        remarkResponses[remark.id] = responseData || [];
      }
      setResponses(remarkResponses);
    } catch (error) {
      console.error('Erreur lors du chargement des remarques:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Remarques sur l'aéronef
              </h3>
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span className="sr-only">Fermer</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                </div>
              ) : remarks.length === 0 ? (
                <p className="text-center text-gray-500">Aucune remarque pour cet aéronef</p>
              ) : (
                remarks.map((remark) => (
                  <div key={remark.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-900">{remark.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Par {remark.user.firstName} {remark.user.lastName} le{' '}
                          {format(new Date(remark.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          remark.status === 'RESOLVED'
                            ? 'bg-green-100 text-green-800'
                            : remark.status === 'IN_PROGRESS'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {remark.status === 'RESOLVED'
                          ? 'Résolu'
                          : remark.status === 'IN_PROGRESS'
                          ? 'En cours'
                          : 'En attente'}
                      </span>
                    </div>

                    {/* Réponses */}
                    {responses[remark.id]?.length > 0 && (
                      <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-2">
                        {responses[remark.id].map((response) => (
                          <div key={response.id} className="text-sm">
                            <p className="text-gray-900">{response.content}</p>
                            <p className="text-xs text-gray-500">
                              Par {response.user.firstName} {response.user.lastName} le{' '}
                              {format(new Date(response.created_at), 'dd MMMM yyyy à HH:mm', {
                                locale: fr,
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AircraftRemarksList;
