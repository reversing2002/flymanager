import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { hasAnyGroup } from "../../lib/permissions";

interface CreateChatRoomModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateChatRoomModal: React.FC<CreateChatRoomModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'PILOT_GROUP',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.club?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Create the chat room
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: formData.name,
          type: formData.type,
          description: formData.description,
          club_id: currentUser.club.id,
          creator_id: currentUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (roomError) throw roomError;

      toast.success('Conversation créée');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating chat room:', err);
      setError('Erreur lors de la création de la conversation');
      toast.error('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Nouvelle conversation</h2>
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
              Nom de la conversation
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type de conversation
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            >
              <option value="PILOT_GROUP">Groupe de pilotes</option>
              {hasAnyGroup(currentUser, ['INSTRUCTOR']) && (
                <option value="INSTRUCTOR_STUDENT">Instructeur-Élève</option>
              )}
              {hasAnyGroup(currentUser, ['INSTRUCTOR']) && (
                <option value="INSTRUCTOR_GROUP">Groupe d'instructeurs</option>
              )}
            </select>
            <p className="mt-2 text-sm text-slate-600">
              {formData.type === 'PILOT_GROUP' 
                ? 'Accessible à tous les membres du club'
                : formData.type === 'INSTRUCTOR_STUDENT'
                ? 'Accessible aux instructeurs et élèves'
                : 'Accessible uniquement aux instructeurs'}
            </p>
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
              disabled={loading || !formData.name}
            >
              {loading ? 'Création...' : 'Créer la conversation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChatRoomModal;