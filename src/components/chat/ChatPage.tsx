import React, { useState } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import ChatList from './ChatList';
import CreateChatRoomModal from './CreateChatRoomModal';
import { useAuth } from '../../contexts/AuthContext';

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isInstructor = user?.role === 'INSTRUCTOR';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="text-slate-600">
            {isInstructor
              ? 'Gérez vos conversations avec vos élèves'
              : 'Échangez avec vos instructeurs et autres pilotes'}
          </p>
        </div>

        {isInstructor && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle conversation</span>
          </button>
        )}
      </div>

      <ChatList />

      {showCreateModal && (
        <CreateChatRoomModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

export default ChatPage;