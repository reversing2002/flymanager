import React, { useEffect, useState } from 'react';
import { Filter, Calendar, Plane, Clock } from 'lucide-react';
import { fr } from 'date-fns/locale';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { Aircraft, FlightType } from '../../types/database';
import { supabase } from '../../lib/supabase';

interface FlightFiltersProps {
  filters: FlightFilters;
  onFiltersChange: (filters: FlightFilters) => void;
  aircraftList: Aircraft[];
  onClose: () => void;
}

export interface FlightFilters {
  dateRange: 'all' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'custom';
  startDate: string;
  endDate: string;
  aircraftTypes: string[];
  aircraftIds: string[];
  flightTypes: string[];
  accountingCategories: string[];
  validated: 'all' | 'yes' | 'no';
}

const FlightFilters: React.FC<FlightFiltersProps> = ({
  filters,
  onFiltersChange,
  aircraftList,
  onClose,
}) => {
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);

  useEffect(() => {
    const loadFlightTypes = async () => {
      const { data, error } = await supabase
        .from('flight_types')
        .select('*')
        .order('name');

      if (!error && data) {
        setFlightTypes(data);
      }
    };

    loadFlightTypes();
  }, []);

  const handleDateRangeChange = (range: string) => {
    let startDate = '';
    let endDate = '';

    const now = new Date();
    
    switch (range) {
      case 'thisMonth':
        startDate = format(startOfMonth(now), 'yyyy-MM-dd');
        endDate = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
      case 'lastMonth':
        startDate = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
        endDate = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
        break;
      case 'last3Months':
        startDate = format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd');
        endDate = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
    }

    onFiltersChange({
      ...filters,
      dateRange: range as FlightFilters['dateRange'],
      startDate,
      endDate,
    });
  };

  // Get unique aircraft types
  const aircraftTypes = [...new Set(aircraftList.map(a => a.type))];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold">Filtres</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Période */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              <span>Période</span>
            </div>
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          >
            <option value="all">Toutes les dates</option>
            <option value="thisMonth">Ce mois</option>
            <option value="lastMonth">Mois dernier</option>
            <option value="last3Months">3 derniers mois</option>
            <option value="custom">Période personnalisée</option>
          </select>

          {filters.dateRange === 'custom' && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Du
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, startDate: e.target.value })
                  }
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Au
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, endDate: e.target.value })
                  }
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Types de vol */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Types de vol
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {flightTypes.map((type) => (
              <label key={type.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.flightTypes.includes(type.id)}
                  onChange={(e) => {
                    const newTypes = e.target.checked
                      ? [...filters.flightTypes, type.id]
                      : filters.flightTypes.filter((id) => id !== type.id);
                    onFiltersChange({ ...filters, flightTypes: newTypes });
                  }}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="ml-2 text-sm text-slate-600">
                  {type.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Validation */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Validation
          </label>
          <select
            value={filters.validated}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                validated: e.target.value as FlightFilters['validated'],
              })
            }
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          >
            <option value="all">Tous</option>
            <option value="yes">Validés</option>
            <option value="no">Non validés</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FlightFilters;