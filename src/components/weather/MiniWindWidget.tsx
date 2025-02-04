import React, { useState, useEffect } from 'react';
import { Wind, ArrowUp, Loader2 } from "lucide-react";
import { useUser } from '@/hooks/useUser';
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WindData {
  time: string;
  speed: string;
  direction: number;
}

const MiniWindWidget: React.FC = () => {
  const [latestWind, setLatestWind] = useState<WindData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.club?.id) {
        setError('Aucun club sélectionné');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(import.meta.env.VITE_API_URL + `/api/meteo/wind-data/${user.club.id}`);
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
        setError('Pour visualiser le vent en direct, l\'administrateur doit choisir une station meteo dans les paramètres');
      } finally {
        setLoading(false);
      }
    };

    if (user?.club?.id) {
      fetchData();
      const interval = setInterval(fetchData, 360000); // 6 minutes
      return () => clearInterval(interval);
    }
  }, [user?.club?.id]);

  const getWindDirection = (angle: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    const index = Math.round(((angle % 360) / 22.5));
    return directions[index % 16];
  };

  const WindArrow: React.FC<{ direction: number }> = ({ direction }) => {
    const rotation = `rotate(${(direction + 180) % 360}deg)`;
    return (
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: (direction + 180) % 360 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <ArrowUp
          size={24}
          className="text-blue-600"
        />
      </motion.div>
    );
  };

  return (
    <Card className="w-full bg-white shadow-sm transition-all duration-200 hover:shadow-lg">
      <CardContent className="pt-4 px-6 pb-6">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4 pt-4">
            <div className="flex items-center gap-2">
              <Wind className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-slate-700">Vent en direct</h4>
            </div>
            {user?.club?.wind_station_name && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <p className="text-sm text-slate-700 truncate max-w-[150px]">
                      {user.club.wind_station_name}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Station météo: {user.club.wind_station_name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-4"
              >
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </motion.div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-red-600 py-2 font-medium"
              >
                {error}
              </motion.div>
            ) : latestWind ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-2 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <WindArrow direction={latestWind.direction} />
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-700">
                        {latestWind.speed}
                      </span>
                      <span className="text-sm text-slate-700">
                        km/h
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-700">
                      {getWindDirection(latestWind.direction)}
                    </span>
                    <span className="text-xs text-slate-700 ml-1">
                      ({Math.round(latestWind.direction)}°)
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default MiniWindWidget;
