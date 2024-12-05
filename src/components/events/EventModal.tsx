import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Globe, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { format, setHours, setMinutes, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ClubEvent } from '../../types/database';

interface EventModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date | null;
  event?: ClubEvent | null;
}

const EventModal: React.FC<EventModalProps> = ({ onClose, onSuccess, initialDate, event }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    type: 'SOCIAL',
    visibility: 'INTERNAL',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      // Mode édition
      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        start_time: format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"),
        type: event.type,
        visibility: event.visibility,
      });
    } else if (initialDate) {
      // Mode création avec date initiale
      const defaultStartTime = new Date(initialDate);
      defaultStartTime.setHours(9, 0, 0, 0);
      
      const defaultEndTime = new Date(initialDate);
      defaultEndTime.setHours(18, 0, 0, 0);
      
      setFormData(prev => ({
        ...prev,
        start_time: format(defaultStartTime, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(defaultEndTime, "yyyy-MM-dd'T'HH:mm"),
      }));
    }
  }, [event, initialDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.club?.id) {
      setError('Club non défini pour l\'utilisateur');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convertir les dates en UTC pour le stockage
      const startTime = new Date(formData.start_time);
      const endTime = new Date(formData.end_time);

      const eventData = {
        ...formData,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      };

      if (event) {
        // Mode édition
        const { error: updateError } = await supabase
          .from('club_events')
          .update({
            ...eventData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', event.id);

        if (updateError) throw updateError;
        toast.success('Événement modifié');
      } else {
        // Mode création
        const { error: createError } = await supabase
          .from('club_events')
          .insert([
            {
              ...eventData,
              club_id: user.club.id,
              created_by: user.id,
            },
          ]);

        if (createError) throw createError;
        toast.success('Événement créé');
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving event:', err);
      setError('Erreur lors de l\'enregistrement de l\'événement');
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
            {event ? 'Modifier l\'événement' : 'Nouvel événement'}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Titre *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Lieu
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Début
              </label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fin
              </label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              >
                <option value="SOCIAL">Social</option>
                <option value="FLIGHT">Vol</option>
                <option value="TRAINING">Formation</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Visibilité
              </label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    value="INTERNAL"
                    checked={formData.visibility === 'INTERNAL'}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">Interne</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    value="PUBLIC"
                    checked={formData.visibility === 'PUBLIC'}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">Public</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : event ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;