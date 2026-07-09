-- Generic per-unit ledger (Kas Unit) replacing the Petelur-only ledger.
-- Every unit (Petelur, Toko Bumdes, future units) uses ledger_debit/ledger_kredit.
-- Kas Umum BUMDes (kas_umum_debit/kredit) stays as the separate, central treasury.

create table if not exists public.ledger_debit (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  uraian text,
  sumber text,
  jumlah numeric not null default 0,
  created_at timestamptz not null default now(),
  unit_id uuid not null references public.units(id),
  created_by uuid,
  account_id uuid references public.cash_accounts(id),
  pengeluaran_unit_id uuid references public.pengeluaran_unit(id)
);

create table if not exists public.ledger_kredit (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  uraian text,
  kategori text,
  jumlah numeric not null default 0,
  created_at timestamptz not null default now(),
  unit_id uuid not null references public.units(id),
  created_by uuid,
  account_id uuid references public.cash_accounts(id),
  pengeluaran_unit_id uuid references public.pengeluaran_unit(id)
);

create index if not exists idx_ledger_debit_unit on public.ledger_debit(unit_id);
create index if not exists idx_ledger_kredit_unit on public.ledger_kredit(unit_id);

-- Migrate existing Petelur ledger data into the generic ledger (source tables kept, deprecated).
insert into public.ledger_debit (id, tanggal, uraian, sumber, jumlah, created_at, unit_id, created_by, account_id, pengeluaran_unit_id)
select id, tanggal, uraian, sumber, jumlah, created_at, unit_id, created_by, account_id, pengeluaran_unit_id
from public.kas_petelur_debit
where unit_id is not null
on conflict (id) do nothing;

insert into public.ledger_kredit (id, tanggal, uraian, kategori, jumlah, created_at, unit_id, created_by, account_id, pengeluaran_unit_id)
select id, tanggal, uraian, kategori, jumlah, created_at, unit_id, created_by, account_id, pengeluaran_unit_id
from public.kas_petelur_kredit
where unit_id is not null
on conflict (id) do nothing;
