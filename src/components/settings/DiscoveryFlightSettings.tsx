import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Plus, GripVertical, X, Edit2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { hasAnyGroup } from '../../lib/permissions';

interface DiscoveryFlightPrice {
  id: string;
  club_id: string;
  price: number;
  duration: number;
  created_at: string;
  updated_at: string;
}

interface DiscoveryFlightFeature {
  id: string;
  club_id: string;
  description: string;
  display_order: number;
}

interface PriceWithFeatures extends DiscoveryFlightPrice {
  selectedFeatures: DiscoveryFlightFeature[];
}

export default function DiscoveryFlightSettings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<PriceWithFeatures[]>([]);
  const [features, setFeatures] = useState<DiscoveryFlightFeature[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [expandedPrice, setExpandedPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState({ price: 0, duration: 30 });
  const [showNewPriceForm, setShowNewPriceForm] = useState(false);
  const { user } = useAuth();
  const clubId = user?.club?.id;
  const canEdit = hasAnyGroup(user, ['ADMIN']);

  useEffect(() => {
    if (clubId) {
      fetchFeatures().then(() => fetchPrices());
    }
  }, [clubId]);

  const fetchPrices = async () => {
    if (!clubId) return;

    try {
      // 1. Récupérer les prix de base
      const { data: pricesData, error: pricesError } = await supabase
        .from('discovery_flight_prices')
        .select(`
          id,
          club_id,
          price,
          duration,
          created_at,
          updated_at
        `)
        .eq('club_id', clubId)
        .order('price');

      if (pricesError) throw pricesError;

      // 2. Pour chaque prix, récupérer ses caractéristiques
      const pricesWithFeatures = await Promise.all((pricesData || []).map(async (price) => {
        const { data: featureData, error: featureError } = await supabase
          .from('discovery_flight_price_features')
          .select(`
            discovery_flight_features (
              id,
              club_id,
              description,
              display_order
            )
          `)
          .eq('price_id', price.id);

        if (featureError) throw featureError;

        return {
          ...price,
          selectedFeatures: featureData?.map(item => item.discovery_flight_features) || []
        };
      }));

      setPrices(pricesWithFeatures);
    } catch (error) {
      console.error('Error fetching discovery flight prices:', error);
      toast.error('Impossible de charger les prix des vols découverte');
    }
  };

  const handleAddPrice = async () => {
    if (!clubId || !canEdit) return;

    setLoading(true);
    try {
      const { data: newPriceData, error: insertError } = await supabase
        .from('discovery_flight_prices')
        .insert([{
          club_id: clubId,
          price: newPrice.price,
          duration: newPrice.duration,
        }])
        .select(`
          id,
          club_id,
          price,
          duration,
          created_at,
          updated_at
        `)
        .single();

      if (insertError) throw insertError;

      const priceWithFeatures = {
        ...newPriceData,
        selectedFeatures: []
      };

      setPrices(current => [...current, priceWithFeatures]);
      setShowNewPriceForm(false);
      setNewPrice({ price: 0, duration: 30 });
      setExpandedPrice(newPriceData.id);
      toast.success('Nouveau tarif ajouté');
    } catch (error) {
      console.error('Error adding price:', error);
      toast.error('Erreur lors de l\'ajout du tarif');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (priceId: string, values: Partial<DiscoveryFlightPrice>) => {
    if (!clubId || !canEdit) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('discovery_flight_prices')
        .update({
          price: values.price,
          duration: values.duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', priceId);

      if (error) throw error;

      setPrices(current => 
        current.map(p => 
          p.id === priceId 
            ? { ...p, price: values.price, duration: values.duration, updated_at: new Date().toISOString() }
            : p
        )
      );

      toast.success('Prix mis à jour');
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Erreur lors de la mise à jour du prix');
    } finally {
      setLoading(false);
      setEditingPrice(null);
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    if (!canEdit || !confirm('Êtes-vous sûr de vouloir supprimer ce tarif ?')) return;

    try {
      const { error } = await supabase
        .from('discovery_flight_prices')
        .delete()
        .eq('id', priceId);

      if (error) throw error;

      setPrices(prices.filter(p => p.id !== priceId));
      toast.success('Tarif supprimé');
    } catch (error) {
      console.error('Error deleting price:', error);
      toast.error('Erreur lors de la suppression du tarif');
    }
  };

  const handleToggleFeature = async (priceId: string, feature: DiscoveryFlightFeature) => {
    if (!canEdit) return;

    const price = prices.find(p => p.id === priceId);
    const hasFeature = price?.selectedFeatures.some(f => f.id === feature.id);

    try {
      if (hasFeature) {
        // Supprimer la caractéristique
        const { error } = await supabase
          .from('discovery_flight_price_features')
          .delete()
          .eq('price_id', priceId)
          .eq('feature_id', feature.id);

        if (error) throw error;

        // Mise à jour optimiste
        setPrices(current =>
          current.map(p =>
            p.id === priceId
              ? { ...p, selectedFeatures: p.selectedFeatures.filter(f => f.id !== feature.id) }
              : p
          )
        );
      } else {
        // Ajouter la caractéristique
        const { error } = await supabase
          .from('discovery_flight_price_features')
          .insert([{
            price_id: priceId,
            feature_id: feature.id
          }]);

        if (error) throw error;

        // Mise à jour optimiste
        setPrices(current =>
          current.map(p =>
            p.id === priceId
              ? { ...p, selectedFeatures: [...p.selectedFeatures, feature] }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Error toggling feature:', error);
      toast.error('Erreur lors de la mise à jour des caractéristiques');
      await fetchPrices(); // Recharger en cas d'erreur
    }
  };

  const handleAddFeature = async (e: React.FormEvent) => {
    if (!canEdit) return;

    e.preventDefault();
    if (!clubId || !newFeature.trim()) return;

    try {
      const { error } = await supabase
        .from('discovery_flight_features')
        .insert([{
          club_id: clubId,
          description: newFeature.trim(),
          display_order: features.length,
        }]);

      if (error) throw error;

      setNewFeature('');
      fetchFeatures();
      toast.success('Prestation ajoutée');
    } catch (error) {
      console.error('Error adding feature:', error);
      toast.error('Erreur lors de l\'ajout de la prestation');
    }
  };

  const handleDeleteFeature = async (id: string) => {
    if (!canEdit) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette prestation ?')) return;

    try {
      const { error } = await supabase
        .from('discovery_flight_features')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchFeatures();
      toast.success('Prestation supprimée');
    } catch (error) {
      console.error('Error deleting feature:', error);
      toast.error('Erreur lors de la suppression de la prestation');
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(features);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFeatures(items);

    // Update all display_order values
    try {
      // Mise à jour séquentielle pour éviter les problèmes de concurrence
      for (const [index, item] of items.entries()) {
        const { error } = await supabase
          .from('discovery_flight_features')
          .update({ display_order: index })
          .eq('id', item.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating feature order:', error);
      toast.error('Erreur lors de la mise à jour de l\'ordre');
      fetchFeatures(); // Reload original order
    }
  };

  const fetchFeatures = async () => {
    if (!clubId) return;

    try {
      const { data, error } = await supabase
        .from('discovery_flight_features')
        .select('*')
        .eq('club_id', clubId)
        .order('display_order');

      if (error) throw error;
      setFeatures(data || []);
      
      // Recharger les prix pour mettre à jour les associations
      await fetchPrices();
    } catch (error) {
      console.error('Error fetching discovery flight features:', error);
      toast.error('Impossible de charger les caractéristiques');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-slate-900">Tarifs des vols découverte</h2>
        {canEdit && (
          <button
            onClick={() => setShowNewPriceForm(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un tarif
          </button>
        )}
      </div>

      {showNewPriceForm && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-medium text-slate-900 mb-4">Nouveau tarif</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-price" className="block text-sm font-medium text-slate-700">
                Prix (€)
              </label>
              <input
                type="number"
                id="new-price"
                value={newPrice.price}
                onChange={(e) => setNewPrice(prev => ({ ...prev, price: Number(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="new-duration" className="block text-sm font-medium text-slate-700">
                Durée (minutes)
              </label>
              <input
                type="number"
                id="new-duration"
                value={newPrice.duration}
                onChange={(e) => setNewPrice(prev => ({ ...prev, duration: Number(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewPriceForm(false);
                  setNewPrice({ price: 0, duration: 30 });
                }}
                className="inline-flex items-center px-3 py-2 border border-slate-300 shadow-sm text-sm leading-4 font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddPrice}
                disabled={loading || newPrice.price <= 0 || newPrice.duration <= 0}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {prices.map((price) => (
        <div key={price.id} className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {editingPrice === price.id ? (
                  <>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.01"
                      value={price.price}
                      onChange={(e) => setPrices(prices.map(p =>
                        p.id === price.id ? { ...p, price: Number(e.target.value) } : p
                      ))}
                      className="w-24 rounded-lg border-slate-300"
                    />
                    <span>€</span>
                    <input
                      type="number"
                      min="15"
                      max="120"
                      value={price.duration}
                      onChange={(e) => setPrices(prices.map(p =>
                        p.id === price.id ? { ...p, duration: Number(e.target.value) } : p
                      ))}
                      className="w-24 rounded-lg border-slate-300"
                    />
                    <span>min</span>
                  </>
                ) : (
                  <div className="text-lg font-medium">
                    {price.price}€ - {price.duration} minutes
                  </div>
                )}
              </div>
              
              {canEdit && (
                <div className="flex items-center gap-2">
                  {editingPrice === price.id ? (
                    <button
                      onClick={() => handleUpdatePrice(price.id, price)}
                      className="p-1 text-sky-600 hover:text-sky-700"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingPrice(price.id)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeletePrice(price.id)}
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setExpandedPrice(expandedPrice === price.id ? null : price.id)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    {expandedPrice === price.id ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {expandedPrice === price.id && (
            <div className="border-t border-slate-200 p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Caractéristiques incluses</h4>
              <div className="space-y-2">
                {features.map((feature) => (
                  <label key={feature.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={price.selectedFeatures.some(f => f.id === feature.id)}
                      onChange={() => handleToggleFeature(price.id, feature)}
                      disabled={!canEdit}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm text-slate-600">{feature.description}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="border-t pt-8">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Liste des caractéristiques</h3>
        
        {canEdit && (
          <form onSubmit={handleAddFeature} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Nouvelle caractéristique..."
                className="flex-1 rounded-lg border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={!newFeature.trim()}
                className="inline-flex items-center gap-1 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            </div>
          </form>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="features">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {features.map((feature, index) => (
                  <Draggable
                    key={feature.id}
                    draggableId={feature.id}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200 shadow-sm"
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <span className="flex-1">{feature.description}</span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFeature(feature.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
