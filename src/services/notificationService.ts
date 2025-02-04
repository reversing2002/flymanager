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

// Variable de debug pour rediriger les emails
const DEBUG_EMAIL = 'eddy@yopmail.com';

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
              Email: DEBUG_EMAIL || notification.user.email,
              Name: notification.type === 'bulk_email' 
                ? notification.variables.recipient.name 
                : `${notification.user.first_name} ${notification.user.last_name}`,
            },
          ],
          Subject: notification.type === 'bulk_email'
            ? notification.variables.subject
            : 'Test - ' + notification.type,
          HTMLPart: notification.type === 'bulk_email'
            ? notification.variables.content
            : `<p style="color: red;">[DEBUG MODE - Email original destiné à: ${notification.user.email}]</p><br/>${notification.content}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Erreur lors de l'envoi de l'email: ${JSON.stringify(error)}`
    );
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

// Fonction pour récupérer les templates de notification d'un club
export async function getNotificationTemplates(clubId: string): Promise<NotificationTemplate[]> {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .or(`club_id.eq.${clubId},and(is_system.eq.true)`)
    .order('is_system')  // true vient après false, donc les personnalisés seront en premier
    .order('name');

  if (error) throw error;
  return data || [];
}

// Fonction pour récupérer un template spécifique
export async function getNotificationTemplate(
  clubId: string,
  notificationType: string
): Promise<NotificationTemplate | null> {
  // D'abord, chercher un template personnalisé pour le club
  let { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('club_id', clubId)
    .eq('notification_type', notificationType)
    .eq('is_system', false)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  
  if (!data) {
    // Si aucun template personnalisé n'est trouvé, chercher le template système
    const { data: systemTemplate, error: systemError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('notification_type', notificationType)
      .eq('is_system', true)
      .single();

    if (systemError && systemError.code !== 'PGRST116') throw systemError;
    return systemTemplate;
  }

  return data;
}

// Fonction pour mettre à jour un template
export async function updateNotificationTemplate(
  clubId: string,
  template: NotificationTemplate
): Promise<NotificationTemplate> {
  // Vérifier si c'est un template système
  if (template.is_system) {
    // Créer une copie personnalisée pour le club
    const { id, created_at, updated_at, ...templateData } = template;
    return createNotificationTemplate(clubId, {
      ...templateData,
      club_id: clubId,
      is_system: false
    });
  }

  // Mettre à jour le template personnalisé existant
  const { data, error } = await supabase
    .from('notification_templates')
    .update(template)
    .eq('id', template.id)
    .eq('club_id', clubId)
    .eq('is_system', false)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Fonction pour créer un nouveau template
export async function createNotificationTemplate(
  clubId: string,
  template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<NotificationTemplate> {
  const newTemplate = {
    ...template,
    club_id: clubId,
    is_system: false // Les nouveaux templates sont toujours non-système
  };

  const { data, error } = await supabase
    .from('notification_templates')
    .insert([newTemplate])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Fonction pour supprimer un template personnalisé
export async function deleteNotificationTemplate(
  clubId: string,
  templateId: number
): Promise<void> {
  const { error } = await supabase
    .from('notification_templates')
    .delete()
    .eq('id', templateId)
    .eq('club_id', clubId)
    .eq('is_system', false)
    .single();

  if (error) throw error;
}

interface EmailRecipient {
  id: string;
  email: string;
  name: string;
}

export async function getMembersByFilters(
  clubId: string,
  groups?: string[],
  contributionYear?: string
): Promise<EmailRecipient[]> {
  let query = supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      user_group_memberships!inner(group_id),
      member_contributions!inner(valid_from, valid_until),
      club_members!inner(club_id)
    `)
    .eq('club_members.club_id', clubId);

  if (groups && groups.length > 0) {
    query = query.in('user_group_memberships.group_id', groups);
  }

  if (contributionYear) {
    const startOfYear = `${contributionYear}-01-01`;
    const endOfYear = `${contributionYear}-12-31`;
    query = query
      .lte('member_contributions.valid_from', endOfYear)
      .gte('member_contributions.valid_until', startOfYear);
  }

  const { data: members, error } = await query;

  if (error) {
    throw new Error(`Erreur lors de la récupération des membres: ${error.message}`);
  }

  return members.map((member) => ({
    id: member.id,
    email: member.email,
    name: `${member.first_name} ${member.last_name}`,
  }));
}
