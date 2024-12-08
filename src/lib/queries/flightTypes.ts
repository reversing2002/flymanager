import { supabase } from "../supabase";
import type { FlightType } from "../../types/database";

export const getFlightTypes = async (): Promise<FlightType[]> => {
  const { data, error } = await supabase
    .from("flight_types")
    .select(`
      *,
      accounting_category:accounting_category_id (*)
    `)
    .order("display_order");

  if (error) throw error;
  return data;
};

export const createFlightType = async (flightType: Partial<FlightType>, clubId: string): Promise<FlightType> => {
  if (!clubId && !flightType.is_system) {
    throw new Error("club_id manquant");
  }

  // Retirer les champs qui ne sont pas dans la table
  const { accounting_category, ...flightTypeData } = flightType;

  const { data, error } = await supabase
    .from("flight_types")
    .insert({
      ...flightTypeData,
      club_id: clubId,
      is_system: false,
    })
    .select('id, name, description, requires_instructor, is_default, display_order, accounting_category_id, club_id, is_system')
    .single();

  if (error) throw error;
  return data;
};

export const updateFlightType = async (id: string, flightType: Partial<FlightType>, clubId: string): Promise<FlightType> => {
  if (!clubId && !flightType.is_system) {
    throw new Error("club_id manquant");
  }

  // Retirer les champs qui ne sont pas dans la table
  const { accounting_category, ...flightTypeData } = flightType;

  const { data, error } = await supabase
    .from("flight_types")
    .update({
      ...flightTypeData,
      club_id: clubId,
    })
    .eq("id", id)
    .select('id, name, description, requires_instructor, is_default, display_order, accounting_category_id, club_id, is_system')
    .single();

  if (error) throw error;
  return data;
};

export const deleteFlightType = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("flight_types")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
