import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plane, Users, Filter, Search, RefreshCw } from 'lucide-react';
import { getAircraft } from '../../lib/queries/aircraft';
import { getUsers } from '../../lib/queries/users';
import { hasAnyGroup } from '../../lib/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { syncInstructorCalendars } from '../../lib/services/calendarSync';
import AvailabilityCalendar from './AvailabilityCalendar';
import { toast } from 'react-hot-toast';

const AvailabilityManagementPage = () => {
  const { user } = useAuth();
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const isInstructor = user && hasAnyGroup(user, ['INSTRUCTOR']);
  const isAdmin = user && hasAnyGroup(user, ['ADMIN', 'MANAGER']);
  const canEdit = isInstructor || isAdmin;

  // Si l'utilisateur est instructeur mais pas admin, on force son ID
  const effectiveInstructorId = isInstructor && !isAdmin ? user?.id : selectedInstructorId;

  const queryClient = useQueryClient();

  const syncCalendarMutation = useMutation({
    mutationFn: (instructorId: string) => syncInstructorCalendars(instructorId),
    onSuccess: () => {
      queryClient.invalidateQueries(['availabilities']);
      toast.success('Calendriers synchronisés avec succès');
    },
    onError: (error) => {
      console.error('Erreur de synchronisation:', error);
      toast.error('Erreur lors de la synchronisation des calendriers');
    }
  });

  const handleSyncCalendars = async () => {
    if (!effectiveInstructorId) return;
    await syncCalendarMutation.mutateAsync(effectiveInstructorId);
  };

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
        <h1 className="text-2xl font-bold text-slate-900">
          {canEdit ? "Gestion des disponibilités" : "Disponibilités"}
        </h1>
        <p className="text-slate-600">
          {canEdit 
            ? "Gérez les disponibilités des instructeurs et des appareils" 
            : "Consultez les disponibilités des instructeurs et des appareils"}
        </p>
      </div>

      {showFilters && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Filtre des instructeurs */}
            {(isAdmin || !isInstructor) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructeur
                </label>
                <select
                  value={selectedInstructorId || ''}
                  onChange={(e) => setSelectedInstructorId(e.target.value || null)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Tous les instructeurs</option>
                  {filteredInstructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.first_name} {instructor.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtre des avions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Avion
              </label>
              <select
                value={selectedAircraftId || ''}
                onChange={(e) => setSelectedAircraftId(e.target.value || null)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Tous les avions</option>
                {filteredAircraft.map((aircraft) => (
                  <option key={aircraft.id} value={aircraft.id}>
                    {aircraft.registration} - {aircraft.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Barre de recherche */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recherche
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Bouton de synchronisation des calendriers */}
            {effectiveInstructorId && (
              <div className="flex items-end">
                <button
                  onClick={handleSyncCalendars}
                  disabled={syncCalendarMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${syncCalendarMutation.isLoading ? 'animate-spin' : ''}`} />
                  Synchroniser les calendriers
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {effectiveInstructorId && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600" />
              <span>Disponibilités instructeur</span>
            </h2>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <AvailabilityCalendar 
                userId={effectiveInstructorId} 
                hideAddButton={!canEdit}
                readOnly={!canEdit}
              />
            </div>
          </div>
        )}

        {selectedAircraftId && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plane className="h-5 w-5 text-slate-600" />
              <span>Disponibilités appareil</span>
            </h2>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <AvailabilityCalendar 
                aircraftId={selectedAircraftId}
                hideAddButton={!canEdit}
                readOnly={!canEdit}
              />
            </div>
          </div>
        )}

        {!effectiveInstructorId && !selectedAircraftId && (
          <div className="text-center py-12 text-slate-600">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <p className="text-lg font-medium">Sélectionnez un instructeur ou un appareil</p>
            <p className="mt-1">pour voir leurs disponibilités</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityManagementPage;
