import type { Role } from './roles';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  licenseNumber?: string;
  licenseExpiry?: Date;
  phone?: string;
  balance: number;
  membershipValid: boolean;
};

export type Aircraft = {
  id: string;
  registration: string;
  type: string;
  status: 'available' | 'maintenance' | 'reserved';
  hoursBeforeMaintenance: number;
  hourlyRate: number;
  image: string;
};

export type Reservation = {
  id: string;
  pilotId: string;
  aircraftId: string;
  startTime: Date;
  endTime: Date;
  instructorId?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
};

export type Flight = {
  id: string;
  reservationId: string;
  pilotId: string;
  aircraftId: string;
  instructorId?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  destination?: string;
  cost: number;
  instructor_cost?: number;
};