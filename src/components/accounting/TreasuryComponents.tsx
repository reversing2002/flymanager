import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  CircularProgress,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Edit, Eye, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AccountEntriesView } from './AccountEntriesView';

interface AccountBalance {
  id: string;
  name: string;
  code: string;
  balance: number;
  type: string;
  account_type: string;
  iban?: string;
  bic?: string;
}

interface TreasuryTabProps {
  accounts: AccountBalance[];
  onCreateTreasury: () => void;
  onEditTreasury: (account: AccountBalance) => void;
  onViewTreasuryDetails: (account: AccountBalance) => void;
  onDeleteTreasury: (account: AccountBalance) => Promise<void>;
}

export const TreasuryTab = ({
  accounts,
  onCreateTreasury,
  onEditTreasury,
  onViewTreasuryDetails,
  onDeleteTreasury,
}: TreasuryTabProps) => {
  const { user } = useAuth();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountBalance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTreasury, setSelectedTreasury] = useState<AccountBalance | null>(null);

  const treasuryAccounts = accounts.filter(account => 
    account.code.startsWith('512')
  ) as AccountBalance[];

  const handleCreateClick = () => {
    onCreateTreasury();
  };

  const handleEditClick = (account: AccountBalance) => {
    setSelectedTreasury(account);
    setFormOpen(true);
  };

  const handleViewClick = (account: AccountBalance) => {
    setSelectedTreasury(account);
    setDetailsOpen(true);
  };

  const handleDeleteClick = (account: AccountBalance) => {
    setSelectedAccount(account);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAccount) return;
    
    setIsDeleting(true);
    try {
      await onDeleteTreasury(selectedAccount);
      setDeleteConfirmOpen(false);
      toast.success('Compte supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du compte');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSubmit = async (data: TreasuryFormData) => {
    try {
      if (selectedTreasury) {
        await onEditTreasury({
          ...selectedTreasury,
          ...data,
        });
        toast.success('Compte modifié avec succès');
        setFormOpen(false);
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={handleCreateClick}
        >
          Nouveau compte
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
            {treasuryAccounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.code}</TableCell>
                <TableCell>{account.name}</TableCell>
                <TableCell align="right">
                  {formatCurrency(account.balance)}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleViewClick(account)}
                  >
                    <Eye size={16} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleEditClick(account)}
                  >
                    <Edit size={16} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClick(account)}
                    color="error"
                  >
                    <X size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedTreasury && (
        <TreasuryForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={selectedTreasury}
        />
      )}

      {selectedTreasury && (
        <TreasuryDetails
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          treasury={selectedTreasury}
        />
      )}

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer ce compte ?
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

const treasuryFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  code: z.string().min(1, "Le code est requis"),
});

type TreasuryFormData = z.infer<typeof treasuryFormSchema>;

interface TreasuryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TreasuryFormData) => Promise<void>;
  initialData?: AccountBalance;
}

export const TreasuryForm = ({
  open,
  onClose,
  onSubmit,
  initialData
}: TreasuryFormProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<TreasuryFormData>({
    resolver: zodResolver(treasuryFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      code: initialData.code,
    } : undefined
  });

  React.useEffect(() => {
    if (open) {
      reset(initialData ? {
        name: initialData.name,
        code: initialData.code,
      } : undefined);
    }
  }, [open, initialData, reset]);

  const onSubmitForm = async (data: TreasuryFormData) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {initialData ? 'Modifier le compte' : 'Nouveau compte'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmitForm)}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nom"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              fullWidth
            />
            <TextField
              label="Code"
              {...register('code')}
              error={!!errors.code}
              helperText={errors.code?.message}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {initialData ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

interface TreasuryDetailsProps {
  open: boolean;
  onClose: () => void;
  treasury: AccountBalance;
  startDate?: Date;
  endDate?: Date;
}

export const TreasuryDetails = ({
  open,
  onClose,
  treasury,
  startDate,
  endDate
}: TreasuryDetailsProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Détails du compte : {treasury.name}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Code : {treasury.code}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Solde actuel : {formatCurrency(treasury.balance)}
          </Typography>
        </Box>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Historique des transactions
          </Typography>
          <AccountEntriesView
            accountId={treasury.id}
            startDate={startDate}
            endDate={endDate}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};
