import { supabase } from '../supabase';
import type { DiscoveryFlight, PilotAvailability } from '../../types/discovery';

export async function getDiscoveryFlights(): Promise<DiscoveryFlight[]> {
  const { data, error } = await supabase
    .from('discovery_flights')
    .select(`
      *,
      pilot:pilot_id(
        id,
        first_name,
        last_name
      ),
      aircraft:aircraft_id(
        id,
        registration,
        name
      ),
      passengers:discovery_flight_passengers(*)
    `)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getPilotAvailabilities(pilotId: string): Promise<PilotAvailability[]> {
  const { data, error } = await supabase
    .from('pilot_availabilities')
    .select('*')
    .eq('pilot_id', pilotId)
    .order('day_of_week')
    .order('start_time');

  if (error) throw error;
  return data;
}

export async function createPilotAvailability(availability: Partial<PilotAvailability>): Promise<void> {
  const { error } = await supabase
    .from('pilot_availabilities')
    .insert([availability]);

  if (error) throw error;
}

export async function deletePilotAvailability(id: string): Promise<void> {
  const { error } = await supabase
    .from('pilot_availabilities')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateDiscoveryFlightStatus(
  flightId: string,
  status: DiscoveryFlight['status']
): Promise<void> {
  const { error } = await supabase
    .from('discovery_flights')
    .update({ status })
    .eq('id', flightId);

  if (error) throw error;
}