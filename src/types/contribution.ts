export interface Contribution {
  id: string;
  user_id: string;
  valid_from: string;
  valid_until: string;
  account_entry_id: string;
  document_url?: string;
  created_at?: string;
  updated_at?: string;
}
