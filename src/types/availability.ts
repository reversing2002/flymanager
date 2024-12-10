// src/types/availability.ts
export interface Availability {
  id: string;
  user_id?: string;
  aircraft_id?: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
  reason?: string;
  created_at: string;
  updated_at: string;
  club_id: string;
}

export interface CreateAvailabilityDTO {
  user_id?: string;
  aircraft_id?: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
  reason?: string;
}

export interface UpdateAvailabilityDTO extends Partial<CreateAvailabilityDTO> {
  id: string;
}
