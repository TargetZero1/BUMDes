
-- Temporarily relax RLS for testing - allow authenticated users to see all data
DROP POLICY IF EXISTS kas_umum_debit_select ON kas_umum_debit;
CREATE POLICY kas_umum_debit_select ON kas_umum_debit
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS kas_umum_kredit_select ON kas_umum_kredit;
CREATE POLICY kas_umum_kredit_select ON kas_umum_kredit
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS kas_petelur_debit_select ON kas_petelur_debit;
CREATE POLICY kas_petelur_debit_select ON kas_petelur_debit
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS kas_petelur_kredit_select ON kas_petelur_kredit;
CREATE POLICY kas_petelur_kredit_select ON kas_petelur_kredit
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS gudang_select ON gudang;
CREATE POLICY gudang_select ON gudang
  FOR SELECT USING (auth.role() = 'authenticated');
