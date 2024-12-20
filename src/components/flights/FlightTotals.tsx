import React from 'react';
import { Clock, CreditCard } from 'lucide-react';
import type { Flight } from '../../types/database';

interface FlightTotalsProps {
  flights: Flight[];
  showByCategory?: boolean;
}

interface CategoryTotal {
  duration: number;
  cost: number;
  count: number;
}

const CATEGORY_LABELS = {
  'REGULAR': 'Vols réguliers',
  'INSTRUCTION': 'Instruction',
  'INITIATION': 'Initiation',
  'DISCOVERY': 'Vols découverte',
  'BIA': 'BIA',
  'FERRY': 'Convoyages'
};

const FlightTotals: React.FC<FlightTotalsProps> = ({ flights, showByCategory = false }) => {
  const totalDuration = flights.reduce((acc, flight) => acc + flight.duration, 0);
  const totalCost = flights.reduce((acc, flight) => 
    flight.flightType?.accounting_category?.is_club_paid ? acc : acc + flight.cost, 0);

  // Calculer les totaux par catégorie
  const categoryTotals = flights.reduce((acc, flight) => {
    const category = flight.accountingCategory || 'REGULAR';
    if (!acc[category]) {
      acc[category] = { duration: 0, cost: 0, count: 0 };
    }
    acc[category].duration += flight.duration;
    acc[category].cost += flight.flightType?.accounting_category?.is_club_paid ? 0 : flight.cost;
    acc[category].count += 1;
    return acc;
  }, {} as Record<string, CategoryTotal>);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : '00'}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-sky-50 rounded-lg">
            <Clock className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Temps de vol total</p>
            <p className="text-2xl font-bold text-slate-900">{formatDuration(totalDuration)}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <CreditCard className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Montant total</p>
            <p className="text-2xl font-bold text-slate-900">{totalCost.toFixed(2)} €</p>
          </div>
        </div>
      </div>

      {showByCategory && Object.keys(categoryTotals).length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Détails par catégorie</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(categoryTotals).map(([category, totals]) => (
              <div key={category} className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="text-slate-600">
                    Nombre de vols: <span className="font-medium">{totals.count}</span>
                  </p>
                  <p className="text-slate-600">
                    Durée totale: <span className="font-medium">{formatDuration(totals.duration)}</span>
                  </p>
                  <p className="text-slate-600">
                    Montant: <span className="font-medium">{totals.cost.toFixed(2)} €</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightTotals;