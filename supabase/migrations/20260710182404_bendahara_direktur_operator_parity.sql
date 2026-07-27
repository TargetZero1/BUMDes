create or replace function private.is_admin_caller(p_caller_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_caller_id
      and status = 'approved'
      and (role in ('operator', 'super_admin', 'bendahara', 'direktur') or can_view_all = true)
  );
$$;
