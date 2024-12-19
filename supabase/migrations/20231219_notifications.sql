-- Create notification settings table
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    mailjet_api_key TEXT NOT NULL,
    mailjet_api_secret TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    expiration_warning_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(club_id)
);

-- Create notification templates table
CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_id INTEGER NOT NULL, -- Mailjet template ID
    description TEXT,
    variables TEXT[] NOT NULL DEFAULT '{}',
    notification_type TEXT NOT NULL,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(club_id, notification_type)
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_date TIMESTAMP WITH TIME ZONE,
    error TEXT,
    template_id INTEGER NOT NULL,
    variables JSONB NOT NULL DEFAULT '{}',
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_notifications_club_sent ON notifications(club_id, sent);
CREATE INDEX idx_notifications_scheduled_date ON notifications(scheduled_date);

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create function to get expiring licenses
CREATE OR REPLACE FUNCTION get_expiring_licenses(
    p_days_before INTEGER,
    p_club_id UUID
)
RETURNS TABLE (
    user_id UUID,
    type TEXT,
    expiration_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.user_id,
        lt.name as type,
        l.expiration_date::DATE
    FROM licenses l
    JOIN license_types lt ON l.license_type_id = lt.id
    WHERE 
        l.club_id = p_club_id
        AND l.expiration_date IS NOT NULL
        AND l.expiration_date - CURRENT_DATE = p_days_before;
END;
$$;

-- Create function to get expiring qualifications
CREATE OR REPLACE FUNCTION get_expiring_qualifications(
    p_days_before INTEGER,
    p_club_id UUID
)
RETURNS TABLE (
    user_id UUID,
    type TEXT,
    expiration_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.user_id,
        qt.name as type,
        q.expiration_date::DATE
    FROM qualifications q
    JOIN qualification_types qt ON q.qualification_type_id = qt.id
    WHERE 
        q.club_id = p_club_id
        AND q.expiration_date IS NOT NULL
        AND q.expiration_date - CURRENT_DATE = p_days_before;
END;
$$;

-- Create function to get expiring medicals
CREATE OR REPLACE FUNCTION get_expiring_medicals(
    p_days_before INTEGER,
    p_club_id UUID
)
RETURNS TABLE (
    user_id UUID,
    type TEXT,
    expiration_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.user_id,
        mt.name as type,
        m.expiration_date::DATE
    FROM medicals m
    JOIN medical_types mt ON m.medical_type_id = mt.id
    WHERE 
        m.club_id = p_club_id
        AND m.expiration_date IS NOT NULL
        AND m.expiration_date - CURRENT_DATE = p_days_before;
END;
$$;

-- Function to process scheduled notifications
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_club RECORD;
    v_settings RECORD;
    v_template RECORD;
    v_user RECORD;
    v_notification_id UUID;
BEGIN
    -- Pour chaque club
    FOR v_club IN SELECT id FROM clubs LOOP
        -- Récupérer les paramètres de notification du club
        SELECT * INTO v_settings 
        FROM notification_settings 
        WHERE club_id = v_club.id 
        AND is_enabled = true;

        IF v_settings IS NOT NULL THEN
            -- Vérifier les licences qui expirent bientôt
            FOR v_user IN 
                SELECT 
                    u.id as user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    pl.expiration_date,
                    lt.name as license_name
                FROM users u
                JOIN pilot_licenses pl ON pl.user_id = u.id
                JOIN license_types lt ON lt.id = pl.license_type_id
                JOIN club_members cm ON cm.user_id = u.id
                WHERE cm.club_id = v_club.id
                AND pl.expiration_date IS NOT NULL
                AND pl.expiration_date <= CURRENT_DATE + v_settings.license_expiration_warning_days
                AND pl.expiration_date > CURRENT_DATE
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n 
                    WHERE n.user_id = u.id 
                    AND n.type = 'LICENSE_EXPIRATION'
                    AND n.reference_id = pl.id::text
                    AND n.status = 'PENDING'
                )
            LOOP
                -- Récupérer le template
                SELECT * INTO v_template 
                FROM notification_templates 
                WHERE club_id = v_club.id 
                AND type = 'LICENSE_EXPIRATION'
                AND is_enabled = true;

                IF v_template IS NOT NULL THEN
                    -- Créer la notification
                    INSERT INTO notifications (
                        club_id,
                        user_id,
                        type,
                        status,
                        reference_id,
                        title,
                        content,
                        scheduled_for
                    ) VALUES (
                        v_club.id,
                        v_user.user_id,
                        'LICENSE_EXPIRATION',
                        'PENDING',
                        v_user.user_id::text,
                        REPLACE(
                            REPLACE(v_template.title, '{license_name}', v_user.license_name),
                            '{expiration_date}', TO_CHAR(v_user.expiration_date, 'DD/MM/YYYY')
                        ),
                        REPLACE(
                            REPLACE(
                                REPLACE(
                                    REPLACE(v_template.content, 
                                        '{first_name}', v_user.first_name
                                    ),
                                    '{last_name}', v_user.last_name
                                ),
                                '{license_name}', v_user.license_name
                            ),
                            '{expiration_date}', TO_CHAR(v_user.expiration_date, 'DD/MM/YYYY')
                        ),
                        CURRENT_TIMESTAMP
                    ) RETURNING id INTO v_notification_id;
                END IF;
            END LOOP;

            -- Vérifier les qualifications qui expirent bientôt
            FOR v_user IN 
                SELECT 
                    u.id as user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    pq.expiration_date,
                    qt.name as qualification_name
                FROM users u
                JOIN pilot_qualifications pq ON pq.user_id = u.id
                JOIN qualification_types qt ON qt.id = pq.qualification_type_id
                JOIN club_members cm ON cm.user_id = u.id
                WHERE cm.club_id = v_club.id
                AND pq.expiration_date IS NOT NULL
                AND pq.expiration_date <= CURRENT_DATE + v_settings.qualification_expiration_warning_days
                AND pq.expiration_date > CURRENT_DATE
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n 
                    WHERE n.user_id = u.id 
                    AND n.type = 'QUALIFICATION_EXPIRATION'
                    AND n.reference_id = pq.id::text
                    AND n.status = 'PENDING'
                )
            LOOP
                -- Récupérer le template
                SELECT * INTO v_template 
                FROM notification_templates 
                WHERE club_id = v_club.id 
                AND type = 'QUALIFICATION_EXPIRATION'
                AND is_enabled = true;

                IF v_template IS NOT NULL THEN
                    -- Créer la notification
                    INSERT INTO notifications (
                        club_id,
                        user_id,
                        type,
                        status,
                        reference_id,
                        title,
                        content,
                        scheduled_for
                    ) VALUES (
                        v_club.id,
                        v_user.user_id,
                        'QUALIFICATION_EXPIRATION',
                        'PENDING',
                        v_user.user_id::text,
                        REPLACE(
                            REPLACE(v_template.title, '{qualification_name}', v_user.qualification_name),
                            '{expiration_date}', TO_CHAR(v_user.expiration_date, 'DD/MM/YYYY')
                        ),
                        REPLACE(
                            REPLACE(
                                REPLACE(
                                    REPLACE(v_template.content, 
                                        '{first_name}', v_user.first_name
                                    ),
                                    '{last_name}', v_user.last_name
                                ),
                                '{qualification_name}', v_user.qualification_name
                            ),
                            '{expiration_date}', TO_CHAR(v_user.expiration_date, 'DD/MM/YYYY')
                        ),
                        CURRENT_TIMESTAMP
                    ) RETURNING id INTO v_notification_id;
                END IF;
            END LOOP;

            -- Vérifier les visites médicales qui expirent bientôt
            FOR v_user IN 
                SELECT 
                    u.id as user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    m.expiration_date
                FROM users u
                JOIN medicals m ON m.user_id = u.id
                JOIN club_members cm ON cm.user_id = u.id
                WHERE cm.club_id = v_club.id
                AND m.expiration_date IS NOT NULL
                AND m.expiration_date <= CURRENT_DATE + v_settings.medical_expiration_warning_days
                AND m.expiration_date > CURRENT_DATE
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n 
                    WHERE n.user_id = u.id 
                    AND n.type = 'MEDICAL_EXPIRATION'
                    AND n.reference_id = m.id::text
                    AND n.status = 'PENDING'
                )
            LOOP
                -- Récupérer le template
                SELECT * INTO v_template 
                FROM notification_templates 
                WHERE club_id = v_club.id 
                AND type = 'MEDICAL_EXPIRATION'
                AND is_enabled = true;

                IF v_template IS NOT NULL THEN
                    -- Créer la notification
                    INSERT INTO notifications (
                        club_id,
                        user_id,
                        type,
                        status,
                        reference_id,
                        title,
                        content,
                        scheduled_for
                    ) VALUES (
                        v_club.id,
                        v_user.user_id,
                        'MEDICAL_EXPIRATION',
                        'PENDING',
                        v_user.user_id::text,
                        REPLACE(
                            v_template.title, 
                            '{expiration_date}', TO_CHAR(v_user.expiration_date, 'DD/MM/YYYY')
                        ),
                        REPLACE(
                            REPLACE(
                                REPLACE(v_template.content, 
                                    '{first_name}', v_user.first_name
                                ),
                                '{last_name}', v_user.last_name
                            ),
                            '{expiration_date}', TO_CHAR(v_user.expiration_date, 'DD/MM/YYYY')
                        ),
                        CURRENT_TIMESTAMP
                    ) RETURNING id INTO v_notification_id;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END;
