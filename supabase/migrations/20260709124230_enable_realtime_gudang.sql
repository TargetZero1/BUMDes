-- Enable Postgres Changes realtime broadcasting for the gudang table so unit
-- stock stays live-updated across clients without manual refresh.
alter publication supabase_realtime add table public.gudang;
