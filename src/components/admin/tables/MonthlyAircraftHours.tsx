import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../../lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface MonthlyHours {
  aircraft_id: string;
  aircraft_registration: string;
  month: string;
  total_hours: number;
}

const MonthlyAircraftHours = () => {
  const currentDate = new Date();
  const startDate = startOfYear(currentDate);
  const endDate = endOfYear(currentDate);

  const { data: flightHours, isLoading } = useQuery({
    queryKey: ['monthlyAircraftHours', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_aircraft_hours', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      if (error) throw error;
      return data as MonthlyHours[];
    },
  });

  if (isLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  // Organiser les données par avion et par mois
  const aircraftMap = new Map<string, { registration: string; monthlyHours: Map<string, number> }>();
  
  flightHours?.forEach((entry) => {
    if (!aircraftMap.has(entry.aircraft_id)) {
      aircraftMap.set(entry.aircraft_id, {
        registration: entry.aircraft_registration,
        monthlyHours: new Map(),
      });
    }
    
    const monthKey = format(new Date(entry.month), 'MMM yyyy', { locale: fr });
    aircraftMap.get(entry.aircraft_id)!.monthlyHours.set(monthKey, entry.total_hours);
  });

  // Obtenir la liste unique des mois
  const months = Array.from(
    new Set(
      flightHours?.map((entry) => entry.month)
    )
  )
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .map(month => format(new Date(month), 'MMM yyyy', { locale: fr }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Heures de vol par avion</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avion</TableHead>
                {months.map((month) => (
                  <TableHead key={month} className="text-right">
                    {month}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(aircraftMap.entries()).map(([aircraftId, data]) => {
                const totalHours = Array.from(data.monthlyHours.values()).reduce(
                  (sum, hours) => sum + hours,
                  0
                );
                
                return (
                  <TableRow key={aircraftId}>
                    <TableCell className="font-medium">
                      {data.registration}
                    </TableCell>
                    {months.map((month) => (
                      <TableCell key={month} className="text-right">
                        {data.monthlyHours.get(month)?.toFixed(1) || '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium">
                      {totalHours.toFixed(1)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyAircraftHours;
