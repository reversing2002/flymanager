import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Loader, 
  Image as ImageIcon, 
  Paperclip, 
  File as FileIcon, 
  X as XIcon, 
  ChevronLeft, 
  Check as CheckIcon,
  Pencil,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  file_url?: string;
  file_type?: 'image' | 'video' | 'document';
}

interface ConversationWindowProps {
  messages: Message[];
  onSendMessage: (content: string, fileUrl?: string, fileType?: 'image' | 'video' | 'document') => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
  type: 'room' | 'private';
  title: string;
  subtitle?: string;
  recipientName?: string;
  recipientAvatar?: string;
  onBack?: () => void;
}

const ConversationWindow: React.FC<ConversationWindowProps> = ({
  messages,
  onSendMessage,
  onDeleteMessage,
  onEditMessage,
  type,
  title,
  subtitle,
  recipientName,
  recipientAvatar,
  onBack
}) => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }, [file]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessageId]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Le fichier est trop volumineux (maximum 10MB)');
        return;
      }
      setFile(selectedFile);
    }
  };

  const getSignedUrl = async (filePath: string) => {
    try {
      const { data: { signedUrl } } = await supabase.storage
        .from('chat-files')
        .createSignedUrl(filePath, 60 * 60 * 24); // URL valide pendant 24 heures

      return signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadSignedUrls = async () => {
      const newSignedUrls: Record<string, string> = {};
      
      for (const message of messages) {
        if (message.file_url && !message.file_url.startsWith('http')) {
          const signedUrl = await getSignedUrl(message.file_url);
          if (signedUrl) {
            newSignedUrls[message.file_url] = signedUrl;
          }
        }
      }
      
      setSignedUrls(newSignedUrls);
    };

    loadSignedUrls();
  }, [messages]);

  const uploadFile = async (file: File): Promise<{ url: string; type: 'image' | 'video' | 'document' } | null> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
    const filePath = `${type === 'room' ? 'rooms' : 'private'}/${fileName}`;

    let fileType: 'image' | 'video' | 'document';
    if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.startsWith('video/')) fileType = 'video';
    else fileType = 'document';

    try {
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Retourner le chemin du fichier au lieu de l'URL signée
      return { url: filePath, type: fileType };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Erreur lors de l'upload du fichier");
      return null;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || sending) return;

    try {
      setSending(true);

      let fileUrl: string | undefined;
      let fileType: 'image' | 'video' | 'document' | undefined;

      if (file) {
        const uploadResult = await uploadFile(file);
        if (uploadResult) {
          fileUrl = uploadResult.url;
          fileType = uploadResult.type;
        }
      }

      await onSendMessage(newMessage.trim(), fileUrl, fileType);
      setNewMessage('');
      setFile(null);
      setFilePreview(null);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleConfirmEdit = async (messageId: string) => {
    if (!editingContent.trim() || !onEditMessage) return;

    try {
      await onEditMessage(messageId, editingContent.trim());
      setEditingMessageId(null);
      setEditingContent('');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error("Erreur lors de la modification du message");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!onDeleteMessage) return;

    try {
      await onDeleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error("Erreur lors de la suppression du message");
    }
  };

  const renderFilePreview = () => {
    if (!file) return null;

    return (
      <div className="relative inline-block mt-2">
        {file.type.startsWith('image/') ? (
          <img
            src={filePreview!}
            alt="Preview"
            className="max-h-32 rounded-lg"
          />
        ) : (
          <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
            {file.type.startsWith('video/') ? (
              <FileIcon className="h-5 w-5 text-blue-500" />
            ) : (
              <Paperclip className="h-5 w-5 text-blue-500" />
            )}
            <span className="text-sm text-gray-600">{file.name}</span>
          </div>
        )}
        <button
          onClick={() => setFile(null)}
          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 bg-white border-b">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          {recipientAvatar ? (
            <img
              src={recipientAvatar}
              alt={title}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-sm">
                {title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 className="font-medium text-sm">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => {
          const displayUrl = message.file_url && !message.file_url.startsWith('http') 
            ? signedUrls[message.file_url] 
            : message.file_url;
          const isOwnMessage = message.sender.id === user?.id;

          return (
            <div
              key={message.id}
              className={`flex gap-3 group ${
                isOwnMessage ? 'flex-row-reverse' : ''
              }`}
            >
              {/* Avatar et nom */}
              <div className={`flex flex-col items-center gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                {message.sender.avatar ? (
                  <img
                    src={message.sender.avatar}
                    alt={message.sender.name}
                    className="h-8 w-8 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-500 text-xs">
                      {message.sender.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  {message.sender.name}
                </span>
              </div>

              {/* Message content */}
              <div
                className={`flex flex-col ${
                  isOwnMessage ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-end gap-2 max-w-[75%] lg:max-w-[50%] relative group">
                  <div
                    className={`relative px-4 py-2 rounded-2xl break-words ${
                      isOwnMessage
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    {editingMessageId === message.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleConfirmEdit(message.id);
                            }
                          }}
                          className="w-full px-2 py-1 rounded bg-white text-gray-900"
                        />
                        <button
                          onClick={() => handleConfirmEdit(message.id)}
                          className="p-1 hover:bg-blue-600 rounded"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 hover:bg-blue-600 rounded"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {displayUrl ? (
                          message.file_type === 'image' ? (
                            <img
                              src={displayUrl}
                              alt="Image"
                              className="max-w-full rounded-lg cursor-pointer"
                              onClick={() => window.open(displayUrl, '_blank')}
                            />
                          ) : message.file_type === 'video' ? (
                            <video
                              src={displayUrl}
                              controls
                              className="max-w-full rounded-lg"
                            />
                          ) : (
                            <a
                              href={displayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
                            >
                              <FileIcon className="h-5 w-5" />
                              <span>Voir le document</span>
                            </a>
                          )
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Boutons d'action */}
                  {isOwnMessage && (
                    <div className={`absolute flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isOwnMessage ? '-left-16' : '-right-16'
                    } top-1/2 -translate-y-1/2`}>
                      {!displayUrl && (
                        <button
                          onClick={() => handleStartEdit(message)}
                          className="p-1 hover:bg-gray-100 rounded-full bg-white shadow-sm"
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-1 hover:bg-gray-100 rounded-full bg-white shadow-sm"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  {format(message.timestamp, 'HH:mm', { locale: fr })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 bg-white border-t">
        {renderFilePreview()}
        <form onSubmit={handleSendMessage} className="flex gap-2 mt-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:border-blue-500"
          />
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={(!newMessage.trim() && !file) || sending}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConversationWindow;