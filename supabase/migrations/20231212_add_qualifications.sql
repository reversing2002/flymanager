-- Create qualification_types table
CREATE TABLE IF NOT EXISTS qualification_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    validity_period INTEGER, -- en mois
    requires_instructor_validation BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(name, club_id)
);

-- Create pilot_qualifications table
CREATE TABLE IF NOT EXISTS pilot_qualifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilot_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    qualification_type_id UUID NOT NULL REFERENCES qualification_types(id) ON DELETE CASCADE,
    obtained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(pilot_id, qualification_type_id)
);

-- Create RLS policies for qualification_types
CREATE POLICY "Enable read access for all users"
    ON qualification_types
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM club_members cm
            WHERE cm.club_id = qualification_types.club_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Enable write access for admins"
    ON qualification_types
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'ADMIN'
        )
    );

-- Create RLS policies for pilot_qualifications
CREATE POLICY "Enable read access for all users"
    ON pilot_qualifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM qualification_types qt
            JOIN club_members cm ON cm.club_id = qt.club_id
            WHERE qt.id = pilot_qualifications.qualification_type_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Enable write access for admins and instructors"
    ON pilot_qualifications
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name IN ('ADMIN', 'INSTRUCTOR')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name IN ('ADMIN', 'INSTRUCTOR')
        )
    );

-- Enable RLS
ALTER TABLE qualification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_qualifications ENABLE ROW LEVEL SECURITY;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_qualification_types_updated_at
    BEFORE UPDATE ON qualification_types
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_pilot_qualifications_updated_at
    BEFORE UPDATE ON pilot_qualifications
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
