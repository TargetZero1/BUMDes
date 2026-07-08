begin;

alter table if exists public.kas_umum_debit drop column if exists transfer_id;
alter table if exists public.kas_umum_debit drop column if exists invoice_url;
alter table if exists public.kas_umum_kredit drop column if exists transfer_id;
alter table if exists public.kas_umum_kredit drop column if exists invoice_url;
alter table if exists public.kas_petelur_debit drop column if exists transfer_id;
alter table if exists public.kas_petelur_debit drop column if exists invoice_url;
alter table if exists public.kas_petelur_kredit drop column if exists transfer_id;
alter table if exists public.kas_petelur_kredit drop column if exists invoice_url;

drop table if exists public.invoices;
drop table if exists public.transfers;

drop function if exists private.backfill_invoice_url_on_invoice_insert();
drop function if exists private.on_transfer_approved();

drop trigger if exists trg_on_transfer_update on public.transfers;
drop trigger if exists backfill_invoice_on_insert on public.invoices;

commit;
