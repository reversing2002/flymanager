-- Supprime les anciennes contraintes de clé étrangère
ALTER TABLE discovery_flights 
DROP CONSTRAINT IF EXISTS discovery_flights_pilot_id_fkey,
DROP CONSTRAINT IF EXISTS discovery_flights_aircraft_id_fkey;

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

-- Mise à jour de la table discovery_flights pour supporter les demandes
ALTER TABLE discovery_flights
  ADD COLUMN IF NOT EXISTS preferred_dates text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS passenger_count integer NOT NULL DEFAULT 1,
  ALTER COLUMN status TYPE text 
    USING CASE status
      WHEN 'PENDING' THEN 'REQUESTED'
      ELSE status
    END,
  ALTER COLUMN status SET DEFAULT 'REQUESTED',
  ALTER COLUMN pilot_id DROP NOT NULL,
  ALTER COLUMN aircraft_id DROP NOT NULL,
  ALTER COLUMN date DROP NOT NULL,
  ALTER COLUMN start_time DROP NOT NULL,
  ALTER COLUMN end_time DROP NOT NULL;

-- Mise à jour des contraintes de status
ALTER TABLE discovery_flights DROP CONSTRAINT IF EXISTS discovery_flights_status_check;
ALTER TABLE discovery_flights ADD CONSTRAINT discovery_flights_status_check 
  CHECK (status IN ('REQUESTED', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'));

-- Ajout de contraintes sur le nombre de passagers et le poids
ALTER TABLE discovery_flights 
  DROP CONSTRAINT IF EXISTS discovery_flights_passenger_count_check,
  DROP CONSTRAINT IF EXISTS discovery_flights_total_weight_check;

ALTER TABLE discovery_flights 
  ADD CONSTRAINT discovery_flights_passenger_count_check CHECK (passenger_count > 0),
  ADD CONSTRAINT discovery_flights_total_weight_check CHECK (total_weight > 0);

-- Suppression du trigger de vérification du rôle
DROP TRIGGER IF EXISTS check_discovery_pilot_role_trigger ON discovery_flights;
DROP FUNCTION IF EXISTS check_discovery_pilot_role();
