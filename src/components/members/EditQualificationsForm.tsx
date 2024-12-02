import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface EditQualificationsFormProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Qualification {
  id: string;
  code: string;
  name: string;
  has_qualification: boolean;
}

const DEFAULT_QUALIFICATIONS = [
  { code: 'TW', name: 'Train classique' },
  { code: 'EFIS', name: 'Système d\'information éléctronique de vol' },
  { code: 'SLPC', name: 'Mono-manette de puissance' },
  { code: 'RU', name: 'Train rentrant' },
  { code: 'VP', name: 'Pas variable' },
];

const EditQualificationsForm: React.FC<EditQualificationsFormProps> = ({
  userId,
  onClose,
  onSuccess,
}) => {
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQualifications();
  }, []);

  const loadQualifications = async () => {
    try {
      const { data, error } = await supabase
        .from('pilot_qualifications')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (data && data.length > 0) {
        setQualifications(data);
      } else {
        // Initialize with default qualifications
        setQualifications(
          DEFAULT_QUALIFICATIONS.map(q => ({
            id: crypto.randomUUID(),
            code: q.code,
            name: q.name,
            has_qualification: false,
          }))
        );
      }
    } catch (err) {
      console.error('Error loading qualifications:', err);
      setError('Erreur lors du chargement des qualifications');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Delete existing qualifications
      const { error: deleteError } = await supabase
        .from('pilot_qualifications')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new qualifications
      const { error: insertError } = await supabase
        .from('pilot_qualifications')
        .insert(
          qualifications.map(q => ({
            user_id: userId,
            code: q.code,
            name: q.name,
            has_qualification: q.has_qualification,
          }))
        );

      if (insertError) throw insertError;

      toast.success('Qualifications mises à jour');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating qualifications:', err);
      setError('Erreur lors de la mise à jour des qualifications');
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const toggleQualification = (index: number) => {
    const newQualifications = [...qualifications];
    newQualifications[index].has_qualification = !newQualifications[index].has_qualification;
    setQualifications(newQualifications);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-xl font-semibold mb-6">Modifier les qualifications</h2>

        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            {qualifications.map((qual, index) => (
              <label
                key={qual.id}
                className="flex items-center p-3 rounded-lg border hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={qual.has_qualification}
                  onChange={() => toggleQualification(index)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="ml-3">
                  <span className="block font-medium text-slate-900">
                    {qual.code}
                  </span>
                  <span className="block text-sm text-slate-500">
                    {qual.name}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="flex justify-end space-x-4 pt-6">
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

export default EditQualificationsForm;