
create extension if not exists pgcrypto;

create table if not exists kas_umum_debit (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  uraian text not null,
  sumber text not null,
  jumlah numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists kas_umum_kredit (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  uraian text not null,
  kategori text not null,
  jumlah numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists kas_petelur_debit (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  uraian text not null,
  sumber text not null,
  jumlah numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists kas_petelur_kredit (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  uraian text not null,
  kategori text not null,
  jumlah numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists gudang (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  nama_barang text not null,
  satuan text not null,
  uraian text,
  masuk numeric not null default 0,
  keluar numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table kas_umum_debit enable row level security;
alter table kas_umum_kredit enable row level security;
alter table kas_petelur_debit enable row level security;
alter table kas_petelur_kredit enable row level security;
alter table gudang enable row level security;

create policy "public_all_kas_umum_debit" on kas_umum_debit for all using (true) with check (true);
create policy "public_all_kas_umum_kredit" on kas_umum_kredit for all using (true) with check (true);
create policy "public_all_kas_petelur_debit" on kas_petelur_debit for all using (true) with check (true);
create policy "public_all_kas_petelur_kredit" on kas_petelur_kredit for all using (true) with check (true);
create policy "public_all_gudang" on gudang for all using (true) with check (true);
