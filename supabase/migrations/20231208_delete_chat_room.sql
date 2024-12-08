-- Create a function to delete a chat room and all its messages
CREATE OR REPLACE FUNCTION delete_chat_room(room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all messages in the room
  DELETE FROM chat_messages WHERE chat_messages.room_id = $1;
  
  -- Delete all room members
  DELETE FROM chat_room_members WHERE chat_room_members.room_id = $1;
  
  -- Delete the room itself
  DELETE FROM chat_rooms WHERE chat_rooms.id = $1;
END;
$$;
