import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import { format, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { PeriodFilter, DateRange } from './PeriodFilter';

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

interface AccountEntriesViewProps {
  accountId: string;
  startDate?: Date;
  endDate?: Date;
}

export const AccountEntriesView: React.FC<AccountEntriesViewProps> = ({ accountId, startDate: initialStartDate, endDate: initialEndDate }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('currentYear');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialStartDate || startOfYear(new Date()),
    endDate: initialEndDate || endOfYear(new Date())
  });

  const handlePeriodChange = (period: string, newDateRange: DateRange) => {
    setSelectedPeriod(period);
    setDateRange(newDateRange);
  };

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['accountEntries', accountId, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .eq('journal_entry_lines.accounts.id', accountId)
        .gte('transaction_date', format(dateRange.startDate, 'yyyy-MM-dd'))
        .lte('transaction_date', format(dateRange.endDate, 'yyyy-MM-dd'))
        .order('transaction_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (accountId) {
      // fetchAccountTransactions();
    }
  }, [accountId, selectedPeriod]);

  // Calculer le solde cumulé
  let runningBalance = 0;
  const transactionsWithBalance = [...entries].reverse().map(transaction => {
    const line = transaction.journal_entry_lines.find(line => line.account_id === accountId);
    if (line) {
      runningBalance += line.credit_amount - line.debit_amount;
    }
    return { ...transaction, balance: runningBalance };
  }).reverse();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Historique des transactions
        </Typography>
        <PeriodFilter
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
        />
      </Box>

      {entries.length === 0 ? (
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
              {transactionsWithBalance.map((transaction) => {
                const line = transaction.journal_entry_lines
                  .find(line => line.account_id === accountId);
                const debitAmount = line?.debit_amount || 0;
                const creditAmount = line?.credit_amount || 0;

                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', { locale: fr })}
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
                        .format(transaction.balance)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};
