-- Supprimer les anciennes contraintes et données si nécessaire
DROP TABLE IF EXISTS chat_room_members CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;

-- Créer la table chat_rooms avec la nouvelle structure
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('INSTRUCTOR_STUDENT', 'PILOT_GROUP', 'INSTRUCTOR_GROUP')),
    description TEXT,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table chat_messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter les index pour améliorer les performances
CREATE INDEX idx_chat_rooms_club_id ON chat_rooms(club_id);
CREATE INDEX idx_chat_rooms_creator_id ON chat_rooms(creator_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Ajouter les politiques RLS (Row Level Security)
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Politique pour chat_rooms
CREATE POLICY "Users can view chat rooms in their club based on type" ON chat_rooms
    FOR SELECT
    USING (
        club_id IN (
            SELECT club_id FROM club_members WHERE user_id = auth.uid()
        )
        AND (
            type = 'PILOT_GROUP'
            OR (type = 'INSTRUCTOR_GROUP' AND EXISTS (
                SELECT 1 FROM users WHERE id = auth.uid() AND role = 'INSTRUCTOR'
            ))
            OR (type = 'INSTRUCTOR_STUDENT' AND (
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'INSTRUCTOR')
                OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'PILOT')
            ))
        )
    );

CREATE POLICY "Users can create chat rooms in their club" ON chat_rooms
    FOR INSERT
    WITH CHECK (
        club_id IN (
            SELECT club_id FROM club_members WHERE user_id = auth.uid()
        )
        AND creator_id = auth.uid()
        AND (
            type = 'PILOT_GROUP'
            OR (type IN ('INSTRUCTOR_GROUP', 'INSTRUCTOR_STUDENT') AND EXISTS (
                SELECT 1 FROM users WHERE id = auth.uid() AND role = 'INSTRUCTOR'
            ))
        )
    );

-- Politique pour chat_messages
CREATE POLICY "Users can view messages in their accessible rooms" ON chat_messages
    FOR SELECT
    USING (
        room_id IN (
            SELECT id FROM chat_rooms
            WHERE club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid())
            AND (
                type = 'PILOT_GROUP'
                OR (type = 'INSTRUCTOR_GROUP' AND EXISTS (
                    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'INSTRUCTOR'
                ))
                OR (type = 'INSTRUCTOR_STUDENT' AND (
                    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'INSTRUCTOR')
                    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'PILOT')
                ))
            )
        )
    );

CREATE POLICY "Users can send messages to their accessible rooms" ON chat_messages
    FOR INSERT
    WITH CHECK (
        room_id IN (
            SELECT id FROM chat_rooms
            WHERE club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid())
            AND (
                type = 'PILOT_GROUP'
                OR (type = 'INSTRUCTOR_GROUP' AND EXISTS (
                    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'INSTRUCTOR'
                ))
                OR (type = 'INSTRUCTOR_STUDENT' AND (
                    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'INSTRUCTOR')
                    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'PILOT')
                ))
            )
        )
        AND user_id = auth.uid()
    );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_rooms_updated_at
    BEFORE UPDATE ON chat_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();