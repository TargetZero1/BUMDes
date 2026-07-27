-- Atomically approve a pending profile's unit request: reuse an existing unit
-- (requested_unit_id) or create a brand-new one from requested_unit_name/type,
-- then link + approve the profile.

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

    insert into public.units (name, type, is_active)
    values (v_name, v_type, true)
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

grant execute on function public.approve_unit_request(uuid, text, text) to anon, authenticated;

-- Reject a pending unit/profile request without creating a unit.
create or replace function public.reject_unit_request(p_profile_id uuid)
returns public.profiles
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set status = 'disabled',
      requested_unit_id = null,
      requested_unit_name = null,
      requested_unit_type = null,
      updated_at = now()
  where id = p_profile_id
  returning *;
$$;

grant execute on function public.reject_unit_request(uuid) to anon, authenticated;
