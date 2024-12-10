import React from 'react';
import { format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, User } from 'lucide-react';
import type { MaintenanceHistory } from '../../types/maintenance';

interface MaintenanceHistoryListProps {
  history: MaintenanceHistory[];
}

const MaintenanceHistoryList: React.FC<MaintenanceHistoryListProps> = ({ history }) => {
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    return isValid(date) ? format(date, 'Pp', { locale: fr }) : 'Date invalide';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-6">Historique des maintenances</h2>

      <div className="space-y-4">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="p-4 rounded-lg border border-slate-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{entry.maintenanceType?.name}</h3>
                <div className="mt-1 space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(entry.performedAt)}</span>
                  </div>
                  {entry.performer && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        {entry.performer.firstName} {entry.performer.lastName}
                      </span>
                    </div>
                  )}
                  {typeof entry.hours === 'number' && (
                    <p>Heures totales: {entry.hours.toFixed(1)}h</p>
                  )}
                  {typeof entry.cycles === 'number' && (
                    <p>Cycles totaux: {entry.cycles}</p>
                  )}
                </div>
                {entry.comments && (
                  <p className="mt-2 text-sm">{entry.comments}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {history.length === 0 && (
          <p className="text-center text-slate-500 py-4">
            Aucun historique de maintenance
          </p>
        )}
      </div>
    </div>
  );
};

export default MaintenanceHistoryList;