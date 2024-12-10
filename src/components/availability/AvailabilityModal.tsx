// src/components/availability/AvailabilityModal.tsx
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { createAvailability, updateAvailability } from '../../lib/queries/availability';
import type { Availability } from '../../types/availability';

interface AvailabilityModalProps {
  userId?: string;
  aircraftId?: string;
  availability?: Availability;
  onClose: () => void;
  onSuccess: () => void;
}

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({
  userId,
  aircraftId,
  availability,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startTime: availability?.start_time ? format(new Date(availability.start_time), "yyyy-MM-dd'T'HH:mm") : '',
    endTime: availability?.end_time ? format(new Date(availability.end_time), "yyyy-MM-dd'T'HH:mm") : '',
    isRecurring: availability?.is_recurring || false,
    recurrencePattern: availability?.recurrence_pattern || '',
    recurrenceEndDate: availability?.recurrence_end_date || '',
    reason: availability?.reason || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        user_id: userId,
        aircraft_id: aircraftId,
        start_time: new Date(formData.startTime).toISOString(),
        end_time: new Date(formData.endTime).toISOString(),
        is_recurring: formData.isRecurring,
        recurrence_pattern: formData.recurrencePattern,
        recurrence_end_date: formData.recurrenceEndDate,
        reason: formData.reason,
      };

      if (availability) {
        await updateAvailability({ id: availability.id, ...data });
        toast.success('Indisponibilité mise à jour');
      } else {
        await createAvailability(data);
        toast.success('Indisponibilité créée');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving availability:', err);
      setError('Erreur lors de l\'enregistrement');
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {availability ? 'Modifier l\'indisponibilité' : 'Nouvelle indisponibilité'}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Début
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fin
              </label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Récurrence
              </span>
            </label>
          </div>

          {formData.isRecurring && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pattern de récurrence
                </label>
                <input
                  type="text"
                  value={formData.recurrencePattern}
                  onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value })}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  placeholder="FREQ=WEEKLY;BYDAY=MO,TU,WE"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date de fin de récurrence
                </label>
                <input
                  type="date"
                  value={formData.recurrenceEndDate}
                  onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  required={formData.isRecurring}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Raison
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              rows={3}
              placeholder="Raison de l'indisponibilité..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AvailabilityModal;
