-- Suppression de la politique existante
DROP POLICY IF EXISTS "Allow notifications creation for club members and system" ON notifications;

-- Création de la nouvelle politique
CREATE POLICY "Allow notifications creation for club members and system" ON notifications 
    FOR INSERT 
    TO public 
    WITH CHECK (
        (club_id IN (
            SELECT club_members.club_id 
            FROM club_members 
            WHERE club_members.user_id = auth.uid()
        ))
        AND 
        (
            user_id = auth.uid() 
            OR 
            type IN (
                'reservation_reminder',
                'reservation_confirmation',
                'reservation_confirmation_instructor'
            )
        )
    );
