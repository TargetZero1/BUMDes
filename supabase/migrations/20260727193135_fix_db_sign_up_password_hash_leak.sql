-- db_sign_up returned `select * into v_profile` -> the whole profiles row,
-- including the freshly-generated bcrypt password_hash, straight back to the
-- signup response body. Not exploitable the way the old sha256-as-credential
-- bug was (the caller already has the plaintext they just submitted), but a
-- hash has no business leaving the server at all -- narrow the return type
-- to only the columns the client actually uses.
drop function if exists public.db_sign_up(text, text, text, uuid, text, text);

create function public.db_sign_up(
  p_phone text,
  p_password text,
  p_full_name text,
  p_requested_unit_id uuid default null,
  p_requested_unit_name text default null,
  p_requested_unit_type text default null
)
returns table(
  id uuid,
  full_name text,
  phone text,
  role text,
  unit_id uuid,
  status text,
  can_view_all boolean,
  requested_unit_id uuid,
  requested_unit_name text,
  requested_unit_type text
)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_id uuid;
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
  returning profiles.id into v_id;

  return query
    select p.id, p.full_name, p.phone, p.role, p.unit_id, p.status, p.can_view_all, p.requested_unit_id, p.requested_unit_name, p.requested_unit_type
    from public.profiles p
    where p.id = v_id;
end;
$function$;

grant execute on function public.db_sign_up(text, text, text, uuid, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
