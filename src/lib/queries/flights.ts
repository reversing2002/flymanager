import { supabase } from '../supabase';
import type { Flight } from '../../types/database';
import { v4 as uuidv4 } from 'uuid';

export async function getFlights(): Promise<Flight[]> {
  const { data, error } = await supabase
    .from('flights')
    .select(`
      *,
      flight_type:flight_type_id (
        name,
        accounting_category
      )
    `);

  if (error) throw error;
  return data.map((flight) => ({
    id: flight.id,
    reservationId: flight.reservation_id,
    userId: flight.user_id,
    aircraftId: flight.aircraft_id,
    flightTypeId: flight.flight_type_id,
    instructorId: flight.instructor_id,
    date: flight.date,
    duration: flight.duration,
    destination: flight.destination,
    hourlyRate: flight.hourly_rate,
    cost: flight.cost,
    paymentMethod: flight.payment_method,
    isValidated: flight.is_validated,
    accountingCategory: flight.flight_type?.accounting_category || 'REGULAR',
    createdAt: flight.created_at,
    updatedAt: flight.updated_at,
  }));
}

export async function createFlight(data: Partial<Flight>): Promise<void> {
  try {
    // First get the user's club membership
    const { data: memberData, error: memberError } = await supabase
      .from('club_members')
      .select('club_id, clubs!inner(id)')
      .eq('user_id', data.userId)
      .single();

    if (memberError) {
      console.error('Error getting user club membership:', memberError);
      throw new Error('Unable to verify club membership');
    }

    if (!memberData?.club_id) {
      throw new Error('User is not a member of any club');
    }

    // Verify aircraft belongs to the same club
    const { data: aircraftData, error: aircraftError } = await supabase
      .from('aircraft')
      .select('hourly_rate, club_id')
      .eq('id', data.aircraftId)
      .eq('club_id', memberData.club_id)
      .single();

    if (aircraftError || !aircraftData) {
      console.error('Error verifying aircraft:', aircraftError);
      throw new Error('Aircraft not found or not accessible');
    }

    // Create flight data with club_id
    const flightData = {
      id: data.id || uuidv4(),
      reservation_id: data.reservationId || null,
      user_id: data.userId,
      aircraft_id: data.aircraftId,
      flight_type_id: data.flightTypeId,
      instructor_id: data.instructorId || null,
      date: data.date,
      duration: data.duration,
      destination: data.destination || null,
      hourly_rate: aircraftData.hourly_rate,
      cost: data.cost,
      payment_method: data.paymentMethod,
      is_validated: data.isValidated || false,
      club_id: memberData.club_id
    };

    // Create account entry with club_id
    const accountEntry = {
      id: uuidv4(),
      user_id: data.userId,
      assigned_to_id: data.userId,
      date: data.date,
      type: 'FLIGHT',
      amount: -Math.abs(data.cost || 0),
      payment_method: data.paymentMethod,
      description: `Vol ${data.aircraftId} - ${data.duration}min`,
      is_validated: false,
      club_id: memberData.club_id
    };

    // Create flight and account entry in a transaction
    const { error: transactionError } = await supabase.rpc(
      'create_flight_with_account_and_update',
      {
        flight_data: flightData,
        account_data: accountEntry,
        new_total_hours: 0,
        new_hours_before_maintenance: 0
      }
    );

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      throw transactionError;
    }
  } catch (error) {
    console.error('Error in createFlight:', error);
    throw error;
  }
}

export async function updateFlight(id: string, data: Partial<Flight>): Promise<void> {
  const { error } = await supabase
    .from('flights')
    .update({
      user_id: data.userId,
      aircraft_id: data.aircraftId,
      flight_type_id: data.flightTypeId,
      instructor_id: data.instructorId,
      date: data.date,
      duration: data.duration,
      destination: data.destination,
      hourly_rate: data.hourlyRate,
      cost: data.cost,
      payment_method: data.paymentMethod,
      is_validated: data.isValidated,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteFlight(id: string): Promise<void> {
  const { error } = await supabase
    .from('flights')
    .delete()
    .eq('id', id);

  if (error) throw error;
}