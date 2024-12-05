import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const sendNotification = async (
  note: {
    content: string;
    notification_settings: {
      send_email: boolean;
      send_sms: boolean;
    };
  },
  recipientEmail: string,
  recipientPhone: string
) => {
  const notifications: Promise<any>[] = [];

  // Envoi d'email via notre API
  if (note.notification_settings.send_email && recipientEmail) {
    notifications.push(
      fetch(`${API_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: recipientEmail,
          subject: 'Nouvelle note concernant votre vol découverte',
          content: note.content
        })
      }).then(res => {
        if (!res.ok) {
          throw new Error('Erreur lors de l\'envoi de l\'email');
        }
        return res.json();
      })
    );
  }

  // Envoi de SMS via notre API
  if (note.notification_settings.send_sms && recipientPhone) {
    notifications.push(
      fetch(`${API_URL}/api/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: recipientPhone,
          message: note.content
        })
      }).then(res => {
        if (!res.ok) {
          throw new Error('Erreur lors de l\'envoi du SMS');
        }
        return res.json();
      })
    );
  }

  try {
    await Promise.all(notifications);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications:', error);
    return { success: false, error };
  }
};
