import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getFFPLUMCredentials, upsertFFPLUMCredentials, deleteFFPLUMCredentials } from '../../lib/queries/ffplum_credentials';
import type { FFPLUMCredentials } from '../../types/ffplum_credentials';
import { Eye, EyeOff } from 'lucide-react';

interface FFPLUMCredentialsFormProps {
  userId: string;
}

const FFPLUMCredentialsForm: React.FC<FFPLUMCredentialsFormProps> = ({ userId }) => {
  const [credentials, setCredentials] = useState<FFPLUMCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    ffplum_login: '',
    ffplum_password: '',
  });

  useEffect(() => {
    loadCredentials();
  }, [userId]);

  const loadCredentials = async () => {
    try {
      const data = await getFFPLUMCredentials(userId);
      setCredentials(data);
      if (data) {
        setFormData({
          ffplum_login: data.ffplum_login,
          ffplum_password: data.ffplum_password,
        });
      }
    } catch (error) {
      console.error('Error loading FFPLUM credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertFFPLUMCredentials(userId, formData);
      toast.success('Identifiants FFPLUM mis à jour');
      loadCredentials();
    } catch (error) {
      console.error('Error saving FFPLUM credentials:', error);
      toast.error('Erreur lors de la sauvegarde des identifiants');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer les identifiants FFPLUM ?')) {
      return;
    }

    try {
      await deleteFFPLUMCredentials(userId);
      toast.success('Identifiants FFPLUM supprimés');
      setCredentials(null);
      setFormData({
        ffplum_login: '',
        ffplum_password: '',
      });
    } catch (error) {
      console.error('Error deleting FFPLUM credentials:', error);
      toast.error('Erreur lors de la suppression des identifiants');
    }
  };

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Identifiants FFPLUM</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ffplum_login" className="block text-sm font-medium text-gray-700">
            Identifiant FFPLUM
          </label>
          <input
            type="text"
            id="ffplum_login"
            value={formData.ffplum_login}
            onChange={(e) => setFormData((prev) => ({ ...prev, ffplum_login: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="ffplum_password" className="block text-sm font-medium text-gray-700">
            Mot de passe FFPLUM
          </label>
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              id="ffplum_password"
              value={formData.ffplum_password}
              onChange={(e) => setFormData((prev) => ({ ...prev, ffplum_password: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center pt-4">
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Enregistrer
          </button>
          {credentials && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Supprimer
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FFPLUMCredentialsForm;
