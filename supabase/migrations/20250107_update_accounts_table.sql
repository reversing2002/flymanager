-- Ajouter les colonnes pour les fournisseurs et la trésorerie à la table accounts
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS siret VARCHAR(14),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS accepts_external_payments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_group_sales BOOLEAN DEFAULT false;

-- Supprimer les tables qui ne sont plus nécessaires
DROP TABLE IF EXISTS treasury CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
