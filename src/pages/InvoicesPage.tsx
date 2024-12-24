import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Chip
} from '@mui/material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { getInvoices, updateInvoiceStatus, generateInvoicePdf, generateManualInvoice, type Invoice } from '../lib/queries/invoices';
import { useAuth } from '../contexts/AuthContext';
import { hasAnyGroup } from '../lib/permissions';

const statusColors = {
  pending: 'warning',
  sent: 'info',
  paid: 'success'
} as const;

const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: getInvoices
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Invoice['status'] }) =>
      updateInvoiceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Statut de la facture mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du statut');
      console.error('Error updating invoice status:', error);
    }
  });

  const generatePdfMutation = useMutation({
    mutationFn: (invoice: Invoice) => generateInvoicePdf(invoice),
    onSuccess: () => {
      toast.success('PDF généré avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la génération du PDF');
      console.error('Error generating PDF:', error);
    }
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: (clubId: string) => generateManualInvoice(clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Facture générée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la génération de la facture');
      console.error('Error generating invoice:', error);
    }
  });

  if (!user || !hasAnyGroup(user, ['admin'])) {
    return (
      <Typography variant="h5" color="error" sx={{ p: 3 }}>
        Accès non autorisé
      </Typography>
    );
  }

  if (isLoading) {
    return (
      <Typography variant="h6" sx={{ p: 3 }}>
        Chargement...
      </Typography>
    );
  }

  const handleStatusChange = (invoice: Invoice, newStatus: Invoice['status']) => {
    updateStatusMutation.mutate({ id: invoice.id, status: newStatus });
  };

  const handleGeneratePdf = async (invoice: Invoice) => {
    generatePdfMutation.mutate(invoice);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h4">
          Gestion des Factures
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            const clubId = prompt('ID du club pour la facture:');
            if (clubId) {
              generateInvoiceMutation.mutate(clubId);
            }
          }}
          disabled={generateInvoiceMutation.isPending}
        >
          Générer une facture
        </Button>
      </div>

      <TableContainer component={Paper} className="mb-6">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Club</TableCell>
              <TableCell>Période</TableCell>
              <TableCell align="right">Montant Total</TableCell>
              <TableCell align="right">Commission</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices?.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.club?.name}</TableCell>
                <TableCell>
                  {format(new Date(invoice.period_start), 'MMMM yyyy', { locale: fr })}
                </TableCell>
                <TableCell align="right">{invoice.total_amount.toFixed(2)}€</TableCell>
                <TableCell align="right">{invoice.commission_amount.toFixed(2)}€</TableCell>
                <TableCell>
                  <Chip
                    label={invoice.status}
                    color={statusColors[invoice.status]}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <div className="space-x-2">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleGeneratePdf(invoice)}
                    >
                      {invoice.pdf_url ? 'Voir PDF' : 'Générer PDF'}
                    </Button>
                    {invoice.status === 'pending' && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleStatusChange(invoice, 'sent')}
                      >
                        Marquer comme envoyée
                      </Button>
                    )}
                    {invoice.status === 'sent' && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleStatusChange(invoice, 'paid')}
                      >
                        Marquer comme payée
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default InvoicesPage;
