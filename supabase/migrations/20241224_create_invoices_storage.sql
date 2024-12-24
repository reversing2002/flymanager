-- Create storage bucket for invoices
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', true);

-- Set up storage policies
create policy "Invoices are publicly accessible"
on storage.objects for select
to public
using ( bucket_id = 'invoices' );

create policy "Only authenticated users can upload invoice PDFs"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'invoices'
    and (auth.jwt() ->> 'email') in (
        select email from auth.users where auth.users.id = auth.uid()
        and auth.users.raw_user_meta_data->>'groups' ? 'admin'
    )
);
