import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { ChatMessage, ChatRoom as ChatRoomType } from '../../types/chat';
import { useAuth } from '../../contexts/AuthContext';
import ConversationWindow from './ConversationWindow';
import toast from 'react-hot-toast'; // Import toast

interface ChatRoomProps {
  roomId: string;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ roomId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [room, setRoom] = useState<ChatRoomType | null>(null);
  const [loading, setLoading] = useState(true);

  const transformMessage = (message: any) => ({
    id: message.id,
    content: message.content,
    timestamp: new Date(message.created_at),
    sender: {
      id: message.user_id,
      name: message.user ? `${message.user.first_name} ${message.user.last_name}` : 'Unknown',
      avatar: message.user?.image_url
    },
    file_url: message.file_url,
    file_type: message.file_type
  });

  useEffect(() => {
    loadMessages();
    loadRoom();
    
    const channel = supabase.channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('Received new room message:', payload);

          // Ne pas ajouter le message si c'est nous qui l'avons envoyé
          if (payload.new.user_id === user?.id) {
            return;
          }

          // Get user information
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('first_name, last_name, image_url')
            .eq('id', payload.new.user_id)
            .single();

          console.log('User data:', userData, 'Error:', userError);

          if (userData) {
            const newMessage = {
              id: payload.new.id,
              content: payload.new.content,
              created_at: payload.new.created_at,
              room_id: payload.new.room_id,
              user_id: payload.new.user_id,
              file_url: payload.new.file_url,
              file_type: payload.new.file_type,
              user: {
                first_name: userData.first_name,
                last_name: userData.last_name,
                image_url: userData.image_url
              }
            };

            console.log('Adding new room message to state:', newMessage);
            setMessages(prev => {
              console.log('Previous room messages:', prev);
              const updated = [...prev, newMessage];
              console.log('Updated room messages:', updated);
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Room subscription status:', status);
      });

    console.log('Room channel created:', channel);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  const loadRoom = async () => {
    const { data } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (data) {
      setRoom(data);
    }
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user:user_id (
          first_name,
          last_name,
          image_url
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const handleSendMessage = async (content: string, fileUrl?: string, fileType?: 'image' | 'video' | 'document') => {
    if (!user?.id || !roomId) return;

    try {
      // Send the message
      const { data: newMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          content,
          room_id: roomId,
          user_id: user.id,
          file_url: fileUrl,
          file_type: fileType,
          created_at: new Date().toISOString()
        })
        .select(`
          id,
          content,
          created_at,
          room_id,
          user_id,
          file_url,
          file_type
        `)
        .single();

      if (error) {
        console.error('Error sending room message:', error);
        throw error;
      }

      console.log('Room message sent successfully:', newMessage);

      // Optimistically add the message to the UI
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name, image_url')
        .eq('id', user.id)
        .single();

      if (userData && newMessage) {
        const message = {
          ...newMessage,
          user: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            image_url: userData.image_url
          }
        };

        setMessages(prev => [...prev, message]);
      }
    } catch (error) {
      console.error('Error sending room message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) return;

    try {
      // Get the message to check ownership and file info
      const { data: message } = await supabase
        .from('chat_messages')
        .select('user_id, file_url')
        .eq('id', messageId)
        .single();

      if (!message || message.user_id !== user.id) {
        toast.error('Vous ne pouvez supprimer que vos propres messages');
        return;
      }

      // If message has a file, delete it from storage first
      if (message.file_url) {
        const filePath = message.file_url.split('/').pop(); // Get filename from URL
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('chat-attachments')
            .remove([filePath]);

          if (storageError) {
            console.error('Error deleting file:', storageError);
            toast.error('Erreur lors de la suppression du fichier');
            return;
          }
        }
      }

      // Delete the message from the database
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      // Update local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast.success('Message supprimé');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erreur lors de la suppression du message');
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!user?.id) return;

    try {
      // Get the message to check ownership
      const { data: message } = await supabase
        .from('chat_messages')
        .select('user_id')
        .eq('id', messageId)
        .single();

      if (!message || message.user_id !== user.id) {
        toast.error('Vous ne pouvez modifier que vos propres messages');
        return;
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ content: newContent })
        .eq('id', messageId);

      if (error) throw error;

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: newContent }
          : msg
      ));
      toast.success('Message modifié');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Erreur lors de la modification du message');
    }
  };

  if (loading || !room) return null;

  return (
    <ConversationWindow
      type="room"
      title={room.name}
      subtitle={room.description}
      messages={messages.map(transformMessage)}
      onSendMessage={handleSendMessage}
      onDeleteMessage={handleDeleteMessage}
      onEditMessage={handleEditMessage}
    />
  );
};

export default ChatRoom;