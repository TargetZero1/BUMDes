create index if not exists idx_pengeluaran_unit_bendahara_id on public.pengeluaran_unit (bendahara_id);
create index if not exists idx_pengeluaran_unit_direktur_id on public.pengeluaran_unit (direktur_id);
create index if not exists idx_pengeluaran_unit_rejected_by on public.pengeluaran_unit (rejected_by);
