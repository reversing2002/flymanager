import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  flightId: string;
  onClose: () => void;
  onSuccess: (content: string) => void;
}

export default function CreateDiscoveryNoteModal({ flightId, onClose, onSuccess }: Props) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user?.id) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('discovery_notes')
        .insert({
          flight_id: flightId,
          content: content.trim(),
          type: 'INTERNAL',
          author_id: user.id,
        });

      if (error) throw error;

      queryClient.invalidateQueries(['discoveryNotes']);
      toast.success('Note créée');
      onSuccess(content);
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la note:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Nouvelle note privée</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-grow overflow-y-auto">
          <div className="flex-grow space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contenu de la note
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500 min-h-[200px] resize-y"
                placeholder="Saisissez votre note..."
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={isSubmitting || !content.trim() || !user?.id}
            >
              {isSubmitting ? 'Création...' : 'Créer la note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
