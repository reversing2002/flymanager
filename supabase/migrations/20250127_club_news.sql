-- Create club_news table
CREATE TABLE IF NOT EXISTS public.club_news (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for club_news
ALTER TABLE public.club_news ENABLE ROW LEVEL SECURITY;

-- Policy for selecting news (public can view published news, members can view all club news)
CREATE POLICY "Users can view club news"
    ON public.club_news FOR SELECT
    USING (
        is_published = true 
        OR (
            auth.uid() IN (
                SELECT auth_id FROM users u
                INNER JOIN club_members cm ON cm.user_id = u.id
                WHERE cm.club_id = club_news.club_id
            )
        )
    );

-- Policy for inserting news
CREATE POLICY "Admins can insert club news"
    ON public.club_news FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_news.club_id
            AND has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        )
    );

-- Policy for updating news
CREATE POLICY "Admins can update club news"
    ON public.club_news FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_news.club_id
            AND has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_news.club_id
            AND has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        )
    );

-- Policy for deleting news
CREATE POLICY "Admins can delete club news"
    ON public.club_news FOR DELETE
    USING (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_news.club_id
            AND has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_club_news_club_id ON public.club_news(club_id);
CREATE INDEX IF NOT EXISTS idx_club_news_published_at ON public.club_news(published_at);
CREATE INDEX IF NOT EXISTS idx_club_news_is_published ON public.club_news(is_published);

-- Add cached_news to club_website_settings
ALTER TABLE public.club_website_settings ADD COLUMN IF NOT EXISTS cached_news JSONB;

-- Function to automatically update published_at when is_published changes to true
CREATE OR REPLACE FUNCTION public.handle_news_publication()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_published = true AND (OLD.is_published = false OR OLD.is_published IS NULL) THEN
        NEW.published_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for handling news publication
CREATE TRIGGER on_news_publication
    BEFORE UPDATE OR INSERT ON public.club_news
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_news_publication();

-- Function to update club_website_settings cached_news when news changes
CREATE OR REPLACE FUNCTION public.update_cached_news()
RETURNS TRIGGER AS $$
BEGIN
    -- Update cached_news in club_website_settings
    UPDATE public.club_website_settings
    SET cached_news = (
        SELECT json_agg(news_data)
        FROM (
            SELECT 
                id,
                title,
                excerpt,
                published_at,
                image_url
            FROM public.club_news
            WHERE club_id = NEW.club_id
            AND is_published = true
            ORDER BY published_at DESC
            LIMIT 5
        ) news_data
    )
    WHERE club_id = NEW.club_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating cached news
CREATE TRIGGER after_news_insert
    AFTER INSERT ON public.club_news
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cached_news();

CREATE TRIGGER after_news_update
    AFTER UPDATE ON public.club_news
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cached_news();

CREATE TRIGGER after_news_delete
    AFTER DELETE ON public.club_news
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cached_news();

-- Add comment for documentation
COMMENT ON TABLE public.club_news IS 'Stores club news articles with content, publication status, and metadata';
