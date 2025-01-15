import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Clock,
  User,
  MessageSquare,
  CheckCircle,
  Archive,
  Loader2,
} from 'lucide-react';
import { cn } from "../../lib/utils";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  created_at: string;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  response?: string;
  responded_at?: string;
  responded_by?: string;
}

interface ResponseModalProps {
  message: ContactMessage;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (response: string) => Promise<void>;
}

const statusColors = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  archived: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

const statusLabels = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Traité',
  archived: 'Archivé',
};

const statusButtons = {
  all: 'bg-blue-600 hover:bg-blue-700 text-white',
  pending: 'bg-amber-600 hover:bg-amber-700 text-white',
  in_progress: 'bg-blue-600 hover:bg-blue-700 text-white',
  completed: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  archived: 'bg-slate-600 hover:bg-slate-700 text-white',
};

const ResponseModal: React.FC<ResponseModalProps> = ({
  message,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [response, setResponse] = useState(message.response || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!response.trim()) {
      toast.error('Veuillez saisir une réponse');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(response);
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la réponse:', error);
      toast.error('Erreur lors de l\'envoi de la réponse');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 text-gray-100">
        <DialogHeader>
          <DialogTitle>Répondre au message</DialogTitle>
          <DialogDescription className="text-gray-400">
            Le message sera envoyé par email à {message.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Message original</label>
            <Card className="p-4 bg-gray-800 border-gray-700">
              <p className="text-gray-300 whitespace-pre-wrap">{message.message}</p>
            </Card>
          </div>

          <div className="space-y-2">
            <label htmlFor="response" className="text-sm font-medium text-gray-200">
              Votre réponse
            </label>
            <Textarea
              id="response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="h-40 bg-gray-800 border-gray-700 text-gray-100"
              placeholder="Saisissez votre réponse..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-gray-100 border-gray-600"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              'Envoyer la réponse'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ContactMessagesSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'archived'>('pending');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['contactMessages', filter],
    queryFn: async () => {
      let query = supabase
        .from('contact_messages')
        .select(`
          *,
          responded_by_user:responded_by (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as ContactMessage[];
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: async ({
      messageId,
      status,
      response,
    }: {
      messageId: string;
      status: ContactMessage['status'];
      response?: string;
    }) => {
      const updates: any = {
        status,
      };

      if (response) {
        updates.response = response;
        updates.responded_at = new Date().toISOString();
        updates.responded_by = user?.id;
      }

      const { data, error } = await supabase
        .from('contact_messages')
        .update(updates)
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;

      // Si une réponse est fournie, envoyer l'email
      if (response) {
        const message = messages?.find((m) => m.id === messageId);
        if (message) {
          const createNotification = async (message: ContactMessage, response: string) => {
            try {
              const { error } = await supabase
                .from('notifications')
                .insert({
                  club_id: user?.club?.id,
                  type: 'CONTACT_RESPONSE',
                  recipient_email: message.email,
                  variables: {
                    name: message.name,
                    email: message.email,
                    subject: message.subject,
                    message: message.message,
                    response: response
                  },
                  scheduled_date: new Date().toISOString(),
                  sent: false
                });

              if (error) throw error;
            } catch (error) {
              console.error('Erreur lors de la création de la notification:', error);
              throw error;
            }
          };
          await createNotification(message, response);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contactMessages']);
      toast.success('Message mis à jour avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du message');
    },
  });

  const handleStatusChange = async (message: ContactMessage, newStatus: ContactMessage['status']) => {
    await updateMessageMutation.mutateAsync({
      messageId: message.id,
      status: newStatus,
    });
  };

  const handleResponse = async (response: string) => {
    if (!selectedMessage) return;

    await updateMessageMutation.mutateAsync({
      messageId: selectedMessage.id,
      status: 'completed',
      response,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Messages de Contact</h1>
      <p className="text-base text-gray-700 mb-6">Liste des messages reçus via le formulaire de contact.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {["Tous", "En attente", "En cours", "Traités", "Archivés"].map((status, index) => (
          <button
            key={status}
            onClick={() => setFilter(["all", "pending", "in_progress", "completed", "archived"][index])}
            className={cn(
              "px-4 py-2 rounded-md font-semibold transition-colors",
              filter === ["all", "pending", "in_progress", "completed", "archived"][index]
                ? {
                    all: "bg-gray-800 text-white hover:bg-gray-700",
                    pending: "bg-orange-500 text-white hover:bg-orange-600",
                    in_progress: "bg-blue-600 text-white hover:bg-blue-700",
                    completed: "bg-emerald-600 text-white hover:bg-emerald-700",
                    archived: "bg-gray-600 text-white hover:bg-gray-700"
                  }[["all", "pending", "in_progress", "completed", "archived"][index]]
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {messages?.map((message) => (
          <div key={message.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{message.subject}</h3>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-medium",
                      {
                        pending: "bg-orange-100 text-orange-800 border border-orange-200",
                        in_progress: "bg-blue-100 text-blue-800 border border-blue-200",
                        completed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
                        archived: "bg-gray-100 text-gray-800 border border-gray-200"
                      }[message.status]
                    )}>
                      {message.status === "pending" && "En attente"}
                      {message.status === "in_progress" && "En cours"}
                      {message.status === "completed" && "Traité"}
                      {message.status === "archived" && "Archivé"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-700">{message.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-600">{message.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-600">{new Date(message.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {message.status === "pending" && (
                    <Button
                      onClick={() => handleStatusChange(message, "in_progress")}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      size="sm"
                    >
                      Prendre en charge
                    </Button>
                  )}
                  {message.status !== "archived" && message.status !== "completed" && (
                    <Button
                      onClick={() => {
                        setSelectedMessage(message);
                        setIsResponseModalOpen(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      size="sm"
                    >
                      Répondre
                    </Button>
                  )}
                  {message.status === "archived" ? (
                    <Button
                      onClick={() => handleStatusChange(message, "pending")}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      size="sm"
                    >
                      Désarchiver
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleStatusChange(message, "archived")}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-medium"
                      size="sm"
                    >
                      Archiver
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-gray-800 whitespace-pre-wrap">{message.message}</p>
                {message.response && (
                  <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-1">Réponse :</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{message.response}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedMessage && (
        <ResponseModal
          message={selectedMessage}
          isOpen={isResponseModalOpen}
          onClose={() => {
            setIsResponseModalOpen(false);
            setSelectedMessage(null);
          }}
          onSubmit={handleResponse}
        />
      )}
    </div>
  );
};

export default ContactMessagesSettings;
