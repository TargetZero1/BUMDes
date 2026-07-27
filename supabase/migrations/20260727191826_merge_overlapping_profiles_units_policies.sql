-- Resolve the multiple_permissive_policies advisor warnings on profiles/units
-- by merging genuinely-overlapping SELECT/UPDATE conditions into one policy
-- each, instead of two separate ones Postgres has to evaluate and OR
-- together on every query. No permission changes -- confirmed no direct
-- client write path to profiles exists except self-service update
-- (everything else runs through SECURITY DEFINER RPCs, which bypass RLS).

-- profiles: profiles_manage_super_admin (FOR ALL) redundantly covered SELECT
-- (already handled by profiles_read_own_or_super_admin) and UPDATE (separately
-- from profiles_update_own). Merge UPDATE into one policy; split the
-- write-only remainder into targeted INSERT/DELETE policies.
drop policy if exists profiles_manage_super_admin on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_update_own_or_admin on public.profiles
  for update
  using (auth_user_id = (select auth.uid()) or is_super_admin())
  with check (auth_user_id = (select auth.uid()) or is_super_admin());

create policy profiles_insert_admin on public.profiles
  for insert
  with check (is_super_admin());

create policy profiles_delete_admin on public.profiles
  for delete
  using (is_super_admin());

-- units: units_manage_super_admin (FOR ALL) redundantly covered SELECT
-- alongside units_read_active. Merge into one SELECT policy (admin also
-- needs to see inactive units to manage them, so this isn't a pure
-- dedup -- it's "is_active OR is_super_admin()" as a single condition).
drop policy if exists units_manage_super_admin on public.units;
drop policy if exists units_read_active on public.units;

create policy units_read_active_or_admin on public.units
  for select
  using (is_active or is_super_admin());

create policy units_insert_admin on public.units
  for insert
  with check (is_super_admin());

create policy units_update_admin on public.units
  for update
  using (is_super_admin())
  with check (is_super_admin());

create policy units_delete_admin on public.units
  for delete
  using (is_super_admin());

notify pgrst, 'reload schema';
