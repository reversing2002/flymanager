export type LicenseCategory = 'AVION' | 'HELICOPTERE' | 'ULM';
export type MedicalClass = '1' | '2' | 'LAPL';

export interface LicenseFieldDefinition {
  name: string;
  type: 'text' | 'date' | 'number' | 'select';
  label: string;
  required: boolean;
  options?: string[]; // Pour les champs de type 'select'
}

export interface LicenseType {
  id: string;
  name: string;
  description: string | null;
  category: LicenseCategory;
  validity_period: number | null;
  required_medical_class: MedicalClass | null;
  display_order: number;
  club_id: string;
  is_system: boolean;
  required_fields: LicenseFieldDefinition[];
  created_at: string;
  updated_at: string;
}

export interface PilotLicense {
  id: string;
  user_id: string;
  license_type_id: string;
  license_type?: LicenseType;
  number: string;
  authority: string;
  issued_at: string;
  expires_at: string | null;
  data: Record<string, any>;
  scan_id: string | null;
  created_at: string;
  updated_at: string;
}
