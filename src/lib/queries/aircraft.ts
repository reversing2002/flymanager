import { supabase } from "../supabase";
import type { Aircraft } from "../../types/database";

export async function getAircraft(): Promise<Aircraft[]> {
  try {
    const { data: aircraft, error } = await supabase
      .from("aircraft")
      .select(`
        *,
        aircraft_order (
          position
        )
      `);

    if (error) {
      console.error("Error fetching aircraft:", error);
      throw error;
    }

    // Trier les avions selon leur position dans aircraft_order
    return aircraft.sort((a, b) => {
      const positionA = a.aircraft_order?.[0]?.position ?? Infinity;
      const positionB = b.aircraft_order?.[0]?.position ?? Infinity;
      return positionA - positionB;
    }).map((aircraft) => ({
      id: aircraft.id,
      name: aircraft.name,
      type: aircraft.type,
      registration: aircraft.registration,
      capacity: aircraft.capacity,
      hourlyRate: aircraft.hourly_rate,
      lastMaintenance: aircraft.last_maintenance,
      hoursBeforeMaintenance: aircraft.hours_before_maintenance,
      status: aircraft.status,
      imageUrl: aircraft.image_url,
      createdAt: aircraft.created_at,
      updatedAt: aircraft.updated_at,
      club_id: aircraft.club_id,
      last_hour_meter: aircraft.last_hour_meter,
      hour_format: aircraft.hour_format,
    }));
  } catch (error) {
    console.error("Error in getAircraft:", error);
    throw error;
  }
}

export async function createAircraft(data: Partial<Aircraft>): Promise<void> {
  const { error } = await supabase.from("aircraft").insert({
    name: data.name,
    type: data.type,
    registration: data.registration,
    capacity: data.capacity,
    hourly_rate: data.hourlyRate,
    last_maintenance: data.lastMaintenance,
    hours_before_maintenance: data.hoursBeforeMaintenance,
    status: data.status,
    image_url: data.imageUrl,
    club_id: data.club_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_hour_meter: data.last_hour_meter,
    hour_format: data.hour_format,
  });

  if (error) {
    console.error("Error creating aircraft:", error);
    throw error;
  }
}

export async function updateAircraft(id: string, data: Partial<Aircraft>): Promise<void> {
  const { error } = await supabase
    .from("aircraft")
    .update({
      name: data.name,
      type: data.type,
      registration: data.registration,
      capacity: data.capacity,
      hourly_rate: data.hourlyRate,
      last_maintenance: data.lastMaintenance,
      hours_before_maintenance: data.hoursBeforeMaintenance,
      status: data.status,
      image_url: data.imageUrl,
      updated_at: new Date().toISOString(),
      last_hour_meter: data.last_hour_meter,
      hour_format: data.hour_format,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating aircraft:", error);
    throw error;
  }
}

export async function deleteAircraft(id: string): Promise<void> {
  const { error } = await supabase.from("aircraft").delete().eq("id", id);

  if (error) {
    console.error("Error deleting aircraft:", error);
    throw error;
  }
}

export async function getAircraftById(id: string): Promise<Aircraft | null> {
  const { data, error } = await supabase
    .from("aircraft")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching aircraft:", error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    registration: data.registration,
    capacity: data.capacity,
    hourlyRate: data.hourly_rate,
    lastMaintenance: data.last_maintenance,
    hoursBeforeMaintenance: data.hours_before_maintenance,
    status: data.status,
    imageUrl: data.image_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    last_hour_meter: data.last_hour_meter,
    hour_format: data.hour_format,
  };
}

export interface MaintenanceStats {
  aircraft_stats: Array<{
    id: string;
    registration: string;
    name: string;
    model: string;
    total_hours: number;
    hours_before_maintenance: number;
    last_maintenance: string;
    status: string;
    maintenance_status: 'OVERDUE' | 'URGENT' | 'WARNING' | 'OK';
    total_flights_30d: number;
    total_hours_30d: number;
    last_flight: string | null;
  }>;
  alerts_count: {
    overdue: number;
    urgent: number;
    warning: number;
    ok: number;
  };
}

export async function getMaintenanceStats(): Promise<MaintenanceStats> {
  try {
    const { data, error } = await supabase
      .rpc('get_maintenance_stats');

    if (error) {
      console.error("Error fetching maintenance stats:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in getMaintenanceStats:", error);
    throw error;
  }
}