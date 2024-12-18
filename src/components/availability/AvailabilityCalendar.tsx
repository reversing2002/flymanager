// src/components/availability/AvailabilityCalendar.tsx
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isWithinInterval, parseISO, addDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, RotateCcw } from 'lucide-react';
import { getAvailabilitiesForPeriod, getReservationsAsAvailabilities } from '../../lib/queries/availability';
import type { Availability, AvailabilitySlotType } from '../../types/availability';
import { useAuth } from '../../contexts/AuthContext';
import AvailabilityModal from './AvailabilityModal';
import { toast } from 'react-hot-toast';

interface AvailabilityCalendarProps {
  userId?: string;
  aircraftId?: string;
  hideAddButton?: boolean;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  userId,
  aircraftId,
  hideAddButton = false,
}) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<Availability | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [defaultMode, setDefaultMode] = useState<'default-available' | 'default-unavailable'>(
    user?.default_mode || 'default-available'
  );

  useEffect(() => {
    if (user?.default_mode) {
      setDefaultMode(user.default_mode);
    }
  }, [user?.default_mode]);

  useEffect(() => {
    loadAvailabilities();
  }, [currentDate, userId, aircraftId]);

  const loadAvailabilities = async () => {
    try {
      const startDate = startOfWeek(currentDate, { locale: fr });
      const endDate = endOfWeek(currentDate, { locale: fr });
      
      // Charger les disponibilités normales
      const availabilitiesData = await getAvailabilitiesForPeriod(
        startDate.toISOString(),
        endDate.toISOString(),
        userId,
        aircraftId
      );
      
      // Charger les réservations comme indisponibilités
      const reservationsData = await getReservationsAsAvailabilities(
        startDate.toISOString(),
        endDate.toISOString(),
        userId,
        aircraftId
      );
      
      // Combiner les deux types de données
      setAvailabilities([...availabilitiesData, ...reservationsData]);
    } catch (error) {
      console.error('Error loading availabilities:', error);
      toast.error('Erreur lors du chargement des disponibilités');
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

  const getSlotColor = (availability: Availability) => {
    if (availability.slot_type === 'reservation') {
      if (availability.instructor_id) {
        return 'bg-orange-200 border-orange-300'; // Couleur pour les réservations avec instructeur
      }
      return 'bg-red-200 border-red-300'; // Couleur pour les réservations normales
    }
    return availability.slot_type === 'available' 
      ? 'bg-green-200 border-green-300'
      : 'bg-gray-200 border-gray-300';
  };

  const getSlotTitle = (availability: Availability) => {
    if (availability.slot_type === 'reservation') {
      let title = 'Réservation';
      if (availability.instructor) {
        title += ` avec instructeur ${availability.instructor.first_name} ${availability.instructor.last_name}`;
      }
      if (availability.aircraft) {
        title += ` - ${availability.aircraft.registration}`;
      }
      return title;
    }
    return availability.slot_type === 'available' ? 'Disponible' : 'Indisponible';
  };

  const formatAvailabilityTime = (availability: Availability) => {
    const start = parseISO(availability.start_time);
    const end = parseISO(availability.end_time);

    if (availability.is_recurring) {
      return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')} (Récurrent)`;
    } else {
      const isSameStartEnd = isSameDay(start, end);
      return isSameStartEnd 
        ? `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
        : `${format(start, 'dd/MM HH:mm')} - ${format(end, 'dd/MM HH:mm')}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreviousWeek}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div className="text-lg font-medium">
            {format(startOfWeek(currentDate, { locale: fr }), 'MMMM yyyy', { locale: fr })}
          </div>
          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {!hideAddButton && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            {defaultMode === 'default-available' 
              ? 'Ajouter une indisponibilité'
              : 'Ajouter une disponibilité'
            }
          </button>
        )}
      </div>

      <div className="grid grid-cols-7 border-b">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="p-4 text-center border-r last:border-r-0"
          >
            <div className="font-medium text-slate-900">
              {format(day, 'EEEE', { locale: fr })}
            </div>
            <div className="text-sm text-slate-500">
              {format(day, 'd MMMM', { locale: fr })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 min-h-[400px]">
        {days.map((day) => {
          const dayAvailabilities = getAvailabilitiesForDay(day);
          
          return (
            <div
              key={day.toISOString()}
              className="p-4 border-r last:border-r-0 border-b space-y-2"
            >
              {dayAvailabilities.map((availability) => (
                <button
                  key={availability.id}
                  onClick={() => {
                    setSelectedAvailability(availability);
                    setShowModal(true);
                  }}
                  className={`w-full p-2 rounded-lg border text-left text-sm transition-colors ${getSlotColor(availability)}`}
                >
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatAvailabilityTime(availability)}</span>
                  </div>
                  {availability.is_recurring && (
                    <div className="flex items-center gap-1 mt-1">
                      <RotateCcw className="h-3 w-3" />
                      <span className="text-xs">
                        Jusqu'au {format(parseISO(availability.recurrence_end_date!), 'd MMM', { locale: fr })}
                      </span>
                    </div>
                  )}
                  <div className="text-xs mt-1">{getSlotTitle(availability)}</div>
                </button>
              ))}
            </div>
          );
        })}
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
          onSuccess={loadAvailabilities}
          initialDefaultMode={defaultMode}
        />
      )}
    </div>
  );
};

export default AvailabilityCalendar;
