export type NotificationType = 
  | 'expiration_warning' 
  | 'reservation_confirmed' 
  | 'reservation_cancelled'
  | 'membership_expired'
  | 'license_expiring'
  | 'medical_expiring'
  | 'qualification_expiring'
  | 'bulk_email'
  | 'CONTACT_RESPONSE';

export interface EmailNotification {
  id: string;
  type: NotificationType;
  user_id: string;
  scheduled_date: string;
  sent: boolean;
  sent_date?: string;
  error?: string;
  variables: Record<string, any>;
  club_id: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  subject: string;
  description: string;
  variables: string[]; // Liste des variables attendues par le template
  notification_type: NotificationType;
  club_id: string;
  created_at: string;
  updated_at: string;
  html_content: string;
  is_system: boolean; // Indique si c'est un template système
}

export interface NotificationSettings {
  id: string;
  club_id: string;
  mailjet_api_key: string;
  mailjet_api_secret: string;
  sender_email: string;
  sender_name: string;
  expiration_warning_days: number; // Nombre de jours avant expiration pour envoyer l'avertissement
  created_at: string;
  updated_at: string;
}
