-- Ajout des colonnes status et response à la table contact_messages
ALTER TABLE contact_messages
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending',
ADD COLUMN response TEXT,
ADD COLUMN responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN responded_by UUID REFERENCES users(id);

-- Ajout d'une contrainte pour vérifier les valeurs valides de status
ALTER TABLE contact_messages
ADD CONSTRAINT contact_messages_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'archived'));
