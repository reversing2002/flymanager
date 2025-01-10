import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUp, Wind, Clock, ArrowUpCircle, ArrowDownCircle, TrendingUp } from "lucide-react";
import { useUser } from '@/hooks/useUser';

interface WindData {
  time: string;
  speed: string;
  direction: number;
}

const WindWidget: React.FC = () => {
  const [windData, setWindData] = useState<WindData[]>([]);
  const [latestWind, setLatestWind] = useState<WindData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

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
        console.log('Données de vent reçues:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          setWindData(data);
          setLatestWind(data[data.length - 1]);
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

  const WindArrow: React.FC<{ direction: number }> = ({ direction }) => {
    const invertedDirection = (direction + 180) % 360;
    const rotation = `rotate(${invertedDirection}deg)`;
    return (
      <div className="flex items-center justify-center h-24 w-24 bg-blue-100 rounded-full">
        <ArrowUp
          size={48}
          style={{ transform: rotation }}
          className="text-blue-500"
        />
      </div>
    );
  };

  const getWindColor = (speed: number) => {
    if (speed < 10) return '#22c55e';  // Vent faible : Vert
    if (speed < 20) return '#eab308';  // Vent modéré : Jaune
    if (speed < 30) return '#f97316';  // Vent fort : Orange
    return '#ef4444';  // Vent très fort : Rouge
  };

  const CustomizedDot: React.FC<any> = (props) => {
    const { cx, cy, payload } = props;
    const speed = parseFloat(payload.speed);
    const direction = payload.direction;
    const color = getWindColor(speed);
    const size = Math.max(4, Math.min(20, speed));

    return (
      <g transform={`translate(${cx},${cy})`}>
        <circle r={size / 2} fill={color} />
        <path
          d={`M0,0 L0,-${size}`}
          stroke="black"
          strokeWidth="2"
          transform={`rotate(${direction})`}
        />
      </g>
    );
  };

  const CustomTooltip: React.FC<any> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow">
          <p>Heure: {new Date(data.time).toLocaleString()}</p>
          <p>Vitesse: {data.speed} km/h</p>
          <p>Direction: {data.direction}°</p>
        </div>
      );
    }
    return null;
  };

  const WindLegend: React.FC = () => (
    <div className="flex flex-wrap gap-4 mt-4">
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
        <span className="text-sm">Faible (&lt;10 km/h)</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
        <span className="text-sm">Modéré (10-20 km/h)</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
        <span className="text-sm">Fort (20-30 km/h)</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
        <span className="text-sm">Très Fort (&gt;30 km/h)</span>
      </div>
    </div>
  );

  if (error) {
    return (
      <Card className="bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const averageSpeed = windData.length > 0
    ? (windData.reduce((sum, data) => sum + parseFloat(data.speed), 0) / windData.length).toFixed(1)
    : 'N/A';

  const maxSpeed = windData.length > 0
    ? Math.max(...windData.map(data => parseFloat(data.speed))).toFixed(1)
    : 'N/A';

  const minSpeed = windData.length > 0
    ? Math.min(...windData.map(data => parseFloat(data.speed))).toFixed(1)
    : 'N/A';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5" /> Vent à Saint-Chamond (LFHG)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {latestWind && (
              <div className="flex items-center justify-around p-4 bg-gray-50 rounded-lg">
                <WindArrow direction={latestWind.direction} />
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{latestWind.speed} km/h</p>
                  <p className="text-lg text-gray-600">{latestWind.direction}°</p>
                </div>
              </div>
            )}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <p className="flex items-center text-gray-600">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                Moyenne: <span className="ml-2 font-semibold">{averageSpeed} km/h</span>
              </p>
              <p className="flex items-center text-gray-600">
                <ArrowUpCircle className="h-5 w-5 mr-2 text-green-500" />
                Maximum: <span className="ml-2 font-semibold">{maxSpeed} km/h</span>
              </p>
              <p className="flex items-center text-gray-600">
                <ArrowDownCircle className="h-5 w-5 mr-2 text-red-500" />
                Minimum: <span className="ml-2 font-semibold">{minSpeed} km/h</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Historique des 3 dernières heures
          </CardTitle>
        </CardHeader>
        <CardContent>
          {windData.length > 0 ? (
            <>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="time"
                      name="Heure"
                      tickFormatter={(time: string) => new Date(time).toLocaleTimeString()}
                      type="category"
                      domain={['dataMin', 'dataMax']}
                      stroke="#64748b"
                    />
                    <YAxis
                      dataKey="speed"
                      name="Vitesse"
                      unit=" km/h"
                      domain={[0, 'dataMax']}
                      stroke="#64748b"
                    />
                    <ZAxis
                      dataKey="direction"
                      name="Direction"
                      unit="°"
                      range={[0, 360]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter name="Données de vent" data={windData} shape={<CustomizedDot />} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <WindLegend />
            </>
          ) : (
            <p className="text-center text-gray-500 py-8">Chargement des données...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WindWidget;
