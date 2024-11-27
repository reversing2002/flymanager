-- Create flight_types table
create table if not exists flight_types (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  requires_instructor boolean default false,
  accounting_category text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add display_order column
alter table flight_types add column if not exists display_order integer not null default 0;

-- Remove constraints
alter table flight_types drop constraint if exists flight_types_accounting_category_check;
alter table flight_types alter column name drop not null;

-- Add RLS policies
alter table flight_types enable row level security;

create policy "Allow read access to all users"
  on flight_types for select
  to authenticated
  using (true);

create policy "Allow write access to admins only"
  on flight_types for all
  to authenticated
  using (auth.jwt()->>'role' = 'ADMIN')
  with check (auth.jwt()->>'role' = 'ADMIN');

-- Insert default flight types
insert into flight_types (name, description, requires_instructor, accounting_category, display_order) values
  ('Vol local', 'Vol local sans instruction', false, 'LOCAL', 0),
  ('Vol de navigation', 'Vol de navigation sans instruction', false, 'NAVIGATION', 1),
  ('Vol d''instruction', 'Vol avec instructeur', true, 'INSTRUCTION', 2),
  ('Vol de contrôle', 'Vol de contrôle avec instructeur', true, 'INSTRUCTION', 3),
  ('Vol de découverte', 'Vol découverte pour le public', true, 'DISCOVERY', 4);
