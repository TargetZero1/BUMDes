-- Merge super_admin into operator: there was never a real capability gap
-- between them except an accidental one -- profiles/units table RLS
-- (profiles_manage_super_admin, units_manage_super_admin) and can_access_unit()
-- only recognized role = 'super_admin', so an 'operator' account could see the
-- "Buat Unit"/Enable/Disable controls in the UI but have every direct write
-- silently rejected by RLS. Rather than duplicate two roles with no intended
-- difference, collapse them into a single 'operator' role.

-- 1. Widen the privilege-check helpers to also recognize 'operator' before
--    migrating data, so nothing has a gap mid-migration.
create or replace function private.is_super_admin()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and (p.role = 'super_admin' or p.role = 'operator' or p.can_view_all)
  );
$$;

create or replace function private.is_super_admin(p_uid uuid)
returns boolean
language sql
stable
set search_path to ''
as $$
  select exists(select 1 from public.profiles where id = p_uid and (role = 'super_admin' or role = 'operator'));
$$;

create or replace function private.can_access_unit(p_uid uuid, p_unit uuid)
returns boolean
language sql
stable
set search_path to ''
as $$
  select case
    when exists(select 1 from public.profiles where id = p_uid and (role = 'super_admin' or role = 'operator')) then true
    when exists(select 1 from public.profiles where id = p_uid and can_view_all = true) then true
    when p_unit is null then false
    when exists(select 1 from public.profiles where id = p_uid and unit_id = p_unit) then true
    else false
  end;
$$;

-- 2. Migrate existing super_admin accounts to operator. The privileged-column
--    guard trigger would otherwise block this update outside a service-role
--    or admin-caller session, so disable it just for this statement.
alter table public.profiles disable trigger trg_protect_profile_privileged_columns;
update public.profiles set role = 'operator' where role = 'super_admin';
alter table public.profiles enable trigger trg_protect_profile_privileged_columns;

-- 3. Stop new super_admin rows from being created -- operator is now the
--    single top role.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = ANY (ARRAY['operator'::text, 'unit_admin'::text, 'staff'::text, 'viewer'::text, 'bendahara'::text, 'direktur'::text]));
