import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Mail, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@mui/material';
import { Card, CardContent, CardHeader } from '@mui/material';
import { TextField, FormControl, FormLabel, FormGroup, Checkbox, FormControlLabel, MenuItem, Select as MuiSelect } from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import { toast } from 'react-hot-toast';
import { getNotificationSettings, createNotification, getMembersByFilters } from '@/services/notificationService';
import { addHours, format } from 'date-fns';

interface EmailForm {
  subject: string;
  content: string;
  selectedGroups: string[];
  contributionYear: string;
}

const EmailMembersPage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<EmailForm>({
    defaultValues: {
      selectedGroups: [],
      contributionYear: new Date().getFullYear().toString(),
      content: `
        <h1>Bienvenue sur 4Fly</h1>
        <p>Cher membre,</p>
        <p>Nous sommes ravis de vous accueillir sur la plateforme 4Fly.</p>
        <p>Cordialement,<br>L'équipe 4Fly</p>
      `
    }
  });

  // Récupération des paramètres de notification
  const { data: settings } = useQuery({
    queryKey: ['notificationSettings', user?.club?.id],
    queryFn: () => getNotificationSettings(user?.club?.id!),
    enabled: !!user?.club?.id,
  });

  const groups = [
    { id: '11111111-1111-1111-1111-111111111111', label: 'Administrateurs' },
    { id: '22222222-2222-2222-2222-222222222222', label: 'Instructeurs' },
    { id: '33333333-3333-3333-3333-333333333333', label: 'Pilotes' },
    { id: '44444444-4444-4444-4444-444444444444', label: 'Mécaniciens' },
    { id: '55555555-5555-5555-5555-555555555555', label: 'Élèves' }
  ];

  const years = [
    { value: new Date().getFullYear().toString(), label: 'Année courante' },
    { value: (new Date().getFullYear() - 1).toString(), label: 'Année précédente' }
  ];

  const onSubmit = async (data: EmailForm) => {
    setIsLoading(true);
    try {
      if (!settings) {
        throw new Error('Les paramètres de notification ne sont pas configurés');
      }

      const recipients = await getMembersByFilters(
        user?.club?.id!,
        data.selectedGroups,
        data.contributionYear
      );

      if (recipients.length === 0) {
        toast.error('Aucun membre ne correspond aux critères sélectionnés');
        return;
      }

      // Programmer l'envoi dans 1 heure
      const scheduledDate = addHours(new Date(), 1);
      
      // Créer une notification pour chaque destinataire
      const notificationPromises = recipients.map(recipient => 
        createNotification({
          type: 'bulk_email' as any, // Ajouter ce type dans NotificationType
          user_id: recipient.id, // Utiliser l'ID au lieu de l'email
          scheduled_date: format(scheduledDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
          sent: false,
          variables: {
            subject: data.subject,
            content: data.content,
            recipient: {
              email: recipient.email,
              name: recipient.name
            }
          },
          club_id: user?.club?.id!
        })
      );

      await Promise.all(notificationPromises);

      toast.success(`${recipients.length} emails programmés pour ${format(scheduledDate, 'HH:mm')}`);
    } catch (error) {
      console.error('Erreur lors de la programmation des emails:', error);
      toast.error('Erreur lors de la programmation des emails');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader 
          title="Programmer des emails aux membres"
          subheader="Les emails seront envoyés dans 1 heure"
          avatar={<Mail className="h-6 w-6 text-primary" />}
        />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormControl fullWidth>
              <FormLabel>Destinataires</FormLabel>
              <FormGroup row>
                {groups.map((group) => (
                  <Controller
                    key={group.id}
                    name="selectedGroups"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={field.value?.includes(group.id)}
                            onChange={(e) => {
                              const newValue = e.target.checked
                                ? [...(field.value || []), group.id]
                                : (field.value || []).filter((id: string) => id !== group.id);
                              field.onChange(newValue);
                            }}
                          />
                        }
                        label={group.label}
                      />
                    )}
                  />
                ))}
              </FormGroup>
            </FormControl>

            <FormControl fullWidth>
              <FormLabel>Année de cotisation</FormLabel>
              <Controller
                name="contributionYear"
                control={control}
                render={({ field }) => (
                  <MuiSelect {...field}>
                    {years.map((year) => (
                      <MenuItem key={year.value} value={year.value}>
                        {year.label}
                      </MenuItem>
                    ))}
                  </MuiSelect>
                )}
              />
            </FormControl>

            <FormControl fullWidth>
              <FormLabel>Sujet</FormLabel>
              <Controller
                name="subject"
                control={control}
                rules={{ required: 'Le sujet est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    error={!!errors.subject}
                    helperText={errors.subject?.message}
                    fullWidth
                  />
                )}
              />
            </FormControl>

            <FormControl fullWidth>
              <FormLabel>Contenu</FormLabel>
              <Controller
                name="content"
                control={control}
                rules={{ required: 'Le contenu est requis' }}
                render={({ field }) => (
                  <Editor
                    apiKey="a2n3jmwpjgutthe8gc0w2odt7jqkh537sv261emnc52ffdgh"
                    init={{
                      height: 400,
                      menubar: true,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'help', 'wordcount'
                      ],
                      toolbar: 'undo redo | blocks | ' +
                        'bold italic forecolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'removeformat | help',
                      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                      language: 'fr_FR',
                    }}
                    value={field.value}
                    onEditorChange={(content) => {
                      field.onChange(content);
                    }}
                  />
                )}
              />
              {errors.content && (
                <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
              )}
            </FormControl>

            <div className="flex justify-end">
              <Button
                variant="contained"
                type="submit"
                disabled={isLoading}
                startIcon={<Send />}
              >
                {isLoading ? 'Programmation en cours...' : 'Programmer les emails'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailMembersPage;
