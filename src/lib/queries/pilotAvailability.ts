import { supabase } from '../supabase';
import type { PilotAvailability, CreatePilotAvailabilityDTO, UpdatePilotAvailabilityDTO } from '../../types/availability';

export async function getPilotAvailabilities(pilotId: string): Promise<PilotAvailability[]> {
  const { data, error } = await supabase
    .from('pilot_availabilities')
    .select(`
      *,
      pilot:pilot_id (
        id,
        first_name,
        last_name
      )
    `)
    .eq('pilot_id', pilotId)
    .order('day_of_week')
    .order('start_time');

  if (error) throw error;
  return data || [];
}

export async function createPilotAvailability(data: CreatePilotAvailabilityDTO): Promise<PilotAvailability> {
  const { data: availability, error } = await supabase
    .from('pilot_availabilities')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return availability;
}

export async function updatePilotAvailability(data: UpdatePilotAvailabilityDTO): Promise<void> {
  const { error } = await supabase
    .from('pilot_availabilities')
    .update(data)
    .eq('id', data.id);

  if (error) throw error;
}

export async function deletePilotAvailability(id: string): Promise<void> {
  const { error } = await supabase
    .from('pilot_availabilities')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
