import React, { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { supabase } from "../../lib/supabase";
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
}

interface CustomFieldValue {
  id: string;
  field_id: string;
  value: any;
}

interface Props {
  userId: string;
  clubId: string;
  canEdit: boolean;
}

export default function CustomFieldsCard({ userId, clubId, canEdit }: Props) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFieldsAndValues();
  }, [userId, clubId]);

  const loadFieldsAndValues = async () => {
    try {
      // Charger les définitions des champs
      const { data: fieldsData, error: fieldsError } = await supabase
        .from("custom_member_field_definitions")
        .select("*")
        .eq("club_id", clubId)
        .order("display_order");

      if (fieldsError) throw fieldsError;

      // Charger les valeurs des champs
      const { data: valuesData, error: valuesError } = await supabase
        .from("custom_member_field_values")
        .select("*")
        .eq("user_id", userId);

      if (valuesError) throw valuesError;

      setFields(fieldsData || []);
      
      // Convertir les valeurs en un objet avec field_id comme clé
      const valuesMap = (valuesData || []).reduce((acc, curr) => ({
        ...acc,
        [curr.field_id]: curr.value
      }), {});
      
      setValues(valuesMap);
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
    
    try {
      const formData = new FormData(e.currentTarget);
      const updates = [];

      for (const field of fields) {
        let value;
        
        if (field.type === "multiselect") {
          // Pour un select multiple, on récupère toutes les options sélectionnées
          const selectElement = e.currentTarget.querySelector(`select[name="${field.id}"]`) as HTMLSelectElement;
          value = Array.from(selectElement.selectedOptions).map(option => option.value);
        } else {
          value = formData.get(field.id);
          
          // Conversion des valeurs selon le type
          if (field.type === "boolean") {
            value = value === "on";
          } else if (field.type === "number" || field.type === "range") {
            value = value ? Number(value) : null;
          }
        }

        updates.push({
          user_id: userId,
          field_id: field.id,
          value: value
        });
      }

      const { error: upsertError } = await supabase
        .from("custom_member_field_values")
        .upsert(updates, {
          onConflict: "user_id,field_id"
        });

      if (upsertError) throw upsertError;

      await loadFieldsAndValues();
      setIsEditing(false);
      toast.success("Champs personnalisés mis à jour");
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
      setError("Erreur lors de la mise à jour");
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-white rounded-lg p-6">Chargement...</div>;
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Informations supplémentaires</h2>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        <dl className="grid gap-4">
          {fields.map((field) => (
            <div key={field.id}>
              <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {field.type === "boolean" ? (
                  values[field.id] ? "Oui" : "Non"
                ) : field.type === "date" ? (
                  values[field.id] ? new Date(values[field.id]).toLocaleDateString() : "-"
                ) : field.type === "multiselect" ? (
                  Array.isArray(values[field.id]) ? values[field.id]?.join(", ") : "-"
                ) : (
                  values[field.id] || "-"
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex-shrink-0">
              <h2 className="text-xl font-semibold">
                Modifier les informations supplémentaires
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {field.type === "select" ? (
                      <select
                        name={field.id}
                        defaultValue={values[field.id] || ""}
                        className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                        required={field.required}
                      >
                        <option value="">Sélectionner...</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "multiselect" ? (
                      <select
                        name={field.id}
                        multiple
                        className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500 min-h-[100px]"
                        required={field.required}
                      >
                        {field.options?.map((option) => (
                          <option 
                            key={option} 
                            value={option}
                            selected={Array.isArray(values[field.id]) && values[field.id]?.includes(option)}
                          >
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "boolean" ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name={field.id}
                          defaultChecked={values[field.id]}
                          className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                        />
                      </label>
                    ) : field.type === "textarea" ? (
                      <textarea
                        name={field.id}
                        defaultValue={values[field.id] || ""}
                        className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                        required={field.required}
                        rows={4}
                      />
                    ) : field.type === "range" ? (
                      <div>
                        <input
                          type="range"
                          name={field.id}
                          defaultValue={values[field.id] || field.min_value}
                          min={field.min_value}
                          max={field.max_value}
                          step={field.step}
                          className="w-full"
                          required={field.required}
                        />
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>{field.min_value}</span>
                          <span>{field.max_value}</span>
                        </div>
                      </div>
                    ) : field.type === "file" ? (
                      <input
                        type="file"
                        name={field.id}
                        className="w-full"
                        required={field.required}
                        accept={field.accepted_file_types?.join(",")}
                      />
                    ) : (
                      <input
                        type={field.type}
                        name={field.id}
                        defaultValue={values[field.id] || ""}
                        className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="p-6 border-t flex-shrink-0">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
                  >
                    Enregistrer
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
