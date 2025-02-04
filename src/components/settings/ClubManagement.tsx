import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../hooks/useUser';
import { hasAnyGroup } from '../../lib/permissions';
import DiscoveryFlightSettings from './DiscoveryFlightSettings';
import StripeAccountSettings from './StripeAccountSettings';
import WeatherSettings from './WeatherSettings';
import { toast } from 'react-hot-toast';
import { useWeatherStations } from '../../hooks/useWeatherStations';
import { ClubWebsiteSettings } from './ClubWebsiteSettings';

interface ClubData {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  reservation_start_hour: number | null;
  reservation_end_hour: number | null;
}

interface ClubSettings {
  id: string;
  stripe_account_id: string | null;
  weather_station_id: string | null;
}

const ClubManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const { user } = useUser();
  const { data: stations, isLoading: stationsLoading } = useWeatherStations();
  const [activeTab, setActiveTab] = useState('general');

  const isSystemAdmin = hasAnyGroup(user, ['SYSTEM_ADMIN']);

  const tabs = [
    { id: 'general', label: 'Général' },
    { id: 'hours', label: 'Horaires' },
    { id: 'discovery', label: 'Vols découverte' },
    { id: 'meteo', label: 'Météo' },
    { id: 'website', label: 'Site Web' },
    ...(isSystemAdmin ? [{ id: 'stripe', label: 'Configuration Stripe' }] : []),
  ];

  useEffect(() => {
    if (user?.club?.id) {
      fetchClubData();
    }
  }, [user?.club?.id]);

  const fetchClubData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', user.club.id)
        .single();

      if (error) throw error;

      // Set default values if not set
      if (data) {
        data.reservation_start_hour = data.reservation_start_hour ?? 7;
        data.reservation_end_hour = data.reservation_end_hour ?? 21;
        setClubData(data);
      }
    } catch (err) {
      setError('Erreur lors du chargement des données du club');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.club?.id) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);

    try {
      if (activeTab === 'stripe') {
        // Pour l'onglet Stripe, on ne met à jour que le stripe_account_id
        const { error } = await supabase
          .from('clubs')
          .update({
            stripe_account_id: formData.get('stripe_account_id') as string,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.club.id);

        if (error) throw error;
      } else if (activeTab === 'meteo') {
        // Pour l'onglet météo, on ne met à jour que le wind_station_id et le wind_station_name
        const { error } = await supabase
          .from('clubs')
          .update({
            wind_station_id: formData.get('weather_station_id') as string,
            wind_station_name: stations?.find(s => s.Id_station === formData.get('weather_station_id'))?.Nom_usuel || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.club.id);

        if (error) throw error;
      } else if (activeTab === 'hours') {
        // Pour l'onglet heures, on met à jour les heures de réservation
        const { error } = await supabase
          .from('clubs')
          .update({
            reservation_start_hour: parseInt(formData.get('reservation_start_hour') as string),
            reservation_end_hour: parseInt(formData.get('reservation_end_hour') as string),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.club.id);

        if (error) throw error;
      } else {
        // Pour les autres onglets, on met à jour tous les champs généraux
        const values = {
          name: formData.get('name') as string,
          code: formData.get('code') as string,
          address: formData.get('address') as string,
          phone: formData.get('phone') as string,
          email: formData.get('email') as string,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('clubs')
          .update(values)
          .eq('id', user.club.id);

        if (error) throw error;

        // Mettre à jour la table de cache
        const { error: cacheError } = await supabase
          .from('club_website_settings')
          .update({
            cached_club_info: {
              address: values.address,
              phone: values.phone,
              email: values.email,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('club_id', user.club.id);

        if (cacheError) {
          console.error('Erreur lors de la mise à jour du cache:', cacheError);
          toast.error('Les informations ont été mises à jour mais le cache n\'a pas pu être actualisé');
        }
      }

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
    <div className="space-y-6">
      <div className="flex space-x-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 ${
              activeTab === tab.id
                ? 'border-b-2 border-sky-500 text-sky-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-lg">
          {success}
        </div>
      )}

      {activeTab === 'general' && clubData && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Champs généraux visibles par tous */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nom du club
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={clubData.name}
                onChange={(e) => setClubData({ ...clubData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Code
              </label>
              <input
                type="text"
                name="code"
                id="code"
                value={clubData.code}
                onChange={(e) => setClubData({ ...clubData, code: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={clubData.email}
                onChange={(e) => setClubData({ ...clubData, email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Téléphone
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                value={clubData.phone}
                onChange={(e) => setClubData({ ...clubData, phone: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Adresse
              </label>
              <input
                type="text"
                name="address"
                id="address"
                value={clubData.address}
                onChange={(e) => setClubData({ ...clubData, address: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center rounded-md border border-transparent bg-sky-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'hours' && (
        <div className="space-y-6">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Horaires des réservations
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="reservation_start_hour" className="block text-sm font-medium text-gray-700">
                      Heure de début des réservations
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      name="reservation_start_hour"
                      id="reservation_start_hour"
                      value={clubData?.reservation_start_hour ?? 7}
                      onChange={(e) => setClubData(prev => ({ ...prev!, reservation_start_hour: parseInt(e.target.value) }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="reservation_end_hour" className="block text-sm font-medium text-gray-700">
                      Heure de fin des réservations
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      name="reservation_end_hour"
                      id="reservation_end_hour"
                      value={clubData?.reservation_end_hour ?? 21}
                      onChange={(e) => setClubData(prev => ({ ...prev!, reservation_end_hour: parseInt(e.target.value) }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    Note : L'heure de début doit être inférieure à l'heure de fin. Les heures doivent être comprises entre 0 et 23.
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center rounded-md border border-transparent bg-sky-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                  >
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'discovery' && <DiscoveryFlightSettings />}
      
      {activeTab === 'meteo' && clubData && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="weather-station" className="block text-sm font-medium text-gray-700">
              Station météo
            </label>
            <select
              id="weather-station"
              name="weather_station_id"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              disabled={stationsLoading}
              value={clubData.wind_station_id || ""}
              onChange={(e) => setClubData({ ...clubData, wind_station_id: e.target.value })}
            >
              <option value="">Sélectionner une station</option>
              {Array.isArray(stations) && stations.map((station) => (
                <option 
                  key={station.Id_station} 
                  value={station.Id_station}
                >
                  {station.Nom_usuel}{station.distance !== undefined ? ` (${station.distance.toFixed(1)}km)` : ''}
                </option>
              ))}
            </select>
            {stationsLoading && (
              <p className="text-sm text-gray-500">Chargement des stations...</p>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center rounded-md border border-transparent bg-sky-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
      
      {activeTab === 'website' && <ClubWebsiteSettings clubId={user?.club?.id} />}
      
      {activeTab === 'stripe' && isSystemAdmin && <StripeAccountSettings />}
    </div>
  );
};

export default ClubManagement;
