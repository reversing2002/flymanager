import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../hooks/useUser';
import DiscoveryFlightSettings from './DiscoveryFlightSettings';
import { toast } from 'react-hot-toast';

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
}

interface ClubSettings {
  id: string;
  stripe_account_id: string | null;
}

const ClubManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'Général' },
    { id: 'discovery', label: 'Vols découverte' },
    { id: 'stripe', label: 'Configuration Stripe' },
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

      <div className="border-b mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'general' && clubData && (
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Commission CB (%)
            </label>
            <input
              type="number"
              name="commission_rate"
              min="0"
              max="100"
              step="0.1"
              required
              defaultValue={clubData.commission_rate || 3}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            />
            <p className="mt-1 text-sm text-slate-500">
              Taux de commission appliqué sur les paiements par carte bancaire (par défaut : 3%)
            </p>
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

      {activeTab === 'discovery' && (
        <DiscoveryFlightSettings />
      )}

      {activeTab === 'stripe' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="stripe_account_id" className="block text-sm font-medium text-gray-700">
                Stripe Account ID
              </label>
              <input
                type="text"
                name="stripe_account_id"
                id="stripe_account_id"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="acct_..."
                defaultValue={clubData?.stripe_account_id || ''}
              />
              <p className="mt-1 text-sm text-gray-500">
                L'identifiant de votre compte Stripe Connect commence par "acct_"
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">{success}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
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
