-- Add cached_club_info column to club_website_settings
ALTER TABLE public.club_website_settings
ADD COLUMN IF NOT EXISTS cached_club_info JSONB NOT NULL DEFAULT '{
    "address": "",
    "phone": "",
    "email": "",
    "latitude": null,
    "longitude": null
}'::jsonb;

-- Create index for faster queries on cached_club_info
CREATE INDEX IF NOT EXISTS idx_club_website_settings_cached_club_info 
ON public.club_website_settings USING gin (cached_club_info);
