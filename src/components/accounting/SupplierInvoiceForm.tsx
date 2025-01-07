import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Grid,
  IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { CloudUpload } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useAuth } from '../../contexts/AuthContext';

// Schéma de validation principal
const invoiceSchema = z.object({
  supplier_id: z.string().min(1, 'Le fournisseur est requis'),
  reference: z.string().min(1, 'La référence est requise'),
  transaction_date: z.date(),
  description: z.string().min(1, 'La description est requise'),
  total_amount: z.number().min(0.01, 'Le montant doit être supérieur à 0'),
  account_id: z.string().min(1, 'Le compte est requis'),
  file: z.any().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface SupplierInvoiceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => void;
}

export const SupplierInvoiceForm: React.FC<SupplierInvoiceFormProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      transaction_date: dayjs().toDate(),
      total_amount: 0,
    },
  });

  // Récupérer la liste des fournisseurs
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*, default_expense_account:accounts!default_expense_account_id(*)')
        .eq('type', 'SUPPLIER')
        .order('code');

      if (error) throw error;
      return data;
    },
  });

  // Récupérer la liste des comptes de charges
  const { data: expenseAccounts = [] } = useQuery({
    queryKey: ['expenseAccounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('club_id', user?.club?.id)
        .like('type', 'EXPENSE')
        .order('code');

      if (error) throw error;
      return data;
    },
  });

  // Surveiller les changements de fournisseur
  const supplierId = watch('supplier_id');
  useEffect(() => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setSelectedSupplier(supplier);
    if (supplier?.default_expense_account?.id) {
      setValue('account_id', supplier.default_expense_account.id);
    }
  }, [supplierId, suppliers, setValue]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleFormSubmit = async (data: InvoiceFormData) => {
    try {
      // Gérer l'upload du fichier
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;
        data.file = filePath;
      }

      // Créer les lignes d'écriture automatiquement
      const journalData = {
        ...data,
        lines: [
          {
            account_id: data.account_id,
            debit_amount: data.total_amount,
            credit_amount: 0,
            description: data.description
          },
          {
            account_id: data.supplier_id,
            debit_amount: 0,
            credit_amount: data.total_amount,
            description: data.description
          }
        ]
      };

      await onSubmit(journalData);
      setSelectedFile(null);
      onClose();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error("Erreur lors de l'enregistrement de la facture");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Saisie facture fournisseur</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2}>
            {/* Ligne 1: Date et Référence */}
            <Grid item xs={12} md={6}>
              <Controller
                name="transaction_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Date"
                    value={dayjs(field.value)}
                    onChange={(date) => field.onChange(date?.toDate())}
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.transaction_date,
                        helperText: errors.transaction_date?.message
                      }
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="reference"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="N° de facture"
                    fullWidth
                    error={!!errors.reference}
                    helperText={errors.reference?.message}
                  />
                )}
              />
            </Grid>

            {/* Ligne 2: Fournisseur */}
            <Grid item xs={12}>
              <Controller
                name="supplier_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.supplier_id}>
                    <InputLabel>Fournisseur</InputLabel>
                    <Select {...field} label="Fournisseur">
                      {suppliers.map((supplier) => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          {supplier.code} - {supplier.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.supplier_id && (
                      <Typography color="error" variant="caption">
                        {errors.supplier_id.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Ligne 3: Description */}
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={2}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Grid>

            {/* Ligne 4: Montant et Compte */}
            <Grid item xs={12} md={6}>
              <Controller
                name="total_amount"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Montant TTC"
                    type="number"
                    fullWidth
                    inputProps={{ step: "0.01" }}
                    error={!!errors.total_amount}
                    helperText={errors.total_amount?.message}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="account_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.account_id}>
                    <InputLabel>Compte de charges</InputLabel>
                    <Select {...field} label="Compte de charges">
                      {expenseAccounts.map((account) => (
                        <MenuItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.account_id && (
                      <Typography color="error" variant="caption">
                        {errors.account_id.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Ligne 5: Upload de fichier */}
            <Grid item xs={12}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                sx={{ mt: 1 }}
              >
                {selectedFile ? selectedFile.name : "Joindre la facture"}
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" color="primary">
            Enregistrer
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
