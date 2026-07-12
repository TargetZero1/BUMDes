-- unit_summary was a SECURITY DEFINER view granted SELECT to anon/authenticated,
-- which bypassed RLS on ledger_debit/ledger_kredit/gudang/profiles and let anyone
-- holding just the public anon key read every unit's saldo, pengeluaran, nilai
-- gudang, and owner/direktur names without logging in. Replace it with a
-- SECURITY DEFINER function that checks the caller's role itself (same pattern
-- already used by list_pengeluaran_unit), and drop the view.

drop view if exists public.unit_summary;

create or replace function public.get_unit_summary()
returns table (
  unit_id uuid,
  unit_name text,
  unit_type text,
  is_toko boolean,
  pemasukan_unit numeric,
  pengeluaran_unit numeric,
  nilai_gudang numeric,
  last_updated timestamptz,
  owner_name text,
  owner_role text,
  direktur_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_super_admin() or public.is_operator()) then
    raise exception 'Not authorized';
  end if;

  return query
    select
      u.id as unit_id,
      u.name as unit_name,
      u.type as unit_type,
      u.is_toko,
      coalesce((select sum(d.jumlah) from ledger_debit d where d.unit_id = u.id), 0::numeric) as pemasukan_unit,
      coalesce((select sum(k.jumlah) from ledger_kredit k where k.unit_id = u.id), 0::numeric) as pengeluaran_unit,
      coalesce((
        select sum((agg.masuk - agg.keluar) * coalesce(agg.harga, 0::numeric))
        from (
          select g.nama_barang,
                 sum(g.masuk) as masuk,
                 sum(g.keluar) as keluar,
                 (array_agg(g.harga_beli order by g.created_at desc) filter (where g.harga_beli is not null and g.harga_beli > 0::numeric))[1] as harga
          from gudang g
          where g.unit_id = u.id
          group by g.nama_barang
        ) agg
      ), 0::numeric) as nilai_gudang,
      greatest(
        coalesce((select max(d.created_at) from ledger_debit d where d.unit_id = u.id), '1970-01-01 00:00:00+00'::timestamptz),
        coalesce((select max(k.created_at) from ledger_kredit k where k.unit_id = u.id), '1970-01-01 00:00:00+00'::timestamptz),
        coalesce((select max(g.created_at) from gudang g where g.unit_id = u.id), '1970-01-01 00:00:00+00'::timestamptz)
      ) as last_updated,
      owner.full_name as owner_name,
      owner.role as owner_role,
      direktur.full_name as direktur_name
    from units u
    left join lateral (
      select pr.full_name, pr.role
      from profiles pr
      where pr.unit_id = u.id and pr.role in ('unit_admin', 'staff') and pr.status = 'approved'
      order by pr.role = 'unit_admin' desc, pr.created_at
      limit 1
    ) owner on true
    left join lateral (
      select pr.full_name
      from profiles pr
      where pr.role = 'direktur' and pr.status = 'approved'
      order by pr.created_at
      limit 1
    ) direktur on true
    where u.is_active
    order by u.name asc;
end;
$$;

revoke all on function public.get_unit_summary() from public, anon;
grant execute on function public.get_unit_summary() to authenticated;
