import { supabase } from "../supabase";
import type { Aircraft } from "../../types/database";

export async function getAircraft(): Promise<Aircraft[]> {
  const { data, error } = await supabase
    .from("aircraft")
    .select("*")
    .order("registration");

  if (error) throw error;
  return data.map((aircraft) => ({
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
  }));
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
  };
}