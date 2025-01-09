import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { hasAnyGroup } from '../lib/permissions';
import { Link as RouterLink } from 'react-router-dom';

interface ClubStats {
  clubId: string;
  clubName: string;
  totalTransactions: number;
  totalAmount: number;
  commission: number;
  lastTransaction: string;
}

const ClubStatsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['clubStats', selectedPeriod],
    queryFn: async () => {
      if (!user || !hasAnyGroup(user, ['SYSTEM_ADMIN'])) {
        throw new Error('Accès non autorisé');
      }

      const { data, error } = await supabase
        .from('account_entries')
        .select(`
          id,
          amount,
          created_at,
          club_id,
          payment_method,
          is_validated,
          is_club_paid,
          clubs (
            id,
            name,
            commission_rate
          )
        `)
        .in('payment_method', ['CARD', 'TRANSFER'])
        .eq('is_validated', true)
        .gte(
          'created_at',
          selectedPeriod === 'month' 
            ? new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()
            : new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString()
        );

      if (error) throw error;

      const clubStats: { [key: string]: ClubStats } = {};

      data.forEach((entry: any) => {
        // Si club_id est null, on utilise une clé spéciale pour les transactions sans club
        const clubId = entry.club_id || 'sans-club';
        const clubName = entry.clubs?.name || 'Transactions sans club';
        const commissionRate = entry.clubs?.commission_rate || 3; // Taux par défaut de 3% si pas de club
        
        if (!clubStats[clubId]) {
          clubStats[clubId] = {
            clubId,
            clubName,
            totalTransactions: 0,
            totalAmount: 0,
            commission: 0,
            lastTransaction: entry.created_at,
          };
        }

        clubStats[clubId].totalTransactions += 1;
        clubStats[clubId].totalAmount += entry.amount;
        // Utilisation du taux de commission du club
        clubStats[clubId].commission += (entry.amount * commissionRate) / 100;
        
        if (new Date(entry.created_at) > new Date(clubStats[clubId].lastTransaction)) {
          clubStats[clubId].lastTransaction = entry.created_at;
        }
      });

      return Object.values(clubStats);
    }
  });

  const chartData = {
    labels: stats?.map(club => club.clubName) || [],
    datasets: [
      {
        label: 'Montant total des transactions (€)',
        data: stats?.map(club => club.totalAmount) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
      {
        label: 'Commission (€)',
        data: stats?.map(club => club.commission) || [],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  if (!user || !hasAnyGroup(user, ['SYSTEM_ADMIN'])) {
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

  return (
    <div className="p-6">
      <Typography variant="h4" className="mb-6">
        Statistiques des Clubs
      </Typography>

      <div className="flex justify-between items-center mb-6">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'year')}
          className="p-2 border rounded"
        >
          <option value="month">Dernier mois</option>
          <option value="year">Dernière année</option>
        </select>

        <Button
          component={RouterLink}
          to="/invoices"
          variant="contained"
          color="primary"
          className="ml-4"
        >
          Voir les factures
        </Button>
      </div>

      <div className="grid gap-6 mb-6 md:grid-cols-2">
        <Card className="p-4">
          <Typography variant="h6" className="mb-4">
            Aperçu Graphique
          </Typography>
          <Bar data={chartData} options={{ responsive: true }} />
        </Card>

        <Card className="p-4">
          <Typography variant="h6" className="mb-4">
            Statistiques Globales
          </Typography>
          <div className="space-y-4">
            <div>
              <Typography variant="subtitle2">Total des transactions</Typography>
              <Typography variant="h5">
                {stats?.reduce((acc, club) => acc + club.totalTransactions, 0)}
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Montant total</Typography>
              <Typography variant="h5">
                {stats?.reduce((acc, club) => acc + club.totalAmount, 0).toLocaleString('fr-FR')} €
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Total des commissions</Typography>
              <Typography variant="h5">
                {stats?.reduce((acc, club) => acc + club.commission, 0).toLocaleString('fr-FR')} €
              </Typography>
            </div>
          </div>
        </Card>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Club</TableCell>
              <TableCell align="right">Nombre de transactions</TableCell>
              <TableCell align="right">Montant total</TableCell>
              <TableCell align="right">Commission</TableCell>
              <TableCell>Dernière transaction</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats?.map((club) => (
              <TableRow key={club.clubId}>
                <TableCell>{club.clubName}</TableCell>
                <TableCell align="right">{club.totalTransactions}</TableCell>
                <TableCell align="right">{club.totalAmount.toLocaleString('fr-FR')} €</TableCell>
                <TableCell align="right">{club.commission.toLocaleString('fr-FR')} €</TableCell>
                <TableCell>
                  {format(new Date(club.lastTransaction), 'dd MMMM yyyy', { locale: fr })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default ClubStatsPage;
