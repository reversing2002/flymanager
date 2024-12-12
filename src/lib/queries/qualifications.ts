import { supabase } from "../supabase";
import type { QualificationType, PilotQualification } from "../../types/qualifications";

export async function getQualificationTypes(clubId: string) {
  const { data, error } = await supabase
    .from("qualification_types")
    .select("*")
    .eq("club_id", clubId)
    .order("display_order");

  if (error) throw error;
  return data as QualificationType[];
}

export async function createQualificationType(qualificationType: Omit<QualificationType, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("qualification_types")
    .insert([qualificationType])
    .select()
    .single();

  if (error) throw error;
  return data as QualificationType;
}

export async function updateQualificationType(id: string, updates: Partial<QualificationType>) {
  const { data, error } = await supabase
    .from("qualification_types")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as QualificationType;
}

export async function deleteQualificationType(id: string) {
  const { error } = await supabase
    .from("qualification_types")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getPilotQualifications(pilotId: string) {
  const { data, error } = await supabase
    .from("pilot_qualifications")
    .select(`
      *,
      qualification_type:qualification_types(*)
    `)
    .eq("pilot_id", pilotId);

  if (error) throw error;
  return data as PilotQualification[];
}

export async function addPilotQualification(qualification: Omit<PilotQualification, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("pilot_qualifications")
    .insert([qualification])
    .select()
    .single();

  if (error) throw error;
  return data as PilotQualification;
}

export async function updatePilotQualification(id: string, updates: Partial<PilotQualification>) {
  const { data, error } = await supabase
    .from("pilot_qualifications")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as PilotQualification;
}

export async function deletePilotQualification(id: string) {
  const { error } = await supabase
    .from("pilot_qualifications")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
