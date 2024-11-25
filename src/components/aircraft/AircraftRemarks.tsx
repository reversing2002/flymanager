import React, { useState, useEffect } from 'react';
import { AlertTriangle, MessageSquare, Plus, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import type { AircraftRemark, AircraftRemarkResponse } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface AircraftRemarksProps {
  aircraftId: string;
}

const AircraftRemarks: React.FC<AircraftRemarksProps> = ({ aircraftId }) => {
  const { user } = useAuth();
  const [remarks, setRemarks] = useState<AircraftRemark[]>([]);
  const [responses, setResponses] = useState<Record<string, AircraftRemarkResponse[]>>({});
  const [newRemark, setNewRemark] = useState('');
  const [loading, setLoading] = useState(false);

  const isMechanic = user?.role === 'MECHANIC';
  const isAdmin = user?.role === 'ADMIN';
  const canManageStatus = isMechanic || isAdmin;

  useEffect(() => {
    loadRemarks();
  }, [aircraftId]);

  const loadRemarks = async () => {
    try {
      // Load remarks
      const { data: remarksData } = await supabase
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

      if (remarksData) {
        setRemarks(remarksData);

        // Load responses for each remark
        const responsesData: Record<string, AircraftRemarkResponse[]> = {};
        for (const remark of remarksData) {
          const { data: remarkResponses } = await supabase
            .from('aircraft_remark_responses')
            .select(`
              *,
              user:user_id (
                firstName:first_name,
                lastName:last_name
              )
            `)
            .eq('remark_id', remark.id)
            .order('created_at');

          if (remarkResponses) {
            responsesData[remark.id] = remarkResponses;
          }
        }
        setResponses(responsesData);
      }
    } catch (error) {
      console.error('Error loading remarks:', error);
      toast.error('Erreur lors du chargement des remarques');
    }
  };

  const handleSubmitRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemark.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('aircraft_remarks').insert([
        {
          aircraft_id: aircraftId,
          user_id: user.id,
          content: newRemark.trim(),
          status: 'PENDING',
        },
      ]);

      if (error) throw error;

      setNewRemark('');
      loadRemarks();
      toast.success('Remarque ajoutée');
    } catch (error) {
      console.error('Error creating remark:', error);
      toast.error('Erreur lors de la création de la remarque');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async (remarkId: string, content: string) => {
    if (!content.trim() || !user) return;

    try {
      const { error } = await supabase.from('aircraft_remark_responses').insert([
        {
          remark_id: remarkId,
          user_id: user.id,
          content: content.trim(),
        },
      ]);

      if (error) throw error;

      loadRemarks();
      toast.success('Réponse ajoutée');
    } catch (error) {
      console.error('Error creating response:', error);
      toast.error('Erreur lors de la création de la réponse');
    }
  };

  const handleUpdateStatus = async (remarkId: string, newStatus: AircraftRemark['status']) => {
    try {
      const { error } = await supabase
        .from('aircraft_remarks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', remarkId);

      if (error) throw error;

      loadRemarks();
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const getStatusColor = (status: AircraftRemark['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'IN_PROGRESS':
        return 'bg-sky-100 text-sky-800';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800';
    }
  };

  const getStatusLabel = (status: AircraftRemark['status']) => {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'RESOLVED':
        return 'Résolu';
    }
  };

  const canAddRemark = user?.role !== 'MECHANIC';
  const canAddResponse = user?.role === 'MECHANIC' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {canAddRemark && (
        <form onSubmit={handleSubmitRemark} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nouvelle remarque
            </label>
            <textarea
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              rows={3}
              placeholder="Décrivez le problème ou la remarque..."
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !newRemark.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter la remarque</span>
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {remarks.map((remark) => (
          <div
            key={remark.id}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-slate-900">{remark.content}</p>
                  <div className="mt-2 text-sm text-slate-500">
                    {remark.user?.firstName} {remark.user?.lastName} •{' '}
                    {format(new Date(remark.created_at), 'PPP', { locale: fr })}
                  </div>
                </div>
                {canManageStatus ? (
                  <select
                    value={remark.status}
                    onChange={(e) => handleUpdateStatus(remark.id, e.target.value as AircraftRemark['status'])}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(remark.status)}`}
                  >
                    <option value="PENDING">En attente</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="RESOLVED">Résolu</option>
                  </select>
                ) : (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(remark.status)}`}>
                    {getStatusLabel(remark.status)}
                  </span>
                )}
              </div>

              {responses[remark.id]?.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-slate-200 space-y-4">
                  {responses[remark.id].map((response) => (
                    <div key={response.id} className="text-sm">
                      <p className="text-slate-900">{response.content}</p>
                      <div className="mt-1 text-slate-500">
                        {response.user?.firstName} {response.user?.lastName} •{' '}
                        {format(new Date(response.created_at), 'PPP', {
                          locale: fr,
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {canAddResponse && remark.status !== 'RESOLVED' && (
                <div className="mt-4 pt-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const input = form.elements.namedItem(
                        'response'
                      ) as HTMLInputElement;
                      handleSubmitResponse(remark.id, input.value);
                      input.value = '';
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      name="response"
                      placeholder="Ajouter une réponse..."
                      className="flex-1 rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                      required
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Répondre</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}

        {remarks.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune remarque pour le moment</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AircraftRemarks;