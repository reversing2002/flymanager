-- Suppression de la politique existante
DROP POLICY IF EXISTS "Allow notifications creation for club members and system" ON notifications;

-- Création de la nouvelle politique
CREATE POLICY "Allow notifications creation for club members and system" ON notifications 
    FOR INSERT 
    TO public 
    WITH CHECK (
        -- Soit l'utilisateur est membre du club
        (
            EXISTS (
                SELECT 1
                FROM club_members 
                WHERE club_members.user_id = auth.uid()
                AND club_members.club_id = notifications.club_id
            )
        )
        OR 
        -- Soit c'est une notification système de réservation
        (
            type IN (
                'reservation_reminder',
                'reservation_confirmation',
                'reservation_confirmation_instructor'
            )
            AND
            EXISTS (
                SELECT 1
                FROM club_members
                WHERE club_members.user_id = notifications.user_id
                AND club_members.club_id = notifications.club_id
            )
        )
    );
