import { supabase } from '../supabase';
import type { ChatMessage, PrivateMessage } from '../../types/chat';

export async function sendPrivateMessage(
  senderId: string,
  recipientId: string,
  content: string,
  fileUrl?: string,
  fileType?: 'image' | 'video' | 'document'
): Promise<PrivateMessage> {
  const { data, error } = await supabase
    .from('private_messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      content,
      file_url: fileUrl,
      file_type: fileType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPrivateMessages(
  userId: string,
  otherUserId: string
): Promise<PrivateMessage[]> {
  const { data, error } = await supabase
    .from('private_messages')
    .select(`
      *,
      sender:sender_id (
        firstName:first_name,
        lastName:last_name,
        imageUrl:image_url
      )
    `)
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function markMessagesAsRead(
  recipientId: string,
  senderId: string
): Promise<void> {
  const { error } = await supabase
    .from('private_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', recipientId)
    .eq('sender_id', senderId)
    .is('read_at', null);

  if (error) throw error;
}

export async function uploadMessageFile(file: File, isPrivate: boolean = false): Promise<string> {
  const bucket = isPrivate ? 'private-messages' : 'chat-files';
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function getRoomMessages(roomId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
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

  if (error) throw error;
  return data || [];
}

export async function sendRoomMessage(
  roomId: string,
  userId: string,
  content: string,
  fileUrl?: string,
  fileType?: 'image' | 'video' | 'document'
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      user_id: userId,
      content,
      file_url: fileUrl,
      file_type: fileType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}