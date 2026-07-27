-- 1. Correctness fix: ledger_debit/ledger_kredit (Kas Unit, per-unit private data) got
--    the same blanket "any authenticated user can read everything" policy as kas_umum
--    (central ledger, intentionally company-wide readable). That blanket policy defeated
--    the can_access_unit() unit-scoping I just added. Drop it so only unit-scoped access remains.
drop policy ledger_debit_select on public.ledger_debit;
drop policy ledger_kredit_select on public.ledger_kredit;

-- 2. Consolidate duplicate permissive SELECT policies: on kas_umum_debit/kredit and gudang,
--    the "_select_for_operator" policy is a strict subset of "any authenticated user can read"
--    (same table, same role, same command) -- it changes nothing but doubles per-row evaluation.
drop policy kas_umum_debit_select_for_operator on public.kas_umum_debit;
drop policy kas_umum_kredit_select_for_operator on public.kas_umum_kredit;
drop policy gudang_select_for_operator on public.gudang;

-- 3. Perf: wrap auth.<fn>() calls in (select ...) so Postgres evaluates them once per
--    query (initplan) instead of once per row.
alter policy kas_umum_debit_select on public.kas_umum_debit
  using ((select auth.role()) = 'authenticated');

alter policy kas_umum_kredit_select on public.kas_umum_kredit
  using ((select auth.role()) = 'authenticated');

alter policy gudang_select on public.gudang
  using ((select auth.role()) = 'authenticated');

alter policy profiles_read_own_or_super_admin on public.profiles
  using (auth_user_id = (select auth.uid()) or is_super_admin());

-- 4. Correctness fix + perf fix together: import_history policies compared
--    profiles.id = auth.uid(), but profiles.id is never equal to auth_user_id (verified:
--    0 of 8 rows match) -- this policy has been silently denying every real user. Fix the
--    column and wrap auth.uid() in (select ...) at the same time.
alter policy "Only super admin manages import history" on public.import_history
  using ((select profiles.role from profiles where profiles.auth_user_id = (select auth.uid())) = 'super_admin');

alter policy "Users view import history for accessible units" on public.import_history
  using (unit_id in (
    select profiles.unit_id from profiles where profiles.auth_user_id = (select auth.uid())
    union all
    select units.id from units where (select profiles.can_view_all from profiles where profiles.auth_user_id = (select auth.uid())) = true
  ));
