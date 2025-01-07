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
import { Add, DeleteOutline } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useAuth } from '../../contexts/AuthContext';

// Schéma de validation principal
const chargeLineSchema = z.object({
  account_id: z.string().min(1, 'Le compte est requis'),
  amount: z.number().min(0.01, 'Le montant doit être supérieur à 0'),
  description: z.string().optional(),
});

const invoiceSchema = z.object({
  supplier_id: z.string().min(1, 'Le fournisseur est requis'),
  reference: z.string().min(1, 'La référence est requise'),
  transaction_date: z.date(),
  description: z.string().min(1, 'La description est requise'),
  total_amount: z.number().min(0.01, 'Le montant doit être supérieur à 0'),
  account_id: z.string().optional(), // Rendu optionnel car remplacé par les lignes de ventilation
  charge_lines: z.array(chargeLineSchema)
    .refine(
      (lines) => lines.length > 0,
      "Au moins une ligne de ventilation est requise"
    ),
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
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  const { control, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      transaction_date: dayjs().toDate(),
      total_amount: 0,
      charge_lines: [{
        account_id: '',
        amount: 0,
        description: ''
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "charge_lines",
  });

  // Récupérer la liste des fournisseurs
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*, default_expense_account_id')
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
    console.log('Effect triggered with supplierId:', supplierId);
    if (!supplierId) return;
    
    const supplier = suppliers.find(s => s.id === supplierId);
    console.log('Found supplier:', supplier);
    setSelectedSupplier(supplier);
    
    if (supplier?.default_expense_account_id) {
      console.log('Default expense account ID:', supplier.default_expense_account_id);
      
      // Réinitialiser le formulaire avec les nouvelles valeurs
      const currentValues = watch();
      const newValues = {
        ...currentValues,
        charge_lines: [{
          account_id: supplier.default_expense_account_id,
          amount: currentValues.total_amount || 0,
          description: currentValues.description || ''
        }]
      };
      
      console.log('Setting new values:', newValues);
      reset(newValues);
      
      // Forcer la mise à jour des champs individuels
      setValue('charge_lines.0.account_id', supplier.default_expense_account_id, {
        shouldValidate: true,
        shouldDirty: true
      });
      
      if (currentValues.total_amount) {
        setValue('charge_lines.0.amount', currentValues.total_amount, {
          shouldValidate: true,
          shouldDirty: true
        });
      }
      
      // Vérification après mise à jour
      console.log('Form values after update:', watch());
    }
  }, [supplierId, suppliers, reset, watch, setValue]);

  // Surveiller le montant total et les lignes pour la validation
  const totalAmount = watch('total_amount');
  const chargeLines = watch('charge_lines') || [];
  
  useEffect(() => {
    if (totalAmount > 0) {
      // Mettre à jour le montant de la première ligne
      setValue(`charge_lines.0.amount`, totalAmount, {
        shouldValidate: true,
      });
    }
  }, [totalAmount, setValue]);

  useEffect(() => {
    const total = chargeLines.reduce((sum, line) => sum + (line.amount || 0), 0);
    const ventilationTotal = total;
    const ventilationError = total > totalAmount ? 'Le total ventilé dépasse le montant de la facture' : total < totalAmount ? 'Le total ventilé est inférieur au montant de la facture' : '';
    console.log('Ventilation total:', ventilationTotal);
    console.log('Ventilation error:', ventilationError);
  }, [chargeLines, totalAmount]);

  useEffect(() => {
    if (totalAmount > 0 && chargeLines.length === 0) {
      append({
        account_id: watch('account_id') || '',
        amount: totalAmount,
        description: watch('description'),
      });
    }
  }, [totalAmount, append, watch]);

  const handleFormSubmit = async (data: InvoiceFormData) => {
    try {
      // Vérifier que la ventilation correspond au total
      const ventilationTotal = data.charge_lines.reduce((sum, line) => sum + (line.amount || 0), 0);
      if (Math.abs(ventilationTotal - data.total_amount) > 0.01) {
        toast.error('Le total ventilé doit être égal au montant de la facture');
        return;
      }

      const journalData = {
        ...data,
        lines: [
          ...data.charge_lines.map(line => ({
            account_id: line.account_id,
            debit_amount: line.amount,
            credit_amount: 0,
            description: line.description || data.description
          })),
          {
            account_id: data.supplier_id,
            debit_amount: 0,
            credit_amount: data.total_amount,
            description: data.description
          }
        ]
      };

      await onSubmit(journalData);
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

            {/* Ligne 4: Montant */}
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

            {/* Lignes de ventilation */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Ventilation des charges
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Total ventilé : {chargeLines.reduce((sum, line) => sum + (line.amount || 0), 0).toFixed(2)} €
              </Typography>
              {fields.map((field, index) => (
                <Box key={field.id} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Controller
                    name={`charge_lines.${index}.account_id`}
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.charge_lines?.[index]?.account_id}>
                        <InputLabel>Compte de charges</InputLabel>
                        <Select {...field} label="Compte de charges">
                          {expenseAccounts.map((account) => (
                            <MenuItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                  <Controller
                    name={`charge_lines.${index}.amount`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Montant"
                        type="number"
                        inputProps={{ step: "0.01" }}
                        error={!!errors.charge_lines?.[index]?.amount}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        sx={{ width: '200px' }}
                      />
                    )}
                  />
                  <Controller
                    name={`charge_lines.${index}.description`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Description"
                        fullWidth
                      />
                    )}
                  />
                  <IconButton 
                    onClick={() => remove(index)}
                    color="error"
                    sx={{ mt: 1 }}
                  >
                    <DeleteOutline />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                onClick={() => {
                  const remainingAmount = totalAmount - chargeLines.reduce((sum, line) => sum + (line.amount || 0), 0);
                  append({ 
                    account_id: '', 
                    amount: remainingAmount > 0 ? remainingAmount : 0,
                    description: '' 
                  });
                }}
                startIcon={<Add />}
                sx={{ mt: 1 }}
              >
                Ajouter une ligne
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
