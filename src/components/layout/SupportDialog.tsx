import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button, CircularProgress } from "@mui/material";
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const CONTACT_REASONS = [
  "Problème de connexion",
  "Problème de paiement",
  "Bug technique",
  "Question sur la formation",
  "Question sur les réservations",
  "Autre"
] as const;

const supportSchema = z.object({
  contactReason: z.enum(CONTACT_REASONS),
  customSubject: z.string().min(3, 'Veuillez entrer un sujet').optional(),
  message: z.string().min(10, 'Votre message est un peu court'),
});

type SupportFormData = z.infer<typeof supportSchema>;

interface SupportDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SupportDialog: React.FC<SupportDialogProps> = ({ open, onClose }) => {
  const [showCustomSubject, setShowCustomSubject] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SupportFormData>({
    resolver: zodResolver(supportSchema),
    mode: "onChange",
    defaultValues: {
      contactReason: "Bug technique"
    }
  });

  const selectedReason = watch('contactReason');

  React.useEffect(() => {
    setShowCustomSubject(selectedReason === 'Autre');
  }, [selectedReason]);

  const onSubmit = async (data: SupportFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([
          {
            name: user?.user_metadata?.full_name || user?.email,
            email: user?.email,
            phone: user?.user_metadata?.phone,
            subject: data.contactReason === 'Autre' ? data.customSubject : data.contactReason,
            message: data.message,
            user_id: user?.id
          }
        ]);

      if (error) throw error;

      toast.success('Votre demande de support a été envoyée avec succès');
      reset();
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Une erreur est survenue lors de l\'envoi de votre message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="rounded-lg"
    >
      <DialogTitle className="flex justify-between items-center">
        <span>Demande de Support Technique</span>
        <IconButton onClick={onClose} size="small">
          <X className="h-5 w-5" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <select
              {...register('contactReason')}
              className="w-full p-2 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {CONTACT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {showCustomSubject && (
            <TextField
              {...register('customSubject')}
              label="Sujet personnalisé"
              fullWidth
              error={!!errors.customSubject}
              helperText={errors.customSubject?.message}
            />
          )}

          <TextField
            {...register('message')}
            label="Message"
            multiline
            rows={4}
            fullWidth
            error={!!errors.message}
            helperText={errors.message?.message}
          />

          <div className="flex justify-end space-x-2">
            <Button
              onClick={onClose}
              variant="outlined"
              color="inherit"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
            >
              Envoyer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
