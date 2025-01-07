import React from 'react';
import { useForm } from 'react-hook-form';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, IconButton, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Edit, Eye, Plus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { LoadingButton } from '@mui/lab';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { AccountEntriesView } from './AccountEntriesView';

export interface SupplierAccount extends AccountBalance {
  supplier_details?: {
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

const supplierFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  code: z.string().min(1, "Le code est requis"),
  siret: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  default_expense_account_id: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  initialData?: AccountBalance;
  onSubmit: (data: SupplierFormData) => void;
  onClose: () => void;
  open: boolean;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
  initialData,
  onSubmit,
  onClose,
  open
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      siret: initialData?.siret || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      default_expense_account_id: initialData?.default_expense_account_id || '',
    },
  });

  // Récupérer la liste des comptes de charges
  const { data: expenseAccounts = [] } = useQuery({
    queryKey: ['expenseAccounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('type', 'EXPENSE')
        .order('code');

      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom du fournisseur"
                {...register('name', { required: 'Le nom est requis' })}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Code comptable"
                {...register('code', { required: 'Le code est requis' })}
                error={!!errors.code}
                helperText={errors.code?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Compte de charges par défaut</InputLabel>
                <Select
                  {...register('default_expense_account_id')}
                  label="Compte de charges par défaut"
                >
                  <MenuItem value="">
                    <em>Aucun</em>
                  </MenuItem>
                  {expenseAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="SIRET"
                {...register('siret')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                {...register('email')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Téléphone"
                {...register('phone')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adresse"
                multiline
                rows={3}
                {...register('address')}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Annuler
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleSubmit(onSubmit)}
        >
          {initialData ? 'Modifier' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface SupplierDetailsProps {
  open: boolean;
  onClose: () => void;
  supplier: SupplierAccount;
  startDate?: Date;
  endDate?: Date;
}

export const SupplierDetails = ({ open, onClose, supplier, startDate, endDate }: { 
  open: boolean; 
  onClose: () => void; 
  supplier: SupplierAccount;
  startDate?: Date;
  endDate?: Date;
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Détails du fournisseur</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">{supplier.name}</Typography>
          <Typography color="textSecondary">Code: {supplier.code}</Typography>
          {supplier.siret && (
            <Typography color="textSecondary">SIRET: {supplier.siret}</Typography>
          )}
          {supplier.address && (
            <Typography color="textSecondary">Adresse: {supplier.address}</Typography>
          )}
        </Box>
        <AccountEntriesView 
          accountId={supplier.id} 
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

interface SuppliersTabProps {
  accounts: AccountBalance[];
  onCreateSupplier: () => void;
  onEditSupplier: (supplier: AccountBalance) => void;
  onViewSupplierDetails: (supplier: AccountBalance) => void;
  onDeleteSupplier: (supplier: AccountBalance) => Promise<void>;
}

export const SuppliersTab = ({ 
  accounts, 
  onCreateSupplier, 
  onEditSupplier, 
  onViewSupplierDetails,
  onDeleteSupplier 
}: SuppliersTabProps) => {
  const supplierAccounts = accounts.filter(account => 
    account.account_type === 'SUPPLIER'
  ) as SupplierAccount[];

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [selectedSupplier, setSelectedSupplier] = React.useState<AccountBalance | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteClick = (supplier: AccountBalance) => {
    setSelectedSupplier(supplier);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSupplier) return;
    
    setIsDeleting(true);
    try {
      await onDeleteSupplier(selectedSupplier);
      toast.success('Fournisseur supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du fournisseur:', error);
      toast.error('Erreur lors de la suppression du fournisseur');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setSelectedSupplier(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setSelectedSupplier(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Liste des Fournisseurs</Typography>
            <Button
              variant="contained"
              startIcon={<Plus />}
              onClick={onCreateSupplier}
            >
              Nouveau Fournisseur
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>SIRET</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Téléphone</TableCell>
                  <TableCell align="right">Solde</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {supplierAccounts.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>{supplier.code}</TableCell>
                    <TableCell>{supplier.siret || '-'}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell align="right">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                        .format(Math.abs(supplier.balance))}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => onEditSupplier(supplier)}
                      >
                        <Edit size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onViewSupplierDetails(supplier)}
                      >
                        <Eye size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(supplier)}
                        color="error"
                      >
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirmer la suppression
        </DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer le fournisseur {selectedSupplier?.name} ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
