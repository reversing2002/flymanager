import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import type { FlightType } from "../../types/database";

const FlightTypeManager = () => {
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFlightType, setNewFlightType] = useState({
    name: "",
    description: "",
    requires_instructor: false,
    accounting_category: "LOCAL",
  });

  const loadFlightTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("flight_types")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setFlightTypes(data || []);
    } catch (err) {
      console.error("Error loading flight types:", err);
      setError("Erreur lors du chargement des types de vol");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlightTypes();
  }, []);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(flightTypes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display order
    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index,
    }));

    setFlightTypes(updatedItems);

    try {
      // Mise à jour de l'ordre d'affichage en utilisant une requête UPDATE
      for (const item of updatedItems) {
        const { error } = await supabase
          .from("flight_types")
          .update({ display_order: item.display_order })
          .eq("id", item.id);

        if (error) throw error;
      }

      toast.success("Ordre mis à jour avec succès");
    } catch (err) {
      console.error("Error updating order:", err);
      toast.error("Erreur lors de la mise à jour de l'ordre");
      loadFlightTypes(); // Reload original order
    }
  };

  const handleAddFlightType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlightType.name.trim()) return;

    try {
      const { data, error } = await supabase.from("flight_types").insert([
        {
          name: newFlightType.name,
          description: newFlightType.description || null,
          requires_instructor: newFlightType.requires_instructor,
          accounting_category: newFlightType.accounting_category,
          display_order: flightTypes.length,
        },
      ]);

      if (error) throw error;
      toast.success("Type de vol ajouté avec succès");
      setNewFlightType({ 
        name: "", 
        description: "", 
        requires_instructor: false, 
        accounting_category: "LOCAL" 
      });
      loadFlightTypes();
    } catch (err) {
      console.error("Error adding flight type:", err);
      toast.error("Erreur lors de l'ajout du type de vol");
    }
  };

  const handleDeleteFlightType = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce type de vol ?")) return;

    try {
      const { error } = await supabase.from("flight_types").delete().eq("id", id);

      if (error) throw error;
      toast.success("Type de vol supprimé avec succès");
      loadFlightTypes();
    } catch (err) {
      console.error("Error deleting flight type:", err);
      toast.error("Erreur lors de la suppression du type de vol");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulaire d'ajout */}
      <form onSubmit={handleAddFlightType} className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4">Ajouter un type de vol</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Nom
            </label>
            <input
              type="text"
              id="name"
              value={newFlightType.name}
              onChange={(e) =>
                setNewFlightType((prev) => ({ ...prev, name: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <input
              type="text"
              id="description"
              value={newFlightType.description}
              onChange={(e) =>
                setNewFlightType((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requires_instructor"
              checked={newFlightType.requires_instructor}
              onChange={(e) =>
                setNewFlightType((prev) => ({
                  ...prev,
                  requires_instructor: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <label
              htmlFor="requires_instructor"
              className="ml-2 block text-sm text-slate-700"
            >
              Instructeur requis
            </label>
          </div>

          <div>
            <label
              htmlFor="accounting_category"
              className="block text-sm font-medium text-slate-700"
            >
              Catégorie comptable
            </label>
            <select
              id="accounting_category"
              value={newFlightType.accounting_category}
              onChange={(e) =>
                setNewFlightType((prev) => ({
                  ...prev,
                  accounting_category: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            >
              <option value="LOCAL">Local</option>
              <option value="INSTRUCTION">Instruction</option>
              <option value="TRAVEL">Voyage</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 text-white py-2 px-4 rounded-lg hover:bg-sky-700 transition-colors"
          >
            Ajouter
          </button>
        </div>
      </form>

      {/* Liste des types de vol */}
      <div className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4">Types de vol existants</h3>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="flight-types">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {flightTypes.map((type, index) => (
                  <Draggable
                    key={type.id}
                    draggableId={type.id}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{type.name}</h4>
                          {type.description && (
                            <p className="text-sm text-slate-600">
                              {type.description}
                            </p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-2 py-1 rounded-full bg-sky-100 text-sky-800">
                              {type.accounting_category}
                            </span>
                            {type.requires_instructor && (
                              <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                                Instructeur requis
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFlightType(type.id)}
                          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          Supprimer
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
};

export default FlightTypeManager;
