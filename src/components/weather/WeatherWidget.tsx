import { useEffect, useState } from 'react';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../lib/supabase';
import type { WeatherData } from '../../types/weather';
import MetarVisualizer from './MetarVisualizer';
import FlightConditions from './FlightConditions';
import TafVisualizer from './TafVisualizer';
import MetarText from './MetarText'; // Import MetarText
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const WeatherWidget = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const { user } = useUser();

  const [userMinima, setUserMinima] = useState({
    visual: {
      ceiling: 3000,    // 3000 ft
      visibility: 8000, // 8000 m
    },
    marginal: {
      ceiling: 1000,    // 1000 ft
      visibility: 5000, // 5000 m
    }
  });

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const loadUserMinima = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('weather_minima')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (data?.weather_minima) {
          setUserMinima(data.weather_minima);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des minima:', err);
      }
    };

    loadUserMinima();
  }, [user?.id]);

  useEffect(() => {
    const fetchClubCoordinates = async () => {
      if (!user?.club?.id) return;

      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('latitude, longitude')
          .eq('id', user.club.id)
          .single();

        if (error) throw error;

        if (data?.latitude && data?.longitude) {
          fetchWeatherData(data.latitude, data.longitude);
        }
      } catch (err) {
        console.error('Erreur club:', err);
        setError('Impossible de récupérer les coordonnées du club');
        setLoading(false);
      }
    };

    const fetchWeatherData = async (lat: number, lon: number) => {
      try {
        // Calculer la bbox (±1 degré autour du point)
        const bbox = {
          west: lon - 1,
          east: lon + 1,
          south: lat - 1,
          north: lat + 1
        };

        // Formater la date au format YYYYMMDD_HHMMSSZ
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        
        const date = `${year}${month}${day}_${hours}${minutes}${seconds}Z`;

        // Construire les paramètres de la requête dans l'ordre lat_sud,lon_ouest,lat_nord,lon_est
        const bboxString = `${bbox.south.toFixed(4)},${bbox.west.toFixed(4)},${bbox.north.toFixed(4)},${bbox.east.toFixed(4)}`;

        const params = new URLSearchParams({
          bbox: bboxString,
          date: date
        });

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/weather?${params.toString()}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erreur API:', errorText);
          throw new Error('Erreur lors de la récupération des données météo');
        }

        const data = await response.json();
        
        if (!Array.isArray(data)) {
          console.error('Format de données invalide:', data);
          throw new Error('Format de données météo invalide');
        }
        
        if (data.length === 0) {
          console.warn('Aucune donnée météo disponible pour les coordonnées:', { 
            lat,
            lon,
            bbox: bboxString, 
            date 
          });
          setWeatherData([]);
          return;
        }

        // Trier par distance par rapport aux coordonnées du club
        const sortedData = data.sort((a, b) => {
          const distA = Math.sqrt(Math.pow(a.lat - lat, 2) + Math.pow(a.lon - lon, 2));
          const distB = Math.sqrt(Math.pow(b.lat - lat, 2) + Math.pow(b.lon - lon, 2));
          return distA - distB;
        });

        setWeatherData(sortedData.slice(0, 5)); // Limiter aux 5 plus proches aérodromes
      } catch (err) {
        console.error('Erreur météo:', err);
        setError('Impossible de récupérer les données météo');
      } finally {
        setLoading(false);
      }
    };

    fetchClubCoordinates();
  }, [user?.club?.id]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!weatherData.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-slate-500 text-center">
          Aucune donnée météo disponible
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Station la plus proche avec visualisation détaillée */}
      <MetarVisualizer data={weatherData[0]} userMinima={userMinima} />
      
      {/* Aérodromes proches */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Autres aérodromes proches</h3>
        <div className="space-y-4">
          {weatherData.slice(1, expanded ? undefined : 3).map((station) => (
            <div key={station.metar_id} className="border-b pb-4 last:border-b-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FlightConditions 
                      data={station} 
                      userMinima={userMinima}
                      compact={true} 
                    />
                    <h4 className="font-medium">{station.icaoId}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{station.name.split(',')[0]}</p>
                </div>
                <div className="text-right">
                  {station.temp !== null && (
                    <span className="text-lg font-semibold">
                      {station.temp}°C
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <MetarText metar={station.rawOb} compact={true} />
              </div>
              {station.rawTaf && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <TafVisualizer rawTaf={station.rawTaf} compact={true} />
                </div>
              )}
            </div>
          ))}
        </div>
        {weatherData.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Voir moins d'aérodromes
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Voir {weatherData.length - 3} aérodromes supplémentaires
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default WeatherWidget;
