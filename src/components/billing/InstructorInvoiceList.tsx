
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Download, Eye, Trash2 } from 'lucide-react';
import { getInstructorInvoices, deleteInvoice } from '../../lib/queries/billing';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import InvoiceDetailsModal from './InvoiceDetailsModal';

const InstructorInvoiceList = () => {
  const { user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ['instructorInvoices', user?.id],
    queryFn: () => getInstructorInvoices(user!.id),
    enabled: !!user?.id,
  });

  const handleDelete = async (invoiceId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      return;
    }

    try {
      await deleteInvoice(invoiceId);
      toast.success('Facture supprimée');
      refetch();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-800';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'PAID':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Brouillon';
      case 'PENDING':
        return 'En attente';
      case 'PAID':
        return 'Payée';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices?.map((invoice) => (
        <div
          key={invoice.id}
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-sky-50 rounded-lg">
                <FileText className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">
                  Facture #{invoice.invoice_number}
                </h3>
                <p className="text-sm text-slate-500">
                  Du {format(new Date(invoice.start_date), 'dd MMMM yyyy', { locale: fr })} au{' '}
                  {format(new Date(invoice.end_date), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="font-medium text-slate-900">
                  {invoice.amount.toFixed(2)} €
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                  {getStatusLabel(invoice.status)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedInvoice(invoice.id)}
                  className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                  title="Voir les détails"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {invoice.status === 'DRAFT' && (
                  <button
                    onClick={() => handleDelete(invoice.id)}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {!invoices?.length && (
        <div className="text-center py-12 text-slate-600">
          Aucune facture trouvée
        </div>
      )}

      {selectedInvoice && (
        <InvoiceDetailsModal
          invoiceId={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
};

export default InstructorInvoiceList;
