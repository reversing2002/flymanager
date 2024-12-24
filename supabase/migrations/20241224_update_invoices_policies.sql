-- Drop existing policies
drop policy if exists "Admins can do everything" on invoices;
drop policy if exists "Clubs can view their own invoices" on invoices;

-- Create new policies based on existing patterns
create policy "Enable read access for admins and club members"
on invoices for select
to authenticated
using (
    -- Allow if user is admin
    exists (
        select 1
        from user_group_memberships ugm
        join user_groups ug on ugm.group_id = ug.id
        where ugm.user_id = auth.uid()
        and ug.name = 'ADMIN'
    )
    -- Or if user is member of the club
    or exists (
        select 1
        from club_members cm
        where cm.user_id = auth.uid()
        and cm.club_id = invoices.club_id
    )
);

create policy "Enable admin management"
on invoices for all
to authenticated
using (
    -- Only admins can perform all operations
    exists (
        select 1
        from user_group_memberships ugm
        join user_groups ug on ugm.group_id = ug.id
        where ugm.user_id = auth.uid()
        and ug.name = 'ADMIN'
    )
)
with check (
    exists (
        select 1
        from user_group_memberships ugm
        join user_groups ug on ugm.group_id = ug.id
        where ugm.user_id = auth.uid()
        and ug.name = 'ADMIN'
    )
);

-- Create policy for storage
drop policy if exists "Invoices are publicly accessible" on storage.objects;
drop policy if exists "Only authenticated users can upload invoice PDFs" on storage.objects;

create policy "Invoice PDFs are accessible to club members and admins"
on storage.objects for select
to authenticated
using (
    bucket_id = 'invoices'
    and (
        -- Allow if user is admin
        exists (
            select 1
            from user_group_memberships ugm
            join user_groups ug on ugm.group_id = ug.id
            where ugm.user_id = auth.uid()
            and ug.name = 'ADMIN'
        )
        -- Or if user is member of the club (extract club code from path)
        or exists (
            select 1
            from club_members cm
            join clubs c on cm.club_id = c.id
            where cm.user_id = auth.uid()
            -- Extract club code from path pattern 'factures/CLUB_CODE/...'
            and split_part(name, '/', 2) = c.code
        )
    )
);

create policy "Only admins can manage invoice PDFs"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'invoices'
    and exists (
        select 1
        from user_group_memberships ugm
        join user_groups ug on ugm.group_id = ug.id
        where ugm.user_id = auth.uid()
        and ug.name = 'ADMIN'
    )
);
