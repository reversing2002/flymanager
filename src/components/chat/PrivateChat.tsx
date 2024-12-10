import React, { useEffect, useState } from 'react';
import ConversationWindow from './ConversationWindow';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Message } from './ConversationWindow';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  image_url?: string;
}

interface PrivateChatProps {
  recipientId: string;
}

interface DatabaseMessage {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  sender_id: string;
  file_url: string;
  file_type: string;
  users: {
    first_name: string;
    last_name: string;
    image_url: string;
  };
}

const PrivateChat: React.FC<PrivateChatProps> = ({ recipientId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipientData, setRecipientData] = useState<User | null>(null);

  useEffect(() => {
    if (!recipientId || !user?.id) return;

    // Charger les données du destinataire
    const fetchRecipient = async () => {
      const { data: recipientData, error: recipientError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, image_url')
        .eq('id', recipientId)
        .single();
      
      if (recipientData && !recipientError) {
        setRecipientData(recipientData);
      }
    };

    fetchRecipient();

    // Charger les messages initiaux
    const loadMessages = async () => {
      const { data } = await supabase
        .from('private_messages')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          sender_id,
          file_url,
          file_type,
          users!private_messages_sender_id_fkey (
            id,
            first_name,
            last_name,
            image_url
          )
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (data) {
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: new Date(msg.updated_at || msg.created_at),
          sender: {
            id: msg.sender_id,
            name: msg.users ? `${msg.users.first_name} ${msg.users.last_name}`.trim() : 'Unknown',
            avatar: msg.users?.image_url
          },
          file_url: msg.file_url,
          file_type: msg.file_type
        }));
        setMessages(formattedMessages);
      }
    };

    loadMessages();

    // S'abonner aux changements
    const channel = supabase
      .channel('private_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_messages',
          filter: `or(and(sender_id=eq.${user.id},recipient_id=eq.${recipientId}),and(sender_id=eq.${recipientId},recipient_id=eq.${user.id}))`
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
            return;
          }

          const messageData = payload.new;
          
          // Récupérer les informations de l'utilisateur
          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name, image_url')
            .eq('id', messageData.sender_id)
            .single();

          const formattedMessage = {
            id: messageData.id,
            content: messageData.content,
            timestamp: new Date(messageData.updated_at || messageData.created_at),
            sender: {
              id: messageData.sender_id,
              name: userData ? `${userData.first_name} ${userData.last_name}`.trim() : 'Unknown',
              avatar: userData?.image_url
            },
            file_url: messageData.file_url,
            file_type: messageData.file_type
          };

          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, formattedMessage]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(msg => 
              msg.id === messageData.id ? formattedMessage : msg
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recipientId, user?.id]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('private_messages')
        .delete()
        .match({ 
          id: messageId,
          sender_id: user.id
        });

      if (error) {
        console.error('Error deleting message:', error);
        toast.error('Erreur lors de la suppression du message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erreur lors de la suppression du message');
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('private_messages')
        .update({ 
          content: newContent,
          updated_at: new Date().toISOString()
        })
        .match({ 
          id: messageId,
          sender_id: user.id
        });

      if (error) {
        console.error('Error editing message:', error);
        toast.error('Erreur lors de la modification du message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Erreur lors de la modification du message');
    }
  };

  const handleSendMessage = async (content: string, fileUrl?: string, fileType?: 'image' | 'video' | 'document') => {
    if (!user?.id || !recipientId || (!content.trim() && !fileUrl)) return;

    try {
      const { data: newMessage, error } = await supabase
        .from('private_messages')
        .insert({
          content: content.trim(),
          sender_id: user.id,
          recipient_id: recipientId,
          file_url: fileUrl,  
          file_type: fileType,
          created_at: new Date().toISOString()
        })
        .select(`
          id,
          content,
          created_at,
          sender_id,
          file_url,
          file_type
        `)
        .single();

      if (error) throw error;

      // Ajouter le message de manière optimiste
      if (newMessage) {
        const formattedMessage = {
          id: newMessage.id,
          content: newMessage.content,
          timestamp: new Date(newMessage.created_at),
          sender: {
            id: newMessage.sender_id,
            name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email.split('@')[0],
            avatar: user.image_url
          },
          file_url: newMessage.file_url,  
          file_type: newMessage.file_type
        };
        setMessages(prev => [...prev, formattedMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Erreur lors de l'envoi du message");
    }
  };

  if (!recipientData) return null;

  return (
    <ConversationWindow
      type="private"
      title={recipientData.first_name && recipientData.last_name ? `${recipientData.first_name} ${recipientData.last_name}` : recipientData.email}
      recipientName={recipientData.first_name && recipientData.last_name ? `${recipientData.first_name} ${recipientData.last_name}` : recipientData.email}
      recipientAvatar={recipientData.image_url}
      messages={messages}
      onSendMessage={handleSendMessage}
      onDeleteMessage={handleDeleteMessage}
      onEditMessage={handleEditMessage}
    />
  );
};

export default PrivateChat;
