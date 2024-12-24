-- Add commission_rate column to clubs table
ALTER TABLE clubs ADD COLUMN commission_rate numeric NOT NULL DEFAULT 3;

-- Add comment to explain the column
COMMENT ON COLUMN clubs.commission_rate IS 'Taux de commission sur les paiements CB en pourcentage (par défaut 3%)';
