-- Migration: inter-unit transfers and invoice support

-- Transfers table: records a planned/approved transfer between units
CREATE TABLE IF NOT EXISTS public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  to_unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'IDR',
  tanggal date DEFAULT now(),
  description text,
  status text DEFAULT 'pending', -- pending, approved, completed, cancelled
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_transfers_from_unit ON public.transfers(from_unit_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_unit ON public.transfers(to_unit_id);

-- Invoices table: store invoice metadata and optional pdf URL per transaction
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid REFERENCES public.transfers(id) ON DELETE CASCADE,
  issuer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  pdf_url text,
  issued_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Function: create paired ledger entries when a transfer is approved
CREATE OR REPLACE FUNCTION private.on_transfer_approved() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
declare
  t_row record;
begin
  if (new.status = old.status) then
    return new;
  end if;

  -- Only act when status becomes 'approved'
  if (new.status = 'approved') then
    select * into t_row from public.transfers where id = new.id;

    -- Insert credit (money out) for sender into kas_umum_kredit
    insert into public.kas_umum_kredit (id, tanggal, uraian, sumber, jumlah, unit_id, created_by, created_at)
    values (gen_random_uuid(), t_row.tanggal, coalesce(t_row.description, 'Transfer to unit'), 'transfer', t_row.amount, t_row.from_unit_id, t_row.created_by, now());

    -- Insert debit (money in) for receiver into kas_umum_debit
    insert into public.kas_umum_debit (id, tanggal, uraian, sumber, jumlah, unit_id, created_by, created_at)
    values (gen_random_uuid(), t_row.tanggal, coalesce(t_row.description, 'Transfer from unit'), 'transfer', t_row.amount, t_row.to_unit_id, t_row.created_by, now());

    -- mark completed
    update public.transfers set status = 'completed' where id = new.id;
  end if;

  return new;
end;
$$;

-- Trigger that fires after update on transfers
DROP TRIGGER IF EXISTS trg_on_transfer_update ON public.transfers;
CREATE TRIGGER trg_on_transfer_update
AFTER UPDATE ON public.transfers
FOR EACH ROW
EXECUTE FUNCTION private.on_transfer_approved();
