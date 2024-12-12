-- Create license_types table
CREATE TABLE IF NOT EXISTS license_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    validity_period INTEGER, -- en mois
    required_medical_class TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    is_system BOOLEAN NOT NULL DEFAULT false,
    required_fields JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(name, club_id)
);

-- Create pilot_licenses table
CREATE TABLE IF NOT EXISTS pilot_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_type_id UUID NOT NULL REFERENCES license_types(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    authority TEXT NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    data JSONB NOT NULL DEFAULT '{}',
    scan_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, license_type_id)
);

-- Create RLS policies for license_types
ALTER TABLE license_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
    ON license_types
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM club_members cm
            WHERE cm.club_id = license_types.club_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Enable write access for admins"
    ON license_types
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'ADMIN'
        )
    );

-- Create RLS policies for pilot_licenses
ALTER TABLE pilot_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for club members"
    ON pilot_licenses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM club_members cm1
            JOIN club_members cm2 ON cm1.club_id = cm2.club_id
            WHERE cm1.user_id = auth.uid()
            AND cm2.user_id = pilot_licenses.user_id
        )
    );

CREATE POLICY "Enable write access for self and admins"
    ON pilot_licenses
    FOR ALL
    USING (
        pilot_licenses.user_id = auth.uid() OR
        EXISTS (
            SELECT 1 
            FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'ADMIN'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_license_types_updated_at
    BEFORE UPDATE ON license_types
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_pilot_licenses_updated_at
    BEFORE UPDATE ON pilot_licenses
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Insert default license types
INSERT INTO license_types (name, description, category, validity_period, required_medical_class, display_order, club_id, is_system, required_fields)
SELECT 
    'PPL',
    'Private Pilot License',
    'AVION',
    NULL,
    '2',
    1,
    id,
    true,
    '[
        {"name": "number", "type": "text", "label": "Numéro de licence", "required": true},
        {"name": "authority", "type": "text", "label": "Autorité de délivrance", "required": true},
        {"name": "ratings", "type": "text", "label": "Qualifications", "required": false}
    ]'::jsonb
FROM clubs
ON CONFLICT DO NOTHING;

INSERT INTO license_types (name, description, category, validity_period, required_medical_class, display_order, club_id, is_system, required_fields)
SELECT 
    'LAPL',
    'Light Aircraft Pilot License',
    'AVION',
    NULL,
    'LAPL',
    2,
    id,
    true,
    '[
        {"name": "number", "type": "text", "label": "Numéro de licence", "required": true},
        {"name": "authority", "type": "text", "label": "Autorité de délivrance", "required": true},
        {"name": "ratings", "type": "text", "label": "Qualifications", "required": false}
    ]'::jsonb
FROM clubs
ON CONFLICT DO NOTHING;
