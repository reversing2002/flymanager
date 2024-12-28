import React from 'react';
import { X } from 'lucide-react';
import type { Aircraft, User } from '../../types/database';
import { hasAnyGroup } from '../../lib/permissions';

export interface FilterState {
  aircraftTypes: string[];
  instructors: string[];
  status: string;
  availability: string;
}

interface FilterPanelProps {
  onClose: () => void;
  onChange: (filters: FilterState) => void;
  aircraft: Aircraft[];
  users: User[];
  filters: FilterState;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ 
  onClose, 
  onChange,
  aircraft,
  users,
  filters 
}) => {
  // Get available aircraft only
  const availableAircraft = aircraft?.filter(a => a.status === "AVAILABLE") || [];
  const instructors = users?.filter(user => hasAnyGroup(user, ["INSTRUCTOR"])) || [];

  const handleAircraftChange = (aircraftId: string, checked: boolean) => {
    const aircraft = availableAircraft.find(a => a.id === aircraftId);
    if (!aircraft) return;

    const newTypes = checked 
      ? [...filters.aircraftTypes, aircraftId]
      : filters.aircraftTypes.filter(t => t !== aircraftId);
    onChange({ ...filters, aircraftTypes: newTypes });
  };

  const handleInstructorChange = (instructorId: string, checked: boolean) => {
    const newInstructors = checked
      ? [...filters.instructors, instructorId]
      : filters.instructors.filter(i => i !== instructorId);
    onChange({ ...filters, instructors: newInstructors });
  };

  const handleStatusChange = (status: string) => {
    onChange({ ...filters, status });
  };

  const handleAvailabilityChange = (availability: string) => {
    onChange({ ...filters, availability });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filtres</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Appareils
          </label>
          <div className="space-y-2">
            {availableAircraft.map((aircraft) => (
              <label key={aircraft.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.aircraftTypes.includes(aircraft.id)}
                  onChange={(e) => handleAircraftChange(aircraft.id, e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-600">
                  {aircraft.registration}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Instructeur
          </label>
          <div className="space-y-2">
            {instructors.map((instructor) => (
              <label key={instructor.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.instructors.includes(instructor.id)}
                  onChange={(e) => handleInstructorChange(instructor.id, e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-600">
                  {instructor.first_name} {instructor.last_name}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Statut
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="mt-1 block w-full rounded-md border-slate-300 text-sm focus:border-sky-500 focus:ring-sky-500"
            >
              <option value="all">Tous</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Disponibilité
            </label>
            <select
              value={filters.availability}
              onChange={(e) => handleAvailabilityChange(e.target.value)}
              className="mt-1 block w-full rounded-md border-slate-300 text-sm focus:border-sky-500 focus:ring-sky-500"
            >
              <option value="all">Toutes les réservations</option>
              <option value="available">Disponible maintenant</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;