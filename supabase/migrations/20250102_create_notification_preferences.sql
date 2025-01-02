-- Create notification_preferences table
CREATE TABLE notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    new_reservation BOOLEAN DEFAULT true,
    modified_reservation BOOLEAN DEFAULT true,
    cancelled_reservation BOOLEAN DEFAULT true,
    hour_before_reminder BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy for viewing notification preferences
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND (
                auth.jwt() ->> 'role' = 'ADMIN'
            )
        )
    );

-- Policy for inserting notification preferences
CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy for updating notification preferences
CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
    FOR UPDATE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND (
                auth.jwt() ->> 'role' = 'ADMIN'
            )
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
