import { supabase } from '../supabase';
import type { MaintenanceOperation, MaintenanceHistory, MaintenanceType } from '../../types/maintenance';

export async function getMaintenanceTypes(): Promise<MaintenanceType[]> {
  const { data, error } = await supabase
    .from('maintenance_types')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getAircraftMaintenanceOperations(aircraftId: string): Promise<MaintenanceOperation[]> {
  const { data, error } = await supabase
    .from('aircraft_maintenance_operations')
    .select(`
      *,
      maintenanceType:maintenance_type_id (*)
    `)
    .eq('aircraft_id', aircraftId)
    .order('next_due_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getMaintenanceHistory(aircraftId: string): Promise<MaintenanceHistory[]> {
  const { data, error } = await supabase
    .from('maintenance_history')
    .select(`
      *,
      maintenanceType:maintenance_type_id (*),
      performer:performed_by (
        firstName:first_name,
        lastName:last_name
      )
    `)
    .eq('aircraft_id', aircraftId)
    .order('performed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createMaintenanceOperation(data: Partial<MaintenanceOperation>): Promise<void> {
  const { error } = await supabase
    .from('aircraft_maintenance_operations')
    .insert([data]);

  if (error) throw error;
}

export async function completeMaintenanceOperation(
  operation: MaintenanceOperation,
  historyEntry: Partial<MaintenanceHistory>
): Promise<void> {
  const { error: historyError } = await supabase
    .from('maintenance_history')
    .insert([historyEntry]);

  if (historyError) throw historyError;

  // Update the operation with new dates/hours
  const { error: operationError } = await supabase
    .from('aircraft_maintenance_operations')
    .update({
      last_performed_at: new Date().toISOString(),
      hours_at_maintenance: historyEntry.hours,
      cycles_at_maintenance: historyEntry.cycles,
      updated_at: new Date().toISOString()
    })
    .eq('id', operation.id);

  if (operationError) throw operationError;
}

export async function updateAircraftMaintenanceStatus(
  aircraftId: string,
  data: {
    totalFlightHours?: number;
    totalCycles?: number;
    nextMaintenanceDate?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('aircraft')
    .update(data)
    .eq('id', aircraftId);

  if (error) throw error;
}

export type AircraftStats = {
  id: string;
  registration: string;
  name: string;
  model: string;
  total_hours: number;
  hours_before_maintenance: number;
  last_maintenance: string | null;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  maintenance_status: 'OK' | 'WARNING' | 'URGENT';
  total_flights_30d: number;
  total_hours_30d: number;
  last_flight: string | null;
};

export type MaintenanceStats = {
  aircraft_stats: AircraftStats[];
  alerts_count: {
    overdue: number;
    urgent: number;
    warning: number;
    ok: number;
  };
};

export async function getMaintenanceStats(): Promise<MaintenanceStats> {
  try {
    const { data, error } = await supabase
      .rpc('get_maintenance_stats');

    if (error) {
      console.error("Erreur lors de la récupération des statistiques de maintenance:", error);
      throw error;
    }

    return data || { aircraft_stats: [], alerts_count: { overdue: 0, urgent: 0, warning: 0, ok: 0 } };
  } catch (error) {
    console.error("Erreur dans getMaintenanceStats:", error);
    throw error;
  }
}