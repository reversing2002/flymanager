// src/types/availability.ts
export type AvailabilitySlotType = 'available' | 'unavailable' | 'reservation';
export type UserDefaultMode = 'default-available' | 'default-unavailable';

export interface Availability {
  id: string;
  start_time: string;
  end_time: string;
  user_id: string;
  aircraft_id?: string;
  slot_type: AvailabilitySlotType;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
  users?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  aircraft?: {
    id: string;
    registration: string;
    name: string;
  };
  instructor_id?: string;
  instructor?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  club_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAvailabilityDTO {
  start_time: string;
  end_time: string;
  user_id: string;
  aircraft_id?: string;
  slot_type: AvailabilitySlotType;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
}

export interface UpdateAvailabilityDTO extends Partial<CreateAvailabilityDTO> {
  id: string;
}
