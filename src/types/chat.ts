export interface ChatRoom {
  id: string;
  name: string;
  type: 'INSTRUCTOR_STUDENT' | 'PILOT_GROUP' | 'INSTRUCTOR_GROUP';
  description?: string;
  club_id: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  members?: ChatRoomMember[];
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  file_url?: string;
  file_type?: 'image' | 'video' | 'document';
  created_at: string;
  updated_at: string;
  user?: {
    firstName: string;
    lastName: string;
    imageUrl?: string;
  };
}

export interface PrivateMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  file_url?: string;
  file_type?: 'image' | 'video' | 'document';
  read_at?: string;
  created_at: string;
  updated_at: string;
  sender?: {
    firstName: string;
    lastName: string;
    imageUrl?: string;
  };
}

export interface ChatRoomMember {
  room_id: string;
  user_id: string;
  joined_at: string;
  user?: {
    firstName: string;
    lastName: string;
    imageUrl?: string;
    role: string;
  };
}