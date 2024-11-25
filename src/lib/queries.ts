import { supabase } from "./supabase";
import type {
  User,
  Aircraft,
  Reservation,
  Flight,
  AccountEntry,
  FlightType,
  NewAccountEntry,
} from "../types/database";
import { v4 as uuidv4 } from "uuid";
import { formatDate } from "date-fns";

// User queries
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("users").select("*");

  if (error) throw error;

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0];
  };

  return data.map((user) => ({
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    birthDate: formatDate(user.birth_date),
    imageUrl: user.image_url,
    defaultSchedule: user.default_schedule,
    role: user.role,
    membershipExpiry: formatDate(user.membership_expiry),
    login: user.login,
    password: user.password,
    balance: user.balance,
    isInstructor: user.role === "INSTRUCTOR",
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }));
}

export async function getUserById(
  id: string,
  idType: "id" | "auth_id" = "id"
): Promise<User | null> {
  console.log(`🔍 Vérification des détails utilisateur:`, {
    id,
    idType,
    stack: new Error().stack,
  });

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq(idType, id)
    .single();

  if (error) {
    console.error("❌ Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }

  console.log("✅ Données utilisateur brutes:", data);
  console.log("👤 Rôle utilisateur:", data?.role);

  // Fonction helper pour formater les dates de manière sécurisée
  const safeFormatDate = (date: string | null) => {
    if (!date) return null;
    try {
      return formatDate(date);
    } catch (error) {
      console.warn(`Erreur de formatage de date pour ${date}:`, error);
      return null;
    }
  };

  return data
    ? {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        birthDate: safeFormatDate(data.birth_date),
        imageUrl: data.image_url,

        role: data.role,

        membershipExpiry: safeFormatDate(data.membership_expiry),
        login: data.login,
        password: data.password,
        balance: data.balance,
        isInstructor: data.role === "INSTRUCTOR",
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        auth_id: data.auth_id,
        isAdmin: data.role === "ADMIN",
      }
    : null;
}

export async function updateUser(userData: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  imageUrl?: string;
  role: string;
}) {
  console.log("Données reçues dans updateUser:", userData);

  // Préparation des données avec gestion des valeurs nulles pour les timestamps
  const updateData = {
    first_name: userData.firstName,
    last_name: userData.lastName,
    email: userData.email,
    phone: userData.phone || null,
    gender: userData.gender || null,
    birth_date: userData.birthDate
      ? new Date(userData.birthDate).toISOString()
      : null,
    image_url: userData.imageUrl || null,

    role: userData.role,
    updated_at: new Date().toISOString(),
  };

  console.log("Données formatées pour Supabase:", updateData);

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userData.id)
    .select();

  if (error) {
    console.error("Erreur Supabase:", error);
    throw error;
  }

  console.log("Données retournées par Supabase:", data);
  return data;
}

