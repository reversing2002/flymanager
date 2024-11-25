import React, { useState } from 'react';
import { X, Calendar, MapPin, Clock, Users, Trash2, User, Globe, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ClubEvent } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface EventDetailsProps {
  event: ClubEvent;
  onClose: () => void;
  onUpdate: () => void;
}

const EventDetails: React.FC<EventDetailsProps> = ({ event, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [participation, setParticipation] = useState(
    event.participants?.find(p => p.user_id === user?.id)?.status || null
  );
  const [loading, setLoading] = useState(false);

  const canEdit = user?.id === event.created_by || user?.role === 'ADMIN';

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
        });

      if (error) throw error;

      setParticipation(status);
      onUpdate();
      toast.success('Participation mise à jour');
    } catch (error) {
      console.error('Error updating participation:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;

    try {
      const { error } = await supabase
        .from('club_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Événement supprimé');
      onClose();
      onUpdate();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getTypeColor = (type: ClubEvent['type']) => {
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

  const getTypeLabel = (type: ClubEvent['type']) => {
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
        return 'Autre';
    }
  };

  const formatDateRange = () => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    const isSameDay = startDate.toDateString() === endDate.toDateString();

    if (isSameDay) {
      return {
        date: format(startDate, 'EEEE d MMMM yyyy', { locale: fr }),
        time: `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`
      };
    }

    return {
      date: `${format(startDate, 'EEEE d MMMM yyyy', { locale: fr })} - ${format(endDate, 'EEEE d MMMM yyyy', { locale: fr })}`,
      time: `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`
    };
  };

  const dateRange = formatDateRange();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">{event.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(event.type)}`}>
                {getTypeLabel(event.type)}
              </span>
              {event.creator && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {event.creator.firstName} {event.creator.lastName}
                </span>
              )}
              <span className="text-sm text-slate-500 flex items-center gap-1">
                {event.visibility === 'PUBLIC' ? (
                  <>
                    <Globe className="h-3 w-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Interne
                  </>
                )}
              </span>
            </div>
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
            <p className="text-slate-600">{event.description}</p>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-600">
              <Calendar className="h-5 w-5" />
              <div>
                <div>{dateRange.date}</div>
                <div className="text-sm">{dateRange.time}</div>
              </div>
            </div>

            {event.location && (
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin className="h-5 w-5" />
                <span>{event.location}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-slate-600">
              <Users className="h-5 w-5" />
              <div>
                <div className="font-medium">Participants</div>
                <div className="text-sm space-y-1">
                  {event.participants?.filter(p => p.status === 'GOING').length || 0} confirmé(s)
                  {event.participants?.filter(p => p.status === 'MAYBE').length ? (
                    <>, {event.participants.filter(p => p.status === 'MAYBE').length} peut-être</>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                <button
                  onClick={() => handleParticipation('GOING')}
                  disabled={loading}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    participation === 'GOING'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  Je participe
                </button>
                <button
                  onClick={() => handleParticipation('MAYBE')}
                  disabled={loading}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    participation === 'MAYBE'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  Peut-être
                </button>
                <button
                  onClick={() => handleParticipation('NOT_GOING')}
                  disabled={loading}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    participation === 'NOT_GOING'
                      ? 'bg-red-600 text-white'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  Je ne participe pas
                </button>
              </div>

              {canEdit && (
                <div className="space-x-2">
                  <button
                    onClick={handleDelete}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;