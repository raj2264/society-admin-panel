-- Check auth user details and status
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    CASE 
        WHEN encrypted_password IS NULL THEN 'No password set'
        ELSE 'Password is set'
    END as password_status,
    role
FROM auth.users 
WHERE email = 'prathamc000003@gmail.com';

-- Check if there are any recent auth events for this user
SELECT 
    id,
    type as event_type,
    created_at,
    ip_address,
    user_agent
FROM auth.audit_log_entries 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'prathamc000003@gmail.com'
)
ORDER BY created_at DESC
LIMIT 5; 