-- Supprime les anciennes contraintes de clé étrangère
ALTER TABLE discovery_flights 
DROP CONSTRAINT IF EXISTS discovery_flights_pilot_id_fkey,
DROP CONSTRAINT IF EXISTS discovery_flights_aircraft_id_fkey;

-- Ajoute la colonne passenger_count si elle n'existe pas déjà
ALTER TABLE discovery_flights
ADD COLUMN IF NOT EXISTS passenger_count integer NOT NULL DEFAULT 1;

-- Ajoute les contraintes de clé étrangère
ALTER TABLE discovery_flights
ADD CONSTRAINT discovery_flights_pilot_id_fkey 
    FOREIGN KEY (pilot_id) 
    REFERENCES public.users(id)
    ON DELETE RESTRICT,
ADD CONSTRAINT discovery_flights_aircraft_id_fkey 
    FOREIGN KEY (aircraft_id) 
    REFERENCES public.aircraft(id)
    ON DELETE RESTRICT;

-- Ajoute une contrainte pour vérifier que le pilote a le rôle approprié pour les vols découverte
ALTER TABLE discovery_flights
ADD CONSTRAINT discovery_flights_pilot_role_check
    CHECK (
        EXISTS (
            SELECT 1 
            FROM public.users u 
            WHERE u.id = pilot_id 
            AND u.role = 'DISCOVERY_PILOT'
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
