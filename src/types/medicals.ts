export interface MedicalType {
  id: string;
  club_id: string;
  name: string;
  description?: string;
  display_order: number;
  system_type: boolean;
  validity_period?: number; // in months
  requires_end_date: boolean; // indicates if this type requires an end date
  created_at: string;
  updated_at: string;
}

export interface Medical {
  id: string;
  user_id: string;
  medical_type_id: string;
  medical_type?: MedicalType;
  obtained_at: string;
  expires_at?: string | null; // null if the type doesn't require an end date
  scan_id?: string;
  created_at: string;
  updated_at: string;
}
