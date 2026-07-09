-- Operator sends money from the central Kas Umum BUMDes to a unit's own Kas Unit.
-- Posts immediately as a paired double-entry: kredit in kas_umum_kredit (central),
-- debit in ledger_debit (target unit), both linked via pengeluaran_unit.

create or replace function public.create_unit_transfer(
  p_unit_id uuid,
  p_amount numeric,
  p_tanggal date,
  p_description text,
  p_created_by uuid
)
returns public.pengeluaran_unit
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pengeluaran public.pengeluaran_unit;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;
  if p_unit_id is null then
    raise exception 'Target unit is required';
  end if;

  insert into public.pengeluaran_unit (unit_id, amount, tanggal, description, created_by)
  values (p_unit_id, p_amount, coalesce(p_tanggal, current_date), p_description, p_created_by)
  returning * into v_pengeluaran;

  insert into public.kas_umum_kredit (tanggal, uraian, kategori, jumlah, unit_id, created_by, pengeluaran_unit_id)
  values (v_pengeluaran.tanggal, coalesce(p_description, 'Transfer ke unit'), 'Transfer ke Unit', p_amount, null, p_created_by, v_pengeluaran.id);

  insert into public.ledger_debit (tanggal, uraian, sumber, jumlah, unit_id, created_by, pengeluaran_unit_id)
  values (v_pengeluaran.tanggal, coalesce(p_description, 'Transfer dari BUMDes'), 'Transfer dari BUMDes', p_amount, p_unit_id, p_created_by, v_pengeluaran.id);

  return v_pengeluaran;
end;
$$;

grant execute on function public.create_unit_transfer(uuid, numeric, date, text, uuid) to anon, authenticated;
