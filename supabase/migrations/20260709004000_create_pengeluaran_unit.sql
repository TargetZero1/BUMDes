-- Migration: create pengeluaran_unit table and link to kas tables

CREATE TABLE IF NOT EXISTS public.pengeluaran_unit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  tanggal date DEFAULT now(),
  description text,
  invoice_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pengeluaran_unit_unit ON public.pengeluaran_unit(unit_id);

-- Add nullable pengeluaran_unit_id to kas tables so transactions can link to an expense record
ALTER TABLE IF EXISTS public.kas_umum_debit ADD COLUMN IF NOT EXISTS pengeluaran_unit_id uuid REFERENCES public.pengeluaran_unit(id);
ALTER TABLE IF EXISTS public.kas_umum_kredit ADD COLUMN IF NOT EXISTS pengeluaran_unit_id uuid REFERENCES public.pengeluaran_unit(id);
ALTER TABLE IF EXISTS public.kas_petelur_debit ADD COLUMN IF NOT EXISTS pengeluaran_unit_id uuid REFERENCES public.pengeluaran_unit(id);
ALTER TABLE IF EXISTS public.kas_petelur_kredit ADD COLUMN IF NOT EXISTS pengeluaran_unit_id uuid REFERENCES public.pengeluaran_unit(id);
