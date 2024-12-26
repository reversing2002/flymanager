import { User, Aircraft } from './database';

export interface DiscoveryFlight {
  id: string;
  pilot_id: string | null;
  aircraft_id: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  total_weight: number;
  comments: string;
  created_at: string;
  updated_at: string;
  passenger_count: number;
  preferred_dates: string;
  contact_email: string;
  contact_phone: string;
  club_id: string;
  pilot?: User;
  aircraft?: Aircraft;
}

export interface EmergencyContact {
  nom: string;
  adresse: string;
  telephone: string;
}

export interface PassengerInfo {
  nom: string;
  prenom: string;
  dateNaissance: string;
  isMineur: boolean;
  autorisationParentale?: string;
  contactsUrgence: EmergencyContact[];
}

export interface PassengerInfoRecord {
  id: string;
  flight_id: string;
  passenger_data: {
    passengers: PassengerInfo[];
  };
  created_at: string;
  updated_at: string;
}

export interface Passenger {
  id: string;
  flight_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  weight: number;
  is_minor: boolean;
  created_at: string;
  updated_at: string;
}

export interface PilotAvailability {
  id: string;
  pilot_id: string;
  day_of_week: number; // 0-6 for Sunday-Saturday
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  is_recurring: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}