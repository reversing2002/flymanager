import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: "text" | "number" | "boolean" | "date" | "select" | "email" | "tel" | "url" | "time" | "file" | "multiselect" | "textarea" | "color" | "range";
  required: boolean;
  options?: string[];
  min_value?: number;
  max_value?: number;
  step?: number;
  accepted_file_types?: string[];
  display_order: number;
  club_id: string;
  created_at: string;
  updated_at: string;
}

export default function CustomMemberFieldsSettings() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>(editingField?.type || "text");
  const { user } = useAuth();

  const clubId = user?.club?.id;

  useEffect(() => {
    if (clubId) {
      loadFields();
    }
  }, [clubId]);

  const loadFields = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("custom_member_field_definitions")
        .select("*")
        .eq("club_id", clubId)
        .order("display_order");

      if (fetchError) throw fetchError;
      setFields(data || []);
    } catch (err) {
      console.error("Erreur lors du chargement des champs personnalisés:", err);
      setError("Erreur lors du chargement des champs personnalisés");
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
      const fieldData = {
        name: (formData.get("label") as string).toLowerCase().replace(/\s+/g, '_'),
        label: formData.get("label") as string,
        type: formData.get("type") as "text" | "number" | "boolean" | "date" | "select" | "email" | "tel" | "url" | "time" | "file" | "multiselect" | "textarea" | "color" | "range",
        required: formData.get("required") === "on",
        options: formData.get("type") === "select" || formData.get("type") === "multiselect" ? 
          (formData.get("options") as string).split(",").map(o => o.trim()).filter(Boolean) : 
          null,
        min_value: formData.get("type") === "range" || formData.get("type") === "number" ? 
          parseInt(formData.get("min_value") as string) : 
          null,
        max_value: formData.get("type") === "range" || formData.get("type") === "number" ? 
          parseInt(formData.get("max_value") as string) : 
          null,
        step: formData.get("type") === "range" || formData.get("type") === "number" ? 
          parseInt(formData.get("step") as string) : 
          null,
        accepted_file_types: formData.get("type") === "file" ? 
          (formData.get("accepted_file_types") as string).split(",").map(o => o.trim()).filter(Boolean) : 
          null,
        club_id: clubId,
      };

      if (editingField) {
        const { error: updateError } = await supabase
          .from("custom_member_field_definitions")
          .update(fieldData)
          .eq("id", editingField.id);

        if (updateError) throw updateError;
        toast.success("Champ personnalisé modifié");
      } else {
        const { error: insertError } = await supabase
          .from("custom_member_field_definitions")
          .insert([{ ...fieldData, display_order: fields.length }]);

        if (insertError) throw insertError;
        toast.success("Champ personnalisé créé");
      }

      await loadFields();
      setIsModalOpen(false);
      setEditingField(null);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err);
      setError("Erreur lors de l'enregistrement");
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (field: CustomField) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce champ personnalisé ? Toutes les valeurs associées seront également supprimées.")) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("custom_member_field_definitions")
        .delete()
        .eq("id", field.id);

      if (deleteError) throw deleteError;
      toast.success("Champ personnalisé supprimé");
      await loadFields();
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
        <h2 className="text-2xl font-bold">Champs personnalisés des membres</h2>
        <button
          onClick={() => {
            setEditingField(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Ajouter un champ
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-4">
        {fields.map((field) => (
          <div
            key={field.id}
            className="p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{field.label}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Type : {field.type === "select" ? "Liste déroulante" : 
                         field.type === "boolean" ? "Case à cocher" :
                         field.type === "date" ? "Date" :
                         field.type === "number" ? "Nombre" :
                         field.type === "email" ? "Email" :
                         field.type === "tel" ? "Téléphone" :
                         field.type === "url" ? "URL" :
                         field.type === "time" ? "Heure" :
                         field.type === "file" ? "Fichier" :
                         field.type === "multiselect" ? "Sélection multiple" :
                         field.type === "textarea" ? "Texte long" :
                         field.type === "color" ? "Couleur" :
                         field.type === "range" ? "Plage de valeurs" : "Texte"}
                </p>
                {field.required && (
                  <p className="text-sm text-gray-600">Champ obligatoire</p>
                )}
                {field.type === "select" && field.options && (
                  <p className="text-sm text-gray-600 mt-1">
                    Options : {field.options.join(", ")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingField(field);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(field)}
                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
                {editingField ? "Modifier le champ personnalisé" : "Ajouter un champ personnalisé"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    name="label"
                    defaultValue={editingField?.label}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    name="type"
                    defaultValue={editingField?.type || "text"}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option value="text">Texte court</option>
                    <option value="textarea">Texte long</option>
                    <option value="number">Nombre</option>
                    <option value="boolean">Case à cocher</option>
                    <option value="date">Date</option>
                    <option value="time">Heure</option>
                    <option value="select">Liste déroulante</option>
                    <option value="multiselect">Sélection multiple</option>
                    <option value="email">Email</option>
                    <option value="tel">Téléphone</option>
                    <option value="file">Fichier</option>
                    <option value="url">URL</option>
                    <option value="color">Couleur</option>
                    <option value="range">Plage de valeurs</option>
                  </select>
                </div>

                {(editingField?.type === "select" || editingField?.type === "multiselect" || 
                  (!editingField && (selectedType === "select" || selectedType === "multiselect"))) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Options (séparées par des virgules)
                    </label>
                    <input
                      type="text"
                      name="options"
                      defaultValue={editingField?.options?.join(", ") || ""}
                      className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                      placeholder="Option 1, Option 2, Option 3"
                      required
                    />
                  </div>
                )}

                {(editingField?.type === "range" || editingField?.type === "number" ||
                  (!editingField && (selectedType === "range" || selectedType === "number"))) && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valeur minimale
                      </label>
                      <input
                        type="number"
                        name="min_value"
                        defaultValue={editingField?.min_value}
                        className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valeur maximale
                      </label>
                      <input
                        type="number"
                        name="max_value"
                        defaultValue={editingField?.max_value}
                        className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pas
                      </label>
                      <input
                        type="number"
                        name="step"
                        defaultValue={editingField?.step || 1}
                        className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                )}

                {(editingField?.type === "file" || (!editingField && selectedType === "file")) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Types de fichiers acceptés (séparés par des virgules)
                    </label>
                    <input
                      type="text"
                      name="accepted_file_types"
                      defaultValue={editingField?.accepted_file_types?.join(", ") || ""}
                      className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                      placeholder=".pdf, .jpg, .png"
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="required"
                      defaultChecked={editingField?.required}
                      className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm text-gray-700">Champ obligatoire</span>
                  </label>
                </div>
              </div>

              <div className="p-6 border-t flex-shrink-0">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingField(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
                  >
                    {editingField ? "Mettre à jour" : "Créer"}
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
