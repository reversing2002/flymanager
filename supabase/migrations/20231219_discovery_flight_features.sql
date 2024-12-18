-- Create discovery_flight_features table
create table if not exists discovery_flight_features (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references clubs(id) on delete cascade,
  description text not null,
  display_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table discovery_flight_features enable row level security;

create policy "Enable read access for all users"
  on discovery_flight_features
  for select
  to public
  using (true);

create policy "Enable insert/update/delete for users in the same club"
  on discovery_flight_features
  for all
  to authenticated
  using (club_id = auth.jwt() ->> 'club_id'::text)
  with check (club_id = auth.jwt() ->> 'club_id'::text);

-- Add default features for existing clubs
insert into discovery_flight_features (club_id, description, display_order)
select 
  id as club_id,
  unnest(array[
    'Briefing complet avant le vol',
    'Vol avec un pilote expérimenté',
    'Photos souvenirs',
    'Certificat de vol'
  ]) as description,
  row_number() over () as display_order
from clubs;
