import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Mail, AlertCircle, CheckCircle, XCircle, Settings, Bell, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getNotifications, 
  getNotificationSettings, 
  updateNotificationSettings,
  getNotificationTemplates,
  updateNotificationTemplate,
  createNotificationTemplate,
  deleteNotificationTemplate
} from '../../services/notificationService';
import type { 
  EmailNotification, 
  NotificationSettings, 
  NotificationTemplate 
} from '../../types/notifications';
import { toast } from 'react-hot-toast';
import { Dialog } from '@mui/material';
import Editor from '@monaco-editor/react';
import DOMPurify from 'dompurify';

interface NotificationPreviewProps {
  template: string;
  variables: Record<string, any>;
}

const NotificationPreview: React.FC<NotificationPreviewProps> = ({ template, variables }) => {
  const processTemplate = (template: string, variables: Record<string, any>): string => {
    let processedContent = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedContent = processedContent.replace(regex, String(value));
    });
    return processedContent;
  };

  const sanitizedContent = DOMPurify.sanitize(processTemplate(template, variables));

  return (
    <Dialog 
      open={true} 
      maxWidth="md"
      fullWidth
      className="preview-dialog"
    >
      <div className="bg-white p-6 rounded-lg shadow-lg max-h-[80vh] overflow-auto">
        <div 
          className="preview-content"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
        />
      </div>
    </Dialog>
  );
};

interface NotificationStatusProps {
  sent: boolean;
  error?: string | null;
  sentDate?: string | null;
}

