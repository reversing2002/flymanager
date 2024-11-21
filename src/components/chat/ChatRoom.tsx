import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import type { ChatMessage, ChatRoomMember } from '../../types/chat';
import { useAuth } from '../../contexts/AuthContext';

interface ChatRoomProps {
  roomId: string;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ roomId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatRoomMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadMembers();
    
    // Subscribe to new messages
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
          // Fetch the complete message with user details
          const { data: messageData } = await supabase
            .from('chat_messages')
            .select(`
              *,
              user:user_id (
                firstName:first_name,
                lastName:last_name,
                imageUrl:image_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (messageData) {
            setMessages(prev => [...prev, messageData]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user:user_id (
          firstName:first_name,
          lastName:last_name,
          imageUrl:image_url
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from('chat_room_members')
      .select(`
        *,
        user:user_id (
          firstName:first_name,
          lastName:last_name,
          imageUrl:image_url,
          role
        )
      `)
      .eq('room_id', roomId);

    if (data) {
      setMembers(data);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('chat_messages').insert([
        {
          room_id: roomId,
          user_id: user.id,
          content: newMessage.trim(),
        },
      ]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] bg-white rounded-xl shadow-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.user_id === user?.id ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`flex flex-col ${
                message.user_id === user?.id ? 'items-end' : ''
              }`}
            >
              <div
                className={`px-4 py-2 rounded-lg max-w-md ${
                  message.user_id === user?.id
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-100'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span>{message.user?.firstName}</span>
                <span>•</span>
                <span>
                  {format(new Date(message.created_at), 'HH:mm', {
                    locale: fr,
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t flex items-center gap-4"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Votre message..."
          className="flex-1 rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={loading || !newMessage.trim()}
          className="p-2 text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};

export default ChatRoom;