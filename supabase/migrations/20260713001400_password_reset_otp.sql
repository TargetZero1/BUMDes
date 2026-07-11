-- Password reset via WhatsApp OTP. profiles.phone is the login identifier
-- (there's no email), so "forgot password" sends a 6-digit code to the
-- user's WhatsApp instead of an email link.
create table public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.password_reset_otps enable row level security;
-- Deliberately no policies: this table is only ever touched by the
-- request-password-reset / verify-password-reset edge functions using the
-- service role key (which bypasses RLS), never directly by a client.

create index idx_password_reset_otps_profile_created
  on public.password_reset_otps(profile_id, created_at desc);

-- Looks up an approved profile by phone in any accepted format, for the
-- password-reset edge functions. Returns nothing for an unknown/unapproved
-- phone -- callers must respond identically whether or not a row comes
-- back, so this can't be used to enumerate registered phone numbers.
create or replace function public.find_profile_by_phone(p_phone text)
returns table(id uuid, phone text, status text, normalized_phone text)
language sql
stable
security definer
set search_path = public
as $$
  select id, phone, status, private.normalize_phone(phone)
  from public.profiles
  where private.normalize_phone(phone) = private.normalize_phone(p_phone)
    and status = 'approved'
  limit 1;
$$;

grant execute on function public.find_profile_by_phone(text) to service_role;

commit;
