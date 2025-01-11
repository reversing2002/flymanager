import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  startOfYear,
  endOfYear,
  subYears,
  format,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Tab,
  Tabs,
  Box,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Flight, Aircraft, FlightType } from '../../types/database';
import { DateRangeFilter, type DateRange } from '../common/DateRangeFilter';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stats-tabpanel-${index}`}
      aria-labelledby={`stats-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface MonthlyStats {
  month: Date;
  totalHours: number;
  withInstructorHours: number;
  asInstructorHours: number;
}

interface TypeStats {
  type: string;
  hours: number;
}

interface AircraftStats {
  registration: string;
  hours: number;
}

interface AircraftTypeStats {
  type: string;
  hours: number;
}

const PilotStatsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [tabValue, setTabValue] = React.useState(0);
  const currentDate = new Date();
  const [dateRange, setDateRange] = React.useState<DateRange>({
    startDate: subMonths(startOfMonth(currentDate), 11),
    endDate: endOfMonth(currentDate),
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Récupérer tous les vols pour la période sélectionnée
  const { data: flights, isLoading: loadingFlights } = useQuery({
    queryKey: ['pilotDetailedStats', id, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('flights')
        .select(`
          *,
          flight_type:flight_type_id(*),
          aircraft:aircraft_id(*)
        `)
        .or(`user_id.eq.${id},instructor_id.eq.${id}`)
        .gte('date', dateRange.startDate.toISOString())
        .lte('date', dateRange.endDate.toISOString());
      return data || [];
    }
  });

  // Calculer les statistiques mensuelles
  const monthlyStats: MonthlyStats[] = React.useMemo(() => {
    if (!flights) return [];

    const months = eachMonthOfInterval({
      start: dateRange.startDate,
      end: dateRange.endDate,
    });

    return months.map(month => {
      const monthFlights = flights.filter(
        flight => {
          const flightDate = new Date(flight.date);
          return flightDate >= startOfMonth(month) && flightDate <= endOfMonth(month);
        }
      );

      return {
        month,
        totalHours: monthFlights.reduce((acc, flight) => acc + flight.duration / 60, 0),
        withInstructorHours: monthFlights.reduce((acc, flight) => 
          flight.instructor_id && flight.user_id === id ? acc + flight.duration / 60 : acc, 0),
        asInstructorHours: monthFlights.reduce((acc, flight) => 
          flight.instructor_id === id ? acc + flight.duration / 60 : acc, 0),
      };
    });
  }, [flights, id, dateRange]);

  // Calculer les statistiques par type de vol
  const flightTypeStats: TypeStats[] = React.useMemo(() => {
    if (!flights) return [];

    const stats = new Map<string, number>();
    flights.forEach(flight => {
      const typeName = flight.flight_type?.name || 'Inconnu';
      const hours = flight.duration / 60;
      stats.set(typeName, (stats.get(typeName) || 0) + hours);
    });

    return Array.from(stats.entries()).map(([type, hours]) => ({
      type,
      hours,
    }));
  }, [flights]);

  // Calculer les statistiques par avion
  const aircraftStats: AircraftStats[] = React.useMemo(() => {
    if (!flights) return [];

    const stats = new Map<string, number>();
    flights.forEach(flight => {
      const registration = flight.aircraft?.registration || 'Inconnu';
      const hours = flight.duration / 60;
      stats.set(registration, (stats.get(registration) || 0) + hours);
    });

    return Array.from(stats.entries()).map(([registration, hours]) => ({
      registration,
      hours,
    }));
  }, [flights]);

  // Calculer les statistiques par type d'appareil
  const aircraftTypeStats: AircraftTypeStats[] = React.useMemo(() => {
    if (!flights) return [];

    const stats = new Map<string, number>();
    flights.forEach(flight => {
      const aircraftType = flight.aircraft?.type || 'Inconnu';
      const hours = flight.duration / 60;
      stats.set(aircraftType, (stats.get(aircraftType) || 0) + hours);
    });

    return Array.from(stats.entries())
      .map(([type, hours]) => ({
        type,
        hours,
      }))
      .sort((a, b) => b.hours - a.hours); // Trier par nombre d'heures décroissant
  }, [flights]);

  const formatHours = (hours: number) => {
    return Math.round(hours * 100) / 100;
  };

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  if (loadingFlights) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const monthlyChartData = {
    labels: monthlyStats.map(stat => format(stat.month, 'MMM yyyy', { locale: fr })),
    datasets: [
      {
        label: 'Total',
        data: monthlyStats.map(stat => formatHours(stat.totalHours)),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
      {
        label: 'Avec instructeur',
        data: monthlyStats.map(stat => formatHours(stat.withInstructorHours)),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
      },
      {
        label: 'En tant qu\'instructeur',
        data: monthlyStats.map(stat => formatHours(stat.asInstructorHours)),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.5)',
      },
    ],
  };

  const typeChartData = {
    labels: flightTypeStats.map(stat => stat.type),
    datasets: [
      {
        data: flightTypeStats.map(stat => formatHours(stat.hours)),
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(34, 197, 94, 0.5)',
          'rgba(249, 115, 22, 0.5)',
          'rgba(168, 85, 247, 0.5)',
          'rgba(236, 72, 153, 0.5)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(249, 115, 22)',
          'rgb(168, 85, 247)',
          'rgb(236, 72, 153)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const aircraftChartData = {
    labels: aircraftStats.map(stat => stat.registration),
    datasets: [
      {
        data: aircraftStats.map(stat => formatHours(stat.hours)),
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(34, 197, 94, 0.5)',
          'rgba(249, 115, 22, 0.5)',
          'rgba(168, 85, 247, 0.5)',
          'rgba(236, 72, 153, 0.5)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(249, 115, 22)',
          'rgb(168, 85, 247)',
          'rgb(236, 72, 153)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const aircraftTypeChartData = {
    labels: aircraftTypeStats.map(stat => stat.type),
    datasets: [
      {
        data: aircraftTypeStats.map(stat => formatHours(stat.hours)),
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(34, 197, 94, 0.5)',
          'rgba(249, 115, 22, 0.5)',
          'rgba(168, 85, 247, 0.5)',
          'rgba(236, 72, 153, 0.5)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(249, 115, 22)',
          'rgb(168, 85, 247)',
          'rgb(236, 72, 153)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <Typography variant="h5" component="h1" className="text-gray-900">
            Statistiques détaillées
          </Typography>
          <DateRangeFilter
            value={dateRange}
            onChange={handleDateRangeChange}
            className="ml-4"
          />
        </div>

        <Tabs value={tabValue} onChange={handleTabChange} className="border-b border-gray-200">
          <Tab label="Évolution mensuelle" />
          <Tab label="Par type de vol" />
          <Tab label="Par appareil" />
          <Tab label="Par type d'appareil" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <div className="h-[400px]">
            <Line
              data={monthlyChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: true,
                    text: 'Évolution des heures de vol',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Heures',
                    },
                  },
                },
              }}
            />
          </div>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <div className="h-[400px]">
                <Pie
                  data={typeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right' as const,
                      },
                      title: {
                        display: true,
                        text: 'Répartition par type de vol',
                      },
                    },
                  }}
                />
              </div>
            </Grid>
            <Grid item xs={12} md={6}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type de vol
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heures
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {flightTypeStats.map((stat, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stat.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatHours(stat.hours)}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <div className="h-[400px]">
                <Pie
                  data={aircraftChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right' as const,
                      },
                      title: {
                        display: true,
                        text: 'Répartition par appareil',
                      },
                    },
                  }}
                />
              </div>
            </Grid>
            <Grid item xs={12} md={6}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Immatriculation
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heures
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {aircraftStats.map((stat, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stat.registration}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatHours(stat.hours)}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <div className="h-[400px]">
                <Pie
                  data={aircraftTypeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right' as const,
                      },
                      title: {
                        display: true,
                        text: 'Répartition par type d\'appareil',
                      },
                    },
                  }}
                />
              </div>
            </Grid>
            <Grid item xs={12} md={6}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type d'appareil
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heures
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {aircraftTypeStats.map((stat, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stat.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatHours(stat.hours)}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Grid>
          </Grid>
        </TabPanel>
      </div>
    </div>
  );
};

export default PilotStatsPage;
