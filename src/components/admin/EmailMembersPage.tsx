import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { getNotificationSettings } from '@/services/notificationService';
import { sendBulkEmail, getMembersByFilters } from '@/services/emailService';

interface EmailForm {
  subject: string;
  content: string;
  selectedGroups: string[];
  contributionYear: string;
}

const EmailMembersPage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<EmailForm>();

  // Récupération des paramètres de notification
  const { data: settings } = useQuery({
    queryKey: ['notificationSettings', user?.club?.id],
    queryFn: () => getNotificationSettings(user?.club?.id!),
    enabled: !!user?.club?.id,
  });

  const groups = [
    { id: 'admin', label: 'Administrateurs' },
    { id: 'instructor', label: 'Instructeurs' },
    { id: 'student', label: 'Élèves' },
    { id: 'pilot', label: 'Pilotes' },
    { id: 'mechanic', label: 'Mécaniciens' }
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

      await sendBulkEmail({
        subject: data.subject,
        content: data.content,
        recipients,
        settings: {
          mailjet_api_key: settings.mailjet_api_key,
          mailjet_api_secret: settings.mailjet_api_secret,
          sender_email: settings.sender_email,
          sender_name: settings.sender_name,
        },
      });

      toast.success(`Emails envoyés avec succès à ${recipients.length} membres`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi des emails:', error);
      toast.error('Erreur lors de l\'envoi des emails');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Envoyer un email aux membres</h1>
      
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="subject">Sujet</Label>
            <input
              id="subject"
              type="text"
              className="w-full p-2 border rounded"
              {...register('subject', { required: 'Le sujet est requis' })}
            />
            {errors.subject && (
              <p className="text-red-500 text-sm">{errors.subject.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="content">Contenu</Label>
            <Textarea
              id="content"
              className="w-full h-40"
              {...register('content', { required: 'Le contenu est requis' })}
            />
            {errors.content && (
              <p className="text-red-500 text-sm">{errors.content.message}</p>
            )}
          </div>

          <div>
            <Label>Filtrer par groupe</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              {groups.map((group) => (
                <div key={group.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`group-${group.id}`}
                    {...register('selectedGroups')}
                    value={group.id}
                  />
                  <Label htmlFor={`group-${group.id}`}>{group.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="contributionYear">Année de cotisation</Label>
            <Select
              id="contributionYear"
              {...register('contributionYear')}
              className="w-full"
            >
              {years.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Envoi en cours...' : 'Envoyer les emails'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default EmailMembersPage;
