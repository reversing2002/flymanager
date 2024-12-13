import React, { useState, useEffect } from "react";
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
  aircraftId: string;
  clubId: string;
  canEdit: boolean;
}

export default function CustomFieldsCard({ aircraftId, clubId, canEdit }: Props) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFieldsAndValues();
  }, [aircraftId, clubId]);

  const loadFieldsAndValues = async () => {
    try {
      // Charger les définitions des champs
      const { data: fieldsData, error: fieldsError } = await supabase
        .from("custom_aircraft_field_definitions")
        .select("*")
        .eq("club_id", clubId)
        .order("display_order");

      if (fieldsError) throw fieldsError;

      // Charger les valeurs des champs
      const { data: valuesData, error: valuesError } = await supabase
        .from("custom_aircraft_field_values")
        .select("*")
        .eq("aircraft_id", aircraftId);

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

  const handleChange = async (fieldId: string, value: any) => {
    if (!canEdit) return;
    
    try {
      let processedValue = value;
      const field = fields.find(f => f.id === fieldId);
      
      if (field?.type === "number" || field?.type === "range") {
        processedValue = value ? Number(value) : null;
      } else if (field?.type === "boolean") {
        processedValue = value === "on" || value === true;
      } else if (field?.type === "multiselect" && value instanceof HTMLSelectElement) {
        processedValue = Array.from(value.selectedOptions).map(option => option.value);
      }

      const { error: upsertError } = await supabase
        .from("custom_aircraft_field_values")
        .upsert({
          aircraft_id: aircraftId,
          field_id: fieldId,
          value: processedValue
        }, {
          onConflict: "aircraft_id,field_id"
        });

      if (upsertError) throw upsertError;

      setValues(prev => ({
        ...prev,
        [fieldId]: processedValue
      }));
      
      toast.success("Champ mis à jour");
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
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
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === "select" ? (
                <select
                  name={field.id}
                  value={values[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500 disabled:bg-gray-100"
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
                  value={values[field.id] || []}
                  onChange={(e) => handleChange(field.id, e.target)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500 disabled:bg-gray-100"
                  required={field.required}
                >
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  name={field.id}
                  value={values[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500 disabled:bg-gray-100"
                  required={field.required}
                />
              ) : field.type === "boolean" ? (
                <input
                  type="checkbox"
                  name={field.id}
                  checked={values[field.id] || false}
                  onChange={(e) => handleChange(field.id, e.target.checked)}
                  disabled={!canEdit}
                  className="rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:bg-gray-100"
                />
              ) : field.type === "range" ? (
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    name={field.id}
                    value={values[field.id] || field.min_value || 0}
                    min={field.min_value}
                    max={field.max_value}
                    step={field.step}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    disabled={!canEdit}
                    className="w-full disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-600">
                    {values[field.id] || field.min_value || 0}
                  </span>
                </div>
              ) : (
                <input
                  type={field.type}
                  name={field.id}
                  value={values[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500 disabled:bg-gray-100"
                  required={field.required}
                  min={field.type === "number" ? field.min_value : undefined}
                  max={field.type === "number" ? field.max_value : undefined}
                  step={field.type === "number" ? field.step : undefined}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
