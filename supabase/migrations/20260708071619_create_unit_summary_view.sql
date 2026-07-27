begin;

-- Create a view that summarizes totals per unit for Operator dashboard
create or replace view public.unit_summary as
select
  u.id as unit_id,
  u.name as unit_name,
  coalesce((select sum(jumlah) from public.kas_umum_debit d where d.unit_id = u.id), 0) as pemasukan_umum,
  coalesce((select sum(jumlah) from public.kas_umum_kredit k where k.unit_id = u.id), 0) as pengeluaran_umum,
  coalesce((select sum(jumlah) from public.kas_petelur_debit pd where pd.unit_id = u.id), 0) as pemasukan_petelur,
  coalesce((select sum(jumlah) from public.kas_petelur_kredit pk where pk.unit_id = u.id), 0) as pengeluaran_petelur,
  coalesce((select sum(masuk - keluar) from public.gudang g where g.unit_id = u.id), 0) as saldo_gudang,
  greatest(
    coalesce((select max(created_at) from public.kas_umum_debit d where d.unit_id = u.id), 'epoch'),
    coalesce((select max(created_at) from public.kas_umum_kredit k where k.unit_id = u.id), 'epoch'),
    coalesce((select max(created_at) from public.kas_petelur_debit pd where pd.unit_id = u.id), 'epoch'),
    coalesce((select max(created_at) from public.kas_petelur_kredit pk where pk.unit_id = u.id), 'epoch'),
    coalesce((select max(created_at) from public.gudang g where g.unit_id = u.id), 'epoch')
  ) as last_updated
from public.units u
where u.is_active;

grant select on public.unit_summary to anon, authenticated;

commit;
