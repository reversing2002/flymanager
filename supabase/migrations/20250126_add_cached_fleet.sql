-- Add cached_fleet column to club_website_settings
ALTER TABLE club_website_settings
ADD COLUMN cached_fleet jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN club_website_settings.cached_fleet IS 'Cached list of aircraft for public website display';

-- Create an index to improve query performance on the JSON field
CREATE INDEX idx_club_website_settings_cached_fleet ON club_website_settings USING gin(cached_fleet);
