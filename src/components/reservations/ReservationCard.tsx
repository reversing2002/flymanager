import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plane, Clock, UserIcon, Edit } from 'lucide-react';
import type { Aircraft, User, Reservation } from '../../types/database';

interface ReservationCardProps {
  reservation: Reservation;
  aircraft?: Aircraft;
  pilot?: User;
  instructor?: User;
  onEdit: (reservation: Reservation) => void;
  canEdit: boolean;
}

const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation,
  aircraft,
  pilot,
  instructor,
  onEdit,
  canEdit,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-sky-500" />
            <span className="font-medium">{aircraft?.registration || 'N/A'}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(reservation.startTime), 'EEEE d MMMM yyyy', { locale: fr })}
            </span>
            <span>•</span>
            <span>
              {format(new Date(reservation.startTime), 'HH:mm')} - {format(new Date(reservation.endTime), 'HH:mm')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-600">
              <UserIcon className="h-4 w-4" />
              <span>Pilote: {pilot ? `${pilot.first_name} ${pilot.last_name}` : 'Non assigné'}</span>
            </div>
            {instructor && (
              <div className="flex items-center gap-2 text-slate-600">
                <UserIcon className="h-4 w-4" />
                <span>Instructeur: {instructor.first_name} {instructor.last_name}</span>
              </div>
            )}
          </div>
        </div>

        {canEdit && (
          <button
            onClick={() => onEdit(reservation)}
            className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            title="Modifier la réservation"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ReservationCard;