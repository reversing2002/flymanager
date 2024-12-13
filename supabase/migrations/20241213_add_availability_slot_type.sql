-- Création du type ENUM pour slot_type
CREATE TYPE availability_slot_type AS ENUM ('availability', 'unavailability');

-- Création du type ENUM pour default_mode
CREATE TYPE user_default_mode AS ENUM ('default-available', 'default-unavailable');

-- Ajout de la colonne slot_type à la table availabilities
ALTER TABLE availabilities
ADD COLUMN slot_type availability_slot_type NOT NULL DEFAULT 'unavailability';

-- Ajout de la colonne default_mode à la table public.users
ALTER TABLE public.users
ADD COLUMN default_mode user_default_mode NOT NULL DEFAULT 'default-available';

-- Mise à jour des contraintes
ALTER TABLE availabilities
ADD CONSTRAINT availability_slot_type_check CHECK (
  slot_type IN ('availability', 'unavailability')
);

-- Fonction pour vérifier les conflits d'horaires en tenant compte du slot_type
CREATE OR REPLACE FUNCTION check_availability_conflicts()
RETURNS trigger AS $$
BEGIN
    -- Check for overlapping availabilities with the same slot_type
    IF EXISTS (
        SELECT 1 FROM availabilities
        WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
        AND (
            (NEW.user_id IS NOT NULL AND user_id = NEW.user_id) OR
            (NEW.aircraft_id IS NOT NULL AND aircraft_id = NEW.aircraft_id)
        )
        AND slot_type = NEW.slot_type
        AND (
            (NEW.start_time, NEW.end_time) OVERLAPS (start_time, end_time)
        )
    ) THEN
        RAISE EXCEPTION 'Availability conflict detected for the same slot type';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Suppression de l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS check_availability_conflicts_trigger ON availabilities;

-- Création du nouveau trigger
CREATE TRIGGER check_availability_conflicts_trigger
    BEFORE INSERT OR UPDATE ON availabilities
    FOR EACH ROW
    EXECUTE FUNCTION check_availability_conflicts();

-- Commentaires pour documenter les changements
COMMENT ON COLUMN availabilities.slot_type IS 'Type of slot: availability (free time) or unavailability (busy time)';
COMMENT ON COLUMN public.users.default_mode IS 'Default availability mode: default-available (marking unavailable times) or default-unavailable (marking available times)';
