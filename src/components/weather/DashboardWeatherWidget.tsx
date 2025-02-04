import { useEffect, useState } from 'react';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../lib/supabase';
import type { WeatherData } from '../../types/weather';
import MetarVisualizer from './MetarVisualizer';
import { Loader2 } from 'lucide-react';
import { Card } from "@/components/ui/card";

const DashboardWeatherWidget = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [noCoordinates, setNoCoordinates] = useState(false);
  const { user } = useUser();

  const [userMinima, setUserMinima] = useState({
    visual: {
      ceiling: 3000,
      visibility: 8000,
    },
    marginal: {
      ceiling: 1000,
      visibility: 5000,
    }
  });

  useEffect(() => {
    const loadUserMinima = async () => {
      if (!user?.club?.id) return;

      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('weather_settings')
          .eq('id', user.club.id)
          .single();

        if (error) throw error;
        if (data?.weather_settings) {
          setUserMinima({
            visual: {
              ceiling: data.weather_settings.visual_ceiling,
              visibility: data.weather_settings.visual_visibility,
            },
            marginal: {
              ceiling: data.weather_settings.marginal_ceiling,
              visibility: data.weather_settings.marginal_visibility,
            }
          });
        }
      } catch (err) {
        console.error('Erreur lors du chargement des minima:', err);
      }
    };

    loadUserMinima();
  }, [user?.club?.id]);

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

        if (!data?.latitude || !data?.longitude) {
          setNoCoordinates(true);
          setLoading(false);
          return;
        }

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
        const bbox = {
          west: lon - 1,
          east: lon + 1,
          south: lat - 1,
          north: lat + 1
        };

        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        
        const date = `${year}${month}${day}_${hours}${minutes}${seconds}Z`;
        const bboxString = `${bbox.south.toFixed(4)},${bbox.west.toFixed(4)},${bbox.north.toFixed(4)},${bbox.east.toFixed(4)}`;

        const params = new URLSearchParams({
          bbox: bboxString,
          date: date
        });

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/weather?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données météo');
        }

        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Format de données météo invalide');
        }
        
        if (data.length === 0) {
          setWeatherData([]);
          return;
        }

        const sortedData = data.sort((a, b) => {
          const distA = Math.sqrt(Math.pow(a.lat - lat, 2) + Math.pow(a.lon - lon, 2));
          const distB = Math.sqrt(Math.pow(b.lat - lat, 2) + Math.pow(b.lon - lon, 2));
          return distA - distB;
        });

        setWeatherData([sortedData[0]]); // Ne garder que la station la plus proche
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
      <Card className="p-4">
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      {error && (
        <div className="text-red-500 text-center p-4">
          {error}
        </div>
      )}
      {noCoordinates && (
        <div className="text-amber-500 text-center p-4">
          Les coordonnées GPS doivent être renseignées par un administrateur pour voir la météo.
        </div>
      )}
      {!loading && !error && !noCoordinates && weatherData.map((data, index) => (
        <MetarVisualizer 
          key={index}
          data={data} 
          userMinima={userMinima}
          compact={true}
        />
      ))}
    </Card>
  );
};

export default DashboardWeatherWidget;
