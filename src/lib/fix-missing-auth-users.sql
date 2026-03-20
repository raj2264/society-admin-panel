-- First, let's identify all society admins that don't have corresponding auth users
WITH missing_auth_users AS (
    SELECT 
        sa.email,
        sa.name,
        sa.user_id,
        sa.society_id
    FROM society_admins sa
    LEFT JOIN auth.users au ON sa.email = au.email
    WHERE au.id IS NULL
)
SELECT * FROM missing_auth_users;

-- Create a function to help us fix this
CREATE OR REPLACE FUNCTION fix_missing_auth_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    admin_record RECORD;
    new_user_id uuid;
BEGIN
    -- Loop through all society admins without auth users
    FOR admin_record IN 
        SELECT 
            sa.email,
            sa.name,
            sa.user_id,
            sa.society_id
        FROM society_admins sa
        LEFT JOIN auth.users au ON sa.email = au.email
        WHERE au.id IS NULL
    LOOP
        -- Generate a new UUID for the user
        new_user_id := gen_random_uuid();
        
        -- Insert into auth.users
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role
        ) VALUES (
            new_user_id,
            admin_record.email,
            crypt('temporary_password123', gen_salt('bf')), -- This will be changed by the user
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('name', admin_record.name),
            false,
            'authenticated'
        );
        
        -- Update the society_admins record with the new user_id
        UPDATE society_admins
        SET user_id = new_user_id
        WHERE email = admin_record.email;
        
        -- Log the fix
        RAISE NOTICE 'Created auth user for admin: % (email: %)', admin_record.name, admin_record.email;
    END LOOP;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION fix_missing_auth_users() TO service_role;

-- Run the fix
SELECT fix_missing_auth_users();

-- Verify the fix
SELECT 
    sa.email,
    sa.name,
    sa.user_id,
    CASE 
        WHEN au.id IS NOT NULL THEN 'Fixed'
        ELSE 'Still Missing'
    END as auth_status
FROM society_admins sa
LEFT JOIN auth.users au ON sa.email = au.email
ORDER BY auth_status, sa.email; 