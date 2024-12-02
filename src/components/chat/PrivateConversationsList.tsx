import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Conversation {
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  unread_count: number;
  user: {
    full_name: string;
    email: string;
    image_url: string;
  };
}

interface Props {
  selectedRecipientId: string | null;
  onSelectRecipient: (recipientId: string) => void;
}

const PrivateConversationsList: React.FC<Props> = ({
  selectedRecipientId,
  onSelectRecipient,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadConversations = async () => {
      try {
        const { data, error } = await supabase.rpc('get_recent_private_conversations', {
          current_user_id: user.id
        });

        if (error) throw error;

        if (data) {
          // Fetch user details for each conversation
          const conversationsWithUsers = await Promise.all(
            data.map(async (conv: any) => {
              const otherId = conv.sender_id === user.id ? conv.recipient_id : conv.sender_id;
              const { data: userData } = await supabase
                .from('users')
                .select('full_name, email, image_url')
                .eq('id', otherId)
                .single();

              return {
                ...conv,
                user: userData
              };
            })
          );

          setConversations(conversationsWithUsers);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();

    // Subscribe to new messages
    const channel = supabase.channel('private_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_messages',
          filter: `or(sender_id=eq.${user.id},recipient_id=eq.${user.id})`
        },
        () => {
          // Reload conversations when there are changes
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-16 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2">Aucune conversation</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation) => {
        const otherId = conversation.sender_id === user?.id ? conversation.recipient_id : conversation.sender_id;
        return (
          <button
            key={otherId}
            onClick={() => onSelectRecipient(otherId)}
            className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-50 ${
              selectedRecipientId === otherId ? 'bg-blue-50' : ''
            }`}
          >
            <div className="relative">
              {conversation.user.image_url ? (
                <img
                  src={conversation.user.image_url}
                  alt={conversation.user.full_name || conversation.user.email}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">
                    {(conversation.user.full_name || conversation.user.email || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {conversation.unread_count > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {conversation.unread_count}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <p className="font-medium text-gray-900 truncate">
                  {conversation.user.full_name || conversation.user.email}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(conversation.created_at).toLocaleDateString()}
                </p>
              </div>
              <p className="text-sm text-gray-500 truncate">{conversation.content}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default PrivateConversationsList;
