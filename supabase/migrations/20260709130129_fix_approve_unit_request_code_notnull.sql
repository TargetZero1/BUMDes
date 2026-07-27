create or replace function public.approve_unit_request(
  p_profile_id uuid,
  p_unit_name text default null,
  p_unit_type text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_unit_id uuid;
  v_name text;
  v_type text;
begin
  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  if v_profile.requested_unit_id is not null then
    v_unit_id := v_profile.requested_unit_id;
  else
    v_name := coalesce(nullif(trim(p_unit_name), ''), v_profile.requested_unit_name);
    v_type := coalesce(nullif(trim(p_unit_type), ''), v_profile.requested_unit_type);
    if v_name is null then
      raise exception 'No unit name to approve';
    end if;

    insert into public.units (name, code, type, is_active)
    values (
      v_name,
      upper(left(regexp_replace(v_name, '[^a-zA-Z0-9]+', '', 'g'), 10)) || '-' || left(gen_random_uuid()::text, 4),
      v_type,
      true
    )
    returning id into v_unit_id;
  end if;

  update public.profiles
  set status = 'approved',
      unit_id = v_unit_id,
      requested_unit_id = null,
      requested_unit_name = null,
      requested_unit_type = null,
      updated_at = now()
  where id = p_profile_id
  returning * into v_profile;

  return v_profile;
end;
$$;
