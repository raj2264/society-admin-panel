-- First, let's check if the admin record exists
SELECT * FROM society_admins WHERE email = 'prathamsharma8124@gmail.com';

-- If the record doesn't exist, we need to create it
-- First, get the user ID from auth.users
SELECT id FROM auth.users WHERE email = 'prathamsharma8124@gmail.com';

-- Then, if we have a user ID, create the admin record
-- Replace YOUR_USER_ID with the ID from the above query
-- Replace YOUR_SOCIETY_ID with the actual society ID
INSERT INTO society_admins (user_id, society_id, email, name)
SELECT 
    id as user_id,
    'YOUR_SOCIETY_ID' as society_id,
    'prathamsharma8124@gmail.com' as email,
    'Pratham Sharma' as name
FROM auth.users
WHERE email = 'prathamsharma8124@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM society_admins 
    WHERE email = 'prathamsharma8124@gmail.com'
);

-- Grant necessary permissions
GRANT SELECT ON society_admins TO anon;
GRANT SELECT ON auth.users TO anon; 