$$;

-- Create cron job to process notifications daily
SELECT cron.schedule(
    'process-notifications',  -- name of the cron job
    '0 8 * * *',            -- run at 8:00 AM every day
    $$SELECT process_scheduled_notifications()$$
);

-- Insert default notification templates
INSERT INTO notification_templates (
    club_id,
    name,
    subject,
    template_id,
    description,
    variables,
    notification_type,
    created_at,
    updated_at
)
SELECT 
    c.id as club_id,
    'Expiration Licence' as name,
    'Expiration de votre licence {license_name}' as subject,
    1 as template_id, -- À remplacer par le vrai ID du template Mailjet
    'Template pour les notifications d''expiration de licence' as description,
    ARRAY['first_name', 'last_name', 'license_name', 'expiration_date'] as variables,
    'LICENSE_EXPIRATION' as notification_type,
    NOW() as created_at,
    NOW() as updated_at
FROM clubs c
UNION ALL
SELECT 
    c.id as club_id,
    'Expiration Qualification' as name,
    'Expiration de votre qualification {qualification_name}' as subject,
    2 as template_id, -- À remplacer par le vrai ID du template Mailjet
    'Template pour les notifications d''expiration de qualification' as description,
    ARRAY['first_name', 'last_name', 'qualification_name', 'expiration_date'] as variables,
    'QUALIFICATION_EXPIRATION' as notification_type,
    NOW() as created_at,
    NOW() as updated_at
