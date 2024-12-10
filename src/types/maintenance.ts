export type MaintenanceType = {
  id: string;
  name: string;
  description?: string;
  type: 'HOURS' | 'CALENDAR' | 'CYCLES';
  intervalValue: number;
  tolerance: number;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceOperation = {
  id: string;
  aircraftId: string;
  maintenanceTypeId: string;
  lastPerformedAt: string;
  hoursAtMaintenance?: number;
  cyclesAtMaintenance?: number;
  nextDueAt?: string;
  nextDueHours?: number;
  nextDueCycles?: number;
  comments?: string;
  performedBy?: string;
  createdAt: string;
  updatedAt: string;
  maintenanceType?: MaintenanceType;
};

export type MaintenanceHistory = {
  id: string;
  aircraftId: string;
  maintenanceTypeId: string;
  performedAt: string;
  hours?: number;
  cycles?: number;
  comments?: string;
  performedBy?: string;
  createdAt: string;
  maintenanceType?: MaintenanceType;
  performer?: {
    firstName: string;
    lastName: string;
  };
};