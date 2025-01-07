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
import React from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Box, FormControlLabel, Checkbox, TextField, IconButton, Typography } from '@mui/material';
import { AccountEntriesView } from './AccountEntriesView';
import { X } from 'lucide-react';

interface AccountBalance {
  id: string;
  name: string;
  code: string;
  accepts_external_payments: boolean;
  can_group_sales: boolean;
  balance: number;
  type: string;
  account_type: string;
}

interface TreasuryTabProps {
  accounts: AccountBalance[];
  onCreateTreasury?: () => void;
  onEditTreasury?: (account: AccountBalance) => void;
  onViewTreasuryDetails?: (account: AccountBalance) => void;
  onDeleteTreasury?: (account: AccountBalance) => void;
}

export const TreasuryTab = ({
  accounts,
  onCreateTreasury,
  onEditTreasury,
  onViewTreasuryDetails,
  onDeleteTreasury,
}: TreasuryTabProps) => {
  const { user } = useAuth();

  const treasuryAccounts = accounts.filter(account => 
    account.code.startsWith('512')
  ) as AccountBalance[];

  return (
    <Card>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Typography variant="h5" component="h2">Trésorerie</Typography>
          {onCreateTreasury && (
            <Button variant="contained" color="primary" onClick={onCreateTreasury}>
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
                      {onEditTreasury && (
                        <IconButton
                          size="small"
                          onClick={() => onEditTreasury(account)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {onViewTreasuryDetails && (
                        <IconButton
                          size="small"
                          onClick={() => onViewTreasuryDetails(account)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      )}
                      {onDeleteTreasury && (
                        <IconButton
                          size="small"
                          onClick={() => onDeleteTreasury(account)}
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
  initialData?: AccountBalance;
  onSubmit: (data: TreasuryFormData) => void;
  onClose: () => void;
  open: boolean;
}

export const TreasuryForm: React.FC<TreasuryFormProps> = ({
  initialData,
  onSubmit,
  onClose,
  open
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<TreasuryFormData>({
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      accepts_external_payments: initialData?.accepts_external_payments || false,
      can_group_sales: initialData?.can_group_sales || false,
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? 'Modifier le compte' : 'Nouveau compte de trésorerie'}
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom du compte"
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
              <FormControlLabel
                control={
                  <Checkbox
                    {...register('accepts_external_payments')}
                  />
                }
                label="Accepte les paiements externes"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    {...register('can_group_sales')}
                  />
                }
                label="Peut grouper les ventes"
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

interface TreasuryDetailsProps {
  open: boolean;
  onClose: () => void;
  treasury: AccountBalance;
  startDate?: Date;
  endDate?: Date;
}

export const TreasuryDetails = ({ open, onClose, treasury, startDate, endDate }: TreasuryDetailsProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Détails du compte de trésorerie</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">{treasury.name}</Typography>
          <Typography color="textSecondary">Code: {treasury.code}</Typography>
          <Typography color="textSecondary">IBAN: {treasury.iban || 'Non renseigné'}</Typography>
          <Typography color="textSecondary">BIC: {treasury.bic || 'Non renseigné'}</Typography>
        </Box>
        <AccountEntriesView 
          accountId={treasury.id} 
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
