-- gudang_select allowed any authenticated user to read every unit's warehouse
-- rows (including harga_beli/harga_jual cost/sell price), while insert/update/
-- delete were already correctly scoped via can_access_unit(unit_id). The
-- frontend only ever queries gudang unit-scoped (App.jsx unitQuery), so there
-- is no legitimate cross-unit read path this breaks. kas_umum_debit/kredit are
-- intentionally left broad -- they represent the shared central treasury
-- (unit_id is null for real entries) and are deliberately shown org-wide on
-- the Kas Umum BUMDes page.
alter policy gudang_select on public.gudang
  using (can_access_unit(unit_id));
