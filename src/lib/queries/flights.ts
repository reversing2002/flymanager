import { supabase } from "../supabase";
import type { Flight, FlightType } from "../../types/database";
import { v4 as uuidv4 } from "uuid";
import { getOrCreateAccount, createJournalEntry, transformPilotAccountCode } from "../accounting/accountingUtils";

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

export async function createFlight(data: Partial<Flight>): Promise<Flight> {
  const flightData = {
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
    instructor_cost: data.instructor_cost,
    payment_method: data.paymentMethod,
    is_validated: data.isValidated,
    start_hour_meter: data.start_hour_meter,
    end_hour_meter: data.end_hour_meter,
  };

  const { data: newFlight, error: flightError } = await supabase
    .from("flights")
    .insert(flightData)
    .select()
    .single();

  if (flightError) throw flightError;
  if (!newFlight) throw new Error("Le vol n'a pas pu être créé");

  // Récupérer les informations de l'élève
  const { data: student, error: studentError } = await supabase
    .from("users")
    .select("first_name, last_name")
    .eq("id", data.userId)
    .single();

  if (studentError) {
    console.error("Erreur lors de la récupération des informations de l'élève", studentError);
    throw studentError;
  }

  // Récupérer les types d'entrées comptables
  const { data: entryTypes, error: entryTypesError } = await supabase
    .from("account_entry_types")
    .select("id, code");

  if (entryTypesError) {
    console.error("Erreur lors de la récupération des types d'entrées", entryTypesError);
    throw entryTypesError;
  }

  const flightTypeId = entryTypes.find(t => t.code === "FLIGHT")?.id;
  const instructionTypeId = entryTypes.find(t => t.code === "INSTRUCTION")?.id;
  const instructorFeeTypeId = "68818f41-b9cb-4f6c-bb5e-c38fae86e82d"; // remun instruction

  if (!flightTypeId || !instructionTypeId) {
    throw new Error("Types d'entrées comptables non trouvés");
  }

  // Créer l'entrée pour le coût de l'avion
  const { error: flightEntryError } = await supabase
    .from("account_entries")
    .insert({
      id: uuidv4(),
      user_id: data.userId,
      assigned_to_id: data.userId,
      flight_id: newFlight.id,
      entry_type_id: flightTypeId,
      date: data.date,
      amount: -data.cost,
      payment_method: data.paymentMethod,
      description: data.instructorId 
        ? `Vol instruction ${student.first_name} ${student.last_name} - ${data.duration}min`
        : `Vol ${data.aircraftId} - ${data.duration}min`,
      is_validated: false,
    });

  if (flightEntryError) {
    console.error("Erreur lors de la création de l'entrée comptable du vol", flightEntryError);
    throw flightEntryError;
  }

  // Si il y a un instructeur, créer les entrées d'instruction
  if (data.instructorId && data.instructor_cost > 0) {
    // Entrée pour le coût de l'instruction (débit élève)
    const { error: instructionEntryError } = await supabase
      .from("account_entries")
      .insert({
        id: uuidv4(),
        user_id: data.userId,
        assigned_to_id: data.userId,
        flight_id: newFlight.id,
        entry_type_id: instructionTypeId,
        date: data.date,
        amount: -(data.instructor_cost || 0),
        payment_method: data.paymentMethod,
        description: `Instruction ${student.first_name} ${student.last_name} - ${data.duration}min`,
        is_validated: false,
      });

    if (instructionEntryError) {
      console.error("Erreur lors de la création de l'entrée d'instruction", instructionEntryError);
      throw instructionEntryError;
    }

    // Entrée pour la rémunération de l'instructeur (crédit instructeur)
    const { error: instructorFeeEntryError } = await supabase
      .from("account_entries")
      .insert({
        id: uuidv4(),
        user_id: data.instructorId,
        assigned_to_id: data.instructorId,
        flight_id: newFlight.id,
        entry_type_id: instructorFeeTypeId,
        date: data.date,
        amount: data.instructor_fee || 0,
        payment_method: data.paymentMethod,
        description: `Instruction ${student.first_name} ${student.last_name} - ${data.duration}min`,
        is_validated: false,
      });

    if (instructorFeeEntryError) {
      console.error("Erreur lors de la création de l'entrée de rémunération", instructorFeeEntryError);
      throw instructorFeeEntryError;
    }
  }

  return newFlight as Flight;
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

  // Supprimer toutes les entrées comptables liées au vol via la procédure stockée
  console.log("Suppression des entrées comptables pour le vol", id);
  const { error: deleteError } = await supabase.rpc('delete_flight_entries', {
    p_flight_id: id
  });

  if (deleteError) {
    console.error("Erreur lors de la suppression des entrées comptables:", deleteError);
    throw deleteError;
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
    instructor_cost: data.instructor_cost,
    payment_method: data.paymentMethod,
    is_validated: data.isValidated || false,
    updated_at: new Date().toISOString(),
    start_hour_meter: data.start_hour_meter,
    end_hour_meter: data.end_hour_meter,
  };

  // Mettre à jour le vol
  const { error: updateError } = await supabase
    .from("flights")
    .update(updatedData)
    .eq("id", id);

  if (updateError) {
    console.error("Erreur lors de la mise à jour du vol", updateError);
    throw updateError;
  }

  console.log("Vol mis à jour avec succès, création des nouvelles entrées comptables...");

  // Get the account entry types
  const { data: entryTypes, error: entryTypesError } = await supabase
    .from("account_entry_types")
    .select("id, code");

  if (entryTypesError) {
    console.error("Erreur lors de la récupération des types d'entrées", entryTypesError);
    throw entryTypesError;
  }

  const flightTypeId = entryTypes.find(t => t.code === "FLIGHT")?.id;
  const instructionTypeId = entryTypes.find(t => t.code === "INSTRUCTION")?.id;
  const instructorFeeTypeId = "68818f41-b9cb-4f6c-bb5e-c38fae86e82d"; // remun instruction

  if (!flightTypeId || !instructionTypeId) {
    throw new Error("Types d'entrées comptables non trouvés");
  }

  // S'assurer que la date est au bon format (YYYY-MM-DD)
  const formattedDate = new Date(data.date || "").toISOString().split('T')[0];

  // Créer l'entrée pour le coût de l'avion
  console.log("Création de l'entrée comptable pour l'avion...");
  const { error: flightEntryError } = await supabase
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

  if (flightEntryError) {
    console.error("Erreur lors de la création de l'entrée comptable avion", flightEntryError);
    throw flightEntryError;
  }

  // Si c'est un vol avec instructeur, créer les entrées correspondantes
  if (data.instructorId && data.instructor_cost) {
    console.log("Création des entrées comptables pour l'instruction...");
    
    // Entrée pour le coût d'instruction
    const { error: instructionEntryError } = await supabase
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

    if (instructionEntryError) {
      console.error("Erreur lors de la création de l'entrée comptable instruction", instructionEntryError);
      throw instructionEntryError;
    }

    // Entrée pour la rémunération de l'instructeur
    if (data.instructor_fee) {
      console.log("Création de l'entrée comptable pour la rémunération de l'instructeur...");
      const { error: feeEntryError } = await supabase
        .from("account_entries")
        .insert({
          id: uuidv4(),
          user_id: data.instructorId,
          entry_type_id: instructorFeeTypeId,
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

      if (feeEntryError) {
        console.error("Erreur lors de la création de l'entrée de rémunération", feeEntryError);
        throw feeEntryError;
      }
    }
  }

  console.log("Mise à jour du vol et des entrées comptables terminée avec succès");
}

export async function validateFlight(id: string): Promise<void> {
  // 1. Récupérer toutes les informations du vol
  const { data: flight, error: flightError } = await supabase
    .from("flights")
    .select(`
      *,
      user:user_id (
        first_name,
        last_name
      ),
      instructor:instructor_id (
        first_name,
        last_name
      ),
      flight_type:flight_type_id (
        *,
        accounting_category:accounting_categories!accounting_category_id(*)
      )
    `)
    .eq("id", id)
    .single();

  if (flightError) throw flightError;

  // 2. Créer ou récupérer les comptes nécessaires
  const pilotName = `${flight.user.first_name} ${flight.user.last_name}`;
  const pilotAccountId = await getOrCreateAccount(
    transformPilotAccountCode(`Compte pilote ${pilotName}`, `411PIL${flight.user_id}`, false),
    `Compte pilote ${pilotName}`,
    'USER_ACCOUNT',
    'USER',
    flight.club_id,
    flight.user_id
  );

  // Compte de produit pour le vol
  const flightRevenueAccountId = await getOrCreateAccount(
    '706VOL',
    'Produits des vols',
    'INCOME',
    'REVENUE',
    flight.club_id
  );

  // Compte bancaire du club
  const clubBankAccountId = await getOrCreateAccount(
    '512000',
    'Compte bancaire principal',
    'BANK_ACCOUNT',
    'ASSET',
    flight.club_id
  );

  // Si instruction, créer les comptes supplémentaires
  let instructorAccountId: string | undefined;
  let instructionRevenueAccountId: string | undefined;
  
  if (flight.instructor_id) {
    const instructorName = `${flight.instructor.first_name} ${flight.instructor.last_name}`;
    instructorAccountId = await getOrCreateAccount(
      transformPilotAccountCode(`Compte instructeur ${instructorName}`, `421INS${flight.instructor_id}`, true),
      `Compte instructeur ${instructorName}`,
      'INSTRUCTOR_ACCOUNT',
      'INSTRUCTOR',
      flight.club_id,
      flight.instructor_id
    );

    instructionRevenueAccountId = await getOrCreateAccount(
      '706INSTR',
      'Produits instruction',
      'INCOME',
      'REVENUE',
      flight.club_id
    );
  }

  // 3. Créer les écritures comptables
  // Écriture pour le coût du vol
  await createJournalEntry(
    flight.date,
    `Vol ${flight.aircraft_id} - ${flight.duration}min`,
    flight.club_id,
    [
      {
        accountId: pilotAccountId,
        debitAmount: flight.cost,
        creditAmount: 0
      },
      {
        accountId: flightRevenueAccountId,
        debitAmount: 0,
        creditAmount: flight.cost
      }
    ]
  );

  // Si instruction, créer les écritures pour les frais d'instruction
  if (flight.instructor_id && instructorAccountId && instructionRevenueAccountId) {
    // Écriture pour le coût d'instruction (du compte pilote vers le compte instruction du club)
    if (flight.instructor_cost > 0) {
      await createJournalEntry(
        flight.date,
        `Coût instruction ${pilotName} - ${flight.duration}min`,
        flight.club_id,
        [
          {
            accountId: pilotAccountId,
            debitAmount: flight.instructor_cost,
            creditAmount: 0
          },
          {
            accountId: instructionRevenueAccountId,
            debitAmount: 0,
            creditAmount: flight.instructor_cost
          }
        ]
      );
    }

    // Écriture pour les honoraires de l'instructeur (du compte banque du club vers le compte instructeur)
    if (flight.instructor_fee > 0) {
      await createJournalEntry(
        flight.date,
        `Honoraires instructeur ${flight.instructor.first_name} ${flight.instructor.last_name} - ${flight.duration}min`,
        flight.club_id,
        [
          {
            accountId: clubBankAccountId,
            debitAmount: flight.instructor_fee,
            creditAmount: 0
          },
          {
            accountId: instructorAccountId,
            debitAmount: 0,
            creditAmount: flight.instructor_fee
          }
        ]
      );
    }
  }

  // 4. Marquer le vol comme validé
  const { error: updateFlightError } = await supabase
    .from("flights")
    .update({ is_validated: true })
    .eq("id", id);

  if (updateFlightError) throw updateFlightError;

  // 5. Marquer les entrées comptables comme validées
  const { error: accountError } = await supabase
    .from("account_entries")
    .update({ is_validated: true })
    .eq("flight_id", id);

  if (accountError) throw accountError;
}

export async function deleteFlight(id: string): Promise<void> {
  // Démarrer une transaction
  const { error: transactionError } = await supabase.rpc('delete_flight_with_entries', {
    p_flight_id: id
  });

  if (transactionError) {
    console.error("Erreur lors de la suppression du vol et de ses entrées", transactionError);
    throw transactionError;
  }
}

export async function createFlightAccountEntry(
  flightData: Flight | any
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

  const userId = flightData.userId || flightData.user_id;
  if (!userId) {
    throw new Error("ID utilisateur manquant pour la création de l'entrée comptable");
  }

  const { error } = await supabase.from("account_entries").insert({
    user_id: userId,
    assigned_to_id: userId,
    flight_id: flightData.id,
    date: flightData.date,
    entry_type_id: flightTypeId,
    amount: -(flightData.cost || flightData.hourly_rate * (flightData.duration / 60)),
    payment_method: flightData.paymentMethod || flightData.payment_method,
    description: `Vol ${flightData.aircraftId || flightData.aircraft_id} - ${flightData.duration}`,
    is_validated: false,
  });

  if (error) {
    console.error("Erreur lors de la création de l'entrée comptable", error);
    throw error;
  }
}