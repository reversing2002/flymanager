import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import type { ChatMessage, ChatRoom as ChatRoomType } from '../../types/chat';
import { useAuth } from '../../contexts/AuthContext';
import ConversationWindow from './ConversationWindow';
import toast from 'react-hot-toast'; // Import toast
import { useNavigate } from "react-router-dom";
import { hasAnyGroup } from "../../lib/permissions";
import { Edit2, Trash2 } from "lucide-react";
import EditChatRoomModal from './EditChatRoomModal';

interface ChatRoomProps {
  roomId: string;
  refetchRooms?: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, refetchRooms }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [room, setRoom] = useState<ChatRoomType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  // Vérifier si l'utilisateur est admin ou créateur
  const isAdminOrCreator = useMemo(() => {
    if (!user || !room) return false;
    return hasAnyGroup(user, ['ADMIN']) || room.creator_id === user.id;
  }, [user, room]);

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

  const handleEditRoom = async (newData: { name: string; description: string; type: string }) => {
    if (!room || !isAdminOrCreator) return;

    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({
          name: newData.name,
          description: newData.description,
          type: newData.type,
          updated_at: new Date().toISOString()
        })
        .eq('id', room.id);

      if (error) throw error;

      setRoom(prev => prev ? { ...prev, ...newData } : null);
      toast.success('Salon modifié avec succès');
    } catch (error) {
      console.error('Error updating chat room:', error);
      toast.error('Erreur lors de la modification du salon');
    }
  };

  const handleDeleteRoom = async () => {
    if (!room || !isAdminOrCreator) return;

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce salon ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .rpc('delete_chat_room', { room_id: room.id });

      if (error) throw error;

      toast.success('Salon supprimé');
      // Rafraîchir la liste des salons avant de naviguer
      if (refetchRooms) {
        refetchRooms();
      }
      navigate('/chat');
    } catch (error) {
      console.error('Error deleting chat room:', error);
      toast.error('Erreur lors de la suppression du salon');
    }
  };

  if (loading || !room) return null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* En-tête du salon */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">{room?.name}</h2>
          {room?.description && (
            <p className="text-sm text-gray-500">{room.description}</p>
          )}
        </div>
        
        {isAdminOrCreator && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Edit2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleDeleteRoom}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
      {showEditModal && room && (
        <EditChatRoomModal
          room={room}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditRoom}
        />
      )}

      <ConversationWindow
        type="room"
        title={room.name}
        subtitle={room.description}
        messages={messages.map(transformMessage)}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={handleEditMessage}
      />
    </div>
  );
};

export default ChatRoom;