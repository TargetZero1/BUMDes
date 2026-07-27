drop view if exists public.unit_summary;

create or replace view public.unit_summary as
select
  u.id as unit_id,
  u.name as unit_name,
  u.type as unit_type,
  u.is_toko,
  coalesce((select sum(jumlah) from public.ledger_debit d where d.unit_id = u.id), 0) as pemasukan_unit,
  coalesce((select sum(jumlah) from public.ledger_kredit k where k.unit_id = u.id), 0) as pengeluaran_unit,
  coalesce((select sum(masuk - keluar) from public.gudang g where g.unit_id = u.id), 0) as saldo_gudang,
  greatest(
    coalesce((select max(created_at) from public.ledger_debit d where d.unit_id = u.id), 'epoch'),
    coalesce((select max(created_at) from public.ledger_kredit k where k.unit_id = u.id), 'epoch'),
    coalesce((select max(created_at) from public.gudang g where g.unit_id = u.id), 'epoch')
  ) as last_updated
from public.units u
where u.is_active;

grant select on public.unit_summary to anon, authenticated;
