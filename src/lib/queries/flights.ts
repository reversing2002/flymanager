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
        *,
        accounting_category:accounting_categories!accounting_category_id(*)
      )
    `)
    .order('date', { ascending: false });

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
    instructor_fee: flight.instructor_fee,
    paymentMethod: flight.payment_method,
    isValidated: flight.is_validated,
    accountingCategory: flight.flight_type?.accounting_category?.name,
    createdAt: flight.created_at,
    updatedAt: flight.updated_at,
    start_hour_meter: flight.start_hour_meter !== null ? flight.start_hour_meter : null,
    end_hour_meter: flight.end_hour_meter !== null ? flight.end_hour_meter : null,
    instructorCost: flight.instructor_cost,
    flightType: flight.flight_type
  }));
}

export async function getInstructorFlights(instructorId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('flights')
    .select(`
      *,
      student:user_id (
        id,
        first_name,
        last_name
      ),
      aircraft:aircraft_id (
        id,
        registration,
        name
      )
    `)
    .eq('instructor_id', instructorId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
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
    instructor_fee: data.instructor_fee,
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
    instructor_id: data.instructorId || null,
    date: data.date,
    duration: data.duration,
    destination: data.destination || null,
    hourly_rate: data.hourlyRate,
    cost: data.cost,
    instructor_fee: data.instructor_fee,
    payment_method: data.paymentMethod,
    is_validated: data.isValidated || false,
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

  // Rechercher les entrées comptables correspondantes
  const { data: accountEntries, error: searchError } = await supabase
    .from("account_entries")
    .select("*")
    .eq("flight_id", id);

  if (searchError) {
    console.error("Erreur lors de la recherche des entrées comptables", searchError);
    throw searchError;
  }

  // Get the account entry types first
  const { data: entryTypes, error: entryTypesError } = await supabase
    .from("account_entry_types")
    .select("id, code")
    .in("code", ["FLIGHT", "INSTRUCTION"]);

  if (entryTypesError) {
    console.error("Erreur lors de la récupération des types d'entrées", entryTypesError);
    throw entryTypesError;
  }

  const flightTypeId = entryTypes.find(t => t.code === "FLIGHT")?.id;
  const instructionTypeId = entryTypes.find(t => t.code === "INSTRUCTION")?.id;

  if (!flightTypeId || !instructionTypeId) {
    throw new Error("Types d'entrées comptables non trouvés");
  }

  // S'assurer que la date est au bon format (YYYY-MM-DD)
  const formattedDate = new Date(data.date || "").toISOString().split('T')[0];

  // Trouver l'entrée pour le coût de l'avion
  const aircraftEntry = accountEntries?.find(entry => entry.entry_type_id === flightTypeId);
  // Trouver l'entrée pour le coût de l'instruction
  const instructorEntry = accountEntries?.find(entry => entry.entry_type_id === instructionTypeId);

  // Mettre à jour l'entrée pour l'avion
  if (aircraftEntry) {
    const aircraftUpdateData = {
      amount: -Math.abs(data.cost || 0),
      date: formattedDate,
      payment_method: data.paymentMethod,
      description: `Vol ${aircraft.registration} - ${((data.duration || 0) / 60).toFixed(1)}h`,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from("account_entries")
      .update(aircraftUpdateData)
      .eq("id", aircraftEntry.id);

    if (updateError) {
      console.error("Erreur lors de la mise à jour de l'entrée comptable avion", updateError);
      throw updateError;
    }
  } else {
    // Créer une nouvelle entrée pour l'avion si elle n'existe pas
    const { error: insertError } = await supabase
      .from("account_entries")
      .insert({
        id: uuidv4(),
        user_id: data.userId,
        entry_type_id: flightTypeId,
        date: formattedDate,
        amount: -Math.abs(data.cost || 0),
        payment_method: data.paymentMethod,
        description: `Vol ${aircraft.registration} - ${((data.duration || 0) / 60).toFixed(1)}h`,
        flight_id: id,
        assigned_to_id: data.userId,
        is_validated: false,
        is_club_paid: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error("Erreur lors de la création de l'entrée comptable avion", insertError);
      throw insertError;
    }
  }

  // Gérer l'entrée comptable pour le coût d'instruction
  if (data.instructorId && data.instructor_cost) {
    if (instructorEntry) {
      // Mettre à jour l'entrée existante
      const instructorUpdateData = {
        amount: -Math.abs(data.instructor_cost),
        date: formattedDate,
        payment_method: data.paymentMethod,
        description: `Instruction vol du ${new Date(formattedDate).toLocaleDateString()} - ${((data.duration || 0) / 60).toFixed(1)}h`,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from("account_entries")
        .update(instructorUpdateData)
        .eq("id", instructorEntry.id);

      if (updateError) {
        console.error("Erreur lors de la mise à jour de l'entrée comptable instruction", updateError);
        throw updateError;
      }
    } else {
      // Créer une nouvelle entrée pour l'instruction
      const { error: insertError } = await supabase
        .from("account_entries")
        .insert({
          id: uuidv4(),
          user_id: data.userId,
          entry_type_id: instructionTypeId,
          date: formattedDate,
          amount: -Math.abs(data.instructor_cost),
          payment_method: data.paymentMethod,
          description: `Instruction vol du ${new Date(formattedDate).toLocaleDateString()} - ${((data.duration || 0) / 60).toFixed(1)}h`,
          flight_id: id,
          assigned_to_id: data.userId,
          is_validated: false,
          is_club_paid: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("Erreur lors de la création de l'entrée comptable instruction", insertError);
        throw insertError;
      }
    }

    // Gérer l'entrée comptable pour la rémunération de l'instructeur
    const { data: instructorFeeEntry, error: searchFeeError } = await supabase
      .from("account_entries")
      .select("*")
      .eq("flight_id", id)
      .eq("entry_type_id", "68818f41-b9cb-4f6c-bb5e-c38fae86e82d"); // remun instruction

    if (searchFeeError) {
      console.error("Erreur lors de la recherche de l'entrée de rémunération", searchFeeError);
      throw searchFeeError;
    }

    if (instructorFeeEntry && instructorFeeEntry.length > 0) {
      // Mettre à jour l'entrée existante
      const feeUpdateData = {
        amount: Math.abs(data.instructor_fee || 0),
        date: formattedDate,
        payment_method: data.paymentMethod,
        description: `Instruction vol du ${new Date(formattedDate).toLocaleDateString()} - ${((data.duration || 0) / 60).toFixed(1)}h`,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from("account_entries")
        .update(feeUpdateData)
        .eq("id", instructorFeeEntry[0].id);

      if (updateError) {
        console.error("Erreur lors de la mise à jour de l'entrée de rémunération", updateError);
        throw updateError;
      }
    } else if (data.instructor_fee) {
      // Créer une nouvelle entrée pour la rémunération
      const { error: insertError } = await supabase
        .from("account_entries")
        .insert({
          id: uuidv4(),
          user_id: data.instructorId,
          entry_type_id: "68818f41-b9cb-4f6c-bb5e-c38fae86e82d", // remun instruction
          date: formattedDate,
          amount: Math.abs(data.instructor_fee),
          payment_method: data.paymentMethod,
          description: `Instruction vol du ${new Date(formattedDate).toLocaleDateString()} - ${((data.duration || 0) / 60).toFixed(1)}h`,
          flight_id: id,
          assigned_to_id: data.instructorId,
          is_validated: false,
          is_club_paid: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("Erreur lors de la création de l'entrée de rémunération", insertError);
        throw insertError;
      }
    }
  }
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

  // Find and validate all corresponding account entries (both flight cost and instructor fees)
  const { error: accountError } = await supabase
    .from("account_entries")
    .update({ is_validated: true })
    .eq("flight_id", id);

  if (accountError) throw accountError;

  // If there's an instructor fee, create and validate the instructor payment entry
  if (flight.instructor_id && flight.instructor_fee) {
    const { data: entryTypes, error: entryTypesError } = await supabase
      .from("account_entry_types")
      .select("id")
      .eq("code", "INSTRUCTOR_PAYMENT")
      .single();

    if (entryTypesError) throw entryTypesError;

    const { error: instructorEntryError } = await supabase
      .from("account_entries")
      .insert({
        user_id: flight.instructor_id,
        assigned_to_id: flight.instructor_id,
        flight_id: flight.id,
        date: flight.date,
        entry_type_id: entryTypes.id,
        amount: flight.instructor_fee,
        payment_method: flight.payment_method,
        description: `Instruction vol ${flight.aircraft_id} - ${flight.duration}min`,
        is_validated: true,
        is_club_paid: false
      });

    if (instructorEntryError) throw instructorEntryError;
  }
}

export async function deleteFlight(id: string): Promise<void> {
  // Supprimer d'abord toutes les entrées comptables liées au vol
  const { error: deleteEntriesError } = await supabase
    .from("account_entries")
    .delete()
    .eq("flight_id", id);

  if (deleteEntriesError) {
    console.error("Erreur lors de la suppression des entrées comptables", deleteEntriesError);
    throw deleteEntriesError;
  }

  // Ensuite, supprimer le vol lui-même
  const { error: deleteFlightError } = await supabase
    .from("flights")
    .delete()
    .eq("id", id);

  if (deleteFlightError) {
    console.error("Erreur lors de la suppression du vol", deleteFlightError);
    throw deleteFlightError;
  }
}

export async function createFlightAccountEntry(
  flightData: Flight
): Promise<void> {
  const { data: entryTypes, error: entryTypesError } = await supabase
    .from("account_entry_types")
    .select("id, code")
    .eq("code", "FLIGHT");

  if (entryTypesError) {
    console.error("Erreur lors de la récupération des types d'entrées", entryTypesError);
    throw entryTypesError;
  }

  const flightTypeId = entryTypes[0].id;

  if (!flightTypeId) {
    throw new Error("Type d'entrée comptable non trouvé");
  }

  const { error } = await supabase.from("account_entries").insert({
    user_id: flightData.userId,
    assigned_to_id: flightData.userId,
    flight_id: flightData.id,
    date: flightData.date,
    entry_type_id: flightTypeId,
    amount: -flightData.cost,
    payment_method: flightData.paymentMethod,
    description: `Vol ${flightData.aircraftId} - ${flightData.duration}`,
    is_validated: false,
  });

  if (error) throw error;
}