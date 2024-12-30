import React from 'react';
import { Cloud, CloudOff, Sun } from 'lucide-react';
import type { WeatherData } from '../../types/weather';

interface FlightConditionsProps {
  data: WeatherData;
  userMinima?: {
    visual: {
      ceiling: number;  // en pieds
      visibility: number;  // en mètres
    };
    marginal: {
      ceiling: number;
      visibility: number;
    };
  };
  compact?: boolean;
}

// Valeurs par défaut des minima VFR
const DEFAULT_MINIMA = {
  visual: {
    ceiling: 3000,    // 3000 ft
    visibility: 8000, // 8000 m
  },
  marginal: {
    ceiling: 1000,    // 1000 ft
    visibility: 5000, // 5000 m
  }
};

export const getFlightCategory = (
  visibility: number | string | null,
  clouds: Array<{ cover: string; base: number | null }>,
  minima = DEFAULT_MINIMA
) => {
  // Convertir la visibilité en nombre si c'est une chaîne
  const visibilityNum = typeof visibility === 'string' ? parseInt(visibility) : visibility;
  
  if (!visibilityNum) return 'UNKNOWN';

  // Trouver le plafond le plus bas (première couche BKN ou OVC)
  const ceiling = clouds.find(cloud => 
    ['BKN', 'OVC'].includes(cloud.cover.toUpperCase()) && cloud.base !== null
  )?.base;

  // Conditions IFR
  if (visibilityNum < minima.marginal.visibility || (ceiling !== undefined && ceiling < minima.marginal.ceiling)) {
    return 'IFR';
  }
  
  // Conditions MVFR
  if (visibilityNum < minima.visual.visibility || (ceiling !== undefined && ceiling < minima.visual.ceiling)) {
    return 'MVFR';
  }

  // Conditions VFR
  return 'VFR';
};

const FlightConditions: React.FC<FlightConditionsProps> = ({ 
  data, 
  userMinima = DEFAULT_MINIMA,
  compact = false 
}) => {
  // Convertir la visibilité en nombre
  const visibilityNum = typeof data.visib === 'string' ? parseInt(data.visib) : data.visib;
  
  // Trouver le plafond le plus bas
  const lowestCeiling = data.clouds.find(cloud => 
    ['BKN', 'OVC'].includes(cloud.cover.toUpperCase()) && cloud.base !== null
  )?.base;

  const category = getFlightCategory(visibilityNum, data.clouds, userMinima);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'VFR':
        return 'text-green-500';
      case 'MVFR':
        return 'text-blue-500';
      case 'IFR':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'VFR':
        return <Sun className={compact ? "h-5 w-5" : "h-8 w-8"} />;
      case 'MVFR':
        return <Cloud className={compact ? "h-5 w-5" : "h-8 w-8"} />;
      case 'IFR':
        return <CloudOff className={compact ? "h-5 w-5" : "h-8 w-8"} />;
      default:
        return <Cloud className={compact ? "h-5 w-5" : "h-8 w-8"} />;
    }
  };

  const getParameterStyle = (paramName: string) => {
    if (paramName === 'ceiling') {
      if (!lowestCeiling) return 'text-slate-700';
      if (lowestCeiling < userMinima.marginal.ceiling) return 'text-red-500 font-bold';
      if (lowestCeiling < userMinima.visual.ceiling) return 'text-blue-500 font-bold';
      return 'text-slate-700';
    } else if (paramName === 'visibility') {
      if (!visibilityNum) return 'text-slate-700';
      if (visibilityNum < userMinima.marginal.visibility) return 'text-red-500 font-bold';
      if (visibilityNum < userMinima.visual.visibility) return 'text-blue-500 font-bold';
      return 'text-slate-700';
    }
    return 'text-slate-700';
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

  // Mode compact pour les aérodromes secondaires
  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${getCategoryColor(category)}`}>
        {getCategoryIcon(category)}
      </div>
    );
  }

  // Mode normal pour l'aérodrome principal
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex items-center gap-2 ${getCategoryColor(category)}`}>
        {getCategoryIcon(category)}
        <span className="font-semibold">{category}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Plafond</span>
          {data.clouds.map((cloud, index) => {
            const isCeiling = ['BKN', 'OVC'].includes(cloud.cover.toUpperCase());
            return (
              <span 
                key={index}
                className={isCeiling ? getParameterStyle('ceiling') : 'text-slate-700'}
              >
                {cloud.cover.toUpperCase()} {cloud.base !== null ? `${cloud.base}ft` : 'N/A'}
              </span>
            );
          })}
        </div>

        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Visibilité</span>
          <span className={getParameterStyle('visibility')}>
            {formatVisibility(visibilityNum)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FlightConditions;
