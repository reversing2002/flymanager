-- Supprime les anciennes contraintes de clé étrangère
ALTER TABLE discovery_flights 
DROP CONSTRAINT IF EXISTS discovery_flights_pilot_id_fkey,
DROP CONSTRAINT IF EXISTS discovery_flights_aircraft_id_fkey;

-- Ajoute la colonne instructor_id et passenger_count
ALTER TABLE discovery_flights
ADD COLUMN IF NOT EXISTS instructor_id uuid NOT NULL,
ADD COLUMN IF NOT EXISTS passenger_count integer NOT NULL DEFAULT 1;

-- Ajoute les contraintes de clé étrangère
ALTER TABLE discovery_flights
ADD CONSTRAINT discovery_flights_pilot_id_fkey 
    FOREIGN KEY (pilot_id) 
    REFERENCES public.users(id)
    ON DELETE RESTRICT,
ADD CONSTRAINT discovery_flights_instructor_id_fkey 
    FOREIGN KEY (instructor_id) 
    REFERENCES public.users(id)
    ON DELETE RESTRICT,
ADD CONSTRAINT discovery_flights_aircraft_id_fkey 
    FOREIGN KEY (aircraft_id) 
    REFERENCES public.aircraft(id)
    ON DELETE RESTRICT;

-- Ajoute une contrainte pour vérifier que l'instructeur a bien le rôle INSTRUCTOR
ALTER TABLE discovery_flights
ADD CONSTRAINT discovery_flights_instructor_role_check
    CHECK (
        EXISTS (
            SELECT 1 
            FROM public.users u 
            WHERE u.id = instructor_id 
            AND u.role = 'INSTRUCTOR'
        )
    );

-- Ajoute une contrainte pour le nombre de passagers (minimum 1)
ALTER TABLE discovery_flights
ADD CONSTRAINT discovery_flights_passenger_count_check
    CHECK (passenger_count >= 1);

-- Met à jour la contrainte de statut pour inclure tous les états possibles
ALTER TABLE discovery_flights
DROP CONSTRAINT IF EXISTS discovery_flights_status_check,
ADD CONSTRAINT discovery_flights_status_check
    CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'));
