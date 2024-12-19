-- Create page_permissions table
CREATE TABLE IF NOT EXISTS page_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    page_path TEXT NOT NULL,
    page_name TEXT NOT NULL,
    allowed_roles TEXT[] NOT NULL DEFAULT '{}',
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(club_id, page_path)
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_page_permissions_updated_at
    BEFORE UPDATE ON page_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize default permissions for a new club
CREATE OR REPLACE FUNCTION initialize_club_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default permissions for the new club
    INSERT INTO page_permissions (club_id, page_path, page_name, allowed_roles, is_custom) VALUES
    (NEW.id, '/members', 'Membres', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC'], false),
    (NEW.id, '/flights', 'Vols', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT'], false),
    (NEW.id, '/training', 'Formation', ARRAY['ADMIN', 'INSTRUCTOR', 'STUDENT'], false),
    (NEW.id, '/settings', 'Paramètres', ARRAY['ADMIN'], false),
    (NEW.id, '/training-admin', 'Admin Formation', ARRAY['SUPERADMIN'], false),
    (NEW.id, '/events', 'Événements', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC', 'AEROMODELIST'], false),
    (NEW.id, '/documentation', 'Documentation', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC'], false),
    (NEW.id, '/chat', 'Messages', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'AEROMODELIST'], false),
    (NEW.id, '/discovery-flights', 'Vols découverte', ARRAY['ADMIN', 'DISCOVERY_PILOT'], false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize permissions when a new club is created
CREATE TRIGGER initialize_club_permissions_trigger
    AFTER INSERT ON clubs
    FOR EACH ROW
    EXECUTE FUNCTION initialize_club_permissions();

-- Add new role type for aeromodelist if not exists
DO $$ 
BEGIN 
    ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'AEROMODELIST';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Initialize permissions for existing clubs
DO $$
DECLARE
    club_record RECORD;
BEGIN
    FOR club_record IN SELECT id FROM clubs LOOP
        INSERT INTO page_permissions (club_id, page_path, page_name, allowed_roles, is_custom) VALUES
        (club_record.id, '/members', 'Membres', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC'], false),
        (club_record.id, '/flights', 'Vols', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT'], false),
        (club_record.id, '/training', 'Formation', ARRAY['ADMIN', 'INSTRUCTOR', 'STUDENT'], false),
        (club_record.id, '/settings', 'Paramètres', ARRAY['ADMIN'], false),
        (club_record.id, '/training-admin', 'Admin Formation', ARRAY['SUPERADMIN'], false),
        (club_record.id, '/events', 'Événements', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC', 'AEROMODELIST'], false),
        (club_record.id, '/documentation', 'Documentation', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC'], false),
        (club_record.id, '/chat', 'Messages', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'AEROMODELIST'], false),
        (club_record.id, '/discovery-flights', 'Vols découverte', ARRAY['ADMIN', 'DISCOVERY_PILOT'], false)
        ON CONFLICT (club_id, page_path) DO NOTHING;
    END LOOP;
END $$;
