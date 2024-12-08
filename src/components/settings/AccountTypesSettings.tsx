import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import type { AccountEntryType } from "../../types/accounts";
import {
  getAccountEntryTypes,
  createAccountEntryType,
  updateAccountEntryType,
  deleteAccountEntryType,
} from "../../lib/queries/accountTypes";
import { useAuth } from "../../contexts/AuthContext";

export default function AccountTypesSettings() {
  const [types, setTypes] = useState<AccountEntryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<AccountEntryType | null>(null);
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
      const data = await getAccountEntryTypes();
      setTypes(data);
    } catch (err) {
      console.error("Error loading account types:", err);
      setError("Erreur lors du chargement des types de compte");
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
      if (editingType) {
        await updateAccountEntryType(editingType.id, {
          name: formData.get("name") as string,
          description: formData.get("description") as string,
          is_credit: formData.get("is_credit") === "true",
        });
      } else {
        await createAccountEntryType({
          code: formData.get("code") as string,
          name: formData.get("name") as string,
          description: formData.get("description") as string,
          is_credit: formData.get("is_credit") === "true",
          club_id: clubId,
        });
      }
      await loadTypes();
      setIsModalOpen(false);
      setEditingType(null);
    } catch (err) {
      console.error("Error saving account type:", err);
      setError("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (type: AccountEntryType) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce type de compte ?")) return;
    
    try {
      await deleteAccountEntryType(type.id);
      await loadTypes();
    } catch (err) {
      console.error("Error deleting account type:", err);
      setError("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Types de comptes</h2>
        <button
          onClick={() => {
            setEditingType(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouveau type
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-4">
        {types.map((type) => (
          <div
            key={type.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
          >
            <div>
              <h3 className="font-medium">{type.name}</h3>
              <p className="text-sm text-slate-500">{type.description}</p>
              <div className="mt-1">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100">
                  {type.code}
                </span>
                <span className={`ml-2 text-xs font-medium px-2 py-1 rounded-full ${
                  type.is_credit ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}>
                  {type.is_credit ? "Crédit" : "Débit"}
                </span>
                {type.is_system && (
                  <span className="ml-2 text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    Système
                  </span>
                )}
              </div>
            </div>
            
            {!type.is_system && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingType(type);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(type)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">
                {editingType ? "Modifier le type" : "Nouveau type"}
              </h3>

              {!editingType && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    className="w-full rounded-lg border-slate-200"
                    placeholder="FLIGHT"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingType?.name}
                  required
                  className="w-full rounded-lg border-slate-200"
                  placeholder="Vol"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={editingType?.description}
                  className="w-full rounded-lg border-slate-200"
                  placeholder="Description du type de compte"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type d'opération
                </label>
                <select
                  name="is_credit"
                  defaultValue={editingType?.is_credit ? "true" : "false"}
                  required
                  className="w-full rounded-lg border-slate-200"
                >
                  <option value="true">Crédit</option>
                  <option value="false">Débit</option>
                </select>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingType(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  {editingType ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
