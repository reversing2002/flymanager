-- Add cached_instructors column to club_website_settings
ALTER TABLE club_website_settings
ADD COLUMN IF NOT EXISTS cached_instructors JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN club_website_settings.cached_instructors IS 'Cached list of instructors for public website display';

-- Add index for better performance on JSON queries
CREATE INDEX idx_club_website_settings_cached_instructors ON club_website_settings USING gin(cached_instructors);
