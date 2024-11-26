import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";

export type AircraftPreview = {
  id: string;
  name: string;
  registration: string;
  aircraftType: string;
  hourlyRate: number;
  available: boolean;
};

export function parseAircraftCsv(csvContent: string): AircraftPreview[] {
  const lines = csvContent.split("\n");
  const headers = lines[0].split(";");

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(";");
      return {
        id: values[0],
        name: `${values[1]} ${values[2]}`.trim().replace("? ?", values[5]),
        registration: values[3],
        aircraftType: values[5],
        hourlyRate: Number(values[6]),
        available: values[7].toLowerCase() === "oui",
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