// Aircraft queries
export async function getAircraft(): Promise<Aircraft[]> {
  const { data, error } = await supabase.from("aircraft").select("*");

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

export async function updateAircraft(
  id: string,
  data: Partial<Aircraft>
): Promise<void> {
  const { error } = await supabase
    .from("aircraft")
    .update({
      name: data.name,
      type: data.type,
      registration: data.registration,
      capacity: data.capacity,
      hourly_rate: data.hourlyRate,
      status: data.status,
      hours_before_maintenance: data.hoursBeforeMaintenance,
      last_maintenance: data.lastMaintenance,
      image_url: data.imageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Erreur lors de la mise à jour:", error);
    throw error;
  }
}

// Reservation queries
export async function getReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase.from("reservations").select("*");

  if (error) throw error;
  return data.map((reservation) => ({
    id: reservation.id,
    userId: reservation.user_id,
    pilotId: reservation.pilot_id,
    aircraftId: reservation.aircraft_id,
    flightTypeId: reservation.flight_type_id,
    startTime: reservation.start_time,
    endTime: reservation.end_time,
    withInstructor: reservation.with_instructor,
    instructorId: reservation.instructor_id,
    status: reservation.status,
    comments: reservation.comments,
    createdAt: reservation.created_at,
    updatedAt: reservation.updated_at,
  }));
}

export async function createReservation(
  data: Partial<Reservation>
): Promise<void> {
  const startTime = new Date(data.startTime as string);
  const endTime = new Date(data.endTime as string);

  const { error } = await supabase.from("reservations").insert({
    id: data.id || uuidv4(),
    user_id: data.userId,
    pilot_id: data.pilotId,
    aircraft_id: data.aircraftId,
    flight_type_id: data.flightTypeId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    with_instructor: data.withInstructor,
    instructor_id: data.instructorId,
    status: data.status,
    comments: data.comments,
  });

  if (error) throw error;
}

export async function updateReservation(
  id: string,
  data: Partial<Reservation>
): Promise<void> {
  console.log("updateReservation appelé avec:", {
    id,
    data: JSON.stringify(data, null, 2),
  });

  // Vérification des champs requis
  if (!data.flightTypeId) {
    console.error("flightTypeId manquant ou vide");
    throw new Error("Le type de vol est requis");
  }

  if (!data.userId) {
    console.error("userId manquant ou vide");
    throw new Error("L'utilisateur est requis");
  }

  if (!data.pilotId) {
    console.error("pilotId manquant ou vide");
    throw new Error("Le pilote est requis");
  }

  if (!data.aircraftId) {
    console.error("aircraftId manquant ou vide");
    throw new Error("L'appareil est requis");
  }

  // Ajuster les dates pour tenir compte du fuseau horaire
  const startTime = data.startTime
    ? new Date(data.startTime).toISOString()
    : undefined;
  const endTime = data.endTime
    ? new Date(data.endTime).toISOString()
    : undefined;

  const updateData = {
    user_id: data.userId,
    pilot_id: data.pilotId,
    aircraft_id: data.aircraftId,
    flight_type_id: data.flightTypeId,
    start_time: startTime,
    end_time: endTime,
    with_instructor: data.withInstructor,
    instructor_id: data.instructorId || null,
    comments: data.comments,
    status: data.status || "ACTIVE",
    updated_at: new Date().toISOString(),
  };

  console.log("Données formatées pour Supabase:", {
    id,
    updateData: JSON.stringify(updateData, null, 2),
  });

  const { error } = await supabase
    .from("reservations")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Erreur Supabase:", error);
    throw error;
  }

  console.log("Mise à jour réussie pour la réservation:", id);
}

export async function deleteReservation(id: string): Promise<void> {
  try {
    // First delete any associated flight records
    const { error: flightError } = await supabase
      .from("flights")
      .delete()
      .eq("reservation_id", id);

    if (flightError) throw flightError;

    // Then delete the reservation
    const { error: reservationError } = await supabase
      .from("reservations")
      .delete()
      .eq("id", id);

    if (reservationError) throw reservationError;
  } catch (error) {
    console.error("Error deleting reservation:", error);
    throw error;
  }
}

// Flight queries
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

