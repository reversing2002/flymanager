import { supabase } from '../supabaseClient';
import type { AccountingCategory } from '../../types/database';

export const getAccountingCategories = async () => {
  const { data, error } = await supabase
    .from('accounting_categories')
    .select('id, name, description, is_default, is_club_paid, display_order, club_id, is_system')
    .order('display_order', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
};

export const createAccountingCategory = async (
  name: string,
  description: string | null,
  isDefault: boolean,
  displayOrder: number,
  isClubPaid: boolean,
  clubId: string
) => {
  const { data, error } = await supabase
    .from('accounting_categories')
    .insert([
      {
        name,
        description,
        is_default: isDefault,
        display_order: displayOrder,
        is_club_paid: isClubPaid,
        club_id: clubId,
        is_system: false,
      },
    ])
    .select('id, name, description, is_default, is_club_paid, display_order, club_id, is_system')
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateAccountingCategory = async (
  id: string,
  updates: Partial<AccountingCategory>
) => {
  const { data, error } = await supabase
    .from('accounting_categories')
    .update(updates)
    .eq('id', id)
    .select('id, name, description, is_default, is_club_paid, display_order, club_id, is_system')
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteAccountingCategory = async (id: string) => {
  const { error } = await supabase
    .from('accounting_categories')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
};
