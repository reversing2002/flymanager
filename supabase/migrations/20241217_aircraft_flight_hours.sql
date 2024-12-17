create or replace function get_monthly_aircraft_hours(
  start_date timestamp with time zone,
  end_date timestamp with time zone)
returns table (
  aircraft_id uuid,
  aircraft_registration text,
  month date,
  total_hours numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    a.id as aircraft_id,
    a.registration as aircraft_registration,
    date_trunc('month', f.date)::date as month,
    round((sum(duration)/60)::numeric, 2) as total_hours
  from aircraft a
  left join flights f on f.aircraft_id = a.id
  where f.date >= start_date
    and f.date <= end_date
    and f.is_validated = true
  group by a.id, a.registration, date_trunc('month', f.date)
  order by a.registration, month;
end;
$$;