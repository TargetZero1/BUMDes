-- Reverting to a singular `returns public.profiles` (so PostgREST returns a
-- bare JSON object, matching what the client's dbSignUp() expects -- the
-- previous fix's `returns table(...)` shape wraps in an array instead) while
-- keeping the actual security fix: scrub password_hash to null before
-- returning the row, rather than leaking the fresh bcrypt hash to the client.
drop function if exists public.db_sign_up(text, text, text, uuid, text, text);

create function public.db_sign_up(
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
  if exists (select 1 from public.profiles p where private.normalize_phone(p.phone) = private.normalize_phone(p_phone)) then
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

  v_profile.password_hash := null;
  return v_profile;
end;
$function$;

grant execute on function public.db_sign_up(text, text, text, uuid, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
