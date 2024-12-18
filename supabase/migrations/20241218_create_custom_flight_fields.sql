-- Create custom flight field definitions table
create table custom_flight_field_definitions (
    id uuid default uuid_generate_v4() primary key,
    club_id uuid references clubs(id) on delete cascade,
    name text not null,
    label text not null,
    type text not null check (type in ('text', 'number', 'boolean', 'date', 'select', 'email', 'tel', 'url', 'time', 'file', 'multiselect', 'textarea', 'color', 'range')),
    required boolean default false,
    options jsonb, -- Pour select et multiselect
    min_value numeric, -- Pour range et number
    max_value numeric, -- Pour range et number
    step numeric, -- Pour range et number
    accepted_file_types text[], -- Pour file (ex: ['.pdf', '.jpg'])
    display_order integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(club_id, name)
);

-- Create custom flight field values table
create table custom_flight_field_values (
    id uuid default uuid_generate_v4() primary key,
    flight_id uuid references flights(id) on delete cascade,
    field_id uuid references custom_flight_field_definitions(id) on delete cascade,
    value jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(flight_id, field_id)
);

-- Add RLS policies
alter table custom_flight_field_definitions enable row level security;
alter table custom_flight_field_values enable row level security;

-- Policies for custom_flight_field_definitions
create policy "Club admins can manage their club's flight field definitions"
    on custom_flight_field_definitions
    for all
    using (
        exists (
            select 1
            from club_members cm
            inner join user_group_memberships ugm on ugm.user_id = auth.uid()
            inner join user_groups ug on ug.id = ugm.group_id
            where cm.club_id = custom_flight_field_definitions.club_id
            and cm.user_id = auth.uid()
            and ug.name = 'ADMIN'
        )
    )
    with check (
        exists (
            select 1
            from club_members cm
            inner join user_group_memberships ugm on ugm.user_id = auth.uid()
            inner join user_groups ug on ug.id = ugm.group_id
            where cm.club_id = custom_flight_field_definitions.club_id
            and cm.user_id = auth.uid()
            and ug.name = 'ADMIN'
        )
    );

create policy "Users can view flight field definitions of their clubs"
    on custom_flight_field_definitions
    for select
    using (
        club_id in (
            select club_id 
            from club_members 
            where user_id = auth.uid()
        )
    );

-- Policies for custom_flight_field_values
create policy "Users can manage flight field values for flights they have access to"
    on custom_flight_field_values
    for all
    using (
        exists (
            select 1
            from flights f
            inner join custom_flight_field_definitions cfd on cfd.club_id = f.club_id
            inner join club_members cm on cm.club_id = f.club_id
            where f.id = custom_flight_field_values.flight_id
            and cfd.id = custom_flight_field_values.field_id
            and cm.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from flights f
            inner join custom_flight_field_definitions cfd on cfd.club_id = f.club_id
            inner join club_members cm on cm.club_id = f.club_id
            where f.id = custom_flight_field_values.flight_id
            and cfd.id = custom_flight_field_values.field_id
            and cm.user_id = auth.uid()
        )
    );

create policy "Users can view flight field values for flights they have access to"
    on custom_flight_field_values
    for select
    using (
        exists (
            select 1
            from flights f
            inner join custom_flight_field_definitions cfd on cfd.club_id = f.club_id
            inner join club_members cm on cm.club_id = f.club_id
            where f.id = custom_flight_field_values.flight_id
            and cfd.id = custom_flight_field_values.field_id
            and cm.user_id = auth.uid()
        )
    );

-- Create indexes for better performance
create index custom_flight_field_definitions_club_id_idx on custom_flight_field_definitions(club_id);
create index custom_flight_field_values_flight_id_idx on custom_flight_field_values(flight_id);
create index custom_flight_field_values_field_id_idx on custom_flight_field_values(field_id);
