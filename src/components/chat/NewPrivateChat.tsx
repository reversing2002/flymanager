import React, { useState, useEffect } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  full_name?: string;
  image_url?: string;
}

interface Props {
  onSelectRecipient: (recipientId: string) => void;
}

const NewPrivateChat: React.FC<Props> = ({ onSelectRecipient }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim() || !user?.club?.id) return;
    
    const searchUsers = async () => {
      setLoading(true);
      try {
        // D'abord, récupérer les IDs des membres du club
        const { data: memberIds } = await supabase
          .from('club_members')
          .select('user_id')
          .eq('club_id', user.club.id)
          .neq('user_id', user.id);

        if (!memberIds) return;

        // Ensuite, rechercher parmi ces membres
        const { data, error } = await supabase
          .from('users')
          .select('id, email, full_name, image_url')
          .in('id', memberIds.map(m => m.user_id))
          .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .order('full_name')
          .limit(10);

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error searching users:', error);
        toast.error('Erreur lors de la recherche des utilisateurs');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, user?.club?.id, user?.id]);

  const startChat = (recipientId: string) => {
    onSelectRecipient(recipientId);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-gray-200 rounded-lg" />
            ))}
          </div>
        ) : searchTerm && users.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            Aucun utilisateur trouvé
          </p>
        ) : (
          users.map((user) => (
            <button
              key={user.id}
              onClick={() => startChat(user.id)}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {user.image_url ? (
                <img
                  src={user.image_url}
                  alt={user.full_name}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">
                    {user.full_name?.[0] || user.email[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">
                  {user.full_name || user.email.split('@')[0]}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <UserPlus className="h-5 w-5 text-gray-400" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default NewPrivateChat;
