-- Create website_settings table
CREATE TABLE IF NOT EXISTS public.website_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    logo_url TEXT,
    carousel_images TEXT[] DEFAULT '{}',
    hero_title TEXT NOT NULL DEFAULT 'Bienvenue à l''aéroclub',
    hero_subtitle TEXT,
    cta_text TEXT NOT NULL DEFAULT 'Nous rejoindre',
    cached_club_info JSONB NOT NULL DEFAULT '{
        "address": "",
        "phone": "",
        "email": "",
        "latitude": null,
        "longitude": null
    }',
    cached_fleet JSONB[] DEFAULT '{}',
    cached_instructors JSONB[] DEFAULT '{}',
    cached_discovery_flights JSONB[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_club_settings UNIQUE (club_id)
);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_website_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_website_settings_updated_at
    BEFORE UPDATE ON public.website_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_website_settings_updated_at();

-- Add RLS policies
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow read access to everyone"
    ON public.website_settings
    FOR SELECT
    USING (true);

-- Allow insert/update/delete only to club admins
CREATE POLICY "Allow full access to club admins"
    ON public.website_settings
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id 
            FROM public.club_members 
            WHERE club_id = website_settings.club_id 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id 
            FROM public.club_members 
            WHERE club_id = website_settings.club_id 
            AND role = 'admin'
        )
    );

-- Create function to initialize website settings for new clubs
CREATE OR REPLACE FUNCTION initialize_website_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.website_settings (club_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create website settings for new clubs
CREATE TRIGGER create_website_settings_for_new_club
    AFTER INSERT ON public.clubs
    FOR EACH ROW
    EXECUTE FUNCTION initialize_website_settings();
