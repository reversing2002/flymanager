import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../hooks/useUser';

interface ClubData {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  night_flights_enabled: boolean;
}

const ClubManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (user?.club?.id) {
      fetchClubData();
    }
  }, [user?.club?.id]);

  const fetchClubData = async () => {
    if (!user?.club?.id) return;

    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', user.club.id)
        .single();

      if (error) throw error;

      if (data) {
        setClubData(data);
      }
    } catch (error) {
      setError('Impossible de charger les informations du club');
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.club?.id) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const values = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      latitude: formData.get('latitude') ? Number(formData.get('latitude')) : null,
      longitude: formData.get('longitude') ? Number(formData.get('longitude')) : null,
      night_flights_enabled: formData.get('night_flights_enabled') === 'on',
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('clubs')
        .update(values)
        .eq('id', user.club.id);

      if (error) throw error;

      setSuccess('Informations du club mises à jour');
      fetchClubData();
    } catch (error) {
      setError('Impossible de mettre à jour les informations');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.club?.id) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center text-slate-700">
          Vous n'êtes associé à aucun club.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Informations du Club</h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {clubData && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom du club
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={clubData.name}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Code
            </label>
            <input
              type="text"
              name="code"
              required
              defaultValue={clubData.code}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Adresse
            </label>
            <input
              type="text"
              name="address"
              defaultValue={clubData.address || ''}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={clubData.phone || ''}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              defaultValue={clubData.email || ''}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Latitude
              </label>
              <input
                type="number"
                name="latitude"
                step="any"
                defaultValue={clubData.latitude || ''}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Longitude
              </label>
              <input
                type="number"
                name="longitude"
                step="any"
                defaultValue={clubData.longitude || ''}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Vols de nuit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="night_flights_enabled"
                id="night_flights_enabled"
                defaultChecked={clubData.night_flights_enabled}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <label htmlFor="night_flights_enabled" className="text-sm text-slate-600">
                Activer les vols de nuit dans le planning
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ClubManagement;
