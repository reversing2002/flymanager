-- Ajout du type REFUND dans le type enum account_entry_type
ALTER TYPE account_entry_type ADD VALUE IF NOT EXISTS 'REFUND';

-- Ajout de la colonne pour les pièces justificatives
ALTER TABLE account_entries
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT CHECK (attachment_type IN ('image', 'pdf', null));
