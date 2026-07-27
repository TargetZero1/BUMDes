begin;

-- Add is_operator helper
create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'operator' and p.status = 'approved'
  );
$$;

-- Allow operators to SELECT on kas and gudang (read-only across units)
drop policy if exists kas_umum_debit_select_for_operator on public.kas_umum_debit;
create policy kas_umum_debit_select_for_operator
  on public.kas_umum_debit
  for select
  using (
    public.is_super_admin() OR public.is_operator() OR public.can_access_unit(unit_id)
  );

drop policy if exists kas_umum_kredit_select_for_operator on public.kas_umum_kredit;
create policy kas_umum_kredit_select_for_operator
  on public.kas_umum_kredit
  for select
  using (
    public.is_super_admin() OR public.is_operator() OR public.can_access_unit(unit_id)
  );

drop policy if exists kas_petelur_debit_select_for_operator on public.kas_petelur_debit;
create policy kas_petelur_debit_select_for_operator
  on public.kas_petelur_debit
  for select
  using (
    public.is_super_admin() OR public.is_operator() OR public.can_access_unit(unit_id)
  );

drop policy if exists kas_petelur_kredit_select_for_operator on public.kas_petelur_kredit;
create policy kas_petelur_kredit_select_for_operator
  on public.kas_petelur_kredit
  for select
  using (
    public.is_super_admin() OR public.is_operator() OR public.can_access_unit(unit_id)
  );

drop policy if exists gudang_select_for_operator on public.gudang;
create policy gudang_select_for_operator
  on public.gudang
  for select
  using (
    public.is_super_admin() OR public.is_operator() OR public.can_access_unit(unit_id)
  );

-- Ensure operators cannot insert/update/delete by leaving existing policies unchanged (they rely on can_access_unit)

commit;
