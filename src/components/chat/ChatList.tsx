import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Plus, UserPlus, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import type { ChatRoom } from '../../types/chat';
import { useAuth } from '../../contexts/AuthContext';
import ChatRoom from './ChatRoom';
import PrivateChat from './PrivateChat';
import CreateChatRoomModal from './CreateChatRoomModal';
import NewPrivateChat from './NewPrivateChat';
import PrivateConversationsList from './PrivateConversationsList';
import { toast } from 'react-hot-toast';

type ChatType = 'rooms' | 'private';

const ChatList: React.FC = () => {
  const { user } = useAuth();
  const { recipientId } = useParams<{ recipientId: string }>();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(recipientId || null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNewPrivateChat, setShowNewPrivateChat] = useState(false);
  const [activeChatType, setActiveChatType] = useState<ChatType>(recipientId ? 'private' : 'rooms');
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (recipientId) {
      setSelectedRecipientId(recipientId);
      setActiveChatType('private');
    }
  }, [recipientId]);

  useEffect(() => {
    if (!user?.club?.id) return;

    const roomsChannel = supabase.channel('chat_rooms_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms',
          filter: `club_id=eq.${user.club.id}`
        },
        async (payload) => {
          try {
            if (payload.eventType === 'INSERT') {
              const { data: newRoom, error } = await supabase
                .from('chat_rooms')
                .select('*')
                .eq('id', payload.new.id)
                .single();

              if (error) throw error;
              if (newRoom) {
                setRooms(prev => [...prev, newRoom].sort((a, b) => 
                  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                ));
              }
            } else if (payload.eventType === 'DELETE') {
              setRooms(prev => prev.filter(room => room.id !== payload.old.id));
            } else if (payload.eventType === 'UPDATE') {
              setRooms(prev => prev.map(room => 
                room.id === payload.new.id ? { ...room, ...payload.new } : room
              ).sort((a, b) => 
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              ));
            }
          } catch (error) {
            console.error('Error handling room changes:', error);
            toast.error('Erreur lors de la mise à jour des salons');
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(roomsChannel);
    };
  }, [user?.club?.id]);

  useEffect(() => {
    loadRooms();
  }, [user?.club?.id]);

  const loadRooms = async () => {
    if (!user?.club?.id) return;

    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('club_id', user.club.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setRooms(data);
        if (data.length > 0 && !selectedRoom && !recipientId) {
          setSelectedRoom(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      toast.error('Erreur lors du chargement des conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoom(roomId);
    setSelectedRecipientId(null);
    setActiveChatType('rooms');
    setShowSidebar(false);
  };

  const handleSelectRecipient = (recipientId: string) => {
    setSelectedRoom(null);
    setSelectedRecipientId(recipientId);
    setActiveChatType('private');
    setShowSidebar(false);
  };

  const handleBackToList = () => {
    setShowSidebar(true);
    setSelectedRoom(null);
    setSelectedRecipientId(null);
  };

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Sidebar */}
      <div 
        className={`
          ${showSidebar ? 'flex' : 'hidden'} 
          md:flex flex-col w-full md:w-80 border-r border-gray-200 bg-white
        `}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => {
                setActiveChatType('rooms');
                setShowNewPrivateChat(false);
                if (rooms.length > 0) {
                  setSelectedRoom(rooms[0].id);
                  setSelectedRecipientId(null);
                }
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors ${
                activeChatType === 'rooms'
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              <Users className="h-5 w-5" />
              <span>Salons</span>
            </button>
            <button
              onClick={() => {
                setActiveChatType('private');
                setSelectedRoom(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors ${
                activeChatType === 'private'
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span>Messages</span>
            </button>
          </div>

          {activeChatType === 'rooms' ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Nouveau salon</span>
            </button>
          ) : (
            <button
              onClick={() => setShowNewPrivateChat(true)}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              <span>Nouveau message</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeChatType === 'rooms' ? (
            loading ? (
              <div className="animate-pulse space-y-4 p-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 bg-gray-200 rounded-lg" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">Aucun salon</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleSelectRoom(room.id)}
                    className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-50 ${
                      selectedRoom === room.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Users className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{room.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : showNewPrivateChat ? (
            <NewPrivateChat
              onSelectRecipient={(recipientId) => {
                handleSelectRecipient(recipientId);
                setShowNewPrivateChat(false);
              }}
            />
          ) : (
            <PrivateConversationsList
              selectedRecipientId={selectedRecipientId}
              onSelectRecipient={handleSelectRecipient}
            />
          )}
        </div>
      </div>

      {/* Chat Content */}
      <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-1 flex-col h-full`}>
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 border-b border-gray-200 bg-white">
          <button
            onClick={handleBackToList}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="ml-2 font-medium">
            {activeChatType === 'rooms' && selectedRoom
              ? rooms.find(r => r.id === selectedRoom)?.name
              : 'Conversation'}
          </span>
        </div>

        {/* Chat Content */}
        {activeChatType === 'rooms' && selectedRoom ? (
          <ChatRoom roomId={selectedRoom} key={selectedRoom} refetchRooms={loadRooms} />
        ) : activeChatType === 'private' && selectedRecipientId ? (
          <PrivateChat recipientId={selectedRecipientId} key={selectedRecipientId} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Sélectionnez une conversation pour commencer</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateChatRoomModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(roomId) => {
            setShowCreateModal(false);
            setSelectedRoom(roomId);
            setActiveChatType('rooms');
          }}
        />
      )}
    </div>
  );
};

export default ChatList;