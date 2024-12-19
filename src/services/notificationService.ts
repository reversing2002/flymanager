import { supabase } from '../lib/supabase';
import type { EmailNotification, NotificationTemplate, NotificationSettings, NotificationType } from '../types/notifications';

// Fonction pour récupérer les paramètres de notification d'un club
export async function getNotificationSettings(clubId: string): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('club_id', clubId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Créer des paramètres par défaut si aucun n'existe
      const defaultSettings: Partial<NotificationSettings> = {
        club_id: clubId,
        mailjet_api_key: '',
        mailjet_api_secret: '',
        sender_email: '',
        sender_name: '',
        expiration_warning_days: 30,
      };

      const { data: newData, error: insertError } = await supabase
        .from('notification_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (insertError) throw insertError;
      return newData;
    }
    throw error;
  }

  return data;
}

// Fonction pour mettre à jour les paramètres de notification
export async function updateNotificationSettings(
  clubId: string,
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .update(settings)
    .eq('club_id', clubId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Fonction pour récupérer les notifications
export async function getNotifications(
  clubId: string,
  filter: 'all' | 'pending' | 'sent' = 'all'
): Promise<EmailNotification[]> {
  let query = supabase
    .from('notifications')
    .select(`
      *,
      user:user_id (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('club_id', clubId)
    .order('scheduled_date', { ascending: true });

  if (filter !== 'all') {
    query = query.eq('sent', filter === 'sent');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Fonction pour créer une nouvelle notification
export async function createNotification(
  notification: Omit<EmailNotification, 'id' | 'created_at' | 'updated_at'>
): Promise<EmailNotification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert([notification])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Fonction pour marquer une notification comme envoyée
export async function markNotificationAsSent(
  notificationId: string,
  error?: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from('notifications')
    .update({
      sent: true,
      sent_date: new Date().toISOString(),
      error: error,
    })
    .eq('id', notificationId);

  if (updateError) throw updateError;
}

// Fonction pour envoyer un email via Mailjet
export async function sendEmail(
  notification: EmailNotification,
  settings: NotificationSettings
): Promise<void> {
  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(
        `${settings.mailjet_api_key}:${settings.mailjet_api_secret}`
      )}`,
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: settings.sender_email,
            Name: settings.sender_name,
          },
          To: [
            {
              Email: notification.user.email,
              Name: `${notification.user.first_name} ${notification.user.last_name}`,
            },
          ],
          TemplateID: notification.template_id,
          TemplateLanguage: true,
          Variables: notification.variables,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }
}

// Fonction pour créer des notifications d'expiration
export async function createExpirationNotifications(
  clubId: string,
  type: NotificationType,
  templateId: number,
  daysBeforeExpiration: number
): Promise<void> {
  // Cette fonction sera appelée par un cron job pour créer les notifications
  // d'expiration pour les licences, qualifications, etc.
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('club_id', clubId)
    .single();

  if (!settings) throw new Error('Notification settings not found');

  // Exemple pour les licences
  if (type === 'license_expiring') {
    const { data: licenses } = await supabase.rpc('get_expiring_licenses', {
      p_days_before: daysBeforeExpiration,
      p_club_id: clubId,
    });

    if (licenses) {
      for (const license of licenses) {
        await createNotification({
          type: 'license_expiring',
          user_id: license.user_id,
          scheduled_date: new Date().toISOString(),
          sent: false,
          template_id: templateId,
          variables: {
            LICENSE_TYPE: license.type,
            EXPIRATION_DATE: license.expiration_date,
            DAYS_REMAINING: daysBeforeExpiration,
          },
          club_id: clubId,
        });
      }
    }
  }

  // Ajouter d'autres types d'expiration ici...
}

// Fonction pour traiter les notifications en attente
export async function processScheduledNotifications(clubId: string): Promise<void> {
  const { data: notifications } = await supabase
    .from('notifications')
    .select(`
      *,
      user:user_id (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('club_id', clubId)
    .eq('sent', false)
    .lte('scheduled_date', new Date().toISOString());

  if (!notifications?.length) return;

  const settings = await getNotificationSettings(clubId);
  if (!settings) throw new Error('Notification settings not found');

  for (const notification of notifications) {
    try {
      await sendEmail(notification, settings);
      await markNotificationAsSent(notification.id);
    } catch (error) {
      await markNotificationAsSent(notification.id, error.message);
    }
  }
}
