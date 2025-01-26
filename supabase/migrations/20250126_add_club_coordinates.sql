-- Add latitude and longitude columns to clubs table
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add comment for documentation
COMMENT ON COLUMN public.clubs.latitude IS 'Latitude GPS du club';
COMMENT ON COLUMN public.clubs.longitude IS 'Longitude GPS du club';

-- Update coordinates for Saint-Chamond-L'Horme aerodrome
UPDATE public.clubs
SET 
    latitude = 45.4833,
    longitude = 4.5167
WHERE id = 'adfe5d7d-1225-4dd4-9693-de78939d2eaf';
