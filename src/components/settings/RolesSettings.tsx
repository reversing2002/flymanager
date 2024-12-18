import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";

interface UserGroup {
  id: string;
  name: string;
  code: string;
  description: string | null;
  club_id: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export default function RolesSettings() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  const clubId = user?.club?.id;

  useEffect(() => {
    if (clubId) {
      loadGroups();
    }
  }, [clubId]);

  const loadGroups = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("user_groups")
        .select("*")
        .order("name");

      if (fetchError) throw fetchError;
      setGroups(data || []);
    } catch (err) {
      console.error("Erreur lors du chargement des groupes:", err);
      setError("Erreur lors du chargement des groupes");
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
      const groupData = {
        name: formData.get("name") as string,
        code: (formData.get("code") as string).toUpperCase(),
        description: formData.get("description") as string,
        club_id: clubId,
      };

      if (editingGroup) {
        if (editingGroup.is_system) {
          toast.error("Les groupes système ne peuvent pas être modifiés");
          return;
        }

        const { error: updateError } = await supabase
          .from("user_groups")
          .update(groupData)
          .eq("id", editingGroup.id);

        if (updateError) throw updateError;
        toast.success("Groupe modifié");
      } else {
        const { error: insertError } = await supabase
          .from("user_groups")
          .insert([{ ...groupData, is_system: false }]);

        if (insertError) throw insertError;
        toast.success("Groupe créé");
      }

      await loadGroups();
      setIsModalOpen(false);
      setEditingGroup(null);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err);
      setError("Erreur lors de l'enregistrement");
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (group: UserGroup) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce groupe ?")) return;

    if (group.is_system) {
      toast.error("Les groupes système ne peuvent pas être supprimés");
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("user_groups")
        .delete()
        .eq("id", group.id);

      if (deleteError) throw deleteError;
      toast.success("Groupe supprimé");
      await loadGroups();
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
        <h2 className="text-xl font-semibold">Gestion des groupes</h2>
        <button
          onClick={() => {
            setEditingGroup(null);
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
        {groups.map((group) => (
          <div
            key={group.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{group.name}</h3>
                <span className="text-sm bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                  {group.code}
                </span>
              </div>
              {group.description && (
                <p className="text-sm text-slate-600">{group.description}</p>
              )}
              <div className="text-sm text-slate-600">
                <span>{group.is_system ? "Groupe système" : "Groupe personnalisé"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingGroup(group);
                  setIsModalOpen(true);
                }}
                className="p-2 text-slate-600 hover:text-sky-600 rounded-lg"
                disabled={group.is_system}
              >
                <Pencil className="w-4 h-4" />
              </button>
              {!group.is_system && (
                <button
                  onClick={() => handleDelete(group)}
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
              {editingGroup ? "Modifier" : "Ajouter"} un groupe
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
                  defaultValue={editingGroup?.name}
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
                  name="code"
                  required
                  maxLength={50}
                  pattern="[A-Za-z0-9_-]+"
                  title="Lettres, chiffres, tirets et underscores uniquement"
                  defaultValue={editingGroup?.code}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm uppercase"
                />
                <p className="mt-1 text-sm text-slate-500">
                  Uniquement des lettres, chiffres, tirets et underscores. Sera automatiquement converti en majuscules.
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  defaultValue={editingGroup?.description || ""}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingGroup(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-800 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  {editingGroup ? "Modifier" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
