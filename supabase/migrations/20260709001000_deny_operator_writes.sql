-- Migration: Explicitly deny writes for operator role on core tables

do $$
declare
  tbl text;
  tables text[] := array['kas_umum_debit','kas_umum_kredit','kas_petelur_debit','kas_petelur_kredit','gudang'];
begin
  foreach tbl in array tables loop
    -- Replace INSERT policy to deny operators
    execute format('DROP POLICY IF EXISTS %I_insert_policy ON public.%I;', tbl, tbl);
    execute format($fmt$
      CREATE POLICY %I_insert_policy ON public.%I
      FOR INSERT
      WITH CHECK (
        private.can_access_unit(auth.uid()::uuid, unit_id)
        AND NOT private.is_operator(auth.uid()::uuid)
      );
    $fmt$, tbl, tbl);

    -- Replace UPDATE policy to deny operators
    execute format('DROP POLICY IF EXISTS %I_update_policy ON public.%I;', tbl, tbl);
    execute format($fmt$
      CREATE POLICY %I_update_policy ON public.%I
      FOR UPDATE
      USING (
        private.can_access_unit(auth.uid()::uuid, unit_id)
        AND NOT private.is_operator(auth.uid()::uuid)
      )
      WITH CHECK (
        private.can_access_unit(auth.uid()::uuid, unit_id)
        AND NOT private.is_operator(auth.uid()::uuid)
      );
    $fmt$, tbl, tbl);

    -- Replace DELETE policy to deny operators
    execute format('DROP POLICY IF EXISTS %I_delete_policy ON public.%I;', tbl, tbl);
    execute format($fmt$
      CREATE POLICY %I_delete_policy ON public.%I
      FOR DELETE
      USING (
        private.can_access_unit(auth.uid()::uuid, unit_id)
        AND NOT private.is_operator(auth.uid()::uuid)
      );
    $fmt$, tbl, tbl);
  end loop;
end$$;
