-- Optional retail fields on gudang, used by Toko Bumdes (nullable, ignored by other units)

alter table public.gudang add column if not exists kategori text;
alter table public.gudang add column if not exists harga_beli numeric;
alter table public.gudang add column if not exists harga_jual numeric;
alter table public.gudang add column if not exists kode text;
