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

// Fonction utilitaire pour convertir la visibilité
const parseVisibility = (visibility: number | string | null): number | null => {
  if (visibility === null) return null;
  if (typeof visibility === 'number') return visibility;
  
  // Gestion du cas ">6km"
  if (visibility === '>6km' || visibility === '6+') return 6;
  
  // Conversion des autres valeurs numériques
  const numValue = parseFloat(visibility);
  return isNaN(numValue) ? null : numValue;
};

export const getFlightCategory = (
  visibility: number | string | null,
  clouds: Array<{ cover: string; base: number | null }>,
  minima = DEFAULT_MINIMA
) => {
  // Convertir la visibilité
  const visibilityNum = parseVisibility(visibility);
  
  if (!visibilityNum) return 'UNKNOWN';

  // Trouver le plafond le plus bas (première couche BKN ou OVC)
  const ceiling = clouds.find(cloud => 
    ['BKN', 'OVC'].includes(cloud.cover.toUpperCase())
  )?.base || null;

  // Traitement spécial pour les visibilités supérieures à 6km
  if (visibility === '>6km' || visibility === '6+') {
    // On ne vérifie que le plafond car la visibilité est suffisante pour VFR
    if (ceiling === null || ceiling >= minima.visual.ceiling) {
      return 'VFR';
    }
    
    // Vérification du plafond selon les minima
    if (ceiling < minima.marginal.ceiling) {
      return 'IFR';
    }
    if (ceiling < minima.visual.ceiling) {
      return 'MVFR';
    }
    return 'VFR';
  }

  // Convertir la visibilité en mètres (multiplication par 1000 car l'entrée est en km)
  const visibilityMeters = visibilityNum * 1000;

  // Pour les autres cas de visibilité
  // Si la visibilité est de 6km ou plus, on la considère comme VFR pour la visibilité
  if (visibilityNum >= 6) {
    // On ne vérifie que le plafond car la visibilité est suffisante pour VFR
    if (ceiling === null || ceiling >= minima.visual.ceiling) {
      return 'VFR';
    }
    
    // Vérification du plafond selon les minima
    if (ceiling < minima.marginal.ceiling) {
      return 'IFR';
    }
    if (ceiling < minima.visual.ceiling) {
      return 'MVFR';
    }
    return 'VFR';
  }

  // Conditions IFR
  if (
    (visibilityMeters < minima.marginal.visibility) ||
    (ceiling !== null && ceiling < minima.marginal.ceiling)
  ) {
    return 'IFR';
  }

  // Conditions MVFR
  if (
    (visibilityMeters < minima.visual.visibility && visibilityMeters >= minima.marginal.visibility) ||
    (ceiling !== null && ceiling < minima.visual.ceiling && ceiling >= minima.marginal.ceiling)
  ) {
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
  // Convertir la visibilité
  const visibilityNum = parseVisibility(data.visib);
  
  // Trouver le plafond le plus bas
  const lowestCeiling = data.clouds.find(cloud => 
    ['BKN', 'OVC'].includes(cloud.cover.toUpperCase())
  )?.base || null;

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
      if (visibilityNum * 1000 < userMinima.marginal.visibility) return 'text-red-500 font-bold';
      if (visibilityNum * 1000 < userMinima.visual.visibility) return 'text-blue-500 font-bold';
      return 'text-slate-700';
    }
    return 'text-slate-700';
  };

  // Convertir la visibilité en format lisible
  const formatVisibility = (visib: number | string | null): string => {
    if (visib === null) return 'N/A';
    if (visib === '>6km' || visib === '6+') return '>6km';
    const numVisib = parseVisibility(visib);
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
          <span className={getParameterStyle('ceiling')}>
            {lowestCeiling !== null ? `${lowestCeiling}ft` : 'N/A'}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Visibilité</span>
          <span className={getParameterStyle('visibility')}>
            {formatVisibility(data.visib)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FlightConditions;
