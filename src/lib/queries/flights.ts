import { supabase } from "../supabase";
import type { Flight, FlightType } from "../../types/database";
import { v4 as uuidv4 } from "uuid";

export const getFlightTypes = async (): Promise<FlightType[]> => {
  const { data, error } = await supabase
    .from("flight_types")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
};

export async function getFlights(): Promise<Flight[]> {
  const { data, error } = await supabase.from("flights").select(`
      *,
      flight_type:flight_type_id (
        name,
        accounting_category
      )
    `);

  if (error) throw error;
  return data.map((flight) => ({
    id: flight.id,
    reservationId: flight.reservation_id,
    userId: flight.user_id,
    aircraftId: flight.aircraft_id,
    flightTypeId: flight.flight_type_id,
    instructorId: flight.instructor_id,
    date: flight.date,
    duration: flight.duration,
    destination: flight.destination,
    hourlyRate: flight.hourly_rate,
    cost: flight.cost,
    paymentMethod: flight.payment_method,
    isValidated: flight.is_validated,
    accountingCategory: flight.flight_type?.accounting_category || "REGULAR",
    createdAt: flight.created_at,
    updatedAt: flight.updated_at,
    start_hour_meter: flight.start_hour_meter !== null ? flight.start_hour_meter : null,
    end_hour_meter: flight.end_hour_meter !== null ? flight.end_hour_meter : null,
  }));
}

export async function createFlight(data: Partial<Flight>): Promise<void> {
  const { error: flightError } = await supabase.from("flights").insert({
    id: data.id || uuidv4(),
    reservation_id: data.reservationId,
    user_id: data.userId,
    aircraft_id: data.aircraftId,
    flight_type_id: data.flightTypeId,
    instructor_id: data.instructorId,
    club_id: data.clubId,
    date: data.date,
    duration: data.duration,
    destination: data.destination,
    hourly_rate: data.hourlyRate,
    cost: data.cost,
    payment_method: data.paymentMethod,
    is_validated: data.isValidated,
    start_hour_meter: data.start_hour_meter,
    end_hour_meter: data.end_hour_meter,
  });

  if (flightError) throw flightError;

  await createFlightAccountEntry(data as Flight);
}

export async function updateFlight(
  id: string,
  data: Partial<Flight>
): Promise<void> {
  console.log("Début de la mise à jour du vol", { id, data });

  // Récupérer d'abord les informations de l'avion
  const { data: aircraft, error: aircraftError } = await supabase
    .from("aircraft")
    .select("registration")
    .eq("id", data.aircraftId)
    .single();

  if (aircraftError) {
    console.error("Erreur lors de la récupération de l'avion", aircraftError);
    throw aircraftError;
  }

  // Convertir les chaînes vides en null pour les champs UUID
  const updatedData = {
    user_id: data.userId,
    aircraft_id: data.aircraftId,
    flight_type_id: data.flightTypeId,
    instructor_id: data.instructorId === "" ? null : data.instructorId,
    date: data.date,
    duration: data.duration,
    destination: data.destination,
    hourly_rate: data.hourlyRate,
    cost: data.cost,
    payment_method: data.paymentMethod,
    is_validated: data.isValidated,
    updated_at: new Date().toISOString(),
    start_hour_meter: data.start_hour_meter,
    end_hour_meter: data.end_hour_meter,
  };

  console.log("Données de mise à jour du vol", updatedData);

  const { error } = await supabase
    .from("flights")
    .update(updatedData)
    .eq("id", id);

  if (error) {
    console.error("Erreur lors de la mise à jour du vol", error);
    throw error;
  }

  console.log("Vol mis à jour avec succès, recherche de l'entrée comptable...");

  // Rechercher l'entrée comptable correspondante
  const { data: accountEntries, error: searchError } = await supabase
    .from("account_entries")
    .select("*")
    .eq("flight_id", id);

  if (searchError) {
    console.error("Erreur lors de la recherche de l'entrée comptable", searchError);
    throw searchError;
  }

  if (!accountEntries || accountEntries.length === 0) {
    console.error("Aucune entrée comptable trouvée pour le vol", id);
    return;
  }

  const accountEntry = accountEntries[0];
  console.log("Entrée comptable trouvée", accountEntry);

  // S'assurer que la date est au bon format (YYYY-MM-DD)
  const formattedDate = new Date(data.date || "").toISOString().split('T')[0];

  // Préparer les données de mise à jour de l'entrée comptable
  const accountUpdateData = {
    amount: -Math.abs(data.cost || 0),
    date: formattedDate,
    payment_method: data.paymentMethod,
    description: `Vol ${aircraft.registration} - ${((data.duration || 0) / 60).toFixed(1)}h`,
    updated_at: new Date().toISOString()
  };

  console.log("Données de mise à jour de l'entrée comptable", accountUpdateData);
  console.log("ID de l'entrée comptable à mettre à jour:", accountEntry.id);

  // Vérifier d'abord si l'entrée existe toujours
  const { data: existingEntry, error: existingError } = await supabase
    .from("account_entries")
    .select("*")
    .eq("id", accountEntry.id)
    .single();

  if (existingError) {
    console.error("Erreur lors de la vérification de l'existence de l'entrée", existingError);
    throw existingError;
  }

  if (!existingEntry) {
    console.error("L'entrée comptable n'existe plus");
    throw new Error("L'entrée comptable n'existe plus");
  }

  console.log("Entrée comptable existante confirmée", existingEntry);

  // Mettre à jour l'entrée comptable avec une requête plus simple
  const { error: updateError } = await supabase
    .from("account_entries")
    .update({
      amount: accountUpdateData.amount,
      date: accountUpdateData.date,
      payment_method: accountUpdateData.payment_method,
      description: accountUpdateData.description,
      updated_at: accountUpdateData.updated_at
    })
    .match({ id: accountEntry.id });

  if (updateError) {
    console.error("Erreur lors de la mise à jour de l'entrée comptable", updateError);
    throw updateError;
  }

  // Vérifier la mise à jour
  const { data: finalEntry, error: finalError } = await supabase
    .from("account_entries")
    .select("*")
    .eq("id", accountEntry.id)
    .single();

  if (finalError) {
    console.error("Erreur lors de la vérification finale", finalError);
    throw finalError;
  }

  console.log("État final de l'entrée comptable", finalEntry);
}

export async function validateFlight(id: string): Promise<void> {
  // Start a Supabase transaction
  const { data: flight, error: flightError } = await supabase
    .from("flights")
    .select("*")
    .eq("id", id)
    .single();

  if (flightError) throw flightError;

  // Update flight validation status
  const { error: updateFlightError } = await supabase
    .from("flights")
    .update({ is_validated: true })
    .eq("id", id);

  if (updateFlightError) throw updateFlightError;

  // Find and validate the corresponding account entry
  const { error: accountError } = await supabase
    .from("account_entries")
    .update({ is_validated: true })
    .eq("flight_id", id);

  if (accountError) throw accountError;
}

export async function deleteFlight(id: string): Promise<void> {
  const { error } = await supabase
    .rpc('delete_flight_with_entries', { p_flight_id: id });

  if (error) throw error;
}

export async function createFlightAccountEntry(
  flightData: Flight
): Promise<void> {
  const { error } = await supabase.from("account_entries").insert({
    user_id: flightData.userId,
    assigned_to_id: flightData.userId,
    flight_id: flightData.id,
    date: flightData.date,
    type: "FLIGHT",
    amount: -flightData.cost,
    payment_method: flightData.paymentMethod,
    description: `Vol ${flightData.aircraftId} - ${flightData.duration}`,
    is_validated: false,
  });

  if (error) throw error;
}