import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

interface WeatherStation {
    Id_station: string;
    Id_omm: string;
    Nom_usuel: string;
    Latitude: number;
    Longitude: number;
    Altitude: number;
    Date_ouverture: string;
    Pack: string;
    distance?: number;  // Distance optionnelle en km
}

// Fonction pour calculer la distance entre deux points en km (formule de Haversine)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    console.log('Calcul distance entre:', { lat1, lon1 }, 'et', { lat2, lon2 });
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    console.log('Distance calculée:', distance, 'km');
    return distance;
};

export const useWeatherStations = () => {
    const { user } = useAuth();
    
    const fetchWeatherStations = async (): Promise<WeatherStation[]> => {
        console.log('Club actif:', user?.club);
        const response = await fetch(import.meta.env.VITE_API_URL + '/api/meteo/stations');
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des stations météo');
        }
        const stations: WeatherStation[] = await response.json();
        console.log('Stations reçues:', stations.length);

        // Si le club a des coordonnées, calculer les distances et trier
        if (user?.club?.latitude !== undefined && user?.club?.longitude !== undefined) {
            console.log('Coordonnées du club trouvées:', {
                latitude: user.club.latitude,
                longitude: user.club.longitude
            });
            const stationsWithDistance = stations.map(station => {
                const distance = calculateDistance(
                    user.club.latitude,
                    user.club.longitude,
                    station.Latitude,
                    station.Longitude
                );
                return {
                    ...station,
                    distance
                };
            });
            console.log('Première station avec distance:', stationsWithDistance[0]);
            return stationsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }

        console.log('Pas de coordonnées de club trouvées');
        return stations;
    };

    return useQuery<WeatherStation[], Error>({
        queryKey: ['weatherStations', user?.club?.id],
        queryFn: fetchWeatherStations,
    });
};
