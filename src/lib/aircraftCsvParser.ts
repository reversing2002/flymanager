import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";

export type AircraftPreview = {
  id: string;
  name: string;
  registration: string;
  aircraftType: string;
  hourlyRate: number;
  available: boolean;
  hoursBeforeMaintenance?: number;
  totalHours?: number;
  lastMaintenance?: string;
  nextMaintenanceDate?: string;
};

export function parseAircraftCsv(
  csvContent: string,
  mapping: Record<string, string>
): AircraftPreview[] {
  const lines = csvContent.split("\n");
  const headers = lines[0].split(";");

  // Créer un index pour chaque champ mappé
  const fieldIndexes: Record<string, number> = {};
  Object.entries(mapping).forEach(([field, header]) => {
    const index = headers.indexOf(header);
    if (index !== -1) {
      fieldIndexes[field] = index;
    }
  });

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(";");
      const getValue = (field: string) => {
        const index = fieldIndexes[field];
        return index !== undefined ? values[index] : undefined;
      };

      // Valider le statut
      const status = getValue("status")?.toUpperCase();
      const available = status === "AVAILABLE" || status?.includes("DISPONIBLE");

      return {
        id: uuidv4(),
        name: getValue("name") || "",
        registration: getValue("registration") || "",
        aircraftType: getValue("type") || "",
        hourlyRate: Number(getValue("hourly_rate")) || 0,
        available,
        hoursBeforeMaintenance: getValue("hours_before_maintenance")
          ? Number(getValue("hours_before_maintenance"))
          : undefined,
        totalHours: getValue("total_hours")
          ? Number(getValue("total_hours"))
          : undefined,
        lastMaintenance: getValue("last_maintenance"),
        nextMaintenanceDate: getValue("next_maintenance_date"),
      };
    });
}

export async function importAircraft(
  aircraftList: AircraftPreview[]
): Promise<void> {
  for (const aircraft of aircraftList) {
    try {
      const { error } = await supabase.from("aircraft").insert({
        id: uuidv4(),
        name: aircraft.name,
        registration: aircraft.registration,
        type: aircraft.aircraftType,
        hourly_rate: aircraft.hourlyRate,
        status: aircraft.available ? "AVAILABLE" : "MAINTENANCE",
        hours_before_maintenance: aircraft.hoursBeforeMaintenance,
        total_hours: aircraft.totalHours,
        last_maintenance: aircraft.lastMaintenance,
        next_maintenance_date: aircraft.nextMaintenanceDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Erreur lors de l'import de l'appareil:", error);
        throw error;
      }
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      throw error;
    }
  }
}
