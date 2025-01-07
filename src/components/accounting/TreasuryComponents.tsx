import React, { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  TextField,
  Checkbox,
  FormControlLabel,
  Typography,
  IconButton,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

interface TreasuryAccount {
  id: string;
  name: string;
  code: string;
  type: string;
  account_type: string;
  balance: number;
  accepts_external_payments: boolean;
  can_group_sales: boolean;
  treasury_id: string;
}

interface TreasuryTabProps {
  accounts: TreasuryAccount[];
  onCreateAccount?: () => void;
  onEditAccount?: (account: TreasuryAccount) => void;
  onViewAccountDetails?: (account: TreasuryAccount) => void;
  onDeleteAccount?: (account: TreasuryAccount) => void;
}

export const TreasuryTab = ({
  accounts,
  onCreateAccount,
  onEditAccount,
  onViewAccountDetails,
  onDeleteAccount,
}: TreasuryTabProps) => {
  const { user } = useAuth();
  const { data: treasuryDetails = {}, isLoading } = useQuery({
    queryKey: ['treasury', accounts.map(a => a.id)],
    queryFn: async () => {
      if (accounts.length === 0) return {};
      
      const { data, error } = await supabase
        .from('treasury')
        .select('*')
        .in('account_id', accounts.map(a => a.id));

      if (error) throw error;

      return (data || []).reduce((acc, treasury) => ({
        ...acc,
        [treasury.account_id]: treasury
      }), {});
    }
  });

  const treasuryAccounts = accounts
    .filter(account => account.account_type === 'TREASURY')
    .map(account => ({
      ...account,
      accepts_external_payments: treasuryDetails[account.id]?.accepts_external_payments || false,
      can_group_sales: treasuryDetails[account.id]?.can_group_sales || false,
      treasury_id: treasuryDetails[account.id]?.id
    }));

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography>Chargement des comptes de trésorerie...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Typography variant="h5" component="h2">Trésorerie</Typography>
          {onCreateAccount && (
            <Button variant="contained" color="primary" onClick={onCreateAccount}>
              Nouveau compte
            </Button>
          )}
        </div>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Code du compte</TableCell>
                <TableCell>Comptabilité</TableCell>
                <TableCell align="center">Reçoit les paiements des clients extérieurs</TableCell>
                <TableCell align="center">Regrouper les ventes</TableCell>
                <TableCell align="right">Solde</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {treasuryAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.code}</TableCell>
                  <TableCell>Comptabilité</TableCell>
                  <TableCell align="center">
                    {account.accepts_external_payments ? '✓' : ''}
                  </TableCell>
                  <TableCell align="center">
                    {account.can_group_sales ? '✓' : ''}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(account.balance)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {onEditAccount && (
                        <IconButton
                          size="small"
                          onClick={() => onEditAccount(account)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {onViewAccountDetails && (
                        <IconButton
                          size="small"
                          onClick={() => onViewAccountDetails(account)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      )}
                      {onDeleteAccount && (
                        <IconButton
                          size="small"
                          onClick={() => onDeleteAccount(account)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

interface TreasuryFormData {
  name: string;
  code: string;
  accepts_external_payments: boolean;
  can_group_sales: boolean;
}

interface TreasuryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TreasuryFormData) => void;
  initialData?: TreasuryAccount;
}

export const TreasuryForm = ({
  open,
  onClose,
  onSubmit,
  initialData,
}: TreasuryFormProps) => {
  const [formData, setFormData] = useState<TreasuryFormData>({
    name: initialData?.name || '',
    code: initialData?.code || '',
    accepts_external_payments: initialData?.accepts_external_payments || false,
    can_group_sales: initialData?.can_group_sales || false,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardContent>
          <Typography variant="h5" component="h2" className="mb-4">
            {initialData ? 'Modifier le compte' : 'Nouveau compte'}
          </Typography>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(formData);
            }}
            className="space-y-4"
          >
            <div>
              <TextField
                label="Nom du compte"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                fullWidth
                margin="normal"
              />
            </div>

            <div>
              <TextField
                label="Code du compte"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                required
                fullWidth
                margin="normal"
              />
            </div>

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.accepts_external_payments}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      accepts_external_payments: e.target.checked,
                    })
                  }
                />
              }
              label="Reçoit les paiements des clients extérieurs"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.can_group_sales}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      can_group_sales: e.target.checked,
                    })
                  }
                />
              }
              label="Regrouper les ventes"
            />

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outlined" onClick={onClose}>
                Annuler
              </Button>
              <Button variant="contained" color="primary" type="submit">
                {initialData ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

interface TreasuryDetailsProps {
  open: boolean;
  onClose: () => void;
  account: TreasuryAccount;
}

export const TreasuryDetails = ({
  open,
  onClose,
  account,
}: TreasuryDetailsProps) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (open && account.id) {
      fetchTreasuryTransactions();
    }
  }, [open, account.id]);

  const fetchTreasuryTransactions = async () => {
    if (!user?.club?.id || !account.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          id,
          transaction_date,
          description,
          journal_entry_lines (
            id,
            amount,
            debit_account_id,
            credit_account_id
          )
        `)
        .or(`debit_account_id.eq.${account.id},credit_account_id.eq.${account.id}`)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching treasury transactions:', error);
      toast.error('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card className="w-full max-w-4xl">
        <CardContent className="max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <Typography variant="h5" component="h2">
              Détails du compte : {account.name}
            </Typography>
            <Button variant="outlined" onClick={onClose}>
              Fermer
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Typography variant="subtitle1">Code du compte</Typography>
                <Typography>{account.code}</Typography>
              </div>
              <div>
                <Typography variant="subtitle1">Solde actuel</Typography>
                <Typography>{formatCurrency(account.balance)}</Typography>
              </div>
            </div>

            <Typography variant="h6" className="mt-6 mb-2">
              Historique des transactions
            </Typography>

            {loading ? (
              <Typography>Chargement des transactions...</Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Montant</TableCell>
                      <TableCell>Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const line = transaction.journal_entry_lines[0];
                      const isDebit = line.debit_account_id === account.id;
                      const amount = isDebit ? line.amount : -line.amount;

                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(amount)}
                          </TableCell>
                          <TableCell>
                            {isDebit ? 'Débit' : 'Crédit'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
