export interface AccountEntryType {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_credit: boolean;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
  club_id?: string;
}

export interface NewAccountEntryType {
  code: string;
  name: string;
  description?: string;
  is_credit: boolean;
  club_id: string;
}
