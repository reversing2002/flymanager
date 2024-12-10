// src/components/availability/AvailabilityCalendar.tsx
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isWithinInterval, parseISO, addDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, RotateCcw } from 'lucide-react';
import { getAvailabilitiesForPeriod } from '../../lib/queries/availability';
import type { Availability } from '../../types/availability';
import AvailabilityModal from './AvailabilityModal';

interface AvailabilityCalendarProps {
  userId?: string;
  aircraftId?: string;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  userId,
  aircraftId,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<Availability | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailabilities();
  }, [currentDate, userId, aircraftId]);

  const loadAvailabilities = async () => {
    try {
      const startDate = startOfWeek(currentDate, { locale: fr });
      const endDate = endOfWeek(currentDate, { locale: fr });
      
      const data = await getAvailabilitiesForPeriod(
        startDate.toISOString(),
        endDate.toISOString(),
        userId,
        aircraftId
      );
      
      setAvailabilities(data);
    } catch (error) {
      console.error('Error loading availabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const days = eachDayOfInterval({
    start: startOfWeek(currentDate, { locale: fr }),
    end: endOfWeek(currentDate, { locale: fr }),
  });

  const getRecurringDays = (pattern: string): string[] => {
    const match = pattern.match(/BYDAY=([A-Z,]+)/);
    return match ? match[1].split(',') : [];
  };

  const dayToNumber: { [key: string]: number } = {
    'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6, 'SU': 0
  };

  const getAvailabilitiesForDay = (date: Date) => {
    return availabilities.filter(availability => {
      const startTime = parseISO(availability.start_time);
      const endTime = parseISO(availability.end_time);

      if (availability.is_recurring) {
        const recurringDays = getRecurringDays(availability.recurrence_pattern);
        const dayNumber = date.getDay();
        const dayMatches = recurringDays.some(day => dayToNumber[day] === dayNumber);
        const recurrenceEndDate = availability.recurrence_end_date ? parseISO(availability.recurrence_end_date) : null;
        
        // Vérifier si la date est dans la plage de récurrence
        const isAfterStart = date >= startTime;
        const isBeforeEnd = recurrenceEndDate ? date <= recurrenceEndDate : true;
        
        return dayMatches && isAfterStart && isBeforeEnd;
      } else {
        // Pour les disponibilités non récurrentes, vérifier si la date est dans l'intervalle exact
        return date >= startOfDay(startTime) && date <= endOfDay(endTime);
      }
    });
  };

  const formatAvailabilityTime = (availability: Availability) => {
    const start = parseISO(availability.start_time);
    const end = parseISO(availability.end_time);

    if (availability.is_recurring) {
      return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')} (Récurrent)`;
    } else {
      const isSameStartEnd = isSameDay(start, end);
      if (isSameStartEnd) {
        return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
      } else {
        return `Du ${format(start, 'dd/MM HH:mm')} au ${format(end, 'dd/MM HH:mm')}`;
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreviousWeek}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-medium">
            {format(days[0], 'MMMM yyyy', { locale: fr })}
          </span>
          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          <span>Nouvelle indisponibilité</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {days.map((day, index) => (
          <div key={day.toISOString()} className="space-y-2">
            <div className="text-center">
              <div className="text-sm font-medium text-slate-900">
                {format(day, 'EEEE', { locale: fr })}
              </div>
              <div className="text-sm text-slate-500">
                {format(day, 'd', { locale: fr })}
              </div>
            </div>

            <div className="min-h-[150px] bg-slate-50 rounded-lg p-2 space-y-2">
              {getAvailabilitiesForDay(day).map((availability) => (
                <button
                  key={availability.id}
                  onClick={() => {
                    setSelectedAvailability(availability);
                    setShowModal(true);
                  }}
                  className="w-full text-left p-2 rounded bg-red-50 hover:bg-red-100 border border-red-200 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    {availability.is_recurring ? (
                      <RotateCcw className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-red-900 truncate">
                        {availability.users?.first_name} {availability.users?.last_name}
                      </div>
                      <div className="text-xs text-red-700">
                        {formatAvailabilityTime(availability)}
                      </div>
                      {availability.reason && (
                        <div className="text-xs text-red-600 truncate mt-1">
                          {availability.reason}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <AvailabilityModal
          userId={userId}
          aircraftId={aircraftId}
          availability={selectedAvailability}
          onClose={() => {
            setShowModal(false);
            setSelectedAvailability(null);
          }}
          onSuccess={() => {
            loadAvailabilities();
            setShowModal(false);
            setSelectedAvailability(null);
          }}
        />
      )}
    </div>
  );
};

export default AvailabilityCalendar;
