import { supabase } from "../lib/supabase";
import { AircraftOrder } from "../types/aircraft";

export const getAircraftOrder = async (clubId: string): Promise<{ [key: string]: number }> => {
  try {
    const { data, error } = await supabase
      .from("aircraft_order")
      .select("aircraft_id, position")
      .eq("club_id", clubId);

    if (error) throw error;

    // Convertir les positions en divisant par 100 pour avoir des nombres entiers
    return data.reduce((acc, { aircraft_id, position }) => {
      acc[aircraft_id] = position / 100;
      return acc;
    }, {} as { [key: string]: number });
  } catch (error) {
    console.error("Error getting aircraft order:", error);
    throw error;
  }
};

export const updateAircraftOrder = async (
  clubId: string,
  order: { [key: string]: number }
): Promise<void> => {
  try {
    // Convertir les positions en les multipliant par 100 pour éviter les conflits
    const updates = Object.entries(order).map(([aircraft_id, position]) => ({
      club_id: clubId,
      aircraft_id,
      position: position * 100,
    }));

    // Supprimer les anciens ordres
    const { error: deleteError } = await supabase
      .from("aircraft_order")
      .delete()
      .eq("club_id", clubId);

    if (deleteError) throw deleteError;

    // Insérer les nouveaux ordres
    const { error: insertError } = await supabase
      .from("aircraft_order")
      .insert(updates);

    if (insertError) throw insertError;
  } catch (error) {
    console.error("Error updating aircraft order:", error);
    throw error;
  }
};
