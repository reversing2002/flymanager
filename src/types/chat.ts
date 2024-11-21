export interface ChatRoom {
  id: string;
  name: string;
  type: 'INSTRUCTOR_STUDENT' | 'PILOT_GROUP' | 'INSTRUCTOR_GROUP';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
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