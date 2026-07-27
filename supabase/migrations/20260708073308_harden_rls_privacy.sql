-- Migration: Harden RLS privacy between units and enforce role-based access
-- Creates helper functions and row-level policies for core data tables

-- Helper functions
create or replace function private.is_super_admin(p_uid uuid) returns boolean language sql stable as $$
  select exists(select 1 from public.profiles where id = p_uid and role = 'super_admin');
$$;

create or replace function private.is_operator(p_uid uuid) returns boolean language sql stable as $$
  select exists(select 1 from public.profiles where id = p_uid and role = 'operator');
$$;

create or replace function private.can_access_unit(p_uid uuid, p_unit uuid) returns boolean language sql stable as $$
  select case
    when exists(select 1 from public.profiles where id = p_uid and role = 'super_admin') then true
    when exists(select 1 from public.profiles where id = p_uid and can_view_all = true) then true
    when p_unit is null then false
    when exists(select 1 from public.profiles where id = p_uid and unit_id = p_unit) then true
    else false
  end;
$$;

-- Target tables to secure
do $$
declare
  tbl text;
  tables text[] := array['kas_umum_debit','kas_umum_kredit','kas_petelur_debit','kas_petelur_kredit','gudang'];
begin
  foreach tbl in array tables loop
    execute format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    execute format('DROP POLICY IF EXISTS %I_select_policy ON public.%I;', tbl, tbl);
    execute format('CREATE POLICY %I_select_policy ON public.%I FOR SELECT USING ( private.can_access_unit(auth.uid()::uuid, unit_id) OR private.is_operator(auth.uid()::uuid) );', tbl, tbl);

    execute format('DROP POLICY IF EXISTS %I_insert_policy ON public.%I;', tbl, tbl);
    execute format('CREATE POLICY %I_insert_policy ON public.%I FOR INSERT WITH CHECK ( private.can_access_unit(auth.uid()::uuid, unit_id) );', tbl, tbl);

    execute format('DROP POLICY IF EXISTS %I_update_policy ON public.%I;', tbl, tbl);
    execute format('CREATE POLICY %I_update_policy ON public.%I FOR UPDATE USING ( private.can_access_unit(auth.uid()::uuid, unit_id) ) WITH CHECK ( private.can_access_unit(auth.uid()::uuid, unit_id) );', tbl, tbl);

    execute format('DROP POLICY IF EXISTS %I_delete_policy ON public.%I;', tbl, tbl);
    execute format('CREATE POLICY %I_delete_policy ON public.%I FOR DELETE USING ( private.can_access_unit(auth.uid()::uuid, unit_id) );', tbl, tbl);
  end loop;
end$$;

-- Ensure operators cannot write by explicitly revoking write privileges at policy level
-- (writes are only allowed when private.can_access_unit(...) is true; operator role won't satisfy that unless also assigned a unit)
