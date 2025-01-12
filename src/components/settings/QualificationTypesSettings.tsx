import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";

interface QualificationType {
  id: string;
  name: string;
  description: string | null;
  validity_period: number | null; // en mois
  requires_instructor_validation: boolean;
  display_order: number;
  club_id: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export default function QualificationTypesSettings() {
  const [types, setTypes] = useState<QualificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<QualificationType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  const clubId = user?.club?.id;

  useEffect(() => {
    if (clubId) {
      loadTypes();
    }
  }, [clubId]);

  const loadTypes = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("qualification_types")
        .select("*")
        .order("display_order");

      if (fetchError) throw fetchError;
      setTypes(data || []);
    } catch (err) {
      console.error("Erreur lors du chargement des types de qualification:", err);
      setError("Erreur lors du chargement des types de qualification");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    if (!clubId) {
      setError("Erreur: Club non trouvé");
      return;
    }
    
    try {
      if (editingType?.is_system) {
        toast.error("Les qualifications système ne peuvent pas être modifiées");
        return;
      }

      const qualificationData = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        validity_period: formData.get("validity_period") ? parseInt(formData.get("validity_period") as string) : null,
        requires_instructor_validation: formData.get("requires_instructor_validation") === "true",
        display_order: types.length,
        club_id: clubId,
      };

      if (editingType) {
        const { error: updateError } = await supabase
          .from("qualification_types")
          .update(qualificationData)
          .eq("id", editingType.id);

        if (updateError) throw updateError;
        toast.success("Type de qualification modifié");
      } else {
        const { error: insertError } = await supabase
          .from("qualification_types")
          .insert([{ ...qualificationData, is_system: false }]);

        if (insertError) throw insertError;
        toast.success("Type de qualification créé");
      }

      await loadTypes();
      setIsModalOpen(false);
      setEditingType(null);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err);
      setError("Erreur lors de l'enregistrement");
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (type: QualificationType) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce type de qualification ?")) return;
    
    try {
      const { error: deleteError } = await supabase
        .from("qualification_types")
        .delete()
        .eq("id", type.id);

      if (deleteError) throw deleteError;
      toast.success("Type de qualification supprimé");
      await loadTypes();
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError("Erreur lors de la suppression");
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Types de qualifications</h2>
        <button
          onClick={() => {
            setEditingType(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 text-amber-700 bg-amber-50 rounded-lg">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {types.map((type) => (
          <div
            key={type.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm"
          >
            <div className="space-y-1">
              <h3 className="font-medium">{type.name}</h3>
              {type.description && (
                <p className="text-sm text-slate-600">{type.description}</p>
              )}
              <div className="flex gap-4 text-sm text-slate-600">
                {type.validity_period && (
                  <span>Validité: {type.validity_period} mois</span>
                )}
                {type.requires_instructor_validation && (
                  <span>Validation instructeur requise</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingType(type);
                  setIsModalOpen(true);
                }}
                className="p-2 text-slate-600 hover:text-sky-600 rounded-lg"
                disabled={type.is_system}
                style={{ opacity: type.is_system ? 0.5 : 1 }}
              >
                <Pencil className="w-4 h-4" />
              </button>
              {!type.is_system && (
                <button
                  onClick={() => handleDelete(type)}
                  className="p-2 text-slate-600 hover:text-red-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingType ? "Modifier" : "Ajouter"} un type de qualification
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                  Nom
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  defaultValue={editingType?.name}
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
                  name="description"
                  defaultValue={editingType?.description || ""}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="validity_period" className="block text-sm font-medium text-slate-700">
                  Période de validité (mois)
                </label>
                <input
                  type="number"
                  id="validity_period"
                  name="validity_period"
                  min="0"
                  defaultValue={editingType?.validity_period || ""}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_instructor_validation"
                  name="requires_instructor_validation"
                  defaultChecked={editingType?.requires_instructor_validation}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label
                  htmlFor="requires_instructor_validation"
                  className="text-sm text-slate-700"
                >
                  Validation instructeur requise
                </label>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingType(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-800 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  {editingType ? "Modifier" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
