-- Add is_system and club_id to progression_templates
ALTER TABLE progression_templates
ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN club_id UUID REFERENCES clubs(id);

-- Add an index on club_id for better query performance
CREATE INDEX idx_progression_templates_club_id ON progression_templates(club_id);



-- Enable RLS
ALTER TABLE progression_templates ENABLE ROW LEVEL SECURITY;

-- Allow read access for system templates and club templates
CREATE POLICY "Users can view system templates and their club's templates"
ON progression_templates FOR SELECT
USING (
    is_system = true OR
    auth.uid() IN (
        SELECT auth_id FROM users u
        INNER JOIN club_members cm ON cm.user_id = u.id
        WHERE cm.club_id = progression_templates.club_id
    )
);

-- Allow instructors and admins to create templates for their club
CREATE POLICY "Instructors and admins can create templates for their club"
ON progression_templates FOR INSERT
WITH CHECK (
    NOT is_system AND -- Ne peut pas créer de template système
    auth.uid() IN (
        SELECT auth_id FROM users u
        INNER JOIN club_members cm ON cm.user_id = u.id
        WHERE cm.club_id = progression_templates.club_id
        AND has_any_group(auth.uid(), ARRAY['ADMIN'::text, 'INSTRUCTOR'::text])
    )
);

-- Allow instructors and admins to update their club's non-system templates
CREATE POLICY "Instructors and admins can update their club's non-system templates"
ON progression_templates FOR UPDATE
USING (
    NOT is_system AND
    auth.uid() IN (
        SELECT auth_id FROM users u
        INNER JOIN club_members cm ON cm.user_id = u.id
        WHERE cm.club_id = progression_templates.club_id
        AND has_any_group(auth.uid(), ARRAY['ADMIN'::text, 'INSTRUCTOR'::text])
    )
)
WITH CHECK (
    NOT is_system AND
    auth.uid() IN (
        SELECT auth_id FROM users u
        INNER JOIN club_members cm ON cm.user_id = u.id
        WHERE cm.club_id = progression_templates.club_id
        AND has_any_group(auth.uid(), ARRAY['ADMIN'::text, 'INSTRUCTOR'::text])
    )
);

-- Allow instructors and admins to delete their club's non-system templates
CREATE POLICY "Instructors and admins can delete their club's non-system templates"
ON progression_templates FOR DELETE
USING (
    NOT is_system AND
    auth.uid() IN (
        SELECT auth_id FROM users u
        INNER JOIN club_members cm ON cm.user_id = u.id
        WHERE cm.club_id = progression_templates.club_id
        AND has_any_group(auth.uid(), ARRAY['ADMIN'::text, 'INSTRUCTOR'::text])
    )
);
