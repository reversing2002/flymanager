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

export default function CustomFlightFieldsSettings() {
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
      const { data, fetchError } = await supabase
        .from("custom_flight_field_definitions")
        .select("*")
        .eq("club_id", clubId)
        .order("display_order");

      if (fetchError) throw fetchError;
      setFields(data || []);
      setLoading(false);
    } catch (err) {
      setError("Erreur lors du chargement des champs personnalisés");
      setLoading(false);
      toast.error("Erreur lors du chargement des champs personnalisés");
    }
  };

  const handleSave = async (fieldData: Partial<CustomField>) => {
    try {
      const isEditing = !!editingField;
      const { data, error: saveError } = isEditing
        ? await supabase
            .from("custom_flight_field_definitions")
            .update({
              ...fieldData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingField.id)
            .select()
            .single()
        : await supabase
            .from("custom_flight_field_definitions")
            .insert([
              {
                ...fieldData,
                club_id: clubId,
                display_order: fields.length,
              },
            ])
            .select()
            .single();

      if (saveError) throw saveError;

      toast.success(
        isEditing
          ? "Champ personnalisé mis à jour avec succès"
          : "Champ personnalisé créé avec succès"
      );

      setIsModalOpen(false);
      setEditingField(null);
      loadFields();
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde du champ personnalisé");
    }
  };

  const handleDelete = async (field: CustomField) => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir supprimer ce champ personnalisé ? Cette action est irréversible."
      )
    )
      return;

    try {
      const { error: deleteError } = await supabase
        .from("custom_flight_field_definitions")
        .delete()
        .eq("id", field.id);

      if (deleteError) throw deleteError;

      toast.success("Champ personnalisé supprimé avec succès");
      loadFields();
    } catch (err) {
      toast.error("Erreur lors de la suppression du champ personnalisé");
    }
  };

  const handleUpdateOrder = async (reorderedFields: CustomField[]) => {
    try {
      const updates = reorderedFields.map((field, index) => ({
        id: field.id,
        display_order: index,
      }));

      const { error: updateError } = await supabase
        .from("custom_flight_field_definitions")
        .upsert(updates);

      if (updateError) throw updateError;

      setFields(reorderedFields);
    } catch (err) {
      toast.error("Erreur lors de la mise à jour de l'ordre des champs");
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Champs personnalisés des vols</h2>
        <button
          onClick={() => {
            setEditingField(null);
            setIsModalOpen(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un champ
        </button>
      </div>

      <div className="space-y-2">
        {fields.map((field) => (
          <div
            key={field.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
          >
            <div>
              <h3 className="font-medium">{field.label}</h3>
              <p className="text-sm text-gray-500">
                Type: {field.type} | Nom: {field.name}
                {field.required && " | Requis"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingField(field);
                  setSelectedType(field.type);
                  setIsModalOpen(true);
                }}
                className="btn btn-ghost btn-sm"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(field)}
                className="btn btn-ghost btn-sm text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingField ? "Modifier" : "Ajouter"} un champ personnalisé
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingField(null);
                }}
                className="btn btn-ghost btn-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const fieldData: Partial<CustomField> = {
                  name: formData.get("name") as string,
                  label: formData.get("label") as string,
                  type: selectedType as CustomField["type"],
                  required: formData.get("required") === "on",
                  options:
                    selectedType === "select" || selectedType === "multiselect"
                      ? (formData.get("options") as string).split(",").map((o) => o.trim())
                      : undefined,
                  min_value:
                    selectedType === "number" || selectedType === "range"
                      ? Number(formData.get("min_value"))
                      : undefined,
                  max_value:
                    selectedType === "number" || selectedType === "range"
                      ? Number(formData.get("max_value"))
                      : undefined,
                  step:
                    selectedType === "number" || selectedType === "range"
                      ? Number(formData.get("step"))
                      : undefined,
                  accepted_file_types:
                    selectedType === "file"
                      ? (formData.get("accepted_file_types") as string)
                          .split(",")
                          .map((t) => t.trim())
                      : undefined,
                };
                handleSave(fieldData);
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">Nom (identifiant technique)</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingField?.name}
                  className="input input-bordered w-full"
                  pattern="^[a-zA-Z][a-zA-Z0-9_]*$"
                  title="Le nom doit commencer par une lettre et ne peut contenir que des lettres, des chiffres et des underscores"
                />
              </div>

              <div>
                <label className="label">Label (nom affiché)</label>
                <input
                  type="text"
                  name="label"
                  required
                  defaultValue={editingField?.label}
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label className="label">Type</label>
                <select
                  name="type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="text">Texte</option>
                  <option value="number">Nombre</option>
                  <option value="boolean">Booléen</option>
                  <option value="date">Date</option>
                  <option value="select">Liste déroulante</option>
                  <option value="email">Email</option>
                  <option value="tel">Téléphone</option>
                  <option value="url">URL</option>
                  <option value="time">Heure</option>
                  <option value="file">Fichier</option>
                  <option value="multiselect">Sélection multiple</option>
                  <option value="textarea">Zone de texte</option>
                  <option value="color">Couleur</option>
                  <option value="range">Plage</option>
                </select>
              </div>

              {(selectedType === "select" || selectedType === "multiselect") && (
                <div>
                  <label className="label">Options (séparées par des virgules)</label>
                  <input
                    type="text"
                    name="options"
                    required
                    defaultValue={editingField?.options?.join(", ")}
                    className="input input-bordered w-full"
                  />
                </div>
              )}

              {(selectedType === "number" || selectedType === "range") && (
                <>
                  <div>
                    <label className="label">Valeur minimum</label>
                    <input
                      type="number"
                      name="min_value"
                      defaultValue={editingField?.min_value}
                      className="input input-bordered w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Valeur maximum</label>
                    <input
                      type="number"
                      name="max_value"
                      defaultValue={editingField?.max_value}
                      className="input input-bordered w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Pas</label>
                    <input
                      type="number"
                      name="step"
                      defaultValue={editingField?.step}
                      className="input input-bordered w-full"
                    />
                  </div>
                </>
              )}

              {selectedType === "file" && (
                <div>
                  <label className="label">
                    Types de fichiers acceptés (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    name="accepted_file_types"
                    required
                    defaultValue={editingField?.accepted_file_types?.join(", ")}
                    className="input input-bordered w-full"
                    placeholder=".pdf, .jpg, .png"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="required"
                  defaultChecked={editingField?.required}
                  className="checkbox"
                />
                <label>Champ requis</label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingField(null);
                  }}
                  className="btn btn-ghost"
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingField ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
