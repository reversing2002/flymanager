import React, { useState } from "react";
import { AlertTriangle, Upload, X } from "lucide-react";
import type { User } from "../../types/database";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";

interface EditPilotFormProps {
  pilot: User;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isAdmin?: boolean;
}

const DEFAULT_QUALIFICATIONS = [
  { code: "TW", name: "Train classique" },
  { code: "EFIS", name: "Système d'information éléctronique de vol" },
  { code: "SLPC", name: "Mono-manette de puissance" },
  { code: "RU", name: "Train rentrant" },
  { code: "VP", name: "Pas variable" },
];

const EditPilotForm: React.FC<EditPilotFormProps> = ({
  pilot,
  onSubmit,
  onCancel,
  isAdmin = false,
}) => {
  const [formData, setFormData] = useState({
    firstName: pilot.firstName || "",
    lastName: pilot.lastName || "",
    email: pilot.email || "",
    phone: pilot.phone || "",
    gender: pilot.gender || "",
    birthDate: pilot.birthDate || "",
    role: pilot.role || "PILOT",
    licenseNumber: pilot.licenseNumber || "",
    licenseExpiry: pilot.licenseExpiry || "",
    medicalExpiry: pilot.medicalExpiry || "",
    sepValidity: pilot.sepValidity || "",
    imageUrl: pilot.imageUrl || "",
    qualifications: pilot.qualifications || DEFAULT_QUALIFICATIONS.map(q => ({
      ...q,
      hasQualification: false
    }))
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      toast.success("Profil mis à jour avec succès");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Erreur lors de la mise à jour du profil");
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setFormData({ ...formData, imageUrl: publicUrl });
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Erreur lors du téléchargement de l'image");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Photo de profil
        </label>
        <div className="flex items-center gap-4">
          {formData.imageUrl ? (
            <div className="relative">
              <img
                src={formData.imageUrl}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, imageUrl: "" })}
                className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="profile-image"
              />
              <label
                htmlFor="profile-image"
                className="flex items-center justify-center h-24 w-24 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                <Upload className="h-6 w-6 text-slate-600" />
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Prénom
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          />
        </div>

        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rôle
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            >
              <option value="PILOT">Pilote</option>
              <option value="INSTRUCTOR">Instructeur</option>
              <option value="MECHANIC">Mécanicien</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Genre
          </label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
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
            value={formData.birthDate}
            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Numéro de licence
          </label>
          <input
            type="text"
            value={formData.licenseNumber}
            onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Validité licence
          </label>
          <input
            type="date"
            value={formData.licenseExpiry}
            onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Validité médicale
          </label>
          <input
            type="date"
            value={formData.medicalExpiry}
            onChange={(e) => setFormData({ ...formData, medicalExpiry: e.target.value })}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Validité SEP
          </label>
          <input
            type="date"
            value={formData.sepValidity}
            onChange={(e) => setFormData({ ...formData, sepValidity: e.target.value })}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Qualifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formData.qualifications.map((qual, index) => (
            <label key={qual.code} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={qual.hasQualification}
                onChange={(e) => {
                  const newQuals = [...formData.qualifications];
                  newQuals[index] = {
                    ...qual,
                    hasQualification: e.target.checked
                  };
                  setFormData({ ...formData, qualifications: newQuals });
                }}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-sm text-slate-900">
                {qual.code} - {qual.name}
              </span>
            </label>
          ))}
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
    </form>
  );
};

export default EditPilotForm;