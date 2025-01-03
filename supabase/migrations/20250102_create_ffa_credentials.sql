-- Create ffa_credentials table
CREATE TABLE IF NOT EXISTS public.ffa_credentials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ffa_login varchar(255),
    ffa_password varchar(255),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.ffa_credentials ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own credentials
CREATE POLICY "Users can view own credentials"
    ON public.ffa_credentials
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to update their own credentials
CREATE POLICY "Users can update own credentials"
    ON public.ffa_credentials
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow users to insert their own credentials
CREATE POLICY "Users can insert own credentials"
    ON public.ffa_credentials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own credentials
CREATE POLICY "Users can delete own credentials"
    ON public.ffa_credentials
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_ffa_credentials_user_id ON public.ffa_credentials(user_id);

-- Add unique constraint to prevent multiple credentials per user
ALTER TABLE public.ffa_credentials ADD CONSTRAINT unique_user_credentials UNIQUE (user_id);
