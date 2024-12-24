-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Politique pour les administrateurs (accès total)
CREATE POLICY "Admins have full access to notifications"
    ON notifications
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_groups ug
            WHERE ug.user_id = auth.uid()
            AND ug.group_id IN (
                SELECT id FROM groups 
                WHERE name = 'admin' 
                AND club_id = notifications.club_id
            )
        )
    );

-- Politique pour les utilisateurs (accès à leurs propres notifications)
CREATE POLICY "Users can view their own notifications"
    ON notifications
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- Politique pour la création de notifications (via service)
CREATE POLICY "Service role can create notifications"
    ON notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Vérifie que l'utilisateur appartient au même club que la notification
        EXISTS (
            SELECT 1 FROM user_clubs uc
            WHERE uc.user_id = auth.uid()
            AND uc.club_id = notifications.club_id
        )
    );
