import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Mail, AlertCircle, CheckCircle, XCircle, Settings, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getNotifications, getNotificationSettings, updateNotificationSettings } from '../../services/notificationService';
import type { EmailNotification, NotificationSettings } from '../../types/notifications';
import { toast } from 'react-hot-toast';

const NotificationList = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('pending');
  const [showSettings, setShowSettings] = useState(false);
  const queryClient = useQueryClient();

  // Récupération des notifications
  const { data: notifications, isLoading: isLoadingNotifications } = useQuery({
    queryKey: ['notifications', filter, user?.club?.id],
    queryFn: () => getNotifications(user?.club?.id!, filter),
    enabled: !!user?.club?.id,
  });

  // Récupération des paramètres
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['notificationSettings', user?.club?.id],
    queryFn: () => getNotificationSettings(user?.club?.id!),
    enabled: !!user?.club?.id,
  });

  // Mutation pour mettre à jour les paramètres
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<NotificationSettings>) =>
      updateNotificationSettings(user?.club?.id!, newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificationSettings']);
      toast.success('Paramètres mis à jour');
      setShowSettings(false);
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error('Erreur lors de la mise à jour des paramètres');
    },
  });

  const handleSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateSettingsMutation.mutate({
      mailjet_api_key: formData.get('mailjet_api_key') as string,
      mailjet_api_secret: formData.get('mailjet_api_secret') as string,
      sender_email: formData.get('sender_email') as string,
      sender_name: formData.get('sender_name') as string,
      expiration_warning_days: parseInt(formData.get('expiration_warning_days') as string),
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expiration_warning':
      case 'license_expiring':
      case 'medical_expiring':
      case 'qualification_expiring':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'reservation_confirmed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'reservation_cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Mail className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationTitle = (notification: EmailNotification) => {
    switch (notification.type) {
      case 'expiration_warning':
        return 'Avertissement d\'expiration de cotisation';
      case 'license_expiring':
        return 'Licence en expiration';
      case 'medical_expiring':
        return 'Visite médicale en expiration';
      case 'qualification_expiring':
        return 'Qualification en expiration';
      case 'reservation_confirmed':
        return 'Confirmation de réservation';
      case 'reservation_cancelled':
        return 'Annulation de réservation';
      default:
        return 'Notification';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications Email</h1>
            <p className="text-gray-600">
              Visualisez et gérez les notifications email programmées pour les membres.
            </p>
          </div>
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              if (!showSettings) {
                toast.success('Ouverture des paramètres');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <Settings className="w-4 h-4" />
            Paramètres
          </button>
        </div>

        {showSettings && (isLoadingSettings ? (
          <div className="bg-white p-6 rounded-lg border mb-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </div>
        ) : settings ? (
          <form onSubmit={handleSettingsSubmit} className="bg-white p-6 rounded-lg border mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Paramètres des notifications</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="mailjet_api_key" className="block text-sm font-medium text-gray-700">
                  Clé API Mailjet
                </label>
                <input
                  type="text"
                  id="mailjet_api_key"
                  name="mailjet_api_key"
                  defaultValue={settings.mailjet_api_key}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="mailjet_api_secret" className="block text-sm font-medium text-gray-700">
                  Secret API Mailjet
                </label>
                <input
                  type="password"
                  id="mailjet_api_secret"
                  name="mailjet_api_secret"
                  defaultValue={settings.mailjet_api_secret}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="sender_email" className="block text-sm font-medium text-gray-700">
                  Email de l'expéditeur
                </label>
                <input
                  type="email"
                  id="sender_email"
                  name="sender_email"
                  defaultValue={settings.sender_email}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="sender_name" className="block text-sm font-medium text-gray-700">
                  Nom de l'expéditeur
                </label>
                <input
                  type="text"
                  id="sender_name"
                  name="sender_name"
                  defaultValue={settings.sender_name}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="expiration_warning_days" className="block text-sm font-medium text-gray-700">
                  Jours d'avertissement avant expiration
                </label>
                <input
                  type="number"
                  id="expiration_warning_days"
                  name="expiration_warning_days"
                  min="1"
                  max="365"
                  defaultValue={settings.expiration_warning_days}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Nombre de jours avant l'expiration pour envoyer les notifications
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={updateSettingsMutation.isLoading}
              >
                {updateSettingsMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        ) : null)}
      </div>

      {/* Filtres */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md ${
              filter === 'pending'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            À envoyer
          </button>
          <button
            onClick={() => setFilter('sent')}
            className={`px-4 py-2 rounded-md ${
              filter === 'sent'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Envoyées
          </button>
        </div>
      </div>

      {/* Liste des notifications */}
      {isLoadingNotifications ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : notifications?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Bell className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune notification</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aucune notification {filter === 'pending' ? 'à envoyer' : filter === 'sent' ? 'envoyée' : ''} pour le moment.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {notifications?.map((notification) => (
              <li key={notification.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getNotificationIcon(notification.type)}
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h4 className="text-sm font-medium text-gray-900">
                            {getNotificationTitle(notification)}
                          </h4>
                          <span
                            className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              notification.sent
                                ? notification.error
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {notification.sent
                              ? notification.error
                                ? 'Erreur'
                                : 'Envoyé'
                              : 'En attente'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          Destinataire : {notification.user?.first_name} {notification.user?.last_name}
                        </p>
                        {notification.error && (
                          <p className="mt-1 text-sm text-red-600">
                            Erreur : {notification.error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">
                        {format(new Date(notification.scheduled_date), 'PPP', { locale: fr })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(notification.scheduled_date), 'HH:mm')}
                      </div>
                      {notification.sent && notification.sent_date && (
                        <div className="text-xs text-gray-500">
                          Envoyé le {format(new Date(notification.sent_date), 'Pp', { locale: fr })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationList;
