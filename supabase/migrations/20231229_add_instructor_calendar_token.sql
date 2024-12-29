-- Ajouter la colonne calendar_token à la table instructor_calendars
ALTER TABLE instructor_calendars
ADD COLUMN calendar_token text UNIQUE;

-- Ajouter une politique pour protéger les tokens
CREATE POLICY "Tokens are only visible to their owners"
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
