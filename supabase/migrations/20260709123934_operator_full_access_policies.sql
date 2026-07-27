-- Operator is now a full-write admin role (equivalent to super_admin), not a
-- read-only viewer. Drop the write-denial policies from
-- 20260709001000_deny_operator_writes.sql on the ledger/gudang tables so
-- operator inserts/updates/deletes are no longer blocked at the DB layer.

do $$
declare
  t text;
begin
  foreach t in array array['kas_umum_debit','kas_umum_kredit','kas_petelur_debit','kas_petelur_kredit','gudang'] loop
    execute format('drop policy if exists %I_insert_policy on public.%I', t, t);
    execute format('drop policy if exists %I_update_policy on public.%I', t, t);
    execute format('drop policy if exists %I_delete_policy on public.%I', t, t);
  end loop;
end $$;
