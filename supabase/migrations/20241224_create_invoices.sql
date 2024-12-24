-- Create invoices table
create table public.invoices (
    id uuid not null default extensions.uuid_generate_v4(),
    club_id uuid references public.clubs(id),
    period_start timestamp with time zone not null,
    period_end timestamp with time zone not null,
    total_amount numeric not null,
    commission_amount numeric not null,
    status text not null default 'pending',
    pdf_url text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    constraint invoices_pkey primary key (id),
    constraint invoices_status_check check (status in ('pending', 'sent', 'paid'))
);

-- Create function to generate monthly invoices
create or replace function generate_monthly_invoices()
returns void as $$
declare
    club record;
    period_start timestamp;
    period_end timestamp;
    total numeric;
    commission numeric;
begin
    -- Set period for last month
    period_start := date_trunc('month', current_date - interval '1 month');
    period_end := date_trunc('month', current_date) - interval '1 second';
    
    -- Generate invoice for each club
    for club in select * from clubs loop
        -- Calculate totals for the period
        select 
            coalesce(sum(amount), 0),
            coalesce(sum(amount * (c.commission_rate / 100)), 0)
        into total, commission
        from account_entries ae
        join clubs c on c.id = ae.club_id
        where ae.club_id = club.id
        and ae.created_at between period_start and period_end
        and ae.is_validated = true;
        
        -- Only create invoice if there were transactions
        if total > 0 then
            insert into invoices (
                club_id,
                period_start,
                period_end,
                total_amount,
                commission_amount,
                status
            ) values (
                club.id,
                period_start,
                period_end,
                total,
                commission,
                'pending'
            );
        end if;
    end loop;
end;
$$ language plpgsql;

-- Create a cron job to generate invoices monthly
select cron.schedule(
    'generate-monthly-invoices',
    '0 0 1 * *', -- Run at midnight on the first day of each month
    'select generate_monthly_invoices()'
);

-- Add RLS policies
alter table invoices enable row level security;

create policy "Admins can do everything" on invoices
    for all
    to authenticated
    using (auth.jwt() ->> 'email' in (
        select email from users where groups ? 'admin'
    ));

create policy "Clubs can view their own invoices" on invoices
    for select
    to authenticated
    using (
        club_id in (
            select club_id from users where id = auth.uid()
        )
    );
