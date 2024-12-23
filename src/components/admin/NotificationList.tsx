import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Mail, AlertCircle, CheckCircle, XCircle, Settings, Bell, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getNotifications, 
  getNotificationSettings, 
  updateNotificationSettings,
  getNotificationTemplates,
  updateNotificationTemplate,
  createNotificationTemplate
} from '../../services/notificationService';
import type { 
  EmailNotification, 
  NotificationSettings, 
  NotificationTemplate 
} from '../../types/notifications';
import { toast } from 'react-hot-toast';
import { Dialog } from '@mui/material';
import Editor from '@monaco-editor/react';

const NotificationList = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('pending');
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
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

  // Récupération des templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['notificationTemplates', user?.club?.id],
    queryFn: () => getNotificationTemplates(user?.club?.id!),
    enabled: !!user?.club?.id,
  });

  // Mutation pour mettre à jour un template
  const updateTemplateMutation = useMutation({
    mutationFn: (template: NotificationTemplate) =>
      updateNotificationTemplate(user?.club?.id!, template),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificationTemplates']);
      toast.success('Template mis à jour');
      setShowTemplates(false);
      setSelectedTemplate(null);
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast.error('Erreur lors de la mise à jour du template');
    },
  });

  // Mutation pour créer un template
  const createTemplateMutation = useMutation({
    mutationFn: (template: Omit<NotificationTemplate, 'id'>) =>
      createNotificationTemplate(user?.club?.id!, template),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificationTemplates']);
      toast.success('Template créé');
      setShowTemplates(false);
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('Erreur lors de la création du template');
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

  // Fonction pour obtenir les variables selon le type de notification
  const getTemplateVariables = (type: string): string[] => {
    switch (type) {
      case 'expiration_warning':
      case 'CONTRIBUTION_EXPIRATION':
        return ['first_name', 'last_name', 'expiration_date'];
      case 'license_expiring':
        return ['first_name', 'last_name', 'license_name', 'expiration_date'];
      case 'medical_expiring':
        return ['first_name', 'last_name', 'expiration_date'];
      case 'qualification_expiring':
        return ['first_name', 'last_name', 'qualification_name', 'expiration_date'];
      case 'reservation_confirmed':
        return ['first_name', 'last_name', 'reservation_date', 'aircraft', 'instructor'];
      case 'reservation_cancelled':
        return ['first_name', 'last_name', 'reservation_date', 'aircraft', 'reason'];
      default:
        return ['first_name', 'last_name'];
    }
  };

  const handleTemplateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (selectedTemplate) {
      updateTemplateMutation.mutate({
        id: selectedTemplate.id,
        subject: formData.get('subject') as string,
        html_content: htmlContent,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        variables: selectedTemplate.variables,
        notification_type: selectedTemplate.notification_type,
        club_id: user?.club?.id!
      });
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      setHtmlContent(selectedTemplate.html_content);
    } else {
      setHtmlContent(`<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Titre du mail</h1>
    </div>
    
    <p>Bonjour {first_name} {last_name},</p>
    
    <p>Votre contenu ici...</p>
    
    <div class="footer">
      <p>Cordialement,<br>L'équipe de votre club</p>
    </div>
  </div>
</body>
</html>`);
    }
  }, [selectedTemplate]);

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
          <div className="flex space-x-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 mr-2" />
              Templates
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Settings className="h-5 w-5 mr-2" />
              Paramètres
            </button>
          </div>
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

        {/* Modal des templates */}
        <Dialog 
          open={showTemplates} 
          onClose={() => {
            setShowTemplates(false);
            setSelectedTemplate(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <div className="p-6">
            {!selectedTemplate ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">Templates de notification</h2>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {templates?.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-500">{template.description}</p>
                        </div>
                        <button
                          onClick={() => setSelectedTemplate(template)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                        >
                          Personnaliser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">
                    Personnaliser : {selectedTemplate.name}
                  </h2>
                  <button
                    onClick={() => {
                      setShowTemplates(false);
                      setSelectedTemplate(null);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleTemplateSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                      Sujet de l'email
                    </label>
                    <input
                      type="text"
                      name="subject"
                      id="subject"
                      defaultValue={selectedTemplate.subject}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="variables" className="block text-sm font-medium text-gray-700">
                      Variables disponibles
                    </label>
                    <input
                      type="text"
                      id="variables"
                      value={getTemplateVariables(selectedTemplate.notification_type).join(', ')}
                      readOnly
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-600 sm:text-sm"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Ces variables sont disponibles pour ce type de notification. Utilisez-les dans votre template HTML en les entourant d'accolades, par exemple : {'{first_name}'}.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="html_content" className="block text-sm font-medium text-gray-700">
                      Contenu HTML
                    </label>
                    <div className="mt-1 border border-gray-300 rounded-md overflow-hidden">
                      <Editor
                        height="400px"
                        defaultLanguage="html"
                        value={htmlContent}
                        onChange={(value) => setHtmlContent(value || '')}
                        options={{
                          minimap: { enabled: false },
                          wordWrap: 'on',
                          wrappingIndent: 'indent',
                          lineNumbers: 'on',
                          roundedSelection: false,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          theme: 'vs-light'
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTemplates(false);
                        setSelectedTemplate(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </Dialog>

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
