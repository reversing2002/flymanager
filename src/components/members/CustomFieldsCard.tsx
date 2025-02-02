import React, { useState, useEffect, useRef } from "react";
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

interface FileValue {
  fileName: string;
  fileUrl: string;
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
  const formRef = useRef<HTMLFormElement>(null);

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

      const newValues: Record<string, any> = {};

      for (const value of valuesData || []) {
        newValues[value.field_id] = value.value;
      }

      setFields(fieldsData || []);
      setValues(newValues);
      setLoading(false);
    } catch (err) {
      console.error("Erreur lors du chargement des champs:", err);
      setError("Erreur lors du chargement des champs personnalisés");
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, fieldId: string): Promise<FileValue> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${fieldId}_${Date.now()}.${fileExt}`;
    const filePath = `custom_fields/${clubId}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Générer l'URL publique du fichier
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return {
      fileName: file.name,
      fileUrl: publicUrl
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    try {
      console.log("Tentative de mise à jour pour l'utilisateur:", userId);

      // Vérifications de l'utilisateur...
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error("UUID invalide:", userId);
        throw new Error("ID utilisateur invalide");
      }

      // Vérification de l'existence de l'utilisateur...
      const { data: userExists, error: userError } = await supabase
        .from("users")
        .select("id, email")
        .eq("id", userId)
        .maybeSingle();

      if (userError || !userExists) {
        throw new Error("Utilisateur non trouvé");
      }

      if (!formRef.current) {
        throw new Error("Formulaire non trouvé");
      }

      const updates = [];
      const formElement = formRef.current;

      for (const field of fields) {
        let value;
        
        if (field.type === "multiselect") {
          const selectElement = formElement.querySelector(`select[name="${field.id}"]`) as HTMLSelectElement;
          if (selectElement) {
            value = Array.from(selectElement.selectedOptions).map(option => option.value);
          }
        } else if (field.type === "file") {
          const fileInput = formElement.querySelector(`input[name="${field.id}"]`) as HTMLInputElement;
          if (fileInput?.files?.length) {
            try {
              value = await uploadFile(fileInput.files[0], field.id);
            } catch (err) {
              console.error("Erreur lors de l'upload du fichier:", err);
              throw new Error(`Erreur lors de l'upload du fichier ${fileInput.files[0].name}`);
            }
          } else {
            value = values[field.id];
          }
        } else if (field.type === "boolean") {
          const checkbox = formElement.querySelector(`input[name="${field.id}"]`) as HTMLInputElement;
          value = checkbox ? checkbox.checked : false;
        } else {
          const element = formElement.querySelector(`[name="${field.id}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          value = element ? element.value : null;
          
          if (field.type === "number" || field.type === "range") {
            value = value ? Number(value) : null;
          }
        }

        const update = {
          user_id: userId,
          field_id: field.id,
          value: value
        };
        updates.push(update);
      }

      const { error: upsertError } = await supabase
        .from("custom_member_field_values")
        .upsert(updates, {
          onConflict: "user_id,field_id",
          returning: "minimal"
        });

      if (upsertError) throw upsertError;

      await loadFieldsAndValues();
      setIsEditing(false);
      toast.success("Champs personnalisés mis à jour");
    } catch (err: any) {
      console.error("Erreur détaillée lors de la mise à jour:", err);
      let errorMessage = "Erreur lors de la mise à jour";
      
      if (err.message.includes("upload du fichier")) {
        errorMessage = err.message;
      } else if (err.message === "ID utilisateur invalide") {
        errorMessage = "L'identifiant de l'utilisateur n'est pas valide";
      } else if (err.message === "Utilisateur non trouvé") {
        errorMessage = "L'utilisateur n'existe pas dans la base de données";
      } else if (err.message === "Formulaire non trouvé") {
        errorMessage = "Erreur technique : formulaire non trouvé";
      } else if (err.code === "23503") {
        errorMessage = "L'utilisateur référencé n'existe pas. Veuillez vérifier que l'utilisateur existe toujours dans la base de données.";
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
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
                ) : field.type === "file" ? (
                  <div>
                    {values[field.id]?.fileName}
                    {values[field.id]?.fileUrl && (
                      <a
                        href={values[field.id].fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-sky-600 hover:text-sky-700"
                      >
                        Voir le fichier
                      </a>
                    )}
                  </div>
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

            <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
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
                        defaultValue={Array.isArray(values[field.id]) ? values[field.id] : []}
                      >
                        {field.options?.map((option) => (
                          <option 
                            key={option} 
                            value={option}
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
                      <div>
                        <input
                          type="file"
                          name={field.id}
                          className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                          required={field.required}
                          accept={field.accepted_file_types?.join(',')}
                        />
                        {values[field.id] && (
                          <p className="mt-1 text-sm text-gray-500">
                            Fichier actuel : {values[field.id].fileName}
                            <a
                              href={values[field.id].fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-sky-600 hover:text-sky-700"
                            >
                              Voir le fichier
                            </a>
                          </p>
                        )}
                      </div>
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
