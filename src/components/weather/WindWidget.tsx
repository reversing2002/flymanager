import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUp, Wind, Clock, ArrowUpCircle, ArrowDownCircle, TrendingUp } from "lucide-react";
import { useUser } from '@/hooks/useUser';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WindData {
  time: string;
  speed: number;
  direction: number;
  timestamp: string;
}

const WindWidget: React.FC = () => {
  const [windData, setWindData] = useState<WindData[]>([]);
  const [latestWind, setLatestWind] = useState<WindData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const formatWindDirection = (direction: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    const index = Math.round(((direction + 11.25) % 360) / 22.5);
    return directions[index];
  };

  const getWindColor = (speed: number): string => {
    if (speed < 5) return 'text-green-500';
    if (speed < 15) return 'text-yellow-500';
    if (speed < 25) return 'text-orange-500';
    return 'text-red-500';
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.club?.id) {
        setError('Aucun club sélectionné');
        return;
      }

      try {
        const response = await fetch(`https://stripe.linked.fr/api/meteo/wind-data/${user.club.id}`);
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          // Trier les données par timestamp
          const sortedData = data.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setWindData(sortedData);
          setLatestWind(sortedData[sortedData.length - 1]);
          setError(null);
        } else {
          setError('Aucune donnée de vent disponible');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données de vent:', error);
        setError('Échec de la récupération des données. Veuillez réessayer plus tard.');
      }
    };

    if (user?.club?.id) {
      fetchData();
      const interval = setInterval(fetchData, 360000); // Récupération toutes les 6 minutes
      return () => clearInterval(interval);
    }
  }, [user?.club?.id]);

  const formatXAxis = (timestamp: string) => {
    return format(parseISO(timestamp), 'HH:mm', { locale: fr });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="text-sm">
            {format(parseISO(label), 'HH:mm', { locale: fr })}
          </p>
          <p className="text-sm">
            Vitesse: {payload[0].value} km/h
          </p>
          <p className="text-sm">
            Direction: {formatWindDirection(payload[1].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wind className="h-6 w-6" />
          Données Vent
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : latestWind ? (
          <div className="space-y-6">
            {/* Dernière mesure */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <div>
                  <p className="text-sm text-gray-500">Vitesse</p>
                  <p className={`text-2xl font-bold ${getWindColor(latestWind.speed)}`}>
                    {latestWind.speed} km/h
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <ArrowUp 
                  className="h-5 w-5" 
                  style={{ 
                    transform: `rotate(${(latestWind.direction + 180) % 360}deg)`,
                    transition: 'transform 0.3s ease-in-out'
                  }}
                />
                <div>
                  <p className="text-sm text-gray-500">Direction</p>
                  <p className="text-2xl font-bold">
                    {formatWindDirection(latestWind.direction)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <div>
                  <p className="text-sm text-gray-500">Dernière mise à jour</p>
                  <p className="text-2xl font-bold">
                    {format(parseISO(latestWind.timestamp), 'HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            </div>

            {/* Graphique d'évolution */}
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={windData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatXAxis}
                    interval="preserveStartEnd"
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="speed"
                    name="Vitesse (km/h)"
                    stroke="#2563eb"
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="direction"
                    name="Direction (°)"
                    stroke="#dc2626"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Chargement des données...</div>
        )}
      </CardContent>
    </Card>
  );
};

export default WindWidget;
