import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Divider,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  TrendingUp, 
  TrendingDown,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  Building2,
  Users,
  ArrowDownUp,
  Plus,
  Edit,
  Eye,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { startOfYear, endOfYear, startOfMonth, endOfMonth, isWithinInterval, subMonths, subYears } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SupplierForm, SupplierDetails, SuppliersTab, SupplierAccount } from './SupplierComponents';
import { TreasuryTab, TreasuryForm, TreasuryDetails } from './TreasuryComponents';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  balance: number;
  account_type: string;
  type: string;
}

interface JournalEntry {
  id: string;
  transaction_date: string;
  description: string;
  lines: {
    id: string;
    account_name: string;
    account_code: string;
    account_type: string;
    debit_amount: number;
    credit_amount: number;
  }[];
  total_amount: number;
}

interface AccountTableProps {
  accounts: AccountBalance[];
  type: string;
}

interface SupplierAccount extends AccountBalance {
  siret?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface SupplierFormData {
  name: string;
  code: string;
  siret?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface TreasuryAccount extends AccountBalance {
  accepts_external_payments: boolean;
  can_group_sales: boolean;
}

interface TreasuryFormData {
  name: string;
  code: string;
  accepts_external_payments: boolean;
  can_group_sales: boolean;
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

interface SupplierDetailsProps {
  open: boolean;
  onClose: () => void;
  supplier: SupplierAccount;
}

interface AccountTableProps {
  accounts: AccountBalance[];
  type: string;
}

const AccountTable = ({ accounts, type }: AccountTableProps) => {
  const filteredAccounts = accounts.filter(a => a.account_type === type);
  
  const getDisplayBalance = (account: AccountBalance) => {
    let balance = account.balance || 0;
    // Pour les passifs et les produits, on inverse le signe du solde pour l'affichage
    if (['LIABILITY', 'REVENUE'].includes(account.account_type)) {
      balance = Math.abs(balance);
    }
    return balance;
  };

  const totalBalance = filteredAccounts.reduce((sum, account) => sum + getDisplayBalance(account), 0);
  
  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Nom</TableCell>
            <TableCell align="right">Débit</TableCell>
            <TableCell align="right">Crédit</TableCell>
            <TableCell align="right">Solde</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAccounts.map((account) => {
            const displayBalance = getDisplayBalance(account);
            const isPositiveBalance = ['LIABILITY', 'REVENUE'].includes(account.account_type) 
              ? account.balance > 0 
              : account.balance >= 0;

            return (
              <TableRow key={account.id}>
                <TableCell>{account.code}</TableCell>
                <TableCell>{account.name}</TableCell>
                <TableCell align="right">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                    .format(account.total_debit || 0)}
                </TableCell>
                <TableCell align="right">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                    .format(account.total_credit || 0)}
                </TableCell>
                <TableCell align="right">
                  <Typography color={isPositiveBalance ? 'success.main' : 'error.main'}>
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                      .format(displayBalance)}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow sx={{ backgroundColor: 'action.hover' }}>
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell align="right">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                .format(filteredAccounts.reduce((sum, a) => sum + (a.total_debit || 0), 0))}
            </TableCell>
            <TableCell align="right">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                .format(filteredAccounts.reduce((sum, a) => sum + (a.total_credit || 0), 0))}
            </TableCell>
            <TableCell align="right">
              <Typography color={totalBalance >= 0 ? 'success.main' : 'error.main'}>
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                  .format(totalBalance)}
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const SimpleAccountingView = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('current-year');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierAccount | undefined>();
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [isSupplierDetailsOpen, setIsSupplierDetailsOpen] = useState(false);
  const [selectedTreasuryAccount, setSelectedTreasuryAccount] = useState<TreasuryAccount | undefined>();
  const [isTreasuryFormOpen, setIsTreasuryFormOpen] = useState(false);
  const [isTreasuryDetailsOpen, setIsTreasuryDetailsOpen] = useState(false);

  const calculateAccountBalance = (lines: any[], accountType: string, startDate?: Date, endDate?: Date) => {
    if (!lines) return 0;
    
    const filteredLines = startDate && endDate
      ? lines.filter(line => {
          const transactionDate = new Date(line.journal_entries.transaction_date);
          return isWithinInterval(transactionDate, { start: startDate, end: endDate });
        })
      : lines;
    
    return filteredLines.reduce((sum, line) => {
      // Pour les comptes de passif et produits, on inverse la logique débit/crédit
      if (['LIABILITY', 'REVENUE'].includes(accountType)) {
        return sum + ((line.credit_amount || 0) - (line.debit_amount || 0));
      }
      // Pour les actifs et charges, on garde la logique normale
      return sum + ((line.debit_amount || 0) - (line.credit_amount || 0));
    }, 0);
  };

