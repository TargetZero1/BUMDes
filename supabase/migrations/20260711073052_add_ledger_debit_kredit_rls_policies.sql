create policy ledger_debit_select on public.ledger_debit
  for select using (auth.role() = 'authenticated');

create policy ledger_debit_select_for_operator on public.ledger_debit
  for select using (is_super_admin() or is_operator() or can_access_unit(unit_id));

create policy ledger_debit_insert on public.ledger_debit
  for insert with check (can_access_unit(unit_id));

create policy ledger_debit_update on public.ledger_debit
  for update using (can_access_unit(unit_id)) with check (can_access_unit(unit_id));

create policy ledger_debit_delete on public.ledger_debit
  for delete using (can_access_unit(unit_id));

create policy ledger_kredit_select on public.ledger_kredit
  for select using (auth.role() = 'authenticated');

create policy ledger_kredit_select_for_operator on public.ledger_kredit
  for select using (is_super_admin() or is_operator() or can_access_unit(unit_id));

create policy ledger_kredit_insert on public.ledger_kredit
  for insert with check (can_access_unit(unit_id));

create policy ledger_kredit_update on public.ledger_kredit
  for update using (can_access_unit(unit_id)) with check (can_access_unit(unit_id));

create policy ledger_kredit_delete on public.ledger_kredit
  for delete using (can_access_unit(unit_id));
