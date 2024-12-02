import React, { useState } from 'react';
import { Plane, Calendar } from 'lucide-react';
import DiscoveryFlightList from './DiscoveryFlightList';
import PilotAvailabilityCalendar from './PilotAvailabilityCalendar';

const DiscoveryFlightPage = () => {
  const [activeTab, setActiveTab] = useState<'flights' | 'availability'>('flights');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Vols découverte</h1>
        <p className="text-slate-600">Gérez vos vols découverte et disponibilités</p>
      </div>

      <div className="mb-6">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('flights')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'flights'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
              `}
            >
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                <span>Vols à venir</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('availability')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'availability'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
              `}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>Mes disponibilités</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'flights' ? (
        <DiscoveryFlightList />
      ) : (
        <PilotAvailabilityCalendar />
      )}
    </div>
  );
};

export default DiscoveryFlightPage;