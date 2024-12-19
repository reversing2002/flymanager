-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS initialize_club_permissions ON clubs;
DROP FUNCTION IF EXISTS initialize_default_permissions();
DROP TRIGGER IF EXISTS update_permission_settings_updated_at ON permission_settings;
DROP FUNCTION IF EXISTS update_permission_settings_updated_at();
DROP TABLE IF EXISTS permission_settings;

-- Create the permission_settings table
CREATE TABLE IF NOT EXISTS permission_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL,
  allowed_roles TEXT[] NOT NULL DEFAULT '{}',
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(club_id, permission_id)
);

-- Add RLS policies
ALTER TABLE permission_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their club's permission settings" ON permission_settings;
DROP POLICY IF EXISTS "Only admins can update their club's permission settings" ON permission_settings;

-- Politique de lecture : les utilisateurs peuvent voir les permissions de leur club
CREATE POLICY "Users can view their club's permission settings"
  ON permission_settings FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM club_members 
    WHERE club_id = permission_settings.club_id
    AND status = 'ACTIVE'
  ));

-- Politique de modification : seuls les administrateurs peuvent modifier les permissions de leur club
CREATE POLICY "Only admins can update their club's permission settings"
  ON permission_settings FOR UPDATE
  USING (auth.uid() IN (
    SELECT cm.user_id 
    FROM club_members cm
    JOIN user_group_memberships ugm ON ugm.user_id = cm.user_id
    JOIN user_groups ug ON ug.id = ugm.group_id
    WHERE cm.club_id = permission_settings.club_id 
    AND cm.status = 'ACTIVE'
    AND ug.code = 'ADMIN'
    AND ug.club_id = permission_settings.club_id
  ))
  WITH CHECK (auth.uid() IN (
    SELECT cm.user_id 
    FROM club_members cm
    JOIN user_group_memberships ugm ON ugm.user_id = cm.user_id
    JOIN user_groups ug ON ug.id = ugm.group_id
    WHERE cm.club_id = permission_settings.club_id 
    AND cm.status = 'ACTIVE'
    AND ug.code = 'ADMIN'
    AND ug.club_id = permission_settings.club_id
  ));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_permission_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_permission_settings_updated_at
  BEFORE UPDATE ON permission_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_permission_settings_updated_at();

-- Function to initialize default permissions for a club
CREATE OR REPLACE FUNCTION initialize_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Permissions pour ADMIN
  INSERT INTO permission_settings (club_id, permission_id, allowed_roles, is_custom)
  VALUES
    (NEW.id, 'flight:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT'], false),
    (NEW.id, 'flight:create', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT'], false),
    (NEW.id, 'flight:modify', ARRAY['ADMIN', 'INSTRUCTOR'], false),
    (NEW.id, 'flight:delete', ARRAY['ADMIN'], false),
    
    (NEW.id, 'training:view', ARRAY['ADMIN', 'INSTRUCTOR', 'STUDENT'], false),
    (NEW.id, 'training:create', ARRAY['ADMIN', 'INSTRUCTOR'], false),
    (NEW.id, 'training:modify', ARRAY['ADMIN', 'INSTRUCTOR'], false),
    (NEW.id, 'training:delete', ARRAY['ADMIN'], false),
    
    (NEW.id, 'maintenance:view', ARRAY['ADMIN', 'MECHANIC', 'INSTRUCTOR'], false),
    (NEW.id, 'maintenance:create', ARRAY['ADMIN', 'MECHANIC'], false),
    (NEW.id, 'maintenance:modify', ARRAY['ADMIN', 'MECHANIC'], false),
    (NEW.id, 'maintenance:delete', ARRAY['ADMIN'], false),
    
    (NEW.id, 'user:view', ARRAY['ADMIN', 'INSTRUCTOR'], false),
    (NEW.id, 'user:create', ARRAY['ADMIN'], false),
    (NEW.id, 'user:modify', ARRAY['ADMIN'], false),
    (NEW.id, 'user:delete', ARRAY['ADMIN'], false),
    
    (NEW.id, 'settings:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC', 'DISCOVERY', 'MODELIST'], false),
    (NEW.id, 'settings:modify', ARRAY['ADMIN'], false),
    
    (NEW.id, 'chat:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT'], false),
    (NEW.id, 'chat:send', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT'], false),
    
    (NEW.id, 'event:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT'], false),
    (NEW.id, 'event:create', ARRAY['ADMIN', 'INSTRUCTOR'], false),
    (NEW.id, 'event:modify', ARRAY['ADMIN', 'INSTRUCTOR'], false),
    (NEW.id, 'event:delete', ARRAY['ADMIN'], false),
    
    (NEW.id, 'doc:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC'], false),
    (NEW.id, 'doc:modify', ARRAY['ADMIN', 'INSTRUCTOR'], false),
    
    (NEW.id, 'progression:view', ARRAY['ADMIN', 'INSTRUCTOR', 'STUDENT', 'PILOT'], false),
    (NEW.id, 'progression:modify', ARRAY['ADMIN', 'INSTRUCTOR'], false),
    
    (NEW.id, 'planning:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC'], false),
    (NEW.id, 'planning:modify', ARRAY['ADMIN', 'INSTRUCTOR'], false),
    
    (NEW.id, 'stats:view', ARRAY['ADMIN', 'INSTRUCTOR'], false);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize permissions when a new club is created
CREATE TRIGGER initialize_club_permissions
  AFTER INSERT ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION initialize_default_permissions();
