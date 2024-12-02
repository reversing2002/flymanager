import React, { useEffect, useState } from 'react';
import ConversationWindow from './ConversationWindow';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Message } from './ConversationWindow';

interface User {
  id: string;
  email: string;
  full_name?: string;
  image_url?: string;
}

interface PrivateChatProps {
  recipientId: string;
}

interface DatabaseMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender: {
    full_name: string;
    image_url: string;
  };
}

const PrivateChat: React.FC<PrivateChatProps> = ({ recipientId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipientData, setRecipientData] = useState<User | null>(null);

  useEffect(() => {
    if (!recipientId || !user?.id) return;

    // Fetch recipient data
    const fetchRecipient = async () => {
      const { data: recipientData, error: recipientError } = await supabase
        .from('users')
        .select('id, email, full_name, image_url')
        .eq('id', recipientId)
        .single();
      
      if (recipientData && !recipientError) {
        setRecipientData(recipientData);
      }
    };

    // Mark messages as read
    const markMessagesAsRead = async () => {
      const { error } = await supabase
        .from('private_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', recipientId)
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (error) console.error('Error marking messages as read:', error);
    };

    // Load existing messages
    const loadMessages = async () => {
      const { data } = await supabase
        .from('private_messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          recipient_id,
          sender:sender_id (
            id,
            full_name,
            image_url
          )
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (data) {
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          sender: {
            id: msg.sender_id,
            name: msg.sender?.full_name || 'Unknown',
            avatar: msg.sender?.image_url
          }
        }));
        setMessages(formattedMessages);
      }
    };

    fetchRecipient();
    loadMessages();
    markMessagesAsRead();

    // Subscribe to new messages
    const channel = supabase.channel(`private_messages:${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `or(and(sender_id=eq.${user.id},recipient_id=eq.${recipientId}),and(sender_id=eq.${recipientId},recipient_id=eq.${user.id}))`
        },
        async (payload) => {
          console.log('Received new private message:', payload);
          
          // Ne pas ajouter le message si c'est nous qui l'avons envoyé
          if (payload.new.sender_id === user?.id) {
            return;
          }
          
          // Get sender information
          const { data: senderData } = await supabase
            .from('users')
            .select('full_name, image_url')
            .eq('id', payload.new.sender_id)
            .single();

          if (senderData) {
            const newMessage = {
              id: payload.new.id,
              content: payload.new.content,
              timestamp: new Date(payload.new.created_at),
              sender: {
                id: payload.new.sender_id,
                name: senderData.full_name || 'Unknown',
                avatar: senderData.image_url
              }
            };

            setMessages(prev => [...prev, newMessage]);

            // Mark message as read if we're the recipient
            if (payload.new.sender_id === recipientId) {
              markMessagesAsRead();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Private messages subscription status:', status);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [recipientId, user?.id]);

  const handleSendMessage = async (content: string, fileUrl?: string, fileType?: 'image' | 'video' | 'document') => {
    if (!user?.id || !recipientId || !content.trim()) return;

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
            name: user.full_name || user.email.split('@')[0],
            avatar: user.image_url
          },
          file_url: newMessage.file_url,
          file_type: newMessage.file_type
        };
        setMessages(prev => [...prev, formattedMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!recipientData) return null;

  return (
    <ConversationWindow
      type="private"
      title={recipientData.full_name || recipientData.email}
      recipientName={recipientData.full_name}
      recipientAvatar={recipientData.image_url}
      messages={messages}
      onSendMessage={handleSendMessage}
    />
  );
};

export default PrivateChat;
