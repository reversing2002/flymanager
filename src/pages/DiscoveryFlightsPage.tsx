import React from 'react';
import { Plane } from 'lucide-react';
import DiscoveryFlightList from '../components/discovery/DiscoveryFlightList';

const DiscoveryFlightsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Plane className="h-6 w-6 text-sky-500" />
        <h1 className="text-2xl font-bold text-slate-900">Vols découverte</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <DiscoveryFlightList />
      </div>
    </div>
  );
};

export default DiscoveryFlightsPage;
