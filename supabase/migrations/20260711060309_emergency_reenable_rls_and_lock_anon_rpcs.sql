-- EMERGENCY SECURITY FIX 2026-07-11
-- RLS was disabled project-wide by earlier migrations (relax_rls_for_testing,
-- disable_rls_for_custom_auth) and never re-enabled, leaving every core table
-- (including bank account numbers in pengeluaran_unit) publicly readable/writable
-- via the anon key despite policies existing on most of them.

-- 1. Re-enable RLS on all tables that already have policies defined.
ALTER TABLE public.gudang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_umum_debit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_umum_kredit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- 2. Re-enable RLS on tables with NO existing policies (invoices, pengeluaran_unit,
--    ledger_debit, ledger_kredit). This defaults to deny-all until proper policies
--    are written — breaking those features is preferable to leaving financial data
--    (including account_number) openly exposed. Follow-up migration required to
--    add real policies for these four tables.
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran_unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_debit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_kredit ENABLE ROW LEVEL SECURITY;

-- 3. Restrict SECURITY DEFINER RPCs that should never be callable by an
--    unauthenticated (anon) caller. db_sign_in is intentionally left anon-callable
--    since it IS the login mechanism.
REVOKE EXECUTE ON FUNCTION public.approve_unit_request(uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bendahara_approve_transfer(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_unit_transfer(uuid, numeric, date, text, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.direktur_approve_transfer(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_pengeluaran_unit(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_transfer(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_unit_request(uuid, uuid) FROM anon;
