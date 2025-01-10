import { supabase } from "../supabase";
import type { AccountEntry, NewAccountEntry, User } from "../../types/database";

export async function getAccountEntries(
  page: number = 1,
  pageSize: number = 10,
  filters: {
    startDate?: string;
    endDate?: string;
    type?: string;
    validated?: string;
    assignedToId?: string;
  } = {}
): Promise<{ data: AccountEntry[]; count: number }> {
  try {
    let query = supabase
      .from("account_entries")
      .select(`
        *,
        account_entry_types (
          id,
          code,
          name,
          description,
          is_credit
        ),
        flights(
          id,
          flight_type_id,
          flight_types(
            id,
            accounting_category_id,
            accounting_categories(
              id,
              is_club_paid
            )
          )
        )
      `, { count: 'exact' });

    // Appliquer les filtres
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    if (filters.type && filters.type !== 'all') {
      // Récupérer d'abord l'ID du type d'entrée à partir de son code
      const { data: typeData } = await supabase
        .from('account_entry_types')
        .select('id')
        .eq('code', filters.type)
        .single();

      if (typeData) {
        query = query.eq('entry_type_id', typeData.id);
      }
    }
    if (filters.validated && filters.validated !== 'all') {
      query = query.eq('is_validated', filters.validated === 'true');
    }
    if (filters.assignedToId && filters.assignedToId !== 'all') {
      query = query.eq('assigned_to_id', filters.assignedToId);
    }

    // Ajouter la pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    query = query
      .order('date', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('Erreur dans getAccountEntries:', error);
    throw error;
  }
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

    // Process and format user data
    const processedUsers = await Promise.all(users.map(async (user) => {
      // Get user's licenses
      const userLicenses = licenses.filter((l) => l.user_id === user.id);

      // Get latest medical certification
      const latestMedical = user.medical_certifications?.sort(
        (a, b) =>
          new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime()
      )[0];

      // Get account entries for balance calculation
      const { data: entries, error: entriesError } = await supabase
        .from("account_entries")
        .select(`
          *,
          account_entry_types(
            id,
            code,
            name,
            is_credit
          )
        `)
        .eq("assigned_to_id", user.id);

      if (entriesError) throw entriesError;

      // Calculate balances
      const userEntries = entries;
      
      // Calculate validated balance (only validated entries not paid by club)
      const validatedEntries = userEntries.filter(
        (entry) => entry.is_validated && !entry.is_club_paid
      );
      const validatedBalance = validatedEntries.reduce((acc, entry) => {
        return acc + entry.amount;
      }, 0);

      // Calculate pending balance (non-validated entries not paid by club)
      const pendingEntries = userEntries.filter(
        (entry) => !entry.is_validated && !entry.is_club_paid
      );
      const pendingBalance = pendingEntries.reduce((acc, entry) => {
        return acc + entry.amount;
      }, 0);

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
    }));

    return processedUsers;
  } catch (error) {
    console.error("Error in getMembersWithBalance:", error);
    throw error;
  }
}

export async function getMemberBalance(userId: string) {
  const { data: balances, error } = await supabase
    .rpc('calculate_pending_balance_from_date', {
      p_user_id: userId,
      p_date: new Date().toISOString()
    });

  if (error) throw error;

  if (!balances || !balances[0]) {
    return {
      validated: 0,
      pending: 0
    };
  }

  return {
    validated: balances[0].validated_balance || 0,
    pending: balances[0].total_balance || 0
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
    user_id: data.user_id,
    assigned_to_id: data.assigned_to_id,
    date: data.date,
    entry_type_id: data.entry_type_id,
    amount: data.amount,
    payment_method: data.payment_method,
    description: data.description,
    is_validated: data.is_validated,
    flight_id: data.flight_id,
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

// Fonction pour calculer le solde validé
export async function calculateMemberBalance(userId: string, date: string) {
  const { data: balance, error } = await supabase
    .rpc('calculate_balance_from_date', {
      p_user_id: userId,
      p_date: date
    });

  if (error) throw error;
  return balance || 0;
}

// Fonction pour calculer le solde en attente (solde final après application des transactions non validées)
export async function calculatePendingBalance(userId: string, date: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('calculate_pending_balance_from_date', {
      p_user_id: userId,
      p_date: date
    });

  if (error) throw error;
  
  // La fonction retourne maintenant un objet avec pending_amount
  return data[0]?.pending_amount || 0;
}

// Fonction pour calculer le solde total (validé + en attente)
export async function calculateTotalBalance(userId: string, date: string) {
  const { data: balance, error } = await supabase
    .rpc('calculate_total_balance_from_date', {
      p_user_id: userId,
      p_date: date
    });

  if (error) throw error;
  return balance || 0;
}