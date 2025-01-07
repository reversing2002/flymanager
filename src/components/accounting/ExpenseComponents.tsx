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

export interface ExpenseAccount extends AccountBalance {
  expense_details?: {
    id: string;
    description?: string;
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

const expenseFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  code: z.string().min(1, "Le code est requis"),
  description: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  expense?: ExpenseAccount;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
}

export const ExpenseForm = ({ open, onClose, expense, onSubmit }: ExpenseFormProps) => {
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema)
  });

  React.useEffect(() => {
    const loadFormData = async () => {
      if (expense) {
        reset({
          name: expense.name,
          code: expense.code,
          description: expense.expense_details?.description || '',
        });
      } else {
        reset({
          name: '',
          code: '',
          description: '',
        });
      }
      setLoading(false);
    };

    loadFormData();
  }, [expense?.id]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {expense ? 'Modifier la charge' : 'Nouvelle charge'}
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
                {...register('description')}
                label="Description"
                multiline
                rows={3}
                error={!!errors.description}
                helperText={errors.description?.message}
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
            {expense ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

interface ExpenseDetailsProps {
  open: boolean;
  onClose: () => void;
  expense: ExpenseAccount;
  startDate?: Date;
  endDate?: Date;
}

export const ExpenseDetails = ({ open, onClose, expense, startDate, endDate }: ExpenseDetailsProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Détails de la charge</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">{expense.name}</Typography>
          <Typography color="textSecondary">Code: {expense.code}</Typography>
          {expense.expense_details?.description && (
            <Typography color="textSecondary">Description: {expense.expense_details.description}</Typography>
          )}
        </Box>
        <AccountEntriesView 
          accountId={expense.id} 
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

interface ExpensesTabProps {
  accounts: AccountBalance[];
  onCreateExpense: () => void;
  onEditExpense: (expense: ExpenseAccount) => void;
  onViewExpenseDetails: (expense: ExpenseAccount) => void;
  onDeleteExpense: (expense: ExpenseAccount) => Promise<void>;
}

export const ExpensesTab = ({ 
  accounts, 
  onCreateExpense, 
  onEditExpense, 
  onViewExpenseDetails,
  onDeleteExpense 
}: ExpensesTabProps) => {
  const expenseAccounts = accounts.filter(account => 
    account.code.startsWith('6')
  ) as ExpenseAccount[];

  const { data: expenseDetails = {}, isLoading } = useQuery({
    queryKey: ['expenses', expenseAccounts.map(s => s.id)],
    queryFn: async () => {
      if (expenseAccounts.length === 0) return {};
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .in('account_id', expenseAccounts.map(s => s.id));

      if (error) throw error;

      return (data || []).reduce((acc, expense) => ({
        ...acc,
        [expense.account_id]: {
          id: expense.id,
          description: expense.description,
        }
      }), {});
    },
    enabled: expenseAccounts.length > 0
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [selectedExpense, setSelectedExpense] = React.useState<ExpenseAccount | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteClick = (expense: ExpenseAccount) => {
    setSelectedExpense(expense);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExpense) return;
    
    setIsDeleting(true);
    try {
      await onDeleteExpense(selectedExpense);
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
          onClick={onCreateExpense}
        >
          Nouvelle charge
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell align="right">Solde</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenseAccounts.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.code}</TableCell>
                <TableCell>{expense.name}</TableCell>
                <TableCell align="right">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                    .format(expense.balance)}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => onViewExpenseDetails(expense)}
                  >
                    <Eye size={16} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onEditExpense(expense)}
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
            Êtes-vous sûr de vouloir supprimer cette charge ?
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
