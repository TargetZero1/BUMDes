-- Replace client-side unsalted SHA-256 (where the hash itself functioned as
-- a bearer credential -- anyone who ever obtained password_hash could log in
-- with it directly, no cracking needed) with server-side bcrypt via
-- pgcrypto's crypt()/gen_salt('bf') (extensions schema). Existing accounts
-- keep their legacy sha256 hash working: db_sign_in detects the format
-- (bcrypt hashes start with '$2') and, on a successful legacy-format login,
-- immediately re-hashes with bcrypt in place ("lazy upgrade on login") -- no
-- forced password reset needed for any real account.
--
-- Also fixes a real, separate bug found while auditing this: there was no
-- RLS policy allowing an anonymous signup to INSERT its own pending profile
-- row, so the app's self-service "Daftar" flow has been silently broken
-- (every real account so far was provisioned directly via script). db_sign_up
-- below does the insert server-side (SECURITY DEFINER bypasses RLS) instead.

create or replace function private.verify_password(p_password text, p_stored_hash text)
returns boolean
language sql
stable
set search_path to 'extensions'
as $function$
  select case
    when p_stored_hash like '$2%' then crypt(p_password, p_stored_hash) = p_stored_hash
    else p_stored_hash = encode(digest(p_password, 'sha256'), 'hex')
  end;
$function$;

drop function if exists public.db_sign_in(text, text);

create function public.db_sign_in(p_phone text, p_password text)
returns table(id uuid, phone text, role text, unit_id uuid, status text, can_view_all boolean)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_row public.profiles;
begin
  select *
  into v_row
  from public.profiles p
  where private.normalize_phone(p.phone) = private.normalize_phone(p_phone)
    and p.status = 'approved'
  limit 1;

  if v_row.id is null or not private.verify_password(p_password, v_row.password_hash) then
    return;
  end if;

  -- Lazy-upgrade a legacy sha256 hash to bcrypt now that we've verified it.
  if v_row.password_hash not like '$2%' then
    update public.profiles set password_hash = crypt(p_password, gen_salt('bf')) where id = v_row.id;
  end if;

  return query
    select v_row.id, v_row.phone, v_row.role, v_row.unit_id, v_row.status, v_row.can_view_all;
end;
$function$;

grant execute on function public.db_sign_in(text, text) to anon, authenticated;

-- Signup: hash server-side with bcrypt and insert bypassing RLS (SECURITY
-- DEFINER), fixing the broken anon-INSERT path. Mirrors the shape
-- dbSignUp() already sends.
create or replace function public.db_sign_up(
  p_phone text,
  p_password text,
  p_full_name text,
  p_requested_unit_id uuid default null,
  p_requested_unit_name text default null,
  p_requested_unit_type text default null
)
returns public.profiles
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_profile public.profiles;
begin
  if p_phone is null or trim(p_phone) = '' then
    raise exception 'Phone is required';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'Password minimal 6 karakter';
  end if;
  if exists (select 1 from public.profiles where private.normalize_phone(phone) = private.normalize_phone(p_phone)) then
    raise exception 'Phone already registered';
  end if;

  insert into public.profiles (phone, full_name, role, status, password_hash, requested_unit_id, requested_unit_name, requested_unit_type)
  values (
    p_phone,
    coalesce(p_full_name, ''),
    'staff',
    'pending',
    crypt(p_password, gen_salt('bf')),
    p_requested_unit_id,
    p_requested_unit_name,
    p_requested_unit_type
  )
  returning * into v_profile;

  return v_profile;
end;
$function$;

grant execute on function public.db_sign_up(text, text, text, uuid, text, text) to anon, authenticated;

-- Self-service password change: verify the current password (legacy or
-- bcrypt, same helper) and write a fresh bcrypt hash server-side -- the
-- client should never compute the stored hash itself.
create or replace function public.change_own_password(p_current_password text, p_new_password text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_caller_id uuid := private.current_profile_id();
  v_stored_hash text;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'Password baru minimal 6 karakter';
  end if;

  select password_hash into v_stored_hash from public.profiles where id = v_caller_id;

  if not private.verify_password(p_current_password, v_stored_hash) then
    raise exception 'Password saat ini salah.';
  end if;

  update public.profiles set password_hash = crypt(p_new_password, gen_salt('bf')) where id = v_caller_id;
  return true;
end;
$function$;

grant execute on function public.change_own_password(text, text) to authenticated;

-- Tiny bcrypt-hash helper for the verify-password-reset Edge Function (which
-- runs under the service role and previously wrote a raw sha256 hex digest
-- directly) -- keeps the actual hashing logic in one place (pgcrypto) rather
-- than duplicated across SQL and Edge Function code.
create or replace function public.hash_password_bcrypt(p_password text)
returns text
language sql
stable
security definer
set search_path to 'extensions'
as $function$
  select crypt(p_password, gen_salt('bf'));
$function$;

revoke all on function public.hash_password_bcrypt(text) from public, anon;
grant execute on function public.hash_password_bcrypt(text) to service_role;

notify pgrst, 'reload schema';
