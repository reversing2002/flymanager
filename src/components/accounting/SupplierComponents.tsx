import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Plus, Edit, Eye, X, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { LoadingButton } from '@mui/lab';

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
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  open: boolean;
  onClose: () => void;
  supplier?: SupplierAccount;
  onSubmit: (data: SupplierFormData) => Promise<void>;
}

export const SupplierForm = ({ open, onClose, supplier, onSubmit }: SupplierFormProps) => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema)
  });

  useEffect(() => {
    const loadFormData = async () => {
      if (supplier) {
        reset({
          name: supplier.name,
          code: supplier.code,
          siret: supplier.supplier_details?.siret || '',
          email: supplier.supplier_details?.email || '',
          phone: supplier.supplier_details?.phone || '',
          address: supplier.supplier_details?.address || '',
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
  }, [supplier?.id]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {supplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
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
            {supplier ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

interface SupplierDetailsProps {
  open: boolean;
  onClose: () => void;
  supplier: SupplierAccount;
}

export const SupplierDetails = ({ open, onClose, supplier }: SupplierDetailsProps) => {
  const [transactions, setTransactions] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    if (open && supplier.id) {
      fetchSupplierTransactions();
    }
  }, [open, supplier.id, selectedPeriod]);

  const fetchSupplierTransactions = async () => {
    if (!user?.club?.id || !supplier.id) return;
    
    try {
      setLoading(true);
      const { data: entries, error: entriesError } = await supabase
        .from('journal_entries')
        .select(`
          id,
          transaction_date,
          description,
          journal_entry_lines!inner (
            id,
            debit_amount,
            credit_amount,
            account_id,
            accounts!inner (
              id,
              name,
              code,
              account_type
            )
          )
        `)
        .eq('journal_entry_lines.accounts.id', supplier.id)
        .order('transaction_date', { ascending: false });

      if (entriesError) throw entriesError;

      setTransactions(entries || []);
    } catch (error) {
      console.error('Erreur lors du chargement des transactions:', error);
      toast.error("Erreur lors du chargement des transactions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Détails du fournisseur: {supplier.name}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Informations du fournisseur */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Informations
              </Typography>
              <Box display="grid" gap={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Code comptable
                  </Typography>
                  <Typography>{supplier.code}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    SIRET
                  </Typography>
                  <Typography>{supplier.supplier_details?.siret || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography>{supplier.supplier_details?.email || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Téléphone
                  </Typography>
                  <Typography>{supplier.supplier_details?.phone || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Adresse
                  </Typography>
                  <Typography>{supplier.supplier_details?.address || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Solde actuel
                  </Typography>
                  <Typography color={supplier.balance < 0 ? 'error.main' : 'success.main'}>
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                      .format(Math.abs(supplier.balance))}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Historique des transactions */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1">
                  Historique des transactions
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  >
                    <MenuItem value="all">Toutes les périodes</MenuItem>
                    <MenuItem value="current-month">Mois en cours</MenuItem>
                    <MenuItem value="last-3-months">3 derniers mois</MenuItem>
                    <MenuItem value="last-6-months">6 derniers mois</MenuItem>
                    <MenuItem value="current-year">Année en cours</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : transactions.length === 0 ? (
                <Box textAlign="center" py={3}>
                  <Typography color="text.secondary">
                    Aucune transaction pour cette période
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Débit</TableCell>
                        <TableCell align="right">Crédit</TableCell>
                        <TableCell align="right">Solde</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transactions.map((transaction) => {
                        const debitAmount = transaction.journal_entry_lines
                          .find(line => line.account_id === supplier.id)?.debit_amount || 0;
                        const creditAmount = transaction.journal_entry_lines
                          .find(line => line.account_id === supplier.id)?.credit_amount || 0;

                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {format(new Date(transaction.transaction_date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell align="right">
                              {debitAmount > 0 ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                                .format(debitAmount) : '-'}
                            </TableCell>
                            <TableCell align="right">
                              {creditAmount > 0 ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                                .format(creditAmount) : '-'}
                            </TableCell>
                            <TableCell align="right">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                                .format(creditAmount - debitAmount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

interface SuppliersTabProps {
  accounts: AccountBalance[];
  onCreateSupplier: () => void;
  onEditSupplier: (supplier: SupplierAccount) => void;
  onViewSupplierDetails: (supplier: SupplierAccount) => void;
  onDeleteSupplier: (supplier: SupplierAccount) => Promise<void>;
}

export const SuppliersTab = ({ 
  accounts, 
  onCreateSupplier, 
  onEditSupplier, 
  onViewSupplierDetails,
  onDeleteSupplier 
}: SuppliersTabProps) => {
  const supplierAccounts = accounts.filter(account => 
    account.account_type === 'LIABILITY' && account.type === 'SUPPLIER'
  ) as SupplierAccount[];

  const { data: supplierDetails = {}, isLoading } = useQuery({
    queryKey: ['suppliers', supplierAccounts.map(s => s.id)],
    queryFn: async () => {
      if (supplierAccounts.length === 0) return {};
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .in('account_id', supplierAccounts.map(s => s.id));

      if (error) throw error;

      return (data || []).reduce((acc, supplier) => ({
        ...acc,
        [supplier.account_id]: {
          id: supplier.id,
          siret: supplier.siret,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address
        }
      }), {});
    },
    enabled: supplierAccounts.length > 0
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (supplier: SupplierAccount) => {
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
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
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
                  {supplierAccounts.map((supplier) => {
                    const details = supplierDetails[supplier.id];
                    const enrichedSupplier = {
                      ...supplier,
                      supplier_details: details
                    };
                    
                    return (
                      <TableRow key={supplier.id}>
                        <TableCell>{supplier.name}</TableCell>
                        <TableCell>{supplier.code}</TableCell>
                        <TableCell>{details?.siret || '-'}</TableCell>
                        <TableCell>{details?.email || '-'}</TableCell>
                        <TableCell>{details?.phone || '-'}</TableCell>
                        <TableCell align="right">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                            .format(Math.abs(supplier.balance))}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => onEditSupplier(enrichedSupplier)}
                          >
                            <Edit size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => onViewSupplierDetails(enrichedSupplier)}
                          >
                            <Eye size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(enrichedSupplier)}
                            color="error"
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
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
