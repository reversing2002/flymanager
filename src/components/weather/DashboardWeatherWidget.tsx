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
  const { user } = useUser();
  const [coordinates, setCoordinates] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });

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
      if (!user?.club?.id) {
        setError('Aucun club sélectionné');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('latitude, longitude')
          .eq('id', user.club.id)
          .single();

        if (error) {
          console.error('Erreur lors du chargement des coordonnées:', error);
          setError('Erreur lors du chargement des coordonnées du club');
          setLoading(false);
          return;
        }

        setCoordinates({
          latitude: data?.latitude || null,
          longitude: data?.longitude || null
        });
        
        if (!data?.latitude || !data?.longitude) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des coordonnées:', err);
        setError('Erreur lors du chargement des coordonnées du club');
        setLoading(false);
      }
    };

    fetchClubCoordinates();
  }, [user?.club?.id]);

  useEffect(() => {
    const fetchWeatherData = async (lat: number, lon: number) => {
      try {
        const bbox = {
          north: lat + 0.5,
          south: lat - 0.5,
          east: lon + 0.5,
          west: lon - 0.5
        };

        const response = await fetch(
          `https://stripe.linked.fr/api/meteo/metar?bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}`
        );

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setWeatherData(data);
          setError(null);
        } else {
          setError('Aucune donnée météo disponible dans cette zone');
        }
      } catch (err) {
        console.error('Erreur lors du chargement de la météo:', err);
        setError('Erreur lors du chargement des données météo');
      } finally {
        setLoading(false);
      }
    };

    if (coordinates.latitude && coordinates.longitude) {
      fetchWeatherData(coordinates.latitude, coordinates.longitude);
    }
  }, [coordinates.latitude, coordinates.longitude]);

  if (loading) {
    return (
      <Card className="w-full h-48 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </Card>
    );
  }

  if (!coordinates.latitude || !coordinates.longitude) {
    return (
      <Card className="w-full p-4">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="text-yellow-600 font-medium">
            Les coordonnées GPS du club ne sont pas configurées
          </div>
          <div className="text-sm text-gray-500">
            Un administrateur doit renseigner les coordonnées GPS du club dans les paramètres pour afficher la météo
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full p-4">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="text-red-600 font-medium">
            {error}
          </div>
          {error === 'Aucune donnée météo disponible dans cette zone' && (
            <div className="text-sm text-gray-500">
              Il n'y a pas de station météo à proximité du club
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (!weatherData.length) {
    return (
      <Card className="p-4">
        <div className="text-slate-500 text-center">
          Aucune donnée météo disponible
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <MetarVisualizer 
        data={weatherData[0]} 
        userMinima={userMinima}
        compact={true}
      />
    </Card>
  );
};

export default DashboardWeatherWidget;
