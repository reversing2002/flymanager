import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import {
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
  format,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, Grid, Typography, Button } from '@mui/material';
import { TrendingUp } from 'lucide-react';
import { Flight } from '../../types/database';

interface PilotFlightStatsProps {
  userId: string;
  isInstructor?: boolean;
}

interface FlightStats {
  totalHours: number;
  instructorHours?: number;
  pilotHours?: number;
  withInstructorHours: number;
}

const PilotFlightStats: React.FC<PilotFlightStatsProps> = ({ userId, isInstructor = false }) => {
  const currentDate = new Date();
  const startCurrentYear = startOfYear(currentDate);
  const endCurrentYear = endOfYear(currentDate);
  const startLastYear = startOfYear(subYears(currentDate, 1));
  const endLastYear = endOfYear(subYears(currentDate, 1));
  const startLast12Months = subMonths(currentDate, 12);

  const calculateHours = (flights: Flight[]): FlightStats => {
    return flights.reduce((acc: FlightStats, flight) => {
      const hours = flight.duration / 60; // Convertir les minutes en heures
      
      if (isInstructor) {
        if (flight.instructor_id === userId) {
          acc.instructorHours = (acc.instructorHours || 0) + hours;
        } else {
          acc.pilotHours = (acc.pilotHours || 0) + hours;
          // Si le vol a un instructeur et que l'utilisateur est le pilote
          if (flight.instructor_id && flight.user_id === userId) {
            acc.withInstructorHours += hours;
          }
        }
      } else {
        // Pour un pilote non instructeur
        if (flight.instructor_id) {
          acc.withInstructorHours += hours;
        }
      }
      
      acc.totalHours = (acc.totalHours || 0) + hours;
      return acc;
    }, { totalHours: 0, instructorHours: 0, pilotHours: 0, withInstructorHours: 0 });
  };

  const { data: currentYearStats, isLoading: loadingCurrentYear } = useQuery({
    queryKey: ['pilotStats', userId, 'currentYear'],
    queryFn: async () => {
      const { data: flights } = await supabase
        .from('flights')
        .select('*')
        .or(`user_id.eq.${userId},instructor_id.eq.${userId}`)
        .gte('date', startCurrentYear.toISOString())
        .lte('date', endCurrentYear.toISOString());
      return calculateHours(flights || []);
    }
  });

  const { data: lastYearStats, isLoading: loadingLastYear } = useQuery({
    queryKey: ['pilotStats', userId, 'lastYear'],
    queryFn: async () => {
      const { data: flights } = await supabase
        .from('flights')
        .select('*')
        .or(`user_id.eq.${userId},instructor_id.eq.${userId}`)
        .gte('date', startLastYear.toISOString())
        .lte('date', endLastYear.toISOString());
      return calculateHours(flights || []);
    }
  });

  const { data: last12MonthsStats, isLoading: loadingLast12Months } = useQuery({
    queryKey: ['pilotStats', userId, 'last12Months'],
    queryFn: async () => {
      const { data: flights } = await supabase
        .from('flights')
        .select('*')
        .or(`user_id.eq.${userId},instructor_id.eq.${userId}`)
        .gte('date', startLast12Months.toISOString())
        .lte('date', currentDate.toISOString());
      return calculateHours(flights || []);
    }
  });

  const formatHours = (hours?: number) => {
    if (hours === undefined || hours === 0) return '0h';
    const roundedHours = Math.round(hours * 100) / 100;
    return `${roundedHours}h`;
  };

  const formatTotalHours = (stats?: FlightStats) => {
    if (!stats) return '0h';
    const total = formatHours(stats.totalHours);
    if (stats.withInstructorHours > 0) {
      return (
        <div>
          {total}
          <div className="text-sm text-gray-500">
            (dont {formatHours(stats.withInstructorHours)} avec instructeur)
          </div>
        </div>
      );
    }
    return total;
  };

  if (loadingCurrentYear || loadingLastYear || loadingLast12Months) {
    return <Typography>Chargement des statistiques...</Typography>;
  }

  return (
    <Card className="mt-4 bg-white rounded-xl shadow-sm">
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Typography variant="h6">
            Statistiques de vol
          </Typography>
          <Link to={`/members/${userId}/stats`} className="no-underline">
            <Button
              variant="outlined"
              size="small"
              startIcon={<TrendingUp className="w-4 h-4" />}
            >
              Statistiques détaillées
            </Button>
          </Link>
        </div>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <div className="p-4 bg-gray-50 rounded-lg">
              <Typography variant="subtitle2" color="textSecondary">
                12 derniers mois
              </Typography>
              <Typography variant="h5" className="mt-1">
                {formatTotalHours(last12MonthsStats)}
              </Typography>
              {isInstructor && (
                <div className="mt-2 text-sm">
                  <div>Pilote: {formatHours(last12MonthsStats?.pilotHours)}</div>
                  <div>Instructeur: {formatHours(last12MonthsStats?.instructorHours)}</div>
                </div>
              )}
            </div>
          </Grid>
          <Grid item xs={12} md={4}>
            <div className="p-4 bg-gray-50 rounded-lg">
              <Typography variant="subtitle2" color="textSecondary">
                Année en cours ({format(currentDate, 'yyyy', { locale: fr })})
              </Typography>
              <Typography variant="h5" className="mt-1">
                {formatTotalHours(currentYearStats)}
              </Typography>
              {isInstructor && (
                <div className="mt-2 text-sm">
                  <div>Pilote: {formatHours(currentYearStats?.pilotHours)}</div>
                  <div>Instructeur: {formatHours(currentYearStats?.instructorHours)}</div>
                </div>
              )}
            </div>
          </Grid>
          <Grid item xs={12} md={4}>
            <div className="p-4 bg-gray-50 rounded-lg">
              <Typography variant="subtitle2" color="textSecondary">
                Année précédente ({format(subYears(currentDate, 1), 'yyyy', { locale: fr })})
              </Typography>
              <Typography variant="h5" className="mt-1">
                {formatTotalHours(lastYearStats)}
              </Typography>
              {isInstructor && (
                <div className="mt-2 text-sm">
                  <div>Pilote: {formatHours(lastYearStats?.pilotHours)}</div>
                  <div>Instructeur: {formatHours(lastYearStats?.instructorHours)}</div>
                </div>
              )}
            </div>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PilotFlightStats;
