-- Migration: add hierarchical cash_accounts model and optional account_id on kas tables
-- Safe changes: new tables + nullable columns (no destructive updates)

-- Create hierarchical cash accounts table
CREATE TABLE IF NOT EXISTS public.cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  code text,
  name text NOT NULL,
  account_type text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_accounts_unit ON public.cash_accounts(unit_id);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_code ON public.cash_accounts(code);

-- Add nullable account_id to existing kas tables for gradual migration
ALTER TABLE IF EXISTS public.kas_umum_debit ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.cash_accounts(id);
ALTER TABLE IF EXISTS public.kas_umum_kredit ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.cash_accounts(id);
ALTER TABLE IF EXISTS public.kas_petelur_debit ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.cash_accounts(id);
ALTER TABLE IF EXISTS public.kas_petelur_kredit ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.cash_accounts(id);

-- Optional: gudang entries may reference an inventory account
ALTER TABLE IF EXISTS public.gudang ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.cash_accounts(id);

-- Create a view to expose the account hierarchy per unit
CREATE OR REPLACE VIEW public.cash_account_hierarchy AS
WITH RECURSIVE tree AS (
  SELECT id, unit_id, parent_id, code, name, account_type, is_active, created_at, 1 AS depth, array[id] AS path
  FROM public.cash_accounts
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.unit_id, c.parent_id, c.code, c.name, c.account_type, c.is_active, c.created_at, t.depth + 1, t.path || c.id
  FROM public.cash_accounts c
  JOIN tree t ON c.parent_id = t.id
)
SELECT id, unit_id, parent_id, code, name, account_type, is_active, created_at, depth, path FROM tree;

GRANT SELECT ON public.cash_account_hierarchy TO public;
