export interface QualificationType {
  id: string;
  name: string;
  description: string | null;
  validity_period: number | null; // en mois
  requires_instructor_validation: boolean;
  display_order: number;
  club_id: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface PilotQualification {
  id: string;
  pilot_id: string;
  qualification_type_id: string;
  obtained_at: string;
  expires_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
  qualification_type?: QualificationType;
}
