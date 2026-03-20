-- Create a function to get society_id for an admin user
create or replace function get_admin_society_id(admin_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_society_id uuid;
begin
  -- Get society_id for the admin user
  select society_id into v_society_id
  from society_admins
  where user_id = admin_user_id
  limit 1;
  
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