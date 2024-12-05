
import React, { useState } from 'react';
import { X, AlertTriangle, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createInstructorInvoice } from '../../lib/queries/billing';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface CreateInvoiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
  validatedFlights: any[];
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  onClose,
  onSuccess,
  validatedFlights,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const handleQuickDateSelect = (months: number) => {
    const date = subMonths(new Date(), months);
    setDateRange({
      start: format(startOfMonth(date), 'yyyy-MM-dd'),
      end: format(endOfMonth(date), 'yyyy-MM-dd'),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Filter flights within date range and get their IDs
      const flightIds = validatedFlights
        .filter(flight => {
          const flightDate = new Date(flight.date);
          return flightDate >= new Date(dateRange.start) && 
                 flightDate <= new Date(dateRange.end) &&
                 !flight.instructor_invoice_id;
        })
        .map(flight => flight.id);

      if (flightIds.length === 0) {
        throw new Error('Aucun vol validé à facturer sur cette période');
      }

      await createInstructorInvoice({
        instructor_id: user.id,
        start_date: dateRange.start,
        end_date: dateRange.end,
        flight_ids: flightIds,
      });

      toast.success('Facture créée avec succès');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la facture');
      toast.error('Erreur lors de la création de la facture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Nouvelle facture</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Période
            </label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleQuickDateSelect(0)}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-200 hover:border-slate-300"
              >
                Ce mois
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect(1)}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-200 hover:border-slate-300"
              >
                Mois dernier
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Du
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Au
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer la facture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;
