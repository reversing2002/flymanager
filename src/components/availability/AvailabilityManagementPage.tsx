import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Plane, Users, Filter, Search } from 'lucide-react';
import { getAircraft } from '../../lib/queries/aircraft';
import { getUsers } from '../../lib/queries/users';
import { hasAnyGroup } from '../../lib/permissions';
import { useAuth } from '../../contexts/AuthContext';
import AvailabilityCalendar from './AvailabilityCalendar';

const AvailabilityManagementPage = () => {
  const { user } = useAuth();
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: aircraft = [], isLoading: loadingAircraft } = useQuery({
    queryKey: ['aircraft'],
    queryFn: getAircraft
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });

  const instructors = users.filter(u => hasAnyGroup(u, ['INSTRUCTOR']));

  const filteredAircraft = aircraft.filter(a => 
    searchQuery === '' || 
    a.registration.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInstructors = instructors.filter(i =>
    searchQuery === '' ||
    `${i.first_name} ${i.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestion des disponibilités</h1>
        <p className="text-slate-600">Gérez les disponibilités des instructeurs et des appareils</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un instructeur ou un appareil..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filtres</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Instructeur
                </label>
                <select
                  value={selectedInstructorId || ''}
                  onChange={(e) => setSelectedInstructorId(e.target.value || null)}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                >
                  <option value="">Tous les instructeurs</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.first_name} {instructor.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Appareil
                </label>
                <select
                  value={selectedAircraftId || ''}
                  onChange={(e) => setSelectedAircraftId(e.target.value || null)}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                >
                  <option value="">Tous les appareils</option>
                  {aircraft.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.registration} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedInstructorId && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600" />
              <span>Disponibilités instructeur</span>
            </h2>
            <AvailabilityCalendar userId={selectedInstructorId} />
          </div>
        )}

        {selectedAircraftId && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plane className="h-5 w-5 text-slate-600" />
              <span>Disponibilités appareil</span>
            </h2>
            <AvailabilityCalendar aircraftId={selectedAircraftId} />
          </div>
        )}

        {!selectedInstructorId && !selectedAircraftId && (
          <div className="lg:col-span-2">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Sélectionnez un instructeur ou un appareil
              </h3>
              <p className="text-slate-600">
                Utilisez les filtres ci-dessus pour afficher les disponibilités
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityManagementPage;
