import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getFFACredentials, upsertFFACredentials, deleteFFACredentials } from '../../lib/queries/ffa_credentials';
import type { FFACredentials } from '../../types/ffa_credentials';
import { Eye, EyeOff } from 'lucide-react';

interface FFACredentialsFormProps {
  userId: string;
}

const FFACredentialsForm: React.FC<FFACredentialsFormProps> = ({ userId }) => {
  const [credentials, setCredentials] = useState<FFACredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    ffa_login: '',
    ffa_password: '',
  });

  useEffect(() => {
    loadCredentials();
  }, [userId]);

  const loadCredentials = async () => {
    try {
      const data = await getFFACredentials(userId);
      setCredentials(data);
      if (data) {
        setFormData({
          ffa_login: data.ffa_login,
          ffa_password: data.ffa_password,
        });
      }
    } catch (error) {
      console.error('Error loading FFA credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertFFACredentials(userId, formData);
      toast.success('Identifiants SMILE FFA mis à jour');
      loadCredentials();
    } catch (error) {
      console.error('Error saving FFA credentials:', error);
      toast.error('Erreur lors de la sauvegarde des identifiants');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer les identifiants SMILE FFA ?')) {
      return;
    }

    try {
      await deleteFFACredentials(userId);
      toast.success('Identifiants SMILE FFA supprimés');
      setCredentials(null);
      setFormData({
        ffa_login: '',
        ffa_password: '',
      });
    } catch (error) {
      console.error('Error deleting FFA credentials:', error);
      toast.error('Erreur lors de la suppression des identifiants');
    }
  };

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Identifiants SMILE FFA</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ffa_login" className="block text-sm font-medium text-gray-700">
            Identifiant SMILE
          </label>
          <input
            type="text"
            id="ffa_login"
            value={formData.ffa_login}
            onChange={(e) => setFormData((prev) => ({ ...prev, ffa_login: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="ffa_password" className="block text-sm font-medium text-gray-700">
            Mot de passe SMILE
          </label>
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              id="ffa_password"
              value={formData.ffa_password}
              onChange={(e) => setFormData((prev) => ({ ...prev, ffa_password: e.target.value }))}
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

export default FFACredentialsForm;
