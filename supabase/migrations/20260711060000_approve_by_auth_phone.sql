-- Approve profile by matching auth.users.phone and optionally set password_hash
-- Run this in Supabase SQL editor. It updates profiles for the user with given phone.

-- Replace the phone and (optionally) the password_hash value before running.
-- To set/reset a password, replace 'REPLACE_WITH_HASH' with encode(digest('NEW_PASSWORD','sha256'),'hex')

BEGIN;

-- Approve the profile that belongs to the auth.user with the given phone
UPDATE public.profiles p
SET status = 'approved',
    role = COALESCE(p.role, 'staff')
FROM auth.users u
WHERE u.phone = '+62882009759102' AND p.id = u.id;

-- OPTIONAL: set password_hash (uncomment and replace the hash if you want to set a password)
-- UPDATE public.profiles p
-- SET password_hash = 'REPLACE_WITH_HASH'
-- FROM auth.users u
-- WHERE u.phone = '+62882009759102' AND p.id = u.id;

COMMIT;
