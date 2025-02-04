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
  latitude: number | null;
  longitude: number | null;
  night_flights_enabled: boolean;
  commission_rate: number;
  stripe_account_id: string | null;
  wind_station_id: string | null;
  wind_station_name: string | null;
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
      } else {
        // Pour les autres onglets, on met à jour tous les champs généraux
        const values = {
          name: formData.get('name') as string,
          code: formData.get('code') as string,
          address: formData.get('address') as string,
          phone: formData.get('phone') as string,
          email: formData.get('email') as string,
          latitude: formData.get('latitude') ? Number(formData.get('latitude')) : null,
          longitude: formData.get('longitude') ? Number(formData.get('longitude')) : null,
          night_flights_enabled: formData.get('night_flights_enabled') === 'on',
          commission_rate: formData.get('commission_rate') ? Number(formData.get('commission_rate')) : 3,
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
              latitude: values.latitude,
              longitude: values.longitude,
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
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                name="latitude"
                id="latitude"
                value={clubData.latitude || ''}
                onChange={(e) => setClubData({ ...clubData, latitude: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                placeholder="Ex: 48.8566"
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                name="longitude"
                id="longitude"
                value={clubData.longitude || ''}
                onChange={(e) => setClubData({ ...clubData, longitude: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                placeholder="Ex: 2.3522"
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
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="night_flights_enabled"
                name="night_flights_enabled"
                className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                defaultChecked={clubData?.night_flights_enabled}
              />
              <label htmlFor="night_flights_enabled" className="text-sm font-medium text-gray-700">
                Autoriser les vols de nuit
              </label>
            </div>
            {isSystemAdmin && (
              <div>
                <label htmlFor="commission_rate" className="block text-sm font-medium text-gray-700">
                  Taux de commission (%)
                </label>
                <input
                  type="number"
                  name="commission_rate"
                  id="commission_rate"
                  value={clubData.commission_rate}
                  onChange={(e) => setClubData({ ...clubData, commission_rate: Number(e.target.value) })}
                  step="0.01"
                  min="0"
                  max="100"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                />
              </div>
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
