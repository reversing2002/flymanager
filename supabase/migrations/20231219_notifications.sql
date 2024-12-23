-- Create notification settings table
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    mailjet_api_key TEXT NOT NULL,
    mailjet_api_secret TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    license_expiration_warning_days INTEGER NOT NULL DEFAULT 30,
    qualification_expiration_warning_days INTEGER NOT NULL DEFAULT 30,
    medical_expiration_warning_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(club_id)
);

-- Create notification templates table
CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
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
    FROM pilot_licenses l
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
        q.expires_at::DATE
    FROM pilot_qualifications q
    JOIN qualification_types qt ON q.qualification_type_id = qt.id
    WHERE 
        q.club_id = p_club_id
        AND q.expires_at IS NOT NULL
        AND q.expires_at - CURRENT_DATE = p_days_before;
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
CREATE OR REPLACE FUNCTION public.process_scheduled_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_club          RECORD;
    v_settings      RECORD;
    v_user          RECORD;
    v_notification_id UUID;
BEGIN
    -- Parcourir chaque club
    FOR v_club IN
        SELECT id
          FROM clubs
    LOOP
        -- Récupérer les paramètres de notification du club
        SELECT *
          INTO v_settings
          FROM notification_settings
         WHERE club_id = v_club.id;

        IF v_settings IS NOT NULL THEN

            /********************************************************************
             * 1) Vérifier les cotisations (member_contributions)
             ********************************************************************/
            FOR v_user IN
                SELECT
                    u.id AS user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    mc.id AS contribution_id,
                    mc.valid_until AS expiration_date
                FROM users u
                JOIN member_contributions mc ON mc.user_id = u.id
                JOIN club_members cm ON cm.user_id = u.id
                WHERE cm.club_id = v_club.id
                  AND mc.valid_until IS NOT NULL
                  AND mc.valid_until <= CURRENT_DATE + 60
                  AND mc.valid_until > CURRENT_DATE
                  AND NOT EXISTS (
                      SELECT 1
                      FROM notifications n
                      WHERE n.user_id = u.id
                        AND n.type = 'CONTRIBUTION_EXPIRATION'
                        AND n.reference_id = mc.id::text
                        AND n.status = 'PENDING'
                  )
            LOOP
                INSERT INTO notifications (
                    club_id,
                    user_id,
                    type,
                    status,
                    reference_id,
                    scheduled_date,
                    variables
                ) VALUES (
                    v_club.id,
                    v_user.user_id,
                    'CONTRIBUTION_EXPIRATION',
                    'PENDING',
                    v_user.contribution_id::text,
                    CURRENT_TIMESTAMP,
                    jsonb_build_object(
                        'first_name', v_user.first_name,
                        'last_name', v_user.last_name,
                        'expiration_date', TO_CHAR(v_user.expiration_date, 'DD/MM/YYYY')
                    )
                )
                RETURNING id INTO v_notification_id;
            END LOOP;

            /********************************************************************
             * 2) Vérifier les licences
             ********************************************************************/
            FOR v_user IN
                SELECT
                    u.id AS user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    pl.id AS license_id,
                    lt.name AS license_name,
                    pl.expires_at AS expiration_date
                FROM users u
                JOIN pilot_licenses pl ON pl.user_id = u.id
                JOIN license_types lt ON lt.id = pl.license_type_id
                JOIN club_members cm ON cm.user_id = u.id
                WHERE cm.club_id = v_club.id
                  AND pl.expires_at IS NOT NULL
                  AND pl.expires_at <= CURRENT_DATE + v_settings.license_expiration_warning_days
                  AND pl.expires_at > CURRENT_DATE
                  AND NOT EXISTS (
                      SELECT 1
                      FROM notifications n
                      WHERE n.user_id = u.id
                        AND n.type = 'LICENSE_EXPIRATION'
                        AND n.reference_id = pl.id::text
                        AND n.status = 'PENDING'
                  )
            LOOP
                INSERT INTO notifications (
                    club_id,
                    user_id,
                    type,
                    status,
                    reference_id,
                    scheduled_date,
                    variables
                ) VALUES (
                    v_club.id,
                    v_user.user_id,
                    'LICENSE_EXPIRATION',
                    'PENDING',
                    v_user.license_id::text,
                    CURRENT_TIMESTAMP,
                    jsonb_build_object(
                        'first_name', v_user.first_name,
                        'last_name', v_user.last_name,
                        'license_name', v_user.license_name,
                        'expiration_date', TO_CHAR(v_user.expiration_date, 'DD/MM/YYYY')
                    )
                )
                RETURNING id INTO v_notification_id;
            END LOOP;

            /********************************************************************
             * 3) Vérifier les qualifications
             ********************************************************************/
            FOR v_user IN
                SELECT
                    u.id AS user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    pq.id AS qualification_id,
                    qt.name AS qualification_name,
                    pq.expires_at AS expiration_date
                FROM users u
                JOIN pilot_qualifications pq ON pq.pilot_id = u.id
                JOIN qualification_types qt ON qt.id = pq.qualification_type_id
                JOIN club_members cm ON cm.user_id = u.id
                WHERE cm.club_id = v_club.id
                  AND pq.expires_at IS NOT NULL
                  AND pq.expires_at <= CURRENT_DATE + v_settings.qualification_expiration_warning_days
                  AND pq.expires_at > CURRENT_DATE
                  AND NOT EXISTS (
                      SELECT 1
                      FROM notifications n
                      WHERE n.user_id = u.id
                        AND n.type = 'QUALIFICATION_EXPIRATION'
                        AND n.reference_id = pq.id::text
                        AND n.status = 'PENDING'
                  )
            LOOP
                INSERT INTO notifications (
                    club_id,
                    user_id,
                    type,
                    status,
                    reference_id,
                    scheduled_date,
                    variables
                ) VALUES (
                    v_club.id,
                    v_user.user_id,
                    'QUALIFICATION_EXPIRATION',
                    'PENDING',
                    v_user.qualification_id::text,
                    CURRENT_TIMESTAMP,
                    jsonb_build_object(
                        'first_name', v_user.first_name,
                        'last_name', v_user.last_name,
                        'qualification_name', v_user.qualification_name,
                        'expiration_date', TO_CHAR(v_user.expiration_date, 'DD/MM/YYYY')
                    )
                )
                RETURNING id INTO v_notification_id;
            END LOOP;

            /********************************************************************
             * 4) Vérifier les visites médicales
             ********************************************************************/
            FOR v_user IN
                SELECT
                    u.id AS user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    m.id AS medical_id,
                    mt.name AS medical_type_name,
                    m.expires_at AS expiration_date
                FROM users u
                JOIN medicals m ON m.user_id = u.id
                JOIN medical_types mt ON mt.id = m.medical_type_id
                JOIN club_members cm ON cm.user_id = u.id
                WHERE cm.club_id = v_club.id
                  AND m.expires_at IS NOT NULL
                  AND m.expires_at <= CURRENT_DATE + v_settings.medical_expiration_warning_days
                  AND m.expires_at > CURRENT_DATE
                  AND NOT EXISTS (
                      SELECT 1
                      FROM notifications n
                      WHERE n.user_id = u.id
                        AND n.type = 'MEDICAL_EXPIRATION'
                        AND n.reference_id = m.id::text
                        AND n.status = 'PENDING'
                  )
            LOOP
                INSERT INTO notifications (
                    club_id,
                    user_id,
                    type,
                    status,
                    reference_id,
                    scheduled_date,
                    variables
                ) VALUES (
                    v_club.id,
                    v_user.user_id,
                    'MEDICAL_EXPIRATION',
                    'PENDING',
                    v_user.medical_id::text,
                    CURRENT_TIMESTAMP,
                    jsonb_build_object(
                        'first_name', v_user.first_name,
                        'last_name', v_user.last_name,
                        'medical_type', v_user.medical_type_name,
                        'expiration_date', TO_CHAR(v_user.expiration_date, 'DD/MM/YYYY')
                    )
                )
                RETURNING id INTO v_notification_id;
            END LOOP;

        END IF;  -- FIN du IF sur v_settings
    END LOOP;    -- FIN de la boucle sur les clubs
END;
$function$;

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
    html_content,
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
    '<p>Bonjour {first_name} {last_name},</p><p>Votre licence {license_name} expire le {expiration_date}.</p>' as html_content,
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
    '<p>Bonjour {first_name} {last_name},</p><p>Votre qualification {qualification_name} expire le {expiration_date}.</p>' as html_content,
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
    '<p>Bonjour {first_name} {last_name},</p><p>Votre visite médicale expire le {expiration_date}.</p>' as html_content,
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
