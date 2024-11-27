export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'PILOT' | 'INSTRUCTOR' | 'MECHANIC';
  gender?: string;
  birth_date?: string;
  image_url?: string;
  medical_certification?: MedicalCertification;
  license?: License;
  qualifications?: Qualification[];
  created_at: string;
  updated_at: string;
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
  destination?: string;
  hourly_rate: number;
  cost: number;
  payment_method: PaymentMethod;
  is_validated: boolean;
  accounting_category: string;
  created_at: string;
  updated_at: string;
}

export interface FlightType {
  id: string;
  name: string;
  description?: string;
  requires_instructor: boolean;
  accounting_category: string;
}

export type PaymentMethod = "ACCOUNT" | "CARD" | "CASH" | "TRANSFER";

export interface AccountEntry {
  id: string;
  user_id: string;
  assigned_to_id: string;
  date: string;
  type: AccountEntryType;
  amount: number;
  payment_method: PaymentMethod;
  description?: string;
  is_validated: boolean;
  created_at: string;
  updated_at: string;
}

export type AccountEntryType =
  | "SUBSCRIPTION"
  | "MEMBERSHIP"
  | "FLIGHT"
  | "INSTRUCTION"
  | "FUEL"
  | "MAINTENANCE"
  | "INSURANCE"
  | "FFA"
  | "ACCOUNT_FUNDING"
  | "OTHER";

export interface NewAccountEntry {
  user_id: string;
  assigned_to_id: string;
  date: string;
  type: AccountEntryType;
  amount: number;
  payment_method: PaymentMethod;
  description?: string;
  is_validated: boolean;
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
  category?: DocumentCategory;
  creator?: {
    first_name: string;
    last_name: string;
  };
}