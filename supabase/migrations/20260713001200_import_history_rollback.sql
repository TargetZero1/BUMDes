-- Add snapshot/rollback support to import_history so an import can be
-- previewed (counts before/after) and undone (restore the unit's ledger +
-- gudang rows to their pre-import state), scoped to that import's unit only.
alter table public.import_history
  add column if not exists snapshot_before jsonb,
  add column if not exists counts_before jsonb,
  add column if not exists counts_after jsonb,
  add column if not exists rolled_back_at timestamptz,
  add column if not exists rolled_back_by uuid references public.profiles(id) on delete set null;

-- The original policy only let role = 'super_admin' write import_history,
-- but any non-viewer can trigger an import per the app's own canExport
-- check -- so their import silently failed to log (caught and swallowed).
-- Widen writes to match who can actually import/rollback for a unit.
drop policy if exists "Only super admin manages import history" on public.import_history;
create policy "Approved non-viewers manage own unit import history"
  on public.import_history
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'approved'
        and p.role <> 'viewer'
        and (p.role = 'super_admin' or p.can_view_all or p.unit_id = import_history.unit_id)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'approved'
        and p.role <> 'viewer'
        and (p.role = 'super_admin' or p.can_view_all or p.unit_id = import_history.unit_id)
    )
  );
