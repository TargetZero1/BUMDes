-- Add unit type + Toko Bumdes flag, seed the operator-owned Toko Bumdes unit

alter table public.units add column if not exists type text;
alter table public.units add column if not exists is_toko boolean not null default false;

insert into public.units (name, code, type, is_toko, is_active)
select 'Toko Bumdes', 'TOKO', 'Toko', true, true
where not exists (select 1 from public.units where is_toko = true);
