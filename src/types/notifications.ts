export type NotificationType = 
  | 'expiration_warning' 
  | 'reservation_confirmed' 
  | 'reservation_cancelled'
  | 'membership_expired'
  | 'license_expiring'
  | 'medical_expiring'
  | 'qualification_expiring';

export interface EmailNotification {
  id: string;
  type: NotificationType;
  user_id: string;
  scheduled_date: string;
  sent: boolean;
  sent_date?: string;
  error?: string;
  template_id: number;
  variables: Record<string, any>;
  club_id: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  subject: string;
  template_id: number; // ID du template Mailjet
  description: string;
  variables: string[]; // Liste des variables attendues par le template
  notification_type: NotificationType;
  club_id: string;
  created_at: string;
  updated_at: string;
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