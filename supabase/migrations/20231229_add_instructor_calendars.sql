-- Create instructor_calendars table
CREATE TABLE instructor_calendars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id VARCHAR(255) NOT NULL,
    calendar_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(instructor_id, calendar_id)
);

-- Add RLS policies
ALTER TABLE instructor_calendars ENABLE ROW LEVEL SECURITY;

-- Policy for viewing calendars
CREATE POLICY "Instructors can view their own calendars"
    ON instructor_calendars
    FOR SELECT
    TO authenticated
    USING (
        instructor_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM user_group_memberships 
            WHERE user_id = auth.uid() 
            AND group_name IN ('ADMIN', 'MANAGER')
        )
    );

-- Policy for managing calendars
CREATE POLICY "Instructors can manage their own calendars"
    ON instructor_calendars
    FOR ALL
    TO authenticated
    USING (
        instructor_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM user_group_memberships 
            WHERE user_id = auth.uid() 
            AND group_name IN ('ADMIN', 'MANAGER')
        )
    );

-- Create function to sync calendar events
CREATE OR REPLACE FUNCTION sync_instructor_calendar_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Cette fonction sera implémentée plus tard pour synchroniser les événements
    -- Elle sera appelée par un job Supabase Edge Function
    NULL;
END;
$$;
