import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import WeatherWidget from '../components/weather/WeatherWidget';
import WeatherMap from '../components/weather/WeatherMap';
import { MapPin } from 'lucide-react';

const Weather = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <MapPin className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">Météo Aéronautique</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Colonne de gauche : Carte */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Carte des conditions</h2>
          <div className="h-[600px]">
            <WeatherMap />
          </div>
        </div>

        {/* Colonne de droite : Informations météo */}
        <div>
          <WeatherWidget />
        </div>
      </div>
    </div>
  );
};

export default Weather;
