// User types
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'PILOT' | 'INSTRUCTOR' | 'MECHANIC';
  gender?: string;
  birthDate?: string;
  imageUrl?: string;
  defaultSchedule?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  medicalExpiry?: string;
  sepValidity?: string;
  membershipExpiry?: string;
  registrationDate?: string;
  validatedBalance?: number;
  pendingBalance?: number;
  createdAt: string;
  updatedAt: string;
  isInstructor?: boolean;
  isAdmin?: boolean;
  qualifications?: PilotQualification[];
};

export type PilotQualification = {
  id: string;
  code: string;
  name: string;
  hasQualification: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// Aircraft types
export type Aircraft = {
  id: string;
  name: string;
  type: string;
  registration: string;
  capacity: number;
  hourlyRate: number;
  lastMaintenance?: string;
  hoursBeforeMaintenance: number;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'UNAVAILABLE';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type AircraftRemark = {
  id: string;
  aircraftId: string;
  userId: string;
  content: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
};

export type AircraftRemarkResponse = {
  id: string;
  remarkId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
};

// Reservation types
export type Reservation = {
  id: string;
  userId: string;
  pilotId: string;
  aircraftId: string;
  flightTypeId: string;
  startTime: string;
  endTime: string;
  withInstructor: boolean;
  instructorId?: string;
  status: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
};

// Flight types
export type Flight = {
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
  paymentMethod: 'ACCOUNT' | 'CARD' | 'CASH' | 'TRANSFER';
  isValidated: boolean;
  accountingCategory?: string;
  createdAt: string;
  updatedAt: string;
};

export type FlightType = {
  id: string;
  name: string;
  description?: string;
  requiresInstructor: boolean;
  accountingCategory: string;
  createdAt: string;
  updatedAt: string;
};

// Account types
export type AccountEntry = {
  id: string;
  user_id: string;
  assigned_to_id?: string;
  date: string;
  type: AccountEntryType;
  amount: number;
  payment_method: PaymentMethod;
  description?: string;
  is_validated: boolean;
  created_at: string;
  updated_at: string;
};

export type AccountEntryType =
  | 'SUBSCRIPTION'
  | 'MEMBERSHIP'
  | 'FLIGHT'
  | 'INSTRUCTION'
  | 'FUEL'
  | 'MAINTENANCE'
  | 'INSURANCE'
  | 'FFA'
  | 'ACCOUNT_FUNDING'
  | 'OTHER';

export type PaymentMethod = 'ACCOUNT' | 'CARD' | 'CASH' | 'TRANSFER';

// Event types
export type ClubEvent = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  type: 'SOCIAL' | 'FLIGHT' | 'TRAINING' | 'MAINTENANCE' | 'OTHER';
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    firstName: string;
    lastName: string;
  };
  participants?: EventParticipant[];
};

export type EventParticipant = {
  event_id: string;
  user_id: string;
  status: 'GOING' | 'NOT_GOING' | 'MAYBE';
  created_at: string;
  updated_at: string;
  user?: {
    firstName: string;
    lastName: string;
  };
};

// Announcement types
export type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_by: string;
  created_at: string;
  updated_at: string;
};