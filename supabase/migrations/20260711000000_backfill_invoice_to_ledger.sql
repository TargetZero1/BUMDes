-- Backfill invoice pdf_url into ledger rows when an invoice is inserted
-- Adds a trigger in the private schema that updates kas_* tables where transfer_id matches

create or replace function private.backfill_invoice_url_on_invoice_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.transfer_id is null then
    return new;
  end if;

  update public.kas_umum_debit set invoice_url = new.pdf_url where transfer_id = new.transfer_id;
  update public.kas_umum_kredit set invoice_url = new.pdf_url where transfer_id = new.transfer_id;
  update public.kas_petelur_debit set invoice_url = new.pdf_url where transfer_id = new.transfer_id;
  update public.kas_petelur_kredit set invoice_url = new.pdf_url where transfer_id = new.transfer_id;

  return new;
end;
$$;

drop trigger if exists backfill_invoice_on_insert on public.invoices;
create trigger backfill_invoice_on_insert
after insert on public.invoices
for each row
execute function private.backfill_invoice_url_on_invoice_insert();
