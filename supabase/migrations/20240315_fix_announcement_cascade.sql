-- Add ON DELETE CASCADE to dismissed_announcements foreign key
ALTER TABLE dismissed_announcements 
  DROP CONSTRAINT IF EXISTS dismissed_announcements_announcement_id_fkey,
  ADD CONSTRAINT dismissed_announcements_announcement_id_fkey 
    FOREIGN KEY (announcement_id) 
    REFERENCES announcements(id) 
    ON DELETE CASCADE;