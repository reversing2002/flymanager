import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import { Star, Edit2 } from "lucide-react";
import type { FlightType, AccountingCategory } from "../../types/database";
import { useAuth } from "../../contexts/AuthContext";
import { getFlightTypes, createFlightType, updateFlightType, deleteFlightType } from "../../lib/queries/flightTypes";

interface EditModalProps {
  flightType: FlightType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedType: Partial<FlightType>) => Promise<void>;
  accountingCategories: AccountingCategory[];
}

const EditModal: React.FC<EditModalProps> = ({ flightType, isOpen, onClose, onSave, accountingCategories }) => {
  const [editedType, setEditedType] = useState(flightType);

  useEffect(() => {
    setEditedType(flightType);
  }, [flightType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { is_system, ...updateData } = editedType;
    await onSave(updateData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Modifier le type de vol</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700">
              Nom
            </label>
            <input
              type="text"
              id="edit-name"
              value={editedType.name}
              onChange={(e) => setEditedType(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="edit-code" className="block text-sm font-medium text-slate-700">
              Code
            </label>
            <input
              type="text"
              id="edit-code"
              value={editedType.code}
              onChange={(e) => setEditedType(prev => ({ ...prev, code: e.target.value }))}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <input
              type="text"
              id="edit-description"
              value={editedType.description || ""}
              onChange={(e) => setEditedType(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="edit-requires-instructor"
                checked={editedType.requires_instructor}
                onChange={(e) => setEditedType(prev => ({ ...prev, requires_instructor: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <label
                htmlFor="edit-requires-instructor"
                className="ml-2 block text-sm text-slate-700"
              >
                Instructeur requis
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-accounting-category"
              className="block text-sm font-medium text-slate-700"
            >
              Catégorie comptable
            </label>
            <select
              id="edit-accounting-category"
              value={editedType.accounting_category_id}
              onChange={(e) => setEditedType(prev => ({ ...prev, accounting_category_id: e.target.value }))}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            >
              <option value="">Sélectionner une catégorie</option>
              {accountingCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface FlightType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  requires_instructor: boolean;
  is_default: boolean;
  display_order: number;
  accounting_category_id: string;
  club_id: string;
  is_system: boolean;
}

const FlightTypeManager = () => {
  const { user } = useAuth();
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const [editingType, setEditingType] = useState<FlightType | null>(null);
  const [accountingCategories, setAccountingCategories] = useState<AccountingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFlightType, setNewFlightType] = useState({
    name: "",
    code: "",
    description: "",
    requires_instructor: false,
    accounting_category_id: "",
    is_default: false,
    club_id: user?.user_metadata?.club_id,
  });

  useEffect(() => {
    loadFlightTypes();
    loadAccountingCategories();
  }, []);

  const loadFlightTypes = async () => {
    try {
      const types = await getFlightTypes();
      setFlightTypes(types);
      setLoading(false);
    } catch (err) {
      console.error("Error loading flight types:", err);
      setError("Erreur lors du chargement des types de vol");
      setLoading(false);
    }
  };

  const loadAccountingCategories = async () => {
    const { data, error } = await supabase
      .from("accounting_categories")
      .select("*")
      .order("display_order");

    if (error) {
      console.error("Error loading accounting categories:", error);
      toast.error("Erreur lors du chargement des catégories comptables");
      return;
    }

    setAccountingCategories(data || []);
  };

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
    if (!newFlightType.name.trim() || !user?.club?.id) return;

    try {
      // Si ce nouveau type est défini par défaut, on retire d'abord le statut par défaut des autres types
      if (newFlightType.is_default) {
        const { error } = await supabase
          .from("flight_types")
          .update({ is_default: false })
          .neq("id", "placeholder");
        if (error) throw error;
      }

      await createFlightType({
        name: newFlightType.name,
        code: newFlightType.code,
        description: newFlightType.description,
        requires_instructor: newFlightType.requires_instructor,
        accounting_category_id: newFlightType.accounting_category_id || null,
        display_order: flightTypes.length,
        is_default: newFlightType.is_default,
      }, user.club.id);

      setNewFlightType({
        name: "",
        code: "",
        description: "",
        requires_instructor: false, 
        accounting_category_id: "",
        is_default: false,
        club_id: user?.club?.id,
      });
      loadFlightTypes();
      toast.success("Type de vol créé avec succès");
    } catch (err) {
      console.error("Error creating flight type:", err);
      toast.error("Erreur lors de la création du type de vol");
    }
  };

  const handleUpdateType = async (updatedType: Partial<FlightType>) => {
    try {
      if (!user?.club?.id) {
        toast.error("Erreur: club_id manquant");
        return;
      }
      
      await updateFlightType(updatedType.id!, updatedType, user.club.id);
      toast.success("Type de vol mis à jour");
      loadFlightTypes();
    } catch (err) {
      console.error("Error updating flight type:", err);
      toast.error("Erreur lors de la mise à jour du type de vol");
    }
  };

  const handleDeleteType = async (id: string) => {
    try {
      await deleteFlightType(id);
      toast.success("Type de vol supprimé");
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
            <label htmlFor="code" className="block text-sm font-medium text-slate-700">
              Code
            </label>
            <input
              type="text"
              id="code"
              value={newFlightType.code}
              onChange={(e) =>
                setNewFlightType((prev) => ({ ...prev, code: e.target.value }))
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

          <div className="flex items-center gap-4">
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

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                checked={newFlightType.is_default}
                onChange={(e) =>
                  setNewFlightType((prev) => ({
                    ...prev,
                    is_default: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <label
                htmlFor="is_default"
                className="ml-2 block text-sm text-slate-700"
              >
                Type par défaut
              </label>
            </div>
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
              value={newFlightType.accounting_category_id}
              onChange={(e) =>
                setNewFlightType((prev) => ({
                  ...prev,
                  accounting_category_id: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            >
              <option value="">Sélectionner une catégorie</option>
              {accountingCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            Ajouter
          </button>
        </div>
      </form>

      {/* Liste des types de vol */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="flight-types">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="bg-white rounded-lg border"
            >
              {flightTypes.map((type, index) => (
                <Draggable key={type.id} draggableId={type.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="p-4 border-b last:border-b-0 hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">
                              {type.name}
                            </span>
                            {type.description && (
                              <span className="text-sm text-slate-500">
                                {type.description}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {type.is_default ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-sky-50 text-sky-700 rounded-lg">
                              <Star className="h-4 w-4" />
                              <span className="text-sm">Par défaut</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleUpdateType({ id: type.id, is_default: true })}
                              className="flex items-center gap-1 px-2 py-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                              title="Définir comme type par défaut"
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          )}
                          {!type.is_system && (
                            <>
                              <button
                                onClick={() => setEditingType(type)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                                title="Modifier"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteType(type.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {editingType && (
        <EditModal
          flightType={editingType}
          isOpen={!!editingType}
          onClose={() => setEditingType(null)}
          onSave={handleUpdateType}
          accountingCategories={accountingCategories}
        />
      )}
    </div>
  );
};

export default FlightTypeManager;
