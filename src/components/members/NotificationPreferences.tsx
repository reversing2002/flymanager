import { useState, useEffect } from 'react';
import { Switch } from '../ui/switch';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationPreferences {
  newReservation: boolean;
  modifiedReservation: boolean;
  cancelledReservation: boolean;
  hourBeforeReminder: boolean;
}

interface DatabaseNotificationPreferences {
  new_reservation: boolean;
  modified_reservation: boolean;
  cancelled_reservation: boolean;
  hour_before_reminder: boolean;
}

interface NotificationPreferencesProps {
  userId: string;
  isEditable: boolean;
}

const mapFromDatabase = (data: DatabaseNotificationPreferences): NotificationPreferences => ({
  newReservation: data.new_reservation,
  modifiedReservation: data.modified_reservation,
  cancelledReservation: data.cancelled_reservation,
  hourBeforeReminder: data.hour_before_reminder,
});

const mapToDatabase = (data: NotificationPreferences): DatabaseNotificationPreferences => ({
  new_reservation: data.newReservation,
  modified_reservation: data.modifiedReservation,
  cancelled_reservation: data.cancelledReservation,
  hour_before_reminder: data.hourBeforeReminder,
});

export const NotificationPreferences = ({ userId, isEditable }: NotificationPreferencesProps) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    newReservation: true,
    modifiedReservation: true,
    cancelledReservation: true,
    hourBeforeReminder: true,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) throw error;

        if (data) {
          setPreferences(mapFromDatabase(data));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des préférences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [userId]);

  const updatePreference = async (key: keyof NotificationPreferences) => {
    if (!isEditable) return;

    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: userId,
            ...mapToDatabase(newPreferences),
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false
          }
        );

      if (error) throw error;

      setPreferences(newPreferences);
      toast.success('Préférences mises à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card className="w-full bg-white shadow-sm">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            Préférences de notification
          </CardTitle>
          <Bell className="h-5 w-5 text-gray-500" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2">
          <label htmlFor="newReservation" className="text-sm text-gray-700">
            Nouvelles réservations
          </label>
          <Switch
            id="newReservation"
            checked={preferences.newReservation}
            onCheckedChange={() => updatePreference('newReservation')}
            disabled={!isEditable}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>

        <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2">
          <label htmlFor="modifiedReservation" className="text-sm text-gray-700">
            Modifications de réservations
          </label>
          <Switch
            id="modifiedReservation"
            checked={preferences.modifiedReservation}
            onCheckedChange={() => updatePreference('modifiedReservation')}
            disabled={!isEditable}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>

        <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2">
          <label htmlFor="cancelledReservation" className="text-sm text-gray-700">
            Annulations de réservations
          </label>
          <Switch
            id="cancelledReservation"
            checked={preferences.cancelledReservation}
            onCheckedChange={() => updatePreference('cancelledReservation')}
            disabled={!isEditable}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>

        <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2">
          <label htmlFor="hourBeforeReminder" className="text-sm text-gray-700">
            Rappel une heure avant
          </label>
          <Switch
            id="hourBeforeReminder"
            checked={preferences.hourBeforeReminder}
            onCheckedChange={() => updatePreference('hourBeforeReminder')}
            disabled={!isEditable}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
