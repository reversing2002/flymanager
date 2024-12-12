import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, AlertTriangle, Download, Send } from 'lucide-react';
import { getInstructorInvoices, updateInvoiceStatus } from '../../lib/queries/billing';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../lib/permissions';

interface InvoiceDetailsModalProps {
  instructorId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  instructorId,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const isAdmin = hasAnyGroup(user, ['ADMIN']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['instructorInvoices', instructorId],
    queryFn: () => getInstructorInvoices(instructorId),
  });

  const handleStatusUpdate = async (invoiceId: string, newStatus: 'PENDING' | 'PAID') => {
    try {
      setLoading(true);
      setError(null);

      await updateInvoiceStatus(invoiceId, newStatus);
      toast.success('Statut mis à jour');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Erreur lors de la mise à jour du statut');
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = invoices?.reduce((sum, invoice) => sum + invoice.amount, 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
        {isLoading ? (
          <div className="p-6 text-center">
            <p>Chargement...</p>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-medium">Détails de facturation</h2>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-600">
                      <th className="p-3 font-medium">Date</th>
                      <th className="p-3 font-medium">Élève</th>
                      <th className="p-3 font-medium">Avion</th>
                      <th className="p-3 font-medium text-right">Durée</th>
                      <th className="p-3 font-medium text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoices?.map((invoice) => (
                      invoice.instructor_invoice_details?.map((detail) => (
                        <tr key={detail.flight.id} className="hover:bg-slate-50">
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
                      ))
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-medium">
                      <td colSpan={4} className="p-3 text-right">Total</td>
                      <td className="p-3 text-right">{totalAmount.toFixed(2)} €</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                {invoices?.map((invoice) => (
                  <React.Fragment key={invoice.id}>
                    {!isAdmin && (
                      <button
                        onClick={() => handleStatusUpdate(invoice.id, 'PENDING')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        <Send className="h-4 w-4" />
                        <span>Envoyer au club</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusUpdate(invoice.id, 'PAID')}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                      disabled={loading}
                    >
                      <Download className="h-4 w-4" />
                      <span>Marquer comme payée</span>
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetailsModal;