const NotificationStatus: React.FC<NotificationStatusProps> = ({ sent, error, sentDate }) => {
  if (sent && !error && sentDate) {
    return (
      <div className="flex items-center text-green-600 text-xs">
        <CheckCircle className="w-3 h-3 mr-1" />
        <span>Envoyé le {format(new Date(sentDate), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center text-red-600 text-xs">
        <XCircle className="w-3 h-3 mr-1" />
        <span>{error}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center text-orange-600 text-xs">
      <Bell className="w-3 h-3 mr-1" />
      <span>En attente</span>
    </div>
  );
};

const NotificationList = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('pending');
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [previewMode, setPreviewMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);
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

  // Mutation pour supprimer un template
  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) =>
      deleteNotificationTemplate(user?.club?.id!, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificationTemplates']);
      toast.success('Template supprimé');
      setShowTemplates(false);
      setSelectedTemplate(null);
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error('Erreur lors de la suppression du template');
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
      const templateData = {
        subject: formData.get('subject') as string,
        html_content: htmlContent,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        variables: selectedTemplate.variables,
        notification_type: selectedTemplate.notification_type,
        club_id: user?.club?.id!,
        is_system: false
      };

      if (selectedTemplate.is_system) {
        // Créer une copie personnalisée du template système
        // On omet l'ID pour laisser la base de données en générer un nouveau
        createTemplateMutation.mutate(templateData);
      } else {
        // Mettre à jour le template personnalisé existant
        updateTemplateMutation.mutate({
          ...templateData,
          id: selectedTemplate.id
        });
      }
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setHtmlContent(value);
    }
  };

  const renderEditor = () => (
    <Editor
      height="500px"
      defaultLanguage="html"
      value={htmlContent}
      onChange={handleEditorChange}
      options={{
        minimap: { enabled: false },
        wordWrap: 'on',
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );

  // Fonction pour remplacer les variables dans l'aperçu
  const getPreviewContent = () => {
    let preview = htmlContent;
    const previewData = {
      first_name: 'Jean',
      last_name: 'Dupont',
      expiration_date: format(addDays(new Date(), 30), 'dd/MM/yyyy'),
      license_name: 'PPL',
      qualification_name: 'SEP',
      reservation_date: format(addDays(new Date(), 7), 'dd/MM/yyyy à HH:mm', { locale: fr }),
      aircraft: 'F-GXXX',
      instructor: 'Pierre Martin',
      reason: 'Météo défavorable',
    };

    // Remplacer toutes les variables par leurs valeurs de prévisualisation
    Object.entries(previewData).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      preview = preview.replace(regex, value);
    });

    return DOMPurify.sanitize(preview);
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

  const togglePreview = (id: string) => {
    if (expandedNotification === id) {
      setExpandedNotification(null);
    } else {
      setExpandedNotification(id);
    }
  };

  const itemsPerPage = 50;

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
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{template.name}</h4>
                            {template.is_system ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Système
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Personnalisé
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{template.description}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTemplate(template);
                          }}
                          className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md ${
                            template.is_system 
                              ? 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                              : 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                          }`}
                        >
                          {template.is_system ? 'Personnaliser' : 'Modifier'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-medium">
                      {selectedTemplate.is_system ? 'Personnaliser' : 'Modifier'} : {selectedTemplate.name}
                    </h2>
                    {selectedTemplate.is_system && (
                      <p className="text-sm text-gray-500 mt-1">
                        Vous allez créer une copie personnalisée de ce template système. Le template original restera inchangé.
                      </p>
                    )}
                  </div>
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
                    <div className="flex justify-between items-center mb-4">
                      <label htmlFor="html_content" className="block text-sm font-medium text-gray-700">
                        Contenu HTML
                      </label>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setPreviewMode(false)}
                          className={`px-3 py-1 text-sm rounded-md ${
                            !previewMode
                              ? 'bg-primary-100 text-primary-700'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Code
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode(true)}
                          className={`px-3 py-1 text-sm rounded-md ${
                            previewMode
                              ? 'bg-primary-100 text-primary-700'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Aperçu
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 border border-gray-300 rounded-md overflow-hidden">
                      {previewMode ? (
                        <div 
                          className="h-[500px] overflow-auto p-4 bg-white"
                          dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                        />
                      ) : (
                        renderEditor()
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(null);
                        setPreviewMode(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Retour
                    </button>
                    {!selectedTemplate.is_system && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Voulez-vous revenir au template système ? Votre version personnalisée sera supprimée.')) {
                            // Supprimer le template personnalisé
                            deleteTemplateMutation.mutate(selectedTemplate.id);
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
                      >
                        Revenir au template système
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={updateTemplateMutation.isLoading || createTemplateMutation.isLoading}
                    >
                      {updateTemplateMutation.isLoading || createTemplateMutation.isLoading
                        ? 'Enregistrement...'
                        : selectedTemplate.is_system
                        ? 'Créer une copie personnalisée'
                        : 'Enregistrer les modifications'}
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
        <div className="space-y-2">
          {notifications
            ?.sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
            .map((notification) => {
              const template = templates?.find(t => t.id === notification.template_id);
              return (
                <div key={notification.id} className="bg-white rounded shadow-sm p-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <h3 className="font-medium text-sm truncate">{notification.type}</h3>
                        {template?.name && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {template.name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {notification.user?.first_name} {notification.user?.last_name} ({notification.user?.email})
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="text-xs text-gray-500">
                          {format(new Date(notification.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </div>
                        <NotificationStatus 
                          sent={notification.sent} 
                          error={notification.error} 
                          sentDate={notification.sent_date} 
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => togglePreview(notification.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Aperçu conditionnel */}
                  {expandedNotification === notification.id && template?.html_content && (
                    <div className="mt-2">
                      <NotificationPreview 
                        template={template.html_content}
                        variables={notification.variables}
                      />
                    </div>
                  )}
                </div>
              );
          })}

          {/* Pagination */}
          {notifications && notifications.length > itemsPerPage && (
            <div className="mt-4 flex justify-center">
              <nav className="flex items-center gap-2">
                {Array.from({ length: Math.ceil(notifications.length / itemsPerPage) }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`px-3 py-1 rounded ${
                      currentPage === index + 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationList;
