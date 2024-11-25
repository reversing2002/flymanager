import { supabase } from "../supabase";
import type { AccountEntry, NewAccountEntry, User } from "../../types/database";

export async function getAccountEntries(): Promise<AccountEntry[]> {
  const { data, error } = await supabase
    .from("account_entries")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;
  return data;
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

export async function getMemberBalance(userId: string) {
  const { data, error } = await supabase
    .from("account_entries")
    .select("amount, is_validated")
    .eq("assigned_to_id", userId);

  if (error) throw error;

  // Calculer le solde validé (uniquement les entrées validées)
  const validated = data
    .filter((entry) => entry.is_validated)
    .reduce((acc, entry) => acc + entry.amount, 0);

  // Calculer le solde non validé (uniquement les entrées non validées)
  const unvalidated = data
    .filter((entry) => !entry.is_validated)
    .reduce((acc, entry) => acc + entry.amount, 0);

  return {
    validated, // Solde des entrées validées uniquement
    pending: unvalidated, // Solde des entrées non validées uniquement
    total: validated + unvalidated, // Solde total
  };
}

export async function updateAccountEntry(
  id: string,
  data: Partial<AccountEntry>
): Promise<void> {
  const { error } = await supabase
    .from("account_entries")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

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

export async function getUserAccountEntries(
  userId: string
): Promise<AccountEntry[]> {
  const { data, error } = await supabase
    .from("account_entries")
    .select("*")
    .eq("assigned_to_id", userId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data;
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
