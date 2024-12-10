import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import { Star, Edit2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface AccountingCategory {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  display_order: number;
  is_club_paid: boolean;
  club_id: string;
  is_system: boolean;
}

interface EditModalProps {
  category: AccountingCategory;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCategory: Partial<AccountingCategory>) => Promise<void>;
}

const EditModal: React.FC<EditModalProps> = ({ category, isOpen, onClose, onSave }) => {
  const [editedCategory, setEditedCategory] = useState(category);

  useEffect(() => {
    setEditedCategory(category);
  }, [category]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(editedCategory);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Modifier la catégorie comptable</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700">
              Nom
            </label>
            <input
              type="text"
              id="edit-name"
              value={editedCategory.name}
              onChange={(e) => setEditedCategory(prev => ({ ...prev, name: e.target.value }))}
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
              value={editedCategory.description || ""}
              onChange={(e) => setEditedCategory(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="edit-is-club-paid"
              checked={editedCategory.is_club_paid}
              onChange={(e) => setEditedCategory(prev => ({ ...prev, is_club_paid: e.target.checked }))}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
            />
            <label htmlFor="edit-is-club-paid" className="ml-2 block text-sm text-slate-700">
              Vol payé par le club
            </label>
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

const AccountingCategoryManager = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<AccountingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<AccountingCategory | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    is_club_paid: false,
  });

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("accounting_categories")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error("Error loading accounting categories:", err);
      setError("Erreur lors du chargement des catégories comptables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index,
    }));

    setCategories(updatedItems);

    try {
      for (const item of updatedItems) {
        const { error } = await supabase
          .from("accounting_categories")
          .update({ display_order: item.display_order })
          .eq("id", item.id);

        if (error) throw error;
      }

      toast.success("Ordre mis à jour avec succès");
    } catch (err) {
      console.error("Error updating order:", err);
      toast.error("Erreur lors de la mise à jour de l'ordre");
      loadCategories();
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim() || !user.club) return;

    try {
      const { data, error } = await supabase.from("accounting_categories").insert([
        {
          name: newCategory.name,
          description: newCategory.description || null,
          is_default: false,
          is_club_paid: newCategory.is_club_paid,
          display_order: categories.length,
          club_id: user.club.id,
          is_system: false,
        },
      ]);

      if (error) throw error;
      toast.success("Catégorie comptable ajoutée avec succès");
      setNewCategory({ 
        name: "", 
        description: "", 
        is_club_paid: false,
      });
      loadCategories();
    } catch (err) {
      console.error("Error adding accounting category:", err);
      toast.error("Erreur lors de l'ajout de la catégorie comptable");
    }
  };

  const handleEditCategory = async (updatedCategory: Partial<AccountingCategory>) => {
    try {
      const { error } = await supabase
        .from("accounting_categories")
        .update(updatedCategory)
        .eq("id", updatedCategory.id);

      if (error) throw error;

      toast.success("Catégorie comptable modifiée avec succès");
      loadCategories();
    } catch (err) {
      console.error("Error updating accounting category:", err);
      toast.error("Erreur lors de la modification de la catégorie comptable");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette catégorie comptable ?")) return;

    try {
      // Trouver la catégorie par défaut
      const { data: defaultCategory, error: defaultCategoryError } = await supabase
        .from("accounting_categories")
        .select("id")
        .eq("is_default", true)
        .single();

      if (defaultCategoryError) throw defaultCategoryError;
      if (!defaultCategory) {
        toast.error("Aucune catégorie comptable par défaut n'est définie");
        return;
      }

      // Mettre à jour les types de vol qui utilisent cette catégorie
      const { error: updateError } = await supabase
        .from("flight_types")
        .update({ accounting_category_id: defaultCategory.id })
        .eq("accounting_category_id", id);

      if (updateError) throw updateError;

      // Supprimer la catégorie
      const { error: deleteError } = await supabase
        .from("accounting_categories")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      toast.success("Catégorie comptable supprimée avec succès");
      loadCategories();
    } catch (err) {
      console.error("Error deleting accounting category:", err);
      toast.error("Erreur lors de la suppression de la catégorie comptable");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from("accounting_categories")
        .update({ is_default: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (updateError) throw updateError;

      const { error } = await supabase
        .from("accounting_categories")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;

      toast.success("Catégorie comptable définie par défaut");
      loadCategories();
    } catch (err) {
      console.error("Error setting default accounting category:", err);
      toast.error("Erreur lors de la définition de la catégorie comptable par défaut");
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
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Ajouter une catégorie comptable</h2>
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Nom
            </label>
            <input
              type="text"
              id="name"
              value={newCategory.name}
              onChange={(e) =>
                setNewCategory((prev) => ({ ...prev, name: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <input
              type="text"
              id="description"
              value={newCategory.description}
              onChange={(e) =>
                setNewCategory((prev) => ({
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
              id="is-club-paid"
              checked={newCategory.is_club_paid}
              onChange={(e) =>
                setNewCategory((prev) => ({
                  ...prev,
                  is_club_paid: e.target.checked,
                }))
              }
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
            />
            <label htmlFor="is-club-paid" className="ml-2 block text-sm text-slate-700">
              Vol payé par le club
            </label>
          </div>

          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="accounting-categories">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="bg-white rounded-lg border"
            >
              {categories.map((category) => (
                <Draggable key={category.id} draggableId={category.id} index={categories.indexOf(category)}>
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
                              {category.name}
                            </span>
                            {category.description && (
                              <span className="text-sm text-slate-500">
                                {category.description}
                              </span>
                            )}
                            <div className="flex items-center mt-1">
                              <span className={`text-xs ${category.is_club_paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {category.is_club_paid ? 'Payé par le club' : 'Payé par le pilote'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!category.is_system && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingCategory(category)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                                title="Modifier"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                Supprimer
                              </button>
                            </div>
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

      {editingCategory && (
        <EditModal
          category={editingCategory}
          isOpen={!!editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={handleEditCategory}
        />
      )}
    </div>
  );
};

export default AccountingCategoryManager;
