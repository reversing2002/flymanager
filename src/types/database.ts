export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "ADMIN" | "PILOT" | "INSTRUCTOR" | "MECHANIC";
  gender?: string;
  birthDate?: string;
  imageUrl?: string;
  medicalCertification?: MedicalCertification;
  license?: License;
  qualifications?: Qualification[];
  createdAt: string;
  updatedAt: string;
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
  hourlyRate: number;
  lastMaintenance?: string;
  hoursBeforeMaintenance: number;
  status: "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE";
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  club_id?: string;
}

export interface Reservation {
  id: string;
  userId: string;
  pilotId: string;
  aircraftId: string;
  flightTypeId: string;
  startTime: string;
  endTime: string;
  withInstructor: boolean;
  instructorId?: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Flight {
  id: string;
  reservationId?: string;
  userId: string;
  aircraftId: string;
  flightTypeId: string;
  instructorId?: string;
  date: string;
  duration: number;
  destination?: string;
  hourlyRate: number;
  cost: number;
  paymentMethod: PaymentMethod;
  isValidated: boolean;
  accountingCategory: string;
  createdAt: string;
  updatedAt: string;
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
  userId: string;
  assignedToId: string;
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

export interface ClubEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  type: "SOCIAL" | "FLIGHT" | "TRAINING" | "MAINTENANCE" | "OTHER";
  visibility: "PUBLIC" | "INTERNAL";
  created_by: string;
  creator?: {
    firstName: string;
    lastName: string;
  };
  participants?: {
    user_id: string;
    status: "GOING" | "NOT_GOING" | "MAYBE";
    user?: {
      firstName: string;
      lastName: string;
    };
  }[];
}

export interface AircraftRemark {
  id: string;
  aircraft_id: string;
  user_id: string;
  content: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  created_at: string;
  updated_at: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

export interface AircraftRemarkResponse {
  id: string;
  remark_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}
