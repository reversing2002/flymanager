
-- Ajout des nouvelles colonnes avec valeurs par défaut
ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS reservation_start_hour integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS reservation_end_hour integer DEFAULT 21;

-- Migration des données existantes
UPDATE clubs
SET reservation_start_hour = 7,
    reservation_end_hour = 21
WHERE reservation_start_hour IS NULL
   OR reservation_end_hour IS NULL;

-- Suppression des anciennes colonnes
ALTER TABLE clubs
DROP COLUMN IF EXISTS day_flight_start_hour,
DROP COLUMN IF EXISTS day_flight_end_hour,
DROP COLUMN IF EXISTS night_flight_start_hour,
DROP COLUMN IF EXISTS night_flight_end_hour;

-- Ajout des contraintes de validation
ALTER TABLE clubs
ADD CONSTRAINT reservation_hours_check 
CHECK (
  reservation_start_hour >= 0 
  AND reservation_start_hour <= 23
  AND reservation_end_hour >= 0 
  AND reservation_end_hour <= 23
  AND reservation_start_hour < reservation_end_hour
);
