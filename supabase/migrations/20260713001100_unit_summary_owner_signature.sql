-- Add owner_name/owner_role to unit_summary so the per-unit PDF report can be
-- signed by that unit's actual operator (unit_admin/staff) instead of always
-- being signed by whichever operator clicked "Export PDF". Also expose
-- direktur_name for Toko BUMDes, which should be signed by the Direktur.
drop view if exists public.unit_summary;

create or replace view public.unit_summary as
select
  u.id as unit_id,
  u.name as unit_name,
  u.type as unit_type,
  u.is_toko,
  coalesce((select sum(jumlah) from public.ledger_debit d where d.unit_id = u.id), 0) as pemasukan_unit,
  coalesce((select sum(jumlah) from public.ledger_kredit k where k.unit_id = u.id), 0) as pengeluaran_unit,
  coalesce((
    select sum((agg.masuk - agg.keluar) * coalesce(agg.harga, 0))
    from (
      select
        g.nama_barang,
        sum(g.masuk) as masuk,
        sum(g.keluar) as keluar,
        (array_agg(g.harga_beli order by g.created_at desc) filter (where g.harga_beli is not null and g.harga_beli > 0))[1] as harga
      from public.gudang g
      where g.unit_id = u.id
      group by g.nama_barang
    ) agg
  ), 0) as nilai_gudang,
  greatest(
    coalesce((select max(created_at) from public.ledger_debit d where d.unit_id = u.id), 'epoch'),
    coalesce((select max(created_at) from public.ledger_kredit k where k.unit_id = u.id), 'epoch'),
    coalesce((select max(created_at) from public.gudang g where g.unit_id = u.id), 'epoch')
  ) as last_updated,
  owner.full_name as owner_name,
  owner.role as owner_role,
  direktur.full_name as direktur_name
from public.units u
left join lateral (
  select pr.full_name, pr.role
  from public.profiles pr
  where pr.unit_id = u.id
    and pr.role in ('unit_admin', 'staff')
    and pr.status = 'approved'
  order by pr.role = 'unit_admin' desc, pr.created_at asc
  limit 1
) owner on true
left join lateral (
  select pr.full_name
  from public.profiles pr
  where pr.role = 'direktur' and pr.status = 'approved'
  order by pr.created_at asc
  limit 1
) direktur on true
where u.is_active;

grant select on public.unit_summary to anon, authenticated;
