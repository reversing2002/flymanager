import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";

interface LicenseType {
  id: string;
  name: string;
  description: string | null;
  validity_period: number | null; // en mois
  required_fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  display_order: number;
  club_id: string;
  is_system: boolean;
  category: string;
  created_at: string;
  updated_at: string;
}

export default function LicenseTypesSettings() {
  const [types, setTypes] = useState<LicenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<LicenseType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fields, setFields] = useState<Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
  }>>([]);
  const { user } = useAuth();

  const clubId = user?.club?.id;

  useEffect(() => {
    if (clubId) {
      loadTypes();
    }
  }, [clubId]);

  useEffect(() => {
    if (editingType) {
      setFields(editingType.required_fields || []);
    } else {
      setFields([]);
    }
  }, [editingType]);

  const loadTypes = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("license_types")
        .select("*")
        .or(`club_id.eq.${clubId},is_system.eq.true`)
        .order("display_order");

      if (fetchError) throw fetchError;
      setTypes(data || []);
    } catch (err) {
      console.error("Erreur lors du chargement des types de licence:", err);
      setError("Erreur lors du chargement des types de licence");
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        name: "",
        label: "",
        type: "text",
        required: false,
      },
    ]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    const newFields = [...fields];
    newFields[index] = {
      ...newFields[index],
      [field]: value,
      // Réinitialiser les options si le type n'est plus "select"
      ...(field === "type" && value !== "select" && { options: undefined }),
    };
    setFields(newFields);
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
      const licenseData = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        validity_period: formData.get("validity_period") ? parseInt(formData.get("validity_period") as string) : null,
        required_fields: fields.map(field => ({
          ...field,
          name: field.name.toLowerCase().replace(/\s+/g, '_'),
        })),
        display_order: types.length,
        club_id: clubId,
        category: formData.get("category") as string,
      };

      if (editingType) {
        const { error: updateError } = await supabase
          .from("license_types")
          .update(licenseData)
          .eq("id", editingType.id);

        if (updateError) throw updateError;
        toast.success("Type de licence modifié");
      } else {
        const { error: insertError } = await supabase
          .from("license_types")
          .insert([{ ...licenseData, is_system: false }]);

        if (insertError) throw insertError;
        toast.success("Type de licence créé");
      }

      await loadTypes();
      setIsModalOpen(false);
      setEditingType(null);
      setFields([]);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err);
      setError("Erreur lors de l'enregistrement");
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (type: LicenseType) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce type de licence ?")) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("license_types")
        .delete()
        .eq("id", type.id);

      if (deleteError) throw deleteError;
      toast.success("Type de licence supprimé");
      await loadTypes();
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Types de licence</h2>
        <button
          onClick={() => {
            setEditingType(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Ajouter un type
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
            className="p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{type.name}</h3>
                {type.description && (
                  <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                )}
                {type.validity_period && (
                  <p className="text-sm text-gray-600 mt-1">
                    Validité : {type.validity_period} mois
                  </p>
                )}
                {type.required_fields && type.required_fields.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700">Champs requis :</p>
                    <ul className="mt-1 text-sm text-gray-600">
                      {type.required_fields.map((field, index) => (
                        <li key={index}>
                          {field.label} ({field.type}
                          {field.required ? ", requis" : ""})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {type.is_system && (
                  <div className="mt-2 flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Type système</span>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-1">Catégorie : {type.category}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingType(type);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  disabled={type.is_system}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {!type.is_system && (
                  <button
                    onClick={() => handleDelete(type)}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex-shrink-0">
              <h2 className="text-xl font-semibold">
                {editingType ? "Modifier le type de licence" : "Ajouter un type de licence"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingType?.name}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingType?.description || ""}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Période de validité (en mois)
                  </label>
                  <input
                    type="number"
                    name="validity_period"
                    defaultValue={editingType?.validity_period || ""}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    name="category"
                    defaultValue={editingType?.category || "club"}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                    required
                  >
                    <option value="club">Club</option>
                    <option value="state">État</option>
                    <option value="european">Européen</option>
                    <option value="international">International</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700">Champs requis</h3>
                    <button
                      type="button"
                      onClick={handleAddField}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter un champ
                    </button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={index} className="relative p-4 bg-gray-50 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleRemoveField(index)}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Label
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleFieldChange(index, "label", e.target.value)}
                              className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                              placeholder="Ex: Numéro de qualification"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Type
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) => handleFieldChange(index, "type", e.target.value)}
                              className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                            >
                              <option value="text">Texte</option>
                              <option value="date">Date</option>
                              <option value="select">Liste déroulante</option>
                            </select>
                          </div>

                          {field.type === "select" && (
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Options (séparées par des virgules)
                              </label>
                              <input
                                type="text"
                                value={field.options?.join(", ") || ""}
                                onChange={(e) =>
                                  handleFieldChange(
                                    index,
                                    "options",
                                    e.target.value.split(",").map((o) => o.trim()).filter(Boolean)
                                  )
                                }
                                className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                                placeholder="Option 1, Option 2, Option 3"
                                required
                              />
                            </div>
                          )}

                          <div className="sm:col-span-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => handleFieldChange(index, "required", e.target.checked)}
                                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                              />
                              <span className="text-sm text-gray-700">Champ obligatoire</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingType(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
                  >
                    {editingType ? "Mettre à jour" : "Créer"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
