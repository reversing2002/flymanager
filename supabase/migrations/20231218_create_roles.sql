create table if not exists public.roles (
    id uuid not null default extensions.uuid_generate_v4(),
    name varchar(255) not null,
    description text,
    is_system boolean not null default false,
    club_id uuid references public.clubs(id),
    permissions jsonb,
    display_order integer not null default 0,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    constraint roles_pkey primary key (id)
);

create index if not exists roles_club_id_idx on public.roles(club_id);
create index if not exists roles_name_idx on public.roles(name);

-- Trigger pour mettre à jour updated_at
create or replace function update_roles_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger roles_updated_at
    before update on roles
    for each row
    execute function update_roles_updated_at();
