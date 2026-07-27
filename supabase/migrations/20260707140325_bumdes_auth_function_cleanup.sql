begin;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
set search_path = private, public
as $$
  select private.is_super_admin();
$$;

create or replace function public.can_access_unit(target_unit_id uuid)
returns boolean
language sql
stable
set search_path = private, public
as $$
  select private.can_access_unit(target_unit_id);
$$;

drop function if exists public.handle_new_user();
drop function if exists public.touch_profiles_updated_at();

commit;
