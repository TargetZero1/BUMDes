begin;

alter table public.units disable row level security;
alter table public.profiles disable row level security;
alter table public.kas_umum_debit disable row level security;
alter table public.kas_umum_kredit disable row level security;
alter table public.kas_petelur_debit disable row level security;
alter table public.kas_petelur_kredit disable row level security;
alter table public.gudang disable row level security;

commit;
