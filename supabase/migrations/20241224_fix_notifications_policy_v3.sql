-- Suppression de la politique existante
DROP POLICY IF EXISTS "Allow notifications creation for club members and system" ON notifications;

-- Création de la nouvelle politique
CREATE POLICY "Allow notifications creation for club members and system" ON notifications 
    FOR INSERT 
    TO public 
    WITH CHECK (
        -- Permettre toutes les notifications liées aux réservations
        type IN (
            'reservation_reminder',
            'reservation_confirmation',
            'reservation_confirmation_instructor'
        )
        OR
        -- Pour les autres types, l'utilisateur doit être membre du club
        (
            type NOT IN (
                'reservation_reminder',
                'reservation_confirmation',
                'reservation_confirmation_instructor'
            )
            AND
            EXISTS (
                SELECT 1
                FROM club_members 
                WHERE club_members.user_id = auth.uid()
                AND club_members.club_id = notifications.club_id
            )
        )
    );