// Account entries queries
export async function getAccountEntries(): Promise<AccountEntry[]> {
  const { data, error } = await supabase
    .from("account_entries")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateAccountEntry(
  id: string,
  data: Partial<NewAccountEntry>
): Promise<void> {
  const { error } = await supabase
    .from("account_entries")
    .update({
      user_id: data.userId,
      assigned_to_id: data.assignedToId || null,
      date: data.date,
      type: data.type,
      amount: data.amount,
      payment_method: data.payment_method,
      description: data.description,
      is_validated: data.is_validated,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

// License and qualification queries
export async function getUserLicenses(userId: string) {
  const { data, error } = await supabase
    .from("pilot_licenses")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

export async function getUserQualifications(userId: string) {
  const { data, error } = await supabase
    .from("pilot_qualifications")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

export async function updatePilotLicenses(
  userId: string,
  licenses: any[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("pilot_licenses")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  if (licenses.length > 0) {
    const { error: insertError } = await supabase.from("pilot_licenses").insert(
      licenses.map((license) => ({
        user_id: userId,
        type: license.type,
        number: license.number,
        is_student: license.isStudent,
        valid_until: license.validUntil,
      }))
    );

    if (insertError) throw insertError;
  }
}

export async function updatePilotQualifications(
  userId: string,
  qualifications: any[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("pilot_qualifications")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  if (qualifications.length > 0) {
    const { error: insertError } = await supabase
      .from("pilot_qualifications")
      .insert(
        qualifications.map((qual) => ({
          user_id: userId,
          code: qual.code,
          name: qual.name,
          has_qualification: qual.hasQualification,
        }))
      );

    if (insertError) throw insertError;
  }
}

export const getFlightTypes = async (): Promise<FlightType[]> => {
  const { data, error } = await supabase
    .from("flight_types")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
};

export async function createAccountEntry(data: NewAccountEntry): Promise<void> {
  const { error } = await supabase.from("account_entries").insert({
    user_id: data.userId,
    assigned_to_id: data.assignedToId || null,
    date: data.date,
    type: data.type,
    amount: data.amount,
    payment_method: data.payment_method,
    description: data.description,
    is_validated: false,
  });

  if (error) throw error;
}

export async function deleteAccountEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("account_entries")
    .delete()
    .eq("id", id);

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

export async function getMembershipStatus(userId: string): Promise<boolean> {
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear + 1}-12-31`;

  const { data, error } = await supabase
    .from("account_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "MEMBERSHIP")
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    console.error("Error checking membership:", error);
    throw error;
  }

  return data.length > 0;
}

export async function getMemberBalance(userId: string) {
  const { data, error } = await supabase
    .from("account_entries")
    .select("amount, is_validated")
    .eq("user_id", userId);

  if (error) throw error;

  const validated = data
    .filter((entry) => entry.is_validated)
    .reduce((acc, entry) => acc + entry.amount, 0);

  const pending = data.reduce((acc, entry) => acc + entry.amount, 0);

  return {
    validated,
    pending,
  };
}

export async function getMembersWithBalance(): Promise<User[]> {
  try {
    // First get all users with their club memberships
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select(
        `
        *,
        medical_certifications (
          id,
          class,
          valid_until
        ),
        pilot_qualifications (
          id,
          code,
          name,
          has_qualification
        )
      `
      )
      .order("last_name");

    if (usersError) throw usersError;

    // Get pilot licenses separately
    const { data: licenses, error: licensesError } = await supabase
      .from("pilot_licenses")
      .select("*");

    if (licensesError) throw licensesError;

    // Get account entries for balance calculation
    const { data: entries, error: entriesError } = await supabase
      .from("account_entries")
      .select("user_id, amount, is_validated");

    if (entriesError) throw entriesError;

    // Process and format user data
    const processedUsers = users.map((user) => {
      // Get user's licenses
      const userLicenses = licenses.filter((l) => l.user_id === user.id);

      // Get latest medical certification
      const latestMedical = user.medical_certifications?.sort(
        (a, b) =>
          new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime()
      )[0];

      // Calculate balances
      const userEntries = entries.filter((entry) => entry.user_id === user.id);
      const validatedBalance = userEntries
        .filter((entry) => entry.is_validated)
        .reduce((acc, entry) => acc + entry.amount, 0);
      const pendingBalance = userEntries.reduce(
        (acc, entry) => acc + entry.amount,
        0
      );

      return {
        ...user,
        firstName: user.first_name,
        lastName: user.last_name,
        imageUrl: user.image_url,
        licenseNumber: userLicenses[0]?.number,
        licenseExpiry: userLicenses[0]?.valid_until,
        medicalExpiry: latestMedical?.valid_until,
        membershipExpiry: user.membership_expiry,
        defaultSchedule: user.default_schedule,
        registrationDate: user.registration_date,
        validatedBalance,
        pendingBalance,
        qualifications: user.pilot_qualifications || [],
      };
    });

    return processedUsers;
  } catch (error) {
    console.error("Error in getMembersWithBalance:", error);
    throw error;
  }
}
