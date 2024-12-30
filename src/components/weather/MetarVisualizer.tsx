import React from 'react';
import { Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSnow, Sun, Wind, Clock } from 'lucide-react';
import type { WeatherData } from '../../types/weather';
import FlightConditions from './FlightConditions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MetarVisualizerProps {
  data: WeatherData;
  userMinima?: {
    visual: {
      ceiling: number;
      visibility: number;
    };
    marginal: {
      ceiling: number;
      visibility: number;
    };
  };
}

const MetarVisualizer: React.FC<MetarVisualizerProps> = ({ data, userMinima }) => {
  // Fonction pour déterminer l'icône météo en fonction du METAR
  const getWeatherIcon = () => {
    const wxString = data.wxString?.toLowerCase() || '';
    
    if (wxString.includes('ts')) return <CloudLightning className="h-8 w-8 text-yellow-500" />;
    if (wxString.includes('sn')) return <CloudSnow className="h-8 w-8 text-blue-300" />;
    if (wxString.includes('ra')) return <CloudRain className="h-8 w-8 text-blue-500" />;
    if (wxString.includes('dz')) return <CloudDrizzle className="h-8 w-8 text-blue-400" />;
    
    // Vérification de la couverture nuageuse
    const lowestCloud = data.clouds?.[0];
    if (lowestCloud) {
      if (['ovc', 'bkn'].includes(lowestCloud.cover.toLowerCase())) {
        return <Cloud className="h-8 w-8 text-gray-500" />;
      }
      if (['sct', 'few'].includes(lowestCloud.cover.toLowerCase())) {
        return <Cloud className="h-8 w-8 text-gray-300" />;
      }
    }
    
    return <Sun className="h-8 w-8 text-yellow-400" />;
  };

  // Convertir la direction du vent en texte
  const getWindDirection = (wdir: number | string | null) => {
    if (wdir === null) return 'N/A';
    if (typeof wdir === 'string' && wdir.toLowerCase() === 'vrb') return 'Variable';
    if (typeof wdir === 'number') {
      const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      const index = Math.round(((wdir % 360) / 22.5));
      return directions[index % 16];
    }
    return 'N/A';
  };

  // Convertir la visibilité en format lisible
  const formatVisibility = (visib: number | string | null): string => {
    if (visib === null) return 'N/A';
    const numVisib = typeof visib === 'string' ? parseFloat(visib) : visib;
    if (numVisib < 1) {
      return `${Math.round(numVisib * 1000)}m`;
    }
    return `${numVisib}km`;
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-700">
          {data.icaoId} - {data.name.split(',')[0]}
        </h3>
      </div>

      {/* Heure d'observation */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Clock className="h-4 w-4" />
        <span>
          Observation du {format(new Date(data.obsTime * 1000), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
        </span>
      </div>
      
      {/* Conditions de vol */}
      <div className="mb-6">
        <FlightConditions data={data} userMinima={userMinima} />
      </div>

      {/* Paramètres météo détaillés */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Température</span>
          <span className="text-lg font-medium">{data.temp !== null ? `${data.temp}°C` : 'N/A'}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Point de rosée</span>
          <span className="text-lg font-medium">{data.dewp !== null ? `${data.dewp}°C` : 'N/A'}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Vent</span>
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-slate-400" />
            <span className="text-lg font-medium">
              {data.wspd !== null 
                ? `${getWindDirection(data.wdir)} ${data.wspd}kt` 
                : 'N/A'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col">
          <span className="text-sm text-slate-500">QNH</span>
          <span className="text-lg font-medium">
            {data.altim !== null ? `${data.altim}hPa` : 'N/A'}
          </span>
        </div>
      </div>

      {/* METAR brut */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <span className="text-xs font-mono text-slate-500 break-all">{data.rawOb}</span>
      </div>
    </div>
  );
};

export default MetarVisualizer;
