import React, { useState, useEffect } from "react";
import { AlertTriangle, Upload, X } from "lucide-react";
import type { User } from "../../types/database";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import { Role, ROLE_GROUPS } from "../../types/roles";
import { getRoleLabel } from "../../lib/utils/roleUtils";
import { getInitials } from "../../lib/utils/avatarUtils";

interface EditPilotFormProps {
  pilot: User;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isAdmin?: boolean;
  currentUser?: User;
}

const EditPilotForm: React.FC<EditPilotFormProps> = ({
  pilot,
  onSubmit,
  onCancel,
  isAdmin = false,
  currentUser,
}) => {
  const [formData, setFormData] = useState({
    first_name: pilot.first_name || "",
    last_name: pilot.last_name || "",
    email: pilot.email || "",
    phone: pilot.phone || "",
    gender: pilot.gender || "",
    birth_date: pilot.birth_date || "",
    roles: [] as string[],
    image_url: pilot.image_url || "",
    instructor_rate: pilot.instructor_rate || null,
    instructor_fee: pilot.instructor_fee || null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableGroups = ["ADMIN", "INSTRUCTOR", "PILOT", "MECHANIC", "STUDENT", "DISCOVERY_PILOT"];

  useEffect(() => {
    const loadUserGroups = async () => {
      if (!pilot.id) {
        console.log("[EditPilotForm] No userId provided, skipping group load");
        return;
      }
      console.log("[EditPilotForm] Loading groups for user:", pilot.id);
      
      try {
        const { data, error } = await supabase
          .rpc('get_user_groups', { user_id: pilot.id });

        if (error) {
          console.error("[EditPilotForm] Error loading user groups:", error);
          return;
        }

        // Ensure groups are in uppercase
        const normalizedGroups = data?.map(group => group.toUpperCase()) || [];
        console.log("[EditPilotForm] Loaded user groups (normalized):", normalizedGroups);
        setFormData(prev => ({ ...prev, roles: normalizedGroups }));
      } catch (err) {
        console.error("[EditPilotForm] Exception loading user groups:", err);
      }
    };

    loadUserGroups();
  }, [pilot.id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Gestion spéciale pour les champs numériques
    if (name === 'instructor_rate' || name === 'instructor_fee') {
      const numericValue = value === '' ? null : parseFloat(value);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRoleChange = (role: string) => {
    const normalizedRole = role.toUpperCase();
    console.log("[EditPilotForm] Role change triggered for:", normalizedRole);
    console.log("[EditPilotForm] Current roles:", formData.roles);
    
    setFormData((prev) => {
      const newRoles = prev.roles.includes(normalizedRole)
        ? prev.roles.filter((r) => r !== normalizedRole)
        : [...prev.roles, normalizedRole];
      console.log("[EditPilotForm] Updated roles:", newRoles);
      return { ...prev, roles: newRoles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convertir instructor_rate en nombre ou null
     
      const dataToSubmit = {
        id: pilot.id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        birth_date: formData.birth_date || null,
        image_url: formData.image_url,
        instructor_rate: formData.instructor_rate || null,
        instructor_fee: formData.instructor_fee || null
      };

      console.log("[EditPilotForm] ====== SUBMIT DEBUG ======");
      console.log("[EditPilotForm] Original form data:", formData);
      console.log("[EditPilotForm] Data to submit:", dataToSubmit);
      console.log("[EditPilotForm] Submit instructor_rate:", dataToSubmit.instructor_rate, typeof dataToSubmit.instructor_rate);
      console.log("[EditPilotForm] Full data:", JSON.stringify(dataToSubmit, null, 2));

      await onSubmit(dataToSubmit);

      if (isAdmin) {
        const { error: groupsError } = await supabase
          .rpc('update_user_groups', {
            p_user_id: pilot.id,
            p_groups: formData.roles
          });

        if (groupsError) {
          throw groupsError;
        }
      }

      toast.success("Profil mis à jour avec succès");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Erreur lors de la mise à jour du profil");
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${pilot.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Erreur lors du téléchargement de l'image");
    }
  };

  const isInstructor = formData.roles.includes("INSTRUCTOR");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {formData.image_url ? (
              <img
                src={formData.image_url}
                alt={`${formData.first_name} ${formData.last_name}`}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-xl font-medium text-white">
                {getInitials(formData.first_name, formData.last_name)}
              </div>
            )}
            <label
              htmlFor="photo"
              className="absolute bottom-0 right-0 p-1 bg-slate-800 rounded-full cursor-pointer hover:bg-slate-700"
            >
              <Upload className="h-4 w-4" />
              <input
                type="file"
                id="photo"
                name="photo"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Prénom
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Rôles
              </label>
              <div className="space-y-2">
                {availableGroups.map((role) => (
                  <div key={role} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`role-${role}`}
                      checked={formData.roles.includes(role)}
                      onChange={() => handleRoleChange(role)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`role-${role}`}
                      className="ml-2 block text-sm text-gray-900"
                    >
                      {getRoleLabel(role)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.roles.includes("INSTRUCTOR") && (
            <>
              <div>
                <label htmlFor="instructor_rate" className="block text-sm font-medium text-gray-700">
                  Tarif horaire d'instruction
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">€</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="instructor_rate"
                    id="instructor_rate"
                    value={formData.instructor_rate ?? ''}
                    onChange={handleChange}
                    className="focus:ring-sky-500 focus:border-sky-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">/heure</span>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="instructor_fee" className="block text-sm font-medium text-gray-700">
                  Rémunération horaire instructeur
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">€</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="instructor_fee"
                    id="instructor_fee"
                    value={formData.instructor_fee ?? ''}
                    onChange={handleChange}
                    className="focus:ring-sky-500 focus:border-sky-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">/heure</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Genre
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            >
              <option value="">Sélectionner</option>
              <option value="Homme">Homme</option>
              <option value="Femme">Femme</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date de naissance
            </label>
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default EditPilotForm;