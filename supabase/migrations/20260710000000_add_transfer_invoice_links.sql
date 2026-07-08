-- Migration: add transfer_id and invoice_url columns to ledger tables

ALTER TABLE IF EXISTS public.kas_umum_debit ADD COLUMN IF NOT EXISTS transfer_id uuid REFERENCES public.transfers(id);
ALTER TABLE IF EXISTS public.kas_umum_debit ADD COLUMN IF NOT EXISTS invoice_url text;

ALTER TABLE IF EXISTS public.kas_umum_kredit ADD COLUMN IF NOT EXISTS transfer_id uuid REFERENCES public.transfers(id);
ALTER TABLE IF EXISTS public.kas_umum_kredit ADD COLUMN IF NOT EXISTS invoice_url text;

ALTER TABLE IF EXISTS public.kas_petelur_debit ADD COLUMN IF NOT EXISTS transfer_id uuid REFERENCES public.transfers(id);
ALTER TABLE IF EXISTS public.kas_petelur_debit ADD COLUMN IF NOT EXISTS invoice_url text;

ALTER TABLE IF EXISTS public.kas_petelur_kredit ADD COLUMN IF NOT EXISTS transfer_id uuid REFERENCES public.transfers(id);
ALTER TABLE IF EXISTS public.kas_petelur_kredit ADD COLUMN IF NOT EXISTS invoice_url text;

-- Optional: link invoices to ledger rows when trigger runs
-- Replace on_transfer_approved to populate transfer_id and invoice_url when creating ledger entries
CREATE OR REPLACE FUNCTION private.on_transfer_approved() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
declare
  t_row record;
  inv record;
begin
  if (new.status = old.status) then
    return new;
  end if;

  if (new.status = 'approved') then
    select * into t_row from public.transfers where id = new.id;

    -- try find invoice PDF for this transfer (may be created before or after)
    select id, pdf_url into inv from public.invoices where transfer_id = t_row.id limit 1;

    -- Insert credit (money out) for sender into kas_umum_kredit
    insert into public.kas_umum_kredit (id, tanggal, uraian, sumber, jumlah, unit_id, created_by, created_at, transfer_id, invoice_url)
    values (gen_random_uuid(), t_row.tanggal, coalesce(t_row.description, 'Transfer to unit'), 'transfer', t_row.amount, t_row.from_unit_id, t_row.created_by, now(), t_row.id, inv.pdf_url);

    -- Insert debit (money in) for receiver into kas_umum_debit
    insert into public.kas_umum_debit (id, tanggal, uraian, sumber, jumlah, unit_id, created_by, created_at, transfer_id, invoice_url)
    values (gen_random_uuid(), t_row.tanggal, coalesce(t_row.description, 'Transfer from unit'), 'transfer', t_row.amount, t_row.to_unit_id, t_row.created_by, now(), t_row.id, inv.pdf_url);

    -- mark completed
    update public.transfers set status = 'completed' where id = new.id;
  end if;

  return new;
end;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_on_transfer_update ON public.transfers;
CREATE TRIGGER trg_on_transfer_update
AFTER UPDATE ON public.transfers
FOR EACH ROW
EXECUTE FUNCTION private.on_transfer_approved();
