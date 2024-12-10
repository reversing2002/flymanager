import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAircraftById } from '../../lib/queries/aircraft';
import AvailabilityCalendar from './AvailabilityCalendar';
import { AlertTriangle } from 'lucide-react';

const AircraftAvailabilityPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: aircraft, isLoading, error } = useQuery({
    queryKey: ['aircraft', id],
    queryFn: () => getAircraftById(id!),
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-[600px] bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !aircraft) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>Erreur lors du chargement des données de l'appareil</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Disponibilités - { aircraft.registration}
        </h1>
        <p className="text-slate-600">
          Gérez les disponibilités de l'appareil
        </p>
      </div>

      <AvailabilityCalendar aircraftId={aircraft.id} />
    </div>
  );
};

export default AircraftAvailabilityPage;