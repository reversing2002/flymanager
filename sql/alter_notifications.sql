-- Permettre user_id null pour les notifications aux non-utilisateurs (ex: messages de contact)
ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;

-- Ajouter une colonne pour l'email du destinataire
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255);

-- Ajouter une contrainte pour s'assurer qu'au moins user_id OU recipient_email est renseigné
ALTER TABLE notifications 
ADD CONSTRAINT check_recipient 
CHECK (
    (user_id IS NOT NULL AND recipient_email IS NULL) OR 
    (user_id IS NULL AND recipient_email IS NOT NULL)
);
