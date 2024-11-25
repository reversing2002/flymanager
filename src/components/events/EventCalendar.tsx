import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Globe, Lock } from 'lucide-react';
import type { ClubEvent } from '../../types/database';
import { supabase } from '../../lib/supabase';
import EventModal from './EventModal';
import EventDetails from './EventDetails';
import { toast } from 'react-hot-toast';

const EventCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const { data } = await supabase
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
        .lte('end_time', end.toISOString())
        .order('start_time');

      if (data) {
        setEvents(data);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const startDate = new Date(event.start_time);
      const endDate = new Date(event.end_time);
      
      // Check if the day falls within the event's duration
      return isWithinInterval(date, { start: startDate, end: endDate }) ||
             isSameDay(date, startDate) ||
             isSameDay(date, endDate);
    });
  };

  const getEventColor = (event: ClubEvent) => {
    switch (event.type) {
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

  const isFirstDayOfEvent = (date: Date, event: ClubEvent) => {
    return isSameDay(date, new Date(event.start_time));
  };

  const isLastDayOfEvent = (date: Date, event: ClubEvent) => {
    return isSameDay(date, new Date(event.end_time));
  };

  const getEventStyle = (date: Date, event: ClubEvent) => {
    const isFirst = isFirstDayOfEvent(date, event);
    const isLast = isLastDayOfEvent(date, event);
    
    let className = `${getEventColor(event)} px-2 py-1 text-xs group hover:opacity-90 `;
    
    if (isFirst && isLast) {
      className += 'rounded-lg';
    } else if (isFirst) {
      className += 'rounded-l-lg rounded-r-none ml-0 mr-0';
    } else if (isLast) {
      className += 'rounded-r-lg rounded-l-none ml-0 mr-0';
    } else {
      className += 'rounded-none ml-0 mr-0';
    }
    
    return className;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => setShowEventModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          <span>Nouvel événement</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
          <div
            key={day}
            className="bg-slate-50 p-2 text-sm font-medium text-slate-600 text-center"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {days.map((day, dayIdx) => {
          const dayEvents = getEventsForDay(day);
          return (
            <div
              key={day.toString()}
              className={`min-h-[120px] bg-white p-2 ${
                isToday(day) ? 'bg-sky-50' : ''
              }`}
            >
              <div className="text-sm font-medium text-slate-900">
                {format(day, 'd')}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={getEventStyle(day, event)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">
                        {isFirstDayOfEvent(day, event) && (
                          <>{format(new Date(event.start_time), 'HH:mm')} - </>
                        )}
                        {event.title}
                      </span>
                      {event.visibility === 'PUBLIC' ? (
                        <Globe className="h-3 w-3 opacity-50" />
                      ) : (
                        <Lock className="h-3 w-3 opacity-50" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showEventModal && (
        <EventModal
          onClose={() => setShowEventModal(false)}
          onSuccess={() => {
            setShowEventModal(false);
            loadEvents();
          }}
        />
      )}

      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={loadEvents}
        />
      )}
    </div>
  );
};

export default EventCalendar;