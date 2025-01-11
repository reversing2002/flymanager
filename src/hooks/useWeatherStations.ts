import { useQuery } from '@tanstack/react-query';

interface WeatherStation {
    Id_station: string;
    Id_omm: string;
    Nom_usuel: string;
    Latitude: number;
    Longitude: number;
    Altitude: number;
    Date_ouverture: string;
    Pack: string;
}

const fetchWeatherStations = async (): Promise<WeatherStation[]> => {
    const response = await fetch(import.meta.env.VITE_API_URL + '/api/meteo/stations');
    if (!response.ok) {
        throw new Error('Erreur lors de la récupération des stations météo');
    }
    return response.json();
};

export const useWeatherStations = () => {
    return useQuery<WeatherStation[], Error>({
        queryKey: ['weatherStations'],
        queryFn: fetchWeatherStations,
    });
};
