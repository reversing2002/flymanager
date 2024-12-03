-- Ajouter une politique pour permettre au service d'update les vols découverte
CREATE POLICY "Enable service role update for discovery flights"
ON discovery_flights
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Ajouter une politique pour permettre au service de lire les vols découverte
CREATE POLICY "Enable service role select for discovery flights"
ON discovery_flights
FOR SELECT
TO service_role
USING (true);
