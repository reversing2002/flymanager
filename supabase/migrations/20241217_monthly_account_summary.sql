-- Création de la fonction pour obtenir le résumé mensuel des comptes
CREATE OR REPLACE FUNCTION get_monthly_account_summary(
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
RETURNS TABLE (
  month_name text,
  entry_type_code text,
  entry_type_name text,
  total_amount numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT TO_CHAR(DATE_TRUNC('month', (p_year || '-' || m || '-01')::date), 'Month') as month_name,
           m as month_number
    FROM generate_series(1,12) m
  )
  SELECT 
    m.month_name,
    aet.code as entry_type_code,
    aet.name as entry_type_name,
    COALESCE(ABS(SUM(ae.amount)), 0) as total_amount
  FROM months m
  CROSS JOIN account_entry_types aet
  LEFT JOIN account_entries ae ON 
    EXTRACT(MONTH FROM ae.date) = m.month_number AND
    EXTRACT(YEAR FROM ae.date) = p_year AND
    ae.entry_type_id = aet.id
  GROUP BY m.month_name, m.month_number, aet.code, aet.name
  ORDER BY m.month_number, aet.code;
END;
$$;
