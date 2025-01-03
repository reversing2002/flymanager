import React, { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../lib/supabase';
import type { WeatherData } from '../../types/weather';

const MAPTILER_KEY = '869VdTVYvYcrnGVilpTn';
const NAUTICAL_MILE_TO_DEGREE = 1 / 60; // 1 NM = 1/60 degré
const RANGE_NM = 100; // Rayon en miles nautiques

// Valeurs par défaut des minima VFR
const DEFAULT_WEATHER_SETTINGS = {
  visual_ceiling: 3000,    // 3000 ft
  visual_visibility: 8000, // 8000 m
  marginal_ceiling: 1000,    // 1000 ft
  marginal_visibility: 5000, // 5000 m
};

maptilersdk.config.apiKey = MAPTILER_KEY;

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

const WeatherMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const { user } = useUser();
  const [clubCoordinates, setClubCoordinates] = useState<{lat: number, lon: number} | null>(null);
  const markersRef = useRef<maptilersdk.Marker[]>([]);
  const [weatherSettings, setWeatherSettings] = useState(DEFAULT_WEATHER_SETTINGS);

  // Récupérer les coordonnées et les seuils du club
  useEffect(() => {
    const fetchClubData = async () => {
      if (!user?.club?.id) return;

      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('latitude, longitude, weather_settings')
          .eq('id', user.club.id)
          .single();

        if (error) throw error;

        if (data?.latitude && data?.longitude) {
          setClubCoordinates({
            lat: data.latitude,
            lon: data.longitude
          });
        }

        if (data?.weather_settings) {
          setWeatherSettings(data.weather_settings);
        }
      } catch (err) {
        console.error('Erreur club:', err);
      }
    };

    fetchClubData();
  }, [user?.club?.id]);

  // Récupérer les données météo
  const { data: weatherData } = useQuery<WeatherData[]>({
    queryKey: ['weather-map', clubCoordinates],
    enabled: !!clubCoordinates,
    queryFn: async () => {
      if (!clubCoordinates) throw new Error('Coordonnées du club non disponibles');

      const { lat, lon } = clubCoordinates;
      
      // Calculer la bbox (±100NM autour du point)
      const rangeInDegrees = RANGE_NM * NAUTICAL_MILE_TO_DEGREE;
      const bbox = {
        west: lon - rangeInDegrees,
        east: lon + rangeInDegrees,
        south: lat - rangeInDegrees,
        north: lat + rangeInDegrees
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
        const errorText = await response.text();
        console.error('Erreur API:', errorText);
        throw new Error('Erreur lors de la récupération des données météo');
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error('Format de données invalide:', data);
        throw new Error('Format de données météo invalide');
      }

      return data;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current || !clubCoordinates) return;

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.TOPO,
      center: [clubCoordinates.lon, clubCoordinates.lat],
      zoom: 8,
      pitch: 45,
      terrain: {
        source: 'terrain',
        exaggeration: 1.5
      }
    });

    // Ajouter la source de terrain
    map.current.on('load', () => {
      if (!map.current) return;

      map.current.addSource('terrain', {
        type: 'raster-dem',
        url: 'https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=' + MAPTILER_KEY,
      });

      // Ajouter une couche d'ombrage pour le relief
      map.current.addLayer({
        id: 'hillshading',
        source: 'terrain',
        type: 'hillshade',
        paint: {
          'hillshade-shadow-color': '#000000',
          'hillshade-illumination-anchor': 'viewport',
          'hillshade-exaggeration': 0.5
        }
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [clubCoordinates]);

  // Mettre à jour les marqueurs
  useEffect(() => {
    if (!map.current || !weatherData) return;

    // Supprimer les anciens marqueurs
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Ajouter les marqueurs pour chaque station
    weatherData.forEach((station) => {
      const markerElement = document.createElement('div');
      markerElement.className = 'weather-marker';

      // Déterminer les conditions de vol
      let flightCondition = 'VFR';
      let color = 'green';
      const visibilityNum = parseVisibility(station.visib);
      const lowestCeiling = station.clouds?.find(cloud => 
        ['BKN', 'OVC'].includes(cloud.cover.toUpperCase())
      )?.base || null;

      // Si la visibilité est ">6km", c'est automatiquement VFR pour la visibilité
      if (station.visib === '>6km' || station.visib === '6+') {
        if (lowestCeiling !== null) {
          if (lowestCeiling < weatherSettings.marginal_ceiling) {
            flightCondition = 'IFR';
            color = 'red';
          } else if (lowestCeiling < weatherSettings.visual_ceiling) {
            flightCondition = 'MVFR';
            color = 'blue';
          }
        }
      } else {
        const isIFR = (
          (visibilityNum !== null && visibilityNum * 1000 < weatherSettings.marginal_visibility) ||
          (lowestCeiling !== null && lowestCeiling < weatherSettings.marginal_ceiling)
        );

        const isMVFR = (
          (visibilityNum !== null && 
            visibilityNum * 1000 < weatherSettings.visual_visibility && 
            visibilityNum * 1000 >= weatherSettings.marginal_visibility) ||
          (lowestCeiling !== null && 
            lowestCeiling < weatherSettings.visual_ceiling && 
            lowestCeiling >= weatherSettings.marginal_ceiling)
        );

        if (isIFR) {
          color = 'red';
          flightCondition = 'IFR';
        } else if (isMVFR) {
          color = 'blue';
          flightCondition = 'MVFR';
        }
      }

      // Formater la visibilité pour l'affichage
      const formatVisibility = (visib: number | string | null): string => {
        if (visib === null) return 'N/A';
        if (visib === '6+') return '>6km';
        const numVisib = parseVisibility(visib);
        if (!numVisib) return 'N/A';
        if (numVisib < 1) {
          return `${Math.round(numVisib * 1000)}m`;
        }
        return `${numVisib}km`;
      };

      markerElement.innerHTML = `
        <div class="relative group">
          <div class="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center cursor-pointer border-2 border-${color}-500">
            <div class="text-sm font-bold text-${color}-500">${flightCondition}</div>
          </div>
          <div class="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-white rounded-lg shadow-lg p-4 w-48 z-10">
            <div class="text-sm text-gray-600 mb-2">${station.name?.split(',')[0] || station.icaoId}</div>
            <div class="space-y-1">
              ${station.temp !== null ? `<div class="text-sm">Température: ${station.temp}°C</div>` : ''}
              ${visibilityNum !== null ? `<div class="text-sm">Visibilité: ${formatVisibility(station.visib)}</div>` : ''}
              ${station.clouds?.length && lowestCeiling !== null ? `
                <div class="text-sm">Plafond: ${station.clouds.map(cloud => `${cloud.cover} ${cloud.base}ft`).join(', ')}</div>
              ` : ''}
              ${station.wind ? `
                <div class="text-sm">Vent: ${station.wind.dir}° ${station.wind.speed}kt${station.wind.gust ? ` (rafales ${station.wind.gust}kt)` : ''}</div>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      const marker = new maptilersdk.Marker({
        element: markerElement,
        anchor: 'bottom'
      })
        .setLngLat([station.lon, station.lat])
        .addTo(map.current);

      markersRef.current.push(marker);
    });
  }, [weatherData, weatherSettings]);

  return (
    <div ref={mapContainer} className="w-full h-full">
      <style jsx>{`
        .weather-marker {
          cursor: pointer;
        }
        .weather-marker:hover {
          z-index: 10;
        }
      `}</style>
    </div>
  );
};

export default WeatherMap;
