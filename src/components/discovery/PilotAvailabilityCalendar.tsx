import React, { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Plus, X } from 'lucide-react';
import type { PilotAvailability } from '../../types/discovery';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8h-22h

const PilotAvailabilityCalendar = () => {
  const { user } = useAuth();
  const [availabilities, setAvailabilities] = useState<PilotAvailability[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  });

  const handleAddAvailability = async (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    isRecurring: boolean = false,
    startDate?: string,
    endDate?: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('pilot_availabilities')
        .insert({
          pilot_id: user.id,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          is_recurring: isRecurring,
          start_date: startDate,
          end_date: endDate,
        });

      if (error) throw error;

      toast.success('Disponibilité ajoutée');
      loadAvailabilities();
    } catch (error) {
      console.error('Error adding availability:', error);
      toast.error('Erreur lors de l\'ajout de la disponibilité');
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pilot_availabilities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Disponibilité supprimée');
      loadAvailabilities();
    } catch (error) {
      console.error('Error deleting availability:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const loadAvailabilities = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('pilot_availabilities')
        .select('*')
        .eq('pilot_id', user.id);

      if (error) throw error;
      setAvailabilities(data);
    } catch (error) {
      console.error('Error loading availabilities:', error);
      toast.error('Erreur lors du chargement des disponibilités');
    }
  };

  const handleAddRecurringAvailability = async () => {
    await handleAddAvailability(
      recurringForm.dayOfWeek,
      recurringForm.startTime,
      recurringForm.endTime,
      true,
      recurringForm.startDate,
      recurringForm.endDate
    );
    setShowRecurringForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Mes disponibilités</h2>
        <button
          onClick={() => setShowRecurringForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          Ajouter une plage récurrente
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-8 border-b">
          <div className="p-4 font-medium text-slate-600 border-r">
            Heures
          </div>
          {DAYS.map((day, index) => (
            <div key={day} className="p-4 font-medium text-slate-600 text-center border-r">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8">
          <div className="border-r">
            {HOURS.map(hour => (
              <div key={hour} className="p-4 text-sm text-slate-600 border-b">
                {hour}:00
              </div>
            ))}
          </div>

          {DAYS.map((_, dayIndex) => (
            <div key={dayIndex} className="border-r">
              {HOURS.map(hour => {
                const hasAvailability = availabilities.some(
                  av => av.day_of_week === dayIndex + 1 &&
                  parseInt(av.start_time.split(':')[0]) <= hour &&
                  parseInt(av.end_time.split(':')[0]) > hour
                );

                return (
                  <div
                    key={hour}
                    className={`
                      p-4 border-b cursor-pointer transition-colors
                      ${hasAvailability ? 'bg-sky-100' : 'hover:bg-slate-50'}
                    `}
                    onClick={() => {
                      setSelectedDay(dayIndex + 1);
                      setSelectedHour(hour);
                    }}
                  >
                    {hasAvailability && (
                      <div className="flex items-center justify-center">
                        <Clock className="h-4 w-4 text-sky-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Liste des disponibilités récurrentes */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Plages récurrentes</h3>
        <div className="space-y-4">
          {availabilities
            .filter(av => av.is_recurring)
            .map(availability => (
              <div
                key={availability.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {DAYS[availability.day_of_week - 1]}
                  </p>
                  <p className="text-sm text-slate-600">
                    {availability.start_time} - {availability.end_time}
                  </p>
                  {availability.start_date && availability.end_date && (
                    <p className="text-sm text-slate-600">
                      Du {format(new Date(availability.start_date), 'dd/MM/yyyy')} au{' '}
                      {format(new Date(availability.end_date), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteAvailability(availability.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

          {availabilities.filter(av => av.is_recurring).length === 0 && (
            <p className="text-center text-slate-600 py-4">
              Aucune plage récurrente définie
            </p>
          )}
        </div>
      </div>

      {/* Modal pour ajouter une plage récurrente */}
      {showRecurringForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              Ajouter une plage récurrente
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Jour de la semaine
                </label>
                <select
                  value={recurringForm.dayOfWeek}
                  onChange={e => setRecurringForm({
                    ...recurringForm,
                    dayOfWeek: parseInt(e.target.value)
                  })}
                  className="w-full rounded-lg border-slate-200"
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index + 1}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Heure de début
                  </label>
                  <input
                    type="time"
                    value={recurringForm.startTime}
                    onChange={e => setRecurringForm({
                      ...recurringForm,
                      startTime: e.target.value
                    })}
                    className="w-full rounded-lg border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Heure de fin
                  </label>
                  <input
                    type="time"
                    value={recurringForm.endTime}
                    onChange={e => setRecurringForm({
                      ...recurringForm,
                      endTime: e.target.value
                    })}
                    className="w-full rounded-lg border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={recurringForm.startDate}
                    onChange={e => setRecurringForm({
                      ...recurringForm,
                      startDate: e.target.value
                    })}
                    className="w-full rounded-lg border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={recurringForm.endDate}
                    onChange={e => setRecurringForm({
                      ...recurringForm,
                      endDate: e.target.value
                    })}
                    className="w-full rounded-lg border-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRecurringForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleAddRecurringAvailability}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PilotAvailabilityCalendar;