FROM clubs c
UNION ALL
SELECT 
    c.id as club_id,
    'Expiration Visite Médicale' as name,
    'Expiration de votre visite médicale' as subject,
    3 as template_id, -- À remplacer par le vrai ID du template Mailjet
    'Template pour les notifications d''expiration de visite médicale' as description,
    ARRAY['first_name', 'last_name', 'expiration_date'] as variables,
    'MEDICAL_EXPIRATION' as notification_type,
    NOW() as created_at,
    NOW() as updated_at
FROM clubs c
ON CONFLICT (club_id, notification_type) DO UPDATE
SET 
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    description = EXCLUDED.description,
    variables = EXCLUDED.variables,
    updated_at = NOW()
WHERE notification_templates.name IS NULL;

-- Add RLS policies
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notification_settings
CREATE POLICY "Allow club admin to manage notification settings"
    ON notification_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'Administrateurs'
            AND notification_settings.club_id IN (
                SELECT club_id FROM club_members WHERE user_id = auth.uid()
            )
        )
    );

-- Policies for notification_templates
CREATE POLICY "Allow club admin to manage notification templates"
    ON notification_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'Administrateurs'
            AND notification_templates.club_id IN (
                SELECT club_id FROM club_members WHERE user_id = auth.uid()
            )
        )
    );

-- Policies for notifications
CREATE POLICY "Allow club admin to manage notifications"
    ON notifications
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = auth.uid()
            AND ug.name = 'Administrateurs'
            AND notifications.club_id IN (
                SELECT club_id FROM club_members WHERE user_id = auth.uid()
            )
        )
    );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
