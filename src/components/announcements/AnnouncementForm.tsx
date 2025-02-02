import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { Announcement } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface AnnouncementFormProps {
  announcement?: Announcement;
  onClose: () => void;
  onSuccess: () => void;
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  announcement,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    content: announcement?.content || '',
    priority: announcement?.priority || 'LOW',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!user.club?.id) {
      setError('Club non défini pour l\'utilisateur');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      if (announcement) {
        // Update existing announcement
        const { error: updateError } = await supabase
          .from('announcements')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', announcement.id);

        if (updateError) throw updateError;
        toast.success('Annonce mise à jour');
      } else {
        // Create new announcement
        const { error: createError } = await supabase.from('announcements').insert([
          {
            ...formData,
            created_by: user.id,
            club_id: user.club.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

        if (createError) throw createError;
        toast.success('Annonce créée');
        
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
        if (typeof onClose === 'function') {
          onClose();
        }
      }
    } catch (err) {
      console.error('Error saving announcement:', err);
      setError('Erreur lors de l\'enregistrement de l\'annonce');
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
            {announcement ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
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
              Titre
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
              Contenu
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Priorité
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH',
                })
              }
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            >
              <option value="LOW">Information</option>
              <option value="MEDIUM">Important</option>
              <option value="HIGH">Urgent</option>
            </select>
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

export default AnnouncementForm;