-- Create custom member field definitions table
create table custom_member_field_definitions (
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

-- Create custom member field values table
create table custom_member_field_values (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    field_id uuid references custom_member_field_definitions(id) on delete cascade,
    value jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, field_id)
);

-- Add RLS policies
alter table custom_member_field_definitions enable row level security;
alter table custom_member_field_values enable row level security;

-- Policies for custom_member_field_definitions
create policy "Club admins can manage their club's field definitions"
    on custom_member_field_definitions
    for all
    using (
        exists (
            select 1
            from club_members cm
            inner join user_group_memberships ugm on ugm.user_id = auth.uid()
            inner join user_groups ug on ug.id = ugm.group_id
            where cm.club_id = custom_member_field_definitions.club_id
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
            where cm.club_id = custom_member_field_definitions.club_id
            and cm.user_id = auth.uid()
            and ug.name = 'ADMIN'
        )
    );

create policy "Users can view field definitions of their clubs"
    on custom_member_field_definitions
    for select
    using (
        club_id in (
            select club_id 
            from club_members 
            where user_id = auth.uid()
        )
    );

-- Policies for custom_member_field_values
create policy "Club admins can manage field values for their club members"
    on custom_member_field_values
    for all
    using (
        exists (
            select 1
            from custom_member_field_definitions cfd
            inner join club_members cm on cm.club_id = cfd.club_id
            inner join user_group_memberships ugm on ugm.user_id = auth.uid()
            inner join user_groups ug on ug.id = ugm.group_id
            where cfd.id = custom_member_field_values.field_id
            and cm.user_id = auth.uid()
            and ug.name = 'ADMIN'
        )
    )
    with check (
        exists (
            select 1
            from custom_member_field_definitions cfd
            inner join club_members cm on cm.club_id = cfd.club_id
            inner join user_group_memberships ugm on ugm.user_id = auth.uid()
            inner join user_groups ug on ug.id = ugm.group_id
            where cfd.id = custom_member_field_values.field_id
            and cm.user_id = auth.uid()
            and ug.name = 'ADMIN'
        )
    );

create policy "Users can view and edit their own field values"
    on custom_member_field_values
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Create functions to handle timestamps
create or replace function handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_updated_at
    before update on custom_member_field_definitions
    for each row
    execute procedure handle_updated_at();

create trigger handle_updated_at
    before update on custom_member_field_values
    for each row
    execute procedure handle_updated_at();
