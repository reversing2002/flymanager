import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plane, Clock, MapPin, CreditCard, GraduationCap } from 'lucide-react';
import type { Flight, Aircraft, User } from '../../types/database';

interface FlightCardProps {
  flight: Flight;
  aircraft?: Aircraft;
  user?: User;
}

const FlightCard: React.FC<FlightCardProps> = ({ flight, aircraft, user }) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes > 0 ? remainingMinutes : ''}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-sky-50 rounded-lg">
              <Plane className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {aircraft?.registration || 'N/A'}
              </h3>
              <p className="text-sm text-slate-600">
                {format(new Date(flight.date), 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{formatDuration(flight.duration)}</span>
            </div>
            {flight.destination && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{flight.destination}</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <span>{flight.cost.toFixed(2)} €</span>
            </div>
            {flight.instructor_cost > 0 && (
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-4 w-4 text-slate-400" />
                <span>{flight.instructor_cost.toFixed(2)} €</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Pilote</span>
            <p className="font-medium text-slate-900">
              {user ? `${user.firstName} ${user.lastName}` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-slate-600">Mode de paiement</span>
            <p className="font-medium text-slate-900">
              {flight.paymentMethod === 'ACCOUNT' ? 'Compte pilote' : 
               flight.paymentMethod === 'CARD' ? 'Carte bancaire' :
               flight.paymentMethod === 'CASH' ? 'Espèces' : 'Virement'}
            </p>
          </div>
          <div>
            <span className="text-slate-600">Statut</span>
            <p className={`font-medium ${flight.isValidated ? 'text-emerald-600' : 'text-amber-600'}`}>
              {flight.isValidated ? 'Validé' : 'En attente'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;