import { supabase } from "../supabase";
import { getUserProfile } from "../supabase";
import type { Contribution } from "../../types/contribution";

export async function getContributionsByUserId(userId: string): Promise<Contribution[]> {
  const profile = await getUserProfile();
  const clubId = profile.club_id;

  const { data, error } = await supabase
    .from("member_contributions")
    .select(`
      *,
      account_entry:account_entries (
        id,
        amount,
        description,
        entry_type:account_entry_types!inner (
          code,
          name,
          is_credit
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createContribution(contribution: {
  user_id: string;
  valid_from: string;
  valid_until: string;
  amount: number;
  entry_date: string;
}) {
  const profile = await getUserProfile();
  const clubId = profile.club_id;

  if (!clubId) {
    throw new Error("Club ID not found in user profile");
  }

  // Get the membership entry type ID and credit/debit info
  const { data: entryType, error: entryTypeError } = await supabase
    .from("account_entry_types")
    .select("id, is_credit")
    .eq("code", "MEMBERSHIP")
    .single();

  if (entryTypeError || !entryType) {
    throw new Error("Could not find membership entry type");
  }

  // Adjust amount based on credit/debit
  const adjustedAmount = entryType.is_credit ? Math.abs(contribution.amount) : -Math.abs(contribution.amount);

  // First create the account entry
  const { data: accountEntry, error: accountEntryError } = await supabase
    .from("account_entries")
    .insert([{
      user_id: contribution.user_id,
      amount: adjustedAmount,
      entry_type_id: entryType.id,
      club_id: clubId,
      date: contribution.entry_date,
      assigned_to_id: contribution.user_id,
      payment_method: "ACCOUNT" as const,
      description: `Cotisation du ${new Date(contribution.valid_from).toLocaleDateString('fr-FR')} au ${new Date(contribution.valid_until).toLocaleDateString('fr-FR')}`
    }])
    .select(`
      *,
      entry_type:account_entry_types!inner (
        id,
        name
      )
    `)
    .single();

  if (accountEntryError) {
    throw accountEntryError;
  }

  // Then create the contribution linked to the account entry
  const { data: contributionData, error: contributionError } = await supabase
    .from("member_contributions")
    .insert([{
      user_id: contribution.user_id,
      valid_from: contribution.valid_from,
      valid_until: contribution.valid_until,
      account_entry_id: accountEntry.id
    }])
    .select(`
      *,
      account_entry:account_entries (
        amount,
        description,
        entry_type:account_entry_types!inner (
          code,
          name
        )
      )
    `)
    .single();

  if (contributionError) {
    // If contribution creation fails, we should delete the account entry
    await supabase
      .from("account_entries")
      .delete()
      .eq("id", accountEntry.id);
    throw contributionError;
  }

  return contributionData;
}

export async function updateContribution(
  id: string,
  contribution: {
    valid_from?: string;
    valid_until?: string;
    amount?: number;
  }
) {
  const profile = await getUserProfile();
  const clubId = profile.club_id;

  if (!clubId) {
    throw new Error("Club ID not found in user profile");
  }

  const { data: existingContribution, error: fetchError } = await supabase
    .from("member_contributions")
    .select("account_entry_id")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  // Update the account entry first
  if (contribution.amount) {
    const { error: accountEntryError } = await supabase
      .from("account_entries")
      .update({
        amount: contribution.amount,
        description: contribution.valid_from && contribution.valid_until
          ? `Cotisation du ${new Date(contribution.valid_from).toLocaleDateString('fr-FR')} au ${new Date(contribution.valid_until).toLocaleDateString('fr-FR')}`
          : undefined
      })
      .eq("id", existingContribution.account_entry_id);

    if (accountEntryError) {
      throw accountEntryError;
    }
  }

  // Then update the contribution
  const { data: updatedContribution, error: contributionError } = await supabase
    .from("member_contributions")
    .update({
      valid_from: contribution.valid_from,
      valid_until: contribution.valid_until
    })
    .eq("id", id)
    .select(`
      *,
      account_entry:account_entries (
        amount,
        description,
        entry_type:account_entry_types!inner (
          code,
          name
        )
      )
    `)
    .single();

  if (contributionError) {
    throw contributionError;
  }

  return updatedContribution;
}

export async function getAllActiveContributions(): Promise<Contribution[]> {
  const profile = await getUserProfile();
  const clubId = profile.club_id;

  const { data, error } = await supabase
    .from("member_contributions")
    .select(`
      *,
      account_entry:account_entries (
        id,
        amount,
        description,
        entry_type:account_entry_types!inner (
          code,
          name,
          is_credit
        )
      )
    `)
    .order("valid_from", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}
