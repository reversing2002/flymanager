-- Création de la fonction trigger
CREATE OR REPLACE FUNCTION calculate_instructor_cost()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculer instructor_cost uniquement si nous avons un instructeur et instructor_fee
    IF NEW.instructor_id IS NOT NULL AND NEW.instructor_fee IS NOT NULL THEN
        -- Calculer le coût de l'instructeur basé sur la durée du vol et le tarif horaire de l'instructeur
        NEW.instructor_cost := (NEW.duration::float / 60.0) * NEW.instructor_fee;
    ELSE
        NEW.instructor_cost := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Suppression du trigger s'il existe déjà
DROP TRIGGER IF EXISTS calculate_instructor_cost_trigger ON flights;

-- Création du trigger
CREATE TRIGGER calculate_instructor_cost_trigger
    BEFORE INSERT OR UPDATE
    ON flights
    FOR EACH ROW
    EXECUTE FUNCTION calculate_instructor_cost();
