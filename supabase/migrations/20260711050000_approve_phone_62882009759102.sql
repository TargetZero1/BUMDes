-- Approve the profile for phone +62882009759102
-- Run this migration against your Supabase project to mark the user as approved.

update public.profiles
set status = 'approved'
where phone = '+62882009759102';

-- Optional: set role to 'staff' if role is null
update public.profiles
set role = 'staff'
where phone = '+62882009759102' and (role is null or role = '');
