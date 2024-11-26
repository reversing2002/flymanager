import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ChatRoom } from '../../types/chat';
import { useAuth } from '../../contexts/AuthContext';
import ChatRoom from './ChatRoom';
import CreateChatRoomModal from './CreateChatRoomModal';
import { toast } from 'react-hot-toast';

const ChatList: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // Souscrire aux changements des rooms
    const roomsChannel = supabase.channel('chat_rooms_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Écouter tous les événements (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'chat_rooms',
          filter: user?.club?.id ? `club_id=eq.${user.club.id}` : undefined
        },
        async (payload) => {
          console.log('Room change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Pour les nouvelles rooms, charger les détails complets
            const { data: newRoom } = await supabase
              .from('chat_rooms')
              .select('*')
              .eq('id', payload.new.id)
              .single();

            if (newRoom) {
              setRooms(prev => [...prev, newRoom]);
            }
          } else if (payload.eventType === 'DELETE') {
            setRooms(prev => prev.filter(room => room.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setRooms(prev => prev.map(room => 
              room.id === payload.new.id ? { ...room, ...payload.new } : room
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
    };
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
        if (data.length > 0 && !selectedRoom) {
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

  useEffect(() => {
    loadRooms();
  }, [user?.club?.id]);

  const handleRoomSelect = async (roomId: string) => {
    setSelectedRoom(roomId);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 rounded-lg"></div>
          <div className="h-96 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            title="Nouvelle conversation"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => handleRoomSelect(room.id)}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                selectedRoom === room.id
                  ? 'bg-sky-50 text-sky-900'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="font-medium">{room.name}</div>
                  <div className="text-xs text-slate-500">
                    {room.type === 'INSTRUCTOR_STUDENT'
                      ? 'Chat instructeur-élève'
                      : room.type === 'PILOT_GROUP'
                      ? 'Groupe pilotes'
                      : 'Groupe instructeurs'}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {rooms.length === 0 && (
            <div className="text-center p-4 text-slate-500">
              Aucune conversation
            </div>
          )}
        </div>
      </div>

      <div className="col-span-3">
        {selectedRoom ? (
          <ChatRoom roomId={selectedRoom} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-slate-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sélectionnez une conversation pour commencer</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateChatRoomModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadRooms();
          }}
        />
      )}
    </div>
  );
};

export default ChatList;