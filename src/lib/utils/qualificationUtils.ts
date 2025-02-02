import { supabase } from "../supabase";
import type { QualificationType } from "../../types/database";

export const loadQualificationsWithOrder = async (clubId: string | undefined, qualifications: QualificationType[]) => {
  if (!clubId) return qualifications;

  try {
    // Charger l'ordre des qualifications
    const { data: orderData, error: orderError } = await supabase
      .from("qualification_order")
      .select("qualification_id, position")
      .eq("club_id", clubId)
      .order("position");

    if (orderError) throw orderError;

    // Créer un map des positions
    const orderMap = new Map(orderData?.map(item => [item.qualification_id, item.position]));

    // Trier les qualifications selon l'ordre
    return [...qualifications].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? Infinity;
      const orderB = orderMap.get(b.id) ?? Infinity;
      return orderA - orderB;
    });
  } catch (err) {
    console.error("Erreur lors du chargement de l'ordre des qualifications:", err);
    return qualifications;
  }
};
