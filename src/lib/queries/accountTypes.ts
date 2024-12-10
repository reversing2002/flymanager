import { supabase } from "../supabase";
import type { AccountEntryType, NewAccountEntryType } from "../../types/accounts";

export async function getAccountEntryTypes(): Promise<AccountEntryType[]> {
  const { data, error } = await supabase
    .from("account_entry_types")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
}

export async function createAccountEntryType(data: NewAccountEntryType): Promise<void> {
  const { error } = await supabase
    .from("account_entry_types")
    .insert({
      code: data.code,
      name: data.name,
      description: data.description,
      is_credit: data.is_credit,
      is_system: false,
      club_id: data.club_id,
    });

  if (error) throw error;
}

export async function updateAccountEntryType(id: string, data: Partial<AccountEntryType>): Promise<void> {
  const { error } = await supabase
    .from("account_entry_types")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("is_system", false); // Empêche la modification des types système

  if (error) throw error;
}

export async function deleteAccountEntryType(id: string): Promise<void> {
  const { error } = await supabase
    .from("account_entry_types")
    .delete()
    .eq("id", id)
    .eq("is_system", false); // Empêche la suppression des types système

  if (error) throw error;
}
