// src/components/availability/AvailabilityModal.tsx
import React, { useState } from 'react';
import { X, AlertTriangle, Calendar, RotateCcw, Clock, Trash2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { createAvailability, updateAvailability, deleteAvailability } from '../../lib/queries/availability';
import type { Availability } from '../../types/availability';

type AvailabilityType = 'recurring' | 'period';
type DefaultMode = 'default-available' | 'default-unavailable';

interface AvailabilityModalProps {
  userId?: string;
  aircraftId?: string;
  availability?: Availability;
  onClose: () => void;
  onSuccess: () => void;
  // On pourrait ici passer la valeur du mode par défaut depuis un parent, 
  // ou le stocker en base pour chaque user.
  initialDefaultMode?: DefaultMode;
}

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({
  userId,
  aircraftId,
  availability,
  onClose,
  onSuccess,
  initialDefaultMode = 'default-available', // Par défaut, on part du principe "disponible par défaut".
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mode par défaut : 
  // "default-available" => on crée des indisponibilités
  // "default-unavailable" => on crée des disponibilités
  const [defaultMode, setDefaultMode] = useState<DefaultMode>(initialDefaultMode);

  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>(
    availability?.is_recurring ? 'recurring' : 'period'
  );

  // Ce formData gère à la fois la période (start/end) et les champs récurrents
  const [formData, setFormData] = useState({
    startDate: availability?.start_time ? format(new Date(availability.start_time), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    endDate: availability?.end_time ? format(new Date(availability.end_time), "yyyy-MM-dd") : format(addDays(new Date(), 1), "yyyy-MM-dd"),
    startTime: availability?.start_time ? format(new Date(availability.start_time), "HH:mm") : '09:00',
    endTime: availability?.end_time ? format(new Date(availability.end_time), "HH:mm") : '17:00',
    recurringDays: availability?.recurrence_pattern ? 
      availability.recurrence_pattern.split(';')[1].replace('BYDAY=', '').split(',') : 
      ['MO'],
    recurringUntil: availability?.recurrence_end_date || format(addDays(new Date(), 30), "yyyy-MM-dd"),
    reason: availability?.reason || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let data: any = {
        user_id: userId,
        aircraft_id: aircraftId,
        reason: formData.reason,
      };

      // On calcule les dates selon le type
      const [startHours, startMinutes] = formData.startTime.split(':');
      const [endHours, endMinutes] = formData.endTime.split(':');
      
      const startDateTime = new Date(formData.startDate);
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));
      
      let endDateTime = new Date(formData.endDate);
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

      const isRecurring = (availabilityType === 'recurring');

      // On détermine si on crée un créneau de disponibilité ou d’indisponibilité
      // selon le defaultMode
      const isAvailabilitySlot = (defaultMode === 'default-unavailable'); 
      // Si default-unavailable => on crée une disponibilité
      // Si default-available => on crée une indisponibilité

      let recurrence_pattern = null;
      let recurrence_end_date = null;

      if (isRecurring) {
        recurrence_pattern = `FREQ=WEEKLY;BYDAY=${formData.recurringDays.join(',')}`;
        recurrence_end_date = formData.recurringUntil;
        // Pour les créneaux récurrents, on ne se sert généralement que de la date de début (startDate)
        // ou on garde endDate = startDate pour marquer le jour.  
        // Ici, on peut simplifier en admettant que le user va définir un créneau horaire pour chaque jour récurrent.
        endDateTime = new Date(formData.startDate);
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));
      }

      data = {
        ...data,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        is_recurring: isRecurring,
        recurrence_pattern,
        recurrence_end_date,
        // Nouveau champ (hypothétique) pour indiquer s’il s’agit d’un créneau de dispo ou d’indispo
        slot_type: isAvailabilitySlot ? 'availability' : 'unavailability',
      };

      if (availability) {
        await updateAvailability({ id: availability.id, ...data });
        toast.success(isAvailabilitySlot ? 'Disponibilité mise à jour' : 'Indisponibilité mise à jour');
      } else {
        await createAvailability(data);
        toast.success(isAvailabilitySlot ? 'Disponibilité créée' : 'Indisponibilité créée');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving slot:', err);
      setError('Erreur lors de l\'enregistrement');
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!availability?.id) return;

    const isAvailabilitySlot = (defaultMode === 'default-unavailable');
    if (!confirm(`Êtes-vous sûr de vouloir supprimer cette ${isAvailabilitySlot ? 'disponibilité' : 'indisponibilité'} ?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteAvailability(availability.id);
      toast.success(isAvailabilitySlot ? 'Disponibilité supprimée' : 'Indisponibilité supprimée');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting slot:', err);
      setError('Erreur lors de la suppression');
      toast.error('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const renderDefaultModeSelector = () => (
    <div className="flex gap-4 mb-6">
      <button
        type="button"
        onClick={() => setDefaultMode('default-available')}
        className={`flex-1 p-4 rounded-lg border-2 ${
          defaultMode === 'default-available'
            ? 'border-sky-500 bg-sky-50'
            : 'border-slate-200 hover:border-slate-300'
        } transition-colors`}
      >
        <Calendar className="h-6 w-6 mx-auto mb-2" />
        <div className="text-sm font-medium">Disponible par défaut</div>
      </button>
      <button
        type="button"
        onClick={() => setDefaultMode('default-unavailable')}
        className={`flex-1 p-4 rounded-lg border-2 ${
          defaultMode === 'default-unavailable'
            ? 'border-sky-500 bg-sky-50'
            : 'border-slate-200 hover:border-slate-300'
        } transition-colors`}
      >
        <Calendar className="h-6 w-6 mx-auto mb-2" />
        <div className="text-sm font-medium">Indisponible par défaut</div>
      </button>
    </div>
  );

  const renderTypeSelector = () => {
    const isAvailabilitySlot = (defaultMode === 'default-unavailable');
    return (
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setAvailabilityType('recurring')}
          className={`flex-1 p-4 rounded-lg border-2 ${
            availabilityType === 'recurring'
              ? 'border-sky-500 bg-sky-50'
              : 'border-slate-200 hover:border-slate-300'
          } transition-colors`}
        >
          <RotateCcw className="h-6 w-6 mx-auto mb-2" />
          <div className="text-sm font-medium">{isAvailabilitySlot ? 'Disponibilité récurrente' : 'Indisponibilité récurrente'}</div>
        </button>
        
        <button
          type="button"
          onClick={() => setAvailabilityType('period')}
          className={`flex-1 p-4 rounded-lg border-2 ${
            availabilityType === 'period'
              ? 'border-sky-500 bg-sky-50'
              : 'border-slate-200 hover:border-slate-300'
          } transition-colors`}
        >
          <Clock className="h-6 w-6 mx-auto mb-2" />
          <div className="text-sm font-medium">{isAvailabilitySlot ? 'Disponibilité ponctuelle' : 'Indisponibilité ponctuelle'}</div>
        </button>
      </div>
    );
  };

  const renderPeriodFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date de début
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full rounded-lg border-slate-200"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date de fin
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full rounded-lg border-slate-200"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Heure de début
          </label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full rounded-lg border-slate-200"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Heure de fin
          </label>
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full rounded-lg border-slate-200"
            required
          />
        </div>
      </div>
    </div>
  );

  const renderRecurringFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date de début
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full rounded-lg border-slate-200"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Heure de début
          </label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full rounded-lg border-slate-200"
            required
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Heure de fin
        </label>
        <input
          type="time"
          value={formData.endTime}
          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          className="w-full rounded-lg border-slate-200"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Jours de la semaine
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'MO', label: 'Lun' },
            { id: 'TU', label: 'Mar' },
            { id: 'WE', label: 'Mer' },
            { id: 'TH', label: 'Jeu' },
            { id: 'FR', label: 'Ven' },
            { id: 'SA', label: 'Sam' },
            { id: 'SU', label: 'Dim' },
          ].map(day => (
            <button
              key={day.id}
              type="button"
              onClick={() => {
                const days = formData.recurringDays.includes(day.id)
                  ? formData.recurringDays.filter(d => d !== day.id)
                  : [...formData.recurringDays, day.id];
                setFormData({ ...formData, recurringDays: days });
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                formData.recurringDays.includes(day.id)
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } transition-colors`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Jusqu'au
        </label>
        <input
          type="date"
          value={formData.recurringUntil}
          onChange={(e) => setFormData({ ...formData, recurringUntil: e.target.value })}
          className="w-full rounded-lg border-slate-200"
          required
        />
      </div>
    </div>
  );

  const isAvailabilitySlot = (defaultMode === 'default-unavailable');
  const title = availability 
    ? (isAvailabilitySlot ? "Modifier la disponibilité" : "Modifier l'indisponibilité")
    : (isAvailabilitySlot ? "Nouvelle disponibilité" : "Nouvelle indisponibilité");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mode par défaut
            </label>
            {renderDefaultModeSelector()}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type de créneau
            </label>
            {renderTypeSelector()}
          </div>

          {availabilityType === 'period' && renderPeriodFields()}
          {availabilityType === 'recurring' && renderRecurringFields()}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Raison (optionnel)
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full rounded-lg border-slate-200"
              placeholder="Ex : Vacances, réunion..."
            />
          </div>

          <div className="flex items-center justify-between mt-8">
            <div className="flex items-center gap-4">
              {availability && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Supprimer</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700"
              >
                Annuler
              </button>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⌛</span>
                  <span>En cours...</span>
                </>
              ) : (
                <span>Enregistrer</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AvailabilityModal;
