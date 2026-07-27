
-- profiles had no UPDATE RLS policy for non-super_admin callers, so
-- Pengaturan Akun's "ubah nama/no telp" PATCH always matched 0 rows under
-- RLS and silently no-opped (PostgREST returns [] rather than an error,
-- and the UI's success toast fired regardless -- misleadingly reporting
-- success on a save that changed nothing).
--
-- This policy lets a user UPDATE only their own row; the trigger below is
-- defense-in-depth so a self-update can never smuggle in a role/status/
-- unit_id/can_view_all change even if the client payload were tampered with.
create policy profiles_update_own on public.profiles
for update
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

create or replace function private.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists trg_protect_profile_privileged_columns on public.profiles;
create trigger trg_protect_profile_privileged_columns
before update on public.profiles
for each row execute function private.protect_profile_privileged_columns();
