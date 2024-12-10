-- Drop existing tables and types if they exist
DROP TABLE IF EXISTS availabilities CASCADE;
DROP TYPE IF EXISTS recurrence_frequency CASCADE;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for recurrence frequency
CREATE TYPE recurrence_frequency AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- Create availability table
CREATE TABLE availabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    aircraft_id UUID REFERENCES aircraft(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurrence_pattern TEXT, -- Format: "FREQ=WEEKLY;BYDAY=MO,TU,WE"
    recurrence_end_date DATE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    club_id UUID NOT NULL REFERENCES clubs(id),
    
    -- Either user_id or aircraft_id must be set, but not both
    CONSTRAINT availability_entity_check CHECK (
        (user_id IS NOT NULL AND aircraft_id IS NULL) OR
        (user_id IS NULL AND aircraft_id IS NOT NULL)
    ),
    -- Ensure end_time is after start_time
    CONSTRAINT availability_time_check CHECK (end_time > start_time),
    -- Ensure recurrence_end_date is set when is_recurring is true
    CONSTRAINT availability_recurrence_check CHECK (
        (is_recurring = false) OR
        (is_recurring = true AND recurrence_end_date IS NOT NULL)
    )
);

-- Create indexes for better query performance
CREATE INDEX idx_availability_user ON availabilities(user_id);
CREATE INDEX idx_availability_aircraft ON availabilities(aircraft_id);
CREATE INDEX idx_availability_club ON availabilities(club_id);
CREATE INDEX idx_availability_dates ON availabilities(start_time, end_time);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_availabilities_updated_at
    BEFORE UPDATE ON availabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;

-- Policy for viewing availabilities
CREATE POLICY "View availabilities" ON availabilities
    FOR SELECT
    USING (
        -- Users can view availabilities for their club
        club_id IN (
            SELECT club_id FROM club_members WHERE user_id = auth.uid()
        )
    );

-- Policy for creating availabilities
CREATE POLICY "Create availabilities" ON availabilities
    FOR INSERT
    WITH CHECK (
        -- Admins can create any availability
        EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'ADMIN'
        )
        OR
        -- Instructors can create their own availabilities
        (user_id = auth.uid() AND EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'INSTRUCTOR'
        ))
        OR
        -- Mechanics can create aircraft availabilities
        (aircraft_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'MECHANIC'
        ))
    );

-- Policy for updating availabilities
CREATE POLICY "Update availabilities" ON availabilities
    FOR UPDATE
    USING (
        -- Same conditions as create
        EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'ADMIN'
        )
        OR
        (user_id = auth.uid() AND EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'INSTRUCTOR'
        ))
        OR
        (aircraft_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'MECHANIC'
        ))
    );

-- Policy for deleting availabilities
CREATE POLICY "Delete availabilities" ON availabilities
    FOR DELETE
    USING (
        -- Same conditions as update
        EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'ADMIN'
        )
        OR
        (user_id = auth.uid() AND EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'INSTRUCTOR'
        ))
        OR
        (aircraft_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'MECHANIC'
        ))
    );

-- Function to check availability conflicts
CREATE OR REPLACE FUNCTION check_availability_conflicts()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for overlapping availabilities
    IF EXISTS (
        SELECT 1 FROM availabilities
        WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
        AND (
            (NEW.user_id IS NOT NULL AND user_id = NEW.user_id) OR
            (NEW.aircraft_id IS NOT NULL AND aircraft_id = NEW.aircraft_id)
        )
        AND (
            (NEW.start_time, NEW.end_time) OVERLAPS (start_time, end_time)
        )
    ) THEN
        RAISE EXCEPTION 'Availability conflict detected';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conflict checking
CREATE TRIGGER check_availability_conflicts_trigger
    BEFORE INSERT OR UPDATE ON availabilities
    FOR EACH ROW
    EXECUTE FUNCTION check_availability_conflicts();

-- Comments
COMMENT ON TABLE availabilities IS 'Stores availability information for instructors and aircraft';
COMMENT ON COLUMN availabilities.recurrence_pattern IS 'RFC 5545 compliant recurrence rule';
COMMENT ON COLUMN availabilities.club_id IS 'Club ID for row-level security';