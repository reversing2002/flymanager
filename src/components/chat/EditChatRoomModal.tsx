import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { ChatRoom } from '../../types/chat';
import { hasAnyGroup } from '../../lib/permissions';

interface EditChatRoomModalProps {
  room: ChatRoom;
  onClose: () => void;
  onSave: (data: { name: string; description: string; type: string }) => void;
}

const EditChatRoomModal: React.FC<EditChatRoomModalProps> = ({
  room,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: room.name,
    type: room.type,
    description: room.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error updating chat room:', error);
      setError('Erreur lors de la modification du salon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Modifier le salon</h2>
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
              Nom du salon
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
              Type de salon
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            >
              <option value="PILOT_GROUP">Groupe de pilotes</option>
              <option value="INSTRUCTOR_STUDENT">Instructeur-Élève</option>
              <option value="INSTRUCTOR_GROUP">Groupe d'instructeurs</option>
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
              disabled={loading || !formData.name}
            >
              {loading ? 'Modification...' : 'Modifier le salon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditChatRoomModal;
