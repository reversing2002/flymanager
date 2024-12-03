import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sendNotification } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CreateDiscoveryNoteModalProps {
  onClose: () => void;
  onSuccess: (content: string, type: 'CLIENT_COMMUNICATION' | 'INTERNAL', sendEmail: boolean, sendSMS: boolean) => void;
  flightId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  defaultType?: 'CLIENT_COMMUNICATION' | 'INTERNAL';
}

const CreateDiscoveryNoteModal: React.FC<CreateDiscoveryNoteModalProps> = ({
  onClose,
  onSuccess,
  flightId,
  recipientEmail,
  recipientPhone,
  defaultType = 'CLIENT_COMMUNICATION',
}) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    type: defaultType,
    notification_settings: {
      send_email: defaultType === 'CLIENT_COMMUNICATION' && !!recipientEmail,
      send_sms: defaultType === 'CLIENT_COMMUNICATION' && !!recipientPhone,
      schedule_for_later: false,
      scheduled_date: null as string | null,
    },
  });

  // Templates prédéfinis pour les communications courantes
  const templates = [
    {
      label: "Confirmation de réservation",
      content: "Bonjour,\n\nNous confirmons votre vol découverte. Nous sommes ravis de vous accueillir prochainement.\n\nCordialement,",
      type: "CLIENT_COMMUNICATION"
    },
    {
      label: "Rappel 24h avant",
      content: "Bonjour,\n\nNous vous rappelons votre vol découverte prévu pour demain. N'oubliez pas d'apporter une pièce d'identité.\n\nÀ demain !",
      type: "CLIENT_COMMUNICATION"
    },
    {
      label: "Note de briefing",
      content: "Points à aborder lors du briefing :\n- Procédures de sécurité\n- Conditions météo\n- Plan de vol",
      type: "INTERNAL"
    }
  ];

  const handleTemplateSelect = (template: typeof templates[0]) => {
    setFormData(prev => ({
      ...prev,
      content: template.content,
      type: template.type as 'CLIENT_COMMUNICATION' | 'INTERNAL'
    }));
  };

  const handleTypeChange = (newType: 'CLIENT_COMMUNICATION' | 'INTERNAL') => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      notification_settings: {
        ...prev.notification_settings,
        send_email: newType === 'CLIENT_COMMUNICATION' && !!recipientEmail,
        send_sms: newType === 'CLIENT_COMMUNICATION' && !!recipientPhone,
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    if (!formData.content.trim()) {
      setError('Le contenu de la note ne peut pas être vide');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const noteData = {
        flight_id: flightId,
        author_id: currentUser.id,
        content: formData.content,
        type: formData.type,
        notification_settings: {
          ...formData.notification_settings,
          scheduled_date: formData.notification_settings.schedule_for_later 
            ? formData.notification_settings.scheduled_date 
            : null
        },
        created_at: new Date().toISOString(),
      };

      // Créer la note
      const { data: note, error: noteError } = await supabase
        .from('discovery_notes')
        .insert(noteData)
        .select()
        .single();

      if (noteError) throw noteError;

      // Envoyer les notifications si nécessaire et pas programmées pour plus tard
      if (!formData.notification_settings.schedule_for_later && 
          (formData.notification_settings.send_email || formData.notification_settings.send_sms)) {
        const notifResult = await sendNotification(
          {
            content: formData.content,
            notification_settings: formData.notification_settings,
          },
          recipientEmail || '',
          recipientPhone || ''
        );

        if (!notifResult.success) {
          console.error('Erreur notification:', notifResult.error);
          toast.error('Note créée mais erreur lors de l\'envoi des notifications');
        } else {
          toast.success('Note créée et notifications envoyées');
        }
      } else if (formData.notification_settings.schedule_for_later) {
        toast.success('Note créée et notifications programmées');
      } else {
        toast.success('Note créée');
      }

      onSuccess(formData.content, formData.type, formData.notification_settings.send_email, formData.notification_settings.send_sms);
      onClose();
    } catch (err) {
      console.error('Error creating note:', err);
      setError('Erreur lors de la création de la note');
      toast.error('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Nouvelle note</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-grow overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-4 items-start">
            <div className="flex-grow space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type de note
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value as 'CLIENT_COMMUNICATION' | 'INTERNAL')}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  required
                >
                  <option value="CLIENT_COMMUNICATION">Communication client</option>
                  <option value="INTERNAL">Note interne</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Contenu de la note
                  </label>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="text-sm text-sky-600 hover:text-sky-700"
                  >
                    {previewMode ? 'Éditer' : 'Aperçu'}
                  </button>
                </div>
                {previewMode ? (
                  <div className="prose prose-sm max-w-none p-4 bg-slate-50 rounded-lg min-h-[200px]">
                    {formData.content.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    rows={8}
                    required
                    placeholder="Saisissez votre message ici..."
                  />
                )}
              </div>
            </div>

            <div className="w-64 flex-shrink-0">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Templates</h3>
                <div className="space-y-2">
                  {templates.map((template, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full text-left p-2 text-sm rounded hover:bg-white transition-colors"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {formData.type === 'CLIENT_COMMUNICATION' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium">Paramètres de notification</h3>
                
                {recipientEmail && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.notification_settings.send_email}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notification_settings: {
                          ...prev.notification_settings,
                          send_email: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span>Envoyer un email ({recipientEmail})</span>
                  </label>
                )}
                
                {recipientPhone && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.notification_settings.send_sms}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notification_settings: {
                          ...prev.notification_settings,
                          send_sms: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span>Envoyer un SMS ({recipientPhone})</span>
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer la note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDiscoveryNoteModal;
