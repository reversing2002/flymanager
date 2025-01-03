-- Create pilot_licenses table
CREATE TABLE IF NOT EXISTS public.pilot_licenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pilot_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    license_type_id uuid NOT NULL REFERENCES public.license_types(id) ON DELETE RESTRICT,
    number varchar(255),
    issue_date timestamp with time zone,
    expiry_date timestamp with time zone,
    remarks text,
    is_valid boolean DEFAULT true,
    validated_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.pilot_licenses ENABLE ROW LEVEL SECURITY;

-- Allow users to view all pilot licenses
CREATE POLICY "Users can view all pilot licenses"
    ON public.pilot_licenses
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to update their own licenses
CREATE POLICY "Users can update own licenses"
    ON public.pilot_licenses
    FOR UPDATE
    USING (auth.uid() = pilot_id);

-- Allow users to insert their own licenses
CREATE POLICY "Users can insert own licenses"
    ON public.pilot_licenses
    FOR INSERT
    WITH CHECK (auth.uid() = pilot_id);

-- Allow users to delete their own licenses
CREATE POLICY "Users can delete own licenses"
    ON public.pilot_licenses
    FOR DELETE
    USING (auth.uid() = pilot_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pilot_licenses_pilot_id ON public.pilot_licenses(pilot_id);
CREATE INDEX IF NOT EXISTS idx_pilot_licenses_license_type_id ON public.pilot_licenses(license_type_id);
CREATE INDEX IF NOT EXISTS idx_pilot_licenses_validated_by ON public.pilot_licenses(validated_by);

-- Add unique constraint to prevent duplicate licenses per user and type
ALTER TABLE public.pilot_licenses 
    ADD CONSTRAINT unique_pilot_license_type 
    UNIQUE (pilot_id, license_type_id);

-- Create license_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.license_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(255) NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies for license_types
ALTER TABLE public.license_types ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view license types
CREATE POLICY "Users can view all license types"
    ON public.license_types
    FOR SELECT
    TO authenticated
    USING (true);

-- Only allow admins to modify license types (you'll need to implement this based on your admin group)
