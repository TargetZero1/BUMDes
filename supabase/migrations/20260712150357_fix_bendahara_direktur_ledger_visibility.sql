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
