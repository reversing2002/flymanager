-- Add SMILE-related columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS licenses jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS qualifications jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_smile_sync timestamp with time zone;
