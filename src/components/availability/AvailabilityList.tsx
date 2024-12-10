import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, RotateCcw, Trash2 } from 'lucide-react';
import type { Availability } from '../../types/availability';
import { deleteAvailability } from '../../lib/queries/availability';
import { toast } from 'react-hot-toast';

interface AvailabilityListProps {
  availabilities: Availability[];
  onEdit: (availability: Availability) => void;
  onRefresh: () => void;
}

const AvailabilityList: React.FC<AvailabilityListProps> = ({
  availabilities,
  onEdit,
  onRefresh,
}) => {
  const handleDelete = async (id: string) => {
    try {
      await deleteAvailability(id);
      toast.success('Indisponibilité supprimée');
      onRefresh();
    } catch (error) {
      console.error('Error deleting availability:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      {availabilities.map((availability) => (
        <div
          key={availability.id}
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(availability.start_time), 'EEEE d MMMM yyyy', { locale: fr })}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(availability.start_time), 'HH:mm')} - 
                  {format(new Date(availability.end_time), 'HH:mm')}
                </span>
              </div>

              {availability.is_recurring && (
                <div className="flex items-center gap-2 text-slate-600">
                  <RotateCcw className="h-4 w-4" />
                  <span>
                    Récurrent jusqu'au {format(new Date(availability.recurrence_end_date!), 'd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}

              {availability.reason && (
                <p className="text-sm text-slate-600">
                  {availability.reason}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(availability)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                Modifier
              </button>
              <button
                onClick={() => handleDelete(availability.id)}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {availabilities.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Aucune indisponibilité
        </div>
      )}
    </div>
  );
};

export default AvailabilityList;