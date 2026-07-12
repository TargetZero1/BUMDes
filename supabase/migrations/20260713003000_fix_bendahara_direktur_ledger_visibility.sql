-- Bendahara/Direktur see badly understated (and sometimes negative) totals on
-- Kas Umum BUMDes compared to Operator. Root cause: ledger_debit/ledger_kredit
-- (per-unit ledgers) SELECT policy is
--   is_super_admin() OR is_operator() OR can_access_unit(unit_id)
-- but is_operator() only matches role = 'operator', and can_access_unit()
-- requires a matching profiles.unit_id -- which Bendahara/Direktur don't have
-- (they're org-wide approvers, unit_id is null). So they can see all of
-- kas_umum_debit/kredit (pusat, open to any authenticated user) but zero rows
-- from every unit's ledger, making their consolidated total just the pusat
-- side alone instead of pusat + all units.

create or replace function public.is_approver()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid() and p.role in ('bendahara', 'direktur') and p.status = 'approved'
  );
$$;

drop policy if exists ledger_debit_select_for_operator on public.ledger_debit;
create policy ledger_debit_select_for_operator on public.ledger_debit
  for select
  using (is_super_admin() or is_operator() or is_approver() or can_access_unit(unit_id));

drop policy if exists ledger_kredit_select_for_operator on public.ledger_kredit;
create policy ledger_kredit_select_for_operator on public.ledger_kredit
  for select
  using (is_super_admin() or is_operator() or is_approver() or can_access_unit(unit_id));
