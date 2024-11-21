import React, { useState, useEffect } from 'react';
import { MessageSquare, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ChatRoom } from '../../types/chat';
import { useAuth } from '../../contexts/AuthContext';
import ChatRoom from './ChatRoom';
import { toast } from 'react-hot-toast';

const ChatList: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const { data } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('updated_at', { ascending: false });

      if (data) {
        setRooms(data);
        if (data.length > 0 && !selectedRoom) {
          handleRoomSelect(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSelect = async (roomId: string) => {
    if (!user) return;

    try {
      // Check if user is already a member
      const { data: membership } = await supabase
        .from('chat_room_members')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      // If not a member, add them
      if (!membership) {
        const { error: joinError } = await supabase
          .from('chat_room_members')
          .insert([
            {
              room_id: roomId,
              user_id: user.id,
            },
          ]);

        if (joinError) {
          console.error('Error joining room:', joinError);
          toast.error('Erreur lors de l\'accès au salon');
          return;
        }

        toast.success('Vous avez rejoint le salon');
      }

      setSelectedRoom(roomId);
    } catch (error) {
      console.error('Error handling room selection:', error);
      toast.error('Erreur lors de la sélection du salon');
    }
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
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversations
        </h2>

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
    </div>
  );
};

export default ChatList;