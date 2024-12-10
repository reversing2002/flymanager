
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, AlertTriangle, Download, Send } from 'lucide-react';
import { getInvoiceDetails, updateInvoiceStatus } from '../../lib/queries/billing';
import { toast } from 'react-hot-toast';

interface InvoiceDetailsModalProps {
  invoiceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  invoiceId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: details, isLoading } = useQuery({
    queryKey: ['invoiceDetails', invoiceId],
    queryFn: () => getInvoiceDetails(invoiceId),
  });

  const handleStatusUpdate = async (newStatus: 'PENDING' | 'PAID') => {
    try {
      setLoading(true);
      setError(null);

      await updateInvoiceStatus(invoiceId, newStatus);
      toast.success('Statut mis à jour');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Erreur lors de la mise à jour du statut');
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = details?.reduce((sum, detail) => sum + detail.amount, 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Détails de la facture</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="p-4 mb-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-3 text-sm font-medium text-slate-600">Date</th>
                      <th className="text-left p-3 text-sm font-medium text-slate-600">Élève</th>
                      <th className="text-left p-3 text-sm font-medium text-slate-600">Appareil</th>
                      <th className="text-right p-3 text-sm font-medium text-slate-600">Durée</th>
                      <th className="text-right p-3 text-sm font-medium text-slate-600">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {details?.map((detail) => (
                      <tr key={detail.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          {format(new Date(detail.flight.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="p-3">
                          {detail.flight.student.first_name} {detail.flight.student.last_name}
                        </td>
                        <td className="p-3">
                          {detail.flight.aircraft.registration}
                        </td>
                        <td className="p-3 text-right">
                          {Math.floor(detail.flight.duration / 60)}h
                          {detail.flight.duration % 60}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {detail.amount.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-medium">
                      <td colSpan={4} className="p-3 text-right">
                        Total
                      </td>
                      <td className="p-3 text-right">
                        {totalAmount.toFixed(2)} €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  onClick={() => handleStatusUpdate('PENDING')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  <Send className="h-4 w-4" />
                  <span>Envoyer au club</span>
                </button>
                <button
                  onClick={() => handleStatusUpdate('PAID')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  <Download className="h-4 w-4" />
                  <span>Marquer comme payée</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsModal;
