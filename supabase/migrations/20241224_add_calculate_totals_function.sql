-- Function to calculate club totals for a given period
create or replace function calculate_club_totals(
    p_club_id uuid,
    p_start_date timestamp with time zone,
    p_end_date timestamp with time zone
) returns table (
    total_amount numeric,
    commission_amount numeric
) language plpgsql security definer as $$
begin
    return query
    select 
        coalesce(sum(ae.amount), 0) as total_amount,
        coalesce(sum(ae.amount * (c.commission_rate / 100)), 0) as commission_amount
    from account_entries ae
    join clubs c on c.id = ae.club_id
    where ae.club_id = p_club_id
    and ae.created_at between p_start_date and p_end_date
    and ae.is_validated = true;
end;
$$;
