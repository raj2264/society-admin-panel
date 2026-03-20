-- Create the maintenance-bills bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('maintenance-bills', 'maintenance-bills', true)
on conflict (id) do nothing;

-- Enable RLS on the bucket
alter table storage.objects enable row level security;

-- Create policy to allow authenticated users to upload files
create policy "Allow authenticated users to upload bills"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'maintenance-bills' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow authenticated users to read files
create policy "Allow authenticated users to read bills"
on storage.objects for select
to authenticated
using (
  bucket_id = 'maintenance-bills' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow authenticated users to update their own files
create policy "Allow authenticated users to update bills"
on storage.objects for update
to authenticated
using (
  bucket_id = 'maintenance-bills' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow authenticated users to delete their own files
create policy "Allow authenticated users to delete bills"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'maintenance-bills' AND
  auth.role() = 'authenticated'
); 