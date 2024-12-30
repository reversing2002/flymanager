import { useState, useEffect } from 'react';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../lib/supabase';
import { Cloud } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WeatherSettings {
  visual_ceiling: number;
  visual_visibility: number;
  marginal_ceiling: number;
  marginal_visibility: number;
}

const DEFAULT_WEATHER_SETTINGS: WeatherSettings = {
  visual_ceiling: 3000,    // 3000 ft
  visual_visibility: 8000, // 8000 m
  marginal_ceiling: 1000,    // 1000 ft
  marginal_visibility: 5000, // 5000 m
};

const WeatherSettings = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<WeatherSettings>(DEFAULT_WEATHER_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, [user?.club?.id]);

  const loadSettings = async () => {
    if (!user?.club?.id) return;

    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('weather_settings')
        .eq('id', user.club.id)
        .single();

      if (error) throw error;

      if (data?.weather_settings) {
        setSettings(data.weather_settings);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des seuils météo:', err);
      toast.error('Impossible de charger les seuils météo');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.club?.id) return;

    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const newSettings: WeatherSettings = {
        visual_ceiling: Number(formData.get('visual_ceiling')),
        visual_visibility: Number(formData.get('visual_visibility')),
        marginal_ceiling: Number(formData.get('marginal_ceiling')),
        marginal_visibility: Number(formData.get('marginal_visibility')),
      };

      const { error } = await supabase
        .from('clubs')
        .update({ 
          weather_settings: newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.club.id);

      if (error) throw error;

      setSettings(newSettings);
      toast.success('Seuils météo mis à jour');
    } catch (err) {
      console.error('Erreur lors de la mise à jour des seuils météo:', err);
      toast.error('Impossible de mettre à jour les seuils météo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Cloud className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-900">Seuils Météorologiques</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
          Ces seuils sont utilisés pour déterminer les conditions de vol (VFR, MVFR, IFR) sur la carte météo.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seuils VFR */}
          <div className="space-y-4">
            <h3 className="font-medium text-slate-900">Conditions VFR</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Plafond minimum (ft)
              </label>
              <input
                type="number"
                name="visual_ceiling"
                required
                min="0"
                step="100"
                defaultValue={settings.visual_ceiling}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Visibilité minimum (m)
              </label>
              <input
                type="number"
                name="visual_visibility"
                required
                min="0"
                step="100"
                defaultValue={settings.visual_visibility}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Seuils MVFR */}
          <div className="space-y-4">
            <h3 className="font-medium text-slate-900">Conditions MVFR</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Plafond minimum (ft)
              </label>
              <input
                type="number"
                name="marginal_ceiling"
                required
                min="0"
                step="100"
                defaultValue={settings.marginal_ceiling}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Visibilité minimum (m)
              </label>
              <input
                type="number"
                name="marginal_visibility"
                required
                min="0"
                step="100"
                defaultValue={settings.marginal_visibility}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`
              inline-flex justify-center items-center px-4 py-2 border border-transparent 
              rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 
              hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
              focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WeatherSettings;
