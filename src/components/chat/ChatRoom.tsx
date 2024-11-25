import React, { useState, useEffect, useRef } from 'react';
import { Send, Video, Image, X, Play, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import type { ChatMessage, ChatRoomMember } from '../../types/chat';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import ReactPlayer from 'react-player';

interface ChatRoomProps {
  roomId: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit for videos

// Accepted file extensions and their corresponding MIME types
const VIDEO_EXTENSIONS = [
  '.mp4',
  '.webm',
  '.ogg',
  '.mov',
  '.mkv',
  '.avi',
  '.mpg',
  '.mpeg',
  '.3gp',
  '.wmv'
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
  'application/x-matroska', // Alternative MIME type for MKV
  'video/x-msvideo',
  'video/mpeg',
  'video/3gpp',
  'video/x-ms-wmv'
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const ChatRoom: React.FC<ChatRoomProps> = ({ roomId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatRoomMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    loadMembers();
    
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

  const isVideoFile = (file: File): boolean => {
    // Check both MIME type and file extension
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    return ALLOWED_VIDEO_TYPES.includes(file.type) || VIDEO_EXTENSIONS.includes(fileExtension);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file extension and MIME type
    const isVideo = isVideoFile(file);
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);

    if (!isVideo && !isImage) {
      toast.error('Format de fichier non supporté');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Le fichier ne doit pas dépasser 100MB');
      return;
    }

    setSelectedFile(file);
    if (isImage) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const isVideo = isVideoFile(file);
    const bucket = isVideo ? 'chat-videos' : 'chat-images';
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        onUploadProgress: (progress) => {
          const percentage = (progress.loaded / progress.total) * 100;
          setUploadProgress(Math.round(percentage));
        },
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user) return;

    setLoading(true);
    try {
      let fileUrl = null;
      if (selectedFile) {
        fileUrl = await uploadFile(selectedFile);
      }

      const isVideo = selectedFile && isVideoFile(selectedFile);

      const { error } = await supabase.from('chat_messages').insert([{
        room_id: roomId,
        user_id: user.id,
        content: newMessage.trim(),
        image_url: !isVideo ? fileUrl : null,
        video_url: isVideo ? fileUrl : null,
      }]);

      if (error) throw error;
      
      setNewMessage('');
      setSelectedFile(null);
      setFilePreview(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  };

  const cancelFileUpload = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
                {message.content && (
                  <p className="text-sm">{message.content}</p>
                )}
                {message.image_url && (
                  <img 
                    src={message.image_url} 
                    alt="Message attachment"
                    className="max-w-full rounded-lg mt-2 cursor-pointer hover:opacity-90"
                    onClick={() => window.open(message.image_url, '_blank')}
                  />
                )}
                {message.video_url && (
                  <div className="mt-2 rounded-lg overflow-hidden">
                    <ReactPlayer
                      url={message.video_url}
                      controls
                      width="100%"
                      height="auto"
                      config={{
                        file: {
                          attributes: {
                            controlsList: 'nodownload',
                          },
                          forceVideo: true,
                        },
                      }}
                    />
                  </div>
                )}
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
        className="p-4 border-t space-y-4"
      >
        {selectedFile && (
          <div className="relative inline-block">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Preview"
                className="max-h-32 rounded-lg"
              />
            ) : (
              <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
                <Video className="h-5 w-5 text-slate-600" />
                <span className="text-sm text-slate-600">{selectedFile.name}</span>
              </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div className="text-white text-sm font-medium">
                  {uploadProgress}%
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={cancelFileUpload}
              className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          />
          <input
            type="file"
            accept={[...VIDEO_EXTENSIONS, ...ALLOWED_IMAGE_TYPES.map(type => `.${type.split('/')[1]}`)].join(',')}
            onChange={handleFileSelect}
            className="hidden"
            ref={fileInputRef}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Video className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={loading || (!newMessage.trim() && !selectedFile)}
            className="p-2 text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50"
          >
            {loading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatRoom;