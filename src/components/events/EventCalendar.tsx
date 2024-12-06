import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isWithinInterval, setHours, setMinutes, startOfWeek, endOfWeek, addDays, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Globe, Lock } from 'lucide-react';
import type { ClubEvent } from '../../types/database';
import { supabase } from '../../lib/supabase';
import EventModal from './EventModal';
import EventDetails from './EventDetails';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import UpcomingEvents from './UpcomingEvents';
import { hasAnyGroup } from "../../lib/permissions";

const EventCalendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      const start = startOfWeek(startOfMonth(currentDate), { locale: fr });
      const end = endOfWeek(endOfMonth(currentDate), { locale: fr });

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
    start: startOfWeek(startOfMonth(currentDate), { locale: fr }),
    end: endOfWeek(endOfMonth(currentDate), { locale: fr }),
  });

  const getEventsForDay = (date: Date) => {
    return events
      .filter(event => {
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);
        return isSameDay(date, startDate) || (
          isWithinInterval(date, { start: startDate, end: endDate })
        );
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
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

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventModal(true);
  };

  const canEditEvent = (event: ClubEvent) => {
    return user?.id === event.created_by || hasAnyGroup(user, ['ADMIN']);
  };

  const handleEventClick = (event: ClubEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  const handleEditEvent = () => {
    if (selectedEvent) {
      setShowEventModal(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Prochains événements</h2>
        <UpcomingEvents />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {format(currentDate, 'MMMM yyyy', { locale: fr })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                className="p-1 hover:bg-slate-100 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-200">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
            <div
              key={day}
              className="bg-slate-50 p-2 text-center text-sm font-medium text-slate-600"
            >
              {day}
            </div>
          ))}

          {days.map((date) => {
            const dayEvents = getEventsForDay(date);
            const isSelected = selectedEvent && dayEvents.some(event => event.id === selectedEvent.id);

            return (
              <div
                key={date.toISOString()}
                onClick={() => handleDayClick(date)}
                className={`
                  min-h-[120px] bg-white p-2 relative cursor-pointer
                  ${isToday(date) ? 'bg-sky-50 ring-2 ring-sky-500' : ''}
                  ${isBefore(date, startOfDay(new Date())) ? 'opacity-50' : ''}
                  ${isSelected ? 'ring-2 ring-sky-500' : ''}
                  hover:bg-slate-50
                `}
              >
                <time
                  dateTime={format(date, 'yyyy-MM-dd')}
                  className={`
                    text-sm font-medium
                    ${isToday(date) ? 'text-sky-600 font-bold' : 'text-slate-900'}
                    ${isBefore(date, startOfDay(new Date())) ? 'text-slate-500' : ''}
                  `}
                >
                  {format(date, 'd')}
                </time>

                <div className="mt-2 space-y-1 relative">
                  {dayEvents.map((event, index) => (
                    <button
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      className={`
                        w-full text-left px-2 py-1 rounded text-sm
                        ${getEventColor(event)}
                        hover:opacity-90 transition-opacity
                      `}
                      style={{
                        position: 'relative',
                        zIndex: index + 1,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex-1 truncate">
                          <span className="font-medium">
                            {format(new Date(event.start_time), 'HH:mm')}
                            {' - '}
                            {format(new Date(event.end_time), 'HH:mm')}
                          </span>{' '}
                          {event.title}
                        </div>
                        {event.visibility === 'PUBLIC' ? (
                          <Globe className="h-3 w-3 flex-shrink-0" />
                        ) : (
                          <Lock className="h-3 w-3 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showEventModal && (
        <EventModal
          initialDate={selectedDate}
          event={selectedEvent}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
            setSelectedDate(null);
          }}
          onSuccess={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
            setSelectedDate(null);
            loadEvents();
          }}
        />
      )}

      {selectedEvent && !showEventModal && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={canEditEvent(selectedEvent) ? handleEditEvent : undefined}
          onSuccess={loadEvents}
        />
      )}
    </div>
  );
};

export default EventCalendar;