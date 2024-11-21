import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { User } from '../../types/database';
import { toast } from 'react-hot-toast';

interface CreateChatRoomModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateChatRoomModal: React.FC<CreateChatRoomModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'PILOT');

    if (data) {
      setStudents(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedStudent) return;

    setLoading(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc(
        'create_instructor_student_chat',
        {
          instructor_id: currentUser.id,
          student_id: selectedStudent,
        }
      );

      if (rpcError) throw rpcError;

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
              Élève
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            >
              <option value="">Sélectionner un élève</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
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
              disabled={loading || !selectedStudent}
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