-- First, let's check the current state of the admin record
select * from society_admins where email = 'prathamsharma8124@gmail.com';

-- Update the existing record with the correct user_id from auth
update society_admins 
set user_id = 'cd398096-2d49-40cf-8e0e-f0f49232172b'  -- This is the correct user ID from auth
where email = 'prathamsharma8124@gmail.com';

-- Verify the record was updated
select * from society_admins where email = 'prathamsharma8124@gmail.com';

-- Also verify by user_id
select * from society_admins where user_id = 'cd398096-2d49-40cf-8e0e-f0f49232172b';

-- Update the RPC function to handle missing records better
create or replace function get_admin_society_id(admin_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_society_id uuid;
  v_email text;
begin
  -- First try to get the society_id from existing record
  select society_id into v_society_id
  from society_admins
  where user_id = admin_user_id
  limit 1;
  
  -- If no record found, try to get email from auth.users
  if v_society_id is null then
    select email into v_email
    from auth.users
    where id = admin_user_id;
    
    -- If we found an email, check if there's a record with that email
    if v_email is not null then
      select society_id into v_society_id
      from society_admins
      where email = v_email
      limit 1;
      
      -- If found by email, update the user_id
      if v_society_id is not null then
        update society_admins
        set user_id = admin_user_id
        where email = v_email;
      end if;
    end if;
  end if;
  
  return v_society_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function get_admin_society_id(uuid) to authenticated;
grant execute on function get_admin_society_id(uuid) to anon;

-- Verify the function exists
select routine_name, routine_type, data_type
from information_schema.routines
where routine_name = 'get_admin_society_id';

-- Grant necessary permissions
GRANT ALL ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon;

-- Drop and recreate the login policy
DROP POLICY IF EXISTS "Allow email lookup for login" ON society_admins;
CREATE POLICY "Allow email lookup for login"
ON society_admins
FOR SELECT
TO anon, authenticated
USING (true);

-- Verify the final state
SELECT * FROM society_admins WHERE email = 'prathamsharma8124@gmail.com'; 