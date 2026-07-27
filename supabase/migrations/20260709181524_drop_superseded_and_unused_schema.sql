drop table if exists public.kas_petelur_debit cascade;
drop table if exists public.kas_petelur_kredit cascade;
drop view if exists public.cash_account_hierarchy;
alter table if exists public.gudang drop column if exists account_id;
alter table if exists public.kas_umum_debit drop column if exists account_id;
alter table if exists public.kas_umum_kredit drop column if exists account_id;
alter table if exists public.ledger_debit drop column if exists account_id;
alter table if exists public.ledger_kredit drop column if exists account_id;
drop table if exists public.cash_accounts cascade;
