import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

interface Message {
  sid: string;
  body: string;
  author: string;
  dateCreated: string;
}

interface ConversationResponse {
  conversation: {
    sid: string;
    friendlyName: string;
    messages: Message[];
  };
}

interface ClientDiscoveryChatProps {
  flightId: string;
}

const ClientDiscoveryChat: React.FC<ClientDiscoveryChatProps> = ({ flightId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadMessages();
    // Ne mettre en place le polling que si nous n'avons pas d'erreur
    let interval: NodeJS.Timeout | null = null;
    if (!hasError) {
      interval = setInterval(loadMessages, 10000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [flightId, hasError]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/conversations/${flightId}/messages`);
      if (!response.ok) throw new Error('Erreur lors du chargement des messages');
      const data: ConversationResponse = await response.json();
      setMessages(data.conversation.messages);
      setHasError(false); // Réinitialiser l'erreur en cas de succès
    } catch (error) {
      console.error('Erreur:', error);
      if (!hasError) {
        toast.error('Impossible de charger les messages. Tentative de reconnexion dans 10 secondes...');
        setHasError(true);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/conversations/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flightId,
          message: newMessage,
          sender: 'client',
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'envoi du message');

      setNewMessage('');
      await loadMessages();
      toast.success('Message envoyé');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible d\'envoyer le message');
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessageDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr });
  };

  return (
    <div className="flex flex-col h-[600px] bg-gray-50 rounded-lg shadow-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.sid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${
                message.author === 'client' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[70%] ${
                  message.author === 'client' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${
                    message.author === 'client' ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {message.author === 'client' ? 'C' : 'P'}
                  </div>
                </div>

                <div
                  className={`flex flex-col space-y-1 ${
                    message.author === 'client'
                      ? 'items-end'
                      : 'items-start'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.author === 'client'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{message.author === 'client' ? 'Vous' : 'Pilote'}</span>
                    <span>•</span>
                    <time>{formatMessageDate(message.dateCreated)}</time>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-white p-4">
        <div className="flex items-center space-x-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Écrivez votre message..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-y rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            onClick={loadMessages}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            title="Rafraîchir les messages"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !newMessage.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4 mr-2" />
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDiscoveryChat;
