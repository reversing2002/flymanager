import { useState } from 'react';
import { ShoppingBag, Edit2, Trash2, Plus, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import type { Product, NewProduct } from '../../types/shop';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const ShopSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'packs'>('products');

  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: '',
    price: 0,
    description: '',
    optional: false,
    type: 'product'
  });

  const [selectedProducts, setSelectedProducts] = useState<{id: number; quantity: number}[]>([]);

  // Récupération des produits simples (pour la sélection dans les packs)
  const { data: availableProducts = [] } = useQuery({
    queryKey: ['available-products', user?.club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('club_id', user?.club?.id)
        .eq('type', 'product')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.club?.id
  });

  // Récupération des produits ou packs selon l'onglet actif
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['items', user?.club?.id, activeTab],
    queryFn: async () => {
      console.log('Fetching items for tab:', activeTab);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_items!product_items_pack_id_fkey(
            quantity,
            product:products!product_items_product_id_fkey(
              id,
              name
            )
          )
        `)
        .eq('club_id', user?.club?.id)
        .eq('type', activeTab === 'products' ? 'product' : 'pack')
        .order('name');

      if (error) {
        console.error('Error fetching items:', error);
        throw error;
      }
      console.log('Items fetched:', data);
      return data || [];
    },
    enabled: !!user?.club?.id
  });

  // Filtrer les produits selon l'onglet actif
  const filteredItems = items;

  // Récupération des produits d'un pack
  const getPackProducts = async (packId: number) => {
    const { data, error } = await supabase
      .from('product_items')
      .select('*, product:products(*)')
      .eq('pack_id', packId);

    if (error) throw error;
    return data || [];
  };

  // Mutation pour ajouter/modifier un produit ou pack
  const productMutation = useMutation({
    mutationFn: async (variables: { product: NewProduct; id?: number }) => {
      const { product, id } = variables;
      console.log('Mutating product:', { product, id });
      
      if (id) {
        // Mise à jour du produit/pack
        const { error } = await supabase
          .from('products')
          .update(product)
          .eq('id', id);
        if (error) throw error;

        // Si c'est un pack, mettre à jour les produits inclus
        if (product.type === 'pack') {
          // Supprimer les anciens produits du pack
          const { error: deleteError } = await supabase
            .from('product_items')
            .delete()
            .eq('pack_id', id);
          if (deleteError) throw deleteError;

          // Ajouter les nouveaux produits
          if (selectedProducts.length > 0) {
            const { error: insertError } = await supabase
              .from('product_items')
              .insert(selectedProducts.map(p => ({
                pack_id: id,
                product_id: p.id,
                quantity: p.quantity
              })));
            if (insertError) throw insertError;
          }
        }
      } else {
        // Création d'un nouveau produit/pack
        const { data, error } = await supabase
          .from('products')
          .insert([{
            ...product,
            club_id: user?.club?.id
          }])
          .select()
          .single();
        if (error) throw error;

        // Si c'est un pack, ajouter les produits inclus
        if (product.type === 'pack' && data) {
          if (selectedProducts.length > 0) {
            const { error: insertError } = await supabase
              .from('product_items')
              .insert(selectedProducts.map(p => ({
                pack_id: data.id,
                product_id: p.id,
                quantity: p.quantity
              })));
            if (insertError) throw insertError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', user?.club?.id, activeTab] });
      toast.success(editingProduct ? "Produit mis à jour avec succès" : "Produit ajouté avec succès");
      setIsDialogOpen(false);
      setEditingProduct(null);
      setSelectedProducts([]);
      setNewProduct({
        name: '',
        price: 0,
        description: '',
        optional: false,
        type: activeTab === 'products' ? 'product' : 'pack'
      });
    },
    onError: (error) => {
      console.error('Error mutating product:', error);
      toast.error("Une erreur est survenue lors de l'opération");
    }
  });

  // Charger les produits du pack lors de l'édition
  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price,
      description: product.description || '',
      optional: product.optional,
      type: product.type
    });

    if (product.type === 'pack') {
      try {
        const packProducts = await getPackProducts(product.id);
        setSelectedProducts(packProducts.map(item => ({
          id: item.product_id,
          quantity: item.quantity
        })));
      } catch (error) {
        console.error('Error loading pack products:', error);
        toast.error("Erreur lors du chargement des produits du pack");
      }
    }

    setIsDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('Deleting product:', id);
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', user?.club?.id, activeTab] });
      toast.success("Produit supprimé avec succès");
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error("Erreur lors de la suppression du produit");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    productMutation.mutate({
      product: newProduct,
      id: editingProduct?.id
    });
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) return;
    deleteMutation.mutate(id);
  };

  console.log('Rendering with:', { 
    isLoading, 
    error, 
    itemsCount: items.length,
    activeTab 
  });

  if (error) {
    return <div className="text-red-500">Erreur lors du chargement des produits</div>;
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Gestion de la Boutique</h2>
        <button
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={() => {
            console.log('Add button clicked');
            setEditingProduct(null);
            setNewProduct({
              name: '',
              price: 0,
              description: '',
              optional: false,
              type: activeTab === 'products' ? 'product' : 'pack'
            });
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Ajouter un {activeTab === 'products' ? 'produit' : 'pack'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'products'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('products')}
          >
            Produits
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'packs'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('packs')}
          >
            Packs
          </button>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun {activeTab === 'products' ? 'produit' : 'pack'}</h3>
            <p className="mt-1 text-sm text-gray-500">Commencez par ajouter un {activeTab === 'products' ? 'produit' : 'pack'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Optionnel</th>
                    {activeTab === 'packs' && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produits inclus</th>
                    )}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.price} €</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.optional ? "Oui" : "Non"}
                      </td>
                      {activeTab === 'packs' && (
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <ul className="list-disc list-inside">
                            {item.product_items?.map((pi: any) => (
                              <li key={pi.product.id}>
                                {pi.quantity}x {pi.product.name}
                              </li>
                            ))}
                          </ul>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(item.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg p-6 w-full max-w-md">
            <Dialog.Title className="text-lg font-medium mb-4">
              {editingProduct ? 'Modifier le' : 'Ajouter un'} {activeTab === 'products' ? 'produit' : 'pack'}
            </Dialog.Title>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Prix (€)</label>
                <input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  rows={3}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newProduct.optional}
                  onChange={(e) => setNewProduct({ ...newProduct, optional: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">Optionnel</label>
              </div>

              {activeTab === 'packs' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Produits inclus</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                    {availableProducts.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedProducts.some(p => p.id === product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, { id: product.id, quantity: 1 }]);
                            } else {
                              setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="flex-grow text-sm">{product.name}</span>
                        {selectedProducts.some(p => p.id === product.id) && (
                          <input
                            type="number"
                            min="1"
                            value={selectedProducts.find(p => p.id === product.id)?.quantity || 1}
                            onChange={(e) => {
                              const quantity = parseInt(e.target.value) || 1;
                              setSelectedProducts(selectedProducts.map(p =>
                                p.id === product.id ? { ...p, quantity } : p
                              ));
                            }}
                            className="w-16 text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Annuler
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingProduct ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
            <Dialog.Close asChild>
              <button
                className="absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-full p-1 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default ShopSettings;
