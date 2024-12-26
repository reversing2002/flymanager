-- Create passenger_info table
CREATE TABLE public.passenger_info (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    flight_id uuid REFERENCES discovery_flights(id) ON DELETE CASCADE,
    passenger_data jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
CREATE POLICY "Enable read access for discovery flight club members and admins"
    ON public.passenger_info
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM discovery_flights df
            JOIN clubs c ON df.club_id = c.id
            WHERE df.id = passenger_info.flight_id
            AND (
                auth.jwt() ->> 'club_id'::text = c.id::text
                OR EXISTS (
                    SELECT 1 FROM user_group_memberships ugm
                    WHERE ugm.user_id = auth.uid()
                    AND ugm.group_id = 'admin'
                )
            )
        )
    );

CREATE POLICY "Enable write access for discovery flight club members"
    ON public.passenger_info
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM discovery_flights df
            JOIN clubs c ON df.club_id = c.id
            WHERE df.id = flight_id
            AND auth.jwt() ->> 'club_id'::text = c.id::text
        )
    );

-- Add indexes
CREATE INDEX idx_passenger_info_flight_id ON public.passenger_info(flight_id);

-- Enable RLS
ALTER TABLE public.passenger_info ENABLE ROW LEVEL SECURITY;
