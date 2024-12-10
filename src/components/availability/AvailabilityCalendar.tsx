// src/components/availability/AvailabilityCalendar.tsx
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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

  const getAvailabilitiesForDay = (date: Date) => {
    return availabilities.filter(availability => {
      const availabilityStart = new Date(availability.start_time);
      const availabilityEnd = new Date(availability.end_time);
      return (
        availabilityStart.toDateString() === date.toDateString() ||
        availabilityEnd.toDateString() === date.toDateString()
      );
    });
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
        {days.map((day) => (
          <div key={day.toISOString()} className="space-y-2">
            <div className="text-center">
              <div className="font-medium">
                {format(day, 'EEEE', { locale: fr })}
              </div>
              <div className="text-sm text-slate-500">
                {format(day, 'd', { locale: fr })}
              </div>
            </div>

            <div className="min-h-[100px] bg-white rounded-lg border p-2 space-y-1">
              {getAvailabilitiesForDay(day).map((availability) => (
                <button
                  key={availability.id}
                  onClick={() => setSelectedAvailability(availability)}
                  className="w-full text-left p-2 text-sm rounded bg-red-50 text-red-800 hover:bg-red-100"
                >
                  <div className="font-medium">
                    {format(new Date(availability.start_time), 'HH:mm')} -{' '}
                    {format(new Date(availability.end_time), 'HH:mm')}
                  </div>
                  {availability.reason && (
                    <div className="text-xs truncate">{availability.reason}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {(showModal || selectedAvailability) && (
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
