-- These policies reference private.can_access_unit / private.is_operator, but the
-- `private` schema was never granted USAGE to authenticated/anon (only EXECUTE on
-- the individual functions, which is insufficient -- schema USAGE is required first).
-- Any query hitting these policies throws "permission denied for schema private" and
-- fails the ENTIRE query, even though other OR'd policies on the same table
-- (gudang_select, gudang_select_for_operator, etc., using the working public.* function
-- equivalents) would otherwise have granted access correctly.
-- These are confirmed-redundant leftovers from an earlier auth design -- the same
-- capability is already covered by the newer *_select_for_operator policies using
-- public.can_access_unit()/public.is_operator(), which DO have proper schema grants.
DROP POLICY IF EXISTS gudang_select_policy ON public.gudang;
DROP POLICY IF EXISTS kas_umum_debit_select_policy ON public.kas_umum_debit;
DROP POLICY IF EXISTS kas_umum_kredit_select_policy ON public.kas_umum_kredit;
