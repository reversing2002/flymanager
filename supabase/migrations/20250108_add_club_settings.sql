-- Create club_settings table
create table if not exists public.club_settings (
    id uuid default gen_random_uuid() primary key,
    stripe_account_id text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.club_settings enable row level security;

create policy "Enable read access for authenticated users" on public.club_settings
    for select using (auth.role() = 'authenticated');

create policy "Enable write access for admins only" on public.club_settings
    for all using (auth.uid() in (
        select auth.uid() from public.users
        where auth.uid() = users.id and users.role = 'admin'
    ));

-- Create trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger handle_club_settings_updated_at
    before update on public.club_settings
    for each row
    execute procedure public.handle_updated_at();
