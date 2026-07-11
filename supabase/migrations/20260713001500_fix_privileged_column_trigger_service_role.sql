-- protect_profile_privileged_columns (20260713001000) blocked ANY update to
-- role/status/unit_id/can_view_all/auth_user_id where auth.uid() isn't an
-- admin profile -- including calls made with the service_role key, which has
-- no auth.uid() at all. This broke db-sign-in's self-heal of
-- profiles.auth_user_id (Edge Function using the service role client),
-- surfacing as "Not authorized to change role, status, unit, or auth
-- linkage" on login whenever a profile's auth_user_id was still null.
-- Service-role callers already bypass RLS entirely; the trigger must not
-- re-impose end-user authorization on top of that.
create or replace function private.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if not private.is_admin_caller(private.current_profile_id()) then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.unit_id is distinct from old.unit_id
       or new.can_view_all is distinct from old.can_view_all
       or new.auth_user_id is distinct from old.auth_user_id then
      raise exception 'Not authorized to change role, status, unit, or auth linkage';
    end if;
  end if;
  return new;
end;
$$;
