import React, { useState, useEffect } from 'react';
import { BarChart, PieChart, LineChart } from './charts';
import { Clock, Calendar, Plane, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, subMonths, startOfYear, endOfYear, subYears, differenceInDays, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRangeSelector } from '../common/DateRangeSelector';
import { getFlightTypes } from '../../lib/queries/flightTypes';
import type { FlightType } from '../../types/database';

const StatsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: startOfYear(new Date()),
    endDate: endOfYear(new Date())
  });
  const [stats, setStats] = useState<any>({
    flightsByAircraft: [],
    flightsByInstructor: [],
    flightsByType: [],
    monthlyComparison: [],
    flightsWithInstructor: []
  });

  // Calcul de la période de comparaison
  const getPreviousYearDates = (start: Date, end: Date) => {
    // Si c'est l'année en cours (du 1er janvier à aujourd'hui)
    if (isSameDay(start, startOfYear(new Date()))) {
      return {
        previousStart: startOfYear(subYears(new Date(), 1)),
        previousEnd: subYears(new Date(), 1)
      };
    }
    // Sinon, on garde la logique normale de comparaison période à période
    const diffInDays = differenceInDays(end, start);
    const previousStart = subYears(start, 1);
    const previousEnd = addDays(previousStart, diffInDays);
    return { previousStart, previousEnd };
  };

  const loadMonthlyComparison = async () => {
    try {
      const currentDate = new Date();
      const threeYearsAgo = startOfYear(subYears(currentDate, 2));
      
      const { data: monthlyComparison } = await supabase.rpc('get_monthly_flight_hours', {
        start_date: threeYearsAgo.toISOString(),
        end_date: currentDate.toISOString()
      });

      return monthlyComparison || [];
    } catch (err) {
      console.error('Error loading monthly comparison:', err);
      return [];
    }
  };

  useEffect(() => {
    const loadFlightTypes = async () => {
      try {
        const types = await getFlightTypes();
        setFlightTypes(types);
      } catch (err) {
        console.error('Error loading flight types:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue lors du chargement des types de vol');
      }
    };

    loadFlightTypes();
  }, []);

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Get flights by aircraft
      const { data: flightsByAircraft } = await supabase.rpc('get_flights_by_aircraft', {
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString()
      });

      let combinedFlightsByAircraft = flightsByAircraft?.map(flight => ({
        ...flight,
        year: 'Période actuelle',
      })) || [];

      // Charger les données de la période précédente
      const { previousStart, previousEnd } = getPreviousYearDates(dateRange.startDate, dateRange.endDate);
      
      const { data: previousPeriodFlights } = await supabase.rpc('get_flights_by_aircraft', {
        start_date: previousStart.toISOString(),
        end_date: previousEnd.toISOString()
      });

      if (previousPeriodFlights) {
        const previousPeriodData = previousPeriodFlights.map(flight => ({
          ...flight,
          year: 'Période précédente',
        }));
        combinedFlightsByAircraft = [...combinedFlightsByAircraft, ...previousPeriodData];
      }

      // Get flights by instructor
      const { data: flightsByInstructor } = await supabase.rpc('get_flights_by_instructor', {
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString()
      });

      // Get flights by type
      const { data: flightsByType } = await supabase.rpc('get_flights_by_type', {
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString()
      });

      // Get flights with/without instructor
      const { data: flightsWithInstructor } = await supabase.rpc('get_flights_with_instructor', {
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString()
      });

      // Transformer les données pour combiner le type de vol et la présence d'un instructeur
      const transformedFlightsWithInstructor = (flightsWithInstructor || [])
        .sort((a, b) => {
          // D'abord trier par mois
          if (a.month !== b.month) {
            return a.month.localeCompare(b.month);
          }
          // Ensuite par présence d'instructeur (avec instructeur en premier)
          if (a.has_instructor !== b.has_instructor) {
            return a.has_instructor === "Avec instructeur" ? -1 : 1;
          }
          // Enfin par display_order
          return a.display_order - b.display_order;
        })
        .map(flight => ({
          ...flight,
          combined_type: `${flight.has_instructor} - ${flight.flight_type_code}`,
          // Ajouter une clé pour le tri dans le graphique
          sort_key: `${flight.has_instructor === "Avec instructeur" ? "A" : "B"}-${flight.display_order.toString().padStart(3, '0')}-${flight.flight_type_code}`
        }));

      // Get monthly comparison (toujours sur 3 ans)
      const monthlyComparison = await loadMonthlyComparison();

      setStats({
        flightsByAircraft: combinedFlightsByAircraft,
        flightsByInstructor,
        flightsByType,
        monthlyComparison,
        flightsWithInstructor: transformedFlightsWithInstructor
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  // Génération des couleurs pour les types de vol
  const getTypeColors = () => {
    const colors: Record<string, string> = {};
    
    flightTypes.forEach((type, index) => {
      // Calculer la teinte de bleu pour "avec instructeur"
      const blueHue = 220; // Bleu
      const blueSaturation = 84;
      const blueLightness = Math.max(30, 70 - (index * 8)); // Plus foncé pour les premiers types
      
      // Calculer la teinte de vert pour "sans instructeur"
      const greenHue = 142; // Vert
      const greenSaturation = 84;
      const greenLightness = Math.max(30, 70 - (index * 8));

      colors[`Avec instructeur - ${type.code}`] = `hsl(${blueHue}, ${blueSaturation}%, ${blueLightness}%)`;
      colors[`Sans instructeur - ${type.code}`] = `hsl(${greenHue}, ${greenSaturation}%, ${greenLightness}%)`;
    });

    return colors;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-slate-200 rounded-xl"></div>
            <div className="h-96 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const isCurrentYear = 
    dateRange.startDate.getTime() === startOfYear(new Date()).getTime() &&
    dateRange.endDate.getTime() === endOfYear(new Date()).getTime();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Statistiques</h1>
        <h2 className="text-lg text-gray-600 mb-4">
          Du {format(dateRange.startDate, 'dd MMMM yyyy', { locale: fr })} au {format(dateRange.endDate, 'dd MMMM yyyy', { locale: fr })}
        </h2>
        <p className="text-slate-600">Analyse détaillée de l'activité du club</p>
        <DateRangeSelector
          onChange={(range) => setDateRange(range)}
          initialRange={dateRange}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plane className="h-5 w-5 text-slate-600" />
            Heures de vol par appareil
            {dateRange && (
              <span className="block text-sm font-normal text-gray-500">
                Comparaison avec la période<br />du {format(getPreviousYearDates(dateRange.startDate, dateRange.endDate).previousStart, 'dd/MM/yyyy', { locale: fr })} au {format(getPreviousYearDates(dateRange.startDate, dateRange.endDate).previousEnd, 'dd/MM/yyyy', { locale: fr })}
              </span>
            )}
          </h2>
          <BarChart
            data={stats.flightsByAircraft}
            xKey="registration"
            yKey="total_hours"
            compareKey="year"
            colors={{
              'Période actuelle': '#3b82f6',
              'Période précédente': '#93c5fd'
            }}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            Heures de vol par instructeur
          </h2>
          <BarChart
            data={stats.flightsByInstructor}
            xKey="instructor_name"
            yKey="total_hours"
            color="#8b5cf6"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            Types de vol avec/sans instructeur
          </h2>
          <BarChart
            data={stats.flightsWithInstructor}
            xKey="month"
            yKey="total_hours"
            compareKey="combined_type"
            sortKey="sort_key"
            stacked={true}
            colors={getTypeColors()}
          />
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium mb-2">Avec instructeur</div>
              <div className="space-y-2">
                {flightTypes
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((type) => (
                    <div key={`with-${type.id}`} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getTypeColors()[`Avec instructeur - ${type.code}`] }}
                      />
                      <span>{type.name}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">Sans instructeur</div>
              <div className="space-y-2">
                {flightTypes
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((type) => (
                    <div key={`without-${type.id}`} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getTypeColors()[`Sans instructeur - ${type.code}`] }}
                      />
                      <span>{type.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-600" />
            Répartition des types de vol
          </h2>
          <PieChart
            data={stats.flightsByType}
            nameKey="type_name"
            valueKey="total_hours"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-600" />
            Comparaison mensuelle
          </h2>
          <div className="mb-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              <span>{new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              <span>{new Date().getFullYear() - 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-300"></div>
              <span>{new Date().getFullYear() - 2}</span>
            </div>
          </div>
          <LineChart
            data={stats.monthlyComparison}
            xKey="month"
            yKey="total_hours"
            compareKey="year"
            colors={{
              [new Date().getFullYear()]: '#2563eb', 
              [new Date().getFullYear() - 1]: '#60a5fa', 
              [new Date().getFullYear() - 2]: '#93c5fd', 
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default StatsPage;