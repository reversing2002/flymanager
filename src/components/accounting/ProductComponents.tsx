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

export interface ProductAccount extends AccountBalance {
  product_details?: {
    id: string;
    description?: string;
    category?: string;
    tax_rate?: number;
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

const productFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  code: z.string().min(1, "Le code est requis"),
  description: z.string().optional(),
  category: z.string().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: ProductAccount;
  onSubmit: (data: ProductFormData) => Promise<void>;
}

export const ProductForm = ({ open, onClose, product, onSubmit }: ProductFormProps) => {
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema)
  });

  React.useEffect(() => {
    const loadFormData = async () => {
      if (product) {
        reset({
          name: product.name,
          code: product.code,
          description: product.product_details?.description || '',
          category: product.product_details?.category || '',
          tax_rate: product.product_details?.tax_rate || 0,
        });
      } else {
        reset({
          name: '',
          code: '',
          description: '',
          category: '',
          tax_rate: 0,
        });
      }
      setLoading(false);
    };

    loadFormData();
  }, [product?.id]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {product ? 'Modifier le produit' : 'Nouveau produit'}
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
              <TextField
                {...register('category')}
                label="Catégorie"
                error={!!errors.category}
                helperText={errors.category?.message}
                fullWidth
              />
              <TextField
                {...register('tax_rate', { valueAsNumber: true })}
                label="Taux de TVA (%)"
                type="number"
                error={!!errors.tax_rate}
                helperText={errors.tax_rate?.message}
                fullWidth
                InputProps={{
                  inputProps: { min: 0, max: 100 }
                }}
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
            {product ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

interface ProductDetailsProps {
  open: boolean;
  onClose: () => void;
  product: ProductAccount;
  startDate?: Date;
  endDate?: Date;
}

export const ProductDetails = ({ open, onClose, product, startDate, endDate }: ProductDetailsProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Détails du produit</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">{product.name}</Typography>
          <Typography color="textSecondary">Code: {product.code}</Typography>
          {product.product_details?.description && (
            <Typography color="textSecondary">Description: {product.product_details.description}</Typography>
          )}
          {product.product_details?.category && (
            <Typography color="textSecondary">Catégorie: {product.product_details.category}</Typography>
          )}
          <Typography color="textSecondary">TVA: {product.product_details?.tax_rate || 0}%</Typography>
        </Box>
        <AccountEntriesView 
          accountId={product.id} 
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

interface ProductsTabProps {
  accounts: AccountBalance[];
  onCreateProduct: () => void;
  onEditProduct: (product: ProductAccount) => void;
  onViewProductDetails: (product: ProductAccount) => void;
  onDeleteProduct: (product: ProductAccount) => Promise<void>;
}

export const ProductsTab = ({ 
  accounts, 
  onCreateProduct, 
  onEditProduct, 
  onViewProductDetails,
  onDeleteProduct 
}: ProductsTabProps) => {
  const productAccounts = accounts.filter(account => 
    account.code.startsWith('706') || account.code.startsWith('707')
  ) as ProductAccount[];

  const { data: productDetails = {}, isLoading } = useQuery({
    queryKey: ['products', productAccounts.map(s => s.id)],
    queryFn: async () => {
      if (productAccounts.length === 0) return {};
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('account_id', productAccounts.map(s => s.id));

      if (error) throw error;

      return (data || []).reduce((acc, product) => ({
        ...acc,
        [product.account_id]: {
          id: product.id,
          description: product.description,
          category: product.category,
          tax_rate: product.tax_rate
        }
      }), {});
    },
    enabled: productAccounts.length > 0
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<ProductAccount | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteClick = (product: ProductAccount) => {
    setSelectedProduct(product);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;
    
    setIsDeleting(true);
    try {
      await onDeleteProduct(selectedProduct);
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
          onClick={onCreateProduct}
        >
          Nouveau produit
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell>Catégorie</TableCell>
              <TableCell>TVA</TableCell>
              <TableCell align="right">Solde</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productAccounts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.code}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>
                  {productDetails[product.id]?.category || '-'}
                </TableCell>
                <TableCell>
                  {productDetails[product.id]?.tax_rate ? 
                    `${productDetails[product.id].tax_rate}%` : '-'}
                </TableCell>
                <TableCell align="right">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                    .format(product.balance)}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => onViewProductDetails(product)}
                  >
                    <Eye size={16} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onEditProduct(product)}
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
            Êtes-vous sûr de vouloir supprimer ce produit ?
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