  const calculateTotals = (lines: any[], startDate?: Date, endDate?: Date) => {
    if (!lines) return { debit: 0, credit: 0 };
    
    const filteredLines = startDate && endDate
      ? lines.filter(line => {
          const transactionDate = new Date(line.journal_entries.transaction_date);
          return isWithinInterval(transactionDate, { start: startDate, end: endDate });
        })
      : lines;

    return filteredLines.reduce((totals, line) => ({
      debit: totals.debit + (line.debit_amount || 0),
      credit: totals.credit + (line.credit_amount || 0)
    }), { debit: 0, credit: 0 });
  };

  const getDateRangeForPeriod = () => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'current-year':
        return {
          startDate: startOfYear(now),
          endDate: endOfYear(now)
        };
      case 'current-month':
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        };
      case 'last-3-months':
        return {
          startDate: startOfMonth(subMonths(now, 2)),
          endDate: endOfMonth(now)
        };
      case 'last-6-months':
        return {
          startDate: startOfMonth(subMonths(now, 5)),
          endDate: endOfMonth(now)
        };
      case 'last-12-months':
        return {
          startDate: startOfMonth(subMonths(now, 11)),
          endDate: endOfMonth(now)
        };
      case 'previous-year':
        const lastYear = subYears(now, 1);
        return {
          startDate: startOfYear(lastYear),
          endDate: endOfYear(lastYear)
        };
      case 'all':
      default:
        return {
          startDate: undefined,
          endDate: undefined
        };
    }
  };

  const getTotalsByType = (accounts: AccountBalance[]) => {
    const { startDate, endDate } = getDateRangeForPeriod();
    
    return accounts.reduce((totals, account) => {
      const balance = calculateAccountBalance(
        account.lines || [], 
        account.account_type,
        startDate,
        endDate
      );
      
      if (account.account_type === 'ASSET') {
        totals.assets += balance;
      } else if (account.account_type === 'LIABILITY') {
        totals.liabilities += balance;
      } else if (account.account_type === 'REVENUE') {
        totals.revenue += balance;
      } else if (account.account_type === 'EXPENSE') {
        totals.expenses += balance;
      }
      
      return totals;
    }, {
      assets: 0,
      liabilities: 0,
      revenue: 0,
      expenses: 0
    });
  };

  const fetchJournalEntries = async () => {
    if (!user?.club?.id) return;

    try {
      const { data: entries, error: entriesError } = await supabase
        .from('journal_entries')
        .select('id, transaction_date, description')
        .eq('club_id', user.club.id)
        .order('transaction_date', { ascending: false });

      if (entriesError) throw entriesError;

      const entriesWithLines = await Promise.all(
        entries.map(async (entry) => {
          const { data: lines, error: linesError } = await supabase
            .from('journal_entry_lines')
            .select(`
              id,
              debit_amount,
              credit_amount,
              accounts!inner(
                name,
                code,
                account_type
              )
            `)
            .eq('journal_entry_id', entry.id);

          if (linesError) throw linesError;

          return {
            ...entry,
            lines: lines || [],
            total_amount: lines?.reduce((sum, line) => sum + (line.debit_amount || 0), 0) || 0
          };
        })
      );

      setJournalEntries(entriesWithLines);
      updateChartData(entriesWithLines);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      toast.error("Erreur lors du chargement des écritures");
    }
  };

  const fetchAccounts = async () => {
    if (!user?.club?.id) return;
    
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('club_id', user.club.id);

      if (accountsError) throw accountsError;

      // Calculer les soldes
      const accountsWithBalances = await Promise.all(
        accountsData.map(async (account) => {
          const { data: lines, error: linesError } = await supabase
            .from('journal_entry_lines')
            .select(`
              id,
              debit_amount,
              credit_amount,
              journal_entries!inner (
                id,
                transaction_date,
                description
              )
            `)
            .eq('account_id', account.id);

          if (linesError) throw linesError;

          const { startDate, endDate } = getDateRangeForPeriod();
          const balance = calculateAccountBalance(lines, account.account_type, startDate, endDate);
          const { debit, credit } = calculateTotals(lines, startDate, endDate);

          return { 
            ...account, 
            lines,
            balance,
            total_debit: debit,
            total_credit: credit
          };
        })
      );

      console.log('Comptes chargés:', accountsWithBalances);
      setAccounts(accountsWithBalances);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error("Erreur lors du chargement des comptes");
    }
  };

  const updateChartData = (entries: JournalEntry[]) => {
    try {
      // Filtrer les entrées selon la période sélectionnée
      const filteredEntries = filterEntriesByPeriod(entries);
      
      // Grouper les entrées par mois
      const monthlyData = filteredEntries.reduce((acc: any, entry) => {
        // Vérifier si la date est valide
        if (!entry.transaction_date) {
          console.warn('Date de transaction manquante pour l\'entrée:', entry);
          return acc;
        }

        let date;
        try {
          // S'assurer que la date est au bon format
          if (entry.transaction_date.includes('T')) {
            // Si la date contient un timestamp, on extrait juste la partie date
            date = new Date(entry.transaction_date);
          } else {
            // Sinon on parse la date au format yyyy-MM-dd
            date = parse(entry.transaction_date, 'yyyy-MM-dd', new Date());
          }

          if (isNaN(date.getTime())) {
            console.warn('Date invalide:', entry.transaction_date);
            return acc;
          }
        } catch (error) {
          console.warn('Erreur lors du parsing de la date:', entry.transaction_date);
          return acc;
        }

        const monthKey = format(date, 'yyyy-MM');
        
        if (!acc[monthKey]) {
          acc[monthKey] = {
            revenues: 0,
            expenses: 0
          };
        }

        if (entry.lines && Array.isArray(entry.lines)) {
          entry.lines.forEach(line => {
            if (!line.accounts) return;
            
            if (line.accounts.account_type === 'REVENUE') {
              acc[monthKey].revenues += Number(line.credit_amount || 0);
            } else if (line.accounts.account_type === 'EXPENSE') {
              acc[monthKey].expenses += Number(line.debit_amount || 0);
            }
          });
        }

        return acc;
      }, {});

      // Trier les mois par ordre chronologique
      const sortedMonths = Object.keys(monthlyData)
        .sort((a, b) => a.localeCompare(b));

      const labels = sortedMonths.map(month => {
        const date = parse(month, 'yyyy-MM', new Date());
        return format(date, 'MMMM yyyy', { locale: fr });
      });

      setChartData({
        labels,
        datasets: [
          {
            label: 'Recettes',
            data: sortedMonths.map(month => monthlyData[month].revenues),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Dépenses',
            data: sortedMonths.map(month => monthlyData[month].expenses),
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des données du graphique:', error);
      toast.error('Erreur lors de la génération du graphique');
    }
  };

  const filterEntriesByPeriod = (entries: JournalEntry[]) => {
    if (!entries) return [];
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (selectedPeriod) {
      case 'current-year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'current-month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'last-3-months':
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      case 'last-6-months':
        startDate = startOfMonth(subMonths(now, 5));
        endDate = endOfMonth(now);
        break;
      case 'last-12-months':
        startDate = startOfMonth(subMonths(now, 11));
        endDate = endOfMonth(now);
        break;
      case 'previous-year':
        const lastYear = subYears(now, 1);
        startDate = startOfYear(lastYear);
        endDate = endOfYear(lastYear);
        break;
      case 'all':
        return entries;
      default:
        return entries;
    }

    return entries.filter(entry => {
      const entryDate = new Date(entry.transaction_date);
      return isWithinInterval(entryDate, { start: startDate, end: endDate });
    });
  };

  const handleCreateSupplier = async (data: SupplierFormData) => {
    if (!user?.club?.id) return;

    try {
      // 1. Create the account first
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .insert({
          name: data.name,
          code: data.code,
          club_id: user.club.id,
          account_type: 'LIABILITY',
          type: 'SUPPLIER'
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // 2. Create the supplier with the account_id
      const { error: supplierError } = await supabase
        .from('suppliers')
        .insert({
          account_id: accountData.id,
          siret: data.siret,
          email: data.email,
          phone: data.phone,
          address: data.address
        });

      if (supplierError) throw supplierError;

      toast.success('Fournisseur créé avec succès');
      setIsSupplierFormOpen(false);
      fetchAccounts();
    } catch (error: any) {
      console.error('Erreur lors de la création du fournisseur:', error);
      toast.error("Erreur lors de la création du fournisseur");
    }
  };

  const handleUpdateSupplier = async (data: SupplierFormData) => {
    if (!selectedSupplier?.id) return;

    try {
      // 1. Update the account
      const { error: accountError } = await supabase
        .from('accounts')
        .update({
          name: data.name,
          code: data.code
        })
        .eq('id', selectedSupplier.id);

      if (accountError) throw accountError;

      // 2. Update the supplier
      const { error: supplierError } = await supabase
        .from('suppliers')
        .update({
          siret: data.siret,
          email: data.email,
          phone: data.phone,
          address: data.address
        })
        .eq('account_id', selectedSupplier.id);

      if (supplierError) throw supplierError;

      toast.success('Fournisseur mis à jour avec succès');
      setIsSupplierFormOpen(false);
      fetchAccounts();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du fournisseur:', error);
      toast.error("Erreur lors de la mise à jour du fournisseur");
    }
  };

  const handleDeleteSupplier = async (supplier: SupplierAccount) => {
    const { error: deleteSupplierError } = await supabase
      .from('suppliers')
      .delete()
      .eq('account_id', supplier.id);

    if (deleteSupplierError) {
      throw deleteSupplierError;
    }

    const { error: deleteAccountError } = await supabase
      .from('accounts')
      .delete()
      .eq('id', supplier.id);

    if (deleteAccountError) {
      throw deleteAccountError;
    }

    // Recharger les données
    fetchAccounts();
  };

  const fetchSupplierDetails = async (accountId: string) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('account_id', accountId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du fournisseur:', error);
      return null;
    }
  };

  const handleOpenTreasuryForm = (account?: TreasuryAccount) => {
    setSelectedTreasuryAccount(account);
    setIsTreasuryFormOpen(true);
  };

  const handleCloseTreasuryForm = () => {
    setSelectedTreasuryAccount(undefined);
    setIsTreasuryFormOpen(false);
  };

  const handleOpenTreasuryDetails = (account: TreasuryAccount) => {
    setSelectedTreasuryAccount(account);
    setIsTreasuryDetailsOpen(true);
  };

  const handleCloseTreasuryDetails = () => {
    setSelectedTreasuryAccount(undefined);
    setIsTreasuryDetailsOpen(false);
  };

  const handleCreateTreasuryAccount = async (data: TreasuryFormData) => {
    try {
      // Créer d'abord le compte
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .insert([{
          name: data.name,
          code: data.code,
          type: 'TREASURY',
          account_type: 'TREASURY',
          club_id: user?.club?.id
        }])
        .select()
        .single();

      if (accountError) throw accountError;

      // La table treasury sera automatiquement mise à jour via le trigger
      // Mettre à jour les propriétés spécifiques à la trésorerie
      const { error: treasuryError } = await supabase
        .from('treasury')
        .update({
          accepts_external_payments: data.accepts_external_payments,
          can_group_sales: data.can_group_sales
        })
        .eq('account_id', accountData.id);

      if (treasuryError) throw treasuryError;

      toast.success('Compte de trésorerie créé avec succès');
      handleCloseTreasuryForm();
      fetchAccounts();
    } catch (error) {
      console.error('Error creating treasury account:', error);
      toast.error('Erreur lors de la création du compte de trésorerie');
    }
  };

  const handleUpdateTreasuryAccount = async (data: TreasuryFormData) => {
    if (!selectedTreasuryAccount) return;

    try {
      // Mettre à jour le compte
      const { error: accountError } = await supabase
        .from('accounts')
        .update({
          name: data.name,
          code: data.code
        })
        .eq('id', selectedTreasuryAccount.id);

      if (accountError) throw accountError;

      // Mettre à jour les propriétés de trésorerie
      const { error: treasuryError } = await supabase
        .from('treasury')
        .update({
          accepts_external_payments: data.accepts_external_payments,
          can_group_sales: data.can_group_sales
        })
        .eq('account_id', selectedTreasuryAccount.id);

      if (treasuryError) throw treasuryError;

      toast.success('Compte de trésorerie mis à jour avec succès');
      handleCloseTreasuryForm();
      fetchAccounts();
    } catch (error) {
      console.error('Error updating treasury account:', error);
      toast.error('Erreur lors de la mise à jour du compte de trésorerie');
    }
  };

  const handleDeleteTreasuryAccount = async (account: TreasuryAccount) => {
    try {
      // Supprimer le compte (la suppression de l'entrée treasury se fera en cascade)
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', account.id);

      if (error) throw error;

      toast.success('Compte de trésorerie supprimé avec succès');
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting treasury account:', error);
      toast.error('Erreur lors de la suppression du compte de trésorerie');
    }
  };

  useEffect(() => {
    if (user?.club?.id) {
      setLoading(true);
      Promise.all([
        fetchAccounts(),
        fetchJournalEntries()
      ]).finally(() => setLoading(false));
    }
  }, [user?.club?.id, selectedPeriod]);

  useEffect(() => {
    if (journalEntries.length > 0) {
      updateChartData(journalEntries);
    }
  }, [selectedPeriod, journalEntries]);

  useEffect(() => {
    if (accounts.length > 0) {
      const { startDate, endDate } = getDateRangeForPeriod();
      const updatedAccounts = accounts.map(account => {
        const { debit, credit } = calculateTotals(account.lines || [], startDate, endDate);
        return {
          ...account,
          balance: calculateAccountBalance(
            account.lines || [],
            account.account_type,
            startDate,
            endDate
          ),
          total_debit: debit,
          total_credit: credit
        };
      });
      setAccounts(updatedAccounts);
    }
  }, [selectedPeriod]);

  const handleCloseSupplierForm = () => {
    setSelectedSupplier(undefined);
    setIsSupplierFormOpen(false);
  };

  const handleOpenSupplierForm = (supplier?: SupplierAccount) => {
    setSelectedSupplier(supplier);
    setIsSupplierFormOpen(true);
  };

  const handleOpenSupplierDetails = (supplier: SupplierAccount) => {
    setSelectedSupplier(supplier);
    setIsSupplierDetailsOpen(true);
  };

  const handleCloseSupplierDetails = () => {
    setSelectedSupplier(undefined);
    setIsSupplierDetailsOpen(false);
  };

  // Afficher un message de chargement si l'utilisateur n'est pas encore chargé
  if (!user?.club?.id) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Chargement des informations de l'utilisateur...
        </Alert>
      </Box>
    );
  }

  const totals = getTotalsByType(accounts);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Comptabilité du club
      </Typography>

      {/* Période */}
      <FormControl sx={{ minWidth: 300, mb: 2 }}>
        <InputLabel>Période</InputLabel>
        <Select
          value={selectedPeriod}
          label="Période"
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          <MenuItem value="current-year">Année en cours</MenuItem>
          <MenuItem value="current-month">Mois en cours</MenuItem>
          <MenuItem value="last-3-months">3 derniers mois</MenuItem>
          <MenuItem value="last-6-months">6 derniers mois</MenuItem>
          <MenuItem value="last-12-months">12 derniers mois</MenuItem>
          <MenuItem value="previous-year">Année précédente</MenuItem>
          <MenuItem value="all">Toutes les transactions</MenuItem>
        </Select>
      </FormControl>

      {/* Cartes de résumé */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Building2 size={24} />
                <Typography variant="h6" sx={{ ml: 1 }}>Actifs</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                  .format(totals.assets)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Users size={24} />
                <Typography variant="h6" sx={{ ml: 1 }}>Passifs</Typography>
              </Box>
              <Typography variant="h4" color="error">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                  .format(totals.liabilities)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PiggyBank size={24} />
                <Typography variant="h6" sx={{ ml: 1 }}>Capitaux</Typography>
              </Box>
              <Typography variant="h4" color="success">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                  .format(totals.revenue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Wallet size={24} />
                <Typography variant="h6" sx={{ ml: 1 }}>Résultat</Typography>
              </Box>
              <Typography variant="h4" color={totals.revenue - totals.expenses >= 0 ? "success" : "error"}>
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                  .format(totals.revenue - totals.expenses)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Vue d'ensemble" />
          <Tab label="Détail des comptes" />
          <Tab label="Journal" />
          <Tab label="Fournisseurs" />
          <Tab label="Trésorerie" />
        </Tabs>

        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Évolution des Recettes et Dépenses</Typography>
            {chartData && (
              <Box sx={{ height: '400px' }}>
                <Bar 
                  data={chartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context: any) {
                            let label = context.dataset.label || '';
                            if (label) {
                              label += ': ';
                            }
                            if (context.parsed.y !== null) {
                              label += new Intl.NumberFormat('fr-FR', { 
                                style: 'currency', 
                                currency: 'EUR' 
                              }).format(context.parsed.y);
                            }
                            return label;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value: any) {
                            return new Intl.NumberFormat('fr-FR', { 
                              style: 'currency', 
                              currency: 'EUR',
                              maximumFractionDigits: 0
                            }).format(value);
                          }
                        }
                      }
                    }
                  }} 
                />
              </Box>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Actifs</Typography>
            <AccountTable accounts={accounts} type="ASSET" />
            
            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Passifs</Typography>
            <AccountTable accounts={accounts} type="LIABILITY" />
            
            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Produits</Typography>
            <AccountTable accounts={accounts} type="REVENUE" />
            
            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Charges</Typography>
            <AccountTable accounts={accounts} type="EXPENSE" />
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Journal des écritures</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Compte</TableCell>
                    <TableCell align="right">Débit</TableCell>
                    <TableCell align="right">Crédit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filterEntriesByPeriod(journalEntries).map((entry) => (
                    <React.Fragment key={entry.id}>
                      {entry.lines.map((line, lineIndex) => (
                        <TableRow 
                          key={`${entry.id}-${lineIndex}`}
                          sx={{
                            backgroundColor: line.accounts?.account_type === 'REVENUE' 
                              ? 'rgba(75, 192, 192, 0.1)'  // Vert clair pour les produits
                              : line.accounts?.account_type === 'EXPENSE'
                                ? 'rgba(255, 99, 132, 0.1)' // Rouge clair pour les charges
                                : 'inherit',
                            '&:hover': {
                              backgroundColor: line.accounts?.account_type === 'REVENUE'
                                ? 'rgba(75, 192, 192, 0.2)'
                                : line.accounts?.account_type === 'EXPENSE'
                                  ? 'rgba(255, 99, 132, 0.2)'
                                  : 'rgba(0, 0, 0, 0.04)'
                            }
                          }}
                        >
                          <TableCell>
                            {lineIndex === 0 && format(new Date(entry.transaction_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            {lineIndex === 0 && entry.description}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {line.accounts?.account_type === 'REVENUE' && (
                                <TrendingUp size={16} color="rgb(75, 192, 192)" />
                              )}
                              {line.accounts?.account_type === 'EXPENSE' && (
                                <TrendingDown size={16} color="rgb(255, 99, 132)" />
                              )}
                              {line.accounts?.name || line.accounts?.code}
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{
                            color: line.debit_amount > 0 ? 'error.main' : 'inherit'
                          }}>
                            {line.debit_amount > 0 && 
                              new Intl.NumberFormat('fr-FR', { 
                                style: 'currency', 
                                currency: 'EUR' 
                              }).format(line.debit_amount)
                            }
                          </TableCell>
                          <TableCell align="right" sx={{
                            color: line.credit_amount > 0 ? 'success.main' : 'inherit'
                          }}>
                            {line.credit_amount > 0 && 
                              new Intl.NumberFormat('fr-FR', { 
                                style: 'currency', 
                                currency: 'EUR' 
                              }).format(line.credit_amount)
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Ligne de séparation entre les écritures */}
                      <TableRow>
                        <TableCell colSpan={5} sx={{ p: 0 }}>
                          <Divider />
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {activeTab === 3 && (
          <>
            <SuppliersTab
              accounts={accounts}
              onCreateSupplier={() => handleOpenSupplierForm()}
              onEditSupplier={handleOpenSupplierForm}
              onViewSupplierDetails={handleOpenSupplierDetails}
              onDeleteSupplier={handleDeleteSupplier}
            />

            <SupplierForm
              open={isSupplierFormOpen}
              onClose={handleCloseSupplierForm}
              supplier={selectedSupplier}
              onSubmit={selectedSupplier ? handleUpdateSupplier : handleCreateSupplier}
            />

            {selectedSupplier && (
              <SupplierDetails
                open={isSupplierDetailsOpen}
                onClose={handleCloseSupplierDetails}
                supplier={selectedSupplier}
              />
            )}
          </>
        )}

        {activeTab === 4 && (
          <>
            <TreasuryTab
              accounts={accounts}
              onCreateAccount={() => handleOpenTreasuryForm()}
              onEditAccount={handleOpenTreasuryForm}
              onViewAccountDetails={handleOpenTreasuryDetails}
              onDeleteAccount={handleDeleteTreasuryAccount}
            />
            
            <TreasuryForm
              open={isTreasuryFormOpen}
              onClose={handleCloseTreasuryForm}
              onSubmit={selectedTreasuryAccount ? handleUpdateTreasuryAccount : handleCreateTreasuryAccount}
              initialData={selectedTreasuryAccount}
            />

            {selectedTreasuryAccount && (
              <TreasuryDetails
                open={isTreasuryDetailsOpen}
                onClose={handleCloseTreasuryDetails}
                account={selectedTreasuryAccount}
              />
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default SimpleAccountingView;
