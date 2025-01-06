import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
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
  ArrowDownUp
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
  accounts: any[];
  type: string;
}

const AccountTable = ({ accounts, type }: AccountTableProps) => {
  const filteredAccounts = accounts.filter(a => a.account_type === type);
  
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
          {filteredAccounts.map((account) => (
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
                <Typography color={account.balance >= 0 ? 'success.main' : 'error.main'}>
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                    .format(account.balance || 0)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
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
              <Typography color={filteredAccounts.reduce((sum, a) => sum + (a.balance || 0), 0) >= 0 ? 'success.main' : 'error.main'}>
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                  .format(filteredAccounts.reduce((sum, a) => sum + (a.balance || 0), 0))}
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
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);

  const calculateAccountBalance = (lines: any[], accountType: string) => {
    if (!lines) return 0;
    
    return lines.reduce((sum, line) => {
      // Pour les comptes de passif, produits et comptes utilisateurs, on inverse la logique
      const multiplier = ['LIABILITY', 'INCOME', 'USER_ACCOUNT'].includes(accountType) ? -1 : 1;
      return sum + multiplier * ((line.debit_amount || 0) - (line.credit_amount || 0));
    }, 0);
  };

  const getTotalsByType = (accounts: AccountBalance[]) => {
    return accounts.reduce((totals, account) => {
      const balance = account.balance || 0;
      
      if (account.account_type === 'ASSET') {
        totals.assets += balance;
      } else if (account.account_type === 'LIABILITY' || account.account_type === 'USER_ACCOUNT') {
        totals.liabilities += balance;
      } else if (account.account_type === 'EQUITY') {
        totals.equity += balance;
      } else if (account.account_type === 'INCOME') {
        totals.income += balance;
      }
      
      return totals;
    }, {
      assets: 0,
      liabilities: 0,
      equity: 0,
      income: 0
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

          const total_debit = lines?.reduce((sum, line) => sum + (line.debit_amount || 0), 0) || 0;
          const total_credit = lines?.reduce((sum, line) => sum + (line.credit_amount || 0), 0) || 0;
          const balance = calculateAccountBalance(lines, account.account_type);

          return { 
            ...account, 
            balance,
            total_debit,
            total_credit
          };
        })
      );

      setAccounts(accountsWithBalances);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error("Erreur lors du chargement des comptes");
    }
  };

  const updateChartData = (entries: JournalEntry[]) => {
    const monthlyData: { [key: string]: { income: number; expense: number } } = {};

    // Trier les entrées par date décroissante
    const sortedEntries = entries.sort((a, b) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );

    sortedEntries.forEach(entry => {
      const month = format(new Date(entry.transaction_date), 'MMM yyyy', { locale: fr });
      
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0 };
      }

      entry.lines.forEach(line => {
        if (line.debit_amount > 0) {
          monthlyData[month].expense += line.debit_amount;
        }
        if (line.credit_amount > 0) {
          monthlyData[month].income += line.credit_amount;
        }
      });
    });

    // Trier les mois chronologiquement
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
      const dateA = new Date(a.split(' ')[1], fr.months.indexOf(a.split(' ')[0]));
      const dateB = new Date(b.split(' ')[1], fr.months.indexOf(b.split(' ')[0]));
      return dateA.getTime() - dateB.getTime();
    });

    setChartData({
      labels: sortedMonths,
      datasets: [
        {
          label: 'Recettes',
          data: sortedMonths.map(month => monthlyData[month].income),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1
        },
        {
          label: 'Dépenses',
          data: sortedMonths.map(month => monthlyData[month].expense),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1
        }
      ]
    });
  };

  useEffect(() => {
    if (user?.club?.id) {
      setLoading(true);
      Promise.all([fetchAccounts(), fetchJournalEntries()])
        .finally(() => setLoading(false));
    }
  }, [user?.club?.id]);

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
        Comptabilité Simplifiée
      </Typography>

      {/* Période */}
      <FormControl sx={{ minWidth: 200, mb: 2 }}>
        <InputLabel>Période</InputLabel>
        <Select
          value={selectedPeriod}
          label="Période"
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
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
                  .format(totals.equity)}
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
              <Typography variant="h4" color={totals.income >= 0 ? "success" : "error"}>
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                  .format(totals.income)}
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
                    scales: {
                      y: {
                        beginAtZero: true
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
            
            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Comptes Utilisateurs</Typography>
            <AccountTable accounts={accounts} type="USER_ACCOUNT" />
            
            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Produits</Typography>
            <AccountTable accounts={accounts} type="INCOME" />
          </Box>
        )}

        {activeTab === 2 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Montant</TableCell>
                  <TableCell>Détails</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {journalEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.transaction_date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell align="right">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                        .format(entry.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Table size="small">
                        <TableBody>
                          {entry.lines.map((line: any) => (
                            <TableRow key={line.id}>
                              <TableCell>{line.accounts.code} - {line.accounts.name}</TableCell>
                              <TableCell align="right">
                                {line.debit_amount ? 
                                  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(line.debit_amount) : 
                                  ''}
                              </TableCell>
                              <TableCell align="right">
                                {line.credit_amount ? 
                                  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(line.credit_amount) : 
                                  ''}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};

export default SimpleAccountingView;
