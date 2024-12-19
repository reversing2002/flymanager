-- Insert default permissions for club adfe5d7d-1225-4dd4-9693-de78939d2eaf
INSERT INTO permission_settings (club_id, permission_id, allowed_roles, is_custom)
VALUES
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'flight:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'flight:create', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'flight:modify', ARRAY['ADMIN', 'INSTRUCTOR'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'flight:delete', ARRAY['ADMIN'], false),
  
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'training:view', ARRAY['ADMIN', 'INSTRUCTOR', 'STUDENT'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'training:create', ARRAY['ADMIN', 'INSTRUCTOR'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'training:modify', ARRAY['ADMIN', 'INSTRUCTOR'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'training:delete', ARRAY['ADMIN'], false),
  
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'maintenance:view', ARRAY['ADMIN', 'MECHANIC', 'INSTRUCTOR'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'maintenance:create', ARRAY['ADMIN', 'MECHANIC'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'maintenance:modify', ARRAY['ADMIN', 'MECHANIC'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'maintenance:delete', ARRAY['ADMIN'], false),
  
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'user:view', ARRAY['ADMIN', 'INSTRUCTOR'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'user:create', ARRAY['ADMIN'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'user:modify', ARRAY['ADMIN'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'user:delete', ARRAY['ADMIN'], false),
  
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'settings:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC', 'DISCOVERY', 'MODELIST', 'SUPERADMIN', 'ULM_PILOT'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'settings:modify', ARRAY['ADMIN', 'SUPERADMIN'], false),
  
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'chat:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'SUPERADMIN'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'chat:send', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'SUPERADMIN'], false),
  
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'event:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'SUPERADMIN'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'event:create', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'event:modify', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'event:delete', ARRAY['ADMIN', 'SUPERADMIN'], false),
  
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'doc:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC', 'SUPERADMIN'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'doc:modify', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false),
  
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'progression:view', ARRAY['ADMIN', 'INSTRUCTOR', 'STUDENT', 'PILOT', 'SUPERADMIN'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'progression:modify', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false),
  
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'planning:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC', 'SUPERADMIN'], false),
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'planning:modify', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false),
  
  ('adfe5d7d-1225-4dd4-9693-de78939d2eaf', 'stats:view', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false);

-- Mise à jour du trigger pour inclure les nouveaux rôles
CREATE OR REPLACE FUNCTION initialize_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
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
    
    (NEW.id, 'settings:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC', 'DISCOVERY', 'MODELIST', 'SUPERADMIN', 'ULM_PILOT'], false),
    (NEW.id, 'settings:modify', ARRAY['ADMIN', 'SUPERADMIN'], false),
    
    (NEW.id, 'chat:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'SUPERADMIN'], false),
    (NEW.id, 'chat:send', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'SUPERADMIN'], false),
    
    (NEW.id, 'event:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'SUPERADMIN'], false),
    (NEW.id, 'event:create', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false),
    (NEW.id, 'event:modify', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false),
    (NEW.id, 'event:delete', ARRAY['ADMIN', 'SUPERADMIN'], false),
    
    (NEW.id, 'doc:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC', 'SUPERADMIN'], false),
    (NEW.id, 'doc:modify', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false),
    
    (NEW.id, 'progression:view', ARRAY['ADMIN', 'INSTRUCTOR', 'STUDENT', 'PILOT', 'SUPERADMIN'], false),
    (NEW.id, 'progression:modify', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false),
    
    (NEW.id, 'planning:view', ARRAY['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'MECHANIC', 'SUPERADMIN'], false),
    (NEW.id, 'planning:modify', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false),
    
    (NEW.id, 'stats:view', ARRAY['ADMIN', 'INSTRUCTOR', 'SUPERADMIN'], false);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
