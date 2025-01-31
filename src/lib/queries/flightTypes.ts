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
  // 1. Récupérer d'abord le type de vol qu'on veut supprimer pour avoir son club_id
  const { data: typeToDelete, error: typeError } = await supabase
    .from("flight_types")
    .select("club_id")
    .eq("id", id)
    .single();

  if (typeError) throw typeError;

  // 2. Trouver le type de vol par défaut pour ce club
  const { data: defaultType, error: defaultTypeError } = await supabase
    .from("flight_types")
    .select("id")
    .eq("is_default", true)
    .eq("club_id", typeToDelete.club_id)
    .single();

  if (defaultTypeError || !defaultType) {
    throw new Error("Aucun type de vol par défaut trouvé. Veuillez en définir un avant de supprimer ce type.");
  }

  // 3. Mettre à jour tous les vols qui utilisent ce type vers le type par défaut
  const { error: updateError } = await supabase
    .from("flights")
    .update({ flight_type_id: defaultType.id })
    .eq("flight_type_id", id);

  if (updateError) {
    throw new Error("Erreur lors de la mise à jour des vols associés");
  }

  // 4. Supprimer le type de vol
  const { error } = await supabase
    .from("flight_types")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
