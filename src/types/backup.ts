export type BackupType = 
  | 'account_entries'    // paiements
  | 'users'             // membres
  | 'reservations'      // réservations
  | 'flights'          // vols
  | 'aircraft'         // avions
  | 'permission_settings'; // paramètres

export interface Backup {
  id: string;
  created_at: string;
  type: BackupType;
  data: any[];
  description: string;
  is_auto: boolean;
}

export interface AuditLog {
  id: string;
  created_at: string;
  action: 'create' | 'update' | 'delete';
  resource_type: BackupType;
  resource_id: string;
  user_id: string;
  details?: any;
}
