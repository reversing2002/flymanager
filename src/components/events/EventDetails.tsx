import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Globe, Lock, MapPin, Calendar, Clock, Users, Check, X as XIcon, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { ClubEvent } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';

interface EventDetailsProps {
  event: ClubEvent;
  onClose: () => void;
  onEdit?: () => void;
  onSuccess: () => void;
}

interface Participant {
  user_id: string;
  status: 'GOING' | 'NOT_GOING' | 'MAYBE';
  user: {
    firstName: string;
    lastName: string;
  };
}

const EventDetails: React.FC<EventDetailsProps> = ({ event, onClose, onEdit, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userStatus, setUserStatus] = useState<'GOING' | 'NOT_GOING' | 'MAYBE' | null>(null);

  useEffect(() => {
    loadParticipants();
  }, [event.id]);

  const loadParticipants = async () => {
    try {
      const { data: participantsData, error } = await supabase
        .from('event_participants')
        .select(`
          user_id,
          status,
          user:user_id (
            firstName:first_name,
            lastName:last_name
          )
        `)
        .eq('event_id', event.id);

      if (error) throw error;

      setParticipants(participantsData);
      
      // Trouver le statut de l'utilisateur courant
      const userParticipation = participantsData.find(p => p.user_id === user?.id);
      setUserStatus(userParticipation?.status || null);
    } catch (error) {
      console.error('Error loading participants:', error);
      toast.error('Erreur lors du chargement des participants');
    }
  };

  const handleParticipation = async (status: 'GOING' | 'NOT_GOING' | 'MAYBE') => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_participants')
        .upsert({
          event_id: event.id,
          user_id: user.id,
          status,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setUserStatus(status);
      await loadParticipants();
      toast.success('Participation mise à jour');
    } catch (error) {
      console.error('Error updating participation:', error);
      toast.error('Erreur lors de la mise à jour de la participation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('club_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Événement supprimé');
      onSuccess();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'SOCIAL':
        return 'Social';
      case 'FLIGHT':
        return 'Vol';
      case 'TRAINING':
        return 'Formation';
      case 'MAINTENANCE':
        return 'Maintenance';
      default:
        return type;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'SOCIAL':
        return 'bg-emerald-100 text-emerald-800';
      case 'FLIGHT':
        return 'bg-sky-100 text-sky-800';
      case 'TRAINING':
        return 'bg-amber-100 text-amber-800';
      case 'MAINTENANCE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getParticipantsByStatus = (status: 'GOING' | 'NOT_GOING' | 'MAYBE') => {
    return participants.filter(p => p.status === status);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{event.title}</h2>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(
                event.type
              )}`}
            >
              {getEventTypeLabel(event.type)}
            </span>
            {event.visibility === 'PUBLIC' ? (
              <Globe className="h-4 w-4 text-slate-400" />
            ) : (
              <Lock className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {event.description && (
            <p className="text-slate-600 whitespace-pre-wrap">{event.description}</p>
          )}

          <div className="space-y-4">
            {event.location && (
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin className="h-5 w-5" />
                <span>{event.location}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-slate-600">
              <Calendar className="h-5 w-5" />
              <span>
                {format(new Date(event.start_time), 'EEEE d MMMM yyyy', {
                  locale: fr,
                })}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-600">
              <Clock className="h-5 w-5" />
              <span>
                {format(new Date(event.start_time), 'HH:mm')} -{' '}
                {format(new Date(event.end_time), 'HH:mm')}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-600">
              <Users className="h-5 w-5" />
              <div>
                <div className="font-medium">Participants</div>
                <div className="text-sm space-y-1">
                  {getParticipantsByStatus('GOING').length} confirmé(s)
                  {getParticipantsByStatus('MAYBE').length > 0 && (
                    <>, {getParticipantsByStatus('MAYBE').length} peut-être</>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleParticipation('GOING')}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    userStatus === 'GOING'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  Je participe
                </button>

                <button
                  onClick={() => handleParticipation('MAYBE')}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    userStatus === 'MAYBE'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  <HelpCircle className="h-4 w-4" />
                  Peut-être
                </button>

                <button
                  onClick={() => handleParticipation('NOT_GOING')}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    userStatus === 'NOT_GOING'
                      ? 'bg-red-600 text-white'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <XIcon className="h-4 w-4" />
                  Je ne participe pas
                </button>
              </div>

              {participants.length > 0 && (
                <div className="space-y-2">
                  {getParticipantsByStatus('GOING').length > 0 && (
                    <div>
                      <h3 className="font-medium text-sm text-emerald-600 mb-1">Participants confirmés</h3>
                      <div className="text-sm text-slate-600">
                        {getParticipantsByStatus('GOING').map(p => (
                          <div key={p.user_id}>
                            {p.user.firstName} {p.user.lastName}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {getParticipantsByStatus('MAYBE').length > 0 && (
                    <div>
                      <h3 className="font-medium text-sm text-amber-600 mb-1">Peut-être</h3>
                      <div className="text-sm text-slate-600">
                        {getParticipantsByStatus('MAYBE').map(p => (
                          <div key={p.user_id}>
                            {p.user.firstName} {p.user.lastName}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {(onEdit || event.created_by === user?.id) && (
          <div className="flex justify-end gap-3 p-6 border-t bg-slate-50">
            {event.created_by === user?.id && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
                <span>Supprimer</span>
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50 rounded-lg"
              >
                <Edit2 className="h-4 w-4" />
                <span>Modifier</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;