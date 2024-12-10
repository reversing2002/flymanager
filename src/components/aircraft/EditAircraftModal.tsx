import { useState } from "react";
import { X, Upload, Trash2, AlertTriangle } from "lucide-react";
import type { Aircraft } from "../../types/database";
import { createAircraft, updateAircraft } from "../../lib/queries/aircraft";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";

interface EditAircraftModalProps {
  aircraft: Aircraft | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditAircraftModal: React.FC<EditAircraftModalProps> = ({
  aircraft,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: aircraft?.name || "",
    type: aircraft?.type || "PLANE",
    registration: aircraft?.registration || "",
    capacity: aircraft?.capacity || 1,
    hourlyRate: aircraft?.hourlyRate || 0,
    status: aircraft?.status || "AVAILABLE",
    hoursBeforeMaintenance: aircraft?.hoursBeforeMaintenance || 50,
    lastMaintenance: aircraft?.lastMaintenance
      ? new Date(aircraft.lastMaintenance).toISOString().split("T")[0]
      : "",
    imageUrl: aircraft?.imageUrl || "",
    last_hour_meter: aircraft?.last_hour_meter || 0,
    hour_format: aircraft?.hour_format || "CLASSIC",
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${aircraft?.id || "new"}-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("aircraft-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("aircraft-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, imageUrl: publicUrl });
      toast.success("Image téléchargée avec succès");
    } catch (err) {
      console.error("Error uploading image:", err);
      setError("Erreur lors du téléchargement de l'image");
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!formData.imageUrl) return;

    try {
      const fileName = formData.imageUrl.split("/").pop();
      if (!fileName) return;

      await supabase.storage.from("aircraft-images").remove([fileName]);
      setFormData({ ...formData, imageUrl: "" });
      toast.success("Image supprimée");
    } catch (err) {
      console.error("Error deleting image:", err);
      setError("Erreur lors de la suppression de l'image");
      toast.error("Erreur lors de la suppression de l'image");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.club?.id) {
      setError("Club non défini pour l'utilisateur");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (aircraft) {
        await updateAircraft(aircraft.id, {
          ...formData,
          club_id: user.club.id,
        });
        toast.success("Appareil mis à jour");
      } else {
        await createAircraft({
          ...formData,
          club_id: user.club.id,
        });
        toast.success("Appareil créé");
      }
      onSuccess();
    } catch (err) {
      console.error("Error saving aircraft:", err);
      setError("Erreur lors de l'enregistrement");
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-lg max-w-2xl w-full">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {aircraft ? "Modifier l'appareil" : "Nouvel appareil"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Immatriculation
                  </label>
                  <input
                    type="text"
                    value={formData.registration}
                    onChange={(e) =>
                      setFormData({ ...formData, registration: e.target.value })
                    }
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    required
                  >
                    <option value="PLANE">Avion</option>
                    <option value="ULM">ULM</option>
                    <option value="HELICOPTER">Hélicoptère</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Capacité
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: parseInt(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tarif horaire
                  </label>
                  <input
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hourlyRate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Statut
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    required
                  >
                    <option value="AVAILABLE">Disponible</option>
                    <option value="MAINTENANCE">En maintenance</option>
                    <option value="UNAVAILABLE">Indisponible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Heures avant maintenance
                  </label>
                  <input
                    type="number"
                    value={formData.hoursBeforeMaintenance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hoursBeforeMaintenance: parseInt(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Dernière maintenance
                  </label>
                  <input
                    type="date"
                    value={formData.lastMaintenance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lastMaintenance: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Horamètre actuel
                  </label>
                  <input
                    type="number"
                    value={formData.last_hour_meter}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        last_hour_meter: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    step="0.1"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Format d'affichage des heures
                  </label>
                  <select
                    value={formData.hour_format}
                    onChange={(e) =>
                      setFormData({ ...formData, hour_format: e.target.value })
                    }
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    required
                  >
                    <option value="DECIMAL">Décimal (1.5h)</option>
                    <option value="CLASSIC">Classique (1h30)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Photo de l'appareil
                  </label>
                  {formData.imageUrl ? (
                    <div className="relative">
                      <img
                        src={formData.imageUrl}
                        alt={formData.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={handleDeleteImage}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="sr-only"
                        id="aircraft-image"
                        disabled={isUploading}
                      />
                      <label
                        htmlFor="aircraft-image"
                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-sky-500 transition-colors"
                      >
                        <Upload className="h-8 w-8 text-slate-400" />
                        <span className="mt-2 text-sm text-slate-600">
                          {isUploading
                            ? "Téléchargement..."
                            : "Cliquez pour ajouter une photo"}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t rounded-b-xl">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditAircraftModal;