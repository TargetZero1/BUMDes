-- Each unit's Kas Unit ledger and Gudang are now private to that unit's own
-- staff. Operator/Bendahara/Direktur/can_view_all no longer get a blanket
-- cross-unit bypass -- EXCEPT for Toko Bumdes (units.is_toko = true), which
-- the Operator directly runs alongside Toko Bumdes' own staff. The central
-- Kas Umum BUMDes pot (unit_id is null on kas_umum_debit/kredit) is
-- unaffected -- that stays org-wide by design, unrelated to per-unit privacy.
-- The transfer-approval workflow (pengeluaran_unit) is also unaffected --
-- Bendahara/Direktur still see and approve requests for every unit, since
-- every transfer is sourced from the central pot / Toko Bumdes side, which
-- remains in their visible scope.

-- 1. Core privilege helper: own-unit access always works; the operator/
--    admin bypass is now scoped to Toko Bumdes only (or the central pot,
--    unit_id is null, unchanged).
create or replace function private.can_access_unit(target_unit_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select case
    when target_unit_id is null then private.is_super_admin()
    when exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.status = 'approved'
        and p.unit_id = target_unit_id
    ) then true
    when private.is_super_admin() and exists (
      select 1 from public.units u where u.id = target_unit_id and u.is_toko
    ) then true
    else false
  end;
$function$;

-- 2. Drop the blanket is_super_admin()/is_operator()/is_approver() bypass on
--    ledger_debit/ledger_kredit SELECT -- it independently granted every unit
--    regardless of can_access_unit. Only can_access_unit (now properly
--    scoped) gates access.
drop policy if exists ledger_debit_select_for_operator on public.ledger_debit;
create policy ledger_debit_select_for_operator on public.ledger_debit
  for select using (can_access_unit(unit_id));

drop policy if exists ledger_kredit_select_for_operator on public.ledger_kredit;
create policy ledger_kredit_select_for_operator on public.ledger_kredit
  for select using (can_access_unit(unit_id));

-- 3. import_history: while in this area, also fix a live bug -- the ALL
--    policy compared profiles.id = auth.uid(), which never matches (real
--    sessions resolve identity via auth_user_id), so import management has
--    been silently matching zero rows for every real user. Consolidate the
--    two overlapping policies into one SELECT (any approved staff who can
--    access the unit) and one manage/ALL (same, but not a viewer), both
--    driven by the same scoped can_access_unit -- closing the can_view_all
--    "see every unit's import history" gap at the same time.
drop policy if exists "Approved non-viewers manage own unit import history" on public.import_history;
drop policy if exists "Users view import history for accessible units" on public.import_history;

create policy import_history_select on public.import_history
  for select using (
    can_access_unit(import_history.unit_id)
    and exists (select 1 from public.profiles p where p.auth_user_id = (select auth.uid()) and p.status = 'approved')
  );

create policy import_history_manage on public.import_history
  for all using (
    can_access_unit(import_history.unit_id)
    and exists (select 1 from public.profiles p where p.auth_user_id = (select auth.uid()) and p.status = 'approved' and p.role <> 'viewer')
  )
  with check (
    can_access_unit(import_history.unit_id)
    and exists (select 1 from public.profiles p where p.auth_user_id = (select auth.uid()) and p.status = 'approved' and p.role <> 'viewer')
  );

-- 4. get_unit_summary(): the Operator's "Overview Semua Unit" + consolidated
--    Kas Umum totals should not include a private unit's numbers at all --
--    reuse the same scoped can_access_unit so it naturally returns only
--    Toko Bumdes (plus the caller's own unit, if any).
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
    where u.is_active and can_access_unit(u.id)
    order by u.name asc;
end;
$$;

notify pgrst, 'reload schema';
