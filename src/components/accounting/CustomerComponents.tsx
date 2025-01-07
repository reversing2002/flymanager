import React from 'react';
import { useForm } from 'react-hook-form';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, IconButton, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, CircularProgress } from '@mui/material';
import { Edit, Eye, Plus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { AccountEntriesView } from './AccountEntriesView';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export interface CustomerAccount extends AccountBalance {
  customer_details?: {
    id: string;
    siret?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

interface JournalEntry {
  id: string;
  transaction_date: string;
  description: string;
  journal_entry_lines: {
    id: string;
    debit_amount: number;
    credit_amount: number;
    account_id: string;
  }[];
}

const customerFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  code: z.string().min(1, "Le code est requis"),
  siret: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  customer?: CustomerAccount;
  onSubmit: (data: CustomerFormData) => Promise<void>;
}

export const CustomerForm = ({ open, onClose, customer, onSubmit }: CustomerFormProps) => {
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema)
  });

  React.useEffect(() => {
    const loadFormData = async () => {
      if (customer) {
        reset({
          name: customer.name,
          code: customer.code,
          siret: customer.customer_details?.siret || '',
          email: customer.customer_details?.email || '',
          phone: customer.customer_details?.phone || '',
          address: customer.customer_details?.address || '',
        });
      } else {
        reset({
          name: '',
          code: '',
          siret: '',
          email: '',
          phone: '',
          address: '',
        });
      }
      setLoading(false);
    };

    loadFormData();
  }, [customer?.id]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {customer ? 'Modifier le client' : 'Nouveau client'}
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2, pt: 2 }}>
              <TextField
                {...register('name')}
                label="Nom"
                error={!!errors.name}
                helperText={errors.name?.message}
                fullWidth
              />
              <TextField
                {...register('code')}
                label="Code comptable"
                error={!!errors.code}
                helperText={errors.code?.message}
                fullWidth
              />
              <TextField
                {...register('siret')}
                label="SIRET"
                error={!!errors.siret}
                helperText={errors.siret?.message}
                fullWidth
              />
              <TextField
                {...register('email')}
                label="Email"
                type="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                fullWidth
              />
              <TextField
                {...register('phone')}
                label="Téléphone"
                error={!!errors.phone}
                helperText={errors.phone?.message}
                fullWidth
              />
              <TextField
                {...register('address')}
                label="Adresse"
                multiline
                rows={3}
                error={!!errors.address}
                helperText={errors.address?.message}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>
            Annuler
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isSubmitting || loading}
          >
            {customer ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

interface CustomerDetailsProps {
  open: boolean;
  onClose: () => void;
  customer: CustomerAccount;
  startDate?: Date;
  endDate?: Date;
}

export const CustomerDetails = ({ open, onClose, customer, startDate, endDate }: CustomerDetailsProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Détails du client</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">{customer.name}</Typography>
          <Typography color="textSecondary">Code: {customer.code}</Typography>
          {customer.customer_details?.siret && (
            <Typography color="textSecondary">SIRET: {customer.customer_details.siret}</Typography>
          )}
          {customer.customer_details?.address && (
            <Typography color="textSecondary">Adresse: {customer.customer_details.address}</Typography>
          )}
        </Box>
        <AccountEntriesView 
          accountId={customer.id} 
          startDate={startDate}
          endDate={endDate}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

interface CustomersTabProps {
  accounts: AccountBalance[];
  onCreateCustomer: () => void;
  onEditCustomer: (customer: CustomerAccount) => void;
  onViewCustomerDetails: (customer: CustomerAccount) => void;
  onDeleteCustomer: (customer: CustomerAccount) => Promise<void>;
}

export const CustomersTab = ({ 
  accounts, 
  onCreateCustomer, 
  onEditCustomer, 
  onViewCustomerDetails,
  onDeleteCustomer 
}: CustomersTabProps) => {
  const customerAccounts = accounts.filter(account => 
    account.code.startsWith('411')
  ) as CustomerAccount[];

  const { data: customerDetails = {}, isLoading } = useQuery({
    queryKey: ['customers', customerAccounts.map(s => s.id)],
    queryFn: async () => {
      if (customerAccounts.length === 0) return {};
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .in('account_id', customerAccounts.map(s => s.id));

      if (error) throw error;

      return (data || []).reduce((acc, customer) => ({
        ...acc,
        [customer.account_id]: {
          id: customer.id,
          siret: customer.siret,
          email: customer.email,
          phone: customer.phone,
          address: customer.address
        }
      }), {});
    },
    enabled: customerAccounts.length > 0
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerAccount | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteClick = (customer: CustomerAccount) => {
    setSelectedCustomer(customer);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCustomer) return;
    
    setIsDeleting(true);
    try {
      await onDeleteCustomer(selectedCustomer);
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={onCreateCustomer}
        >
          Nouveau client
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell>SIRET</TableCell>
              <TableCell>Email</TableCell>
              <TableCell align="right">Solde</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customerAccounts.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.code}</TableCell>
                <TableCell>{customer.name}</TableCell>
                <TableCell>
                  {customerDetails[customer.id]?.siret || '-'}
                </TableCell>
                <TableCell>
                  {customerDetails[customer.id]?.email || '-'}
                </TableCell>
                <TableCell align="right">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                    .format(customer.balance)}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => onViewCustomerDetails(customer)}
                  >
                    <Eye size={16} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onEditCustomer(customer)}
                  >
                    <Edit size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer ce client ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            color="error"
            variant="contained"
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
