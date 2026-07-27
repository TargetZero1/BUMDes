create index if not exists idx_invoices_issuer_profile_id on public.invoices(issuer_profile_id);
create index if not exists idx_kas_umum_debit_pengeluaran_unit_id on public.kas_umum_debit(pengeluaran_unit_id);
create index if not exists idx_kas_umum_kredit_pengeluaran_unit_id on public.kas_umum_kredit(pengeluaran_unit_id);
create index if not exists idx_ledger_debit_pengeluaran_unit_id on public.ledger_debit(pengeluaran_unit_id);
create index if not exists idx_ledger_kredit_pengeluaran_unit_id on public.ledger_kredit(pengeluaran_unit_id);
create index if not exists idx_pengeluaran_unit_created_by on public.pengeluaran_unit(created_by);
create index if not exists idx_profiles_requested_unit_id on public.profiles(requested_unit_id);
