import type { Role } from './roles';
import type { UserDefaultMode } from './availability';

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  image_url?: string;
  default_mode: UserDefaultMode;
  roles: Role[];
  club?: {
    id: string;
    name: string;
  };
}

export interface MedicalCertification {
  id: string;
  class: "CLASS_1" | "CLASS_2";
  valid_from: string;
  valid_until: string;
  document_url?: string;
}

export interface License {
  id: string;
  type: string;
  number?: string;
  valid_until?: string;
  document_url?: string;
}

export interface Qualification {
  id: string;
  code: string;
  name: string;
  has_qualification: boolean;
}

export interface Aircraft {
  id: string;
  name: string;
  type: string;
  registration: string;
  capacity: number;
  hourly_rate: number;
  last_maintenance: Date;
  hours_before_maintenance: number;
  status: string;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
  club_id: string;
  aircraft_order?: Array<{ position: number }>;
  last_hour_meter?: number;  // Last recorded hour meter reading
  hour_format?: "DECIMAL" | "CLASSIC";  // Format d'affichage des heures
}

export interface AircraftRemark {
  id: string;
  aircraft_id: string;
  user_id: string;
  content: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  created_at: string;
  updated_at: string;
  image_url?: string;
  video_url?: string;
  document_url?: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

export interface AircraftRemarkResponse {
  id: string;
  remark_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

export interface Reservation {
  id: string;
  user_id: string;
  pilot_id: string;
  aircraft_id: string;
  flight_type_id: string;
  start_time: string;
  end_time: string;
  with_instructor: boolean;
  instructor_id?: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface Flight {
  id: string;
  reservation_id?: string;
  user_id: string;
  aircraft_id: string;
  flight_type_id: string;
  instructor_id?: string;
  date: string;
  duration: number;
  start_hour_meter?: number;  // Start hour meter reading
  end_hour_meter?: number;    // End hour meter reading
  destination?: string;
  hourly_rate: number;
  cost: number;
  instructor_cost?: number;  // Coût total de l'instruction pour ce vol
  instructor_fee?: number;   // Taux horaire de l'instructeur appliqué pour ce vol
  payment_method: PaymentMethod;
  is_validated: boolean;
  accounting_category: string;
  created_at: string;
  updated_at: string;
  flightType?: FlightType;
}

export interface AccountingCategory {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  display_order: number;
  is_club_paid: boolean;
  club_id: string | null;
  is_system: boolean;
}

export interface FlightType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  requires_instructor: boolean;
  accounting_category_id: string;
  accounting_category?: AccountingCategory;
  is_default: boolean;
  display_order: number;
}

export type PaymentMethod = "CARD" | "CASH" | "ACCOUNT" | "TRANSFER" | "CHECK";

export interface AccountEntry {
  id: string;
  user_id: string;
  assigned_to_id: string;
  date: string;
  entry_type_id: string;
  account_entry_types?: AccountEntryType;
  amount: number;
  payment_method: PaymentMethod;
  description?: string;
  is_validated: boolean;
  is_club_paid: boolean;
  flight_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountEntryType {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_credit: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewAccountEntry {
  user_id: string;
  assigned_to_id: string;
  date: string;
  entry_type_id: string;
  amount: number;
  payment_method: PaymentMethod;
  description?: string;
  is_validated: boolean;
  is_club_paid: boolean;
  flight_id?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: 'GOING' | 'NOT_GOING' | 'MAYBE';
  created_at?: string;
  updated_at?: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

export interface ClubEvent {
  id: string;
  club_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time: string;
  type: 'SOCIAL' | 'FLIGHT' | 'TRAINING' | 'MAINTENANCE';
  visibility: 'PUBLIC' | 'INTERNAL';
  created_at?: string;
  updated_at?: string;
  creator?: {
    first_name: string;
    last_name: string;
  };
  participants?: EventParticipant[];
}

export interface DocumentCategory {
  id: string;
  name: string;
  parent_id: string | null;
  club_id: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  description: string | null;
  category_id: string;
  file_url: string;
  file_type: string;
  file_size: number;
  required_role: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  display_order: number;
  category?: DocumentCategory;
  creator?: {
    first_name: string;
    last_name: string;
  };
}