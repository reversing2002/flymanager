import React, { useState, useEffect } from 'react';
import { BarChart, PieChart, LineChart } from './charts';
import { Clock, Calendar, Plane, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, subMonths, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';

const StatsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({
    flightsByAircraft: [],
    flightsByInstructor: [],
    flightsByType: [],
    monthlyComparison: [],
    yearlyTotals: []
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const currentDate = new Date();
      const startOfCurrentYear = startOfYear(currentDate);
      const endOfCurrentYear = endOfYear(currentDate);
      const startOfPreviousYear = startOfYear(subMonths(currentDate, 12));

      // Get flights by aircraft
      const { data: flightsByAircraft } = await supabase.rpc('get_flights_by_aircraft', {
        start_date: startOfCurrentYear.toISOString(),
        end_date: endOfCurrentYear.toISOString()
      });

      // Get flights by instructor
      const { data: flightsByInstructor } = await supabase.rpc('get_flights_by_instructor', {
        start_date: startOfCurrentYear.toISOString(),
        end_date: endOfCurrentYear.toISOString()
      });

      // Get flights by type
      const { data: flightsByType } = await supabase.rpc('get_flights_by_type', {
        start_date: startOfCurrentYear.toISOString(),
        end_date: endOfCurrentYear.toISOString()
      });

      // Get monthly comparison
      const { data: monthlyComparison } = await supabase.rpc('get_monthly_flight_hours', {
        start_date: startOfPreviousYear.toISOString(),
        end_date: endOfCurrentYear.toISOString()
      });

      setStats({
        flightsByAircraft: flightsByAircraft || [],
        flightsByInstructor: flightsByInstructor || [],
        flightsByType: flightsByType || [],
        monthlyComparison: monthlyComparison || [],
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Statistiques</h1>
        <p className="text-slate-600">Analyse détaillée de l'activité du club</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plane className="h-5 w-5 text-slate-600" />
            Heures de vol par appareil
          </h2>
          <BarChart
            data={stats.flightsByAircraft}
            xKey="registration"
            yKey="total_hours"
            color="#3b82f6"
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
            <Clock className="h-5 w-5 text-slate-600" />
            Répartition des types de vol
          </h2>
          <PieChart
            data={stats.flightsByType}
            nameKey="type_name"
            valueKey="total_hours"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-600" />
            Comparaison mensuelle
          </h2>
          <LineChart
            data={stats.monthlyComparison}
            xKey="month"
            yKey="total_hours"
            compareKey="year"
          />
        </div>
      </div>
    </div>
  );
};

export default StatsPage;