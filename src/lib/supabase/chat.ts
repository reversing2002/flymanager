import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { hasAnyGroup } from "../permissions";

const DEFAULT_CHAT_ROOMS = [
  {
    id: uuidv4(),
    name: 'Discussions générales',
    type: 'PILOT_GROUP',
    description: 'Discussions entre tous les membres du club'
  },
  {
    id: uuidv4(),
    name: 'Instruction',
    type: 'INSTRUCTOR_GROUP',
    description: 'Espace réservé aux instructeurs'
  },
  {
    id: uuidv4(),
    name: 'Propositions de sorties',
    type: 'PILOT_GROUP',
    description: 'Organisez vos sorties et navigations entre pilotes'
  },
  {
    id: uuidv4(),
    name: 'Maintenance et sécurité',
    type: 'PILOT_GROUP',
    description: 'Discussions sur la maintenance et la sécurité'
  }
];

export async function initializeDefaultChatRooms() {
  try {
    console.log('Starting chat rooms initialization...');

    // Check if default rooms already exist
    const { data: existingRooms, error: checkError } = await supabase
      .from('chat_rooms')
      .select('name');

    if (checkError) {
      console.error('Error checking existing rooms:', checkError);
      return false;
    }

    if (existingRooms && existingRooms.length > 0) {
      console.log('Chat rooms already exist, skipping initialization');
      return true;
    }

    console.log('Creating default chat rooms...');

    // Create default rooms
    const { error: roomsError } = await supabase
      .from('chat_rooms')
      .insert(DEFAULT_CHAT_ROOMS);

    if (roomsError) {
      console.error('Error creating rooms:', roomsError);
      return false;
    }

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, role');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return false;
    }

    // Get created rooms
    const { data: rooms, error: roomsQueryError } = await supabase
      .from('chat_rooms')
      .select('id, type');

    if (roomsQueryError) {
      console.error('Error fetching created rooms:', roomsQueryError);
      return false;
    }

    console.log('Adding users to rooms...');

    // Add users to rooms based on their roles
    for (const room of rooms || []) {
      const membersToAdd = users
        ?.filter(user => {
          if (room.type === 'INSTRUCTOR_GROUP') {
            return hasAnyGroup(user, ['INSTRUCTOR', 'ADMIN']);
          }
          return true; // All users can join PILOT_GROUP rooms
        })
        .map(user => ({
          room_id: room.id,
          user_id: user.id
        }));

      if (membersToAdd && membersToAdd.length > 0) {
        const { error: membersError } = await supabase
          .from('chat_room_members')
          .insert(membersToAdd);

        if (membersError) {
          console.error('Error adding members to room:', membersError);
          return false;
        }
      }
    }

    console.log('Chat rooms initialized successfully');
    return true;
  } catch (error) {
    console.error('Error in initializeDefaultChatRooms:', error);
    return false;
  }
}