-- Add phone and password_hash to profiles and backfill from auth.users
-- Safer than dropping the table: preserves existing data and constraints.

begin;

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists password_hash text;

-- Backfill phone from auth.users when available
update public.profiles p
set phone = u.phone
from auth.users u
where p.id = u.id
  and (p.phone is null or p.phone = '');

-- Add unique index on phone to prevent duplicates (nullable allowed)
create unique index if not exists profiles_phone_key on public.profiles (phone);

-- Security: revoke direct anonymous select of password_hash (keep RLS policies in place)
revoke select (password_hash) on public.profiles from anon;

commit;
