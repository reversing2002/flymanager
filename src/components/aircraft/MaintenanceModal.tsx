import type { Aircraft } from "../../types/database";
import { useState } from "react";
import {
  createMaintenance,
  MaintenanceInput,
} from "../../lib/queries/maintenance";

interface MaintenanceModalProps {
  aircraft: Aircraft;
  onClose: () => void;
  onSuccess: (updatedAircraft: Aircraft) => void;
}

// Définir l'enum exactement comme dans la base de données
export type MaintenanceType =
  | "PERIODIC"
  | "ANNUAL"
  | "REPAIR"
  | "50H"
  | "100H"
  | "OTHER";

const MAINTENANCE_TYPES = [
  { value: "PERIODIC", label: "Visite périodique" },
  { value: "ANNUAL", label: "Visite annuelle" },
  { value: "REPAIR", label: "Réparation" },
  { value: "50H", label: "Visite des 50h" },
  { value: "100H", label: "Visite des 100h" },
  { value: "OTHER", label: "Autre" },
] as const;

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  aircraft,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "PERIODIC",
    nextMaintenanceHours: 50,
    comments: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const maintenanceData: MaintenanceInput = {
        aircraft_id: aircraft.id,
        maintenance_date: formData.date,
        maintenance_type: formData.type.trim(),
        comments: formData.comments || "",
        next_hours: formData.nextMaintenanceHours,
        hours_at_maintenance: aircraft.totalFlightHours || 0,
      };

      await createMaintenance(maintenanceData);

      // Mettre à jour l'avion localement avec le nouveau potentiel
      const updatedAircraft = {
        ...aircraft,
        hoursBeforeMaintenance: formData.nextMaintenanceHours,
        lastMaintenance: formData.date,
      };

      onSuccess(updatedAircraft); // Modifier le type de onSuccess pour accepter l'avion mis à jour
      onClose();
    } catch (error) {
      console.error("Erreur complète:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-lg max-w-md w-full p-6">
          <h2 className="text-xl font-semibold mb-4">
            Enregistrer une maintenance - {aircraft.registration}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date de la maintenance
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full rounded-lg border-slate-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type de maintenance
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full rounded-lg border-slate-200"
                required
              >
                {MAINTENANCE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prochaine maintenance dans (heures)
              </label>
              <input
                type="number"
                value={formData.nextMaintenanceHours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nextMaintenanceHours: parseInt(e.target.value),
                  })
                }
                className="w-full rounded-lg border-slate-200"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Commentaires
              </label>
              <textarea
                value={formData.comments}
                onChange={(e) =>
                  setFormData({ ...formData, comments: e.target.value })
                }
                className="w-full rounded-lg border-slate-200"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceModal;
