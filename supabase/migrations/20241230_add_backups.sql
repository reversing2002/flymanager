-- Create backups table
CREATE TABLE IF NOT EXISTS backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    type VARCHAR NOT NULL, -- 'accounts', 'members', etc.
    data JSONB NOT NULL,
    description TEXT,
    is_auto BOOLEAN DEFAULT false
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR NOT NULL, -- 'create', 'update', 'delete'
    resource_type VARCHAR NOT NULL, -- 'accounts', 'members', etc.
    resource_id VARCHAR NOT NULL,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB
);

-- Add indexes
DROP INDEX IF EXISTS idx_backups_type;
DROP INDEX IF EXISTS idx_backups_created_at;
DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_audit_logs_created_at;

CREATE INDEX idx_backups_type ON backups(type);
CREATE INDEX idx_backups_created_at ON backups(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Drop existing function and triggers
DROP FUNCTION IF EXISTS process_audit_trigger() CASCADE;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION process_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user ID from session
    current_user_id := auth.uid();
    
    -- If no user ID found, use NULL
    IF current_user_id IS NULL THEN
        current_user_id := NULL;
    END IF;

    -- Insert into audit_logs
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            old_data,
            new_data
        )
        VALUES (
            current_user_id,
            'delete',
            TG_TABLE_NAME,
            OLD.id::text,
            row_to_json(OLD),
            NULL
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            old_data,
            new_data
        )
        VALUES (
            current_user_id,
            'update',
            TG_TABLE_NAME,
            NEW.id::text,
            row_to_json(OLD),
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            old_data,
            new_data
        )
        VALUES (
            current_user_id,
            'create',
            TG_TABLE_NAME,
            NEW.id::text,
            NULL,
            row_to_json(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for each table
DROP TRIGGER IF EXISTS users_audit ON users;
CREATE TRIGGER users_audit
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();

DROP TRIGGER IF EXISTS account_entries_audit ON account_entries;
CREATE TRIGGER account_entries_audit
    AFTER INSERT OR UPDATE OR DELETE ON account_entries
    FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();

DROP TRIGGER IF EXISTS reservations_audit ON reservations;
CREATE TRIGGER reservations_audit
    AFTER INSERT OR UPDATE OR DELETE ON reservations
    FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();

DROP TRIGGER IF EXISTS flights_audit ON flights;
CREATE TRIGGER flights_audit
    AFTER INSERT OR UPDATE OR DELETE ON flights
    FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();

DROP TRIGGER IF EXISTS aircraft_audit ON aircraft;
CREATE TRIGGER aircraft_audit
    AFTER INSERT OR UPDATE OR DELETE ON aircraft
    FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();

DROP TRIGGER IF EXISTS permission_settings_audit ON permission_settings;
CREATE TRIGGER permission_settings_audit
    AFTER INSERT OR UPDATE OR DELETE ON permission_settings
    FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();

-- Add RLS policies for admins to restore data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for admins" ON users;
CREATE POLICY "Enable insert for admins" ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_group_memberships ugm
      JOIN user_groups ug ON ug.id = ugm.group_id 
      WHERE ugm.user_id = auth.uid() 
      AND ug.name = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Enable update for admins" ON users;
CREATE POLICY "Enable update for admins" ON users 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships ugm
      JOIN user_groups ug ON ug.id = ugm.group_id 
      WHERE ugm.user_id = auth.uid() 
      AND ug.name = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_group_memberships ugm
      JOIN user_groups ug ON ug.id = ugm.group_id 
      WHERE ugm.user_id = auth.uid() 
      AND ug.name = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Enable delete for admins" ON users;
CREATE POLICY "Enable delete for admins" ON users 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships ugm
      JOIN user_groups ug ON ug.id = ugm.group_id 
      WHERE ugm.user_id = auth.uid() 
      AND ug.name = 'ADMIN'
    )
  );

-- Add similar policies for other tables if needed
ALTER TABLE account_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_settings ENABLE ROW LEVEL SECURITY;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_group_memberships ugm
    JOIN user_groups ug ON ug.id = ugm.group_id 
    WHERE ugm.user_id = auth.uid() 
    AND ug.name = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generic policy for other tables
CREATE OR REPLACE FUNCTION create_admin_policies(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    DROP POLICY IF EXISTS "Enable insert for admins" ON %I;
    CREATE POLICY "Enable insert for admins" ON %I 
      FOR INSERT TO authenticated 
      WITH CHECK (is_admin());
      
    DROP POLICY IF EXISTS "Enable update for admins" ON %I;
    CREATE POLICY "Enable update for admins" ON %I 
      FOR UPDATE TO authenticated 
      USING (is_admin())
      WITH CHECK (is_admin());
      
    DROP POLICY IF EXISTS "Enable delete for admins" ON %I;
    CREATE POLICY "Enable delete for admins" ON %I 
      FOR DELETE TO authenticated 
      USING (is_admin());
  ', 
  table_name, table_name, 
  table_name, table_name,
  table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply policies to other tables
SELECT create_admin_policies('account_entries');
SELECT create_admin_policies('reservations');
SELECT create_admin_policies('flights');
SELECT create_admin_policies('aircraft');
SELECT create_admin_policies('permission_settings');
