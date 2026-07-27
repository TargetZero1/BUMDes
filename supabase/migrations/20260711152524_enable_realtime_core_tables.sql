
-- Realtime (postgres_changes) is gated by each table's RLS SELECT policy for
-- the subscribing client, same as any other read. pengeluaran_unit has RLS
-- enabled but no SELECT policy (the app only ever reads it through the
-- SECURITY DEFINER list_pengeluaran_unit RPC), so without this policy no
-- realtime event on it would ever reach any client.
create policy pengeluaran_unit_select on public.pengeluaran_unit
for select
using (
  private.is_admin_caller(private.current_profile_id())
  or private.is_approved_role(private.current_profile_id(), 'bendahara')
  or private.is_approved_role(private.current_profile_id(), 'direktur')
  or exists (
    select 1 from public.profiles p
    where p.id = private.current_profile_id()
      and p.unit_id = pengeluaran_unit.unit_id
      and p.status = 'approved'
  )
);

alter publication supabase_realtime add table
  public.ledger_debit,
  public.ledger_kredit,
  public.kas_umum_debit,
  public.kas_umum_kredit,
  public.pengeluaran_unit,
  public.units,
  public.profiles;
