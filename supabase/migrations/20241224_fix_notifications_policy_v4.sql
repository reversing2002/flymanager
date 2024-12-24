-- Suppression de la politique existante
DROP POLICY IF EXISTS "Allow notifications creation for club members and system" ON notifications;

-- Création de la nouvelle politique
CREATE POLICY "notifications_club_policy" ON notifications 
    FOR ALL
    TO public 
    USING (
        -- L'utilisateur doit être membre du club
        club_id IN (
            SELECT club_id 
            FROM club_members 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- L'utilisateur doit être membre du club
        club_id IN (
            SELECT club_id 
            FROM club_members 
            WHERE user_id = auth.uid()
        )
    );
