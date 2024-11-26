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
  });

  if (flightError) throw flightError;

  await createFlightAccountEntry(data as Flight);
}

export async function updateFlight(
  id: string,
  data: Partial<Flight>
): Promise<void> {
  const { error } = await supabase
    .from("flights")
    .update({
      user_id: data.userId,
      aircraft_id: data.aircraftId,
      flight_type_id: data.flightTypeId,
      instructor_id: data.instructorId,
      date: data.date,
      duration: data.duration,
      destination: data.destination,
      hourly_rate: data.hourlyRate,
      cost: data.cost,
      payment_method: data.paymentMethod,
      is_validated: data.isValidated,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
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
  const { error } = await supabase.from("flights").delete().eq("id", id);

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