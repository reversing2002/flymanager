import React, { useState, useEffect } from 'react';
import { format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import type { ClubEvent } from '../../types/database';
import EventDetails from './EventDetails';

interface UpcomingEventsProps {
  maxEvents?: number;
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ maxEvents = 1 }) => {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingEvents();
  }, []);

  const loadUpcomingEvents = async () => {
    try {
      const start = startOfDay(new Date()); // On ne garde que les événements à partir d'aujourd'hui

      const { data, error } = await supabase
        .from('club_events')
        .select(`
          *,
          creator:created_by (
            firstName:first_name,
            lastName:last_name
          ),
          participants:event_participants (
            user_id,
            status,
            user:user_id (
              firstName:first_name,
              lastName:last_name
            )
          )
        `)
        .gte('start_time', start.toISOString())
        .order('start_time')
        .limit(maxEvents);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading upcoming events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-500">
        Chargement des prochains événements...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500">
        Aucun événement prévu.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <button
          key={event.id}
          onClick={() => setSelectedEvent(event)}
          className="w-full p-3 text-left bg-white hover:bg-slate-50 rounded-lg border transition-colors"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">{event.title}</div>
              <div className="text-sm text-slate-500">
                {format(new Date(event.start_time), 'EEEE d MMMM', { locale: fr })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-800">
                {format(new Date(event.start_time), 'HH:mm')}
                {' - '}
                {format(new Date(event.end_time), 'HH:mm')}
              </span>
            </div>
          </div>
        </button>
      ))}

      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSuccess={() => {
            loadUpcomingEvents();
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
};

export default UpcomingEvents;