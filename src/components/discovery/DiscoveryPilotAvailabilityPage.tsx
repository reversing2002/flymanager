import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AvailabilityCalendar from '../availability/AvailabilityCalendar';
import { AlertTriangle } from 'lucide-react';

const DiscoveryPilotAvailabilityPage = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>Erreur lors du chargement des données du pilote</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Mes disponibilités
        </h1>
        <p className="text-slate-600">
          Gérez vos disponibilités pour les vols découverte
        </p>
      </div>

      <AvailabilityCalendar userId={user.id} />
    </div>
  );
};

export default DiscoveryPilotAvailabilityPage;
