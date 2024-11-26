import React from 'react';
import { X } from 'lucide-react';
import type { Aircraft, User } from '../../types/database';

interface FilterPanelProps {
  onClose: () => void;
  onFiltersChange: (filters: FilterState) => void;
  aircraft: Aircraft[];
  instructors: User[];
  filters: FilterState;
}

export interface FilterState {
  aircraftTypes: string[];
  instructors: string[];
  status: string;
  availability: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ 
  onClose, 
  onFiltersChange,
  aircraft,
  instructors: allInstructors,
  filters 
}) => {
  // Get unique aircraft types
  const aircraftTypes = [...new Set(aircraft.map(a => a.type))];

  const handleTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked 
      ? [...filters.aircraftTypes, type]
      : filters.aircraftTypes.filter(t => t !== type);
    onFiltersChange({ ...filters, aircraftTypes: newTypes });
  };

  const handleInstructorChange = (instructorId: string, checked: boolean) => {
    const newInstructors = checked
      ? [...filters.instructors, instructorId]
      : filters.instructors.filter(i => i !== instructorId);
    onFiltersChange({ ...filters, instructors: newInstructors });
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
            Type d'appareil
          </label>
          <div className="space-y-2">
            {aircraftTypes.map((type) => (
              <label key={type} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.aircraftTypes.includes(type)}
                  onChange={(e) => handleTypeChange(type, e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-600">
                  {type === 'PLANE' ? 'Avion' : 
                   type === 'ULM' ? 'ULM' : 
                   type === 'HELICOPTER' ? 'Hélicoptère' : type}
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
            {allInstructors.map((instructor) => (
              <label key={instructor.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.instructors.includes(instructor.id)}
                  onChange={(e) => handleInstructorChange(instructor.id, e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-600">
                  {instructor.firstName} {instructor.lastName}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Disponibilité
          </label>
          <select
            value={filters.availability}
            onChange={(e) => onFiltersChange({ ...filters, availability: e.target.value })}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          >
            <option value="all">Tous</option>
            <option value="available">Disponible maintenant</option>
            <option value="today">Disponible aujourd'hui</option>
            <option value="week">Disponible cette semaine</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;