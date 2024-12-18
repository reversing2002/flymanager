export type CustomFieldType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "email"
  | "tel"
  | "url"
  | "time"
  | "file"
  | "multiselect"
  | "textarea"
  | "color"
  | "range";

export interface CustomFieldDefinition {
  id: string;
  club_id: string;
  name: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[];
  min_value?: number;
  max_value?: number;
  step?: number;
  accepted_file_types?: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  field_id: string;
  value: any;
  created_at: string;
  updated_at: string;
}

export interface CustomMemberFieldValue extends CustomFieldValue {
  user_id: string;
}

export interface CustomAircraftFieldValue extends CustomFieldValue {
  aircraft_id: string;
}

export interface CustomFlightFieldValue extends CustomFieldValue {
  flight_id: string;
}
