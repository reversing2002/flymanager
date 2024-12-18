import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Plus, GripVertical, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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

export default function DiscoveryFlightSettings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState<DiscoveryFlightPrice | null>(null);
  const [features, setFeatures] = useState<DiscoveryFlightFeature[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const { user } = useAuth();
  const clubId = user?.club?.id;

  useEffect(() => {
    if (clubId) {
      fetchPrice();
      fetchFeatures();
    }
  }, [clubId]);

  const fetchPrice = async () => {
    if (!clubId) return;

    try {
      const { data, error } = await supabase
        .from('discovery_flight_prices')
        .select('*')
        .eq('club_id', clubId)
        .single();

      if (error) throw error;
      setPrice(data);
    } catch (error) {
      console.error('Error fetching discovery flight price:', error);
      toast.error('Impossible de charger le prix du vol découverte');
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
    } catch (error) {
      console.error('Error fetching discovery flight features:', error);
      toast.error('Impossible de charger les prestations');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clubId) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const values = {
      price: Number(formData.get('price')),
      duration: Number(formData.get('duration')),
      club_id: clubId,
      updated_at: new Date().toISOString(),
    };

    try {
      if (price) {
        // Update
        const { error } = await supabase
          .from('discovery_flight_prices')
          .update(values)
          .eq('id', price.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('discovery_flight_prices')
          .insert([values]);

        if (error) throw error;
      }

      toast.success('Prix du vol découverte mis à jour');
      fetchPrice();
    } catch (error) {
      console.error('Error saving discovery flight price:', error);
      setError('Impossible de mettre à jour le prix');
      toast.error('Erreur lors de la mise à jour du prix');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeature = async (e: React.FormEvent) => {
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

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-slate-900">Prix du vol découverte</h3>
        <p className="mt-1 text-sm text-slate-500">
          Configurez le prix et la durée du vol découverte pour votre club.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-200 rounded"></div>
            <div className="h-10 bg-slate-200 rounded"></div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prix (€)
              </label>
              <input
                type="number"
                name="price"
                required
                min="0"
                step="0.01"
                value={price?.price ?? ''}
                onChange={(e) => setPrice(prev => prev ? {...prev, price: Number(e.target.value)} : null)}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Durée (minutes)
              </label>
              <input
                type="number"
                name="duration"
                required
                min="0"
                value={price?.duration ?? ''}
                onChange={(e) => setPrice(prev => prev ? {...prev, duration: Number(e.target.value)} : null)}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </>
        )}
      </form>

      <div className="border-t pt-8">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Prestations incluses</h3>
        
        <form onSubmit={handleAddFeature} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Nouvelle prestation..."
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
                        <button
                          type="button"
                          onClick={() => handleDeleteFeature(feature.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
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
