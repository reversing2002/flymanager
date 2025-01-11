import React, { useState, useEffect } from 'react';
import { Wind, ArrowUp } from "lucide-react";
import { useUser } from '@/hooks/useUser';
import { Card, CardContent } from "@/components/ui/card";

interface WindData {
  time: string;
  speed: string;
  direction: number;
}

const MiniWindWidget: React.FC = () => {
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
        
        if (Array.isArray(data) && data.length > 0) {
          setLatestWind(data[data.length - 1]);
          setError(null);
        } else {
          setError('Aucune donnée');
        }
      } catch (error) {
        console.error('Erreur données vent:', error);
        setError('Erreur données');
      }
    };

    if (user?.club?.id) {
      fetchData();
      const interval = setInterval(fetchData, 360000); // 6 minutes
      return () => clearInterval(interval);
    }
  }, [user?.club?.id]);

  const WindArrow: React.FC<{ direction: number }> = ({ direction }) => {
    const rotation = `rotate(${(direction + 180) % 360}deg)`;
    return (
      <ArrowUp
        size={20}
        style={{ transform: rotation }}
        className="text-blue-500"
      />
    );
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center space-x-2">
          <Wind className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-500">Vent</span>
        </div>
        {error ? (
          <div className="mt-2 text-sm text-gray-500">{error}</div>
        ) : latestWind ? (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">{latestWind.speed}</span>
              <span className="text-sm text-gray-500">km/h</span>
            </div>
            <WindArrow direction={latestWind.direction} />
          </div>
        ) : (
          <div className="mt-2 text-sm text-gray-500">Chargement...</div>
        )}
      </CardContent>
    </Card>
  );
};

export default MiniWindWidget;
