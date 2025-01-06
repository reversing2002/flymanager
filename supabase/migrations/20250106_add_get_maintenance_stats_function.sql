-- Création de la fonction get_maintenance_stats
CREATE OR REPLACE FUNCTION get_maintenance_stats()
RETURNS TABLE (
  aircraft_id uuid,
  next_due_at timestamp with time zone,
  hours_remaining numeric,
  cycles_remaining integer,
  maintenance_type text
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH next_maintenance AS (
    SELECT DISTINCT ON (amo.aircraft_id)
      amo.aircraft_id,
      amo.next_due_at,
      amo.next_due_hours - COALESCE(a.last_hour_meter, 0) as hours_remaining,
      amo.next_due_cycles - COALESCE(a.total_cycles, 0) as cycles_remaining,
      mt.name as maintenance_type
    FROM aircraft_maintenance_operations amo
    JOIN maintenance_types mt ON mt.id = amo.maintenance_type_id
    JOIN aircraft a ON a.id = amo.aircraft_id
    WHERE amo.next_due_at > NOW()
    ORDER BY amo.aircraft_id, amo.next_due_at ASC
  )
  SELECT 
    nm.aircraft_id,
    nm.next_due_at,
    nm.hours_remaining,
    nm.cycles_remaining::integer,
    nm.maintenance_type
  FROM next_maintenance nm;
END;
$$;
